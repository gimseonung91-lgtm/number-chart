/* scerts.js — SCERTS 모델의 사회 의사소통(SC)·정서 조절(ER)을 돕는 화면.
   - 기분 묻기: 얼굴 그림 3개에서 고른다 (감정을 상징으로 표현하기)
   - 쉬는 곳: 숨쉬기 그림과 줄어드는 막대 (스스로 진정하는 전략, 끝이 보이는 쉬기)
   - 함께 보기: "선생님에게 보여 줘요" (공동주의 — 같은 것을 보며 함께 기뻐하기)
   놀이 진행(멈춤·다시 하기)은 play.js가 맡고, 여기는 화면과 말만 다룬다. */
(function (SC) {
'use strict';
const { $, cfg, sleep, say, hush, ICON, REWARDS } = SC;

/* 기분: 같은 뜻 = 같은 그림. 색으로 좋고 나쁨을 가르지 않는다(빨강 없음) */
const MOODS = {
  good: { label: '좋아요', icon: ICON.faceGood },
  soso: { label: '그저 그래요', icon: ICON.faceSoso },
  hard: { label: '힘들어요', icon: ICON.faceHard }
};
const moodBtns = () => Object.entries(MOODS).map(([k, m]) =>
  `<button class="mood m-${k}" data-mood="${k}" aria-label="${m.label}">${m.icon}<span>${m.label}</span></button>`).join('');

/* 쉬기 그림은 '쉬기' 보상 그림과 같은 달 모양 (같은 뜻 = 같은 그림) */
const REST_SVG = REWARDS.rest.svg;
$('#askRestBtn').insertAdjacentHTML('afterbegin', REST_SVG);
$('#breathIc').innerHTML = REST_SVG;
$('#sharePic').innerHTML = ICON.people + ICON.star;
document.querySelector('#doneShare .share-pic').innerHTML = ICON.people + ICON.star;

function open(el) { el.hidden = false; const b = el.querySelector('button'); if (b) b.focus({ preventScroll: true }); }

/* ---------- 기분 묻기 ---------- */
function askMood(onPick) {
  const view = $('#moodView'), box = $('#moodPick');
  box.innerHTML = moodBtns();
  box.onclick = e => {
    const b = e.target.closest('[data-mood]'); if (!b) return;
    box.onclick = null; view.hidden = true;
    onPick(b.dataset.mood);
  };
  open(view);
  say(['지금 기분이 어때요?']);
}
/* 끝 화면에 얼굴 줄 그리기 */
function moodRow(el, onPick) {
  el.innerHTML = moodBtns();
  el.onclick = e => {
    const b = e.target.closest('[data-mood]'); if (!b) return;
    el.querySelectorAll('[data-mood]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    onPick(b.dataset.mood);
  };
}

/* ---------- 쉬는 곳 ---------- */
let brk = null;
function openBreak(lead, onBack, onStop) {
  closeBreak();
  const view = $('#breakView'), bar = $('#btimerBar'), circle = view.querySelector('.breath');
  const total = (+cfg.breakSec || 30) * 1000, t0 = Date.now();
  const me = brk = { onBack, onStop, timer: null, alive: true };
  view.classList.remove('over');
  bar.style.width = '100%';
  circle.classList.remove('in');
  open(view);
  me.timer = setInterval(() => {
    const left = Math.max(0, total - (Date.now() - t0));
    bar.style.width = (left / total * 100) + '%';
    if (!left) {
      clearInterval(me.timer);
      if (!me.alive) return;
      view.classList.add('over');
      say(['다시 해 볼까요?']);
    }
  }, 250);
  /* 숨쉬기: 4초 들이쉬고 4초 내쉬기. 처음 두 번만 말로 이끌고, 그 뒤에는 그림만 */
  (async () => {
    await say(lead);
    for (let i = 0; me.alive && Date.now() - t0 < total; i++) {
      circle.classList.add('in');
      const a = Date.now(); if (i < 2) await say(['숨을 크게 들이쉬어요.']); await sleep(Math.max(0, 4000 - (Date.now() - a)));
      if (!me.alive) return;
      circle.classList.remove('in');
      const b = Date.now(); if (i < 2) await say(['후, 내쉬어요.']); await sleep(Math.max(0, 4000 - (Date.now() - b)));
    }
  })();
}
function closeBreak() {
  if (!brk) return null;
  const me = brk; brk = null; me.alive = false; clearInterval(me.timer);
  $('#breakView').hidden = true; hush();
  return me;
}
$('#breakBack').addEventListener('click', () => { const me = closeBreak(); if (me) me.onBack(); });
$('#breakStop').addEventListener('click', () => { const me = closeBreak(); if (me) me.onStop(); });

/* ---------- 함께 보기 ---------- */
function share(onDone) {
  const view = $('#shareView'), ok = $('#shareOk');
  ok.onclick = () => { ok.onclick = null; view.hidden = true; say(['와, 잘했어요!']).then(onDone); };
  open(view);
  say(['선생님에게 보여 줘요.']);
}

/* 놀이 밖으로 나갈 때 열린 창 모두 닫기 */
function closeAll() {
  closeBreak();
  ['#moodView', '#shareView'].forEach(s => { $(s).hidden = true; });
}

SC.REG = { MOODS, askMood, moodRow, openBreak, closeBreak, share, closeAll };
})(window.SC);
