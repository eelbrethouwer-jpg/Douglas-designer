const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('mobiele template: exacte modulemaat blijft behouden na bovenaanzicht, 3D en herladen',{
  skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
  timeout:90000
},async()=>{
  const b=await launch({mobile:true});
  const page=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  const saved=()=>b.eval("(()=>{const i=JSON.parse(localStorage.getItem('douglas-designer-projects-v1'));return JSON.parse(localStorage.getItem('douglas-designer-project-v1:'+i.activeId));})()");
  const click=async selector=>{
    assert.ok(await b.eval(`document.querySelector(${JSON.stringify(selector)})?.getClientRects().length>0`),selector);
    assert.ok(await b.click(selector),selector);
  };
  try{
    await b.goto(page);
    await click('#welcomeTemplates [data-proj="template:0"]');
    const before=await saved(),id=before.modules[0].id;
    const width=before.modules[0].width===1237?1241:1237;
    await click('[data-mobile="modules"]');
    await click('[data-select-module="'+id+'"]');
    await click('#editSelectionBtn');
    await b.eval(`(()=>{const e=document.querySelector('[data-edit="width"]');e.value='${width}';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const edited=await saved();
    assert.equal(edited.modules.find(m=>m.id===id).width,width);
    assert.equal(edited.modules.length,before.modules.length);
    await click('#closeInspector');
    await click('[data-view="top"]');
    assert.equal(await b.eval("document.querySelector('.view-btn.selected').dataset.view"),'top');
    await click('[data-view="3d"]');
    assert.equal(await b.eval("document.querySelector('.view-btn.selected').dataset.view"),'3d');
    await b.eval("localStorage.removeItem('douglas-designer-welcome-v2')");
    await b.goto(page);
    await click('#continueProject');
    assert.deepEqual(await saved(),edited);
    await click('[data-mobile="modules"]');
    await click('[data-select-module="'+id+'"]');
    await click('#editSelectionBtn');
    assert.equal(await b.eval("Number(document.querySelector('[data-edit=width]').value)"),width);
    assert.deepEqual(b.errors(),[]);
  }finally{await b.close();}
});
