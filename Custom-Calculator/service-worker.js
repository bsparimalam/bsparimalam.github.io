
var version = "v3.3"; //update the p element in the index html
const expectedCaches = ['Calculator-' + version ];
const files2cache = [
  './',
  './manifest.json',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/functions.js',
  './images/icons/icon-512x512.png',
  './images/icons/icon-384x384.png',
  './images/icons/icon-192x192.png',
  './images/icons/icon-152x152.png',
  './images/icons/icon-144x144.png',
  './images/icons/icon-128x128.png',
  './images/icons/icon-96x96.png',
  './images/icons/icon-72x72.png',
  './images/icons/icon-32x32.png',
  './images/icons/icon-16x16.png'
];

self.addEventListener('install', function(event) {
  console.log(version + ' installing...');
  event.waitUntil(caches.open('Calculator-' + version )
    .then(function(cache) {
      cache.addAll(files2cache);
    }));
  console.log('Installation complete!');
});

self.addEventListener('activate', function(event){
  console.log('Service workers activated');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!expectedCaches.includes(key)) {
          return caches.delete(key);
        }
      })
    )).then(() => {
      console.log(version + ' ready to handle fetches!');
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