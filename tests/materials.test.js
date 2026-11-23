const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../model.js');const X=require('../materials.js');
const lines=(l)=>l.groups.flatMap(g=>g.lines);const find=(l,id)=>lines(l).find(x=>x.id===id);

test('demo project: balken komen uit het zaagplan en prijs uit de zaaginstellingen',()=>{
 const p=M.demoProject(),l=X.build(p,M),plan=M.boardPlan(p),b=find(l,'balken-50x100');
 assert.equal(b.qty,plan.boards.length);assert.equal(b.price,p.beamPrice);assert.equal(b.priceEditable,false);
 assert.equal(b.total,plan.boards.length*p.beamPrice);
});
test('verbindingen worden geteld uit contactpunten en schalen mee met het ontwerp',()=>{
 const p=M.demoProject(),n=X.connections(p,M);assert.ok(n>=40&&n<=60,'verwacht ±52, kreeg '+n);
 const wide=M.demoProject();wide.modules.push({id:'m4',kind:'open',width:400,name:'Open vak'});wide.width=M.expectedWidth(wide);
 assert.ok(X.connections(wide,M)>n);
 const free=M.freeProject();assert.equal(X.connections(free,M),0);
});
test('losse balken: een staander op een regel telt als één verbinding',()=>{
 const p=M.freeProject();
 p.beams=[{id:'a',name:'regel',axis:'x',x:0,y:500,z:0,length:1000},{id:'b',name:'staander',axis:'y',x:0,y:0,z:0,length:500}];
 assert.equal(X.connections(p,M),1);
 p.beams[1].x=1500; // niet meer in contact
 assert.equal(X.connections(p,M),0);
});
test('schroeven: verbindingen × schroeven per verbinding + reserve, in dozen',()=>{
 const p=M.demoProject();p.materials=M.normalizeMaterials({screwsPerJoint:3,screwBox:100,wastePct:0});
 const l=X.build(p,M);assert.equal(l.screws,l.joints*3);assert.equal(find(l,'schroeven').qty,Math.ceil(l.joints*3/100));
});
test('werkblad en fronten alleen als ze in het ontwerp zitten',()=>{
 const p=M.demoProject();let l=X.build(p,M);
 assert.ok(find(l,'werkblad'));assert.ok(find(l,'fronten'));assert.ok(find(l,'koelkast'));assert.ok(find(l,'kamado'));
 assert.equal(find(l,'scharnieren'),undefined,'demo heeft geen deurenkast');
 p.countertop=false;p.modules.push({id:'d',kind:'doors',width:500,name:'Deurenkast'});p.width=M.expectedWidth(p);
 l=X.build(p,M);assert.equal(find(l,'werkblad'),undefined);assert.equal(find(l,'scharnieren').qty,p.materials.hingesPerDoorModule);
});
test('totaal telt alleen regels met ingevulde prijs; geen verzonnen prijzen',()=>{
 const p=M.demoProject();let l=X.build(p,M);
 assert.equal(l.total,find(l,'balken-50x100').total);assert.equal(find(l,'schroeven').price,0);
 p.materials=X.applyInput(p.materials,'price:schroeven','12,50',M);
 l=X.build(p,M);assert.equal(find(l,'schroeven').price,12.5);assert.equal(l.total,find(l,'balken-50x100').total+find(l,'schroeven').qty*12.5);
 p.materials=X.applyInput(p.materials,'price:schroeven','',M);assert.equal(X.build(p,M).total,find(l,'balken-50x100').total);
});
test('applyInput en normalizeMaterials begrenzen ongeldige invoer',()=>{
 let m=M.normalizeMaterials({screwsPerJoint:999,wastePct:-5,prices:{'ok-1':'3',bad_id:5,x:'abc'},junk:1});
 assert.equal(m.screwsPerJoint,20);assert.equal(m.wastePct,0);assert.deepEqual(m.prices,{'ok-1':3});assert.equal(m.junk,undefined);
 m=X.applyInput(m,'setting:oilCoats','3',M);assert.equal(m.oilCoats,3);
 m=X.applyInput(m,'setting:prices','1',M);assert.deepEqual(m.prices,{'ok-1':3});
 m=X.applyInput(m,'setting:screwBox','abc',M);assert.equal(m.screwBox,200);
 assert.deepEqual(M.normalizeMaterials(null),M.defaultMaterials());
});
test('oud projectbestand zonder materials laadt met standaardwaarden',()=>{
 const raw=M.demoProject();delete raw.materials;const p=M.normalizeProject(raw);assert.deepEqual(p.materials,M.defaultMaterials());
 assert.equal(M.normalizeProject(JSON.parse(JSON.stringify(M.normalizeProject({...raw,materials:{screwsPerJoint:4,prices:{olie:9.5}}})))).materials.prices.olie,9.5);
});
test('CSV en tekstexport gebruiken Nederlandse notatie en bevatten alle regels',()=>{
 const p=M.demoProject();p.materials=X.applyInput(p.materials,'price:olie','9,5',M);const l=X.build(p,M);
 const csv=X.toCSV(l),txt=X.toText(l,'Test');
 assert.ok(csv.startsWith('﻿"Groep";'));assert.equal(csv.split('\r\n').length,lines(l).length+2);assert.match(csv,/;9,50;/);
 assert.match(txt,/Materiaallijst — Test/);assert.match(txt,/Totaal: € /);
 for(const x of lines(l))assert.ok(txt.includes(x.label));
});
test('formules in CSV-cellen: aanhalingstekens worden ontsnapt',()=>{
 const l={groups:[{title:'G',lines:[{label:'a "b"',qty:1,unit:'st',price:0,total:0,detail:''}]}],total:0};
 assert.match(X.toCSV(l),/"a ""b"""/);
});

test('overkapping: daksparren staan exact één keer in zaagplan, materiaallijst en onderdelenexport',()=>{
 require('../startontwerpen.js');
 const D=require('../documents.js');
 const p=M.normalizeProject(globalThis.DouglasStartontwerpen.find(p=>p.panels?.some(q=>q.kind==='rafter')));
 p.materials.prices={'balk-50x150':11,'balk-100x100':20,daksparren:32};
 const plan=M.boardPlan(p),list=X.build(p,M),rows=D.partsList(p,M);
 assert.equal(plan.pieces,14);
 assert.equal(plan.boards.length,12);
 assert.equal(plan.impossible.length,0);
 assert.equal(find(list,'daksparren').qty,8);
 assert.equal(find(list,'balk-50x150').qty,2);
 assert.equal(plan.estimatedPrice,318);
 assert.equal(list.total,318);
 const cuts=plan.boards.flatMap(b=>b.cuts);
 assert.deepEqual(cuts.map(c=>c.id).sort(),rows.map(r=>r.id).sort());
 assert.equal(rows.filter(r=>r.group==='Daksparren' && r.length===3054).length,8);
 assert.match(D.partsCSV(rows),/schuine zaagmaat incl. 50 mm/);
 p.stockLength=3000;
 const short=M.boardPlan(p),incomplete=X.build(p,M);
 assert.equal(short.impossible.filter(c=>c.group==='Daksparren').length,8);
 assert.equal(find(incomplete,'daksparren'),undefined);
 assert.ok(short.boards.every(b=>b.used<=p.stockLength));
 for(const output of [X.toText(incomplete,p.name),X.toCSV(incomplete),D.documentHTML(p,M,X)])
   assert.match(output,/Zaagplan onvolledig/);
});

test('bewerkte dakspar houdt eigen profiel in zaagplan, boodschappenlijst en bouwdocument',()=>{
 require('../startontwerpen');
 const D=require('../documents');
 const p=M.normalizeProject(globalThis.DouglasStartontwerpen.find(p=>p.panels?.some(q=>q.kind==='rafter')));
 const i=p.panels.findIndex(q=>q.kind==='rafter');
 const original=p.panels[i];
 p.panels[i]=M.editPanel(M.editPanel(original,'h',200),'w',70);
 p.materials.prices={daksparren:32,'daksparren-70x200':48};
 const list=X.build(p,M),plan=M.boardPlan(p);
 assert.equal(find(list,'daksparren').qty,7);
 assert.equal(find(list,'daksparren-70x200').qty,1);
 assert.equal(find(list,'daksparren-70x200').total,48);
 assert.equal(plan.estimatedPrice,7*32+48);
 assert.equal(D.partsList(p,M).find(r=>r.id===original.id).profile,'70x200');
 assert.match(D.documentHTML(p,M,X),/70 × 200/);
 const sideways={...p.panels[i],d:70,w:3000,slope:{...p.panels[i].slope,axis:'x'}};
 assert.equal(M.rafterCuts({panels:[sideways]})[0].profile,'70x200');
});

test('hellend paneel verplaatsen behoudt helling, ook aan de modelgrens',()=>{
 const [roof]=M.normalizePanels([{kind:'roof',y:2350,h:18,d:3000,w:4000,slope:{axis:'z',y2:2500,h2:18}}]);
 const moved=M.editPanel(roof,'y',2450);
 assert.equal(moved.slope.y2,2600);
 const capped=M.editPanel(roof,'y',10000);
 assert.equal(capped.slope.y2,10000);
 assert.equal(capped.y,9850);
 const thicker=M.editPanel(roof,'h',24);
 assert.equal(thicker.slope.h2,24);
 assert.equal(thicker.d,3000);
 assert.equal(roof.slope.y2,2500);
});
