const Room=require('../room-space.js');
const Draft=require('../drafting.js');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../model.js');
test('frame members have stable identities across redraw and normalization',()=>{
 const p=M.demoProject(),first=M.framePieces(p);
 assert.equal(first.length,28);
 assert.equal(new Set(first.map(b=>b.id)).size,first.length);
 assert.deepEqual(first.map(b=>b.id),M.framePieces(M.normalizeProject(JSON.parse(JSON.stringify(p)))).map(b=>b.id));
});
test('frame override changes position and length and persists without changing loose beams',()=>{
 const p=M.demoProject(),b=M.framePieces(p).find(b=>b.id==='frame-rail-0-top-front');
 const previous=M.boardPlan(p).totalLength;
 assert(M.editFrameBeam(p,b.id,{x:b.x+25,y:b.y-30,length:b.length-100}));
 const next=M.framePieces(p).find(x=>x.id===b.id);
 assert.equal(next.x,b.x+25);assert.equal(next.y,b.y-30);assert.equal(next.length,b.length-100);
 assert.equal(M.boardPlan(p).totalLength,previous-100);
 const saved=M.normalizeProject(JSON.parse(JSON.stringify(p)));
 assert.deepEqual(saved.frameEdits,p.frameEdits);
 assert.equal(M.framePieces(saved).find(x=>x.id===b.id).length,b.length-100);
 assert.equal(saved.beams.length,0);
});
test('frame removal is reflected in cutlist and is reversible',()=>{
 const p=M.demoProject(),initial=M.boardPlan(p);
 assert(M.editFrameBeam(p,'frame-post-0-front',{disabled:true}));
 assert.equal(M.framePieces(p).length,27);
 assert.equal(M.boardPlan(p).pieces,initial.pieces-1);
 assert(M.warnings(p).some(x=>x.includes('verwijderd')));
 assert(M.restoreFrameBeam(p,'frame-post-0-front'));
 assert.equal(M.boardPlan(p).pieces,initial.pieces);
});
test('frame override does not detach every other automatic member',()=>{
 const p=M.demoProject();
 M.editFrameBeam(p,'frame-post-0-front',{length:720});
 const untouched=M.framePieces(p).find(x=>x.id==='frame-post-1-front');
 assert.equal(untouched.length,p.height-125);
 M.resizeProject(p,2300);
 assert.equal(M.framePieces(p).find(x=>x.id==='frame-post-1-front').length,p.height-125);
 assert.equal(M.framePieces(p).find(x=>x.id==='frame-post-0-front').length,720);
});
test('invalid edits never fabricate a frame member',()=>{
 const p=M.freeProject();
 assert.equal(M.editFrameBeam(p,'frame-post-0-front',{length:800}),false);
 assert.equal(M.framePieces(p).length,0);
});
function harness(){
 const nodes=new Map(),events=new Map(),storage=new Map(),handles=[];
 const ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(x,y,r){if(r===9)handles.push({x,y})},roundRect(){},clearRect(){},setTransform(){},fillText(){},save(){},restore(){},closePath(){},measureText(t){return {width:String(t).length*6}}};
 const el=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},style:{},innerHTML:'',textContent:'',value:'',checked:false,firstChild:{textContent:''},width:0,height:0,classList:{add(){},remove(){},toggle(){}},setAttribute(){},getContext(){return ctx},getBoundingClientRect(){return {width:800,height:520,left:0,top:0,right:800,bottom:520}},addEventListener:(e,cb)=>events.set(id+':'+e,cb),setPointerCapture(){},scrollIntoView(){},click(){},toBlob(cb){cb({})}});return nodes.get(id)};
 const doc={querySelector:el,querySelectorAll:()=>[],addEventListener:(e,cb)=>events.set('document:'+e,cb),activeElement:{tagName:'BODY'},body:{classList:{add(){},remove(){}}},createElement:()=>el('created')};
 const win={DouglasModel:M,DouglasRoom:Room,DouglasDrafting:Draft,innerWidth:1400,devicePixelRatio:1,addEventListener:(e,cb)=>events.set('window:'+e,cb),confirm:()=>true,print(){}};
 const ctxVM={window:win,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{},location:{protocol:'file:'},console,Map,Date,Intl,Math,JSON,setTimeout,clearTimeout,Blob,URL:{createObjectURL(){return 'blob'},revokeObjectURL(){}},confirm:()=>true};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctxVM,{timeout:10000});
 const click=id=>events.get('document:click')({target:{id,dataset:{},closest(sel){return sel==='button'?this:null;}}});
 const select=id=>events.get('document:click')({target:{id:'',dataset:{selectFrame:id},closest(sel){return sel==='[data-select-frame]'?this:null;}}});
 const stored=()=>JSON.parse(storage.get('douglas-designer-v1'));
 return {nodes,events,handles,click,select,stored};
}
test('select and edit an automatic member updates inspector, undo and persisted cut list',()=>{
 const h=harness(),p=h.stored(),first=M.framePieces(p).find(x=>x.id==='frame-post-0-front');
 h.select(first.id);
 assert.match(h.nodes.get('#inspectorBody').innerHTML,/AUTOMATISCHE FRAMEBALK/);
 h.events.get('#inspector:change')({target:{dataset:{edit:'length'},value:'700'}});
 assert.equal(h.stored().frameEdits[first.id].length,700);
 assert.equal(M.boardPlan(h.stored()).totalLength,M.boardPlan(p).totalLength-(first.length-700));
 h.click('undoBtn');assert.equal(M.framePieces(h.stored()).find(x=>x.id===first.id).length,first.length);
 h.click('redoBtn');assert.equal(M.framePieces(h.stored()).find(x=>x.id===first.id).length,700);
});
test('frame members can be disabled and entire frame restored',()=>{
 const h=harness();h.select('frame-rail-1-top-front');h.click('deleteSelected');
 assert.equal(M.framePieces(h.stored()).length,27);
 h.click('restoreAllFrames');
 assert.equal(M.framePieces(h.stored()).length,28);
 assert.deepEqual(h.stored().frameEdits,{});
});
