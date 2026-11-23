/* Douglas Designer — Fase 1: plattegrond schetsen in 2D (SketchUp-stijl).
   Blokken (zones) en lijnen (wanden) tekenen met de muis, verslepen en vergroten/verkleinen via grepen.
   Pure logica (hit-test, resize, snappen) staat los van de DOM en is testbaar in Node.
   Eenheden: mm. Plattegrond: x naar rechts, z naar beneden (achterzijde = z 0, bovenaan). */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DouglasPlanEditor=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';

const MIN_BLOCK=300,HANDLE_PX=8,HIT_PX=10;
const HANDLES=['nw','n','ne','e','se','s','sw','w'];
const round=(v,step)=>step>0?Math.round(v/step)*step:Math.round(v);
const clampN=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/* ---------- pure logica ---------- */
function rectEdges(items){ // kandidaten voor magneet: alle x- en z-waarden van blokken en lijnen
  const xs=new Set(),zs=new Set();
  for(const q of items.zones||[]){xs.add(q.x);xs.add(q.x+q.w);zs.add(q.z);zs.add(q.z+q.d);}
  for(const l of items.lines||[]){xs.add(l.x1);xs.add(l.x2);zs.add(l.z1);zs.add(l.z2);}
  return {xs:[...xs],zs:[...zs]};
}
// Snap een waarde: eerst op bestaande randen (binnen tolerantie in mm), anders op het raster.
function snapValue(v,candidates,gridStep,tolMm){
  let best=null,bd=tolMm;
  for(const c of candidates||[]){const d=Math.abs(c-v);if(d<=bd){bd=d;best=c;}}
  return best!==null?{v:best,magnet:true}:{v:round(v,gridStep),magnet:false};
}
function snapPoint(pt,edges,gridStep,tolMm,useMagnet=true){
  const sx=snapValue(pt.x,useMagnet?edges.xs:[],gridStep,tolMm),sz=snapValue(pt.z,useMagnet?edges.zs:[],gridStep,tolMm);
  return {x:sx.v,z:sz.v,magnetX:sx.magnet,magnetZ:sz.magnet};
}
// Rechthoek uit twee sleeppunten (willekeurige hoek); None als te klein.
function blockFromDrag(a,b,min=MIN_BLOCK){
  const x=Math.min(a.x,b.x),z=Math.min(a.z,b.z),w=Math.abs(b.x-a.x),d=Math.abs(b.z-a.z);
  return w>=min&&d>=min?{x,z,w,d}:null;
}
// Lijn uit twee sleeppunten: altijd haaks (langs de overheersende as).
function lineFromDrag(a,b,min=MIN_BLOCK){
  const dx=b.x-a.x,dz=b.z-a.z;
  if(Math.abs(dx)>=Math.abs(dz)){return Math.abs(dx)>=min?{x1:a.x,z1:a.z,x2:b.x,z2:a.z}:null;}
  return Math.abs(dz)>=min?{x1:a.x,z1:a.z,x2:a.x,z2:b.z}:null;
}
function handlePoints(r){
  const cx=r.x+r.w/2,cz=r.z+r.d/2,x2=r.x+r.w,z2=r.z+r.d;
  return {nw:[r.x,r.z],n:[cx,r.z],ne:[x2,r.z],e:[x2,cz],se:[x2,z2],s:[cx,z2],sw:[r.x,z2],w:[r.x,cz]};
}
// Verander een rechthoek door een greep naar punt p te slepen; de tegenoverliggende zijde blijft staan.
function resizeRect(r,handle,p,min=MIN_BLOCK){
  let x0=r.x,z0=r.z,x1=r.x+r.w,z1=r.z+r.d;
  if(handle.includes('w'))x0=Math.min(p.x,x1-min);
  if(handle.includes('e'))x1=Math.max(p.x,x0+min);
  if(handle.includes('n'))z0=Math.min(p.z,z1-min);
  if(handle.includes('s'))z1=Math.max(p.z,z0+min);
  return {x:x0,z:z0,w:x1-x0,d:z1-z0};
}
// Hit-test in schermpixels. view={scale,ox,oz}: px = ox + x*scale, py = oz + z*scale. selection = {type,id}|null.
function toScreen(view,x,z){return {x:view.ox+x*view.scale,y:view.oz+z*view.scale};}
function toWorld(view,px,py){return {x:(px-view.ox)/view.scale,z:(py-view.oz)/view.scale};}
function distToSegment(p,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;let t=l2?((p.x-a.x)*vx+(p.y-a.y)*vy)/l2:0;t=clampN(t,0,1);
  return Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy));
}
function hitTest(plan,view,px,py,selection,handleRadius=HANDLE_PX){
  const P={x:px,y:py};
  // grepen van de selectie eerst
  if(selection){
    if(selection.type==='zone'){
      const z=(plan.zones||[]).find(q=>q.id===selection.id);
      if(z){const hp=handlePoints(z);for(const h of HANDLES){const s=toScreen(view,hp[h][0],hp[h][1]);if(Math.abs(s.x-px)<=handleRadius&&Math.abs(s.y-py)<=handleRadius)return {kind:'handle',type:'zone',id:z.id,handle:h};}}
    }else if(selection.type==='line'){
      const l=(plan.lines||[]).find(q=>q.id===selection.id);
      if(l){for(const [h,x,z] of [['a',l.x1,l.z1],['b',l.x2,l.z2]]){const s=toScreen(view,x,z);if(Math.abs(s.x-px)<=handleRadius&&Math.abs(s.y-py)<=handleRadius)return {kind:'handle',type:'line',id:l.id,handle:h};}}
    }
  }
  // lijnen vóór blokken (liggen er meestal bovenop)
  const lines=plan.lines||[];
  for(let i=lines.length-1;i>=0;i--){const l=lines[i],a=toScreen(view,l.x1,l.z1),b=toScreen(view,l.x2,l.z2);if(distToSegment(P,a,b)<=HIT_PX)return {kind:'item',type:'line',id:l.id};}
  const zones=plan.zones||[];
  // kleinste blok eerst als blokken overlappen/genest zijn
  const inside=zones.filter(q=>{const a=toScreen(view,q.x,q.z),b=toScreen(view,q.x+q.w,q.z+q.d);return px>=a.x&&px<=b.x&&py>=a.y&&py<=b.y;});
  if(inside.length){inside.sort((p,q)=>p.w*p.d-q.w*q.d);return {kind:'item',type:'zone',id:inside[0].id};}
  return null;
}
function cursorFor(hit){
  if(!hit)return 'default';if(hit.kind==='item')return 'move';
  const h=hit.handle;if(hit.type==='line')return 'crosshair';
  return {n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize'}[h]||'default';
}
function planBounds(plan,pad=0){
  let x0=Infinity,z0=Infinity,x1=-Infinity,z1=-Infinity;
  for(const q of plan.zones||[]){x0=Math.min(x0,q.x);z0=Math.min(z0,q.z);x1=Math.max(x1,q.x+q.w);z1=Math.max(z1,q.z+q.d);}
  for(const l of plan.lines||[]){x0=Math.min(x0,l.x1,l.x2);z0=Math.min(z0,l.z1,l.z2);x1=Math.max(x1,l.x1,l.x2);z1=Math.max(z1,l.z1,l.z2);}
  if(!isFinite(x0))return {x:0,z:0,w:6000,d:4000};
  return {x:x0-pad,z:z0-pad,w:x1-x0+2*pad,d:z1-z0+2*pad};
}
function fitView(bounds,width,height,margin=60){
  const s=Math.max(0.01,Math.min((width-2*margin)/bounds.w,(height-2*margin)/bounds.d));
  return {scale:s,ox:(width-bounds.w*s)/2-bounds.x*s,oz:(height-bounds.d*s)/2-bounds.z*s};
}
function zoomAt(view,px,py,factor){
  const s=clampN(view.scale*factor,0.01,2),w=toWorld(view,px,py);
  return {scale:s,ox:px-w.x*s,oz:py-w.z*s};
}
function pinchView(startView,startPoints,currentPoints){
  const center=([a,b])=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const distance=([a,b])=>Math.hypot(a.x-b.x,a.y-b.y);
  const anchor=center(startPoints),mid=center(currentPoints);
  const w=toWorld(startView,anchor.x,anchor.y);
  const scale=clampN(startView.scale*distance(currentPoints)/Math.max(1,distance(startPoints)),0.01,2);
  return {scale,ox:mid.x-w.x*scale,oz:mid.y-w.z*scale};
}
function uid(){return 'p'+Math.random().toString(36).slice(2,9);}
const fmt=n=>Math.round(n).toLocaleString('nl-NL');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- UI ---------- */
const KIND_STYLE={open:{fill:'rgba(138,176,120,.30)',stroke:'#5d8a4a',dash:[8,5],label:'Open overkapping'},closed:{fill:'rgba(52,62,72,.78)',stroke:'#1f2a33',dash:[],label:'Gesloten ruimte'},pergola:{fill:'rgba(205,160,95,.28)',stroke:'#b07a35',dash:[3,4],label:'Pergola'}};

function create(opts){
  const M=opts.M,doc=opts.document||document;
  let plan={zones:[],lines:[]},selection=null,tool='select',view={scale:.1,ox:40,oz:40},drag=null,hover=null,preview=null,cursorW=null;
  let grid=100,magnet=true,undo=[],redo=[],el=null,canvas=null,ctx=null,panel=null,status=null,open=false,pan=null,activePointer=null,touches=new Map(),pinch=null;
  const snapshot=()=>JSON.stringify(plan);
  const pushUndo=(before)=>{undo.push(before);if(undo.length>60)undo.shift();redo=[];};
  const norm=()=>{const n=M.normalizePlan({zones:plan.zones,lines:plan.lines});plan=n?{zones:n.zones,lines:n.lines||[]}:{zones:[],lines:[]};};
  const commit=(fn)=>{const before=snapshot();fn();norm();if(snapshot()!==before){pushUndo(before);save();}render();};
  const save=()=>{try{opts.onChange&&opts.onChange({zones:plan.zones,lines:plan.lines});}catch(e){}};

  function build(){
    el=doc.createElement('div');el.className='plan-editor';el.setAttribute('role','dialog');el.setAttribute('aria-label','Plattegrond schetsen');
    el.innerHTML=`<header class="pe-head"><div><strong>Plattegrond schetsen</strong><small>Fase 1 · 2D · teken blokken en lijnen, sleep de grepen om groter of kleiner te maken</small></div><button type="button" class="pe-x" data-pe="close" aria-label="Sluiten">✕</button></header>
    <div class="pe-bar">
      <button type="button" data-pe-tool="select" title="Selecteren, verplaatsen en vergroten/verkleinen (V)">↖ Selecteren</button>
      <button type="button" data-pe-tool="block" title="Blok tekenen: sleep een rechthoek (B)">▭ Blok</button>
      <button type="button" data-pe-tool="line" title="Lijn/wand tekenen: sleep (L)">／ Lijn</button>
      <span class="pe-sep"></span>
      <button type="button" data-pe="undo" title="Ongedaan maken (Ctrl+Z)">↶</button><button type="button" data-pe="redo" title="Opnieuw (Ctrl+Y)">↷</button>
      <span class="pe-sep"></span>
      <label>Raster <select data-pe-grid><option value="0">uit</option><option value="50">50 mm</option><option value="100" selected>100 mm</option><option value="250">250 mm</option><option value="500">500 mm</option></select></label>
      <button type="button" data-pe="magnet" class="pe-toggle on" title="Magneet naar andere randen">◉ Magnetisch</button>
      <button type="button" data-pe="fit" title="Alles in beeld">⤢ Alles in beeld</button>
      <label>Voorbeeld <select data-pe-preset></select></label>
      <span class="pe-grow"></span>
      <button type="button" class="pe-go" data-pe="generate" title="Maak er een 3D-project van (fase 2)">▦ Naar 3D →</button>
    </div>
    <div class="pe-main"><div class="pe-stage"><canvas class="pe-canvas" tabindex="0" aria-label="Tekenvlak plattegrond"></canvas><div class="pe-status"></div></div><aside class="pe-panel"></aside></div>`;
    doc.body.appendChild(el);
    canvas=el.querySelector('canvas');ctx=canvas.getContext('2d');panel=el.querySelector('.pe-panel');status=el.querySelector('.pe-status');
    const ps=el.querySelector('[data-pe-preset]');ps.innerHTML='<option value="">— kies —</option>'+Object.entries(opts.presets||{}).map(([k,v])=>`<option value="${esc(k)}">${esc(v.label)}</option>`).join('');
    bind();
  }
  function setTool(t){tool=t;drag=null;preview=null;el.querySelectorAll('[data-pe-tool]').forEach(b=>b.classList.toggle('on',b.dataset.peTool===t));canvas.style.cursor=t==='select'?'default':'crosshair';
    setStatus(t==='block'?'Blok: sleep een rechthoek over het vlak.':t==='line'?'Lijn: sleep van begin- naar eindpunt (altijd haaks).':'Klik een blok of lijn om te selecteren, sleep om te verplaatsen, sleep een greep om te vergroten of verkleinen.');render();}
  function setStatus(t){if(status)status.dataset.hint=t;updateStatus();}
  function updateStatus(){if(!status)return;const c=cursorW?`x ${fmt(cursorW.x)} · z ${fmt(cursorW.z)} mm`:'';status.innerHTML=`<span>${esc(status.dataset.hint||'')}</span><b>${c}</b>`;}

  const rectOf=(c)=>{const r=canvas.getBoundingClientRect();return {x:c.clientX-r.left,y:c.clientY-r.top};};
  const worldSnap=(px,py,exclude)=>{const w=toWorld(view,px,py);const it={zones:plan.zones.filter(q=>q.id!==exclude),lines:plan.lines.filter(q=>q.id!==exclude)};
    return snapPoint(w,rectEdges(it),grid,Math.max(40,12/view.scale),magnet);};

  function cancelInteraction(){
    // Pointermove wijzigt tijdelijk het model; annuleren moet terug naar de beginsituatie.
    if(drag?.before&&(drag.mode==='move'||drag.mode==='resize'))plan=JSON.parse(drag.before);
    drag=null;preview=null;pan=null;render();
  }
  function onCancel(e){
    if(e.pointerType==='touch')touches.delete(e.pointerId);
    if(pinch){if(!touches.size)pinch=null;render();return;}
    if(activePointer!==e.pointerId)return;
    activePointer=null;cancelInteraction();
  }
  function bind(){
    el.addEventListener('click',e=>{
      const t=e.target.closest('[data-pe-tool]');if(t){setTool(t.dataset.peTool);return;}
      const a=e.target.closest('[data-pe]');if(!a)return;const act=a.dataset.pe;
      if(act==='close')close();else if(act==='undo')doUndo();else if(act==='redo')doRedo();
      else if(act==='magnet'){magnet=!magnet;a.classList.toggle('on',magnet);}
      else if(act==='fit')fit();
      else if(act==='generate'){if(!plan.zones.length&&!plan.lines.length){setStatus('Teken eerst een blok of lijn.');return;}opts.onGenerate&&opts.onGenerate({zones:plan.zones,lines:plan.lines});}
      else if(act==='delete')removeSelected();
    });
    el.querySelector('[data-pe-grid]').addEventListener('change',e=>{grid=+e.target.value;render();});
    el.querySelector('[data-pe-preset]').addEventListener('change',e=>{const p=(opts.presets||{})[e.target.value];if(!p)return;
      commit(()=>{plan={zones:JSON.parse(JSON.stringify(p.zones)),lines:JSON.parse(JSON.stringify(p.lines||[]))};selection=null;});e.target.value='';fit();});
    panel.addEventListener('change',onPanel);panel.addEventListener('click',e=>{const d=e.target.closest('[data-pe="delete"]');if(d)removeSelected();});
    canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);
    canvas.addEventListener('wheel',e=>{e.preventDefault();const p=rectOf(e);view=zoomAt(view,p.x,p.y,e.deltaY>0?.9:1.1);render();},{passive:false});
    doc.addEventListener('keydown',onKey);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(open)sizeCanvas();}).observe(el.querySelector('.pe-stage'));
    window.addEventListener('resize',()=>{if(open)sizeCanvas();});
  }

  function onDown(e){
    const p=rectOf(e);
    if(e.pointerType==='touch'){
      touches.set(e.pointerId,p);
      if(touches.size>=2){
        if(!pinch){cancelInteraction();activePointer=null;pinch={startView:{...view},startPoints:[...touches.values()].slice(0,2)};}
        setStatus('Twee vingers: verschuiven en zoomen zonder het ontwerp te wijzigen.');return;
      }
      if(pinch)return; // na pinch pas tekenen zodra alle vingers los zijn
    }
    if(activePointer!==null)return;
    if(![0,1,2,undefined].includes(e.button))return;
    activePointer=e.pointerId;
    canvas.focus();canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);
    if(e.shiftKey||e.button===1||e.button===2){pan={x:p.x,y:p.y,ox:view.ox,oz:view.oz};return;}
    if(tool==='block'||tool==='line'){const s=worldSnap(p.x,p.y);drag={mode:tool,a:{x:s.x,z:s.z}};preview=null;return;}
    const h=hitTest(plan,view,p.x,p.y,selection,e.pointerType==='touch'?18:HANDLE_PX);
    if(!h){selection=null;render();return;}
    selection={type:h.type,id:h.id};
    const item=(h.type==='zone'?plan.zones:plan.lines).find(q=>q.id===h.id);
    drag=h.kind==='handle'?{mode:'resize',handle:h.handle,before:snapshot(),orig:JSON.parse(JSON.stringify(item))}:{mode:'move',before:snapshot(),orig:JSON.parse(JSON.stringify(item)),start:toWorld(view,p.x,p.y),moved:false};
    render();
  }
  function onMove(e){
    const p=rectOf(e);
    if(e.pointerType==='touch'&&touches.has(e.pointerId))touches.set(e.pointerId,p);
    if(pinch){if(touches.size>=2){view=pinchView(pinch.startView,pinch.startPoints,[...touches.values()].slice(0,2));render();}return;}
    if(activePointer!==null&&activePointer!==e.pointerId)return;
    if(e.pointerType==='touch'&&activePointer===null)return;
    cursorW=toWorld(view,p.x,p.y);
    if(pan){view={...view,ox:pan.ox+(p.x-pan.x),oz:pan.oz+(p.y-pan.y)};render();return;}
    if(!drag){hover=hitTest(plan,view,p.x,p.y,selection);canvas.style.cursor=tool==='select'?cursorFor(hover):'crosshair';updateStatus();if(tool!=='select')render();return;}
    if(drag.mode==='block'){const s=worldSnap(p.x,p.y);preview={type:'zone',...(blockFromDrag(drag.a,s,1)||{x:drag.a.x,z:drag.a.z,w:0,d:0}),magnet:s};render();return;}
    if(drag.mode==='line'){const s=worldSnap(p.x,p.y);preview={type:'line',...(lineFromDrag(drag.a,s,1)||{x1:drag.a.x,z1:drag.a.z,x2:drag.a.x,z2:drag.a.z})};render();return;}
    if(drag.mode==='resize'){
      const item=(selection.type==='zone'?plan.zones:plan.lines).find(q=>q.id===selection.id);if(!item)return;
      const s=worldSnap(p.x,p.y,selection.id);
      if(selection.type==='zone'){Object.assign(item,resizeRect(drag.orig,drag.handle,s));}
      else{const o=drag.orig,horiz=Math.abs(o.x2-o.x1)>=Math.abs(o.z2-o.z1);
        if(drag.handle==='a'){if(horiz){item.x1=s.x;}else{item.z1=s.z;}}else{if(horiz){item.x2=s.x;}else{item.z2=s.z;}}}
      render();return;
    }
    if(drag.mode==='move'){
      const w=toWorld(view,p.x,p.y),dx=w.x-drag.start.x,dz=w.z-drag.start.z;
      if(Math.hypot(dx,dz)*view.scale>3)drag.moved=true;if(!drag.moved)return;
      const item=(selection.type==='zone'?plan.zones:plan.lines).find(q=>q.id===selection.id);if(!item)return;
      const others={zones:plan.zones.filter(q=>q.id!==selection.id),lines:plan.lines.filter(q=>q.id!==selection.id)},ed=rectEdges(others),tol=Math.max(40,12/view.scale);
      if(selection.type==='zone'){
        let nx=round(drag.orig.x+dx,grid),nz=round(drag.orig.z+dz,grid);
        if(magnet){ // magneet op linker/rechter en boven/onder rand
          const tryX=[nx,nx+drag.orig.w],tryZ=[nz,nz+drag.orig.d];let bx=null,bz=null;
          for(const c of ed.xs)for(const [i,v] of tryX.entries()){const d=c-v;if(Math.abs(d)<=tol&&(bx===null||Math.abs(d)<Math.abs(bx)))bx=d;void i;}
          for(const c of ed.zs)for(const v of tryZ){const d=c-v;if(Math.abs(d)<=tol&&(bz===null||Math.abs(d)<Math.abs(bz)))bz=d;}
          if(bx!==null)nx+=bx;if(bz!==null)nz+=bz;}
        item.x=Math.max(0,nx);item.z=Math.max(0,nz);
      }else{const ddx=round(dx,grid),ddz=round(dz,grid);item.x1=drag.orig.x1+ddx;item.x2=drag.orig.x2+ddx;item.z1=drag.orig.z1+ddz;item.z2=drag.orig.z2+ddz;}
      render();
    }
  }
  function onUp(e){
    const p=rectOf(e);
    if(e.pointerType==='touch')touches.delete(e.pointerId);
    if(pinch){if(!touches.size)pinch=null;return;}
    if(activePointer!==e.pointerId)return;
    activePointer=null;
    if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(pan){pan=null;return;}
    if(!drag)return;const d=drag;drag=null;
    if(d.mode==='block'||d.mode==='line'){
      const s=worldSnap(p.x,p.y);preview=null;
      if(d.mode==='block'){const r=blockFromDrag(d.a,s);if(r){let id;commit(()=>{id=uid();plan.zones.push({id,name:'Blok '+(plan.zones.length+1),kind:'open',...r,h:2500,walls:'',door:null});});selection={type:'zone',id};setTool('select');setStatus('Blok geplaatst. Sleep de grepen om de maat aan te passen of vul de maten rechts in.');}else setStatus('Sleep minimaal 300 × 300 mm.');}
      else{const l=lineFromDrag(d.a,s);if(l){let id;commit(()=>{id=uid();plan.lines.push({id,name:'Wand '+(plan.lines.length+1),...l,h:2400});});selection={type:'line',id};setTool('select');setStatus('Lijn geplaatst. Sleep de uiteinden om de lengte aan te passen.');}else setStatus('Sleep minimaal 300 mm.');}
      render();return;
    }
    // resize / move: committen als er iets veranderd is (before staat in drag)
    norm();const changed=snapshot()!==d.before;if(changed){pushUndo(d.before);save();}render();
  }
  function onKey(e){
    if(!open)return;const tag=(e.target&&e.target.tagName)||'';if(/INPUT|SELECT|TEXTAREA/.test(tag)&&e.key!=='Escape')return;
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?doRedo():doUndo();return;}
    if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();doRedo();return;}
    if(k==='escape'){if(drag||preview||pan){cancelInteraction();}else if(tool!=='select')setTool('select');else if(selection){selection=null;render();}else close();e.stopPropagation();return;}
    if(k==='v')setTool('select');else if(k==='b')setTool('block');else if(k==='l')setTool('line');
    else if((k==='delete'||k==='backspace')&&selection){e.preventDefault();removeSelected();}
    else if(selection&&k.startsWith('arrow')){e.preventDefault();const st=e.shiftKey?500:(grid||50),dx=k==='arrowright'?st:k==='arrowleft'?-st:0,dz=k==='arrowdown'?st:k==='arrowup'?-st:0;
      commit(()=>{const it=(selection.type==='zone'?plan.zones:plan.lines).find(q=>q.id===selection.id);if(!it)return;if(selection.type==='zone'){it.x=Math.max(0,it.x+dx);it.z=Math.max(0,it.z+dz);}else{it.x1+=dx;it.x2+=dx;it.z1+=dz;it.z2+=dz;}});}
  }
  function removeSelected(){if(!selection)return;const s=selection;commit(()=>{if(s.type==='zone')plan.zones=plan.zones.filter(q=>q.id!==s.id);else plan.lines=plan.lines.filter(q=>q.id!==s.id);});selection=null;render();}
  function doUndo(){if(!undo.length)return;redo.push(snapshot());plan=JSON.parse(undo.pop());if(selection&&![...plan.zones,...plan.lines].some(q=>q.id===selection.id))selection=null;save();render();}
  function doRedo(){if(!redo.length)return;undo.push(snapshot());plan=JSON.parse(redo.pop());save();render();}
  function fit(){const r=canvas.getBoundingClientRect();view=fitView(planBounds(plan,500),r.width||800,r.height||500,40);render();}

  function onPanel(e){
    if(!selection)return;const f=e.target.dataset;
    commit(()=>{
      if(selection.type==='zone'){const z=plan.zones.find(q=>q.id===selection.id);if(!z)return;
        if(f.pf){const k=f.pf;if(k==='name'||k==='kind')z[k]=e.target.value;else z[k]=+e.target.value;}
        if(f.pw){const s=new Set((z.walls||'').split('').filter(Boolean));e.target.checked?s.add(f.pw):s.delete(f.pw);z.walls=[...s].join('');}
        if(f.pr==='high'){z.roof=e.target.value?{kind:'lessenaar',high:e.target.value,low:Math.max(600,z.roof?.low??z.h-300)}:null;if(!z.roof)delete z.roof;if(z.roof&&z.roof.low>=z.h)z.roof.low=Math.max(600,z.h-300);}
        else if(f.pr==='low'&&z.roof)z.roof.low=Math.min(Math.max(600,+e.target.value||0),z.h-50);
        if(f.pd==='edge')z.door=e.target.value?{edge:e.target.value,offset:z.door?.offset??150,width:z.door?.width||900,height:z.door?.height||2050}:null;
        else if(f.pd==='offset'&&z.door)z.door.offset=Math.max(0,+e.target.value||0);
      }else{const l=plan.lines.find(q=>q.id===selection.id);if(!l)return;
        if(f.pl==='name')l.name=e.target.value;else if(f.pl)l[f.pl]=+e.target.value;}
    });
    panel.dataset.k=JSON.stringify([selection,plan]);panel.innerHTML=panelHTML();
  }
  function panelHTML(){
    const tot=plan.zones.reduce((s,q)=>s+q.w*q.d,0)/1e6,b=planBounds(plan);
    let h='';
    if(selection?.type==='zone'){
      const z=plan.zones.find(q=>q.id===selection.id);
      if(z){
        h+=`<h3>Blok</h3><label>Naam<input data-pf="name" value="${esc(z.name)}"></label>
        <label>Soort<select data-pf="kind">${Object.entries(M.ZONE_KINDS).map(([k,v])=>`<option value="${k}" ${z.kind===k?'selected':''}>${v}</option>`).join('')}</select></label>
        <div class="pe-grid"><label>X (mm)<input data-pf="x" type="number" step="50" value="${z.x}"></label><label>Z (mm)<input data-pf="z" type="number" step="50" value="${z.z}"></label>
        <label>Breed<input data-pf="w" type="number" step="50" value="${z.w}"></label><label>Diep<input data-pf="d" type="number" step="50" value="${z.d}"></label></div>
        <label>Hoogte bovenligger (mm)<input data-pf="h" type="number" step="50" value="${z.h}"></label>
        <div class="pe-row">Wanden:${[['n','A','achter'],['s','V','voor'],['w','L','links'],['e','R','rechts']].map(([c,l,t])=>`<label class="pe-chk" title="Wand ${t}"><input type="checkbox" data-pw="${c}" ${(z.walls||'').includes(c)?'checked':''}> ${l}</label>`).join('')}</div>
        <div class="pe-row">Deur: <select data-pd="edge"><option value="">geen</option>${[['n','achter'],['s','voor'],['w','links'],['e','rechts']].map(([c,t])=>`<option value="${c}" ${z.door?.edge===c?'selected':''}>${t}</option>`).join('')}</select>${z.door?` <input data-pd="offset" type="number" step="50" value="${z.door.offset}" title="Afstand vanaf begin van de wand (mm)">`:''}</div>
        ${z.kind==='pergola'?'':`<div class="pe-row">Dak: <select data-pr="high"><option value="">plat</option>${[['n','achter hoog'],['s','voor hoog'],['w','links hoog'],['e','rechts hoog']].map(([c,t])=>`<option value="${c}" ${z.roof?.high===c?'selected':''}>${t}</option>`).join('')}</select>${z.roof?` laag: <input data-pr="low" type="number" step="50" value="${z.roof.low}" title="Hoogte van de lage rand (mm)"> mm`:''}</div>`}
        <p class="pe-note">${fmt(z.w)} × ${fmt(z.d)} mm = ${(z.w*z.d/1e6).toFixed(2).replace('.',',')} m² (bruto)${z.roof?` · lessenaarsdak, ${fmt(Math.round(Math.atan((z.h-z.roof.low)/((z.roof.high==='w'||z.roof.high==='e')?z.w:z.d))*180/Math.PI*10)/10).replace('.',',')}° helling`:''}</p><button type="button" class="pe-del" data-pe="delete">Verwijder blok</button>`;}
    }else if(selection?.type==='line'){
      const l=plan.lines.find(q=>q.id===selection.id);
      if(l){h+=`<h3>Lijn / wand</h3><label>Naam<input data-pl="name" value="${esc(l.name)}"></label><div class="pe-grid"><label>X1<input data-pl="x1" type="number" step="50" value="${l.x1}"></label><label>Z1<input data-pl="z1" type="number" step="50" value="${l.z1}"></label><label>X2<input data-pl="x2" type="number" step="50" value="${l.x2}"></label><label>Z2<input data-pl="z2" type="number" step="50" value="${l.z2}"></label></div><label>Hoogte (mm)<input data-pl="h" type="number" step="50" value="${l.h}"></label><p class="pe-note">Lengte ${fmt(Math.hypot(l.x2-l.x1,l.z2-l.z1))} mm. Een lijn wordt in 3D een wand met staanders, bovenligger en bekleding.</p><button type="button" class="pe-del" data-pe="delete">Verwijder lijn</button>`;}
    }else{
      h+=`<h3>Schets</h3><p class="pe-note"><b>Blok</b> (B): sleep een rechthoek, bijv. zitgedeelte, berging of pergola.<br><b>Lijn</b> (L): sleep een wand, altijd haaks.<br><b>Selecteren</b> (V): klik, sleep om te verplaatsen, sleep de vierkantjes om te vergroten of verkleinen.<br><b>Scrollen</b> zoomt, <b>Shift+slepen</b> verschuift. Pijltjes verplaatsen; Delete verwijdert.</p>`;
    }
    h+=`<div class="pe-sum"><b>${plan.zones.length}</b> blok(ken), <b>${plan.lines.length}</b> lijn(en)${plan.zones.length?` · ${tot.toFixed(2).replace('.',',')} m² bruto · ${fmt(b.w)} × ${fmt(b.d)} mm`:''}</div>`;
    return h;
  }

  function sizeCanvas(){const r=canvas.parentElement.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}render();}

  function render(){
    if(!open||!ctx)return;const dpr=canvas.width/(canvas.getBoundingClientRect().width||canvas.width),W=canvas.width/dpr,H=canvas.height/dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle='#f7f6f1';ctx.fillRect(0,0,W,H);
    // raster
    const minor=grid||500,stepPx=minor*view.scale;let gstep=minor;while(gstep*view.scale<9)gstep*=5;
    const x0=toWorld(view,0,0),x1=toWorld(view,W,H);
    ctx.lineWidth=1;
    for(let x=Math.floor(x0.x/gstep)*gstep;x<=x1.x;x+=gstep){const s=toScreen(view,x,0).x,major=x%(gstep*5)===0;ctx.strokeStyle=major?'rgba(60,80,70,.20)':'rgba(60,80,70,.09)';ctx.beginPath();ctx.moveTo(s+.5,0);ctx.lineTo(s+.5,H);ctx.stroke();}
    for(let z=Math.floor(x0.z/gstep)*gstep;z<=x1.z;z+=gstep){const s=toScreen(view,0,z).y,major=z%(gstep*5)===0;ctx.strokeStyle=major?'rgba(60,80,70,.20)':'rgba(60,80,70,.09)';ctx.beginPath();ctx.moveTo(0,s+.5);ctx.lineTo(W,s+.5);ctx.stroke();}
    void stepPx;
    // achterlijn z=0 en linker x=0
    const o=toScreen(view,0,0);ctx.strokeStyle='rgba(180,70,60,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,o.y);ctx.lineTo(W,o.y);ctx.stroke();ctx.strokeStyle='rgba(60,110,190,.45)';ctx.beginPath();ctx.moveTo(o.x,0);ctx.lineTo(o.x,H);ctx.stroke();
    ctx.fillStyle='rgba(180,70,60,.8)';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('achterzijde (z = 0)',Math.max(8,o.x+6),o.y-6);
    ctx.save();ctx.fillStyle='rgba(60,110,190,.8)';ctx.translate(o.x-6,Math.max(80,o.y+90));ctx.rotate(-Math.PI/2);ctx.fillText('links (x = 0)',0,0);ctx.restore();
    // blokken
    for(const q of plan.zones)drawZone(q,false);
    for(const l of plan.lines)drawLine(l,false);
    if(preview){if(preview.type==='zone'&&preview.w>0)drawZone({...preview,name:'',kind:'open'},true);if(preview.type==='line')drawLine(preview,true);}
    if(selection){const s=selection.type==='zone'?plan.zones.find(q=>q.id===selection.id):plan.lines.find(q=>q.id===selection.id);if(s)drawSelection(selection.type,s);}
    if(panel){const key=JSON.stringify([selection,plan]);if(panel.dataset.k!==key){panel.dataset.k=key;if(!panel.contains(doc.activeElement)||drag){panel.innerHTML=panelHTML();}}}
    updateStatus();
  }
  function drawZone(q,isPreview){
    const a=toScreen(view,q.x,q.z),b=toScreen(view,q.x+q.w,q.z+q.d),st=KIND_STYLE[q.kind]||KIND_STYLE.open,w=b.x-a.x,h=b.y-a.y;
    ctx.fillStyle=isPreview?'rgba(70,140,190,.20)':st.fill;ctx.fillRect(a.x,a.y,w,h);
    if(q.kind==='pergola'&&!isPreview){ctx.save();ctx.beginPath();ctx.rect(a.x,a.y,w,h);ctx.clip();ctx.strokeStyle='rgba(176,122,53,.55)';ctx.lineWidth=1.5;const n=Math.max(2,Math.round(q.w/600));for(let i=1;i<n;i++){const x=a.x+w*i/n;ctx.beginPath();ctx.moveTo(x,a.y);ctx.lineTo(x,b.y);ctx.stroke();}ctx.restore();}
    ctx.setLineDash(isPreview?[6,4]:st.dash);ctx.strokeStyle=isPreview?'#2f7fb0':st.stroke;ctx.lineWidth=isPreview?2:2.4;ctx.strokeRect(a.x,a.y,w,h);ctx.setLineDash([]);
    // wanden/deur-indicatie
    if(!isPreview){ctx.strokeStyle='#111';ctx.lineWidth=5;for(const c of q.walls||''){ctx.beginPath();if(c==='n'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,a.y);}else if(c==='s'){ctx.moveTo(a.x,b.y);ctx.lineTo(b.x,b.y);}else if(c==='w'){ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,b.y);}else{ctx.moveTo(b.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();}
      if(q.door){const d=q.door,len=d.width*view.scale;ctx.strokeStyle='#d9822b';ctx.lineWidth=5;ctx.beginPath();
        if(d.edge==='n'||d.edge==='s'){const y=d.edge==='n'?a.y:b.y,x=a.x+d.offset*view.scale;ctx.moveTo(x,y);ctx.lineTo(x+len,y);}else{const x=d.edge==='w'?a.x:b.x,y=a.y+d.offset*view.scale;ctx.moveTo(x,y);ctx.lineTo(x,y+len);}ctx.stroke();}}
    if(q.roof&&!isPreview){ // pijl wijst naar de lage rand (waterafvoer)
      const dx={w:1,e:-1,n:0,s:0}[q.roof.high],dz={n:1,s:-1,w:0,e:0}[q.roof.high],mx=a.x+w/2,my=a.y+h/2,L=Math.min(Math.max(Math.abs(dx)?w*.28:h*.28,12),60);
      ctx.save();ctx.strokeStyle='rgba(30,90,140,.8)';ctx.fillStyle='rgba(30,90,140,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx-dx*L,my-dz*L);ctx.lineTo(mx+dx*L,my+dz*L);ctx.stroke();
      const ex=mx+dx*L,ey=my+dz*L;ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-dx*8-dz*5,ey-dz*8+dx*5);ctx.lineTo(ex-dx*8+dz*5,ey-dz*8-dx*5);ctx.closePath();ctx.fill();ctx.restore();}
    // tekst
    ctx.textAlign='center';const cx=a.x+w/2,cy=a.y+h/2;
    if(q.name&&w>60&&h>34){ctx.fillStyle=q.kind==='closed'?'#fff':'#1f2a33';ctx.font='700 13px sans-serif';ctx.fillText(q.name,cx,cy-2);}
    if(w>70&&h>24){ctx.fillStyle=q.kind==='closed'?'rgba(255,255,255,.85)':'#3d4a44';ctx.font='12px sans-serif';ctx.fillText(`${fmt(q.w)} × ${fmt(q.d)}`,cx,cy+(q.name?14:4));}
  }
  function drawLine(l,isPreview){
    const a=toScreen(view,l.x1,l.z1),b=toScreen(view,l.x2,l.z2);ctx.strokeStyle=isPreview?'#2f7fb0':'#1f2a33';ctx.lineWidth=isPreview?3:6;ctx.lineCap='round';if(isPreview)ctx.setLineDash([8,5]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);ctx.lineCap='butt';
    const len=Math.hypot(l.x2-l.x1,l.z2-l.z1);if(len>0){ctx.fillStyle='#1f2a33';ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.fillText(fmt(len),(a.x+b.x)/2,(a.y+b.y)/2-9);}
  }
  function drawSelection(type,s){
    ctx.fillStyle='#fff';ctx.strokeStyle='#d9822b';ctx.lineWidth=1.8;
    if(type==='zone'){const a=toScreen(view,s.x,s.z),b=toScreen(view,s.x+s.w,s.z+s.d);ctx.strokeStyle='#d9822b';ctx.lineWidth=2.2;ctx.setLineDash([]);ctx.strokeRect(a.x-2,a.y-2,b.x-a.x+4,b.y-a.y+4);
      const hp=handlePoints(s);for(const h of HANDLES){const p=toScreen(view,hp[h][0],hp[h][1]);ctx.beginPath();ctx.rect(p.x-5,p.y-5,10,10);ctx.fill();ctx.stroke();}
      // maatlijnen buiten het blok
      ctx.fillStyle='#d9822b';ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.fillText(fmt(s.w)+' mm',(a.x+b.x)/2,a.y-12);ctx.save();ctx.translate(b.x+16,(a.y+b.y)/2);ctx.rotate(Math.PI/2);ctx.fillText(fmt(s.d)+' mm',0,0);ctx.restore();
    }else{for(const [x,z] of [[s.x1,s.z1],[s.x2,s.z2]]){const p=toScreen(view,x,z);ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();}}
  }

  let variantName=null,initialSnapshot=null;
  function openEditor(initial,sourceName){
    if(!el)build();drag=null;preview=null;pan=null;activePointer=null;touches.clear();pinch=null;plan={zones:[],lines:[]};
    const n=M.normalizePlan({zones:initial?.zones||[],lines:initial?.lines||[]});if(n)plan={zones:n.zones,lines:n.lines||[]};
    variantName=sourceName||null;initialSnapshot=snapshot();
    el.querySelector('.pe-head strong').textContent=variantName?'Plattegrond van '+variantName:'Plattegrond schetsen';
    el.querySelector('.pe-head small').textContent=variantName
      ?'De variant bouwt de balken en panelen opnieuw op. Handmatige 3D-bewerkingen blijven in het origineel.'
      :'Teken blokken en lijnen of kies een voorbeeld.';
    const generate=el.querySelector('[data-pe="generate"]');
    generate.textContent=variantName?'Maak 3D-variant':'Naar 3D →';
    generate.title=variantName?'Sla de gewijzigde plattegrond op als nieuw 3D-project':'Maak een nieuw 3D-project';
    selection=variantName&&plan.zones.length===1&&!plan.lines.length?{type:'zone',id:plan.zones[0].id}:null;
    undo=[];redo=[];open=true;el.classList.add('open');doc.body.classList.add('plan-editor-open');
    setTool('select');sizeCanvas();fit();canvas.focus();
  }
  function close(generated=false){
    cancelInteraction();activePointer=null;touches.clear();pinch=null;
    if(!generated&&variantName&&snapshot()!==initialSnapshot&&!window.confirm('Sluiten zonder de gewijzigde plattegrond als variant te bewaren?'))return;
    open=false;if(el)el.classList.remove('open');doc.body.classList.remove('plan-editor-open');opts.onClose&&opts.onClose();}
  return {open:openEditor,close,isOpen:()=>open,getPlan:()=>({zones:plan.zones,lines:plan.lines}),_state:()=>({plan,selection,tool,view,grid})};
}

return {create,snapValue,snapPoint,blockFromDrag,lineFromDrag,resizeRect,hitTest,handlePoints,rectEdges,planBounds,fitView,zoomAt,pinchView,toScreen,toWorld,distToSegment,MIN_BLOCK,HANDLES};
});
