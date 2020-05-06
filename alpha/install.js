var version = "v2.6";
const expectedCaches = ['Calculator-' + version ];
const files2cache = [
    './',
    './manifest.json',
    './index.html',
    './index.css',
    './index.js',
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
  console.log(version + ' downloading...');
  event.waitUntil(caches.open('Calculator-' + version )
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
      console.log('Calculator-' + version + ' ready to load offline!');
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