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
 assert.deepEqual(scripts,['model.js','drafting.js','render3d.js','app.js']);
});
test('PWA caches the same versioned files used by the page',()=>{
 const cached=[...service.matchAll(/'\.\/([^']+)'/g)].map(m=>m[1]);
 const names=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(ownUrl);
 for(const name of names)assert.ok(cached.includes(name),'PWA must cache exact versioned asset: '+name);
 assert.match(service,/douglas-designer-v0\.6\.0/);
});
test('user-facing version matches the release candidate and provides editor controls',()=>{
 assert.match(html,/v0\.6\.0 RC/);
 for(const id of ['gridSize','magnetToggle','drawTool','selectTool','shortcutHelp','geometryScene','scene'])
  assert.match(html,new RegExp('id="'+id+'"'));
});
