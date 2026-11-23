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
  // Referentiemateriaal uit aanleveringen (opmerkingen + foto's); alleen JPEG-data-URI's, begrensd.
  const JPEG_RE=/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i;
  function normalizeReference(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const notes=String(raw.notes==null?'':raw.notes).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,2000);
    const photos=(Array.isArray(raw.photos)?raw.photos:[]).filter(p=>typeof p==='string'&&p.length<=450000&&JPEG_RE.test(p)).slice(0,4);
    return notes||photos.length?{notes,photos}:null;
  }
  // Foto-achtergrond voor 2D-aanzichten: de foto ligt achter het ontwerp, schaal en plek zijn instelbaar.
  function normalizeBackdrop(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const photo=typeof raw.photo==='string'&&raw.photo.length<=600000&&JPEG_RE.test(raw.photo)?raw.photo:'';
    if(!photo)return null;
    return {photo,on:raw.on!==false,view:['front','side','top'].includes(raw.view)?raw.view:'front',
      opacity:clamp(number(raw.opacity,.5),.1,1),widthMm:clamp(round(number(raw.widthMm,3000)),200,60000),
      x:clamp(round(number(raw.x,0)),-60000,60000),y:clamp(round(number(raw.y,0)),-60000,60000)};
  }
  // 3D-scan (alleen instellingen; het mesh zelf staat in IndexedDB). Schaal = mm per bronseenheid.
  function normalizeScan(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const name=String(raw.name==null?'':raw.name).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,120);
    if(!name)return null;
    const r6=v=>Math.round(v*1e6)/1e6;
    return {name,on:raw.on!==false,opacity:clamp(number(raw.opacity,.85),.1,1),scale:clamp(r6(number(raw.scale,1)),0.000001,1000000),
      rotY:clamp(round(number(raw.rotY,0)),-360,360),zUp:raw.zUp===true,
      x:clamp(round(number(raw.x,0)),-1e6,1e6),y:clamp(round(number(raw.y,0)),-1e6,1e6),z:clamp(round(number(raw.z,0)),-1e6,1e6)};
  }
  // Schaal de scan zodat de afstand tussen twee punten (in het tekenvlak) realMm wordt; punt a blijft staan.
  function scanScale(scan,a,b,plane,realMm){
    const real=number(realMm,0);if(!scan||!a||!b||!plane||real<=0)return null;
    const [h,v]=plane,cur=Math.hypot((b[h]||0)-(a[h]||0),(b[v]||0)-(a[v]||0));if(cur<1)return null;
    const f=real/cur,next={...scan,scale:scan.scale*f};
    for(const k of [h,v]){const ak=a[k]||0;next[k]=ak+(scan[k]-ak)*f;}
    return normalizeScan(next);
  }
  // Schaal de foto zodat de afstand tussen twee punten (wereldmm) gelijk wordt aan realMm; punt a blijft staan.
  function backdropScale(bd,a,b,plane,realMm){
    const real=number(realMm,0);if(!bd||!a||!b||!plane||real<=0)return null;
    const [h,v]=plane,cur=Math.hypot((b[h]||0)-(a[h]||0),(b[v]||0)-(a[v]||0));
    if(cur<1)return null;const f=real/cur,w=clamp(round(bd.widthMm*f),200,60000),g=w/bd.widthMm;
    const ah=a[h]||0,av=a[v]||0;
    return {...bd,widthMm:w,x:clamp(round(ah-(ah-bd.x)*g),-60000,60000),y:clamp(round(av-(av-bd.y)*g),-60000,60000)};
  }
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
  // ---------- Plattegrond-start: zones (rechthoeken) → een 3D-houtconstructie van losse balken ----------
  // Wand- en deurpanelen (dunne platen): bekleding rond het frame. Geen constructie; telt mee in de materiaallijst.
  const PANEL_KINDS={cladding:'Gevelbekleding',door:'Deur',rafter:'Dakspar',roof:'Dakbeplating'};
  function normalizePanels(list){
    if(!Array.isArray(list))return [];
    return list.slice(0,160).map(q=>{
      if(!q||typeof q!=='object')return null;
      const dim=(v,lo,hi,def)=>clamp(round(number(v,def)),lo,hi);
      const sl=q.slope&&typeof q.slope==='object'&&(q.slope.axis==='x'||q.slope.axis==='z')?{axis:q.slope.axis,y2:dim(q.slope.y2,-20000,10000,0),h2:dim(q.slope.h2,1,10000,20)}:null;
      return {id:String(q.id||uid()).slice(0,40),name:String(q.name||'Paneel').replace(/[\u0000-\u001f<>]/g,'').slice(0,60),
        kind:PANEL_KINDS[q.kind]?q.kind:'cladding',...(sl?{slope:sl}:{}),
        x:dim(q.x,-20000,40000,0),y:dim(q.y,-20000,10000,0),z:dim(q.z,-20000,40000,0),
        w:dim(q.w,1,20000,20),h:dim(q.h,1,10000,20),d:dim(q.d,1,20000,20),
        color:/^#[0-9a-fA-F]{6}$/.test(q.color||'')?q.color:(q.kind==='door'?'#a8743a':q.kind==='rafter'?'#b8824f':q.kind==='roof'?'#7b858b':'#1d2124')};
    }).filter(Boolean);
  }
  // Beide uiteinden even ver verplaatsen houdt de helling en het hoogteverschil intact.
  function editPanel(panel,field,value){
    const next={...panel,[field]:value};
    if(panel.slope&&(field==='y'||field==='h')){
      const end=field==='y'?'y2':'h2',low=field==='y'?-20000:1;
      const a=panel[field],b=panel.slope[end];
      const delta=clamp(Math.round(value)-a,low-Math.min(a,b),10000-Math.max(a,b));
      next[field]=a+delta;
      next.slope={...panel.slope,[end]:b+delta};
    }
    return normalizePanels([next])[0];
  }
  const ZONE_KINDS={open:'Open overkapping',closed:'Gesloten ruimte',pergola:'Pergola'};
  function normalizeDoor(raw){
    if(!raw||typeof raw!=='object'||!'nesw'.includes(String(raw.edge||'x')[0])||!raw.edge)return null;
    return {edge:String(raw.edge)[0],offset:clamp(round(number(raw.offset,150)),0,12000),width:clamp(round(number(raw.width,900)),600,2000),height:clamp(round(number(raw.height,2050)),1800,2600)};
  }
  // Lessenaarsdak: 'high' = zijde met de hoge rand (n/e/s/w, in plattegrondrichting), 'low' = hoogte van de lage bovenligger.
  function normalizeRoof(raw,zone){
    if(!raw||typeof raw!=='object'||zone.kind==='pergola'||!'nesw'.includes(String(raw.high||'x')[0])||!raw.high)return null;
    const low=clamp(round(number(raw.low,zone.h-400)),600,zone.h-50);
    return low>=zone.h?null:{kind:'lessenaar',high:String(raw.high)[0],low};
  }
  function normalizeLine(l,i){
    if(!l||typeof l!=='object')return null;
    const c=v=>clamp(round(number(v,0)),0,40000);let x1=c(l.x1),z1=c(l.z1),x2=c(l.x2),z2=c(l.z2);
    if(Math.abs(x2-x1)>=Math.abs(z2-z1))z2=z1;else x2=x1; // altijd haaks
    if(Math.hypot(x2-x1,z2-z1)<300)return null;
    return {id:String(l.id||'l'+(i+1)).slice(0,20),name:String(l.name||('Wand '+(i+1))).replace(/[\u0000-\u001f<>]/g,'').slice(0,40),x1,z1,x2,z2,h:clamp(round(number(l.h,2400)),1200,4000)};
  }
  function normalizePlan(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.zones))return null;
    const used=new Set(),uniq=(id,fallback)=>{let k=String(id||fallback).slice(0,20),n=1;while(used.has(k))k=(String(id||fallback).slice(0,16)+'-'+(n++));used.add(k);return k;};
    const zones=raw.zones.slice(0,8).map((z,i)=>z&&typeof z==='object'?(zn=>{zn.roof=normalizeRoof(z.roof,zn);if(!zn.roof)delete zn.roof;return zn;})({
      id:uniq(z.id,'z'+(i+1)),name:String(z.name||('Zone '+(i+1))).replace(/[\u0000-\u001f<>]/g,'').slice(0,40),
      kind:ZONE_KINDS[z.kind]?z.kind:'open',
      x:clamp(round(number(z.x,0)),0,20000),z:clamp(round(number(z.z,0)),0,20000),
      w:clamp(round(number(z.w,2000)),600,12000),d:clamp(round(number(z.d,2000)),600,12000),h:clamp(round(number(z.h,2500)),1200,4000),
      walls:typeof z.walls==='string'?[...new Set(z.walls.split('').filter(c=>'nesw'.includes(c)))].join(''):((z.kind==='closed')?'nesw':''),
      door:normalizeDoor(z.door)
    }):null).filter(Boolean);
    const lines=(Array.isArray(raw.lines)?raw.lines:[]).slice(0,20).map(normalizeLine).filter(Boolean).map(l=>({...l,id:uniq(l.id,'l')}));
    return zones.length||lines.length?{zones,lines}:null;
  }
  // Maakt staanders (100×100), bovenliggers (50×150) en bij gesloten zones tussenregels; pergola krijgt dwarslatten.
  // Hartlijnen liggen 50 mm binnen de buitencontour, zodat de buitenmaat klopt. Dak niet inbegrepen (balken zijn recht).
  function planFrame(plan){
    const pl0=normalizePlan(plan&&{zones:plan.zones||[],lines:plan.lines||[]});if(!pl0)return {beams:[],panels:[],truncated:0,bounds:{width:0,depth:0,height:0}};
    // In het plan ligt de achterzijde op z=0; in het model (en de 3D-weergave) is de voorzijde z=0. Spiegel de diepte-as,
    // en wissel de zijden achter/voor (n↔s) van wanden en deuren mee.
    const swapNS=c=>c==='n'?'s':c==='s'?'n':c,maxZ0=Math.max(0,...pl0.zones.map(q=>q.z+q.d),...pl0.lines.map(l=>Math.max(l.z1,l.z2)));
    const pl={zones:pl0.zones.map(q=>({...q,z:maxZ0-(q.z+q.d),walls:q.walls.split('').map(swapNS).join(''),door:q.door?{...q.door,edge:swapNS(q.door.edge)}:null,...(q.roof?{roof:{...q.roof,high:swapNS(q.roof.high)}}:{})})),lines:pl0.lines.map(l=>({...l,z1:maxZ0-l.z1,z2:maxZ0-l.z2}))};
    const POST='100x100',PLATE='50x150',RAIL='50x100',PS=100,plateT=PROFILES[PLATE].t,plateS=PROFILES[PLATE].s;
    const Z=pl.zones,out=[],posts=new Map(),segs=new Map();
    // een rand is gedeeld als een andere zone dezelfde lijn aan de overzijde heeft met overlappend bereik
    const edgeShared=(zone,side)=>{
      return Z.some(o=>{if(o===zone)return false;
        if(side==='w')return o.x+o.w===zone.x;
        if(side==='e')return o.x===zone.x+zone.w;
        if(side==='n')return o.z+o.d===zone.z;
        return o.z===zone.z+zone.d;});
    };
    const RAFTER='50x150',RAFT_D=150,SHEET_T=18;
    const slopeAxis=zn=>zn.roof?(zn.roof.high==='w'||zn.roof.high==='e'?'x':'z'):null;
    // hoogte (bovenkant draagvlak) op een punt van de zone; plat dak = zn.h
    const topAt=(zn,x,z)=>{const r=zn.roof;if(!r)return zn.h;const t=clamp(slopeAxis(zn)==='x'?(x-zn.x)/zn.w:(z-zn.z)/zn.d,0,1),f=(r.high==='w'||r.high==='n')?t:1-t;return zn.h-(zn.h-r.low)*f;};
    const info=[],panels=[],clips=[],panelsLine=[],rafters=[]; // clips: [{axis,fixed,lo,hi}] stukken van regels die vrij moeten blijven (deuropeningen)
    const addPost=(cx,cz,h,name)=>{const k=cx+','+cz,old=posts.get(k);if(old){if(h<old.h)old.h=h;return;}posts.set(k,{cx,cz,h,name});};
    const addSeg=(axis,fixed,lo,hi,y,profile,name)=>{ // fixed = hartlijn op de andere vloeras; lo/hi langs axis
      const k=axis+'|'+fixed+'|'+y+'|'+profile;let a=segs.get(k);if(!a){a={axis,fixed,y,profile,name,list:[]};segs.set(k,a);}a.list.push([lo,hi]);};
    for(const zn of Z){
      const x0=zn.x+(edgeShared(zn,'w')?0:PS/2),x1=zn.x+zn.w-(edgeShared(zn,'e')?0:PS/2);
      const z0=zn.z+(edgeShared(zn,'n')?0:PS/2),z1=zn.z+zn.d-(edgeShared(zn,'s')?0:PS/2);
      info.push({zn,x0,x1,z0,z1});
      const top=zn.roof?zn.roof.low:zn.h,sx=slopeAxis(zn),H=zn.h,L=zn.roof?zn.roof.low:zn.h;
      // staander: op de rand met bovenligger (plat deel) of tot onder de dakspar (langs de helling)
      const endTop=(coord,a0,a1)=>coord===a0?(zn.roof.high==='w'||zn.roof.high==='n'?H:L):(zn.roof.high==='e'||zn.roof.high==='s'?H:L);
      const postLen=(px,pz)=>{if(!zn.roof)return zn.h-plateT;
        if(sx==='x'&&(px===x0||px===x1))return endTop(px,x0,x1)-plateT;
        if(sx==='z'&&(pz===z0||pz===z1))return endTop(pz,z0,z1)-plateT;
        return Math.round(topAt(zn,px,pz));};
      // staanders: hoeken, bij gesloten zones tussenstaanders (≤ 2500 mm h.o.h.)
      const xs=[x0,x1],zs=[z0,z1];
      const split=(a,b)=>{const n=Math.max(1,Math.ceil((b-a)/2500)),r=[];for(let i=1;i<n;i++)r.push(Math.round((a+(b-a)*i/n)/5)*5);return r;};
      for(const px of xs)for(const pz of zs)addPost(px,pz,postLen(px,pz),zn.name);
      if(zn.kind==='closed'){for(const px of split(x0,x1)){addPost(px,z0,postLen(px,z0),zn.name);addPost(px,z1,postLen(px,z1),zn.name);}for(const pz of split(z0,z1)){addPost(x0,pz,postLen(x0,pz),zn.name);addPost(x1,pz,postLen(x1,pz),zn.name);}}
      // bovenliggers (boven op de staanders): x-richting volledig, z-richting ertussen
      const yTop=top-plateT;
      if(!zn.roof){
        addSeg('x',z0,x0,x1,yTop,PLATE,'Bovenligger '+zn.name);addSeg('x',z1,x0,x1,yTop,PLATE,'Bovenligger '+zn.name);
        addSeg('z',x0,z0,z1,yTop,PLATE,'Bovenligger '+zn.name);addSeg('z',x1,z0,z1,yTop,PLATE,'Bovenligger '+zn.name);
      }else if(sx==='x'){ // liggers alleen langs de hoge en lage rand; de zijkanten krijgen een schuine spar
        for(const px of [x0,x1])addSeg('z',px,z0-plateS/2,z1+plateS/2,endTop(px,x0,x1)-plateT,PLATE,'Bovenligger '+zn.name);
      }else{
        for(const pz of [z0,z1])addSeg('x',pz,x0,x1,endTop(pz,z0,z1)-plateT,PLATE,'Bovenligger '+zn.name);
      }
      if(zn.roof){ // daksparren (50×150, h.o.h. ≤ 600) en dakplaat als schuine panelen
        const lo=sx==='x'?zn.x:zn.z,hi=sx==='x'?zn.x+zn.w:zn.z+zn.d,yLo=Math.round(topAt(zn,sx==='x'?zn.x:0,sx==='x'?0:zn.z)),yHi=Math.round(topAt(zn,sx==='x'?zn.x+zn.w:0,sx==='x'?0:zn.z+zn.d));
        const c0=sx==='x'?z0:x0,c1=sx==='x'?z1:x1,n=Math.max(1,Math.ceil((c1-c0)/600));
        for(let i=0;i<=n;i++){const c=Math.round((c0+(c1-c0)*i/n)/5)*5;
          rafters.push({kind:'rafter',name:'Dakspar '+zn.name,slope:{axis:sx,y2:yHi,h2:RAFT_D},y:yLo,h:RAFT_D,
            ...(sx==='x'?{x:lo,w:hi-lo,z:c-25,d:50}:{z:lo,d:hi-lo,x:c-25,w:50})});}
        rafters.push({kind:'roof',name:'Dakplaat '+zn.name,slope:{axis:sx,y2:yHi+RAFT_D,h2:SHEET_T},y:yLo+RAFT_D,h:SHEET_T,
          ...(sx==='x'?{x:lo,w:hi-lo,z:zn.z,d:zn.d}:{z:lo,d:hi-lo,x:zn.x,w:zn.w})});
      }
      if(zn.kind==='closed'){ // twee tussenregels (onder en op halve hoogte) voor de gevelbekleding
        const sx=[x0,...split(x0,x1),x1],sz=[z0,...split(z0,z1),z1];
        for(const y of [300,Math.round(top/2/5)*5]){
          for(let i=0;i+1<sx.length;i++)for(const pz of [z0,z1])addSeg('x',pz,sx[i],sx[i+1],y,RAIL,'Regel '+zn.name);
          for(let i=0;i+1<sz.length;i++)for(const px of [x0,x1])addSeg('z',px,sz[i],sz[i+1],y,RAIL,'Regel '+zn.name);
        }
      }
      if(zn.kind==='pergola'){ // dwarslatten over de diepte, elke ~600 mm
        const n=Math.max(2,Math.round((x1-x0)/600));
        for(let i=1;i<n;i++){const px=Math.round((x0+(x1-x0)*i/n)/5)*5;addSeg('z',px,z0,z1,zn.h-50,'50x50','Dwarslat '+zn.name);}
      }
    }
    // lijnen (losse wanden): staanders op begin, einde en ≤ 2500 mm h.o.h., bovenligger en één bekledingspaneel
    for(const l of pl.lines){
      const alongX=l.z1===l.z2,lo=alongX?Math.min(l.x1,l.x2):Math.min(l.z1,l.z2),hi=alongX?Math.max(l.x1,l.x2):Math.max(l.z1,l.z2),fixed=alongX?l.z1:l.x1;
      const n=Math.max(1,Math.ceil((hi-lo)/2500)),stops=[];for(let i=0;i<=n;i++)stops.push(Math.round((lo+(hi-lo)*i/n)/5)*5);
      for(const s of stops)addPost(alongX?s:fixed,alongX?fixed:s,l.h-plateT,l.name);
      addSeg(alongX?'x':'z',fixed,lo,hi,l.h-plateT,PLATE,'Bovenligger '+l.name);
      if(alongX)panelsLine.push(['cladding','Gevelbekleding '+l.name,lo-PS/2,100,fixed-10,hi-lo+PS,l.h-100,20]);
      else panelsLine.push(['cladding','Gevelbekleding '+l.name,fixed-10,100,lo-PS/2,20,l.h-100,hi-lo+PS]);
    }
    // deuren en wandpanelen
    const closedNeighbour=(zn,side)=>Z.some(o=>o!==zn&&o.kind==='closed'&&(
      side==='w'?o.x+o.w===zn.x&&o.z<zn.z+zn.d&&o.z+o.d>zn.z:side==='e'?o.x===zn.x+zn.w&&o.z<zn.z+zn.d&&o.z+o.d>zn.z:
      side==='n'?o.z+o.d===zn.z&&o.x<zn.x+zn.w&&o.x+o.w>zn.x:o.z===zn.z+zn.d&&o.x<zn.x+zn.w&&o.x+o.w>zn.x));
    const CLAD='#262b2e',DOOR='#a8743a',PT=20,YB=100;
    const addPanel=(kind,name,x,y,z,w,h,d,slope)=>{if(w>=1&&h>=1&&d>=1)panels.push({id:uid(),name,kind,x:Math.round(x),y:Math.round(y),z:Math.round(z),w:Math.round(w),h:Math.round(h),d:Math.round(d),color:kind==='door'?DOOR:kind==='rafter'?'#b8824f':kind==='roof'?'#7b858b':CLAD,...(slope?{slope}:{})});};
    for(const a of panelsLine)addPanel(...a);
    for(const {zn,x0,x1,z0,z1} of info){
      const door=zn.door;
      for(const side of zn.walls||''){
        if(closedNeighbour(zn,side)&&!(door&&door.edge===side))continue;
        const alongX=side==='n'||side==='s',line=side==='w'?x0:side==='e'?x1:side==='n'?z0:z1;
        const outer=side==='w'||side==='n'?line-PS/2:line+PS/2-PT; // buitenzijde van de staanders
        const a0=alongX?x0-(edgeShared(zn,'w')?0:PS/2):z0+PS/2,a1=alongX?x1+(edgeShared(zn,'e')?0:PS/2):z1-PS/2;
        // dakhelling: wand langs de helling heeft een schuine bovenzijde; wanden aan de hoge/lage rand zijn vlak
        const sx=slopeAxis(zn),sloped=!!zn.roof&&((alongX&&sx==='x')||(!alongX&&sx==='z'));
        const flatTop=!zn.roof||sloped?zn.h:((side===zn.roof.high)?zn.h:zn.roof.low);
        const topOn=p=>Math.round(alongX?topAt(zn,p,0):topAt(zn,0,p));
        const wallH=flatTop-YB;
        const put=(kind,name,lo,hi,y,h)=>{if(hi-lo<5)return;
          let hh=h,slope=null;
          if(sloped){const h0=topOn(lo)-y,h1=topOn(hi)-y;hh=Math.max(1,h0);if(h1!==h0)slope={axis:alongX?'x':'z',y2:y,h2:Math.max(1,h1)};}
          if(alongX)addPanel(kind,name,lo,y,outer,hi-lo,hh,PT,slope);else addPanel(kind,name,outer,y,lo,PT,hh,hi-lo,slope);};
        if(door&&door.edge===side){
          const start=(alongX?zn.x:zn.z)+door.offset,d0=start,d1=start+door.width,H=door.height;
          if(d0-PS<a0||d1+PS>a1){/* deur past niet in deze wand: geen opening maken */ put('cladding','Gevelbekleding '+zn.name,a0,a1,YB,wallH);continue;}
          put('cladding','Gevelbekleding '+zn.name,a0,d0-PS,YB,wallH);put('cladding','Gevelbekleding '+zn.name,d1+PS,a1,YB,wallH);
          put('cladding','Gevelbekleding boven deur',d0-PS,d1+PS,H,flatTop-H);
          // deurpaneel iets dikker en dichter bij de buitenkant
          const dOut=(side==='s'||side==='e')?outer-PT:outer;
          if(alongX)addPanel('door','Deur '+zn.name,d0,20,dOut,door.width,H-20,PT*2);else addPanel('door','Deur '+zn.name,dOut,20,d0,PT*2,H-20,door.width);
          // kozijn: twee stijlen (100×100) en een bovendrempel (50×100) tussen de stijlen
          const jambLen=H+100,perp=line-PS/2;
          if(alongX){out.push({id:uid(),name:'Deurstijl '+zn.name,axis:'y',length:jambLen,x:d0-PS,y:0,z:perp,profile:POST},{id:uid(),name:'Deurstijl '+zn.name,axis:'y',length:jambLen,x:d1,y:0,z:perp,profile:POST},
            {id:uid(),name:'Bovendorpel '+zn.name,axis:'x',length:d1-d0,x:d0,y:H,z:line-25,profile:RAIL});clips.push({axis:'x',fixed:line,lo:d0-PS,hi:d1+PS});}
          else{out.push({id:uid(),name:'Deurstijl '+zn.name,axis:'y',length:jambLen,x:perp,y:0,z:d0-PS,profile:POST},{id:uid(),name:'Deurstijl '+zn.name,axis:'y',length:jambLen,x:perp,y:0,z:d1,profile:POST},
            {id:uid(),name:'Bovendorpel '+zn.name,axis:'z',length:d1-d0,x:line-25,y:H,z:d0,profile:RAIL});clips.push({axis:'z',fixed:line,lo:d0-PS,hi:d1+PS});}
        }else put('cladding','Gevelbekleding '+zn.name,a0,a1,YB,wallH);
      }
    }
    // staanders
    for(const p of posts.values())out.push({id:uid(),name:'Staander '+p.name,axis:'y',length:p.h,x:p.cx-PS/2,y:0,z:p.cz-PS/2,profile:POST});
    // segmenten: overlappende bereiken samenvoegen (gedeelde wanden), uiteinden 25 mm inkorten ter plekke van kruisende liggers
    for(const a of segs.values()){
      const merged=[];for(const [lo,hi] of a.list.sort((p,q)=>p[0]-q[0])){const last=merged[merged.length-1];if(last&&lo<last[1])last[1]=Math.max(last[1],hi);else merged.push([lo,hi]);}
      const pr=PROFILES[a.profile];
      for(const [lo0,hi0] of merged){
        // splits op staanders die op dezelfde lijn staan (T-aansluitingen, tussenstaanders), alleen voor z-liggers en regels
        const cuts=[lo0];
        if(a.axis==='z'||a.profile===RAIL){
          const onLine=[...posts.values()].filter(p=>(a.axis==='x'?p.cz:p.cx)===a.fixed).map(p=>a.axis==='x'?p.cx:p.cz).filter(v=>v>lo0&&v<hi0).sort((p,q)=>p-q);
          cuts.push(...onLine);
        }
        cuts.push(hi0);
        for(let i=0;i+1<cuts.length;i++){
          let start=cuts[i],end=cuts[i+1];
          if(a.axis==='z'&&(a.profile===PLATE||a.profile==='50x50')){start+=plateS/2;end-=plateS/2;} // tussen de x-liggers
          if(a.profile===RAIL){start+=PS/2;end-=PS/2;} // tussen de staanders
          if(a.profile===RAIL){
            const hit=clips.find(c=>c.axis===a.axis&&c.fixed===a.fixed&&c.lo<end&&c.hi>start);
            if(hit){ // laat de deuropening vrij: knip het stuk rond de opening
              const parts=[];if(hit.lo-start>=50)parts.push([start,hit.lo]);if(end-hit.hi>=50)parts.push([hit.hi,end]);
              for(const [ps,pe] of parts){const len=Math.round(pe-ps);
                if(a.axis==='x')out.push({id:uid(),name:a.name,axis:'x',length:len,x:ps,y:a.y,z:a.fixed-pr.s/2,profile:a.profile});
                else out.push({id:uid(),name:a.name,axis:'z',length:len,x:a.fixed-pr.s/2,y:a.y,z:ps,profile:a.profile});}
              continue;}
          }
          const length=Math.round(end-start);if(length<50)continue;
          if(a.axis==='x')out.push({id:uid(),name:a.name,axis:'x',length,x:start,y:a.y,z:a.fixed-pr.s/2,profile:a.profile});
          else out.push({id:uid(),name:a.name,axis:'z',length,x:a.fixed-pr.s/2,y:a.y,z:start,profile:a.profile});
        }
      }
    }
    // pergola-latten liggen boven de bovenliggers (y = top van de zone)
    const maxX=Math.max(0,...Z.map(z=>z.x+z.w),...pl.lines.map(l=>Math.max(l.x1,l.x2)+PS/2)),maxZ=Math.max(0,...Z.map(z=>z.z+z.d),...pl.lines.map(l=>Math.max(l.z1,l.z2)+PS/2)),maxH=Math.max(0,...Z.map(z=>z.h+(z.roof?RAFT_D+SHEET_T:0)),...pl.lines.map(l=>l.h));
    for(const r of rafters)addPanel(r.kind,r.name,r.x,r.y,r.z,r.w,r.h,r.d,r.slope);
    const beams=out.slice(0,100).map(b=>({...b,length:clamp(Math.round(b.length),50,6500),x:Math.round(b.x),y:Math.round(b.y),z:Math.round(b.z)}));
    return {beams,panels:normalizePanels(panels),truncated:Math.max(0,out.length-100),bounds:{width:maxX,depth:maxZ,height:maxH}};
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
    const plan=normalizePlan(raw.plan);if(plan)p.plan=plan;
    p.depth=clamp(round(number(raw.depth,p.depth)),400,plan?12000:2000);
    p.height=clamp(round(number(raw.height,p.height)),400,plan?4000:2500);
    p.stockLength=clamp(round(number(raw.stockLength,p.stockLength)),1000,6500);
    p.kerf=clamp(round(number(raw.kerf,3)),0,10);
    p.beamPrice=clamp(number(raw.beamPrice,p.beamPrice),0,1000);
    p.countertop=raw.countertop!==false;
    p.materials=normalizeMaterials(raw.materials);
    p.countertopSpec=normalizeCountertop(raw.countertopSpec);
    {const ref=normalizeReference(raw.reference);if(ref)p.reference=ref;}
    {const bd=normalizeBackdrop(raw.backdrop);if(bd)p.backdrop=bd;}
    {const sc=normalizeScan(raw.scan);if(sc)p.scan=sc;}
    {const pn=normalizePanels(raw.panels);if(pn.length)p.panels=pn;}
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
    p.width=p.modules.length?expectedWidth(p):clamp(round(number(raw.width,p.width)),500,p.plan?12000:7000);
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
  // Verplaatst meerdere balken (vrij en frame) tegelijk met dezelfde delta (mm, afgerond op 5).
  function moveBeams(p,items,delta){
    const d={x:Math.round(number(delta&&delta.x,0)),y:Math.round(number(delta&&delta.y,0)),z:Math.round(number(delta&&delta.z,0))};
    const frame=new Map(framePieces(p).map(b=>[b.id,b])),free=new Map(p.beams.map(b=>[b.id,b]));
    let moved=0;
    for(const it of items||[]){
      if(it.type==='beam'&&free.has(it.id)){const b=free.get(it.id);b.x+=d.x;b.y+=d.y;b.z+=d.z;moved++;}
      else if(it.type==='frame'&&frame.has(it.id)){const b=frame.get(it.id);editFrameBeam(p,it.id,{x:b.x+d.x,y:b.y+d.y,z:b.z+d.z});moved++;}
    }
    return moved;
  }
  // Reeks: maakt `count` kopieën van een balk, telkens `spacing` mm verder langs `axis` (x/y/z).
  // Kopieën zijn vrije balken (ook als het origineel een framebalk is). Respecteert het maximum van 100 losse balken.
  function arrayBeams(p,source,axis,count,spacing){
    if(!source||!['x','y','z'].includes(axis))return {ok:false,error:'Ongeldige richting',beams:[]};
    const n=Math.round(number(count,0)),step=Math.round(number(spacing,0));
    if(n<1||n>50)return {ok:false,error:'Aantal moet tussen 1 en 50 liggen',beams:[]};
    if(step===0||Math.abs(step)>10000)return {ok:false,error:'Afstand moet tussen 1 en 10.000 mm liggen (niet 0)',beams:[]};
    const room=Math.max(0,100-p.beams.length),made=Math.min(n,room),beams=[];
    for(let i=1;i<=made;i++){
      const b={id:uid(),name:String(source.name||'Balk').slice(0,52)+' '+(i+1),axis:source.axis,length:source.length,x:source.x,y:source.y,z:source.z,profile:profileOf(source).id};
      b[axis]=source[axis]+step*i;beams.push(b);
    }
    return {ok:true,beams,skipped:n-made};
  }
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
  // Daksparren staan als schuine panelen in het 3D-model. Hun zaagmaat
  // bevat de bestaande 50 mm marge voor het afkorten.
  function rafterCuts(p){
    return (p.panels || []).filter(q=>q.kind==='rafter').map(q=>{
      const axis=q.slope?.axis || (q.w>=q.d?'x':'z');
      const run=axis==='x'?q.w:q.d;
      const rise=q.slope?q.slope.y2-q.y:0;
      const width=axis==='x'?q.d:q.w;
      const height=Math.max(q.h,q.slope?.h2??q.h);
      return {id:q.id,name:q.name,group:'Daksparren',profile:width+'x'+height,axis,x:q.x,y:q.y,z:q.z,
        length:Math.round(Math.hypot(run,rise))+50};
    });
  }
  function boardPlan(p){
    const cuts=allBeams(p).map(b=>({id:b.id,name:b.name,length:b.length,group:b.group,profile:profileOf(b).id}));
    const raftersInPlan=rafterCuts(p);
    cuts.push(...raftersInPlan);
    const groups=new Map();
    for(const c of cuts) {const key=c.profile+'|'+c.length+'|'+c.name;const item=groups.get(key)||{profile:c.profile,length:c.length,name:c.name,count:0};item.count++;groups.set(key,item);}
    const boards=[], impossible=[], byProfile=[];
    // Hout van verschillende profielen kan nooit uit dezelfde handelsbalk komen: plan per profiel.
    const batches=Object.keys(PROFILES).map(profile=>({profile,rafters:false}));
    for(const profile of new Set(raftersInPlan.map(c=>c.profile)))batches.push({profile,rafters:true});
    for(const {profile:id,rafters} of batches){
      const mine=cuts.filter(c=>c.profile===id && (c.group==='Daksparren')===rafters).sort((a,b)=>b.length-a.length);
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
      const priceKey=rafters?(id==='50x150'?'daksparren':'daksparren-'+id):'balk-'+id;
      const own=!rafters&&id===DEFAULT_PROFILE?p.beamPrice:p.materials?.prices?.[priceKey];
      byProfile.push({profile:id,rafters,priceKey,label:PROFILES[id]?.label??id.replace('x',' × ')+' mm',cutCount:list.reduce((n,b)=>n+b.cuts.length,0),count:list.length,price:own??0,priceKnown:own!==undefined});
    }
    return {groups:[...groups.values()].sort((a,b)=>b.length-a.length||a.profile.localeCompare(b.profile)),boards,impossible,byProfile,
      totalLength:cuts.reduce((s,c)=>s+c.length,0),pieces:cuts.length,
      waste:boards.reduce((s,b)=>s+p.stockLength-b.used,0),
      estimatedPrice:byProfile.reduce((s,x)=>s+x.count*x.price,0)};
  }
  function stockWarning(plan,stockLength){
    if(!plan.impossible.length)return '';
    const longest=Math.max(...plan.impossible.map(c=>c.length));
    return `Zaagplan onvolledig: ${plan.impossible.length} stuk(s) langer dan de handelslengte van ${stockLength} mm. Langste zaagstuk: ${longest} mm. Deze stukken ontbreken in de houtinkoop en prijsraming.`;
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
    const incomplete=stockWarning(boardPlan(p),p.stockLength);
    if(incomplete)result.push(incomplete);
    const cf=conflicts(p);
    if(cf.overlaps.length)result.push(`${cf.overlaps.length} balkcombinatie(s) overlappen elkaar: ${cf.overlaps.slice(0,3).map(([a,b])=>a.name+' / '+b.name).join(', ')}${cf.overlaps.length>3?', …':''}.`);
    if(cf.unsupported.length)result.push(`${cf.unsupported.length} losse balk(en) raken geen andere balk of de grond: ${cf.unsupported.slice(0,3).map(b=>b.name).join(', ')}${cf.unsupported.length>3?', …':''}.`);
    return result;
  }
  return {TYPES,PROFILES,PANEL_KINDS,normalizePanels,editPanel,ZONE_KINDS,normalizePlan,planFrame,normalizeScan,scanScale,normalizeBackdrop,backdropScale,arrayBeams,moveBeams,normalizeReference,defaultCountertop,normalizeCountertop,countertopBox,normalizeAppliance,beamContacts,conflicts,DEFAULT_PROFILE,profileOf,uid,clamp,defaultMaterials,normalizeMaterials,demoProject,freeProject,normalizeProject,editFrameBeam,restoreFrameBeam,resizeBeamEndpoint,drawingBeam,expectedWidth,resizeProject,boundaries,beamBox,framePieces,allBeams,fitBeamBetween,rafterCuts,stockWarning,boardPlan,warnings};
});