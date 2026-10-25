const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../sketch-grid.js');
const M=require('../model.js');
const R=require('../room-space.js');
test('default Sketch Studio settings expose a visible 250 mm grid, axes and perspective',()=>{
 const s=G.settings();
 assert.deepEqual(s,{visible:true,step:250,axes:true,walls:true,parallel:false});
 assert.equal(G.settings({step:-20}).step,250);
 assert.equal(G.settings({step:100,parallel:true}).step,100);
});
test('in a 4x3 meter room guide geometry coincides with exact floor and wall dimensions',()=>{
 const p=M.demoProject();
 const room=R.normalizeRoom({enabled:true,width:4000,depth:3000,height:2700},p);
 const quads=G.mesh(p,room,{step:500});
 const floor=quads.filter(q=>q.kind==='floor');
 const back=quads.filter(q=>q.kind==='back-wall');
 const left=quads.filter(q=>q.kind==='left-wall');
 assert.ok(floor.length>4&&back.length>4&&left.length>4);
 assert.ok(floor.every(q=>q.vertices.every(v=>v[1]===-18)));
 assert.ok(back.every(q=>q.vertices.every(v=>v[2]===2966)));
 assert.ok(left.every(q=>q.vertices.every(v=>v[0]===33)));
 const kinds=new Set(quads.map(q=>q.kind));
 for(const a of ['x-axis','y-axis','z-axis'])assert.ok(kinds.has(a),a);
 assert.ok(quads.every(q=>q.vertices.length===4&&q.vertices.every(v=>v.every(Number.isFinite))));
});
test('grid on/off and axes/vertical-wall toggles are independent',()=>{
 const p=M.demoProject(),room=R.normalizeRoom({enabled:true},p);
 assert.equal(G.mesh(p,room,{visible:false}).length,0);
 assert.equal(G.mesh(p,room,{axes:false}).some(q=>q.kind==='x-axis'),false);
 assert.equal(G.mesh(p,room,{walls:false}).some(q=>q.kind==='back-wall'),false);
 assert.ok(G.mesh(p,room,{walls:false}).some(q=>q.kind==='floor'));
});
test('grid density adapts to 20m outdoor environments without excess geometry',()=>{
 const p=M.demoProject(),room=R.normalizeRoom({enabled:true,width:20000,depth:20000,height:6500},p);
 const q=G.mesh(p,room,{step:50});
 assert.ok(q.length<500,'should cap raster density for GPU responsiveness; got '+q.length);
});
test('grid geometry does not mutate project or measured timber dimensions',()=>{
 const p=M.demoProject(),before=JSON.stringify(p),cut=M.boardPlan(p).totalLength;
 G.mesh(p,R.normalizeRoom({enabled:true},p),G.settings());
 assert.equal(JSON.stringify(p),before);
 assert.equal(M.boardPlan(p).totalLength,cut);
});
