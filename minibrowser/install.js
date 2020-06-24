var appversion = "v0.2.1";
const expectedCaches = ['minibrowser-' + appversion ];
const files2cache = [
    './',
    './manifest.json',
    './icons/icon-512.png',
    './icons/icon-152.png',
    './icons/icon-32.png',
    './icons/back.png',
    './icons/forward.png',
    './icons/reload.png',
    './icons/back-dark.png',
    './icons/forward-dark.png',
    './icons/reload-dark.png',
    './favicon.ico',
    './index.html',
    './style.css',
    './scripts.js',
    './loading/index.html',
    './loading/style.css',
    './loading/loading.gif',
    './loading/loading-dark.gif'
];
self.addEventListener('install', function(event) {
  console.log(appversion + ' downloading...');
  event.waitUntil(caches.open('Calculator-' + appversion )
    .then(function(cache) {
      cache.addAll(files2cache);
    }));
  console.log('app download complete!');
});

self.addEventListener('activate', function(event){
  console.log('app installation complete!');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!expectedCaches.includes(key)) {
          return caches.delete(key);
        }
      })
    )).then(() => {
      console.log('Calculator-' + appversion + ' ready to load offline!');
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(res) {
        if (res) {
          return res;
        } else {
          return fetch(event.request);
        }
      })
  );
});