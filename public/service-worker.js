const CACHE_NAME = 'khiladiadda24-shell-v30';
const SHELL_URLS = ['/index.html', '/admin.html', '/login.html', '/app-icon.svg', '/app-icon-192.png', '/app-icon-512.png', '/logo.png', '/cricket.png', '/pubg.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  const requestUrl = new URL(event.request.url);
  const cachePath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok && SHELL_URLS.includes(cachePath)) {
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(cachePath, response.clone())));
      }
      return response;
    }).catch(async () => {
      const cachedPage = SHELL_URLS.includes(cachePath) ? await caches.match(cachePath) : null;
      return cachedPage || new Response('This page is unavailable offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
