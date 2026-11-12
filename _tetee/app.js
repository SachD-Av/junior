/* ---------- utilitaires ---------- */
const $ = s => document.querySelector(s);
/* Ancienne adresse (GitHub Pages, partagée avec l'appli prénoms) : l'appli n'y tourne plus,
   elle n'affiche que la page de déménagement vers sa propre adresse. */
const NEW_HOME = 'https://tetee.sach-d.workers.dev/';
const OLD_HOST = /(^|\.)github\.io$/.test(location.hostname);
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {
    if (!LS.warned) { LS.warned = true; setTimeout(() => toast('Stockage du téléphone plein : exportez vos données (Réglages)'), 0) } } }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => Date.now();
const pad = n => String(n).padStart(2, '0');
const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}` };
const dur = ms => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}` };
const hm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() };
const dayName = t => { const d0 = dayStart(now()), d = dayStart(t);
  if (d === d0) return "Aujourd'hui"; if (d0 - d < 864e5 * 1.5) return 'Hier';
  return new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) };
const dtl = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` };
/* Champ « quand » : l'heure (champ principal) + le jour (Aujourd'hui par défaut, Hier, …) */
const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}` };
function whenHTML(name, t, optional = false) {
  const d0 = dayStart(now()), off = t == null ? 0 : Math.round((dayStart(t) - d0) / 864e5);
  const label = i => i === 0 ? "Aujourd'hui" : i === -1 ? 'Hier' : new Date(d0 + i * 864e5 + 432e5).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const opts = []; for (let i = 0; i >= -6; i--) opts.push(i);
  if (!opts.includes(off)) opts.push(off);
  return `<div class="when"><input type="time" name="${name}" value="${t == null ? '' : hhmm(t)}" ${optional ? '' : 'required'}>
    <select name="${name}_d" aria-label="Jour">${opts.map(i => `<option value="${i}" ${i === off ? 'selected' : ''}>${label(i)}</option>`).join('')}</select></div>`;
}
function readWhen(f, name) {
  const v = f[name]?.value; if (!v) return null;
  const [h, m] = v.split(':').map(Number), d = new Date(dayStart(now()));
  d.setDate(d.getDate() + (+f[name + '_d'].value || 0)); d.setHours(h, m, 0, 0);
  return d.getTime();
}
const buzz = () => navigator.vibrate?.(25);
const SIDE = { G: 'Gauche', D: 'Droit' };    // libellés des boutons (sein gauche / sein droit)
const SEIN = { G: 'gauche', D: 'droit' };     // « sein gauche / sein droit »
/* Types de couche (pipi/caca restent calculés pour la compatibilité et les stats) */
const COUCHE = {
  humide: { l: 'Humide', sub: 'pipi', ic: 'drop', pipi: true, caca: false },
  sale: { l: 'Sale', sub: 'caca', ic: 'poop', pipi: false, caca: true },
  mixte: { l: 'Mixte', sub: 'pipi + caca', ic: 'mixed', pipi: true, caca: true },
  explosion: { l: 'Explosion', sub: 'ça déborde !', ic: 'burst', pipi: true, caca: true }
};
const coucheKind = e => COUCHE[e.kind] ? e.kind : e.pipi && e.caca ? 'mixte' : e.caca ? 'sale' : 'humide';

/* Icônes vectorielles (trait 2 px, couleur du texte) */
const ICONS = {
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1.5" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1.5" fill="currentColor" stroke="none"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  feed: '<path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11z"/>',
  bottle: '<path d="M10 2h4v3h-4z"/><path d="M9 5h6l1.5 3.5V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8.5z"/><path d="M7.5 12H11M7.5 16H11"/>',
  diaper: '<path d="M3 6h18v4a9 9 0 0 1-18 0z"/><path d="M8 6v3M16 6v3"/>',
  drop: '<path d="M12 2.7S6 9.3 6 14a6 6 0 0 0 12 0c0-4.7-6-11.3-6-11.3z"/>',
  mixed: '<path d="M7 3S3 7.5 3 10.5a4 4 0 0 0 8 0C11 7.5 7 3 7 3z"/><path d="M12.5 21h7.5a2.2 2.2 0 0 0 .3-4.4 2.2 2.2 0 0 0-1.8-3.5A2.6 2.6 0 0 0 16 10.5c.3 1.1-.4 1.8-1.3 2.1a2.2 2.2 0 0 0-1.6 4A2.2 2.2 0 0 0 12.5 21z"/>',
  pump: '<path d="M7 3h10l-3 5h-4z"/><path d="M10 8v2M14 8v2"/><rect x="7" y="10" width="10" height="11" rx="2.5"/><path d="M7 15h3.5M7 18h3.5"/>',
  moon2: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5z"/><path d="M15 3h4l-4 4h4"/>',
  scale: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8.5 11a3.5 3.5 0 0 1 7 0"/><path d="M12 11l1.5-2"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  burst: '<path d="M12 2l1.8 4.6L18 4l-1 4.9L22 10l-4.2 2.6L20 17l-4.8-.8L14 21l-2-4-2 4-1.2-4.8L4 17l2.2-4.4L2 10l5-1.1L6 4l4.2 2.6z"/>',
  poop: '<path d="M6.5 20h11a3 3 0 0 0 .4-6 3 3 0 0 0-2.4-4.9A3.5 3.5 0 0 0 12 4c.4 1.6-.6 2.5-1.8 2.9A3 3 0 0 0 8 13.6 3 3 0 0 0 6.5 20z"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z"/>',
  cloudOff: '<path d="M17.5 19H9a7 7 0 0 1-5-11.9M8.6 5.2A7 7 0 0 1 15.7 10h1.8a4.5 4.5 0 0 1 3 7.8M2 2l20 20"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  swap: '<path d="M7 16l-4-4 4-4M3 12h18M17 8l4 4-4 4"/>'
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
document.querySelectorAll('[data-i]').forEach(el => el.innerHTML = ic(el.dataset.i));

/* ---------- état ---------- */
const S = Object.assign({ theme: 'auto', onehand: true, name: '', fb: null, fam: null, milk: 'artificiel',
  guard: 'undo', delay: 10, morning: 8, minFeed: 5, longPause: 15,
  remind: false, remindEvery: 180, remindNight: true, remindNotified: null, remindSnooze: null, remindU: 0, ntfy: false, ntfyTopic: null,
  prot: { start: true, switch: true, stop: true, cancel: true, quick: true } }, LS.get('tt_settings', {}));
if (!S.themeV2) { S.theme = 'auto'; S.themeV2 = 1; if (!OLD_HOST) LS.set('tt_settings', S) } // l'ancien bouton 🌙 désactivait l'auto pour toujours
S.prot = Object.assign({ start: true, switch: true, stop: true, cancel: true, quick: true }, S.prot);
const saveSettings = () => { if (!OLD_HOST) LS.set('tt_settings', S) };   // rien n'est plus écrit à l'ancienne adresse
/* Toute donnée venant de l'extérieur (synchro, import, stockage) est revalidée :
   types stricts, longueurs bornées, id alphanumérique. Rien d'autre n'atteint le HTML. */
const num = v => { const n = +v; return Number.isFinite(n) ? n : 0 };
const str = (v, n) => v == null || v === '' ? null : String(v).slice(0, n);
function clean(e, forcedId) {
  if (!e || typeof e !== 'object' || !['sein', 'biberon', 'couche', 'tirage', 'sommeil', 'mesure'].includes(e.type)) return null;
  const id = String(forcedId ?? e.id ?? '');
  if (!/^[\w-]{1,40}$/.test(id)) return null;
  const o = { id, type: e.type, start: num(e.start), end: e.end == null ? null : num(e.end),
    u: Math.min(num(e.u), Date.now() + 6e5), del: !!e.del, note: str(e.note, 500), by: str(e.by, 40) };
  if (!o.start) return null;
  if (o.type === 'sein') {
    o.segs = (Array.isArray(e.segs) ? e.segs : []).slice(0, 200)
      .filter(x => x && (x.s === 'G' || x.s === 'D'))
      .map(x => ({ s: x.s, a: num(x.a), b: x.b == null ? null : num(x.b) }));
  } else if (o.type !== 'sommeil') o.end = o.start;
  if (o.type === 'sommeil' && o.end != null && o.end < o.start) o.end = o.start;
  if (o.type === 'mesure') {
    const q = (v, max) => { const n = Math.round(num(v) * 10) / 10; return n > 0 && n <= max ? n : null };
    o.poids = q(e.poids, 30000); o.taille = q(e.taille, 150); o.tete = q(e.tete, 80);
  }
  if (o.type === 'tirage') { const q = v => Math.min(2000, Math.max(0, Math.round(num(v)))); o.mlG = q(e.mlG); o.mlD = q(e.mlD); o.ml = o.mlG + o.mlD }
  if (o.type === 'biberon') { o.ml = Math.min(2000, Math.max(0, Math.round(num(e.ml)))); o.milk = e.milk === 'maternel' ? 'maternel' : 'artificiel' }
  if (o.type === 'couche') { const k = coucheKind(e); o.kind = k; o.pipi = COUCHE[k].pipi; o.caca = COUCHE[k].caca }
  return o;
}
const FAM_RE = /^[a-z0-9]{9,32}$/;
/* Réglages lus dans le stockage : revalidés un par un (listes blanches), jamais utilisés tels quels */
function cleanSettings() {
  const one = (k, ok, d) => { if (!ok(S[k])) S[k] = d };
  const isB = v => typeof v === 'boolean', isN = v => typeof v === 'number' && Number.isFinite(v), inL = l => v => l.includes(v);
  one('theme', inL(['auto', 'day', 'night']), 'auto'); one('onehand', isB, true);
  S.name = typeof S.name === 'string' ? S.name.slice(0, 40) : '';
  one('milk', inL(['artificiel', 'maternel']), 'artificiel'); one('guard', inL(['undo', 'double', 'confirm', 'none']), 'undo');
  one('delay', inL([3, 5, 10, 15]), 10); one('morning', inL([6, 7, 8, 9, 10]), 8); one('minFeed', inL([0, 5, 30, 60]), 5); one('longPause', inL([0, 10, 15, 20, 30]), 15);
  one('remind', isB, false); one('remindEvery', v => Number.isInteger(v) && v >= 30 && v <= 720, 180); one('remindNight', isB, true);
  one('remindSnooze', v => v === null || isN(v), null); one('remindU', isN, 0); one('remindNotified', v => v === null || typeof v === 'string', null);
  one('ntfy', isB, false); one('ntfyTopic', v => v === null || /^tetee-[0-9a-f]{24}$/.test(v), null);
  one('statTab', inL(['today', '24h', 'week', 'growth']), 'today'); one('syncedAt', isN, 0);
  one('syncedFam', v => v === null || v === undefined || FAM_RE.test(v), null);
  one('force', v => v === null || v === undefined || (v && isB(v.night) && isN(v.until)), null);
  S.prot = Object.fromEntries(['start', 'switch', 'stop', 'cancel', 'quick'].map(k => [k, S.prot?.[k] !== false]));
  // configuration Firebase : mêmes contrôles qu'à l'invitation (sinon on repasse en local)
  const c = S.fb && parseCfg(JSON.stringify(S.fb));
  if (!c || !/^[a-z0-9-]{4,40}$/.test(c.projectId) || !FAM_RE.test(S.fam || '')) { S.fb = null; S.fam = null } else S.fb = c;
  saveSettings();                                    // la version nettoyée remplace l'ancienne
}
cleanSettings();
const events = new Map(LS.get('tt_events', []).map(e => clean(e)).filter(Boolean).map(e => [e.id, e]));
const saveLocal = () => { if (!OLD_HOST) LS.set('tt_events', [...events.values()]) };
saveLocal();                                         // stockage réécrit avec les données nettoyées
let view = 'home', cloud = null;

const list = () => [...events.values()].filter(e => !e.del).sort((a, b) => b.start - a.start);
const active = () => list().find(e => e.type === 'sein' && !e.end);
const sleeping = () => list().find(e => e.type === 'sommeil' && e.end == null);
const sleepMs = (e, a = -Infinity, b = Infinity, t = now()) => Math.max(0, Math.min(e.end ?? t, b) - Math.max(e.start, a));
const openSeg = e => e.segs.find(s => !s.b);
const sideMs = (e, side, t = now()) => e.segs.filter(s => !side || s.s === side).reduce((m, s) => m + ((s.b ?? t) - s.a), 0);
/* Heure retenue d'un repas : son début, sauf si la tétée contient une longue pause
   (couche, câlin… ≥ S.longPause min) : on compte alors à partir de la reprise qui suit la dernière longue pause.
   Sert pour « Dernier repas », l'écart, les stats et le rappel. */
function mealRef(e) {
  const r = { t: e.start, pause: 0 };
  if (e.type !== 'sein' || !S.longPause) return r;
  const segs = [...e.segs].sort((a, b) => a.a - b.a);
  for (let i = 1; i < segs.length; i++) {
    const prevEnd = segs[i - 1].b; if (prevEnd == null) continue;
    const gap = segs[i].a - prevEnd;
    if (gap >= S.longPause * 6e4) { r.t = segs[i].a; r.pause = gap }
  }
  return r;
}
const refNote = e => { const r = mealRef(e); return r.pause ? `repris à ${hm(r.t)}` : '' };
const isMeal = e => e.type === 'biberon' || (e.type === 'sein' && e.end);

function put(e) {
  e.u = Math.max(now(), (events.get(e.id)?.u || 0) + 1);   // toujours plus récent que la version connue (horloges décalées)
  if (!e.by && S.name) e.by = S.name;
  e = clean(e); if (!e) return;
  events.set(e.id, e);
  saveLocal();
  cloud?.write(e);
  render();
}

/* ---------- actions tétée ---------- */
/* Une action = 1 tap. Les actions qui comptent (démarrer, changer de sein, terminer,
   supprimer, noter une couche ou un biberon) affichent 10 s un bandeau « Annuler ». */
let toastTimer = 0;
function toast(msg, onUndo) {
  const el = $('#toast'), u = el.querySelector('#toastUndo');
  el.querySelector('#toastMsg').textContent = msg;
  u.hidden = !onUndo;
  u.onclick = () => { hideToast(); onUndo?.(); buzz() };
  el.style.setProperty('--delay', S.delay + 's');
  el.hidden = false;
  const bar = el.querySelector('#toastBar'); bar.style.animation = 'none'; bar.offsetWidth; bar.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, S.delay * 1000);
}
function hideToast() { clearTimeout(toastTimer); $('#toast').hidden = true }
/* Exécute fn (qui renvoie l'id touché) et propose d'annuler : on remet l'entrée
   telle qu'elle était, ou on supprime celle qui vient d'être créée. */
function undoable(msg, fn) {
  const a = active(), snap = a ? structuredClone(a) : null;
  const id = fn(); if (!id) return;
  toast(typeof msg === 'function' ? msg(events.get(id)) : msg, () => {
    if (snap && snap.id === id) put(snap);
    else { const e = events.get(id); if (e) put({ ...e, del: true }) }
  });
}

/* Protection contre les erreurs, réglable dans Réglages :
   'undo'    : l'action est faite tout de suite, bandeau « Annuler » (par défaut, le plus naturel)
   'double'  : il faut toucher 2 fois le même bouton
   'confirm' : une fenêtre demande confirmation (fermée toute seule = non)
   'none'    : aucune protection
   kind = start | switch | stop | cancel | quick (couche, biberon : déjà dans une fenêtre → bandeau seulement) */
let armed = null, armTimer = 0;
const armCls = k => armed === k ? ' armed' : '';
function guard(kind, { ask, done }, fn, key = kind) {
  if (S.guard === 'none' || !S.prot[kind]) return void fn();
  const mode = kind === 'quick' ? 'undo' : S.guard;
  if (mode === 'undo') return undoable(done, fn);
  if (mode === 'double') {
    if (armed === key) { armed = null; clearTimeout(armTimer); hideToast(); fn(); return }
    armed = key; buzz(); render(); toast(`${ask} Touchez encore pour confirmer.`);
    clearTimeout(armTimer); armTimer = setTimeout(() => { armed = null; render() }, S.delay * 1000);
    return;
  }
  confirmDialog(ask, fn);
}
function confirmDialog(ask, fn) {
  let timer;
  dialog(`<h3>${esc(ask)}</h3>
    <menu><button class="btn" value="cancel">Non</button><button class="btn primary" value="ok">Oui</button></menu>
    <i class="dlgbar" style="--delay:${S.delay}s"></i>`,
    () => { clearTimeout(timer); fn() },
    f => { timer = setTimeout(() => $('#dlg').open && $('#dlg').close(), S.delay * 1000);
      $('#dlg').addEventListener('close', () => clearTimeout(timer), { once: true }) });
}

/* Deux tétées ouvertes en même temps (démarrées sur les 2 téléphones avant la synchro,
   ou téléphone hors ligne) : on garde la plus récente et on ferme les autres à son début. */
function fixOpenFeeds() {
  const open = list().filter(e => e.type === 'sein' && !e.end);
  for (const e of open.slice(1)) {
    const cut = Math.min(open[0].start, now()), o = openSeg(e);
    if (o) o.b = Math.max(o.a, cut);
    e.end = e.segs.at(-1)?.b ?? e.start;
    put(e);
  }
}

function tapSide(side) {
  const t = now();
  let e = active();
  if (!e) e = { id: uid(), type: 'sein', start: t, end: null, segs: [] };
  const o = openSeg(e);
  if (o && o.s === side) return;
  if (o) o.b = t;
  e.segs.push({ s: side, a: t, b: null });
  buzz(); put(e); return e.id;
}
function sideTap(side) {
  const e = active();
  if (!e) return guard('start', { ask: `Démarrer sur le sein ${SEIN[side]} ?`, done: `Tétée démarrée · sein ${SEIN[side]}` }, () => tapSide(side), 'start' + side);
  const o = openSeg(e), last = e.segs.at(-1)?.s;
  if (o?.s === side) return;
  if (!o && last === side) return resume();
  guard('switch', { ask: `Passer au sein ${SEIN[side]} ?`, done: `Passage au sein ${SEIN[side]}` }, () => tapSide(side), 'switch' + side);
}
function pause() { const e = active(), o = e && openSeg(e); if (o) { o.b = now(); buzz(); put(e) } }
function resume() { const e = active(); if (!e) return; e.segs.push({ s: e.segs.at(-1)?.s || 'G', a: now(), b: null }); buzz(); put(e) }
function stop() {
  guard('stop', { ask: 'Terminer la tétée ?', done: e => e?.del ? 'Tétée trop courte, ignorée' : `Tétée terminée · ${dur(sideMs(e))}` }, () => {
    const e = active(); if (!e) return;
    const t = now(), o = openSeg(e);
    if (o) o.b = t;
    e.end = e.segs.at(-1)?.b ?? t;      // une pause en cours n'est pas comptée
    if (sideMs(e) < S.minFeed * 1000) e.del = true; // tap par erreur
    buzz(); put(e); return e.id;
  });
}
/* Corriger à la volée : ajoute ou retire du temps sur un côté de la tétée en cours.
   Ajouter recule le début du dernier passage sur ce sein (ou crée un passage avant le début). */
function adjust(side, min) {
  const e = active(); if (!e) return;
  const t = now(), mine = e.segs.filter(x => x.s === side);
  if (min > 0) {
    if (mine.length) mine.at(-1).a -= min * 6e4;
    else { const a0 = e.segs.length ? Math.min(...e.segs.map(x => x.a)) : e.start; e.segs.unshift({ s: side, a: a0 - min * 6e4, b: a0 }) }
  } else {
    let rem = -min * 6e4;
    for (const x of mine.reverse()) {
      const take = Math.min(rem, (x.b ?? t) - x.a); x.a += take; rem -= take;
      if (rem <= 0) break;
    }
    e.segs = e.segs.filter(x => !x.b || x.b > x.a); // retire les passages devenus vides
  }
  if (e.segs.length) e.start = Math.min(...e.segs.map(x => x.a));
  buzz(); put(e);
}
function adjustDialog() {
  const row = s => `<div class="adj"><b class="side ${s}">${s}</b><span class="t" data-t="${s}"></span>
    <span class="quick">${[-5, -1, 1, 5].map(m => `<button type="button" class="btn" data-s="${s}" data-m="${m}">${m > 0 ? '+' : '−'}${Math.abs(m)}</button>`).join('')}</span></div>`;
  dialog(`<h3>${ic('pencil')} Corriger les temps</h3>
    <p class="sub">Vous avez oublié de lancer le chrono ou de changer de côté ? Ajoutez ou retirez des minutes.</p>
    ${row('G')}${row('D')}
    <div class="sub">Début de la tétée : <b data-t="startHm"></b></div>
    <menu><button class="btn primary" value="cancel">OK</button></menu>`, () => {},
    f => f.addEventListener('click', ev => { const b = ev.target.closest('[data-m]'); if (b) { adjust(b.dataset.s, +b.dataset.m); tick() } }));
  tick();
}
function forgotDialog() {
  dialog(`<h3>${ic('plus')} Ajouter un oubli</h3>
    <button class="btn row-btn" value="sein">${ic('feed')}Tétée</button><button class="btn row-btn" value="biberon">${ic('bottle')}Biberon</button><button class="btn row-btn" value="couche">${ic('diaper')}Couche</button><button class="btn row-btn" value="tirage">${ic('pump')}Tirage</button><button class="btn row-btn" value="sommeil">${ic('moon2')}Sommeil</button><button class="btn row-btn" value="mesure">${ic('scale')}Mesure (poids, taille)</button>
    <menu><button class="btn" value="cancel">Annuler</button></menu>`, v => setTimeout(() => newEntry(v)));
}
function lastMesure() { const m = list().find(e => e.type === 'mesure'); return m ? { poids: m.poids, taille: m.taille, tete: m.tete } : {} }
function newEntry(type) {
  const t = now();
  editDialog(type === 'sein' ? { id: uid(), type, start: t - 15 * 6e4, end: t, segs: [] }
    : type === 'sommeil' ? { id: uid(), type, start: t - 60 * 6e4, end: t }
    : type === 'mesure' ? { id: uid(), type, start: t, end: t, ...lastMesure() }
    : { id: uid(), type, start: t, end: t, ml: 0, mlG: 0, mlD: 0, milk: S.milk, kind: 'humide' }, true);
}
function sleepToggle() {
  const z = sleeping(), t = now(), undo = S.guard !== 'none' && S.prot.quick;
  if (z) {
    z.end = t; buzz(); put(z);
    if (undo) toast(`Réveil · a dormi ${dur(t - z.start)}`, () => { const e = events.get(z.id); if (e) { e.end = null; put(e) } });
  } else {
    const e = { id: uid(), type: 'sommeil', start: t, end: null }; buzz(); put(e);
    if (undo) toast('Sommeil démarré', () => { const x = events.get(e.id); if (x) { x.del = true; put(x) } });
  }
}
function cancelFeed() { guard('cancel', { ask: 'Supprimer cette tétée ?', done: 'Tétée supprimée' }, () => { const e = active(); if (e) { e.del = true; put(e); return e.id } }) }

/* ---------- thème ---------- */
/* Lever / coucher du soleil (algorithme NOAA simplifié), position par défaut : centre de la France. */
function sunTimes(t, lat = 46.6, lon = 2.4) {
  const rad = Math.PI / 180, J2000 = 2451545, d = t / 864e5 + 2440587.5 - J2000, lw = -lon * rad, phi = lat * rad;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI)), ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(rad * 23.4397) * Math.sin(L));
  const Jt = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const toMs = j => (j - 2440587.5) * 864e5, half = w / (2 * Math.PI);
  return { rise: toMs(Jt - half), set: toMs(Jt + half) };
}
/* Auto : nuit du coucher du soleil jusqu'au lever, et jamais de mode jour avant 8 h. */
/* Heures de passage du jour (lever, jamais avant S.morning) et de la nuit (coucher) pour le jour de t */
function dayBounds(t) {
  const noon = new Date(t); noon.setHours(12, 0, 0, 0);
  const { rise, set } = sunTimes(noon.getTime());
  return { day: Math.max(rise, new Date(t).setHours(S.morning, 0, 0, 0)), night: set };
}
function autoNight(t = now()) { const b = dayBounds(t); return t < b.day || t >= b.night }
function nextSwitch(t = now()) { const b = dayBounds(t); return t < b.day ? b.day : t < b.night ? b.night : dayBounds(t + 864e5).day }
/* Le bouton lune/soleil force le mode jusqu'au prochain lever/coucher (2 h au plus), puis l'auto reprend. */
function isNight(t = now()) {
  if (S.theme !== 'auto') return S.theme === 'night';
  if (S.force && t < S.force.until) return S.force.night;
  return autoNight(t);
}
function toggleNight() {
  if (S.theme !== 'auto') S.theme = S.theme === 'night' ? 'day' : 'night';
  else {
    const want = !isNight();
    S.force = want === autoNight() ? null : { night: want, until: Math.min(nextSwitch(), now() + 2 * 36e5) };
  }
  saveSettings(); render(true);
}
function applyTheme() {
  const n = isNight();
  document.documentElement.dataset.theme = n ? 'night' : 'day';
  document.querySelector('meta[name=theme-color]').content = n ? '#000000' : '#FAF7F2';
  document.body.classList.toggle('onehand', !!S.onehand);
  const nb = document.querySelector('[data-act=night]'); if (nb) nb.innerHTML = ic(n ? 'sun' : 'moon');
}

/* ---------- rendu ---------- */
function render(force) {
  if (OLD_HOST) return;
  applyTheme();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  if (view === 'settings' && !force) return; // ne pas effacer une saisie en cours
  const m = $('#main');
  m.className = 'v-' + view;
  m.innerHTML = view === 'home' ? homeHTML() : view === 'history' ? historyHTML() : view === 'stats' ? statsHTML() : settingsHTML();
  tick();
  wake(!!active());
}

function homeHTML() {
  const e = active();
  if (e) {
    const o = openSeg(e), last = e.segs.at(-1)?.s || 'G';
    const sideBtn = s => {
      const cur = o?.s === s;
      const hint = cur ? 'en cours' : !o && last === s ? 'reprendre ici' : 'passer ici';
      return `<button class="btn side mini ${s} ${cur ? 'on' : ''} ${!cur && o ? 'dim' : ''}${armCls('switch' + s)}" data-act="side" data-s="${s}">
        <span class="sl">${s}</span><span class="t" data-t="${s}"></span><small>${hint}</small></button>`;
    };
    return `<section class="home feed">
      <div class="card since">
        <div class="lbl">${o ? 'Sein ' + SEIN[o.s] : 'En pause'}</div>
        <div class="big" data-t="total"></div>
        <div class="sub ${o ? '' : 'paused'}" data-t="pause"></div>
      </div>
      <div class="grid2 minis">${sideBtn('G')}${sideBtn('D')}</div>
      ${o ? `<button class="btn huge" data-act="pause">${ic('pause')}<span>Pause</span><small>rot, câlin, changement…</small></button>`
          : `<button class="btn huge resume ${last}" data-act="resume">${ic('play')}<span>Reprendre</span><small>sein ${SEIN[last]}</small></button>`}
      <div class="grid2 feedbar">
        <button class="btn" data-act="adjust">${ic('pencil')}<small>Corriger</small></button>
        <button class="btn primary${armCls('stop')}" data-act="stop">${ic('check')}<span>Terminer</span></button>
      </div>
      <button class="link${armCls('cancel')}" data-act="cancel">Annuler la tétée</button>
    </section>`;
  }
  const L = list(), meal = L.find(isMeal), lastSein = L.find(x => x.type === 'sein' && x.end);
  const lastSide = lastSein?.segs.at(-1)?.s, lastCouche = L.find(x => x.type === 'couche'), zz = sleeping();
  const t0 = dayStart(now()), today = summarize(L.filter(x => x.start >= t0));
  let sub = '—';
  if (meal) sub = meal.type === 'sein'
    ? [hm(meal.start), refNote(meal), dur(sideMs(meal)), meal.segs.length && 'fin sein ' + SEIN[meal.segs.at(-1).s]].filter(Boolean).join(' · ')
    : `${hm(meal.start)} · biberon ${meal.ml} ml`;
  return `<section class="home idle">
    <button class="card since tap" data-view="history" aria-label="Voir l'historique">
      <div class="lbl">Dernier repas il y a</div>
      <div class="big" data-t="since">${meal ? '' : '—'}</div>
      <div class="sub">${sub}</div>
      ${S.remind && meal ? `<div class="next" data-t="next"></div>` : ''}
    </button>
    ${S.remind && meal && nextMeal() && nextMeal().at - now() < 30 * 6e4 ? `<button class="link" data-act="snooze">Repousser le rappel de 30 min</button>` : ''}
    <div class="grid2 mini-tiles">
      <div class="card tile"><span class="lbl">Dernier sein</span><b>${lastSein ? (lastSide ? SIDE[lastSide] : '—') : '—'}</b>
        <small>${lastSein ? `${hm(lastSein.start)} · ${dur(sideMs(lastSein))}` : 'aucune tétée'}</small></div>
      <div class="card tile"><span class="lbl">Dernière couche</span><b data-t="sinceCouche">${lastCouche ? '' : '—'}</b>
        <small>${lastCouche ? `${hm(lastCouche.start)} · ${COUCHE[coucheKind(lastCouche)].l.toLowerCase()}` : 'aucune'}</small></div>
    </div>
    <div class="card today">
      <div class="today-h"><span class="lbl">Aujourd'hui</span>
        <span><b>${today.seins}</b> tétée${today.seins > 1 ? 's' : ''} · <b>${today.bibs}</b> bib. ${today.ml ? `(${today.ml} ml)` : ''} · <b>${today.couches}</b> couche${today.couches > 1 ? 's' : ''}${today.tirs ? ` · <b>${today.tirG + today.tirD}</b> ml tirés` : ''}${today.tSleep ? ` · <b>${dur(today.tSleep)}</b> de sommeil` : ''}</span></div>
      ${timeline(L)}
    </div>
    <div class="spacer"></div>
    ${zz ? `<button class="card sleepbar" data-act="sleep">${ic('moon2')}<span>Dort depuis <b data-t="sleep"></b><small>depuis ${hm(zz.start)}</small></span><em>Réveil</em></button>` : ''}
    <div class="grid2 gd">
      ${['G', 'D'].map(s => `<button class="btn side ${s}${armCls('start' + s)}" data-act="side" data-s="${s}">${s}<small>${SIDE[s]}</small>
        ${lastSide === s ? '<span class="badge">dernier</span>' : ''}</button>`).join('')}
    </div>
    <div class="grid4">
      <button class="btn" data-act="bib">${ic('bottle')}<span>Biberon</span></button>
      <button class="btn" data-act="couche">${ic('diaper')}<span>Couche</span></button>
      <button class="btn" data-act="tirage">${ic('pump')}<span>Tirage</span></button>
      <button class="btn${zz ? ' sleeping' : ''}" data-act="sleep">${ic('moon2')}<span>${zz ? 'Réveil' : 'Dodo'}</span></button>
    </div>
    <button class="link" data-act="forgot">Ajouter un oubli</button>
  </section>`;
}

/* Frise de la journée (minuit → minuit) : tétées par sein, biberons, couches, et l'heure actuelle */
function timeline(L) {
  const t0 = dayStart(now()), pct = t => Math.max(0, Math.min(100, (t - t0) / 864e5 * 100)).toFixed(2), T = now();
  let marks = '';
  for (const e of L) {
    if (e.start < t0 - 18 * 36e5) break;          // liste triée du plus récent au plus ancien (un dodo peut commencer la veille)
    if (e.type === 'sommeil') { const a = Math.max(e.start, t0), b = e.end ?? T; if (b > t0) marks = `<i class="tl-z" style="left:${pct(a)}%;width:${(pct(b) - pct(a)).toFixed(2)}%"></i>` + marks; continue }
    if (e.start < t0 - 3 * 36e5) continue;
    if (e.type === 'sein') for (const g of e.segs) {
      const a = Math.max(g.a, t0), b = g.b ?? T; if (b <= t0) continue;
      marks += `<i class="tl-s ${g.s}" style="left:${pct(a)}%;width:max(3px,${(pct(b) - pct(a)).toFixed(2)}%)"></i>`;
    } else if (e.start >= t0) marks += `<i class="tl-${{ biberon: 'b', tirage: 't' }[e.type] || 'c'}${e.type === 'couche' ? ' ' + coucheKind(e) : ''}" style="left:${pct(e.start)}%"></i>`;
  }
  return `<div class="tl">${marks}<i class="tl-now" style="left:${pct(T)}%"></i></div>
    <div class="tl-h"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
    <div class="tl-k"><span><i class="tl-s G"></i>Gauche</span><span><i class="tl-s D"></i>Droit</span><span><i class="tl-b"></i>Biberon</span><span><i class="tl-t"></i>Tirage</span><span><i class="tl-z"></i>Sommeil</span><span><i class="tl-c"></i>Couche</span></div>`;
}

const fmtN = n => String(n).replace('.', ',');
const fmtKg = g => `${(g / 1000).toFixed(3).replace('.', ',')} kg`;
function describe(e) {
  if (e.type === 'sein') {
    const parts = ['G', 'D'].filter(s => e.segs.some(x => x.s === s)).map(s => `${s} ${dur(sideMs(e, s))}`);
    return { ic: ic('feed'), t: e.end ? parts.join(' · ') || '0 min' : 'En cours…', d: e.end ? `Total ${dur(sideMs(e))}` : '' };
  }
  if (e.type === 'sommeil') return { ic: ic('moon2'), t: e.end == null ? 'Dort…' : `Sommeil ${dur(e.end - e.start)}`, d: e.end == null ? `depuis ${hm(e.start)}` : `${hm(e.start)} → ${hm(e.end)}` };
  if (e.type === 'mesure') return { ic: ic('scale'), t: 'Mesure', d: [e.poids && fmtKg(e.poids), e.taille && `${fmtN(e.taille)} cm`, e.tete && `tête ${fmtN(e.tete)} cm`].filter(Boolean).join(' · ') };
  if (e.type === 'tirage') return { ic: ic('pump'), t: `Tirage ${e.ml} ml`, d: [e.mlG && `G ${e.mlG} ml`, e.mlD && `D ${e.mlD} ml`].filter(Boolean).join(' · ') };
  if (e.type === 'biberon') return { ic: ic('bottle'), t: `${e.ml} ml`, d: e.milk === 'maternel' ? 'Lait maternel' : 'Lait artificiel' };
  const k = COUCHE[coucheKind(e)];
  return { ic: ic(k.ic), t: `Couche ${k.l.toLowerCase()}`, d: k.sub };
}

function historyHTML() {
  const L = list();
  let html = `<div class="adds">
    <button class="btn" data-act="add" data-type="sein">+ Tétée</button>
    <button class="btn" data-act="add" data-type="biberon">+ Biberon</button>
    <button class="btn" data-act="add" data-type="couche">+ Couche</button>
    <button class="btn" data-act="add" data-type="tirage">+ Tirage</button>
    <button class="btn" data-act="add" data-type="sommeil">+ Sommeil</button>
    <button class="btn" data-act="add" data-type="mesure">+ Mesure</button></div>`;
  if (!L.length) return html + `<p class="sub" style="text-align:center;margin-top:40px">Rien pour l'instant.</p>`;
  html += `<p class="sub" style="margin:10px 4px 0;font-size:12px">« écart » = temps depuis le repas précédent.</p>`;
  const meals = L.filter(isMeal);
  let day = null;
  for (const e of L.slice(0, 400)) {
    const dn = dayName(e.start);
    if (dn !== day) { day = dn; html += `<div class="day">${dn}</div>` }
    const x = describe(e);
    let gap = '';
    if (isMeal(e)) { const i = meals.indexOf(e), prev = meals[i + 1]; if (prev) gap = `écart ${dur((Math.floor(mealRef(e).t / 6e4) - Math.floor(mealRef(prev).t / 6e4)) * 6e4)}` }
    const extra = [x.d, e.type === 'sein' && e.end && mealRef(e).pause && `commencée à ${hm(e.start)}`, e.note && esc(e.note), e.by && 'par ' + esc(e.by)].filter(Boolean).join(' · ');
    html += `<button class="row" data-act="edit" data-id="${e.id}"><span class="ic">${x.ic}</span>
      <span class="tx"><div>${x.t}</div>${extra ? `<div>${extra}</div>` : ''}</span>
      <span class="tm">${hm(isMeal(e) ? mealRef(e).t : e.start)}<small>${gap}</small></span></button>`;
  }
  return html;
}

function summarize(evs, from = -Infinity, to = Infinity) {
  const seins = evs.filter(e => e.type === 'sein' && e.end), bibs = evs.filter(e => e.type === 'biberon'), tirs = evs.filter(e => e.type === 'tirage');
  const meals = evs.filter(isMeal).sort((a, b) => a.start - b.start);
  const gaps = meals.slice(1).map((e, i) => mealRef(e).t - mealRef(meals[i]).t);
  const tG = seins.reduce((m, e) => m + sideMs(e, 'G'), 0), tD = seins.reduce((m, e) => m + sideMs(e, 'D'), 0);
  const couches = evs.filter(e => e.type === 'couche');
  const zz = evs.filter(e => e.type === 'sommeil');
  return {
    seins: seins.length, bibs: bibs.length, meals: meals.length, tG, tD, tSein: tG + tD,
    ml: bibs.reduce((m, e) => m + (+e.ml || 0), 0),
    naps: zz.length, tSleep: zz.reduce((m, e) => m + sleepMs(e, from, to), 0),
    tirs: tirs.length, tirG: tirs.reduce((m, e) => m + (e.mlG || 0), 0), tirD: tirs.reduce((m, e) => m + (e.mlD || 0), 0),
    gap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
    avgSein: seins.length ? (tG + tD) / seins.length : 0,
    couches: couches.length, pipi: couches.filter(e => e.pipi).length, caca: couches.filter(e => e.caca).length,
    byKind: Object.fromEntries(Object.keys(COUCHE).map(k => [k, couches.filter(e => coucheKind(e) === k).length]))
  };
}
const kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
function block(title, s, perDay = 1, compact = false) {
  const r = v => perDay > 1 ? Math.round(v / perDay * 10) / 10 : v;
  const tot = s.tG + s.tD || 1;
  return `${title ? `<h2>${title}</h2>` : ''}<div class="card${compact ? ' compact' : ''}">
    <div class="kpis">
      ${kpi(r(s.meals), 'repas' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(s.gap ? dur(s.gap) : '—', 'entre 2 repas (moy.)')}
      ${kpi(r(s.seins), 'tétées' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(s.avgSein ? dur(s.avgSein) : '—', 'durée moy. tétée')}
      ${kpi(dur(s.tSein / perDay), 'au sein' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(Math.round(s.ml / perDay) + ' ml', `biberons (${r(s.bibs)})` + (perDay > 1 ? ' / jour' : ''))}
      ${s.tirs ? kpi(Math.round((s.tirG + s.tirD) / perDay) + ' ml', `tirés (${r(s.tirs)})` + (perDay > 1 ? ' / jour' : '') + ` · G ${Math.round(s.tirG / perDay)} / D ${Math.round(s.tirD / perDay)}`) : ''}
      ${kpi(r(s.couches), 'couches' + (perDay > 1 ? ' / jour' : ''))}
      ${s.naps ? kpi(dur(s.tSleep / perDay), `sommeil (${r(s.naps)} dodo${s.naps > 1 ? 's' : ''})` + (perDay > 1 ? ' / jour' : '')) : ''}
      <div class="kpi"><span>Détail des couches</span><div class="kinds">${Object.entries(COUCHE).map(([k, c]) => `<span>${c.l} <b>${r(s.byKind[k])}</b></span>`).join('')}</div></div>
    </div>
    ${s.tSein ? `<div class="split"><i style="width:${s.tG / tot * 100}%;background:var(--g)"></i><i style="flex:1;background:var(--d)"></i></div>
      <div class="sub" style="display:flex;justify-content:space-between"><span>G ${dur(s.tG)} (${Math.round(s.tG / tot * 100)}%)</span><span>D ${dur(s.tD)}</span></div>` : ''}
  </div>`;
}
function statsHTML() {
  const L = list(), t = now(), t0 = dayStart(t);
  const days = [];
  const dayAt = i => { const d = new Date(t0); d.setDate(d.getDate() - i); return d.getTime() };   // jours réels, même au changement d'heure
  for (let i = 0; i < 7; i++) { const a = dayAt(i), b = dayAt(i - 1); days.push({ a, s: summarize(L.filter(e => e.start >= a && e.start < b), a, b) }) }
  const week = summarize(L.filter(e => e.start >= dayAt(6)), dayAt(6), t);
  const max = Math.max(1, ...days.map(d => d.s.meals));
  const tabs = [['today', "Aujourd'hui"], ['24h', '24 h'], ['week', '7 jours'], ['growth', 'Croissance']];
  const tab = tabs.some(x => x[0] === S.statTab) ? S.statTab : 'today';
  const head = `<div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-act="stattab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  const pane = tab === 'today' ? block(null, days[0].s)
    : tab === '24h' ? block(null, summarize(L.filter(e => e.start >= t - 864e5), t - 864e5, t))
    : tab === 'growth' ? growthHTML(L, true)
    : block(null, week, 7, true) + `<div class="card bars">${days.map(d => `<div class="b">
        <span>${new Date(d.a).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
        <div class="track"><div class="fill" style="width:${d.s.meals / max * 100}%"></div>
        <span class="val">${d.s.meals} repas · ${dur(d.s.tSein)}${d.s.ml ? ' · ' + d.s.ml + ' ml' : ''}${d.s.tSleep ? ' · dodo ' + dur(d.s.tSleep) : ''}</span></div></div>`).join('')}</div>`;
  return head + `<div class="stats-pane">${pane}</div>`;
}

/* Croissance : dernières valeurs + courbe de poids */
function growthHTML(L, noTitle) {
  const M = L.filter(e => e.type === 'mesure').sort((a, b) => a.start - b.start);
  const last = k => [...M].reverse().find(e => e[k]);
  const lp = last('poids'), lt = last('taille'), lh = last('tete');
  let chart = '';
  const P = M.filter(e => e.poids);
  if (P.length >= 2) {
    const W = 320, H = 140, pad = 26, t0 = P[0].start, t1 = P.at(-1).start || t0 + 1;
    const lo = Math.min(...P.map(e => e.poids)), hi = Math.max(...P.map(e => e.poids)), span = Math.max(200, hi - lo);
    const x = t => pad + (W - pad - 8) * (t - t0) / Math.max(1, t1 - t0), y = g => H - 18 - (H - 30) * (g - lo + span * .1) / (span * 1.2);
    const pts = P.map(e => `${x(e.start).toFixed(1)},${y(e.poids).toFixed(1)}`).join(' ');
    chart = `<svg class="growth" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids">
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${P.map(e => `<circle cx="${x(e.start).toFixed(1)}" cy="${y(e.poids).toFixed(1)}" r="3.5" fill="var(--card)" stroke="var(--accent)" stroke-width="2"/>`).join('')}
      <text x="${pad}" y="${H - 3}" class="ax">${new Date(t0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</text>
      <text x="${W - 8}" y="${H - 3}" class="ax" text-anchor="end">${new Date(t1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</text>
      <text x="2" y="12" class="ax">${fmtKg(hi)}</text></svg>`;
  }
  const gain = P.length >= 2 ? (() => { const a = P.at(-2), b = P.at(-1), days = Math.max(1, (b.start - a.start) / 864e5); return `${b.poids - a.poids >= 0 ? '+' : ''}${Math.round((b.poids - a.poids) / days)} g/jour depuis la mesure précédente` })() : '';
  return `${noTitle ? '' : '<h2>Croissance</h2>'}<div class="card">
    <div class="kpis">${kpi(lp ? fmtKg(lp.poids) : '—', 'poids')}${kpi(lt ? fmtN(lt.taille) + ' cm' : '—', 'taille')}${kpi(lh ? fmtN(lh.tete) + ' cm' : '—', 'tour de tête')}
      ${kpi(M.length ? new Date(M.at(-1).start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—', 'dernière mesure')}</div>
    ${chart}${gain ? `<p class="sub">${gain}</p>` : ''}
    <button class="btn row-btn" data-act="mesure" style="margin-top:10px;width:100%">${ic('plus')}Ajouter une mesure</button>
  </div>`;
}

function settingsHTML() {
  const r = (v, l) => `<label><input type="radio" name="theme" value="${v}" ${S.theme === v ? 'checked' : ''}>${l}</label>`;
  return `<div class="set">
    <h2>Affichage</h2>
    <div class="card set">
      <div class="seg" id="themeSeg">${r('auto', 'Auto (soleil)')}${r('day', 'Jour')}${r('night', 'Nuit')}</div>
      ${S.theme === 'auto' ? (() => { const b = dayBounds(now());
        return `<p>Aujourd'hui : jour à partir de ${hm(b.day)}, nuit à partir de ${hm(b.night)}.${S.force && now() < S.force.until ? ` Mode ${S.force.night ? 'nuit' : 'jour'} forcé jusqu'à ${hm(S.force.until)}.` : ''}</p>
        <label>Mode jour jamais avant<select id="morning">${[6, 7, 8, 9, 10].map(h => `<option value="${h}" ${S.morning === h ? 'selected' : ''}>${h} h</option>`).join('')}</select></label>` })() : ''}
      <label class="toggle"><span>Mode une main <small class="sub">(boutons en bas)</small></span><input type="checkbox" id="onehand" ${S.onehand ? 'checked' : ''}></label>
      <label>Votre prénom (affiché dans l'historique)<input id="name" value="${esc(S.name)}" placeholder="ex. Papa"></label>
    </div>
    <h2>Longue pause pendant une tétée</h2>
    <div class="card set">
      <div class="fld"><span>Après une pause de plus de…, le repas compte à la reprise</span><div class="seg" id="pauseSeg">${[[10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min'], [0, 'jamais']]
        .map(([v, l]) => `<label><input type="radio" name="longPause" value="${v}" ${S.longPause === v ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
    </div>
    <h2>Rappels</h2>
    <div class="card set">
      <label class="toggle"><span>Rappel de la prochaine tétée</span><input type="checkbox" id="remind" ${S.remind ? 'checked' : ''}></label>
      ${S.remind ? `<label>Intervalle (depuis le début du dernier repas)<select id="remindEvery">${[90, 120, 150, 180, 210, 240, 300].map(m =>
        `<option value="${m}" ${S.remindEvery === m ? 'selected' : ''}>${Math.floor(m / 60)} h ${m % 60 ? m % 60 : ''}</option>`).join('')}</select></label>
      <label class="toggle"><span>Aussi la nuit <small class="sub">(22 h – 7 h)</small></span><input type="checkbox" id="remindNight" ${S.remindNight ? 'checked' : ''}></label>
      <p>Réglages partagés avec l'autre téléphone. Sans ntfy, la notification n'arrive que si l'appli est ouverte ou en arrière-plan récent.
        ${'Notification' in window && Notification.permission !== 'granted' && !S.ntfy ? '<br><b>Les notifications ne sont pas autorisées</b> : touchez à nouveau l\'interrupteur pour les autoriser.' : ''}</p>
      ${S.fam && NTFY_ACTIF ? `<p style="margin-top:6px"><b>Même appli fermée (ntfy, gratuit)</b> — sur chaque téléphone :</p>
      <p>1. Installez l'appli <a class="link" href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">ntfy</a>.<br>
         2. Abonnez-vous au canal de la famille :</p>
      <div class="grid2"><a class="btn" href="ntfy://ntfy.sh/${esc(S.ntfyTopic || '')}">${ic('share')}<small>S'abonner dans ntfy</small></a>
        <button class="btn" data-act="copytopic">${ic('download')}<small>Copier le nom du canal</small></button></div>
      <p class="code" style="font-size:13px;word-break:break-all">${esc(S.ntfyTopic || '…')}</p>
      <p>3. Une seule fois (un des deux parents) : recopiez le script Google (Réglages → Sauvegarde automatique Google Drive), collez-le à la place de l'ancien, puis exécutez <b>installer</b>. Ensuite, les réglages ci-dessus (activé, intervalle, nuit, « Repousser ») sont partagés et pris en compte par le script en moins de 5 min.</p>
      <label class="toggle"><span>J'utilise ntfy <small class="sub">(évite les doubles notifications)</small></span><input type="checkbox" id="ntfy" ${S.ntfy ? 'checked' : ''}></label>` : ''}` : ''}
    </div>
    <h2>Protection contre les erreurs</h2>
    <div class="card set">
      <div class="seg" id="guardSeg">${[['undo', 'Annuler après'], ['double', 'Double tap'], ['confirm', 'Confirmer'], ['none', 'Aucune']]
        .map(([v, l]) => `<label><input type="radio" name="guard" value="${v}" ${S.guard === v ? 'checked' : ''}>${l}</label>`).join('')}</div>
      <p>${{ undo: "Recommandé : l'action est faite en 1 tap, puis un bandeau « Annuler » reste affiché.",
            double: "Il faut toucher 2 fois le même bouton. Le premier tap ne fait que l'armer.",
            confirm: 'Une fenêtre demande « Oui / Non ». Sans réponse, elle se ferme et rien ne change.',
            none: 'Aucune protection : chaque tap agit directement.' }[S.guard]}</p>
      ${S.guard !== 'none' ? `<div class="fld"><span>Durée (bandeau, double tap, fenêtre)</span><div class="seg" id="delaySeg">${[3, 5, 10, 15]
        .map(v => `<label><input type="radio" name="delay" value="${v}" ${S.delay === v ? 'checked' : ''}>${v} s</label>`).join('')}</div></div>
      <p><b>Actions protégées</b></p>
      ${[['start', 'Démarrer une tétée'], ['switch', 'Changer de sein'], ['stop', 'Terminer'], ['cancel', 'Supprimer la tétée en cours'], ['quick', 'Couche et biberon (bandeau « Annuler »)']]
        .map(([k, l]) => `<label class="toggle"><span>${l}</span><input type="checkbox" data-prot="${k}" ${S.prot[k] ? 'checked' : ''}></label>`).join('')}` : ''}
      <div class="fld"><span>Ignorer les tétées de moins de</span><div class="seg" id="minSeg">${[0, 5, 30, 60]
        .map(v => `<label><input type="radio" name="minFeed" value="${v}" ${S.minFeed === v ? 'checked' : ''}>${v ? v + ' s' : 'jamais'}</label>`).join('')}</div></div>
    </div>
    <h2>Synchronisation entre téléphones</h2>
    <div class="card set">
    ${S.fam ? `
      <p>Synchro active. Code famille :</p><div class="code">${esc(S.fam)}</div>
      <button class="btn" data-act="resync">Tout resynchroniser</button>
      <button class="btn primary" data-act="invite">${ic('share')} Envoyer le lien à l'autre parent</button>
      <p>L'autre parent ouvre le lien sur son téléphone : tout est partagé en direct (même une tétée en cours).</p>
      <button class="link danger" data-act="unlink">Arrêter la synchro sur ce téléphone</button>`
    : `
      <p><b>Vous avez reçu un lien ?</b> Ouvrez-le simplement, ou collez-le ici :</p>
      <input id="joinTxt" placeholder="https://…#join=…">
      <button class="btn" data-act="join">Rejoindre</button>
      <p style="margin-top:8px"><b>Premier téléphone :</b> collez la configuration Firebase (gratuite, 5 min, voir le guide).</p>
      <textarea id="cfgTxt" rows="5" placeholder="const firebaseConfig = { apiKey: &quot;…&quot;, projectId: &quot;…&quot;, … }"></textarea>
      <button class="btn primary" data-act="create">Activer la synchro</button>
      <a class="link" href="https://github.com/SachD-Av/junior/blob/main/_tetee/README.md" target="_blank">Guide de configuration</a>`}
    </div>
    ${S.fam ? `<h2>Sauvegarde automatique Google Drive</h2>
    <div class="card set">
      <p>Une copie chaque jour, chaque semaine et chaque mois dans votre Google Drive, faite par Google la nuit, même téléphones éteints. Gratuit, à installer une fois (de préférence sur ordinateur) :</p>
      <p>1. Copiez le script (il contient déjà votre code famille).<br>
         2. Ouvrez <b>script.google.com</b> → <b>Nouveau projet</b> → effacez tout → collez.<br>
         3. Enregistrez, choisissez la fonction <b>installer</b> → <b>Exécuter</b> → autorisez l'accès.</p>
      <div class="grid2"><button class="btn" data-act="drivescript" data-mode="copy">${ic('download')}<small>Copier le script</small></button>
        <button class="btn" data-act="drivescript" data-mode="share">${ic('share')}<small>M'envoyer le script</small></button></div>
      <p>Le script contient le code d'accès au suivi : ne le partagez pas.</p>
    </div>` : ''}
    <h2>Données</h2>
    <div class="card grid2">
      <button class="btn" data-act="export">${ic('download')}<small>Exporter</small></button>
      <label class="btn">${ic('upload')}<small>Importer</small><input type="file" id="importFile" accept="application/json" hidden></label>
    </div>
  </div>`;
}

/* rafraîchit seulement les chronos (sans recréer les boutons) */
/* ---------- rappels ----------
   Prochaine tétée = début du dernier repas + intervalle choisi. L'appli affiche le compte à rebours
   et notifie à l'heure (téléphone/appli ouverts : un navigateur ne peut pas programmer une
   notification appli fermée). */
/* Même règle que le script Google : début du dernier repas + intervalle, repoussé si « Repousser »
   a été touché après ce repas ; la nuit = 22 h – 7 h. Les réglages sont partagés via Firebase. */
const nightHours = (t = now()) => { const h = new Date(t).getHours(); return h >= 22 || h < 7 };
function nextMeal() {
  const m = list().find(isMeal); if (!S.remind || !m) return null;
  const ref = mealRef(m).t, base = ref + S.remindEvery * 6e4, snz = S.remindSnooze && S.remindSnooze > ref ? S.remindSnooze : 0;
  return { meal: m, at: Math.max(base, snz), key: m.id + ':' + (snz || 0) };
}
function saveRemind() {
  S.remindU = now(); saveSettings();
  cloud?.writeCfg?.({ on: !!S.remind, every: S.remindEvery, night: !!S.remindNight, snooze: S.remindSnooze || null, u: S.remindU });
}
function snooze(min = 30) {
  const n = nextMeal(); if (!n) return;
  S.remindSnooze = Math.max(now(), n.at) + min * 6e4; saveRemind(); buzz();
  toast(`Rappel repoussé à ${hm(S.remindSnooze)}`); render();
}
function checkReminder() {
  if (OLD_HOST) return;
  const n = nextMeal(); if (!n || now() < n.at || S.remindNotified === n.key) return;
  if (!S.remindNight && nightHours()) return;
  if (active()) return;                                   // tétée en cours : pas de rappel
  S.remindNotified = n.key; saveSettings();
  const rt = mealRef(n.meal).t, body = `Dernier repas à ${hm(rt)}, il y a ${dur(now() - rt)}.`;
  navigator.vibrate?.([300, 150, 300]);
  if (!(NTFY_ACTIF && S.ntfy) && 'Notification' in window && Notification.permission === 'granted')
    navigator.serviceWorker?.ready.then(r => r.showNotification("C'est l'heure de la tétée", { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'rappel', renotify: true })).catch(() => {});
  toast(`C'est l'heure de la tétée (dernier repas ${hm(rt)})`);
}

function tick() {
  const t = now(), e = active();
  document.querySelectorAll('[data-t]').forEach(el => {
    const k = el.dataset.t;
    if (k === 'since') { const m = list().find(isMeal); if (m) el.textContent = dur(t - mealRef(m).t) }
    else if (k === 'next') { const n = nextMeal(); if (n) { const d = n.at - t;
      el.textContent = d > 0 ? `Prochaine tétée vers ${hm(n.at)} · dans ${dur(d)}` : `Prochaine tétée prévue à ${hm(n.at)} · en retard de ${dur(-d)}`;
      el.classList.toggle('late', d <= 0) } }
    else if (k === 'sleep') { const z = sleeping(); if (z) el.textContent = clock(t - z.start) }
    else if (k === 'sinceCouche') { const c = list().find(x => x.type === 'couche'); if (c) el.textContent = 'il y a ' + dur(t - c.start) }
    else if (!e) return;
    else if (k === 'startHm') el.textContent = hm(e.start);
    else if (k === 'total') el.textContent = clock(sideMs(e, null, t));
    else if (k === 'G' || k === 'D') el.textContent = clock(sideMs(e, k, t));
    else if (k === 'pause') {
      const o = openSeg(e), last = e.segs.at(-1);
      el.textContent = o ? `début ${hm(e.start)}` : `en pause depuis ${clock(t - (last?.b ?? t))}`;
    }
  });
}
setInterval(() => { tick(); checkReminder(); if (isNight() !== (document.documentElement.dataset.theme === 'night')) applyTheme() }, 1000);

/* garder l'écran allumé pendant une tétée */
let wl = null, wlBusy = Promise.resolve();
function wake(on) {   // les demandes sont faites l'une après l'autre : jamais deux verrous à la fois
  wlBusy = wlBusy.then(async () => {
    try {
      if (on && !wl && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        const l = await navigator.wakeLock.request('screen'); wl = l; l.addEventListener('release', () => { if (wl === l) wl = null });
      } else if (!on && wl) { const l = wl; wl = null; await l.release() }
    } catch {}
  });
  return wlBusy;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { render(); if (!cloud && !connecting) connectCloud() } });

/* ---------- boîtes de dialogue ---------- */
function dialog(html, onClose, setup) {
  // formulaire neuf à chaque ouverture : les écouteurs des fenêtres précédentes disparaissent
  const d = $('#dlg'), old = $('#dlgForm'), f = old.cloneNode(false);
  old.replaceWith(f);
  f.innerHTML = html;
  setup?.(f);
  f.onsubmit = ev => { const v = ev.submitter?.value; if (v && v !== 'cancel') onClose(v, f) };
  d.showModal();
  // pas de clavier à l'ouverture : le navigateur met le curseur dans le premier champ, on l'enlève
  if (document.activeElement?.matches?.('input, textarea, select')) document.activeElement.blur();
}

function bibDialog() {
  let ml = 0;
  dialog(`<h3>${ic('bottle')} Biberon</h3>
    <label class="mlv"><input id="mlv" type="number" min="1" max="2000" step="1" inputmode="numeric" placeholder="0" required><span>ml</span></label>
    <input id="mlr" type="range" min="0" max="300" step="1" value="0">
    <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${S.milk === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>
    <div class="fld"><span>Heure</span>${whenHTML('start', now())}</div>
    <menu><button class="btn" value="cancel" formnovalidate>Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      ml = Math.min(2000, Math.max(0, Math.round(+f.querySelector('#mlv').value || 0)));
      S.milk = f.milk.value; saveSettings();
      const t = readWhen(f, 'start') || now();
      guard('quick', { done: `Biberon noté · ${ml} ml` }, () => { const e = { id: uid(), type: 'biberon', start: t, end: t, ml, milk: S.milk }; put(e); return e.id });
    },
    f => {
      const inp = f.querySelector('#mlv'), rng = f.querySelector('#mlr');
      inp.addEventListener('input', () => { ml = Math.max(0, Math.round(+inp.value || 0)); rng.value = Math.min(300, ml) });
      rng.addEventListener('input', () => { ml = +rng.value; inp.value = ml || '' });
    });
  // biberon : on tape directement la quantité, le clavier s'ouvre (encore dans le geste du doigt)
  $('#mlv')?.focus();
}

function tirageDialog() {
  const side = s => `<div class="pump"><b class="tag ${s}">${s}</b>
      <label class="mlv"><input id="p${s}" type="number" min="0" max="2000" step="1" inputmode="numeric" placeholder="0"><span>ml</span></label></div>
    <input id="r${s}" class="rng" type="range" min="0" max="250" step="1" value="0">`;
  dialog(`<h3>${ic('pump')} Tirage</h3>
    ${side('G')}${side('D')}
    <div class="sub" style="text-align:center">Total : <b id="pT">0</b> ml</div>
    <div class="fld"><span>Heure</span>${whenHTML('start', now())}</div>
    <menu><button class="btn" value="cancel" formnovalidate>Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      const q = s => Math.min(2000, Math.max(0, Math.round(+f.querySelector('#p' + s).value || 0)));
      const t = readWhen(f, 'start') || now(), e = { id: uid(), type: 'tirage', start: t, end: t, mlG: q('G'), mlD: q('D') };
      guard('quick', { done: `Tirage noté · ${e.mlG + e.mlD} ml` }, () => { put(e); return e.id });
    },
    f => {
      const upd = () => { const t = ['G', 'D'].reduce((m, s) => m + (Math.round(+f.querySelector('#p' + s).value) || 0), 0);
        f.querySelector('#pT').textContent = t; f.querySelector('#pG').setCustomValidity(t > 0 ? '' : 'Indiquez au moins une quantité') };
      for (const s of ['G', 'D']) {
        const inp = f.querySelector('#p' + s), rng = f.querySelector('#r' + s);
        inp.addEventListener('input', () => { rng.value = Math.min(250, +inp.value || 0); upd() });
        rng.addEventListener('input', () => { inp.value = +rng.value || ''; upd() });
      }
      upd();
    });
}

function coucheDialog() {
  dialog(`<h3>${ic('diaper')} Couche</h3>
    <div class="grid2 couches">${Object.entries(COUCHE).map(([k, c]) => `<button class="btn ck ${k}" value="${k}">${ic(c.ic)}<span>${c.l}</span><small>${c.sub}</small></button>`).join('')}</div>
    <menu><button class="btn" value="cancel">Annuler</button></menu>`,
    v => { if (!COUCHE[v]) return; const t = now(), e = { id: uid(), type: 'couche', start: t, end: t, kind: v };
      guard('quick', { done: `Couche notée · ${COUCHE[v].l.toLowerCase()}` }, () => { put(e); return e.id }) });
}

function editDialog(e, isNew) {
  const min = s => Math.round(sideMs(e, s) / 60000);
  let body = '';
  if (e.type === 'sein') body = `<div class="sides">
      ${[['g', 'G', 'Gauche'], ['d', 'D', 'Droit']].map(([n, s, l]) => `<div class="srow">
        <b class="tag ${s}">${s}</b><span class="sname">${l}</span>
        <button type="button" class="btn" data-step="-1" data-for="${n}" aria-label="moins 1 minute">−</button>
        <label class="val"><input type="number" name="${n}" min="0" max="300" inputmode="numeric" value="${min(s)}"><span>min</span></label>
        <button type="button" class="btn" data-step="1" data-for="${n}" aria-label="plus 1 minute">+</button></div>`).join('')}</div>
      <div class="endhint" data-endhint></div>`;
  if (e.type === 'sommeil') body = `<div class="fld"><span>Fin (vide = dort encore)</span>${whenHTML('end', e.end, true)}</div>
      <div class="sub" data-sleephint></div>`;
  if (e.type === 'mesure') body = `<label>Poids (g)<input type="number" name="poids" min="0" max="30000" step="1" inputmode="numeric" placeholder="ex. 4250" value="${e.poids ?? ''}"></label>
      <div class="grid2"><label>Taille (cm)<input type="number" name="taille" min="0" max="150" step="0.1" inputmode="decimal" placeholder="ex. 54,5" value="${e.taille ?? ''}"></label>
      <label>Tour de tête (cm)<input type="number" name="tete" min="0" max="80" step="0.1" inputmode="decimal" placeholder="ex. 37" value="${e.tete ?? ''}"></label></div>`;
  if (e.type === 'tirage') body = `<div class="grid2">
      <label>Gauche (ml)<input type="number" name="mlG" min="0" step="1" inputmode="numeric" placeholder="0" value="${e.mlG || ''}"></label>
      <label>Droit (ml)<input type="number" name="mlD" min="0" step="1" inputmode="numeric" placeholder="0" value="${e.mlD || ''}"></label></div>`;
  if (e.type === 'biberon') body = `<label>Quantité (ml)<input type="number" name="ml" min="1" step="1" inputmode="numeric" placeholder="0" required value="${e.ml || ''}"></label>
      <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${(e.milk || S.milk) === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>`;
  if (e.type === 'couche') body = `<div class="seg">${Object.entries(COUCHE).map(([k, c]) =>
      `<label><input type="radio" name="kind" value="${k}" ${coucheKind(e) === k ? 'checked' : ''}>${c.l}</label>`).join('')}</div>`;
  const title = { sein: ic('feed') + ' Tétée', biberon: ic('bottle') + ' Biberon', couche: ic('diaper') + ' Couche', tirage: ic('pump') + ' Tirage', sommeil: ic('moon2') + ' Sommeil', mesure: ic('scale') + ' Mesure' }[e.type];
  dialog(`<h3>${title}${isNew ? '' : `<button class="trash" value="del" formnovalidate aria-label="Supprimer">${ic('trash')}<span>Supprimer</span></button>`}</h3>
    <div class="fld"><span>Début</span>${whenHTML('start', e.start)}</div>
    ${body}
    <label>Note<input name="note" value="${esc(e.note)}" placeholder="optionnel"></label>
    <menu><button class="btn" value="cancel" formnovalidate>Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      if (v === 'del') { if (confirm('Supprimer ?')) { e.del = true; put(e) } return }
      const start = readWhen(f, 'start') || e.start;
      if (e.type === 'sein') {
        const g = Math.max(0, +f.g.value || 0), d = Math.max(0, +f.d.value || 0);
        if (!isNew && g === min('G') && d === min('D')) {           // durées inchangées : on décale juste l'heure
          const dt = start - e.start; e.segs.forEach(s => { s.a += dt; s.b += dt });
        } else {                                                     // on reconstruit les segments
          const last = e.segs.at(-1)?.s || 'G', other = last === 'G' ? 'D' : 'G', val = { G: g, D: d };
          const order = [[other, val[other]], [last, val[last]]];      // le dernier sein reste le dernier
          let t = start; e.segs = [];
          for (const [s, m] of order) if (m) { e.segs.push({ s, a: t, b: t + m * 6e4 }); t += m * 6e4 }
        }
        e.start = start; e.end = e.segs.at(-1)?.b ?? start;
      } else if (e.type === 'sommeil') {
        let end = readWhen(f, 'end');
        if (end != null && end <= start && f.end_d.value === f.start_d.value) end += 864e5; // fin après minuit
        if (end != null && end <= start) return alert('La fin doit être après le début.');
        e.start = start; e.end = end;
      } else if (e.type === 'mesure') {
        e.start = e.end = start;
        e.poids = +f.poids.value || null; e.taille = +f.taille.value || null; e.tete = +f.tete.value || null;
        if (!e.poids && !e.taille && !e.tete) return alert('Indiquez au moins une valeur.');
      } else {
        e.start = e.end = start;
        if (e.type === 'biberon') { e.ml = Math.max(0, +f.ml.value || 0); e.milk = f.milk.value }
        if (e.type === 'tirage') { e.mlG = Math.max(0, +f.mlG.value || 0); e.mlD = Math.max(0, +f.mlD.value || 0) }
        if (e.type === 'couche') e.kind = f.kind.value;
      }
      e.note = f.note.value.trim() || null;
      put(e);
    },
    f => {
      if (e.type === 'sommeil') {
        const h = () => { const a = readWhen(f, 'start'); let b = readWhen(f, 'end'); if (b != null && a && b <= a && f.end_d.value === f.start_d.value) b += 864e5;
          f.querySelector('[data-sleephint]').textContent = a && b && b > a ? `Durée : ${dur(b - a)}` : b ? 'La fin doit être après le début' : 'En cours' };
        f.addEventListener('input', h); h(); return;
      }
      if (e.type !== 'sein') return;
      const hint = () => { const t = readWhen(f, 'start'), m = (+f.g.value || 0) + (+f.d.value || 0);
        f.querySelector('[data-endhint]').innerHTML = t ? `${hm(t)} → <b>${hm(t + m * 6e4)}</b> · total <b>${m} min</b>` : '' };
      f.addEventListener('click', ev => { const b = ev.target.closest('[data-step]'); if (!b) return;
        const i = f[b.dataset.for]; i.value = Math.max(0, (+i.value || 0) + +b.dataset.step); buzz(); hint() });
      f.addEventListener('input', hint); hint();
    });
}

/* ---------- clics ---------- */
document.addEventListener('click', ev => {
  const nb = ev.target.closest('[data-view]');
  if (nb) { view = nb.dataset.view; render(true); $('#main').scrollTop = 0; return }
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'side') sideTap(b.dataset.s);
  else if (a === 'pause') pause();
  else if (a === 'resume') resume();
  else if (a === 'stop') stop();
  else if (a === 'cancel') cancelFeed();
  else if (a === 'bib') bibDialog();
  else if (a === 'tirage') tirageDialog();
  else if (a === 'sleep') sleepToggle();
  else if (a === 'mesure') newEntry('mesure');
  else if (a === 'couche') coucheDialog();
  else if (a === 'night') toggleNight();
  else if (a === 'edit') { const e = events.get(b.dataset.id); if (e && !e.end && e.type === 'sein' && active()?.id === e.id) { view = 'home'; render() } else if (e) editDialog(structuredClone(e)) }
  else if (a === 'add') newEntry(b.dataset.type);
  else if (a === 'adjust') adjustDialog();
  else if (a === 'forgot') forgotDialog();
  else if (a === 'invite') invite();
  else if (a === 'drivescript') driveScript(b.dataset.mode);
  else if (a === 'snooze') snooze(30);
  else if (a === 'stattab') { S.statTab = b.dataset.tab; saveSettings(); render(true) }
  else if (a === 'copytopic') ensureTopic().then(t => navigator.clipboard.writeText(t)).then(() => toast('Nom du canal copié')).catch(() => prompt('Nom du canal :', S.ntfyTopic));
  else if (a === 'resync') { cloud?.unsub?.(); cloud = null; S.syncedFam = null; S.syncedAt = 0; saveSettings(); connectCloud(); toast('Resynchronisation complète en cours…') }
  else if (a === 'unlink') { if (confirm('Arrêter la synchro ? Les données restent sur ce téléphone.')) { cloud?.unsub?.(); cloud = null; S.fb = S.fam = null; S.syncedFam = null; S.syncedAt = 0; saveSettings(); setSync('local'); render(true) } }
  else if (a === 'join') { if (!joinFrom($('#joinTxt').value)) alert('Lien invalide') }
  else if (a === 'create') {
    const c = parseCfg($('#cfgTxt').value);
    if (!c) return alert('Configuration non reconnue : il faut au moins apiKey et projectId.');
    S.fb = c; S.fam = newFamCode();
    ensureTopic().then(() => render(true));
    saveSettings(); connectCloud(); render(true);
  }
  else if (a === 'export') {
    const blob = new Blob([JSON.stringify([...events.values()], null, 1)], { type: 'application/json' });
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `tetee-${dtl(now()).slice(0, 10)}.json`; l.click();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.name === 'theme' && t.closest('#themeSeg')) { S.theme = t.value; S.force = null; saveSettings(); render(true) }
  else if (t.id === 'onehand') { S.onehand = t.checked; saveSettings(); applyTheme() }
  else if (t.name === 'guard') { S.guard = t.value; armed = null; saveSettings(); render(true) }
  else if (t.name === 'delay') { S.delay = +t.value; saveSettings() }
  else if (t.name === 'minFeed') { S.minFeed = +t.value; saveSettings() }
  else if (t.name === 'longPause') { S.longPause = +t.value; saveSettings() }
  else if (t.dataset.prot) { S.prot[t.dataset.prot] = t.checked; saveSettings() }
  else if (t.id === 'remind') {
    S.remind = t.checked; saveRemind();
    if (t.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(() => render(true));
    render(true);
  }
  else if (t.id === 'remindEvery') { S.remindEvery = +t.value; S.remindNotified = null; saveRemind(); render() }
  else if (t.id === 'remindNight') { S.remindNight = t.checked; saveRemind() }
  else if (t.id === 'ntfy') { S.ntfy = t.checked; saveSettings() }
  else if (t.id === 'morning') { S.morning = +t.value; saveSettings(); applyTheme(); render(true) }
  else if (t.id === 'name') { S.name = t.value.trim(); saveSettings() }
  else if (t.id === 'importFile' && t.files[0]) t.files[0].text().then(txt => {
    try {
      const arr = JSON.parse(txt); let n = 0;
      if (cloud && !cloud.ready) return alert('Attendez la fin de la synchronisation (pastille « synchro »), puis réessayez.');
      for (const raw of Array.isArray(arr) ? arr : []) { const e = clean(raw); if (!e) continue; const l = events.get(e.id); if (!l || e.u > l.u) { events.set(e.id, e); cloud?.write(e, true); n++ } }
      saveLocal(); alert(`${n} entrée(s) importée(s)`); render(true);
    } catch { alert('Fichier invalide') }
  });
});

/* ---------- synchro Firebase ---------- */
let rulesOld = false;
function setSync(s, err) {
  if (s === 'ok' && rulesOld) s = 'rules';
  const el = $('#sync');
  el.innerHTML = { local: 'local', wait: 'connexion…', ok: ic('cloud') + 'synchro', off: ic('cloudOff') + 'hors ligne', err: ic('alert') + 'erreur synchro', rules: ic('alert') + 'règles à mettre à jour' }[s];
  el.className = 'chip ' + (s === 'ok' ? 'ok' : s === 'err' ? 'err' : '');
  if (err) { console.error(err); el.title = String(err.message || err) }
}
function parseCfg(txt) {
  const o = {};
  const KEYS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
  for (const m of String(txt).matchAll(/["']?(\w+)["']?\s*:\s*["'`]([^"'`]{1,200})["'`]/g)) if (KEYS.includes(m[1])) o[m[1]] = m[2];
  return o.apiKey && o.projectId ? o : null;
}
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function inviteLink() { return location.origin + location.pathname + '#join=' + b64e(JSON.stringify({ c: S.fb, f: S.fam })) }
const NTFY_ACTIF = false;   // rappels par ntfy (appli fermée) : prêts mais désactivés pour le moment
async function ensureTopic() {
  if (!S.fam) return null;
  const want = async () => { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tetee-ntfy:' + S.fam));
    return 'tetee-' + [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('') };
  const t = await want();
  if (S.ntfyTopic !== t) { S.ntfyTopic = t; saveSettings() }
  return t;
}
async function driveScript(mode) {
  try {
    const txt = (await (await fetch('sauvegarde-drive.gs', { cache: 'no-cache' })).text())
      .replace("'__PROJET__'", JSON.stringify(S.fb.projectId)).replace("'__FAMILLE__'", JSON.stringify(S.fam))
      .replace("'__NTFY__'", JSON.stringify(await ensureTopic()));
    if (mode === 'share' && navigator.share) return await navigator.share({ title: 'Script de sauvegarde Tétée', text: txt });
    await navigator.clipboard.writeText(txt); alert('Script copié ! Collez-le dans un nouveau projet sur script.google.com.');
  } catch (err) { if (err?.name !== 'AbortError') alert('Impossible de copier le script : ' + (err?.message || err)) }
}
async function invite() {
  const url = inviteLink();
  try { if (navigator.share) return await navigator.share({ title: 'Suivi tétée', text: 'Rejoins le suivi des tétées :', url }) } catch { return }
  try { await navigator.clipboard.writeText(url); alert('Lien copié ! Envoyez-le à l\'autre parent.') } catch { prompt('Copiez ce lien :', url) }
}
function joinFrom(txt) {
  const m = String(txt).match(/#join=([\w-]+)/); if (!m) return false;
  try {
    const j = JSON.parse(b64d(m[1]));
    const c = parseCfg(JSON.stringify(j.c || {}));
    if (!c || !FAM_RE.test(j.f) || !/^[a-z0-9-]{4,40}$/.test(c.projectId)) return false;
    if (!confirm(`Rejoindre le suivi partagé (projet Firebase « ${c.projectId} ») ?\n\nLes données de ce téléphone y seront envoyées. N'acceptez que si le lien vient de l'autre parent.`)) return true;
    j.c = c;
    cloud?.unsub?.(); cloud = null;
    S.fb = j.c; S.fam = j.f;
    if (j.s && typeof j.s === 'object')        // déménagement : on garde aussi les réglages (revalidés)
      for (const k of MOVE_KEYS) if (k in j.s) S[k] = j.s[k];
    cleanSettings(); saveSettings(); connectCloud(); ensureTopic(); view = 'home'; render(true); return true;
  } catch { return false }
}

function newFamCode() { // 16 caractères parmi 32 = 80 bits, sans biais
  const A = 'abcdefghjkmnpqrstuvwxyz234567890';
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), x => A[x & 31]).join('');
}
let connecting = false, retryIn = 5e3, retryTimer = 0;
async function connectCloud() {
  if (OLD_HOST) return;
  if (!S.fb || !S.fam || !FAM_RE.test(S.fam)) return setSync('local');
  if (connecting || (cloud && cloud.fam === S.fam)) return;     // déjà connecté ou en cours
  connecting = true; clearTimeout(retryTimer);
  setSync('wait');
  try {
    const B = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const [{ initializeApp, getApps }, fs] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-firestore.js')]);
    const app = getApps().find(a => a.name === S.fam) || initializeApp(S.fb, S.fam);
    let db;
    try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }) }
    catch { db = fs.getFirestore(app) }
    const col = fs.collection(db, 'families', S.fam, 'events');
    /* Économie de lectures (quota gratuit : 50 000/jour) : après la première synchro complète,
       on n'écoute que les entrées modifiées depuis la dernière connue (moins 1 jour de marge). */
    const full = S.syncedFam !== S.fam || !S.syncedAt;
    if (full) S.syncedAt = 0;
    // fenêtre = dernière modification reçue du serveur (et non nos propres saisies), moins 1 jour de marge
    const since = full ? 0 : S.syncedAt - 864e5;
    const q = since > 0 ? fs.query(col, fs.where('u', '>=', since)) : col;
    const ref = id => fs.doc(col, id), plain = x => JSON.parse(JSON.stringify(x));
    const me = { fam: S.fam, write: (e, quiet) => fs.setDoc(ref(e.id), plain(e)).catch(async err => {
      if (err?.code !== 'permission-denied') return setSync('err', err);
      // refus : soit le serveur a une version plus récente (l'autre téléphone a gagné), soit les règles sont anciennes
      try {
        const d = await fs.getDoc(ref(e.id)), r = d.exists() ? clean(d.data(), e.id) : null;
        if (r && r.u >= e.u) { const l = events.get(e.id); if (!l || r.u > l.u) { events.set(r.id, r); saveLocal(); render() } return }
      } catch {}
      if (quiet) return;
      if ('kind' in e) { const { kind, ...rest } = e; return fs.setDoc(ref(e.id), plain(rest)).then(() => { rulesOld = true; setSync('rules') }, er => setSync('rules', er)) }
      rulesOld = true; setSync('rules', err);
    }) };
    let reconciled = false;
    const cfgRef = fs.doc(db, 'families', S.fam, 'config', 'rappel');
    me.writeCfg = c => fs.setDoc(cfgRef, c).catch(err => { if (err?.code === 'permission-denied') { rulesOld = true; setSync('rules', err) } });
    const unsubCfg = fs.onSnapshot(cfgRef, d => {
      if (cloud !== me) return;
      const c = d.data();
      if (!c) { if (S.remindU) me.writeCfg({ on: !!S.remind, every: S.remindEvery, night: !!S.remindNight, snooze: S.remindSnooze || null, u: S.remindU }); return }
      if ((c.u || 0) > (S.remindU || 0)) {
        Object.assign(S, { remind: !!c.on, remindEvery: +c.every || 180, remindNight: !!c.night, remindSnooze: c.snooze || null, remindU: c.u });
        saveSettings(); render(view !== 'settings');
      } else if ((c.u || 0) < (S.remindU || 0)) me.writeCfg({ on: !!S.remind, every: S.remindEvery, night: !!S.remindNight, snooze: S.remindSnooze || null, u: S.remindU });
    }, () => {});
    me.unsub = () => { unsubAll(); unsubCfg() };
    const unsubAll = fs.onSnapshot(q, { includeMetadataChanges: true }, snap => {
      if (cloud !== me) return;
      let changed = false;
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') return;
        const r = clean(ch.doc.data(), ch.doc.id), l = events.get(ch.doc.id);
        if (r && (!l || r.u > l.u)) { events.set(r.id, r); changed = true }
      });
      if (!snap.metadata.fromCache) {                  // mémorise la dernière modification reçue du serveur
        const got = snap.docs.filter(d => !d.metadata.hasPendingWrites).reduce((m, d) => Math.max(m, num(d.data().u)), 0);
        if (got > S.syncedAt) { S.syncedAt = Math.min(got, Date.now() + 6e5); saveSettings() }
      }
      if (!reconciled && !snap.metadata.fromCache) {   // envoie ce qui n'existe qu'ici (ou plus récent ici)
        reconciled = true; me.ready = true;
        const remote = new Map(snap.docs.map(d => [d.id, d.data().u || 0]));
        for (const e of events.values())
          if ((full || e.u >= since) && (!remote.has(e.id) || e.u > remote.get(e.id))) me.write(e);
        if (full) { S.syncedFam = S.fam; saveSettings() }
      }
      setSync(snap.metadata.fromCache ? 'off' : 'ok');
      if (changed) { saveLocal(); fixOpenFeeds(); render() }
    }, err => setSync('err', err));
    cloud = me; retryIn = 5e3;
  } catch (err) {
    setSync('err', err);
    retryTimer = setTimeout(connectCloud, retryIn); retryIn = Math.min(retryIn * 2, 5 * 6e4);   // nouvel essai : 5 s, 10 s, … 5 min
  } finally { connecting = false }
}
window.addEventListener('online', () => { if (!cloud) connectCloud() });

/* ---------- déménagement ---------- */
const MOVE_KEYS = ['name', 'onehand', 'theme', 'guard', 'delay', 'prot', 'minFeed', 'morning', 'milk'];
function moveLink() {
  return NEW_HOME + '#join=' + b64e(JSON.stringify({ c: S.fb, f: S.fam, s: Object.fromEntries(MOVE_KEYS.map(k => [k, S[k]])) }));
}
async function wipeOld() {   // efface tout ce que Tétée a stocké à l'ancienne adresse
  for (const k of Object.keys(localStorage)) if (k.startsWith('tt_')) localStorage.removeItem(k);
  try { for (const d of await indexedDB.databases()) if (/firestore|firebase/i.test(d.name || '')) indexedDB.deleteDatabase(d.name) } catch {}
  try { for (const k of await caches.keys()) if (k.startsWith('tetee-')) await caches.delete(k) } catch {}
  try { for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope.includes('/tetee/')) await r.unregister() } catch {}
}
function moveScreen() {
  for (const sel of ['nav', '#sync', '[data-act=night]']) { const el = document.querySelector(sel); if (el) el.style.display = 'none' }
  const m = $('#main'), synced = !!S.fam, hasData = events.size > 0;
  m.className = 'v-move';
  m.innerHTML = `<div class="move">
    <div class="logo big-logo">${ic('feed')}</div>
    <h2>Tétée déménage</h2>
    <p>L'appli a maintenant sa propre adresse, séparée de l'appli prénoms :</p>
    <p class="code">${NEW_HOME.replace('https://', '').replace(/\/$/, '')}</p>
    ${synced ? `<p>Votre historique est dans la synchro : il revient tout seul à la nouvelle adresse, avec vos réglages.</p>
      <button class="btn primary" data-act="move">Passer à la nouvelle adresse</button>
      <p class="sub">Les données de Tétée seront effacées de cette ancienne adresse. Installez ensuite l'appli depuis la nouvelle (⋮ → Installer) et supprimez l'ancienne icône.</p>`
    : hasData ? `<p><b>Vos données ne sont que sur ce téléphone</b> (pas de synchro) : exportez-les d'abord, puis importez le fichier à la nouvelle adresse (Réglages → Importer).</p>
      <button class="btn" data-act="export">${ic('download')}<small>1. Exporter mes données</small></button>
      <a class="btn primary" href="${NEW_HOME}">2. Ouvrir la nouvelle adresse</a>
      <button class="link" data-act="wipeold">3. Une fois importées là-bas : effacer les données d'ici</button>`
    : `<a class="btn primary" href="${NEW_HOME}">Ouvrir la nouvelle adresse</a>`}
  </div>`;
}
document.addEventListener('click', async ev => {
  if (!OLD_HOST) return;
  const b = ev.target.closest('[data-act=move],[data-act=wipeold]'); if (!b) return;
  if (b.dataset.act === 'move') { const link = moveLink(); await wipeOld(); location.href = link }
  else if (confirm('Effacer les données de Tétée de cette ancienne adresse ? (faites-le seulement après les avoir importées à la nouvelle)')) { await wipeOld(); location.href = NEW_HOME }
});

/* ---------- démarrage ---------- */
function checkJoinHash() {
  if (!location.hash.startsWith('#join=')) return;
  const h = location.hash; history.replaceState(null, '', location.pathname);
  if (!joinFrom(h)) alert('Lien d\'invitation invalide.');
}
/* Geste / bouton retour : fenêtre ouverte → on la ferme ; autre page → accueil ; accueil → on reste.
   Sans ça, le retour quitte l'appli et affiche une page blanche (Firefox, Chrome).
   Une entrée « appli » est ajoutée à l'historique au premier toucher (les navigateurs ignorent
   celles ajoutées sans geste de l'utilisateur), puis remise après chaque retour. */
function armBack() { if (history.state?.tt !== 'app') history.pushState({ tt: 'app' }, '') }
function initBack() {
  if (history.state?.tt !== 'app') history.replaceState({ tt: 'base' }, '');
  document.addEventListener('pointerdown', armBack, { capture: true, passive: true });
  window.addEventListener('popstate', () => {
    const d = $('#dlg');
    if (d.open) d.close();
    else if (view !== 'home') { view = 'home'; render(true); $('#main').scrollTop = 0 }
    armBack();                              // prêt pour le retour suivant
  });
}

if (OLD_HOST) moveScreen();
else {
  initBack();
  window.addEventListener('hashchange', checkJoinHash);
  checkJoinHash();
  fixOpenFeeds();
  connectCloud();
  render(true);
  ensureTopic().then(t => { if (t && view === 'settings') render(true) });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
