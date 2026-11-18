// Leest het actieve project uit een Map-achtige nep-opslag, zoals projects.js het bewaart.
const P=require('../../projects.js');
module.exports=function activeProject(map){
 const ix=JSON.parse(map.get(P.INDEX_KEY)||'null');
 if(!ix||!ix.activeId)throw new Error('geen actief project in opslag');
 return JSON.parse(map.get(P.PROJECT_PREFIX+ix.activeId));
};
