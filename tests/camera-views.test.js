const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Exercise the real preset handler and verify the painter's-depth ordering.
const code=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const setViewLine=code.split('\n').find(line=>line.startsWith('function setView(v)'));
assert.ok(setViewLine,'Expected production setView() function');
function angleFor(view){
  const context=vm.createContext({Math,draw(){},$$(){return [];}});
  vm.runInContext(`const camera={yaw:0,pitch:0}; let currentView='3d'; ${setViewLine}`,context);
  return vm.runInContext(`setView(${JSON.stringify(view)}); ({pitch:camera.pitch,yaw:camera.yaw,view:currentView})`,context);
}
test('Boven shows the upper side of the construction',()=>{
  const a=angleFor('top');
  assert.equal(a.view,'top');
  assert.ok(a.pitch < -1.5,'top must show upper beams nearest to camera');
  assert.ok(Math.sin(a.pitch)*950 < Math.sin(a.pitch)*0);
});
test('Onder shows the underside of the construction',()=>{
  const a=angleFor('bottom');
  assert.equal(a.view,'bottom');
  assert.ok(a.pitch > 1.5,'bottom must show lower beams nearest to camera');
  assert.ok(Math.sin(a.pitch)*0 < Math.sin(a.pitch)*950);
});
test('Front, side and default 3D presets do not change',()=>{
  assert.equal(angleFor('front').pitch,0);
  assert.equal(angleFor('side').pitch,0);
  assert.equal(angleFor('3d').pitch,.32);
});
