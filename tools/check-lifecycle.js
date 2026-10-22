const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  let now = 0, sequence = 0;
  const timers = new Map(), elements = new Map(), speech = [];
  function element(key) {
    if (elements.has(key)) return elements.get(key);
    const classes = new Set(), listeners = {};
    const el = { hidden: false, innerHTML: '', dataset: {}, style: { setProperty() {} },
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x), toggle(x, on) { if (on) classes.add(x); else classes.delete(x); } },
      addEventListener: (event, fn) => { listeners[event] = fn; },
      querySelector: selector => element(key + selector), focus() {}, scrollIntoView() {},
      getBoundingClientRect: () => ({ top: 10, bottom: 40, left: 10, width: 30, height: 30 }),
      click(data = {}) { listeners.click?.({ currentTarget: el, target: { closest: () => ({ dataset: data }) } }); }
    };
    elements.set(key, el); return el;
  }
  const setTimeout = (fn, ms = 0) => { const id = ++sequence; timers.set(id, { fn, at: now + ms }); return id; };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const mode = { label: 'test', gen: () => ({ type: 'input', ans: 1 }), glyphs: () => '', text: () => '', stage: () => '',
    hint: () => '', speak: () => [], hintSay: () => [], goodSay: () => [], good: () => '', look: () => [] };
  let back;
  const SC = { $: element, cfg: { range: 20, count: 5, help: 'lots', demo: 'off', mood: 'off', answer: 'input',
      restCards: 1, restWait: 1, askBtns: true, offerBreak: false, calm: true, voice: false, share: 'off' },
    MODES: { test: mode }, range1: n => Array.from({ length: n }, (_, i) => i + 1), sleep,
    say: words => { speech.push(words); return Promise.resolve(); }, hush() {}, tone() {}, ICON: {}, NATIVE: [], IEYO: String,
    esc: x => x, rewardLabel: () => '', rewardSvg: () => '', clamp: (x, a, b) => Math.min(b, Math.max(a, x)),
    readRecords: () => [], store: { get: () => [], set() {} }, show(view) { element('#v-play').hidden = view !== 'play'; element('#v-done').hidden = view !== 'done'; },
    REG: { closeAll() {}, openBreak(_words, onBack) { back = onBack; } } };
  const context = { SC, console, Set, Map, Promise, structuredClone, setTimeout, clearTimeout: id => timers.delete(id),
    Date: { now: () => now }, navigator: {}, innerHeight: 900, innerWidth: 1200, addEventListener() {},
    document: { body: { appendChild() {} }, createElement: () => element('created-' + elements.size), addEventListener() {} } };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/play.js'), 'utf8'), context);
  async function tick(ms) {
    const end = now + ms;
    for (let i = 0; i < 20; i++) await Promise.resolve();
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    }
    now = end;
  }
  return { SC, element, speech, tick, back: () => back(),
    start: () => SC.start('test'), digit: (k = '1') => element('#pad').click({ k }),
    demo: () => element('#demoBtn').click(), rest: () => element('#askRestBtn').click(),
    overlay: () => [...elements.values()].find(el => el.className === 'veil') };
}

const tests = [
  ['old keypad timer cannot unlock a new session', async h => {
    h.start(); h.digit(); h.start(); h.SC.G.lock = true;
    await h.tick(280); assert.equal(h.SC.G.lock, true);
  }],
  ['old first-demo timer cannot start a demo in a new session', async h => {
    h.SC.cfg.demo = 'first'; h.start(); h.SC.cfg.demo = 'off'; h.start();
    await h.tick(500); assert.equal(!!h.SC.G.demo, false);
  }],
  ['pending keypad answer waits for break return', async h => {
    h.start(); h.digit(); h.rest(); await h.tick(280);
    assert.equal(h.SC.G.done, 0); assert.equal(h.SC.G.answered, false);
    h.back(); await h.tick(280); assert.equal(h.SC.G.done, 1);
  }],
  ['old demo cannot answer or hide a replacement demo', async h => {
    h.start(); h.demo(); await h.tick(100); h.start(); h.demo();
    await h.tick(450); assert.equal(h.SC.G.input, ''); assert.equal(h.overlay().hidden, false);
  }],
  ['demo cancels pending student submission', async h => {
    h.start(); h.digit(); h.demo(); h.SC.G.lock = true; await h.tick(280);
    assert.equal(h.SC.G.lock, true); assert.equal(h.SC.G.done, 0);
  }],
  ['new session resets quit confirmation', async h => {
    h.start(); h.element('#quitBtn').click(); h.start();
    assert.equal(h.element('#quitBtn').classList.contains('sure'), false);
  }],
  ['cue interrupted by a new session does not speak or rearm', async h => {
    h.start(); await h.tick(2500); h.start(); const count = h.speech.length;
    await h.tick(250); assert.equal(h.speech.length, count);
  }],
  ['old ghost timer cannot point into a new problem', async h => {
    h.start(); h.digit('2'); await h.tick(280); h.start();
    const count = h.speech.length; await h.tick(1200);
    assert.equal(h.speech.length, count);
  }],
  ['cue speech resets for a fresh session', async h => {
    h.start(); await h.tick(2750); h.start(); const count = h.speech.length;
    await h.tick(2750); assert.equal(h.speech.length, count + 1);
  }]
];

(async () => {
  let failures = 0;
  for (const [name, test] of tests) {
    try { await test(harness()); console.log('PASS ' + name); }
    catch (error) { failures++; console.error('FAIL ' + name + ': ' + error.message); }
  }
  if (failures) process.exitCode = 1;
  else console.log(`Lifecycle: ${tests.length} checks passed`);
})();
