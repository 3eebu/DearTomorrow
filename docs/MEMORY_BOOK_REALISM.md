# Memory Book — Project Realism checkpoint

## Rendering decision

The reader now uses a custom ruled paper surface composed of 32 CSS 3D segments on desktop/tablet and 20 on narrow screens. Segment positions follow a fixed arc length and a pinned binding. The bend varies across the sheet; vertical pointer position twists the free edge. This replaces the old 12-strip fixed bend and removes the filter that flattened the 3D scene.

CSS 3D was selected after considering a WebGL mesh with canvas textures, Three.js, and a DOM/GPU hybrid. A WebGL approach would need a second raster renderer or HTML capture for the existing positioned text, overflow, fonts, photographs, notes, and paper. The chosen surface keeps the exact shared page renderer and local images, with no texture cache or additional graphics dependency. It is an analytic paper approximation, not a cloth solver or arbitrary diagonal creasing simulation.

## Implemented

- Dimensional front board and back board, cover edges, spine tooling, hardcover overhang, gutter and contact shadows.
- Separate page stacks with depth based on page count; depth distribution changes as sheets move. The visual stock allowance includes scrapbook inserts and is not a physical printing specification.
- Continuous cover opening/closing around the binding, camera settling, inside cover, cover lighting and a moving shadow.
- Curved two-sided sheets with content and photographs mapped along the curve. Only the current resting pages and moving sheet are mounted in physical mode.
- Pointer-controlled drag, direction, fresh release velocity, corner twist, hover lift, cancellation, re-grabbing the same sheet during settling, and one queued navigation command for consecutive turns. Escape cancels from reader controls as well as the reading area.
- Single-page forward/backward gestures below 701px. Resizing retains the spread containing the current page. Edge handles leave the center free for notes and scrolling; vertical touch scrolling can cancel a gesture.
- Notes keep their revealed state across turns and show the same state on the animated sheet.
- Shared paper and material rendering; leather grain is finer and its previous thick border is removed. Existing cover color/material and all document fields remain unchanged.
- Reduced-motion preferences make cover/turn durations zero and suppress hover bending. Simple reading exposes every page as ordinary text/images; it is the default fallback if CSS 3D is unavailable.
- Development-only frame timing and library-read duration attributes. These contain timing/count information, not private book content.

No document migration, storage deletion, account service, paid dependency, sound or production deployment was introduced. Studio remains the existing flat editor.

## Verification performed

- Imported an isolated 20-page fixture with numbered writing, embedded PNG photographs, Polaroids, folded notes and four paper colors. `node tests/create-reader-fixture.cjs 20` reproduces the import file without touching browser storage.
- In the interactive Chromium browser: inspected opening and closing, curved front/reverse content, forward and backward turns, queued consecutive turns, Escape cancellation on a fresh load, mobile-width edge drags in both directions, chapter navigation, and a revealed note surviving a forward/reverse round trip.
- Reached pages 12–13, 14–15, 16–17, 18–19 and finally page 20 of 20. The final even-numbered page is labeled correctly rather than being called an empty end state.
- Inspected physical reading at 1440×900, 768×1024, and 390×844. The mobile reader used one page with no horizontal document overflow.
- Used the existing Duplicate action and Studio page management to create a separate 100-page QA book after file-picker automation stalled on a second import. Changed that copy to 148×210 mm and leather, reopened it after refresh, and verified its 100-page library count and dimensions. The 20-page source and previous two-page QA book remained present.
- Edited the first numbered page in Studio, refreshed and reopened the book. Simple reading showed the saved text, photograph, caption and note. Simple reading also listed all 20 numbered pages.
- Model and physics tests cover page reachability for even/odd counts, front/reverse mapping, fixed segment length, pinned binding, flat endpoints, cancellation, stale/fresh release momentum, zero reduced-motion durations, serialization, invalid imports, failed writes, unavailable storage, and concurrent initialization. These use isolated data and an IndexedDB test double.

### Actual development measurements

Measured in the in-app desktop Chromium browser, not on physical phones. Frame intervals come from actual animation callbacks; they include browser scheduling and development overhead and do not measure GPU presentation directly.

| Sample | Median interval | 95th percentile | Intervals over 33.4 ms | Mean geometry/style update |
| --- | ---: | ---: | ---: | ---: |
| 20-page book, desktop | 10.4 ms | 23.5 ms | 1 / 64 | 0.48 ms |
| Consecutive desktop turn | 13.4 ms | 21.0 ms | 1 / 55 | 0.49 ms |
| 390px viewport, single page | 7.4 ms | 12.7 ms | 1 / 92 | 0.38 ms |
| 100-page portrait turn | 13.2 ms | 37.9 ms | 5 / 46 | 0.47 ms |

Library read plus validation measured 31.7 ms with two QA books and 59.8 ms with three books, including the 100-page copy. These start after React initializes, so they exclude network loading and hydration. Unavailable-storage rejection and protection against writing an empty replacement library were tested in the storage harness; a real browser storage failure was not induced.

## Limits requiring further device review

- The paper is a segmented ruled surface. Fine seams can be visible at steep angles, and it does not model collision, buckling or a local diagonal fold. It is not a claim of photorealism.
- The measured samples do not establish sustained 60 FPS on all hardware. The 100-page development sample had several slow frames. Large numbers of elements on a single page still need profiling.
- Mouse drag input was used at mobile/tablet viewport sizes. Physical touchscreen latency, slow finger drags and Safari/WebKit were not tested. Interrupted settling is implemented; precise timed re-grab gestures were not independently instrumented by the available browser controls.
- Reduced-motion duration behavior is covered by source and unit tests; OS/browser preference emulation was not performed in the interactive browser.
- The in-app browser declined fullscreen (the document remained outside fullscreen). The button handles that rejection and Simple reading remains usable; successful fullscreen needs verification in a supporting browser.
- A final native Chrome recheck was stopped by Computer Use because it could not confidently identify the browser URL. No further UI automation was attempted. The interactive results above came from the earlier in-app browser session; the final strip-width precision adjustment received compilation and source review, but not an additional visual check.
- Some deliberately small QA note boxes overflow their text. Resting notes remain scrollable; moving-sheet snapshots hide scrollbars to avoid repeated scrollbars across segments. The reader preserves the Studio layout rather than silently resizing user objects.

## Checks

Final code checks passed: `node --test tests/book-physics.test.cjs tests/memory-books.test.cjs` (17 tests), `npm run typecheck`, `npm run lint` (no warnings/errors), `npm run build` (all six routes generated), and `git diff --check`. The build ran successfully in the authorized environment outside the Windows filesystem sandbox with the development server stopped. The final build was then served locally on port 3002; all six routes returned HTTP 200. HTTP checks establish connectivity, not animation or interaction correctness.

Library initialization was already optimized at the preceding checkpoint; this milestone adds development timing and storage-failure/concurrent-read coverage, without a persistence migration.

Review image: [curved sheet](review/book-realism-turn.jpg).
