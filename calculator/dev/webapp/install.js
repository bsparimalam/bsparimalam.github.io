
var appversion = "v1.0.1";
const expectedCaches = ['Calculator-' + appversion ];
const files2cache = [
    './',
    './index.html',
    './style.css',
    './scripts.js',
    './manifest.json',
    './icon-512.png',
    './icon-152.png',
    './icon-32.png',
    './calculator/index.html',
    './calculator/style.css',
    './calculator/font.ttf',
    './calculator/load.js',
    './calculator/io.js',
    './calculator/compute.js',
    './calculator/log.js'
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