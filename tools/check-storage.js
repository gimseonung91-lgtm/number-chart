const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./load');

function stored(value) {
  return load({ storage: { getItem: () => JSON.stringify(value), setItem() {} } });
}

test('null settings recover to defaults instead of stopping startup', () => {
  assert.equal(stored(null).cfg.range, 50);
});
test('invalid setting values cannot reach problem generators', () => {
  const app = stored({ v: 3, range: 0, level: 12, small: -1, choiceN: 100,
    count: -1, help: 'unknown', sound: 'false', rewardIcon: 'missing', extra: 123 });
  assert.equal(app.cfg.range, 50);
  assert.equal(app.cfg.level, 1);
  assert.equal(app.cfg.small, 5);
  assert.equal(app.cfg.choiceN, 2);
  assert.equal(app.cfg.count, 10);
  assert.equal(app.cfg.help, 'lots');
  assert.equal(app.cfg.sound, true);
  assert.equal(app.cfg.rewardIcon, 'block');
  assert.equal('extra' in app.cfg, false);
});
test('valid v3 preferences and legacy migration are preserved', () => {
  const app = stored({ v: 3, range: 100, voice: false, answer: 'pad', blanks: 99, restCards: 0 });
  assert.equal(app.cfg.range, 100);
  assert.equal(app.cfg.voice, false);
  assert.equal(app.cfg.answer, 'pad');
  assert.equal(app.cfg.restCards, 0);
  const legacy = stored({ v: 2, range: 30, voice: false, answer: 'pad' });
  assert.equal(legacy.cfg.range, 30);
  assert.equal(legacy.cfg.voice, true);
  assert.equal(legacy.cfg.answer, 'choice');
});
test('blocked storage and invalid JSON keep the app usable', () => {
  assert.equal(load({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } }).cfg.range, 50);
  assert.equal(load({ storage: { getItem: () => '{bad', setItem() {} } }).cfg.range, 50);
});

test('saving normalizes in place and preserves shared cfg identity', () => {
  const app = load(), cfg = app.cfg;
  cfg.range = -1; cfg.blanks = 120; cfg.voice = false;
  app.saveCfg();
  assert.equal(app.cfg, cfg);
  assert.equal(cfg.range, 50);
  assert.equal(cfg.blanks, 99);
  assert.equal(cfg.voice, false);
  for (const invalid of [null, [], 42, 'settings']) assert.equal(stored(invalid).cfg.range, 50);
});

test('records reject malformed entries but preserve old and current records without rewriting storage', () => {
  const legacy = { t: 1700000000000, mode: 'near', total: 10, first: 7, range: 50, level: 2, help: 'some' };
  const current = { ...legacy, done: 4, first: 3, askHelp: 1, askRest: 2, moodStart: 'hard', stopped: true };
  let writes = [];
  const read = value => load({ storage: {
    getItem: key => key === 'suchart_rec' ? JSON.stringify(value) : null,
    setItem: (key, val) => writes.push([key, val])
  } }).readRecords();
  for (const value of [null, {}, 'records', 3]) assert.equal(read(value).length, 0);
  const actual = read([null, 'bad', { ...legacy, mode: '<img>' }, { ...legacy, first: '7' },
    { ...legacy, range: 0 }, { ...legacy, done: 100 }, current, legacy]);
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), [current, legacy]);
  assert.equal(writes.some(([key]) => key === 'suchart_rec'), false);
});
