# Dear Tomorrow — Phase 1 build progress

## Current implementation
- Redesigned no-photography landing page: warm editorial typography, simple navigation, textured stationery built with CSS, and reveal animation.
- Clickable 3D-style envelope and readable sample letter.
- Create flow with three beginner-first choices and a local letter composer including preview.
- Interactive Memory Book demo: editable cover name and palette, physical-styled cover, page turns using buttons, keyboard and swipe.
- Memory Tree: animated SVG trunk, branches, leaves, interactive memory markers, list and details; new memory creation via form; same data in calendar and tree.
- Journey Letters: route animation and six selectable demonstration checkpoints.
- About and How It Works pages, with navigation updated for Memory Tree.
- Responsive mobile navigation, reduced-motion rules, modal keyboard focus cycling, basic semantic controls.

## Not yet done or verified
- No live accounts, database, uploads, real letter sending, subscriptions, real scheduled unlocks, email notifications or offline letter functionality.
- All editor and memory state is local only; refreshing loses changes.
- Memory Tree uses tapered wood, bark highlights and compound sprays of veined leaves. Every added memory creates a bough and an unfurling memory leaf; tree size increases with memory count. All memories remain selectable in the tree, list and calendar. Very large collections still need performance profiling and clustering.
- The current memory book is a stylized CSS/dimensional prototype, not the full freeform scrapbook studio.
- No images have been added to the homepage; in the future users can opt to upload their own photos.
- Automated browser interaction tests, real-device inspection and screenshots at 390px / 1440px have not been performed.
- npm lint/typecheck/build have not been run in the assistant environment because npm dependencies cannot be fetched there; the GitHub workflow requests these checks remotely when GitHub Actions is available. A workflow file is not proof that checks passed.
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
