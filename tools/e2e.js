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
