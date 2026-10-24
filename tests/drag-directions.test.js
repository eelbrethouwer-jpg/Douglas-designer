const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start = code.indexOf('function dragWorldDelta(');
const end = code.indexOf('function drawDims(',start);
if (start<0 || end<0) throw new Error('dragWorldDelta missing from app.js');
const method = code.slice(start,end);
function testMovement(view,project,dx,dy){
  // Based on projected basis vectors in the actual editor:
  // front horizontal X/vertical Y; side horizontal Z/vertical Y;
  // top horizontal X/vertical Z; 3D oblique projection.
  const mockScreen={
    front: ([x,y,z])=>({x:x*.25,y:-y*.25}),
    side: ([x,y,z])=>({x:-z*.25,y:-y*.25}),
    top: ([x,y,z])=>({x:x*.25,y:z*.25}),
    '3d': ([x,y,z])=>({x:x*.27-z*.13,y:-y*.24+x*.03+z*.10})
  }[view];
  return new Function('currentView','toScreen','dx','dy','beam',method+'\nreturn dragWorldDelta(dx,dy,beam);')(view,mockScreen,dx,dy,project);
}
const beam={x:100,y:500,z:100};
test('up always increases model height in front, side, and 3D',()=>{
  for(const view of ['front','side','3d']){
    const up=testMovement(view,beam,0,-30),down=testMovement(view,beam,0,30);
    assert(up.y>0,`${view} up should increase Y`);
    assert(down.y<0,`${view} down should decrease Y`);
    assert.equal(up.z,0,`${view} vertical drags must NOT unexpectedly change depth`);
  }
});
test('top view vertical drag changes depth, not height',()=>{
  const up=testMovement('top',beam,0,-30);
  assert(up.z<0);assert.equal(up.y,0);
});
test('side view horizontal motion changes depth, not width',()=>{
  const right=testMovement('side',beam,30,0);
  assert(right.z<0);assert.equal(right.x,0);
});