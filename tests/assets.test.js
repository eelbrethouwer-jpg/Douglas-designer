const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const service=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const ownUrl=url=>!url.startsWith('http')&&!url.startsWith('data:')&&!url.startsWith('#');

test('every local script and stylesheet referenced in HTML exists',()=>{
 const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(ownUrl);
 for(const asset of assets){
  const file=asset.split('?')[0];
  assert.ok(fs.existsSync(path.join(root,file)),'missing referenced file: '+asset);
 }
});
test('all runtime scripts are in correct dependency order',()=>{
 const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.deepEqual(scripts,['room-space.js','sketch-grid.js','model.js','drafting.js','render3d.js','room-studio.js','app.js']);
});
test('PWA caches the same versioned files used by the page',()=>{
 const cached=[...service.matchAll(/'\.\/([^']+)'/g)].map(m=>m[1]);
 const names=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(ownUrl);
 for(const name of names)assert.ok(cached.includes(name),'PWA must cache exact versioned asset: '+name);
 assert.match(service,/douglas-designer-v0\.7\.4/);
});
test('user-facing version matches the release candidate and provides editor controls',()=>{
 assert.match(html,/v0\.7\.4 RC/);
 for(const id of ['gridSize','magnetToggle','drawTool','selectTool','shortcutHelp','geometryScene','scene','sketchGridVisible','sketchGridStep','sketchAxes','sketchWallGrid','sketchParallel'])
  assert.match(html,new RegExp('id="'+id+'"'));
});

test('SketchUp-style room workspace keeps mobile stage and makes materials reachable',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/name==='room'\|\|name==='finishes'/);
 assert.match(app,/\$\('#stageArea'\)\.classList\.remove\('hidden'\)/);
 assert.match(html,/data-mobile="finishes"/);
 assert.match(html,/id="roomWorkspaceMode"/);
});

test('Sketch Studio raster, axis and projection controls are wired into the drawing engine',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/G\.mesh\(project,project\.room,sketchSettings\)/);
 assert.match(app,/parallel:sketchSettings\.parallel/);
 assert.match(app,/fn\(project\)/,'mutation callback receives live project reference');
});

test('iPhone safe-area layout and Room Capture version agree with deployed PWA',()=>{
 const css=fs.readFileSync(path.join(root,'room-studio.css'),'utf8');
 const photo=fs.readFileSync(path.join(root,'room-studio.js'),'utf8');
 assert.match(html,/apple-mobile-web-app-status-bar-style" content="default"/);
 assert.match(css,/env\(safe-area-inset-top/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(photo,/room-capture-version">v0\.7\.4/);
 assert.match(html,/room-studio\.js\?rev=0\.7\.4/);
 assert.match(html,/app\.js\?rev=0\.7\.4/);
});

test('mobile floor-corner handles are draggable and point selectors appear in photo workflow',()=>{
 const source=fs.readFileSync(path.join(root,'room-studio.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'room-studio.css'),'utf8');
 assert.match(source,/id="roomCornerTools"/);
 assert.match(source,/pointerdown',startPhotoGesture/);
 assert.match(source,/pointermove',movePhotoGesture/);
 assert.match(source,/pointerup',e=>finishPhotoGesture\(e\)/);
 assert.match(source,/pointercancel',e=>finishPhotoGesture\(e,true\)/);
 assert.match(css,/#roomPhotoCanvas\{touch-action:none/);
});
