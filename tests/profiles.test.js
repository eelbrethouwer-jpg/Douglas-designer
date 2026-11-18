const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../model.js');const X=require('../materials.js');
const free=()=>{const p=M.freeProject();p.beams=[];return p;};

test('standaardprofiel is 50x100 en beamBox volgt de oriëntatieregels',()=>{
 assert.equal(M.DEFAULT_PROFILE,'50x100');
 const x=M.beamBox({axis:'x',x:0,y:0,z:0,length:1000}),y=M.beamBox({axis:'y',x:0,y:0,z:0,length:1000}),z=M.beamBox({axis:'z',x:0,y:0,z:0,length:1000});
 assert.deepEqual([x.w,x.h,x.d],[1000,100,50]);assert.deepEqual([y.w,y.h,y.d],[50,1000,100]);assert.deepEqual([z.w,z.h,z.d],[50,100,1000]);
});
test('ander profiel verandert de doorsnede; onbekend profiel valt terug op standaard',()=>{
 const b=M.beamBox({axis:'y',x:0,y:0,z:0,length:800,profile:'100x100'});assert.deepEqual([b.w,b.h,b.d],[100,800,100]);
 const p=M.normalizeProject({...M.freeProject(),beams:[{id:'a',axis:'x',length:500,profile:'99x99'},{id:'b',axis:'x',length:500,profile:'70x70'}]});
 assert.equal(p.beams[0].profile,'50x100');assert.equal(p.beams[1].profile,'70x70');
});
test('zaagplan mengt nooit profielen op één handelsbalk',()=>{
 const p=free();p.beams=[
  {id:'a',name:'A',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x100'},{id:'b',name:'B',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x50'},
  {id:'c',name:'C',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x100'}];
 const plan=M.boardPlan(p);
 assert.equal(plan.boards.length,2);for(const b of plan.boards)assert.ok(b.cuts.every(c=>c.profile===b.profile));
 assert.deepEqual(plan.byProfile.map(x=>[x.profile,x.count]),[['50x50',1],['50x100',1]]);
 assert.equal(plan.pieces,3);
});
test('prijs: standaardprofiel uit beamPrice, andere profielen alleen met eigen prijs',()=>{
 const p=free();p.beams=[{id:'a',name:'A',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x100'},{id:'b',name:'B',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x50'}];
 let plan=M.boardPlan(p);assert.equal(plan.estimatedPrice,p.beamPrice);assert.equal(plan.byProfile.find(x=>x.profile==='50x50').priceKnown,false);
 p.materials=M.normalizeMaterials({prices:{'balk-50x50':9}});plan=M.boardPlan(p);assert.equal(plan.estimatedPrice,p.beamPrice+9);
});
test('frame-edit kan het profiel van een framebalk wijzigen en blijft bewaard na normaliseren',()=>{
 const p=M.demoProject(),id=M.framePieces(p)[0].id;assert.equal(M.editFrameBeam(p,id,{profile:'70x70'}),true);
 assert.equal(M.framePieces(p)[0].profile,'70x70');
 const q=M.normalizeProject(JSON.parse(JSON.stringify(p)));assert.equal(M.framePieces(q)[0].profile,'70x70');
 M.editFrameBeam(p,id,{profile:'nope'});assert.equal(M.framePieces(p)[0].profile,'70x70');
});
test('materiaallijst: één balkregel per profiel',()=>{
 const p=free();p.beams=[{id:'a',name:'A',axis:'x',x:0,y:0,z:0,length:1000,profile:'50x100'},{id:'b',name:'B',axis:'x',x:0,y:0,z:0,length:1000,profile:'70x70'}];
 const l=X.build(p,M),ids=l.groups[0].lines.map(x=>x.id);assert.deepEqual(ids,['balken-50x100','balk-70x70']);
 assert.equal(l.groups[0].lines[0].priceEditable,false);assert.equal(l.groups[0].lines[1].priceEditable,true);
});
test('conflictcontrole: demo heeft geen conflicten; overlap en zwevende balk worden gemeld',()=>{
 const d=M.demoProject();assert.equal(M.conflicts(d).overlaps.length,0);assert.equal(M.conflicts(d).unsupported.length,0);
 assert.ok(!M.warnings(d).some(w=>/overlappen|raken geen/.test(w)));
 const p=free();p.beams=[{id:'a',name:'Ligger',axis:'x',x:0,y:500,z:0,length:1000},{id:'b',name:'Staander',axis:'y',x:300,y:450,z:0,length:300}];
 const w=M.warnings(p);assert.ok(w.some(x=>/overlappen/.test(x)));assert.ok(w.some(x=>/raken geen/.test(x)));
 // een staander op de grond die de ligger raakt is wel gesteund
 p.beams=[{id:'a',name:'Ligger',axis:'x',x:0,y:500,z:0,length:1000},{id:'b',name:'Staander',axis:'y',x:300,y:0,z:0,length:500}];
 assert.equal(M.conflicts(p).unsupported.length,0);assert.equal(M.conflicts(p).overlaps.length,0);
});
test('werkblad is parametrisch: standaard gelijk aan vroegere vaste maten, aanpasbaar en genormaliseerd',()=>{
 const p=M.demoProject(),b=M.countertopBox(p);
 assert.deepEqual([b.x,b.y,b.z,b.w,b.h,b.d],[-8,p.height-24,-14,p.width+16,24,p.depth+28]);
 p.countertopSpec=M.normalizeCountertop({thickness:40,overhangSide:20,overhangFront:50,overhangBack:5});
 const c=M.countertopBox(p);assert.deepEqual([c.x,c.y,c.z,c.w,c.h,c.d],[-20,p.height-40,-50,p.width+40,40,p.depth+55]);
 assert.deepEqual(M.normalizeCountertop({thickness:999,overhangSide:-5}),{thickness:80,overhangSide:0,overhangFront:14,overhangBack:14});
 const l=X.build(p,M);assert.match(l.groups.flatMap(g=>g.lines).find(x=>x.id==='werkblad').label,/40 mm dik/);
 const old=M.demoProject();delete old.countertopSpec;assert.deepEqual(M.normalizeProject(old).countertopSpec,M.defaultCountertop());
});
test('apparaatmaten: waarschuwing alleen als eigen maten niet passen; 0 = onbekend',()=>{
 const p=M.demoProject(),fridge=p.modules.find(m=>m.kind==='fridge');
 assert.ok(!M.warnings(p).some(w=>/past niet/.test(w)));
 fridge.appliance=M.normalizeAppliance({w:600,d:650,h:600});assert.ok(!M.warnings(p).some(w=>/past niet/.test(w)));
 fridge.appliance=M.normalizeAppliance({w:700,d:900,h:700});
 const w=M.warnings(p).find(x=>/past niet/.test(x));assert.ok(w);assert.match(w,/breedte 700/);assert.match(w,/diepte 900/);assert.match(w,/hoogte 700/);
 assert.deepEqual(M.normalizeProject(JSON.parse(JSON.stringify(p))).modules.find(m=>m.kind==='fridge').appliance,{w:700,d:900,h:700});
 assert.deepEqual(M.normalizeAppliance({w:-5,d:'x',h:99999}),{w:0,d:0,h:2500});
});
test('reeks kopiëren: aantal, afstand, richting, vrije balken en begrenzing',()=>{
 const p=M.freeProject();p.beams=[{id:'a',name:'Rachel',axis:'x',x:100,y:200,z:0,length:900,profile:'28x70'}];
 const r=M.arrayBeams(p,p.beams[0],'z',3,400);
 assert.equal(r.ok,true);assert.equal(r.beams.length,3);assert.deepEqual(r.beams.map(b=>b.z),[400,800,1200]);
 assert.ok(r.beams.every(b=>b.x===100&&b.y===200&&b.length===900&&b.axis==='x'&&b.profile==='28x70'));
 assert.equal(new Set(r.beams.map(b=>b.id)).size,3);assert.ok(!r.beams.some(b=>b.id==='a'));
 assert.deepEqual(M.arrayBeams(p,p.beams[0],'y',2,-50).beams.map(b=>b.y),[150,100]);
 for(const bad of [['q',3,400],['z',0,400],['z',51,400],['z',3,0],['z',3,20000],['z','x',400]])assert.equal(M.arrayBeams(p,p.beams[0],...bad).ok,false,JSON.stringify(bad));
 p.beams=Array.from({length:98},(_,i)=>({id:'b'+i,name:'x',axis:'x',x:0,y:0,z:0,length:100}));
 const lim=M.arrayBeams(p,p.beams[0],'z',5,50);assert.equal(lim.beams.length,2);assert.equal(lim.skipped,3);
 const fp=M.demoProject(),post=M.framePieces(fp)[0],fr=M.arrayBeams(fp,post,'x',1,100);assert.equal(fr.beams.length,1);assert.equal(fr.beams[0].group,undefined,'kopie van framebalk is een vrije balk');
});
