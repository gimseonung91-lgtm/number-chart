/* speech.js — 목소리.
   1순위: 신경망 음성(ko-KR SunHi)으로 미리 만든 조각(audio/clips.js)을 이어 붙여 재생한다.
          조각마다 앞뒤 무음을 잘라 내고, 문장 부호 뒤에서만 잠깐 쉬어서 끊김 없이 들리게 한다.
   2순위: 조각이 없는 말(선생님이 직접 적은 활동 이름 등)은 기기에서 가장 자연스러운 목소리로 읽는다.
   말할 내용은 늘 '조각 배열'로 넘긴다. 예: ['34보다', '1 큰 수를', '골라요.'] */
(function (SC) {
'use strict';
const { cfg, sleep, plain } = SC;
/* 음성 조각(약 12MB)은 화면이 뜬 뒤에 따로 불러온다. 다 오기 전에는 기기 목소리로 대신 읽는다. */
const clips = () => SC.CLIPS || {};
(function loadClips() {
  if (SC.CLIPS) return;
  const viaScript = () => {
    const s = document.createElement('script');
    s.src = 'audio/clips.js'; s.async = true;
    s.onerror = () => viaScript.fallback();
    document.head.appendChild(s);
  };
  /* 보통은 audio/clips.js를 script로 읽는다 (컴퓨터 파일, 깃허브 페이지 모두 동작).
     script가 막힌 곳에서는 audio/clips.json이 있으면 그것을 받아 온다. */
  viaScript.fallback = () => fetch('audio/clips.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => { SC.CLIPS = j; })
    .catch(() => console.warn('음성 조각을 불러오지 못해 기기 목소리를 써요.'));
  viaScript();
})();

/* ---------- 오디오 장치 (태블릿은 첫 터치 때 깨워야 소리가 난다) ---------- */
let ctx = null;
function audioCtx() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { ctx = new AC(); } catch (e) { ctx = null; } } }
  return ctx;
}
function unlock() {
  const c = audioCtx();
  if (c) {
    if (c.state === 'suspended') c.resume().catch(() => {});
    try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { /* 무시 */ }
  }
  if (!unlock.tts && 'speechSynthesis' in window) { unlock.tts = true; try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) { /* 무시 */ } }
}
addEventListener('pointerdown', unlock, { capture: true, passive: true });
addEventListener('keydown', unlock, { capture: true });

/* ---------- 조각 재생 ---------- */
const keyOf = u => u.trim().replace(/[.,!?]+$/, '');
const has = u => Object.prototype.hasOwnProperty.call(clips(), keyOf(u));
const cache = new Map();
let sources = [], token = 0;

function b64ToBuf(b64) { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; }
/* 앞뒤 무음을 잘라 실제 목소리 구간만 쓴다 */
function trim(buf) {
  const d = buf.getChannelData(0), th = 0.012, n = d.length; let s = 0, e = n - 1;
  while (s < n && Math.abs(d[s]) < th) s++;
  while (e > s && Math.abs(d[e]) < th) e--;
  const pad = Math.round(0.025 * buf.sampleRate);
  return { buf, start: Math.max(0, s - pad) / buf.sampleRate, end: Math.min(n, e + pad) / buf.sampleRate };
}
function bufferFor(key) {
  if (!cache.has(key)) {
    const c = audioCtx();
    cache.set(key, new Promise((res, rej) => c.decodeAudioData(b64ToBuf(clips()[key]), res, rej)).then(trim));
  }
  return cache.get(key);
}
const gapAfter = u => /[.!?]$/.test(u.trim()) ? 0.3 : /,$/.test(u.trim()) ? 0.16 : 0.05;
async function playRun(run, my) {
  const c = audioCtx();
  if (c.state === 'suspended') { try { await c.resume(); } catch (e) { /* 무시 */ } }
  let parts;
  try { parts = await Promise.all(run.map(u => bufferFor(keyOf(u)))); } catch (e) { return ttsSay(run.join(' '), my); }
  if (my !== token) return;
  let t = c.currentTime + 0.03;
  parts.forEach((p, j) => {
    const s = c.createBufferSource(); s.buffer = p.buf; s.connect(c.destination);
    s.start(t, p.start, p.end - p.start); sources.push(s);
    t += (p.end - p.start) + (j < parts.length - 1 ? gapAfter(run[j]) : 0);
  });
  await sleep(Math.max(0, (t - c.currentTime) * 1000) + 60);
}

/* ---------- 기기 목소리 (예비) : 자연스러운 목소리를 먼저 고른다 ---------- */
let voice = null;
function rank(v) {
  if (!/^ko/i.test(v.lang)) return -1;
  let s = 0; const n = v.name;
  if (/natural|neural|online/i.test(n)) s += 10;   // Edge의 신경망 목소리 (SunHi, InJoon)
  if (/google/i.test(n)) s += 6;                  // 크롬·안드로이드의 구글 목소리
  if (/yuna|sora|premium|enhanced|siri/i.test(n)) s += 5; // 아이패드의 고품질 목소리
  if (/heami/i.test(n)) s -= 3;                   // 오래된 윈도 목소리
  return s;
}
function pickVoice() {
  try { voice = speechSynthesis.getVoices().filter(v => rank(v) >= 0).sort((a, b) => rank(b) - rank(a))[0] || null; } catch (e) { voice = null; }
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function ttsSay(text, my) {
  return new Promise(res => {
    if (!('speechSynthesis' in window) || !text || my !== token) { res(); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; if (voice) u.voice = voice; u.rate = .95;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 700 + text.length * 150);
      speechSynthesis.speak(u);
    } catch (e) { res(); }
  });
}

/* ---------- 바깥에서 쓰는 함수 ---------- */
function hush() {
  token++;
  sources.forEach(s => { try { s.stop(); } catch (e) { /* 이미 끝남 */ } });
  sources = [];
  try { speechSynthesis.cancel(); } catch (e) { /* 없음 */ }
}
async function say(units, force) {
  if (!units) return;
  if (!Array.isArray(units)) units = [units];
  units = units.map(u => plain(u)).filter(Boolean);
  if (!units.length || (!cfg.voice && !force)) return;
  hush();
  const my = token, useClips = !!audioCtx();
  let i = 0;
  while (i < units.length && my === token) {
    const run = [];
    if (useClips && has(units[i])) { while (i < units.length && has(units[i])) run.push(units[i++]); await playRun(run, my); }
    else { while (i < units.length && !(useClips && has(units[i]))) run.push(units[i++]); await ttsSay(run.map(u => phraseKeys().has(keyOf(u)) ? reading(u) : u).join(' '), my); }
  }
}

/* 고정 문장 속 숫자는 한자어로 풀어 써서 녹음한다.
   목소리 엔진이 '1 작은 수'를 '한 작은 수'처럼 고유어로 읽어 버리기 때문 ('일 작은 수', '십 큰 수', '오 다음부터').
   찾는 이름은 그대로 숫자로 두고, 녹음할 글(그리고 기기 목소리로 읽을 때)만 바꾼다. */
function sinoWord(n) {
  const { SINO } = SC;
  if (n === 100) return '백';
  const t = Math.floor(n / 10), o = n % 10;
  return (t ? (t > 1 ? SINO[t] : '') + '십' : '') + (o ? SINO[o] : '') || SINO[0];
}
const reading = p => String(p).replace(/\d+/g, d => sinoWord(+d));
const phraseKeys = () => reading.keys || (reading.keys = new Set(SC.PHRASES.map(keyOf)));

/* 미리 만들어 둘 조각 목록: 1~100의 수 + 조사 붙은 꼴 + 고정 문장 (tools/make_voice.py가 이 목록을 읽어 음성을 만든다) */
function voiceUnits() {
  const { EUN, EUL, IEYO, GWA, NATIVE } = SC;
  /* [찾는 이름, 녹음할 글] — 녹음할 글에는 문장 부호를 남겨 물음표는 올려 읽고 느낌표는 밝게 읽게 한다 */
  const out = new Map();
  for (let n = 1; n <= 100; n++) [String(n), EUN(n), EUL(n), IEYO(n), GWA(n), n + '보다'].forEach(u => out.set(u, u));
  for (let n = 1; n <= 10; n++) { out.set(NATIVE[n], NATIVE[n]); out.set(n + '개', n + '개'); out.set('모두 ' + NATIVE[n], '모두 ' + NATIVE[n]); }
  SC.PHRASES.forEach(p => out.set(keyOf(p), reading(p)));
  return [...out];
}

SC.PHRASES = [
  /* 공통 */
  '맞았어요!', '괜찮아요.', '다시 해 봐요.', '따라 눌러요.', '반짝이는 것을 눌러요.', '잘 봐요.', '먼저 보여 줄게요.', '이제 해 봐요.',
  '여기를 눌러요.', '숫자를 눌러요.', '여기에서 골라요.', '골라요.', '눌러요.', '소리 내어 읽어 줄게요.',
  '다 했어요!', '정말 잘했어요.', '모두', '모으면',
  /* 놀이 이름 */
  '하나씩 세어 보기', '한눈에 보기', '블록 계단', '10 묶음', '수 배열표 채우기', '이웃 수 찾기', '더 큰 수, 더 작은 수', '수 이어가기',
  /* 다 하면 할 활동 */
  '이제 블록 놀이 시간이에요.', '이제 책 보기 시간이에요.', '이제 음악 듣기 시간이에요.', '이제 그림 그리기 시간이에요.', '이제 간식 시간이에요.', '이제 공 놀이 시간이에요.', '이제 쉬기 시간이에요.',
  /* 세어 보기 */
  '하나씩 눌러서 세어요.', '모두 몇 개예요?', '하나를 누를 때마다 한 번씩 세어요.', '마지막에 센 수가 모두의 수예요.', '마지막에 센 수는',
  /* 한눈에 보기 */
  '점이 몇 개예요?', '윗줄이 꽉 차면 5예요.', '5 다음부터 세어요.', '점을 하나씩 짚으며 세어요.', '점을 잘 봐요.',
  /* 블록 계단 */
  '1 큰 수를', '1 작은 수를', '10 큰 수를', '10 작은 수를', '블록 높이가 똑같은 계단을 찾아요.', '1 커요.', '1 작아요.', '10 커요.', '10 작아요.',
  '하나 더 많아요.', '하나 더 적어요.', '블록을 하나 올려요.', '블록을 하나 내려요.', '높이가 같아요.',
  /* 10 묶음 */
  '블록이 모두 몇 개예요?', '10 묶음을 먼저 세어요.', '그다음 낱개를 이어서 세어요.', '10 묶음이', '낱개가',
  /* 수 배열표 */
  '노란 칸에 들어갈 수를', '노란 칸이에요.', '1부터 차례대로 세어 봐요.', '왼쪽 수', '위의 수', '오른쪽 수', '아래 수',
  '1 큰 수예요.', '1 작은 수예요.', '10 큰 수예요.', '10 작은 수예요.', '왼쪽 칸은', '오른쪽 칸은', '위 칸은', '아래 칸은',
  /* 크기 비교 */
  '더 큰 수를 눌러요.', '더 작은 수를 눌러요.', '수 배열표에서 뒤에 있는 수가 더 커요.', '커요.', '작아요.', '두 수를 봐요.', '뒤에 있는 수가 더 커요.',
  /* 수 이어가기 */
  '빈칸에 들어갈 수를', '1씩', '10씩', '커져요.', '작아져요.', '10 커져라, 앗!', '10 작아져라, 잇!',
  /* SCERTS — 학생이 누르면 학생 대신 말해 주는 요청 (보완대체의사소통처럼) */
  '도와주세요.', '쉬고 싶어요.', '좋아요.', '그저 그래요.', '힘들어요.',
  /* SCERTS — 상대(앱)가 들어주는 말 */
  '말해 줘서 고마워요.', '같이 해 봐요.', '잠깐 쉬어요.', '먼저 잠깐 쉬어요.', '숨을 크게 들이쉬어요.', '후, 내쉬어요.',
  '다시 해 볼까요?', '다시 해요.', '오늘은 여기까지 해요.', '지금 기분이 어때요?', '시작해요.',
  '선생님에게 보여 줘요.', '와, 잘했어요!', '쉬고 싶으면 여기를 눌러요.', '마지막 문제예요.', '반을 했어요!',
  /* 쉬기 카드를 다 썼을 때: 먼저 하고 그다음에 쉬기 */
  '먼저 하나 더 해요.', '먼저 두 개 더 해요.', '먼저 세 개 더 해요.', '그다음에 쉬어요.', '기다려 줘서 고마워요.', '이제 쉬어요.'
];

Object.assign(SC, { say, hush, audioCtx, voiceUnits, reading });
})(window.SC);
