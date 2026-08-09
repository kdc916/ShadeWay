const CACHE='shadeway-shell-v1.9.4.30';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('shadeway-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function isRuntimeAsset(url){return url.hostname==='cdn.jsdelivr.net'&&(url.pathname.includes('/leaflet@1.9.4/')||url.pathname.includes('/pmtiles')||url.pathname.includes('/flatgeobuf'))}
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));return;
  }
  if(url.origin===self.location.origin&&url.pathname.startsWith('/api/')){event.respondWith(fetch(req));return;}
  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));return res})));return;
  }
  if(isRuntimeAsset(url)){
    event.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));return res}).catch(()=>hit);return hit||net}));
  }
  // Map tiles, routing, search, weather and building APIs remain network-first/network-only.
});
