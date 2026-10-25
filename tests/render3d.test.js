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
 assert.equal(v[2],500); // raw camera depth; GPU uses perspective-correct clip W
});
test('tilted face interpolates depth and ignores misses',()=>{
 const v=[{x:0,y:0,d:0},{x:100,y:0,d:200},{x:0,y:100,d:200}];
 assert.ok(Math.abs(R.depthAt(v,25,25)-(1/(.5/2000+.5/2200)-2000))<1e-7);
 assert.equal(R.depthAt(v,95,95),null);
});
test('unsupported GPU fails safely to the legacy 2D renderer',()=>{
 assert.equal(R.create(null).ready,false);
 assert.equal(R.create({getContext(){return {}}}).ready,false);
});

test('perspective depth reconstruction differs from naive linear interpolation',()=>{
 const v=[{x:0,y:0,d:-800},{x:100,y:0,d:800},{x:0,y:100,d:800}];
 const value=R.depthAt(v,25,25);
 assert.ok(value<0,`expected near surface to be in front, got ${value}`);
 assert.ok(value<(.5*(-800)+.5*800),'must not use linear screen depth');
});
test('shader uses clip W for perspective-correct occlusion',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const src=fs.readFileSync(path.join(__dirname,'../render3d.js'),'utf8');
 assert.match(src,/gl_Position=vec4\(a_pos\.xy\*w,w-200\.0,w\)/);
});
