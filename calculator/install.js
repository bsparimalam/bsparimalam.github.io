var version = "v4.5";
const expectedCaches = ['Calculator-' + version ];
const files2cache = [
    './',
    './index.html',
    './manifest.json',
    './icon-512x512.png',
    './icon-152x152.png',
    './icon-32x32.png',
    './0.css',
    './0.js',
    './1.js',
    './2.js',
    './3.js',
    './4.js'
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