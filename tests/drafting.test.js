const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../drafting.js');
const M=require('../model.js');

test('grid precision supports 5, 10, 25 and 50 millimeter steps',()=>{
 for(const n of [5,10,25,50]){
  assert.equal(D.snap(122,n),Math.round(122/n)*n);
  assert.equal(D.snap(-122,n),Math.round(-122/n)*n);
 }
});
test('invalid snapping settings cannot corrupt model coordinates',()=>{
 assert.equal(D.snap(17,0),17);
 assert.equal(D.snap(17,NaN),17);
 assert.equal(D.snap(17,10),20);
});
test('automatic frame and free beams provide precise endpoint magnets',()=>{
 const p=M.demoProject();p.beams.push({id:'own',name:'Test',axis:'x',length:350,x:80,y:200,z:20});
 const supports=[...M.framePieces(p),...p.beams];
 const points=D.anchors(supports,M.beamBox,'own');
 assert.equal(points.length,M.framePieces(p).length*2);
 assert.ok(points.some(a=>a.id==='frame-post-0-front'));
 assert.ok(points.every(a=>Number.isFinite(a.point.x)&&Number.isFinite(a.point.y)&&Number.isFinite(a.point.z)));
});
test('nearest anchor uses a pixel tolerance and never fabricates matches',()=>{
 const anchors=[{id:'one',label:'End',point:{x:100,y:200,z:0}},
                {id:'two',label:'End',point:{x:500,y:100,z:0}}];
 const toScreen=v=>({x:v[0]/2,y:v[1]/2});
 assert.equal(D.nearestAnchor(52,100,anchors,toScreen,['x','y'],12).id,'one');
 assert.equal(D.nearestAnchor(5,5,anchors,toScreen,['x','y'],12),null);
 assert.equal(D.nearestAnchor(52,100,anchors,toScreen,[],12),null);
});
test('grid point snaps only active axes without moving the other coordinate',()=>{
 const point={x:114,y:311,z:123};
 const free=D.snapDrawingPoint(point,['x','y'],{step:25});
 assert.deepEqual(free,{x:125,y:300,z:123});
 const fixed=D.snapDrawingPoint(point,['x','y'],{step:5,anchor:{point:{x:151,y:251,z:900}}});
 assert.deepEqual(fixed,{x:150,y:250,z:123});
});
test('measure: afstand en delta in het tekenvlak, afgerond op hele mm',()=>{
 const D2=require('../drafting.js');
 assert.deepEqual(D2.measure({x:0,y:0,z:0},{x:300,y:400,z:99},['x','y']),{h:'x',v:'y',dx:300,dy:400,dist:500});
 assert.deepEqual(D2.measure({x:10,y:0,z:5},{x:10,y:0,z:-95},['x','z']),{h:'x',v:'z',dx:0,dy:100,dist:100});
 assert.equal(D2.measure(null,{x:1},['x','y']),null);assert.equal(D2.measure({x:0},{x:1},['x']),null);
 assert.equal(D2.measure({x:0.4,y:0},{x:0.6,y:0},['x','y']).dist,0);
});
test('rectSelect: volledig binnen versus kruisend, alleen balken, geen dubbelen',()=>{
 const sq=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
 const shapes=[{owner:{type:'beam',id:'a'},verts:sq(10,10,20,20)},{owner:{type:'beam',id:'a'},verts:sq(40,10,10,10)},
  {owner:{type:'frame',id:'f'},verts:sq(100,100,50,50)},{owner:{type:'module',id:'m'},verts:sq(0,0,10,10)},{owner:null,verts:sq(0,0,5,5)}];
 const D2=require('../drafting.js');
 assert.deepEqual(D2.rectSelect(shapes,{x0:0,y0:0,x1:60,y1:60},false),[{type:'beam',id:'a'}]);
 assert.deepEqual(D2.rectSelect(shapes,{x0:0,y0:0,x1:160,y1:160},false).map(o=>o.id).sort(),['a','f']);
 assert.deepEqual(D2.rectSelect(shapes,{x0:60,y0:60,x1:110,y1:110},true),[{type:'frame',id:'f'}]);
 assert.deepEqual(D2.rectSelect(shapes,{x0:60,y0:60,x1:110,y1:110},false),[]);
 assert.deepEqual(D2.rectSelect(shapes,{x0:45,y0:5,x1:0,y1:35},true),[{type:'beam',id:'a'}]);
});
