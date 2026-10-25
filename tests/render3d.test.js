const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../render3d.js');
const quad=(d,owner)=>({verts:[{x:0,y:0,d},{x:100,y:0,d},{x:100,y:100,d},{x:0,y:100,d}],fill:'#deb889',owner});
test('countertop blocks beam behind it regardless of draw order',()=>{
 const a=quad(-200,null),b=quad(1200,{type:'beam',id:'back'});
 assert.equal(R.pick([a,b],50,50),null);assert.equal(R.pick([b,a],50,50),null);
});
test('closest visible object can be selected regardless of draw order',()=>{
 const a=quad(-100,{type:'beam',id:'front'}),b=quad(900,{type:'beam',id:'back'});
 assert.equal(R.pick([a,b],50,50).id,'front');assert.equal(R.pick([b,a],50,50).id,'front');
});
test('projected triangles have consistent GPU depth and color',()=>{
 const v=R.triangles([quad(500,null)],100,100);
 assert.equal(v.length,36);assert.equal(v[0],-1);assert.equal(v[1],1);
 assert.ok(Math.abs(v[2]-500/12000)<1e-7);
});
test('tilted face interpolates depth and ignores misses',()=>{
 const v=[{x:0,y:0,d:0},{x:100,y:0,d:200},{x:0,y:100,d:200}];
 assert.equal(R.depthAt(v,25,25),100);
 assert.equal(R.depthAt(v,95,95),null);
});
test('unsupported GPU fails safely to the legacy 2D renderer',()=>{
 assert.equal(R.create(null).ready,false);
 assert.equal(R.create({getContext(){return {}}}).ready,false);
});
