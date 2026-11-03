/* Martinelli Autos - cache v3: actualiza HTML y scripts antes de servir el cache. */
const CACHE_NAME = "martinelli-auto-cache-v5";
const ASSETS = ["./","./index.html","./icon.png","./manifest.json","./js/backup.js","./js/recovery.js"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(ASSETS); } catch (e) { console.warn("Cache inicial incompleto", e); }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(x => x !== CACHE_NAME).map(x => caches.delete(x)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const fresh = event.request.mode === "navigate" || /\.(?:js|html|css)$/i.test(url.pathname);
  if (fresh) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, cloned)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(event.request)));
  } else {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});

/* Web Push: mostrar inmediatamente cada mensaje recibido (requisito Safari iOS). */
self.addEventListener('push', event => {
  let data={title:'Martinelli Autos',body:'Tenés una notificación.',url:'/'};
  try {if(event.data)data={...data,...event.data.json()};}catch(_){}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,icon:'./icon.png',badge:'./icon.png',tag:data.tag||'martinelli-'+(data.url||'inicio'),
    data:{url:data.url||'/'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/',self.location.origin).href;
  if(new URL(url).origin !== self.location.origin)return;
  event.waitUntil((async()=>{
    const tabs=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of tabs){if(c.url.startsWith(self.location.origin)){await c.navigate(url);return c.focus();}}
    return clients.openWindow(url);
  })());
});
