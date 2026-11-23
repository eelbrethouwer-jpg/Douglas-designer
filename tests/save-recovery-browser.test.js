const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('mobiel houdt een niet-opgeslagen wijziging bereikbaar voor herstel', {
  skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
  timeout:90000
}, async ()=>{
  const b=await launch({mobile:true});
  try{
    await b.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await b.click('#welcomeTemplates [data-proj="template:0"]');
    await b.eval(`window.originalSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(){throw new DOMException('vol','QuotaExceededError')}`);
    await b.click('[data-mobile="modules"]');
    assert.ok(await b.eval("document.querySelector('#presetGrid [data-add=doors]').getClientRects().length>0"));
    await b.click('#presetGrid [data-add="doors"]');
    assert.ok(await b.eval("document.querySelector('#saveRecovery').getBoundingClientRect().height>0"));
    assert.match(await b.eval("document.querySelector('#saveError').textContent"),/Opslag is vol/);
    assert.ok(await b.eval("document.querySelector('#saveBackup').getBoundingClientRect().width>0"));
    const count="JSON.parse(localStorage.getItem('douglas-designer-project-v1:'+JSON.parse(localStorage.getItem('douglas-designer-projects-v1')).activeId)).modules.length";
    assert.equal(await b.eval(count),3);
    await b.eval('Storage.prototype.setItem=window.originalSetItem');
    await b.click('#retrySave');
    assert.equal(await b.eval(count),4);
    assert.equal(await b.eval("document.querySelector('#saveRecovery').getClientRects().length"),0);
    assert.deepEqual(b.errors(),[]);
  }finally{await b.close();}
});
