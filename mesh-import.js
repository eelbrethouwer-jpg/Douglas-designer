/* Douglas Designer — import van 3D-scans (.glb / .gltf met ingebedde data / .obj).
   Pure parsers zonder DOM, testbaar in Node. Eenheden: de bron wordt ongewijzigd gelezen; schaal stel je in de app in.
   Alle invoer is onbetrouwbaar: harde limieten, geen uitvoerbare inhoud, duidelijke foutmeldingen. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DouglasMesh=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';
const LIMITS={fileBytes:120*1024*1024,vertices:4000000,triangles:4000000,targetTriangles:45000};

function fail(msg){throw new Error(msg);}

/* ---------- 4x4 matrices (kolom-gewijs, zoals glTF) ---------- */
function ident(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
function fromTRS(t,q,s){
  const [x,y,z,w]=q,[sx,sy,sz]=s;
  const xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
  return [(1-2*(yy+zz))*sx,(2*(xy+wz))*sx,(2*(xz-wy))*sx,0,
          (2*(xy-wz))*sy,(1-2*(xx+zz))*sy,(2*(yz+wx))*sy,0,
          (2*(xz+wy))*sz,(2*(yz-wx))*sz,(1-2*(xx+yy))*sz,0,
          t[0],t[1],t[2],1];
}
function nodeMatrix(n){
  if(Array.isArray(n.matrix)&&n.matrix.length===16&&n.matrix.every(Number.isFinite))return n.matrix;
  const t=Array.isArray(n.translation)?n.translation:[0,0,0],q=Array.isArray(n.rotation)?n.rotation:[0,0,0,1],s=Array.isArray(n.scale)?n.scale:[1,1,1];
  return fromTRS(t,q,s);
}

/* ---------- OBJ ---------- */
function parseOBJ(text){
  if(typeof text!=='string')fail('Ongeldig OBJ-bestand');
  const pos=[],col=[];let hasColor=false;const idx=[];
  const lines=text.split(/\r?\n/);
  for(const raw of lines){
    if(raw.length<2)continue;const c0=raw.charCodeAt(0);
    if(c0===118&&raw.charCodeAt(1)===32){ // "v "
      const p=raw.trim().split(/\s+/);const x=+p[1],y=+p[2],z=+p[3];
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))fail('Ongeldige hoekpunten in OBJ');
      pos.push(x,y,z);
      if(p.length>=7&&Number.isFinite(+p[4])){hasColor=true;col.push(clamp255(+p[4]*255),clamp255(+p[5]*255),clamp255(+p[6]*255));}else col.push(176,168,156);
      if(pos.length/3>LIMITS.vertices)fail('Model heeft te veel hoekpunten (max '+LIMITS.vertices+')');
    }else if(c0===102&&raw.charCodeAt(1)===32){ // "f "
      const p=raw.trim().split(/\s+/).slice(1),n=pos.length/3,ids=[];
      for(const tok of p){let i=parseInt(tok.split('/')[0],10);if(!Number.isFinite(i)||i===0)fail('Ongeldige vlakken in OBJ');i=i<0?n+i:i-1;if(i<0||i>=n)fail('Vlak verwijst naar een niet-bestaand hoekpunt');ids.push(i);}
      for(let k=1;k+1<ids.length;k++)idx.push(ids[0],ids[k],ids[k+1]);
      if(idx.length/3>LIMITS.triangles)fail('Model heeft te veel driehoeken');
    }
  }
  if(!idx.length)fail('OBJ bevat geen vlakken (alleen punten?)');
  return {positions:Float32Array.from(pos),indices:Uint32Array.from(idx),colors:Uint8Array.from(col),hasColor,pending:[],source:'obj'};
}
function clamp255(v){return Math.max(0,Math.min(255,Math.round(v)));}

/* ---------- glTF / GLB ---------- */
const COMP={5120:[1,Int8Array,true],5121:[1,Uint8Array,false],5122:[2,Int16Array,true],5123:[2,Uint16Array,false],5125:[4,Uint32Array,false],5126:[4,Float32Array,true]};
const NCOMP={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};

function b64ToBytes(b64){
  if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(b64,'base64'));
  const s=atob(b64),o=new Uint8Array(s.length);for(let i=0;i<s.length;i++)o[i]=s.charCodeAt(i);return o;
}
function dataUri(uri){
  const m=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(String(uri||''));if(!m)return null;
  return {mime:m[1],bytes:m[2]?b64ToBytes(m[3]):new TextEncoder().encode(decodeURIComponent(m[3]))};
}

function parseGLTF(json,binChunk){
  if(!json||typeof json!=='object')fail('Ongeldig glTF-bestand');
  const req=json.extensionsRequired||[];
  if(req.includes('KHR_draco_mesh_compression')||req.includes('EXT_meshopt_compression'))fail('Dit bestand gebruikt compressie (Draco/meshopt). Exporteer het zonder compressie of als .obj.');
  const buffers=(json.buffers||[]).map((b,i)=>{
    if(b.uri){const d=dataUri(b.uri);if(!d)fail('Extern .bin-bestand wordt niet ondersteund; exporteer als .glb');return d.bytes;}
    if(i===0&&binChunk)return binChunk;fail('Buffer ontbreekt');
  });
  const view=i=>{const v=(json.bufferViews||[])[i];if(!v)fail('Ongeldige bufferView');const buf=buffers[v.buffer];if(!buf)fail('Ongeldige buffer');
    const off=(v.byteOffset||0);if(off+v.byteLength>buf.byteLength)fail('bufferView valt buiten het bestand');return {buf,off,len:v.byteLength,stride:v.byteStride||0};};
  function readAccessor(i){
    const a=(json.accessors||[])[i];if(!a)fail('Ongeldige accessor');
    if(a.sparse)fail('Sparse accessors worden niet ondersteund');
    const comp=COMP[a.componentType],n=NCOMP[a.type];if(!comp||!n)fail('Niet-ondersteund gegevenstype');
    const [bytes,Arr,norm]=comp,v=view(a.bufferView),elem=bytes*n,stride=v.stride||elem,base=v.off+(a.byteOffset||0);
    if(a.count*0!==0||a.count<0||a.count>LIMITS.vertices*3)fail('Te veel elementen');
    if(base+(a.count>0?(a.count-1)*stride+elem:0)>v.buf.byteLength)fail('Accessor valt buiten het bestand');
    const out=new (Arr===Float32Array?Float32Array:Arr)(a.count*n),dv=new DataView(v.buf.buffer,v.buf.byteOffset,v.buf.byteLength);
    for(let e=0;e<a.count;e++)for(let c=0;c<n;c++){
      const o=base+e*stride+c*bytes;let val;
      switch(a.componentType){case 5120:val=dv.getInt8(o);break;case 5121:val=dv.getUint8(o);break;case 5122:val=dv.getInt16(o,true);break;case 5123:val=dv.getUint16(o,true);break;case 5125:val=dv.getUint32(o,true);break;default:val=dv.getFloat32(o,true);}
      out[e*n+c]=val;
    }
    return {data:out,n,count:a.count,normalized:!!a.normalized,componentType:a.componentType};
  }
  const scene=(json.scenes||[])[json.scene||0],roots=scene?scene.nodes:(json.nodes||[]).map((_,i)=>i);
  const pos=[],idx=[],col=[],pending=[];let hasColor=false,vcount=0;
  const visit=(ni,parent,depth)=>{
    if(depth>64)fail('Te diepe nodestructuur');
    const n=(json.nodes||[])[ni];if(!n)return;const m=mul(parent,nodeMatrix(n));
    if(n.mesh!=null){
      const mesh=(json.meshes||[])[n.mesh];if(!mesh)fail('Ongeldige mesh');
      for(const pr of mesh.primitives||[]){
        if((pr.mode!=null?pr.mode:4)!==4)continue;
        if(pr.attributes?.POSITION==null)continue;
        const P=readAccessor(pr.attributes.POSITION);if(P.n!==3)fail('Ongeldige positiegegevens');
        if(vcount+P.count>LIMITS.vertices)fail('Model heeft te veel hoekpunten (max '+LIMITS.vertices+')');
        const base=vcount;
        for(let i=0;i<P.count;i++){const x=P.data[i*3],y=P.data[i*3+1],z=P.data[i*3+2];
          pos.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);}
        // kleuren
        const mat=pr.material!=null?(json.materials||[])[pr.material]:null,pbr=mat&&mat.pbrMetallicRoughness||{},f=pbr.baseColorFactor||[1,1,1,1];
        const factor=[clamp255(f[0]*255),clamp255(f[1]*255),clamp255(f[2]*255)];
        let vc=null;
        if(pr.attributes.COLOR_0!=null){const C=readAccessor(pr.attributes.COLOR_0);const div=C.componentType===5126?1:(C.componentType===5121?255:65535);vc=[];for(let i=0;i<C.count;i++)vc.push(clamp255(C.data[i*C.n]/div*255*f[0]),clamp255(C.data[i*C.n+1]/div*255*f[1]),clamp255(C.data[i*C.n+2]/div*255*f[2]));hasColor=true;}
        if(vc)col.push(...vc);else for(let i=0;i<P.count;i++)col.push(factor[0],factor[1],factor[2]);
        // textuur
        const ti=pbr.baseColorTexture&&pbr.baseColorTexture.index;
        if(ti!=null&&pr.attributes.TEXCOORD_0!=null&&!vc){
          const tex=(json.textures||[])[ti],img=tex&&(json.images||[])[tex.source];
          if(img){
            let bytes=null,mime=img.mimeType||'';
            if(img.bufferView!=null){const v=view(img.bufferView);bytes=v.buf.subarray(v.off,v.off+v.len);}
            else if(img.uri){const d=dataUri(img.uri);if(d){bytes=d.bytes;mime=d.mime||mime;}}
            if(bytes&&/^image\/(jpeg|png|webp)$/.test(mime)){const T=readAccessor(pr.attributes.TEXCOORD_0);pending.push({vertexStart:base,vertexCount:P.count,uvs:T.data,image:{mime,bytes},factor});hasColor=true;}
          }
        }
        // indices
        if(pr.indices!=null){const I=readAccessor(pr.indices);for(let i=0;i+2<I.count;i+=3){const a=I.data[i],b=I.data[i+1],c=I.data[i+2];if(a>=P.count||b>=P.count||c>=P.count)fail('Index buiten bereik');idx.push(base+a,base+b,base+c);}}
        else for(let i=0;i+2<P.count;i+=3)idx.push(base+i,base+i+1,base+i+2);
        vcount+=P.count;
        if(idx.length/3>LIMITS.triangles)fail('Model heeft te veel driehoeken');
      }
    }
    for(const c of n.children||[])visit(c,m,depth+1);
  };
  for(const r of roots||[])visit(r,ident(),0);
  if(!idx.length)fail('Geen driehoeken gevonden in het model');
  return {positions:Float32Array.from(pos),indices:Uint32Array.from(idx),colors:Uint8Array.from(col),hasColor,pending,source:'gltf'};
}

function parseGLB(buffer){
  const ab=buffer instanceof ArrayBuffer?buffer:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  if(ab.byteLength>LIMITS.fileBytes)fail('Bestand is te groot (max '+Math.round(LIMITS.fileBytes/1048576)+' MB)');
  if(ab.byteLength<20)fail('Bestand is te klein om een model te zijn');
  const dv=new DataView(ab);
  if(dv.getUint32(0,true)!==0x46546C67)fail('Geen geldig .glb-bestand');
  if(dv.getUint32(4,true)!==2)fail('Alleen glTF-versie 2 wordt ondersteund');
  let off=12,json=null,bin=null;
  while(off+8<=ab.byteLength){
    const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;
    if(off+len>ab.byteLength)fail('Beschadigd .glb-bestand');
    if(type===0x4E4F534A&&!json){try{json=JSON.parse(new TextDecoder().decode(new Uint8Array(ab,off,len)));}catch(e){fail('Beschadigd .glb-bestand (JSON)');}}
    else if(type===0x004E4942&&!bin)bin=new Uint8Array(ab,off,len);
    off+=len+((4-(len%4))%4);
  }
  if(!json)fail('Geen model-gegevens in .glb gevonden');
  return parseGLTF(json,bin);
}

/* Herken en parse op bestandsnaam/inhoud. input: ArrayBuffer of string (obj/gltf). */
function parseAny(name,data){
  const n=String(name||'').toLowerCase();
  if(n.endsWith('.glb')){return parseGLB(data);}
  if(n.endsWith('.gltf')){const t=typeof data==='string'?data:new TextDecoder().decode(data);let j;try{j=JSON.parse(t);}catch(e){fail('Ongeldig .gltf-bestand');}return parseGLTF(j,null);}
  if(n.endsWith('.obj')){return parseOBJ(typeof data==='string'?data:new TextDecoder().decode(data));}
  fail('Niet-ondersteund bestandstype. Gebruik .glb, .gltf (ingebed) of .obj');
}

/* Kleuren uit texturen: sampler(imageBytesObj,u,v)=>[r,g,b]; wordt per pending-blok toegepast op de hoekpunten. */
function applyTextures(mesh,sampler){
  for(const p of mesh.pending||[]){
    for(let i=0;i<p.vertexCount;i++){
      const u=p.uvs[i*2],v=p.uvs[i*2+1];let rgb=null;
      try{rgb=sampler(p.image,u,v);}catch(e){rgb=null;}
      const o=(p.vertexStart+i)*3;
      if(rgb){mesh.colors[o]=rgb[0];mesh.colors[o+1]=rgb[1];mesh.colors[o+2]=rgb[2];}
    }
  }
  mesh.pending=[];return mesh;
}

function bounds(positions){
  const b={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){const v=positions[i+k];if(v<b.min[k])b.min[k]=v;if(v>b.max[k])b.max[k]=v;}
  return b;
}

/* Vertex-clustering decimatie tot maximaal `target` driehoeken (kleuren gemiddeld). */
function decimate(mesh,target){
  target=target||LIMITS.targetTriangles;
  const tri=mesh.indices.length/3;
  if(tri<=target)return {positions:mesh.positions,indices:mesh.indices,colors:mesh.colors,decimated:false,originalTriangles:tri};
  const b=bounds(mesh.positions),ext=Math.max(b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]-b.min[2])||1;
  let res=Math.max(8,Math.round(Math.sqrt(target)*1.2)),best=null;
  for(let attempt=0;attempt<14;attempt++){
    const cell=ext/res,map=new Map(),np=[],sum=[],cnt=[],remap=new Uint32Array(mesh.positions.length/3);
    for(let i=0;i<remap.length;i++){
      const x=mesh.positions[i*3],y=mesh.positions[i*3+1],z=mesh.positions[i*3+2];
      const kx=Math.floor((x-b.min[0])/cell),ky=Math.floor((y-b.min[1])/cell),kz=Math.floor((z-b.min[2])/cell);
      const key=(kx*73856093)^(ky*19349663)^(kz*83492791)^0; // snelle hash; botsingen worden hieronder uitgesloten via strikte sleutel
      const sk=kx+','+ky+','+kz;let id=map.get(sk);
      if(id===undefined){id=np.length/3;map.set(sk,id);np.push(0,0,0);sum.push(0,0,0);cnt.push(0);}
      np[id*3]+=x;np[id*3+1]+=y;np[id*3+2]+=z;sum[id*3]+=mesh.colors[i*3];sum[id*3+1]+=mesh.colors[i*3+1];sum[id*3+2]+=mesh.colors[i*3+2];cnt[id]++;remap[i]=id;void key;
    }
    const idx=[],seen=new Set();
    for(let t=0;t<tri;t++){
      const a=remap[mesh.indices[t*3]],c1=remap[mesh.indices[t*3+1]],d=remap[mesh.indices[t*3+2]];
      if(a===c1||c1===d||a===d)continue;
      const k=[a,c1,d].sort((p,q)=>p-q).join(',');if(seen.has(k))continue;seen.add(k);idx.push(a,c1,d);
    }
    const n=np.length/3,pos=new Float32Array(n*3),colors=new Uint8Array(n*3);
    for(let i=0;i<n;i++){pos[i*3]=np[i*3]/cnt[i];pos[i*3+1]=np[i*3+1]/cnt[i];pos[i*3+2]=np[i*3+2]/cnt[i];colors[i*3]=Math.round(sum[i*3]/cnt[i]);colors[i*3+1]=Math.round(sum[i*3+1]/cnt[i]);colors[i*3+2]=Math.round(sum[i*3+2]/cnt[i]);}
    best={positions:pos,indices:Uint32Array.from(idx),colors,decimated:true,originalTriangles:tri};
    if(idx.length/3<=target)return best;
    res=Math.max(4,Math.floor(res*Math.sqrt(target/(idx.length/3))*0.9));
  }
  return best;
}

/* Standaardplaatsing: midden op het kitchen-grid, laagste punt op de vloer (y=0). Optioneel Z-omhoog (veel scans/OBJ). */
function orient(positions,zUp){
  if(!zUp)return positions;
  const out=new Float32Array(positions.length);
  for(let i=0;i<positions.length;i+=3){out[i]=positions[i];out[i+1]=positions[i+2];out[i+2]=-positions[i+1];}
  return out;
}

/* Transformatie van een scan: schaal, rotatie om de y-as (graden) en verplaatsing. Geeft nieuwe Float32Array wereldcoördinaten. */
function transform(positions,t){
  const s=t.scale||1,r=(t.rotY||0)*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),out=new Float32Array(positions.length);
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i]*s,y=positions[i+1]*s,z=positions[i+2]*s;
    out[i]=x*cs+z*sn+(t.x||0);out[i+1]=y+(t.y||0);out[i+2]=-x*sn+z*cs+(t.z||0);
  }
  return out;
}

return {LIMITS,parseOBJ,parseGLB,parseGLTF,parseAny,applyTextures,decimate,bounds,orient,transform};
});
