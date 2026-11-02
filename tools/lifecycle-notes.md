# Lifecycle regression checks

- Scope: play.js callbacks and session/problem ownership; no dependencies or git operations.
- Runtime: standalone browser scripts, Node VM for deterministic timers; Edge/Playwright for actual UI.
- References read: debugging node, playwright-cli, setup, investigate, fix, QA, cleanup.
- H1: timers resolve global G after replacing session/problem; distinguish by new session lock/demo/pointer changes.
- H2: awaited demo work/finally modifies shared UI after ownership changes; distinguish by replacement demo veil and input.
- H3: pause allows pending keypad submission; distinguish done/answered while break is open.
- Verification: `node tools/check-lifecycle.js` passes all 9 deterministic cases. `node --test tools/check-browser.js` additionally exercises an actual keypad demo and a pending answer paused by the break screen in Edge.
- Production behavior: delayed work belongs to the current session/revision; a replaced session/problem/demo invalidates older callbacks. Cue work has its own revision, so pointer and speech continuations cannot reappear after input. A pending keypad answer waits for break return.
- Evidence: `.omo/evidence/refactor/` contains browser logs, captures and independent reviews. No debug statements or test-only production APIs were added. This file is retained as the regression rationale.
