const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { test, before, after } = require('node:test');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.join(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
let browser;
before(async () => { browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true }); });
after(async () => { if (browser) await browser.close(); });

async function openPage(t, records = []) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(rec => {
    localStorage.setItem('suchart_cfg', JSON.stringify({ v: 3, voice: false, sound: false, mood: 'off', demo: 'button', help: 'none', share: 'off' }));
    localStorage.setItem('suchart_rec', JSON.stringify(rec));
  }, records);
  await page.goto(url);
  return { page, errors };
}
async function teacher(page) {
  await page.locator('#teachBtn').click();
  await page.locator('#holdBtn').focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(2100);
  await page.keyboard.up('Enter');
}
async function stop(page) {
  await page.locator('#quitBtn').click();
  await page.locator('#quitBtn').click();
}
async function answer(page) {
  const objects = page.locator('#stage [data-obj]:not(.e)');
  for (const object of await objects.all()) await object.click();
  const value = await page.evaluate(() => SC.G.p.ans);
  await page.locator(`#v-play [data-pick="${value}"]`).click();
}

test('closing the teacher gate cancels the pending keyboard hold', async t => {
  const { page, errors } = await openPage(t);
  await page.locator('#teachBtn').click();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(2100);
  await page.keyboard.up('Enter');
  await page.keyboard.up('Escape');
  assert.equal(await page.locator('body').evaluate(el => el.classList.contains('teacher')), false);
  await teacher(page);
  assert.equal(await page.locator('#v-teacher').isVisible(), true);
  assert.deepEqual(errors, []);
});

test('invalid record containers do not crash records or print views', async t => {
  const { page, errors } = await openPage(t, null);
  await teacher(page);
  await page.locator('#v-teacher [data-go="records"]').click();
  assert.match(await page.locator('#recBody').innerText(), /아직 기록이 없어요/);
  await page.locator('.nav [data-go="print"]').click();
  assert.ok(await page.locator('#sheets').innerText());
  assert.deepEqual(errors, []);
});

test('eight games, completion, saved records and eight worksheets work offline', async t => {
  const { page, errors } = await openPage(t);
  const modes = ['count', 'flash', 'stair', 'ten', 'board', 'near', 'cmp', 'seq'];
  for (const mode of modes) {
    await page.locator(`[data-start="${mode}"]`).click();
    await answer(page);
    assert.equal(await page.evaluate(() => SC.G.done), 1, mode);
    await stop(page);
  }
  assert.equal(await page.evaluate(() => SC.readRecords().length), 8);
  await teacher(page);
  await page.locator('.nav [data-go="settings"]').click();
  await page.locator('#s-count').selectOption('5');
  await page.locator('#s-mood').selectOption('both');
  await page.locator('#s-share').selectOption('end');
  await page.locator('#teachBtn').click();
  await page.locator('[data-start="cmp"]').click();
  await page.locator('#moodPick [data-mood="good"]').click();
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => SC.G && !SC.G.lock && !SC.G.paused);
    await answer(page);
  }
  await page.locator('#v-done').waitFor({ state: 'visible' });
  await page.locator('#doneShare [data-share-ok]').click();
  await page.locator('#doneMoodPick [data-mood="good"]').click();
  assert.equal(await page.evaluate(() => SC.readRecords()[0].moodEnd), 'good');
  await page.locator('#v-done [data-go="home"]').click();
  await teacher(page);
  await page.locator('.nav [data-go="records"]').click();
  assert.equal(await page.locator('#recBody tr').count(), 9);
  await page.locator('#recBody [data-rec="0"]').click();
  assert.equal(await page.locator('#pTypes [aria-checked="true"]').getAttribute('data-ptype'), 'cmp');
  await page.locator('#p-pages').selectOption('2');
  for (const mode of modes) {
    await page.locator(`[data-ptype="${mode}"]`).click();
    assert.equal(await page.locator('#sheets .sheet').count(), 4);
    assert.doesNotMatch(await page.locator('#sheets').innerHTML(), /NaN|undefined/);
  }
  await page.evaluate(() => SC.openPrint({ mode: 'missing', range: 0, level: 9 }));
  assert.equal(await page.locator('#pTypes [aria-checked="true"]').getAttribute('data-ptype'), 'count');
  assert.deepEqual(errors, []);
});

test('responsive screenshots cover all views and learning modes', async t => {
  const { page, errors } = await openPage(t);
  const out = path.join(root, '.omo', 'evidence', 'refactor');
  fs.mkdirSync(out, { recursive: true });
  const captures = [];
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const capture = async name => {
      const file = `${width}-${name}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      captures.push(file);
    };
    await capture('home');
    for (const mode of ['count', 'flash', 'stair', 'ten', 'board', 'near', 'cmp', 'seq']) {
      await page.locator(`[data-start="${mode}"]`).click();
      await capture(`play-${mode}`);
      if (mode === 'count') {
        await page.locator('#askRestBtn').click();
        await capture('break');
        await page.locator('#breakBack').click();
      }
      await stop(page);
    }
    await page.locator('#teachBtn').click();
    await capture('gate');
    await page.locator('#gateClose').click();
    await teacher(page);
    await capture('teacher');
    for (const view of ['settings', 'records', 'print']) {
      await page.locator(`.nav [data-go="${view}"]`).click();
      await capture(view);
    }
    await page.locator('#teachBtn').click();
  }
  fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify(captures, null, 2));
  assert.deepEqual(errors, []);
});
