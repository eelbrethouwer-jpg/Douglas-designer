/* Douglas Designer v0.7.2 — world-space SketchUp-inspired construction grid. All units mm.
   Camera-independent geometry: GPU depth tests occlude guides behind cabinets and walls. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DouglasSketchGrid=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const STEPS=[50,100,250,500];
const defaults={visible:true,step:250,axes:true,walls:true,parallel:false};
function settings(input){
 const v=input&&typeof input==='object'?input:{};
 return {visible:v.visible!==false,step:STEPS.includes(Number(v.step))?Number(v.step):defaults.step,
 axes:v.axes!==false,walls:v.walls!==false,parallel:v.parallel===true};
}
function bounds(project,room){
 const width=room?.enabled?room.width:project.width;
 const depth=room?.enabled?room.depth:project.depth;
 const height=room?.enabled?room.height:project.height;
 const margin=room?.enabled?0:Math.max(500,Math.round(Math.max(width,depth)*.65/250)*250);
 return {x0:room?.enabled?0:-margin,x1:width+margin,z0:room?.enabled?0:-margin,z1:depth+margin,
 width,depth,height,ground:room?.enabled?-18:-55,room:room?.enabled===true};
}
function mesh(project,room,input){
 const opts=settings(input),b=bounds(project,room),quads=[];
 if(!opts.visible)return quads;
 const dominant=Math.max(b.x1-b.x0,b.z1-b.z0,b.height);
 const step=opts.step*Math.max(1,Math.ceil(dominant/(opts.step*100)));
 const minor='#acb4ac',major='#819287',wallMinor='#bcc4b9',wallMajor='#929f94';
 const width=Math.max(2,Math.min(7,step*.035));
 const add=(plane,a,v,color,kind)=>quads.push({vertices:v,fill:color,kind});
 const color=k=>Math.abs(Math.round(k/step))%5===0?major:minor;
 const countLimit=160;
 let lines=0;
 for(let x=Math.ceil(b.x0/step)*step;x<=b.x1&&lines<countLimit;x+=step,lines++){
  add('ground',x,[[x-width/2,b.ground,b.z0],[x+width/2,b.ground,b.z0],[x+width/2,b.ground,b.z1],[x-width/2,b.ground,b.z1]],color(x),'floor');
 }
 for(let z=Math.ceil(b.z0/step)*step;z<=b.z1&&lines<countLimit*2;z+=step,lines++){
  add('ground',z,[[b.x0,b.ground,z-width/2],[b.x1,b.ground,z-width/2],[b.x1,b.ground,z+width/2],[b.x0,b.ground,z+width/2]],color(z),'floor');
 }
 // The back and left walls are inside the room geometry. Guides are 2 mm in front of their interior surfaces.
 if(b.room&&opts.walls){
  if(room.backWall){
   const z=room.depth-34;
   for(let x=0;x<=room.width;x+=step) add('back',x,[[x-width/2,0,z],[x+width/2,0,z],[x+width/2,room.height,z],[x-width/2,room.height,z]],x%(step*5)===0?wallMajor:wallMinor,'back-wall');
   for(let y=0;y<=room.height;y+=step) add('back',y,[[0,y-width/2,z],[room.width,y-width/2,z],[room.width,y+width/2,z],[0,y+width/2,z]],y%(step*5)===0?wallMajor:wallMinor,'back-wall');
  }
  if(room.leftWall){
   const x=33;
   for(let z=0;z<=room.depth;z+=step) add('left',z,[[x,0,z-width/2],[x,0,z+width/2],[x,room.height,z+width/2],[x,room.height,z-width/2]],z%(step*5)===0?wallMajor:wallMinor,'left-wall');
   for(let y=0;y<=room.height;y+=step) add('left',y,[[x,y-width/2,0],[x,y-width/2,room.depth],[x,y+width/2,room.depth],[x,y+width/2,0]],y%(step*5)===0?wallMajor:wallMinor,'left-wall');
  }
 }
 if(opts.axes){
  // X red; world Z green (ground depth); world Y blue (up).
  // Axis ribbons are 3D surfaces, not a background illustration.
  const axw=Math.max(5,Math.min(15,step*.055));
  const reach=Math.max(700,Math.round(Math.max(b.width,b.depth)*.2));
  const base=b.room?-12:-51;
  add('axis',0,[[-reach,base,-axw/2],[b.x1+reach,base,-axw/2],[b.x1+reach,base,axw/2],[-reach,base,axw/2]],'#c04d47','x-axis');
  add('axis',0,[[-axw/2,base,-reach],[axw/2,base,-reach],[axw/2,base,b.z1+reach],[-axw/2,base,b.z1+reach]],'#42926a','z-axis');
  add('axis',0,[[0,-100,-axw/2],[0,b.height+reach,-axw/2],[0,b.height+reach,axw/2],[0,-100,axw/2]],'#447fbe','y-axis');
  add('axis',0,[[-axw/2,-100,0],[axw/2,-100,0],[axw/2,b.height+reach,0],[-axw/2,b.height+reach,0]],'#447fbe','y-axis');
 }
 return quads;
}
return {STEPS,defaults,settings,bounds,mesh};
});