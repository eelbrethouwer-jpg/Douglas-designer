const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
const project = () => M.demoProject();
test('horizontal beam fits between front posts with exact 520 mm length',()=>{
  const p=project(),beam={id:'test',name:'regel',axis:'x',x:200,y:400,z:20,length:200};
  assert.deepEqual({...M.fitBeamBetween(p,beam)}, {axis:'x',start:50,end:570,length:520,distance:10});
});
test('horizontal beam can fit in second module bay',()=>{
  const p=project(),beam={id:'test',axis:'x',x:850,y:400,z:20,length:200};
  const fit=M.fitBeamBetween(p,beam);
  assert.equal(fit.start,620);assert.equal(fit.end,1220);assert.equal(fit.length,600);
});
test('vertical beam fits between lower and upper horizontal rails',()=>{
  const p=project(),beam={id:'test',axis:'y',x:200,y:350,z:10,length:200};
  const fit=M.fitBeamBetween(p,beam);
  assert(fit, 'must find matching upper and lower rail');
  assert.equal(fit.start,200);assert.equal(fit.end,p.height-125);
  assert.equal(fit.length,p.height-325);
});
test('depth beam fits between front and rear posts',()=>{
  const p=project(),beam={id:'test',axis:'z',x:0,y:400,z:340,length:200};
  const fit=M.fitBeamBetween(p,beam);
  assert(fit);assert.equal(fit.start,100);assert.equal(fit.end,p.depth-100);assert.equal(fit.length,p.depth-200);
});
test('fit does not claim invisible supports',()=>{
  const p=project(),beam={id:'test',axis:'x',x:200,y:400,z:430,length:200};
  assert.equal(M.fitBeamBetween(p,beam),null);
});
test('fit works between two added manual supports and ignores itself',()=>{
  const p=project();p.beams.push({id:'left',axis:'y',x:140,y:250,z:300,length:500},{id:'right',axis:'y',x:790,y:250,z:300,length:500});
  const beam={id:'middle',axis:'x',x:300,y:420,z:325,length:300};
  const fit=M.fitBeamBetween(p,beam);
  assert.equal(fit.start,190);assert.equal(fit.end,790);assert.equal(fit.length,600);
  p.beams.push({...beam});
  assert.equal(M.fitBeamBetween(p,beam).length,600);
});
test('fit does not modify original beam or calculate physical load-bearing strength',()=>{
 const p=project(),beam={id:'beam',axis:'x',x:200,y:400,z:20,length:200};
 const before=JSON.stringify(beam),count=M.boardPlan(p).pieces;
 const fit=M.fitBeamBetween(p,beam);
 assert(fit);assert.equal(JSON.stringify(beam),before);assert.equal(M.boardPlan(p).pieces,count);
});