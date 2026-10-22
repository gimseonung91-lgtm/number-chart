/* print.js — A4 학습지 만들기. 종류마다 {q: 문제 쪽, a: 정답 쪽} HTML을 돌려준다. */
(function (SC) {
'use strict';
const { $, cfg, rnd, pick, sample, range1, clamp, DIR, LEVEL_DIRS, nb, stepText } = SC;

/* 학습지 종류 = 앱의 놀이 8가지 (놀이에서 배운 것을 그대로 종이로) */
const TYPES = [
  ['count', '하나씩 세어 보기', '세어서 수 쓰기'],
  ['flash', '한눈에 보기', '10칸 틀의 점 보고 수 쓰기'],
  ['stair', '블록 계단', '1 작은 수 · 1 큰 수 쓰기'],
  ['ten', '10 묶음', '10 묶음과 낱개로 수 쓰기'],
  ['board', '수 배열표 채우기', '빈칸에 수 쓰기'],
  ['near', '이웃 수 찾기', '십자 모양 빈칸 채우기'],
  ['cmp', '더 큰 수, 더 작은 수', '큰 수 · 작은 수에 ○표'],
  ['seq', '수 이어가기', '규칙대로 빈칸 채우기']
];
let ptype = 'count';
function renderTypes() {
  $('#pTypes').innerHTML = TYPES.map(([k, t, d], i) => `<button class="p-type" role="radio" aria-checked="${k === ptype}" data-ptype="${k}"><span class="p-no">${i + 1}</span><span class="p-tt">${t}</span><span class="p-dd">${d}</span></button>`).join('');
}
$('#pTypes').addEventListener('click', e => { const b = e.target.closest('[data-ptype]'); if (!b) return; ptype = b.dataset.ptype; renderTypes(); buildPrint(); });

/* 인쇄 화면 열기: 기본값은 지금 설정과 마지막으로 한 놀이 (기록에서 열면 그 기록의 값) */
function openPrint(o) {
  o = o || {};
  const last = (SC.readRecords()[0] || {}).mode;
  const mode = o.mode || last || ptype;
  ptype = TYPES.some(([k]) => k === mode) ? mode : 'count';
  const settings = SC.normalizeCfg({ ...cfg, ...o });
  $('#p-small').value = settings.small;
  $('#p-range').value = settings.range;
  $('#p-level').value = settings.level;
  $('#p-blanks').value = Math.min(+$('#p-range').value, Math.max(10, Math.round(+$('#p-range').value * .3)));
  renderTypes(); buildPrint();
}

const P = () => ({
  type: ptype, R: +$('#p-range').value,
  blanks: clamp(parseInt($('#p-blanks').value, 10) || 0, 0, +$('#p-range').value),
  level: +$('#p-level').value, small: +$('#p-small').value, pages: +$('#p-pages').value,
  answer: $('#p-answer').checked, help: $('#p-help').checked
});
const head = title => `<div class="sh-head"><span>(        )년  (      )월  (      )일</span><span>이름 (                    )</span></div><div class="sh-title">${title}</div>`;
const pair = (t, body) => ({ q: head(t) + body(false), a: head('정답 · ' + t) + body(true) });
const ansSpan = (show, v) => show ? `<span class="ans">${v}</span>` : '';

const SHEETS = {
  /* 세어서 쓰기 — 4×3 자리에 흩어 놓은 동그라미 */
  count(o) {
    const items = range1(8).map(() => { const n = rnd(1, o.small); return { n, cells: sample(range1(12).map(i => i - 1), n) }; });
    return pair('하나씩 짚으며 세어 보고, 모두 몇 개인지 써 봅시다.', ans => `<div class="sh-body"><div class="sh-grid2">${items.map((it, i) => `<div class="sh-item"><span class="no">${i + 1}.</span>
      <div class="sh-dots">${it.cells.map(c => `<i style="left:${(c % 4) * 13 + 2}mm;top:${Math.floor(c / 4) * 11 + 2}mm"></i>`).join('')}</div>
      <span class="sh-box">${ansSpan(ans, it.n)}</span></div>`).join('')}</div></div>`);
  },
  /* 한눈에 보기 — 10칸(5칸) 틀에 찍힌 점 보고 쓰기 */
  flash(o) {
    const cells = o.small === 5 ? 5 : 10, items = range1(8).map(() => rnd(1, o.small));
    const frame = n => `<div class="sh-frame c${cells}">${range1(cells).map(c => `<span>${c <= n ? '<i></i>' : ''}</span>`).join('')}</div>`;
    return pair('점이 몇 개인지 한눈에 보고 써 봅시다.', ans => `<div class="sh-body"><div class="sh-grid2">${items.map((n, i) => `<div class="sh-item"><span class="no">${i + 1}.</span>
      ${frame(n)}<span class="sh-box">${ansSpan(ans, n)}</span></div>`).join('')}</div></div>`);
  },
  /* 블록 계단 — 가운데 수의 1 작은 수, 1 큰 수 */
  stair(o) {
    const ks = range1(6).map(() => rnd(2, o.small - 1));
    const col = (h, card, cls) => `<div class="c"><span class="card ${cls || ''}">${card}</span>${'<span class="b"></span>'.repeat(h)}</div>`;
    return pair('블록 계단을 보고 1 작은 수와 1 큰 수를 써 봅시다.', ans => `<div class="sh-body"><div class="sh-grid2">${ks.map((k, i) => `<div class="sh-item st"><span class="no">${i + 1}.</span>
      <div class="sh-stw"><div class="sh-st">${col(k - 1, ansSpan(ans, k - 1))}${col(k, k, 'k')}${col(k + 1, ansSpan(ans, k + 1))}</div>
      ${o.help ? '<div class="sh-stl"><span>1 작은 수</span><span></span><span>1 큰 수</span></div>' : ''}</div></div>`).join('')}</div></div>`);
  },
  /* 10 묶음 — 10 막대와 낱개 */
  ten(o) {
    const ns = range1(6).map(() => rnd(10, Math.max(o.R, 20)));
    const bar = '<span class="tb">' + '<i></i>'.repeat(10) + '</span>';
    return pair('10 묶음과 낱개를 세어 수를 써 봅시다.', ans => `<div class="sh-body"><div class="sh-grid2">${ns.map((n, i) => {
      const t = Math.floor(n / 10), u = n % 10;
      return `<div class="sh-item tn"><span class="no">${i + 1}.</span><div class="sh-tw"><div class="sh-tens">${bar.repeat(t)}<span class="ones">${'<i></i>'.repeat(u)}</span></div>
      <div class="sh-tq">10이 <span class="sb">${ansSpan(ans, t)}</span>개, 1이 <span class="sb">${ansSpan(ans, u)}</span>개 → <span class="sb w">${ansSpan(ans, n)}</span></div></div></div>`;
    }).join('')}</div></div>`);
  },
  board(o) {
    const blanks = new Set(sample(range1(o.R), o.blanks));
    const tbl = ans => {
      let h = '<table class="sh-board">';
      for (let r = 0; r < o.R / 10; r++) {
        h += `<tr class="${r === 4 && o.R > 50 ? 'r5' : ''}">`;
        for (let c = 1; c <= 10; c++) { const n = r * 10 + c; h += `<td class="${c === 5 ? 'c5' : ''}">${blanks.has(n) ? ansSpan(ans, n) : n}</td>`; }
        h += '</tr>';
      }
      return h + '</table>';
    };
    return pair(`1~${o.R}까지 수를 빠짐없이 넣어 봅시다.`, ans => `<div class="sh-body">${tbl(ans)}</div>`);
  },
  near(o) {
    const dirs = LEVEL_DIRS[o.level], pool = range1(o.R).filter(c => dirs.every(d => nb(c, d, o.R) != null));
    const cs = sample(pool, Math.min(6, pool.length)), AREA = { U: '1/2', L: '2/1', R: '2/3', D: '3/2' };
    const cross = (c, ans) => {
      let h = `<div class="sh-cross"><div class="ctr" style="grid-area:2/2"><span style="margin:auto">${c}</span></div>`;
      for (const d of dirs) h += `<div style="grid-area:${AREA[d]}">${ans ? `<span class="ans">${nb(c, d, o.R)}</span>` : '<span></span>'}${o.help ? `<small>${DIR[d].rel}</small>` : ''}</div>`;
      return h + '</div>';
    };
    const legend = `<div class="sh-legend">${dirs.map(d => `<span>${DIR[d].name}: ${DIR[d].rel}</span>`).join('')}</div>`;
    return pair('가운데 수를 보고 빈칸에 알맞은 수를 써 봅시다.', ans => `<div class="sh-body">${legend}<div class="sh-cross-grid">${cs.map(c => cross(c, ans)).join('')}</div></div>`);
  },
  cmp(o) {
    const pairs = range1(12).map(() => { let a, b; do { a = rnd(1, o.R); b = rnd(1, o.R); } while (a === b); return [a, b]; });
    return pair('두 수를 비교해 봅시다.', ans => {
      let h = '<div class="sh-body"><div class="sh-cmp"><h4>더 큰 수에 ○표 하세요.</h4>';
      pairs.forEach(([a, b], i) => {
        if (i === 6) h += '<h4>더 작은 수에 ○표 하세요.</h4>';
        const t = i < 6 ? Math.max(a, b) : Math.min(a, b);
        h += `<div class="sh-pair"><span class="no">${i + 1}.</span>${[a, b].map(x => `<span class="n${ans && x === t ? ' circ' : ''}">${x}</span>`).join('')}</div>`;
      });
      return h + '</div></div>';
    });
  },
  seq(o) {
    const len = 5, rows = range1(10).map(() => {
      let s = pick({ 1: [1], 2: [10], 3: [1, -1, 10, -10] }[o.level]); if (Math.abs(s) === 10 && o.R - 1 < (len - 1) * 10) s = s > 0 ? 1 : -1;
      const span = (len - 1) * Math.abs(s), st = s > 0 ? rnd(1, o.R - span) : rnd(1 + span, o.R);
      return { seq: range1(len).map((_, i) => st + i * s), miss: new Set(sample(range1(len).map(i => i - 1), o.level === 3 ? 2 : rnd(1, 2))), s };
    });
    return pair('규칙에 맞게 빈칸에 알맞은 수를 써 봅시다.', ans => `<div class="sh-body"><div class="sh-seq">${rows.map((r, ri) => `<div class="sh-row"><span class="no">${ri + 1}.</span>${r.seq.map((x, i) =>
      (i > 0 ? `<i>→${o.help ? '<br>' + stepText(r.s) : ''}</i>` : '') + `<span class="n">${r.miss.has(i) ? ansSpan(ans, x) : x}</span>`).join('')}</div>`).join('')}</div></div>`);
  }
};

function buildPrint() {
  const o = P(), t = o.type;
  $('#p-blanks').max = o.R;
  $('#pf-blanks').hidden = t !== 'board';
  $('#pf-level').hidden = !(t === 'near' || t === 'seq');
  $('#pf-help').hidden = !(t === 'near' || t === 'seq' || t === 'stair');
  $('#pf-small').hidden = !(t === 'count' || t === 'stair' || t === 'flash');
  $('#pf-range').hidden = t === 'count' || t === 'stair' || t === 'flash';
  const sheets = range1(o.pages).map(() => SHEETS[t](o));
  let html = sheets.map(s => `<div class="sheet">${s.q}</div>`).join('');
  if (o.answer) html += sheets.map(s => `<div class="sheet">${s.a}</div>`).join('');
  $('#sheets').innerHTML = html;
  $('#printInfo').textContent = `A4 ${o.pages * (o.answer ? 2 : 1)}장 (문제 ${o.pages}장${o.answer ? ` + 정답 ${o.pages}장` : ''})`;
}
$('#v-print').addEventListener('change', e => { if (e.target.id && e.target.id.startsWith('p-')) buildPrint(); });
$('#p-blanks').addEventListener('input', () => { clearTimeout(buildPrint.t); buildPrint.t = setTimeout(buildPrint, 400); });
$('#regenBtn').addEventListener('click', buildPrint);
/* 웹 링크(공유 페이지)에서는 브라우저가 인쇄 창을 막는다. 그때는 컴퓨터의 앱 폴더에서 인쇄하도록 알려 준다 */
const HOSTED = !!document.querySelector('meta[name="sc-hosted"]');
$('#printBtn').addEventListener('click', () => {
  if (HOSTED) { $('#printInfo').innerHTML = '<b>웹 링크에서는 인쇄 창이 열리지 않아요.</b> 컴퓨터의 <b>수 배열표 앱</b> 폴더에서 index.html을 열어 같은 학습지를 인쇄해 주세요.'; return; }
  window.print();
});

SC.buildPrint = buildPrint;
SC.openPrint = openPrint;
})(window.SC);
