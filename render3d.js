/* Douglas Designer GPU depth-buffer renderer. No external libraries. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DouglasGpuRenderer=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function parseColor(fill){
 const s=String(fill||'').trim();
 if(s[0]==='#'){const h=s.slice(1);if(h.length===3)return [...h].map(c=>parseInt(c+c,16)/255);if(h.length===6)return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);}
 const m=s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
 return m?[Number(m[1])/255,Number(m[2])/255,Number(m[3])/255]:[.7,.55,.4];
}
function bary(a,b,c,x,y){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const den=cross(a,b,c);if(Math.abs(den)<1e-6)return null;
 const w0=cross(b,c,{x,y})/den,w1=cross(c,a,{x,y})/den,w2=1-w0-w1;
 return w0>=-1e-5&&w1>=-1e-5&&w2>=-1e-5?[w0,w1,w2]:null;
}
function depthAt(v,x,y){
 if(!v||v.length<3)return null;
 for(let i=1;i<v.length-1;i++){const w=bary(v[0],v[i],v[i+1],x,y);if(w)return w[0]*v[0].d+w[1]*v[i].d+w[2]*v[i+1].d;}
 return null;
}
function pick(shapes,x,y){let nearest=null,depth=Infinity;
 for(const face of shapes){const d=depthAt(face.verts,x,y);if(d!==null&&d<depth){depth=d;nearest=face;}}
 return nearest?.owner||null;
}
function triangles(shapes,width,height){const data=[];
 for(const face of shapes){const v=face.verts;if(!v||v.length<3)continue;const c=parseColor(face.fill);
  for(let i=1;i<v.length-1;i++)for(const p of [v[0],v[i],v[i+1]])
    data.push(p.x/width*2-1,1-p.y/height*2,Math.max(-.99,Math.min(.99,p.d/12000)),...c);
 }return new Float32Array(data);
}
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
}
function create(canvas){
 if(!canvas||typeof canvas.getContext!=='function')return {ready:false};
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,preserveDrawingBuffer:true,premultipliedAlpha:false});}catch(e){return {ready:false};}
 if(!gl||typeof gl.createShader!=='function'||typeof gl.drawArrays!=='function')return {ready:false};
 let program,buffer,pos,color;try{
  const vs=shader(gl,gl.VERTEX_SHADER,'attribute vec3 a_pos;attribute vec3 a_color;varying vec3 v_color;void main(){gl_Position=vec4(a_pos,1.0);v_color=a_color;}');
  const fs=shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 v_color;void main(){gl_FragColor=vec4(v_color,1.0);}');
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs);gl.deleteShader(fs);
  pos=gl.getAttribLocation(program,'a_pos');color=gl.getAttribLocation(program,'a_color');buffer=gl.createBuffer();
  if(pos<0||color<0||!buffer)throw Error('Missing GPU attributes');
 }catch(e){return {ready:false,error:String(e)};}
 let ready=true;canvas.addEventListener?.('webglcontextlost',e=>{e.preventDefault();ready=false;});
 return {get ready(){return ready;},
  render(shapes,viewport,dpr){if(!ready)return false;try{
   const w=Math.max(1,Math.round(viewport.w*dpr)),h=Math.max(1,Math.round(viewport.h*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clearDepth(1);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   const data=triangles(shapes,viewport.w,viewport.h);
   gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(color);
   gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(color,3,gl.FLOAT,false,24,12);
   gl.drawArrays(gl.TRIANGLES,0,data.length/6);return true;
  }catch(e){ready=false;return false;}},
  pick(shapes,x,y){return pick(shapes,x,y);}
 };
}
return {create,parseColor,triangles,depthAt,pick};
});