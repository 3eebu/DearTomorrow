# Living Memory Tree · Milestone 1

## What opens today

Open `/memory-tree`. A fresh workspace opens on the approved mountain landscape. Choose **Tree** for the interactive illustration, or plant a tree to start at the seed. Existing trees and the fictional example open at their existing saved view. **Landscape** is available alongside Tree, Timeline and Calendar. It shows the art direction for a fully grown tree at every memory count. Selecting it is local UI state and does not write to a tree, backup or account.

Developers can open `/memory-tree?studio=environment`, select Landscape, and expand **Environment studio**. The studio can toggle the delivered plate and registration points, follow the local clock, select a manual minute, pause the preview clock, set motion, growth and finch targets, and take a finite browser frame-interval sample. Pending art is labeled. Target settings are temporary. The production route ignores the query and the client gates the inspector import on development mode.

## Architecture audit

| Area | Existing behavior retained |
| --- | --- |
| Entry and navigation | The App Router resolves the optional account scope. Home Studio supplies the normal site navigation. The workspace loads the garden, selects the active tree or unplanted seed, and provides a separate fictional example. The existing read-only shared viewer also uses the tree experience. |
| Rendering | Tree View uses React and native SVG. The illustration model derives boughs, stems and leaf positions from the seed, slots, count and species. The stage draws seasonal, age-tinted leaves, adjusts detail for dense crowns, supports canopy zoom, leaf selection, keyboard navigation, and growth or replay. It observes visibility and reduced motion. The previous implementation had Tree, Timeline and Calendar; Landscape is new. |
| Memory lifecycle | The workspace handles planting, memory creation, editing, duplication, deletion, chapters, appearance and backups. The version 1 model assigns a stable ID and a monotonically allocated leaf slot. Each memory has one selectable leaf. The limit is 2,400 memories per tree, four photos per memory, and eight trees in a local garden. |
| Storage | Guest gardens use IndexedDB database `dear-tomorrow-memory-tree` and the `garden` store. Revision-checked transactions protect concurrent edits. The cloud adapter supplies the corresponding load/save interface to the scoped workspace. Import validates an existing backup into a separate tree. The landscape has no storage calls. |
| Selection | The workspace owns the selected ID, day, displayed month, and focus request. Leaf selection opens the detail. Timeline and Calendar can focus the same leaf. Search and chapter, favorite and milestone filters operate on the existing model. Landscape does not assign memory IDs to painted leaves. |
| Responsive and accessible behavior | Existing tap, roving leaf focus, Enter/Space activation, calendar controls, saved motion preferences, zoom, and reading panel stay in Tree View. Landscape uses a labeled group, descriptive image text and ordinary view buttons; it requires no dragging, motion or WebGL. |
| Dependencies and tests | React 19 and Next.js 16 already support the required composition. Existing Node tests cover the model, persistence/validation and geometry. The existing browser workflow covers planting through export, interactions, responsive layouts and large trees. The foundation adds composition and landscape browser coverage. |

## Renderer decision

Use a layered DOM compositor for the supplied painting. Desktop displays its full 1672 × 941 composition. Phones crop the two sides around the tree, retaining its crown and root flare. The artwork, alpha mattes, live slots and registration guides all use the same world. A single frame clips the world after placement. Independent cover-cropping of individual assets would make branch tips, leaves and future perches slide apart at different widths.

Ordinary image decoding leaves the static scene idle between paints. SVG remains appropriate for the already-interactive Tree View. Canvas or WebGL would introduce a render surface, rasterization budget and additional interaction work with no visual benefit for this single plate. Local mesh deformation can later be evaluated against real separated foliage on representative devices. There is no runtime renderer dependency or animation benchmark implying a particular frame rate.

The layer registry lives in `src/lib/memory-tree-environment.ts`. It describes back-to-front order, world bounds, registered pivot and optional co-registered alpha mask. The compositor keeps the master until the complete neutral core has loaded. An incomplete or failed assembly falls back to the single painting. Finches and memory markers have separate live slots. See the [artist handoff](MEMORY_TREE_ASSETS.md).

## Progression contract

| Memories | Existing stage |
| --- | --- |
| 0 | Seed |
| 1 | Sprout |
| 2–4 | Sapling |
| 5–14 | Young tree |
| 15–49 | Growing tree |
| 50–149 | Mature tree |
| 150–2,400 | Flourishing tree |

The first save grows the first leaf. Later artwork should depict each existing stage at a common ground anchor, with an authored silhouette and stage-specific attachment maps. Preserve the separate Flourishing stage and all existing IDs, species and growth rules. The master depicts the intended mature artistic direction. Approval of the individual portraits and marker registration is needed before replacing the interactive illustration.

## Verification entry points

Run `node --test tests/*.test.cjs`, `npm run lint`, `npm run typecheck`, and `npm run build`. With the local preview running, use `node tests/memory-tree.browser.cjs` for the complete interactive tree workflow and `node tests/memory-tree-environment.browser.cjs` for the landscape. The latter accepts `MEMORY_TREE_ENVIRONMENT=development` to cover the studio; the default checks the production gate. Both browser scripts accept the existing `MEMORY_TREE_URL`, `MEMORY_TREE_CHROMIUM`, `MEMORY_TREE_PLAYWRIGHT`, and optional `MEMORY_TREE_SCREENSHOTS` variables.

### Local verification · November 26, 2026

92 automated tests passed. ESLint completed with zero warnings, TypeScript passed, and the Next.js production build succeeded. Microsoft Edge ran in separate Playwright profiles with fictional trees and WebGL disabled. The development and production previews both passed the landscape checks at 1440, 820, 390 and 320 CSS pixels. The crown fit the phone crop; the four view controls occupied one row at each phone width. A deliberately failed artwork request left Tree View available. Production also hid the studio at its opt-in URL.

The existing interaction suite passed planting, new-leaf growth, keyboard and touch selection, timeline/calendar focus, photo attachment, editing, duplication, deletion, chapters, appearance, reduced motion, refresh persistence and backup round trips. Synthetic trees retained one selectable leaf per memory through 2,400. One isolated local run measured 560 ms from selecting a 2,400-memory backup through two frames after SVG mounting.

The native master transferred 2,268,292 encoded bytes on desktop and tablet. The phone source transferred 196,210 bytes (91% smaller). No animations ran in the static landscape. The development performance inspector sampled 199 browser frame intervals in 1.21 seconds with a 6.2 ms p95 on this desktop. Actual animated performance, physical phones, Safari, and separated-layer visual registration await later review.
