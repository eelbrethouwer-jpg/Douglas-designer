const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const M=require('../model.js');
function makeApp(){
 const nodes=new Map(),listeners=new Map();let stored='';
 const ctx2d={beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},roundRect(){},clearRect(){},setTransform(){},fillText(){},save(){},restore(){},closePath(){},measureText(t){return {width:String(t).length*6};}};
 function el(id){if(!nodes.has(id)){
  const c={id,style:{},innerHTML:'',textContent:'',value:'',checked:false,firstChild:{textContent:''},width:0,height:0,dataset:{},classList:{add(){},remove(){},toggle(){}},getContext(){return ctx2d;},getBoundingClientRect(){return {width:800,height:520};},addEventListener(name,fn){listeners.set(id+':'+name,fn);},setPointerCapture(){},scrollIntoView(){},click(){},setAttribute(){},toBlob(fn){fn({});}};
  nodes.set(id,c);
 }return nodes.get(id);}
 const document={querySelector:s=>el(s),querySelectorAll:()=>[],addEventListener(name,fn){listeners.set('document:'+name,fn);},activeElement:{tagName:'BODY'},createElement:()=>el('created')};
 const window={DouglasModel:M,innerWidth:1500,devicePixelRatio:1,addEventListener(name,fn){listeners.set('window:'+name,fn);},print(){},confirm(){return true;}};
 const storage={getItem(){return stored||null;},setItem(k,v){stored=v;}};
 const sandbox={window,document,navigator:{},location:{protocol:'file:'},localStorage:storage,Intl,console,Map,Math,JSON,Date,setTimeout,clearTimeout,Blob,URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),sandbox,{timeout:10000});return {nodes,listeners,stored:()=>stored};
}
test('app renders module list, stats, and inspector with zero dependencies',()=>{
 const a=makeApp();assert.match(a.nodes.get('#moduleList').innerHTML,/Ladekast/);assert.match(a.nodes.get('#statWidth').innerHTML,/1\.875/);assert.match(a.nodes.get('#statBeams').innerHTML,/28/);assert.match(a.nodes.get('#inspectorBody').innerHTML,/BENODIGDE DOUGLAS BALKEN/);assert.doesNotThrow(()=>JSON.parse(a.stored()));
});
test('add module updates width, counts, and undo restores initial width',()=>{
 const a=makeApp(),listener=a.listeners.get('document:click');const button={dataset:{add:'doors'},id:'',closest(selector){return selector==='button'?this:null;}};
 listener({target:button});assert.match(a.nodes.get('#statWidth').innerHTML,/2\.445/);assert.match(a.nodes.get('#moduleCount').textContent,/4/);
 const undo={dataset:{},id:'undoBtn',closest(selector){return selector==='button'?this:null;}};listener({target:undo});assert.match(a.nodes.get('#statWidth').innerHTML,/1\.875/);
});