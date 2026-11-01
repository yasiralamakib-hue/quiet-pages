const CACHE = 'astray-shell-v4';
const SHELL = [
  './', './index.html', './admin.html', './styles.css?v=21', './app.js?v=12',
  './config.js', './manifest.webmanifest', './astray-logo.png',
  './astray-icon-192.png', './astray-icon-512.png', './hair-band.png',
  './ear-ring-bow.png', './ear-ring.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('astray-shell-') && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request,response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => {
    const update = fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request,response.clone()));
      return response;
    }).catch(() => cached);
    return cached || update;
  }));
});
