# Lifecycle debugging journal

- Scope: play.js callbacks and session/problem ownership; no dependencies or git operations.
- Runtime: standalone browser scripts, Node VM for deterministic timers; Edge/Playwright for actual UI.
- References read: debugging node, playwright-cli, setup, investigate, fix, QA, cleanup.
- H1: timers resolve global G after replacing session/problem; distinguish by new session lock/demo/pointer changes.
- H2: awaited demo work/finally modifies shared UI after ownership changes; distinguish by replacement demo veil and input.
- H3: pause allows pending keypad submission; distinguish done/answered while break is open.
- Artifacts planned: permanent tools/check-lifecycle.js regression; temporary this journal (remove at end); browser screenshot in tools/lifecycle-after.png (remove at end).
