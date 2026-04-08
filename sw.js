const CACHE_NAME = 'rbi-quality-v15-0-1';
const BASE_PATH = '/quality_rbi/';

const APP_SHELL = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}favicon.ico`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
  `${BASE_PATH}icons/icon-maskable-512.png`,
  `${BASE_PATH}icons/apple-touch-icon.png`,
  `${BASE_PATH}icons/favicon-32x32.png`,
  `${BASE_PATH}icons/favicon-16x16.png`,
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(`${BASE_PATH}index.html`, responseClone);
          });
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(`${BASE_PATH}index.html`)) ||
            (await caches.match(`${BASE_PATH}`))
          );
        })
    );
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isKnownCdn =
    url.origin === 'https://cdn.tailwindcss.com' ||
    url.origin === 'https://cdn.jsdelivr.net' ||
    url.origin === 'https://cdnjs.cloudflare.com';

  if (isSameOrigin || isKnownCdn) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        } catch (error) {
          if (request.destination === 'document') {
            return (
              (await caches.match(`${BASE_PATH}index.html`)) ||
              (await caches.match(`${BASE_PATH}`))
            );
          }
          throw error;
        }
      })
    );
  }
});