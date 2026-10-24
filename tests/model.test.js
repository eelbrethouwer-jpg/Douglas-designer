const test=require('node:test');const assert=require('node:assert/strict');const M=require('../model.js');
test('demoproject matches original outer width and frame openings',()=>{
 const p=M.demoProject();assert.equal(p.width,1875);assert.equal(M.expectedWidth(p),1875);
 const b=M.boundaries(p);assert.deepEqual(b.posts,[0,570,1220,1825]);assert.deepEqual(b.sections.map(s=>s.right-s.left),[520,600,555]);
});
test('frame length/count and stable total lengths',()=>{
 const p=M.demoProject(), pieces=M.framePieces(p);
 assert.equal(pieces.length,28);assert.equal(pieces.filter(b=>b.axis==='y').length,8);
 assert.equal(pieces.filter(b=>b.axis==='z').length,8);assert.equal(pieces.filter(b=>b.axis==='x').length,12);
 assert(pieces.every(b=>b.length>0));assert(pieces.every(b=>b.length<=p.stockLength));
 assert(pieces.every(b=>{const v=M.beamBox(b);return v.x>=0&&v.y>=0&&v.z>=0&&v.x+v.w<=p.width&&v.y+v.h<=p.height&&v.z+v.d<=p.depth}));
});
test('resize preserves exact outer dimension and minima',()=>{
 const p=M.demoProject();assert.equal(M.resizeProject(p,2200),true);assert.equal(p.width,2200);
 assert.equal(p.modules.reduce((s,m)=>s+m.width,0),2000);
 assert.equal(M.resizeProject(p,800),false);assert.equal(p.width,2200);
 assert.equal(M.resizeProject(p,1825),true);assert.equal(p.width,1825);
 assert(p.modules.every(m=>m.width>=M.TYPES[m.kind].min));
});
test('resize rounding does not drift for various widths',()=>{
 const p=M.demoProject();for(let w=1800;w<=3500;w+=7){assert.equal(M.resizeProject(p,w),true);assert.equal(p.width,w);assert(p.modules.every(m=>m.width>=M.TYPES[m.kind].min));}
});
test('cutting stock respects kerf and reports impossible cuts',()=>{
 const p=M.demoProject(), plan=M.boardPlan(p);
 assert.equal(plan.pieces,28);assert(plan.boards.length>0);
 for(const b of plan.boards){assert(b.used<=p.stockLength);assert.equal(b.used,b.cuts.reduce((sum,c)=>sum+c.length,0)+Math.max(0,b.cuts.length-1)*p.kerf);}
 p.beams.push({id:'x',name:'te lang',axis:'x',x:0,y:0,z:0,length:5000});
 const plan2=M.boardPlan(p);assert.equal(plan2.impossible.length,1);assert.equal(plan2.boards.reduce((n,b)=>n+b.cuts.length,0),plan2.pieces-1);
 assert(M.warnings(p).some(w=>w.includes('handelslengte')));
});
test('normalizing invalid data safely bounds dimensions',()=>{
 const p=M.normalizeProject({name:'demo',depth:-10,height:1,stockLength:100,modules:[{kind:'drawers',width:500}]});
 assert.equal(p.depth,400);assert.equal(p.height,400);assert.equal(p.stockLength,1000);assert.equal(p.width,600);
});
test('manual beams included in cut list and trigger bounds warning',()=>{
 const p=M.demoProject(), count=M.boardPlan(p).pieces;
 p.beams.push({id:'b1',name:'Extra',axis:'y',x:500,y:100,z:50,length:300});
 assert.equal(M.boardPlan(p).pieces,count+1);
 p.beams[0].x=-100;assert(M.warnings(p).some(w=>w.includes('buiten')));
});
