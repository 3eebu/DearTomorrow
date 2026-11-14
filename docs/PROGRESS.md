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
- Memory Tree illustration is an interactive first pass, not a finished realistic or unlimited-scale tree; it currently displays up to 16 marker locations, with extra memories in the list.
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
