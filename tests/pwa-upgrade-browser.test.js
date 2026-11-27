const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const test=require('node:test');
const {launch}=require('../tools/browser-check.js');

const root=path.resolve(__dirname,'..');
const oldCache='douglas-designer-v1.0.0-rc3.guided1';
const newCache='douglas-designer-v1.0.0-rc3.guided2';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
const projectIndex="JSON.parse(localStorage.getItem('douglas-designer-projects-v1'))";
const activeProject=`localStorage.getItem('douglas-designer-project-v1:'+(${projectIndex}).activeId)`;
const waitFor=async(b,expr)=>{
 for(let i=0;i<80;i++){
  if(await b.eval(expr))return;
  await new Promise(resolve=>setTimeout(resolve,125));
 }
 assert.fail('Geen actieve versie gevonden: '+expr);
};

test('PWA vervangt de fase 1-cache, behoudt projecten en start offline',{
 skip:!process.env.GITHUB_ACTIONS&&!process.env.CHROME_BIN,timeout:60000
},async()=>{
 let oldRelease=true;
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const asset=pathname==='/'?'index.html':pathname.slice(1);
  const type=mime[path.extname(asset)];
  if(!type||path.basename(asset)!==asset){
   response.writeHead(404).end();return;
  }
  if(asset==='sw.js'&&oldRelease){
   // A controlled installation with the previous production cache name.
   response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(`
    self.addEventListener('install',event=>event.waitUntil(caches.open('${oldCache}')
     .then(cache=>cache.put('./',new Response('<h1>Fase 1</h1>'))).then(()=>self.skipWaiting())));
    self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
   `);
   return;
  }
  fs.readFile(path.join(root,asset),(error,body)=>{
   if(error)response.writeHead(404).end();
   else response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(body);
  });
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 let b;
 try{
  const url='http://127.0.0.1:'+server.address().port+'/';
  b=await launch();
  await b.goto(url);
  await waitFor(b,`navigator.serviceWorker.controller && caches.has('${oldCache}')`);
  await b.click('#welcomeTemplates [data-proj="template:0"]');
  await b.eval(`(()=>{
   const input=document.querySelector('#panel-room [data-room="width"]');
   input.value=4913;
   input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  const saved=await b.eval(activeProject);
  assert.equal(JSON.parse(saved).room.width,4913);
  await b.eval("caches.open('other-product')");
  oldRelease=false;
  await b.eval('navigator.serviceWorker.ready.then(registration=>registration.update()).then(()=>true)');
  await waitFor(b,`Promise.all([caches.has('${oldCache}'),caches.has('${newCache}')]).then(([old,current])=>!old&&current)`);
  assert.equal(await b.eval("caches.has('other-product')"),true);
  assert.equal(await b.eval(`caches.open('${newCache}').then(cache=>cache.keys()).then(keys=>
   [...document.querySelectorAll('script[src],link[rel=stylesheet]')].every(el=>keys.some(key=>key.url===(el.src||el.href))))`),true);

  await b.send('Network.enable');
  await b.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await b.goto(url);
  assert.equal(await b.eval("Boolean(window.DouglasRoomStudio && document.querySelector('#scene'))"),true);
  assert.ok(await b.click('[data-phase=room]'));
  assert.equal(await b.eval("document.querySelector('#panel-room [data-room=width]').valueAsNumber"),4913);
  assert.equal(await b.eval(activeProject),saved);
  assert.deepEqual(b.errors(),[]);
 }finally{
  await b?.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});
