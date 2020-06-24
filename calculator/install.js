var appversion = "v6.2.1";
const expectedCaches = ['Calculator-' + appversion ];
const files2cache = [
    './',
    './index.json',
    './icons/icon-512.png',
    './icons/icon-152.png',
    './icons/icon-32.png',
    './favicon.ico',
    './index.html',
    './index.css',
    './index.js',
    './engine/engine.html',
    './engine/engine.css',
    './engine/font.ttf',
    './engine/load.js',
    './engine/io.js',
    './engine/compute.js',
    './engine/log.js'
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