const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch}=require('../tools/browser-check.js');

test('terug naar mobiel ontwerp houdt canvas vrij en wist oude bewerkacties', {
  skip: !process.env.GITHUB_ACTIONS && !process.env.CHROME_BIN,
  timeout: 90000
}, async ()=>{
  const browser=await launch({mobile:true});
  try {
    const visible=selector=>browser.eval(`document.querySelector(${JSON.stringify(selector)}).getClientRects().length>0`);
    const click=async selector=>{
      assert.equal(await visible(selector),true,selector);
      await browser.click(selector);
    };
    await browser.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await click('#welcomeTemplates [data-proj="template:0"]');
    await click('#roomContinue');
    await click('[data-mobile="modules"]');
    await click('[data-select-module]');
    assert.equal(await visible('#selectionStrip'),true);
    await click('[data-mobile="modules"]');
    await click('[data-mobile="design"]');
    assert.equal(await visible('#inspector'),false);
    await click('#editSelectionBtn');
    assert.equal(await visible('#inspector'),true);
    await click('#deleteSelected');
    assert.equal(await visible('#selectionStrip'),false);
    assert.equal(await visible('#inspector'),false);
    await click('#undoBtn');
    assert.equal(await visible('#selectionStrip'),false);
    await click('[data-mobile="modules"]');
    assert.equal(await browser.eval("document.querySelectorAll('[data-select-module]').length"),3);
    assert.deepEqual(browser.errors(),[]);
  } finally { await browser.close(); }
});
