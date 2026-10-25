const test=require('node:test');const assert=require('node:assert/strict');const M=require('../model.js');
test('empty free drawing document contains no automatic frame or worktop',()=>{
 const p=M.freeProject(); assert.equal(p.modules.length,0);assert.equal(p.beams.length,0);
 assert.equal(p.countertop,false);assert.equal(M.framePieces(p).length,0);
 assert.equal(M.boardPlan(p).pieces,0);assert.equal(M.expectedWidth(p),p.width);
});
test('free project stays empty through persistence normalization and sizing',()=>{
 const p=M.normalizeProject(JSON.parse(JSON.stringify(M.freeProject())));
 assert.equal(p.modules.length,0);assert.equal(p.width,2000);
 assert.equal(M.resizeProject(p,3200),true);assert.equal(p.width,3200);
 assert.equal(M.resizeProject(p,200),false);assert.equal(p.width,3200);
});
test('dragging on front view creates horizontal and vertical beams with exact span',()=>{
 const a={x:80,y:300,z:0},b={x:680,y:311,z:0};
 const h=M.drawingBeam(a,b,['x','y']);assert.equal(h.axis,'x');assert.equal(h.length,600);assert.equal(h.x,80);
 const c={x:100,y:240,z:0},d={x:105,y:750,z:0};
 const v=M.drawingBeam(c,d,['x','y']);assert.equal(v.axis,'y');assert.equal(v.y,240);assert.equal(v.length,510);
});
test('top view can create true depth beams',()=>{
 const b=M.drawingBeam({x:100,y:100,z:50},{x:115,y:100,z:650},['x','z']);
 assert.equal(b.axis,'z');assert.equal(b.length,600);assert.equal(b.z,50);
});
test('both green endpoints can resize without moving the opposite endpoint',()=>{
 const b={axis:'x',x:200,y:100,z:0,length:500};
 assert.equal(M.resizeBeamEndpoint(b,'end',900),true);assert.equal(b.length,700);assert.equal(b.x,200);
 assert.equal(M.resizeBeamEndpoint(b,'start',310),true);assert.equal(b.x,310);assert.equal(b.length,590);
 assert.equal(b.x+b.length,900);
 assert.equal(M.resizeBeamEndpoint(b,'end',311),true);assert.equal(b.length,50);
});
test('upper rails bear on posts without length exceeding project envelope',()=>{
 const p=M.demoProject(),posts=M.framePieces(p).filter(x=>x.axis==='y');
 const top=M.framePieces(p).filter(x=>x.axis!=='y'&&x.y===p.height-125);
 assert.equal(top.length,10);
 for(const b of top){
  const a=M.beamBox(b);
  const onPost=posts.some(post=>{
   const q=M.beamBox(post);
   const overlapX=Math.min(a.x+a.w,q.x+q.w)-Math.max(a.x,q.x);
   const overlapZ=Math.min(a.z+a.d,q.z+q.d)-Math.max(a.z,q.z);
   return overlapX>=20&&overlapZ>=20&&Math.abs(q.y+q.h-a.y)<1;
  });
  assert(onPost,`${b.name} has no vertical bearing on a post`);
 }
});