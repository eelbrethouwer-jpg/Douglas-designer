const Room=require('../room-space.js');
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const M=require('../model.js'),D=require('../drafting.js');
function start(){
 const nodes=new Map(),events=new Map(),storage=new Map();
 const ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},roundRect(){},clearRect(){},setTransform(){},fillText(){},save(){},restore(){},closePath(){},measureText(t){return {width:String(t).length*6}}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},style:{},innerHTML:'',textContent:'',value:'5',checked:false,firstChild:{textContent:''},width:0,height:0,classList:{add(){},remove(){},toggle(){return false}},setAttribute(){},getContext(){return ctx},getBoundingClientRect(){return {width:900,height:550,left:0,top:0,right:900,bottom:550}},addEventListener(n,f){events.set(id+':'+n,f)},setPointerCapture(){},scrollIntoView(){},click(){}});return nodes.get(id)};
 const document={querySelector:node,querySelectorAll(){return []},addEventListener(n,f){events.set('document:'+n,f)},activeElement:{tagName:'BODY'},body:{classList:{add(){},remove(){}}},createElement(){return node('new')}};
 const window={DouglasModel:M,DouglasRoom:Room,DouglasDrafting:D,innerWidth:1440,devicePixelRatio:1,addEventListener(n,f){events.set('window:'+n,f)},print(){},confirm(){return true}};
 const context={window,document,localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},navigator:{},location:{protocol:'file:'},Intl,Map,Math,JSON,Date,console,setTimeout,clearTimeout,Blob,URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},confirm(){return true}};
 const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const probe=src.replace(/\}\)\(\);\s*$/,String.raw`window.__test={setView,toScreen,getProject:()=>project,setRoomMove,get camera(){return camera},get mode(){return drawMode},get grid(){return gridSize},get magnet(){return magnetEnabled}};})();`);
 assert.notEqual(probe,src);
 vm.runInNewContext(probe,context,{timeout:10000});
 const click=id=>events.get('document:click')({target:{id,dataset:{},closest(sel){return sel==='button'?this:null;}}});
 const pt=(x,y)=>({pointerId:1,offsetX:x,offsetY:y,clientX:x,clientY:y});
 return {events,nodes,storage,api:window.__test,click,pt};
}
test('studio initializes drafting precision and direct controls',()=>{
 const h=start();
 assert.equal(h.api.grid,5);assert.equal(h.api.magnet,true);
 h.events.get('#gridSize:change')({target:{value:'25'}});
 assert.equal(h.api.grid,25);
 h.click('magnetToggle');assert.equal(h.api.magnet,false);
 h.click('magnetToggle');assert.equal(h.api.magnet,true);
});
test('hotkeys activate 2D drawing, select and orthographic views',()=>{
 const h=start();
 const down=h.events.get('window:keydown');
 down({key:'b',ctrlKey:false,metaKey:false,altKey:false});
 assert.equal(h.api.mode,true);
 down({key:'v',ctrlKey:false,metaKey:false,altKey:false});
 assert.equal(h.api.mode,false);
 down({key:'4',ctrlKey:false,metaKey:false,altKey:false});
 assert.ok(h.api.camera.pitch < -1.5);
});
test('2D dragging empty surface pans the drawing rather than orbiting',()=>{
 const h=start();h.click('newFreeProject');h.click('selectTool');
 const before=h.api.toScreen([250,250,0]),yaw=h.api.camera.yaw;
 h.events.get('#scene:pointerdown')(h.pt(150,270));
 h.events.get('#scene:pointermove')(h.pt(195,305));
 h.events.get('#scene:pointerup')(h.pt(195,305));
 const after=h.api.toScreen([250,250,0]);
 assert.ok(Math.abs(after.x-before.x-45)<.01);
 assert.ok(Math.abs(after.y-before.y-35)<.01);
 assert.equal(h.api.camera.yaw,yaw);
});
test('3D dragging empty canvas still orbits the kitchen',()=>{
 const h=start();
 const before=h.api.camera.yaw;
 h.events.get('#scene:pointerdown')(h.pt(100,200));
 h.events.get('#scene:pointermove')(h.pt(155,240));
 h.events.get('#scene:pointerup')(h.pt(155,240));
 assert.notEqual(h.api.camera.yaw,before);
});
test('drawn beam obeys current grid and remains in the cut list',()=>{
 const h=start();h.click('newFreeProject');
 h.events.get('#gridSize:change')({target:{value:'25'}});
 h.events.get('#scene:pointerdown')(h.pt(300,250));
 h.events.get('#scene:pointermove')(h.pt(490,250));
 h.events.get('#scene:pointerup')(h.pt(490,250));
 const saved=JSON.parse(h.storage.get('douglas-designer-v1'));
 assert.equal(saved.beams.length,1);
 assert.equal(saved.beams[0].length%25,0);
 assert.equal(M.boardPlan(saved).pieces,1);
});

test('top view drag moves entire kitchen in room coordinates without changing the cutlist',()=>{
 const h=start(),p=h.api.getProject(),before=M.boardPlan(p).totalLength;
 p.room.enabled=true;
 const x=p.room.placement.x,z=p.room.placement.z;
 assert.equal(h.api.setRoomMove(true),true);
 h.events.get('#scene:pointerdown')(h.pt(300,240));
 h.events.get('#scene:pointermove')(h.pt(370,295));
 h.events.get('#scene:pointerup')(h.pt(370,295));
 assert.ok(p.room.placement.x!==x||p.room.placement.z!==z,'placement changed');
 assert.equal(M.boardPlan(p).totalLength,before);
 const stored=JSON.parse(h.storage.get('douglas-designer-v1'));
 assert.equal(stored.room.placement.x,p.room.placement.x);
});
