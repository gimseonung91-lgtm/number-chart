/* play.js — 놀이 엔진.
   한 문제는 늘 같은 흐름으로 흘러간다:  들려주기(그림 지시 + 소리) → 학생 차례 → 칭찬 → 다음 문제
   - 보여 주기: 손가락이 먼저 풀어 보이고(비디오 모델링), 같은 문제를 학생이 다시 한다
   - 손가락 안내: 한동안 아무것도 안 하면 손가락이 '여기를 눌러요' 하고 가리킨다
   - 오류 없는 학습: 틀리면 힌트 → 그래도 틀리면 정답을 반짝여 따라 누르게 한다 */
(function (SC) {
'use strict';
const { $, cfg, range1, sleep, tone, say, hush, ICON, NATIVE, IEYO } = SC;
const M = SC.MODES;

const HINT_AT = { lots: 0, some: 1, none: 2 }, GHOST_AT = { lots: 1, some: 2, none: 3 };
const CUE_AFTER = { lots: 2500, some: 8000, none: 16000 };
let G = null;

function owner() {
  const me = G, revision = me && me.revision;
  return () => G === me && !!me && me.revision === revision;
}
function cancelWork() {
  if (!G) return;
  G.revision++;
  G.timers.forEach(clearTimeout); G.timers.clear();
  G.pendingSubmit = false;
}
function later(fn, ms, alive = owner()) {
  const me = G;
  const timer = setTimeout(() => { me.timers.delete(timer); if (alive()) fn(); }, ms);
  me.timers.add(timer);
  return timer;
}
function submitPending() {
  if (!G || G.paused || !G.pendingSubmit) return;
  G.pendingSubmit = false; G.lock = false; submit();
}

/* ---------- 엔진이 놀이에게 빌려주는 도구 ---------- */
const E = {
  showHint: () => !!G && !G.answered && G.tries >= HINT_AT[cfg.help],
  showGhost: () => !!G && !G.answered && G.tries >= GHOST_AT[cfg.help],
  slot() {
    if (G.answered) return String(G.p.ans);
    if (G.p.type === 'input' && G.input) return G.input;
    if (G.p.type === 'input' && E.showGhost()) return `<span class="ghost">${G.p.ans}</span>`;
    return '?';
  },
  ansBox: () => `<div class="ansrow"><div class="sq ask${G.answered ? ' just' : ''}">${E.slot()}</div></div>`,
  render: () => render()
};

/* ---------- 세션 ---------- */
function start(mode) {
  cancelWork(); hideCue(); hush(); hidePointer(); resetQuit();
  veil.hidden = true; badge.hidden = true; cueSaid = null; SC.REG.closeAll();
  G = {
    revision: 0, timers: new Set(), pendingSubmit: false,
    mode, R: cfg.range, done: 0, firstOk: 0, tries: 0, input: '', lock: false, prev: null, answered: false, wrong: new Set(), demoShown: false,
    /* SCERTS 관찰: 힌트 후 맞힘, 정답 따라 누름, 학생의 도움·쉬기 요청, 쉬기 권유, 다시 본 시범, 기분 */
    hinted: 0, prompted: 0, askHelp: 0, askRest: 0, offers: 0, demos: 0, moodStart: null, moodEnd: null,
    paused: false, hardRun: 0, slips: [],
    /* 쉬기 카드: 한 놀이에 바로 쉴 수 있는 횟수(0 = 제한 없음). 다 쓰거나 방금 쉬었으면 '먼저 몇 문제 → 그다음 쉬기' */
    restLeft: cfg.restCards > 0 ? cfg.restCards : Infinity, restAt: null, lastRestDone: -Infinity, restWaited: 0
  };
  SC.G = G;
  if (M[mode].init) M[mode].init(G); else G.total = cfg.count;
  SC.show('play');
  $('#asks').hidden = !cfg.askBtns;
  keepAwake(true);
  if (cfg.mood === 'off') { nextProblem(); return; }
  /* 기분을 묻는 동안 지난 놀이의 화면이 비치지 않게 비워 둔다 */
  ['#glyphs', '#instrText', '#stage', '#msg', '#choices'].forEach(s => { $(s).innerHTML = ''; });
  $('#msg').className = 'msg'; $('#pad').hidden = true; renderTokens();
  /* 시작 전에 기분 묻기. '힘들어요'면 먼저 쉬고 시작한다 (정서 조절이 먼저) */
  const me = G;
  G.paused = true;
  SC.REG.askMood(async k => {
    if (G !== me) return;
    me.moodStart = k;
    if (k === 'hard') {
      /* 기분 때문에 쉬는 것은 쉬기 카드를 쓰지 않는다 (조절이 먼저) */
      me.lastRestDone = 0;
      SC.REG.openBreak([SC.REG.MOODS[k].label + '.', '말해 줘서 고마워요.', '먼저 잠깐 쉬어요.'],
        () => { if (G === me) { me.paused = false; nextProblem(); } }, () => stopSession());
      return;
    }
    await say([SC.REG.MOODS[k].label + '.', '시작해요.']);
    if (G === me) { me.paused = false; nextProblem(); }
  });
}
function nextProblem() {
  cancelWork(); hideCue();
  Object.assign(G, { tries: 0, input: '', lock: false, msg: null, answered: false, wrong: new Set(), cues: 0 });
  $('#askRestBtn').classList.remove('invite');
  G.p = M[G.mode].gen(G);
  if (G.p.type === 'input' && cfg.answer === 'choice') toPick(G.p);
  G.p0 = clone(G.p);
  render();
  /* 첫 문제는 손가락이 먼저 보여 준다 (설정에서 끌 수 있음) */
  if (cfg.demo === 'first' && !G.demoShown) { G.demoShown = true; later(() => runDemo(), 500); return; }
  /* 첫 문제에서는 놀이 이름부터 들려준다 (지금 무엇을 하는지 예측할 수 있게) */
  const intro = G.done === 0 && !G.introDone ? [M[G.mode].label + '.'] : [];
  G.introDone = true;
  /* 끝을 미리 알려 준다 (전환 예고) */
  const last = G.total > 1 && G.done === G.total - 1 ? ['마지막 문제예요.'] : [];
  const spoken = say([...intro, ...last, ...M[G.mode].speak(G)]);
  /* 앞 문제들에서 힘들어 보였으면 지시를 다 들려준 뒤 쉬기를 권한다 */
  if (G.offerDue) { G.offerDue = false; const alive = owner(); spoken.then(() => { if (alive()) offerBreak(); }); }
}
function toPick(p) { p.type = 'pick'; p.opts = SC.makeOpts(p, G.R); }

/* ---------- 그리기 ---------- */
const FB_ICON = { good: ICON.star, retry: ICON.again, hint: ICON.eye, ghost: ICON.hand, turn: ICON.hand, demo: ICON.eye };
function render() {
  if (!G) return;
  const mode = M[G.mode];
  $('#glyphs').innerHTML = mode.glyphs(G);
  $('#instrText').innerHTML = mode.text(G);
  $('#demoBtn').hidden = G.answered;
  renderTokens();
  $('#stage').innerHTML = mode.stage(G, E);
  let msg = G.msg;
  if (!msg && E.showHint()) msg = { kind: 'hint', html: mode.hint(G) };
  const box = $('#msg');
  box.className = 'msg' + (msg ? ' ' + msg.kind : '');
  box.innerHTML = msg ? `<span class="fi">${FB_ICON[msg.kind] || ''}</span><span>${msg.html}</span>` : '';
  const t = G.p.type;
  $('#pad').hidden = t !== 'input';
  const ch = $('#choices');
  ch.hidden = t !== 'pick';
  if (t === 'pick') {
    ch.style.setProperty('--cn', G.p.opts.length);
    const withDots = mode.dots && cfg.help !== 'none';
    ch.innerHTML = G.p.opts.map(x => {
      let c = 'choice'; if (G.wrong.has(x)) c += ' dim'; if (G.answered && x === G.p.ans) c += ' right'; if (E.showGhost() && x === G.p.ans) c += ' cue';
      return `<button class="${c}" data-pick="${x}" aria-label="${x}">${x}${withDots ? SC.dotsOf(x) : ''}</button>`;
    }).join('');
  }
  if (mode.after) mode.after(G, E);
  armCue();
}
/* 쉬기 버튼 아래: 남은 쉬기 카드 또는 '○개 더' */
function renderRest() {
  const btn = $('#askRestBtn'), el = $('#restCards');
  const wait = G.restAt != null ? Math.max(0, G.restAt - G.done) : 0;
  btn.classList.toggle('wait', wait > 0);
  btn.classList.toggle('empty', !wait && G.restLeft <= 0);
  if (wait) el.innerHTML = `<b>${wait}</b>개 더`;
  else if (G.restLeft === Infinity) el.innerHTML = '';
  else el.innerHTML = range1(cfg.restCards).map(i => `<i class="${i <= G.restLeft ? 'on' : ''}"></i>`).join('');
}
function renderTokens() {
  renderRest();
  const el = $('#tokens');
  const end = `<span class="tok-end" title="${SC.esc(SC.rewardLabel())}">${SC.rewardSvg()}</span>`;
  if (G.total <= 20) el.innerHTML = range1(G.total).map(i => `<span class="tok${i <= G.done ? ' on' : ''}${i === G.total && G.done === G.total - 1 ? ' last' : ''}"></span>`).join('') + end;
  else el.innerHTML = `<span class="bar"><i style="width:${G.done / G.total * 100}%"></i></span><span class="count">${G.done} / ${G.total}</span>` + end;
}

/* ---------- 답하기 ---------- */
function digit(d) {
  if (!G || G.paused || G.lock || G.answered || G.p.type !== 'input') return;
  if (G.input.length >= 3 || (G.input === '' && d === '0')) return;
  G.input += d; G.msg = null; render();
  if (G.input.length === String(G.p.ans).length) { G.lock = true; G.pendingSubmit = true; later(submitPending, 280); }
}
function del() { if (!G || G.lock || G.answered) return; G.input = G.input.slice(0, -1); render(); }
function submit() {
  if (!G || G.paused || G.lock || G.answered || G.p.type !== 'input' || !G.input) return;
  if (+G.input === G.p.ans) correct(); else wrong();
}
function choose(x) {
  if (G && !G.demo && G.wrong.has(x) && slip()) offerBreak();
  if (!G || G.lock || G.answered || G.wrong.has(x)) return;
  if (x === G.p.ans) correct(); else { G.wrong.add(x); wrong(); }
}
/* 세어 보기: 하나를 누를 때마다 한 번 센다 (일대일 대응) */
function tapObj(i) {
  if (!G || G.mode !== 'count' || G.lock) return;
  const p = G.p; if (p.type !== 'tap') return;
  if (p.order.includes(i)) { if (slip()) offerBreak(); G.msg = { kind: 'hint', html: '이미 센 것은 다시 세지 않아요.' }; render(); return; }
  p.order.push(i); const k = p.order.length;
  tone([440 + k * 40], .08); say(NATIVE[k]); G.msg = null;
  if (k === p.n) {
    if (cfg.answer === 'choice') toPick(p); else p.type = 'input';
    G.msg = { kind: 'hint', html: cfg.help === 'none' ? '다 셌어요.' : `마지막에 센 수는 <b>${NATIVE[k]}</b>.` };
    render();
    if (!G.demo) later(() => { if (!G.answered && !G.demo && !G.paused) say(M.count.speak(G)); }, 800);
    return;
  }
  render();
}
function wrong() {
  G.tries++; G.input = ''; tone([294], .22);
  const tired = slip();
  if (G.mode === 'flash') G.p.covered = false;
  const mode = M[G.mode];
  let words;
  if (E.showGhost()) {
    G.msg = { kind: 'ghost', html: G.p.type === 'input' ? `<b>${IEYO(G.p.ans)}</b> 따라 눌러요.` : '반짝이는 것을 눌러요.' };
    words = G.p.type === 'input' ? [IEYO(G.p.ans) + '.', '따라 눌러요.'] : ['반짝이는 것을 눌러요.'];
  } else if (E.showHint()) { G.msg = { kind: 'hint', html: mode.hint(G) }; words = ['괜찮아요.', ...mode.hintSay(G)]; }
  else { G.msg = { kind: 'retry', html: '다시 해 봐요.' }; words = ['괜찮아요.', '다시 해 봐요.']; }
  render();
  const alive = owner(), spoken = say(words);
  if (tired) { spoken.then(() => { if (alive()) offerBreak(); }); return; }
  /* 정답이 보이는 단계에서는 손가락이 바로 정답을 가리킨다 */
  if (E.showGhost()) later(() => showCue(true), 900);
}
function correct() {
  hideCue();
  G.answered = true; G.lock = true;
  const html = M[G.mode].good(G);
  tone([660, 880]);
  G.msg = { kind: 'good', html };
  const words = M[G.mode].goodSay(G);
  if (G.demo) { render(); G.demoSay = say(words); return; }
  /* 도움 단계 기록: 스스로(첫 시도) · 힌트 보고 · 정답 따라 누름 */
  if (G.tries === 0) G.firstOk++;
  else if (G.tries >= GHOST_AT[cfg.help]) G.prompted++;
  else G.hinted++;
  /* 정답을 따라 눌러야 했던 문제가 이어지면 힘든 신호로 보고 다음 문제에서 쉬기를 권한다 */
  G.hardRun = G.tries >= GHOST_AT[cfg.help] ? G.hardRun + 1 : 0;
  if (G.hardRun >= 2) { G.hardRun = 0; G.offerDue = true; }
  G.done++;
  if (M[G.mode].advance) M[G.mode].advance(G);
  render();
  const me = G, alive = owner();
  /* 칭찬을 다 듣고(소리가 꺼져 있으면 잠깐 보고) 다음 문제로 */
  const pause = cfg.voice ? (G.mode === 'board' ? 250 : 600) : (G.mode === 'board' ? 700 : 1400);
  say(words).then(() => sleep(pause)).then(() => {
    if (!alive() || $('#v-play').hidden) return;
    /* 반을 했을 때 함께 보기 (공동주의) */
    if (cfg.share === 'mid' && !me.midShared && me.total >= 4 && me.done === Math.ceil(me.total / 2) && me.done < me.total) {
      me.midShared = true; me.paused = true; hideCue();
      say(['반을 했어요!']).then(() => { if (alive()) SC.REG.share(() => { if (alive()) { me.paused = false; proceed(); } }); });
      return;
    }
    proceed();
  });
}
/* 다음 문제로. 쉬는 중이면 쉬기가 끝난 뒤에 넘어간다 */
function proceed() {
  if (!G) return;
  if (G.paused) { G.pendingNext = true; return; }
  /* '먼저 하고 그다음 쉬기' 약속을 지켰으면 이제 쉰다 (마지막 문제였으면 끝 화면의 활동이 곧 쉬기) */
  if (G.restAt != null && G.done >= G.restAt && G.done < G.total) {
    G.restAt = null; G.restWaited++;
    if (G.restLeft > 0) G.restLeft--;
    G.pendingNext = true;
    openRest(G, ['기다려 줘서 고마워요.', '이제 쉬어요.']);
    return;
  }
  if (G.done >= G.total) finish();
  else { if (M[G.mode].next) M[G.mode].next(G); nextProblem(); }
}
function saveRecord(stopped) {
  const recs = SC.readRecords();
  const r = {
    t: Date.now(), mode: G.mode, total: G.total, done: G.done, first: G.firstOk, range: G.R, level: cfg.level, help: cfg.help, small: cfg.small,
    hinted: G.hinted, prompted: G.prompted, askHelp: G.askHelp, askRest: G.askRest, offers: G.offers, demos: G.demos, moodStart: G.moodStart,
    restWaited: G.restWaited
  };
  if (stopped) r.stopped = true;
  recs.unshift(r);
  SC.store.set('rec', recs.slice(0, 300));
  return r.t;
}
function finish() {
  cancelWork(); hideCue(); resetQuit();
  tone([523, 659, 784, 1047], .12);
  const recT = saveRecord(false);
  $('#stars').innerHTML = ICON.star.repeat(Math.min(G.total, 20));
  $('#rewardPic').innerHTML = SC.rewardSvg();
  $('#rewardText').textContent = `이제 ${SC.rewardLabel()} 시간이에요!`;
  G.last = G.mode;
  keepAwake(false);
  SC.show('done');
  /* 끝 화면 순서: 다 했어요 → (함께 보기) → (기분 묻기) → 다음 활동 */
  const me = G, reward = `이제 ${SC.rewardLabel()} 시간이에요.`;
  const shareEl = $('#doneShare'), moodEl = $('#doneMood');
  const wantShare = cfg.share !== 'off', wantMood = cfg.mood === 'both';
  shareEl.hidden = !wantShare; moodEl.hidden = true;
  const toMood = () => {
    if (G !== me || $('#v-done').hidden) return;
    if (!wantMood) { say([reward]); return; }
    moodEl.hidden = false;
    say(['지금 기분이 어때요?']);
    SC.REG.moodRow($('#doneMoodPick'), k => {
      if (G !== me || $('#v-done').hidden) return;
      me.moodEnd = k;
      const recs = SC.readRecords(), r = recs.find(x => x.t === recT);
      if (r) { r.moodEnd = k; SC.store.set('rec', recs); }
      say([SC.REG.MOODS[k].label + '.', '말해 줘서 고마워요.', reward]);
    });
  };
  const head = ['다 했어요!', '정말 잘했어요.'];
  if (wantShare) {
    const ok = shareEl.querySelector('[data-share-ok]');
    ok.disabled = false;
    ok.onclick = () => { ok.onclick = null; ok.disabled = true; say(['와, 잘했어요!']).then(() => { if (!$('#v-done').hidden) toMood(); }); };
    say([...head, '선생님에게 보여 줘요.']);
  } else if (wantMood) say(head).then(() => { if (!$('#v-done').hidden) toMood(); });
  else say([...head, reward]);
}
/* 중간에 그만할 때: 한 문제라도 했거나 쉬기 때문에 멈췄으면 기록을 남긴다 */
function stopSession() {
  if (!G) return;
  cancelWork(); resetQuit(); cueSaid = null;
  SC.REG.closeAll();
  hush(); hideCue(); hidePointer(); veil.hidden = true; badge.hidden = true;
  if (G.done > 0 || G.askRest > 0 || G.moodStart === 'hard') saveRecord(true);
  keepAwake(false);
  G = null; SC.G = null; SC.show('home');
}

/* ---------- SCERTS: 학생의 요청과 정서 조절 ---------- */
/* 도와주세요: 앱이 학생 대신 말해 주고, 바로 들어준다(함께 풀기 = 손가락 시범) */
async function askHelp() {
  if (!G || G.demo || G.answered || G.paused || G.asking) return;
  const me = G, alive = owner();
  me.asking = true; me.askHelp++; hideCue();
  await say(['도와주세요.']);
  me.asking = false;
  if (alive() && !me.answered && !me.paused) runDemo(['같이 해 봐요.', '잘 봐요.']);
}
/* 쉬고 싶어요: 요청은 늘 들어준다. 다만 쉬기가 과제를 피하는 길이 되지 않게
   - 쉬기 카드가 남았고 방금 쉬지 않았으면: 바로 쉰다 (카드 한 장). 하던 문제는 그대로 두고, 다시 하기를 누르면 같은 문제로
   - 카드를 다 썼거나 방금 쉬었으면: "먼저 ○개 더 해요. 그다음에 쉬어요." → 그만큼 하면 저절로 쉰다 (기다리는 힘 기르기)
   - 앱이 힘든 신호를 보고 권한 쉬기(버튼이 빛날 때)는 카드 없이 바로 쉰다 */
const WAIT_SAY = { 1: '먼저 하나 더 해요.', 2: '먼저 두 개 더 해요.', 3: '먼저 세 개 더 해요.' };
async function askRest() {
  if (!G || G.demo || G.paused || G.restAsking) return;
  const me = G, btn = $('#askRestBtn'), invited = btn.classList.contains('invite');
  me.askRest++; btn.classList.remove('invite');
  if (!invited) {
    if (me.restAt == null) {
      const gap = Math.max(1, +cfg.restWait || 1);
      const noCard = me.restLeft <= 0, soon = me.done - me.lastRestDone < gap;
      if (noCard || soon) me.restAt = Math.max(noCard ? me.done + gap : 0, soon ? me.lastRestDone + gap : 0);
    }
    if (me.restAt != null) {
      me.restAsking = true; hideCue(); renderTokens();
      const left = SC.clamp(me.restAt - me.done, 1, 3);
      await say(['쉬고 싶어요.', '말해 줘서 고마워요.', WAIT_SAY[left], '그다음에 쉬어요.']);
      me.restAsking = false;
      if (G === me && !me.paused) armCue();
      return;
    }
    me.restLeft--;
  }
  me.restAt = null;
  openRest(me, ['쉬고 싶어요.', '말해 줘서 고마워요.', '잠깐 쉬어요.']);
}
function openRest(me, lead) {
  me.lastRestDone = me.done; pause(); renderTokens();
  SC.REG.openBreak(lead, () => resume(me), () => stopSession());
}
function pause() { if (!G) return; G.paused = true; hideCue(); hidePointer(); hush(); }
function resume(me) {
  if (!G || G !== me) return;
  G.paused = false;
  if (G.pendingNext) { G.pendingNext = false; proceed(); return; }
  if (G.pendingSubmit) { submitPending(); return; }
  G.msg = null; render();
  say(['다시 해요.', ...M[G.mode].speak(G)]);
}
/* 힘든 신호: 짧은 시간(5초)에 4번 헛누름·틀림. 쉬기를 권할 때면 true */
function slip() {
  if (!G || G.demo) return false;
  const now = Date.now();
  G.slips = G.slips.filter(t => now - t < 5000); G.slips.push(now);
  if (G.slips.length < 4 || !cfg.offerBreak || !cfg.askBtns || G.offeredAt === G.done) return false;
  G.slips = []; return true;
}
/* 쉬기를 권한다: 쉬기 버튼에 불을 켜고 손가락으로 가리킨다. 강요하지 않고 학생이 고르게 한다 */
async function offerBreak() {
  if (!G || !cfg.offerBreak || !cfg.askBtns || G.demo || G.paused || G.offeredAt === G.done) return;
  G.offeredAt = G.done; G.offers++;
  hideCue();
  const alive = cueOwner();
  const btn = $('#askRestBtn');
  btn.classList.add('invite');
  await say(['괜찮아요.', '쉬고 싶으면 여기를 눌러요.']);
  if (!alive()) return;
  await pointTo(btn, true, alive);
  if (alive()) later(() => { hidePointer(); armCue(); }, 2500, alive);
}

/* ---------- 손가락 (보여 주기 · 안내) ---------- */
const pointer = document.createElement('div');
pointer.className = 'pointer'; pointer.hidden = true;
pointer.innerHTML = '<span class="ring"></span>' + ICON.handSolid;
document.body.appendChild(pointer);
const veil = document.createElement('div');
veil.className = 'veil'; veil.hidden = true;
document.body.appendChild(veil);
const badge = document.createElement('div');
badge.className = 'demo-badge'; badge.hidden = true;
badge.innerHTML = ICON.eye + '<span>잘 봐요</span>';
document.body.appendChild(badge);

async function pointTo(target, bob, alive = owner()) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return false;
  let r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) { el.scrollIntoView({ block: 'center' }); await sleep(120); r = el.getBoundingClientRect(); }
  if (!alive()) return false;
  pointer.classList.toggle('bob', !!bob);
  if (pointer.hidden) { pointer.style.transition = 'none'; pointer.style.transform = `translate(${innerWidth / 2}px,${innerHeight}px)`; pointer.hidden = false; void pointer.offsetWidth; pointer.style.transition = ''; }
  pointer.style.transform = `translate(${r.left + r.width / 2}px,${r.top + r.height / 2}px)`;
  await sleep(cfg.calm ? 250 : 720);
  return alive();
}
async function tapFx(alive) { if (!alive()) return; pointer.classList.add('tap'); await sleep(260); if (alive()) pointer.classList.remove('tap'); }
function hidePointer() { pointer.hidden = true; pointer.classList.remove('bob', 'tap'); }

/* 보여 주기: 같은 문제를 손가락이 먼저 풀고, 끝나면 처음 상태로 되돌려 학생 차례로 넘긴다 */
async function runDemo(lead) {
  if (!G || G.demo || G.answered || G.paused) return;
  const me = G, mode = M[G.mode];
  cancelWork();
  const owned = owner(), alive = () => owned() && me.demo;
  hideCue(); hush();
  /* 학생이 하다 만 상태(센 그림, 누른 숫자, 틀린 보기)와 상관없이 처음 상태에서 보여 준다 */
  me.demo = true; veil.hidden = false; badge.hidden = false;
  me.p = clone(me.p0);
  Object.assign(me, { tries: 0, input: '', lock: false, wrong: new Set(), msg: { kind: 'demo', html: (lead || ['잘 봐요.', '먼저 보여 줄게요.']).join(' ') } });
  render();
  /* 처음 자동 시범이 아니면(보여 줘 버튼, 도와주세요) 다시 본 시범으로 센다 */
  if (me.introDone) me.demos++;
  try {
    await say([...(me.introDone ? [] : [mode.label + '.']), ...(lead || ['잘 봐요.', '먼저 보여 줄게요.'])]);
    if (!alive()) return;
    me.introDone = true;
    if (me.p.type === 'tap') {
      for (const i of [...me.p.cells].sort((a, b) => a - b)) {
        if (!alive()) return;
        await pointTo(`[data-obj="${i}"]`, false, alive); if (!alive()) return;
        await tapFx(alive); if (!alive()) return;
        tapObj(i); await sleep(cfg.voice ? 700 : 350);
      }
      await sleep(300);
    }
    for (const s of mode.look ? mode.look(me) : []) {
      if (!alive()) return;
      if (await pointTo(s.sel, false, alive)) await say(s.say);
      await sleep(250);
    }
    if (!alive()) return;
    const ans = me.p.ans;
    if (me.p.type === 'input') {
      for (const d of String(ans)) {
        if (!alive()) return;
        await pointTo(`#pad [data-k="${d}"]`, false, alive); if (!alive()) return;
        await tapFx(alive); if (!alive()) return;
        digit(d); await sleep(150);
      }
      await sleep(500);
    } else {
      await pointTo(me.p.type === 'cmp' ? `#stage [data-pick="${ans}"]` : `#choices [data-pick="${ans}"]`, false, alive);
      if (!alive()) return;
      await tapFx(alive); if (!alive()) return;
      choose(ans);
    }
    await sleep(200);
    if (me.demoSay) await me.demoSay;
    await sleep(500);
  } finally {
    if (owned()) { veil.hidden = true; badge.hidden = true; hidePointer(); }
    me.demo = false; me.demoSay = null;
  }
  if (!owned()) return;
  cancelWork();
  /* 학생 차례: 같은 문제를 처음 상태로 */
  me.p = clone(me.p0);
  Object.assign(me, { answered: false, lock: false, tries: 0, input: '', wrong: new Set(), msg: { kind: 'turn', html: '이제 해 봐요.' } });
  render();
  say(['이제 해 봐요.', ...mode.speak(me)]);
}

/* 손가락 안내: 일정 시간 아무것도 안 하면 누를 곳을 가리킨다 */
let cueTimer = null, cueSaid = null, cueRevision = 0;
function cueOwner() {
  const owned = owner(), revision = cueRevision;
  return () => owned() && revision === cueRevision && !G.demo && !G.answered && !G.paused && !$('#v-play').hidden;
}
function armCue() {
  cueRevision++;
  clearTimeout(cueTimer);
  if (!G || G.demo || G.answered || G.paused || $('#v-play').hidden) return;
  cueTimer = later(() => showCue(false), CUE_AFTER[cfg.help], cueOwner());
}
function cueTarget(exact) {
  const p = G.p;
  if (p.type === 'tap') return $('.obj:not(.counted):not(.e)');
  if (p.type === 'pick') return exact ? $(`#choices [data-pick="${p.ans}"]`) : $('#choices');
  if (p.type === 'cmp') return exact ? $(`#stage [data-pick="${p.ans}"]`) : $('.pair');
  if (p.type === 'input') {
    if (!exact) return $('#pad');
    const want = String(p.ans), next = want.startsWith(G.input) ? want[G.input.length] : want[0];
    return $(`#pad [data-k="${next}"]`);
  }
  return null;
}
async function showCue(exact) {
  if (!G || G.demo || G.answered || G.paused || $('#v-play').hidden) return;
  /* 손가락 안내를 세 번 받아도 움직이지 않으면 멈춘(지친) 신호로 보고 쉬기를 권한다 */
  if (!exact && ++G.cues >= 3 && cfg.offerBreak && cfg.askBtns && G.offeredAt !== G.done) { offerBreak(); return; }
  const el = cueTarget(exact);
  if (!el) return;
  const alive = cueOwner();
  await pointTo(el, true, alive);
  if (!alive()) return;
  /* 계속 움직이지 않으면 조금 더 길게 기다렸다가 다시 가리킨다 (세 번째에는 쉬기를 권함) */
  clearTimeout(cueTimer);
  cueTimer = later(() => showCue(false), Math.max(6000, CUE_AFTER[cfg.help] * 2), alive);
  if (!G) return;
  const key = G.p.type + G.done;
  if (cueSaid !== key) { cueSaid = key; say([G.p.type === 'tap' ? '여기를 눌러요.' : G.p.type === 'input' ? '숫자를 눌러요.' : '여기에서 골라요.']); }
}
function hideCue() { cueRevision++; clearTimeout(cueTimer); if (!G || !G.demo) hidePointer(); }
addEventListener('scroll', () => { if (!G || !G.demo) hidePointer(); }, { passive: true });

/* ---------- 입력 연결 (보여 주기 중에는 학생 입력을 막는다) ---------- */
const busy = () => !G || G.demo || G.paused;
$('#pad').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b || busy()) return; hideCue();
  const k = b.dataset.k; if (k === 'del') del(); else if (k === 'ok') submit(); else digit(k);
});
$('#choices').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b && !busy()) { hideCue(); choose(+b.dataset.pick); } });
$('#stage').addEventListener('click', e => {
  if (busy()) return;
  hideCue();
  const b = e.target.closest('[data-pick]'); if (b) { choose(+b.dataset.pick); return; }
  const o = e.target.closest('[data-obj]'); if (o) { tapObj(+o.dataset.obj); return; }
  if (e.target.closest('[data-again]') && G.mode === 'flash') { G.p.covered = false; render(); return; }
  const c = e.target.closest('[data-n]'); if (!c || G.mode !== 'board' || G.lock || G.answered) return;
  const n = +c.dataset.n; if (n === G.cur) return;
  if (cfg.order) { G.msg = { kind: 'hint', html: '노란 칸부터 채워요.' }; render(); showCue(false); return; }
  G.cur = n; nextProblem();
});
$('#stage').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-n]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('keydown', e => {
  if ($('#v-play').hidden || busy()) return;
  if (e.target.matches('input,select,textarea')) return;
  hideCue();
  if (/^[0-9]$/.test(e.key)) { if (G.p.type === 'pick') { if (G.p.opts.includes(+e.key)) choose(+e.key); } else digit(e.key); }
  else if (e.key === 'Backspace') { e.preventDefault(); del(); }
  else if (e.key === 'Enter' && !e.target.matches('button')) submit();
});
$('#speakBtn').addEventListener('click', () => { if (G && !G.demo && !G.paused) say(M[G.mode].speak(G), true); });
$('#demoBtn').addEventListener('click', () => runDemo());
$('#askHelpBtn').addEventListener('click', () => askHelp());
$('#askRestBtn').addEventListener('click', () => askRest());
let quitTimer = null;
function resetQuit() {
  clearTimeout(quitTimer);
  const b = $('#quitBtn'); b.classList.remove('sure');
  if (b.dataset.label) b.innerHTML = b.dataset.label;
}
$('#quitBtn').addEventListener('click', e => {
  const b = e.currentTarget;
  if (b.classList.contains('sure')) {
    clearTimeout(quitTimer); b.classList.remove('sure'); b.innerHTML = b.dataset.label;
    stopSession(); return;
  }
  b.dataset.label = b.dataset.label || b.innerHTML;
  b.classList.add('sure'); b.textContent = '한 번 더 누르면 그만해요';
  quitTimer = setTimeout(() => { b.classList.remove('sure'); b.innerHTML = b.dataset.label; }, 3000);
});
$('#againBtn').addEventListener('click', () => start(G && G.last || 'count'));

/* ---------- 태블릿 ---------- */
/* 오래된 태블릿 브라우저에는 structuredClone이 없어서 직접 복사한다 (Set이 들어 있음) */
function clone(o) {
  if (typeof structuredClone === 'function') return structuredClone(o);
  const out = {};
  for (const k in o) { const v = o[k]; out[k] = v instanceof Set ? new Set(v) : Array.isArray(v) ? v.slice() : v; }
  return out;
}
/* 놀이하는 동안 화면이 꺼지지 않게 (지원하는 기기만) */
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hush(); hideCue(); }
  else if (G && !$('#v-play').hidden) { keepAwake(true); armCue(); }
});
/* 화면을 돌리면 손가락 위치가 어긋나므로 숨기고 다시 기다린다 */
addEventListener('resize', () => { if (!G || G.demo) return; hidePointer(); armCue(); });
/* 놀이 화면에서 길게 누를 때 뜨는 메뉴 막기 */
document.addEventListener('contextmenu', e => { if (e.target.closest('#v-play,#v-home,#v-done')) e.preventDefault(); });

SC.start = start;
})(window.SC);
