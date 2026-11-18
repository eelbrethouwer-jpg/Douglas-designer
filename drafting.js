/* Douglas Designer — independent editor snapping and 2D drafting math (mm). */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DouglasDrafting=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const AXES=['x','y','z'];
function snap(value,step=5){const n=Number(value),s=Number(step);if(!Number.isFinite(n)||!Number.isFinite(s)||s<=0)return value;return Math.round(n/s)*s;}
function anchors(beams,beamBox,exceptId){
 const out=[];
 for(const b of beams){
  if(b.id===exceptId)continue;
  const bb=beamBox(b),long={x:['x','w'],y:['y','h'],z:['z','d']}[b.axis];
  if(!long)continue;
  const center={x:bb.x+bb.w/2,y:bb.y+bb.h/2,z:bb.z+bb.d/2};
  const start={...center,[long[0]]:bb[long[0]]};
  const end={...center,[long[0]]:bb[long[0]]+bb[long[1]]};
  out.push({point:start,id:b.id,kind:'start',label:'Balkuiteinde'},{point:end,id:b.id,kind:'end',label:'Balkuiteinde'});
 }
 return out;
}
function nearestAnchor(px,py,points,projectPoint,plane,tolerance=18){
 if(!Array.isArray(plane)||plane.length!==2)return null;
 let nearest=null,best=tolerance*tolerance;
 for(const a of points){
  const point=Array.isArray(a.point)?a.point:AXES.map(k=>a.point[k]);
  const screen=projectPoint(point);
  const dist=(screen.x-px)**2+(screen.y-py)**2;
  if(dist<=best){best=dist;nearest={...a,screen,distance:Math.sqrt(dist)};}
 }
 return nearest;
}
function snapDrawingPoint(world,plane,opts={}){
 const step=opts.step||5;
 const next={...world};
 for(const axis of plane)next[axis]=snap(next[axis],step);
 const anchor=opts.anchor;
 if(anchor){
  const a=Array.isArray(anchor.point)?anchor.point:AXES.map(key=>anchor.point[key]);
  for(const axis of plane)next[axis]=snap(a[AXES.indexOf(axis)],step);
 }
 return next;
}
// Afstand tussen twee punten binnen een tekenvlak (plane = twee assen). Geeft hele millimeters.
function measure(a,b,plane){
 if(!a||!b||!Array.isArray(plane)||plane.length!==2)return null;
 const [h,v]=plane,dx=Math.abs((b[h]||0)-(a[h]||0)),dy=Math.abs((b[v]||0)-(a[v]||0));
 return {h,v,dx:Math.round(dx),dy:Math.round(dy),dist:Math.round(Math.hypot(dx,dy))};
}
// Kaderselectie. shapes: [{owner:{type,id}, verts:[{x,y}]}]; rect: {x0,y0,x1,y1} in schermpixels.
// crossing=false: alleen objecten die helemaal in het kader liggen; crossing=true: ook objecten die het raken.
function rectSelect(shapes,rect,crossing){
 const x0=Math.min(rect.x0,rect.x1),x1=Math.max(rect.x0,rect.x1),y0=Math.min(rect.y0,rect.y1),y1=Math.max(rect.y0,rect.y1);
 const box=new Map();
 for(const s of shapes||[]){
  const o=s.owner;if(!o||!(o.type==='beam'||o.type==='frame')||!s.verts||!s.verts.length)continue;
  const k=o.type+':'+o.id,b=box.get(k)||{o:{type:o.type,id:o.id},minx:Infinity,miny:Infinity,maxx:-Infinity,maxy:-Infinity};
  for(const v of s.verts){b.minx=Math.min(b.minx,v.x);b.maxx=Math.max(b.maxx,v.x);b.miny=Math.min(b.miny,v.y);b.maxy=Math.max(b.maxy,v.y);}
  box.set(k,b);
 }
 const out=[];
 for(const b of box.values()){
  const inside=b.minx>=x0&&b.maxx<=x1&&b.miny>=y0&&b.maxy<=y1;
  const touch=b.maxx>=x0&&b.minx<=x1&&b.maxy>=y0&&b.miny<=y1;
  if(crossing?touch:inside)out.push(b.o);
 }
 return out;
}
function dimensionLabel(mm){return new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}).format(mm)+' mm';}
return {snap,anchors,nearestAnchor,snapDrawingPoint,measure,rectSelect,dimensionLabel};
});