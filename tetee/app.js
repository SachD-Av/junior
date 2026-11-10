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

/* ---------- état ---------- */
const S = Object.assign({ theme: 'auto', onehand: true, name: '', fb: null, fam: null, ml: 90, milk: 'artificiel' }, LS.get('tt_settings', {}));
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
function tapSide(side) {
  const t = now();
  let e = active();
  if (!e) e = { id: uid(), type: 'sein', start: t, end: null, segs: [] };
  const o = openSeg(e);
  if (o && o.s === side) return;
  if (o) o.b = t;
  e.segs.push({ s: side, a: t, b: null });
  buzz(); put(e);
}
function pause() { const e = active(), o = e && openSeg(e); if (o) { o.b = now(); buzz(); put(e) } }
function resume() { const e = active(); if (!e) return; e.segs.push({ s: e.segs.at(-1)?.s || 'G', a: now(), b: null }); buzz(); put(e) }
function stop() {
  const e = active(); if (!e) return;
  const t = now(), o = openSeg(e);
  if (o) o.b = t;
  e.end = e.segs.at(-1)?.b ?? t;      // une pause en cours n'est pas comptée
  if (sideMs(e) < 5000) e.del = true; // tap par erreur
  buzz(); put(e);
}
function cancelFeed() { const e = active(); if (e && confirm('Annuler cette tétée ?')) { e.del = true; put(e) } }

/* ---------- thème ---------- */
function isNight() { if (S.theme === 'auto') { const h = new Date().getHours(); return h >= 21 || h < 7 } return S.theme === 'night' }
function applyTheme() {
  const n = isNight();
  document.documentElement.dataset.theme = n ? 'night' : 'day';
  document.querySelector('meta[name=theme-color]').content = n ? '#000000' : '#FAF7F2';
  document.body.classList.toggle('onehand', !!S.onehand);
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
    const o = openSeg(e);
    return `<section class="home">
      <div class="card since">
        <div class="lbl" id="tState">${o ? 'Sein ' + SIDE[o.s].toLowerCase() : 'Pause rot'}</div>
        <div class="big" data-t="total"></div>
        <div class="sub ${o ? '' : 'paused'}" data-t="pause"></div>
      </div>
      <div class="grid2">
        ${['G', 'D'].map(s => `<button class="btn side ${s} ${o?.s === s ? 'on' : o ? 'dim' : ''}" data-act="side" data-s="${s}">
          ${s}<span class="t" data-t="${s}"></span><small>${o?.s === s ? 'en cours' : o ? 'changer' : 'reprendre ici'}</small></button>`).join('')}
      </div>
      <div class="grid2">
        ${o ? `<button class="btn" data-act="pause">⏸ Pause rot</button>` : `<button class="btn" data-act="resume">▶ Reprendre<small>sein ${SIDE[e.segs.at(-1)?.s || 'G'].toLowerCase()}</small></button>`}
        <button class="btn primary" data-act="stop">✓ Terminer</button>
      </div>
      <button class="link" data-act="cancel">Annuler la tétée</button>
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
      ${['G', 'D'].map(s => `<button class="btn side ${s}" data-act="side" data-s="${s}">${s}<small>${SIDE[s]}</small>
        ${lastSide === s ? '<span class="badge">dernier</span>' : ''}</button>`).join('')}
    </div>
    <div class="grid2">
      <button class="btn" data-act="bib">🍼 Biberon</button>
      <button class="btn" data-act="couche">🧷 Couche</button>
    </div>
  </section>`;
}

function describe(e) {
  if (e.type === 'sein') {
    const parts = ['G', 'D'].filter(s => e.segs.some(x => x.s === s)).map(s => `${s} ${dur(sideMs(e, s))}`);
    return { ic: '🤱', t: e.end ? parts.join(' · ') || '0 min' : 'En cours…', d: e.end ? `Total ${dur(sideMs(e))}` : '' };
  }
  if (e.type === 'biberon') return { ic: '🍼', t: `${e.ml} ml`, d: e.milk === 'maternel' ? 'Lait maternel' : 'Lait artificiel' };
  return { ic: e.caca ? '💩' : '💧', t: [e.pipi && 'Pipi', e.caca && 'Caca'].filter(Boolean).join(' + ') || 'Couche', d: '' };
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
      <div class="seg" id="themeSeg">${r('auto', 'Auto (21h–7h)')}${r('day', 'Jour')}${r('night', 'Nuit')}</div>
      <label class="toggle"><span>Mode une main <small class="sub">(boutons en bas)</small></span><input type="checkbox" id="onehand" ${S.onehand ? 'checked' : ''}></label>
      <label>Votre prénom (affiché dans l'historique)<input id="name" value="${esc(S.name)}" placeholder="ex. Papa"></label>
    </div>
    <h2>Synchronisation entre téléphones</h2>
    <div class="card set">
    ${S.fam ? `
      <p>Synchro active. Code famille :</p><div class="code">${esc(S.fam)}</div>
      <button class="btn primary" data-act="invite">📤 Envoyer le lien à l'autre parent</button>
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
    <h2>Données</h2>
    <div class="card grid2">
      <button class="btn" data-act="export">⬇ Exporter</button>
      <label class="btn">⬆ Importer<input type="file" id="importFile" accept="application/json" hidden></label>
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
  dialog(`<h3>🍼 Biberon</h3>
    <div class="mlbox"><button type="button" class="btn" data-d="-10">−</button><output id="mlv">${ml}</output><button type="button" class="btn" data-d="10">+</button></div>
    <div class="quick">${[30, 60, 90, 120, 150, 180, 210, 240].map(v => `<button type="button" class="btn" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${S.milk === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>
    <label>Heure<input type="datetime-local" name="start" value="${dtl(now())}"></label>
    <menu><button class="btn" value="cancel">Annuler</button><button class="btn primary" value="ok">Enregistrer</button></menu>`,
    (v, f) => {
      S.ml = ml; S.milk = f.milk.value; saveSettings();
      const t = new Date(f.start.value).getTime() || now();
      put({ id: uid(), type: 'biberon', start: t, end: t, ml, milk: S.milk });
    },
    f => f.addEventListener('click', ev => {
      const b = ev.target.closest('[data-d],[data-v]'); if (!b) return;
      ml = b.dataset.v ? +b.dataset.v : Math.max(0, ml + +b.dataset.d);
      f.querySelector('#mlv').textContent = ml; buzz();
    }));
}

function coucheDialog() {
  dialog(`<h3>🧷 Couche</h3>
    <div class="grid2"><button class="btn" value="p">💧 Pipi</button><button class="btn" value="c">💩 Caca</button></div>
    <button class="btn primary" value="pc">💧 + 💩 Les deux</button>
    <menu><button class="btn" value="cancel">Annuler</button></menu>`,
    v => { const t = now(); put({ id: uid(), type: 'couche', start: t, end: t, pipi: v.includes('p'), caca: v.includes('c') }) });
}

function editDialog(e, isNew) {
  const min = s => Math.round(sideMs(e, s) / 60000);
  let body = '';
  if (e.type === 'sein') body = `<div class="grid2">
      <label>Gauche (min)<input type="number" name="g" min="0" inputmode="numeric" value="${min('G')}"></label>
      <label>Droit (min)<input type="number" name="d" min="0" inputmode="numeric" value="${min('D')}"></label></div>`;
  if (e.type === 'biberon') body = `<label>Quantité (ml)<input type="number" name="ml" min="0" step="5" inputmode="numeric" value="${e.ml ?? S.ml}"></label>
      <div class="seg">${['artificiel', 'maternel'].map(v => `<label><input type="radio" name="milk" value="${v}" ${(e.milk || S.milk) === v ? 'checked' : ''}>Lait ${v}</label>`).join('')}</div>`;
  if (e.type === 'couche') body = `<div class="seg"><label><input type="checkbox" name="pipi" ${e.pipi ? 'checked' : ''}>💧 Pipi</label>
      <label><input type="checkbox" name="caca" ${e.caca ? 'checked' : ''}>💩 Caca</label></div>`;
  const title = { sein: '🤱 Tétée', biberon: '🍼 Biberon', couche: '🧷 Couche' }[e.type];
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
    });
}

/* ---------- clics ---------- */
document.addEventListener('click', ev => {
  const nb = ev.target.closest('[data-view]');
  if (nb) { view = nb.dataset.view; render(true); $('#main').scrollTop = 0; return }
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'side') tapSide(b.dataset.s);
  else if (a === 'pause') pause();
  else if (a === 'resume') resume();
  else if (a === 'stop') stop();
  else if (a === 'cancel') cancelFeed();
  else if (a === 'bib') bibDialog();
  else if (a === 'couche') coucheDialog();
  else if (a === 'night') { S.theme = isNight() ? 'day' : 'night'; saveSettings(); render(true) }
  else if (a === 'edit') { const e = events.get(b.dataset.id); if (e && !e.end && e.type === 'sein') { view = 'home'; render() } else if (e) editDialog(structuredClone(e)) }
  else if (a === 'add') {
    const t = now(), type = b.dataset.type;
    editDialog(type === 'sein' ? { id: uid(), type, start: t - 15 * 6e4, end: t, segs: [] }
      : { id: uid(), type, start: t, end: t, ml: S.ml, milk: S.milk, pipi: true, caca: false }, true);
  }
  else if (a === 'invite') invite();
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
  el.textContent = { local: 'local', wait: 'connexion…', ok: '☁ synchro', off: '☁ hors ligne', err: '⚠ erreur synchro' }[s];
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
    const me = { write: e => fs.setDoc(fs.doc(col, e.id), JSON.parse(JSON.stringify(e))).catch(err => setSync('err', err)) };
    let reconciled = false;
    me.unsub = fs.onSnapshot(col, { includeMetadataChanges: true }, snap => {
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
        for (const e of events.values()) if (!remote.has(e.id) || (e.u || 0) > remote.get(e.id)) me.write(e);
      }
      setSync(snap.metadata.fromCache ? 'off' : 'ok');
      if (changed) { saveLocal(); render() }
    }, err => setSync('err', err));
    cloud = me;
  } catch (err) { setSync('err', err) }
}

/* ---------- démarrage ---------- */
if (location.hash.startsWith('#join=')) {
  const h = location.hash; history.replaceState(null, '', location.pathname);
  if (!joinFrom(h)) alert('Lien d\'invitation invalide.');
}
connectCloud();
render(true);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
