/* path.js — 학습 단계 경로 (12회차).
   수 개념 지도 순서(구체물 → 그림 → 기호, 세기 → 한눈에 → 1 큰/작은 수 → 순서 낱말 → 줄 이어 읽기 → 10 묶음 → 배열표 → 뛰어 세기)를
   단계 목록 하나로 둔다. 단계를 고르면 그 단계의 놀이와 설정이 그대로 적용된다(설정 화면에서도 보임).

   다음 단계로 넘어가는 방법 (cfg.advance) — 팀 논의 결론
   - 'teacher' : 선생님이 단계 화면에서 직접 고른다. 앱은 기록만 쌓는다.
   - 'suggest' : 앱이 기록을 보고 '올려도 좋아요' / '한 단계 쉬운 것을 해 보세요'를 선생님 화면에만 띄운다.
                 실제로 바꾸는 것은 늘 선생님이 누른다. 학생 화면에는 아무 변화가 없다.
     이유: 자폐성장애 학생은 예고 없는 변화에 크게 흔들린다. 또 화면 정답률만으로 개념 습득을 판단하지 않기로 했다
           (수 개념 지도 메모 9절). 그래서 앱은 근거를 보여 주고, 결정은 블록 활동 등 앱 밖 모습까지 본 선생님이 한다.
   제안 기준
   - 올리기: 이 단계에서 5문제 이상 끝까지 한 최근 3번 놀이가 모두 '스스로 맞힘' 80% 이상이고 '정답 따라 누름'이 0번
   - 내리기: 최근 2번 놀이가 모두 '스스로 맞힘' 40% 미만이거나, 최근 2번 모두 중간에 멈춤 */
(function (SC) {
'use strict';
const PATH = [
  /* 수 세기와 한눈에 보기 */
  { area: '세기', name: '하나씩 세기 (5까지)', mode: 'count', set: { small: 5 } },
  { area: '세기', name: '한눈에 보기 (5까지)', mode: 'flash', set: { small: 5 } },
  { area: '세기', name: '1 큰 수 · 1 작은 수 (5까지)', mode: 'stair', set: { small: 5 } },
  { area: '세기', name: '하나씩 세기 (10까지)', mode: 'count', set: { small: 10 } },
  { area: '세기', name: '1 큰 수 · 1 작은 수 (10까지)', mode: 'stair', set: { small: 10 } },
  /* 순서 낱말: 한 줄 기차 위에서 */
  { area: '순서 낱말', name: '다음 수 (1~20)', mode: 'order', set: { orderAsk: 'next', range: 20 } },
  { area: '순서 낱말', name: '전 수 (1~20)', mode: 'order', set: { orderAsk: 'prev', range: 20 } },
  { area: '순서 낱말', name: '다음 수 · 전 수 섞기 (1~30)', mode: 'order', set: { orderAsk: 'both', range: 30 } },
  /* 줄 이어 읽기: 띠 → 띠와 표 → 표 */
  { area: '줄 이어 읽기', name: '한 줄 띠에서 다음 수', mode: 'wrap', set: { wrapView: 'line', range: 20 } },
  { area: '줄 이어 읽기', name: '띠를 접어 배열표로', mode: 'wrap', set: { wrapView: 'fold', range: 30 } },
  { area: '줄 이어 읽기', name: '배열표에서 줄 끝 다음 수', mode: 'wrap', set: { wrapView: 'grid', range: 50 } },
  /* 10 묶음과 배열표 */
  { area: '배열표', name: '10 묶음 (1~30)', mode: 'ten', set: { range: 30 } },
  { area: '배열표', name: '수 배열표 채우기 (1~30)', mode: 'board', set: { range: 30, blanks: 6, order: true } },
  { area: '배열표', name: '이웃 수 · 옆 (1~50)', mode: 'near', set: { range: 50, level: 1 } },
  { area: '배열표', name: '이웃 수 · 위아래 (1~50)', mode: 'near', set: { range: 50, level: 2 } },
  /* 뛰어 세기: 줄이 안 바뀌는 10씩 → 2씩(짝수) → 5씩 → 2씩(홀수) */
  { area: '뛰어 세기', name: '10씩 뛰어 세기 (10 큰 수)', mode: 'skip', set: { skipBy: 10, range: 50 } },
  { area: '뛰어 세기', name: '2씩 뛰어 세기 (2, 4, 6…)', mode: 'skip', set: { skipBy: 2, skipOdd: false, range: 30 } },
  { area: '뛰어 세기', name: '5씩 뛰어 세기 (5, 10, 15…)', mode: 'skip', set: { skipBy: 5, range: 50 } },
  { area: '뛰어 세기', name: '2씩 뛰어 세기 (1, 3, 5…)', mode: 'skip', set: { skipBy: 2, skipOdd: true, range: 30 } },
  { area: '뛰어 세기', name: '수 이어가기 · 모두 섞기 (1~100)', mode: 'seq', set: { level: 3, range: 100 } }
];
const UP = { runs: 3, pct: 0.8 }, DOWN = { runs: 2, pct: 0.4 };

/* 단계 적용: 그 단계의 놀이를 시작 화면의 놀이로, 설정값을 실제 설정으로 */
function applyStep(i) {
  const s = PATH[i]; if (!s) return;
  Object.assign(SC.cfg, s.set, { step: i, homeMode: s.mode });
  SC.saveCfg();
}
/* 기록 한 건이 이 단계의 놀이인가 (단계 번호가 붙은 기록만) */
const ofStep = (r, i) => r.step === i && r.mode === PATH[i].mode;
const doneOf = r => r.done != null ? r.done : r.total;
const rate = r => doneOf(r) ? r.first / doneOf(r) : 0;
/* 제안: {kind:'up'|'down', from, to, why} 또는 null. 'suggest'일 때만 */
function suggestion(recs) {
  const cfg = SC.cfg, i = cfg.step;
  if (cfg.advance !== 'suggest' || !PATH[i]) return null;
  const rs = (recs || SC.readRecords()).filter(r => ofStep(r, i));
  const full = rs.filter(r => !r.stopped && doneOf(r) >= 5).slice(0, UP.runs);
  if (i < PATH.length - 1 && full.length === UP.runs && full.every(r => rate(r) >= UP.pct && !r.prompted))
    return { kind: 'up', from: i, to: i + 1, why: `최근 ${UP.runs}번 모두 스스로 맞힘 ${Math.round(UP.pct * 100)}% 이상, 정답 따라 누름 없음` };
  const last = rs.slice(0, DOWN.runs);
  if (i > 0 && last.length === DOWN.runs && (last.every(r => r.stopped) || last.every(r => rate(r) < DOWN.pct)))
    return { kind: 'down', from: i, to: i - 1, why: last.every(r => r.stopped) ? `최근 ${DOWN.runs}번 모두 중간에 멈춤` : `최근 ${DOWN.runs}번 모두 스스로 맞힘 ${Math.round(DOWN.pct * 100)}% 미만` };
  return null;
}

Object.assign(SC, { PATH, applyStep, stepSuggestion: suggestion, PATH_RULE: { UP, DOWN } });
})(window.SC);
