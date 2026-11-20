#!/usr/bin/env node
/* End-to-end scenario's in een echte Chrome (headless, desktop-viewport) via tools/browser-check.js.
   Gebruik: start eerst een statische server (bijv. `python3 -m http.server 8765`), dan
   `node tools/e2e.js [--url http://localhost:8765/index.html] [--out map] [--only deel-van-naam]`.
   Elk scenario start met een schone browser. Exit 1 bij een mislukte controle.
   Dit vervangt geen acceptatie op jouw eigen laptop en geen test op een echte iPhone. */
'use strict';
const path=require('node:path');const os=require('node:os');
const {launch,sleep}=require('./browser-check.js');

const args=process.argv.slice(2);const opt=(n,d)=>{const i=args.indexOf(n);return i>=0?args[i+1]:d;};
const URL_=opt('--url','http://localhost:8765/index.html'),OUT=opt('--out',path.join(os.tmpdir(),'douglas-e2e')),ONLY=opt('--only','');

const LS_KEYS=`Object.keys(localStorage)`;
const activeProject=`(()=>{const ix=JSON.parse(localStorage.getItem('douglas-designer-projects-v1')||'null');return ix?JSON.parse(localStorage.getItem('douglas-designer-project-v1:'+ix.activeId)):null})()`;
const indexNames=`(()=>{const ix=JSON.parse(localStorage.getItem('douglas-designer-projects-v1')||'null');return ix?ix.items.map(i=>i.name):[]})()`;

async function fresh(b){await b.goto(URL_);await b.eval(`localStorage.clear()`);await b.goto(URL_);await sleep(300);}
async function demo(b){await fresh(b);await b.click('#demoProject');await sleep(500);}
const set=(b,sel,v)=>b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);

const fs=require('node:fs');
const Share=require('../share.js');
const tmp=(n)=>path.join(os.tmpdir(),'douglas-e2e-files',n);
const waitFor=async(fn,ms=6000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{if(await fn())return true;}catch(_){}await sleep(150);}return false;};

const scenarios=[
 {name:'start: welkomstscherm, voorbeeld openen, drie camerastanden zonder fouten',async run(b,t){
   await fresh(b);t.ok('welkomstscherm zichtbaar',await b.eval(`!document.querySelector('#welcomeLayer').classList.contains('hidden')`));
   await b.click('#demoProject');await sleep(500);t.ok('28 zaagstukken',await b.eval(`document.querySelector('#statBeams').textContent.includes('28')`));
   for(const v of ['front','side','top','bottom','3d']){await b.click(`.view-btn[data-view="${v}"]`);await sleep(250);await b.shot(path.join(OUT,`view-${v}.png`));}
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'projecten: migratie van oud opslagitem, nieuw/dupliceren/hernoemen/verwijderen/terugzetten',async run(b,t){
   await fresh(b);
   const legacy=await b.eval(`(()=>{const p={name:'Oude keuken',width:1875,depth:870,height:950,modules:[{id:'m1',kind:'drawers',width:520,name:'Ladekast'},{id:'m2',kind:'fridge',width:600,name:'Koelkast'},{id:'m3',kind:'kamado',width:555,name:'Kamado'}],beams:[]};const s=JSON.stringify(p);localStorage.clear();localStorage.setItem('douglas-designer-v1',s);localStorage.setItem('douglas-designer-welcome-v2','seen');return s;})()`);
   await b.goto(URL_);await sleep(400);
   t.ok('oud project overgenomen als actief project',await b.eval(`${activeProject}.name==='Oude keuken'`));
   t.ok('oud opslagitem onaangeroerd',await b.eval(`localStorage.getItem('douglas-designer-v1')===${JSON.stringify(legacy)}`));
   await b.click('#homeBtn');await sleep(300);
   t.ok('projectenoverzicht toont 1 project',await b.eval(`document.querySelectorAll('#modalContent [data-proj-name]').length===1`));
   await b.eval(`document.querySelector('#modalContent [data-proj="demo"]').click()`);await sleep(500);
   t.ok('voorbeeld is NIEUW project; oud project blijft bestaan',await b.eval(`${indexNames}.length===2&&${indexNames}.includes('Oude keuken')`));
   await b.click('#homeBtn');await sleep(300);
   await set(b,'#modalContent [data-proj-name]:not([data-proj-name=""])','x');
   t.ok('hernoemen werkt',await b.eval(`${indexNames}.includes('x')`));
   await b.eval(`document.querySelector('#modalContent [data-proj^="dup:"]').click()`);await sleep(300);
   t.ok('dupliceren geeft 3 projecten',await b.eval(`${indexNames}.length===3`));
   t.ok('kopie wordt niet actief (actief project blijft het geopende project)',await b.eval(`${activeProject}.name!=='x (kopie)'&&document.querySelector('#displayName').textContent===${activeProject}.name`));
   await b.shot(path.join(OUT,'projecten.png'));
   await b.eval(`document.querySelector('#modalContent [data-proj^="del:"]').click()`);await sleep(400);
   t.ok('verwijderen: 2 over, 1 in prullenbak',await b.eval(`${indexNames}.length===2&&JSON.parse(localStorage.getItem('douglas-designer-trash-v1')).length===1`));
   await b.click('#homeBtn');await sleep(300);
   await b.eval(`document.querySelector('#modalContent [data-proj^="restore:"]').click()`);await sleep(400);
   t.ok('terugzetten: weer 3 projecten',await b.eval(`${indexNames}.length===3`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'bewerken blijft bewaard na herladen; wisselen tussen projecten behoudt beide',async run(b,t){
   await demo(b);await set(b,'#projectName','Keuken A');await sleep(300);
   await b.click('#newProject');await sleep(400);
   t.ok('nieuw project actief',await b.eval(`${activeProject}.name==='Nieuw basisontwerp'`));
   await b.goto(URL_);await sleep(400);
   t.ok('na herladen: zelfde actieve project',await b.eval(`${activeProject}.name==='Nieuw basisontwerp'`));
   t.ok('Keuken A bleef bestaan',await b.eval(`${indexNames}.includes('Keuken A')`));
   await b.click('#homeBtn');await sleep(300);
   await b.eval(`[...document.querySelectorAll('#modalContent [data-proj^="open:"]')][0].click()`);await sleep(400);
   t.ok('wisselen naar Keuken A: 28 zaagstukken',await b.eval(`${activeProject}.name==='Keuken A'&&document.querySelector('#statBeams').textContent.includes('28')`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'zaaglijst, materiaallijst en bouwdocument',async run(b,t){
   await demo(b);await b.click('#openCutlist');await sleep(400);
   t.ok('materiaallijst aanwezig',await b.eval(`document.querySelector('#modalContent').innerHTML.includes('MATERIAALLIJST')`));
   await set(b,'#modalContent [data-mat="price:schroeven"]','12,50');await sleep(300);
   t.ok('prijs opgeslagen in project',await b.eval(`${activeProject}.materials.prices.schroeven===12.5`));
   await b.click('#showDocument');await sleep(500);
   t.ok('3 tekeningen',await b.eval(`document.querySelectorAll('#modalContent svg.dd-drawing').length===3`));
   t.ok('onderdelenlijst 28 stuks',await b.eval(`document.querySelector('#modalContent').innerHTML.includes('ONDERDELENLIJST (28 STUKS)')`));
   await b.shot(path.join(OUT,'bouwdocument.png'));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'profiel, werkblad en apparaatmaten bewerken',async run(b,t){
   await demo(b);
   await b.eval(`document.querySelector('.side-tab[data-panel="beams"]')?.click()`);await sleep(300);
   await b.eval(`document.querySelector('[data-select-frame]').click()`);await sleep(400);
   await set(b,'#inspectorBody select[data-edit="profile"]','70x70');await sleep(300);
   t.ok('profiel opgeslagen als frame-override',await b.eval(`Object.values(${activeProject}.frameEdits).some(e=>e.profile==='70x70')`));
   await set(b,'#ctThickness',40);await sleep(300);
   t.ok('werkbladdikte opgeslagen',await b.eval(`${activeProject}.countertopSpec.thickness===40`));
   await b.eval(`[...document.querySelectorAll('[data-select-module]')].find(e=>e.textContent.includes('Koelkast')).click()`);await sleep(400);
   await set(b,'#inspectorBody [data-edit="app_w"]',900);await sleep(300);
   await b.click('#openCutlist');await sleep(400);
   t.ok('waarschuwing: apparaat past niet',await b.eval(`document.querySelector('#modalContent').innerHTML.includes('past niet')`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'delen: link naar project en terug als nieuw project (zonder foto)',async run(b,t){
   await demo(b);await set(b,'#projectName','Link-test');await sleep(300);
   await b.click('#shareBtn');await sleep(300);
   t.ok('deelvenster open',await b.eval(`document.querySelector('#modalContent').innerHTML.includes('LINK NAAR DIT PROJECT')`));
   t.ok('link wordt gemaakt',await waitFor(()=>b.eval(`document.querySelector('#shareLinkInput').value.includes('#share=z.')`)));
   const link=await b.eval(`document.querySelector('#shareLinkInput').value`);
   t.ok('link bevat geen foto-data en blijft kort',link.length<6000&&!link.includes('/9j/'),'lengte '+link.length);
   await b.shot(path.join(OUT,'delen.png'));
   await b.eval(`localStorage.clear()`);await b.goto('about:blank');await b.goto(link);await sleep(800);
   t.ok('ontvangstscherm toont project',await b.eval(`document.querySelector('#modalContent').innerHTML.includes('Link-test')`));
   t.ok('nog niets toegepast zonder bevestiging',await b.eval(`!(${indexNames}).includes('Link-test')`));
   t.ok('hash is opgeschoond',await b.eval(`location.hash===''`));
   await b.click('[data-recv="project"]');await sleep(500);
   t.ok('project als nieuw project toegevoegd',await b.eval(`${activeProject}.name==='Link-test'&&document.querySelector('#statBeams').textContent.includes('28')`));
   t.ok('kapotte link: duidelijke melding, geen crash',await (async()=>{await b.goto(URL_.split('#')[0]+'#share=z.AAAA');await sleep(700);return b.eval(`document.querySelector('#toast').textContent.includes('Link kon niet worden gelezen')`);})());
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},
 {name:'aanleveren (telefoon → laptop): foto + maten → bestand → import → toegepast',async run(b,t){
   const dl=await b.downloadsTo(tmp('dl-'+Date.now()));
   await demo(b);
   // 1. een echte foto maken (groot, ruisachtig) met een canvas in de browser
   const jpgB64=await b.eval(`(()=>{const c=document.createElement('canvas');c.width=3000;c.height=2000;const x=c.getContext('2d');for(let i=0;i<4000;i++){x.fillStyle='hsl('+(i*7%360)+',60%,'+(30+i%40)+'%)';x.fillRect((i*97)%3000,(i*53)%2000,60+(i%90),40+(i%70));}return c.toDataURL('image/jpeg',0.95).split(',')[1];})()`);
   const photo=tmp('grote-foto.jpg');fs.mkdirSync(path.dirname(photo),{recursive:true});fs.writeFileSync(photo,Buffer.from(jpgB64,'base64'));
   t.ok('testfoto is groot (>400 kB)',fs.statSync(photo).size>400000,String(fs.statSync(photo).size));
   // 2. formulier invullen
   await b.click('#shareBtn');await sleep(300);await b.eval(`document.querySelector('[data-share="deliver"]').click()`);await sleep(300);
   const type=(k,v)=>b.eval(`(()=>{const e=document.querySelector('[data-draft="${k}"]');e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
   await type('name','Terras achter');await type('width',5200);await type('depth',3400);await type('height',2500);await type('notes','Stopcontact links, let op de goot');
   await b.uploadFile('#photoInput',[photo]);
   t.ok('foto verschijnt, verkleind tot geldige JPEG ≤ 450k tekens',await waitFor(()=>b.eval(`(()=>{const i=document.querySelector('#deliverPhotos img');return !!i&&i.src.startsWith('data:image/jpeg;base64,')&&i.src.length<=450000&&i.src.length>5000})()`)));
   await b.shot(path.join(OUT,'aanleveren.png'));
   t.ok('invoer blijft staan na foto toevoegen',await b.eval(`document.querySelector('[data-draft="width"]').value==='5200'&&document.querySelector('[data-draft="notes"]').value.includes('goot')`));
   // 3. versturen = bestand opslaan (geen Web Share in desktop-Chrome)
   await b.eval(`document.querySelector('[data-deliver="send"]').click()`);
   t.ok('bestand opgeslagen',await waitFor(()=>fs.readdirSync(dl).some(f=>f.endsWith('.douglas.json')&&!f.endsWith('.crdownload'))));
   const file=path.join(dl,fs.readdirSync(dl).find(f=>f.endsWith('.douglas.json')));
   const parsed=JSON.parse(fs.readFileSync(file,'utf8')),v=Share.validate(parsed);
   t.ok('bestand is een geldige aanlevering met 1 foto en maten',v.ok&&v.type==='aanlevering'&&v.summary.photos===1&&v.summary.room.width===5200,JSON.stringify(v.summary||v));
   // 4. "laptop": importeren via Project importeren
   await b.eval(`document.querySelector('#modalBackdrop [id="closeModal"]')?.click()`);await sleep(200);
   await b.uploadFile('#fileInput',[file]);await sleep(600);
   t.ok('ontvangstscherm toont maten en foto',await b.eval(`(()=>{const h=document.querySelector('#modalContent').innerHTML;return h.includes('5200')&&h.includes('1 foto')&&h.includes('goot')})()`));
   await b.shot(path.join(OUT,'ontvangen.png'));
   t.ok('nog niet toegepast',await b.eval(`${activeProject}.room.width!==5200`));
   await b.click('[data-recv="applyCurrent"]');await sleep(500);
   t.ok('ruimtematen en 3D-ruimte toegepast',await b.eval(`(()=>{const r=${activeProject}.room;return r.width===5200&&r.depth===3400&&r.height===2500&&r.enabled===true})()`));
   t.ok('foto is ruimtefoto en staat bij referenties',await b.eval(`(()=>{const p=${activeProject};return p.room.photo.startsWith('data:image/jpeg')&&p.reference.photos.length===1&&p.reference.notes.includes('goot')})()`));
   t.ok('zaaglijst ongewijzigd door aanlevering (28 stuks)',await b.eval(`document.querySelector('#statBeams').textContent.includes('28')`));
   // 5. kwaadaardig/kapot bestand wordt geweigerd
   const bad=tmp('kwaad.json');fs.writeFileSync(bad,JSON.stringify({format:Share.FORMAT,v:1,t:'aanlevering',photos:['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],room:{width:'x'}}));
   await b.uploadFile('#fileInput',[bad]);await sleep(500);
   t.ok('ongeldige aanlevering geweigerd met melding',await b.eval(`document.querySelector('#toast').textContent.includes('Niet gelukt')`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

 {name:'modelleren: afstand meten met de muis en reeks kopiëren (met undo)',async run(b,t){
   await demo(b);
   await b.click('#measureTool');await sleep(300);
   t.ok('meetmodus actief in 2D-aanzicht',await b.eval(`document.querySelector('#measureTool').getAttribute('aria-pressed')==='true'&&!document.querySelector('#drawHelp').classList.contains('hidden')`));
   const r=await b.eval(`(()=>{const c=document.querySelector('#scene').getBoundingClientRect();return {x:c.left+c.width/2,y:c.top+c.height/2}})()`);
   await b.mouse('mouseMoved',r.x-200,r.y,{buttons:0});await b.mouse('mousePressed',r.x-200,r.y);await b.mouse('mouseReleased',r.x-200,r.y);
   await b.mouse('mouseMoved',r.x+200,r.y+30,{buttons:0});await sleep(150);
   await b.mouse('mousePressed',r.x+200,r.y+30);await b.mouse('mouseReleased',r.x+200,r.y+30);await sleep(200);
   const help=await b.eval(`document.querySelector('#drawHelp').textContent`);
   const mm=+(/Gemeten: ([\d.]+) mm/.exec(help)||[])[1].toString().replace(/\./g,'');
   t.ok('meting getoond en plausibel (100–5000 mm)',mm>=100&&mm<=5000,help);
   await b.shot(path.join(OUT,'meten.png'));
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(200);
   t.ok('Esc stopt het meten',await b.eval(`document.querySelector('#measureTool').getAttribute('aria-pressed')==='false'`));
   t.ok('meten wijzigt het ontwerp niet',await b.eval(`${activeProject}.beams.length===0&&document.querySelector('#statBeams').textContent.includes('28')`));
   // reeks kopiëren
   await b.eval(`document.querySelector('.side-tab[data-panel="beams"]')?.click()`);await sleep(250);
   await b.eval(`document.querySelector('[data-select-frame]').click()`);await sleep(400);
   t.ok('reeks-gereedschap zichtbaar',await b.eval(`!!document.querySelector('#arrayBeamBtn')`));
   await set(b,'#arrCount',3);await set(b,'#arrSpacing',400);
   await b.click('#arrayBeamBtn');await sleep(500);
   t.ok('3 vrije kopieën, zaaglijst 31 stuks',await b.eval(`${activeProject}.beams.length===3&&document.querySelector('#statBeams').textContent.includes('31')`));
   await b.eval(`document.querySelector('#undoBtn').click()`);await sleep(400);
   t.ok('undo herstelt 28 stuks',await b.eval(`${activeProject}.beams.length===0&&document.querySelector('#statBeams').textContent.includes('28')`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

 {name:'modelleren: kaderselectie en groep verplaatsen (met undo)',async run(b,t){
   await demo(b);
   await b.eval(`document.querySelector('.view-btn[data-view="front"]').click()`);await sleep(400);
   const r=await b.eval(`(()=>{const c=document.querySelector('#scene').getBoundingClientRect();return {l:c.left,t:c.top,w:c.width,h:c.height}})()`);
   const before=await b.eval(`JSON.stringify(${activeProject}.frameEdits||{})`);
   // kader van rechtsonder naar linksboven? nee: links→rechts (volledig binnen) over het hele werkvlak
   await b.mouse('mouseMoved',r.l+10,r.t+120,{buttons:0});await b.mouse('mousePressed',r.l+10,r.t+120);
   await b.mouse('mouseMoved',r.l+r.w/2,r.t+r.h/2,{buttons:1});await b.mouse('mouseMoved',r.l+r.w-10,r.t+r.h-10,{buttons:1});
   await b.mouse('mouseReleased',r.l+r.w-10,r.t+r.h-10);await sleep(400);
   const title=await b.eval(`document.querySelector('#inspectorTitle').textContent`);
   t.ok('groepsselectie getoond',/\d+ balken geselecteerd/.test(title),title);
   const n=+(/(\d+)/.exec(title)||[])[1];t.ok('meer dan 20 balken geselecteerd',n>20,String(n));
   await b.shot(path.join(OUT,'kader.png'));
   await set(b,'#grpX',100);await b.click('#groupMoveBtn');await sleep(400);
   t.ok('groep numeriek verplaatst (frameEdits aangepast)',await b.eval(`JSON.stringify(${activeProject}.frameEdits||{})!==${JSON.stringify(before)}`));
   await b.eval(`document.querySelector('#undoBtn').click()`);await sleep(400);
   t.ok('undo herstelt',await b.eval(`JSON.stringify(${activeProject}.frameEdits||{})===${JSON.stringify(before)}`));
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(200);
   t.ok('Esc heft selectie op',await b.eval(`!/geselecteerd/.test(document.querySelector('#inspectorTitle').textContent)`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

 {name:'foto-achtergrond: foto kiezen, tonen in aanzicht, verslepen, schaal, ontwerp bouwen en undo',async run(b,t){
   await demo(b);
   const jpgB64=await b.eval(`(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1000;const x=c.getContext('2d');x.fillStyle='#8fb5d6';x.fillRect(0,0,1600,1000);x.fillStyle='#6b8f5a';x.fillRect(0,700,1600,300);x.fillStyle='#b5651d';x.fillRect(500,300,600,400);return c.toDataURL('image/jpeg',.8).split(',')[1];})()`);
   const photo=tmp('achtergrond.jpg');fs.mkdirSync(path.dirname(photo),{recursive:true});fs.writeFileSync(photo,Buffer.from(jpgB64,'base64'));
   await b.click('#backdropTool');await sleep(300);
   t.ok('foto-dialoog opent',await b.eval(`!!document.querySelector('[data-bd="pick"]')`));
   await b.uploadFile('#backdropInput',[photo]);
   t.ok('foto opgeslagen als JPEG in project',await waitFor(()=>b.eval(`(()=>{const p=${activeProject};return !!p.backdrop&&p.backdrop.photo.startsWith('data:image/jpeg')&&p.backdrop.view==='front'}`+`)()`)));
   await sleep(400);
   t.ok('foto zichtbaar achter het ontwerp in Voor-aanzicht',await b.eval(`(()=>{const i=document.querySelector('#backdropImg');return !!i&&i.style.display==='block'&&parseFloat(i.style.width)>100&&document.querySelector('.view-btn.selected')?.dataset.view==='front'})()`));
   await b.eval(`document.querySelector('#modalBackdrop [data-bd="move"]').click()`);await sleep(250);
   const x0=await b.eval(`${activeProject}.backdrop.x`);
   const r=await b.eval(`(()=>{const c=document.querySelector('#scene').getBoundingClientRect();return {x:c.left+c.width/2,y:c.top+c.height/2}})()`);
   await b.drag(r.x,r.y,r.x+80,r.y,6);await sleep(300);
   t.ok('foto verplaatst met slepen',await b.eval(`${activeProject}.backdrop.x`)!==x0);
   await b.shot(path.join(OUT,'foto-achtergrond.png'));
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(200);
   await b.click('.view-btn[data-view="top"]');await sleep(300);
   t.ok('foto verborgen in ander aanzicht',await b.eval(`document.querySelector('#backdropImg').style.display==='none'`));
   await b.click('.view-btn[data-view="front"]');await sleep(300);
   await b.click('#backdropTool');await sleep(200);await set(b,'[data-bdf="widthMm"]',4000);await sleep(300);
   t.ok('breedte aanpasbaar',await b.eval(`${activeProject}.backdrop.widthMm===4000`));
   await b.eval(`document.querySelector('#undoBtn').click()`);await sleep(300);
   t.ok('undo herstelt breedte',await b.eval(`${activeProject}.backdrop.widthMm!==4000`));
   await b.click('#backdropTool');await sleep(200);await b.eval(`document.querySelector('[data-bd="remove"]').click()`);await sleep(300);
   t.ok('foto verwijderen',await b.eval(`!${activeProject}.backdrop&&document.querySelector('#backdropImg').style.display==='none'`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

 {name:'3D-scan: .glb importeren, tonen, schalen, bewaren na herladen, verwijderen',async run(b,t){
   await demo(b);
   // testscan: vloer + achterwand + zijwand in meters (5 × 2,5 × 4), gekleurd per vlak
   const quads=[[[0,0,0],[5,0,0],[5,0,4],[0,0,4],[.5,.62,.4]],[[0,0,0],[5,0,0],[5,2.5,0],[0,2.5,0],[.8,.75,.6]],[[0,0,0],[0,0,4],[0,2.5,4],[0,2.5,0],[.7,.5,.4]]];
   const pos=Buffer.alloc(quads.length*4*12),col=Buffer.alloc(quads.length*4*12),idx=Buffer.alloc(quads.length*6*2);
   quads.forEach((q,qi)=>{for(let i=0;i<4;i++){for(let k=0;k<3;k++){pos.writeFloatLE(q[i][k],(qi*4+i)*12+k*4);col.writeFloatLE(q[4][k],(qi*4+i)*12+k*4);}}
     [0,1,2,0,2,3].forEach((v,i)=>idx.writeUInt16LE(qi*4+v,(qi*6+i)*2));});
   const bin=Buffer.concat([pos,col,idx]);
   const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,COLOR_0:1},indices:2}]}],
     buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:pos.length},{buffer:0,byteOffset:pos.length,byteLength:col.length},{buffer:0,byteOffset:pos.length+col.length,byteLength:idx.length}],
     accessors:[{bufferView:0,componentType:5126,count:12,type:'VEC3'},{bufferView:1,componentType:5126,count:12,type:'VEC3'},{bufferView:2,componentType:5123,count:18,type:'SCALAR'}]};
   const jb=Buffer.from(JSON.stringify(json));const jp=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,0x20)]),bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
   const head=Buffer.alloc(12);head.writeUInt32LE(0x46546C67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+jp.length+8+bp.length,8);
   const c1=Buffer.alloc(8);c1.writeUInt32LE(jp.length,0);c1.writeUInt32LE(0x4E4F534A,4);const c2=Buffer.alloc(8);c2.writeUInt32LE(bp.length,0);c2.writeUInt32LE(0x004E4942,4);
   const file=tmp('testruimte.glb');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.concat([head,c1,jp,c2,bp]));
   const painted=()=>b.eval(`(()=>{const c=document.querySelector('#scanCanvas');if(!c||c.style.display==='none')return 0;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;})()`);
   await b.click('#scanTool');await sleep(300);
   t.ok('scan-dialoog opent',await b.eval(`!!document.querySelector('[data-scan="pick"]')`));
   await b.uploadFile('#scanInput',[file]);
   t.ok('scan in project, schaal herkend als meters (1000)',await waitFor(()=>b.eval(`(()=>{const p=${activeProject};return !!p.scan&&p.scan.name==='testruimte.glb'&&p.scan.scale===1000}`+`)()`)));
   await sleep(600);
   t.ok('scan is getekend op het canvas',(await painted())>5000,String(await painted()));
   t.ok('afmetingen kloppen (5000 × 4000, 2500 hoog)',await b.eval(`/5\\.000 × 4\\.000.*2\\.500/.test(document.querySelector('#modalContent').textContent)`));
   await b.eval(`document.querySelector('#modalBackdrop [data-scan="center"]')?.click()`);await sleep(300);await b.eval(`document.querySelector('#modalClose, #closeModal, .modal-close')?.click()`);await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(500);await b.shot(path.join(OUT,'scan-3d.png'));
   await b.click('.view-btn[data-view="front"]');await sleep(500);
   t.ok('ook zichtbaar in voor-aanzicht',(await painted())>3000);
   await b.shot(path.join(OUT,'scan-voor.png'));
   await b.click('#scanTool');await sleep(200);await set(b,'[data-scf="scale"]',2000);await sleep(500);
   t.ok('schaal aanpasbaar: afmetingen verdubbeld',await b.eval(`/10\\.000 × 8\\.000/.test(document.querySelector('#modalContent').textContent)`));
   await b.eval(`document.querySelector('#undoBtn').click()`);await sleep(400);
   t.ok('undo herstelt de schaal',await b.eval(`${activeProject}.scan.scale===1000`));
   await b.goto(URL_);await sleep(1200);
   t.ok('scan blijft na herladen (IndexedDB)',(await waitFor(async()=>(await painted())>3000,6000)));
   await b.click('#scanTool');await sleep(200);await b.eval(`document.querySelector('[data-scan="remove"]').click()`);await sleep(400);
   t.ok('scan verwijderd',await b.eval(`!${activeProject}.scan`)&&(await painted())===0);
   await b.eval(`(()=>{})()`);
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

 {name:'plattegrond-schets: blok en lijn tekenen, vergroten/verkleinen, verplaatsen, undo, naar 3D',async run(b,t){
   await demo(b);
   await b.click('#planTool');await sleep(500);
   t.ok('schetsvenster open met tekenvlak',await b.eval(`!!document.querySelector('.plan-editor.open canvas.pe-canvas')`));
   const st=()=>b.eval(`(()=>{const s=window.DouglasPlanEditorInstance._state();const c=document.querySelector('.pe-canvas').getBoundingClientRect();return {zones:s.plan.zones,lines:s.plan.lines,view:s.view,sel:s.selection,tool:s.tool,l:c.left,t:c.top,w:c.width,h:c.height}})()`);
   let s=await st();t.ok('start leeg',s.zones.length===0&&s.lines.length===0);
   const X=(x,v)=>v.l+v.view.ox+x*v.view.scale,Y=(z,v)=>v.t+v.view.oz+z*v.view.scale;
   // blok tekenen (menu-knop of toets B), sleep over het vlak
   await b.click('[data-pe-tool="block"]');await sleep(150);
   const x0=s.l+s.w*0.30,y0=s.t+s.h*0.30,x1=s.l+s.w*0.60,y1=s.t+s.h*0.55;
   await b.mouse('mouseMoved',x0,y0,{buttons:0});await b.mouse('mousePressed',x0,y0);await b.mouse('mouseMoved',(x0+x1)/2,(y0+y1)/2,{buttons:1});await b.mouse('mouseMoved',x1,y1,{buttons:1});await b.mouse('mouseReleased',x1,y1);await sleep(300);
   s=await st();
   t.ok('blok getekend en geselecteerd (maten op raster 100)',s.zones.length===1&&s.sel&&s.sel.type==='zone'&&s.zones[0].w%100===0&&s.zones[0].d%100===0&&s.zones[0].w>=1000,JSON.stringify(s.zones));
   t.ok('na tekenen terug naar selecteren',s.tool==='select');
   const w0=s.zones[0].w,d0=s.zones[0].d,zx=s.zones[0].x;
   // greep rechtsonder slepen = groter
   const hx=X(s.zones[0].x+w0,s),hy=Y(s.zones[0].z+d0,s);
   await b.mouse('mouseMoved',hx,hy,{buttons:0});await b.mouse('mousePressed',hx,hy);await b.mouse('mouseMoved',hx+30,hy+20,{buttons:1});await b.mouse('mouseMoved',hx+80,hy+40,{buttons:1});await b.mouse('mouseReleased',hx+80,hy+40);await sleep(300);
   s=await st();t.ok('groter gemaakt met de greep',s.zones[0].w>w0&&s.zones[0].d>d0,`${w0}x${d0} → ${s.zones[0].w}x${s.zones[0].d}`);
   // greep linksboven naar binnen = kleiner, rechtsonder blijft staan
   const right=s.zones[0].x+s.zones[0].w;
   await b.mouse('mouseMoved',X(s.zones[0].x,s),Y(s.zones[0].z,s),{buttons:0});await b.mouse('mousePressed',X(s.zones[0].x,s),Y(s.zones[0].z,s));await b.mouse('mouseMoved',X(s.zones[0].x,s)+40,Y(s.zones[0].z,s)+30,{buttons:1});await b.mouse('mouseMoved',X(s.zones[0].x,s)+70,Y(s.zones[0].z,s)+50,{buttons:1});await b.mouse('mouseReleased',X(s.zones[0].x,s)+70,Y(s.zones[0].z,s)+50);await sleep(300);
   const s2=await st();t.ok('kleiner met de linkerbovenhoek, rechterkant blijft staan',s2.zones[0].w<s.zones[0].w&&s2.zones[0].x+s2.zones[0].w===right,`${s.zones[0].w}→${s2.zones[0].w}`);
   // verplaatsen door binnenin te slepen
   const cx=X(s2.zones[0].x+s2.zones[0].w/2,s2),cy=Y(s2.zones[0].z+s2.zones[0].d/2,s2),px0=s2.zones[0].x;
   await b.mouse('mouseMoved',cx,cy,{buttons:0});await b.mouse('mousePressed',cx,cy);await b.mouse('mouseMoved',cx+30,cy+10,{buttons:1});await b.mouse('mouseMoved',cx+100,cy+10,{buttons:1});await b.mouse('mouseReleased',cx+100,cy+10);await sleep(300);
   const s3=await st();t.ok('blok verplaatst, maat gelijk',s3.zones[0].x>px0&&s3.zones[0].w===s2.zones[0].w&&s3.zones[0].d===s2.zones[0].d);
   // lijn tekenen
   await b.eval(`document.querySelector('.pe-canvas').focus()`);
   await b.click('[data-pe-tool="line"]');await sleep(150);
   const lx0=s3.l+s3.w*0.2,ly=s3.t+s3.h*0.8;
   await b.mouse('mouseMoved',lx0,ly,{buttons:0});await b.mouse('mousePressed',lx0,ly);await b.mouse('mouseMoved',lx0+120,ly+6,{buttons:1});await b.mouse('mouseMoved',lx0+300,ly+9,{buttons:1});await b.mouse('mouseReleased',lx0+300,ly+9);await sleep(300);
   const s4=await st();t.ok('lijn haaks getekend',s4.lines.length===1&&s4.lines[0].z1===s4.lines[0].z2&&Math.abs(s4.lines[0].x2-s4.lines[0].x1)>=1000,JSON.stringify(s4.lines));
   await b.shot(path.join(OUT,'schets-2d.png'));
   // maten in het zijpaneel aanpassen
   await b.click('[data-pe-tool="select"]');await sleep(100);
   await b.eval(`(()=>{const z=window.DouglasPlanEditorInstance._state().plan.zones[0];})()`);
   // undo (Ctrl+Z) zet de lijn terug
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))`);await sleep(250);
   const s5=await st();t.ok('Ctrl+Z haalt de lijn weg',s5.lines.length===0&&s5.zones.length===1);
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'y',ctrlKey:true,bubbles:true}))`);await sleep(250);
   t.ok('Ctrl+Y zet de lijn terug',(await st()).lines.length===1);
   t.ok('schets wordt bewaard als concept',await b.eval(`(()=>{const d=JSON.parse(localStorage.getItem('douglas-designer-plan-draft-v1')||'null');return !!d&&d.zones.length===1&&d.lines.length===1})()`));
   // voorbeeld laden en naar 3D
   await b.eval(`(()=>{const s=document.querySelector('[data-pe-preset]');s.value='kapschuur';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(400);
   const s6=await st();t.ok('voorbeeld kapschuur geladen (3 zones)',s6.zones.length===3);
   await b.shot(path.join(OUT,'schets-kapschuur.png'));
   await b.click('[data-pe="generate"]');await sleep(900);
   t.ok('schetsvenster dicht en nieuw project 9.000 × 6.500 mm',await b.eval(`!document.querySelector('.plan-editor.open')&&(()=>{const p=${activeProject};return p.width===9000&&p.depth===6500&&p.beams.length>=35&&p.panels.length>=6})()`));
   t.ok('berging heeft lessenaarsdak: daksparren, dakplaat en schuine wand in het project',await b.eval(`(()=>{const p=${activeProject};const k=q=>(p.panels||[]).filter(x=>x.kind===q).length;return k('rafter')>=8&&k('roof')===1&&(p.panels||[]).some(x=>x.kind==='cladding'&&x.slope)})()`));
   t.ok('materiaallijst bevat dakbeplating en daksparren',await b.eval(`(()=>{const p=${activeProject};const l=DouglasMaterials.build(p,DouglasModel).groups.flatMap(g=>g.lines).map(x=>x.id);return l.includes('dakbeplating')&&l.includes('daksparren')})()`));
   await b.shot(path.join(OUT,'plattegrond-3d.png'));
   for(const [lbl,f] of [['Zij','zij'],['Voor','voor']]){await b.eval(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='${lbl}').click()`);await sleep(500);await b.shot(path.join(OUT,'plattegrond-'+f+'.png'));}
   await b.eval(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='3D').click()`);await sleep(300);
   // heropenen toont de bewaarde schets; Esc sluit
   await b.click('#planTool');await sleep(400);t.ok('heropenen toont bewaarde schets',(await st()).zones.length===3);
   {const z=await b.eval(`(()=>{const s=window.DouglasPlanEditorInstance._state(),c=document.querySelector('.pe-canvas').getBoundingClientRect(),q=s.plan.zones.find(z=>z.name==='Berging');return {x:c.left+s.view.ox+(q.x+q.w/2)*s.view.scale,y:c.top+s.view.oz+(q.z+q.d/2)*s.view.scale,high:q.roof&&q.roof.high}})()`);
    t.ok('berging heeft in de schets een dak (hoog achter)',z.high==='n',JSON.stringify(z));
    await b.mouse('mouseMoved',z.x,z.y,{buttons:0});await b.mouse('mousePressed',z.x,z.y);await b.mouse('mouseReleased',z.x,z.y);await sleep(300);
    await b.eval(`(()=>{const s=document.querySelector('[data-pr="high"]');s.value='e';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(300);
    t.ok('dakkeuze in het zijpaneel past de zone aan',await b.eval(`window.DouglasPlanEditorInstance._state().plan.zones.find(z=>z.name==='Berging').roof.high==='e'`));
    await b.shot(path.join(OUT,'schets-dak.png'));
    await b.eval(`(()=>{const s=document.querySelector('[data-pr="high"]');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(300);
    t.ok('plat dak: dak weg uit de zone',await b.eval(`!window.DouglasPlanEditorInstance._state().plan.zones.find(z=>z.name==='Berging').roof`));}
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(300);
   await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(300);
   t.ok('Esc sluit het schetsvenster',await b.eval(`!document.querySelector('.plan-editor.open')`));
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}},

];

(async()=>{
  let failed=0,total=0;
  for(const sc of scenarios){
    if(ONLY&&!sc.name.includes(ONLY))continue;
    const b=await launch(),results=[];
    const t={ok(name,v,detail){const pass=v===true||(v!==false&&v!==undefined&&v!==null&&v!=='');results.push({name,pass,detail});}};
    try{await sc.run(b,t);}catch(e){results.push({name:'scenario liep vast',pass:false,detail:e.message});}
    finally{await b.close();}
    console.log('\n'+sc.name);
    for(const r of results){total++;if(!r.pass)failed++;console.log('  '+(r.pass?'PASS ':'FAIL ')+r.name+(!r.pass&&r.detail?' — '+r.detail:''));}
  }
  console.log(`\n${total-failed}/${total} PASS · screenshots: ${OUT}`);process.exit(failed?1:0);
})();
