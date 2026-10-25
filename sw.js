const CACHE='douglas-designer-v0.4.0-refresh1';
const ASSETS=['./','./index.html','./styles.css?rev=0.4.0-refresh1','./ux.css?rev=0.4.0-refresh1','./model.js?rev=0.4.0-refresh1','./app.js?rev=0.4.0-refresh1','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('douglas-designer-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  // Prefer current online release; retain the current release cached files for offline fallback.
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});