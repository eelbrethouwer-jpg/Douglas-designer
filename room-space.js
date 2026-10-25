/* Douglas Designer v0.7.0 — pure room geometry and design catalogue (millimetres). */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DouglasRoom=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const colors={
  wood:[['Douglas naturel','#b8824f'],['Douglas warm','#aa784f'],['Douglas licht','#dab588'],['Douglas donker','#765339'],['Douglas zwart','#353b38'],['Douglas vergrijsd','#92988b']],
  top:[['Beton licht','#b1b0a6'],['Beton donker','#696f70'],['Graniet zwart','#373b3d'],['Graniet grijs','#767c80'],['Keramiek zand','#d3c5ad'],['Keramiek antraciet','#44494d'],['Composiet wit','#e0ded3'],['Composiet zwart','#343a3b'],['RVS geborsteld','#a9b2b7'],['Terrazzo','#c8bfb0'],['Hout warm','#986e49'],['Leisteen','#535f64']],
  front:[['Douglas vlak','#ad7548'],['Douglas latten','#986b47'],['Douglas donker','#6e513e'],['Zwart mat','#323737'],['Antraciet','#4c5557'],['Olijfgroen','#66725a'],['Zandkleur','#b7a993'],['RVS','#9ba6ac']],
  kamado:[['Keramiek groen','#354740'],['Keramiek zwart','#252c2d'],['Mat zwart','#393d3d'],['Keramiek rood','#883b31'],['Keramiek blauw','#3b596a'],['Keramiek crème','#c1b8a1']]
};
const palettes=Object.fromEntries(Object.entries(colors).map(([key,pairs])=>[key,pairs.map(([label,color],i)=>({id:key+'-'+i,label,color,kind:key,license:'Eigen kleurreferentie',dimensionsVerified:false}))]));
const components={
 doors:['Enkele deur links','Enkele deur rechts','Dubbele deuren','Kaderdeuren','Deur met ventilatie','Lattenfront','Greeploze deur','Koelkastfront'],
 drawers:['Eén diepe lade','Twee lades','Drie lades','Kolenlade','Besteklade','Brede gereedschapslade','Afvallade','Smalle kruidenlade'],
 handles:['Zwarte beugel','RVS beugel','Ronde knop','Vierkante knop','Komgreep','Ingefreesd profiel','Greeplijst zwart','Greeplijst RVS','Leren lus','Push-to-open'],
 accessories:['Spoelbak','Buitenkraan','Koelkast','Wielen','Open schap','Handoekhaak','LED-strip','Uitklapbaar werkblad']
};
function defaultRoom(project={width:1875,depth:870}){return {enabled:false,width:4500,depth:3200,height:2700,leftWall:true,backWall:true,floorColor:'#c5c5b9',wallColor:'#d7d0c5',placement:{x:Math.round((4500-project.width)/2),z:3200-project.depth-100,rotation:0},photo:null,corners:[]};}
function normalizeRoom(raw,project){const defaults=defaultRoom(project),v=raw&&typeof raw==='object'?raw:{};
 const width=clamp(Math.round(finite(v.width,defaults.width)),1200,20000);
 const depth=clamp(Math.round(finite(v.depth,defaults.depth)),1200,20000);
 const height=clamp(Math.round(finite(v.height,defaults.height)),1200,6500);
 const place=v.placement&&typeof v.placement==='object'?v.placement:{};
 const rotation=[0,90,180,270].includes(Number(place.rotation))?Number(place.rotation):0;
 const oriented=rotation%180===0?{w:project.width,d:project.depth}:{w:project.depth,d:project.width};
 const x=clamp(Math.round(finite(place.x,(width-oriented.w)/2)),-20000,20000);
 const z=clamp(Math.round(finite(place.z,depth-oriented.d-100)),-20000,20000);
 const photo=typeof v.photo==='string'&&v.photo.length<=1300000&&/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(v.photo)?v.photo:null;
 const corners=Array.isArray(v.corners)?v.corners.slice(0,4).filter(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1)).map(p=>p.slice()):[];
 const validColor=c=>/^#[a-f0-9]{6}$/i.test(c||'');
 return {enabled:v.enabled===true,width,depth,height,leftWall:v.leftWall!==false,backWall:v.backWall!==false,
   floorColor:validColor(v.floorColor)?v.floorColor:defaults.floorColor,wallColor:validColor(v.wallColor)?v.wallColor:defaults.wallColor,
   placement:{x,z,rotation},photo,corners};
}
function normalizeStyle(raw){const v=raw&&typeof raw==='object'?raw:{};const res={};
 for(const key of Object.keys(palettes)){const valid=palettes[key].some(o=>o.id===v[key]);res[key]=valid?v[key]:palettes[key][0].id;}
 res.doorType=components.doors.includes(v.doorType)?v.doorType:components.doors[2];
 res.drawerType=components.drawers.includes(v.drawerType)?v.drawerType:components.drawers[2];
 res.handle=components.handles.includes(v.handle)?v.handle:components.handles[0];
 res.accessory=components.accessories.includes(v.accessory)?v.accessory:components.accessories[0];
 return res;
}
function colorOf(kind,id){return (palettes[kind]||[]).find(x=>x.id===id)?.color||palettes[kind]?.[0]?.color||'#777777';}
function orientation(project,room){return room.placement.rotation%180===0?{width:project.width,depth:project.depth}:{width:project.depth,depth:project.width};}
function kitchenPoint(point,room){if(!room?.enabled)return point.slice();const {x,z,rotation}=room.placement;const [a,y,b]=point;
 switch(rotation){case 90:return [x+b,y,z+room._projectWidth-a];case 180:return [x+room._projectWidth-a,y,z+room._projectDepth-b];case 270:return [x+room._projectDepth-b,y,z+a];default:return [x+a,y,z+b];}
}
function transformKitchen(point,project,room){if(!room?.enabled)return point.slice();return kitchenPoint(point,{...room,_projectWidth:project.width,_projectDepth:project.depth});}
function warnings(project,room){if(!room?.enabled)return [];const o=orientation(project,room),p=room.placement,issues=[];
 if(p.x<0||p.z<0||p.x+o.width>room.width||p.z+o.depth>room.depth)issues.push('Buitenkeuken valt buiten de ingestelde ruimte.');
 if(project.height>room.height)issues.push('Keuken is hoger dan de ingestelde ruimte.');
 return issues;
}
function footprint(project,room){const p=[[0,0,0],[project.width,0,0],[project.width,0,project.depth],[0,0,project.depth]];return p.map(v=>transformKitchen(v,project,room));}
function floorMap(u,v,corners){if(!Array.isArray(corners)||corners.length!==4)return null;const [a,b,c,d]=corners;
 // Bilinear approximation: useful for a photo overlay, not a measured camera solution.
 return [(1-u)*(1-v)*a[0]+u*(1-v)*b[0]+u*v*c[0]+(1-u)*v*d[0],
 (1-u)*(1-v)*a[1]+u*(1-v)*b[1]+u*v*c[1]+(1-u)*v*d[1]];
}
return {defaultRoom,normalizeRoom,normalizeStyle,palettes,components,colorOf,orientation,transformKitchen,warnings,footprint,floorMap};
});
