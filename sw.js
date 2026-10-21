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

// Background Web Push: works on installed iOS Home Screen PWAs (iOS 16.4+) and compatible browsers.
// The visible message is delivered by the platform; no page needs to remain open.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  const title = typeof payload.title === 'string' ? payload.title.slice(0,80) : '食養紀錄';
  const body = typeof payload.body === 'string' ? payload.body.slice(0,260) : '你有一則飲食提醒。';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon:'./icon-192.png', badge:'./icon-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0,80) : 'food-journal',
    data: { url: self.registration.scope }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const wins = await clients.matchAll({type:'window',includeUncontrolled:true});
    for (const win of wins) {
      if (win.url.startsWith(scope) && 'focus' in win) return win.focus();
    }
    return clients.openWindow(scope);
  })());
});
