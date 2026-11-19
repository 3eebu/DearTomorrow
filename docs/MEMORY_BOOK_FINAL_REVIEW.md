# Memory Book Milestone 5 — The Finishing Touch

Implementation commit `ec3213c51a00d96ca7ae3760efcc98545140de67` on `main`. Previous stable checkpoint `d9a38d2fc3ed5b61075afe171cad716102b3abcc`.

## First-time audit and fixes

I started with an empty synthetic library on `localhost:3002`, separate from the existing library at `127.0.0.1:3002`. In the application I created a 180 × 240 mm book, customized its cover, added a page, uploaded a synthetic photo, added a branch ornament and writing, edited an envelope, created a chapter, and wrapped, unwrapped and read the result. At 390 px the page fit the viewport, but the envelope landed directly over the page’s picture and letter. There were other avoidable steps between creating, editing, and finishing a book.

| Confirmed friction | Improvement |
| --- | --- |
| The last creation step opened a closed reader, adding another step before editing. | A new book opens directly in Studio. The wizard labels the action **Create & edit my book**. |
| Paper settings were buried in Properties, and separate rails for photos and frames, and decorations and shapes, made the phone rail harder to navigate. | Paper is a primary tool. Photographs and Decorations now include their corresponding advanced collections. Add page stays at the start of the thumbnail strip. Cover Studio and wrapping are available under Book options with a direct return to Studio. |
| New objects could obscure the material already on the page. | New elements and uploaded photos try free paper first. On a crowded page they choose the least overlapping position among the available starting positions. Placement remains editable. |
| The bow partially obscured gift-tag text. The resting book and photo could look flat. | The revised tag sits beside the bow. The reader adds a contact shadow and scene-specific board edge light. The photo has distinct front and back surfaces with a small separation. |
| Moving immediately after an edit left the last revision waiting on a debounce. | Changes use the latest in-memory draft, queue a shorter autosave, and request a flush when changing views or hiding the page. The unload warning remains until IndexedDB confirms the latest revision. The browser can still interrupt an in-flight save when it terminates a tab. |

The underlying page-turn geometry, existing surprise formats, personal library, and site outside Memory Books are retained.

## Showcase and voice memories

The library’s **First book guide** is optional, dismissible, and available again at any time. **Explore example** opens **Every Little Thing About Us**, an 18-page fictional book with three chapters, a personalized hardcover, dedication, editable photo openings, Polaroids, original vector drawing, stationery ornaments, all seven paper surprises, local gift wrapping and a closing page. Its voice card plays a clearly labeled synthetic chime. Reading the example does not create a personal book. **Make an editable copy** adds a separate document only on request.

Studio’s **Little Surprises** collection also offers **Voice memory**. Cards support a handwritten style, mini cassette, decorative waveform, and simple play design, plus title, transcript, color, play, pause, seek and duration. Uploads are decoded locally and normalized to mono PCM WAV at 16 kHz. The recorder starts only from **Record voice**, stops microphone tracks on finish or cancel, and has a maximum timer. Uploads are capped at 12 MiB, a saved clip at one minute, the encoded audio pool at 8 MiB and 24 clips, and the complete project at the existing 30 MiB limit.

A versioned audio asset pool is separate from the existing image pool. Imports validate RIFF/PCM headers, declared data length, duration, format and all asset references. Replacing or removing a recording drops an unreferenced asset from the current backup and preserves recordings still used by another card. Undo retains its own snapshot. One playback element serves the active reader and stops when turning or leaving its spread. Segments and thumbnails have passive art without players. Playback never starts automatically.

## Actual verification

- In the optimized build, read the example through its final page. Opened the fold and envelope, reversed a photograph, revealed and reset the scratch card, pulled and returned a ticket, lifted the flap, and raised the paper pop-up. The raised pop-up survived a forward and reverse turn. The first-time audit also opened a locally wrapped gift.
- Tested portrait reading and Studio at desktop, 820 px tablet, and 390 px and 430 px phone viewport sizes in Chromium. Checked the optional guide with Escape, paper settings, the Cover Studio shortcut and return, and measured no horizontal scroll at the measured tablet and phone sizes.
- Opened voice playback in Simple reading, played and paused the example tone, and made an editable copy. Uploaded a separate eight-second WAV in Studio, customized its cassette and transcript, and reopened it after refresh. A keyboard seek reached 8.0 seconds. Turning away left the single player paused with its source cleared.
- Made consecutive title edits, changed directly to Reading, and refreshed. The final title and installed voice clip both reopened.
- All 45 automated tests passed. They include v1/v2 validation and compatibility, bad and oversized voice data, backup serialization, undo after removing a recording, shared references, passive rendering, page placement, atomic writes, aborted writes, conflicting tabs, and turn physics. The aborted-write/quota behavior is exercised with a storage double. Browser quota was not deliberately exhausted.
- Lint, TypeScript, the optimized Next.js build and Git diff checks passed. The production build generated all six routes. Memory Books reported **144 kB** first-load JavaScript.

Browser screenshots were inspected for the baseline mobile overlap and the finished pair of pages in Rainy Afternoon. The browser tool displayed them in the session. Its continuation expired during the final download check, so no screenshot files or voice backup download were verified. The voice backup round trip passed at the model level. That does not establish a browser export and reimport result.

## Performance

Use `/memory-books?profile=1` locally to read the idle, library, Studio, drag, and page turn timing attributes. These are callback and initialization timings. They do not measure GPU presentation.

| Production Chromium sample | Measured result |
| --- | --- |
| Idle requestAnimationFrame, 220 intervals | 6.1 ms median, 12.0 ms p95 |
| IndexedDB read and validation, two synthetic books | 23.4 ms |
| Studio mount to first animation callback, tablet viewport | 30.8 ms |
| Nine desktop forward turns across the three scenes | Median per turn 7.1–11.5 ms. p95 per turn 12.1–38.6 ms |
| Scratch-card and pocket spread | 7.5 ms median, 38.6 ms p95, 4 of 74 intervals above 33.4 ms |
| Mean style and geometry work per turn callback | 0.17–0.37 ms across the measured samples |

The roughly one-second gaps from Milestone 4 did not recur in production. The idle and reader numbers show that this browser can provide timely callbacks here. The build mode, browser session, and render workload changed, so the earlier limitation cannot be attributed to one cause. The updated renderer culls off-strip objects. No 60 FPS guarantee is made.

Separately, `node tests/profile-memory-books.cjs` measures JSON export, parse and validation in Node with two 1600 × 1200 synthetic PNGs, drawing, audio and surprise objects. It can write three import fixtures when passed an output directory.

| Pages | Project bytes | Median model round trip | Slowest of nine |
| ---: | ---: | ---: | ---: |
| 2 | 5,851,403 | 25.10 ms | 30.90 ms |
| 20 | 5,874,509 | 48.69 ms | 56.49 ms |
| 100 | 6,006,429 | 50.46 ms | 72.09 ms |

The 100-page photo workload was profiled in Node. Browser memory, full-size photo decoding under sustained turns, Studio gesture timing, thumbnail scrolling, and detailed gift and surprise frame timings still need independent browser measurements.

## Remaining verification and scope

- Chromium in-app browser was available. Firefox and WebKit were not exercised. Responsive viewport checks used mouse and keyboard. No physical touchscreen or screen reader results are claimed.
- Microphone capture, denial and permission recovery still need a real device and an explicitly granted microphone prompt. The browser checks covered real file decoding, playback, seeking and persistence.
- Reduced-motion behavior has source and physics-test coverage. OS-level motion preference emulation, interrupted turns under heavy load, and all physical proportions remain manual checks.
- Linked two-page editing is deferred. The reader’s real spread pairing, page identities, and single-page phone layout need to drive a reliable linked editor.
- No external preview was established. The development preview was restored and returned HTTP 200 on `http://127.0.0.1:3002/memory-books`.

## Manual physical-device checklist

1. On a small iPhone and an Android phone, create a book both from blank and from a copy. In Studio, upload a full-size photo, add a writing page and a voice card, and rotate and resize with touch. Check the keyboard and safe-area insets.
2. On Safari, Chrome and Firefox, explicitly permit the microphone after tapping Record voice. Record, stop, cancel, deny permission, and retry. Check that the microphone indicator turns off each time. Save, reload, export, reimport, and seek the clip.
3. With a book open, scratch with one finger, scroll a long inside letter, pull a pocket item, and turn the next page from the free edge. Check each action with a screen reader and the keyboard. Play a voice clip, turn immediately, and listen for any audio bleed.
4. With reduced motion enabled at OS level, unwrap and skip a gift and turn forward and backward. Repeat with motion enabled. Check that the scene pause control stops ambient motion.
5. On an older phone and a desktop, open 2-, 20-, and 100-page fixtures, try fast consecutive and interrupted turns in each scene, and record GPU frame pacing and memory according to the browser profiler.
6. In two isolated tabs make conflicting edits, then verify the second tab shows the save error and can export a backup. Test quota failure in a disposable browser profile and confirm the previous saved version still opens.
