const CACHE = 'fc-empadronamiento-v9';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .catch(err => console.log('Cache install error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // No cachear llamadas a APIs externas (Groq, Nominatim, SEPOMEX)
  if (e.request.url.includes('groq.com') ||
      e.request.url.includes('nominatim') ||
      e.request.url.includes('sepomex') ||
      e.request.url.includes('icalialabs')) {
    return; // dejar pasar directo a la red
  }

  const isHTML = e.request.mode === 'navigate' ||
                 e.request.url.endsWith('.html') ||
                 e.request.url.endsWith('/');

  if (isHTML) {
    // Network-first para el HTML: siempre intenta traer la versión más
    // reciente. Si no hay internet, usa la copia guardada en caché.
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first para el resto (imágenes, manifest, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
