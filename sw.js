const CACHE='douglas-designer-v1.0.0-rc3.guided2.1';
const ASSETS=['./','./render3d.js?rev=0.7.2','./drafting.js?rev=0.6.0','./studio.css?rev=0.6.0','./room-studio.css?rev=1.0.0-rc3.guided2','./sketch-studio.css?rev=0.7.2','./renderer.css?rev=0.5.1','./index.html','./styles.css','./ux.css?rev=1.0.0-rc3.guided2','./room-space.js?rev=1.0.0-rc3.guided2','./sketch-grid.js?rev=0.7.2','./mesh-import.js?rev=0.7.6','./plan-editor.js?rev=1.0.0-rc3.storage','./plan-editor.css?rev=1.0.0-rc3.storage','./model.js?rev=1.0.0-rc3.dak','./materials.js?rev=1.0.0-rc3.dak','./documents.js?rev=1.0.0-rc3.cut','./projects.js?rev=1.0.0-rc3.trash','./share.js?rev=0.7.5','./room-studio.js?rev=1.0.0-rc3.guided2','./startontwerpen.js?rev=1.0.0-rc3','./app.js?rev=1.0.0-rc3.guided2.1','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png'];
self.addEventListener('install',e=>{
 const requests=ASSETS.map(url=>new Request(url,{cache:'reload'}));
 e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(requests)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('douglas-designer-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  // Revalidate the app shell even when the browser still has a fresh HTTP-cache
  // entry from the previous release.
  const request=e.request;
  const online=request.mode==='navigate'?fetch(request,{cache:'no-cache'}):fetch(request);
  e.respondWith(online.catch(()=>caches.open(CACHE).then(cache=>cache.match(request))));
});
