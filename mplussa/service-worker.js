const CACHE_NAME = 'mplussa-cache-v1'; // Muuta versio aina kun tiedostoja päivitetään
const ASSETS_TO_CACHE = [
  'index.html',
  'app.js',
  'styles.css'
];

// Asennus: tallenna tiedostot välimuistiin
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Ota uusi Service Worker heti käyttöön
});

// Aktivointi: poista vanhat välimuistit
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim(); // Aktivoi heti ilman uudelleenlatausta
});

// Fetch: yritä hakea verkosta ja päivitä välimuisti, fallback välimuistiin
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Päivitä välimuisti uusimmalla versiolla
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Jos verkko ei toimi, hae välimuistista
        return caches.match(event.request);
      })
  );
});