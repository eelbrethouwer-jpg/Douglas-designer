const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('mobiele plattegrond biedt exact maten bewerken zonder het tekenvlak blijvend te bedekken',{
 skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
 timeout:60000
},async()=>{
 const b=await launch({mobile:true});
 try {
  await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const setup=await b.eval(`(()=>{
   let changes=0;
   window.__mobileChanges=()=>changes;
   const editor=DouglasPlanEditor.create({M:DouglasModel,document,onChange:()=>changes++});
   window.__mobileEditor=editor;
   editor.open({zones:[{id:'z1',name:'Overkapping',kind:'open',x:0,z:0,w:4000,d:3000,h:2500,walls:''}],lines:[]},'Overkapping');
   const pane=document.querySelector('.plan-editor.open .pe-panel');
   const button=document.querySelector('.plan-editor.open [data-pe="details"]');
   return {canvasW:document.querySelector('.plan-editor.open canvas').getBoundingClientRect().width,
    buttonVisible:button.getClientRects().length>0,panelHidden:getComputedStyle(pane).display==='none',
    buttonCollapsed:button.getAttribute('aria-expanded')==='false'};
  })()`);
  assert.ok(setup.canvasW>0,'plattegrond moet zichtbaar zijn');
  assert.ok(setup.buttonVisible,'matenknop moet zichtbaar zijn op mobiel');
  assert.ok(setup.panelHidden,'paneel mag het ontwerp niet standaard blokkeren');
  assert.ok(setup.buttonCollapsed);
  await b.click('.plan-editor.open [data-pe="details"]');
  const shown=await b.eval(`(()=>{
   const p=document.querySelector('.plan-editor.open .pe-panel'),b=document.querySelector('.plan-editor.open [data-pe="details"]');
   return {visible:p.getClientRects().length>0,position:getComputedStyle(p).position,expanded:b.getAttribute('aria-expanded'),depth:document.querySelector('.plan-editor.open [data-pf="d"]').value};
  })()`);
  assert.equal(shown.visible,true);
  assert.equal(shown.position,'absolute');
  assert.equal(shown.expanded,'true');
  assert.equal(shown.depth,'3000');
  await b.eval(`(()=>{
    const inp=document.querySelector('.plan-editor.open [data-pf="d"]');
    inp.value='3500';inp.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  assert.equal(await b.eval('window.__mobileEditor._state().plan.zones[0].d'),3500);
  assert.equal(await b.eval('window.__mobileChanges()'),1);
  await b.click('.plan-editor.open [data-pe="details-close"]');
  assert.equal(await b.eval("getComputedStyle(document.querySelector('.plan-editor.open .pe-panel')).display"),'none');
  await b.click('.plan-editor.open [data-pe="details"]');
  assert.equal(await b.eval("document.querySelector('.plan-editor.open [data-pf=d]').value"),'3500');
  await b.eval('window.__mobileEditor.close(true)');
  assert.deepEqual(b.errors(),[]);
 }finally{await b.close();}
});
