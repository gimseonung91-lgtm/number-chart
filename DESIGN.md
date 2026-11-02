# 학생 화면 디자인 기준

## 1. 목적과 사용자
특수교육대상 학생·느린학습자가 읽기 부담 없이 현재 과제와 누를 위치를 찾게 한다. 학생마다 이해 수준과 감각 선호가 다르므로 실제 학생 관찰로 적합성을 확인해야 한다. 교사는 놀이·범위·도움 수준을 조정한다.

## 2. 기존 시스템과 유지할 약속
순수 HTML/CSS/JS, file:// 실행, 기존 SC 아이콘·놀이 그림·음성·시범·UDL 보기 선택/키패드, SCERTS 도움/쉬기/기분/공동주의를 유지한다. 새 장식·깜박임·보상 규칙 변경은 없다. 기존 재사용 버튼/카드/색 토큰을 확장하는 작업이다.

## 3. 색과 형태
app.css의 light/dark 토큰을 그대로 사용: bg, surface, ink, muted, line, soft, primary/on-primary, good/good-bg. 노란 hi는 문제의 빈칸에만 사용한다. 방향색 less/more/up/down은 수 관계의 기존 의미를 유지한다. 학생 화면의 active 테두리는 primary 3px, 패널은 line 1px, radius 20px. 색만으로 상태를 전달하지 않고 손/눈/별 그림과 짧은 글을 함께 쓴다.

## 4. 글자와 간격
기존 Jua(수/제목), Noto Sans KR(본문), 한국어 시스템 글꼴 fallback 유지. 새 student tokens: gap 16px, compact gap 8px, panel padding 20px, radius 20px, task size clamp(22px,3vw,32px), action size 20px, label size 16px. 터치 목표 최소48px, 답 버튼 최소80px. 문장은 단어 단위로 줄바꿈하며 작은 화면/확대에서는 세로 스크롤을 허용해 잘림을 막는다.

## 5. 재사용 구성요소와 상태
- 오늘의 놀이: 기존 놀이 pictogram, 제목, 한 개의 시작 CTA. 교사 선택/직전 선택을 유지하며 다른 놀이 details로 학생의 선택권을 남긴다.
- 지시 패널: 작은 놀이 이름, 큰 과제 문장, 기존 그림 지시. 다시 듣기/보여 줘에 글자 라벨을 붙여 아이콘 뜻을 보완한다.
- 과제 패널: 놀이 그림과 답 영역을 같은 surface 안에 가깝게 묶는다. stage-action: tap/compare, answer-action: choose/input. demo와 answered에는 조작 강조를 끈다.
- 답 위치 라벨: 손 그림 + 고르기/숫자 누르기. count의 tap 단계에는 아직 없는 답 영역 라벨을 숨긴다.
- 진행: 완료 토큰과 현재 문제/전체 수, 끝난 뒤 활동 그림. 실제 문제 수 기준을 유지한다.
- 요청 영역: 도움·쉬기 버튼의 위치/크기 고정, 쉬기 카드·기다림·권유 동작 유지.
- 모든 버튼: default, focus-visible, active; choice의 wrong/right/ghost 기존 상태 유지. 과제 영역 지시 라벨은 누르는 버튼으로 오해하지 않게 배경 버튼 형태를 쓰지 않는다.

## 6. 배치와 반응형
홈: 작은 브랜드/교사 메뉴 → 먼저/다음 → 오늘 놀이/시작 → 다른 놀이 details. 교사 설명은 교사 모드에서만 표시.
놀이: 진행줄 → 지시 → 문제/답 카드 → 요청줄. 700px보다 넓으면 문제 왼쪽·답 오른쪽, 작은 화면에서는 문제 위·답 아래. 답 영역이 없는 비교/세기는 문제 중심 한 열. 도움/쉬기 요청줄은 화면 하단에 고정하고 본문 하단에 100px 여유를 둬 답을 가리지 않는다. 큰 배열표·키패드에서도 요청이 화면 밖으로 밀리지 않게 한다. 문제와 답 사이에 높이 채우기용 빈 공간을 만들지 않는다. 375/768/1280px, 가로 짧은 화면, 확대를 점검한다.

## 7. 접근성과 동작
버튼 이름/키보드 조작/숨김 상태/피드백 live region을 유지한다. 진척은 텍스트와 그림을 병행한다. 도움과 쉬기는 과제 진행과 독립적으로 보이게 한다. reduced-motion/calm 및 기존 시범 이동만 유지; 새 애니메이션 없음. 추가 문구는 시각 라벨이며 기존 음성 안내는 바꾸지 않아 녹음 조각 호환성을 보존한다.

## 8. 근거와 검증
W3C COGA clear-purpose / clear-steps / page-structure, CAST 목표 명료화와 주의 분산 감소, 기존 SCERTS의 예측 가능한 흐름·요청 접근성에 근거한 설계. https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p01-clear-purpose/ ; https://www.cast.org/resources/tips-articles/udl-tips-designing-engaging-learning-environment/ ; https://scerts.com/wp-content/uploads/SCERTSJJ_RM.pdf
자동 QA는 기존 8놀이·기록·학습지·시범·쉬기 회귀검사와 새 홈/단계별 강조/반응형 캡처로 진행한다. 실제 학습자 이해도 개선을 자동 검사로 확정하지 않는다. 소스·기능/시각·한국어 검토를 별도로 수행한다. 교사/인쇄 화면은 기존 구조를 유지한다.
