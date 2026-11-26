const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');
test('guided phases preserve saved project on mobile',{skip:!process.env.GITHUB_ACTIONS&&!process.env.CHROME_BIN,timeout:90000},async()=>{
 const b=await launch({mobile:true});
 const click=async s=>assert.ok(await b.click(s),s);
 const saved=()=>b.eval("(()=>{const i=JSON.parse(localStorage.getItem('douglas-designer-projects-v1'));return JSON.parse(localStorage.getItem('douglas-designer-project-v1:'+i.activeId));})()");
 try{
  await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await click('#welcomeTemplates [data-proj="template:0"]');
  const before=await saved();
  for(const phase of ['start','room','design','check','build','design']){
   await click('[data-phase="'+phase+'"]');
   assert.equal(await b.eval("document.querySelector('.phase-tab.active').dataset.phase"),phase);
   assert.equal(await b.eval("document.querySelectorAll('.phase-tab[aria-pressed=true]').length"),1);
   if(['start','check','build'].includes(phase)){
    assert.equal(await b.eval("document.querySelector('#modalBackdrop').classList.contains('hidden')"),false);
    await click('#closeModal');
   }
   if(phase==='room')assert.equal(await b.eval("document.querySelector('#panel-room').classList.contains('hidden')"),false);
   if(phase==='design')assert.equal(await b.eval("document.querySelector('#stageArea').classList.contains('hidden')"),false);
   assert.deepEqual(await saved(),before);
  }
  assert.deepEqual(b.errors(),[]);
 }finally{await b.close();}
});
