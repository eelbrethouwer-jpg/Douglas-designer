const test=require('node:test');
const assert=require('node:assert/strict');
const PE=require('../plan-editor.js');

test('snapValue: magneet gaat voor raster, binnen tolerantie',()=>{
 assert.deepEqual(PE.snapValue(1010,[1000,4000],100,30),{v:1000,magnet:true});
 assert.deepEqual(PE.snapValue(1260,[1000],100,30),{v:1300,magnet:false});
 assert.deepEqual(PE.snapValue(1234,[],0,30),{v:1234,magnet:false});
 const e=PE.rectEdges({zones:[{x:0,z:0,w:4000,d:3300}],lines:[{x1:4000,z1:0,x2:4000,z2:2450}]});
 assert.deepEqual(e.xs.sort((a,b)=>a-b),[0,4000]);assert.deepEqual(e.zs.sort((a,b)=>a-b),[0,2450,3300]);
 const s=PE.snapPoint({x:3985,z:2440},e,100,30,true);assert.deepEqual([s.x,s.z,s.magnetX,s.magnetZ],[4000,2450,true,true]);
 const g=PE.snapPoint({x:3985,z:2440},e,100,30,false);assert.deepEqual([g.x,g.z],[4000,2400]);
});
test('blockFromDrag en lineFromDrag: elke sleeprichting, minimale maat, altijd haaks',()=>{
 assert.deepEqual(PE.blockFromDrag({x:5000,z:3000},{x:1000,z:500}),{x:1000,z:500,w:4000,d:2500});
 assert.equal(PE.blockFromDrag({x:0,z:0},{x:200,z:5000}),null);
 assert.deepEqual(PE.lineFromDrag({x:100,z:200},{x:3100,z:350}),{x1:100,z1:200,x2:3100,z2:200});
 assert.deepEqual(PE.lineFromDrag({x:100,z:200},{x:150,z:2200}),{x1:100,z1:200,x2:100,z2:2200});
 assert.equal(PE.lineFromDrag({x:0,z:0},{x:100,z:100}),null);
});
test('resizeRect: elke greep houdt de tegenoverliggende zijde vast en respecteert de minimale maat',()=>{
 const r={x:1000,z:1000,w:4000,d:3000};
 assert.deepEqual(PE.resizeRect(r,'e',{x:7000,z:0}),{x:1000,z:1000,w:6000,d:3000});
 assert.deepEqual(PE.resizeRect(r,'w',{x:0,z:0}),{x:0,z:1000,w:5000,d:3000});
 assert.deepEqual(PE.resizeRect(r,'se',{x:6000,z:6000}),{x:1000,z:1000,w:5000,d:5000});
 assert.deepEqual(PE.resizeRect(r,'nw',{x:500,z:200}),{x:500,z:200,w:4500,d:3800});
 assert.deepEqual(PE.resizeRect(r,'n',{x:0,z:3900}),{x:1000,z:3700,w:4000,d:300},'niet kleiner dan 300 mm');
 assert.equal(PE.resizeRect(r,'e',{x:1100,z:0}).w,300);
});
test('hitTest: grepen, lijnen en blokken (kleinste blok bij overlap)',()=>{
 const plan={zones:[{id:'a',x:0,z:0,w:4000,d:3000},{id:'b',x:1000,z:1000,w:1000,d:1000}],lines:[{id:'l',x1:5000,z1:0,x2:5000,z2:3000}]};
 const view={scale:.1,ox:50,oz:50}; // 1 px = 10 mm
 assert.deepEqual(PE.hitTest(plan,view,50+150,50+150,null),{kind:'item',type:'zone',id:'b'});
 assert.deepEqual(PE.hitTest(plan,view,50+50,50+50,null),{kind:'item',type:'zone',id:'a'});
 assert.deepEqual(PE.hitTest(plan,view,50+500,50+100,null),{kind:'item',type:'line',id:'l'});
 assert.equal(PE.hitTest(plan,view,10,10,null),null);
 const h=PE.hitTest(plan,view,50+400,50+300,{type:'zone',id:'a'});assert.deepEqual(h,{kind:'handle',type:'zone',id:'a',handle:'se'});
 const hl=PE.hitTest(plan,view,50+500,50,{type:'line',id:'l'});assert.deepEqual(hl,{kind:'handle',type:'line',id:'l',handle:'a'});
 assert.equal(PE.hitTest(plan,view,50+400,50+300,{type:'zone',id:'zzz'}).kind,'item');
});
test('view: fit, zoom rond de cursor en omrekening',()=>{
 const b=PE.planBounds({zones:[{x:0,z:0,w:9000,d:6500}],lines:[]});assert.deepEqual(b,{x:0,z:0,w:9000,d:6500});
 const v=PE.fitView(b,1000,700,50);assert.ok(Math.abs(v.scale-(900/9000))<1e-9||v.scale<=0.1);
 const s0=PE.toScreen(v,4500,3250);assert.ok(Math.abs(s0.x-500)<1&&Math.abs(s0.y-350)<1);
 const z=PE.zoomAt(v,300,200,2),w1=PE.toWorld(v,300,200),w2=PE.toWorld(z,300,200);assert.ok(Math.abs(w1.x-w2.x)<1e-6&&Math.abs(w1.z-w2.z)<1e-6);
 assert.deepEqual(PE.planBounds({zones:[],lines:[]}),{x:0,z:0,w:6000,d:4000});
 assert.ok(PE.distToSegment({x:5,y:5},{x:0,y:0},{x:10,y:0})===5);
});
