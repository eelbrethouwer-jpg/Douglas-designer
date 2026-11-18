/* Douglas Designer — geometric model, independent of UI/canvas. Units: millimetres. */
(function(root, factory) {
  const model = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  root.DouglasModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const TYPES = {
    drawers: {label:'Ladekast', color:'#ba8352', min:260},
    fridge: {label:'Koelkast', color:'#364351', min:550},
    kamado: {label:'Kamado', color:'#333b36', min:480},
    doors: {label:'Deurenkast', color:'#ad794b', min:260},
    open: {label:'Open vak', color:'#b48a60', min:220}
  };
  // Douglas-profielen (breedte s × hoogte t in mm, bij oriëntatie als de standaard 50 × 100).
  // De standaardbalk blijft 50 × 100 mm; de andere maten zijn opties die de gebruiker bewust kiest.
  const DEFAULT_PROFILE='50x100';
  const PROFILES={
    '28x70':{id:'28x70',label:'28 × 70 mm (rachel)',s:28,t:70},
    '50x50':{id:'50x50',label:'50 × 50 mm',s:50,t:50},
    '50x100':{id:'50x100',label:'50 × 100 mm (standaard)',s:50,t:100},
    '50x150':{id:'50x150',label:'50 × 150 mm',s:50,t:150},
    '70x70':{id:'70x70',label:'70 × 70 mm',s:70,t:70},
    '100x100':{id:'100x100',label:'100 × 100 mm',s:100,t:100}
  };
  const profileOf=(b)=>PROFILES[b&&b.profile]||PROFILES[DEFAULT_PROFILE];
  const number = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const round=(v)=>Math.round(v);
  const uid=()=>`item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  // Material-list settings (bevestiging, beslag, afwerking). Every value is an editable ASSUMPTION;
  // prices are the user's own input and are never presented as live prices.
  const MATERIAL_LIMITS={screwsPerJoint:[0,20],screwBox:[1,5000],wastePct:[0,50],hingesPerDoorModule:[0,12],drawerSetsPerModule:[0,12],oilCoverage:[1,30],oilCoats:[1,5]};
  function defaultMaterials(){return {screwsPerJoint:2,screwBox:200,wastePct:10,hingesPerDoorModule:4,drawerSetsPerModule:2,oilCoverage:10,oilCoats:2,prices:{}};}
  function normalizeMaterials(raw){
    const m=defaultMaterials();
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return m;
    for(const [key,[lo,hi]] of Object.entries(MATERIAL_LIMITS))m[key]=clamp(number(raw[key],m[key]),lo,hi);
    for(const key of ['screwsPerJoint','screwBox','hingesPerDoorModule','drawerSetsPerModule','oilCoats'])m[key]=round(m[key]);
    if(raw.prices&&typeof raw.prices==='object'&&!Array.isArray(raw.prices)){
      for(const [id,v] of Object.entries(raw.prices).slice(0,50)){
        if(!/^[a-z0-9-]{1,40}$/.test(id))continue;
        const price=Number(v);if(Number.isFinite(price))m.prices[id]=clamp(price,0,100000);
      }
    }
    return m;
  }
  // Werkblad: afmetingen in mm. Standaard = de tot nu toe getoonde waarden (24 mm dik, 8 mm zij-, 14 mm voor-/achteroverstek).
  const COUNTERTOP_LIMITS={thickness:[10,80],overhangSide:[0,200],overhangFront:[0,300],overhangBack:[0,300]};
  // Eigen apparaatmaten (fabrikantgegevens die de gebruiker zelf invoert); 0 = onbekend.
  function normalizeAppliance(a){const d=(v)=>clamp(round(number(v,0)),0,2500);return {w:d(a.w),d:d(a.d),h:d(a.h)};}
  function defaultCountertop(){return {thickness:24,overhangSide:8,overhangFront:14,overhangBack:14};}
  function normalizeCountertop(raw){
    const c=defaultCountertop();if(!raw||typeof raw!=='object'||Array.isArray(raw))return c;
    for(const [k,[lo,hi]] of Object.entries(COUNTERTOP_LIMITS))c[k]=clamp(round(number(raw[k],c[k])),lo,hi);return c;
  }
  function countertopBox(p){
    const c=p.countertopSpec||defaultCountertop();
    return {x:-c.overhangSide,y:p.height-c.thickness,z:-c.overhangFront,w:p.width+2*c.overhangSide,h:c.thickness,d:p.depth+c.overhangFront+c.overhangBack};
  }
  function demoProject() {
    return {
      version:1, id:uid(), name:'Mijn buitenkeuken', width:1875, depth:870, height:950,
      section:50, sectionLong:100, stockLength:2800, kerf:3, beamPrice:16.95,
      countertop:true, countertopSpec:defaultCountertop(), frameEdits:{}, materials:defaultMaterials(), modules:[
        {id:uid(),kind:'drawers',width:520,name:'Ladekast'},
        {id:uid(),kind:'fridge',width:600,name:'Koelkast'},
        {id:uid(),kind:'kamado',width:555,name:'Kamado'}
      ], beams:[]
    };
  }
  function freeProject() {
    const p=demoProject();
    p.name='Vrij ontwerp';p.width=2000;p.depth=1000;p.height=1200;
    p.modules=[];p.beams=[];p.countertop=false;return p;
  }
  function resizeBeamEndpoint(beam, endpoint, newCoordinate, step=5) {
    if(!beam || !['x','y','z'].includes(beam.axis) || !Number.isFinite(newCoordinate))return false;
    const axis=beam.axis, grid=Math.max(1,step), snapped=Math.round(newCoordinate/grid)*grid;
    const start=beam[axis], end=start+beam.length;
    if(endpoint==='end')beam.length=clamp(snapped-start,50,6500);
    else if(endpoint==='start'){
      const newStart=Math.min(end-50,Math.max(end-6500,snapped));
      beam[axis]=newStart;beam.length=end-newStart;
    }else return false;
    return true;
  }
  function drawingBeam(start, end, plane, options={}) {
    if(!start||!end||!Array.isArray(plane)||plane.length!==2)return null;
    const [a,b]=plane;
    if(!['x','y','z'].includes(a)||!['x','y','z'].includes(b)||a===b)return null;
    const axis=Math.abs(end[a]-start[a])>=Math.abs(end[b]-start[b])?a:b;
    const step=options.step||5;
    const anchor=Math.round(Math.min(start[axis],end[axis])/step)*step;
    const tail=Math.round(Math.max(start[axis],end[axis])/step)*step;
    const length=tail-anchor;
    if(length<50)return null;
    const beam={id:uid(),name:axis==='x'?'Horizontale regel':axis==='y'?'Staander':'Dieptebalk',axis,
       length:Math.min(6500,length),x:0,y:0,z:0};
    for(const key of ['x','y','z'])beam[key]=Math.round((start[key]||0)/step)*step;
    beam[axis]=anchor;
    return beam;
  }
  function normalizeProject(raw) {
    if(!raw || typeof raw!=='object') return demoProject();
    const p=demoProject();
    p.id=String(raw.id || p.id); p.name=String(raw.name||p.name).slice(0,80);
    p.depth=clamp(round(number(raw.depth,p.depth)),400,2000);
    p.height=clamp(round(number(raw.height,p.height)),400,2500);
    p.stockLength=clamp(round(number(raw.stockLength,p.stockLength)),1000,6500);
    p.kerf=clamp(round(number(raw.kerf,3)),0,10);
    p.beamPrice=clamp(number(raw.beamPrice,p.beamPrice),0,1000);
    p.countertop=raw.countertop!==false;
    p.materials=normalizeMaterials(raw.materials);
    p.countertopSpec=normalizeCountertop(raw.countertopSpec);
    p.modules=Array.isArray(raw.modules) ? raw.modules.slice(0,12).filter(m=>TYPES[m.kind]).map(m=>({
      id:String(m.id||uid()),kind:m.kind,width:clamp(round(number(m.width,500)),200,2400),
      name:String(m.name||TYPES[m.kind].label).slice(0,60),
      ...(m.appliance&&typeof m.appliance==='object'?{appliance:normalizeAppliance(m.appliance)}:{})
    })) : p.modules;
    // An explicit empty module array is a valid FREE drawing document.
    p.beams=Array.isArray(raw.beams) ? raw.beams.slice(0,100).map(b=>({
      id:String(b.id||uid()),name:String(b.name||'Losse balk').slice(0,60),
      x:round(number(b.x)),y:round(number(b.y)),z:round(number(b.z)),
      axis:['x','y','z'].includes(b.axis)?b.axis:'x',
      length:clamp(round(number(b.length,500)),50,6500),
      profile:PROFILES[b.profile]?b.profile:DEFAULT_PROFILE
    })) : [];
    // Only intentional frame edits are persisted; keep generated geometry parametric.
    p.frameEdits={};
    if(raw.frameEdits&&typeof raw.frameEdits==='object'&&!Array.isArray(raw.frameEdits)){
      for(const [id,edit] of Object.entries(raw.frameEdits).slice(0,250)){
        if(!/^frame-(post|cross|rail)-[a-z0-9-]+$/.test(id)||!edit||typeof edit!=='object')continue;
        const clean={};
        for(const axis of ['x','y','z'])if(Number.isFinite(edit[axis]))clean[axis]=clamp(round(edit[axis]),-10000,10000);
        if(Number.isFinite(edit.length))clean.length=clamp(round(edit.length),50,6500);
        if(typeof edit.name==='string')clean.name=edit.name.slice(0,60);
        if(PROFILES[edit.profile])clean.profile=edit.profile;
        if(edit.disabled===true)clean.disabled=true;
        if(Object.keys(clean).length)p.frameEdits[id]=clean;
      }
    }
    p.width=p.modules.length?expectedWidth(p):clamp(round(number(raw.width,p.width)),500,7000);
    return p;
  }
  function expectedWidth(p) {return p.modules.length?(p.modules.length+1)*50 + p.modules.reduce((s,m)=>s+m.width,0):p.width;}
  function resizeProject(p,targetWidth){
    targetWidth=round(number(targetWidth,p.width));
    if(!p.modules.length){if(targetWidth<500||targetWidth>7000)return false;p.width=targetWidth;return true;}
    const available=targetWidth-(p.modules.length+1)*50;
    const minima=p.modules.map(m=>Math.max(200,TYPES[m.kind].min));
    if(available<minima.reduce((a,b)=>a+b,0)) return false;
    const base=p.modules.map((m,i)=>Math.max(0,m.width-minima[i]));
    const totalFlex=available-minima.reduce((a,b)=>a+b,0);
    const totalBase=base.reduce((a,b)=>a+b,0);
    let used=0;
    p.modules.forEach((m,i)=>{
      const share=i===p.modules.length-1?totalFlex-used:Math.floor(totalFlex*(totalBase ? base[i]/totalBase:1/p.modules.length));
      m.width=minima[i]+share;used+=share;
    });
    p.width=expectedWidth(p);return true;
  }
  function boundaries(p){
    let x=0;const sections=[];
    p.modules.forEach(m=>{sections.push({module:m,left:x+50,right:x+50+m.width,post:x}); x+=50+m.width;});
    return {sections, posts:[...sections.map(s=>s.post),x]};
  }
  function beamBox(b){
    const {s,t}=profileOf(b);
    if(b.axis==='x') return {x:b.x,y:b.y,z:b.z,w:b.length,h:t,d:s};
    if(b.axis==='y') return {x:b.x,y:b.y,z:b.z,w:s,h:b.length,d:t};
    return {x:b.x,y:b.y,z:b.z,w:s,h:t,d:b.length};
  }
  function framePieces(p){
    const cuts=[], {sections,posts}=boundaries(p);
    if(!sections.length)return cuts;
    const upper=p.height-125, lower=100, postLength=upper;
    function put(name,axis,length,x,y,z,group,id){
      const patch=p.frameEdits?.[id];
      if(patch?.disabled)return null;
      const b={id,name,axis,length:round(length),x:round(x),y:round(y),z:round(z),group};
      if(patch)for(const key of ['name','length','x','y','z','profile'])if(patch[key]!==undefined)b[key]=patch[key];
      cuts.push(b);return b;
    }
    for(const [i,x] of posts.entries()){
      put('Staander','y',postLength,x,0,0,'Frame',`frame-post-${i}-front`);
      put('Staander','y',postLength,x,0,p.depth-100,'Frame',`frame-post-${i}-back`);
      for(const y of [lower,upper]) {
        // Upper side rails rest 50 mm on both front/back posts; lower rails remain inset.
        const seated=y===upper;
        put(seated?'Dwarsregel boven':'Dwarsregel onder','z',seated?p.depth-100:p.depth-200,x,y,seated?50:100,'Frame',`frame-cross-${i}-${seated?'top':'bottom'}`);
      }
    }
    for(const [i,s] of sections.entries()){
      for(const y of [lower,upper]){
        // Upper rails bear 25 mm on both posts, and meet above the post's centre.
        // This is a geometrical joint model, NOT a certified structural detail.
        const seated=y===upper;
        const start=seated?s.left-25:s.left;
        const length=seated?s.module.width+50:s.module.width;
        put(seated?'Ligger boven':'Ligger onder','x',length,start,y,0,'Frame',`frame-rail-${i}-${seated?'top':'bottom'}-front`);
        put(seated?'Ligger boven':'Ligger onder','x',length,start,y,p.depth-50,'Frame',`frame-rail-${i}-${seated?'top':'bottom'}-back`);
      }
    }
    return cuts;
  }
  function editFrameBeam(p,id,changes){
    if(!id||!changes||typeof changes!=='object')return false;
    const base=framePieces({...p,frameEdits:{}}).find(b=>b.id===id);
    if(!base)return false;
    const patch={...(p.frameEdits?.[id]||{})};
    for(const k of ['x','y','z'])if(Object.hasOwn(changes,k)&&Number.isFinite(Number(changes[k])))
      patch[k]=clamp(round(Number(changes[k])),-10000,10000);
    if(Object.hasOwn(changes,'length')&&Number.isFinite(Number(changes.length)))
      patch.length=clamp(round(Number(changes.length)),50,6500);
    if(Object.hasOwn(changes,'name'))patch.name=String(changes.name).slice(0,60)||base.name;
    if(Object.hasOwn(changes,'profile')&&PROFILES[changes.profile])patch.profile=changes.profile;
    if(Object.hasOwn(changes,'disabled'))patch.disabled=changes.disabled===true;
    p.frameEdits={...(p.frameEdits||{}),[id]:patch};
    return true;
  }
  function restoreFrameBeam(p,id){
    if(!p.frameEdits||!Object.hasOwn(p.frameEdits,id))return false;
    const edits={...p.frameEdits};delete edits[id];p.frameEdits=edits;return true;
  }
  // Geometry-only fit: use the actual face-to-face gap between TWO existing
  // supports, never a guessed stock size. The transverse beam cross-section
  // must overlap both supports. This does not validate joint strength.
  function fitBeamBetween(p, beam) {
    if (!beam || !['x','y','z'].includes(beam.axis)) return null;
    const axis=beam.axis, long={x:['x','w'],y:['y','h'],z:['z','d']}[axis];
    const transverse={x:[['y','h'],['z','d']],y:[['x','w'],['z','d']],z:[['x','w'],['y','h']]}[axis];
    const target=beamBox(beam);
    const overlapping=(a,b,key,len)=>Math.min(a[key]+a[len],b[key]+b[len])-Math.max(a[key],b[key])>5;
    const supports=allBeams(p).filter(b=>b.id!==beam.id).map(beamBox)
      .filter(b=>transverse.every(([key,len])=>overlapping(target,b,key,len)))
      .map(b=>({start:b[long[0]],end:b[long[0]]+b[long[1]]}))
      .sort((a,b)=>a.start-b.start||a.end-b.end);
    if(supports.length<2)return null;
    const occupied=[];
    for(const box of supports){const last=occupied[occupied.length-1];
      if(last&&box.start<=last.end)last.end=Math.max(last.end,box.end);
      else occupied.push({...box});
    }
    const center=beam[axis]+beam.length/2;
    const gaps=[];
    for(let i=0;i<occupied.length-1;i++){
      const start=occupied[i].end,end=occupied[i+1].start,length=Math.round(end-start);
      if(length>=50&&length<=6500&&center>=start-35&&center<=end+35)
        gaps.push({axis,start:Math.round(start),end:Math.round(end),length,distance:Math.abs(center-(start+end)/2)});
    }
    gaps.sort((a,b)=>a.distance-b.distance);
    return gaps[0]||null;
  }
  function allBeams(p){return [...framePieces(p),...p.beams.map(b=>({...b,group:'Losse balken'}))];}
  // Contactpunten: twee niet-parallelle balken waarvan een kopse kant de ander raakt
  // (tolerantie 1 mm, dwarsoverlap > 5 mm). Geeft Map<id, Set<id>>.
  const AXDIM={x:['x','w'],y:['y','h'],z:['z','d']};
  function beamContacts(p){
    const items=allBeams(p).map(b=>({b,box:beamBox(b)})),map=new Map(items.map(i=>[i.b.id,new Set()]));
    for(const a of items){
      const axis=a.b.axis,[k,l]=AXDIM[axis],ends=[a.box[k],a.box[k]+a.box[l]],others=['x','y','z'].filter(o=>o!==axis);
      for(const o of items){
        if(o===a||o.b.axis===axis)continue;
        const lo=o.box[k]-1,hi=o.box[k]+o.box[l]+1;
        if(!ends.some(e=>e>=lo&&e<=hi))continue;
        const touching=others.every(t=>{const [tk,tl]=AXDIM[t];return Math.min(a.box[tk]+a.box[tl],o.box[tk]+o.box[tl])-Math.max(a.box[tk],o.box[tk])>5;});
        if(touching){map.get(a.b.id).add(o.b.id);map.get(o.b.id).add(a.b.id);}
      }
    }
    return map;
  }
  // Geometrische controle (geen constructieve berekening): overlappende balken en balken zonder steunpunt.
  function conflicts(p){
    const items=allBeams(p).map(b=>({b,box:beamBox(b)})),overlaps=[],unsupported=[];
    const ov=(a,b,k,l)=>Math.min(a[k]+a[l],b[k]+b[l])-Math.max(a[k],b[k]);
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
      const a=items[i],b=items[j];
      if(ov(a.box,b.box,'x','w')>5&&ov(a.box,b.box,'y','h')>5&&ov(a.box,b.box,'z','d')>5)overlaps.push([a.b,b.b]);
    }
    const contacts=beamContacts(p);
    for(const {b,box} of items){
      // Alleen vrije balken: een balk die de grond niet raakt en geen enkele andere balk raakt, hangt in de lucht.
      if(b.group==='Losse balken'&&box.y>0&&contacts.get(b.id).size===0)unsupported.push(b);
    }
    return {overlaps,unsupported};
  }
  function boardPlan(p){
    const cuts=allBeams(p).map(b=>({id:b.id,name:b.name,length:b.length,group:b.group,profile:profileOf(b).id}));
    const groups=new Map();
    for(const c of cuts) {const key=c.profile+'|'+c.length+'|'+c.name;const item=groups.get(key)||{profile:c.profile,length:c.length,name:c.name,count:0};item.count++;groups.set(key,item);}
    const boards=[], impossible=[], byProfile=[];
    // Hout van verschillende profielen kan nooit uit dezelfde handelsbalk komen: plan per profiel.
    for(const id of Object.keys(PROFILES)){
      const mine=cuts.filter(c=>c.profile===id).sort((a,b)=>b.length-a.length);
      if(!mine.length)continue;
      const list=[];
      for(const cut of mine){
        if(cut.length>p.stockLength){impossible.push(cut);continue;}
        let board=list.find(b=>b.used+cut.length+(b.cuts.length?p.kerf:0)<=p.stockLength);
        if(!board){board={used:0,cuts:[],profile:id};list.push(board);}
        board.used+=cut.length+(board.cuts.length?p.kerf:0);board.cuts.push(cut);
      }
      boards.push(...list);
      // Standaardprofiel: prijs uit de zaaginstellingen; overige profielen: eigen invoer, anders onbekend.
      const own=id===DEFAULT_PROFILE?p.beamPrice:p.materials?.prices?.['balk-'+id];
      byProfile.push({profile:id,label:PROFILES[id].label,count:list.length,price:own??0,priceKnown:own!==undefined});
    }
    return {groups:[...groups.values()].sort((a,b)=>b.length-a.length||a.profile.localeCompare(b.profile)),boards,impossible,byProfile,
      totalLength:cuts.reduce((s,c)=>s+c.length,0),pieces:cuts.length,
      waste:boards.reduce((s,b)=>s+p.stockLength-b.used,0),
      estimatedPrice:byProfile.reduce((s,x)=>s+x.count*x.price,0)};
  }
  function warnings(p){
    const result=[];
    if(p.depth<=300)result.push('De constructiediepte is onvoldoende voor voor- en achterregels.');
    if(p.height<550)result.push('De constructie is te laag voor de ingestelde werkbladen.');
    const {sections}=boundaries(p);
    for(const s of sections){
      const min=TYPES[s.module.kind].min;
      if(s.module.width<min)result.push(`${s.module.name}: opening ${s.module.width} mm, richtwaarde ${min} mm.`);
    }
    const openingH=p.height-325,interiorD=p.depth-200; // tussen onder- en bovenligger; tussen voor- en achterstaander
    for(const m of p.modules){
      const a=m.appliance;if(!a||!(m.kind==='fridge'||m.kind==='kamado'))continue;
      const label=m.kind==='fridge'?'Koelkast':'Kamado',issues=[];
      if(a.w>0&&a.w>m.width)issues.push(`breedte ${a.w} mm > opening ${m.width} mm`);
      if(a.d>0&&a.d>interiorD)issues.push(`diepte ${a.d} mm > beschikbaar ${interiorD} mm`);
      if(a.h>0&&a.h>openingH)issues.push(`hoogte ${a.h} mm > opening ${openingH} mm`);
      if(issues.length)result.push(`${m.name||label}: apparaat past niet (${issues.join('; ')}).`);
    }
    const fridge=p.modules.find(m=>m.kind==='fridge');
    if(fridge)result.push('Koelkast: ventilatie- en montageruimte afhankelijk van het apparaat; nog niet berekend.');
    if(p.modules.some(m=>m.kind==='kamado'))result.push('Kamado: hitteafstand, niet-brandbare afscherming en draagconstructie controleren volgens fabrikant.');
    if(Object.keys(p.frameEdits||{}).length){
      result.push('Automatische framebalken zijn handmatig aangepast; controleer oplegging, verbindingen en draagkracht.');
      if(Object.values(p.frameEdits).some(b=>b.disabled))result.push('Eén of meer automatische framebalken zijn verwijderd.');
    }
    for(const b of allBeams(p)){
      const box=beamBox(b);
      if(box.x<0||box.y<0||box.z<0||box.x+box.w>p.width||box.y+box.h>p.height||box.z+box.d>p.depth)result.push(`${b.name}: valt (deels) buiten de buitenkeuken.`);
    }
    if(boardPlan(p).impossible.length)result.push('Minstens één balk is langer dan de gekozen handelslengte.');
    const cf=conflicts(p);
    if(cf.overlaps.length)result.push(`${cf.overlaps.length} balkcombinatie(s) overlappen elkaar: ${cf.overlaps.slice(0,3).map(([a,b])=>a.name+' / '+b.name).join(', ')}${cf.overlaps.length>3?', …':''}.`);
    if(cf.unsupported.length)result.push(`${cf.unsupported.length} losse balk(en) raken geen andere balk of de grond: ${cf.unsupported.slice(0,3).map(b=>b.name).join(', ')}${cf.unsupported.length>3?', …':''}.`);
    return result;
  }
  return {TYPES,PROFILES,defaultCountertop,normalizeCountertop,countertopBox,normalizeAppliance,beamContacts,conflicts,DEFAULT_PROFILE,profileOf,uid,clamp,defaultMaterials,normalizeMaterials,demoProject,freeProject,normalizeProject,editFrameBeam,restoreFrameBeam,resizeBeamEndpoint,drawingBeam,expectedWidth,resizeProject,boundaries,beamBox,framePieces,allBeams,fitBeamBetween,boardPlan,warnings};
});