
# Memory Tree

Open `/memory-tree` to plant a tree or explore The Orchard Years, a fictional tree with 32 memories. A new personal tree starts as a seed. Each saved memory adds one selectable leaf. The journal can open every memory by keyboard, including leaves hidden behind other foliage.

## Botanical direction

The earlier illustration gave the tree room to stand on its own. The refined page brings back that clarity with a centered title, cream backdrop, soft contact shadow, and a quiet caption below the tree. Rotation, zoom, and reset sit below the sculpture. Appearance, chapter management, and backups are grouped under **Tree options**. Pan, fit, fullscreen, and motion controls live under **View options**.

The tree grows from a slender stem into curved boughs and an increasingly layered crown. Older, established, and new memories draw from a continuous palette of olive, green, and young spring tones. Warm olive and amber appear on the oldest leaves. Each leaf has a curved blade, a tapered edge, a small stalk, a shaded midrib, and branching veins. A milestone can add a small blush or ivory flower beside its leaf.

## Implementation

- `src/lib/memory-tree-geometry.ts` uses the saved seed and memory slots to place the limbs and leaves. Young limbs establish the silhouette. Mature forks extend some of those same limbs and fill the crown. Branch radii taper at their joints. The trunk curves and widens toward the roots. Related branches can share space, and chapter filters still focus a chapter's branch. The new geometry changes the appearance of previously planted trees while retaining their memory IDs, slots, and growth history.
- `src/lib/memory-tree-renderer.ts` batches the tree in WebGL. Shaders add bark grain, leaf texture, transmitted light, and a soft contact shadow. The camera supplies 360-degree orbit, zoom, and pan. A depth-aware color-ID pass lets a pointer select an individual leaf. New shoots and leaves unfold in sequence while the trunk extends. Gentle sway affects only foliage and its smaller twigs. System reduced motion and the pause preference control movement. The journal remains available if graphics fail.
- `src/lib/memory-tree.ts` keeps the version 1 tree, chapter, memory, and photo records. Earlier backup files can still carry the garden preference for compatibility. All trees appear on the cream backdrop. Species, season, and age still influence the form or color.
- `src/lib/memory-tree-storage.ts` commits validated records to IndexedDB and detects stale writes from other tabs. Failed writes preserve the last committed record and the workspace can export the pending draft. Backup imports get a new library identity and retain memory slots. Photos are resized in the browser and embedded in backups.
- Tree, Timeline, and Calendar share the same document. The calendar supports multiple memories per day and recurring dates. February 29 anniversaries appear on February 28 in common years. Search, chapter filters, and browsing leave the sculpture intact.

## Verification

Run `node --test tests/*.test.cjs` for the Memory Tree and site regression suites. These tests cover one selectable leaf per memory at counts through 1,000, stable sites through growth and edits, date-based colors, species, seasons, backup validation, and compatibility with saved scene preferences.

The isolated Chromium test is `node tests/memory-tree.browser.cjs`. It expects the preview at `http://127.0.0.1:3002` by default. Set `MEMORY_TREE_URL` to use another preview. Playwright and Chromium can be provided using `MEMORY_TREE_PLAYWRIGHT` and `MEMORY_TREE_CHROMIUM`. Set `MEMORY_TREE_SCREENSHOTS` to save captures. The tests use a fresh browser profile and synthetic data.

Browser coverage includes planting, growth, pointer selection after orbiting, Calendar and Timeline links that position the selected leaf in the rendered view, chapter organization, photo attachment, edit and delete, refresh persistence, backup import and export, touch pinch and pan, reduced motion, and the journal with WebGL disabled. Viewports are 1440 × 1000, 820 × 1180, and 390 × 844. Mobile touch is emulated.

All 64 automated tests passed, along with lint, type checking, the production build, and the production Chromium scenarios. The mesh test produced about 126,000 triangles in 278 ms at 1,000 memories. At 1,000 × 750 in software-rendered Chromium, the 1,000-memory backup reached the production viewer in 403 ms. In a short orbit sample it submitted nine draws with a 91 ms 95th-percentile interval. Detailed geometry costs more to render at this size. These measurements describe browser draw submissions on the development machine.

## Visual review

[Desktop](memory-tree-preview/desktop.jpg) · [Phone](memory-tree-preview/phone.jpg) · [Side view](memory-tree-preview/side.jpg) · [Leaf detail](memory-tree-preview/leaf.jpg) · [First sprout](memory-tree-preview/sprout.jpg) · [1,000-memory crown](memory-tree-preview/crown.jpg)

The visual pass used the rendered canvas at three viewport sizes, from the front, side, and back, and with 1, 5, 20, 50, 100, 500, and 1,000 synthetic memories.

## Remaining device checks

Physical phones, Safari, Firefox, and long-running graphics sessions still need hands-on coverage. Surrounding leaves can obscure a leaf in a mature crown. Search, Timeline, Calendar, and the journal give access to each memory.
