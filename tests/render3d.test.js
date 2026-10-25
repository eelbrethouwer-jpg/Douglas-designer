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
 const center=[937.5,475,435],point=[250,760,280],camera={yaw:-.62,pitch:.32},viewport={w:1100,h:670},scale=.32;
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


test('renderer sets world-space camera uniforms and writes depth-tested geometry',()=>{
 const seen={calls:[],uniforms:[]};
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,
  DEPTH_TEST:6,LESS:7,BLEND:8,CULL_FACE:9,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,
  DYNAMIC_DRAW:10,FLOAT:11,TRIANGLES:12,
  createShader(){return {}},shaderSource(){},compileShader(){},getShaderParameter(){return true},
  createProgram(){return {}},attachShader(){},linkProgram(){},getProgramParameter(){return true},
  deleteShader(){},getAttribLocation(_,name){return name==='a_pos'?0:1},
  createBuffer(){return {}},getUniformLocation(_,name){return name},
  viewport(){},clearColor(){},clearDepth(){},enable(which){seen.calls.push(['enable',which])},
  depthFunc(which){seen.calls.push(['depth',which])},disable(){},clear(){},useProgram(){},
  uniform2f(...args){seen.uniforms.push(args)},uniform3f(...args){seen.uniforms.push(args)},
  uniform1f(...args){seen.uniforms.push(args)},bindBuffer(){},
  bufferData(_,buffer){seen.bytes=buffer.byteLength},
  enableVertexAttribArray(){},vertexAttribPointer(){},
  drawArrays(_,start,count){seen.calls.push(['draw',start,count])}};
 const canvas={width:0,height:0,getContext(){return gl},addEventListener(){}};
 const gpu=R.create(canvas);
 assert.equal(gpu.ready,true);
 assert.equal(gpu.render([quad(-125,null)],{w:800,h:500},2,
   {center:[500,500,500],yaw:.4,pitch:-.8,scale:.55,panX:14,panY:6}),true);
 assert.equal(canvas.width,1600);assert.equal(canvas.height,1000);
 assert.equal(seen.bytes,144); // two triangles, 6 vertices, 6 floats, 4 bytes
 assert.ok(seen.uniforms.some(x=>x[0]==='u_center'&&x[1]===500));
 assert.ok(seen.uniforms.some(x=>x[0]==='u_pan'&&x[1]===14&&x[2]===6));
 assert.ok(seen.calls.some(x=>x[0]==='enable'&&x[1]===gl.DEPTH_TEST));
 assert.ok(seen.calls.some(x=>x[0]==='draw'&&x[2]===6));
});
test('camera matches the overlay at top, bottom, side and free orbit angles',()=>{
 for(const yaw of [0,-.8,Math.PI/2,2.3]){
  for(const pitch of [-1.55,-.35,.4,1.55]){
   const viewport={w:928,h:610},center=[500,400,250],v=[120,830,75],scale=.41;
   const a=R.projectWorld(v,center,{yaw,pitch},viewport,scale);
   const [x,y,z]=v.map((n,i)=>n-center[i]);
   const rx=Math.cos(yaw)*x+Math.sin(yaw)*z;
   const rz=-Math.sin(yaw)*x+Math.cos(yaw)*z;
   const ry=Math.cos(pitch)*y-Math.sin(pitch)*rz;
   const rd=Math.sin(pitch)*y+Math.cos(pitch)*rz;
   assert.ok(Math.abs(a.x-(viewport.w/2+rx*scale*2000/(2000+rd)))<1e-9);
   assert.ok(Math.abs(a.y-(viewport.h*.55-ry*scale*2000/(2000+rd)))<1e-9);
  }
 }
});

test('large captured rooms use explicit camera distance without perspective inversion',()=>{
 const center=[6000,1400,4000],point=[12000,2600,8000],camera={yaw:-.4,pitch:.3};
 const p=R.projectWorld(point,center,camera,{w:900,h:600},.05,16000);
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert.ok(p.x>0&&p.x<3000);
});
test('depth picking allows a room-specific eye distance and preserves nearest surface',()=>{
 const a=quad(-350,null),b=quad(2500,{type:'beam',id:'behind'});
 assert.equal(R.pick([a,b],50,50,12000),null);
});
