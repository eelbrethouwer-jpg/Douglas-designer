const test=require('node:test');
const assert=require('node:assert/strict');
const Mesh=require('../mesh-import.js');

function makeGLB(json,bin){
  const j=Buffer.from(JSON.stringify(json));const jp=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,0x20)]);
  const bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const total=12+8+jp.length+8+bp.length,out=Buffer.alloc(total);
  out.writeUInt32LE(0x46546C67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
  out.writeUInt32LE(jp.length,12);out.writeUInt32LE(0x4E4F534A,16);jp.copy(out,20);
  const o=20+jp.length;out.writeUInt32LE(bp.length,o);out.writeUInt32LE(0x004E4942,o+4);bp.copy(out,o+8);
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
function quadGLB(extraNode){
  const pos=Buffer.alloc(48);[[0,0,0],[2,0,0],[2,0,3],[0,0,3]].forEach((v,i)=>v.forEach((c,k)=>pos.writeFloatLE(c,i*12+k*4)));
  const idx=Buffer.alloc(12);[0,1,2,0,2,3].forEach((v,i)=>idx.writeUInt16LE(v,i*2));
  const bin=Buffer.concat([pos,idx]);
  const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,translation:[10,5,-1],...(extraNode||{})}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}}],
    buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:48},{buffer:0,byteOffset:48,byteLength:12}],
    accessors:[{bufferView:0,componentType:5126,count:4,type:'VEC3'},{bufferView:1,componentType:5123,count:6,type:'SCALAR'}]};
  return makeGLB(json,bin);
}

test('GLB: positie, indices, nodetransformatie en kleur uit materiaal',()=>{
  const m=Mesh.parseGLB(quadGLB());
  assert.equal(m.positions.length,12);assert.equal(m.indices.length,6);
  assert.deepEqual(Array.from(m.positions.slice(3,6)),[12,5,-1]);
  assert.deepEqual(Array.from(m.colors.slice(0,3)),[255,0,0]);
  assert.deepEqual(Mesh.bounds(m.positions),{min:[10,5,-1],max:[12,5,2]});
});
test('GLB: schaal en rotatie in nodes worden toegepast',()=>{
  const m=Mesh.parseGLB(quadGLB({scale:[2,2,2],rotation:[0,0,0,1],translation:[0,0,0]}));
  assert.deepEqual(Array.from(m.positions.slice(3,6)),[4,0,0]);
});
test('GLB: foutieve en kwaadaardige invoer geeft duidelijke fouten',()=>{
  assert.throws(()=>Mesh.parseGLB(new ArrayBuffer(8)),/te klein/);
  assert.throws(()=>Mesh.parseGLB(new Uint8Array(40).buffer),/geen geldig/i);
  const good=Buffer.from(quadGLB());const cut=good.subarray(0,good.length-20);
  assert.throws(()=>Mesh.parseGLB(cut.buffer.slice(cut.byteOffset,cut.byteOffset+cut.length)),/Beschadigd/);
  const bad=Buffer.from(quadGLB());bad.writeUInt32LE(99,4);assert.throws(()=>Mesh.parseGLB(bad.buffer.slice(bad.byteOffset,bad.byteOffset+bad.length)),/versie 2/);
  assert.throws(()=>Mesh.parseGLTF({asset:{},extensionsRequired:['KHR_draco_mesh_compression']},null),/compressie/);
  // index buiten bereik
  const g=Buffer.from(quadGLB());const at=g.indexOf(Buffer.from([0,0,1,0,2,0]));
  assert.ok(at>0);g.writeUInt16LE(77,at);assert.throws(()=>Mesh.parseGLB(g.buffer.slice(g.byteOffset,g.byteOffset+g.length)),/Index buiten bereik/);
  // lusstructuur in nodes
  const j={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{children:[0]}]};assert.throws(()=>Mesh.parseGLTF(j,null),/diepe|driehoeken/);
});
test('OBJ: vlakken worden gevouwen, negatieve indices, kleuren en fouten',()=>{
  const m=Mesh.parseOBJ('# test\nv 0 0 0 1 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1/1/1 2 3 4\nf -4 -3 -2\n');
  assert.equal(m.positions.length,12);assert.equal(m.indices.length/3,3);assert.deepEqual(Array.from(m.colors.slice(0,3)),[255,0,0]);
  assert.throws(()=>Mesh.parseOBJ('v 0 0 0\nf 1 2 3'),/niet-bestaand/);
  assert.throws(()=>Mesh.parseOBJ('v a b c'),/hoekpunten/);
  assert.throws(()=>Mesh.parseOBJ('v 0 0 0\nv 1 0 0'),/geen vlakken/);
  assert.throws(()=>Mesh.parseOBJ('v 0 0 0\nf 0 0 0'),/Ongeldige vlakken/);
});
test('parseAny kiest op extensie en weigert onbekende types',()=>{
  assert.equal(Mesh.parseAny('x.OBJ','v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3').indices.length,3);
  assert.equal(Mesh.parseAny('a.glb',quadGLB()).indices.length,6);
  assert.throws(()=>Mesh.parseAny('a.exe',new ArrayBuffer(4)),/Niet-ondersteund/);
});
test('decimate: houdt het maximum aan, behoudt geldige indices en kleuren',()=>{
  const N=120,pos=[],col=[],idx=[];
  for(let y=0;y<=N;y++)for(let x=0;x<=N;x++){pos.push(x,Math.sin(x/9)*3,y);col.push(x%255,y%255,100);}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const a=y*(N+1)+x;idx.push(a,a+1,a+N+1,a+1,a+N+2,a+N+1);}
  const mesh={positions:Float32Array.from(pos),indices:Uint32Array.from(idx),colors:Uint8Array.from(col)};
  const d=Mesh.decimate(mesh,5000);
  assert.equal(d.decimated,true);assert.ok(d.indices.length/3<=5000&&d.indices.length>300,String(d.indices.length/3));
  assert.ok(d.indices.every(i=>i<d.positions.length/3));assert.equal(d.colors.length,d.positions.length);
  assert.equal(d.originalTriangles,N*N*2);
  const small=Mesh.decimate({positions:Float32Array.from([0,0,0,1,0,0,0,1,0]),indices:Uint32Array.from([0,1,2]),colors:Uint8Array.from(new Array(9).fill(1))},5000);
  assert.equal(small.decimated,false);
});
test('transform en orient: schaal, rotatie om y, verplaatsing, Z-omhoog',()=>{
  const p=Float32Array.from([1,0,0,0,0,1]);
  const t=Mesh.transform(p,{scale:2,rotY:90,x:10,y:5,z:-1});
  assert.ok(Math.abs(t[0]-10)<1e-4&&Math.abs(t[1]-5)<1e-4&&Math.abs(t[2]-(-1-2))<1e-4,Array.from(t).join());
  assert.ok(Math.abs(t[3]-(10+2))<1e-4&&Math.abs(t[5]+1)<1e-4);
  const o=Mesh.orient(Float32Array.from([1,2,3]),true);assert.deepEqual(Array.from(o),[1,3,-2]);
  assert.equal(Mesh.orient(p,false),p);
});
test('applyTextures zet hoekpuntkleuren uit een sampler en wist pending',()=>{
  const m={colors:new Uint8Array(9),pending:[{vertexStart:1,vertexCount:2,uvs:Float32Array.from([0,0,1,1]),image:{},factor:[0,0,0]}]};
  Mesh.applyTextures(m,(img,u,v)=>[u*255,v*255,9]);
  assert.deepEqual(Array.from(m.colors),[0,0,0,0,0,9,255,255,9]);assert.equal(m.pending.length,0);
});
