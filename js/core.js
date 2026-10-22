/* core.js — 모든 파일이 함께 쓰는 도구: 난수, 저장, 조사, 수 이름, 설정, 소리, 그림(아이콘) */
window.SC = window.SC || {};
(function (SC) {
'use strict';

/* ---------- 작은 도구 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const range1 = n => Array.from({ length: n }, (_, i) => i + 1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plain = h => String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const store = {
  get(k, d) { try { const v = localStorage.getItem('suchart_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('suchart_' + k, JSON.stringify(v)); } catch (e) { /* 저장이 막힌 브라우저에서도 앱은 그대로 동작 */ } }
};

/* ---------- 한국어: 숫자 뒤 조사 (일·삼·육·칠·팔·십·백으로 끝나면 받침) ---------- */
const bat = n => [0, 1, 3, 6, 7, 8].includes(Math.abs(n) % 10);
const EUN = n => n + (bat(n) ? '은' : '는');
const EUL = n => n + (bat(n) ? '을' : '를');
const IEYO = n => n + (bat(n) ? '이에요' : '예요');
const GWA = n => n + (bat(n) ? '과' : '와');
const SINO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십'];
const NATIVE = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

/* ---------- 효과음 (목소리는 speech.js) ---------- */
function tone(freqs, dur) {
  if (!SC.cfg.sound || !SC.audioCtx) return; dur = dur || .14;
  const ac = SC.audioCtx(); if (!ac) return;
  try {
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * dur;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.13, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur * 1.7);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur * 1.8);
    });
  } catch (e) { /* 소리를 못 내는 환경 */ }
}

/* ---------- 그림 (아이콘) ---------- */
const sv = (inner, opt) => `<svg viewBox="0 0 24 24" aria-hidden="true" ${opt || 'fill="currentColor"'}>${inner}</svg>`;
const stroke = inner => sv(inner, 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"');
const HAND_PATH = '<path d="M9 12.5V4.2a1.6 1.6 0 0 1 3.2 0V10.6h.4V8.9a1.6 1.6 0 0 1 3.2 0v1.9h.4V9.9a1.6 1.6 0 0 1 3.2 0V15.4a6.2 6.2 0 0 1-6.2 6.2h-1a6 6 0 0 1-4.7-2.3L3.9 15.8a1.6 1.6 0 0 1 2.3-2.2L9 16.3z"/>';
const ICON = {
  speaker: sv('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  hand: sv(HAND_PATH, 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"'),
  handSolid: sv(HAND_PATH, ''),
  eye: stroke('<path d="M1.8 12S5.6 5.2 12 5.2 22.2 12 22.2 12 18.4 18.8 12 18.8 1.8 12 1.8 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>'),
  star: sv('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>'),
  again: stroke('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20.5 4.5v5h-5"/>'),
  home: sv('<path d="M3 11.2L12 4l9 7.2V20a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1z"/>'),
  play: sv('<path d="M7 4.5v15l12.5-7.5z"/>'),
  print: stroke('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
  chart: stroke('<path d="M4 20V11M10 20V5M16 20v-7M2 20.5h20"/>'),
  gear: stroke('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  flag: sv('<path d="M5 21V3.5M5 4h12l-2.5 4L17 12H5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  /* SCERTS: 학생이 누르는 요청 그림 (손 그림은 '네 차례'라서, 도움 요청은 '손을 든 사람'으로 구별) */
  askHelp: stroke('<circle cx="9" cy="6" r="3"/><path d="M4.5 21v-5.5a4.5 4.5 0 0 1 9 0V21"/><path d="M12.6 12.4l4.6-8"/><circle cx="18" cy="3.4" r="1.5" fill="currentColor"/>'),
  people: stroke('<circle cx="7.5" cy="8" r="2.8"/><circle cx="16.5" cy="8" r="2.8"/><path d="M2.5 20v-2.2a5 5 0 0 1 10 0V20M11.5 20v-2.2a5 5 0 0 1 10 0V20"/>'),
  faceGood: stroke('<circle cx="12" cy="12" r="9.5"/><circle cx="8.8" cy="10" r="1.1" fill="currentColor"/><circle cx="15.2" cy="10" r="1.1" fill="currentColor"/><path d="M7.8 14.2c2.3 2.8 6.1 2.8 8.4 0"/>'),
  faceSoso: stroke('<circle cx="12" cy="12" r="9.5"/><circle cx="8.8" cy="10" r="1.1" fill="currentColor"/><circle cx="15.2" cy="10" r="1.1" fill="currentColor"/><path d="M8.5 15.3h7"/>'),
  faceHard: stroke('<circle cx="12" cy="12" r="9.5"/><circle cx="8.8" cy="10" r="1.1" fill="currentColor"/><circle cx="15.2" cy="10" r="1.1" fill="currentColor"/><path d="M8 16.6c2.2-2.4 5.8-2.4 8 0"/>')
};
/* 다 하면 할 활동 그림 (먼저-다음 판) */
const REWARDS = {
  block: { label: '블록 놀이', svg: sv('<rect x="3" y="13" width="8" height="8" rx="1.2"/><rect x="13" y="13" width="8" height="8" rx="1.2"/><rect x="8" y="3.5" width="8" height="8" rx="1.2"/>') },
  book: { label: '책 보기', svg: sv('<path d="M2.5 5.5c3-1.4 6-1.4 8.8.4v14c-2.8-1.8-5.8-1.8-8.8-.4zM21.5 5.5c-3-1.4-6-1.4-8.8.4v14c2.8-1.8 5.8-1.8 8.8-.4z"/>') },
  music: { label: '음악 듣기', svg: sv('<path d="M9 17.5a3 3 0 1 1-2-2.8V5.2l12-2.4v12.2a3 3 0 1 1-2-2.8V6.9l-8 1.6z"/>') },
  draw: { label: '그림 그리기', svg: sv('<path d="M3 21l1.6-5.2L15.9 4.5a2.2 2.2 0 0 1 3.1 0l.5.5a2.2 2.2 0 0 1 0 3.1L8.2 19.4z"/>') },
  snack: { label: '간식', svg: sv('<path d="M12 2.5a9.5 9.5 0 1 0 9.5 9.5 3 3 0 0 1-3.6-3.4A3.2 3.2 0 0 1 14.6 5 3 3 0 0 1 12 2.5z"/><circle cx="8.5" cy="10" r="1.3" fill="var(--surface)"/><circle cx="12" cy="15.5" r="1.3" fill="var(--surface)"/><circle cx="7.5" cy="15" r="1" fill="var(--surface)"/>') },
  ball: { label: '공 놀이', svg: sv('<circle cx="12" cy="12" r="9.5"/><path d="M3 10.5c5 1 10 .5 15.5-4M6 19.5c2-4 6.5-7 15-6.5" fill="none" stroke="var(--surface)" stroke-width="1.6"/>') },
  rest: { label: '쉬기', svg: sv('<path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a6.9 6.9 0 0 0 11.1 11.1z"/>') }
};
const rewardLabel = () => SC.cfg.reward || (REWARDS[SC.cfg.rewardIcon] || REWARDS.block).label;
const rewardSvg = () => (REWARDS[SC.cfg.rewardIcon] || REWARDS.block).svg;

/* 수 이름 카드: 숫자 · 한자어 수사 · 고유어 수사 (모델·기호·언어 잇기) */
const ncard = n => n >= 1 && n <= 10 ? `<span class="ncard"><b>${n}</b><span>${SINO[n]} · ${NATIVE[n]}</span></span>` : '';
/* 10 이하의 수를 점으로 (5개씩 한 줄) */
const dotsOf = n => n >= 1 && n <= 10 ? `<span class="cd" aria-hidden="true">${'<i></i>'.repeat(n)}</span>` : '';

Object.assign(SC, {
  $, $$, rnd, pick, shuffle, sample, clamp, range1, sleep, esc, plain, store,
  bat, EUN, EUL, IEYO, GWA, SINO, NATIVE,
  tone, ICON, REWARDS, rewardLabel, rewardSvg, ncard, dotsOf
});
})(window.SC);
