const CACHE='douglas-designer-v0.7.2-rc1';
const ASSETS=['./','./render3d.js?rev=0.7.2','./drafting.js?rev=0.6.0','./studio.css?rev=0.6.0','./room-studio.css?rev=0.7.1','./sketch-studio.css?rev=0.7.2','./renderer.css?rev=0.5.1','./index.html','./styles.css','./ux.css?rev=0.5.1','./room-space.js?rev=0.7.0','./sketch-grid.js?rev=0.7.2','./model.js?rev=0.5.1','./room-studio.js?rev=0.7.1','./app.js?rev=0.7.2','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('douglas-designer-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  // Prefer current online release; retain cached files for offline fallback.
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});