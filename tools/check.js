/* 자동 점검: node tools/check.js
   모든 설정 조합에서 놀이마다 문제를 수백 개씩 만들어 보고 다음을 확인한다.
   1) 정답이 맞는가 (놀이마다 정답의 정의대로)
   2) 고르기 보기에 정답이 하나 있고, 서로 다르며, 범위 안에 있는가
   3) 말하는 모든 조각이 녹음된 음성 조각 목록에 있는가 (없으면 기기 목소리로 바뀌어 어색해진다)
   4) 녹음 파일(audio/clips.js)에 목록의 조각이 다 들어 있는가 */
const fs = require('fs'), path = require('path');
const SC = require('./load')();
const M = SC.MODES, cfg = SC.cfg;
const units = new Set(SC.voiceUnits().map(x => x[0]));
const keyOf = u => String(u).trim().replace(/[.,!?]+$/, '');
const errors = [];
const fail = (where, msg) => { if (errors.length < 30) errors.push(`${where}: ${msg}`); };
const missing = new Set();
const speak = arr => (arr || []).forEach(u => { if (!units.has(keyOf(u))) missing.add(keyOf(u)); });
let problems = 0;

function checkAnswer(m, G, p, where) {
  const R = G.R;
  if (!Number.isInteger(p.ans) || p.ans < 1) fail(where, `정답이 이상함 ${p.ans}`);
  if (m === 'count' || m === 'flash') { if (p.ans !== p.n || p.n > cfg.small) fail(where, `n=${p.n}`); }
  if (m === 'count' && p.cells.size !== p.n) fail(where, '그림 수와 정답이 다름');
  if (m === 'stair') { if (p.ans !== p.k + (p.dir === 'more' ? 1 : -1) || p.ans < 1 || p.ans > cfg.small) fail(where, `k=${p.k} ans=${p.ans}`); }
  if (m === 'ten') { if (p.t * 10 + p.o !== p.n || p.n < 10 || p.n > Math.max(R, 20)) fail(where, `n=${p.n}`); }
  if (m === 'board') { if (p.ans !== G.cur || !G.blanks.has(G.cur)) fail(where, '노란 칸이 빈칸이 아님'); }
  if (m === 'near') { if (p.ans !== SC.nb(p.c, p.dir, R)) fail(where, `c=${p.c} dir=${p.dir}`); if (!SC.LEVEL_DIRS[cfg.level].includes(p.dir)) fail(where, '단계에 없는 방향'); }
  if (m === 'cmp') { if (p.a === p.b || p.ans !== (p.ask === 'big' ? Math.max(p.a, p.b) : Math.min(p.a, p.b))) fail(where, `${p.a},${p.b}`); }
  if (m === 'seq') {
    p.seq.forEach((x, i) => { if (x < 1 || x > R || (i && x - p.seq[i - 1] !== p.s)) fail(where, `수열 ${p.seq}`); });
    if (p.ans !== p.seq[p.miss]) fail(where, '빈칸 정답');
  }
}
function checkOpts(p, G, where) {
  const opts = SC.makeOpts(p, G.R), top = Math.max(G.R, 10, cfg.small);
  if (opts.filter(x => x === p.ans).length !== 1) fail(where, `보기에 정답이 없음 ${opts}`);
  if (new Set(opts).size !== opts.length) fail(where, `같은 보기 ${opts}`);
  if (opts.length !== cfg.choiceN) fail(where, `보기 수 ${opts.length}`);
  if (opts.some(x => x < 1 || x > top)) fail(where, `범위 밖 보기 ${opts}`);
}

for (const small of [5, 10]) for (const range of [20, 30, 50, 100]) for (const level of [1, 2, 3]) for (const choiceN of [2, 3]) {
  Object.assign(cfg, { small, range, level, choiceN, answer: 'choice', help: 'lots', blanks: 15 });
  for (const m of Object.keys(M)) {
    speak([M[m].label + '.']);
    const G = { mode: m, R: range, prev: null, done: 0, tries: 0, input: '', answered: false, wrong: new Set() };
    if (M[m].init) M[m].init(G);
    for (let i = 0; i < 200; i++) {
      const where = `${m} small=${small} range=${range} level=${level}`;
      if (m === 'board') { if (G.cur == null) { M[m].init(G); } }
      const p = G.p = M[m].gen(G); problems++;
      checkAnswer(m, G, p, where);
      if (p.type === 'input' || m === 'count') checkOpts(p, G, where);
      if (m === 'count') { speak(M[m].speak(G)); speak(M[m].hintSay(G)); p.order = [...p.cells]; p.type = 'pick'; }
      [M[m].speak(G), M[m].hintSay(G), M[m].goodSay(G)].forEach(speak);
      (M[m].look ? M[m].look(G) : []).forEach(s => speak(s.say));
      speak([SC.IEYO(p.ans) + '.']);
      if (m === 'board') { M[m].advance(G); M[m].next(G); }
    }
  }
}
for (const k of Object.keys(SC.REWARDS)) speak([`이제 ${SC.REWARDS[k].label} 시간이에요.`]);
for (let k = 1; k <= 10; k++) speak([SC.NATIVE[k]]);
/* 놀이 엔진·SCERTS 화면이 say·openBreak·openRest·runDemo로 직접 말하는 고정 문장도 녹음 목록에 있는지 */
for (const f of ['play.js', 'scerts.js']) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  for (const call of src.match(/(say|openBreak|openRest|runDemo)\((\w+, )?\[[^\]]*\]/g) || []) for (const q of call.match(/'([^'$`]*[가-힣][^'$`]*)'/g) || []) speak([q.slice(1, -1)]);
}
['좋아요', '그저 그래요', '힘들어요'].forEach(l => speak([l + '.']));
if (missing.size) fail('음성', `목록에 없는 조각 ${[...missing].join(', ')}`);

/* 녹음 파일과 목록 비교 */
const clipsPath = path.join(__dirname, '..', 'audio', 'clips.js');
if (fs.existsSync(clipsPath)) {
  const src = fs.readFileSync(clipsPath, 'utf8');
  const clips = JSON.parse(src.slice(src.indexOf('SC.CLIPS = ') + 11).trim().replace(/;$/, ''));
  const noClip = [...units].filter(u => !clips[u]);
  if (noClip.length) fail('음성', `녹음이 없는 조각 ${noClip.length}개 (python tools/make_voice.py로 다시 만드세요): ${noClip.slice(0, 8).join(', ')}`);
} else fail('음성', 'audio/clips.js가 없어요');

if (errors.length) { console.error('문제 발견:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`통과: 문제 ${problems}개, 음성 조각 ${units.size}개 모두 확인`);
