// Cache de l'appli pour qu'elle marche sans réseau (la synchro reprend toute seule).
const CACHE = 'tetee-v33';
const SHELL = ['./', './index.html', './app.js', './sauvegarde-drive.gs', './manifest.webmanifest', './icon-192.png', './icon-512.png', './maskable-192.png', './maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // seulement l'appli et les fichiers du SDK Firebase ; jamais les requêtes Firestore
  if (url.origin !== location.origin && url.host !== 'www.gstatic.com') return;
  // page, code de l'appli et script Google : réseau d'abord (une correction s'applique dès l'ouverture),
  // cache si pas de réseau ou réseau trop lent (3 s)
  const fresh = e.request.mode === 'navigate' || (url.origin === location.origin && /\.(html|js|gs|webmanifest)$|\/$/.test(url.pathname));
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r });
    if (!fresh) return cached || net;                                   // icônes, SDK Firebase (versionné) : cache d'abord
    const slow = new Promise(res => setTimeout(() => res(cached), 3000));
    try { return (await Promise.race([net, cached ? slow : net])) || await net } catch { return cached || Response.error() }
  }));
});

// toucher la notification de rappel ouvre (ou ramène) l'appli
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
