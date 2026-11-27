const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {launch} = require('../tools/browser-check.js');
const {INDEX_KEY, PROJECT_PREFIX} = require('../projects.js');

test('overkapping uit bestaand project bewerken bewaart bron en losse schets', {
  skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
  timeout: 60000
}, async () => {
  const b = await launch();
  try {
    await b.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    const active = () => b.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(INDEX_KEY)})).activeId`);
    const saved = id => b.eval(`localStorage.getItem(${JSON.stringify(PROJECT_PREFIX + id)})`);
    const draftKey = 'douglas-designer-plan-draft-v1';
    const draft = JSON.stringify({zones:[{name:'Losse schets',kind:'open',w:2000,d:1800,h:2200}],lines:[]});
    await b.eval(`localStorage.setItem('${draftKey}',${JSON.stringify(draft)})`);
    await b.click('#welcomeTemplates [data-proj="template:1"]');
    await b.click('#roomContinue');
    const sourceId = await active();
    // Reopen from durable storage so this covers already saved projects.
    await b.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    const original = await saved(sourceId);
    await b.click('[data-panel="settings"]');
    assert.equal(await b.eval("document.querySelector('#projectDepth').readOnly"), true);
    assert.equal(await b.eval("document.querySelector('#editPlanDimensions').getBoundingClientRect().height>0"), true);
    await b.click('#editPlanDimensions');
    assert.equal(await b.eval("document.querySelector('[data-pf=d]').value"), '3000');
    await b.eval("const d=document.querySelector('[data-pf=d]');d.value='3600';d.dispatchEvent(new Event('change',{bubbles:true}))");
    await b.click('[data-pe=generate]');
    const variantId = await active();
    assert.notEqual(variantId, sourceId);
    const variant = JSON.parse(await saved(variantId));
    assert.equal(variant.depth, 3600);
    assert.equal(variant.plan.zones[0].d, 3600);
    assert.ok(variant.beams.length && variant.panels.length);
    const rearPost = p => Math.max(...p.beams.filter(b=>b.axis==='y').map(b=>b.z));
    const source = JSON.parse(original);
    assert.equal(rearPost(variant)-rearPost(source),600);
    const rafters=variant.panels.filter(p=>p.kind==='rafter');
    assert.ok(rafters.length>0);
    assert.ok(rafters.every(p=>p.d===3600));
    assert.equal(await saved(sourceId), original);
    assert.equal(await b.eval(`localStorage.getItem('${draftKey}')`), draft);
    assert.deepEqual(b.errors(), []);
  } finally {
    await b.close();
  }
});
