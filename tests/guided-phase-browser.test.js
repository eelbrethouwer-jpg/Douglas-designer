const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const activePhase="document.querySelector('.phase-tab.active').dataset.phase";
const index="JSON.parse(localStorage.getItem('douglas-designer-projects-v1'))";
const dataFor=id=>"JSON.parse(localStorage.getItem('douglas-designer-project-v1:'+"+id+"))";

for(const width of [390,768,1400]){
 test(`Start, Ruimte en Ontwerp bij ${width} px`,{
  skip:!process.env.GITHUB_ACTIONS&&!process.env.CHROME_BIN,
  timeout:90000
 },async()=>{
  const b=await launch({mobile:width<=800});
  const phase=async name=>{
   assert.equal(await b.eval(activePhase),name);
   assert.equal(await b.eval("document.querySelectorAll('.phase-tab[aria-pressed=true]').length"),1);
  };
  const tap=async selector=>{
   const point=await b.eval(`(async()=>{
    const button=document.querySelector(${JSON.stringify(selector)});
    if(!button?.getClientRects().length)return;
    button.scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const r=button.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const hit=document.elementFromPoint(x,y);
    return {x,y,reachable:button.contains(hit),hit:hit?.outerHTML.slice(0,180)};
   })()`);
   assert.ok(point?.reachable,`bereikbaar bij ${width} px: ${selector} ${JSON.stringify(point)}`);
   if(width<=800){
    await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
    await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await b.mouse('mousePressed',point.x,point.y);
    await b.mouse('mouseReleased',point.x,point.y);
   }
   await b.eval('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  };
  const set=async(selector,value)=>b.eval(`(()=>{
   const e=document.querySelector(${JSON.stringify(selector)});
   e.value=${JSON.stringify(String(value))};
   e.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  const saved=()=>b.eval(dataFor(`(${index}).activeId`));
  const visible=selector=>b.eval(`Boolean(document.querySelector(${JSON.stringify(selector)})?.getClientRects().length)`);
  const roomField=key=>`#panel-room [data-room="${key}"]`;
  const obstacleField=key=>`#obstacleForm [name="${key}"]`;
  try{
   if(width===768)await b.send('Emulation.setDeviceMetricsOverride',{width,height:1024,deviceScaleFactor:2,mobile:true});
   await b.goto(url);
   await phase('start');
   assert.equal(await visible('#designWorkspace'),false);
   assert.equal(await visible('#modalBackdrop'),false);
   assert.ok(await b.eval(`document.documentElement.scrollWidth <= ${width}`));

   await tap('#welcomeTemplates [data-proj="template:0"]');
   await phase('room');
   const before=await saved();
   const cutPieces=await b.eval("document.querySelector('#statBeams').textContent");
   assert.equal(await visible('#panel-room'),true);
   for(const [key,value] of Object.entries({width:4627,depth:3281,height:2743}))await set(roomField(key),value);
   await set(roomField('height'),'');
   assert.equal(await b.eval(`document.querySelector('${roomField('height')}').value`),'2743');
   if(!before.room.enabled)await tap('#roomEnabled');

   await tap('#addObstacle');
   assert.equal(await visible('#obstacleForm'),true,JSON.stringify(b.errors()));
   await set(obstacleField('name'),'Pilaar <noord>');
   await set(obstacleField('x'),117);
   await set(obstacleField('z'),203);
   await set(obstacleField('width'),213);
   await tap('#obstacleForm [type=submit]');
   const created=(await saved()).room.obstacles[0];
   assert.equal(created.name,'Pilaar <noord>');
   assert.equal(created.x,117);
   assert.equal(created.z,203);
   assert.equal(created.width,213);
   assert.match(await b.eval("document.querySelector('#obstacleList').textContent"),/Pilaar <noord>/);
   await tap('[data-obstacle-edit]');
   await set(obstacleField('height'),1881);
   await tap('#obstacleForm [type=submit]');
   assert.equal((await saved()).room.obstacles[0].height,1881);
   await tap('#roomContinue');
   await phase('design');
   assert.equal(await visible('#scene'),true);
   for(const tool of ['#quickModuleBtn','#quickBeamBtn','#drawTool','#planTool','#scanTool','#measureTool'])
    assert.equal(await visible(tool),true,tool);
   assert.equal(await b.eval("document.querySelector('#statBeams').textContent"),cutPieces);
   assert.deepEqual((await saved()).modules,before.modules);

   const configured=await saved();
   await b.goto(url);
   await tap('[data-phase=room]');
   await phase('room');
   assert.deepEqual(await saved(),configured);
   for(const [key,value] of Object.entries({width:4627,depth:3281,height:2743}))
    assert.equal(await b.eval(`document.querySelector('${roomField(key)}').valueAsNumber`),value);
   await tap('[data-obstacle-edit]');
   await tap('#removeObstacle');
   assert.equal((await saved()).room.obstacles,undefined);
   await tap('#undoBtn');
   assert.deepEqual(await saved(),configured);
   await tap('#redoBtn');
   const firstProject=await saved();

   await tap('[data-phase=start]');
   await phase('start');
   await tap('#newProject');
   await phase('room');
   assert.notEqual((await saved()).id,firstProject.id);
   assert.deepEqual(await b.eval(dataFor(JSON.stringify(firstProject.id))),firstProject);
   await tap('[data-phase=start]');
   await tap(`#startProjects [data-proj="open:${firstProject.id}"]`);
   await phase('design');
   assert.deepEqual(await saved(),firstProject);

   for(const name of ['check','build']){
    await tap(`[data-phase=${name}]`);
    await phase(name);
    assert.equal(await visible('#modalBackdrop'),true);
    await tap('#closeModal');
    await phase('design');
    assert.deepEqual(await saved(),firstProject);
   }
   assert.deepEqual(b.errors(),[]);
  }finally{await b.close();}
 });
}
