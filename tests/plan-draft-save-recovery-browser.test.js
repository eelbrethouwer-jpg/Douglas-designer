const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch,sleep}=require('../tools/browser-check.js');

test('schetsopslagfout toont herstel, back-up werkt en gebruiker kan opnieuw opslaan en importeren',{
 skip:!process.env.GITHUB_ACTIONS&&!process.env.CHROME_BIN,
 timeout:90000
},async()=>{
 const b=await launch({mobile:true});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'douglas-plan-backup-'));
 try{
  await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await b.click('#welcomeTemplates [data-proj="template:0"]');
  await b.click('#roomContinue');
  await b.eval(`(()=>{
   window.__originalSetItem=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(key==='douglas-designer-plan-draft-v1')throw new DOMException('Quota exceeded','QuotaExceededError');
    return window.__originalSetItem.call(this,key,value);
   };
  })()`);
  await b.click('#planTool');
  const initial=await b.eval("!!document.querySelector('.plan-editor.open [data-pe-preset]')");
  assert.equal(initial,true,'plattegrondeditor moet openen');
  await b.eval(`(()=>{
    const s=document.querySelector('.plan-editor.open [data-pe-preset]');
    s.value=s.querySelectorAll('option')[1].value;
    s.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  const failure=await b.eval(`(()=>{
   const w=document.querySelector('.plan-editor.open .pe-save-failure');
   return {visible:!w.hidden,alert:w.getAttribute('role'),zones:DouglasPlanEditorInstance.getPlan().zones.length};
  })()`);
  assert.equal(failure.visible,true,'geen stille opslagfout');
  assert.equal(failure.alert,'alert');
  assert.ok(failure.zones>0);
  await b.downloadsTo(dir);
  await b.click('.plan-editor.open [data-pe="download-plan"]');
  await sleep(800);
  const files=fs.readdirSync(dir).filter(x=>x.endsWith('.json'));
  assert.ok(files.length,'schets moet te downloaden zijn');
  const saved=JSON.parse(fs.readFileSync(path.join(dir,files[0]),'utf8'));
  assert.equal(saved.zones.length,failure.zones);
  assert.ok(Array.isArray(saved.lines));

  // Test dat een eerder gedownloade schets opnieuw geïmporteerd kan worden.
  const alternative=path.join(dir,'herstel-schets.json');
  fs.writeFileSync(alternative,JSON.stringify({zones:[{id:'z-test',name:'Herstelde overkapping',kind:'open',x:0,z:0,w:3100,d:2800,h:2500,walls:''}],lines:[]}));
  await b.uploadFile('.plan-editor.open [data-pe-import]',[alternative]);
  await sleep(300);
  assert.equal(await b.eval("DouglasPlanEditorInstance.getPlan().zones[0].w"),3100);
  assert.equal(await b.eval("document.querySelector('.plan-editor.open .pe-save-failure').hidden"),false);

  await b.eval("Storage.prototype.setItem=window.__originalSetItem");
  await b.click('.plan-editor.open [data-pe="retry-save"]');
  assert.equal(await b.eval("document.querySelector('.plan-editor.open .pe-save-failure').hidden"),true);
  const durable=await b.eval("JSON.parse(localStorage.getItem('douglas-designer-plan-draft-v1'))");
  assert.equal(durable.zones[0].w,3100);
  assert.deepEqual(b.errors(),[]);
 }finally{
  try{await b.eval("if(window.__originalSetItem)Storage.prototype.setItem=window.__originalSetItem");}catch(_){}
  await b.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
