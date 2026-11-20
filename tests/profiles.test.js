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
test('moveBeams: vrije en framebalken samen verplaatsen, onbekende ids negeren',()=>{
 const p=M.demoProject();p.beams=[{id:'a',name:'A',axis:'x',x:0,y:0,z:0,length:500},{id:'b',name:'B',axis:'z',x:10,y:20,z:30,length:300}];
 const fr=M.framePieces(p)[0],before={x:fr.x,y:fr.y,z:fr.z};
 const n=M.moveBeams(p,[{type:'beam',id:'a'},{type:'beam',id:'b'},{type:'frame',id:fr.id},{type:'beam',id:'nope'}],{x:100,y:-5,z:12.4});
 assert.equal(n,3);assert.deepEqual([p.beams[0].x,p.beams[0].y,p.beams[0].z],[100,-5,12]);assert.deepEqual([p.beams[1].x,p.beams[1].z],[110,42]);
 const after=M.framePieces(p).find(b=>b.id===fr.id);assert.deepEqual([after.x,after.y,after.z],[before.x+100,before.y-5,before.z+12]);
 assert.equal(M.moveBeams(p,[],{x:1}),0);
});
test('foto-achtergrond: normalisatie en schaal met twee punten',()=>{
 const jpg='data:image/jpeg;base64,/9j/4AAQ';
 assert.equal(M.normalizeBackdrop(null),null);assert.equal(M.normalizeBackdrop({photo:'data:image/png;base64,AAAA'}),null);
 assert.equal(M.normalizeBackdrop({photo:'x'.repeat(10)}),null);
 const bd=M.normalizeBackdrop({photo:jpg,opacity:5,widthMm:10,x:'q',view:'bad'});
 assert.deepEqual([bd.opacity,bd.widthMm,bd.x,bd.view,bd.on],[1,200,0,'front',true]);
 const p=M.normalizeProject({...M.freeProject(),backdrop:{photo:jpg}});assert.ok(p.backdrop&&p.backdrop.photo===jpg);
 assert.equal(M.normalizeProject({...M.freeProject(),backdrop:{photo:'<script>'}}).backdrop,undefined);
 const s=M.backdropScale({photo:jpg,widthMm:1000,x:0,y:0,opacity:.5,on:true,view:'front'},{x:100,y:100},{x:300,y:100},['x','y'],400);
 assert.equal(s.widthMm,2000);assert.equal(s.x,-100);assert.equal(s.y,-100);
 assert.equal(M.backdropScale(bd,{x:1},{x:1},['x','y'],100),null);assert.equal(M.backdropScale(bd,{x:0},{x:50},['x','y'],0),null);
});
test('scan-instellingen: normalisatie en schaal om punt a',()=>{
 assert.equal(M.normalizeScan(null),null);assert.equal(M.normalizeScan({name:'  '}),null);
 const s=M.normalizeScan({name:'Tuin<b>.glb',scale:'x',opacity:9,rotY:1000,x:5.4});
 assert.deepEqual([s.name,s.scale,s.opacity,s.rotY,s.x,s.on,s.zUp],['Tuinb.glb',1,1,360,5,true,false]);
 const p=M.normalizeProject({...M.freeProject(),scan:{name:'a.glb',scale:1000}});assert.equal(p.scan.scale,1000);
 assert.equal(M.normalizeProject({...M.freeProject(),scan:{name:''}}).scan,undefined);
 const sc=M.scanScale({name:'a',on:true,opacity:1,scale:1000,rotY:0,zUp:false,x:100,y:0,z:50},{x:100,y:0},{x:300,y:0},['x','y'],400);
 assert.equal(sc.scale,2000);assert.equal(sc.x,100);assert.equal(sc.y,0);assert.equal(sc.z,50);
 const sc2=M.scanScale({name:'a',on:true,opacity:1,scale:1,rotY:0,zUp:false,x:0,y:0,z:0},{x:10,y:10},{x:20,y:10},['x','y'],5);
 assert.equal(sc2.scale,.5);assert.equal(sc2.x,5);assert.equal(sc2.y,5);
 assert.equal(M.scanScale(s,{x:1},{x:1},['x','y'],10),null);assert.equal(M.scanScale(s,{x:0},{x:9},['x','y'],0),null);
});
test('plattegrond-start: zones geven een conflictvrije constructie met juiste buitenmaten',()=>{
 const zit={name:'Zit',kind:'open',x:0,z:0,w:4000,d:3300,h:2700},ber={name:'Berging',kind:'closed',x:4000,z:0,w:5000,d:2450,h:2300},perg={name:'Pergola',kind:'pergola',x:0,z:3300,w:4000,d:3200,h:2500};
 const r=M.planFrame({zones:[zit,ber,perg]});
 assert.ok(r.beams.length>=35&&r.beams.length<=60,String(r.beams.length));assert.equal(r.truncated,0);
 assert.deepEqual(r.bounds,{width:9000,depth:6500,height:2700});
 const p=M.normalizeProject({...M.freeProject(),width:9000,depth:6500,height:2700,plan:{zones:[zit,ber,perg]},beams:r.beams});
 assert.equal(p.width,9000);assert.equal(p.depth,6500);assert.equal(p.height,2700);assert.equal(p.beams.length,r.beams.length);
 const c=M.conflicts(p);assert.equal(c.overlaps.length,0,c.overlaps.map(([a,b])=>a.name+'/'+b.name).join());assert.equal(c.unsupported.length,0);
 // buitencontour klopt: kleinste/grootste coördinaat van de staanders
 const posts=r.beams.filter(b=>b.axis==='y'),minX=Math.min(...posts.map(b=>b.x)),maxX=Math.max(...posts.map(b=>b.x+100));
 assert.equal(minX,0);assert.equal(maxX,9000);
 assert.ok(r.beams.every(b=>b.length>=50&&b.length<=6500));
 // gedeelde wand tussen zit en berging: geen dubbele staanders op x=4000 hartlijn
 const mid=posts.filter(b=>b.x===3950);assert.equal(new Set(mid.map(b=>b.z)).size,mid.length);
 // houthok-variant (tegels) blijft conflictvrij
 const hh=M.planFrame({zones:[zit,{...ber,w:3500},{name:'Houthok',kind:'closed',x:7500,z:0,w:1500,d:1000,h:2300},{name:'Voor',kind:'closed',x:7500,z:1000,w:1500,d:1450,h:2300},perg]});
 const p2=M.normalizeProject({...M.freeProject(),width:9000,depth:6500,height:2700,plan:{zones:[zit,perg]},beams:hh.beams});
 assert.equal(M.conflicts(p2).overlaps.length,0);
});
test('plattegrond: ongeldige invoer en grenzen',()=>{
 assert.equal(M.normalizePlan(null),null);assert.equal(M.normalizePlan({zones:[]}),null);assert.equal(M.normalizePlan({zones:'x'}),null);
 const n=M.normalizePlan({zones:[{name:'<b>X</b>',kind:'bad',x:-5,z:'q',w:1,d:99999,h:10}]}).zones[0];
 assert.deepEqual([n.name,n.kind,n.x,n.z,n.w,n.d,n.h],['bX/b','open',0,0,600,12000,1200]);
 assert.equal(M.normalizePlan({zones:new Array(20).fill({})}).zones.length,8);
 assert.equal(M.normalizeProject({...M.freeProject(),width:9000}).width,7000,'zonder plan blijven de oude grenzen');
 const many={zones:Array.from({length:8},(_,i)=>({name:'Z'+i,kind:'closed',x:i*2400,z:0,w:2400,d:4800,h:2400}))};
 const r=M.planFrame(many);assert.equal(r.beams.length,100);assert.ok(r.truncated>0);
 assert.deepEqual(M.planFrame(null).beams,[]);
});
test('wanden, deur en bekleding: panelen, kozijn, geen conflicten, materiaallijst',()=>{
 const Mat=require('../materials.js');
 const zones=[{name:'Zit',kind:'open',x:0,z:0,w:4000,d:3300,h:2700,walls:'n'},{name:'Berging',kind:'closed',x:4000,z:0,w:5000,d:2450,h:2300,door:{edge:'s',offset:150,width:900,height:2050}},{name:'Pergola',kind:'pergola',x:0,z:3300,w:4000,d:3200,h:2500}];
 const r=M.planFrame({zones});
 const door=r.panels.filter(q=>q.kind==='door'),clad=r.panels.filter(q=>q.kind==='cladding');
 assert.equal(door.length,1);assert.equal(door[0].w,900);assert.equal(door[0].h,2030);
 assert.ok(clad.length>=6);assert.ok(r.panels.every(q=>q.w>=1&&q.h>=1&&q.d>=1));
 // voorwand berging: opening laat deur vrij, geen paneel overlapt het deurvlak
 const front=clad.filter(q=>q.d===20&&q.z===4050);
 assert.ok(front.every(q=>q.x+q.w<=door[0].x-100+1||q.x>=door[0].x+door[0].w+100-1||q.y>=2050),'bekleding laat de opening vrij');
 assert.ok(r.beams.some(b=>/Deurstijl/.test(b.name))&&r.beams.some(b=>/Bovendorpel/.test(b.name)));
 // buitencontour: geen paneel steekt buiten 9000 × 6500
 assert.ok(r.panels.every(q=>q.x>=0&&q.x+q.w<=9000&&q.z>=0&&q.z+q.d<=6500));
 // geen twee bekledingspanelen vlak op elkaar (z-fighting)
 for(let i=0;i<clad.length;i++)for(let j=i+1;j<clad.length;j++){const a=clad[i],b=clad[j];
  const ov=(k,l)=>Math.min(a[k]+a[l],b[k]+b[l])-Math.max(a[k],b[k]);assert.ok(!(ov('x','w')>1&&ov('y','h')>1&&ov('z','d')>1),a.name+' x '+b.name);}
 const p=M.normalizeProject({...M.freeProject(),width:9000,depth:6500,height:2700,plan:{zones},beams:r.beams,panels:r.panels});
 assert.equal(p.panels.length,r.panels.length);
 const c=M.conflicts(p);assert.equal(c.overlaps.length,0,c.overlaps.map(([a,b])=>a.name+'/'+b.name).join());assert.equal(c.unsupported.length,0,c.unsupported.map(b=>b.name).join());
 const g=Mat.build(p,M).groups.flatMap(x=>x.lines),bek=g.find(l=>l.id==='bekleding'),dr=g.find(l=>l.id==='deuren');
 assert.ok(bek&&bek.qty>10&&bek.qty<80,JSON.stringify(bek));assert.equal(dr.qty,1);
 // panelen normaliseren
 assert.deepEqual(M.normalizePanels('x'),[]);const q=M.normalizePanels([{name:'<i>',kind:'x',w:-1,h:99999,d:'a',color:'red'}])[0];
 assert.deepEqual([q.name,q.kind,q.w,q.h,q.d,q.color],['i','cladding',1,10000,20,'#1d2124']);
 assert.equal(M.normalizePanels(new Array(200).fill({})).length,160);
 assert.equal(M.normalizePlan({zones:[{kind:'closed'}]}).zones[0].walls,'nesw');assert.equal(M.normalizePlan({zones:[{kind:'open'}]}).zones[0].walls,'');
 assert.equal(M.normalizePlan({zones:[{door:{edge:'q'}}]}).zones[0].door,null);
});
test('plan met lijnen: normalisatie haaks, minimale lengte, unieke ids en wand in 3D',()=>{
 const n=M.normalizePlan({zones:[{id:'a'},{id:'a'}],lines:[{x1:0,z1:0,x2:3000,z2:200},{x1:0,z1:0,x2:100,z2:100},{x1:10,z1:10,x2:10,z2:2000,id:'a'}]});
 assert.equal(n.zones.length,2);assert.notEqual(n.zones[0].id,n.zones[1].id);
 assert.equal(n.lines.length,2);assert.deepEqual([n.lines[0].z1,n.lines[0].z2],[0,0]);assert.deepEqual([n.lines[1].x1,n.lines[1].x2],[10,10]);
 const ids=[...n.zones,...n.lines].map(q=>q.id);assert.equal(new Set(ids).size,ids.length);
 assert.equal(M.normalizePlan({zones:[],lines:[]}),null);
 const r=M.planFrame({zones:[],lines:[{x1:0,z1:1000,x2:5000,z2:1000},{x1:5000,z1:1000,x2:5000,z2:4000}]});
 assert.ok(r.beams.filter(b=>b.axis==='y').length>=5);assert.equal(r.panels.length,2);
 const p=M.normalizeProject({...M.freeProject(),width:r.bounds.width,depth:r.bounds.depth,height:r.bounds.height,beams:r.beams,panels:r.panels});
 assert.equal(M.conflicts(p).overlaps.length,0);assert.equal(M.conflicts(p).unsupported.length,0);
});

test('lessenaarsdak: normalisatie, schuine sparren/dakplaat, wand met schuine bovenzijde, materiaallijst',()=>{
 const raw={zones:[{id:'a',name:'Berging',kind:'closed',x:0,z:0,w:2500,d:2000,h:2550,walls:'nesw',door:{edge:'s',offset:300,width:900,height:2050},roof:{high:'w',low:2300}}]};
 const pl=M.normalizePlan(raw);assert.deepEqual(pl.zones[0].roof,{kind:'lessenaar',high:'w',low:2300});
 // ongeldig dak valt weg: pergola, onbekende zijde, lage rand niet lager dan hoge rand
 assert.equal(M.normalizePlan({zones:[{kind:'pergola',roof:{high:'w',low:2000}}]}).zones[0].roof,undefined);
 assert.equal(M.normalizePlan({zones:[{roof:{high:'q',low:2000}}]}).zones[0].roof,undefined);
 assert.ok(M.normalizePlan({zones:[{h:2500,roof:{high:'n',low:9000}}]}).zones[0].roof.low<=2450);
 const r=M.planFrame(pl);
 const rafters=r.panels.filter(q=>q.kind==='rafter'),sheet=r.panels.filter(q=>q.kind==='roof');
 assert.ok(rafters.length>=4&&sheet.length===1);
 for(const q of rafters){assert.equal(q.slope.axis,'x');assert.ok(q.y>q.slope.y2,'hoog links, laag rechts');assert.equal(q.h,150);assert.equal(q.d,50);}
 assert.equal(sheet[0].y-rafters[0].y,150);
 // wand langs de helling heeft schuine bovenzijde en eindigt op de sparhoogte
 const slopedWall=r.panels.find(q=>q.kind==='cladding'&&q.slope);assert.ok(slopedWall);
 assert.ok(slopedWall.y+slopedWall.h>slopedWall.slope.y2+slopedWall.slope.h2);
 // staanders aan de hoge rand zijn langer dan aan de lage rand
 const posts=r.beams.filter(b=>b.axis==='y'),hi=Math.max(...posts.map(b=>b.length)),lo=Math.min(...posts.map(b=>b.length));assert.ok(hi>lo);
 assert.equal(r.bounds.height,2550+150+18);
 // panelen met helling blijven na normaliseren behouden; onjuiste as wordt genegeerd
 const n=M.normalizePanels([{kind:'rafter',w:1000,h:150,d:50,slope:{axis:'x',y2:2000,h2:150}},{kind:'rafter',slope:{axis:'q'}}]);
 assert.deepEqual(n[0].slope,{axis:'x',y2:2000,h2:150});assert.equal(n[1].slope,undefined);
 // materiaallijst: dakplaat in m², daksparren op schuine lengte uit stokken
 const p=M.normalizeProject({...M.freeProject(),plan:raw,stockLength:6000,width:r.bounds.width,depth:r.bounds.depth,height:r.bounds.height,beams:r.beams,panels:r.panels});
 const list=X.build(p,M),all=list.groups.flatMap(g=>g.lines),plate=all.find(l=>l.id==='dakbeplating'),spar=all.find(l=>l.id==='daksparren');
 assert.ok(plate&&plate.qty>5&&plate.qty<7,JSON.stringify(plate));assert.ok(spar&&spar.qty>=2&&spar.qty<=4,JSON.stringify(spar));
 assert.equal(M.conflicts(p).overlaps.length,0);assert.equal(M.conflicts(p).unsupported.length,0);
 // plat dak blijft ongewijzigd: geen sparren
 assert.equal(M.planFrame({zones:[{...raw.zones[0],roof:undefined}]}).panels.filter(q=>q.kind==='rafter').length,0);
 // spiegeling voor/achter: hoge zijde 'n' in de plattegrond (achter) is hoog aan z=achterzijde in 3D
 const rn=M.planFrame({zones:[{id:'a',kind:'open',x:0,z:0,w:2000,d:3000,h:2600,roof:{high:'n',low:2300}}]});
 const rf=rn.panels.filter(q=>q.kind==='rafter')[0];assert.equal(rf.slope.axis,'z');assert.ok(rf.y<rf.slope.y2,'z=0 is voorzijde (laag), achter hoog');
});
