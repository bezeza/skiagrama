/* Skiagrama offline cache. Change VERSION on every release. */
const VERSION='skiagrama-0.4-b96c2930';
const FONTS='skiagrama-fonts';
const SHELL=['./','./index.html','./skiagrama.html','./manifest.webmanifest','./icon-96.png','./icon-180.png','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./pamyatka.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(r.mode==='navigate'){e.respondWith(caches.match(r,{ignoreSearch:true}).then(c=>c||fetch(r)).catch(()=>caches.match('./index.html')));return;}
    e.respondWith(caches.match(r).then(c=>c||fetch(r)));return;
  }
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open(FONTS).then(cache=>cache.match(r).then(hit=>{
      const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))cache.put(r,res.clone());return res;}).catch(()=>hit);
      return hit||net;})));
  }
});
