// ── Cache version ─────────────────────────────────────────────────────────────
// Bump this string whenever you deploy new assets so the old cache is replaced.
const CACHE_NAME = 'key-speaker-v1';

// ── App shell + all image assets to pre-cache on install ─────────────────────
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  // Alphabet images
  '/images/apple.png',
  '/images/bee.png',
  '/images/cat.png',
  '/images/dog.png',
  '/images/elephant.png',
  '/images/fish.png',
  '/images/grapes.png',
  '/images/horse.png',
  '/images/icecream.png',
  '/images/jellyfish.png',
  '/images/kite.png',
  '/images/lion.png',
  '/images/moon.png',
  '/images/nest.png',
  '/images/orange.png',
  '/images/penguin.png',
  '/images/queen.png',
  '/images/rainbow.png',
  '/images/sun.png',
  '/images/turtle.png',
  '/images/umbrella.png',
  '/images/violin.png',
  '/images/whale.png',
  '/images/xylophone.png',
  '/images/yak.png',
  '/images/zebra.png',
  // Number hand images
  '/images/hands_0.png',
  '/images/hands_1.png',
  '/images/hands_2.png',
  '/images/hands_3.png',
  '/images/hands_4.png',
  '/images/hands_5.png',
  '/images/hands_6.png',
  '/images/hands_7.png',
  '/images/hands_8.png',
  '/images/hands_9.png',
  // Icons
  '/images/icon-192.png',
  '/images/icon-512.png',
];

// ── Install: pre-cache everything ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Skip waiting so the new SW activates immediately without a page reload
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin or same-scheme resources
  if (event.request.method !== 'GET') return;

  // Let Google Fonts and other CDN requests pass through to the network
  // (they have their own long-lived caches)
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      });
    })
  );
});
