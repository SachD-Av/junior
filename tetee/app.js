/* ---------- utilitaires ---------- */
const $ = s => document.querySelector(s);
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
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
const buzz = () => navigator.vibrate?.(25);
const SIDE = { G: 'Gauche', D: 'Droit' };

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
const S = Object.assign({ theme: 'auto', onehand: true, name: '', fb: null, fam: null, ml: 90, milk: 'artificiel',
  guard: 'undo', delay: 10, morning: 8, minFeed: 5,
  prot: { start: true, switch: true, stop: true, cancel: true, quick: true } }, LS.get('tt_settings', {}));
S.prot = Object.assign({ start: true, switch: true, stop: true, cancel: true, quick: true }, S.prot);
const saveSettings = () => LS.set('tt_settings', S);
/* Toute donnée venant de l'extérieur (synchro, import, stockage) est revalidée :
   types stricts, longueurs bornées, id alphanumérique. Rien d'autre n'atteint le HTML. */
const num = v => { const n = +v; return Number.isFinite(n) ? n : 0 };
const str = (v, n) => v == null || v === '' ? null : String(v).slice(0, n);
function clean(e, forcedId) {
  if (!e || typeof e !== 'object' || !['sein', 'biberon', 'couche'].includes(e.type)) return null;
  const id = String(forcedId ?? e.id ?? '');
  if (!/^[\w-]{1,40}$/.test(id)) return null;
  const o = { id, type: e.type, start: num(e.start), end: e.end == null ? null : num(e.end),
    u: num(e.u), del: !!e.del, note: str(e.note, 500), by: str(e.by, 40) };
  if (!o.start) return null;
  if (o.type === 'sein') {
    o.segs = (Array.isArray(e.segs) ? e.segs : []).slice(0, 200)
      .filter(x => x && (x.s === 'G' || x.s === 'D'))
      .map(x => ({ s: x.s, a: num(x.a), b: x.b == null ? null : num(x.b) }));
  } else o.end = o.start;
  if (o.type === 'biberon') { o.ml = Math.min(2000, Math.max(0, Math.round(num(e.ml)))); o.milk = e.milk === 'maternel' ? 'maternel' : 'artificiel' }
  if (o.type === 'couche') { o.pipi = !!e.pipi; o.caca = !!e.caca }
  return o;
}
const FAM_RE = /^[a-z0-9]{9,32}$/;
const events = new Map(LS.get('tt_events', []).map(e => clean(e)).filter(Boolean).map(e => [e.id, e]));
const saveLocal = () => LS.set('tt_events', [...events.values()]);
let view = 'home', cloud = null;

const list = () => [...events.values()].filter(e => !e.del).sort((a, b) => b.start - a.start);
const active = () => list().find(e => e.type === 'sein' && !e.end);
const openSeg = e => e.segs.find(s => !s.b);
const sideMs = (e, side, t = now()) => e.segs.filter(s => !side || s.s === side).reduce((m, s) => m + ((s.b ?? t) - s.a), 0);
const isMeal = e => e.type === 'biberon' || (e.type === 'sein' && e.end);

function put(e) {
  e.u = now();
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
  el.hidden = false; document.body.classList.add('has-toast');
  const bar = el.querySelector('#toastBar'); bar.style.animation = 'none'; bar.offsetWidth; bar.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, S.delay * 1000);
}
function hideToast() { clearTimeout(toastTimer); $('#toast').hidden = true; document.body.classList.remove('has-toast') }
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
  if (!e) return guard('start', { ask: `Démarrer sur le sein ${SIDE[side].toLowerCase()} ?`, done: `Tétée démarrée · sein ${SIDE[side].toLowerCase()}` }, () => tapSide(side), 'start' + side);
  const o = openSeg(e), last = e.segs.at(-1)?.s;
  if (o?.s === side) return;
  if (!o && last === side) return resume();
  guard('switch', { ask: `Passer au sein ${SIDE[side].toLowerCase()} ?`, done: `Passage au sein ${SIDE[side].toLowerCase()}` }, () => tapSide(side), 'switch' + side);
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
    <button class="btn row-btn" value="sein">${ic('feed')}Tétée</button><button class="btn row-btn" value="biberon">${ic('bottle')}Biberon</button><button class="btn row-btn" value="couche">${ic('diaper')}Couche</button>
    <menu><button class="btn" value="cancel">Annuler</button></menu>`, v => setTimeout(() => newEntry(v)));
}
function newEntry(type) {
  const t = now();
  editDialog(type === 'sein' ? { id: uid(), type, start: t - 15 * 6e4, end: t, segs: [] }
    : { id: uid(), type, start: t, end: t, ml: S.ml, milk: S.milk, pipi: true, caca: false }, true);
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
function isNight(t = now()) {
  if (S.theme !== 'auto') return S.theme === 'night';
  const noon = new Date(t); noon.setHours(12, 0, 0, 0);
  const { rise, set } = sunTimes(noon.getTime()), eight = new Date(t).setHours(S.morning, 0, 0, 0);
  return t < Math.max(rise, eight) || t >= set;
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
  applyTheme();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  if (view === 'settings' && !force) return; // ne pas effacer une saisie en cours
  const m = $('#main');
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
    return `<section class="home">
      <div class="card since">
        <div class="lbl">${o ? 'Sein ' + SIDE[o.s].toLowerCase() : 'En pause'}</div>
        <div class="big" data-t="total"></div>
        <div class="sub ${o ? '' : 'paused'}" data-t="pause"></div>
      </div>
      <div class="grid2">${sideBtn('G')}${sideBtn('D')}</div>
      ${o ? `<button class="btn huge" data-act="pause">${ic('pause')}<span>Pause</span><small>rot, câlin, changement…</small></button>`
          : `<button class="btn huge resume ${last}" data-act="resume">${ic('play')}<span>Reprendre</span><small>sein ${SIDE[last].toLowerCase()}</small></button>`}
      <div class="grid2">
        <button class="btn" data-act="adjust">${ic('pencil')}<small>Corriger</small></button>
        <button class="btn primary${armCls('stop')}" data-act="stop">${ic('check')}<span>Terminer</span></button>
      </div>
      <button class="link${armCls('cancel')}" data-act="cancel">Annuler la tétée</button>
    </section>`;
  }
  const L = list(), meal = L.find(isMeal), lastSein = L.find(x => x.type === 'sein' && x.end);
  const lastSide = lastSein?.segs.at(-1)?.s;
  const t0 = dayStart(now()), today = summarize(L.filter(x => x.start >= t0));
  let sub = '—';
  if (meal) sub = meal.type === 'sein'
    ? [hm(meal.start), dur(sideMs(meal)), meal.segs.length && 'fin sein ' + SIDE[meal.segs.at(-1).s].toLowerCase()].filter(Boolean).join(' · ')
    : `${hm(meal.start)} · biberon ${meal.ml} ml`;
  return `<section class="home">
    <div class="card since">
      <div class="lbl">Dernier repas il y a</div>
      <div class="big" data-t="since">${meal ? '' : '—'}</div>
      <div class="sub">${sub}</div>
    </div>
    <div class="card sub" style="text-align:center;margin:0">Aujourd'hui : <b>${today.seins}</b> tétée${today.seins > 1 ? 's' : ''} ·
      <b>${today.bibs}</b> bib. (${today.ml} ml) · <b>${today.couches}</b> couche${today.couches > 1 ? 's' : ''}</div>
    <div class="grid2">
      ${['G', 'D'].map(s => `<button class="btn side ${s}${armCls('start' + s)}" data-act="side" data-s="${s}">${s}<small>${SIDE[s]}</small>
        ${lastSide === s ? '<span class="badge">dernier</span>' : ''}</button>`).join('')}
    </div>
    <div class="grid2">
      <button class="btn row-btn" data-act="bib">${ic('bottle')}Biberon</button>
      <button class="btn row-btn" data-act="couche">${ic('diaper')}Couche</button>
    </div>
    <button class="link" data-act="forgot">Ajouter un oubli</button>
  </section>`;
}

function describe(e) {
  if (e.type === 'sein') {
    const parts = ['G', 'D'].filter(s => e.segs.some(x => x.s === s)).map(s => `${s} ${dur(sideMs(e, s))}`);
    return { ic: ic('feed'), t: e.end ? parts.join(' · ') || '0 min' : 'En cours…', d: e.end ? `Total ${dur(sideMs(e))}` : '' };
  }
  if (e.type === 'biberon') return { ic: ic('bottle'), t: `${e.ml} ml`, d: e.milk === 'maternel' ? 'Lait maternel' : 'Lait artificiel' };
  return { ic: ic(e.caca ? 'poop' : 'drop'), t: [e.pipi && 'Pipi', e.caca && 'Caca'].filter(Boolean).join(' + ') || 'Couche', d: '' };
}

function historyHTML() {
  const L = list();
  let html = `<div class="adds">
    <button class="btn" data-act="add" data-type="sein">+ Tétée</button>
    <button class="btn" data-act="add" data-type="biberon">+ Biberon</button>
    <button class="btn" data-act="add" data-type="couche">+ Couche</button></div>`;
  if (!L.length) return html + `<p class="sub" style="text-align:center;margin-top:40px">Rien pour l'instant.</p>`;
  const meals = L.filter(isMeal);
  let day = null;
  for (const e of L.slice(0, 400)) {
    const dn = dayName(e.start);
    if (dn !== day) { day = dn; html += `<div class="day">${dn}</div>` }
    const x = describe(e);
    let gap = '';
    if (isMeal(e)) { const i = meals.indexOf(e), prev = meals[i + 1]; if (prev) gap = `+${dur(e.start - prev.start)}` }
    const extra = [x.d, e.note && esc(e.note), e.by && 'par ' + esc(e.by)].filter(Boolean).join(' · ');
    html += `<button class="row" data-act="edit" data-id="${e.id}"><span class="ic">${x.ic}</span>
      <span class="tx"><div>${x.t}</div>${extra ? `<div>${extra}</div>` : ''}</span>
      <span class="tm">${hm(e.start)}<small>${gap}</small></span></button>`;
  }
  return html;
}

function summarize(evs) {
  const seins = evs.filter(e => e.type === 'sein' && e.end), bibs = evs.filter(e => e.type === 'biberon');
  const meals = evs.filter(isMeal).sort((a, b) => a.start - b.start);
  const gaps = meals.slice(1).map((e, i) => e.start - meals[i].start);
  const tG = seins.reduce((m, e) => m + sideMs(e, 'G'), 0), tD = seins.reduce((m, e) => m + sideMs(e, 'D'), 0);
  const couches = evs.filter(e => e.type === 'couche');
  return {
    seins: seins.length, bibs: bibs.length, meals: meals.length, tG, tD, tSein: tG + tD,
    ml: bibs.reduce((m, e) => m + (+e.ml || 0), 0),
    gap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
    avgSein: seins.length ? (tG + tD) / seins.length : 0,
    couches: couches.length, pipi: couches.filter(e => e.pipi).length, caca: couches.filter(e => e.caca).length
  };
}
const kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
function block(title, s, perDay = 1) {
  const r = v => perDay > 1 ? Math.round(v / perDay * 10) / 10 : v;
  const tot = s.tG + s.tD || 1;
  return `<h2>${title}</h2><div class="card">
    <div class="kpis">
      ${kpi(r(s.meals), 'repas' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(s.gap ? dur(s.gap) : '—', 'entre 2 repas (moy.)')}
      ${kpi(r(s.seins), 'tétées' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(s.avgSein ? dur(s.avgSein) : '—', 'durée moy. tétée')}
      ${kpi(dur(s.tSein / perDay), 'au sein' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(Math.round(s.ml / perDay) + ' ml', `biberons (${r(s.bibs)})` + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(r(s.couches), 'couches' + (perDay > 1 ? ' / jour' : ''))}
      ${kpi(`${r(s.pipi)} / ${r(s.caca)}`, 'pipi / caca')}
    </div>
    ${s.tSein ? `<div class="split"><i style="width:${s.tG / tot * 100}%;background:var(--g)"></i><i style="flex:1;background:var(--d)"></i></div>
      <div class="sub" style="display:flex;justify-content:space-between"><span>G ${dur(s.tG)} (${Math.round(s.tG / tot * 100)}%)</span><span>D ${dur(s.tD)}</span></div>` : ''}
  </div>`;
}
function statsHTML() {
  const L = list(), t = now(), t0 = dayStart(t);
  const days = [];
  for (let i = 0; i < 7; i++) { const a = t0 - i * 864e5, b = a + 864e5; days.push({ a, s: summarize(L.filter(e => e.start >= a && e.start < b)) }) }
  const week = summarize(L.filter(e => e.start >= t0 - 6 * 864e5));
  const max = Math.max(1, ...days.map(d => d.s.meals));
  return block("Aujourd'hui", days[0].s)
    + block('Dernières 24 h', summarize(L.filter(e => e.start >= t - 864e5)))
    + block('Moyenne 7 jours', week, 7)
    + `<h2>Repas par jour</h2><div class="card bars">${days.map(d => `<div class="b">
        <span>${new Date(d.a).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
        <div class="track"><div class="fill" style="width:${d.s.meals / max * 100}%"></div>
        <span class="val">${d.s.meals} repas · ${dur(d.s.tSein)}${d.s.ml ? ' · ' + d.s.ml + ' ml' : ''}</span></div></div>`).join('')}</div>`;
}

function settingsHTML() {
  const r = (v, l) => `<label><input type="radio" name="theme" value="${v}" ${S.theme === v ? 'checked' : ''}>${l}</label>`;
  return `<div class="set">
    <h2>Affichage</h2>
    <div class="card set">
      <div class="seg" id="themeSeg">${r('auto', 'Auto (soleil)')}${r('day', 'Jour')}${r('night', 'Nuit')}</div>
      ${S.theme === 'auto' ? (() => { const n = new Date(); n.setHours(12, 0, 0, 0); const { rise, set } = sunTimes(n.getTime());
        return `<p>Aujourd'hui : nuit à partir de ${hm(set)}, jour à partir de ${hm(Math.max(rise, new Date().setHours(S.morning, 0, 0, 0)))}.</p>
        <label>Mode jour jamais avant<select id="morning">${[6, 7, 8, 9, 10].map(h => `<option value="${h}" ${S.morning === h ? 'selected' : ''}>${h} h</option>`).join('')}</select></label>` })() : ''}
      <label class="toggle"><span>Mode une main <small class="sub">(boutons en bas)</small></span><input type="checkbox" id="onehand" ${S.onehand ? 'checked' : ''}></label>
      <label>Votre prénom (affiché dans l'historique)<input id="name" value="${esc(S.name)}" placeholder="ex. Papa"></label>
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
      <a class="link" href="https://github.com/SachD-Av/junior/blob/main/tetee/README.md" target="_blank">Guide de configuration</a>`}
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
function tick() {
  const t = now(), e = active();
  document.querySelectorAll('[data-t]').forEach(el => {
    const k = el.dataset.t;
    if (k === 'since') { const m = list().find(isMeal); if (m) el.textContent = dur(t - m.start) }
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
setInterval(() => { tick(); if (isNight() !== (document.documentElement.dataset.theme === 'night')) applyTheme() }, 1000);

/* garder l'écran allumé pendant une tétée */
let wl = null;
async function wake(on) {
  try {
    if (on && !wl && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => wl = null);
    } else if (!on && wl) { await wl.release(); wl = null }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { render(); wake(!!active()) } });

/* ---------- boîtes de dialogue ---------- */
function dialog(html, onClose, setup) {
  const d = $('#dlg'), f = $('#dlgForm');
  f.innerHTML = html;
  setup?.(f);
  f.onsubmit = ev => { const v = ev.submitter?.value; if (v && v !== 'cancel') onClose(v, f) };
  d.showModal();
}

function bibDialog() {
  let ml = S.ml;
  dialog(`<h3>${ic('bottle')} Biberon</h3>
    <div class="mlbox"><button type="button" class="btn" data-d="-10">−</button><output id="mlv">${ml}</output><button type="button" class="btn" data-d="10">+</button></div>
    <div class="quick">${[30, 60, 90, 120, 150, 180, 210, 240].map(v => `<button type="button" class="btn" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${S.milk === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>
    <label>Heure<input type="datetime-local" name="start" value="${dtl(now())}"></label>
    <menu><button class="btn" value="cancel">Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      S.ml = ml; S.milk = f.milk.value; saveSettings();
      const t = new Date(f.start.value).getTime() || now();
      guard('quick', { done: `Biberon noté · ${ml} ml` }, () => { const e = { id: uid(), type: 'biberon', start: t, end: t, ml, milk: S.milk }; put(e); return e.id });
    },
    f => f.addEventListener('click', ev => {
      const b = ev.target.closest('[data-d],[data-v]'); if (!b) return;
      ml = b.dataset.v ? +b.dataset.v : Math.max(0, ml + +b.dataset.d);
      f.querySelector('#mlv').textContent = ml; buzz();
    }));
}

function coucheDialog() {
  dialog(`<h3>${ic('diaper')} Couche</h3>
    <div class="grid2"><button class="btn" value="p">${ic('drop')}Pipi</button><button class="btn" value="c">${ic('poop')}Caca</button></div>
    <button class="btn primary" value="pc">Les deux</button>
    <menu><button class="btn" value="cancel">Annuler</button></menu>`,
    v => { const t = now(), e = { id: uid(), type: 'couche', start: t, end: t, pipi: v.includes('p'), caca: v.includes('c') };
      guard('quick', { done: `Couche notée · ${[e.pipi && 'pipi', e.caca && 'caca'].filter(Boolean).join(' + ')}` }, () => { put(e); return e.id }) });
}

function editDialog(e, isNew) {
  const min = s => Math.round(sideMs(e, s) / 60000);
  let body = '';
  if (e.type === 'sein') body = `<div class="grid2">
      ${[['g', 'G', 'Gauche'], ['d', 'D', 'Droit']].map(([n, s, l]) => `<label>${l} (min)<span class="step">
        <button type="button" class="btn" data-step="-1" data-for="${n}">−</button>
        <input type="number" name="${n}" min="0" inputmode="numeric" value="${min(s)}">
        <button type="button" class="btn" data-step="1" data-for="${n}">+</button></span></label>`).join('')}</div>
      <div class="sub" data-endhint></div>`;
  if (e.type === 'biberon') body = `<label>Quantité (ml)<input type="number" name="ml" min="0" step="5" inputmode="numeric" value="${e.ml ?? S.ml}"></label>
      <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${(e.milk || S.milk) === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>`;
  if (e.type === 'couche') body = `<div class="seg"><label><input type="checkbox" name="pipi" ${e.pipi ? 'checked' : ''}>Pipi</label>
      <label><input type="checkbox" name="caca" ${e.caca ? 'checked' : ''}>Caca</label></div>`;
  const title = { sein: ic('feed') + ' Tétée', biberon: ic('bottle') + ' Biberon', couche: ic('diaper') + ' Couche' }[e.type];
  dialog(`<h3>${title}</h3>
    <label>Début<input type="datetime-local" name="start" value="${dtl(e.start)}" required></label>
    ${body}
    <label>Note<input name="note" value="${esc(e.note)}" placeholder="optionnel"></label>
    <menu>${isNew ? '' : '<button class="btn danger" value="del">Supprimer</button>'}
      <button class="btn" value="cancel">Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      if (v === 'del') { if (confirm('Supprimer ?')) { e.del = true; put(e) } return }
      const start = new Date(f.start.value).getTime() || e.start;
      if (e.type === 'sein') {
        const g = Math.max(0, +f.g.value || 0), d = Math.max(0, +f.d.value || 0);
        if (!isNew && g === min('G') && d === min('D')) {           // durées inchangées : on décale juste l'heure
          const dt = start - e.start; e.segs.forEach(s => { s.a += dt; s.b += dt });
        } else {                                                     // on reconstruit les segments
          const first = e.segs[0]?.s || 'G', order = first === 'G' ? [['G', g], ['D', d]] : [['D', d], ['G', g]];
          let t = start; e.segs = [];
          for (const [s, m] of order) if (m) { e.segs.push({ s, a: t, b: t + m * 6e4 }); t += m * 6e4 }
        }
        e.start = start; e.end = e.segs.at(-1)?.b ?? start;
      } else {
        e.start = e.end = start;
        if (e.type === 'biberon') { e.ml = Math.max(0, +f.ml.value || 0); e.milk = f.milk.value }
        if (e.type === 'couche') { e.pipi = f.pipi.checked; e.caca = f.caca.checked }
      }
      e.note = f.note.value.trim() || null;
      put(e);
    },
    f => {
      if (e.type !== 'sein') return;
      const hint = () => { const t = new Date(f.start.value).getTime(), m = (+f.g.value || 0) + (+f.d.value || 0);
        f.querySelector('[data-endhint]').textContent = t ? `Fin : ${hm(t + m * 6e4)} · total ${m} min` : '' };
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
  else if (a === 'couche') coucheDialog();
  else if (a === 'night') { S.theme = isNight() ? 'day' : 'night'; saveSettings(); render(true) }
  else if (a === 'edit') { const e = events.get(b.dataset.id); if (e && !e.end && e.type === 'sein') { view = 'home'; render() } else if (e) editDialog(structuredClone(e)) }
  else if (a === 'add') newEntry(b.dataset.type);
  else if (a === 'adjust') adjustDialog();
  else if (a === 'forgot') forgotDialog();
  else if (a === 'invite') invite();
  else if (a === 'drivescript') driveScript(b.dataset.mode);
  else if (a === 'unlink') { if (confirm('Arrêter la synchro ? Les données restent sur ce téléphone.')) { cloud?.unsub?.(); cloud = null; S.fb = S.fam = null; saveSettings(); setSync('local'); render(true) } }
  else if (a === 'join') { if (!joinFrom($('#joinTxt').value)) alert('Lien invalide') }
  else if (a === 'create') {
    const c = parseCfg($('#cfgTxt').value);
    if (!c) return alert('Configuration non reconnue : il faut au moins apiKey et projectId.');
    S.fb = c; S.fam = newFamCode();
    saveSettings(); connectCloud(); render(true);
  }
  else if (a === 'export') {
    const blob = new Blob([JSON.stringify([...events.values()], null, 1)], { type: 'application/json' });
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `tetee-${dtl(now()).slice(0, 10)}.json`; l.click();
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.name === 'theme' && t.closest('#themeSeg')) { S.theme = t.value; saveSettings(); applyTheme() }
  else if (t.id === 'onehand') { S.onehand = t.checked; saveSettings(); applyTheme() }
  else if (t.name === 'guard') { S.guard = t.value; armed = null; saveSettings(); render(true) }
  else if (t.name === 'delay') { S.delay = +t.value; saveSettings() }
  else if (t.name === 'minFeed') { S.minFeed = +t.value; saveSettings() }
  else if (t.dataset.prot) { S.prot[t.dataset.prot] = t.checked; saveSettings() }
  else if (t.id === 'morning') { S.morning = +t.value; saveSettings(); applyTheme(); render(true) }
  else if (t.id === 'name') { S.name = t.value.trim(); saveSettings() }
  else if (t.id === 'importFile' && t.files[0]) t.files[0].text().then(txt => {
    try {
      const arr = JSON.parse(txt); let n = 0;
      for (const raw of Array.isArray(arr) ? arr : []) { const e = clean(raw); if (!e) continue; const l = events.get(e.id); if (!l || e.u > l.u) { events.set(e.id, e); cloud?.write(e); n++ } }
      saveLocal(); alert(`${n} entrée(s) importée(s)`); render(true);
    } catch { alert('Fichier invalide') }
  });
});

/* ---------- synchro Firebase ---------- */
function setSync(s, err) {
  const el = $('#sync');
  el.innerHTML = { local: 'local', wait: 'connexion…', ok: ic('cloud') + 'synchro', off: ic('cloudOff') + 'hors ligne', err: ic('alert') + 'erreur synchro' }[s];
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
async function driveScript(mode) {
  try {
    const txt = (await (await fetch('sauvegarde-drive.gs', { cache: 'no-cache' })).text())
      .replace("'__PROJET__'", JSON.stringify(S.fb.projectId)).replace("'__FAMILLE__'", JSON.stringify(S.fam));
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
    S.fb = j.c; S.fam = j.f; saveSettings(); connectCloud(); view = 'home'; render(true); return true;
  } catch { return false }
}

function newFamCode() { // 16 caractères parmi 32 = 80 bits, sans biais
  const A = 'abcdefghjkmnpqrstuvwxyz234567890';
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), x => A[x & 31]).join('');
}
async function connectCloud() {
  if (!S.fb || !S.fam || !FAM_RE.test(S.fam)) return setSync('local');
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
    const full = S.syncedFam !== S.fam;
    const since = full ? 0 : [...events.values()].reduce((m, e) => Math.max(m, e.u || 0), 0) - 864e5;
    const q = since > 0 ? fs.query(col, fs.where('u', '>=', since)) : col;
    const me = { write: e => fs.setDoc(fs.doc(col, e.id), JSON.parse(JSON.stringify(e))).catch(err => setSync('err', err)) };
    let reconciled = false;
    me.unsub = fs.onSnapshot(q, { includeMetadataChanges: true }, snap => {
      if (cloud !== me) return;
      let changed = false;
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') return;
        const r = clean(ch.doc.data(), ch.doc.id), l = events.get(ch.doc.id);
        if (r && (!l || r.u > l.u)) { events.set(r.id, r); changed = true }
      });
      if (!reconciled && !snap.metadata.fromCache) {   // envoie ce qui n'existe qu'ici (ou plus récent ici)
        reconciled = true;
        const remote = new Map(snap.docs.map(d => [d.id, d.data().u || 0]));
        for (const e of events.values())
          if ((full || e.u >= since) && (!remote.has(e.id) || e.u > remote.get(e.id))) me.write(e);
        if (full) { S.syncedFam = S.fam; saveSettings() }
      }
      setSync(snap.metadata.fromCache ? 'off' : 'ok');
      if (changed) { saveLocal(); render() }
    }, err => setSync('err', err));
    cloud = me;
  } catch (err) { setSync('err', err) }
}

/* ---------- démarrage ---------- */
function checkJoinHash() {
  if (!location.hash.startsWith('#join=')) return;
  const h = location.hash; history.replaceState(null, '', location.pathname);
  if (!joinFrom(h)) alert('Lien d\'invitation invalide.');
}
window.addEventListener('hashchange', checkJoinHash);
checkJoinHash();
connectCloud();
render(true);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
