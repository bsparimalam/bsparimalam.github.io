

const cacheName = 'Custom-Calculator 1.0';
const filesToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/functions.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

/* Start the service worker and cache all of the app's content */
self.addEventListener('activate', function(event) {
 event.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== cacheName) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      })
  );
});

/* Serve cached content when offline */
self.addEventListener('fetch', function(event) {
  if (event.request.mode !== 'navigate') {
    // Not a page navigation, bail.
    return;
  }
 event.respondWith(
    fetch(event.request)
        .catch(() => {
          return caches.open(cacheName)
              .then((cache) => {
                return cache.match('index.html');
              });
        })
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});