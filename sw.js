const CACHE = 'fc-empadronamiento-v3';
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
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
