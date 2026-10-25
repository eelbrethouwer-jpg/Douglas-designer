const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const R=require('../room-space.js');
const M=require('../model.js');
function studio({legacyCommit=false,saved=true}={}){
 const listeners=new Map(),nodes=new Map(),calls={rects:0,fileClicks:0,views:[]};
 const ctx={clearRect(){},fillRect(){calls.rects++},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},fillText(){},save(){},restore(){},translate(){},rotate(){},ellipse(){},arc(){},drawImage(){},setTransform(){}};
 const getElement=id=>{
  if(!nodes.has(id)){
   let classes=new Set(['hidden']);
   const item={id,innerHTML:'',textContent:'',value:'',style:{},checked:false,dataset:{},width:360,height:226,
    className:'',
    classList:{add(k){classes.add(k)},remove(k){classes.delete(k)},contains(k){return classes.has(k)},toggle(k,flag){if(flag===undefined)flag=!classes.has(k);flag?classes.add(k):classes.delete(k);return flag}},
    setAttribute(){},focus(){},getContext(){return ctx},getBoundingClientRect(){return {width:360,height:226,left:0,top:0}},
    addEventListener(type,cb){listeners.set(id+':'+type,cb)},
    insertAdjacentHTML(){},click(){calls.fileClicks++},
    toDataURL(){return 'data:image/jpeg;base64,AQ=='}
   };
   nodes.set(id,item);
  }
  return nodes.get(id);
 };
 const document={querySelector:getElement,querySelectorAll(){return []},
  createElement(type){if(type==='canvas'){const c=getElement('created-canvas');return c;}return getElement('created-'+type);},
  body:{append(){},classList:{add(){},remove(){},toggle(){}}},
  addEventListener(type,cb){const old=listeners.get('document:'+type);listeners.set('document:'+type,old?(e)=>{old(e);cb(e)}:cb);}
 };
 const window={DouglasRoom:R,DouglasModel:M};
 class ImageMock{
  constructor(){this.width=780;this.height=600;this.complete=true;}
  set src(value){this._src=value;this.onload?.();}
 }
 const context={window,document,DouglasRoom:R,DouglasModel:M,Image:ImageMock,console,Map,Math,Intl,JSON,Number,Date,URL:{createObjectURL(){return 'blob:test-image'},revokeObjectURL(){}},setTimeout,clearTimeout};
 const source=fs.readFileSync(path.join(__dirname,'../room-studio.js'),'utf8');
 vm.runInNewContext(source,context,{timeout:10000});
 let p=M.demoProject();p.room=R.normalizeRoom(null,p);p.style=R.normalizeStyle(null);
 context.DouglasRoomStudio.mount({
  getProject:()=>p,
  commit(fn){
   const before=JSON.stringify(p);
   if(legacyCommit)fn();else fn(p);
   context.DouglasRoomStudio.refresh();
   return before!==JSON.stringify(p);
  },
  render(){},setView(view){calls.views.push(view)},setRoomMove(){return true},
  toast(message){calls.toast=message},isSaved(){return saved}
 });
 return {listeners,nodes,calls,project:()=>p};
}
test('room studio mounts a visible top-down room and actionable materials',()=>{
 const h=studio();
 assert.match(h.nodes.get('#finishCollections').innerHTML,/Douglas naturel/);
 assert.match(h.nodes.get('#finishCollections').innerHTML,/Graniet zwart/);
 assert.ok(h.calls.rects>0,'renders room and kitchen footprint');
 assert.match(h.nodes.get('#roomMiniSize').textContent,/4\.500/);
});
test('gallery and camera are separate deliberate file-pickers',()=>{
 const h=studio();
 h.listeners.get('#roomCaptureOpen:click')();
 assert.match(h.nodes.get('#roomCaptureStatus').textContent,/Kies een foto/);
 h.listeners.get('#roomChoosePhoto:click')();
 h.listeners.get('#roomTakePhoto:click')();
 assert.equal(h.calls.fileClicks,2);
});
test('upload JPEG preview populates room photo, and material click updates project style',()=>{
 const h=studio();
 h.listeners.get('#roomCaptureOpen:click')();
 const fileControl={files:[{type:'image/png',size:3000}],value:'picture'};
 h.listeners.get('#roomImageInput:change')({target:fileControl});
 assert.match(h.project().room.photo,/^data:image\/jpeg;base64,/);
 assert.equal(fileControl.value,'');
 assert.match(h.nodes.get('#roomCaptureStatus').textContent,/Foto toegevoegd/);
 h.listeners.get('document:click')({target:{closest(selector){return selector==='[data-finish]'?{dataset:{finish:'top',finishId:'top-2'}}:null;}}});
 assert.equal(h.project().style.top,'top-2');
 assert.match(h.nodes.get('#finishCollections').innerHTML,/top-2" class="finish-choice active"/);
});
test('room measurements visibly change floorplan and room dimensions without changing timber',()=>{
 const h=studio();
 const timber=M.boardPlan(h.project()).totalLength;
 h.listeners.get('document:change')({target:{
   dataset:{room:'width'},value:'6100',
   closest(selector){return selector==='#panel-room,#roomCaptureDialog'?true:false},
   matches(selector){return selector==='[data-room]';}
 }});
 assert.equal(h.project().room.width,6100);
 assert.match(h.nodes.get('#roomMiniSize').textContent,/6\.100/);
 assert.equal(M.boardPlan(h.project()).totalLength,timber);
});

test('reproduced iPhone screenshot: Room Capture saves a chosen photo with legacy commit(fn) calling fn() without p',()=>{
 const h=studio({legacyCommit:true});
 h.listeners.get('#roomCaptureOpen:click')();
 const fileControl={files:[{type:'image/jpeg',size:5000}],value:'chosen'};
 assert.doesNotThrow(()=>h.listeners.get('#roomImageInput:change')({target:fileControl}));
 assert.match(h.project().room.photo,/^data:image\/jpeg;base64,/);
 assert.match(h.nodes.get('#roomCaptureStatus').textContent,/Foto toegevoegd en lokaal opgeslagen/);
 assert.doesNotMatch(h.nodes.get('#roomCaptureStatus').textContent,/undefined|p\.room/);
 const sketchBefore=M.boardPlan(h.project()).totalLength;
 h.listeners.get('document:change')({target:{
   dataset:{room:'width'},value:'6200',
   closest(selector){return selector==='#panel-room,#roomCaptureDialog'},
   matches(selector){return selector==='[data-room]';}
 }});
 assert.equal(h.project().room.width,6200);
 h.listeners.get('document:click')({target:{closest(selector){
  return selector==='[data-finish]'?{dataset:{finish:'wood',finishId:'wood-3'}}:null;
 }}});
 assert.equal(h.project().style.wood,'wood-3');
 assert.equal(M.boardPlan(h.project()).totalLength,sketchBefore);
});
test('photo processing warns clearly when the browser cannot persist a picked photo',()=>{
 const h=studio({legacyCommit:true,saved:false});
 h.listeners.get('#roomCaptureOpen:click')();
 h.listeners.get('#roomImageInput:change')({target:{files:[{type:'image/jpeg',size:100}],value:''}});
 assert.match(h.nodes.get('#roomCaptureStatus').textContent,/kon niet worden opgeslagen/);
});

function photoPointer(h,type,x,y,pointerId=1){
 const canvas=h.nodes.get('#roomPhotoCanvas');
 const event={pointerId,clientX:x,clientY:y,currentTarget:canvas,preventDefault(){this.prevented=true}};
 h.listeners.get('#roomPhotoCanvas:'+type)(event);
 return event;
}
function supplyPhoto(h){
 h.listeners.get('#roomCaptureOpen:click')();
 h.listeners.get('#roomImageInput:change')({target:{files:[{type:'image/jpeg',size:3000}],value:'photo.jpg'}});
}
function placeCorner(h,x,y,id=1){
 photoPointer(h,'pointerdown',x,y,id);
 photoPointer(h,'pointerup',x,y,id);
}
test('after all four room floor points exist, a finger drag repositions a marker and keeps photo',()=>{
 const h=studio();
 supplyPhoto(h);
 const coords=[[40,40],[290,40],[280,180],[55,185]];
 for(const p of coords)placeCorner(h,...p);
 const before=h.project().room.corners.map(p=>[...p]),photo=h.project().room.photo;
 assert.equal(before.length,4);
 photoPointer(h,'pointerdown',290,40);
 photoPointer(h,'pointermove',240,92);
 // Changes are local while dragging: no repeated undo/persistence on every pointermove.
 assert.equal(h.project().room.corners[1][0],before[1][0]);
 photoPointer(h,'pointerup',240,92);
 assert.ok(Math.abs(h.project().room.corners[1][0]-240/360)<.001);
 assert.ok(Math.abs(h.project().room.corners[1][1]-92/226)<.001);
 assert.deepEqual(Array.from(h.project().room.corners[0]),before[0]);
 assert.deepEqual(Array.from(h.project().room.corners[2]),before[2]);
 assert.equal(h.project().room.photo,photo);
 assert.match(h.nodes.get('#roomPhotoInstruction').textContent,/sleep een punt/i);
});
test('tap a numbered handle and then another spot to reposition that same floor corner',()=>{
 const h=studio({legacyCommit:true});
 supplyPhoto(h);
 for(const p of [[40,40],[290,40],[280,180],[55,185]])placeCorner(h,...p);
 const otherPoints=h.project().room.corners.map(p=>[...p]);
 placeCorner(h,55,185); // select existing point 4
 assert.deepEqual(Array.from(h.project().room.corners[3]),otherPoints[3]);
 assert.match(h.nodes.get('#roomPhotoInstruction').textContent,/Punt 4 gekozen/);
 placeCorner(h,140,138); // reposition selected point 4 with no continuous drag
 assert.ok(Math.abs(h.project().room.corners[3][0]-140/360)<.001);
 assert.deepEqual(Array.from(h.project().room.corners[0]),otherPoints[0]);
});
test('dedicated point-number buttons can choose a marker and a new tap changes its location',()=>{
 const h=studio();supplyPhoto(h);
 for(const p of [[40,40],[290,40],[280,180],[55,185]])placeCorner(h,...p);
 const current=h.project().room.corners.map(p=>[...p]);
 h.listeners.get('#roomCornerTools:click')({target:{closest(q){return q==='[data-corner]'?{dataset:{corner:'1'},disabled:false}:null;}}});
 placeCorner(h,220,120);
 assert.ok(Math.abs(h.project().room.corners[1][0]-220/360)<.001);
 assert.deepEqual(Array.from(h.project().room.corners[0]),current[0]);
 assert.deepEqual(Array.from(h.project().room.corners[2]),current[2]);
 assert.deepEqual(Array.from(h.project().room.corners[3]),current[3]);
});
test('drag cancelled by iOS pointercancel discards movement, and off-photo drop clamps coordinates',()=>{
 const h=studio();supplyPhoto(h);
 placeCorner(h,100,80);
 const previous=Array.from(h.project().room.corners[0]);
 photoPointer(h,'pointerdown',100,80);
 photoPointer(h,'pointermove',250,190);
 photoPointer(h,'pointercancel',250,190);
 assert.deepEqual(Array.from(h.project().room.corners[0]),previous);
 photoPointer(h,'pointerdown',100,80);
 photoPointer(h,'pointermove',900,-200);
 photoPointer(h,'pointerup',900,-200);
 assert.deepEqual(Array.from(h.project().room.corners[0]),[1,0]);
});
test('photo preview remains guarded by four points and corner drag does not affect cutlist',()=>{
 const h=studio();const cut=M.boardPlan(h.project()).totalLength;
 supplyPhoto(h);
 h.listeners.get('#roomPhotoPreview:click')();
 assert.equal(h.project().room.corners.length,0);
 for(const p of [[40,40],[290,40],[280,180],[55,185]])placeCorner(h,...p);
 photoPointer(h,'pointerdown',55,185);
 photoPointer(h,'pointermove',65,172);
 photoPointer(h,'pointerup',65,172);
 assert.equal(M.boardPlan(h.project()).totalLength,cut);
 assert.match(h.project().room.photo,/^data:image\/jpeg;base64,/);
});
