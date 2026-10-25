/* Douglas Designer v0.4 — dependency-free 3D canvas editor. All geometry in mm. */
(function(){
'use strict';
const M=window.DouglasModel; if(!M) throw new Error('model.js ontbreekt');
const D=window.DouglasDrafting; if(!D) throw new Error('drafting.js ontbreekt');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}).format(n);
const euro=(n)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(n);
const icons={drawers:'▤',fridge:'▣',kamado:'◉',doors:'▥',open:'▧'};
const defaults={drawers:500,fridge:600,kamado:570,doors:520,open:500};
const STORAGE='douglas-designer-v1'; // Stable key: never discard v0.1 projects
const WELCOME_KEY='douglas-designer-welcome-v2';
let project; try{project=M.normalizeProject(JSON.parse(localStorage.getItem(STORAGE)||'null'));}catch(e){project=M.demoProject();}
let selected=null, activePanel='modules', mobileView='design', currentView='3d', modalOpen=false, beamMoveMode=false;
let undoStack=[],redoStack=[],toastTimer=null;
const camera={yaw:-0.62,pitch:0.32,zoom:1,panX:0,panY:0};
const canvas=$('#scene'),ctx=canvas.getContext('2d');
const gpuCanvas=$('#geometryScene');
const gpu=window.DouglasGpuRenderer?.create(gpuCanvas)||{ready:false};
let shapes=[], hitShapes=[], viewport={w:800,h:500}, dragging=null, pointers=new Map(),pinchDistance=0;
let armedBeamType=null,previewBeam=null,paletteGesture=null,suppressPresetClick=false;
let drawMode=false;
let beamEndHandles=[];
let gridSize=5,magnetEnabled=true,magnetHeldOff=false,snapHint=null;
const viewAxes=()=>currentView==='front'?['x','y']:currentView==='side'?['z','y']:(currentView==='top'||currentView==='bottom')?['x','z']:null;
const snap5=n=>D.snap(n,gridSize);
function toggleDrawMode(active){
  drawMode=active;disarmBeam();
  if(active&&!viewAxes())setView('front');
  $('#selectTool').classList.toggle('active',!active);
  $('#drawTool').classList.toggle('active',active);
  $('#selectTool').setAttribute('aria-pressed',String(!active));
  $('#drawTool').setAttribute('aria-pressed',String(active));
  $('#drawHelp').classList.toggle('hidden',!active);
  canvas.classList.toggle('draw-active',active);
  draw();
}
function drawPoint(px,py){
  const w=worldFromPoint(px,py),plane=viewAxes();
  if(!plane)return null;
  // Stable 2D workplanes: front, side and top. Coordinates always remain in mm.
  if(currentView==='front')w.z=0;
  if(currentView==='side')w.x=0;
  if(currentView==='top'||currentView==='bottom')w.y=100;
  const candidates=D.anchors([...M.framePieces(project),...project.beams],M.beamBox,
    dragging?.mode==='resize-beam'?selected?.id:null);
  const nearest=magnetEnabled&&!magnetHeldOff
    ? D.nearestAnchor(px,py,candidates,toScreen,plane,17) : null;
  snapHint=nearest?{...nearest.screen,label:nearest.label}:null;
  return D.snapDrawingPoint(w,plane,{step:gridSize,anchor:nearest});
}
function beamHandlePoint(b,end){
  const box=M.beamBox(b),p=[box.x+box.w/2,box.y+box.h/2,box.z+box.d/2];
  const index={x:0,y:1,z:2}[b.axis];
  p[index]=(end==='start'?b[b.axis]:b[b.axis]+b.length);
  return p;
}
function handleAt(px,py){
  for(const h of beamEndHandles)if(Math.hypot(px-h.x,py-h.y)<17)return h;
  return null;
}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(project));$('#saveStatus').textContent='● Lokaal opgeslagen';}catch(e){$('#saveStatus').textContent='● Opslag niet beschikbaar';}}
function commit(fn){const before=JSON.stringify(project);fn();project.width=M.expectedWidth(project);if(JSON.stringify(project)===before)return;undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
function history(dir){const from=dir==='undo'?undoStack:redoStack,to=dir==='undo'?redoStack:undoStack;if(!from.length)return;to.push(JSON.stringify(project));project=M.normalizeProject(JSON.parse(from.pop()));selected=null;persist();render();}
function getSelected(){if(!selected)return null;if(selected.type==='module')return project.modules.find(m=>m.id===selected.id);if(selected.type==='beam')return project.beams.find(b=>b.id===selected.id);if(selected.type==='frame')return M.framePieces(project).find(b=>b.id===selected.id);return null;}
function setSelected(type,id){
  selected=id?{type,id}:null;beamMoveMode=false;render();
  if(window.innerWidth<=800){
    if(id)switchMobile('design');
    $('#inspector').classList.remove('mobile-visible');
    $('#selectionStrip').classList.toggle('hidden',!id);
    if(id)$('#selectionText').textContent=getSelected()?.name||'Onderdeel geselecteerd';
  }else if(window.innerWidth<=1250){
    $('#inspector').classList.toggle('mobile-visible',!!id);
  }
  if($('#interactionTip'))$('#interactionTip').textContent=id?'Onderdeel geselecteerd · sleep direct of tik op Bewerken':'Tik op een onderdeel om direct te bewerken';
}
function switchPanel(name){activePanel=name;$$('.side-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$$('.sidebar-panel').forEach(p=>p.classList.toggle('hidden',p.id!==`panel-${name}`));}
function switchMobile(name){
  if(name==='cutlist'){showCutlist();return;}
  mobileView=name;
  $$('.mobile-tab').forEach(b=>b.classList.toggle('active',b.dataset.mobile===name));
  $('#stageArea').classList.toggle('hidden',name!=='design');
  $('#sidebar').classList.toggle('mobile-visible',name==='modules'||name==='settings');
  if(name==='modules')switchPanel('modules');
  if(name==='settings')switchPanel('settings');
  $('#inspector').classList.toggle('mobile-visible',name==='design'&&!!selected);
  $('#selectionStrip').classList.toggle('hidden',name!=='design'||!selected);
  if(name==='design')draw();
}
function addModule(kind){const type=M.TYPES[kind];if(!type||project.modules.length>=12){toast('Maximum 12 modules');return;}
  let newId;commit(()=>{newId=M.uid();project.modules.push({id:newId,kind,width:defaults[kind],name:type.label});});setSelected('module',newId);}
// Parts are never inserted at a surprising default location: first choose a type,
// then drop it onto the canvas or tap its intended position.
const BEAM_NAMES={x:'Horizontale regel',y:'Staander',z:'Dieptebalk'};
function armBeamType(axis){
  if(!BEAM_NAMES[axis])return;
  armedBeamType=axis;previewBeam=null;
  if(window.innerWidth<=800&&!paletteGesture?.moved)switchMobile('design');
  $('#placementNotice').classList.remove('hidden');
  $('#placementLabel').textContent=BEAM_NAMES[axis]+' · tik op de gewenste plek';
  canvas.classList.add('placing');
  $$('.beam-preset').forEach(b=>b.classList.toggle('armed',b.dataset.beamType===axis));
  draw();
}
function disarmBeam(){
  armedBeamType=null;previewBeam=null;
  $('#placementNotice').classList.add('hidden');canvas.classList.remove('placing');
  $$('.beam-preset').forEach(b=>b.classList.remove('armed'));draw();
}
function placementPlane(){
  if(currentView==='top'||currentView==='bottom'||Math.abs(camera.pitch)>1.28)return ['x','z'];
  if(currentView==='side'||Math.abs(Math.cos(camera.yaw))<.30)return ['z','y'];
  return ['x','y'];
}
function worldFromPoint(px,py){
  const plane=placementPlane();
  const world={x:project.width/2,y:project.height*.45,z:20};
  if(plane.includes('z')&&!plane.includes('y'))world.y=Math.max(100,project.height-175);
  if(plane.includes('z')&&plane.includes('y'))world.x=50;
  const index={x:0,y:1,z:2};
  // Iterative local inversion of the actual 3D perspective projection.
  for(let iteration=0;iteration<6;iteration++){
    const a=[world.x,world.y,world.z],p=toScreen(a);
    const basis=plane.map(axis=>{const v=a.slice();v[index[axis]]+=50;const q=toScreen(v);return {x:(q.x-p.x)/50,y:(q.y-p.y)/50};});
    const [u,v]=basis,det=u.x*v.y-u.y*v.x;
    if(Math.abs(det)<.00002)break;
    const dx=px-p.x,dy=py-p.y;
    world[plane[0]]+=(dx*v.y-dy*v.x)/det;
    world[plane[1]]+=(u.x*dy-u.y*dx)/det;
    for(const key of plane)world[key]=M.clamp(world[key],-200,6500);
  }
  return world;
}
function beamAtPoint(axis,px,py){
  const w=worldFromPoint(px,py),length=axis==='x'?Math.min(500,project.width-100):axis==='y'?Math.min(500,project.height-50):Math.min(500,project.depth-100);
  const beam={id:'preview',axis,name:BEAM_NAMES[axis],length:Math.max(50,length),x:50,y:Math.max(50,project.height*.45),z:20};
  const longMax={x:project.width,y:project.height,z:project.depth};
  for(const key of ['x','y','z'])beam[key]=Math.round(w[key]/5)*5;
  // The pointer determines the midpoint along the long axis.
  beam[axis]=Math.round((w[axis]-beam.length/2)/5)*5;
  for(const key of ['x','y','z']){
    const span=key===axis?beam.length:key==='y'?100:key==='z'?(axis==='y'?100:50):50;
    beam[key]=M.clamp(beam[key],0,Math.max(0,longMax[key]-span));
  }
  const fit=M.fitBeamBetween(project,beam);
  if(fit){beam[axis]=fit.start;beam.length=fit.length;}
  beam.fitInfo=fit;
  return beam;
}
function updatePlacement(px,py){
  if(!armedBeamType)return;
  previewBeam=beamAtPoint(armedBeamType,px,py);
  $('#placementLabel').textContent=previewBeam.fitInfo?`Klik om te plaatsen · past precies ${fmt(previewBeam.length)} mm`:'Tik om balk te plaatsen · lengte aanpasbaar';
  draw();
}
function placeAt(px,py){
  if(!armedBeamType)return;
  const next=beamAtPoint(armedBeamType,px,py);
  let id;
  commit(()=>{id=M.uid();project.beams.push({id,name:next.name,axis:next.axis,length:next.length,x:next.x,y:next.y,z:next.z});});
  const fitted=Boolean(next.fitInfo);
  disarmBeam();setSelected('beam',id);
  toast(fitted?`Automatisch passend gemaakt: ${next.length} mm`:'Balk geplaatst · controleer maat en aansluiting');
}
function render(){
  $('#displayName').textContent=project.name;$('#projectTitle').firstChild.textContent=project.name+' ';
  const {modules,beams}=project;
  $('#statWidth').innerHTML=`${fmt(project.width)} <small>mm</small>`;$('#statDepth').innerHTML=`${fmt(project.depth)} <small>mm</small>`;$('#statHeight').innerHTML=`${fmt(project.height)} <small>mm</small>`;
  const plan=M.boardPlan(project);$('#statBeams').innerHTML=`${fmt(plan.pieces)} <small>stuks</small>`;
  $('#moduleCount').textContent=`${modules.length} modules`;$('#manualCount').textContent=`${beams.length} extra`;const frame=M.framePieces(project);$('#frameCount').textContent=`${frame.length} framebalken`;$('#frameList').innerHTML=frame.map(b=>`<div class="module-card ${selected?.id===b.id?'active':''}" data-select-frame="${esc(b.id)}"><div class="module-symbol">▥</div><div class="module-meta"><strong>${esc(b.name)}</strong><small>${fmt(b.length)} mm · ${b.axis.toUpperCase()}${project.frameEdits?.[b.id]?' · aangepast':''}</small></div><span>›</span></div>`).join('')||'<p class="hint">Geen automatische framebalken aanwezig.</p>';
  $('#moduleList').innerHTML=modules.map((m,i)=>`<div class="module-card ${selected?.id===m.id?'active':''}" data-select-module="${esc(m.id)}"><div class="module-symbol">${icons[m.kind]}</div><div class="module-meta"><strong>${esc(m.name)}</strong><small>${fmt(m.width)} mm breed · ${M.TYPES[m.kind].label}</small></div><div class="reorder"><button data-move-module="${esc(m.id)}" data-direction="-1" title="Naar links" ${i===0?'disabled':''}>↑</button><button data-move-module="${esc(m.id)}" data-direction="1" title="Naar rechts" ${i===modules.length-1?'disabled':''}>↓</button></div></div>`).join('');
  $('#beamList').innerHTML=beams.length?beams.map(b=>`<div class="module-card ${selected?.id===b.id?'active':''}" data-select-beam="${esc(b.id)}"><div class="module-symbol">▥</div><div class="module-meta"><strong>${esc(b.name)}</strong><small>${fmt(b.length)} mm · as ${b.axis.toUpperCase()}</small></div><span style="color:#8e9890">›</span></div>`).join(''):'<p class="hint">Nog geen extra balken geplaatst.</p>';
  $('#presetGrid').innerHTML=Object.entries(M.TYPES).map(([key,v])=>`<button class="preset" data-add="${key}"><span class="preset-icon">${icons[key]}</span>${v.label} ＋</button>`).join('');
  $('#projectName').value=project.name;$('#projectWidth').value=project.width;$('#projectDepth').value=project.depth;$('#projectHeight').value=project.height;$('#stockLength').value=project.stockLength;$('#kerf').value=project.kerf;$('#beamPrice').value=project.beamPrice;$('#countertopCheck').checked=project.countertop;
  $('#undoBtn').disabled=!undoStack.length;$('#redoBtn').disabled=!redoStack.length;
  renderInspector();draw();
}
function renderInspector(){
  const obj=getSelected();const body=$('#inspectorBody'),foot=$('#inspectorBottom');
  if(!obj){
    $('#inspectorTitle').textContent='Projectoverzicht';
    const plan=M.boardPlan(project),warn=M.warnings(project);
    body.innerHTML=`<div class="kpi-banner"><label>BENODIGDE DOUGLAS BALKEN</label><strong>${plan.boards.length} × ${fmt(project.stockLength)} mm</strong><small>50 × 100 mm · zaagoptimalisatie</small></div><div class="detail-label"><span>Ontwerp</span><strong>${project.modules.length} modules</strong></div><div class="detail-label"><span>Zaagstukken totaal</span><strong>${plan.pieces} delen</strong></div><div class="detail-label"><span>Totale zaaglengte</span><strong>${(plan.totalLength/1000).toFixed(2).replace('.',',')} m</strong></div><div class="detail-label"><span>Douglas prijsindicatie</span><strong>${euro(plan.estimatedPrice)}</strong></div><div class="divider"></div><p class="inspector-label">AANDACHTSPUNTEN</p>${warn.map(w=>`<div class="warning">${esc(w)}</div>`).join('')||'<p class="mini-note">Geen eenvoudige geometrische waarschuwingen gevonden.</p>'}<div class="divider"></div><p class="mini-note">Prijs betreft uitsluitend de Douglas balken; geen werkblad, platen, apparatuur, bevestigingsmiddelen of arbeid. De 3D-modules zijn schematisch.</p>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="primary-btn full" id="openCutlist">▤ Zaaglijst & materiaal bekijken →</button><button class="outline-btn full" id="imageBtn">↓ 3D-aanzicht opslaan (PNG)</button></div>';
    return;
  }
  if(selected.type==='module'){
    const spec=M.TYPES[obj.kind];const kindOptions=Object.entries(M.TYPES).map(([k,v])=>`<option value="${k}" ${obj.kind===k?'selected':''}>${v.label}</option>`).join('');
    $('#inspectorTitle').textContent=obj.name;
    body.innerHTML=`<div class="preview-icon">${icons[obj.kind]}</div><p class="inspector-label">MODULE INSTELLINGEN</p><label class="field">Naam<input data-edit="name" value="${esc(obj.name)}" maxlength="60"></label><label class="field">Type<select data-edit="kind">${kindOptions}</select></label><div class="field-grid"><label class="field">Opening breedte (mm)<input data-edit="width" type="number" min="200" max="2400" step="5" value="${obj.width}"></label></div><div class="divider"></div><p class="inspector-label">GEOMETRIE</p><div class="detail-label"><span>Modulebreedte</span><strong>${fmt(obj.width)} mm</strong></div><div class="detail-label"><span>Buitenhoogte</span><strong>${fmt(project.height)} mm</strong></div><div class="detail-label"><span>Constructiediepte</span><strong>${fmt(project.depth)} mm</strong></div><div class="divider"></div><div class="warning">Modulebeeld is indicatief, niet op basis van fabrikantmetingen. Controleer inbouwmaten, ventilatie en hittebescherming vóór de bouw.</div>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="outline-btn full delete-btn" id="deleteSelected">Verwijder deze module</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>';
  }else{
    const isFrame=selected.type==='frame';
    $('#inspectorTitle').textContent=obj.name;
    const axisField=isFrame?
      `<div class="detail-label"><span>Richting</span><strong>${obj.axis.toUpperCase()} — automatisch frame</strong></div>`:
      `<label class="field">Lengterichting<select data-edit="axis"><option value="x" ${obj.axis==='x'?'selected':''}>X — breedte</option><option value="y" ${obj.axis==='y'?'selected':''}>Y — hoogte</option><option value="z" ${obj.axis==='z'?'selected':''}>Z — diepte</option></select></label>`;
    body.innerHTML=`<div class="preview-icon">▥</div><p class="inspector-label">${isFrame?'AUTOMATISCHE FRAMEBALK — BEWERKBAAR':'VRIJE BALK'} · 50 × 100 MM</p><label class="field">Naam<input data-edit="name" value="${esc(obj.name)}"></label><div class="field-grid"><label class="field">Lengte (mm)<input data-edit="length" type="number" min="50" max="6500" step="5" value="${obj.length}"></label>${axisField}<label class="field">X vanaf links<input data-edit="x" type="number" step="5" value="${obj.x}"></label><label class="field">Y vanaf onder<input data-edit="y" type="number" step="5" value="${obj.y}"></label><label class="field">Z vanaf voorzijde<input data-edit="z" type="number" step="5" value="${obj.z}"></label></div><div class="nudge-tools"><span>VERPLAATS 5 MM</span><div><button data-nudge="x:-5" title="5 mm links">←</button><button data-nudge="y:5" title="5 mm omhoog">↑</button><button data-nudge="y:-5" title="5 mm omlaag">↓</button><button data-nudge="x:5" title="5 mm rechts">→</button></div><div><button data-nudge="z:-5">Diepte −</button><button data-nudge="z:5">Diepte ＋</button></div></div><div class="notice-small">${isFrame?'Deze balk hoort bij het automatische frame. Jouw positie en lengte worden bewaard en meegerekend in de zaaglijst. Controleer na aanpassen alle verbindingen en draagkracht.':'Sleep de balk direct op het canvas. In 3D en vooraanzicht beweeg je horizontaal en in hoogte; in bovenaanzicht verplaats je de diepte. Coördinaten zijn in mm vanaf links/onder/voorzijde.'}</div>`;
    foot.innerHTML=isFrame?
      '<div class="right-foot-actions"><button class="outline-btn full" id="restoreSelectedFrame">↺ Originele framebalk herstellen</button><button class="outline-btn full" id="duplicateBeam">⧉ Losse kopie maken</button><button class="outline-btn full delete-btn" id="deleteSelected">Deze framebalk uitschakelen</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>':
      '<div class="right-foot-actions"><button class="primary-btn full" id="fitSelectedBeam">↔ Passend maken tussen balken</button><button class="outline-btn full" id="duplicateBeam">⧉ Balk dupliceren</button><button class="outline-btn full delete-btn" id="deleteSelected">Verwijder deze balk</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>';
  }
}
/* Lightweight 3D geometry projector — not a static mockup and no external CDN required. */
const RGB={wood:'#b8824f',end:'#a26c42',highlight:'#d4a16b',top:'#dcb889',post:'#bd8653',panel:'#ad7548',fridge:'#38474f',steel:'#78848a',kamado:'#354740',ground:'#edf0e9'};
function rgb(hex){const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function shade(hex,mul){const r=rgb(hex).map(v=>Math.max(0,Math.min(255,Math.round(v*mul))));return `rgb(${r.join(',')})`;}
let scale=0, sceneCenter;
function rotate(v){const x=v[0]-sceneCenter[0],y=v[1]-sceneCenter[1],z=v[2]-sceneCenter[2];const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);const xx=c*x+s*z,zz=-s*x+c*z;return [xx,cp*y-sp*zz,sp*y+cp*zz];}
function toScreen(v){const r=rotate(v),f=2000/(2000+r[2]);return {x:viewport.w/2+r[0]*scale*f+camera.panX,y:viewport.h*.55-r[1]*scale*f+camera.panY,d:r[2]};}
function poly(coords,fill,owner,stroke='rgba(46,37,28,.18)'){const verts=coords.map(toScreen);shapes.push({verts,worldVerts:coords,depth:verts.reduce((s,v)=>s+v.d,0)/verts.length,fill,stroke,owner});}
function box(x,y,z,w,h,d,color,owner,tileSize=Infinity){if(w<=0||h<=0||d<=0)return;
  const p=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
  const faces=[[4,5,6,7],[1,5,6,2],[0,4,7,3],[0,1,5,4],[3,2,6,7],[0,1,2,3]];
  const light=[.65,.78,.97,.64,1.13,.99];
  faces.forEach((a,i)=>{
    const v=a.map(j=>p[j]),fill=shade(color,light[i]);
    if(!Number.isFinite(tileSize)){poly(v,fill,owner);return;}
    // Canvas 2D has no depth buffer. Split large worktop faces into short
    // painter-sorted polygons so small appliances cannot incorrectly show
    // through the top when the camera moves around the kitchen.
    const distance=(u,t)=>Math.hypot(u[0]-t[0],u[1]-t[1],u[2]-t[2]);
    const nu=Math.max(1,Math.ceil(distance(v[0],v[1])/tileSize));
    const nv=Math.max(1,Math.ceil(distance(v[0],v[3])/tileSize));
    const at=(u,t)=>v[0].map((k,j)=>k+(v[1][j]-k)*u+(v[3][j]-k)*t);
    for(let u=0;u<nu;u++)for(let t=0;t<nv;t++){
      const part=[at(u/nu,t/nv),at((u+1)/nu,t/nv),at((u+1)/nu,(t+1)/nv),at(u/nu,(t+1)/nv)];
      // Same-color edges prevent hairline cracks between adjacent tiles.
      poly(part,fill,owner,fill);
    }
  });
}
function egg(cx,cy,cz,rx,ry,rz,color,owner){const lat=10,lon=18;for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
  function point(theta,phi){const r=Math.sin(theta)*(1+.1*Math.cos(theta)),yy=Math.cos(theta);return [cx+rx*r*Math.cos(phi),cy+ry*yy,cz+rz*r*Math.sin(phi)];}
  const a=i*Math.PI/lat,b=(i+1)*Math.PI/lat,t=j*2*Math.PI/lon,u=(j+1)*2*Math.PI/lon;
  const colorStrength=.78+.22*Math.max(0,Math.cos(t+camera.yaw));poly([point(a,t),point(a,u),point(b,u),point(b,t)],shade(color,colorStrength),owner,'rgba(25,25,22,.16)');
}}
function objects(){shapes=[];hitShapes=[];
  const frame=M.framePieces(project);
  // Cabinet bodies come before beams; physical occlusion is resolved by 3D depth sorting.
  const {sections}=M.boundaries(project);
  for(const s of sections){
    const {module:m,left,right}=s;const w=right-left;
    const owner={type:'module',id:m.id};
    const cabY=115,cabH=Math.max(100,project.height-280),front=111,bodyD=Math.max(100,project.depth-250);
    if(m.kind==='fridge'){
      box(left+8,cabY,front,w-16,cabH,bodyD,RGB.fridge,owner);
      box(left+15,cabY+8,front-6,w-30,cabH-16,15,'#495965',owner);
      box(right-43,cabY+100,front-14,7,Math.min(280,cabH-160),12,'#b3bbb7',owner);
    }else if(m.kind==='drawers'){
      box(left+10,cabY,front+25,w-20,cabH,bodyD,RGB.wood,owner);
      const gap=10,num=3;for(let k=0;k<num;k++){
        const h=(cabH-gap*(num+1))/num, y=cabY+gap+(k*(h+gap));
        box(left+15,y,front,w-30,h,22,RGB.panel,owner);
        box(left+w*.38,y+h*.50,front-9,w*.24,5,11,'#3f4945',owner);
      }
    }else if(m.kind==='doors'){
      box(left+9,cabY,front+22,w-18,cabH,bodyD,RGB.wood,owner);
      const dw=(w-38)/2;
      box(left+13,cabY+9,front,dw,cabH-18,20,RGB.panel,owner);
      box(left+25+dw,cabY+9,front,dw,cabH-18,20,RGB.panel,owner);
      box(left+dw-13,cabY+cabH/2,front-9,5,50,9,'#373e37',owner);
      box(left+dw+38,cabY+cabH/2,front-9,5,50,9,'#373e37',owner);
    }else if(m.kind==='open'){
      for(const y of [cabY+12,cabY+cabH*.5,cabY+cabH-13])box(left+11,y,front+35,w-22,22,bodyD,RGB.wood,owner);
    }else if(m.kind==='kamado'){
      // Illustrative egg grill; exact grill dimensions are NOT used for clearances.
      const cx=left+w/2,cz=project.depth*.49,ry=Math.min(270,cabH*.43),rx=Math.min(230,(w-50)/2);
      box(cx-150,cabY,cz-135,300,75,270,'#555b4d',owner);
      egg(cx,cabY+ry+95,cz,rx,ry,rx*.95,RGB.kamado,owner);
      box(cx-25,cabY+ry*2+68,cz-25,50,27,50,'#b7b2a3',owner);
      box(cx-100,cabY+ry+30,cz-rx-24,200,24,20,'#55564a',owner);
    }
  }
  for(const b of frame){const d=M.beamBox(b);box(d.x,d.y,d.z,d.w,d.h,d.d,b.axis==='y'?RGB.post:RGB.wood,{type:'frame',id:b.id});}
  for(const b of project.beams){const d=M.beamBox(b);box(d.x,d.y,d.z,d.w,d.h,d.d,RGB.highlight,{type:'beam',id:b.id});}
  if(previewBeam){const d=M.beamBox(previewBeam);box(d.x,d.y,d.z,d.w,d.h,d.d,'#58a882',null);}
  if(project.countertop){box(-8,project.height-24,-14,project.width+16,24,project.depth+28,RGB.top,null,gpu.ready?Infinity:110);}
}
function path(verts){ctx.beginPath();ctx.moveTo(verts[0].x,verts[0].y);for(let i=1;i<verts.length;i++)ctx.lineTo(verts[i].x,verts[i].y);ctx.closePath();}
function drawGrid(){const step=250,margin=600,y=-55;
  // Free drawing uses a large orthographic drafting grid, not a floor-plane illusion.
  if(!project.modules.length && viewAxes()){
    const [a,b]=viewAxes();const point=(u,v)=>{
      const w={x:0,y:0,z:0};w[a]=u;w[b]=v;
      if(currentView==='top'||currentView==='bottom')w.y=100;
      return toScreen([w.x,w.y,w.z]);
    };
    ctx.save();ctx.strokeStyle='rgba(83,119,101,.16)';ctx.lineWidth=1;
    const dimension=k=>k==='x'?project.width:k==='y'?project.height:project.depth;
    for(let u=-500;u<dimension(a)+500;u+=100){const p=point(u,-500),q=point(u,dimension(b)+500);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
    for(let v=-500;v<dimension(b)+500;v+=100){const p=point(-500,v),q=point(dimension(a)+500,v);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
    ctx.restore();return;
  }
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(109,128,112,.10)';
  for(let x=-margin;x<=project.width+margin;x+=step){let a=projectPoint([x,y,-margin]),b=projectPoint([x,y,project.depth+margin]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  for(let z=-margin;z<=project.depth+margin;z+=step){let a=projectPoint([-margin,y,z]),b=projectPoint([project.width+margin,y,z]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
}
function projectPoint(x){return toScreen(x);}
// Convert screen pixels into a movement along two world axes at the selected beam.
// Screen Y points DOWN, while model Y means height UP. An actual projection
// Jacobian prevents inverted movement when orbiting the 3D view.
function dragWorldDelta(dx,dy,beam){
  const center=[beam.x,beam.y,beam.z];
  const pivot=toScreen(center);
  const plane=currentView==='top'?['x','z']:currentView==='side'?['z','y']:['x','y'];
  const basis=plane.map(axis=>{
    const q=center.slice(),i={x:0,y:1,z:2}[axis];q[i]+=100;
    const point=toScreen(q);return {x:(point.x-pivot.x)/100,y:(point.y-pivot.y)/100};
  });
  const [a,b]=basis,det=a.x*b.y-a.y*b.x;
  if(Math.abs(det)<1e-5)return {x:0,y:0,z:0};
  const first=(dx*b.y-dy*b.x)/det,second=(a.x*dy-a.y*dx)/det;
  return {x:0,y:0,z:0,[plane[0]]:first,[plane[1]]:second};
}
function drawDims(){const ww=project.width,hh=project.height,dd=project.depth;
  const pairs=[[[0,hh+85,-55],[ww,hh+85,-55],`${fmt(ww)} mm`],[[ww+90,0,0],[ww+90,hh,0],`${fmt(hh)} mm`],[[ww+65,0,0],[ww+65,0,dd],`${fmt(dd)} mm`]];
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(79,105,88,.48)';ctx.fillStyle='#628071';ctx.font='600 11px system-ui';ctx.textAlign='center';
  for(const [a,b,text] of pairs){const p1=toScreen(a),p2=toScreen(b);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
    for(const p of [p1,p2]){ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();}
    const x=(p1.x+p2.x)/2,y=(p1.y+p2.y)/2-8;ctx.fillText(text,x,y);
  }ctx.restore();
}
function drawLabels(){const {sections}=M.boundaries(project);ctx.save();ctx.textAlign='center';ctx.font='700 11px system-ui';
  for(const s of sections){const p=toScreen([(s.left+s.right)/2,105,-60]);if(p.x<-100||p.x>viewport.w+100)continue;
    const text=s.module.name;const tw=ctx.measureText(text).width;ctx.fillStyle='rgba(255,255,255,.94)';ctx.beginPath();ctx.roundRect(p.x-tw/2-12,p.y-18,tw+24,26,7);ctx.fill();ctx.fillStyle='#4f6658';ctx.fillText(text,p.x,p.y-1);
  }ctx.restore();
}
function draw(){const rect=canvas.getBoundingClientRect();if(rect.width<10||rect.height<10)return;const dpr=Math.min(2.5,window.devicePixelRatio||1);viewport={w:rect.width,h:rect.height};
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewport.w,viewport.h);
  sceneCenter=[project.width/2,project.height/2,project.depth/2];
  const fitting=Math.min(viewport.w/(project.width*1.35+project.depth*.40),viewport.h/(project.height*1.5+project.depth*.64));
  scale=fitting*camera.zoom;
  objects();shapes.sort((a,b)=>b.depth-a.depth);
  hitShapes=shapes.filter(s=>s.owner);
  const gpuRendered=gpu.ready&&gpu.render(shapes,viewport,dpr,{center:sceneCenter,yaw:camera.yaw,pitch:camera.pitch,scale,panX:camera.panX,panY:camera.panY});
  if(!gpuRendered){
    drawGrid();
    for(const s of shapes){ctx.fillStyle=s.fill;path(s.verts);ctx.fill();ctx.strokeStyle=s.stroke;ctx.lineWidth=.8;ctx.stroke();if(selected&&s.owner?.id===selected.id){ctx.strokeStyle='#438f77';ctx.lineWidth=2;ctx.stroke();}}
  }else{
    // Solid surfaces are painted by WebGL with a real depth buffer.
    // Keep the editing handles, selected outlines and dimensions in the 2D overlay.
    if(!project.modules.length){ctx.save();ctx.globalAlpha=.32;drawGrid();ctx.restore();}
    for(const s of shapes){if(selected&&s.owner?.id===selected.id){ctx.strokeStyle='#438f77';ctx.lineWidth=1.6;path(s.verts);ctx.stroke();}}
  }
  drawDims();if(currentView==='3d')drawLabels();
  if(snapHint&&drawMode){
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#15826a';ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(snapHint.x,snapHint.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }
  beamEndHandles=[];
  if((selected?.type='beam'||selected?.type==='frame') && !drawMode){
    const b=getSelected();
    if(b){const pts=['start','end'].map(endpoint=>({endpoint,...toScreen(beamHandlePoint(b,endpoint))}));
      if(Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)>22){
        ctx.save();
        for(const p of pts){
          beamEndHandles.push(p);
          ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
          ctx.lineWidth=3;ctx.strokeStyle='#2b8263';ctx.stroke();
        }
        const cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;
        ctx.fillStyle='#1e5b44';ctx.font='700 12px system-ui';ctx.textAlign='center';
        ctx.fillText(`${fmt(b.length)} mm`,cx,cy-18);
        ctx.restore();
      }
    }
  }
}
function faceContains(pts,x,y){let inside=false;for(let a=0,b=pts.length-1;a<pts.length;b=a++){
  if(((pts[a].y>y)!=(pts[b].y>y))&&(x<(pts[b].x-pts[a].x)*(y-pts[a].y)/(pts[b].y-pts[a].y)+pts[a].x))inside=!inside;
  }return inside;}
function hit(x,y){if(gpu.ready)return gpu.pick(shapes,x,y);for(let i=hitShapes.length-1;i>=0;i--)if(faceContains(hitShapes[i].verts,x,y))return hitShapes[i].owner;return null;}
function setView(v){currentView=v;camera.panX=0;camera.panY=0;snapHint=null;const views={ '3d':[-.62,.32],front:[0,0],side:[-Math.PI/2,0],top:[-.01,-Math.PI/2+.012],bottom:[-.01,Math.PI/2-.012]};[camera.yaw,camera.pitch]=views[v]||views['3d'];$$('.view-btn').forEach(b=>b.classList.toggle('selected',b.dataset.view===v));draw();}
function cutlistHTML(){const p=M.boardPlan(project),warnings=M.warnings(project);
 let h=`<div class="cut-kpis"><div class="cut-kpi"><small>Benodigde balken</small><strong>${p.boards.length} stuks</strong></div><div class="cut-kpi"><small>Zaagstukken</small><strong>${p.pieces}</strong></div><div class="cut-kpi"><small>Restlengte</small><strong>${(p.waste/1000).toFixed(2).replace('.',',')} m</strong></div><div class="cut-kpi"><small>Raming balken</small><strong>${euro(p.estimatedPrice)}</strong></div></div><h4 class="cut-section">ZAAGLIJST — DOUGLAS 50 × 100 MM</h4><table class="cuttable"><thead><tr><th>Onderdeel</th><th>Lengte (mm)</th><th>Aantal</th><th>Totaal</th></tr></thead><tbody>`;
 for(const g of p.groups)h+=`<tr><td>${esc(g.name)}</td><td>${fmt(g.length)}</td><td>${g.count}×</td><td>${fmt(g.length*g.count)} mm</td></tr>`;
 h+=`</tbody></table><h4 class="cut-section">GEOPTIMALISEERD ZAAGPLAN — HANDELSLENGTE ${fmt(project.stockLength)} MM</h4>`;
 p.boards.forEach((b,i)=>{h+=`<div class="bar-plan"><span class="bar-name">Balk ${i+1}</span><div class="bar-track">`;b.cuts.forEach(c=>{const pct=c.length/project.stockLength*100;h+=`<div class="bar-segment" style="width:${pct}%" title="${esc(c.name)}: ${c.length} mm">${pct>11?fmt(c.length):''}</div>`;});h+=`<div class="bar-waste" style="flex:1"></div></div><span class="bar-remainder">${fmt(project.stockLength-b.used)} rest</span></div>`;});
 if(p.impossible.length)h+=`<div class="warning">${p.impossible.length} zaagstukken overschrijden de balklengte van ${fmt(project.stockLength)} mm en zijn NIET opgenomen in het zaagplan.</div>`;
 h+=`<h4 class="cut-section">CONTROLE & BEPERKINGEN</h4>${warnings.map(w=>`<div class="warning">${esc(w)}</div>`).join('')}<div class="notice-small">Materiaalraming is exclusief werkbladen, deuren, lades, schroeven, apparatuur, verbindingsmateriaal en afwerking. Zaagplan: first-fit decreasing (bruikbare benadering, niet mathematisch optimaal). Zaagverlies: ${project.kerf} mm per extra snede in dezelfde handelsbalk. Controleer alle maten, verbindingsdetails en veiligheid vóór aanschaf/bouw.</div>`;
 return h;
}
function showCutlist(){modalOpen=true;$('#modalBackdrop').classList.remove('hidden');$('#modalEyebrow').textContent='OVERZICHT / MATERIALEN';$('#modalTitle').textContent='Zaaglijst & materiaal';$('#modalContent').innerHTML=cutlistHTML();}
function closeModal(){modalOpen=false;$('#modalBackdrop').classList.add('hidden');}
function download(name,text,type='application/json'){const b=new Blob([text],{type}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function exportProject(){download('douglas-designer-project.json',JSON.stringify(project,null,2));toast('Projectbestand aangemaakt');}
function screenshot(){
  draw();
  const outCanvas=document.createElement('canvas');outCanvas.width=canvas.width;outCanvas.height=canvas.height;
  const out=outCanvas.getContext('2d');
  if(!out){toast('Afbeelding maken mislukt');return;}
  out.fillStyle='#f3f5f0';out.fillRect(0,0,outCanvas.width,outCanvas.height);
  if(gpu.ready)out.drawImage(gpuCanvas,0,0,outCanvas.width,outCanvas.height);
  out.drawImage(canvas,0,0,outCanvas.width,outCanvas.height);
  outCanvas.toBlob(b=>{if(!b){toast('Afbeelding maken mislukt');return;}const u=URL.createObjectURL(b),a=document.createElement('a');a.download='douglas-ontwerp.png';a.href=u;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);},'image/png');
}
function handleInput(e){const el=e.target,field=el.dataset.edit;const obj=getSelected();if(!field||!obj)return;
  const isNumeric=['width','x','y','z','length'].includes(field),val=isNumeric?Number(el.value):el.value;
  if(isNumeric&&!Number.isFinite(val)){toast('Ongeldige waarde');render();return;}
  commit(()=>{
    if(selected.type==='frame'){if(['name','length','x','y','z'].includes(field))M.editFrameBeam(project,selected.id,{[field]:val});return;}
    if(field==='kind'&&selected.type==='module'&&M.TYPES[val]){obj.kind=val;obj.name=M.TYPES[val].label;obj.width=Math.max(M.TYPES[val].min,obj.width);}
    else if(field==='width')obj.width=M.clamp(Math.round(val),Math.max(200,M.TYPES[obj.kind].min),2400);
    else if(field==='length')obj.length=M.clamp(Math.round(val),50,6500);
    else if(isNumeric)obj[field]=Math.round(val);
    else if(field==='axis')obj.axis=['x','y','z'].includes(val)?val:obj.axis;
    else if(field==='name')obj.name=String(val).slice(0,60)||'Onderdeel';
  });
}
function updateSettings(e){const t=e.target,id=t.id;if(!['projectName','projectWidth','projectDepth','projectHeight','stockLength','kerf','beamPrice','countertopCheck'].includes(id))return;
  const v=id==='countertopCheck'?t.checked:id==='projectName'?t.value:Number(t.value);
  if(typeof v==='number'&&!Number.isFinite(v)){render();return;}
  if(id==='projectWidth'){let ok=false;commit(()=>{ok=M.resizeProject(project,v);});if(!ok)toast('Breedte te klein voor gekozen modules');}
  else commit(()=>{const rule={projectName:'name',projectDepth:'depth',projectHeight:'height',stockLength:'stockLength',kerf:'kerf',beamPrice:'beamPrice',countertopCheck:'countertop'};const ranges={depth:[400,2000],height:[400,2500],stockLength:[1000,6500],kerf:[0,10],beamPrice:[0,1000]};const key=rule[id];project[key]=ranges[key]?M.clamp(v,...ranges[key]):v;});
  render();
}
function move(id,dir){const idx=project.modules.findIndex(m=>m.id===id),target=idx+dir;if(idx<0||target<0||target>=project.modules.length)return;commit(()=>{[project.modules[idx],project.modules[target]]=[project.modules[target],project.modules[idx]];});}
// Event delegation makes re-rendered lists/inspectors reliable.
document.addEventListener('click',e=>{
  const modCard=e.target.closest('[data-select-module]');
  const beamCard=e.target.closest('[data-select-beam]');
  const frameCard=e.target.closest('[data-select-frame]');
  const b=e.target.closest('button');
  if(modCard && !b){setSelected('module',modCard.dataset.selectModule);return;}
  if(beamCard && !b){setSelected('beam',beamCard.dataset.selectBeam);switchPanel('beams');return;}
  if(frameCard && !b){setSelected('frame',frameCard.dataset.selectFrame);switchPanel('beams');return;}
  if(!b)return;
  if(b.dataset.panel){switchPanel(b.dataset.panel);return;}
  if(b.dataset.mobile){switchMobile(b.dataset.mobile);return;}
  if(b.dataset.view){setView(b.dataset.view);return;}
  if(b.dataset.beamType){if(suppressPresetClick){suppressPresetClick=false;return;}armBeamType(b.dataset.beamType);return;}
  if(b.dataset.add){$('#quickModuleMenu').classList.add('hidden');$('#quickModuleBtn').setAttribute('aria-expanded','false');addModule(b.dataset.add);return;}
  if(b.dataset.moveModule){e.stopPropagation();move(b.dataset.moveModule,Number(b.dataset.direction));return;}
  if(b.dataset.nudge){const [axis,delta]=b.dataset.nudge.split(':');const obj=getSelected();if((selected?.type==='beam'||selected?.type==='frame')&&obj&&['x','y','z'].includes(axis))commit(()=>{if(selected.type==='frame')M.editFrameBeam(project,selected.id,{[axis]:obj[axis]+Number(delta)});else obj[axis]+=Number(delta);});return;}
  switch(b.id){
    case 'undoBtn':history('undo');break;case 'redoBtn':history('redo');break;
    case 'homeBtn':showWelcome();break;
    case 'continueProject':hideWelcome();break;
    case 'newProject':if(window.confirm('Nieuw ontwerp beginnen? Exporteer eerst je huidige ontwerp als je het wilt bewaren.')){commit(()=>{project=M.normalizeProject({name:'Nieuw basisontwerp',modules:[{kind:'open',width:800,name:'Open vak'}],beams:[]});selected=null;});setSelected(null,null);toggleDrawMode(false);hideWelcome();switchMobile('design');toast('Nieuw basisontwerp gestart');}break;
    case 'newFreeProject':if(window.confirm('Leeg tekenvlak openen? Exporteer je huidige ontwerp eerst als je het wilt bewaren.')){
      commit(()=>{project=M.freeProject();selected=null;});setSelected(null,null);
      hideWelcome();switchMobile('design');setView('front');toggleDrawMode(true);
      toast('Leeg tekenvlak · sleep van beginpunt naar eindpunt om een balk te maken');
    }break;
    case 'drawTool':toggleDrawMode(true);break;
    case 'selectTool':toggleDrawMode(false);break;
    case 'demoProject':if(window.confirm('Voorbeeld openen? Je huidige ontwerp wordt vervangen. Exporteer eventueel eerst een kopie.')){commit(()=>{project=M.demoProject();selected=null;});setSelected(null,null);hideWelcome();switchMobile('design');toast('Voorbeeld geopend');}break;
    case 'quickModuleBtn':{const opened=$('#quickModuleMenu').classList.toggle('hidden');b.setAttribute('aria-expanded',String(!opened));break;}
    case 'quickBeamBtn':$('#quickModuleMenu').classList.add('hidden');if(window.innerWidth<=800)switchMobile('modules');switchPanel('beams');toast('Kies een balktype en sleep of tik om te plaatsen');break;
    case 'editSelectionBtn':if(selected)$('#inspector').classList.add('mobile-visible');break;
    case 'closeInspector':if(window.innerWidth<=1250){$('#inspector').classList.remove('mobile-visible');}else{setSelected(null,null);}break;
    case 'duplicateBeam':{const obj=getSelected();if(!['beam','frame'].includes(selected?.type)||!obj)return;let id;commit(()=>{id=M.uid();project.beams.push({...obj,id,name:obj.name+' kopie',x:obj.x+50});});setSelected('beam',id);toast('Balk gedupliceerd');break;}
    case 'exportBtn':case 'modalSecondary':exportProject();break;
    case 'importBtn':$('#fileInput').click();break;
    case 'addBeamBtn':switchPanel('beams');break;
    case 'cancelPlacement':disarmBeam();break;
    case 'dragBeamBtn':beamMoveMode=!beamMoveMode;renderInspector();break;
    case 'restoreSelectedFrame':if(selected?.type==='frame'){commit(()=>M.restoreFrameBeam(project,selected.id));toast('Framebalk hersteld naar standaardmaten');}break;
    case 'restoreAllFrames':commit(()=>{project.frameEdits={};selected=null;});toast('Automatische frameconstructie hersteld');break;
    case 'fitSelectedBeam':{const obj=getSelected();if(selected?.type!=='beam'||!obj)break;const fit=M.fitBeamBetween(project,obj);if(!fit){toast('Geen twee passende steunvlakken rondom de balk gevonden');break;}commit(()=>{obj[obj.axis]=fit.start;obj.length=fit.length;});toast(`Balk passend gemaakt: ${fit.length} mm`);break;}
    case 'resetBtn':if(confirm('Het huidige lokale ontwerp vervangen door het voorbeeldproject? Exporteer eerst een kopie als je het wilt bewaren.')){commit(()=>{project=M.demoProject();selected=null;});toast('Voorbeeldproject hersteld');}break;
    case 'openCutlist':showCutlist();break;case 'closeModal':closeModal();break;
    case 'printBtn':window.print();break;case 'imageBtn':screenshot();break;
    case 'deleteSelected':if(!selected)return;commit(()=>{if(selected.type==='frame'){M.editFrameBeam(project,selected.id,{disabled:true});selected=null;return;}if(selected.type==='module')project.modules=project.modules.filter(m=>m.id!==selected.id);else project.beams=project.beams.filter(b=>b.id!==selected.id);selected=null;if(!project.modules.length)project.countertop=false;});break;
    case 'zoomIn':camera.zoom=M.clamp(camera.zoom*1.16,.35,4);draw();break;
    case 'zoomOut':camera.zoom=M.clamp(camera.zoom/1.16,.35,4);draw();break;
    case 'resetView':camera.zoom=1;setView('3d');break;
    case 'magnetToggle':
      magnetEnabled=!magnetEnabled;updateDraftControls();draw();break;
    case 'shortcutHelpBtn':$('#shortcutHelp').classList.toggle('hidden');break;
    case 'closeShortcutHelp':$('#shortcutHelp').classList.add('hidden');break;
  }
});
// Accessible tap-to-place plus pointer drag for mouse, pencil and touch.
// The document tracks the gesture after the pointer leaves the sidebar.
document.addEventListener('pointerdown',e=>{
  const tile=e.target.closest?.('[data-beam-type]');if(!tile)return;
  paletteGesture={axis:tile.dataset.beamType,startX:e.clientX,startY:e.clientY,moved:false};
});
document.addEventListener('pointermove',e=>{
  if(!paletteGesture)return;
  const g=paletteGesture;
  if(!g.moved&&Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>9){
    g.moved=true;
    if(window.innerWidth<=800)document.body?.classList.add('beam-mobile-drag');
    armBeamType(g.axis);
  }
  if(g.moved){
    const ghost=$('#paletteDragGhost');ghost.classList.remove('hidden');ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
    const rect=canvas.getBoundingClientRect();
    if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)
      updatePlacement(e.clientX-rect.left,e.clientY-rect.top);
  }
});
document.addEventListener('pointerup',e=>{
  if(!paletteGesture)return;
  const g=paletteGesture;paletteGesture=null;$('#paletteDragGhost').classList.add('hidden');
  if(!g.moved)return;
  suppressPresetClick=true;setTimeout(()=>{suppressPresetClick=false;},0);
  const rect=canvas.getBoundingClientRect();
  if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom)
    placeAt(e.clientX-rect.left,e.clientY-rect.top);
  else if(window.innerWidth<=800)switchMobile('design');
  document.body?.classList.remove('beam-mobile-drag');
});
document.addEventListener('pointercancel',()=>{paletteGesture=null;$('#paletteDragGhost').classList.add('hidden');document.body?.classList.remove('beam-mobile-drag');});
$('#inspector').addEventListener('change',handleInput);
$('#sidebar').addEventListener('change',updateSettings);
$('#gridSize').addEventListener('change',e=>{
  const allowed=[5,10,25,50];const n=Number(e.target.value);
  gridSize=allowed.includes(n)?n:5;updateDraftControls();draw();
});
function updateDraftControls(){
  $('#gridSize').value=String(gridSize);
  const btn=$('#magnetToggle');
  btn.textContent=magnetEnabled?'◉ Magnetisch':'○ Magnetisch';
  btn.setAttribute('aria-pressed',String(magnetEnabled));
  btn.classList.toggle('inactive',!magnetEnabled);
}
$('#fileInput').addEventListener('change',async(e)=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Bestand te groot');const raw=JSON.parse(await file.text());if(!raw||!Array.isArray(raw.modules))throw Error('Geen geldig Douglas projectbestand');commit(()=>{project=M.normalizeProject(raw);selected=null;});toast('Project geïmporteerd');}catch(error){toast('Import mislukt: '+error.message);}e.target.value='';});
$('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
window.addEventListener('keydown',e=>{
  const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  const key=e.key.toLowerCase();
  if((e.metaKey||e.ctrlKey)&&key==='z'&&!editing){e.preventDefault();history(e.shiftKey?'redo':'undo');return;}
  if(editing)return;
  if(key==='s'){magnetHeldOff=true;snapHint=null;draw();return;}
  if(key==='escape'){
    $('#shortcutHelp').classList.add('hidden');
    if(armedBeamType)disarmBeam();
    if(drawMode)toggleDrawMode(false);
    if(modalOpen)closeModal();
    if(!drawMode&&!armedBeamType)setSelected(null,null);
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(key==='v'){toggleDrawMode(false);return;}
  if(key==='b'){toggleDrawMode(true);return;}
  if(key==='?'){e.preventDefault();$('#shortcutHelp').classList.toggle('hidden');return;}
  const views={'1':'3d','2':'front','3':'side','4':'top','5':'bottom'};
  if(views[key]){setView(views[key]);return;}
  if((key==='delete'||key==='backspace')&&selected){e.preventDefault();const b=$('#deleteSelected');if(b)b.click();}
});
window.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='s'){magnetHeldOff=false;draw();}});
window.addEventListener('blur',()=>{magnetHeldOff=false;});
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  if(drawMode){
    const start=drawPoint(e.offsetX,e.offsetY);if(!start)return;
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    dragging={mode:'draw-beam',start,startX:e.offsetX,startY:e.offsetY,moved:false};
    return;
  }
  const resize=(selected?.type==='beam'||selected?.type==='frame') && handleAt(e.offsetX,e.offsetY);
  if(resize){
    const b=getSelected();if(b && viewAxes()?.includes(b.axis)){
      pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
      dragging={mode:'resize-beam',endpoint:resize.endpoint,startBeam:{...b},before:JSON.stringify(project),startX:e.offsetX,startY:e.offsetY,moved:false};
      return;
    }
    toast('Gebruik een aanzicht waarin de lengte van de balk zichtbaar is');
  }
  if(armedBeamType){pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});dragging={mode:'place-beam',x:e.offsetX,y:e.offsetY,startX:e.offsetX,startY:e.offsetY,moved:false};updatePlacement(e.offsetX,e.offsetY);return;}
  pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pointers.size===1){
    dragging={x:e.offsetX,y:e.offsetY,startX:e.offsetX,startY:e.offsetY,moved:false};
    // Prioritize the currently selected manual beam if its projected surface
    // is under the pointer; neighboring frame beams otherwise steal the grab.
    const picked=hit(e.offsetX,e.offsetY);
    const selectedFace=(selected?.type==='beam'||selected?.type==='frame') && (gpu.ready ? (picked?.type===selected.type&&picked.id===selected.id) : shapes.some(s=>s.owner?.type===selected.type && s.owner.id===selected.id && faceContains(s.verts,e.offsetX,e.offsetY)));
    const pick=selectedFace ? {type:selected.type,id:selected.id} : picked;
    // Direct touch-and-drag on a loose beam; no extra mode toggle required.
    if(pick?.type==='beam'||pick?.type==='frame'){
      if(selected?.id!==pick.id)setSelected(pick.type,pick.id);
      const b=getSelected();
      if(b){dragging.mode='move-beam';dragging.before=JSON.stringify(project);dragging.startBeam={x:b.x,y:b.y,z:b.z};}
    }
  }
  if(pointers.size===2){dragging=null;const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
});
canvas.addEventListener('pointermove',e=>{if(armedBeamType && (!dragging||dragging.mode==='place-beam'))updatePlacement(e.offsetX,e.offsetY);if(!pointers.has(e.pointerId))return;const before=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)camera.zoom=M.clamp(camera.zoom*dist/pinchDistance,.35,4);pinchDistance=dist;draw();return;}if(!dragging)return;
  const dx=e.offsetX-before.x,dy=e.offsetY-before.y;if(Math.hypot(e.offsetX-dragging.startX,e.offsetY-dragging.startY)>5)dragging.moved=true;
  if(dragging.mode==='draw-beam'){
    const end=drawPoint(e.offsetX,e.offsetY);
    previewBeam=end?M.drawingBeam(dragging.start,end,viewAxes(),{step:gridSize}):null;
    if(previewBeam)$('#drawHelp').textContent=`${previewBeam.name} · ${fmt(previewBeam.length)} mm · loslaten om te plaatsen`;
    else $('#drawHelp').textContent='Sleep minimaal 50 mm in de gewenste richting';
    draw();return;
  }
  if(dragging.mode==='resize-beam'){
    const b=getSelected();if(!b)return;
    const w=drawPoint(e.offsetX,e.offsetY);
    if(w){
      if(selected?.type==='frame'){
        const copy={...b};M.resizeBeamEndpoint(copy,dragging.endpoint,w[b.axis]);
        M.editFrameBeam(project,selected.id,{[b.axis]:copy[b.axis],length:copy.length});
      }else M.resizeBeamEndpoint(b,dragging.endpoint,w[b.axis]);
    }
    draw();return;
  }
  if(dragging.moved){if(dragging.mode==='place-beam')return;if(dragging.mode==='move-beam'){
    const b=getSelected();if(!b)return;
    const sx=e.offsetX-dragging.startX,sy=e.offsetY-dragging.startY;
    const delta=dragWorldDelta(sx,sy,dragging.startBeam);
    const next={x:Math.round((dragging.startBeam.x+delta.x)/5)*5,
      y:Math.round((dragging.startBeam.y+delta.y)/5)*5,
      z:Math.round((dragging.startBeam.z+delta.z)/5)*5};
    if(selected.type==='frame')M.editFrameBeam(project,selected.id,next);
    else Object.assign(b,next);
    draw();
  }else if(viewAxes()){
    // 2D: drag empty canvas to pan instead of unexpectedly orbiting away from the plan.
    camera.panX+=dx;camera.panY+=dy;draw();
  }else{camera.yaw+=dx*.008;camera.pitch=M.clamp(camera.pitch+dy*.006,-1.557,1.557);currentView='custom';$('.view-btn').forEach(b=>b.classList.remove('selected'));draw();}}
});
function pointerEnd(e){
  if(dragging?.mode==='draw-beam'){
    const end=drawPoint(e.offsetX,e.offsetY);
    const beam=end?M.drawingBeam(dragging.start,end,viewAxes(),{step:gridSize}):null;
    previewBeam=null;snapHint=null;dragging=null;pointers.delete(e.pointerId);
    $('#drawHelp').textContent='Sleep van startpunt naar eindpunt · automatische 5 mm maatvoering · Esc om te stoppen';
    if(beam){const id=beam.id;commit(()=>project.beams.push(beam));toggleDrawMode(false);setSelected('beam',id);toast(`Balk getekend: ${beam.length} mm · versleep de groene uiteinden`);}
    else{draw();toast('Sleep minimaal 50 mm om een balk te tekenen');}
    return;
  }
  if(dragging?.mode==='resize-beam'){
    const before=dragging.before;
    dragging=null;pointers.delete(e.pointerId);
    if(JSON.stringify(project)!==before){undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
    return;
  }
  if(dragging?.mode==='place-beam'&&armedBeamType){placeAt(e.offsetX,e.offsetY);pointers.delete(e.pointerId);dragging=null;pinchDistance=0;return;}if(dragging?.mode==='move-beam'&&dragging.moved){
    const beam=getSelected();
    // Recalculate the face-to-face span after EVERY placement, not only when
    // the beam is first dragged out of the palette. Both position and cut length
    // remain in the same undo step.
    const fit=selected?.type==='beam'&&beam ? M.fitBeamBetween(project,beam) : null;
    if(fit){beam[beam.axis]=fit.start;beam.length=fit.length;}
    if(JSON.stringify(project)!==dragging.before){undoStack.push(dragging.before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
    if(fit)toast(`Balk opnieuw passend gemaakt: ${fmt(fit.length)} mm`);
  }
  else if(dragging&&!dragging.moved&&pointers.size===1){const id=hit(e.offsetX,e.offsetY);if(id?.type==='module'||id?.type==='beam'||id?.type==='frame')setSelected(id.type,id.id);else setSelected(null,null);}pointers.delete(e.pointerId);if(!pointers.size){dragging=null;pinchDistance=0;}}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragging=null;pinchDistance=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=M.clamp(camera.zoom*(e.deltaY>0?.91:1.1),.35,4);draw();},{passive:false});
window.addEventListener('resize',()=>{if(window.innerWidth>800){$('#stageArea').classList.remove('hidden');$('#sidebar').classList.remove('mobile-visible');$('#inspector').classList.remove('mobile-visible');}draw();});
if('ResizeObserver' in window)new ResizeObserver(()=>draw()).observe(canvas);
persist();updateDraftControls();render();
function showWelcome(){$('#welcomeLayer').classList.remove('hidden');}
function hideWelcome(){localStorage.setItem(WELCOME_KEY,'seen');$('#welcomeLayer').classList.add('hidden');}
if(!localStorage.getItem(WELCOME_KEY))showWelcome();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js?rev=0.4.1',{updateViaCache:'none'}).catch(()=>{});
})();