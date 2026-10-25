const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../room-space.js');
const M=require('../model.js');

test('existing projects obtain a disabled room and validated style without changing cutlist',()=>{
 const p=M.demoProject(),before=JSON.stringify(M.boardPlan(p).groups);
 const r=R.normalizeRoom(undefined,p),style=R.normalizeStyle(undefined);
 assert.equal(r.enabled,false);assert.equal(r.width,4500);
 assert.equal(style.wood,'wood-0');assert.equal(style.top,'top-0');
 assert.equal(JSON.stringify(M.boardPlan(p).groups),before);
});
test('room measurements and external photo data are validated',()=>{
 const p=M.demoProject();
 let room=R.normalizeRoom({enabled:true,width:-200,depth:900000,height:0,photo:'javascript:alert(1)',corners:[[0,0],[2,1],[.3,.2]]},p);
 assert.equal(room.width,1200);assert.equal(room.depth,20000);assert.equal(room.height,1200);
 assert.equal(room.photo,null);assert.equal(room.corners.length,2);
 room=R.normalizeRoom({placement:{rotation:17,x:NaN,z:1e10}},p);
 assert.equal(room.placement.rotation,0);assert.ok(Number.isFinite(room.placement.x));
 assert.equal(room.placement.z,20000);
});
test('project placement rotates orthogonally and retains measured kitchen lengths',()=>{
 const p=M.demoProject();
 const room=R.normalizeRoom({enabled:true,placement:{x:100,z:200,rotation:90}},p);
 const p0=R.transformKitchen([0,0,0],p,room),p1=R.transformKitchen([p.width,0,p.depth],p,room);
 assert.deepEqual(p0,[100,0,200+p.width]);assert.deepEqual(p1,[100+p.depth,0,200]);
 assert.equal(R.orientation(p,room).width,p.depth);
 assert.equal(R.orientation(p,room).depth,p.width);
});
test('collision warnings report position and height separately',()=>{
 const p=M.demoProject();
 let r=R.normalizeRoom({enabled:true,width:1800,depth:1500,height:1200,placement:{x:100,z:200}},p);
 assert.ok(R.warnings(p,r).some(w=>w.includes('buiten')));
 assert.equal(R.warnings(p,{...r,enabled:false}).length,0);
 r=R.normalizeRoom({enabled:true,width:4000,depth:4000,height:1200,placement:{x:100,z:200}},p);
 assert.equal(R.warnings(p,r).length,0);
 r.height=800;assert.ok(R.warnings(p,r).some(w=>w.includes('hoger')));
});
test('floor reference corner mapping uses correct corner ordering',()=>{
 const corners=[[0,1],[1,1],[1,0],[0,0]];
 assert.deepEqual(R.floorMap(0,0,corners),corners[0]);
 assert.deepEqual(R.floorMap(1,0,corners),corners[1]);
 assert.deepEqual(R.floorMap(1,1,corners),corners[2]);
 assert.deepEqual(R.floorMap(0,1,corners),corners[3]);
 assert.deepEqual(R.floorMap(.5,.5,corners),[.5,.5]);
});
test('catalogue contains exactly 66 variants and malicious ids cannot change a material',()=>{
 const count=Object.values(R.palettes).reduce((a,v)=>a+v.length,0)+Object.values(R.components).reduce((a,v)=>a+v.length,0);
 assert.equal(count,66);
 assert.equal(R.normalizeStyle({wood:'unknown'}).wood,'wood-0');
 assert.equal(R.colorOf('wood','invalid'),R.palettes.wood[0].color);
});
