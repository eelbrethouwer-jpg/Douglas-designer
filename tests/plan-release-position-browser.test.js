const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('plattegrond gebruikt daadwerkelijke loslaatpositie ook zonder laatste pointermove',{
 skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
 timeout:60000
},async()=>{
 const b=await launch({mobile:true});
 try{
  await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const result=await b.eval(`(()=>{
    const PE=DouglasPlanEditor;
    let changes=0;
    const editor=PE.create({M:DouglasModel,document,onChange:()=>changes++});
    editor.open({zones:[{id:'z1',name:'Test',kind:'open',x:300,z:300,w:2000,d:1500,h:2500,walls:''}],lines:[]},'Testplan');
    const canvas=document.querySelector('.plan-editor.open .pe-canvas');
    canvas.setPointerCapture=()=>{};
    canvas.hasPointerCapture=()=>false;
    canvas.releasePointerCapture=()=>{};
    const rect=canvas.getBoundingClientRect();
    const pixel=(x,z)=>{const p=PE.toScreen(editor._state().view,x,z);return {x:rect.left+p.x,y:rect.top+p.y};};
    const send=(name,id,point)=>canvas.dispatchEvent(new PointerEvent(name,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:true,button:0,clientX:point.x,clientY:point.y}));
    const initial=editor._state().plan.zones[0],oldX=initial.x;
    const center=pixel(initial.x+initial.w/2,initial.z+initial.d/2);
    const end={x:center.x+55,y:center.y+30};
    const expectedX=Math.round((initial.x+55/editor._state().view.scale)/100)*100;
    send('pointerdown',11,center);
    send('pointerup',11,end); // bewust géén pointermove
    const moved=editor._state().plan.zones[0].x;
    const movedRight=moved===expectedX&&moved!==oldX;
    document.querySelector('.plan-editor.open [data-pe=undo]').click();
    const restored=editor._state().plan.zones[0].x===oldX;
    const zone=editor._state().plan.zones[0],oldW=zone.w,oldD=zone.d,corner=pixel(zone.x+zone.w,zone.z+zone.d);
    send('pointerdown',12,corner);
    send('pointerup',12,{x:corner.x+25,y:corner.y+30}); // resize zonder pointermove
    const larger=editor._state().plan.zones[0].w>oldW&&editor._state().plan.zones[0].d>oldD;
    editor.close(true);
    return {movedRight,restored,larger,changes,canvasWidth:rect.width};
  })()`);
  assert.ok(result.canvasWidth>0);
  assert.equal(result.movedRight,true,JSON.stringify(result));
  assert.equal(result.restored,true,JSON.stringify(result));
  assert.equal(result.larger,true,JSON.stringify(result));
  assert.equal(result.changes,3);
  assert.deepEqual(b.errors(),[]);
 }finally{await b.close();}
});
