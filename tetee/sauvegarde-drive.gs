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
 */

// Rempli automatiquement par l'appli (Réglages → Sauvegarde Google Drive → Copier le script)
const PROJET = '__PROJET__';
const FAMILLE = '__FAMILLE__';

// Rappels (appli ntfy) : canal secret. Les réglages (activé, intervalle, nuit, « Repousser »)
// sont lus dans Firebase à chaque passage : on les change depuis l'appli, rien à modifier ici.
const NTFY = '__NTFY__';

const DOSSIER = 'Tétée – sauvegardes';
const GARDER = { Quotidien: 7, Hebdomadaire: 8, Mensuel: 24 };
const BASE = 'https://firestore.googleapis.com/v1';

/** À exécuter une seule fois : crée la sauvegarde de chaque nuit et la vérification des rappels toutes les 5 min. */
function installer() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['sauvegarder', 'rappel'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sauvegarder').timeBased().everyDays(1).atHour(3).create();
  if (NTFY) {
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
  if (!NTFY) return;
  const c = reglages(); if (!c.on) return;
  const recents = derniers(8);
  if (recents.some(e => e.type === 'sein' && !e.end)) return;           // tétée en cours
  const repas = recents.find(e => e.type === 'biberon' || (e.type === 'sein' && e.end));
  if (!repas) return;
  // même règle que l'appli : début du dernier repas + intervalle, repoussé par « Repousser »
  const snz = c.snooze && c.snooze > repas.start ? c.snooze : 0;
  const quand = Math.max(repas.start + c.every * 6e4, snz), maintenant = Date.now(), du = maintenant - repas.start;
  if (maintenant < quand || maintenant > quand + 180 * 6e4) return;       // pas encore l'heure, ou trop ancien
  const props = PropertiesService.getScriptProperties(), cle = repas.id + ':' + (snz || 0);
  if (props.getProperty('rappel') === cle) return;                       // déjà prévenu pour ce repas
  const tz = Session.getScriptTimeZone(), h = +Utilities.formatDate(new Date(), tz, 'H');
  if (!c.night && (h >= 22 || h < 7)) return;
  const heure = Utilities.formatDate(new Date(repas.start), tz, 'HH:mm');
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
  const events = lireTout();
  const json = JSON.stringify(events, null, 1);
  const racine = dossier(DriveApp.getRootFolder(), DOSSIER);
  const tz = Session.getScriptTimeZone(), d = new Date();
  const jour = Utilities.formatDate(d, tz, 'yyyy-MM-dd');

  ecrire(dossier(racine, 'Quotidien'), `tetee-${jour}.json`, json);
  const hebdo = dossier(racine, 'Hebdomadaire');
  if (plusRecent(hebdo) < d.getTime() - 6.5 * 864e5) ecrire(hebdo, `tetee-semaine-${jour}.json`, json);
  const mois = dossier(racine, 'Mensuel'), nomMois = `tetee-${Utilities.formatDate(d, tz, 'yyyy-MM')}.json`;
  if (!mois.getFilesByName(nomMois).hasNext()) ecrire(mois, nomMois, json);
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
  while (all.hasNext()) fichiers.push(all.next());
  fichiers.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  fichiers.slice(GARDER[dos.getName()] || 1000).forEach(f => f.setTrashed(true));
}
function plusRecent(dos) {
  let max = 0;
  const it = dos.getFiles();
  while (it.hasNext()) max = Math.max(max, it.next().getDateCreated().getTime());
  return max;
}
