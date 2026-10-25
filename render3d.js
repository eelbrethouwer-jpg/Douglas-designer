/* Douglas Designer | World-space WebGL1 renderer, exact same camera as 2D overlay. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DouglasGpuRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EYE=2000;
function parseColor(fill){
 const s=String(fill||'').trim();
 if(s[0]==='#'){const h=s.slice(1);if(h.length===3)return [...h].map(c=>parseInt(c+c,16)/255);if(h.length===6)return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);}
 const m=s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
 return m?[Number(m[1])/255,Number(m[2])/255,Number(m[3])/255]:[.7,.55,.4];
}
function projectWorld(point,center,camera,viewport,scale){
 const x=point[0]-center[0],y=point[1]-center[1],z=point[2]-center[2];
 const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
 const xx=c*x+s*z,zz=-s*x+c*z,yy=cp*y-sp*zz,depth=sp*y+cp*zz;
 const f=EYE/(EYE+depth);
 return {x:viewport.w/2+xx*scale*f,y:viewport.h*.55-yy*scale*f,d:depth};
}
function bary(a,b,c,x,y){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const den=cross(a,b,c);if(Math.abs(den)<1e-6)return null;
 const w0=cross(b,c,{x,y})/den,w1=cross(c,a,{x,y})/den,w2=1-w0-w1;
 return w0>=-1e-5&&w1>=-1e-5&&w2>=-1e-5?[w0,w1,w2]:null;
}
function depthAt(v,x,y){
 if(!v||v.length<3)return null;
 for(let i=1;i<v.length-1;i++){const vertices=[v[0],v[i],v[i+1]],w=bary(...vertices,x,y);if(!w)continue;
  const reciprocal=w.reduce((sum,t,j)=>sum+t/(EYE+vertices[j].d),0);
  return reciprocal>0?1/reciprocal-EYE:null;
 }
 return null;
}
function pick(shapes,x,y){
 let nearest=null,depth=Infinity;
 for(const face of shapes){const d=depthAt(face.verts,x,y);if(d!==null&&d<depth){depth=d;nearest=face;}}
 return nearest?.owner||null;
}
function triangles(shapes){
 const data=[];
 for(const face of shapes){const v=face.worldVerts;if(!v||v.length<3)continue;
  const color=parseColor(face.fill);
  for(let i=1;i<v.length-1;i++)for(const p of [v[0],v[i],v[i+1]])data.push(p[0],p[1],p[2],...color);
 }
 return new Float32Array(data);
}
const VERTEX_SHADER=String.raw`attribute vec3 a_pos;
attribute vec3 a_color;
uniform vec3 u_center;
uniform vec2 u_viewport;
uniform vec2 u_angles;
uniform float u_scale;
varying vec3 v_color;
void main(){
 vec3 p=a_pos-u_center;
 float c=cos(u_angles.x),s=sin(u_angles.x),cp=cos(u_angles.y),sp=sin(u_angles.y);
 float xx=c*p.x+s*p.z;
 float zz=-s*p.x+c*p.z;
 float yy=cp*p.y-sp*zz;
 float dz=sp*p.y+cp*zz;
 float w=max(20.0,2000.0+dz);
 // Position is computed from original world vertices (not a preprojected polygon).
 // Camera and overlay use the same projection, including the vertical .55 center.
 gl_Position=vec4(4000.0*xx*u_scale/u_viewport.x,4000.0*yy*u_scale/u_viewport.y-0.10*w,w-500.0,w);
 v_color=a_color;
}`;
const FRAGMENT_SHADER='precision highp float;varying vec3 v_color;void main(){gl_FragColor=vec4(v_color,1.0);}';
function shader(gl,type,source){
 const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
 if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(item));
 return item;
}
function create(canvas){
 if(!canvas||typeof canvas.getContext!=='function')return {ready:false};
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:true,premultipliedAlpha:false});}catch(e){return {ready:false};}
 if(!gl||typeof gl.createShader!=='function'||typeof gl.drawArrays!=='function')return {ready:false};
 let program,buffer,position,color,viewportUniform,centerUniform,anglesUniform,scaleUniform;
 try{
  const vs=shader(gl,gl.VERTEX_SHADER,VERTEX_SHADER),fs=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs);gl.deleteShader(fs);
  position=gl.getAttribLocation(program,'a_pos');color=gl.getAttribLocation(program,'a_color');buffer=gl.createBuffer();
  viewportUniform=gl.getUniformLocation(program,'u_viewport');centerUniform=gl.getUniformLocation(program,'u_center');
  anglesUniform=gl.getUniformLocation(program,'u_angles');scaleUniform=gl.getUniformLocation(program,'u_scale');
  if(position<0||color<0||!buffer||!viewportUniform||!centerUniform||!anglesUniform||!scaleUniform)throw Error('WebGL attributes/uniforms missing');
 }catch(e){return {ready:false,error:String(e)};}
 let ready=true;canvas.addEventListener?.('webglcontextlost',e=>{e.preventDefault();ready=false;});
 return {get ready(){return ready;},
  render(shapes,viewport,dpr,scene){
   if(!ready||!scene)return false;
   try{
    const width=Math.max(1,Math.round(viewport.w*dpr)),height=Math.max(1,Math.round(viewport.h*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const values=triangles(shapes);
    gl.useProgram(program);
    gl.uniform2f(viewportUniform,viewport.w,viewport.h);
    gl.uniform3f(centerUniform,...scene.center);
    gl.uniform2f(anglesUniform,scene.yaw,scene.pitch);
    gl.uniform1f(scaleUniform,scene.scale);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(color,3,gl.FLOAT,false,24,12);
    gl.drawArrays(gl.TRIANGLES,0,values.length/6);
    return true;
   }catch(error){ready=false;return false;}
  },
  pick(shapes,x,y){return pick(shapes,x,y);}
 };
}
return {create,parseColor,projectWorld,triangles,depthAt,pick,VERTEX_SHADER};
});