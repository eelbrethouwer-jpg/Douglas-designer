const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Model=require('../model.js');

function editor(){
  const events=new Map(),nodes=new Map(),storage=new Map();
  const ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},roundRect(){},clearRect(){},setTransform(){},fillText(){},save(){},restore(){},closePath(){},measureText(s){return {width:String(s).length*6}}};
  function el(id){if(!nodes.has(id))nodes.set(id,{
    id,value:'',checked:false,innerHTML:'',textContent:'',dataset:{},style:{},firstChild:{textContent:''},
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},
    getContext(){return ctx},getBoundingClientRect(){return {width:800,height:520}},setPointerCapture(){},scrollIntoView(){},click(){},toBlob(f){f({})},
    addEventListener(name,fn){events.set(id+':'+name,fn)}
  });return nodes.get(id)}
  const document={querySelector:el,querySelectorAll(){return []},addEventListener(n,fn){events.set('document:'+n,fn)},activeElement:{tagName:'BODY'},body:{classList:{add(){},remove(){}}},createElement(){return el('created')}};
  const window={DouglasModel:Model,innerWidth:1400,devicePixelRatio:1,addEventListener(n,f){events.set('window:'+n,f)},confirm(){return true},print(){}};
  const sandbox={window,document,confirm(){return true},navigator:{},location:{protocol:'file:'},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},Intl,console,Map,Math,JSON,Date,setTimeout,clearTimeout,Blob,URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}}};
  // Production app stays encapsulated; test-only hook exposes coordinates and scene geometry.
  const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const augmented=src.replace(/\}\)\(\);\s*$/,`window.__probe={
    setProject(p){project=p;render()},setView,select:setSelected,screen:toScreen,
    scene(){return shapes},getProject(){return project}
  };})();`);
  assert.notEqual(src,augmented);
  vm.runInNewContext(augmented,sandbox,{timeout:10000});
  return {api:window.__probe,events,stored:()=>JSON.parse(storage.get('douglas-designer-v1'))};
}

function move(editor,from,to){
  const down=editor.events.get('#scene:pointerdown'),drag=editor.events.get('#scene:pointermove'),up=editor.events.get('#scene:pointerup');
  const e=(pt)=>({pointerId:1,offsetX:pt.x,offsetY:pt.y,clientX:pt.x,clientY:pt.y});
  down(e(from));
  for(let j=1;j<=8;j++)drag(e({x:from.x+(to.x-from.x)*j/8,y:from.y+(to.y-from.y)*j/8}));
  up(e(to));
}

test('countertop is tiled into depth-sortable opaque faces, including when tilted',()=>{
  const h=editor();
  const p=Model.demoProject();h.api.setProject(p);
  h.api.setView('top');
  const faces=h.api.scene().filter(face=>face.owner===null&&String(face.fill).startsWith('rgb('));
  assert.ok(faces.length>100,`expected subdivided top, got ${faces.length} polygons`);
  assert.ok(faces.some(face=>face.stroke===face.fill),'tiles cover antialias seams');
  assert.ok(faces.every(face=>face.verts.length===4));
});

test('moving the same beam twice recalculates fit and cut length on each drop',()=>{
  const h=editor(),p=Model.freeProject();
  p.width=2000;p.height=1200;p.depth=1000;
  for(const x of [100,600,1050,1600])p.beams.push({id:'post-'+x,name:'Staander',axis:'y',x,y:0,z:0,length:800});
  p.beams.push({id:'move-1',name:'Regel',axis:'x',x:150,y:200,z:20,length:450});
  h.api.setProject(p);h.api.setView('front');h.api.select('beam','move-1');
  const pt=(x)=>h.api.screen([x,250,45]);
  move(h,pt(375),pt(1325));
  let beam=h.api.getProject().beams.find(x=>x.id==='move-1');
  assert.equal(beam.x,1100,'first move to right-hand opening');
  assert.equal(beam.length,500,'first move fits 500 mm');
  const firstLength=beam.length;
  move(h,pt(1350),pt(375));
  beam=h.api.getProject().beams.find(x=>x.id==='move-1');
  assert.equal(beam.x,150,'second move back to left-hand opening');
  assert.equal(beam.length,450,'second move refits 450 mm');
  assert.equal(h.stored().beams.find(x=>x.id==='move-1').length,450,'saved project matches');
  assert.equal(Model.boardPlan(h.api.getProject()).groups.find(x=>x.name==='Regel').length,450,'cut list updates');
  assert.notEqual(firstLength,beam.length);
});