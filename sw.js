const CACHE = 'fc-empadronamiento-v20';
const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/catalogos.js',
  './js/nucleo.js',
  './js/formulario.js',
  './js/vehiculo.js',
  './js/ubicacion.js',
  './js/ocr.js',
  './js/reporte.js',
  './js/pestanas.js',
  './js/app.js',
  './manifest.json',
  './icon-logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// En campo la señal celular suele ser lenta/intermitente. Sin límite de
// tiempo, fetch() puede quedarse "colgado" y la app parece no cargar.
function fetchConLimite(request, ms = 4000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

self.addEventListener('install', e => {
  // Cada archivo se guarda por separado: si uno falta (404), los demás
  // se guardan igual y la app sigue funcionando sin conexión.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // cache:'reload' evita guardar una copia vieja del caché HTTP del navegador
      Promise.allSettled(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' }))))
    )
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
  if (e.request.method !== 'GET') return;

  // APIs externas (Groq, Nominatim, SEPOMEX, tiles del mapa): directo a la red
  const url = e.request.url;
  if (url.includes('groq.com') ||
      url.includes('nominatim') ||
      url.includes('sepomex') ||
      url.includes('icalialabs') ||
      url.includes('places.googleapis.com') ||
      url.includes('tile.openstreetmap.org')) {
    return;
  }

  // Archivos propios de la app (HTML, CSS, JS, manifest, íconos): primero la
  // red, para que index.html y app.js siempre sean de la misma versión; si no
  // hay señal, la copia guardada.
  const isApp = e.request.mode === 'navigate' ||
                new URL(url).origin === self.location.origin;

  if (isApp) {
    // Network-first con límite de tiempo. Solo se guarda en caché si la
    // respuesta fue correcta: un 404/500 NUNCA reemplaza la copia buena.
    e.respondWith(
      fetchConLimite(e.request)
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
            return resp;
          }
          // Respuesta de error del servidor: preferir la copia guardada
          return caches.match(e.request)
            .then(c => c || (e.request.mode === 'navigate' ? caches.match('./index.html') : null))
            .then(c => c || resp);
        })
        .catch(() => caches.match(e.request).then(c => c || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  // Librerías y fuentes externas (Leaflet, heic2any, Google Fonts): caché
  // primero y se va guardando lo descargado para usarlo sin conexión.
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetchConLimite(e.request, 8000).then(resp => {
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      });
    })
  );
});
