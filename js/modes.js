/* modes.js — 놀이 8가지. 놀이마다 같은 모양의 약속(문제 만들기, 화면, 그림 지시, 말, 힌트, 칭찬, 보여 주기 순서)을 지킨다.
   놀이 엔진(play.js)은 이 약속만 보고 움직이므로, 새 놀이를 더할 때는 여기에 하나만 더하면 된다. */
(function (SC) {
'use strict';
const { rnd, pick, sample, range1, plain, EUN, EUL, IEYO, GWA, NATIVE, ICON, cfg } = SC;

/* ---------- 수 배열표의 방향 ---------- */
const DIR = {
  L: { d: -1, name: '왼쪽', rel: '1 작은 수', cls: 'dl', adj: '작아요', amt: 1, sign: '−1', arrow: '←' },
  R: { d: 1, name: '오른쪽', rel: '1 큰 수', cls: 'dr', adj: '커요', amt: 1, sign: '+1', arrow: '→' },
  U: { d: -10, name: '위', rel: '10 작은 수', cls: 'du', adj: '작아요', amt: 10, sign: '−10', arrow: '↑' },
  D: { d: 10, name: '아래', rel: '10 큰 수', cls: 'dd', adj: '커요', amt: 10, sign: '+10', arrow: '↓' }
};
const LEVEL_DIRS = { 1: ['L', 'R'], 2: ['U', 'D'], 3: ['L', 'R', 'U', 'D'] };
/* 1~R 수 배열표에서 n의 이웃 (없으면 null) */
function nb(n, dir, R) {
  if (dir === 'L') return n % 10 !== 1 ? n - 1 : null;
  if (dir === 'R') return (n % 10 !== 0 && n + 1 <= R) ? n + 1 : null;
  if (dir === 'U') return n - 10 >= 1 ? n - 10 : null;
  if (dir === 'D') return n + 10 <= R ? n + 10 : null;
  return null;
}
const stepCls = s => s === 1 ? 'dr' : s === -1 ? 'dl' : s === 10 ? 'dd' : 'du';
const stepText = s => s === 1 ? '1 큰' : s === -1 ? '1 작은' : s === 10 ? '10 큰' : '10 작은';
const stepSign = s => (s > 0 ? '+' : '−') + Math.abs(s);

/* ---------- 그림 지시에 쓰는 작은 조각 ---------- */
const g = {
  n: (v, cls) => `<span class="gl ${cls || ''}">${v}</span>`,
  q: () => '<span class="gl q">?</span>',
  icon: svg => `<span class="gl plain">${svg}</span>`,
  arrow: (cls, label, a) => `<span class="garrow ${cls}"><b>${a || '→'}</b>${label || ''}</span>`,
  dots: k => `<span class="gl"><span class="gdots">${'<i></i>'.repeat(k)}</span></span>`
};
/* 답하는 방법에 맞는 동사 */
const verb = () => cfg.answer === 'choice' ? '골라요.' : '눌러요.';
/* 방향별로 말할 조각 */
const RELSAY = { L: ['1 작은 수를', '1 작은 수예요.', '1 작아요.'], R: ['1 큰 수를', '1 큰 수예요.', '1 커요.'], U: ['10 작은 수를', '10 작은 수예요.', '10 작아요.'], D: ['10 큰 수를', '10 큰 수예요.', '10 커요.'] };
/* 직전과 같은 문제를 피해서 1~small 사이의 수 하나 */
function smallN(G) { let n, t = 0; do { n = rnd(1, cfg.small); t++; } while (n === G.prev && t < 20); G.prev = n; return n; }

const SHAPES = {
  circle: '<circle cx="12" cy="12" r="10"/>',
  star: '<path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 6.9L12 17.6l-6.3 3.3 1.3-6.9L1.9 9.1l7-.9z"/>',
  heart: '<path d="M12 21.5s-8.2-5-10.1-10C.4 7.6 2.8 3.5 6.7 3.5c2.3 0 3.9 1.3 5.3 3 1.4-1.7 3-3 5.3-3 3.9 0 6.3 4.1 4.8 8-1.9 5-10.1 10-10.1 10z"/>',
  tri: '<path d="M12 2.5l10.5 18.5h-21z"/>'
};

const M = {};

/* ====================== 기초 다지기 ====================== */

/* 1. 하나씩 세어 보기 — 일대일 대응, 안정된 순서, 기수의 원리, 수의 보존 */
M.count = {
  label: '하나씩 세어 보기', basic: true, dots: true,
  gen(G) {
    const n = smallN(G), slots = Math.max(8, Math.ceil(n / 4) * 4);
    const cells = Math.random() < .5 ? sample(range1(slots).map(i => i - 1), n) : range1(n).map(i => i - 1);
    return { type: 'tap', n, ans: n, cells: new Set(cells), slots, shape: pick(Object.keys(SHAPES)), order: [], distract: [n + 1, n - 1, n + 2] };
  },
  stage(G, E) {
    const p = G.p, svg = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SHAPES[p.shape]}</svg>`;
    let h = '<div class="objs">';
    for (let i = 0; i < p.slots; i++) {
      if (!p.cells.has(i)) { h += '<span class="obj e"></span>'; continue; }
      const k = p.order.indexOf(i) + 1;
      h += `<button class="obj${k ? ' counted' : ''}${k && k === p.n ? ' last' : ''}" data-obj="${i}" aria-label="${k ? k + '번째' : '아직 안 셈'}">${svg}${k ? `<span class="badge">${k}</span>` : ''}</button>`;
    }
    h += '</div>';
    const k = p.order.length;
    h += `<div class="counter" aria-live="polite">${k ? `<b>${NATIVE[k]}</b>` : '&nbsp;'}</div>`;
    if (p.type !== 'tap') h += E.ansBox();
    if (G.answered) h += SC.ncard(p.n);
    return h;
  },
  glyphs: G => G.p.type === 'tap'
    ? g.icon(ICON.hand) + g.n('1') + g.n('2') + g.n('3')
    : g.icon(ICON.eye) + g.arrow('', '') + g.q(),
  text: G => G.p.type === 'tap' ? '하나씩 눌러서 세어 보세요.' : '모두 몇 개일까요?',
  speak: G => G.p.type === 'tap' ? ['하나씩 눌러서 세어요.'] : ['모두 몇 개예요?', verb()],
  hint: G => G.p.type === 'tap' ? '하나를 누를 때마다 한 번씩 세어요.' : '<b>마지막에 센 수</b>가 모두의 수예요.',
  hintSay: G => G.p.type === 'tap' ? ['하나를 누를 때마다 한 번씩 세어요.'] : ['마지막에 센 수가 모두의 수예요.'],
  good: G => `<strong>맞았어요!</strong> 모두 ${NATIVE[G.p.n]}, ${IEYO(G.p.n)}.`,
  goodSay: G => ['맞았어요!', '모두 ' + NATIVE[G.p.n] + ',', IEYO(G.p.n) + '.'],
  look: G => G.p.type === 'tap' ? [] : [{ sel: '.obj.last', say: ['마지막에 센 수는', NATIVE[G.p.n] + '.', '모두', G.p.n + '.'] }]
};

/* 2. 한눈에 보기 — 즉각적 인지, 5와 10의 구조, 수의 여러 가지 표현 */
M.flash = {
  label: '한눈에 보기', basic: true, dots: true,
  gen(G) {
    const n = smallN(G);
    return { type: 'input', n, ans: n, kind: n <= 6 && Math.random() < .4 ? 'dice' : 'frame', split: n >= 3 && Math.random() < .5 ? rnd(1, n - 1) : 0, covered: false, distract: [n + 1, n - 1, n + 2] };
  },
  stage(G, E) {
    const p = G.p, A = p.split || p.n;
    const dot = i => i < p.n ? `<span class="dot${i >= A ? ' b' : ''}"></span>` : '';
    let h = '<div class="flashbox">';
    if (p.kind === 'dice') {
      const POS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[p.n];
      h += '<div class="dice">' + range1(9).map(c => { const j = POS.indexOf(c - 1); return `<span>${j >= 0 ? dot(j) : ''}</span>`; }).join('') + '</div>';
    } else {
      h += `<div class="tframe">${range1(cfg.small === 5 ? 5 : 10).map(c => `<span>${dot(c - 1)}</span>`).join('')}</div>`;
    }
    if (p.covered && !G.answered) h += `<div class="cover">${ICON.eye}</div>`;
    h += '</div>';
    if (p.covered && !G.answered) h += `<button class="again" data-again>${ICON.eye} 다시 보기</button>`;
    h += E.ansBox();
    if (G.answered) h += SC.ncard(p.n);
    return h;
  },
  /* 점을 잠깐만 보여 주는 설정이면 2초 뒤 가린다 */
  after(G, E) {
    const p = G.p;
    if (!cfg.flash || p.covered || G.answered || G.demo || p.timer) return;
    p.timer = setTimeout(() => { p.timer = null; if (SC.G === G && G.p === p && !G.answered && !G.demo) { p.covered = true; E.render(); } }, 2000);
  },
  glyphs: () => g.icon(ICON.eye) + g.arrow('', '') + g.q(),
  text: () => '점이 몇 개일까요?',
  speak: () => ['점이 몇 개예요?', verb()],
  hint: G => G.p.n > 5 && G.p.kind === 'frame' ? '윗줄이 꽉 차면 5예요. <b>5 다음부터</b> 세어요.' : '점을 하나씩 짚으며 세어요.',
  hintSay: G => G.p.n > 5 && G.p.kind === 'frame' ? ['윗줄이 꽉 차면 5예요.', '5 다음부터 세어요.'] : ['점을 하나씩 짚으며 세어요.'],
  goodSay(G) {
    const p = G.p, out = ['맞았어요!', IEYO(p.n) + '.'];
    if (p.split) out.push(GWA(p.split), EUL(p.n - p.split), '모으면', p.n + '.');
    else if (p.kind === 'frame' && p.n > 5) out.push(GWA(5), EUL(p.n - 5), '모으면', p.n + '.');
    return out;
  },
  good(G) {
    const p = G.p;
    const tail = p.split ? ` ${GWA(p.split)} ${EUL(p.n - p.split)} 모으면 ${p.n}.` : (p.kind === 'frame' && p.n > 5 ? ` ${GWA(5)} ${EUL(p.n - 5)} 모으면 ${p.n}.` : '');
    return `<strong>맞았어요!</strong> ${IEYO(p.n)}${tail}`;
  },
  look: G => [{ sel: '.flashbox', say: G.p.split ? [GWA(G.p.split), (G.p.n - G.p.split) + '.'] : ['점을 잘 봐요.'] }]
};

M.stair = {
  label: '블록 계단', basic: true, dots: true,
  gen(G) {
    const N = cfg.small; let k, dir, t = 0;
    do { dir = Math.random() < .5 ? 'more' : 'less'; k = dir === 'more' ? rnd(1, N - 1) : rnd(2, N); t++; } while (G.prev === k + dir && t < 30);
    G.prev = k + dir; const ans = dir === 'more' ? k + 1 : k - 1;
    return { type: 'input', k, dir, ans, distract: [k, dir === 'more' ? k - 1 : k + 1, ans + 1] };
  },
  stage(G, E) {
    const p = G.p, N = cfg.small; let h = `<div class="stairs n${N}" aria-label="블록 계단">`;
    for (let c = 1; c <= N; c++) {
      const isK = c === p.k, isA = c === p.ans;
      const card = isA ? `<span class="scard q">${E.slot()}</span>` : `<span class="scard${isK ? ' k' : ''}${!isK && !G.answered && cfg.help === 'none' ? ' hide' : ''}">${c}</span>`;
      let blocks = '';
      for (let b = 1; b <= c; b++) blocks += `<span class="blk${isK && p.dir === 'less' && b === c ? ' lift' : ''}"></span>`;
      if (isK && p.dir === 'more') blocks += '<span class="blk add"></span>';
      h += `<div class="scol${isK ? ' k' : ''}${isA ? ' a' : ''}">${card}${blocks}</div>`;
    }
    h += '</div>';
    if (G.answered) h += SC.ncard(p.ans);
    return h;
  },
  glyphs: G => G.p.dir === 'more' ? g.n(G.p.k, 'k') + g.arrow('dr', '+1') + g.q() : g.n(G.p.k, 'k') + g.arrow('dl', '−1') + g.q(),
  text: G => G.p.dir === 'more' ? `${G.p.k}보다 <b class="dr">1 큰 수</b>는?` : `${G.p.k}보다 <b class="dl">1 작은 수</b>는?`,
  speak: G => [G.p.k + '보다', G.p.dir === 'more' ? '1 큰 수를' : '1 작은 수를', verb()],
  hint: () => '블록 높이가 <b>똑같은 계단</b>을 찾아요.',
  hintSay: () => ['블록 높이가 똑같은 계단을 찾아요.'],
  goodSay: G => G.p.dir === 'more' ? ['맞았어요!', EUN(G.p.ans), G.p.k + '보다', '1 커요.', '하나 더 많아요.'] : ['맞았어요!', EUN(G.p.ans), G.p.k + '보다', '1 작아요.', '하나 더 적어요.'],
  good: G => G.p.dir === 'more'
    ? `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.k}보다 1 커요. 하나 더 많아요.`
    : `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.k}보다 1 작아요. 하나 더 적어요.`,
  look: G => [
    { sel: '.scol.k .scard', say: [G.p.k + '.'] },
    { sel: G.p.dir === 'more' ? '.blk.add' : '.blk.lift', say: [G.p.dir === 'more' ? '블록을 하나 올려요.' : '블록을 하나 내려요.'] },
    { sel: '.scol.a', say: ['높이가 같아요.'] }
  ]
};

/* 4. 10 묶음 — 십진기수법: 23은 10이 2개, 1이 3개 */
M.ten = {
  label: '10 묶음', basic: false,
  gen(G) {
    const R = Math.max(cfg.range, 20); let n, t = 0;
    do { n = rnd(10, R); t++; } while (n === G.prev && t < 30); G.prev = n;
    const tt = Math.floor(n / 10), o = n % 10, swap = o * 10 + tt;
    return { type: 'input', n, ans: n, t: tt, o, distract: [o > 0 && swap !== n ? swap : n + 10, n - 10, n + 1] };
  },
  stage(G, E) {
    const p = G.p, label = E.showHint() || cfg.help === 'lots' || G.answered;
    const bar = '<span class="tbar">' + '<i></i>'.repeat(10) + '</span>';
    let h = '<div class="tens-wrap">';
    h += `<div class="tgroup tg10"><div class="row">${bar.repeat(p.t)}</div><span class="tlab">${label ? `10이 <b>${p.t}</b>개` : '&nbsp;'}</span></div>`;
    h += `<div class="tgroup tg1"><div class="row ones">${'<span class="tone"></span>'.repeat(p.o)}</div><span class="tlab">${label ? `1이 <b>${p.o}</b>개` : '&nbsp;'}</span></div>`;
    return h + '</div>' + E.ansBox();
  },
  glyphs: () => g.n('<span class="gbar"><i></i><i></i><i class="o"></i><i class="o"></i></span>') + g.arrow('', '') + g.q(),
  text: () => '블록은 모두 몇 개일까요?',
  speak: () => ['블록이 모두 몇 개예요?', verb()],
  hint: G => `10 묶음이 ${G.p.t}개면 <b>${G.p.t * 10}</b>. 그다음 낱개를 이어서 세어요.`,
  hintSay: () => ['10 묶음을 먼저 세어요.', '그다음 낱개를 이어서 세어요.'],
  goodSay: G => G.p.o ? ['맞았어요!', GWA(G.p.t * 10), EUL(G.p.o), '모으면', G.p.n + '.'] : ['맞았어요!', IEYO(G.p.n) + '.'],
  good: G => `<strong>맞았어요!</strong> ${EUN(G.p.n)} 10이 ${G.p.t}개${G.p.o ? `, 1이 ${G.p.o}개예요. ${GWA(G.p.t * 10)} ${EUL(G.p.o)} 모으면 ${G.p.n}.` : '예요.'}`,
  look: G => [
    { sel: '.tg10 .row', say: ['10 묶음이', G.p.t + '개.', G.p.t * 10 + '.'] },
    G.p.o ? { sel: '.tg1 .row', say: ['낱개가', G.p.o + '개.'] } : null
  ].filter(Boolean)
};

/* ====================== 수 배열표 놀이 ====================== */

/* 수 배열표에서 빈칸 n의 힌트: 이미 보이는 이웃을 기준으로 말해 준다 */
function boardHint(G, n) {
  const vis = x => x != null && (!G.blanks.has(x) || G.filled.has(x));
  const order = [['L', 'dr', '1 큰 수', '왼쪽 수'], ['U', 'dd', '10 큰 수', '위의 수'], ['R', 'dl', '1 작은 수', '오른쪽 수'], ['D', 'du', '10 작은 수', '아래 수']];
  for (const [d, cls, rel, where] of order) {
    const ref = nb(n, d, G.R);
    if (vis(ref)) return { ref, d, text: `${where} ${ref}보다 <b class="${cls}">${rel}</b>예요.`, good: `${EUN(n)} ${ref}보다 ${rel}예요.`,
      say: [where, ref + '보다', rel + '예요.'], goodSay: [EUN(n), ref + '보다', rel + '예요.'] };
  }
  return { ref: null, text: '1부터 차례대로 세어 봐요.', good: '', say: ['1부터 차례대로 세어 봐요.'], goodSay: [] };
}
M.board = {
  label: '수 배열표 채우기',
  init(G) {
    const n = SC.clamp(cfg.blanks, 1, G.R - 1);
    G.blanks = new Set(sample(range1(G.R), n)); G.filled = new Set(); G.total = n; G.cur = this.nextBlank(G);
  },
  nextBlank(G) { const list = [...G.blanks].filter(x => !G.filled.has(x)).sort((a, b) => a - b); return list.length ? list[0] : null; },
  gen: G => ({ type: 'input', ans: G.cur, distract: [G.cur + 1, G.cur - 1, G.cur + 10, G.cur - 10] }),
  advance(G) { G.filled.add(G.cur); },
  next(G) { G.cur = this.nextBlank(G); },
  stage(G, E) {
    const R = G.R, rows = R / 10, hint = E.showHint() ? boardHint(G, G.cur) : null; let h = '<div class="board" aria-label="수 배열표">';
    for (let n = 1; n <= R; n++) {
      const col = (n - 1) % 10 + 1, row = Math.ceil(n / 10);
      let cls = 'cell' + (col === 5 ? ' c5' : '') + (row === 5 && rows > 5 ? ' r5' : ''), txt = n, attr = '';
      if (G.blanks.has(n) && !G.filled.has(n)) {
        if (n === G.cur) { cls += ' cur'; txt = E.slot() === '?' ? '' : E.slot(); } else { cls += ' blank'; txt = ''; }
        attr = ` data-n="${n}" role="button" tabindex="0" aria-label="빈칸"`;
      } else if (G.filled.has(n)) { cls += ' filled'; if (G.answered && n === G.cur) cls += ' just'; }
      if (hint && hint.ref === n) cls += ' ref';
      h += `<div class="${cls}" data-v="${n}"${attr}>${txt}</div>`;
    }
    return h + '</div>';
  },
  /* 그림 지시: 노란 칸 양옆에 보이는 수를 그대로 보여 준다 (예: 23 ? 25) */
  glyphs(G) {
    const c = G.cur, vis = x => x != null && (!G.blanks.has(x) || G.filled.has(x));
    const l = nb(c, 'L', G.R), r = nb(c, 'R', G.R);
    return (vis(l) ? g.n(l) : '') + g.q() + (vis(r) ? g.n(r) : '');
  },
  text: () => '노란 칸에 들어갈 수는?',
  speak: () => ['노란 칸에 들어갈 수를', verb()],
  hint: G => boardHint(G, G.cur).text,
  hintSay: G => boardHint(G, G.cur).say,
  goodSay: G => ['맞았어요!', ...boardHint(G, G.cur).goodSay],
  good(G) { const h = boardHint(G, G.cur); return `<strong>맞았어요!</strong> ${h.ref != null ? h.good : ''}`; },
  look(G) {
    const h = boardHint(G, G.cur), out = [{ sel: '.cell.cur', say: ['노란 칸이에요.'] }];
    if (h.ref != null) out.push({ sel: `.cell[data-v="${h.ref}"]`, say: h.say });
    return out;
  }
};


M.near = {
  label: '이웃 수 찾기',
  gen(G) {
    const R = G.R, dirs = LEVEL_DIRS[cfg.level]; let c, dir, ans, t = 0;
    do { c = rnd(1, R); dir = pick(dirs); ans = nb(c, dir, R); t++; } while ((ans == null || G.prev === c + dir) && t < 800);
    G.prev = c + dir; const D = DIR[dir];
    return { type: 'input', c, dir, ans, distract: [c, c - D.d, ans + (D.amt === 1 ? 10 : 1), ans - (D.amt === 1 ? 10 : 1)] };
  },
  stage(G, E) {
    const p = G.p, dirs = LEVEL_DIRS[cfg.level];
    /* 1단계는 가로 한 줄, 2단계는 세로 한 줄만 써서 빈 공간이 생기지 않게 한다 */
    const AREA = cfg.level === 1 ? { L: '1/1', C: '1/2', R: '1/3' } : cfg.level === 2 ? { U: '1/1', C: '2/1', D: '3/1' } : { U: '1/2', L: '2/1', C: '2/2', R: '2/3', D: '3/2' };
    const shape = cfg.level === 1 ? 'grid-template-rows:var(--xs)' : cfg.level === 2 ? 'grid-template-columns:var(--xs)' : '';
    let h = `<div class="cross" style="${shape}"><div class="xc center" style="grid-area:${AREA.C}">${p.c}</div>`;
    for (const d of ['U', 'L', 'R', 'D']) {
      const D = DIR[d], v = nb(p.c, d, G.R);
      if (d === p.dir) h += `<div class="xc ask ${D.cls}${G.answered ? ' just' : ''}" style="grid-area:${AREA[d]}"><span class="xn">${E.slot()}</span><span class="xl">${D.sign}</span></div>`;
      else if (cfg.help === 'lots' && dirs.includes(d) && v != null) h += `<div class="xc model ${D.cls}" style="grid-area:${AREA[d]}"><span class="xn">${v}</span><span class="xl">${D.sign}</span></div>`;
    }
    h += '</div>';
    if (E.showHint() || G.answered) h += strip(G, p.c, p.dir);
    return h;
  },
  glyphs(G) {
    const p = G.p, D = DIR[p.dir], c = g.n(p.c, 'k'), a = g.arrow(D.cls, D.sign, D.arrow);
    return p.dir === 'L' ? g.q() + a + c : c + a + g.q();
  },
  text: G => `${G.p.c}보다 <b class="${DIR[G.p.dir].cls}">${DIR[G.p.dir].rel}</b>는?`,
  speak: G => [G.p.c + '보다', RELSAY[G.p.dir][0], verb()],
  hint: G => `${DIR[G.p.dir].name} 칸은 ${G.p.c}보다 <b class="${DIR[G.p.dir].cls}">${DIR[G.p.dir].rel}</b>예요.`,
  hintSay: G => [DIR[G.p.dir].name + ' 칸은', G.p.c + '보다', RELSAY[G.p.dir][1]],
  goodSay: G => ['맞았어요!', EUN(G.p.ans), G.p.c + '보다', RELSAY[G.p.dir][2]],
  good: G => `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.c}보다 ${DIR[G.p.dir].amt} ${DIR[G.p.dir].adj}.`,
  look: G => [{ sel: '.xc.center', say: [G.p.c + '.'] }, { sel: '.xc.ask', say: [DIR[G.p.dir].name + ' 칸은', G.p.c + '보다', RELSAY[G.p.dir][1]] }]
};
function strip(G, c, dir) {
  const R = G.R, ans = c + DIR[dir].d, vert = dir === 'U' || dir === 'D', cells = [];
  if (!vert) { const s = Math.floor((c - 1) / 10) * 10 + 1; for (let x = s; x <= Math.min(s + 9, R); x++) cells.push(x); }
  else for (let x = c - 20; x <= c + 20; x += 10) if (x >= 1 && x <= R) cells.push(x);
  return `<div class="strip${vert ? ' vert' : ''}" aria-hidden="true">${cells.map(x => `<span class="${x === c ? 'sc' : ''}${x === ans ? ' sa' : ''}">${x === ans && !G.answered ? '?' : x}</span>`).join('')}</div>`;
}

M.cmp = {
  label: '더 큰 수, 더 작은 수',
  gen(G) {
    const R = G.R; let a, b, t = 0;
    do { a = rnd(1, R); b = rnd(1, R); t++; } while ((a === b || G.prev === a * 1000 + b) && t < 200);
    G.prev = a * 1000 + b; const ask = Math.random() < .5 ? 'big' : 'small';
    return { type: 'cmp', a, b, ask, ans: ask === 'big' ? Math.max(a, b) : Math.min(a, b) };
  },
  stage(G, E) {
    const p = G.p; let h = '<div class="pair">';
    for (const x of [p.a, p.b]) {
      let c = 'card'; if (G.wrong.has(x)) c += ' dim'; if (G.answered && x === p.ans) c += ' right'; if (E.showGhost() && x === p.ans) c += ' cue';
      h += `<button class="${c}" data-pick="${x}">${x}</button>`;
    }
    h += '</div>';
    if (E.showHint() || G.answered || cfg.help === 'lots') {
      const big = Math.max(p.a, p.b), sm = Math.min(p.a, p.b);
      h += '<div class="mini" aria-hidden="true">' + range1(G.R).map(n => `<span class="${n === big ? 'big' : n === sm ? 'small' : ''}">${n}</span>`).join('') + '</div>';
    }
    return h;
  },
  /* 그림 지시: 작은 동그라미와 큰 동그라미 중 찾을 쪽에 손가락 */
  glyphs(G) {
    const big = G.p.ask === 'big';
    return `<span class="gl plain"><span class="gsize ${big ? 'dr' : 'dl'}"><i style="width:16px;height:16px" class="${big ? '' : 'on'}"></i><i style="width:34px;height:34px" class="${big ? 'on' : ''}"></i></span></span>` + g.icon(ICON.hand);
  },
  text: G => G.p.ask === 'big' ? '<b class="dr">더 큰 수</b>를 눌러요.' : '<b class="dl">더 작은 수</b>를 눌러요.',
  speak: G => [G.p.ask === 'big' ? '더 큰 수를 눌러요.' : '더 작은 수를 눌러요.'],
  hint: () => '수 배열표에서 <b>뒤에</b> 있는 수가 더 커요.',
  hintSay: () => ['수 배열표에서 뒤에 있는 수가 더 커요.'],
  goodSay(G) {
    const big = Math.max(G.p.a, G.p.b), sm = Math.min(G.p.a, G.p.b);
    return G.p.ask === 'big' ? ['맞았어요!', EUN(big), sm + '보다', '커요.'] : ['맞았어요!', EUN(sm), big + '보다', '작아요.'];
  },
  good(G) {
    const big = Math.max(G.p.a, G.p.b), sm = Math.min(G.p.a, G.p.b);
    return G.p.ask === 'big' ? `<strong>맞았어요!</strong> ${EUN(big)} ${sm}보다 커요.` : `<strong>맞았어요!</strong> ${EUN(sm)} ${big}보다 작아요.`;
  },
  look: () => [{ sel: '.pair', say: ['두 수를 봐요.'] }, { sel: '.mini', say: ['뒤에 있는 수가 더 커요.'] }]
};

M.seq = {
  label: '수 이어가기',
  gen(G) {
    const R = G.R, len = 4;
    let s = pick({ 1: [1], 2: [10], 3: [1, -1, 10, -10] }[cfg.level]);
    if (Math.abs(s) === 10 && R - 1 < (len - 1) * 10) s = s > 0 ? 1 : -1;
    const span = (len - 1) * Math.abs(s); let start, t = 0;
    do { start = s > 0 ? rnd(1, R - span) : rnd(1 + span, R); t++; } while (G.prev === start * 100 + s && t < 50);
    G.prev = start * 100 + s;
    const seq = range1(len).map((_, i) => start + i * s), miss = rnd(0, len - 1), ans = seq[miss];
    return { type: 'input', seq, miss, s, ans, distract: [ans + s, ans - s, ans + (Math.abs(s) === 1 ? 10 : 1)] };
  },
  stage(G, E) {
    const p = G.p, label = E.showHint() || cfg.help === 'lots' || G.answered; let h = '<div class="seq">';
    p.seq.forEach((x, i) => {
      if (i > 0) h += `<span class="arrow ${stepCls(p.s)}" aria-hidden="true"><b>→</b>${label ? stepSign(p.s) : ''}</span>`;
      h += i === p.miss ? `<div class="sq ask${G.answered ? ' just' : ''}">${E.slot()}</div>` : `<div class="sq">${x}</div>`;
    });
    return h + '</div>';
  },
  glyphs: G => G.p.seq.map((x, i) => (i ? g.arrow(stepCls(G.p.s), '') : '') + (i === G.p.miss ? g.q() : g.n(x))).join(''),
  text: () => '빈칸에 들어갈 수는?',
  speak: () => ['빈칸에 들어갈 수를', verb()],
  hint: G => `${Math.abs(G.p.s)}씩 <b class="${stepCls(G.p.s)}">${G.p.s > 0 ? '커져요' : '작아져요'}</b>.`,
  hintSay: G => [Math.abs(G.p.s) + '씩', G.p.s > 0 ? '커져요.' : '작아져요.'],
  goodSay: G => ['맞았어요!', Math.abs(G.p.s) + '씩', G.p.s > 0 ? '커져요.' : '작아져요.', ...(G.p.s === 10 ? ['10 커져라, 앗!'] : G.p.s === -10 ? ['10 작아져라, 잇!'] : [])],
  good(G) {
    const chant = G.p.s === 10 ? ' 10 커져라, 앗!' : G.p.s === -10 ? ' 10 작아져라, 잇!' : '';
    return `<strong>맞았어요!</strong> ${Math.abs(G.p.s)}씩 ${G.p.s > 0 ? '커져요' : '작아져요'}.${chant}`;
  },
  look: G => [{ sel: '.seq', say: [Math.abs(G.p.s) + '씩', G.p.s > 0 ? '커져요.' : '작아져요.'] }]
};

/* ====================== 순서와 뛰어 세기 (12회차) ======================
   학생은 줄 끝(10)에서 다음 줄 맨 앞(11)으로 넘어가면 '다음 수'인 것을 놓쳤고, '다음'·'전'이라는 말도 어려워했다.
   - 다음 수, 전 수: 한 줄 기차 위에서 '다음' = 오른쪽 = 1 큰 수(주황), '전' = 왼쪽 = 1 작은 수(파랑)
   - 줄 이어 읽기: 한 줄 띠(펼침) → 띠와 배열표를 함께(접힘) → 배열표만. 줄 끝에서 꺾이는 길을 보여 준다
   - 뛰어 세기: 2씩·5씩·10씩. 지나온 칸을 색으로 남겨 무늬가 보이게 */
const WORD = { next: { rel: '다음 수', w: '다음', cls: 'dr', arrow: '→', d: 1, say: '다음 수를', is: '다음 수예요.', rule: '다음 수는 1 큰 수예요.' },
  prev: { rel: '전 수', w: '전', cls: 'dl', arrow: '←', d: -1, say: '전 수를', is: '전 수예요.', rule: '전 수는 1 작은 수예요.' } };
const rowStart = n => Math.floor((n - 1) / 10) * 10 + 1;

/* 다음 수, 전 수 — 순서 낱말을 방향·색·1 큰/작은 수와 하나로 묶는다 */
M.order = {
  label: '다음 수, 전 수',
  gen(G) {
    const R = Math.max(G.R, 20); let ask, c, t = 0;
    do {
      ask = cfg.orderAsk === 'both' ? (Math.random() < .5 ? 'next' : 'prev') : cfg.orderAsk;
      /* 셋 중 하나쯤은 줄 끝(다음)·줄 맨 앞(전) 수로 낸다: 배열표에서 줄이 바뀌는 자리 */
      const edge = Math.random() < .35, rows = range1(Math.floor((R - 1) / 10));
      if (ask === 'next') c = edge ? pick(rows.map(k => k * 10)) : rnd(1, R - 1);
      else c = edge ? pick(rows.map(k => k * 10 + 1)) : rnd(2, R);
      t++;
    } while (G.prev === c + ask && t < 40);
    G.prev = c + ask; const W = WORD[ask], ans = c + W.d;
    return { type: 'input', c, ask, ans, distract: [c - W.d, ans + W.d, c] };
  },
  stage(G, E) {
    const p = G.p, W = WORD[p.ask], R = Math.max(G.R, 20), lo = Math.max(1, p.c - 3), hi = Math.min(R, p.c + 3);
    let h = '<div class="train" aria-label="수 기차">';
    for (let x = lo; x <= hi; x++) {
      if (x === p.ans) h += `<div class="car ask ${W.cls}${G.answered ? ' just' : ''}"><span class="tag">${W.arrow} ${W.w}</span>${E.slot()}</div>`;
      else if (x === p.c) h += `<div class="car k">${x}</div>`;
      else h += `<div class="car${cfg.help === 'none' && !G.answered ? ' hide' : ''}">${x}</div>`;
    }
    return h + '</div>';
  },
  glyphs(G) {
    const W = WORD[G.p.ask], a = g.arrow(W.cls, W.w, W.arrow), c = g.n(G.p.c, 'k');
    return G.p.ask === 'prev' ? g.q() + a + c : c + a + g.q();
  },
  text: G => `${G.p.c} <b class="${WORD[G.p.ask].cls}">${WORD[G.p.ask].rel}</b>는?`,
  speak: G => [String(G.p.c), WORD[G.p.ask].say, verb()],
  hint: G => `<b class="${WORD[G.p.ask].cls}">${WORD[G.p.ask].rel}</b>는 ${G.p.ask === 'next' ? '오른쪽, 1 큰 수' : '왼쪽, 1 작은 수'}예요.`,
  hintSay: G => [WORD[G.p.ask].rule],
  goodSay: G => ['맞았어요!', EUN(G.p.ans), String(G.p.c), WORD[G.p.ask].is],
  good: G => `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.c} ${WORD[G.p.ask].rel}예요.`,
  look: G => [{ sel: '.car.k', say: [G.p.c + '.'] }, { sel: '.car.ask', say: [WORD[G.p.ask].rule] }]
};

/* 줄 이어 읽기 — 줄 끝 수의 다음 수는 아랫줄 맨 앞에 있다 */
M.wrap = {
  label: '줄 이어 읽기',
  gen(G) {
    const R = Math.max(G.R, 20), ends = range1(R / 10 - 1).map(k => k * 10); let c, t = 0;
    do {
      /* 넷 중 셋은 줄 끝, 하나는 줄 안쪽(바로 오른쪽 칸)과 견주어 보게 */
      const e = pick(ends);
      c = Math.random() < .75 ? e : e - rnd(1, 3);
      t++;
    } while (c === G.prev && t < 30);
    G.prev = c; const ans = c + 1, end = c % 10 === 0;
    return { type: 'input', c, ans, end, distract: end ? [c - 9, c + 10, c + 2] : [c - 1, c + 10, c + 2] };
  },
  stage(G, E) {
    const p = G.p, view = cfg.wrapView, R = Math.max(G.R, 20);
    const cellOf = (x, base, at) => { const st = at ? ` style="grid-area:${at}"` : '';
      return x === p.ans ? `<span class="${base} cur${G.answered ? ' just' : ''}"${st}>${E.slot()}</span>` : `<span class="${base}${x === p.c ? ' k' : ''}"${st}>${x}</span>`; };
    let h = '<div class="wrapbox">';
    if (view !== 'grid') {
      const lo = Math.max(1, p.c - 4), hi = Math.min(R, p.c + 4);
      h += `<div class="wline" aria-label="한 줄 수 띠">${range1(hi - lo + 1).map(i => cellOf(lo + i - 1, 'wl')).join('')}</div>`;
    }
    if (view !== 'line') {
      const r1 = rowStart(p.c), turn = view === 'fold' || E.showHint() || G.answered;
      h += `<div class="wgrid${turn ? ' turn' : ''}${G.answered ? ' go' : ''}" aria-label="수 배열표 두 줄">`;
      for (let j = 0; j < 10; j++) h += cellOf(r1 + j, 'wc', `1/${j + 2}`);
      h += '<span class="wbar" aria-hidden="true"></span>';
      for (let j = 0; j < 10; j++) h += cellOf(r1 + 10 + j, 'wc', `3/${j + 2}`);
      h += '<svg class="wt wt-r" viewBox="0 0 26 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 24 H12 Q22 24 22 34 V40 Q22 50 12 50 H0" vector-effect="non-scaling-stroke"/></svg>'
        + '<svg class="wt wt-l" viewBox="0 0 26 100" preserveAspectRatio="none" aria-hidden="true"><path d="M26 50 H14 Q4 50 4 60 V66 Q4 76 14 76 H24" vector-effect="non-scaling-stroke"/></svg></div>';
    }
    return h + '</div>';
  },
  glyphs: G => g.n(G.p.c, 'k') + g.arrow('dr', '다음', G.p.end ? '↩' : '→') + g.q(),
  text: G => `${G.p.c} <b class="dr">다음 수</b>는?${G.p.end ? ' (줄 끝 → 아랫줄 맨 앞)' : ''}`,
  speak: G => [String(G.p.c), '다음 수를', verb()],
  hint: G => G.p.end ? '줄 끝에서는 <b>아랫줄 맨 앞</b>으로 가요.' : '<b class="dr">다음 수</b>는 바로 오른쪽 칸이에요.',
  hintSay: G => [G.p.end ? '줄 끝에서는 아랫줄 맨 앞으로 가요.' : '다음 수는 바로 오른쪽 칸이에요.'],
  goodSay: G => ['맞았어요!', EUN(G.p.ans), String(G.p.c), '다음 수예요.', ...(G.p.end ? ['줄이 바뀌어도 수는 이어져요.'] : [])],
  good: G => `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.c} 다음 수예요.${G.p.end ? ' 줄이 바뀌어도 수는 이어져요.' : ''}`,
  look(G) {
    const grid = cfg.wrapView !== 'line', out = [{ sel: grid ? '.wc.k' : '.wl.k', say: [G.p.c + '.'] }];
    if (G.p.end && grid) out.push({ sel: '.wt-r', say: ['줄 끝에서는 아랫줄 맨 앞으로 가요.'] });
    out.push({ sel: grid ? '.wc.cur' : '.wl.cur', say: ['다음 수예요.'] });
    return out;
  }
};

/* 뛰어 세기 — 2씩·5씩·10씩. 지나온 칸이 색으로 남아 수 배열표의 무늬가 보인다 */
const SKIP_HINT = { 2: '두 칸 뛰어요.', 5: '다섯 칸 뛰어요.', 10: '바로 아래 칸이에요.' };
const skipBase = s => s === 2 ? (cfg.skipOdd ? 1 : 2) : s === 5 ? 5 : rnd(1, 10);
M.skip = {
  label: '뛰어 세기',
  gen(G) {
    const s = cfg.skipBy, R = Math.max(G.R, 20); let b, k, t = 0;
    do {
      b = skipBase(s);
      k = rnd(1, Math.max(1, Math.floor((R - b) / s)));   /* 정답 b + s·k 는 늘 R 안 */
      t++;
    } while (G.prev === b * 1000 + k && t < 40);
    G.prev = b * 1000 + k;
    const ans = b + s * k, cur = ans - s;
    return { type: 'input', s, b, cur, ans, distract: s === 10 ? [cur + 1, ans + 1, ans - 1] : [cur + 1, ans + 1, ans - 1, ans + s] };
  },
  stage(G, E) {
    const p = G.p, R = Math.max(G.R, 20), show = E.showHint() || G.answered;
    let h = `<div class="board skipb ${p.s === 10 ? 'dd' : 'dr'}" aria-label="수 배열표 뛰어 세기">`;
    for (let n = 1; n <= R; n++) {
      let c = 'cell' + ((n - 1) % 10 === 4 ? ' c5' : ''), txt = n;
      if (n === p.ans) { c += ' cur'; txt = E.slot() === '?' ? '' : E.slot(); }
      else if (n === p.cur) c += ' hop k';
      else if (n >= p.b && n < p.cur && (n - p.b) % p.s === 0) c += ' hop';
      else if (show && n > p.cur && n < p.ans) c += ' pass';
      h += `<div class="${c}" data-v="${n}">${txt}</div>`;
    }
    return h + '</div>';
  },
  glyphs: G => g.n(G.p.cur, 'k') + g.arrow(G.p.s === 10 ? 'dd' : 'dr', '+' + G.p.s, G.p.s === 10 ? '↓' : '→') + g.q(),
  text: G => `${G.p.cur}보다 <b class="${G.p.s === 10 ? 'dd' : 'dr'}">${G.p.s} 큰 수</b>는? (${G.p.s}씩 뛰어 세기)`,
  speak: G => [G.p.cur + '보다', G.p.s + ' 큰 수를', verb()],
  hint: G => `${G.p.s}씩 뛰어요. ${G.p.s === 10 ? '<b>바로 아래 칸</b>이에요.' : `<b>${G.p.s}칸</b> 뛰어요.`}`,
  hintSay: G => [SKIP_HINT[G.p.s]],
  goodSay: G => ['맞았어요!', EUN(G.p.ans), G.p.cur + '보다', G.p.s + ' 커요.', G.p.s + '씩 뛰어 세어요.'],
  good: G => `<strong>맞았어요!</strong> ${EUN(G.p.ans)} ${G.p.cur}보다 ${G.p.s} 커요.`,
  look: G => [{ sel: '.cell.k', say: [G.p.cur + '.'] }, { sel: '.cell.cur', say: [SKIP_HINT[G.p.s]] }]
};

/* 고르기 보기: 정답 + 헷갈리기 쉬운 수(놀이마다 정한 distract 먼저), 모두 1~top 안에서 서로 다르게 */
function makeOpts(p, R) {
  const top = Math.max(R, 10, cfg.small), out = [], want = cfg.choiceN - 1;
  for (const x of [...(p.distract || []), p.ans + 1, p.ans - 1, p.ans + 2, p.ans - 2, p.ans + 10, p.ans - 10]) {
    if (x >= 1 && x <= top && x !== p.ans && !out.includes(x)) out.push(x);
    if (out.length === want) break;
  }
  return SC.shuffle([p.ans, ...out]);
}

SC.MODES = M;
SC.makeOpts = makeOpts;
SC.BASICS = ['count', 'flash', 'stair'];
Object.assign(SC, { DIR, LEVEL_DIRS, nb, stepText });
})(window.SC);
