const Draft=require('../drafting.js');
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../model.js');
function harness(){
 const nodes=new Map(),listeners=new Map(),store=new Map(),handles=[];
 const ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(x,y,r){if(r===9)handles.push({x,y,r})},roundRect(){},clearRect(){},setTransform(){},fillText(){},save(){},restore(){},closePath(){},measureText(t){return {width:String(t).length*6}}};
 function el(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'',checked:false,dataset:{},style:{},firstChild:{textContent:''},width:0,height:0,classList:{add(){},remove(){},toggle(){return false}},setAttribute(){},getContext(){return ctx},getBoundingClientRect(){return {width:800,height:520,left:0,top:0,right:800,bottom:520}},addEventListener(event,cb){listeners.set(id+':'+event,cb)},setPointerCapture(){},scrollIntoView(){},click(){},toBlob(fn){fn({})}});return nodes.get(id);}
 const document={querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener:(event,fn)=>listeners.set('document:'+event,fn),activeElement:{tagName:'BODY'},body:{classList:{add(){},remove(){}}},createElement:()=>el('created')};
 const window={DouglasModel:M,DouglasDrafting:Draft,innerWidth:1300,devicePixelRatio:1,addEventListener:(event,fn)=>listeners.set('window:'+event,fn),confirm:()=>true,print(){}};
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const sandbox={window,document,confirm:()=>true,navigator:{},location:{protocol:'file:'},localStorage:storage,Intl,console,Map,Math,JSON,Date,setTimeout,clearTimeout,Blob,URL:{createObjectURL(){return 'blob'},revokeObjectURL(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),sandbox,{timeout:10000});
 return {nodes,listeners,handles,project:()=>JSON.parse(store.get('douglas-designer-v1')),click(id){listeners.get('document:click')({target:{id,dataset:{},closest(q){return q==='button'?this:null}}})}};
}
test('empty-canvas welcome action and pointer drafting persist manual beam',()=>{
 const h=harness();h.click('newFreeProject');
 const free=h.project();assert.equal(free.modules.length,0);assert.equal(free.countertop,false);
 const down=h.listeners.get('#scene:pointerdown'),move=h.listeners.get('#scene:pointermove'),up=h.listeners.get('#scene:pointerup');
 function ev(x,y){return {pointerId:1,offsetX:x,offsetY:y,clientX:x,clientY:y}}
 down(ev(300,240));move(ev(500,240));up(ev(500,240));
 const p=h.project();assert.equal(p.modules.length,0);assert.equal(p.beams.length,1);
 assert.equal(p.beams[0].axis,'x');assert(p.beams[0].length>100);
 const length=p.beams[0].length;
 h.click('undoBtn');assert.equal(h.project().beams.length,0);
 h.click('redoBtn');assert.equal(h.project().beams.length,1);
 assert.equal(h.project().beams[0].length,length);
});

test('selected beam exposes 2 draggable endpoints and resizing updates cutlist with undo',()=>{
 const h=harness();h.click('newFreeProject');
 const down=h.listeners.get('#scene:pointerdown'),move=h.listeners.get('#scene:pointermove'),up=h.listeners.get('#scene:pointerup');
 function ev(x,y){return {pointerId:4,offsetX:x,offsetY:y,clientX:x,clientY:y}}
 down(ev(300,240));move(ev(500,240));up(ev(500,240));
 const initial=h.project().beams[0].length;
 const endpoints=h.handles.slice(-2);assert.equal(endpoints.length,2);
 const end=endpoints[1];
 down(ev(end.x,end.y));move(ev(end.x+70,end.y));up(ev(end.x+70,end.y));
 const after=h.project();assert.equal(after.beams.length,1);assert(after.beams[0].length>initial,`${after.beams[0].length} must exceed ${initial}`);
 h.click('undoBtn');assert.equal(h.project().beams[0].length,initial);
});