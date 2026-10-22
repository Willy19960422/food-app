const CACHE_NAME = "food-shell-20261022-ui-polish-1";
const APP_SHELL = [
  "./","./index.html","./manifest.json","./icon-192.png","./icon-512.png",
  "./food-taxonomy.js","./barcode-v2.js","./ui-scale.js",
  "./push-settings.js","./settings-menu.js",
  "./food-cloud.js","./food-trends.js","./food-account.js",
  "./food-admin-ui.js","./food-candidate-admin.js","./food-sheet.js",
  "./food-browser-v3.js","./ui-polish.css","./ui-polish.js"
];
const STATIC_VENDOR=[
 "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js",
 "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.8/dist/umd/supabase.js"
];
const vendorFiles=new Set(STATIC_VENDOR);
const staticFiles = new Set(APP_SHELL.map(p=>new URL(p,self.registration.scope).pathname));
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // One missing optional asset should not disable every offline resource.
  await Promise.allSettled([...APP_SHELL,...STATIC_VENDOR].map(async path=>{
   const request=new Request(new URL(path,self.registration.scope),{cache:"reload",mode:STATIC_VENDOR.includes(path)?"no-cors":"same-origin"});
   const response=await fetch(request);
   if(response.ok||response.type==="opaque")await cache.put(request,response);
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
 if((url.origin!==self.location.origin||!staticFiles.has(url.pathname)) && !vendorFiles.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{
   const response=await fetch(req);
   if(response.ok||response.type==="opaque")event.waitUntil(cache.put(req,response.clone()).catch(()=>{}));
   return response;
  }catch(_){
   const cached=await cache.match(req,{ignoreSearch:true});
   if(cached)return cached;
   // An HTML document must never be returned as JavaScript/CSS/image.
   // Serve the offline shell only for page navigation, not asset fetches.
   if(req.mode==="navigate" || req.destination==="document"){
     return await cache.match(new URL("./index.html",self.registration.scope)) ||
       new Response("離線且無法載入 App，請重新連線",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
   }
   return new Response("Offline asset not cached",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
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
