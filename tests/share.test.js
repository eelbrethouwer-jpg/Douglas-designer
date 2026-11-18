const test=require('node:test');const assert=require('node:assert/strict');
const S=require('../share.js');const M=require('../model.js');
const JPG='data:image/jpeg;base64,/9j/4AAQSkZJRg==';

test('link: project → link → project (rondreis) en gecomprimeerd kleiner dan JSON',async()=>{
 const p=M.demoProject(),payload=S.buildProjectPayload(p,1),json=JSON.stringify(payload);
 const data=await S.encodeLinkData(payload);assert.ok(data.startsWith('z.'));assert.ok(data.length<json.length*0.8,'verwacht compressie '+data.length+' vs '+json.length);
 const back=await S.decodeLinkData(data);assert.deepEqual(back,payload);
 const v=S.validate(back);assert.equal(v.ok,true);assert.equal(v.type,'project');assert.equal(v.summary.modules,3);
 const url=S.linkFor('https://x.nl/app/index.html#oud',data);assert.equal(url,'https://x.nl/app/index.html#share='+data);assert.equal(S.dataFromHash('#share='+data),data);
 assert.equal(S.dataFromHash('#iets'),null);assert.equal(S.dataFromHash('#share=a b'),null);
});
test('projectpayload bevat nooit foto\'s of referenties en muteert het origineel niet',()=>{
 const p=M.normalizeProject({...M.demoProject(),reference:{notes:'n',photos:[JPG]}});p.room={photo:JPG,corners:[[0,0]],width:4000};
 const pl=S.buildProjectPayload(p);assert.equal(pl.project.room.photo,null);assert.deepEqual(pl.project.room.corners,[]);assert.equal(pl.project.reference,undefined);
 assert.equal(p.room.photo,JPG);assert.ok(p.reference);assert.ok(!JSON.stringify(pl).includes('/9j/'));
});
test('link-decodering weigert rommel, te lange links en zip-bommen',async()=>{
 await assert.rejects(()=>S.decodeLinkData('x.abc'),/Onbekend/);
 await assert.rejects(()=>S.decodeLinkData('z.$$$'),/Ongeldige/);
 await assert.rejects(()=>S.decodeLinkData('u.'+'A'.repeat(S.LIMITS.hash)),/te lang/);
 await assert.rejects(()=>S.decodeLinkData('z.AAAA'));
 const bomb=S.toB64Url(await (async()=>{const cs=new CompressionStream('deflate-raw'),w=cs.writable.getWriter();w.write(new Uint8Array(40*1024*1024));w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer());})());
 assert.ok(bomb.length<S.LIMITS.hash,'bom moet klein genoeg zijn om als link te passen: '+bomb.length);
 await assert.rejects(()=>S.decodeLinkData('z.'+bomb),/te groot/);
 await assert.rejects(()=>S.decodeLinkData(''),/Onbekend/);
});
test('validate: onbekend formaat/versie/type en onvolledig project worden geweigerd',()=>{
 for(const bad of [null,5,{},{format:'x'},{format:S.FORMAT,v:2,t:'project'},{format:S.FORMAT,v:1,t:'iets'},{format:S.FORMAT,v:1,t:'project',project:{}},{format:S.FORMAT,v:1,t:'project',project:{modules:'nee'}}])
  assert.equal(S.validate(bad).ok,false,JSON.stringify(bad));
 assert.equal(S.validate({format:S.FORMAT,v:1,t:'aanlevering'}).ok,false);
});
test('aanlevering: maten worden begrensd, onzin wordt null, nooit geraden',()=>{
 const d=S.sanitizeDelivery({room:{width:'4500',depth:'abc',height:99999},name:'  Tuin  '});
 assert.deepEqual(d.room,{width:4500,depth:null,height:6500});assert.equal(d.name,'Tuin');
 assert.deepEqual(S.sanitizeDelivery({room:{width:5,depth:'',height:null}}).room,{width:1200,depth:null,height:null});
 assert.deepEqual(S.sanitizeDelivery(null).room,{width:null,depth:null,height:null});
});
test('aanlevering: alleen echte JPEG-foto\'s, max 4, begrensde grootte; opmerking wordt schoongemaakt',()=>{
 const svg='data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Lz48L3N2Zz4=',png='data:image/png;base64,iVBOR=',big='data:image/jpeg;base64,'+'A'.repeat(S.LIMITS.photoChars);
 const d=S.sanitizeDelivery({photos:[JPG,svg,png,big,JPG,JPG,JPG,JPG,5,null],notes:'a\u0000b\u0007c\n'+'x'.repeat(5000)});
 assert.equal(d.photos.length,4);assert.ok(d.photos.every(p=>S.JPEG.test(p)));assert.equal(d.droppedPhotos,6);
 assert.ok(!d.notes.includes('\u0000')&&!d.notes.includes('\u0007'));assert.equal(d.notes.length,2000);assert.ok(d.notes.startsWith('abc\n'));
 const v=S.validate({format:S.FORMAT,v:1,t:'aanlevering',photos:[JPG],room:{width:3000}});assert.equal(v.ok,true);assert.equal(v.summary.photos,1);
 assert.match(S.deliverySummaryText(v.summary),/3000 × \? × \? mm.*1 foto/);
});
test('aanlevering bouwen en weer valideren (rondreis via link zonder foto\'s)',async()=>{
 const pl=S.buildDeliveryPayload({name:'Terras',room:{width:4200,depth:3100,height:2600},notes:'Ik sta bij de schuur'});
 const back=await S.decodeLinkData(await S.encodeLinkData(pl));const v=S.validate(back);
 assert.equal(v.ok,true);assert.deepEqual(v.summary.room,{width:4200,depth:3100,height:2600});assert.equal(v.summary.notes,'Ik sta bij de schuur');
});
test('toepassen: ruimtematen, eerste foto als ruimtefoto, referenties; muteert niets; rest blijft staan',()=>{
 const p=M.demoProject();p.room={enabled:false,width:4500,depth:3200,height:2700,photo:null,corners:[[0.1,0.1]],floorColor:'#c5c5b9'};
 const d=S.sanitizeDelivery({name:'Tuin',room:{width:5000,depth:null,height:2500},notes:'let op de goot',photos:[JPG,JPG]});
 const before=JSON.stringify(p),out=S.applyDelivery(p,d);assert.equal(JSON.stringify(p),before);
 assert.equal(out.room.width,5000);assert.equal(out.room.depth,3200,'niet-aangeleverde maat blijft');assert.equal(out.room.height,2500);assert.equal(out.room.enabled,true);
 assert.equal(out.room.photo,JPG);assert.deepEqual(out.room.corners,[]);assert.equal(out.room.floorColor,'#c5c5b9');
 assert.equal(out.reference.photos.length,2);assert.equal(out.reference.notes,'Tuin: let op de goot');
 const two=S.applyDelivery(out,S.sanitizeDelivery({notes:'tweede',photos:[JPG,JPG,JPG]}));assert.equal(two.reference.photos.length,4,'maximaal 4 foto\'s');assert.match(two.reference.notes,/Tuin: let op de goot\n\ntweede/);
 const notesOnly=S.applyDelivery(M.demoProject(),S.sanitizeDelivery({notes:'alleen tekst'}));assert.ok(!notesOnly.room||notesOnly.room.enabled!==true);
});
test('model: referentie wordt genormaliseerd (alleen JPEG, begrensd) en ontbreekt als leeg',()=>{
 assert.equal(M.normalizeProject(M.demoProject()).reference,undefined);
 const p=M.normalizeProject({...M.demoProject(),reference:{notes:'  hoi\u0000 ',photos:[JPG,'data:image/png;base64,AAAA','javascript:alert(1)',JPG,JPG,JPG,JPG]}});
 assert.equal(p.reference.notes,'hoi');assert.equal(p.reference.photos.length,4);assert.ok(p.reference.photos.every(x=>x===JPG));
 assert.equal(M.normalizeProject({...M.demoProject(),reference:{notes:'',photos:['x']}}).reference,undefined);
});
