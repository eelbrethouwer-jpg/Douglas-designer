/* Douglas Designer v0.4 — dependency-free 3D canvas editor. All geometry in mm. */
(function(){
'use strict';
const M=window.DouglasModel; if(!M) throw new Error('model.js ontbreekt');
const DOCS=window.DouglasDocuments||null;
const APP_VERSION='1.0.0-rc3';
const MAT=window.DouglasMaterials||null; // optioneel: zonder materials.js blijft de zaaglijst werken
const R=window.DouglasRoom; if(!R) throw new Error('room-space.js ontbreekt');
const G=window.DouglasSketchGrid; if(!G) throw new Error('sketch-grid.js ontbreekt');
function normalize(raw){const p=M.normalizeProject(raw);p.room=R.normalizeRoom(raw?.room,p);p.style=R.normalizeStyle(raw?.style);return p;}
const D=window.DouglasDrafting; if(!D) throw new Error('drafting.js ontbreekt');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}).format(n);
const euro=(n)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(n);
const icons={drawers:'▤',fridge:'▣',kamado:'◉',doors:'▥',open:'▧'};
const defaults={drawers:500,fridge:600,kamado:570,doors:520,open:500};
const MESH=window.DouglasMesh||null;
const PE=window.DouglasPlanEditor||null;
const SHARE=window.DouglasShare||null; // optioneel: zonder share.js verdwijnen delen/aanleveren
const PRJ=window.DouglasProjects; if(!PRJ) throw new Error('projects.js ontbreekt');
const store=PRJ.createStore(localStorage); // meerdere projecten; het oude enkelvoudige item blijft als back-up staan
let storageProblem=false;
const WELCOME_KEY='douglas-designer-welcome-v2';
const SKETCH_KEY='douglas-designer-sketch-grid-v1';
let sketchSettings;
try{sketchSettings=G.settings(JSON.parse(localStorage.getItem(SKETCH_KEY)||'null'));}catch(_){sketchSettings=G.settings();}
function saveSketchSettings(){try{localStorage.setItem(SKETCH_KEY,JSON.stringify(sketchSettings));}catch(_){}}
function setSketchSetting(key,value){
 sketchSettings=G.settings({...sketchSettings,[key]:value});
 saveSketchSettings();syncSketchControls();draw();
}
function syncSketchControls(){
 const grid=$('#sketchGridVisible'),axis=$('#sketchAxes'),walls=$('#sketchWallGrid'),step=$('#sketchGridStep'),parallel=$('#sketchParallel');
 if(grid)grid.checked=sketchSettings.visible;
 if(axis)axis.checked=sketchSettings.axes;
 if(walls)walls.checked=sketchSettings.walls;
 if(step)step.value=String(sketchSettings.step);
 if(parallel){parallel.textContent=sketchSettings.parallel?'▤ Parallel':'◈ Perspectief';parallel.setAttribute('aria-pressed',String(sketchSettings.parallel));}
}
let hasSavedProject=false;
let project; try{const boot=store.init(()=>M.demoProject());hasSavedProject=!boot.created && !boot.storageError;project=normalize(boot.project);if(boot.storageError)storageProblem=true;}catch(e){project=normalize(M.demoProject());storageProblem=true;}
let multi=[]; // meerdere geselecteerde balken [{type,id}] (kaderselectie); leeg = enkelvoudige selectie
let marquee=null;
let scanData=null,scanKey='',scanMissingKey='',scanLoading=false,scanPrepKey='',scanWorld=null,scanTriRgb=null,scanOrientB=null,scanRaf=0,scanCanvas=null;
let backdropImg=null,backdropSrc='',calibrate=null,backdropMove=null; // foto-achtergrond
function ensureBackdropEl(){if(backdropImg)return backdropImg;backdropImg=document.createElement('img');backdropImg.id='backdropImg';backdropImg.alt='';backdropImg.setAttribute('aria-hidden','true');
  backdropImg.style.cssText='position:absolute;left:0;top:0;pointer-events:none;z-index:0;transform-origin:0 0;display:none;max-width:none;user-select:none';
  const host=canvas.parentElement;if(host&&host.insertBefore)host.insertBefore(backdropImg,host.firstChild);return backdropImg;}
function backdropActive(){const bd=project.backdrop;return !!(bd&&bd.on&&bd.view===currentView&&viewAxes());}
function drawBackdrop(){
  const el=ensureBackdropEl(),bd=project.backdrop;
  if(!backdropActive()){el.style.display='none';return;}
  if(backdropSrc!==bd.photo){backdropSrc=bd.photo;el.src=bd.photo;}
  const nw=el.naturalWidth,nh=el.naturalHeight;if(!nw||!nh){el.onload=()=>draw();return;}
  const plane=viewAxes(),wh=bd.widthMm*nh/nw;
  const pt=(h,v)=>{const w={x:0,y:0,z:0};w[plane[0]]=h;w[plane[1]]=v;return toScreen([w.x,w.y,w.z]);};
  const tl=pt(bd.x,bd.y+wh),br=pt(bd.x+bd.widthMm,bd.y);
  el.style.display='block';el.style.left=Math.min(tl.x,br.x)+'px';el.style.top=Math.min(tl.y,br.y)+'px';
  el.style.width=Math.abs(br.x-tl.x)+'px';el.style.height=Math.abs(br.y-tl.y)+'px';el.style.opacity=String(bd.opacity);
}
const isSel=o=>!!o&&((selected&&o.id===selected.id)||multi.some(m=>m.type===o.type&&m.id===o.id));
let selected=null, activePanel='modules', mobileView='design', currentView='3d', modalOpen=false, beamMoveMode=false, roomMoveMode=false;
let undoStack=[],redoStack=[],toastTimer=null,lastSaveOk=true;
const camera={yaw:-0.62,pitch:0.32,zoom:1,panX:0,panY:0};
const canvas=$('#scene'),ctx=canvas.getContext('2d');
const gpuCanvas=$('#geometryScene');
const gpu=window.DouglasGpuRenderer?.create(gpuCanvas)||{ready:false};
let shapes=[], hitShapes=[], viewport={w:800,h:500}, dragging=null, pointers=new Map(),pinchDistance=0;
let armedBeamType=null,previewBeam=null,paletteGesture=null,suppressPresetClick=false;
let drawMode=false;
let measureMode=false,measureData=null; // meetgereedschap: {a,b,fixed}
let beamEndHandles=[];
let gridSize=5,magnetEnabled=true,magnetHeldOff=false,snapHint=null;
const viewAxes=()=>currentView==='front'?['x','y']:currentView==='side'?['z','y']:(currentView==='top'||currentView==='bottom')?['x','z']:null;
const snap5=n=>D.snap(n,gridSize);
function toggleMeasureMode(active){
  measureMode=active;measureData=null;if(active){drawMode=false;disarmBeam();if(!viewAxes())setView('front');}
  $('#measureTool').classList.toggle('active',active);$('#measureTool').setAttribute('aria-pressed',String(active));
  $('#selectTool').classList.toggle('active',!active&&!drawMode);$('#drawTool').classList.toggle('active',drawMode);
  $('#drawHelp').classList.toggle('hidden',!active&&!drawMode);
  if(active)$('#drawHelp').textContent='Klik het eerste en daarna het tweede punt · magneet en raster gelden · Esc om te stoppen';
  canvas.classList.toggle('draw-active',active);draw();
}
function toggleDrawMode(active){
  if(measureMode){measureMode=false;measureData=null;$('#measureTool').classList.remove('active');$('#measureTool').setAttribute('aria-pressed','false');}
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
function persist(){
 const r=store.save(project.id,project);
 if(r.ok){lastSaveOk=true;storageProblem=false;const t=new Date(r.savedAt);$('#saveStatus').textContent='● Lokaal opgeslagen · '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');}
 else{lastSaveOk=false;$('#saveStatus').textContent='● Opslag niet beschikbaar';toast((r.error||'Opslag is vol of geblokkeerd')+'. Exporteer het project als JSON-back-up.');}
}
function commit(fn){const before=JSON.stringify(project);fn(project);project.width=M.expectedWidth(project);if(JSON.stringify(project)===before)return;undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
function resetSession(){multi=[];undoStack=[];redoStack=[];selected=null;setSelected(null,null);toggleDrawMode(false);}
// Nieuw project aanmaken en openen; het huidige project blijft ongemoeid in de lijst staan.
function openNewProject(raw,msg){
 const p=normalize(raw),r=store.create(p);
 if(!r.ok){toast('Niet gelukt: '+r.error+'. Het huidige project blijft actief.');return false;}
 project=p;resetSession();render();hideWelcome();switchMobile('design');closeModal();if(msg)toast(msg);return true;
}
function switchProject(id){
 const raw=store.load(id);if(!raw){toast('Project niet gevonden');return;}
 project=normalize(raw);store.setActive(id);resetSession();render();closeModal();toast('Geopend: '+project.name);
}
function history(dir){multi=[];const from=dir==='undo'?undoStack:redoStack,to=dir==='undo'?redoStack:undoStack;if(!from.length)return;to.push(JSON.stringify(project));project=normalize(JSON.parse(from.pop()));selected=null;persist();render();}
function getSelected(){if(!selected)return null;if(selected.type==='module')return project.modules.find(m=>m.id===selected.id);if(selected.type==='beam')return project.beams.find(b=>b.id===selected.id);if(selected.type==='frame')return M.framePieces(project).find(b=>b.id===selected.id);if(selected.type==='panel')return (project.panels||[]).find(b=>b.id===selected.id);return null;}
function setSelected(type,id){
  multi=[];selected=id?{type,id}:null;beamMoveMode=false;render();
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
function setRoomMove(enabled){roomMoveMode=!!enabled&&!!project.room?.enabled;
 if(roomMoveMode){toggleDrawMode(false);setView('top');if(window.innerWidth<=800)switchMobile('design');toast('Sleep de keuken in het bovenaanzicht. Tik op Gereed om te stoppen.');}
 return roomMoveMode;
}
function switchPanel(name){
 document.body?.classList?.toggle?.('room-editing',window.innerWidth<=800&&(name==='room'||name==='finishes'));
 if(window.innerWidth<=800&&(name==='room'||name==='finishes')){
   $('#stageArea').classList.remove('hidden');
   $('#sidebar').classList.add('mobile-visible');
   $('#inspector').classList.remove('mobile-visible');
   $('#selectionStrip').classList.add('hidden');
 }
 activePanel=name;$$('.side-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$$('.sidebar-panel').forEach(p=>p.classList.toggle('hidden',p.id!==`panel-${name}`));}
function switchMobile(name){
  if(name==='room'||name==='finishes'){
    mobileView=name;
    $$('.mobile-tab').forEach(b=>b.classList.toggle('active',b.dataset.mobile===name));
    $('#stageArea').classList.remove('hidden'); // Keep the actual model visible while editing room settings.
    $('#sidebar').classList.add('mobile-visible');
    $('#inspector').classList.remove('mobile-visible');
    $('#selectionStrip').classList.add('hidden');
    switchPanel(name);draw();return;
  }
  if(name==='cutlist'){showCutlist();return;}
  document.body?.classList?.remove('room-editing');
  mobileView=name;
  $$('.mobile-tab').forEach(b=>b.classList.toggle('active',b.dataset.mobile===name));
  $('#stageArea').classList.toggle('hidden',name!=='design');
  $('#sidebar').classList.toggle('mobile-visible',name==='modules'||name==='settings');
  if(name==='modules')switchPanel('modules');
  if(name==='settings')switchPanel('settings');
  $('#inspector').classList.toggle('mobile-visible',name==='design'&&!!selected);
  $('#selectionStrip').classList.toggle('hidden',name!=='design'||!selected);
  if(name==='design'||name==='room')draw();
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
  $('#projectName').value=project.name;$('#projectWidth').value=project.width;$('#projectDepth').value=project.depth;$('#projectHeight').value=project.height;$('#stockLength').value=project.stockLength;$('#kerf').value=project.kerf;$('#beamPrice').value=project.beamPrice;$('#countertopCheck').checked=project.countertop;{const c=project.countertopSpec||M.defaultCountertop();$('#ctThickness').value=c.thickness;$('#ctSide').value=c.overhangSide;$('#ctFront').value=c.overhangFront;$('#ctBack').value=c.overhangBack;}
  for(const field of ['projectWidth','projectDepth','projectHeight'])$('#'+field).readOnly=Boolean(project.plan);
  $('#editPlanDimensions').classList.toggle('hidden',!project.plan);
  $('#dimensionHint').textContent=project.plan
    ?'De buitenmaten volgen uit de zones. Pas de plattegrond aan om een nieuwe 3D-variant te maken.'
    :modules.length?'De buitenbreedte omvat de tussenstijlen van 50 mm. Bij wijzigen schalen de moduleopeningen mee.'
    :'Deze maten bepalen de ontwerpruimte. Losse balken kun je afzonderlijk aanpassen.';
  $('#undoBtn').disabled=!undoStack.length;$('#redoBtn').disabled=!redoStack.length;
  renderInspector();draw();
  window.DouglasRoomStudio?.refresh?.();
}
function timberEstimate(plan){
  const stock=plan.byProfile.filter(x=>x.count>0);
  if(stock.some(x=>!x.priceKnown)){
    return stock.some(x=>x.priceKnown)?euro(plan.estimatedPrice)+' · deels geprijsd':'Prijzen invullen';
  }
  return euro(plan.estimatedPrice);
}
function renderInspector(){
  const obj=getSelected();const body=$('#inspectorBody'),foot=$('#inspectorBottom');
  if(multi.length){
    $('#inspectorTitle').textContent=`${multi.length} balken geselecteerd`;
    body.innerHTML=`<div class="preview-icon">▥▥</div><p class="inspector-label">GROEPSSELECTIE</p><p class="mini-note">Sleep een geselecteerde balk om alles samen te verplaatsen. Ctrl+slepen maakt een nieuw kader; Shift erbij voegt toe.</p><div class="field-grid"><label class="field">ΔX (mm)<input id="grpX" type="number" step="5" value="0"></label><label class="field">ΔY (mm)<input id="grpY" type="number" step="5" value="0"></label><label class="field">ΔZ (mm)<input id="grpZ" type="number" step="5" value="0"></label></div><button class="outline-btn full" id="groupMoveBtn">Verplaats met deze waarden</button><button class="outline-btn full" id="groupCopyBtn">⧉ Kopieer groep met deze waarden</button>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="outline-btn full" id="groupClearBtn">Selectie opheffen</button><button class="danger-btn full" id="groupDeleteBtn">Verwijder selectie</button></div>';
    return;
  }
  if(!obj){
    $('#inspectorTitle').textContent='Projectoverzicht';
    const plan=M.boardPlan(project),warn=M.warnings(project);
    body.innerHTML=`<div class="kpi-banner"><label>BENODIGDE DOUGLAS BALKEN</label><strong>${plan.boards.length} × ${fmt(project.stockLength)} mm</strong><small>${plan.byProfile.filter(x=>x.count).map(x=>x.count+'× '+x.profile.replace('x',' × ')+(x.rafters?' (sparren)':'')).join(' · ') || 'Geen handelsbalken ingepland'} · zaagoptimalisatie</small></div><div class="detail-label"><span>Ontwerp</span><strong>${project.modules.length} modules</strong></div><div class="detail-label"><span>Zaagstukken totaal</span><strong>${plan.pieces} delen</strong></div><div class="detail-label"><span>Totale zaaglengte</span><strong>${(plan.totalLength/1000).toFixed(2).replace('.',',')} m</strong></div><div class="detail-label"><span>Douglas prijsindicatie</span><strong>${timberEstimate(plan)}</strong></div><div class="divider"></div><p class="inspector-label">AANDACHTSPUNTEN</p>${warn.map(w=>`<div class="warning">${esc(w)}</div>`).join('')||'<p class="mini-note">Geen eenvoudige geometrische waarschuwingen gevonden.</p>'}<div class="divider"></div><p class="mini-note">Prijs betreft de Douglas balken (standaardprofiel, tenzij je een eigen prijs invult). Platen, schroeven, beslag en afwerking staan in de materiaallijst. De 3D-modules zijn schematisch.</p>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="primary-btn full" id="openCutlist">▤ Zaaglijst & materiaal bekijken →</button><button class="outline-btn full" id="imageBtn">↓ 3D-aanzicht opslaan (PNG)</button></div>';
    return;
  }
  if(selected.type==='panel'){
    $('#inspectorTitle').textContent=obj.kind==='door'?'Deur':'Wandpaneel';
    body.innerHTML=`<div class="preview-icon">▭</div><p class="inspector-label">${esc(M.PANEL_KINDS[obj.kind]||'Paneel').toUpperCase()} — GEEN CONSTRUCTIE</p><label class="field">Naam<input data-edit="name" value="${esc(obj.name)}"></label><div class="field-grid"><label class="field">Breedte (mm)<input data-edit="w" type="number" step="10" value="${obj.w}"></label><label class="field">Hoogte (mm)<input data-edit="h" type="number" step="10" value="${obj.h}"></label><label class="field">Dikte (mm)<input data-edit="d" type="number" step="5" value="${obj.d}"></label></div><div class="field-grid"><label class="field">X<input data-edit="x" type="number" step="10" value="${obj.x}"></label><label class="field">Y<input data-edit="y" type="number" step="10" value="${obj.y}"></label><label class="field">Z<input data-edit="z" type="number" step="10" value="${obj.z}"></label></div><p class="mini-note">Platen hebben geen draagfunctie en tellen mee in de materiaallijst (m² bekleding, aantal deuren).</p>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="danger-btn full" id="deleteSelected">Verwijder paneel</button></div>';
    return;
  }
  if(selected.type==='module'){
    const spec=M.TYPES[obj.kind];const kindOptions=Object.entries(M.TYPES).map(([k,v])=>`<option value="${k}" ${obj.kind===k?'selected':''}>${v.label}</option>`).join('');
    $('#inspectorTitle').textContent=obj.name;
    body.innerHTML=`<div class="preview-icon">${icons[obj.kind]}</div><p class="inspector-label">MODULE INSTELLINGEN</p><label class="field">Naam<input data-edit="name" value="${esc(obj.name)}" maxlength="60"></label><label class="field">Type<select data-edit="kind">${kindOptions}</select></label><div class="field-grid"><label class="field">Opening breedte (mm)<input data-edit="width" type="number" min="200" max="2400" step="5" value="${obj.width}"></label></div>${(obj.kind==='fridge'||obj.kind==='kamado')?`<div class="divider"></div><p class="inspector-label">APPARAAT — EIGEN MATEN</p><p class="mini-note">Vul de maten uit de fabrikantgegevens in (0 = onbekend). De app controleert alleen of het apparaat in de opening past; ventilatie en hitteafstand blijven je eigen controle.</p><div class="field-grid"><label class="field">Breedte<input data-edit="app_w" type="number" min="0" max="2500" step="5" value="${obj.appliance?.w||0}"></label><label class="field">Diepte<input data-edit="app_d" type="number" min="0" max="2500" step="5" value="${obj.appliance?.d||0}"></label><label class="field">Hoogte<input data-edit="app_h" type="number" min="0" max="2500" step="5" value="${obj.appliance?.h||0}"></label></div>`:''}<div class="divider"></div><p class="inspector-label">GEOMETRIE</p><div class="detail-label"><span>Modulebreedte</span><strong>${fmt(obj.width)} mm</strong></div><div class="detail-label"><span>Buitenhoogte</span><strong>${fmt(project.height)} mm</strong></div><div class="detail-label"><span>Constructiediepte</span><strong>${fmt(project.depth)} mm</strong></div><div class="divider"></div><div class="warning">Modulebeeld is indicatief, niet op basis van fabrikantmetingen. Controleer inbouwmaten, ventilatie en hittebescherming vóór de bouw.</div>`;
    foot.innerHTML='<div class="right-foot-actions"><button class="outline-btn full delete-btn" id="deleteSelected">Verwijder deze module</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>';
  }else{
    const isFrame=selected.type==='frame';
    $('#inspectorTitle').textContent=obj.name;
    const axisField=isFrame?
      `<div class="detail-label"><span>Richting</span><strong>${obj.axis.toUpperCase()} — automatisch frame</strong></div>`:
      `<label class="field">Lengterichting<select data-edit="axis"><option value="x" ${obj.axis==='x'?'selected':''}>X — breedte</option><option value="y" ${obj.axis==='y'?'selected':''}>Y — hoogte</option><option value="z" ${obj.axis==='z'?'selected':''}>Z — diepte</option></select></label>`;
    body.innerHTML=`<div class="preview-icon">▥</div><p class="inspector-label">${isFrame?'AUTOMATISCHE FRAMEBALK — BEWERKBAAR':'VRIJE BALK'} · ${M.profileOf(obj).label.replace(' (standaard)','').replace(' (rachel)','').toUpperCase()}</p><label class="field">Naam<input data-edit="name" value="${esc(obj.name)}"></label><label class="field">Profiel (doorsnede)<select data-edit="profile">${Object.values(M.PROFILES).map(pr=>`<option value="${pr.id}" ${M.profileOf(obj).id===pr.id?'selected':''}>${pr.label}</option>`).join('')}</select></label><div class="field-grid"><label class="field">Lengte (mm)<input data-edit="length" type="number" min="50" max="6500" step="5" value="${obj.length}"></label>${axisField}<label class="field">X vanaf links<input data-edit="x" type="number" step="5" value="${obj.x}"></label><label class="field">Y vanaf onder<input data-edit="y" type="number" step="5" value="${obj.y}"></label><label class="field">Z vanaf voorzijde<input data-edit="z" type="number" step="5" value="${obj.z}"></label></div><div class="nudge-tools"><span>VERPLAATS 5 MM</span><div><button data-nudge="x:-5" title="5 mm links">←</button><button data-nudge="y:5" title="5 mm omhoog">↑</button><button data-nudge="y:-5" title="5 mm omlaag">↓</button><button data-nudge="x:5" title="5 mm rechts">→</button></div><div><button data-nudge="z:-5">Diepte −</button><button data-nudge="z:5">Diepte ＋</button></div></div><div class="notice-small">${isFrame?'Deze balk hoort bij het automatische frame. Jouw positie en lengte worden bewaard en meegerekend in de zaaglijst. Controleer na aanpassen alle verbindingen en draagkracht.':'Sleep de balk direct op het canvas. In 3D en vooraanzicht beweeg je horizontaal en in hoogte; in bovenaanzicht verplaats je de diepte. Coördinaten zijn in mm vanaf links/onder/voorzijde.'}</div>`;
    foot.innerHTML=isFrame?
      '<div class="right-foot-actions"><button class="outline-btn full" id="restoreSelectedFrame">↺ Originele framebalk herstellen</button><button class="outline-btn full" id="duplicateBeam">⧉ Losse kopie maken</button><button class="outline-btn full delete-btn" id="deleteSelected">Deze framebalk uitschakelen</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>':
      '<div class="right-foot-actions"><button class="primary-btn full" id="fitSelectedBeam">↔ Passend maken tussen balken</button><button class="outline-btn full" id="duplicateBeam">⧉ Balk dupliceren</button><button class="outline-btn full delete-btn" id="deleteSelected">Verwijder deze balk</button><button class="primary-btn full" id="openCutlist">▤ Zaaglijst openen</button></div>';
    body.innerHTML+=`<div class="divider"></div><p class="inspector-label">REEKS KOPIËREN</p><p class="mini-note">Maakt vrije kopieën, telkens een stap verder (bijv. rachels h.o.h. 400 mm).</p><div class="field-grid"><label class="field">Aantal<input id="arrCount" type="number" min="1" max="50" step="1" value="3"></label><label class="field">Afstand (mm)<input id="arrSpacing" type="number" step="5" value="400"></label></div><label class="field">Richting<select id="arrAxis"><option value="x" ${obj.axis==='x'?'':'selected'}>X — breedte</option><option value="y">Y — hoogte</option><option value="z" ${obj.axis==='x'?'selected':''}>Z — diepte</option></select></label><button class="outline-btn full" id="arrayBeamBtn">⧉ Reeks maken</button>`;
  }
}
/* Lightweight 3D geometry projector — not a static mockup and no external CDN required. */
let RGB={wood:'#b8824f',end:'#a26c42',highlight:'#d4a16b',top:'#dcb889',post:'#bd8653',panel:'#ad7548',fridge:'#38474f',steel:'#78848a',kamado:'#354740',ground:'#edf0e9'};
function rgb(hex){const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function shade(hex,mul){const r=rgb(hex).map(v=>Math.max(0,Math.min(255,Math.round(v*mul))));return `rgb(${r.join(',')})`;}
let scale=0, sceneCenter, cameraDistance=2000;
function rotate(v){const x=v[0]-sceneCenter[0],y=v[1]-sceneCenter[1],z=v[2]-sceneCenter[2];const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);const xx=c*x+s*z,zz=-s*x+c*z;return [xx,cp*y-sp*zz,sp*y+cp*zz];}
let roomGeometryMode=false;
function toScreenRaw(v){const r=rotate(v),f=sketchSettings.parallel?1:cameraDistance/(cameraDistance+r[2]);return {x:viewport.w/2+r[0]*scale*f+camera.panX,y:viewport.h*.55-r[1]*scale*f+camera.panY,d:r[2]};}
function worldKitchen(v){return R.transformKitchen(v,project,project.room);}
function toScreen(v){return toScreenRaw(worldKitchen(v));}
function poly(coords,fill,owner,stroke='rgba(46,37,28,.18)'){
 const worldVerts=roomGeometryMode?coords:coords.map(worldKitchen);
 const verts=worldVerts.map(toScreenRaw);
 shapes.push({verts,worldVerts,depth:verts.reduce((sum,v)=>sum+v.d,0)/verts.length,fill,stroke,owner});
}
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
// Schuin paneel (dakspar, dakplaat, wand met schuine bovenzijde): onder- en bovenzijde lopen mee langs as 'x' of 'z'.
function slopedBox(q,owner){
  const sl=q.slope,ax=sl.axis==='x';
  const v=(e,t,c)=>{const y=e?sl.y2+(t?sl.h2:0):q.y+(t?q.h:0);return ax?[q.x+(e?q.w:0),y,q.z+(c?q.d:0)]:[q.x+(c?q.w:0),y,q.z+(e?q.d:0)];};
  const faces=[[[0,1,0],[1,1,0],[1,1,1],[0,1,1],1.13],[[0,0,0],[1,0,0],[1,0,1],[0,0,1],.64],[[0,0,0],[1,0,0],[1,1,0],[0,1,0],.8],[[0,0,1],[1,0,1],[1,1,1],[0,1,1],.97],[[0,0,0],[0,1,0],[0,1,1],[0,0,1],.7],[[1,0,0],[1,1,0],[1,1,1],[1,0,1],.85]];
  for(const f of faces)poly(f.slice(0,4).map(a=>v(...a)),shade(q.color,f[4]),owner);
}
function egg(cx,cy,cz,rx,ry,rz,color,owner){const lat=10,lon=18;for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
  function point(theta,phi){const r=Math.sin(theta)*(1+.1*Math.cos(theta)),yy=Math.cos(theta);return [cx+rx*r*Math.cos(phi),cy+ry*yy,cz+rz*r*Math.sin(phi)];}
  const a=i*Math.PI/lat,b=(i+1)*Math.PI/lat,t=j*2*Math.PI/lon,u=(j+1)*2*Math.PI/lon;
  const colorStrength=.78+.22*Math.max(0,Math.cos(t+camera.yaw));poly([point(a,t),point(a,u),point(b,u),point(b,t)],shade(color,colorStrength),owner,'rgba(25,25,22,.16)');
}}
function objects(){shapes=[];hitShapes=[];
  RGB={...RGB,wood:R.colorOf('wood',project.style?.wood),post:R.colorOf('wood',project.style?.wood),highlight:R.colorOf('wood',project.style?.wood),panel:R.colorOf('front',project.style?.front),top:R.colorOf('top',project.style?.top),kamado:R.colorOf('kamado',project.style?.kamado)};
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
      const gap=10,dt=project.style?.drawerType||'',num=dt.startsWith('Eén')||dt==='Kolenlade'||dt==='Afvallade'?1:dt==='Twee lades'?2:3;for(let k=0;k<num;k++){
        const h=(cabH-gap*(num+1))/num, y=cabY+gap+(k*(h+gap));
        box(left+15,y,front,w-30,h,22,RGB.panel,owner);
        const handleColor=(project.style?.handle||'').includes('RVS')?'#abb6b9':'#343b38';
        box(left+w*.38,y+h*.50,front-9,w*.24,5,11,handleColor,owner);
      }
    }else if(m.kind==='doors'){
      box(left+9,cabY,front+22,w-18,cabH,bodyD,RGB.wood,owner);
      const single=project.style?.doorType?.startsWith('Enkele');
      const handleColor=(project.style?.handle||'').includes('RVS')?'#abb6b9':'#343b38';
      if(single){
        box(left+13,cabY+9,front,w-26,cabH-18,20,RGB.panel,owner);
        const onLeft=project.style?.doorType?.includes('links');
        box(onLeft?left+36:right-46,cabY+cabH/2,front-9,6,55,10,handleColor,owner);
      }else{
        const dw=(w-38)/2;
        box(left+13,cabY+9,front,dw,cabH-18,20,RGB.panel,owner);
        box(left+25+dw,cabY+9,front,dw,cabH-18,20,RGB.panel,owner);
        box(left+dw-13,cabY+cabH/2,front-9,5,50,9,handleColor,owner);
        box(left+dw+38,cabY+cabH/2,front-9,5,50,9,handleColor,owner);
      }
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
  for(const q of project.panels||[]){if(q.slope)slopedBox(q,{type:'panel',id:q.id});else box(q.x,q.y,q.z,q.w,q.h,q.d,q.color,{type:'panel',id:q.id});}
  if(previewBeam){const d=M.beamBox(previewBeam);box(d.x,d.y,d.z,d.w,d.h,d.d,'#58a882',null);}
  if(project.countertop){const ct=M.countertopBox(project);box(ct.x,ct.y,ct.z,ct.w,ct.h,ct.d,RGB.top,null,gpu.ready?Infinity:110);}
 drawRoomGeometry();
 drawSketchGuides();
}
function drawSketchGuides(){
 roomGeometryMode=true;
 try{
  for(const guide of G.mesh(project,project.room,sketchSettings)){
   poly(guide.vertices,guide.fill,null,guide.fill);
  }
 }finally{roomGeometryMode=false;}
}
function drawRoomGeometry(){
 const r=project.room;if(!r?.enabled)return;
 roomGeometryMode=true;
 try{
   // Deliberately no front wall: camera can always inspect the kitchen.
   box(0,-85,0,r.width,65,r.depth,r.floorColor,null);
   if(r.backWall)box(0,-20,r.depth-32,r.width,r.height+20,32,r.wallColor,null);
   if(r.leftWall)box(0,-20,0,30,r.height+20,r.depth,r.wallColor,null);
 }finally{roomGeometryMode=false;}
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
  const roomView=project.room?.enabled;
  const bounds=roomView?project.room:project;
  cameraDistance=roomView?Math.max(2000,Math.hypot(bounds.width,bounds.height,bounds.depth)*1.45):
    sketchSettings.visible?Math.max(4000,Math.hypot(project.width+1600,project.height+800,project.depth+1600)*1.4):2000;
  sceneCenter=[bounds.width/2,bounds.height/2,bounds.depth/2];
  const fitting=Math.min(viewport.w/(bounds.width*1.35+bounds.depth*.40),viewport.h/(bounds.height*1.5+bounds.depth*.64));
  scale=fitting*camera.zoom;
  objects();shapes.sort((a,b)=>b.depth-a.depth);
  hitShapes=shapes.filter(s=>s.owner);
  drawBackdrop();drawScan();
  const gpuRendered=gpu.ready&&gpu.render(shapes,viewport,dpr,{center:sceneCenter,yaw:camera.yaw,pitch:camera.pitch,scale,panX:camera.panX,panY:camera.panY,eye:cameraDistance,parallel:sketchSettings.parallel});
  if(!gpuRendered){
    for(const s of shapes){ctx.fillStyle=s.fill;path(s.verts);ctx.fill();ctx.strokeStyle=s.stroke;ctx.lineWidth=.8;ctx.stroke();if(isSel(s.owner)){ctx.strokeStyle=multi.length?'#d9822b':'#438f77';ctx.lineWidth=2;ctx.stroke();}}
  }else{
    // Solid surfaces are painted by WebGL with a real depth buffer.
    // Keep the editing handles, selected outlines and dimensions in the 2D overlay.
    for(const s of shapes){if(isSel(s.owner)){ctx.strokeStyle=multi.length?'#d9822b':'#438f77';ctx.lineWidth=multi.length?2.2:1.6;path(s.verts);ctx.stroke();}}
  }
  drawDims();if(currentView==='3d')drawLabels();
  if(snapHint&&(drawMode||measureMode)){
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#15826a';ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(snapHint.x,snapHint.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }
  if(marquee){const x=Math.min(marquee.x0,marquee.x1),y=Math.min(marquee.y0,marquee.y1),w=Math.abs(marquee.x1-marquee.x0),h=Math.abs(marquee.y1-marquee.y0),cross=marquee.x1<marquee.x0;
    ctx.save();ctx.fillStyle=cross?'rgba(67,143,119,.14)':'rgba(217,130,43,.14)';ctx.strokeStyle=cross?'#438f77':'#d9822b';ctx.lineWidth=1.2;ctx.setLineDash(cross?[5,4]:[]);ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();}
  if(measureData&&measureData.a){
    const plane=viewAxes(),b=measureData.b||measureData.a,A=toScreen([measureData.a.x,measureData.a.y,measureData.a.z]),B=toScreen([b.x,b.y,b.z]),r=D.measure(measureData.a,b,plane);
    ctx.save();ctx.strokeStyle='#d9822b';ctx.fillStyle='#fff';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.setLineDash([]);
    for(const P of [A,B]){ctx.beginPath();ctx.arc(P.x,P.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(r&&r.dist>0){const txt=`${fmt(r.dist)} mm  (Δ${r.h.toUpperCase()} ${fmt(r.dx)} · Δ${r.v.toUpperCase()} ${fmt(r.dy)})`;ctx.font='700 12px sans-serif';const w=ctx.measureText(txt).width+16,mx=(A.x+B.x)/2,my=(A.y+B.y)/2-16;
      ctx.fillStyle='rgba(255,255,255,.95)';ctx.fillRect(mx-w/2,my-12,w,22);ctx.strokeStyle='#d9822b';ctx.lineWidth=1;ctx.strokeRect(mx-w/2,my-12,w,22);ctx.fillStyle='#7a4a12';ctx.textAlign='center';ctx.fillText(txt,mx,my+4);}
    ctx.restore();
  }
  beamEndHandles=[];
  if((selected?.type==='beam'||selected?.type==='frame') && !drawMode){
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
function setView(v){if(v==='iso')v='3d';if(v==='right')v='side';currentView=v;camera.panX=0;camera.panY=0;snapHint=null;const views={ '3d':[-.62,.32],front:[0,0],side:[-Math.PI/2,0],top:[-.01,-Math.PI/2+.012],bottom:[-.01,Math.PI/2-.012]};[camera.yaw,camera.pitch]=views[v]||views['3d'];$$('.view-btn').forEach(b=>b.classList.toggle('selected',b.dataset.view===v));draw();}
function materialsHTML(){
 if(!MAT)return '';
 const list=MAT.build(project,M),s=list.settings;
 const fmtQty=(q)=>Number.isInteger(q)?fmt(q):q.toFixed(1).replace('.',',');
 const num=(key,label,v,min,max,step)=>`<label class="field">${label}<input type="number" data-mat="setting:${key}" value="${v}" min="${min}" max="${max}" step="${step}"></label>`;
 let h=`<h4 class="cut-section">MATERIAALLIJST — BEVESTIGING, PLATEN, BESLAG & AFWERKING</h4><div class="notice-small" style="margin-top:0">Aantallen volgen uit je ontwerp (verbindingen, oppervlakken) en de aannames hieronder. Prijzen zijn je <strong>eigen invoer</strong>: er worden geen actuele prijzen opgehaald.</div>`;
 h+=`<div class="field-grid mat-settings" style="margin-top:14px">${num('screwsPerJoint','Schroeven per verbinding',s.screwsPerJoint,0,20,1)}${num('screwBox','Schroeven per doos',s.screwBox,1,5000,50)}${num('wastePct','Reserve / verlies (%)',s.wastePct,0,50,1)}${num('hingesPerDoorModule','Scharnieren per deurenkast',s.hingesPerDoorModule,0,12,1)}${num('drawerSetsPerModule','Ladegeleiders per ladekast',s.drawerSetsPerModule,0,12,1)}${num('oilCoverage','Dekking olie (m²/L)',s.oilCoverage,1,30,1)}${num('oilCoats','Aantal lagen olie',s.oilCoats,1,5,1)}</div>`;
 h+=`<table class="cuttable mat-table"><thead><tr><th>Materiaal</th><th>Aantal</th><th>Prijs p/e. (€)</th><th>Totaal</th></tr></thead><tbody>`;
 for(const g of list.groups){
  h+=`<tr class="mat-group"><td colspan="4"><strong>${esc(g.title)}</strong></td></tr>`;
  for(const l of g.lines){
   const priceCell=l.priceEditable?`<input type="text" inputmode="decimal" data-mat="price:${l.id}" value="${project.materials?.prices?.[l.id]!==undefined?String(project.materials.prices[l.id]).replace('.',','):''}" placeholder="0,00" aria-label="Prijs ${esc(l.label)}" style="width:84px">`:euro(l.price);
   h+=`<tr><td>${esc(l.label)}<br><small style="color:#8a968d">${esc(l.detail||'')}</small></td><td style="white-space:nowrap">${fmtQty(l.qty)} ${esc(l.unit)}</td><td>${priceCell}</td><td>${l.total?euro(l.total):'—'}</td></tr>`;
  }
 }
 h+=`</tbody></table><div class="cut-kpis" style="grid-template-columns:1fr;margin-top:14px"><div class="cut-kpi"><small>Totaal ontwerpraming (regels met prijs)</small><strong>${euro(list.total)}</strong></div></div><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="outline-btn" id="copyMaterials">⧉ Lijst kopiëren</button><button class="outline-btn" id="csvMaterials">↓ CSV voor Excel</button></div><div class="notice-small">Verbindingen = contactpunten tussen balken in het model. Platen, beslag en afwerking zijn indicatief: kies verbindingsmiddelen, ventilatie en draagkracht altijd volgens fabrikant of constructeur.</div>`;
 return h;
}
function cutlistHTML(){const p=M.boardPlan(project),warnings=M.warnings(project);
 const stockWarning=M.stockWarning(p,project.stockLength);
 let h=(stockWarning?`<div class="warning">${esc(stockWarning)}</div>`:'')+(DOCS?`<div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap;margin-bottom:16px"><button class="primary-btn" id="showDocument">▤ Bouwdocument (tekeningen + lijsten)</button><button class="outline-btn" id="csvParts">↓ Onderdelenlijst CSV</button></div>`:'')+`<div class="cut-kpis"><div class="cut-kpi"><small>Benodigde balken</small><strong>${p.boards.length} stuks</strong></div><div class="cut-kpi"><small>Zaagstukken</small><strong>${p.pieces}</strong></div><div class="cut-kpi"><small>Restlengte</small><strong>${(p.waste/1000).toFixed(2).replace('.',',')} m</strong></div><div class="cut-kpi"><small>Raming balken</small><strong>${timberEstimate(p)}</strong></div></div><h4 class="cut-section">ZAAGLIJST — DOUGLAS BALKEN PER PROFIEL</h4><table class="cuttable"><thead><tr><th>Onderdeel</th><th>Lengte (mm)</th><th>Aantal</th><th>Totaal</th></tr></thead><tbody>`;
 for(const g of p.groups)h+=`<tr><td>${esc(g.name)}${g.profile!==M.DEFAULT_PROFILE?` <small style="color:#8a968d">${esc(M.PROFILES[g.profile].label)}</small>`:''}</td><td>${fmt(g.length)}</td><td>${g.count}×</td><td>${fmt(g.length*g.count)} mm</td></tr>`;
 h+=`</tbody></table><h4 class="cut-section">GEOPTIMALISEERD ZAAGPLAN — HANDELSLENGTE ${fmt(project.stockLength)} MM</h4>`;
 p.boards.forEach((b,i)=>{h+=`<div class="bar-plan"><span class="bar-name">Balk ${i+1}${b.profile!==M.DEFAULT_PROFILE?`<br><small>${esc(b.profile)}</small>`:''}</span><div class="bar-track">`;b.cuts.forEach(c=>{const pct=c.length/project.stockLength*100;h+=`<div class="bar-segment" style="width:${pct}%" title="${esc(c.name)}: ${c.length} mm">${pct>11?fmt(c.length):''}</div>`;});h+=`<div class="bar-waste" style="flex:1"></div></div><span class="bar-remainder">${fmt(project.stockLength-b.used)} rest</span></div>`;});
 h+=materialsHTML();
 h+=`<h4 class="cut-section">CONTROLE & BEPERKINGEN</h4>${warnings.filter(w=>w!==stockWarning).map(w=>`<div class="warning">${esc(w)}</div>`).join('')}<div class="notice-small">De balkenraming hierboven omvat alleen Douglas balken; platen, schroeven, beslag en afwerking staan in de materiaallijst. Zaagplan: first-fit decreasing (bruikbare benadering, niet mathematisch optimaal). Zaagverlies: ${project.kerf} mm per extra snede in dezelfde handelsbalk. Controleer alle maten, verbindingsdetails en veiligheid vóór aanschaf/bouw.</div>`;
 return h;
}
function showCutlist(){modalOpen=true;$('#modalBackdrop').classList.remove('hidden');$('#modalEyebrow').textContent='OVERZICHT / MATERIALEN';$('#modalTitle').textContent='Zaaglijst & materiaal';$('#modalContent').innerHTML=cutlistHTML();}
function showDocument(){if(!DOCS)return;modalOpen=true;$('#modalBackdrop').classList.remove('hidden');$('#modalEyebrow').textContent='BOUWDOCUMENT / ONTWERPRAMING';$('#modalTitle').textContent='Bouwdocument';
  $('#modalContent').innerHTML=`<div class="right-foot-actions" style="flex-direction:row;margin-bottom:12px"><button class="outline-btn" id="openCutlist">← Terug naar zaaglijst</button></div>`+DOCS.documentHTML(project,M,MAT,{version:APP_VERSION});$('#modalContent').scrollTop=0;}
function templateChoicesHTML(){
 const templates=globalThis.DouglasStartontwerpen || [];
 if(!templates.length)return '';
 const buttons=templates.map((t,index)=>
  `<button type="button" class="outline-btn" data-proj="template:${index}">${esc(t.name)} · ${fmt(t.width)} × ${fmt(t.depth)} mm</button>`
 ).join('');
 return `<section aria-label="Start vanuit template"><h3 class="cut-section">Start vanuit template</h3><div class="template-choices">${buttons}</div></section>`;
}
function projectsHTML(){
 const items=store.list(),trash=store.trashList(),when=(t)=>new Date(t).toLocaleString('nl-NL',{dateStyle:'short',timeStyle:'short'});
 const kb=(n)=>n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';
 let h=`<div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap;margin-bottom:14px"><button class="primary-btn" data-proj="new">＋ Nieuw (met vak)</button><button class="outline-btn" data-proj="free">✎ Vrij tekenen</button><button class="outline-btn" data-proj="demo">◈ Voorbeeld</button><button class="outline-btn" data-proj="import">↥ Project importeren</button></div>`;
 h+=templateChoicesHTML();
 h+=`<table class="cuttable proj-table"><thead><tr><th>Project</th><th>Laatst gewijzigd</th><th>Grootte</th><th></th></tr></thead><tbody>`;
 for(const it of items)h+=`<tr${it.active?' style="background:#f2f7f1"':''}><td><input data-proj-name="${esc(it.id)}" value="${esc(it.name)}" maxlength="80" aria-label="Projectnaam" style="width:100%;min-width:140px;border:1px solid #dce1d9;border-radius:7px;padding:7px 9px;font:inherit">${it.active?'<small style="color:#2f7059;font-weight:700"> ● actief</small>':''}</td><td>${esc(when(it.updatedAt))}</td><td>${kb(it.bytes)}</td><td style="white-space:nowrap;text-align:right">${it.active?'':`<button class="outline-btn" data-proj="open:${esc(it.id)}">Openen</button> `}<button class="outline-btn" data-proj="dup:${esc(it.id)}" title="Dupliceren">⧉</button> <button class="outline-btn delete-btn" data-proj="del:${esc(it.id)}" title="Verwijderen (naar prullenbak)">✕</button></td></tr>`;
 h+=`</tbody></table>`;
 if(trash.length){h+=`<h4 class="cut-section">PRULLENBAK (LAATSTE ${trash.length})</h4><table class="cuttable"><tbody>`;for(const t of trash)h+=`<tr><td>${esc(t.name)}</td><td>${esc(when(t.deletedAt))}</td><td style="text-align:right"><button class="outline-btn" data-proj="restore:${esc(t.trashId)}">↺ Terugzetten</button></td></tr>`;h+=`</tbody></table>`;}
 h+=`<h4 class="cut-section">BACK-UP</h4><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="outline-btn" data-proj="exportAll">↓ Alle projecten exporteren</button></div><div class="notice-small">Je projecten staan alleen in deze browser. Opslag in gebruik: ca. ${kb(store.usage()*2)} (browsers staan meestal ca. 5 MB toe; foto's nemen de meeste ruimte in). Maak regelmatig een back-up. Importeren voegt altijd <strong>nieuwe</strong> projecten toe en overschrijft nooit iets.</div>`;
 return h;
}
function showProjects(){modalOpen=true;$('#modalBackdrop').classList.remove('hidden');$('#modalEyebrow').textContent='PROJECTEN';$('#modalTitle').textContent='Mijn projecten';$('#modalContent').innerHTML=projectsHTML();}
function projectAction(spec){
 const [act,...rest]=spec.split(':'),id=rest.join(':');
 if(act==='new')openNewProject({name:'Nieuw basisontwerp',modules:[{kind:'open',width:800,name:'Open vak'}],beams:[]},'Nieuw basisontwerp gestart');
 else if(act==='free'){if(openNewProject(M.freeProject())){setView('front');toggleDrawMode(true);}}
 else if(act==='template'){
  const template=globalThis.DouglasStartontwerpen?.[id];
  if(template && openNewProject({...template,id:M.uid()},'Startontwerp geopend als nieuw project'))setView('3d');
 }
 else if(act==='demo')openNewProject(M.demoProject(),'Voorbeeld geopend');
 else if(act==='import')$('#fileInput').click();
 else if(act==='open')switchProject(id);
 else if(act==='dup'){const r=store.duplicate(id);if(r.ok){toast('Gedupliceerd');showProjects();}else toast('Dupliceren mislukt: '+r.error);}
 else if(act==='del'){
  const was=id===project.id,r=store.trash(id);
  if(!r.ok){toast('Verwijderen mislukt: '+r.error);return;}
  if(was){if(r.activeId)switchProject(r.activeId);else openNewProject(M.demoProject());}
  toast('Naar prullenbak verplaatst; terug te zetten in dit overzicht');showProjects();
 }
 else if(act==='restore'){const r=store.restore(id);if(r.ok){toast('Teruggezet');switchProject(r.id);showProjects();}else toast('Terugzetten mislukt: '+r.error);}
 else if(act==='exportAll'){download('douglas-designer-alle-projecten.json',store.exportAll());toast('Back-up van alle projecten opgeslagen');}
}

/* ---------- delen en aanleveren (zonder server) ---------- */
let shareLink='',deliveryDraft={name:'',width:'',depth:'',height:'',notes:'',photos:[]},pendingReceive=null;
const canNativeShare=()=>typeof navigator!=='undefined'&&typeof navigator.share==='function';
function openModal(eyebrow,title,html){modalOpen=true;$('#modalBackdrop').classList.remove('hidden');$('#modalEyebrow').textContent=eyebrow;$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('#modalContent').scrollTop=0;}
async function copyText(text,okMsg){try{await navigator.clipboard.writeText(text);toast(okMsg||'Gekopieerd');return true;}catch(_){toast('Kopiëren niet gelukt; selecteer de tekst en kopieer handmatig');return false;}}
function fileFor(name,text,type='application/json'){return new File([text],name,{type});}
async function shareOrDownload(file,title,text){
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title,text});return;}}
 catch(e){if(e&&e.name==='AbortError')return;}
 download(file.name,await file.text(),file.type);toast('Bestand opgeslagen; stuur het zelf door (mail, WhatsApp, AirDrop)');
}
function showShare(){
 if(!SHARE)return;
 const ref=project.reference;
 let h=`<div class="notice-small" style="margin-top:0">Deze app heeft geen server: delen gaat via een <strong>link</strong> of een <strong>bestand</strong>. Foto's gaan alleen mee als bestand. De gegevens in een link blijven in de link zelf en worden niet naar een server gestuurd.</div>`;
 h+=`<h4 class="cut-section">LINK NAAR DIT PROJECT (ZONDER FOTO'S)</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="shareLinkInput" readonly value="Link wordt gemaakt…" style="flex:1;min-width:220px;border:1px solid #dce1d9;border-radius:8px;padding:9px;font:inherit" aria-label="Deellink"><button class="outline-btn" data-share="copyLink">⧉ Kopieer link</button>${canNativeShare()?'<button class="outline-btn" data-share="nativeLink">⇪ Delen…</button>':''}</div><p class="mini-note" id="shareLinkNote"></p>`;
 h+=`<h4 class="cut-section">MATERIAALLIJST</h4><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="outline-btn" data-share="copyList">⧉ Kopieer als tekst</button>${canNativeShare()?'<button class="outline-btn" data-share="nativeList">⇪ Delen…</button>':''}<button class="outline-btn" data-share="csvList">↓ CSV</button></div>`;
 h+=`<h4 class="cut-section">PROJECTBESTAND</h4><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="outline-btn" data-share="nativeFile">⇪ ${canNativeShare()?'Bestand delen…':'Bestand opslaan'}</button><button class="outline-btn" data-share="download">↓ Download (.json)</button></div><p class="mini-note">Een ontvangen bestand open je via <em>Project importeren</em>; het wordt altijd als nieuw project toegevoegd.</p>`;
 h+=`<h4 class="cut-section">AANLEVEREN VANAF JE TELEFOON</h4><p class="mini-note">Open deze app op je telefoon en kies <em>Delen → Aanleveren</em>. Vul maten in, voeg foto's toe en stuur het naar jezelf. Op je laptop importeer je het bestand of open je de link.</p><button class="primary-btn" data-share="deliver">📷 Aanleveren…</button>`;
 if(ref){h+=`<h4 class="cut-section">ONTVANGEN REFERENTIES IN DIT PROJECT</h4>${ref.notes?`<div class="notice-small" style="margin-top:0;white-space:pre-wrap">${esc(ref.notes)}</div>`:''}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${ref.photos.map((p,i)=>`<div style="width:150px"><img src="${p}" alt="Referentiefoto ${i+1}" style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #dce1d9"><div style="display:flex;gap:4px;margin-top:4px"><button class="outline-btn" style="flex:1;min-height:30px;padding:0 6px;font-size:11px" data-share="usePhoto:${i}">Als ruimtefoto</button><button class="outline-btn delete-btn" style="min-height:30px;padding:0 8px" data-share="delPhoto:${i}" aria-label="Foto verwijderen">✕</button></div></div>`).join('')}</div>`;}
 openModal('DELEN','Delen & aanleveren',h);
 shareLink='';
 SHARE.encodeLinkData(SHARE.buildProjectPayload(project)).then(data=>{
  const el=$('#shareLinkInput');if(!el)return;
  shareLink=SHARE.linkFor(location.href,data);el.value=shareLink;
  const note=$('#shareLinkNote');if(note)note.textContent=shareLink.length>8000?'Deze link is lang ('+Math.round(shareLink.length/1000)+' kB); sommige apps knippen lange links af. Gebruik dan het projectbestand.':'';
 }).catch(()=>{const el=$('#shareLinkInput');if(el)el.value='Link maken is niet gelukt; gebruik het projectbestand.';});
}
async function shareAction(spec){
 const [act,...rest]=spec.split(':'),arg=rest.join(':');
 if(act==='copyLink'){if(shareLink)await copyText(shareLink,'Link gekopieerd');}
 else if(act==='nativeLink'){if(shareLink)try{await navigator.share({title:project.name,url:shareLink});}catch(e){if(e&&e.name!=='AbortError')await copyText(shareLink,'Delen niet mogelijk; link gekopieerd');}}
 else if(act==='copyList'||act==='nativeList'){
  if(!MAT){toast('Materiaallijst niet beschikbaar');return;}
  const text=MAT.toText(MAT.build(project,M),project.name);
  if(act==='copyList')await copyText(text,'Materiaallijst gekopieerd');
  else try{await navigator.share({title:'Materiaallijst '+project.name,text});}catch(e){if(e&&e.name!=='AbortError')await copyText(text,'Delen niet mogelijk; tekst gekopieerd');}
 }
 else if(act==='csvList'){if(MAT)download(safeName()+'-materiaallijst.csv',MAT.toCSV(MAT.build(project,M)),'text/csv;charset=utf-8');}
 else if(act==='nativeFile')await shareOrDownload(fileFor(safeName()+'.douglas.json',JSON.stringify(SHARE.buildProjectPayload(project))),project.name);
 else if(act==='download')exportProject();
 else if(act==='deliver')showDeliver();
 else if(act==='usePhoto'){const ph=project.reference?.photos?.[+arg];if(!ph)return;commit(()=>{project.room=R.normalizeRoom({...project.room,photo:ph,corners:[],enabled:project.room?.enabled},project);});toast('Ruimtefoto ingesteld. Markeer de vier vloerhoeken via Ruimte.');showShare();}
 else if(act==='delPhoto'){commit(()=>{const r=project.reference;if(!r)return;r.photos.splice(+arg,1);if(!r.photos.length&&!r.notes)delete project.reference;});showShare();}
}
function deliveryFormHTML(){
 const d=deliveryDraft,f=(k,l,ph)=>`<label class="field">${l}<input data-draft="${k}" type="number" min="1200" max="20000" step="10" inputmode="numeric" placeholder="${ph}" value="${esc(d[k])}"></label>`;
 return `<div class="notice-small" style="margin-top:0">Vul in wat je weet; alles is optioneel. Je verstuurt het daarna naar jezelf (WhatsApp, Mail, AirDrop). Maten in <strong>millimeter</strong>. Foto's worden verkleind (max. ${SHARE.LIMITS.photos}).</div>
 <label class="field" style="margin-top:12px">Omschrijving<input data-draft="name" maxlength="${SHARE.LIMITS.name}" placeholder="bijv. Terras achter" value="${esc(d.name)}"></label>
 <div class="field-grid">${f('width','Ruimte breedte (mm)','4500')}${f('depth','Ruimte diepte (mm)','3200')}${f('height','Ruimte hoogte (mm)','2700')}</div>
 <label class="field">Opmerkingen<textarea data-draft="notes" rows="3" maxlength="${SHARE.LIMITS.notes}" placeholder="bijv. afstand tot de schuur, stopcontact links" style="border:1px solid #dce1d9;border-radius:8px;padding:9px;font:inherit;resize:vertical">${esc(d.notes)}</textarea></label>
 <div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="outline-btn" data-deliver="addPhoto">🖼️ Foto's kiezen</button><button class="outline-btn" data-deliver="takePhoto">📷 Foto maken</button></div>
 <div id="deliverPhotos" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">${deliveryPhotosHTML()}</div>
 <div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="primary-btn" data-deliver="send">⇪ ${canNativeShare()?'Versturen…':'Bestand opslaan'}</button><button class="outline-btn" data-deliver="link">⧉ Link kopiëren (zonder foto's)</button></div><p class="mini-note">Bestand = inclusief foto's. Link = alleen maten en opmerkingen.</p>`;
}
const deliveryPhotosHTML=()=>deliveryDraft.photos.map((p,i)=>`<div style="position:relative"><img src="${p}" alt="Foto ${i+1}" style="width:96px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #dce1d9"><button class="outline-btn delete-btn" style="position:absolute;top:2px;right:2px;min-height:24px;width:24px;padding:0" data-deliver="rm:${i}" aria-label="Foto verwijderen">✕</button></div>`).join('')||'<span class="mini-note">Nog geen foto\'s</span>';
function showDeliver(){if(SHARE)openModal('AANLEVEREN','Aanleveren (maten & foto\'s)',deliveryFormHTML());}
function compressImageFile(file,startDim){return new Promise((res,rej)=>{
 if(!(/^image\//.test(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name)))return rej(new Error('Geen afbeelding'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);let maxDim=startDim||1280,q=.72;
  for(let i=0;i<7;i++){const s=Math.min(1,maxDim/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');
   c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);const out=c.toDataURL('image/jpeg',q);
   if(out.length<=SHARE.LIMITS.photoChars&&SHARE.JPEG.test(out))return res(out);maxDim=Math.round(maxDim*.8);q=Math.max(.45,q-.06);}
  rej(new Error('Foto te groot'));};
 img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Foto kon niet gelezen worden (formaat niet ondersteund)'));};img.src=url;});}
async function addDeliveryPhotos(files){
 let added=0;
 for(const f of [...files]){
  if(deliveryDraft.photos.length>=SHARE.LIMITS.photos){toast('Maximaal '+SHARE.LIMITS.photos+' foto\'s');break;}
  try{deliveryDraft.photos.push(await compressImageFile(f));added++;}catch(e){toast(f.name+': '+e.message);}
 }
 const box=$('#deliverPhotos');if(box)box.innerHTML=deliveryPhotosHTML();
 if(added)toast(added+' foto'+(added===1?'':"'s")+' toegevoegd');
}
function deliveryPayload(withPhotos){return SHARE.buildDeliveryPayload({...deliveryDraft,room:{width:deliveryDraft.width,depth:deliveryDraft.depth,height:deliveryDraft.height},photos:withPhotos?deliveryDraft.photos:[]});}
async function deliverAction(spec){
 const [act,...rest]=spec.split(':'),arg=rest.join(':');
 if(act==='addPhoto')$('#photoInput').click();
 else if(act==='takePhoto')$('#cameraInput').click();
 else if(act==='rm'){deliveryDraft.photos.splice(+arg,1);$('#deliverPhotos').innerHTML=deliveryPhotosHTML();}
 else if(act==='send'||act==='link'){
  const payload=deliveryPayload(act==='send'),v=SHARE.validate(payload);
  if(!v.ok){toast(v.error==='De aanlevering bevat geen maten, opmerkingen of foto\'s'?'Vul minstens iets in: maten, opmerking of een foto':v.error);return;}
  if(act==='send')await shareOrDownload(fileFor('aanlevering-'+((deliveryDraft.name||'ruimte').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'ruimte')+'.douglas.json',JSON.stringify(payload)),'Aanlevering '+(deliveryDraft.name||'ruimte'),SHARE.deliverySummaryText(v.summary));
  else{const data=await SHARE.encodeLinkData(payload),url=SHARE.linkFor(location.href,data);await copyText(url,'Link gekopieerd'+(url.length>8000?' (lang: gebruik liever het bestand)':''));}
 }
}
// Ontvangen bestand of link: eerst tonen wat erin zit; pas toepassen na bevestiging.
function receivePayload(parsed){
 const v=SHARE?SHARE.validate(parsed):{ok:false,error:'Delen is niet beschikbaar'};
 if(!v.ok){toast('Niet gelukt: '+v.error);return false;}
 pendingReceive=v;hideWelcome();
 let h='';
 if(v.type==='project')h=`<div class="notice-small" style="margin-top:0">Ontvangen project: <strong>${esc(v.summary.name)}</strong> (${v.summary.modules} modules, ${v.summary.beams} losse balken). Het wordt als <strong>nieuw project</strong> toegevoegd; je huidige project blijft ongewijzigd.</div><div class="right-foot-actions" style="flex-direction:row;margin-top:14px"><button class="primary-btn" data-recv="project">＋ Toevoegen als nieuw project</button><button class="outline-btn" data-recv="cancel">Annuleren</button></div>`;
 else{const s=v.summary;h=`<div class="notice-small" style="margin-top:0">Ontvangen aanlevering${s.name&&s.name!=='Aanlevering'?': <strong>'+esc(s.name)+'</strong>':''}: ${esc(SHARE.deliverySummaryText(s))}.${s.droppedPhotos?` ${s.droppedPhotos} bijlage(n) overgeslagen (geen geldige of te grote JPEG).`:''}${s.notes?`<br><br><em style="white-space:pre-wrap">${esc(s.notes)}</em>`:''}</div>${s.photos?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">${v.payload.photos.map((p,i)=>`<img src="${p}" alt="Foto ${i+1}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #dce1d9">`).join('')}</div>`:''}<p class="mini-note">Maten gelden als ruimte (3D-ruimte wordt ingeschakeld); de eerste foto wordt ruimtefoto, waarna je de vier vloerhoeken markeert. Foto's en opmerkingen blijven als referentie bij het project.</p><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="primary-btn" data-recv="applyCurrent">Toepassen op huidig project</button><button class="outline-btn" data-recv="newProject">Nieuw project maken</button><button class="outline-btn" data-recv="cancel">Annuleren</button></div>`;}
 openModal('ONTVANGEN',v.type==='project'?'Project ontvangen':'Aanlevering ontvangen',h);return true;
}
function receiveAction(act){
 const v=pendingReceive;if(!v&&act!=='cancel')return;
 if(act==='cancel'){pendingReceive=null;closeModal();return;}
 if(act==='project'){const ok=openNewProject(v.payload.project,'Project ontvangen en toegevoegd');if(ok)pendingReceive=null;}
 else if(act==='applyCurrent'){commit(()=>{project=normalize(SHARE.applyDelivery(project,v.payload));});pendingReceive=null;closeModal();toast('Aanlevering toegepast op '+project.name);}
 else if(act==='newProject'){const ok=openNewProject(SHARE.applyDelivery({name:v.payload.name||'Aanlevering',modules:[{kind:'open',width:800,name:'Open vak'}],beams:[]},v.payload),'Nieuw project met aanlevering gemaakt');if(ok)pendingReceive=null;}
}
async function checkShareHash(){
 if(!SHARE)return;const data=SHARE.dataFromHash(location.hash);if(!data)return;
 try{const parsed=await SHARE.decodeLinkData(data);try{window.history.replaceState(null,'',location.pathname+location.search);}catch(_){}receivePayload(parsed);}
 catch(e){toast('Link kon niet worden gelezen: '+e.message);}
}

// ---------- 3D-scan (referentiemodel) ----------
const activeKey=()=>{try{return store&&store.activeId?String(store.activeId()||'x'):'x';}catch(e){return 'x';}};
function scanDB(){return new Promise((res,rej)=>{if(typeof indexedDB==='undefined')return rej(new Error('Opslag niet beschikbaar'));const r=indexedDB.open('douglas-designer-scans',1);r.onupgradeneeded=()=>r.result.createObjectStore('scans');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function scanIO(mode,key,val){const db=await scanDB();return new Promise((res,rej)=>{const tx=db.transaction('scans',mode==='get'?'readonly':'readwrite'),st=tx.objectStore('scans'),rq=mode==='get'?st.get(key):mode==='put'?st.put(val,key):st.delete(key);tx.oncomplete=()=>res(rq.result);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('Opslag mislukt'));});}
function setScanData(d){scanData=d;scanKey=activeKey();scanPrepKey='';scanMissingKey='';scanOrientB=null;}
async function loadScan(){
  if(scanLoading||!MESH)return;scanLoading=true;const key=activeKey();
  try{const v=await scanIO('get',key);
    if(v&&v.positions&&v.indices&&v.colors){if(activeKey()===key){scanData=v;scanKey=key;scanPrepKey='';scanOrientB=null;}}
    else{scanMissingKey=key;toast('De 3D-scan van dit project staat niet meer op dit apparaat. Importeer hem opnieuw via 🧊 Scan.');}
  }catch(e){scanMissingKey=key;}
  scanLoading=false;draw();
}
function scanPrepare(){
  const sc=project.scan,key=[sc.scale,sc.rotY,sc.zUp,sc.x,sc.y,sc.z,scanKey].join('|');
  if(key===scanPrepKey&&scanWorld)return;
  scanPrepKey=key;
  const oriented=MESH.orient(scanData.positions,sc.zUp);
  scanWorld=MESH.transform(oriented,sc);
  const idx=scanData.indices,n=idx.length/3,rgb=new Array(n),L=[.3,.8,.5],ln=Math.hypot(...L);
  for(let t=0;t<n;t++){
    const a=idx[t*3]*3,b=idx[t*3+1]*3,c=idx[t*3+2]*3;
    const ux=scanWorld[b]-scanWorld[a],uy=scanWorld[b+1]-scanWorld[a+1],uz=scanWorld[b+2]-scanWorld[a+2],vx=scanWorld[c]-scanWorld[a],vy=scanWorld[c+1]-scanWorld[a+1],vz=scanWorld[c+2]-scanWorld[a+2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const nl=Math.hypot(nx,ny,nz)||1;
    const k=.58+.42*Math.abs((nx*L[0]+ny*L[1]+nz*L[2])/(nl*ln)),cd=scanData.colors;
    rgb[t]=`rgb(${Math.round((cd[a]+cd[b]+cd[c])/3*k)},${Math.round((cd[a+1]+cd[b+1]+cd[c+1])/3*k)},${Math.round((cd[a+2]+cd[b+2]+cd[c+2])/3*k)})`;
  }
  scanTriRgb=rgb;
}
function ensureScanCanvas(){
  if(scanCanvas)return scanCanvas;const bd=ensureBackdropEl();
  scanCanvas=document.createElement('canvas');scanCanvas.id='scanCanvas';scanCanvas.setAttribute('aria-hidden','true');
  scanCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;display:none';
  const host=canvas.parentElement;if(host&&host.insertBefore)host.insertBefore(scanCanvas,bd.nextSibling);return scanCanvas;
}
function drawScan(){
  if(!MESH)return;const sc=project.scan;
  if(!sc||!sc.on){if(scanCanvas)scanCanvas.style.display='none';return;}
  if(!scanData||scanKey!==activeKey()){if(scanCanvas)scanCanvas.style.display='none';if(scanMissingKey!==activeKey())loadScan();return;}
  if(scanRaf)return;const raf=window.requestAnimationFrame||(f=>setTimeout(f,0));scanRaf=raf(()=>{scanRaf=0;renderScan();});
}
function renderScan(){
  const sc=project.scan;if(!sc||!sc.on||!scanData)return;const cv=ensureScanCanvas();scanPrepare();
  const dpr=Math.min(2,window.devicePixelRatio||1),w=viewport.w,h=viewport.h;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  cv.style.display='block';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const nv=scanWorld.length/3,sx=new Float32Array(nv),sy=new Float32Array(nv),sd=new Float32Array(nv);
  for(let i=0;i<nv;i++){const p=toScreenRaw([scanWorld[i*3],scanWorld[i*3+1],scanWorld[i*3+2]]);sx[i]=p.x;sy[i]=p.y;sd[i]=p.d;}
  const idx=scanData.indices,nt=idx.length/3,depth=new Float32Array(nt),order=[];
  for(let t=0;t<nt;t++){const a=idx[t*3],b=idx[t*3+1],d=idx[t*3+2];
    const minx=Math.min(sx[a],sx[b],sx[d]),maxx=Math.max(sx[a],sx[b],sx[d]),miny=Math.min(sy[a],sy[b],sy[d]),maxy=Math.max(sy[a],sy[b],sy[d]);
    if(maxx<0||minx>w||maxy<0||miny>h)continue;depth[t]=(sd[a]+sd[b]+sd[d])/3;order.push(t);}
  order.sort((p,q)=>depth[q]-depth[p]);
  c.globalAlpha=sc.opacity;c.lineWidth=.6;c.lineJoin='round';
  for(const t of order){const a=idx[t*3],b=idx[t*3+1],d=idx[t*3+2];c.fillStyle=c.strokeStyle=scanTriRgb[t];c.beginPath();c.moveTo(sx[a],sy[a]);c.lineTo(sx[b],sy[b]);c.lineTo(sx[d],sy[d]);c.closePath();c.fill();c.stroke();}
  c.globalAlpha=1;
}
function scanOrientedBounds(){
  if(scanOrientB&&scanOrientB.z===project.scan.zUp)return scanOrientB.b;
  const b=MESH.bounds(MESH.orient(scanData.positions,project.scan.zUp));scanOrientB={z:project.scan.zUp,b};return b;
}
function scanSizeText(){
  if(!scanData||!project.scan)return '';const b=scanOrientedBounds(),s=project.scan.scale,sz=[0,1,2].map(i=>fmt(Math.round((b.max[i]-b.min[i])*s)));
  return `${sz[0]} × ${sz[2]} (breed × diep) en ${sz[1]} mm hoog`;
}
function scanHTML(){
  const sc=project.scan;
  let h=`<div class="notice-small" style="margin-top:0">Importeer een <strong>3D-scan van de ruimte</strong> (.glb, .gltf met ingebedde data of .obj, bijv. uit Polycam of de iPhone-scan) en bouw er je ontwerp tegenaan. Het model is een <strong>referentie</strong>: het telt niet mee in de zaaglijst. Zware modellen worden vereenvoudigd (max. ${fmt(MESH.LIMITS.targetTriangles)} driehoeken) en staan alleen in de browser van dit apparaat, niet in deel-links of exportbestanden.</div>`;
  h+=`<div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap;margin-top:10px"><button class="primary-btn" data-scan="pick">🧊 ${sc?'Andere scan kiezen':'Scan kiezen'}</button></div>`;
  if(sc){
    h+=`<div class="notice-small"><strong>${esc(sc.name)}</strong>${scanData?`<br>Nu: ${esc(scanSizeText())}<br>${scanData.decimated?`Vereenvoudigd van ${fmt(scanData.originalTriangles)} naar ${fmt(scanData.indices.length/3)} driehoeken`:`${fmt(scanData.indices.length/3)} driehoeken`}`:'<br>Model niet beschikbaar op dit apparaat: kies de scan opnieuw.'}</div>`;
    h+=`<h4 class="cut-section">WEERGAVE</h4><label class="field" style="flex-direction:row;gap:8px;align-items:center"><input data-scf="on" type="checkbox" style="width:auto;height:auto;margin:0;flex:none" ${sc.on?'checked':''}> Scan tonen</label><label class="field">Zichtbaarheid (${Math.round(sc.opacity*100)}%)<input data-scf="opacity" type="range" min="10" max="100" step="5" value="${Math.round(sc.opacity*100)}"></label>`;
    h+=`<h4 class="cut-section">SCHAAL, RICHTING EN POSITIE</h4><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="primary-btn" data-scan="calibrate">📏 Schaal instellen met twee punten</button><button class="outline-btn" data-scan="floor">⤓ Op de vloer zetten</button><button class="outline-btn" data-scan="center">⌖ Midden op keuken</button></div><p class="mini-note">Schaal instellen werkt in een 2D-aanzicht (Voor/Zij/Boven): klik twee punten op de scan waarvan je de echte afstand kent.</p>`;
    h+=`<div class="field-grid"><label class="field">Schaal (mm per bronseenheid)<input data-scf="scale" type="number" step="any" value="${sc.scale}"></label><label class="field">Draaien om verticaal (°)<input data-scf="rotY" type="number" step="5" value="${sc.rotY}"></label></div><label class="field" style="flex-direction:row;gap:8px;align-items:center"><input data-scf="zUp" type="checkbox" style="width:auto;height:auto;margin:0;flex:none" ${sc.zUp?'checked':''}> Bovenkant van de scan is de Z-as (vaak bij .obj)</label><div class="field-grid"><label class="field">Positie X (mm)<input data-scf="x" type="number" step="10" value="${sc.x}"></label><label class="field">Positie Y (mm)<input data-scf="y" type="number" step="10" value="${sc.y}"></label><label class="field">Positie Z (mm)<input data-scf="z" type="number" step="10" value="${sc.z}"></label></div><div class="right-foot-actions" style="margin-top:10px"><button class="outline-btn" data-scan="remove">Scan verwijderen</button></div>`;
  }
  return h;
}
function showScan(){if(!MESH)return;openModal('3D','3D-scan als referentie',scanHTML());}
async function decodeScanTextures(mesh){
  const cache=new Map();
  for(const p of mesh.pending){
    if(cache.has(p.image))continue;
    try{const bmp=await createImageBitmap(new Blob([p.image.bytes],{type:p.image.mime})),s=Math.min(1,2048/Math.max(bmp.width,bmp.height)),cv=document.createElement('canvas');
      cv.width=Math.max(1,Math.round(bmp.width*s));cv.height=Math.max(1,Math.round(bmp.height*s));const cx=cv.getContext('2d');cx.drawImage(bmp,0,0,cv.width,cv.height);cache.set(p.image,cx.getImageData(0,0,cv.width,cv.height));}
    catch(e){cache.set(p.image,null);}
  }
  MESH.applyTextures(mesh,(img,u,v)=>{const d=cache.get(img);if(!d)return null;u-=Math.floor(u);v-=Math.floor(v);const x=Math.min(d.width-1,Math.floor(u*d.width)),y=Math.min(d.height-1,Math.floor(v*d.height)),o=(y*d.width+x)*4;return [d.data[o],d.data[o+1],d.data[o+2]];});
}
async function importScan(file){
  if(!file||!MESH)return;
  if(file.size>MESH.LIMITS.fileBytes){toast('Bestand is te groot (max '+Math.round(MESH.LIMITS.fileBytes/1048576)+' MB)');return;}
  toast('Scan wordt verwerkt…');await new Promise(r=>setTimeout(r,30));
  try{
    const name=file.name,isObj=/\.obj$/i.test(name),raw=await (isObj?file.text():file.arrayBuffer());
    const mesh=MESH.parseAny(name,raw);if(mesh.pending.length)await decodeScanTextures(mesh);
    const d=MESH.decimate(mesh,MESH.LIMITS.targetTriangles),b=MESH.bounds(d.positions);
    const ext=Math.max(b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]-b.min[2]),scale=ext>0&&ext<100?1000:1;
    const data={positions:d.positions,indices:d.indices,colors:d.colors,decimated:d.decimated,originalTriangles:d.originalTriangles};
    const meta=M.normalizeScan({name,on:true,opacity:.85,scale,rotY:0,zUp:false,
      x:Math.round(project.width/2-((b.min[0]+b.max[0])/2)*scale),y:Math.round(-b.min[1]*scale),z:Math.round(project.depth/2-((b.min[2]+b.max[2])/2)*scale)});
    if(!meta){toast('Ongeldige bestandsnaam');return;}
    let saved=true;try{await scanIO('put',activeKey(),{positions:d.positions,indices:d.indices,colors:d.colors});}catch(e){saved=false;}
    setScanData(data);commit(()=>{project.scan=meta;});
    toast(saved?`Scan geladen: ${fmt(d.indices.length/3)} driehoeken · controleer de schaal`:'Scan geladen, maar opslaan op dit apparaat mislukte: na herladen opnieuw importeren');
    showScan();draw();
  }catch(e){toast('Scan importeren mislukt: '+(e&&e.message||e));}
}
function scanAction(act){
  if(act==='pick'){$('#scanInput').click();return;}
  if(!project.scan)return;
  if(act==='remove'){const key=activeKey();commit(()=>{delete project.scan;});scanData=null;scanWorld=null;scanTriRgb=null;scanIO('delete',key).catch(()=>{});if(scanCanvas)scanCanvas.style.display='none';showScan();draw();}
  else if(act==='floor'&&scanData){const b=scanOrientedBounds(),s=project.scan.scale;commit(()=>{project.scan=M.normalizeScan({...project.scan,y:Math.round(-b.min[1]*s)});});showScan();draw();}
  else if(act==='center'&&scanData){const b=scanOrientedBounds(),s=project.scan.scale,r=(project.scan.rotY||0)*Math.PI/180,cx=(b.min[0]+b.max[0])/2*s,cz=(b.min[2]+b.max[2])/2*s;
    // draai het midden mee zodat het midden van de scan op het midden van de keuken komt
    const rx=cx*Math.cos(r)+cz*Math.sin(r),rz=-cx*Math.sin(r)+cz*Math.cos(r);
    commit(()=>{project.scan=M.normalizeScan({...project.scan,x:Math.round(project.width/2-rx),z:Math.round(project.depth/2-rz)});});showScan();draw();}
  else if(act==='calibrate'){closeModal();calibrate={a:null,b:null,target:'scan'};backdropMove=null;toast('Ga naar een 2D-aanzicht indien nodig en klik het eerste punt');if(!viewAxes()||currentView==='bottom')setView('front');$('#drawHelp').classList.remove('hidden');$('#drawHelp').textContent='Scan-schaal: klik het eerste punt, dan het tweede punt waarvan je de afstand weet · Esc stopt';canvas.classList.add('draw-active');}
}

// ---------- Plattegrond-start ----------
const PLAN_PRESETS={
 kapschuur:{label:'Kapschuur (jouw PDF: zitgedeelte, berging, pergola)',name:'Kapschuur',zones:[
  {name:'Zitgedeelte',kind:'open',x:0,z:0,w:4000,d:3300,h:2700,walls:'n'},{name:'Berging',kind:'closed',x:4000,z:0,w:5000,d:2450,h:2550,roof:{high:'n',low:2300},door:{edge:'s',offset:150,width:900,height:2050}},{name:'Pergola',kind:'pergola',x:0,z:3300,w:4000,d:3200,h:2500}]},
 houthok:{label:'Kapschuur met houthok (plattegrond-afbeelding)',name:'Kapschuur met houthok',zones:[
  {name:'Zitgedeelte',kind:'open',x:0,z:0,w:4000,d:3300,h:2700,walls:'n'},{name:'Berging',kind:'closed',x:4000,z:0,w:3500,d:2450,h:2550,roof:{high:'n',low:2300},door:{edge:'s',offset:150,width:900,height:2050}},{name:'Houthok',kind:'closed',x:7500,z:0,w:1500,d:1000,h:2300},
  {name:'Berging voor',kind:'closed',x:7500,z:1000,w:1500,d:1450,h:2300},{name:'Pergola',kind:'pergola',x:0,z:3300,w:4000,d:3200,h:2500}]},
 leeg:{label:'Eigen plattegrond (twee lege zones)',name:'Eigen plattegrond',zones:[
  {name:'Zone 1',kind:'open',x:0,z:0,w:3000,d:2500,h:2500},{name:'Zone 2',kind:'closed',x:3000,z:0,w:2500,d:2500,h:2400}]}
};
const clonePreset=k=>{const p=JSON.parse(JSON.stringify(PLAN_PRESETS[k]));p.zones=M.normalizePlan({zones:p.zones}).zones;return p;};
let planDraft=clonePreset('kapschuur'),planKey='kapschuur';
function planPreview(){
 const r=M.planFrame({zones:planDraft.zones});
 const by={};for(const b of r.beams){const k=b.axis==='y'?'staanders':'liggers en regels';by[k]=(by[k]||0)+1;}
 return {r,text:`${r.beams.length} balken (${by.staanders||0} staanders, ${by['liggers en regels']||0} liggers/regels), ${r.panels.length} wand-/deurpanelen · ${fmt(r.bounds.width)} × ${fmt(r.bounds.depth)} mm, ${fmt(r.bounds.height)} mm hoog`};
}
function planHTML(){
 const kinds=Object.entries(M.ZONE_KINDS),pv=planPreview();
 let h=`<div class="notice-small" style="margin-top:0">Begin met een <strong>plattegrond</strong>: elke zone is een rechthoek (buitenmaten, mm). De app bouwt er een houtconstructie van <strong>losse balken</strong> van, die je daarna in 3D bewerkt (verplaatsen, kader-selecteren, verlengen). Het is een start, geen constructieberekening, en <strong>het dak zit er niet in</strong> (balken zijn recht). Kloppen de maten niet, pas ze hier aan voordat je genereert.</div>`;
 h+=`<label class="field">Voorbeeld<select data-pl="preset">${Object.entries(PLAN_PRESETS).map(([k,v])=>`<option value="${k}" ${planKey===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select></label>`;
 h+=`<h4 class="cut-section">ZONES</h4><div style="overflow-x:auto"><table class="cut-table" style="width:100%;font-size:12px"><thead><tr><th>Naam</th><th>Soort</th><th>X</th><th>Z (diepte)</th><th>Breed</th><th>Diep</th><th>Hoogte</th><th>Wanden</th><th>Deur</th><th></th></tr></thead><tbody>`;
 planDraft.zones.forEach((z,i)=>{
  h+=`<tr><td><input data-pz="${i}:name" value="${esc(z.name)}" style="width:110px"></td><td><select data-pz="${i}:kind">${kinds.map(([k,v])=>`<option value="${k}" ${z.kind===k?'selected':''}>${v}</option>`).join('')}</select></td>`
   +['x','z','w','d','h'].map(f=>`<td><input data-pz="${i}:${f}" type="number" step="50" value="${z[f]}" style="width:72px"></td>`).join('')
   +`<td style="white-space:nowrap">${[['n','A','achter'],['s','V','voor'],['w','L','links'],['e','R','rechts']].map(([c,l,t])=>`<label title="Wand ${t}" style="margin-right:4px"><input type="checkbox" data-pw="${i}:${c}" ${(z.walls||'').includes(c)?'checked':''} style="width:auto;height:auto;margin:0"> ${l}</label>`).join('')}</td>`
   +`<td style="white-space:nowrap"><select data-pd="${i}:edge"><option value="">geen</option>${[['n','achter'],['s','voor'],['w','links'],['e','rechts']].map(([c,t])=>`<option value="${c}" ${z.door?.edge===c?'selected':''}>${t}</option>`).join('')}</select>${z.door?` <input data-pd="${i}:offset" type="number" step="50" value="${z.door.offset}" style="width:64px" title="Afstand vanaf het begin van die wand (mm)">`:''}</td>`
   +`<td><button class="outline-btn" data-plan="del:${i}" title="Zone verwijderen">✕</button></td></tr>`;
 });
 h+=`</tbody></table></div><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap;margin-top:8px"><button class="outline-btn" data-plan="add">+ Zone toevoegen</button></div>`;
 h+=`<p class="mini-note">Wanden: A achter, V voor, L links, R rechts (zwarte bekleding rond het frame; tussen twee gesloten zones komt geen wand). Deur: 900 × 2050 mm met kozijn; afstand = vanaf het begin van die wand. X = afstand vanaf links, Z = afstand vanaf de achterzijde (achterlijn op 0). Zones die tegen elkaar liggen delen hun wand. Hoogte = onderkant dakrand/bovenligger.</p>`;
 h+=`<div class="notice-small"><strong>Resultaat:</strong> ${esc(pv.text)}${pv.r.truncated?`<br>⚠ ${pv.r.truncated} balken passen niet (max. 100 losse balken): kleiner maken of zones weglaten.`:''}</div>`;
 h+=`<div class="right-foot-actions" style="margin-top:10px"><button class="primary-btn" data-plan="generate" ${pv.r.beams.length?'':'disabled'}>▦ Maak 3D-project van deze plattegrond</button></div><p class="mini-note">Er komt een nieuw project; je huidige project blijft bewaard. Leg je eigen plattegrondafbeelding eronder met 🖼 Foto in het Boven-aanzicht (PDF eerst als PNG/JPG opslaan).</p>`;
 return h;
}
function generatePlanProject(planObj,name,source=null){
 const r=M.planFrame(planObj);if(!r.beams.length&&!r.panels.length){toast('Teken eerst een blok of lijn');return false;}
 const b=r.bounds,raw={...M.freeProject(),name:name||'Plattegrond',width:b.width,depth:b.depth,height:b.height,plan:planObj,stockLength:6000,beams:r.beams,panels:r.panels};
 if(source){
  raw.stockLength=source.stockLength;raw.kerf=source.kerf;raw.beamPrice=source.beamPrice;
  raw.materials=source.materials;raw.style=source.style;raw.reference=source.reference;
  if(r.truncated){toast('Deze variant bevat te veel balken. Verklein de schets voor je de variant maakt.');return false;}
 }
 if(r.truncated)toast(`Let op: ${r.truncated} balken passen niet (max. 100). Maak de schets kleiner of deel hem op.`);
 if(openNewProject(raw,`Nieuw project met ${r.beams.length} balken · bewerk het in 3D`)){setView('3d');return true;}
 return false;
}
const PLAN_DRAFT_KEY='douglas-designer-plan-draft-v1';
let planEditor=null,sourcePlanProject=null;
function openPlanEditor(){
 if(!PE){if(project.plan)toast('De plattegrondeditor is niet geladen. Herlaad de app.');else showPlan();return;}
 sourcePlanProject=project.plan?project:null;
 if(!planEditor)planEditor=PE.create({M,presets:PLAN_PRESETS,
  onChange:p=>{
   if(!sourcePlanProject){try{localStorage.setItem(PLAN_DRAFT_KEY,JSON.stringify(p));}catch(e){}}
  },
  onGenerate:p=>{
   const source=sourcePlanProject;
   const name=source?source.name.slice(0,70)+' – variant':'Plattegrond schets';
   if(generatePlanProject(p,name,source))planEditor.close(true);
  },
  onClose:()=>{sourcePlanProject=null;}
 });
 let initial=sourcePlanProject?.plan;
 if(!initial){try{initial=JSON.parse(localStorage.getItem(PLAN_DRAFT_KEY)||'null');}catch(e){}}
 window.DouglasPlanEditorInstance=planEditor;
 planEditor.open(initial,sourcePlanProject?.name);
}
function showPlan(){openModal('START','Start vanuit plattegrond',planHTML());}
function planAction(act){
 if(act==='add'){if(planDraft.zones.length>=8){toast('Maximaal 8 zones');return;}planDraft.zones.push({name:'Zone '+(planDraft.zones.length+1),kind:'open',x:0,z:0,w:2000,d:2000,h:2500});showPlan();}
 else if(act.startsWith('del:')){planDraft.zones.splice(+act.slice(4),1);showPlan();}
 else if(act==='generate'){
  generatePlanProject({zones:planDraft.zones,lines:[]},planDraft.name);
 }
}
function backdropHTML(){
 const bd=project.backdrop,viewName={front:'Voor',side:'Zij',top:'Boven'};
 let h=`<div class="notice-small" style="margin-top:0">Gebruik een foto (bijv. van de plek waar de buitenkeuken komt) als <strong>achtergrond in een 2D-aanzicht</strong>. Stel de schaal in met twee punten waarvan je de echte afstand kent, en bouw er dan overheen. Het is een hulpmiddel om op af te tekenen, geen exacte perspectiefcorrectie: maak de foto zo recht mogelijk, vlak van voren.</div>`;
 h+=`<div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap;margin-top:10px"><button class="primary-btn" data-bd="pick">🖼 Foto kiezen</button><button class="outline-btn" data-bd="camera">📷 Foto maken</button>${project.room?.photo&&!project.room.photo.startsWith('blob')?'<button class="outline-btn" data-bd="useRoom">Ruimtefoto gebruiken</button>':''}</div>`;
 if(bd){
  h+=`<h4 class="cut-section">WEERGAVE</h4><div class="field-grid"><label class="field">Zichtbaar in aanzicht<select data-bdf="view">${Object.entries(viewName).map(([k,v])=>`<option value="${k}" ${bd.view===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field">Zichtbaarheid (${Math.round(bd.opacity*100)}%)<input data-bdf="opacity" type="range" min="10" max="100" step="5" value="${Math.round(bd.opacity*100)}"></label></div>`;
  h+=`<label class="field" style="flex-direction:row;gap:8px;align-items:center"><input data-bdf="on" type="checkbox" style="width:auto;height:auto;margin:0;flex:none" ${bd.on?'checked':''}> Foto tonen</label>`;
  h+=`<h4 class="cut-section">SCHAAL EN POSITIE</h4><div class="right-foot-actions" style="flex-direction:row;flex-wrap:wrap"><button class="primary-btn" data-bd="calibrate">📏 Schaal instellen met twee punten</button><button class="outline-btn" data-bd="move">✥ Foto verslepen</button></div>`;
  h+=`<div class="field-grid"><label class="field">Breedte foto (mm)<input data-bdf="widthMm" type="number" step="10" value="${bd.widthMm}"></label><label class="field">Positie links (mm)<input data-bdf="x" type="number" step="10" value="${bd.x}"></label><label class="field">Positie onder (mm)<input data-bdf="y" type="number" step="10" value="${bd.y}"></label></div>`;
  h+=`<div class="right-foot-actions" style="margin-top:10px"><button class="outline-btn" data-bd="remove">Foto verwijderen</button></div><p class="mini-note">De foto blijft alleen in dit project op dit apparaat; hij gaat niet mee in deel-links.</p>`;
 }
 return h;
}
function showBackdrop(){openModal('FOTO','Foto als achtergrond',backdropHTML());}
function setBackdrop(photo){
 const old=project.backdrop;
 commit(()=>{const img=new Image();img.src=photo;
  project.backdrop=M.normalizeBackdrop({photo,on:true,view:old?.view||'front',opacity:old?.opacity||.5,widthMm:old?.widthMm||Math.max(2500,Math.round(project.width*1.6)),x:old?.x??-Math.round((Math.max(2500,Math.round(project.width*1.6))-project.width)/2),y:old?.y||0});});
 if(!project.backdrop){toast('Foto is te groot of geen JPEG');return;}
 if(!viewAxes()||currentView==='bottom')setView('front');else if(project.backdrop.view!==currentView)setView(project.backdrop.view);
 showBackdrop();draw();
}
async function backdropFile(file){
 if(!file)return;
 try{setBackdrop(await compressImageFile(file,1800));}catch(e){toast(file.name+': '+e.message);}
}
function backdropAction(act){
 if(act==='pick')$('#backdropInput').click();
 else if(act==='camera')$('#backdropCamera').click();
 else if(act==='useRoom'){const ph=project.room?.photo;if(ph&&/^data:image\/jpeg/.test(ph))setBackdrop(ph);else toast('Ruimtefoto is geen JPEG');}
 else if(act==='remove'){commit(()=>{delete project.backdrop;});showBackdrop();draw();}
 else if(act==='calibrate'){closeModal();calibrate={a:null,b:null};backdropMove=null;toast('Klik het eerste punt op de foto');$('#drawHelp').classList.remove('hidden');$('#drawHelp').textContent='Foto-schaal: klik het eerste punt, dan het tweede punt waarvan je de afstand weet · Esc stopt';canvas.classList.add('draw-active');}
 else if(act==='move'){closeModal();backdropMove=true;calibrate=null;$('#drawHelp').classList.remove('hidden');$('#drawHelp').textContent='Sleep de foto naar de juiste plek · Esc of klik op Selecteer om te stoppen';canvas.classList.add('draw-active');}
}
function stopBackdropTools(){if(calibrate||backdropMove){calibrate=null;backdropMove=null;canvas.classList.remove('draw-active');if(!drawMode&&!measureMode)$('#drawHelp').classList.add('hidden');}}
function closeModal(){modalOpen=false;$('#modalBackdrop').classList.add('hidden');}
function safeName(){return (project.name||'douglas').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'douglas';}
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
  if(selected?.type==='panel'){const n=['x','y','z','w','h','d'].includes(field)?Number(el.value):el.value;if(typeof n==='number'&&!Number.isFinite(n)){toast('Ongeldige waarde');render();return;}
    commit(()=>{const i=(project.panels||[]).findIndex(q=>q.id===selected.id);if(i<0)return;const next=M.normalizePanels([{...project.panels[i],[field]:n}])[0];if(next)project.panels[i]=next;});return;}
  const isNumeric=['width','x','y','z','length','app_w','app_d','app_h'].includes(field),val=isNumeric?Number(el.value):el.value;
  if(isNumeric&&!Number.isFinite(val)){toast('Ongeldige waarde');render();return;}
  commit(()=>{
    if(selected.type==='frame'){if(['name','length','x','y','z','profile'].includes(field))M.editFrameBeam(project,selected.id,{[field]:val});return;}
    if(field==='kind'&&selected.type==='module'&&M.TYPES[val]){obj.kind=val;obj.name=M.TYPES[val].label;obj.width=Math.max(M.TYPES[val].min,obj.width);}
    else if(field.startsWith('app_')&&selected.type==='module'){obj.appliance=M.normalizeAppliance({...(obj.appliance||{}),[field.slice(4)]:val});}
    else if(field==='width')obj.width=M.clamp(Math.round(val),Math.max(200,M.TYPES[obj.kind].min),2400);
    else if(field==='length')obj.length=M.clamp(Math.round(val),50,6500);
    else if(isNumeric)obj[field]=Math.round(val);
    else if(field==='axis')obj.axis=['x','y','z'].includes(val)?val:obj.axis;
    else if(field==='profile'){if(M.PROFILES[val])obj.profile=val;}
    else if(field==='name')obj.name=String(val).slice(0,60)||'Onderdeel';
  });
}
function updateSettings(e){const t=e.target,id=t.id;if(!['projectName','projectWidth','projectDepth','projectHeight','stockLength','kerf','beamPrice','countertopCheck','ctThickness','ctSide','ctFront','ctBack'].includes(id))return;
  if(project.plan&&['projectWidth','projectDepth','projectHeight'].includes(id)){render();return;}
  const v=id==='countertopCheck'?t.checked:id==='projectName'?t.value:Number(t.value);
  if(typeof v==='number'&&!Number.isFinite(v)){render();return;}
  if(id.startsWith('ct')&&id!=='countertopCheck'){const key={ctThickness:'thickness',ctSide:'overhangSide',ctFront:'overhangFront',ctBack:'overhangBack'}[id];commit(()=>{project.countertopSpec=M.normalizeCountertop({...project.countertopSpec,[key]:v});});render();return;}
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
  const pa=e.target.closest('[data-proj]');if(pa){projectAction(pa.dataset.proj);return;}
  const bda=e.target.closest('[data-bd]');if(bda){backdropAction(bda.dataset.bd);return;}
  const pla=e.target.closest('[data-plan]');if(pla){planAction(pla.dataset.plan);return;}
  const sca=e.target.closest('[data-scan]');if(sca){scanAction(sca.dataset.scan);return;}
  const sa=e.target.closest('[data-share]');if(sa){shareAction(sa.dataset.share);return;}
  const da=e.target.closest('[data-deliver]');if(da){deliverAction(da.dataset.deliver);return;}
  const ra=e.target.closest('[data-recv]');if(ra){receiveAction(ra.dataset.recv);return;}
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
    case 'homeBtn':showProjects();break;
    case 'shareBtn':showShare();break;
    case 'continueProject':hideWelcome();break;
    case 'newProject':openNewProject({name:'Nieuw basisontwerp',modules:[{kind:'open',width:800,name:'Open vak'}],beams:[]},'Nieuw basisontwerp gestart');break;
    case 'newFreeProject':if(openNewProject(M.freeProject())){setView('front');toggleDrawMode(true);toast('Leeg tekenvlak · sleep van beginpunt naar eindpunt om een balk te maken');}break;
    case 'drawTool':toggleDrawMode(true);break;
    case 'measureTool':toggleMeasureMode(!measureMode);break;
    case 'selectTool':toggleDrawMode(false);toggleMeasureMode(false);break;
    case 'groupClearBtn':setSelected(null,null);break;
    case 'groupMoveBtn':{const d={x:+$('#grpX').value,y:+$('#grpY').value,z:+$('#grpZ').value};const keep=multi.slice();commit(()=>M.moveBeams(project,keep,d));multi=keep;render();break;}
    case 'groupCopyBtn':{const d={x:+$('#grpX').value,y:+$('#grpY').value,z:+$('#grpZ').value};if(!d.x&&!d.y&&!d.z){toast('Geef een verplaatsing op, anders ligt de kopie precies op het origineel');break;}
      const all=M.framePieces(project).concat(project.beams),src=multi.map(m=>all.find(b=>b.id===m.id)).filter(Boolean),room=Math.max(0,100-project.beams.length),made=src.slice(0,room);
      const ids=[];commit(()=>{for(const b of made){const id=M.uid();ids.push({type:'beam',id});project.beams.push({id,name:String(b.name||'Balk').slice(0,52),axis:b.axis,length:b.length,x:b.x+Math.round(d.x),y:b.y+Math.round(d.y),z:b.z+Math.round(d.z),profile:M.profileOf(b).id});}});
      multi=ids;render();toast(`${made.length} balken gekopieerd${made.length<src.length?` (${src.length-made.length} niet: maximum 100 losse balken)`:''}`);break;}
    case 'groupDeleteBtn':{const keep=multi.slice();commit(()=>{for(const m of keep){if(m.type==='frame')M.editFrameBeam(project,m.id,{disabled:true});else project.beams=project.beams.filter(b=>b.id!==m.id);}});multi=[];selected=null;render();toast(`${keep.length} balken verwijderd`);break;}
    case 'arrayBeamBtn':{const src=getSelected();if(!src||selected?.type==='module')break;const r=M.arrayBeams(project,src,$('#arrAxis').value,$('#arrCount').value,$('#arrSpacing').value);
      if(!r.ok){toast(r.error);break;}commit(()=>{project.beams.push(...r.beams);});toast(`${r.beams.length} kopie${r.beams.length===1?'':'ën'} geplaatst${r.skipped?` (${r.skipped} niet: maximum 100 losse balken)`:''}`);break;}
    case 'demoProject':openNewProject(M.demoProject(),'Voorbeeld geopend');break;
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
    case 'resetBtn':openNewProject(M.demoProject(),'Voorbeeldproject geopend als nieuw project');break;
    case 'openCutlist':showCutlist();break;case 'closeModal':closeModal();break;
    case 'showDocument':showDocument();break;
    case 'csvParts':if(DOCS){download(safeName()+'-onderdelenlijst.csv',DOCS.partsCSV(DOCS.partsList(project,M)),'text/csv;charset=utf-8');}break;
    case 'copyMaterials':if(MAT){const text=MAT.toText(MAT.build(project,M),project.name);(navigator.clipboard?.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(()=>toast('Materiaallijst gekopieerd'),()=>toast('Kopiëren niet gelukt'));}break;
    case 'csvMaterials':if(MAT){download(safeName()+'-materiaallijst.csv',MAT.toCSV(MAT.build(project,M)),'text/csv;charset=utf-8');}break;
    case 'printBtn':window.print();break;case 'imageBtn':screenshot();break;
    case 'deleteSelected':if(!selected)return;commit(()=>{if(selected.type==='frame'){M.editFrameBeam(project,selected.id,{disabled:true});selected=null;return;}if(selected.type==='module')project.modules=project.modules.filter(m=>m.id!==selected.id);else if(selected.type==='panel'){project.panels=(project.panels||[]).filter(q=>q.id!==selected.id);if(!project.panels.length)delete project.panels;}else project.beams=project.beams.filter(b=>b.id!==selected.id);selected=null;if(!project.modules.length)project.countertop=false;});break;
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
$('#modalContent').addEventListener('input',e=>{const f=e.target.dataset?.bdf;if(f==='opacity'&&project.backdrop){project.backdrop.opacity=M.clamp(+e.target.value/100,.1,1);draw();}});
$('#modalContent').addEventListener('change',e=>{const f=e.target.dataset?.bdf;if(!f||!project.backdrop)return;
  commit(()=>{const bd=project.backdrop;if(f==='on')bd.on=e.target.checked;else if(f==='view')bd.view=e.target.value;else if(f==='opacity')bd.opacity=M.clamp(+e.target.value/100,.1,1);else bd[f]=+e.target.value;project.backdrop=M.normalizeBackdrop(bd);});
  if(f==='view'||f==='on'){if(project.backdrop.on&&project.backdrop.view!==currentView)setView(project.backdrop.view);}
  showBackdrop();draw();});
$('#backdropInput')?.addEventListener('change',async e=>{await backdropFile(e.target.files?.[0]);e.target.value='';});
$('#backdropCamera')?.addEventListener('change',async e=>{await backdropFile(e.target.files?.[0]);e.target.value='';});
$('#backdropTool')?.addEventListener('click',showBackdrop);
$('#scanTool')?.addEventListener('click',showScan);
$('#planTool')?.addEventListener('click',openPlanEditor);
$('#editPlanDimensions')?.addEventListener('click',openPlanEditor);
$('#modalContent').addEventListener('change',e=>{
  const pr=e.target.dataset?.pl;if(pr==='preset'){const p=PLAN_PRESETS[e.target.value];if(p){planKey=e.target.value;planDraft=clonePreset(e.target.value);showPlan();}return;}
  const pw=e.target.dataset?.pw;if(pw){const [i,c]=pw.split(':'),z=planDraft.zones[+i];if(z){const s=new Set((z.walls||'').split('').filter(Boolean));e.target.checked?s.add(c):s.delete(c);z.walls=[...s].join('');showPlan();}return;}
  const pd=e.target.dataset?.pd;if(pd){const [i,f]=pd.split(':'),z=planDraft.zones[+i];if(z){if(f==='edge')z.door=e.target.value?{edge:e.target.value,offset:z.door?.offset??150,width:z.door?.width||900,height:z.door?.height||2050}:null;else if(z.door)z.door.offset=Math.max(0,+e.target.value||0);showPlan();}return;}
  const pz=e.target.dataset?.pz;if(!pz)return;const [i,f]=pz.split(':'),z=planDraft.zones[+i];if(!z)return;
  z[f]=(f==='name'||f==='kind')?e.target.value:+e.target.value;const n=M.normalizePlan({zones:planDraft.zones});if(n)planDraft.zones=n.zones.map(q=>({...q}));showPlan();});
$('#scanInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';await importScan(f);});
$('#modalContent').addEventListener('input',e=>{if(e.target.dataset?.scf==='opacity'&&project.scan){project.scan.opacity=M.clamp(+e.target.value/100,.1,1);draw();}});
$('#modalContent').addEventListener('change',e=>{const f=e.target.dataset?.scf;if(!f||!project.scan)return;
  commit(()=>{const s={...project.scan};if(f==='on'||f==='zUp')s[f]=e.target.checked;else s[f]=+e.target.value;project.scan=M.normalizeScan(s);});showScan();draw();});
$('#sidebar').addEventListener('change',updateSettings);
$('#sketchGridVisible')?.addEventListener('change',e=>setSketchSetting('visible',e.target.checked));
$('#sketchGridStep')?.addEventListener('change',e=>setSketchSetting('step',Number(e.target.value)));
$('#sketchAxes')?.addEventListener('change',e=>setSketchSetting('axes',e.target.checked));
$('#sketchWallGrid')?.addEventListener('change',e=>setSketchSetting('walls',e.target.checked));
$('#sketchParallel')?.addEventListener('click',()=>setSketchSetting('parallel',!sketchSettings.parallel));
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
$('#fileInput').addEventListener('change',async(e)=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>(SHARE?SHARE.LIMITS.file:2*1024*1024))throw Error('Bestand te groot');const text=await file.text(),raw=JSON.parse(text);if(SHARE&&raw&&raw.format===SHARE.FORMAT){receivePayload(raw);e.target.value='';return;}if(raw&&raw.format===PRJ.BACKUP_FORMAT){const r=store.importAll(text);if(!r.ok)throw Error(r.error);toast(r.added+' project(en) toegevoegd'+(r.skipped?', '+r.skipped+' overgeslagen':''));showProjects();e.target.value='';return;}if(!raw||!Array.isArray(raw.modules))throw Error('Geen geldig Douglas projectbestand');if(!openNewProject(raw,'Project geïmporteerd als nieuw project'))return;}catch(error){toast('Import mislukt: '+error.message);}e.target.value='';});
$('#modalContent').addEventListener('change',e=>{const t=e.target;
  if(t?.dataset?.projName){const id=t.dataset.projName,r=store.rename(id,t.value);if(r.ok===false||r.error){toast('Hernoemen mislukt');return;}if(id===project.id){project.name=store.load(id).name;render();}toast('Naam opgeslagen');return;}
  const key=t?.dataset?.mat;if(!key||!MAT)return;
  const box=$('#modalContent'),top=box.scrollTop;
  commit(()=>{project.materials=MAT.applyInput(project.materials,key,t.value,M);});
  box.innerHTML=cutlistHTML();box.scrollTop=top;});
$('#modalContent').addEventListener('input',e=>{const k=e.target?.dataset?.draft;if(k&&Object.hasOwn(deliveryDraft,k))deliveryDraft[k]=e.target.value;});
$('#photoInput').addEventListener('change',async e=>{await addDeliveryPhotos(e.target.files||[]);e.target.value='';});
$('#cameraInput').addEventListener('change',async e=>{await addDeliveryPhotos(e.target.files||[]);e.target.value='';});
window.addEventListener('hashchange',checkShareHash);
$('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
window.addEventListener('keydown',e=>{
  if(document.body?.classList?.contains?.('plan-editor-open'))return; // het plattegrond-schetsvenster regelt zijn eigen toetsen
  const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  const key=e.key.toLowerCase();
  if((e.metaKey||e.ctrlKey)&&key==='z'&&!editing){e.preventDefault();history(e.shiftKey?'redo':'undo');return;}
  if(editing)return;
  if(key==='s'){magnetHeldOff=true;snapHint=null;draw();return;}
  if(key==='escape'){
    $('#shortcutHelp').classList.add('hidden');
    if(armedBeamType)disarmBeam();
    if(calibrate||backdropMove){stopBackdropTools();draw();}
    if(multi.length){setSelected(null,null);}
    if(measureMode)toggleMeasureMode(false);
    if(drawMode)toggleDrawMode(false);
    if(modalOpen)closeModal();
    if(!drawMode&&!armedBeamType)setSelected(null,null);
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(key==='v'){toggleDrawMode(false);toggleMeasureMode(false);return;}
  if(key==='m'){toggleMeasureMode(!measureMode);return;}
  if(key==='b'){toggleDrawMode(true);return;}
  if(key==='?'){e.preventDefault();$('#shortcutHelp').classList.toggle('hidden');return;}
  const views={'1':'3d','2':'front','3':'side','4':'top','5':'bottom'};
  if(views[key]){setView(views[key]);return;}
  if((key==='delete'||key==='backspace')&&multi.length){e.preventDefault();$('#groupDeleteBtn')?.click();return;}
  if((key==='delete'||key==='backspace')&&selected){e.preventDefault();const b=$('#deleteSelected');if(b)b.click();}
});
window.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='s'){magnetHeldOff=false;draw();}});
window.addEventListener('blur',()=>{magnetHeldOff=false;});
function cancelCanvasEdit(){
  // Een onderbroken sleepactie mag geen modelwijziging buiten de undo-geschiedenis achterlaten.
  if(dragging?.before)project=JSON.parse(dragging.before);
  dragging=null;marquee=null;previewBeam=null;snapHint=null;
  if(drawMode)$('#drawHelp').textContent='Sleep van startpunt naar eindpunt';
  render();
}
canvas.addEventListener('pointerdown',e=>{
  if(pointers.size>=2)return;
  canvas.setPointerCapture(e.pointerId);
  if(pointers.size===1){
    const first=pointers.values().next().value;
    cancelCanvasEdit();
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    pinchDistance=Math.hypot(e.offsetX-first.x,e.offsetY-first.y);
    return;
  }
  // SketchUp-style navigation: Shift+drag or middle mouse pans instead of orbiting.
  if(e.shiftKey===true||e.button===1){
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    dragging={mode:'pan-camera',startX:e.offsetX,startY:e.offsetY,moved:false};
    return;
  }
  if(roomMoveMode&&project.room?.enabled){
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    dragging={mode:'move-kitchen',before:JSON.stringify(project),startPlacement:{...project.room.placement},startX:e.offsetX,startY:e.offsetY,moved:false};
    return;
  }
  if(calibrate){
    const pt=drawPoint(e.offsetX,e.offsetY);if(!pt)return;
    if(!calibrate.a){calibrate.a=pt;calibrate.b=pt;toast('Klik nu het tweede punt');draw();return;}
    const plane=viewAxes(),r=D.measure(calibrate.a,pt,plane),target=calibrate.target;if(!r||r.dist<5){toast('Kies een tweede punt verder weg');return;}
    const what=target==='scan'?'de scan':'de foto';
    const real=window.prompt(`Wat is de echte afstand tussen deze twee punten in mm?\n(Nu staat ${what} op ${r.dist} mm)`,String(r.dist));
    const next=target==='scan'?M.scanScale(project.scan,calibrate.a,pt,plane,real):M.backdropScale(project.backdrop,calibrate.a,pt,plane,real);
    if(next){commit(()=>{if(target==='scan')project.scan=next;else project.backdrop=next;});toast(target==='scan'?`Scan geschaald: schaal ${next.scale}`:`Foto geschaald: ${fmt(next.widthMm)} mm breed`);}else toast('Geen geldige afstand ingevoerd');
    stopBackdropTools();draw();if(target==='scan')showScan();else showBackdrop();return;
  }
  if(backdropMove&&project.backdrop){
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    dragging={mode:'move-backdrop',before:JSON.stringify(project),startX:e.offsetX,startY:e.offsetY,moved:false,start:{x:project.backdrop.x,y:project.backdrop.y},ref:{x:0,y:0,z:0}};return;
  }
  if(measureMode){
    const pt=drawPoint(e.offsetX,e.offsetY);if(!pt)return;
    if(!measureData||measureData.fixed)measureData={a:pt,b:null,fixed:false};
    else{measureData.b=pt;measureData.fixed=true;const r=D.measure(measureData.a,pt,viewAxes());if(r)$('#drawHelp').textContent=`Gemeten: ${fmt(r.dist)} mm · klik opnieuw voor een nieuwe meting · Esc om te stoppen`;}
    draw();return;
  }
  if(drawMode){
    const start=drawPoint(e.offsetX,e.offsetY);if(!start)return;
    pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    dragging={mode:'draw-beam',start,startX:e.offsetX,startY:e.offsetY,moved:false};
    return;
  }
  // Kaderselectie: Ctrl/Cmd+slepen (overal) of gewoon slepen op lege ruimte in een 2D-aanzicht.
  if(!armedBeamType&&(e.ctrlKey||e.metaKey||viewAxes())){
    const rawOver=hit(e.offsetX,e.offsetY),over=rawOver&&rawOver.type==='panel'?null:rawOver,inMulti=over&&multi.some(m=>m.id===over.id);
    if(inMulti&&!(e.ctrlKey||e.metaKey)){pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
      const b=M.framePieces(project).concat(project.beams).find(x=>x.id===over.id);
      dragging={mode:'move-group',before:JSON.stringify(project),startBeam:{x:b.x,y:b.y,z:b.z},startX:e.offsetX,startY:e.offsetY,moved:false,applied:{x:0,y:0,z:0}};return;}
    if(!over||(e.ctrlKey||e.metaKey)){
      pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
      dragging={mode:'marquee',x0:e.offsetX,y0:e.offsetY,startX:e.offsetX,startY:e.offsetY,moved:false,additive:e.shiftKey,panelHit:rawOver&&rawOver.type==='panel'?rawOver:null};return;
    }
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
});
canvas.addEventListener('pointermove',e=>{if(measureMode&&measureData&&measureData.a&&!measureData.fixed){const pt=drawPoint(e.offsetX,e.offsetY);if(pt){measureData.b=pt;draw();}}});
canvas.addEventListener('pointermove',e=>{if(armedBeamType && pointers.size<2 && (!dragging||dragging.mode==='place-beam'))updatePlacement(e.offsetX,e.offsetY);if(!pointers.has(e.pointerId))return;const before=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)camera.zoom=M.clamp(camera.zoom*dist/pinchDistance,.35,4);pinchDistance=dist;draw();return;}if(!dragging)return;
  const dx=e.offsetX-before.x,dy=e.offsetY-before.y;if(Math.hypot(e.offsetX-dragging.startX,e.offsetY-dragging.startY)>5)dragging.moved=true;
  if(dragging.mode==='pan-camera'){
    camera.panX+=dx;camera.panY+=dy;draw();return;
  }
  if(dragging.mode==='move-kitchen'){
    const p0=toScreenRaw([0,0,0]),px=toScreenRaw([100,0,0]),pz=toScreenRaw([0,0,100]);
    const ux=(px.x-p0.x)/100,uy=(px.y-p0.y)/100,vx=(pz.x-p0.x)/100,vy=(pz.y-p0.y)/100,det=ux*vy-uy*vx;
    if(Math.abs(det)>1e-6){
      const sx=e.offsetX-dragging.startX,sy=e.offsetY-dragging.startY;
      project.room.placement.x=Math.round((dragging.startPlacement.x+(sx*vy-sy*vx)/det)/10)*10;
      project.room.placement.z=Math.round((dragging.startPlacement.z+(ux*sy-uy*sx)/det)/10)*10;
      draw();
    }
    return;
  }
  if(dragging.mode==='move-backdrop'){
    const plane=viewAxes(),d=dragWorldDelta(e.offsetX-dragging.startX,e.offsetY-dragging.startY,dragging.ref);
    project.backdrop.x=Math.round(dragging.start.x+d[plane[0]]);project.backdrop.y=Math.round(dragging.start.y+d[plane[1]]);draw();return;
  }
  if(dragging.mode==='marquee'){
    if(dragging.moved){marquee={x0:dragging.x0,y0:dragging.y0,x1:e.offsetX,y1:e.offsetY};draw();}
    return;
  }
  if(dragging.mode==='move-group'){
    if(!dragging.moved)return;
    const delta=dragWorldDelta(e.offsetX-dragging.startX,e.offsetY-dragging.startY,dragging.startBeam);
    const snap=v=>Math.round(v/5)*5,want={x:snap(delta.x),y:snap(delta.y),z:snap(delta.z)};
    const step={x:want.x-dragging.applied.x,y:want.y-dragging.applied.y,z:want.z-dragging.applied.z};
    if(step.x||step.y||step.z){M.moveBeams(project,multi,step);dragging.applied=want;}
    draw();return;
  }
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
  }else{camera.yaw+=dx*.008;camera.pitch=M.clamp(camera.pitch+dy*.006,-1.557,1.557);currentView='custom';Array.from(document.querySelectorAll('.view-btn')).forEach(b=>b.classList.remove('selected'));draw();}}
});
function pointerEnd(e){
  if(!pointers.has(e.pointerId))return;
  if(dragging?.mode==='move-backdrop'){
    const d=dragging;dragging=null;pointers.delete(e.pointerId);
    if(JSON.stringify(project)!==d.before){undoStack.push(d.before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();}
    draw();return;
  }
  if(dragging?.mode==='marquee'){
    const d=dragging;dragging=null;pointers.delete(e.pointerId);const r=marquee;marquee=null;
    if(!d.moved||!r){if(d.panelHit)setSelected('panel',d.panelHit.id);else if(multi.length||selected)setSelected(null,null);else draw();return;}
    const found=D.rectSelect(shapes,r,r.x1<r.x0);
    const keep=d.additive?multi.concat(selected&&!multi.length?[selected]:[]):[];
    const all=[...keep];for(const o of found)if(!all.some(k=>k.type===o.type&&k.id===o.id))all.push(o);
    if(all.length>1){selected=null;multi=all;beamMoveMode=false;render();toast(`${all.length} balken geselecteerd · sleep om te verplaatsen · Delete verwijdert`);}
    else if(all.length===1)setSelected(all[0].type,all[0].id);
    else setSelected(null,null);
    return;
  }
  if(dragging?.mode==='move-group'){
    const d=dragging;dragging=null;pointers.delete(e.pointerId);
    if(JSON.stringify(project)!==d.before){undoStack.push(d.before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
    else draw();return;
  }
  if(dragging?.mode==='move-kitchen'){
    const before=dragging.before;dragging=null;pointers.delete(e.pointerId);
    if(JSON.stringify(project)!==before){undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[];persist();render();}
    else draw();return;
  }
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
  else if(dragging&&!dragging.moved&&pointers.size===1){const id=hit(e.offsetX,e.offsetY);if(id?.type==='module'||id?.type==='beam'||id?.type==='frame'||id?.type==='panel')setSelected(id.type,id.id);else setSelected(null,null);}pointers.delete(e.pointerId);if(!pointers.size){dragging=null;pinchDistance=0;}}
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',e=>{
  if(!pointers.delete(e.pointerId))return;
  pinchDistance=0;cancelCanvasEdit();
});
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=M.clamp(camera.zoom*(e.deltaY>0?.91:1.1),.35,4);draw();},{passive:false});
window.addEventListener('resize',()=>{if(window.innerWidth>800){$('#stageArea').classList.remove('hidden');$('#sidebar').classList.remove('mobile-visible');$('#inspector').classList.remove('mobile-visible');}draw();});
if('ResizeObserver' in window)new ResizeObserver(()=>draw()).observe(canvas);
persist();updateDraftControls();syncSketchControls();render();
window.DouglasRoomStudio?.mount?.({getProject:()=>project,commit,render,setView,toast,setRoomMove,isSaved:()=>lastSaveOk});
function showWelcome(){
 $('#continueProject').classList.toggle('hidden',!hasSavedProject);
 $('#resumeProjectInfo').textContent=project.name+' · '+fmt(project.width)+' × '+fmt(project.depth)+' mm';
 $('#welcomeTemplates').innerHTML=templateChoicesHTML();
 $('#welcomeLayer').classList.remove('hidden');
}
function hideWelcome(){localStorage.setItem(WELCOME_KEY,'seen');$('#welcomeLayer').classList.add('hidden');}
if(!localStorage.getItem(WELCOME_KEY))showWelcome();
checkShareHash();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js?rev=1.0.0-rc3.plan',{updateViaCache:'none'}).catch(()=>{});
})();