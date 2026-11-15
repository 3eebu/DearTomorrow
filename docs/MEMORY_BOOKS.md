# Memory Books — first functional review checkpoint

## Scope

The library lives at `/memory-books`, linked from the existing homepage Memory Books section. The homepage sample remains available. Reading and Studio share the same document and page renderer. The growing spine and additional annual volumes are explicitly future work.

Working now:

- Local multi-book library, title search, sort, archive/restore, duplicate, confirmed delete, project export and validated import as a separate book.
- Three-step creation: title/subtitle, real page dimensions (presets or custom millimetres/inches), colour and linen/leather-inspired/smooth cover materials. Blank and editable starter layouts.
- Studio with free object placement, pointer dragging, resize and rotation handles, keyboard nudging and precise numeric controls. Text, personal photographs, Polaroids and a simple revealable note are supported. Typography, ink, opacity, crop position, layering, duplicate, lock, paper colour and texture controls are available.
- Add/duplicate/delete/reorder pages; chapter labels, renaming, ordering and assigning pages to chapters. Page order remains explicit; reordering chapter labels does not silently move pages.
- Undo/redo with one history entry per pointer drag and grouped continuous text/property edits.
- IndexedDB autosave with saving/saved/failed states, unsaved navigation warning, retry and backup export. Revision and last-saved-document checks reject conflicting writes from another tab. Personal images stay in the document on this device.
- Reading with hinged covers, board and paper edges, a central gutter, correct front/back page content, forward/back buttons, pointer edge drags, keyboard controls, chapter navigation, fullscreen where supported, interactive note reveals and linear accessible reading.
- One flat Studio page and one Reading page at phone widths; two-page Reading spreads on desktop.

## Architecture and coordinates

- `src/lib/memory-books.ts`: version 1 document schema, factories, bounds and import validation, limits and page-turn completion rule.
- `src/lib/memory-book-storage.ts`: transactional IndexedDB library and revision, photo preparation, portable JSON export.
- `src/components/memory-books/book-library.tsx`: library, creation flow, autosave queue and import/export coordination.
- `src/components/memory-books/book-studio.tsx`: flat canvas, meaningful edit history, page/chapter/object controls and pointer gestures.
- `src/components/memory-books/book-reader.tsx`: cover and segmented sheet controller; only current spread and the two turning faces are rendered at reading resolution.
- `src/components/memory-books/page-content.tsx`: shared page/object/cover presentation for Studio, Reading and real thumbnails.
- `src/components/memory-books/memory-books.module.css`: scoped responsive materials, editor and physical book styling.
- `src/app/memory-books/page.tsx`: route; `src/components/home-studio.tsx`: entry point in the existing Memory Books section.

Dimensions are stored in millimetres per individual page. Position and size are percentages of the page; font sizes are percentages of page width. Changing dimensions preserves relative placement and asks users to review wrapping. Rotation is in degrees, array order defines layers. Every page and object has a stable ID; chapters reference IDs. The same renderer interprets content everywhere.

## Page turns

Twelve DOM strips approximate a curved sheet. Each strip has its own position, surface angle and shading; its reverse shows the corresponding portion of the correct reverse page. A continuous curve is integrated from the spine on each animation frame. Pointer movement updates transforms without a React render on every event. Release uses distance and recent flick velocity; cancellation returns the sheet to its resting side. Button turns use the same controller. Reduced motion removes the cover transition and makes turns immediate.

This avoids a large rendering dependency and retains actual DOM text and local photos. It is a multi-segment approximation, not a physically simulated paper mesh. Narrow strip seams and curvature quality still need review on more GPUs and browsers. No frame-rate target has been measured or claimed.

## Local data and backups

IndexedDB database `dear-tomorrow-memory-books`, schema 1, stores the library and its revision in one atomic transaction. The save status changes to **Saved on this device** only after transaction completion. Save requests are serialized and debounced. Opening errors do not overwrite existing data. A stale tab cannot silently replace a newer library.

Photos are decoded locally, resized to at most 1600 pixels on the longest edge, and encoded as WebP data in the document. Exports include these bytes and all metadata, dimensions, pages, chapters, object positions and styles. Import validates nested content, rejects external/executable image URLs and creates a new book ID.

Prototype limits: 32 books in a library, 200 pages per book, 100 objects per page, 100 chapter labels, 8 MB source photo, 24 MB prepared photo budget per book, 30 MB imported project. Browser quota may impose a lower limit; saving failure remains visible. Deleting objects does not yet garbage-collect unused assets. Browser storage is not a cloud backup and can be cleared by the browser or user. Export important drafts.

## Actual checks

- `node --test tests/memory-books.test.cjs`: 10 passing tests for independent documents; dimension round trips; ordered 20/50/100-page documents; embedded image bytes and transforms; corrupted imports; external image rejection; short/long/reversed/cancelled turn decisions; transaction completion; aborted saves; stale-tab protection.
- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm run build`: passed; `/memory-books` prerendered successfully (15.4 kB route, 103 kB first load JavaScript).
- `git diff --check`: passed.
- Browser journey in the in-app Chromium browser: create a square book, open it, insert a blank page, add text and a Polaroid, pointer-drag it, set size/rotation/caption, import the synthetic local PNG fixture, wait for saved status, reload, reopen and verify the same photo and numeric properties.
- Undo restored rotation from 17° to 8°; Redo restored 17°.
- Built a 20-page book through the Studio UI. All 10 forward and 10 backward desktop spread turns reached the expected progress labels. Two edge drags completed as flicks. No browser error logs were recorded during this sequence.
- Exported the actual 20-page review book; inspected its JSON: correct title, 203.2 × 203.2 mm, 20 pages and one embedded asset.
- 1440 × 1000 desktop: full spread and separate tool/property panels. 390 × 844 phone: flat canvas, horizontally scrolling thumbnails, accessible property controls below the page, one-page Reading, photo visible on page 2, no document-level horizontal overflow. A second A5 portrait book with a leather-inspired cover was created and both books reopened after reload.

Not performed: real touch-device testing, Safari/Firefox, measured FPS/memory profiling, 50/100-page browser rendering, deliberate mid-drag reversal in the browser, emulated reduced-motion rendering, browser-level quota exhaustion, or a full UI project reimport. Those have not been claimed. Failed transactions, turn cancellation/reversal decisions and project round trips have automated coverage; that does not replace those browser checks.

## Remaining product work

This is the first usable checkpoint, not the complete master vision. Remaining: advanced cover typography and ornaments; richer text formatting; groups and multiple selection; pinch zoom; drawing/sticker packs; reusable templates; two-page artwork; richer envelopes/media; chapter divider automation; full performance/accessibility audit; cross-browser polish; backup UI import matrix. Physical growth over years, volumes, cloud accounts, sharing, gifting, scheduled delivery, payments and printing remain future scope.

## Run

```powershell
npm install
npm run dev -- --port 3001
# Or build and run the production preview:
npm run build
npm run start -- --port 3001
```

Review: `http://127.0.0.1:3001/memory-books`. This is local to the computer, not a public deployment.
