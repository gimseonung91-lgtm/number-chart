/* app.js — 화면 전환, 홈, 선생님 모드(확인 후 열림), 설정, 기록, 태블릿 다루기 */
(function (SC) {
'use strict';
const { $, $$, cfg, saveCfg, say, esc, ICON, REWARDS, MODES } = SC;
const VIEWS = ['home', 'play', 'done', 'teacher', 'print', 'records', 'settings'];
const TEACHER_VIEWS = ['teacher', 'print', 'records', 'settings'];
const isTeacher = () => document.body.classList.contains('teacher');

function show(v, opt) {
  if (TEACHER_VIEWS.includes(v) && !isTeacher()) v = 'home';
  VIEWS.forEach(x => { $('#v-' + x).hidden = x !== v; });
  $$('.nav button').forEach(b => b.setAttribute('aria-current', b.dataset.go === v ? 'page' : 'false'));
  document.body.dataset.view = v;
  if (v === 'home') renderHome();
  if (v === 'print') SC.openPrint(opt);
  if (v === 'records') renderRecords();
  if (v === 'settings') fillSettings();
  window.scrollTo(0, 0);
}
SC.show = show;

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go && $('#v-play').hidden) show(go.dataset.go);
  const st = e.target.closest('[data-start]');
  if (st) SC.start(st.dataset.start);
});

/* ---------- 선생님 모드 ----------
   '선생님' 버튼 → 확인 창 → 버튼을 2초 동안 누르고 있으면 열린다.
   글을 읽어야 방법을 알 수 있어서, 학생이 우연히 열 일이 거의 없다. */
const teach = $('#teachBtn'), gate = $('#gate'), hold = $('#holdBtn');
function setTeacher(on) {
  document.body.classList.toggle('teacher', on);
  teach.querySelector('span').textContent = on ? '학생 화면으로' : '선생님';
}
teach.addEventListener('click', () => {
  if (isTeacher()) { setTeacher(false); show('home'); return; }
  gate.hidden = false; hold.focus();
});
let holdT = null;
const holdEnd = () => { clearTimeout(holdT); holdT = null; hold.classList.remove('hold'); };
const closeGate = () => { holdEnd(); gate.hidden = true; };
$('#gateClose').addEventListener('click', closeGate);
gate.addEventListener('click', e => { if (e.target === gate) closeGate(); });
const holdStart = e => {
  holdEnd();
  if (gate.hidden) return;
  e.preventDefault(); hold.classList.add('hold');
  holdT = setTimeout(() => { closeGate(); setTeacher(true); show('teacher'); }, 2000);
};
hold.addEventListener('pointerdown', holdStart);
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => hold.addEventListener(t, holdEnd));
hold.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) holdStart(e); });
hold.addEventListener('keyup', holdEnd);
hold.addEventListener('blur', holdEnd);
window.addEventListener('blur', holdEnd);
hold.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !gate.hidden) closeGate(); });

/* 학생 화면 시작: 선생님 메뉴를 닫고, 되면 전체 화면으로 (태블릿에서 다른 화면으로 새지 않게) */
$('#studentStart').addEventListener('click', () => {
  setTeacher(false); show('home');
  const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
  if (fs) { try { const r = fs.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 전체 화면이 안 되는 기기 */ } }
});

/* ---------- 홈 ---------- */
function chipRow(el, opts, key) {
  el.innerHTML = opts.map(([v, l]) => `<button class="chip" data-v="${v}" aria-pressed="${String(cfg[key]) === String(v)}">${l}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; cfg[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; saveCfg(); renderHome(); };
}
function renderHome() {
  chipRow($('#q-small'), [[5, '5까지'], [10, '10까지']], 'small');
  chipRow($('#q-range'), [[20, '1~20'], [30, '1~30'], [50, '1~50'], [100, '1~100']], 'range');
  chipRow($('#q-level'), [[1, '옆'], [2, '위아래'], [3, '모두']], 'level');
  chipRow($('#q-answer'), [['choice', '고르기'], ['pad', '키패드']], 'answer');
  /* 먼저-다음 판: 글을 몰라도 그림으로 '공부 다음에 이것' */
  $('#firstThen').innerHTML = `<span class="ft ft-pic">${ICON.star} 수 공부</span><span aria-hidden="true">→</span><span class="ft then ft-pic">${SC.rewardSvg()} ${esc(SC.rewardLabel())}</span>`;
}

/* ---------- 설정 ---------- */
function fillSettings() {
  const ids = ['range', 'blanks', 'count', 'level', 'help', 'answer', 'small', 'choiceN', 'demo', 'reward', 'mood', 'breakSec', 'share', 'restCards', 'restWait'];
  ids.forEach(k => { $('#s-' + k).value = cfg[k]; });
  ['order', 'sound', 'voice', 'calm', 'flash', 'askBtns', 'offerBreak'].forEach(k => { $('#s-' + k).checked = !!cfg[k]; });
  $('#rwPick').innerHTML = Object.entries(REWARDS).map(([k, r]) => `<button type="button" data-rw="${k}" aria-pressed="${cfg.rewardIcon === k}" aria-label="${r.label}" title="${r.label}">${r.svg}</button>`).join('');
  $('#s-reward').placeholder = (REWARDS[cfg.rewardIcon] || REWARDS.block).label;
}
$('#rwPick').addEventListener('click', e => {
  const b = e.target.closest('[data-rw]'); if (!b) return;
  cfg.rewardIcon = b.dataset.rw; saveCfg(); fillSettings();
});
$('#v-settings').addEventListener('input', e => {
  const el = e.target; if (!el.id || !el.id.startsWith('s-')) return;
  const k = el.id.slice(2);
  if (el.type === 'checkbox') cfg[k] = el.checked;
  else if (['range', 'count', 'level', 'small', 'choiceN', 'breakSec', 'restCards', 'restWait'].includes(k)) cfg[k] = +el.value;
  else if (k === 'blanks') { const v = parseInt(el.value, 10); if (!isNaN(v)) cfg.blanks = SC.clamp(v, 1, 99); }
  else cfg[k] = el.value;
  saveCfg();
  if (k === 'voice' && el.checked) say('소리 내어 읽어 줄게요.');
});

/* ---------- 기록 ---------- */
const HELP_LABEL = { lots: '많이', some: '조금', none: '스스로' };
function renderRecords() {
  const recs = SC.readRecords();
  const fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const MOODS = SC.REG.MOODS;
  const face = k => MOODS[k] ? `<span class="rface" title="${MOODS[k].label}">${MOODS[k].icon}</span>` : '<span class="small-note">-</span>';
  const doneOf = r => r.done != null ? r.done : r.total;
  const pctOf = r => doneOf(r) ? Math.round(r.first / doneOf(r) * 100) : 0;
  const rangeOf = r => SC.BASICS.includes(r.mode) ? (r.small ? r.small + '까지' : '-') : r.mode === 'ten' ? `10~${Math.max(r.range, 20)}` : '1~' + r.range;
  $('#recBody').innerHTML = recs.length ? recs.slice(0, 60).map((r, i) => `<tr><td>${fmt(r.t)}</td><td>${MODES[r.mode] ? MODES[r.mode].label : r.mode}</td><td>${rangeOf(r)}</td><td>${r.mode === 'near' || r.mode === 'seq' ? r.level + '단계' : '-'}</td><td>${HELP_LABEL[r.help] || ''}</td><td>${r.first} / ${doneOf(r)} (${pctOf(r)}%)${r.stopped ? ` <span class="small-note">· ${r.total}개 중 멈춤</span>` : ''}</td><td>${r.hinted != null ? `${r.hinted} · ${r.prompted}` : '-'}</td><td${r.askRest >= 3 ? ' class="warn" title="쉬기 요청이 잦아요"' : ''}>${r.askHelp != null ? `${r.askHelp} · ${r.askRest}${r.restWaited ? ` <span class="small-note">(기다림 ${r.restWaited})</span>` : ''}` : '-'}</td><td>${r.moodStart || r.moodEnd ? `${face(r.moodStart)} → ${face(r.moodEnd)}` : '-'}</td><td><button class="btn ghosty sm" data-rec="${i}">학습지</button></td></tr>`).join('')
    : '<tr><td colspan="10" class="small-note">아직 기록이 없어요. 놀이를 한 번 끝까지 하면 여기에 쌓여요.</td></tr>';
  $('#recSum').innerHTML = Object.keys(MODES).map(m => {
    const rs = recs.filter(r => r.mode === m && doneOf(r) > 0).slice(0, 5);
    if (!rs.length) return `<div><span class="small-note">${MODES[m].label}</span><b>-</b><span class="small-note">기록 없음</span></div>`;
    const pct = Math.round(rs.reduce((a, r) => a + r.first / doneOf(r), 0) / rs.length * 100);
    return `<div><span class="small-note">${MODES[m].label}</span><b>${pct}%</b><span class="small-note">최근 ${rs.length}번 평균</span></div>`;
  }).join('');
  /* SCERTS 관찰: 최근 10번 놀이의 요청·조절·기분 (새 기록부터 쌓임) */
  const last = recs.filter(r => r.askHelp != null).slice(0, 10);
  const sum = k => last.reduce((a, r) => a + (r[k] || 0), 0);
  const solved = last.reduce((a, r) => a + doneOf(r), 0);
  const moodCount = key => Object.keys(MOODS).map(k => `${face(k)}${last.filter(r => r[key] === k).length}`).join(' ');
  const tile = (label, val, note) => `<div><span class="small-note">${label}</span><b>${val}</b><span class="small-note">${note}</span></div>`;
  $('#recScerts').innerHTML = !last.length ? '<p class="small-note">새로 하는 놀이부터 요청·쉬기·기분이 기록돼요.</p>' : [
    tile('도움 단계', `${sum('first')} · ${sum('hinted')} · ${sum('prompted')}`, `스스로 · 힌트 후 · 따라 함 (모두 ${solved}문제)`),
    tile('스스로 한 요청', `${sum('askHelp')} · ${sum('askRest')}`, '도와주세요 · 쉬고 싶어요'),
    tile('쉬기 권유 · 다시 본 시범', `${sum('offers')} · ${sum('demos')}`, '힘든 신호를 보고 권한 횟수 · 보여 줘'),
    tile('기다렸다 쉬기', `${sum('restWaited')}번`, '먼저 문제를 하고 쉰 횟수'),
    tile('중간에 멈춤', `${last.filter(r => r.stopped).length}번`, `최근 ${last.length}번 중`),
    `<div><span class="small-note">시작할 때 기분</span><span class="rmoods">${moodCount('moodStart')}</span></div>`,
    `<div><span class="small-note">끝날 때 기분</span><span class="rmoods">${moodCount('moodEnd')}</span></div>`
  ].join('') + (last.length >= 3 && sum('askRest') / last.length >= 2
    ? '<p class="small-note warn">쉬기 요청이 잦아요(한 번에 평균 2번 이상). 설정의 쉬기 카드와 먼저 할 문제 수를 쓰고, 문제가 어렵거나 길지 않은지, 다 한 뒤의 활동이 충분히 좋은지 살펴 주세요.</p>' : '');
}
$('#recBody').addEventListener('click', e => {
  const b = e.target.closest('[data-rec]'); if (!b) return;
  const r = SC.readRecords()[+b.dataset.rec]; if (r) show('print', r);
});
let clearArmed = false;
$('#clearRec').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!clearArmed) {
    clearArmed = true; b.textContent = '정말 지울까요? 한 번 더 누르세요'; $('#clearNote').textContent = '';
    setTimeout(() => { clearArmed = false; b.textContent = '기록 모두 지우기'; }, 4000); return;
  }
  clearArmed = false; SC.store.set('rec', []); b.textContent = '기록 모두 지우기'; $('#clearNote').textContent = '기록을 지웠어요.'; renderRecords();
});

/* 버튼 속 그림 채우기 (HTML에는 자리만 둔다) */
$$('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', ICON[el.dataset.icon] || ''); });

show('home');
})(window.SC);
