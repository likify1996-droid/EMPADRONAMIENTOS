const CACHE = 'fc-empadronamiento-v12';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-logo.png'
];

// En campo la señal celular suele ser lenta/intermitente, no solo estar
// totalmente caída. Sin límite de tiempo, fetch() puede quedarse "colgado"
// intentando la red por mucho tiempo antes de fallar, y la app parece no
// cargar. Esto fuerza a usar la copia en caché si la red no responde rápido.
function fetchConLimite(request, ms=4000){
  return Promise.race([
    fetch(request),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))
  ]);
}

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
    // Network-first para el HTML, pero con límite de tiempo: si la red no
    // responde rápido (señal débil en campo), cae a la copia en caché en
    // vez de quedarse cargando indefinidamente.
    e.respondWith(
      fetchConLimite(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first para el resto (imágenes, manifest, etc.), también con límite
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetchConLimite(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
