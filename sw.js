const CACHE_NAME = "food-shell-20261022-v2";
const APP_SHELL = [
  "./","./index.html","./manifest.json","./icon-192.png","./icon-512.png",
  "./food-taxonomy.js","./barcode-v2.js","./ui-scale.js",
  "./push-settings.js","./settings-menu.js",
  "./food-cloud.js","./food-trends.js","./food-account.js",
  "./food-admin-ui.js","./food-sheet.js"
];
const staticFiles = new Set(APP_SHELL.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // One missing optional asset should not disable every offline resource.
  await Promise.allSettled(APP_SHELL.map(async path=>{
   const request=new Request(new URL(path,self.registration.scope),{cache:"reload"});
   const response=await fetch(request);
   if(response.ok)await cache.put(request,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(name=>name.startsWith("food-shell-")&&name!==CACHE_NAME)
    .map(name=>caches.delete(name)));
  await clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 // Do not cache Supabase/auth/AI responses or any third-party user data.
 if(url.origin!==self.location.origin||!staticFiles.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{
   const response=await fetch(req);
   if(response.ok)event.waitUntil(cache.put(req,response.clone()).catch(()=>{}));
   return response;
  }catch(_){
   return await cache.match(req,{ignoreSearch:true}) ||
     await cache.match(new URL("./index.html",self.registration.scope));
  }
 })());
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
