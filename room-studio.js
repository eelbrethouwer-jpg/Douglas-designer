/* Douglas Designer 0.7 — room capture and catalogue UI, offline first. */
(function(root){
'use strict';
const R=root.DouglasRoom;
const $=(q,el=document)=>el.querySelector(q);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let get,mutate,redraw,view,toast,modal,photoImage,photoSource='',previewMode=false;
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
 <p class="hint">Meet de ruimte na. Een enkele foto levert geen betrouwbare dieptematen op.</p>
 <button id="roomCaptureOpen" class="room-big-action" type="button">📷 Foto toevoegen of bekijken</button>
 <label class="check-row"><input id="roomEnabled" type="checkbox"> 3D-ruimte tonen</label>
 <div class="section-title space-top"><span>RUIMTEAFMETINGEN (MM)</span></div>
 <div class="room-fields">${dims.map(([k,v])=>field(k,v)).join('')}</div>
 <label class="check-row"><input data-room-bool="backWall" type="checkbox"> Achterwand tonen</label>
 <label class="check-row"><input data-room-bool="leftWall" type="checkbox"> Linkerwand tonen</label>
 <div class="section-title space-top"><span>KEUKEN PLAATSEN</span></div>
 <div class="room-fields">${field('x','Vanaf linkerwand (X)')}${field('z','Vanaf voorzijde (Z)')}</div>
 <label class="room-field">Keuken draaien ${select('rotation',[0,90,180,270])}</label>
 <div class="room-placement-actions"><button id="roomCenterKitchen" type="button" class="outline-btn">Centreren</button><button id="roomAgainstBack" type="button" class="outline-btn">Tegen achterwand (100 mm)</button></div>
 <div id="roomWarnings" class="room-warnings" aria-live="polite"></div>
 <p class="hint">Positie is in de ruimte, niet in de zaaglijst. Voor kamado en koelkast zelf hitteafstand en ventilatie controleren.</p>
 </section>
 <section class="sidebar-panel hidden" id="panel-finishes">
 <div class="section-title"><span>REALISTISCHE KLEURSTUDIO</span></div>
 <p class="hint">Kies materiaal- en kleurreferenties. De huidige 3D-engine toont ingekleurde vlakken; PBR-texturen en merkmodellen zijn nog niet ingebouwd.</p>
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
 modal.innerHTML=`<div class="room-modal-card"><header class="room-modal-head"><div><strong>Room Capture</strong><small>Van je eigen foto naar een in te meten 3D-ruimte</small></div><button id="roomClose" aria-label="Sluiten" type="button">✕</button></header>
 <div class="room-modal-body"><div class="room-photo-tools"><label class="room-file">📷 Kies foto<input id="roomImageInput" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" capture="environment"></label>
 <button id="roomResetCorners" type="button" class="outline-btn">Hoeken opnieuw</button><button id="roomPhotoPreview" class="outline-btn" type="button">Fotopreview</button></div>
 <div class="room-photo-stage"><canvas id="roomPhotoCanvas" width="960" height="600" aria-label="Ruimtefoto met vloerhoeken"></canvas><div id="roomPhotoEmpty">Voeg een foto toe om te beginnen.</div></div>
 <div class="room-photo-help"><strong id="roomPhotoInstruction">Markeer vier vloerhoeken</strong><span id="roomPhotoProgress">0 / 4</span></div>
 <p class="hint">Klik achtereenvolgens op de vloer: voor-links, voor-rechts, achter-rechts, achter-links. Dit is een visuele perspectiefhulp; je bevestigt de echte maten hieronder.</p>
 <div class="room-photo-dims">${dims.map(([k,v])=>field(k,v)).join('')}</div>
 <button id="roomApply" class="room-apply" type="button">✓ Maak / update 3D-ruimte</button>
 <p class="hint">De foto blijft lokaal bij het JSON-project. Exporteer het project als back-up. Fotopreview toont een indicatieve projectie, geen fotorealistische of exacte camerakalibratie.</p>
 </div></div>`;
 document.body.append(modal);
 addEvents();drawPhoto();
}
function patchRoom(cb){mutate(p=>{p.room=R.normalizeRoom(p.room,p);cb(p.room,p);p.room=R.normalizeRoom(p.room,p);});}
function changeRoom(key,value){
 patchRoom((r,p)=>{
  if(['width','depth','height','x','z'].includes(key)){
    const n=Math.round(Number(value));if(!Number.isFinite(n))return;
    if(key==='x'||key==='z')r.placement[key]=n;else r[key]=n;
  }else if(key==='rotation')r.placement.rotation=Number(value);
 });
}
function setColor(k,id){mutate(p=>{p.style=R.normalizeStyle({...p.style,[k]:id});});}
function updateCollections(){
 const container=$('#finishCollections');if(!container)return;
 container.innerHTML=Object.entries(R.palettes).map(([kind,variants])=>`<div class="finish-group">
 <div class="section-title"><span>${{wood:'DOUGLAS / HOUT',top:'WERKBLAD',front:'KASTFRONTEN',kamado:'KAMADO'}[kind]}</span><small>${variants.length}</small></div>
 <div class="finish-palette">${variants.map(x=>`<button type="button" data-finish="${kind}" data-finish-id="${x.id}" class="finish-choice ${style()[kind]===x.id?'active':''}" title="${escape(x.label)}" aria-label="${escape(x.label)}" aria-pressed="${style()[kind]===x.id}"><span class="finish-chip" style="background:${x.color}"></span><span>${escape(x.label)}</span></button>`).join('')}</div></div>`).join('');
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
 drawPhoto();
}
function openCapture(){if(!modal)return;modal.classList.remove('hidden');previewMode=false;photoSource='';photoImage=null;refresh();$('#roomClose').focus();}
function closeCapture(){modal.classList.add('hidden');$('#roomCaptureOpen').focus();}
function loadImage(source,then){if(!source){photoImage=null;photoSource='';then?.();return;}
 if(source===photoSource&&photoImage?.complete){then?.();return;}
 photoSource=source;const img=new Image();img.onload=()=>{photoImage=img;then?.();};img.onerror=()=>{photoImage=null;then?.();};img.src=source;}
const cornersNames=['voor-links','voor-rechts','achter-rechts','achter-links'];
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
 const corners=room().corners;
 if(previewMode&&corners.length===4&&img)drawPreview(ctx,canvas.width,canvas.height,corners);
 else if(corners.length&&img){
   if(corners.length===4){ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height):ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height));ctx.closePath();ctx.fillStyle='rgba(29,135,91,.12)';ctx.fill();ctx.strokeStyle='#43d58f';ctx.lineWidth=3;ctx.stroke();}
   corners.forEach((p,i)=>{const x=p[0]*canvas.width,y=p[1]*canvas.height;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fillStyle='#145c45';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),x,y+5);});
 }
 $('#roomPhotoProgress').textContent=corners.length+' / 4';
 $('#roomPhotoInstruction').textContent=previewMode?'Indicatieve fotopreview':corners.length===4?'Vloer gemarkeerd — bevestig de ruimte':'Klik vloerhoek '+(corners.length+1)+': '+cornersNames[corners.length];
}
function drawPreview(ctx,w,h,corners){
 const p=get(),r=room(),foot=R.footprint(p,{...r,enabled:true});
 const pts=foot.map(v=>R.floorMap(v[0]/r.width,v[2]/r.depth,corners)).filter(Boolean);
 if(pts.length!==4)return;
 const scale=(p.height/r.height)*Math.max(28,h*.32);const up=pts.map(([x,y],i)=>[x*w,y*h-scale*(i>=2?.72:1.05)]);
 ctx.fillStyle='rgba(30,45,37,.32)';ctx.strokeStyle='#fff';ctx.lineWidth=3;
 ctx.beginPath();pts.forEach((pt,i)=>i?ctx.lineTo(pt[0]*w,pt[1]*h):ctx.moveTo(pt[0]*w,pt[1]*h));ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='rgba(178,130,79,.66)';ctx.beginPath();up.forEach((pt,i)=>i?ctx.lineTo(pt[0],pt[1]):ctx.moveTo(pt[0],pt[1]));ctx.closePath();ctx.fill();ctx.stroke();
 pts.forEach((pt,i)=>{ctx.beginPath();ctx.moveTo(pt[0]*w,pt[1]*h);ctx.lineTo(up[i][0],up[i][1]);ctx.stroke();});
 ctx.fillStyle='rgba(18,34,28,.9)';ctx.fillRect(12,12,Math.min(w-24,375),36);
 ctx.font='bold 14px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText('Conceptprojectie — niet maatvast',24,35);
}
async function uploadFile(file){
 if(!file||file.size>18000000){toast('Kies een afbeelding van maximaal 18 MB.');return;}
 if(!file.type.startsWith('image/')){toast('Dit bestand is geen foto.');return;}
 const u=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{try{const max=1100,ratio=Math.min(1,max/Math.max(image.width,image.height));
 const c=document.createElement('canvas');c.width=Math.round(image.width*ratio);c.height=Math.round(image.height*ratio);
 c.getContext('2d').drawImage(image,0,0,c.width,c.height);
 const data=c.toDataURL('image/jpeg',.68);if(data.length>1300000)throw Error('Foto is te groot om in project op te slaan');
 patchRoom(r=>{r.photo=data;r.corners=[];});previewMode=false;photoImage=null;photoSource='';drawPhoto();toast('Foto toegevoegd. Markeer nu de vier vloerhoeken.');
 }catch(error){toast('Foto verwerken mislukt: '+error.message);}finally{URL.revokeObjectURL(u);}};
 image.onerror=()=>{URL.revokeObjectURL(u);toast('Foto kon niet worden geopend. Probeer JPEG of PNG.');};
 image.src=u;
}
function addEvents(){
 $('#roomToolbarBtn')?.addEventListener('click',openCapture);$('#roomCaptureOpen').addEventListener('click',openCapture);
 $('#roomClose').addEventListener('click',closeCapture);
 modal.addEventListener('click',e=>{if(e.target===modal)closeCapture();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden')){e.stopPropagation();closeCapture();}});
 $('#roomImageInput').addEventListener('change',e=>{uploadFile(e.target.files?.[0]);e.target.value='';});
 $('#roomResetCorners').addEventListener('click',()=>{patchRoom(r=>r.corners=[]);previewMode=false;drawPhoto();});
 $('#roomPhotoPreview').addEventListener('click',()=>{if(room().corners.length!==4){toast('Markeer eerst vier vloerhoeken.');return;}previewMode=!previewMode;drawPhoto();});
 $('#roomPhotoCanvas').addEventListener('pointerdown',e=>{
  if(!photoImage||previewMode||room().corners.length>=4)return;
  const bounds=e.currentTarget.getBoundingClientRect(),point=[Math.max(0,Math.min(1,(e.clientX-bounds.left)/bounds.width)),Math.max(0,Math.min(1,(e.clientY-bounds.top)/bounds.height))];
  patchRoom(r=>r.corners.push(point));
 });
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
   if(e.target.closest('#panel-finishes')&&e.target.matches('select[data-room]'))mutate(p=>{p.style=R.normalizeStyle({...p.style,[e.target.dataset.room]:e.target.value});});
 });
 $('#roomCenterKitchen').addEventListener('click',()=>patchRoom((r,p)=>{const o=R.orientation(p,r);r.placement.x=Math.round((r.width-o.width)/2);r.placement.z=Math.max(0,Math.round((r.depth-o.depth)/2));}));
 $('#roomAgainstBack').addEventListener('click',()=>patchRoom((r,p)=>{const o=R.orientation(p,r);r.placement.z=r.depth-o.depth-100;}));
 document.addEventListener('click',e=>{const b=e.target.closest('[data-finish]');if(b)setColor(b.dataset.finish,b.dataset.finishId);});
}
function mount(api){get=api.getProject;mutate=api.commit;redraw=api.render;view=api.setView;toast=api.toast;initUI();refresh();}
root.DouglasRoomStudio={mount,refresh};
})(typeof globalThis!=='undefined'?globalThis:this);
