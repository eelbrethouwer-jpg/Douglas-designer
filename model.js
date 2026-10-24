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
  const number = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const round=(v)=>Math.round(v);
  const uid=()=>`item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  function demoProject() {
    return {
      version:1, id:uid(), name:'Mijn buitenkeuken', width:1875, depth:870, height:950,
      section:50, sectionLong:100, stockLength:2800, kerf:3, beamPrice:16.95,
      countertop:true, modules:[
        {id:uid(),kind:'drawers',width:520,name:'Ladekast'},
        {id:uid(),kind:'fridge',width:600,name:'Koelkast'},
        {id:uid(),kind:'kamado',width:555,name:'Kamado'}
      ], beams:[]
    };
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
    p.modules=Array.isArray(raw.modules) ? raw.modules.slice(0,12).filter(m=>TYPES[m.kind]).map(m=>({
      id:String(m.id||uid()),kind:m.kind,width:clamp(round(number(m.width,500)),200,2400),
      name:String(m.name||TYPES[m.kind].label).slice(0,60)
    })) : p.modules;
    if(!p.modules.length) p.modules=[{id:uid(),kind:'open',width:600,name:'Open vak'}];
    p.beams=Array.isArray(raw.beams) ? raw.beams.slice(0,100).map(b=>({
      id:String(b.id||uid()),name:String(b.name||'Losse balk').slice(0,60),
      x:round(number(b.x)),y:round(number(b.y)),z:round(number(b.z)),
      axis:['x','y','z'].includes(b.axis)?b.axis:'x',
      length:clamp(round(number(b.length,500)),50,6500)
    })) : [];
    p.width=expectedWidth(p);
    return p;
  }
  function expectedWidth(p) {return (p.modules.length+1)*50 + p.modules.reduce((s,m)=>s+m.width,0);}
  function resizeProject(p,targetWidth){
    targetWidth=round(number(targetWidth,p.width));
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
    const s=50, t=100;
    if(b.axis==='x') return {x:b.x,y:b.y,z:b.z,w:b.length,h:t,d:s};
    if(b.axis==='y') return {x:b.x,y:b.y,z:b.z,w:s,h:b.length,d:t};
    return {x:b.x,y:b.y,z:b.z,w:s,h:t,d:b.length};
  }
  function framePieces(p){
    const cuts=[], {sections,posts}=boundaries(p);
    const upper=p.height-125, lower=100, postLength=upper;
    function put(name,axis,length,x,y,z,group){
      const b={id:uid(),name,axis,length:round(length),x:round(x),y:round(y),z:round(z),group};
      cuts.push(b);return b;
    }
    for(const x of posts){
      put('Staander','y',postLength,x,0,0,'Frame');
      put('Staander','y',postLength,x,0,p.depth-100,'Frame');
      for(const y of [lower,upper]) put(y===upper?'Dwarsregel boven':'Dwarsregel onder','z',p.depth-200,x,y,100,'Frame');
    }
    for(const s of sections){
      for(const y of [lower,upper]){
        put(y===upper?'Ligger boven':'Ligger onder','x',s.module.width,s.left,y,0,'Frame');
        put(y===upper?'Ligger boven':'Ligger onder','x',s.module.width,s.left,y,p.depth-50,'Frame');
      }
    }
    return cuts;
  }
  function allBeams(p){return [...framePieces(p),...p.beams.map(b=>({...b,group:'Losse balken'}))];}
  function boardPlan(p){
    const cuts=allBeams(p).map(b=>({name:b.name,length:b.length,group:b.group}));
    const groups=new Map();
    for(const c of cuts) {const key=c.length+'|'+c.name;const item=groups.get(key)||{length:c.length,name:c.name,count:0};item.count++;groups.set(key,item);}
    const sorted=[...cuts].sort((a,b)=>b.length-a.length), boards=[], impossible=[];
    for(const cut of sorted){
      if(cut.length>p.stockLength){impossible.push(cut);continue;}
      let board=boards.find(b=>b.used+cut.length+(b.cuts.length?p.kerf:0)<=p.stockLength);
      if(!board){board={used:0,cuts:[]};boards.push(board);}
      board.used+=cut.length+(board.cuts.length?p.kerf:0);board.cuts.push(cut);
    }
    return {groups:[...groups.values()].sort((a,b)=>b.length-a.length),boards,impossible,
      totalLength:cuts.reduce((s,c)=>s+c.length,0),pieces:cuts.length,
      waste:boards.reduce((s,b)=>s+p.stockLength-b.used,0),
      estimatedPrice:boards.length*p.beamPrice};
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
    const fridge=p.modules.find(m=>m.kind==='fridge');
    if(fridge)result.push('Koelkast: ventilatie- en montageruimte afhankelijk van het apparaat; nog niet berekend.');
    if(p.modules.some(m=>m.kind==='kamado'))result.push('Kamado: hitteafstand, niet-brandbare afscherming en draagconstructie controleren volgens fabrikant.');
    for(const b of p.beams){
      const box=beamBox(b);
      if(box.x<0||box.y<0||box.z<0||box.x+box.w>p.width||box.y+box.h>p.height||box.z+box.d>p.depth)result.push(`${b.name}: valt (deels) buiten de buitenkeuken.`);
    }
    if(boardPlan(p).impossible.length)result.push('Minstens één balk is langer dan de gekozen handelslengte.');
    return result;
  }
  return {TYPES,uid,clamp,demoProject,normalizeProject,expectedWidth,resizeProject,boundaries,beamBox,framePieces,allBeams,boardPlan,warnings};
});
