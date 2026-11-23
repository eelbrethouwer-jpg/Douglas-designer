const test = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {launch} = require('../tools/browser-check.js');

const page = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const browserAvailable = process.env.CHROME_BIN || process.env.GITHUB_ACTIONS;
const projectIndex = "JSON.parse(localStorage.getItem('douglas-designer-projects-v1'))";

for (const mobile of [false, true]) {
  test('startontwerpen en hervatten in Chrome ' + (mobile ? '390 × 844' : 'desktop'), {
    skip: browserAvailable ? false : 'Stel CHROME_BIN in om deze browsertest lokaal uit te voeren',
    timeout: 90000
  }, async () => {
    const browser = await launch({mobile});
    try {
      await browser.goto(page);
      for (const index of [0, 1, 2]) {
        await browser.eval('localStorage.clear()');
        await browser.goto(page);
        assert.equal(await browser.eval("document.querySelector('#continueProject').getClientRects().length"), 0);
        const buttons = '#welcomeTemplates button';
        assert.equal(await browser.eval(`document.querySelectorAll('${buttons}').length`), 3);
        const point = await browser.eval(`(() => {
          const button = document.querySelectorAll('${buttons}')[${index}];
          button.scrollIntoView({block:'center'});
          const {x,y,width,height} = button.getBoundingClientRect();
          const cx=x+width/2, cy=y+height/2;
          return {x:cx,y:cy,reachable:button.contains(document.elementFromPoint(cx,cy))};
        })()`);
        assert.ok(point.reachable);
        const before = await browser.eval(projectIndex);
        await browser.mouse('mousePressed',point.x,point.y);
        await browser.mouse('mouseReleased',point.x,point.y);
        const after = await browser.eval(projectIndex);
        assert.equal(after.items.length, before.items.length + 1);
        assert.notEqual(after.activeId, before.activeId);
        assert.equal(await browser.eval("document.querySelector('#welcomeLayer').getClientRects().length"), 0);
        const saved = after.items.find(item => item.id === after.activeId);
        assert.match(saved.name,[/kamado/i,/overkapping/i,/pergola/i][index]);
        await browser.eval("localStorage.removeItem('douglas-designer-welcome-v2')");
        await browser.goto(page);
        assert.ok((await browser.eval("document.querySelector('#resumeProjectInfo').textContent")).includes(saved.name));
        assert.ok(await browser.click('#continueProject'));
        assert.equal((await browser.eval(projectIndex)).activeId,saved.id);
      }
      assert.equal(browser.events.filter(e=>e.method==='Runtime.exceptionThrown').length,0);
    } finally {
      await browser.close();
    }
  });
}
