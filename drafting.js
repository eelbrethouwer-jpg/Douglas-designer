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
function dimensionLabel(mm){return new Intl.NumberFormat('nl-NL',{maximumFractionDigits:0}).format(mm)+' mm';}
return {snap,anchors,nearestAnchor,snapDrawingPoint,dimensionLabel};
});