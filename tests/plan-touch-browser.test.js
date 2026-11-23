const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('plattegrond: touch-slepen veilig afbreken, pinchzoom en Escape zonder stille mutatie', {
 skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
 timeout: 60000
},async()=>{
 const b=await launch({mobile:true});
 try {
   await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
   const result=await b.eval(`(()=>{
     const P=window.DouglasPlanEditor;
     const original={zones:[{id:'test',name:'Testzone',kind:'open',x:300,z:400,w:2000,d:1500,h:2500,walls:''}],lines:[]};
     let saves=0;
     const ed=P.create({M:window.DouglasModel,document,onChange:()=>saves++});
     ed.open(original);
     const canvas=document.querySelector('.plan-editor.open .pe-canvas');
     canvas.setPointerCapture=()=>{};
     canvas.hasPointerCapture=()=>false;
     canvas.releasePointerCapture=()=>{};
     const start=JSON.stringify(ed._state().plan);
     const view=ed._state().view;
     const center=P.toScreen(view,1300,1150);
     const r=canvas.getBoundingClientRect(),x=r.left+center.x,y=r.top+center.y;
     const send=(name,id,type,cx,cy)=>canvas.dispatchEvent(new PointerEvent(name,{bubbles:true,pointerId:id,pointerType:type,isPrimary:id===11,button:0,clientX:cx,clientY:cy}));
     send('pointerdown',11,'touch',x,y);
     send('pointermove',11,'touch',x+50,y+40);
     const previewChanged=JSON.stringify(ed._state().plan)!==start;
     send('pointerdown',12,'touch',x+130,y+20);
     const revertedAtPinch=JSON.stringify(ed._state().plan)===start;
     const prevScale=ed._state().view.scale;
     send('pointermove',12,'touch',x+210,y+20);
     const zoomed=ed._state().view.scale>prevScale;
     send('pointerup',12,'touch',x+210,y+20);
     send('pointerup',11,'touch',x+50,y+40);
     // Na pinch: normale muis-interactie met onderbroken sleepactie.
     const p2=P.toScreen(ed._state().view,1300,1150);
     const xx=r.left+p2.x,yy=r.top+p2.y;
     send('pointerdown',21,'mouse',xx,yy);
     send('pointermove',21,'mouse',xx+30,yy+20);
     const mousePreview=JSON.stringify(ed._state().plan)!==start;
     send('pointercancel',21,'mouse',xx+30,yy+20);
     const revertedAtCancel=JSON.stringify(ed._state().plan)===start;
     const p3=P.toScreen(ed._state().view,1300,1150);
     send('pointerdown',31,'mouse',r.left+p3.x,r.top+p3.y);
     send('pointermove',31,'mouse',r.left+p3.x+30,r.top+p3.y+20);
     document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Escape'}));
     const revertedAtEscape=JSON.stringify(ed._state().plan)===start;
     send('pointerup',31,'mouse',r.left+p3.x+30,r.top+p3.y+20);
     const persisted=JSON.stringify(ed._state().plan)===start;
     ed.close();
     return {previewChanged,revertedAtPinch,zoomed,mousePreview,revertedAtCancel,revertedAtEscape,persisted,saves,canvasW:r.width};
   })()`);
   assert.ok(result.canvasW>0,'canvas moet daadwerkelijk zichtbaar zijn');
   for(const key of ['previewChanged','revertedAtPinch','zoomed','mousePreview','revertedAtCancel','revertedAtEscape','persisted'])
     assert.equal(result[key],true,key+' '+JSON.stringify(result));
   assert.equal(result.saves,0,'geannuleerde beweging mag geen opslag starten');
   assert.deepEqual(b.errors(),[]);
 }finally{await b.close();}
});
