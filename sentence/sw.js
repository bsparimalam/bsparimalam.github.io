// Service worker: keeps a complete copy of the app on the device. Pages are always
// served from that copy (so the app starts instantly and works offline); the network
// is only used to check whether sw.js itself changed, i.e. a new version was deployed.
//
// The build fills in VERSION and ASSETS (see scripts/build.mjs).
const VERSION = "dab92b5609ba39c6";
const ASSETS = [
  "./assets/app-C534BVYA.js",
  "./assets/styles-Z4IBOITW.css",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon-maskable.svg",
  "./icons/icon.svg",
  "./index.html",
  "./manifest.webmanifest"
];
const CACHE = 'mdwp-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(
        // Hashed files never change, so the HTTP cache may supply them; everything else
        // is revalidated so we don't store a stale copy.
        ASSETS.map((url) => new Request(url, { cache: url.startsWith('./assets/') ? 'default' : 'no-cache' })),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('mdwp-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The page asks the waiting worker to take over when the user clicks "Reload".
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Other origins (an Ollama server, images on the web, ...) go straight to the network.
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit || fetch(request)));
    return;
  }
  event.respondWith(
    caches.match(request, { cacheName: CACHE, ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          // Optional bundles (e.g. the Anthropic SDK) are cached the first time they are used.
          if (res.ok && url.pathname.includes('/assets/')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
