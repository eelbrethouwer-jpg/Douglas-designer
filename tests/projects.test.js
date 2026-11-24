const test=require('node:test');const assert=require('node:assert/strict');
const P=require('../projects.js');
function fakeStorage(limit=Infinity){const m=new Map();let size=0;
 return {m,getItem:k=>m.has(k)?m.get(k):null,
  setItem(k,v){v=String(v);const next=size-(m.has(k)?m.get(k).length:0)+v.length;if(next>limit){const e=new Error('quota');e.name='QuotaExceededError';throw e;}size=next;m.set(k,v);},
  removeItem(k){if(m.has(k)){size-=m.get(k).length;m.delete(k);}},key:i=>[...m.keys()][i]??null,get length(){return m.size;}};}
const proj=(name,extra={})=>({id:undefined,name,modules:[{kind:'open',width:500}],beams:[],version:1,...extra});
let t=1000;const mk=(s)=>P.createStore(s,{now:()=>++t});

test('lege opslag: eerste start maakt standaardproject en bewaart het',()=>{
 const s=fakeStorage(),st=mk(s),r=st.init(()=>proj('Start'));
 assert.equal(r.created,true);assert.equal(r.project.name,'Start');assert.equal(st.list().length,1);assert.equal(st.activeId(),r.id);
 assert.ok(r.id);assert.equal(st.load(r.id).name,'Start');
});
test('migratie: bestaand enkelvoudig project wordt overgenomen en het oude item blijft onaangeroerd',()=>{
 const s=fakeStorage(),legacy=JSON.stringify(proj('Mijn buitenkeuken',{id:'old-1',width:1875}));s.setItem(P.LEGACY_KEY,legacy);
 const st=mk(s),r=st.init(()=>proj('NIET GEBRUIKEN'));
 assert.equal(r.migrated,true);assert.equal(r.project.name,'Mijn buitenkeuken');assert.equal(r.id,'old-1');
 assert.equal(s.getItem(P.LEGACY_KEY),legacy,'legacy-back-up mag nooit veranderen');
 const again=mk(s).init(()=>proj('x'));assert.equal(again.migrated,false);assert.equal(mk(s).list().length,1);
});
test('beschadigd legacy-item wordt niet overschreven en niet als project gebruikt',()=>{
 const s=fakeStorage();s.setItem(P.LEGACY_KEY,'{kapot');const r=mk(s).init(()=>proj('Nieuw'));
 assert.equal(r.created,true);assert.equal(s.getItem(P.LEGACY_KEY),'{kapot');
});
test('opslaan werkt naam en tijd bij; id-botsing bij aanmaken krijgt een nieuw id',()=>{
 const s=fakeStorage(),st=mk(s),a=st.init(()=>proj('A')).id,u0=st.list()[0].updatedAt;
 const r=st.save(a,{...st.load(a),name:'A2'});assert.equal(r.ok,true);assert.equal(st.list()[0].name,'A2');assert.ok(st.list()[0].updatedAt>u0);
 const c=st.create(proj('B',{id:a}));assert.equal(c.ok,true);assert.notEqual(c.id,a);assert.equal(st.load(a).name,'A2','origineel niet overschreven');
 assert.equal(st.activeId(),c.id);assert.equal(st.list().length,2);
});
test('dupliceren maakt onafhankelijke kopie; hernoemen werkt en begrenst de naam',()=>{
 const st=mk(fakeStorage()),a=st.init(()=>proj('Keuken',{beams:[{id:'b1'}]})).id;
 const d=st.duplicate(a);assert.equal(d.ok,true);assert.equal(st.load(d.id).name,'Keuken (kopie)');assert.notEqual(st.load(d.id).id,a);
 st.save(d.id,{...st.load(d.id),beams:[]});assert.equal(st.load(a).beams.length,1);
 st.rename(a,'  '+'x'.repeat(200));assert.equal(st.load(a).name.length,80);st.rename(a,'   ');assert.equal(st.load(a).name.length,80,'lege naam wijzigt niets');
 assert.equal(st.duplicate('bestaat-niet').ok,false);
});
test('verwijderen gaat via prullenbak en is terug te zetten; actief project schuift door',()=>{
 const st=mk(fakeStorage()),a=st.init(()=>proj('A')).id,b=st.create(proj('B')).id;
 const r=st.trash(b);assert.equal(r.ok,true);assert.equal(r.activeId,a);assert.equal(st.list().length,1);assert.equal(st.trashList().length,1);
 const back=st.restore(st.trashList()[0].trashId);assert.equal(back.ok,true);assert.equal(st.load(back.id).name,'B');assert.equal(st.trashList().length,0);
 st.trash(a);const last=st.trash(back.id);assert.equal(last.activeId,null,'laatste project weg: aanroeper maakt nieuw project');
 assert.equal(st.trash('nope').ok,false);
});
test('prullenbak is begrensd op 5 en een mislukte schrijfactie verwijdert niets',()=>{
 const st=mk(fakeStorage());st.init(()=>proj('0'));for(let i=1;i<=7;i++){const id=st.create(proj('p'+i)).id;st.trash(id);}
 assert.equal(st.trashList().length,5);assert.equal(st.trashList()[0].name,'p7');
 const s=fakeStorage(600),q=mk(s),a=q.init(()=>proj('A')).id,b=q.create(proj('B')).id;
 s.setItem('vul','x'.repeat(600-[...s.m.values()].reduce((n,v)=>n+v.length,0)+ (s.m.get('vul')||'').length));
 const r=q.trash(b);assert.equal(r.ok,false);assert.ok(q.load(b),'project bleef bestaan');
});
test('opslag vol: save/create melden een fout in plaats van stil te falen',()=>{
 const s=fakeStorage(400),st=mk(s),a=st.init(()=>proj('A')).id;
 const r=st.save(a,{...proj('A'),pad:'x'.repeat(2000)});assert.equal(r.ok,false);assert.match(r.error,/vol/);
 assert.equal(st.load(a).name,'A','oude versie blijft intact');
 assert.equal(st.create(proj('B',{pad:'y'.repeat(2000)})).ok,false);assert.equal(st.list().length,1);
 assert.equal(mk(fakeStorage(10)).init(()=>proj('Z')).storageError,true);
});
test('zelfherstel: kapotte index wordt opnieuw opgebouwd uit projectitems',()=>{
 const s=fakeStorage(),st=mk(s),a=st.init(()=>proj('A')).id,b=st.create(proj('B')).id;
 s.setItem(P.INDEX_KEY,'{kapot');const st2=mk(s);assert.deepEqual(st2.list().map(x=>x.name).sort(),['A','B']);assert.ok(st2.activeId());
 s.setItem(P.INDEX_KEY,JSON.stringify({version:1,activeId:'weg',items:[{id:'weg',name:'spook'},{id:a,name:'A'}]}));
 const st3=mk(s);assert.deepEqual(st3.list().map(x=>x.id),[a]);assert.equal(st3.activeId(),a);
});
test('volledige back-up: export en import voegt toe en overschrijft nooit',()=>{
 const s1=fakeStorage(),a=mk(s1);a.init(()=>proj('A'));a.create(proj('B'));
 const dump=a.exportAll();assert.equal(JSON.parse(dump).projects.length,2);
 const s2=fakeStorage(),b=mk(s2);b.init(()=>proj('Bestaand'));
 const r=b.importAll(dump);assert.deepEqual([r.ok,r.added,r.skipped],[true,2,0]);assert.equal(b.list().length,3);assert.ok(b.list().some(x=>x.name==='Bestaand'));
 assert.equal(b.importAll('niet json').ok,false);assert.equal(b.importAll(JSON.stringify({format:'x',projects:[]})).ok,false);
 assert.equal(b.importAll(JSON.stringify({format:P.BACKUP_FORMAT,projects:[{naam:'zonder modules'},5,null]})).skipped,3);
});
test('setActive en list: alleen bestaande projecten; nieuwste bovenaan',()=>{
 const st=mk(fakeStorage()),a=st.init(()=>proj('A')).id,b=st.create(proj('B')).id;
 assert.equal(st.setActive('nope'),false);assert.equal(st.setActive(a),true);assert.equal(st.activeId(),a);
 st.save(b,{...st.load(b),name:'B2'});assert.equal(st.list()[0].id,b);assert.ok(st.list()[0].bytes>0);
});

test('dupliceren en importeren wijzigen het actieve project niet; aanmaken en terugzetten wel',()=>{
 const st=mk(fakeStorage()),a=st.init(()=>proj('A')).id;
 const d=st.duplicate(a);assert.equal(d.ok,true);assert.equal(st.activeId(),a,'kopie mag niet actief worden');
 const dump=st.exportAll();st.importAll(dump);assert.equal(st.activeId(),a);assert.equal(st.list().length,4);
 const c=st.create(proj('Nieuw'));assert.equal(st.activeId(),c.id);
 const gone=st.trash(c.id);assert.ok(gone.activeId&&gone.activeId!==c.id&&st.load(gone.activeId),'actief schuift door naar een bestaand project');
 const back=st.restore(st.trashList()[0].trashId);assert.equal(st.activeId(),back.id);
});

test('grote back-up wordt volledig geïmporteerd, ook voorbij honderd projecten',()=>{
 const st=mk(fakeStorage()), old=st.init(()=>proj('Bestaand')).id;
 const projects=Array.from({length:105},(_,i)=>proj('Werkstuk '+(i+1)));
 const result=st.importAll(JSON.stringify({format:P.BACKUP_FORMAT,projects}));
 assert.deepEqual(result,{ok:true,added:105,skipped:0});
 assert.equal(st.list().length,106);
 assert.equal(st.activeId(),old);
});

test('mislukte back-upimport kan opnieuw zonder deelimport of dubbele projecten',()=>{
 for(const failAt of [2,3]){
  const storage=fakeStorage(),st=mk(storage);
  st.init(()=>proj('Huidig'));
  const before=[...storage.m],setItem=storage.setItem;
  let writes=0;
  storage.setItem=(key,value)=>{
   if(++writes===failAt)throw Object.assign(new Error(),{name:'QuotaExceededError'});
   setItem(key,value);
  };
  const text=JSON.stringify({format:P.BACKUP_FORMAT,projects:[proj('A'),proj('B')]});
  assert.equal(st.importAll(text).added,0);
  assert.deepEqual([...storage.m],before);
  assert.equal(st.importAll(text).added,2);
  assert.equal(st.list().length,3);
 }
});

test('verwijderfout bewaart het project en laat de index intact',()=>{
 const s=fakeStorage(),st=mk(s),a=st.init(()=>proj('Bewaard')).id;
 const original=s.removeItem;
 s.removeItem=(key)=>{if(key===P.PROJECT_PREFIX+a)throw new Error('SecurityError');return original(key);};
 const r=st.trash(a);
 assert.equal(r.ok,false);
 assert.match(r.error,/Verwijderen/);
 assert.equal(st.load(a).name,'Bewaard');
 assert.equal(st.list().length,1);
 assert.equal(st.activeId(),a);
 s.removeItem=original;
 assert.equal(st.trash(a).ok,true,'opnieuw proberen moet lukken');
 assert.equal(st.load(a),null);
});

test('herhaaldelijk mislukte verwijdering verdringt geen oude prullenbakprojecten',()=>{
 const s=fakeStorage(),st=mk(s),a=st.init(()=>proj('Blijft')).id;
 for(let i=1;i<=5;i++){
  const id=st.create(proj('Oud '+i)).id;
  assert.equal(st.trash(id).ok,true);
 }
 const previous=s.getItem(P.TRASH_KEY),trashIds=st.trashList().map(x=>x.trashId);
 assert.equal(trashIds.length,5);
 const original=s.removeItem;
 s.removeItem=key=>{
  if(key===P.PROJECT_PREFIX+a)throw new Error('SecurityError');
  return original(key);
 };
 for(let i=0;i<10;i++){
  const result=st.trash(a);
  assert.equal(result.ok,false);
  assert.equal(st.load(a).name,'Blijft');
  assert.equal(st.list().length,1);
  assert.equal(s.getItem(P.TRASH_KEY),previous,'mislukte poging mag prullenbak niet wijzigen');
  assert.deepEqual(st.trashList().map(x=>x.trashId),trashIds);
 }
 s.removeItem=original;
 assert.equal(st.trash(a).ok,true,'na herstel mag verwijderen lukken');
 assert.equal(st.load(a),null);
 assert.equal(st.list().length,0);
 assert.equal(st.trashList().length,5);
 assert.equal(st.trashList().filter(x=>x.id===a).length,1);
 assert.deepEqual(st.trashList().slice(1).map(x=>x.trashId),trashIds.slice(0,4));
});

test('mislukte verwijdering zonder bestaande prullenbak laat geen spookkopie achter',()=>{
 const s=fakeStorage(),st=mk(s),id=st.init(()=>proj('Huidig')).id;
 const original=s.removeItem;
 s.removeItem=key=>{if(key===P.PROJECT_PREFIX+id)return;return original(key);};
 for(let n=0;n<3;n++){
  const r=st.trash(id);
  assert.equal(r.ok,false,'zelfs stilzwijgende removeItem zonder effect moet worden gedetecteerd');
  assert.equal(s.getItem(P.TRASH_KEY),null);
  assert.equal(st.load(id).name,'Huidig');
  assert.equal(st.activeId(),id);
 }
});
