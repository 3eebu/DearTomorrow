# Phase 1 QA matrix

Statuses refer only to evidence run for the Phase 1 review build. `NOT RUN` is not a pass.

| Check | Status | Evidence |
| --- | --- | --- |
| 320 / 360 / 390 / 430px widths | PARTIAL | 390px Playwright smoke check: no horizontal overflow, mobile dock present, and single-page book view. Other widths not checked. |
| 768 / 1024 / 1440px widths | PARTIAL | 1440px production screenshot reviewed; 768px and 1024px not checked. |
| Hero open and letter reveal | PASS | Production browser smoke: envelope opens and letter text appears; initial hero reveal visible after transition. |
| Create gallery routes to each demo | PARTIAL | Letter and Memory Book routes verified; remaining creation types not all exercised. |
| Book rename, cover change, next/previous | PASS | Production browser smoke: title, Olive cover palette, and page turn update. |
| Timeline expand/add and calendar sync | PASS | Added “A saved first walk”; it appeared on the timeline and matching calendar date. |
| Six journey checkpoints and online disclosure | PASS | Locked checkpoint displays preview-only state; online-only disclosure present. |
| Keyboard focus and reduced motion | NOT RUN | Dedicated accessibility review remains pending. |
| Typecheck, lint, production build | PASS | `tsc --noEmit`, ESLint, and `next build` completed successfully. |
| Backend, auth, RLS, secure scheduled release | NOT IN PHASE 1 | No production API or database exists |
| Real iOS Safari / Android Chrome devices | NOT RUN | No physical device session available |

The production browser smoke run also reported no uncaught page errors. Desktop and 390px phone screenshots are in `docs/preview/`.
