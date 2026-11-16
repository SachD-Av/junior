/**
 * Sauvegarde automatique de l'appli Tétée vers Google Drive
 * + rappels de tétée par notification (appli ntfy), même téléphones en veille.
 *
 * À coller dans https://script.google.com (Nouveau projet), puis exécuter « installer » une fois.
 * Chaque nuit vers 3 h, le script copie toutes les données dans des onglets CACHÉS de la feuille
 * « Tétée – journal » (dossier Drive « Tétée – sauvegardes ») : aucun fichier .json n'encombre Drive.
 *   - Quotidien    : une copie par jour, on garde les 7 dernières
 *   - Hebdomadaire : une copie par semaine, on garde les 8 dernières
 *   - Mensuel      : une copie par mois, on garde les 24 dernières
 * Pour restaurer : exécuter « restaurer » → un fichier « tetee-restauration.json » apparaît dans le dossier,
 * à réimporter dans l'appli (Réglages → Importer), puis à supprimer.
 * Version lisible : la même feuille, avec 4 onglets par année
 * (Repas 2026, Biberons 2026, Couches 2026, Journal 2026, puis 2025…, une ligne de titre par jour), refaits chaque nuit pour l'année en cours,
 * regroupés par repas comme l'historique de l'appli.
 */

// Rempli automatiquement par l'appli (Réglages → Sauvegarde Google Drive → Copier le script)
const PROJET = '__PROJET__';
const FAMILLE = '__FAMILLE__';

// Rappels (appli ntfy) : canal secret. Les réglages (activé, intervalle, nuit, « Repousser »)
// sont lus dans Firebase à chaque passage : on les change depuis l'appli, rien à modifier ici.
const NTFY = '__NTFY__';
const RAPPELS_ACTIFS = false;      // rappels ntfy prêts mais désactivés pour le moment (mettre true pour les activer)
const FUSEAU = 'Europe/Paris';     // heures de la nuit, heure affichée et sauvegarde de 3 h, quel que soit le réglage du projet
const ECART = '__ECART__';         // temps entre repas compté depuis : 'fin' ou 'debut' du repas précédent (réglage de l'appli)
const PAUSE_LONGUE = 25;           // min : en dessous, même repas (tétées/biberons rapprochés) ; au-dessus, nouveau repas (comme l'appli)

const DOSSIER = 'Tétée – sauvegardes';
const GARDER = { Quotidien: 7, Hebdomadaire: 8, Mensuel: 24 };
const SAUV = 'Sauvegarde · ';         // onglets cachés « Sauvegarde · Quotidien · 2026-11-16 »
const RESTAURER = '';                 // vide = la plus récente ; sinon un nom d'onglet, ex. 'Sauvegarde · Mensuel · 2026-10'
const BASE = 'https://firestore.googleapis.com/v1';

/** À exécuter une seule fois : crée la sauvegarde de chaque nuit et la vérification des rappels toutes les 5 min. */
function installer() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['sauvegarder', 'rappel'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sauvegarder').timeBased().everyDays(1).atHour(3).inTimezone(FUSEAU).create();
  if (RAPPELS_ACTIFS && NTFY) {
    ScriptApp.newTrigger('rappel').timeBased().everyMinutes(5).create();
    const c = reglages();
    envoyer('Rappels de tétée installés', c.on ? `Activés : ${duree(c.every * 6e4)} après ${ECART === 'debut' ? 'le début' : 'la fin'} de chaque repas.` : "Ils s'activent depuis l'appli (Réglages → Rappels).", 3);
  }
  sauvegarder();
}

/** Envoie une notification de test (à exécuter à la main pour vérifier ntfy). */
function testerNotification() { envoyer('Test Tétée', 'Les notifications fonctionnent.', 3) }

/** Toutes les 5 min : si l'heure du rappel est passée, une notification (une seule par repas). */
function rappel() {
  if (!RAPPELS_ACTIFS || !NTFY) return;
  const c = reglages(); if (!c.on) return;
  const recents = derniers(40);   // assez large même avec couches, dodos, tirages et entrées supprimées
  if (recents.some(e => e.type === 'sein' && !e.end)) return;           // tétée en cours
  const repas = recents.find(e => e.type === 'biberon' || (e.type === 'sein' && e.end));
  if (!repas) return;
  // même règle que l'appli : on remonte les tétées/biberons rapprochés (< PAUSE_LONGUE) qui forment le même repas,
  // puis fin du repas + intervalle, repoussée par « Repousser »
  const repasListe = recents.filter(e => e.type === 'biberon' || (e.type === 'sein' && e.end));   // du plus récent au plus ancien
  let premier = repas;
  for (let i = repasListe.indexOf(repas) + 1; i < repasListe.length; i++) {
    const p = repasListe[i], fin = p.type === 'sein' ? p.end : p.start;
    if (premier.start - fin < PAUSE_LONGUE * 6e4) premier = p; else break;
  }
  const ref = ECART === 'debut' ? heureRetenue(premier)                          // début du repas
    : repasListe.slice(0, repasListe.indexOf(premier) + 1).reduce((m, p) => Math.max(m, p.type === 'sein' ? p.end : p.start), 0);   // ou sa fin
  const snz = c.snooze && c.snooze > ref ? c.snooze : 0;
  const quand = Math.max(ref + c.every * 6e4, snz), maintenant = Date.now(), du = maintenant - ref;
  if (maintenant < quand || maintenant > quand + 12 * 36e5) return;      // pas encore l'heure, ou trop ancien (12 h)
  const props = PropertiesService.getScriptProperties(), cle = premier.id + ':' + (snz || 0);
  if (props.getProperty('rappel') === cle) return;                       // déjà prévenu pour ce repas
  const tz = FUSEAU, h = +Utilities.formatDate(new Date(), tz, 'H');
  if (!c.night && (h >= 22 || h < 7)) return;                            // la nuit : on attend 7 h (comme l'appli)
  const heure = Utilities.formatDate(new Date(ref), tz, 'HH:mm');
  envoyer("C'est l'heure de la tétée", `Dernier repas ${ECART === 'debut' ? 'commencé' : 'terminé'} à ${heure}, il y a ${duree(du)}.`, 4);
  props.setProperty('rappel', cle);
}

/** Réglages des rappels enregistrés par l'appli (désactivés s'ils n'existent pas encore). */
function reglages() {
  const r = UrlFetchApp.fetch(`${BASE}/projects/${PROJET}/databases/(default)/documents/families/${FAMILLE}/config/rappel`, { muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return { on: false, every: 180, night: true, snooze: null };
  if (r.getResponseCode() !== 200) throw new Error(`Firestore ${r.getResponseCode()} : ${r.getContentText().slice(0, 300)}`);
  const c = champs(JSON.parse(r.getContentText()).fields || {});
  return { on: !!c.on, every: Math.max(30, +c.every || 180), night: c.night !== false, snooze: c.snooze || null };
}

function duree(ms) { const m = Math.round(ms / 6e4); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` }

function envoyer(titre, message, priorite) {
  UrlFetchApp.fetch('https://ntfy.sh/', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ topic: NTFY, title: titre, message, priority: priorite, tags: ['baby_bottle'] })
  });
}

/** Les N dernières entrées (par heure de début), non supprimées. */
function derniers(n) {
  const url = `${BASE}/projects/${PROJET}/databases/(default)/documents/families/${FAMILLE}:runQuery`;
  const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'events' }], orderBy: [{ field: { fieldPath: 'start' }, direction: 'DESCENDING' }], limit: n } }) });
  if (r.getResponseCode() !== 200) throw new Error(`Firestore ${r.getResponseCode()} : ${r.getContentText().slice(0, 300)}`);
  return JSON.parse(r.getContentText()).filter(x => x.document).map(x => champs(x.document.fields || {})).filter(e => !e.del);
}

function sauvegarder() {
  const events = lireTout().filter(e => !e.del);    // les entrées supprimées ne sont ni sauvegardées ni restaurées
  const json = JSON.stringify(events);               // compact : ~30 % plus léger (le fichier sert à restaurer, pas à lire)
  const racine = dossier(DriveApp.getRootFolder(), DOSSIER);
  const tz = FUSEAU, d = new Date();
  const jour = Utilities.formatDate(d, tz, 'yyyy-MM-dd'), ss = ouvrirJournal(racine);

  copie(ss, 'Quotidien', jour, json);
  const hebdo = sauvegardes(ss, 'Hebdomadaire')[0];
  if (!hebdo || new Date(dateDe(hebdo) + 'T12:00:00') < d.getTime() - 6.5 * 864e5) copie(ss, 'Hebdomadaire', jour, json);
  const mois = Utilities.formatDate(d, tz, 'yyyy-MM');
  if (!ss.getSheetByName(`${SAUV}Mensuel · ${mois}`)) copie(ss, 'Mensuel', mois, json);
  journal(events, racine);
  // anciennes versions : dossiers de fichiers .json → corbeille (récupérables 30 jours)
  ['Quotidien', 'Hebdomadaire', 'Mensuel'].forEach(n => { const it = racine.getFoldersByName(n); while (it.hasNext()) it.next().setTrashed(true) });
  console.log(`${events.length} entrées sauvegardées`);
}

/** Lit toutes les entrées de la famille dans Firestore (API REST, sans clé : les règles autorisent la lecture avec le code). */
function lireTout() {
  const url = `${BASE}/projects/${PROJET}/databases/(default)/documents/families/${FAMILLE}/events?pageSize=300`;
  const out = [];
  let token = '';
  do {
    const r = UrlFetchApp.fetch(url + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error(`Firestore ${r.getResponseCode()} : ${r.getContentText().slice(0, 300)}`);
    const j = JSON.parse(r.getContentText());
    (j.documents || []).forEach(doc => out.push(champs(doc.fields || {})));
    token = j.nextPageToken || '';
  } while (token);
  return out.sort((a, b) => (a.start || 0) - (b.start || 0));
}

/* Conversion du format Firestore REST vers des objets JavaScript simples */
function champs(f) {
  const o = {};
  Object.keys(f).forEach(k => o[k] = valeur(f[k]));
  return o;
}
function valeur(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valeur);
  if ('mapValue' in v) return champs(v.mapValue.fields || {});
  return null;
}

/* Outils Drive */
function dossier(parent, nom) {
  const it = parent.getFoldersByName(nom);
  return it.hasNext() ? it.next() : parent.createFolder(nom);
}
/* Sauvegardes dans des onglets cachés de la feuille : le JSON découpé en morceaux (une cellule ≤ 50 000 caractères) */
function sauvegardes(ss, type) {           // noms d'onglets d'un type (ou de tous), du plus récent au plus ancien
  return ss.getSheets().map(sh => sh.getName()).filter(n => n.indexOf(SAUV + (type ? type + ' · ' : '')) === 0)
    .sort((a, b) => dateDe(b).localeCompare(dateDe(a)));
}
function dateDe(nom) { return nom.split(' · ').pop() }
function copie(ss, type, date, json) {
  const nom = `${SAUV}${type} · ${date}`, sh = ss.getSheetByName(nom) || ss.insertSheet(nom, ss.getSheets().length);
  sh.clear();
  const morceaux = [];
  for (let i = 0; i < json.length; i += 40000) morceaux.push([json.slice(i, i + 40000)]);
  if (!morceaux.length) morceaux.push(['[]']);
  sh.getRange(1, 1, morceaux.length, 1).setNumberFormat('@').setValues(morceaux);   // texte : jamais de formule
  if (!sh.isSheetHidden()) sh.hideSheet();
  sauvegardes(ss, type).slice(GARDER[type]).forEach(n => ss.deleteSheet(ss.getSheetByName(n)));   // on garde les N plus récentes
}
/** À exécuter à la main : remet une sauvegarde en fichier « tetee-restauration.json » dans le dossier, à importer dans l'appli. */
function restaurer() {
  const racine = dossier(DriveApp.getRootFolder(), DOSSIER), ss = ouvrirJournal(racine);
  const toutes = sauvegardes(ss), nom = RESTAURER || toutes[0];
  const sh = nom && ss.getSheetByName(nom);
  if (!sh) throw new Error('Sauvegarde introuvable. Disponibles : ' + toutes.join(', '));
  const json = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0])).join('');
  const n = JSON.parse(json).length;            // vérifie que la copie est complète
  const it = racine.getFilesByName('tetee-restauration.json');
  while (it.hasNext()) it.next().setTrashed(true);
  racine.createFile('tetee-restauration.json', json, 'application/json');
  console.log(`${nom} : ${n} entrées → fichier « tetee-restauration.json » dans « ${DOSSIER} ». À importer dans l'appli puis à supprimer.`);
}
/** Heure retenue d'un repas : la reprise après la dernière longue pause d'une tétée, sinon son début. */
function heureRetenue(e) {
  let t = e.start;
  if (e.type !== 'sein' || !Array.isArray(e.segs)) return t;
  const s = e.segs.slice().sort((a, b) => a.a - b.a);
  for (let i = 1; i < s.length; i++) if (s[i - 1].b != null && s[i].a - s[i - 1].b >= PAUSE_LONGUE * 6e4) t = s[i].a;
  return t;
}

/* ---------- Journal lisible (Google Sheets) ---------- */
const JOURNAL = 'Tétée – journal';
const COUCHES = { humide: 'Humide (pipi)', sale: 'Sale (caca)', mixte: 'Mixte (pipi + caca)', explosion: 'Explosion' };

/** Repas = tétées terminées et biberons rapprochés (< PAUSE_LONGUE entre la fin de l'un et le début du suivant),
    exactement comme dans l'appli. Heure du repas = heure retenue de sa première entrée. Du plus ancien au plus récent. */
function repasDe(events) {
  const out = [];
  events.filter(e => e.type === 'biberon' || (e.type === 'sein' && e.end)).sort((a, b) => a.start - b.start).forEach(e => {
    const fin = e.type === 'sein' ? e.end : e.start, c = out[out.length - 1];
    if (c && e.start - c.fin < PAUSE_LONGUE * 6e4) { c.entrees.push(e); c.fin = Math.max(c.fin, fin) }
    else out.push({ entrees: [e], premier: e, t: heureRetenue(e), fin });
  });
  out.forEach((c, i) => { c.seins = c.entrees.filter(e => e.type === 'sein'); c.bibs = c.entrees.filter(e => e.type === 'biberon'); c.prec = i ? (ECART === 'debut' ? out[i - 1].t : out[i - 1].fin) : null; c.ecart = i ? Math.max(0, c.t - c.prec) : null });   // écart : depuis la fin (ou le début) du repas précédent
  return out;
}

/** Refait la feuille « Tétée – journal », lisible d'un coup d'œil : par année, 4 onglets
    (Repas, Biberons, Couches, Journal), du plus récent au plus ancien, avec une ligne de titre par jour
    (ex. « Dimanche 16 novembre · 8 repas · sein 2 h 10 · biberon 180 ml »). */
function journal(events, racine) {
  const tz = FUSEAU, h = t => Utilities.formatDate(new Date(t), tz, 'HH:mm'), cle = t => Utilities.formatDate(new Date(t), tz, 'yyyy-MM-dd');
  const min = ms => Math.round(ms / 6e4), cote = (e, s) => (e.segs || []).filter(x => x.s === s).reduce((m, x) => m + ((x.b || e.end || Date.now()) - x.a), 0);
  const notes = l => l.map(e => e.note).filter(Boolean).join(' · ');
  const lait = l => [...new Set(l.map(e => e.milk === 'maternel' ? 'maternel' : 'artificiel'))].join(' + ');
  const repas = repasDe(events).map(c => {
    const g = min(c.seins.reduce((m, e) => m + cote(e, 'G'), 0)), d = min(c.seins.reduce((m, e) => m + cote(e, 'D'), 0));
    return Object.assign(c, { g, d, ml: c.bibs.reduce((m, e) => m + (e.ml || 0), 0) });
  });                                                   // dans l'ordre de l'heure (jours du plus récent au plus ancien, voir parJour)
  const autres = events.filter(e => e.start && !(e.type === 'biberon' || (e.type === 'sein' && e.end)));

  // Repas : une ligne par repas ; « depuis le repas d'avant » = la ligne au-dessus (1er repas du jour : dernier repas de la veille, plus bas)
  const lignesR = repas.map(c => ({ t: c.t, row: [h(c.t), h(c.fin), c.g || '', c.d || '', c.ml ? `${c.ml} ml ${lait(c.bibs)}` : '',
    c.ecart != null ? duree(c.ecart) : '', notes(c.entrees)] }));
  const lignesB = repas.flatMap(c => c.bibs.map(e => ({ t: e.start, an: c.t,
    row: [h(e.start), e.ml || 0, e.milk === 'maternel' ? 'maternel' : 'artificiel', c.seins.length ? 'oui' : '', e.note || ''] })));
  const lignesC = autres.filter(e => e.type === 'couche').sort((a, b) => a.start - b.start).map(e => ({ t: e.start, e,
    row: [h(e.start), ligne(e, h).detail, e.note || ''] }));
  const lignesJ = repas.flatMap(c => [
    c.seins.length && { t: c.t, row: [h(c.t), 'Tétée', [c.g && `G ${c.g} min`, c.d && `D ${c.d} min`].filter(Boolean).join(' · ') || '0 min', notes(c.seins)] },
    c.bibs.length && { t: c.seins.length ? c.bibs[0].start : c.t, an: c.t, row: [h(c.seins.length ? c.bibs[0].start : c.t), 'Biberon', `${c.ml} ml ${lait(c.bibs)}`, notes(c.bibs)] }
  ].filter(Boolean)).concat(autres.map(e => { const l = ligne(e, h);
    return { t: e.start, row: [h(e.start), l.type, [l.detail, l.duree].filter(Boolean).join(' · '), e.note || ''] } }))
    .sort((a, b) => a.t - b.t);

  // titres de jour
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const nomJour = k => { const [y, m, d] = k.split('-').map(Number); return `${JOURS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MOIS[m - 1]}` };
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const resumes = {
    Repas: l => { const r = l.map(x => repas.find(c => c.t === x.t)), sein = r.reduce((m, c) => m + c.g + c.d, 0), ml = r.reduce((m, c) => m + c.ml, 0);
      return [`${r.length} repas`, sein && `sein ${duree(sein * 6e4)}`, ml && `biberon ${ml} ml`].filter(Boolean).join(' · ') },
    Biberons: l => `${pluriel(l.length, 'biberon')} · ${l.reduce((m, x) => m + x.row[1], 0)} ml`,
    Couches: l => { const k = l.map(x => ligne(x.e, h).detail), pipi = k.filter(x => /pipi|Explosion/.test(x)).length, caca = k.filter(x => /caca|Explosion/.test(x)).length;
      return `${pluriel(l.length, 'couche')} · ${pipi} pipi · ${caca} caca` },
    Journal: () => ''
  };
  const parJour = (type, lignes) => {                    // jour le plus récent en haut ; dans un jour, heures dans l'ordre
    const jours = new Map();
    lignes.forEach(x => { const k = cle(x.an ?? x.t); if (!jours.has(k)) jours.set(k, []); jours.get(k).push(x) });
    return [...jours.keys()].sort().reverse().flatMap(k => [{ titre: [nomJour(k), resumes[type](jours.get(k))].filter(Boolean).join(' · ') }, ...jours.get(k).map(x => x.row)]);
  };

  // un seul fichier, 4 onglets par année : l'année en cours chaque nuit ; l'année précédente aussi la première
  // semaine de janvier (corrections tardives) ; les onglets d'une année passée qui manquent sont créés une fois
  const annee = t => +Utilities.formatDate(new Date(t), tz, 'yyyy'), maintenant = new Date(), cette = annee(maintenant);
  const anDe = x => annee(x.an ?? x.t);                 // une ligne de repas suit l'année du repas (même à cheval sur minuit)
  const annees = [...new Set(lignesJ.map(anDe).concat(cette))].sort((a, b) => b - a);   // la plus récente d'abord
  const ss = ouvrirJournal(racine);
  ss.setSpreadsheetTimeZone(tz);
  const DEPUIS = `Depuis ${ECART === 'debut' ? 'le début' : 'la fin'} du repas d'avant`;
  const TYPES = [
    ['Repas', ['Début', 'Fin', 'Gauche (min)', 'Droit (min)', 'Biberon', DEPUIS, 'Note'], lignesR, [70, 70, 80, 80, 150, 150, 220]],
    ['Biberons', ['Heure', 'Quantité (ml)', 'Lait', 'Après une tétée', 'Note'], lignesB, [70, 100, 110, 100, 220]],
    ['Couches', ['Heure', 'Type', 'Note'], lignesC, [70, 180, 220]],
    ['Journal', ['Heure', 'Type', 'Détail', 'Note'], lignesJ, [70, 120, 240, 220]]
  ];
  for (const an of annees) {
    const aFaire = an === cette || (an === cette - 1 && maintenant.getMonth() === 0 && maintenant.getDate() <= 7);
    for (const [type, entete, lignes, largeurs] of TYPES)
      if (aFaire || !ss.getSheetByName(`${type} ${an}`)) onglet(ss, `${type} ${an}`, entete, parJour(type, lignes.filter(x => anDe(x) === an)), largeurs);
  }
  // rangement : année la plus récente d'abord ; anciens onglets (versions précédentes) supprimés, sauvegardes cachées gardées
  const ordre = annees.flatMap(an => TYPES.map(([type]) => `${type} ${an}`));
  ordre.forEach((nom, i) => { const sh = ss.getSheetByName(nom); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1) } });
  ss.getSheets().filter(sh => !ordre.includes(sh.getName()) && sh.getName().indexOf(SAUV) !== 0).forEach(sh => ss.deleteSheet(sh));
}

/** Le fichier « Tétée – journal » (hors corbeille) ; s'il manque, on reprend la plus récente des feuilles
    « Tétée – journal 2026 »… d'une version précédente (renommée), sinon on le crée. Les autres vont à la corbeille. */
function ouvrirJournal(racine) {
  const vivants = [], it = racine.getFiles();
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed() && (f.getName() === JOURNAL || f.getName().indexOf(JOURNAL + ' ') === 0)) vivants.push(f) }
  const f = vivants.find(x => x.getName() === JOURNAL) || vivants.sort((a, b) => b.getName().localeCompare(a.getName()))[0];
  vivants.filter(x => x !== f).forEach(x => x.setTrashed(true));   // anciennes feuilles par année : à la corbeille (récupérables)
  if (f) { if (f.getName() !== JOURNAL) f.setName(JOURNAL); return SpreadsheetApp.openById(f.getId()) }
  const ss = SpreadsheetApp.create(JOURNAL);
  DriveApp.getFileById(ss.getId()).moveTo(racine);
  return ss;
}

/** Crée ou vide l'onglet, puis écrit l'en-tête et les lignes ; une ligne { titre } = titre de jour (gras, sur fond).
    Tout est centré (sauf titres de jour et notes, à gauche) ; largeurs fixes, la dernière élargie si un titre ne tient pas. */
function onglet(ss, nom, entete, lignes, largeurs) {
  const sh = ss.getSheetByName(nom) || ss.insertSheet(nom), n = entete.length;
  sh.clear();
  const sur = v => typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;   // une note n'est jamais lue comme une formule
  const data = [entete].concat(lignes.map(l => l.titre ? [l.titre].concat(Array(n - 1).fill('')) : l.map(sur)));
  const tout = sh.getRange(1, 1, data.length, n);
  sh.getRange(1, 1, data.length, 1).setNumberFormat('@');                 // heures : texte, jamais réinterprétées
  tout.setValues(data).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(false);
  sh.getRange(1, n, data.length, 1).setHorizontalAlignment('left');      // notes
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#3D2B2B').setFontColor('#FFFFFF').setHorizontalAlignment('center').setWrap(true);
  const titres = []; lignes.forEach((l, i) => { if (l.titre) titres.push(`A${i + 2}:${String.fromCharCode(64 + n)}${i + 2}`) });
  if (titres.length) sh.getRangeList(titres).setFontWeight('bold').setBackground('#F0E8DC').setHorizontalAlignment('left');
  sh.setFrozenRows(1);
  // largeurs : le titre de jour le plus long doit tenir sur la ligne (≈ 8 px par caractère en gras)
  const l = largeurs.slice(), besoin = Math.max(0, ...lignes.filter(x => x.titre).map(x => x.titre.length * 8 + 24));
  const total = l.reduce((a, b) => a + b, 0); if (besoin > total) l[n - 1] += besoin - total;
  l.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);   // pas de colonnes vides à droite
}

/** Une entrée hors repas (couche, tirage, sommeil, vitamine D, mesure, tétée en cours) → type et détail en clair. */
function ligne(e, h) {
  const n = v => String(v).replace('.', ',');
  switch (e.type) {
    case 'sein': return { type: 'Tétée', detail: 'en cours', duree: '' };
    case 'tirage': return { type: 'Tirage', detail: `${(e.mlG || 0) + (e.mlD || 0)} ml (G ${e.mlG || 0} · D ${e.mlD || 0})`, duree: '' };
    case 'couche': {
      const k = COUCHES[e.kind] ? e.kind : e.pipi && e.caca ? 'mixte' : e.caca ? 'sale' : 'humide';
      return { type: 'Couche', detail: COUCHES[k], duree: '' };
    }
    case 'sommeil': return { type: 'Sommeil', detail: e.end ? `jusqu'à ${h(e.end)}` : 'dort encore', duree: e.end ? duree(e.end - e.start) : '' };
    case 'vitd': return { type: 'Vitamine D', detail: '1 dose', duree: '' };
    case 'mesure': return { type: 'Mesure', detail: [e.poids && `${n((e.poids / 1000).toFixed(3))} kg`, e.taille && `${n(e.taille)} cm`, e.tete && `tête ${n(e.tete)} cm`].filter(Boolean).join(' · '), duree: '' };
    default: return { type: e.type, detail: '', duree: '' };
  }
}
