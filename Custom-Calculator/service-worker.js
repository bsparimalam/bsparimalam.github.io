

const cachename = 'Custom-Calculator';
const files2cache = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/functions.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(caches.open('static')
    .then(function(cache) {
      cache.addAll(files2cache);
    }));
  console.log('service workers installed');
});

self.addEventListener('activate', function(event){
  console.log('service workers activated');
})

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