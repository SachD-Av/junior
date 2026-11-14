/**
 * Sauvegarde automatique de l'appli Tétée vers Google Drive
 * + rappels de tétée par notification (appli ntfy), même téléphones en veille.
 *
 * À coller dans https://script.google.com (Nouveau projet), puis exécuter « installer » une fois.
 * Chaque nuit vers 3 h, le script copie toutes les données dans le dossier Drive
 * « Tétée – sauvegardes » :
 *   - Quotidien    : une copie par jour, on garde les 7 dernières
 *   - Hebdomadaire : une copie par semaine, on garde les 8 dernières
 *   - Mensuel      : une copie par mois, on garde les 24 dernières
 * Les fichiers .json se réimportent dans l'appli (Réglages → Importer).
 * La feuille Google Sheets « Tétée – journal » (même dossier) est la version lisible, refaite chaque nuit :
 * onglets Journal, Tétées, Biberons, Couches — regroupés par repas comme l'historique de l'appli.
 */

// Rempli automatiquement par l'appli (Réglages → Sauvegarde Google Drive → Copier le script)
const PROJET = '__PROJET__';
const FAMILLE = '__FAMILLE__';

// Rappels (appli ntfy) : canal secret. Les réglages (activé, intervalle, nuit, « Repousser »)
// sont lus dans Firebase à chaque passage : on les change depuis l'appli, rien à modifier ici.
const NTFY = '__NTFY__';
const RAPPELS_ACTIFS = false;      // rappels ntfy prêts mais désactivés pour le moment (mettre true pour les activer)
const FUSEAU = 'Europe/Paris';     // heures de la nuit, heure affichée et sauvegarde de 3 h, quel que soit le réglage du projet
const PAUSE_LONGUE = 25;           // min : en dessous, même repas (tétées/biberons rapprochés) ; au-dessus, nouveau repas (comme l'appli)

const DOSSIER = 'Tétée – sauvegardes';
const GARDER = { Quotidien: 7, Hebdomadaire: 8, Mensuel: 24 };
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
    envoyer('Rappels de tétée installés', c.on ? `Activés : ${duree(c.every * 6e4)} après le début de chaque repas.` : "Ils s'activent depuis l'appli (Réglages → Rappels).", 3);
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
  // puis heure du repas + intervalle, repoussée par « Repousser »
  const repasListe = recents.filter(e => e.type === 'biberon' || (e.type === 'sein' && e.end));   // du plus récent au plus ancien
  let premier = repas;
  for (let i = repasListe.indexOf(repas) + 1; i < repasListe.length; i++) {
    const p = repasListe[i], fin = p.type === 'sein' ? p.end : p.start;
    if (premier.start - fin < PAUSE_LONGUE * 6e4) premier = p; else break;
  }
  const ref = heureRetenue(premier);
  const snz = c.snooze && c.snooze > ref ? c.snooze : 0;
  const quand = Math.max(ref + c.every * 6e4, snz), maintenant = Date.now(), du = maintenant - ref;
  if (maintenant < quand || maintenant > quand + 12 * 36e5) return;      // pas encore l'heure, ou trop ancien (12 h)
  const props = PropertiesService.getScriptProperties(), cle = premier.id + ':' + (snz || 0);
  if (props.getProperty('rappel') === cle) return;                       // déjà prévenu pour ce repas
  const tz = FUSEAU, h = +Utilities.formatDate(new Date(), tz, 'H');
  if (!c.night && (h >= 22 || h < 7)) return;                            // la nuit : on attend 7 h (comme l'appli)
  const heure = Utilities.formatDate(new Date(ref), tz, 'HH:mm');
  envoyer("C'est l'heure de la tétée", `Dernier repas à ${heure}, il y a ${duree(du)}.`, 4);
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
  const jour = Utilities.formatDate(d, tz, 'yyyy-MM-dd');

  ecrire(dossier(racine, 'Quotidien'), `tetee-${jour}.json`, json);
  const hebdo = dossier(racine, 'Hebdomadaire');
  if (plusRecent(hebdo) < d.getTime() - 6.5 * 864e5) ecrire(hebdo, `tetee-semaine-${jour}.json`, json);
  const mois = dossier(racine, 'Mensuel'), nomMois = `tetee-${Utilities.formatDate(d, tz, 'yyyy-MM')}.json`;
  if (!existe(mois, nomMois)) ecrire(mois, nomMois, json);
  journal(events, racine);
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
function ecrire(dos, nom, contenu) {
  const it = dos.getFilesByName(nom);
  while (it.hasNext()) it.next().setTrashed(true);
  dos.createFile(nom, contenu, 'application/json');
  // rotation : on garde les N plus récents
  const fichiers = [];
  const all = dos.getFiles();
  while (all.hasNext()) { const f = all.next(); if (!f.isTrashed()) fichiers.push(f) }   // sans la corbeille
  fichiers.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  fichiers.slice(GARDER[dos.getName()] || 1000).forEach(f => f.setTrashed(true));
}
function plusRecent(dos) {
  let max = 0;
  const it = dos.getFiles();
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) max = Math.max(max, f.getDateCreated().getTime()) }
  return max;
}
function existe(dos, nom) {
  const it = dos.getFilesByName(nom);
  while (it.hasNext()) if (!it.next().isTrashed()) return true;
  return false;
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
  out.forEach((c, i) => { c.seins = c.entrees.filter(e => e.type === 'sein'); c.bibs = c.entrees.filter(e => e.type === 'biberon'); c.ecart = i ? c.t - out[i - 1].t : null });
  return out;
}

/** Refait la feuille « Tétée – journal », des plus récentes aux plus anciennes, comme l'historique de l'appli :
    Journal (tout ; par repas une ligne sein et une ligne biberon), Tétées (une ligne par repas), Biberons, Couches.
    Date et heure en texte ; minutes et ml en nombres (totaux possibles). */
function journal(events, racine) {
  const tz = FUSEAU, j = t => Utilities.formatDate(new Date(t), tz, 'dd/MM/yyyy'), h = t => Utilities.formatDate(new Date(t), tz, 'HH:mm');
  const min = ms => Math.round(ms / 6e4), cote = (e, s) => (e.segs || []).filter(x => x.s === s).reduce((m, x) => m + ((x.b || e.end || Date.now()) - x.a), 0);
  const qui = l => [...new Set(l.map(e => e.by).filter(Boolean))].join(', '), notes = l => l.map(e => e.note).filter(Boolean).join(' · ');
  const repas = repasDe(events);

  // Journal : lignes triées par heure ; chaque repas donne une ligne « Tétée » et/ou une ligne « Biberon »
  const lignesJ = [];
  repas.forEach(c => {
    if (c.seins.length) {
      const g = min(c.seins.reduce((m, e) => m + cote(e, 'G'), 0)), d = min(c.seins.reduce((m, e) => m + cote(e, 'D'), 0));
      const det = [g && `G ${g} min`, d && `D ${d} min`].filter(Boolean).join(' · ') || '0 min';
      const plus = [c.seins.length > 1 && `${c.seins.length} tétées`, c.t !== c.premier.start && `commencée à ${h(c.premier.start)}`].filter(Boolean).join(', ');
      lignesJ.push({ t: c.t, row: ['Tétée', det + (plus ? ` (${plus})` : ''), duree((g + d) * 6e4), c.ecart != null ? duree(c.ecart) : '', qui(c.seins), notes(c.seins)] });
    }
    if (c.bibs.length) {
      const ml = c.bibs.reduce((m, e) => m + (e.ml || 0), 0), lait = [...new Set(c.bibs.map(e => e.milk === 'maternel' ? 'maternel' : 'artificiel'))].join(' + ');
      lignesJ.push({ t: c.seins.length ? c.bibs[0].start : c.t, row: ['Biberon', `${ml} ml · lait ${lait}` + (c.bibs.length > 1 ? ` (${c.bibs.length} biberons)` : ''), '', c.seins.length || c.ecart == null ? '' : duree(c.ecart), qui(c.bibs), notes(c.bibs)] });
    }
  });
  events.filter(e => e.start && !(e.type === 'biberon' || (e.type === 'sein' && e.end))).forEach(e => {
    const l = ligne(e, h); lignesJ.push({ t: e.start, row: [l.type, l.detail, l.duree, '', e.by || '', e.note || ''] });
  });
  lignesJ.sort((a, b) => b.t - a.t);

  const it = racine.getFilesByName(JOURNAL);
  let ss = null;
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) { ss = SpreadsheetApp.openById(f.getId()); break } }
  if (!ss) { ss = SpreadsheetApp.create(JOURNAL); DriveApp.getFileById(ss.getId()).moveTo(racine) }
  ss.setSpreadsheetTimeZone(tz);
  const recents = l => l.slice().reverse();          // repas : du plus récent au plus ancien

  onglet(ss, 'Journal', 0, ['Date', 'Heure', 'Type', 'Détail', 'Durée', 'Écart', 'Par', 'Note'],
    lignesJ.map(x => [j(x.t), h(x.t), ...x.row]));
  onglet(ss, 'Tétées', 1, ['Date', 'Heure', 'Gauche (min)', 'Droit (min)', 'Total (min)', 'Tétées', 'Commencée à', 'Dernier sein', 'Biberon (ml)', 'Écart', 'Par', 'Note'],
    recents(repas.filter(c => c.seins.length)).map(c => {
      const g = min(c.seins.reduce((m, e) => m + cote(e, 'G'), 0)), d = min(c.seins.reduce((m, e) => m + cote(e, 'D'), 0));
      const der = c.seins.flatMap(e => e.segs || []).sort((a, b) => a.a - b.a).pop();
      return [j(c.t), h(c.t), g, d, g + d, c.seins.length, c.t !== c.premier.start ? h(c.premier.start) : '', der ? (der.s === 'G' ? 'gauche' : 'droit') : '',
        c.bibs.reduce((m, e) => m + (e.ml || 0), 0) || '', c.ecart != null ? duree(c.ecart) : '', qui(c.seins), notes(c.seins)];
    }));
  onglet(ss, 'Biberons', 2, ['Date', 'Heure', 'Quantité (ml)', 'Lait', 'Après une tétée', 'Par', 'Note'],
    recents(repas).flatMap(c => c.bibs.slice().reverse().map(e => [j(e.start), h(e.start), e.ml || 0, e.milk === 'maternel' ? 'maternel' : 'artificiel', c.seins.length ? 'oui' : '', e.by || '', e.note || ''])));
  onglet(ss, 'Couches', 3, ['Date', 'Heure', 'Type', 'Par', 'Note'],
    events.filter(e => e.type === 'couche').sort((a, b) => b.start - a.start).map(e => [j(e.start), h(e.start), ligne(e, h).detail, e.by || '', e.note || '']));
}

/** Crée ou vide l'onglet, puis écrit l'en-tête et les lignes. */
function onglet(ss, nom, position, entete, lignes) {
  let sh = ss.getSheetByName(nom);
  if (!sh) {
    // la feuille créée par Google a un premier onglet vide (« Feuille 1 ») : on le réutilise pour le Journal
    const premier = ss.getSheets()[0];
    sh = position === 0 && premier && premier.getLastRow() === 0 && !['Tétées', 'Biberons', 'Couches'].includes(premier.getName())
      ? premier.setName(nom) : ss.insertSheet(nom, position);
  }
  sh.clear();
  const data = [entete].concat(lignes);
  sh.getRange(1, 1, data.length, 2).setNumberFormat('@');                 // date et heure : texte, jamais réinterprétées
  sh.getRange(1, 1, data.length, entete.length).setValues(data);
  sh.getRange(1, 1, 1, entete.length).setFontWeight('bold').setBackground('#F0E8DC');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, entete.length);
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
