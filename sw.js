const CACHE_NAME = 'nutri-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // 保持即時連線優先
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});