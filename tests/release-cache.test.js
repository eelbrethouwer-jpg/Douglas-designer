const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
test('main app shows v0.4 in header and welcome screen',()=>{
 assert.match(html,/BUITENKEUKEN STUDIO <b>v0\.4<\/b>/);
 assert.match(html,/welcome-version">v0\.4</);
});
test('every runtime CSS and JS resource has matching cache revision',()=>{
 for(const asset of ['styles.css','ux.css','model.js','app.js']){
  assert.ok(html.includes(asset+'?rev=0.4.0-refresh1'),asset+' html resource missing version');
  assert.ok(sw.includes(asset+'?rev=0.4.0-refresh1'),asset+' SW pre-cache missing version');
 }
 assert.match(sw,/douglas-designer-v0\.4\.0-refresh1/);
});
test('service worker bypasses the browser HTTP cache',()=>{
 assert.match(app,/serviceWorker\.register\('\.\/sw\.js\?rev=0\.4\.0-refresh1', \{updateViaCache:'none'\}\)/);
});