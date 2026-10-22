/* config.js — 저장된 설정을 읽는 경계. 허용된 값만 놀이와 화면에 전달한다. */
(function (SC) {
'use strict';
const DEF = {
  v: 3, range: 50, blanks: 8, order: true, help: 'lots', sound: true, voice: true, calm: false,
  answer: 'choice', choiceN: 2, count: 10, level: 1, small: 5, flash: false, demo: 'first',
  reward: '', rewardIcon: 'block', askBtns: true, mood: 'both', breakSec: 30, share: 'end',
  offerBreak: true, restCards: 3, restWait: 1
};
const OPTIONS = {
  range: [20, 30, 50, 100], count: [5, 10, 15, 20], level: [1, 2, 3], small: [5, 10], choiceN: [2, 3],
  help: ['lots', 'some', 'none'], answer: ['choice', 'pad'], demo: ['first', 'button'],
  mood: ['both', 'start', 'off'], breakSec: [20, 30, 60, 120], share: ['end', 'mid', 'off'],
  restCards: [0, 1, 2, 3], restWait: [1, 2, 3], rewardIcon: Object.keys(SC.REWARDS)
};
function normalizeCfg(value) {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const next = { ...DEF };
  for (const key of Object.keys(DEF)) {
    if (!Object.prototype.hasOwnProperty.call(saved, key)) continue;
    const v = saved[key];
    if (OPTIONS[key]) { if (OPTIONS[key].includes(v)) next[key] = v; }
    else if (typeof DEF[key] === 'boolean' && typeof v === 'boolean') next[key] = v;
    else if (key === 'blanks' && Number.isInteger(v)) next[key] = SC.clamp(v, 1, 99);
    else if (key === 'reward' && typeof v === 'string') next[key] = v.slice(0, 20);
  }
  // 이전 판 설정에서는 소리 안내와 고르기를 켜던 기존 마이그레이션을 유지한다.
  if (saved.v !== DEF.v) { next.voice = true; next.answer = 'choice'; }
  return next;
}
const cfg = normalizeCfg(SC.store.get('cfg', {}));
function saveCfg() {
  Object.assign(cfg, normalizeCfg(cfg));
  SC.store.set('cfg', cfg);
  document.documentElement.classList.toggle('calm', cfg.calm);
}
Object.assign(SC, { cfg, saveCfg, normalizeCfg });
saveCfg();
})(window.SC);
