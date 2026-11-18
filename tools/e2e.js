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
   t.ok('geen JS-fouten',b.errors().length===0,b.errors().join(' | '));}}
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
