const CACHE='douglas-designer-v0.3.0';
const ASSETS=['./','./index.html','./styles.css','./ux.css','./model.js','./app.js','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('douglas-designer-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  // Prefer current online release; retain v0.3 cached files for offline fallback.
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});