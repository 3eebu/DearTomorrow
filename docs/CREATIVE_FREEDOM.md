# Memory Book Studio — Creative Freedom, first functional increment

Date: 18 November 2026 (Asia/Karachi). Baseline: `3fcfefe642136808e1827ad89023f8d6212f4130`. Repository and branch: `3eebu/DearTomorrow`, `main`.

This increment implements a usable creation-to-reader workflow. It does not complete every item in the founder's larger Studio vision. Remaining engineering and device validation are listed below.

## Completed functionality

- A Studio-specific stationery workspace: editable title and honest saving status, undo/redo, Read my book, collapsible creative collections and properties, a measured Fit page canvas, zoom and panning, and actual page thumbnails. Offscreen thumbnail contents are unmounted through IntersectionObserver rather than rendering every full page indefinitely.
- Eight resize handles, rotation, aspect locking, opacity, precise numeric geometry, keyboard nudging, duplicate/delete/lock, an internal object clipboard, and movement between pages. Rotated resizing works in physical page coordinates and keeps the opposite anchor fixed across zoom levels and page proportions.
- Shift selection and a touch-friendly Select several mode; groups, ungrouping, group movement, uniform group scaling/rotation, alignment and equal-gap distribution. Layer controls include top/back/one-step ordering, drag reordering, visibility, locking and names. Snapping covers page edges/center and nearby object edges/centers; Alt temporarily bypasses it.
- Direct writing by double-clicking a text object. Titles, subtitles, paragraphs, letters, quotes, captions, dates, lists and small notes are editable objects. Typography includes weight, italics, underline, ink, alignment, spacing, padding, vertical alignment, optional background and shadow. Selected passages can receive structured bold/italic/underline formatting through the words field. Ordinary edits retain surrounding runs; no arbitrary HTML is accepted. Overflow warnings offer enlargement or a new page for continuing a letter.
- Batch local photo preparation, file drop, a reusable asset tray, layout-preserving replacement, fit/fill, pan and zoom crop controls, flips, rotation, opacity, rounding, border, shadow and restrained tone filters. Transparent image backgrounds are retained for uploaded PNG decorations. Media stays local; no new remote media service is used.
- Seven instant-photo frame starting points: classic, vintage, wide, mini, retro, thin and custom. Frame color/width, caption space/position/font/ink, grain, date, tape, crop, corners and shadow are editable.
- Twelve original SVG decorations across romance, botanical, stationery, celebration and travel collections. Search and category filters work. Eight shape choices include rectangles, ellipses, hearts, stars, lines, arrows, borders and highlights; a locked-aspect ellipse can form a circle.
- Vector drawing with pencil, pen, marker and highlighter presets, width, ink, opacity, stroke eraser and history. Drawings keep editable points and per-stroke color/removal controls. Erasing tests the whole segment, including sparse imported lines, and is scoped to the drawing object so duplicate stroke IDs in separate drawings do not erase each other. Transparent drawing layers do not block selecting objects beneath empty areas.
- Independent paper color, grain/handmade/vintage/lines/dots/graph/pattern, texture strength, a subtle two-color gradient and uploaded backgrounds with positioning. Paper can be applied to the current page or entire book. Background layers are shared with the reader; gradients are not tiled with the dot pattern.
- Nine editable starting layouts and up to twenty personal layouts stored inside a book. Inserting a layout adds a new page, preserving the current page. Copies receive new page/object/group IDs while retaining local asset references.
- Existing page duplication, deletion with confirmation and undo, page ordering, chapter labels, dimensions and cover settings remain available.
- Responsive creation toolbar and contextual bottom sheets below 901px. Collections and properties are mutually exclusive on narrow screens; viewport changes close desktop panels. Numeric fields, a Done action and Select several provide alternatives to touch gestures. Pinch handling and modifier-wheel zoom are implemented; see device-test limitations below.
- The same renderer supports all new objects in Studio, thumbnails, resting pages and curved sheets. Simple reading includes drawings/graphics and respects hidden layers. The physical cover, spine, page-stack and turning engine were preserved.

## Architecture and compatibility

The project format is now **version 2**; the existing IndexedDB database and transaction/revision protocol are unchanged. `validateBook` accepts versions 1 and 2, validates nested properties, and returns an in-memory v2 document without writing storage. Page/object IDs, geometry, image bytes and content remain intact. A subsequent real library save writes the normalized documents through the existing transaction. V2 exports require the updated Studio; existing v1 imports remain supported.

New optional fields retain legacy defaults. Vector drawings and mixed formatting are structured data, not executable markup. SVG decoration paths are fixed application code; projects cannot supply arbitrary SVG. Image sources remain restricted to embedded JPEG/PNG/WebP data. Saving validates before opening a write transaction; invalid new content cannot replace the previously saved library. Storage failures and conflicting-tab writes remain errors, rather than successful-save messages.

Version 2 can retain coordinates beyond the physical page. The Studio warns about clipping and can show this artwork outside the paper. Reading intentionally clips to page boundaries; this is not a print-ready bleed/export feature. No off-page content is silently resized or discarded.

History keeps sixty structurally shared snapshots and groups nearby typing. Continuous object gestures commit once; frame updates change styles directly, without React renders on each movement. Immutable image strings are not cloned or serialized into each history entry. Undo retains the live asset pool so prepared photographs remain reusable. Async photo completions use the latest document and reject deleted/locked destinations instead of replacing newer edits.

Limits remain: 200 pages, 100 objects/page, 32 books, 8 MB input images, 24 MB encoded upload pool and 30 MB UTF-8 project budget. Imports retain the former 30 MB project allowance, including legacy backups whose asset pool exceeds the newer upload allowance. Larger upload/storage limits were not introduced. Drawing limits are 200 strokes/object and 2,000 points/stroke. The four writing families use installed system fonts; no font files are redistributed or fetched by this work, and handwriting appearance varies by OS.

Primary implementation files: `book-studio.tsx`, `studio-inspector.tsx`, `studio-settings.tsx`, `studio.module.css`, `creative-objects.tsx`, `page-content.tsx`, `studio-geometry.ts`, `studio-content.ts`, `studio-document.ts`, `studio-history.ts`, `memory-books.ts`, and the validation guard in `memory-book-storage.ts`. `book-reader.tsx` changes only its Simple reading rendering, not its physics.

## Actual verification

All testing used synthetic QA content. No existing book was deleted, reset or overwritten.

- Created a separate book through the browser wizard at **180 × 240 mm**. Confirmed two starting pages, decoration creation, numeric rotation, undo restoring −5°, and redo restoring 30°.
- Generated and imported a **20-page anniversary fixture** containing three photos, two customized Polaroids, handwriting, a paragraph, tape, a heart, a signature, and dotted/gradient paper. The fixture contains synthetic image pixels, not personal photographs. Generate it with `node tests/create-studio-fixture.cjs`.
- Refreshed and reopened the saved composition. Edited its title directly to “Another beautiful year of us.”; saw its overflow warning; resized the bottom text handle and verified the warning cleared. Added a vector stroke with a native mouse drag and inspected its editable stroke entry.
- Opened the physical reader, inspected all fixture media/graphics, captured a curved forward turn, reached pages 2–3, and turned back to page 1 with the edited writing and drawing retained.
- Used Chromium responsive emulation at **390 × 844** and **768 × 1024**, plus the desktop Chrome window. Inspected canvas sizing, bottom tools and property sheets. Added a mini Polaroid on mobile, reused its existing local image, replaced it through the file picker, and observed the prepared WebP asset and successful saved state. Selected two objects on tablet, grouped through Ctrl+G, and saw both group labels in Layers.
- Exported the edited project through the UI. Inspected only that synthetic export: v2, 20 pages, 12 objects on page 1, two assets, the changed title, two grouped objects and two drawing objects. Reimported the backup through the UI as a separate book; the source book remained in the library.
- Found and fixed real verification issues: Fit page using available viewport size, tiled gradients, stacked mobile sheets, stale Paste-button availability, and drawing hit testing. Final brush preset defaults and transparent-image background handling also received source review and automated renderer checks; a transparent PNG was not independently visually tested.
- **35 automated tests passed**: existing physics/model/storage coverage plus migration without storage mutation, malicious new values, eight resize anchors over rotations/proportions/zoom, group transforms, alignment, snapping, clipboard/group IDs, page transfer, stale photo destinations, history, templates, mixed text edits, vector erasing, shared SSR rendering and project round trips. Tests cover 20/50/100 objects in 20/100-page documents. These larger cases have a complex first page; the remaining pages are blank.
- Final `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check` passed. The production build ran outside the Windows filesystem sandbox, with only this project's development processes stopped first. The Memory Books route reports **122 kB first-load JS**, versus 105 kB at the preceding checkpoint; no graphics/editor dependency was added.

## Performance observations

These are **Node validation + JSON round trip + shared React static rendering**, not browser frames, GPU timings or FPS. Each row has two warmups and ten measured samples. Synthetic images are small; these measurements do not represent a library of full-resolution photographs.

| Book pages | Objects on first page | Median | Slowest sample | Encoded project |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 20 | 1.29 ms | 2.73 ms | 16,184 B |
| 20 | 50 | 2.18 ms | 2.63 ms | 25,961 B |
| 20 | 100 | 4.07 ms | 8.09 ms | 42,258 B |
| 100 | 20 | 0.78 ms | 1.77 ms | 27,944 B |
| 100 | 50 | 1.55 ms | 2.74 ms | 37,721 B |
| 100 | 100 | 3.25 ms | 4.51 ms | 54,018 B |

Native dragging, resizing and turning worked in the observed browser interactions. No sustained browser frame-rate measurement was collected for the expanded Studio. Development-only `data-drag-timing` remains available on the canvas for subsequent profiling. Earlier reader/library measurements in `MEMORY_BOOK_REALISM.md` are historical results, not remeasured Studio figures.

## Remaining scope and limits

- Linked spread editing, Fit spread, rulers, custom persistent guides, marquee selection and automatic equal-spacing snapping remain future work. Alignment/distribution commands and page/object snapping are implemented.
- Selected-page background batches, more templates/decorations, independent Polaroid material profiles, richer mixed-format color tools and automatic paragraph flow to subsequent pages remain future work. “Continue” creates another editable writing page; it does not automatically move overflow text.
- Groups support moving and numeric uniform scaling/rotation. They do not have a dedicated eight-handle group bounding box. There is one group level; no nested group hierarchy. Clipboard support is internal to the active Studio, not cross-app/system clipboard import.
- The eraser removes entire touched strokes. Pressure samples are retained but do not drive a variable-width brush mesh. Vector path node editing, lasso erasing and touch/stylus pressure latency were not tested or implemented as advanced tools.
- OS reduced-motion rules and reader duration tests remain in place. Physical phones/tablets, pinch behavior on hardware, virtual keyboards, screen readers and Safari/WebKit need independent testing. Responsive browser emulation and native mouse input are not substitutes for those checks.
- The 100-object/100-page cases received model/SSR testing, not a full interactive browser stress profile. No 60 FPS guarantee is made. Full-size photo decoding, dense vector pages, thumbnail scrolling under load and every individual inspector control still need broader device profiling.
- Several operations have automated/source verification rather than independent GUI coverage, including layer drag reordering, every shape/decoration variant, drawing eraser gestures, personal-template UI, all numeric crop/filter combinations and touch pinch.
- The physical reader remains the existing segmented ruled surface, with its previously documented seams and simulation limits. Studio improvements do not claim to resolve that separate rendering limitation.

Review captures: [desktop Studio](review/creative-studio-desktop.jpg), [mobile Studio](review/creative-studio-mobile.jpg), [tablet Studio](review/creative-studio-tablet.jpg), [physical book](review/creative-book-reader.jpg), [curved sheet](review/creative-book-turn.jpg). Mobile/tablet captures include the browser's responsive testing controls.

No authentication, payment, cloud storage, public sharing or production deployment was added. Unrelated `next-env.d.ts`, `pnpm-lock.yaml`, and prior QA fixtures are excluded from the task commit. The final response supplies the commit SHA and current preview connectivity result.

The development server was restored at `http://127.0.0.1:3002`. All six routes and three directly matched Next.js asset URLs returned HTTP 200. The temporary Cloudflare attempt failed while requesting a URL: `Post "https://api.trycloudflare.com/tunnel": context deadline exceeded (Client.Timeout exceeded while awaiting headers)`. No public preview URL was created; this did not block local development or the milestone commit.
