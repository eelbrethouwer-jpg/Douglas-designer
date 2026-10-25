const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../render3d.js');
const quad=(d,owner)=>({verts:[{x:0,y:0,d},{x:100,y:0,d},{x:100,y:100,d},{x:0,y:100,d}],worldVerts:[[0,0,d],[100,0,d],[100,100,d],[0,100,d]],fill:'#deb889',owner});
test('worktop occludes the object behind it in either drawing order',()=>{
 const a=quad(-200,null),b=quad(1200,{type:'beam',id:'back'});
 assert.equal(R.pick([a,b],50,50),null);assert.equal(R.pick([b,a],50,50),null);
});
test('nearest selectable face wins regardless of draw order',()=>{
 const a=quad(-100,{type:'beam',id:'front'}),b=quad(900,{type:'beam',id:'back'});
 assert.equal(R.pick([a,b],50,50).id,'front');assert.equal(R.pick([b,a],50,50).id,'front');
});
test('GPU triangle source remains in full world millimeters',()=>{
 const data=R.triangles([quad(500,null)]);
 assert.equal(data.length,36);assert.equal(data[0],0);assert.equal(data[1],0);assert.equal(data[2],500);
 assert.ok(data[3]>.8&&data[3]<.95,'color converted to 0..1');
});
test('camera projection matches the existing 2D overlay at arbitrary yaw and pitch',()=>{
 const center=[937.5,475,435],point=[250,760,280],camera={yaw:-.62,pitch:.32},viewport={w:1100,h:670},scale:.32;
 const p=R.projectWorld(point,center,camera,viewport,scale);
 const [x,y,z]=point.map((v,i)=>v-center[i]);
 const xx=Math.cos(camera.yaw)*x+Math.sin(camera.yaw)*z;
 const zz=-Math.sin(camera.yaw)*x+Math.cos(camera.yaw)*z;
 const yy=Math.cos(camera.pitch)*y-Math.sin(camera.pitch)*zz;
 const depth=Math.sin(camera.pitch)*y+Math.cos(camera.pitch)*zz;
 const f=2000/(2000+depth);
 assert.ok(Math.abs(p.x-(viewport.w/2+xx*scale*f))<1e-9);
 assert.ok(Math.abs(p.y-(viewport.h*.55-yy*scale*f))<1e-9);
 assert.ok(Math.abs(p.d-depth)<1e-9);
});
test('depth interpolation follows perspective, not a linear screen average',()=>{
 const v=[{x:0,y:0,d:-800},{x:100,y:0,d:800},{x:0,y:100,d:800}];
 const z=R.depthAt(v,25,25);
 assert.ok(z<0,'front face should be closer than linear average: '+z);
 assert.equal(R.depthAt(v,95,95),null);
});
test('vertex shader projects from original world coordinates and supplies a true depth buffer',()=>{
 assert.match(R.VERTEX_SHADER,/a_pos-u_center/);
 assert.match(R.VERTEX_SHADER,/u_angles/);
 assert.match(R.VERTEX_SHADER,/gl_Position=vec4\(/);
 assert.match(R.VERTEX_SHADER,/w-500\.0/);
});
test('unsupported GPU remains an intentional Canvas2D fallback',()=>{
 assert.equal(R.create(null).ready,false);
 assert.equal(R.create({getContext(){return {}}}).ready,false);
});
