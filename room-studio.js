/* Douglas Designer 0.7 — room capture and catalogue UI, offline first. */
(function(root){
'use strict';
const R=root.DouglasRoom;
const $=(q,el=document)=>el.querySelector(q);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let get,mutate,redraw,view,toast,moveKitchen,isSaved=()=>true,modal,photoImage,photoSource='',previewMode=false,moveActive=false;
let selectedCorner=-1,cornerGesture=null,cornerDraft=null;
const dims=[['width','Breedte ruimte'],['depth','Diepte ruimte'],['height','Hoogte ruimte']];
function room(){return get().room;}
function style(){return get().style;}
function f(v){return new Intl.NumberFormat('nl-NL').format(v);}
function field(k,label){return '<label class="room-field">'+label+'<input data-room="'+k+'" type="number" min="0" step="10" inputmode="numeric"></label>';}
function select(k,options){return '<select data-room="'+k+'">'+options.map(x=>'<option value="'+escape(String(x))+'">'+escape(String(x))+'</option>').join('')+'</select>';}
function initUI(){
 const tabs=$('.sidebar-tabs');
 if(!tabs)return;
 tabs.insertAdjacentHTML('beforeend','<button class="side-tab" data-panel="room" type="button">⌂ <span>Ruimte</span></button><button class="side-tab" data-panel="finishes" type="button">◈ <span>Stijlen</span></button>');
 const body=$('.sidebar-scroll');
 body.insertAdjacentHTML('beforeend',`
 <section class="sidebar-panel hidden" id="panel-room">
 <div class="section-title"><span>ONTWERP IN JE EIGEN RUIMTE</span></div>
 <p class="hint">Wijzig een maat en bekijk direct het resultaat op het 3D-werkvlak. Dit is de ruimte rondom je buitenkeuken.</p>
 <div class="room-mini-wrap"><div class="room-mini-top"><strong>Bovenaanzicht ruimte</strong><small id="roomMiniSize">—</small></div><canvas id="roomMiniPlan" width="360" height="226" aria-label="Bovenaanzicht van ruimte en buitenkeuken"></canvas><div class="room-mini-bottom"><span><i class="mini-legend-wall"></i> Ruimte</span><span><i class="mini-legend-kitchen"></i> Buitenkeuken</span></div></div>
 <div class="room-first-actions"><button id="roomCaptureOpen" class="room-big-action" type="button">📷 Foto toevoegen / openen</button><button id="roomShow3d" class="room-big-action secondary" type="button">◈ Bekijk 3D</button></div>
 <label class="check-row"><input id="roomEnabled" type="checkbox"> 3D-ruimte tonen</label>
 <div class="section-title space-top"><span>RUIMTEAFMETINGEN (MM)</span></div>
 <div class="room-fields">${dims.map(([k,v])=>field(k,v)).join('')}</div>
 <label class="check-row"><input data-room-bool="backWall" type="checkbox"> Achterwand tonen</label>
 <label class="check-row"><input data-room-bool="leftWall" type="checkbox"> Linkerwand tonen</label>
 <div class="section-title space-top"><span>KEUKEN PLAATSEN</span></div>
 <div class="room-fields">${field('x','Vanaf linkerwand (X)')}${field('z','Vanaf voorzijde (Z)')}</div>
 <label class="room-field">Keuken draaien ${select('rotation',[0,90,180,270])}</label>
 <button type="button" class="room-big-action" id="roomDragKitchen">↔ Keuken slepen in bovenaanzicht</button>
 <div class="room-placement-actions"><button id="roomCenterKitchen" type="button" class="outline-btn">Centreren</button><button id="roomAgainstBack" type="button" class="outline-btn">Tegen achterwand (100 mm)</button></div>
 <div id="roomWarnings" class="room-warnings" aria-live="polite"></div>
 <p class="hint">Positie is in de ruimte, niet in de zaaglijst. Voor kamado en koelkast zelf hitteafstand en ventilatie controleren.</p>
 </section>
 <section class="sidebar-panel hidden" id="panel-finishes">
 <div class="section-title"><span>AFWERKINGEN & MATERIAALKLEUREN</span></div>
 <div class="room-first-actions"><button id="finishShow3d" class="room-big-action" type="button">◈ Bekijk mijn wijzigingen in 3D</button></div>
 <p class="hint">Selecteer hieronder een kleur. Het 3D-model verandert direct. Fotorealistische texturen en merkmodellen volgen in een latere release.</p>
 <div id="finishCollections"></div>
 <div class="section-title space-top"><span>FRONTEN & BESLAG</span></div>
 <label class="room-field">Deuren ${select('doorType',R.components.doors)}</label>
 <label class="room-field">Lades ${select('drawerType',R.components.drawers)}</label>
 <label class="room-field">Handgreep ${select('handle',R.components.handles)}</label>
 <label class="room-field">Accessoire (catalogusreferentie) ${select('accessory',R.components.accessories)}</label>
 <p class="hint">66 catalogusvarianten: kleuren en generieke constructiekeuzes. Geen ongeverifieerde fabrikantmaten. Accessoires zijn nog catalogusreferenties, geen plaatsbare 3D-objecten.</p>
 </section>`);
 const stage=$('.stage-toolbar .view-controls');
 if(stage)stage.insertAdjacentHTML('afterend','<button type="button" id="roomToolbarBtn" class="outline-btn room-toolbar" title="Ruimtefoto en 3D ruimte">📷 Ruimtefoto</button>');
 modal=document.createElement('div');modal.id='roomCaptureDialog';modal.className='room-modal hidden';
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Ruimtefoto kalibreren');
 modal.innerHTML=`<div class="room-modal-card"><header class="room-modal-head"><div><strong>Room Capture <span class="room-capture-version">v0.7.4</span></strong><small>Van je eigen foto naar een in te meten 3D-ruimte</small></div><button id="roomClose" aria-label="Sluiten" type="button">✕</button></header>
 <div class="room-modal-body"><div class="room-photo-tools"><button id="roomChoosePhoto" type="button" class="room-file">🖼️ Bestaande foto kiezen</button><button id="roomTakePhoto" type="button" class="room-file room-camera">📷 Camera openen</button><input id="roomImageInput" class="room-hidden-input" type="file" accept="image/*"><input id="roomCameraInput" class="room-hidden-input" type="file" accept="image/*" capture="environment">
 <button id="roomResetCorners" type="button" class="outline-btn">Hoeken opnieuw</button><button id="roomPhotoPreview" class="outline-btn" type="button">Fotopreview</button></div>
 <p class="room-capture-status" id="roomCaptureStatus" role="status" aria-live="polite">Kies een foto, of maak eerst een 3D-ruimte met handmatig ingevoerde maten.</p><div class="room-photo-stage"><canvas id="roomPhotoCanvas" width="960" height="600" aria-label="Ruimtefoto met vloerhoeken"></canvas><div id="roomPhotoEmpty">Voeg een foto toe om te beginnen.</div></div>
 <div class="room-photo-help"><strong id="roomPhotoInstruction">Markeer vier vloerhoeken</strong><span id="roomPhotoProgress">0 / 4</span></div>
 <p class="room-point-help">Tik op een punt en <strong>sleep het naar de juiste plek</strong>. Of kies hieronder een punt en tik op een nieuwe positie in de foto.</p>
 <div id="roomCornerTools" class="room-corner-tools" role="group" aria-label="Vloerpunten afzonderlijk aanpassen">
   <button type="button" data-corner="0" disabled>Punt 1</button><button type="button" data-corner="1" disabled>Punt 2</button>
   <button type="button" data-corner="2" disabled>Punt 3</button><button type="button" data-corner="3" disabled>Punt 4</button>
 </div>
 <p class="hint">Volgorde: voor-links → voor-rechts → achter-rechts → achter-links. Plaats punten op de <strong>vloer</strong>, niet op kastdeurtjes. Vul je werkelijk gemeten afmetingen hieronder in.</p>
 <div class="room-photo-dims">${dims.map(([k,v])=>field(k,v)).join('')}</div>
 <button id="roomApply" class="room-apply" type="button">✓ Maak / update 3D-ruimte</button>
 <p class="hint">De foto blijft lokaal bij het JSON-project. Exporteer het project als back-up. Fotopreview toont een indicatieve projectie, geen fotorealistische of exacte camerakalibratie.</p>
 </div></div>`;
 document.body.append(modal);
 addEvents();drawPhoto();
}
// Read the currently active project directly if an older cached app.js still calls
// commit callbacks with no argument. Prevents iOS offline/PWA mixed-version failures.
function currentProject(maybeProject){
 const p=maybeProject&&typeof maybeProject==='object'?maybeProject:get?.();
 if(!p||typeof p!=='object')throw Error('Geen actief project gevonden. Open het ontwerp opnieuw.');
 return p;
}
function patchRoom(cb){
 mutate(projectArg=>{
  const p=currentProject(projectArg);
  p.room=R.normalizeRoom(p.room,p);
  cb(p.room,p);
  p.room=R.normalizeRoom(p.room,p);
 });
}
function patchStyle(partial){
 mutate(projectArg=>{
  const p=currentProject(projectArg);
  p.style=R.normalizeStyle({...p.style,...partial});
 });
}
function captureStatus(message,warning=false){
 const output=$('#roomCaptureStatus');
 if(output){output.textContent=message;output.classList.toggle('warning',warning);}
}
function changeRoom(key,value){
 patchRoom((r,p)=>{
  if(['width','depth','height','x','z'].includes(key)){
    const n=Math.round(Number(value));if(!Number.isFinite(n))return;
    if(key==='x'||key==='z')r.placement[key]=n;else r[key]=n;
  }else if(key==='rotation')r.placement.rotation=Number(value);
 });
}
function setColor(k,id){patchStyle({[k]:id});}
function updateCollections(){
 const container=$('#finishCollections');if(!container)return;
 container.innerHTML=Object.entries(R.palettes).map(([kind,variants])=>`<div class="finish-group">
 <div class="section-title"><span>${{wood:'DOUGLAS / HOUT',top:'WERKBLAD',front:'KASTFRONTEN',kamado:'KAMADO'}[kind]}</span><small>${variants.length}</small></div>
 <div class="finish-palette">${variants.map(x=>`<button type="button" data-finish="${kind}" data-finish-id="${x.id}" class="finish-choice ${style()[kind]===x.id?'active':''}" title="${escape(x.label)}" aria-label="${escape(x.label)}" aria-pressed="${style()[kind]===x.id}"><span class="finish-chip" style="background:${x.color}"></span><span>${escape(x.label)}</span></button>`).join('')}</div></div>`).join('');
}
function drawMiniPlan(){
 const canvas=$('#roomMiniPlan');if(!canvas||!get)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const p=get(),r=room(),w=360,h=226,pad=23;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#edf2ed';ctx.fillRect(0,0,w,h);
 const scale=Math.min((w-pad*2)/r.width,(h-pad*2)/r.depth);
 const realWidth=r.width*scale,realDepth=r.depth*scale;
 const ox=(w-realWidth)/2,oy=(h-realDepth)/2;
 ctx.fillStyle=r.floorColor;ctx.fillRect(ox,oy,realWidth,realDepth);
 ctx.strokeStyle='#4c6b5b';ctx.lineWidth=3;ctx.strokeRect(ox,oy,realWidth,realDepth);
 if(r.leftWall){ctx.strokeStyle='#6e7f73';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox,oy+realDepth);ctx.stroke();}
 if(r.backWall){ctx.strokeStyle='#6e7f73';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(ox,oy+realDepth);ctx.lineTo(ox+realWidth,oy+realDepth);ctx.stroke();}
 const corners=R.footprint(p,{...r,enabled:true});
 ctx.beginPath();
 corners.forEach((c,i)=>{const x=ox+c[0]*scale,y=oy+c[2]*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
 ctx.closePath();ctx.fillStyle='rgba(166,112,66,.90)';ctx.fill();
 ctx.strokeStyle='#754e30';ctx.lineWidth=2;ctx.stroke();
 const centroid=corners.reduce((acc,v)=>[acc[0]+v[0]*scale/4,acc[1]+v[2]*scale/4],[ox,oy]);
 ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('KEUKEN',centroid[0],centroid[1]+4);
 ctx.fillStyle='#2c5040';ctx.font='bold 11px system-ui';
 ctx.fillText(f(r.width)+' mm',w/2,Math.max(13,oy-9));
 ctx.save();ctx.translate(Math.max(10,ox-9),h/2);ctx.rotate(-Math.PI/2);ctx.fillText(f(r.depth)+' mm',0,0);ctx.restore();
 if(!r.enabled){ctx.fillStyle='rgba(241,246,241,.72)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#3d5949';ctx.font='bold 13px system-ui';ctx.fillText('3D-ruimte staat uit',w/2,h/2);}
 const caption=$('#roomMiniSize');if(caption)caption.textContent=f(r.width)+' × '+f(r.depth)+' mm';
}
function refresh(){
 if(!get||!$('#panel-room'))return;
 const r=room(),st=style();
 $('#roomEnabled').checked=r.enabled;
 document.querySelectorAll('#panel-room [data-room],#roomCaptureDialog [data-room]').forEach(el=>{
  const k=el.dataset.room; const value=['x','z','rotation'].includes(k)?r.placement[k]:r[k];
  if(document.activeElement!==el)el.value=value;
 });
 document.querySelectorAll('#panel-room [data-room-bool]').forEach(el=>el.checked=r[el.dataset.roomBool]);
 for(const k of ['doorType','drawerType','handle','accessory']){const el=$('#panel-finishes select[data-room="'+k+'"]');if(el)el.value=st[k];}
 const issues=R.warnings(get(),r);
 const warnings=$('#roomWarnings');warnings.textContent=issues.length?'⚠ '+issues.join(' · '):r.enabled?'✓ Keuken past binnen de opgegeven ruimte (geometrische controle).':'De ruimte staat uit.';
 warnings.classList.toggle('room-has-warning',issues.length>0);
 updateCollections();
 drawMiniPlan();
 drawPhoto();
 const info=$('#roomWorkspaceMode');
 if(info)info.textContent=r.enabled?'3D-ruimte: '+f(r.width)+' × '+f(r.depth)+' × '+f(r.height)+' mm':'3D-ruimte uitgeschakeld';
}
function openCapture(){
 if(!modal)return;
 selectedCorner=-1;cornerGesture=null;cornerDraft=null;
 modal.classList.remove('hidden');
 previewMode=false;photoSource='';photoImage=null;
 refresh();
 captureStatus(room().photo?'Foto geladen. Markeer de vier vloerhoeken of bekijk je fotopreview.':'Kies een foto of gebruik de handmatige 3D-ruimte.');
 $('#roomClose').focus();
}
function closeCapture(){cornerGesture=null;cornerDraft=null;selectedCorner=-1;modal.classList.add('hidden');$('#roomCaptureOpen').focus();}
function loadImage(source,then){if(!source){photoImage=null;photoSource='';then?.();return;}
 if(source===photoSource&&photoImage?.complete){then?.();return;}
 photoSource=source;const img=new Image();img.onload=()=>{photoImage=img;then?.();};img.onerror=()=>{photoImage=null;then?.();};img.src=source;}
const cornersNames=['voor-links','voor-rechts','achter-rechts','achter-links'];
// Use CSS pixels, not the high-resolution canvas bitmap, for iPhone hit targets.
function photoPoint(e){
 const box=e.currentTarget.getBoundingClientRect();
 if(!box.width||!box.height)return null;
 return [Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),
         Math.max(0,Math.min(1,(e.clientY-box.top)/box.height))];
}
function closestPhotoCorner(point,canvas,corners){
 if(!point||!corners.length)return -1;
 const box=canvas.getBoundingClientRect();
 const radius=Math.max(28,Math.min(box.width,box.height)*.04);
 let closest=-1,best=radius*radius;
 corners.forEach((corner,index)=>{
  const dx=(corner[0]-point[0])*box.width,dy=(corner[1]-point[1])*box.height;
  const dist=dx*dx+dy*dy;
  if(dist<=best){best=dist;closest=index;}
 });
 return closest;
}
function cornerUi(corners){
 const tools=$('#roomCornerTools');
 if(tools){
  tools.classList.toggle('hidden',!corners.length||previewMode);
  tools.querySelectorAll?.('[data-corner]').forEach(btn=>{
   const index=Number(btn.dataset.corner);
   btn.disabled=index>=corners.length;
   btn.classList.toggle('active',index===selectedCorner&&!previewMode);
   btn.setAttribute('aria-pressed',String(index===selectedCorner&&!previewMode));
  });
 }
 const instruction=$('#roomPhotoInstruction');
 if(instruction)instruction.textContent=previewMode?'Indicatieve fotopreview':
  selectedCorner>=0?'Punt '+(selectedCorner+1)+' gekozen — sleep of tik de nieuwe plek':
  corners.length===4?'Vier punten geplaatst — sleep een punt om te corrigeren':
  'Tik vloerhoek '+(corners.length+1)+': '+cornersNames[corners.length];
}
function startPhotoGesture(e){
 if(!photoImage||previewMode||cornerGesture)return;
 const point=photoPoint(e);if(!point)return;
 const existing=cornerDraft||room().corners;
 // An explicitly selected number has priority, even if the new location is near another marker.
 const explicitSelection=selectedCorner>=0;
 const nearest=explicitSelection?selectedCorner:closestPhotoCorner(point,e.currentTarget,existing);
 const index=nearest>=0?nearest:existing.length;
 if(index>=4)return;
 selectedCorner=index;
 cornerDraft=existing.map(c=>c.slice());
 if(index===cornerDraft.length)cornerDraft.push(point);
 else if(nearest<0)cornerDraft[index]=point;
 cornerGesture={pointerId:e.pointerId,index,initial:existing[index]?.slice()||null,
   added:index===existing.length,explicitSelection,point,changed:false};
 e.currentTarget.setPointerCapture?.(e.pointerId);
 e.preventDefault?.();
 drawPhotoNow();
}
function movePhotoGesture(e){
 if(!cornerGesture||e.pointerId!==cornerGesture.pointerId)return;
 const point=photoPoint(e);if(!point)return;
 cornerDraft[cornerGesture.index]=point;
 const old=cornerGesture.point;
 if(Math.hypot(point[0]-old[0],point[1]-old[1])>0.002)cornerGesture.changed=true;
 e.preventDefault?.();drawPhotoNow();
}
function finishPhotoGesture(e,cancel=false){
 if(!cornerGesture||e.pointerId!==cornerGesture.pointerId)return;
 const gesture=cornerGesture;
 // Tap on a pre-existing handle selects it; the next tap elsewhere repositions it.
 const shouldSave=!cancel&&(gesture.added||gesture.changed||
   (gesture.explicitSelection&&gesture.initial&&Math.hypot(gesture.point[0]-gesture.initial[0],gesture.point[1]-gesture.initial[1])>0.001));
 if(!cancel&&shouldSave){
  const point=photoPoint(e);
  if(point)cornerDraft[gesture.index]=point;
 }
 const update=shouldSave?cornerDraft.map(c=>c.slice()):null;
 cornerGesture=null;cornerDraft=null;
 try{e.currentTarget.releasePointerCapture?.(e.pointerId);}catch(_){}
 if(cancel){selectedCorner=-1;drawPhoto();return;}
 if(update){
  patchRoom(r=>{r.corners=update;});
  // After an initial four-point capture, allow tapping any point to correct it.
  selectedCorner=-1;
  captureStatus(update.length===4?'Vier vloerpunten opgeslagen. Je kunt ieder punt nog verslepen.':
    'Punt '+update.length+' geplaatst. Markeer de volgende vloerhoek.');
 }else if(gesture.initial){
  selectedCorner=gesture.index;
 }
 drawPhoto();
}

function drawPhoto(){
 const canvas=$('#roomPhotoCanvas');if(!canvas||modal?.classList.contains('hidden'))return;
 loadImage(room().photo,()=>drawPhotoNow());
}
function drawPhotoNow(){
 const canvas=$('#roomPhotoCanvas');if(!canvas||modal?.classList.contains('hidden'))return;
 const ctx=canvas.getContext('2d');if(!ctx)return; const img=photoImage;
 if(img&&img.width&&img.height){canvas.width=Math.min(1200,img.width);canvas.height=Math.round(canvas.width*img.height/img.width);}
 else{canvas.width=960;canvas.height=600;}
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e8e8df';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(img){ctx.drawImage(img,0,0,canvas.width,canvas.height);$('#roomPhotoEmpty').classList.add('hidden');}
 else{$('#roomPhotoEmpty').classList.remove('hidden');}
 const corners=cornerDraft||room().corners;
 if(previewMode&&corners.length===4&&img)drawPreview(ctx,canvas.width,canvas.height,corners);
 else if(corners.length&&img){
   if(corners.length===4){ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height):ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height));ctx.closePath();ctx.fillStyle='rgba(29,135,91,.12)';ctx.fill();ctx.strokeStyle='#43d58f';ctx.lineWidth=3;ctx.stroke();}
   corners.forEach((p,i)=>{const x=p[0]*canvas.width,y=p[1]*canvas.height;ctx.beginPath();ctx.arc(x,y,i===selectedCorner?18:14,0,Math.PI*2);
    ctx.fillStyle=i===selectedCorner?'#eaa94a':'#145c45';ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=i===selectedCorner?'#173c2d':'#fff';ctx.font='bold 15px system-ui';ctx.textAlign='center';
    ctx.fillText(String(i+1),x,y+5);});
 }
 $('#roomPhotoProgress').textContent=corners.length+' / 4';
 cornerUi(corners);
}
function drawPreview(ctx,w,h,corners){
 const p=get(),r=room(),M=root.DouglasModel;
 const projected=(x,y,z)=>{
   const point=R.transformKitchen([x,y,z],p,{...r,enabled:true});
   const xy=R.floorMap(point[0]/r.width,point[2]/r.depth,corners);
   if(!xy)return [0,0];
   // Perspective-assisted sketch: visually plausible but NOT a camera solution or measured height.
   const depthFactor=1.1-.30*(point[2]/r.depth);
   return [xy[0]*w,xy[1]*h - y/r.height*h*.40*depthFactor];
 };
 const polygon=(vertices,fill,stroke='rgba(255,255,255,.82)')=>{
   ctx.beginPath();vertices.forEach((v,i)=>{const a=projected(...v);i?ctx.lineTo(...a):ctx.moveTo(...a);});
   ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.8;ctx.stroke();
 };
 const frontColor=R.colorOf('front',p.style?.front),wood=R.colorOf('wood',p.style?.wood),worktop=R.colorOf('top',p.style?.top),kamado=R.colorOf('kamado',p.style?.kamado);
 // Render actual module widths and colours instead of an unrelated box overlay.
 const {sections}=M.boundaries(p);
 for(const section of sections){
   const l=section.left+8,rr=section.right-8,m=section.module;
   if(m.kind==='open')continue;
   polygon([[l,105,60],[rr,105,60],[rr,p.height-55,60],[l,p.height-55,60]],m.kind==='fridge'?'rgba(61,71,78,.78)':frontColor);
   if(m.kind==='drawers'){
     const count=p.style?.drawerType==='Twee lades'?2:p.style?.drawerType==='Eén diepe lade'||p.style?.drawerType==='Kolenlade'?1:3;
     for(let i=1;i<count;i++){
       const y=105+(p.height-160)*i/count,a=projected(l,y,45),b=projected(rr,y,45);
       ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle='#1f2a27';ctx.lineWidth=2;ctx.stroke();
     }
   }
   if(m.kind==='doors'&&!p.style?.doorType?.startsWith('Enkele')){
     const x=(l+rr)/2,a=projected(x,105,45),b=projected(x,p.height-55,45);
     ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle='#25342e';ctx.lineWidth=2;ctx.stroke();
   }
 }
 if(p.countertop)polygon([[-8,p.height,-15],[p.width+8,p.height,-15],[p.width+8,p.height,p.depth+15],[-8,p.height,p.depth+15]],worktop);
 // Front posts stay visually legible and retain their underlying CAD dimensions.
 const posts=M.boundaries(p).posts;
 for(const x of posts)polygon([[x,0,0],[x+35,0,0],[x+35,p.height-28,0],[x,p.height-28,0]],wood);
 for(const section of sections)if(section.module.kind==='kamado'){
   const center=projected((section.left+section.right)/2,p.height+80,p.depth*.54);
   const radius=Math.max(8,Math.abs(projected(section.right-20,p.height,p.depth*.54)[0]-projected(section.left+20,p.height,p.depth*.54)[0])*.33);
   ctx.beginPath();ctx.ellipse(center[0],center[1],radius,radius*1.14,0,0,Math.PI*2);
   ctx.fillStyle=kamado;ctx.fill();ctx.strokeStyle='#d8d8d2';ctx.lineWidth=4;ctx.stroke();
 }
 ctx.fillStyle='rgba(18,34,28,.88)';ctx.fillRect(12,12,Math.min(w-24,420),36);
 ctx.font='bold 14px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText('Ontwerppreview — niet maatvast',24,35);
}
async function uploadFile(file){
 if(!file){captureStatus('Geen foto geselecteerd.');return;}
 if(file.size>18000000){captureStatus('Deze foto is groter dan 18 MB. Kies een kleinere afbeelding.',true);return;}
 if(file.type&&!file.type.startsWith('image/')){captureStatus('Het gekozen bestand is geen afbeelding.',true);return;}
 captureStatus('Foto wordt verwerkt…');
 const url=URL.createObjectURL(file);
 const img=new Image();
 img.onload=()=>{
  try{
   const max=1100,ratio=Math.min(1,max/Math.max(img.width,img.height));
   const c=document.createElement('canvas');
   c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));
   const context=c.getContext('2d');
   if(!context)throw Error('Canvas wordt niet ondersteund door deze browser');
   context.drawImage(img,0,0,c.width,c.height);
   let data='';
   for(const quality of [.7,.55,.4,.3]){
    data=c.toDataURL('image/jpeg',quality);
    if(data.length<=1300000)break;
   }
   if(data.length>1300000)throw Error('Afbeelding is na verkleinen nog te groot');
   patchRoom(r=>{r.photo=data;r.corners=[];});
   previewMode=false;photoImage=null;photoSource='';selectedCorner=-1;cornerDraft=null;cornerGesture=null;
   drawPhoto();
   if(isSaved()){
    captureStatus('✓ Foto toegevoegd en lokaal opgeslagen. Tik vier vloerpunten aan, of gebruik alleen de ruimtematen.');
    toast('Foto toegevoegd en opgeslagen');
   }else{
    captureStatus('⚠ De foto is geladen maar kon niet worden opgeslagen. Exporteer het project als JSON-back-up.',true);
   }
  }catch(error){
   captureStatus('Foto kon niet worden toegevoegd: '+error.message+'. Heropen de ruimte of vernieuw de app.',true);
 }
  finally{URL.revokeObjectURL(url);}
 };
 img.onerror=()=>{
  URL.revokeObjectURL(url);
  captureStatus('Foto niet ondersteund. Probeer een JPEG of PNG (sommige HEIC-bestanden kunnen niet worden geopend).',true);
 };
 img.src=url;
}
function addEvents(){
 $('#roomToolbarBtn')?.addEventListener('click',openCapture);$('#roomCaptureOpen').addEventListener('click',openCapture);
 $('#roomClose').addEventListener('click',closeCapture);
 modal.addEventListener('click',e=>{if(e.target===modal)closeCapture();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden')){e.stopPropagation();closeCapture();}});
 $('#roomChoosePhoto').addEventListener('click',()=>$('#roomImageInput').click());
 $('#roomTakePhoto').addEventListener('click',()=>$('#roomCameraInput').click());
 for(const selector of ['#roomImageInput','#roomCameraInput']){
  $(selector).addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';uploadFile(file);});
 }
 $('#roomShow3d').addEventListener('click',()=>view('3d'));
 $('#finishShow3d').addEventListener('click',()=>view('3d'));
 $('#roomResetCorners').addEventListener('click',()=>{selectedCorner=-1;cornerGesture=null;cornerDraft=null;previewMode=false;patchRoom(r=>r.corners=[]);drawPhoto();});
 $('#roomPhotoPreview').addEventListener('click',()=>{if(room().corners.length!==4){toast('Markeer eerst vier vloerhoeken.');return;}previewMode=!previewMode;selectedCorner=-1;drawPhoto();});
 $('#roomCornerTools').addEventListener('click',e=>{
  const button=e.target.closest?.('[data-corner]');
  if(!button||button.disabled||previewMode)return;
  selectedCorner=Number(button.dataset.corner);
  captureStatus('Punt '+(selectedCorner+1)+' geselecteerd. Tik op de foto waar dit punt moet komen.');
  drawPhoto();
 });
 const photoCanvas=$('#roomPhotoCanvas');
 photoCanvas.addEventListener('pointerdown',startPhotoGesture);
 photoCanvas.addEventListener('pointermove',movePhotoGesture);
 photoCanvas.addEventListener('pointerup',e=>finishPhotoGesture(e));
 photoCanvas.addEventListener('pointercancel',e=>finishPhotoGesture(e,true));
 $('#roomApply').addEventListener('click',()=>{
  patchRoom((r,p)=>{r.enabled=true;const dims=R.orientation(p,r);
    if(!Number.isFinite(r.placement.x))r.placement.x=Math.round((r.width-dims.width)/2);
    if(!Number.isFinite(r.placement.z))r.placement.z=Math.max(0,r.depth-dims.depth-100);
  });view('3d');closeCapture();toast('3D-ruimte ingesteld. Controleer de maten.');
 });
 $('#roomEnabled').addEventListener('change',e=>patchRoom(r=>{r.enabled=e.target.checked;}));
 document.addEventListener('change',e=>{
   if(e.target.closest('#panel-room,#roomCaptureDialog') && e.target.matches('[data-room]'))changeRoom(e.target.dataset.room,e.target.value);
   if(e.target.closest('#panel-room')&&e.target.matches('[data-room-bool]'))patchRoom(r=>{r[e.target.dataset.roomBool]=e.target.checked;});
   if(e.target.closest('#panel-finishes')&&e.target.matches('select[data-room]'))
     patchStyle({[e.target.dataset.room]:e.target.value});
 });
 $('#roomDragKitchen').addEventListener('click',()=>{moveActive=moveKitchen(!moveActive);$('#roomDragKitchen').textContent=moveActive?'✓ Gereed met verplaatsen':'↔ Keuken slepen in bovenaanzicht';});
 $('#roomCenterKitchen').addEventListener('click',()=>patchRoom((r,p)=>{const o=R.orientation(p,r);r.placement.x=Math.round((r.width-o.width)/2);r.placement.z=Math.max(0,Math.round((r.depth-o.depth)/2));}));
 $('#roomAgainstBack').addEventListener('click',()=>patchRoom((r,p)=>{const o=R.orientation(p,r);r.placement.z=r.depth-o.depth-100;}));
 document.addEventListener('click',e=>{const b=e.target.closest('[data-finish]');if(b)setColor(b.dataset.finish,b.dataset.finishId);});
}
function mount(api){get=api.getProject;mutate=api.commit;redraw=api.render;view=api.setView;toast=api.toast;moveKitchen=api.setRoomMove;isSaved=api.isSaved||(()=>true);initUI();refresh();}
root.DouglasRoomStudio={mount,refresh};
})(typeof globalThis!=='undefined'?globalThis:this);
