#!/usr/bin/env node
/* Minimale echte-browsercontrole via Chrome DevTools Protocol (geen dependencies).
   Gebruik: node tools/browser-check.js [--url http://localhost:8765/index.html] [--out dir]
   Vereist een Chrome/Chromium (CHROME_BIN of google-chrome). Sluit af met exit 1 bij een mislukte controle.
   Dit is een aanvulling op `node --test`, geen vervanging van acceptatie op een echte iPhone. */
'use strict';
const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const http=require('node:http');

function parseArgs(){const a=process.argv.slice(2),o={url:'http://localhost:8765/index.html',out:path.join(os.tmpdir(),'douglas-shots'),mobile:false};
  for(let i=0;i<a.length;i++){if(a[i]==='--url')o.url=a[++i];else if(a[i]==='--out')o.out=a[++i];else if(a[i]==='--mobile')o.mobile=true;}return o;}

function getJSON(url){return new Promise((res,rej)=>{const req=http.get(url,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}});}).on('error',rej);req.setTimeout(2000,()=>req.destroy(new Error('Chrome startantwoord verlopen')));});}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

async function launch(opts={}){
  const bin=process.env.CHROME_BIN||'google-chrome';
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dd-chrome-'));
  const proc=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--remote-debugging-port=0','--user-data-dir='+dir,'--window-size='+(opts.mobile?'390,844':'1400,900'),'about:blank'],{stdio:'ignore'});
  let info,ws,launchError;
  proc.on('error',error=>{launchError=error;});
  function stop(){
    try{ws?.close();}catch(_){}
    proc.kill('SIGKILL');
    try{fs.rmSync(dir,{recursive:true,force:true});}catch(_){}
  }
  try{
    // Chrome reserveert zelf een vrije poort, ook wanneer meerdere tests tegelijk starten.
    for(let i=0;i<60;i++){
      if(launchError)throw launchError;
      if(proc.exitCode!==null||proc.signalCode)throw new Error('Chrome is gestopt bij het opstarten');
      try{
        const port=Number(fs.readFileSync(path.join(dir,'DevToolsActivePort'),'utf8').split('\n')[0]);
        if(port)info=await getJSON(`http://127.0.0.1:${port}/json`);
        if(info?.some(t=>t.type==='page'))break;
      }catch(_){}
      await sleep(250);
    }
    const target=info?.find(t=>t.type==='page');
    if(!target)throw new Error('Chrome startte niet');
    ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Geen verbinding met Chrome')),10000);
      ws.onopen=()=>{clearTimeout(timer);resolve();};
      ws.onerror=()=>{clearTimeout(timer);reject(new Error('Verbinding met Chrome mislukt'));};
    });
  }catch(error){stop();throw error;}
  let id=0;const pending=new Map(),events=[];
  let send;
  ws.onmessage=(m)=>{const d=JSON.parse(m.data);if(d.id&&pending.has(d.id)){const p=pending.get(d.id);pending.delete(d.id);clearTimeout(p.timer);d.error?p.rej(new Error(JSON.stringify(d.error))):p.res(d.result);}
    else if(d.method){events.push(d);
      // confirm()/alert() blokkeren anders de pagina; accepteer en onthoud de tekst.
      if(d.method==='Page.javascriptDialogOpening'){dialogs.push(d.params.message);send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});}}};
  const dialogs=[];
  ws.onclose=()=>{
    for(const p of pending.values()){clearTimeout(p.timer);p.rej(new Error('Chrome heeft de verbinding gesloten'));}
    pending.clear();
  };
  send=(method,params={})=>new Promise((res,rej)=>{
    const i=++id;
    const timer=setTimeout(()=>{pending.delete(i);rej(new Error('Chrome reageert niet op '+method));},30000);
    pending.set(i,{res,rej,timer});
    try{ws.send(JSON.stringify({id:i,method,params}));}
    catch(error){clearTimeout(timer);pending.delete(i);rej(error);}
  });
  try{
    await send('Page.enable');await send('Runtime.enable');
    if(opts.mobile){await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});}
  }catch(error){stop();throw error;}
  const api={
    send,events,dialogs,
    async goto(url){await send('Page.navigate',{url});await sleep(1500);},
    async eval(expr){const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
      if(r.exceptionDetails)throw new Error('JS-fout: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text));return r.result.value;},
    async shot(file){const r=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(r.data,'base64'));return file;},
    // Bestanden in een <input type=file> zetten (activeert het change-event).
    async uploadFile(sel,files){const doc=await send('DOM.getDocument',{depth:0});const n=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:sel});
      if(!n.nodeId)throw new Error('input niet gevonden: '+sel);await send('DOM.setFileInputFiles',{nodeId:n.nodeId,files});},
    // Downloads (bijv. <a download>) naar een map laten schrijven; geeft de map terug.
    async downloadsTo(dirPath){fs.mkdirSync(dirPath,{recursive:true});await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dirPath});return dirPath;},
    async click(sel){return api.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true})()`);},
    async mouse(type,x,y,extra={}){return send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1,buttons:type==='mouseReleased'?0:1,...extra});},
    async drag(x1,y1,x2,y2,steps=8){await api.mouse('mouseMoved',x1,y1,{buttons:0});await api.mouse('mousePressed',x1,y1);
      for(let i=1;i<=steps;i++)await api.mouse('mouseMoved',x1+(x2-x1)*i/steps,y1+(y2-y1)*i/steps);await api.mouse('mouseReleased',x2,y2);},
    errors(){return events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error')).map(e=>JSON.stringify(e.params).slice(0,300));},
    async close(){stop();}
  };
  return api;
}

async function main(){
  const o=parseArgs(),b=await launch({mobile:o.mobile}),results=[];
  const check=async(name,fn)=>{try{const v=await fn();results.push({name,ok:v!==false,detail:typeof v==='string'?v:''});}catch(e){results.push({name,ok:false,detail:e.message});}};
  try{
    await b.goto(o.url);
    await check('pagina laadt zonder JS-fouten',async()=>b.errors().length===0||b.errors().join(' | '));
    await check('welkomstscherm zichtbaar',async()=>b.eval(`!!document.querySelector('#welcomeLayer')&&!document.querySelector('#welcomeLayer').classList.contains('hidden')`));
    await b.shot(path.join(o.out,'01-welkom.png'));
    await check('voorbeeld openen',async()=>{await b.click('#demoProject');await sleep(600);return b.eval(`document.querySelector('#statBeams').textContent.includes('28')`);});
    await b.shot(path.join(o.out,'02-voorbeeld-3d.png'));
    for(const v of ['front','side','top','bottom']){await b.click(`.view-btn[data-view="${v}"]`);await sleep(300);await b.shot(path.join(o.out,`03-${v}.png`));}
    await b.click('.view-btn[data-view="3d"]');
    await check('zaaglijst met materiaallijst',async()=>{await b.click('#openCutlist');await sleep(400);return b.eval(`document.querySelector('#modalContent').innerHTML.includes('MATERIAALLIJST')`);});
    await b.shot(path.join(o.out,'04-zaaglijst.png'));
    await check('geen JS-fouten na rondgang',async()=>b.errors().length===0||b.errors().join(' | '));
  }finally{await b.close();}
  for(const r of results)console.log((r.ok?'PASS ':'FAIL ')+r.name+(r.detail&&r.detail!==true?' — '+r.detail:''));
  console.log('Screenshots:',o.out);
  process.exit(results.every(r=>r.ok)?0:1);
}
module.exports={launch,sleep};
if(require.main===module)main().catch(e=>{console.error(e);process.exit(2);});
