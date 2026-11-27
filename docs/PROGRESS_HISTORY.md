# Dear Tomorrow historical build record

The entries below describe the state at the original milestone. The preliminary overview reflects November 2026 development checkpoints before the 26 November audit. Later dated entries retain their original observations. See [current development status](PROGRESS.md) for current verification.

# Dear Tomorrow — Phase 1 build progress

## Accounts and private spaces

Auth integration, personal cloud workspaces, optional guest migration, and one-to-one sharing are implemented. The database policies were tested locally. Email delivery, sign-in, and cloud round trips still require a configured Supabase environment and release verification. [Accounts setup and test coverage](ACCOUNTS.md)

## Memory Book Project Realism checkpoint
The reader now has a custom curved CSS 3D surface, dimensional covers and separate thickness-driven stacks, interruptible drag/settling, consistent note state, responsive single-page reading, and measured development diagnostics. See `docs/MEMORY_BOOK_REALISM.md` for the implementation choice, actual measurements, browser checks and remaining device/physics limitations. The document model and local persistence format are unchanged.

## Current implementation
- Redesigned no-photography landing page: warm editorial typography, simple navigation, textured stationery, a cinematic fictional newspaper montage in the homepage and About hero, and reveal animation.
- Homepage hero newspaper montage with fictional editorial clippings, replay control and a separate mobile arrangement.
- Create flow with three beginner-first choices and the browser-local Letters workspace. The Letter Box, Studio, dimensional reader, attachments and local countdowns are documented in `docs/LETTERS.md`.
- Memory Books: homepage sample plus a local multi-book library at `/memory-books`, separate flat Studio and immersive Reading, personal photo/Polaroid/text editing, chapters/pages and IndexedDB autosave. See `docs/MEMORY_BOOKS.md` for the first review checkpoint.
- Memory Tree has a static Landscape View of the approved mountain painting and a separate interactive illustrated Tree View with one leaf per saved memory, three species, linked journal, timeline and calendar. The [foundation report](MEMORY_TREE_ENVIRONMENT.md) and [art manifest](MEMORY_TREE_ASSETS.md) describe the next artist handoff.
- Journey Letters: route animation and six selectable demonstration checkpoints.
- About and How It Works pages, with navigation updated for Memory Tree.
- Responsive mobile navigation, reduced-motion rules, modal keyboard focus cycling, basic semantic controls.

## Not yet done or verified
- No live accounts, server database, cloud uploads, real letter sending, subscriptions, secure scheduled unlocks or email notifications. Letters to Tomorrow simulate an opening time using the device clock.
- Letters, Memory Books and personal Memory Trees persist in this browser via separate IndexedDB databases. Backups can be exported from each workspace.
- Memory Tree passed synthetic browser tests through 2,400 memories. Physical-device and cross-browser profiling remains open.
- The Memory Book first review checkpoint is functional, with a curved segmented-sheet approximation. The full master vision, measured performance, real-device touch and cross-browser polish remain unfinished.
- No images have been added to the homepage; in the future users can opt to upload their own photos.
- Memory Book browser journeys were inspected at 390px and 1440px. Real-device inspection has not been performed.
- Memory Book model/storage tests, typecheck, lint and production build have passed locally; actual browser checks and limitations are tracked in `docs/MEMORY_BOOKS.md`. A GitHub workflow alone is not proof that checks passed.
- Preview deployments are NOT automatically connected to this GitHub repository.

## Next review items
1. Have Codex on the user's computer pull the latest main branch without overwriting uncommitted changes, then run npm install and npm run dev.
2. Review live layout on phones and desktops, check focus and keyboard navigation, verify all Create flows and responsive behavior.
3. Polish dimensional envelope and book mechanics, refine tree leaf placement & chapter hierarchy, test slow devices and accessibility.
4. Get founder approval before adding credentials, authentication or payments.

The Couples Arcade with optional worldwide leaderboards remains future scope. It is not part of Phase 1.


## Memory Tree botanical iteration — 2026-11-16
- Replaced oval decoration and the 16-marker cap with individually veined leaves, leafy boughs, bark highlights and roots. Memory count controls the tree scale, and each added memory unfurls a new shoot. Existing positions stay stable as more memories are added.
- Preserved the memory list, selection, form, keyboard leaf controls and shared calendar. Fixed conditional view panels staying invisible after switching views.
- Checks passed: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. The build required execution outside the command sandbox after a filesystem permission failure.
- Chrome inspection: desktop tree, 390px responsive layout, adding a fifth memory and finding it on its calendar date. Reduced-motion rules disable tree scaling transitions and unfurl animations; an emulated reduced-motion render and large-collection performance test were not performed.
- Memory data remains a local demo and resets on refresh. No public deployment was made.


## Homepage newspaper montage restoration — 2026-11-16
- Put the existing fictional newspaper montage back in the homepage hero using the same paper fragments and opening sequence as the About page. Added a homepage layout mode to keep clippings inside their column.
- Preserved the headline, compose action, responsive montage arrangement, replay control and reduced-motion behavior.
- Checks passed: `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`.
- No public deployment was made.


## Memory Book Reading and Studio checkpoint
See `docs/MEMORY_BOOKS.md` for architecture, implemented workflow, actual checks, local storage behavior and remaining work. The growing spine and additional volumes remain deferred by the founder.

## Creative Freedom Studio — 2026-11-18
- Implemented a functional creation-to-reader increment: responsive Studio workspace, safe v2 projects/v1 compatibility, precise object tools, mixed writing, local photo tray and Polaroids, original decorations, shapes, vector drawing, paper, templates, layers and groups.
- Preserved the physical reader and the existing local storage transaction protocol. No user data reset or backend service was introduced.
- See `docs/CREATIVE_FREEDOM.md` for the actual browser workflows, 35 passing tests, build results, measured Node timings, screenshots, and the remaining device/feature work. The full Studio vision is not claimed complete.

## Homepage paper overlap — 2026-11-17
- Restored the homepage newspaper clippings' overlap beyond the artwork panel on desktop. The headline and controls remain above the artwork.
- On mobile the backdrop is inset so papers extend beyond its sides while the composition stays within the viewport.
- Inspected at 1440px and 390px; the 390px document did not overflow horizontally. The original About montage remains separate.

## The Art of Bookmaking — 2026-11-19
- Added Cover Studio, a chapter and page organizer, collection filtering, bookmark and resume controls, and three selectable reading environments.
- See `docs/BOOKMAKING.md` for document compatibility, verified workflows, and remaining work.

## The Magic Within — Memory Book milestone 4
- Added seven interactive paper surprises, local gift wrapping, and refinements and a pause control for the reader’s three environments.
- See `docs/MEMORY_BOOK_MAGIC.md` for usage, compatibility, verification, and remaining voice and device work.

## The Finishing Touch — Memory Book milestone 5
- Audit-driven Studio and autosave refinements, local voice memories, and the separate 18-page example **Every Little Thing About Us**.
- See `docs/MEMORY_BOOK_FINAL_REVIEW.md` for the implementation commit, actual production measurements, limitations, and device checklist.
