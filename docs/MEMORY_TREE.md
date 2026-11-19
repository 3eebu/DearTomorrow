
# Memory Tree

Open `/memory-tree` to plant a tree or explore The Orchard Years, a fictional tree with 32 memories. A new personal tree starts as a seed. Each saved memory adds one selectable leaf. The journal can open every memory by keyboard, including leaves hidden behind other foliage.

## Botanical direction

The earlier illustration gave the tree room to stand on its own. The refined page brings back that clarity with a centered title, cream backdrop, soft contact shadow, and a quiet caption below the tree. Rotation, zoom, and reset sit below the sculpture. Appearance, chapter management, and backups are grouped under **Tree options**. Pan, fit, fullscreen, and motion controls live under **View options**.

The tree grows from a slender sprout into a twisting trunk with flared roots and a broad, layered crown. Older, established, and new memories draw from a continuous palette of olive, green, and young spring tones. Warm olive and amber appear on the oldest leaves. Each leaf has a curled blade, gently serrated edge, shaded midrib, and forked veins. Milestones add cupped ivory blossoms beside their leaves.

## Implementation

- `src/lib/memory-tree-geometry.ts` uses the saved seed and memory slots to place the limbs and leaves. Sculpted trunk and root cross-sections follow the bends in the wood. Lower boughs sweep outward, upper forks climb more steeply, and smaller shoots fill the crown in later growth stages. Previously planted trees retain their memory IDs, slots, and growth history. Chapter filters still focus a chapter's branch.
- `src/lib/memory-tree-renderer.ts` draws the tree in indexed WebGL batches. Bark shading follows the wood grain, and leaf shading adds pigmentation, venation, and transmitted light. Mature trees use a lighter mesh at wide angles and restore detailed blades around the focus point when zoomed in. The depth-aware color-ID pass uses the same geometry for selection. The camera supplies 360-degree orbit, zoom, and pan. New shoots and leaves unfold in sequence, and reduced motion and the pause preference control movement. The journal remains available if graphics fail.
- `src/lib/memory-tree.ts` keeps the version 1 tree, chapter, memory, and photo records. Earlier backup files can still carry the garden preference for compatibility. All trees appear on the cream backdrop. Species, season, and age still influence the form or color.
- `src/lib/memory-tree-storage.ts` commits validated records to IndexedDB and detects stale writes from other tabs. Failed writes preserve the last committed record and the workspace can export the pending draft. Backup imports get a new library identity and retain memory slots. Photos are resized in the browser and embedded in backups.
- Tree, Timeline, and Calendar share the same document. The calendar supports multiple memories per day and recurring dates. February 29 anniversaries appear on February 28 in common years. Search, chapter filters, and browsing leave the sculpture intact.

## Verification

Run `node --test tests/*.test.cjs` for the Memory Tree and site regression suites. These tests cover one selectable leaf per memory at counts through 1,000, stable sites through growth and edits, date-based colors, species, seasons, backup validation, and compatibility with saved scene preferences.

The isolated Chromium test is `node tests/memory-tree.browser.cjs`. It expects the preview at `http://127.0.0.1:3002` by default. Set `MEMORY_TREE_URL` to use another preview. Playwright and Chromium can be provided using `MEMORY_TREE_PLAYWRIGHT` and `MEMORY_TREE_CHROMIUM`. Set `MEMORY_TREE_SCREENSHOTS` to save captures. The tests use a fresh browser profile and synthetic data.

Browser coverage includes planting, growth, pointer selection after orbiting, Calendar and Timeline links that position the selected leaf in the rendered view, chapter organization, photo attachment, edit and delete, refresh persistence, backup import and export, touch pinch and pan, reduced motion, and the journal with WebGL disabled. Viewports are 1440 × 1000, 820 × 1180, and 390 × 844. Mobile touch is emulated.

All 64 automated tests passed, along with lint, type checking, the production build, and the production Chromium scenarios. At 1,000 × 750 in Chromium with SwiftShader, the 1,000-memory backup reached the production viewer in 395 ms. A short wide orbit sample submitted 13 draws at a 68.5 ms 95th-percentile interval. The visible pass drew 67,899 triangles at the wide fit and 154,843 when focused on a particular leaf. A separate seeded mesh test had about 247,000 full-detail triangles available.

In a like-for-like development preview comparison at 1,000 memories, the initial indexed renderer brought the 95th-percentile draw interval from 70.2 ms to 55.0 ms and import-to-viewer time from 498 ms to 414 ms. These short software-rendered samples measure draw submissions on one machine.

Three.js supports indexed geometry, custom attributes, and more general-purpose physically based materials. The refinement retains native WebGL because the tree can batch shared vertices, shade its materials, and use the same geometry for leaf picking. The figures above compare versions of the native renderer. [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) · [Three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)

## Visual review

The supplied botanical reference guided the S-curve of the trunk, the ribs that continue into spreading roots, the longer lower branches, and the mix of green, olive, and gold around the ivory blossoms. The browser captures show those features against the site's plain cream stage. The first memory has a single leaf and a small root flare. Gaps between branches remain visible as the crown thickens, especially around the outer boughs.

| Memories | Front | Turned |
| --- | --- | --- |
| 1 | [Front](memory-tree-preview/botanical/botanical-1.jpg) | [Turned](memory-tree-preview/botanical/botanical-1-side.jpg) |
| 10 | [Front](memory-tree-preview/botanical/botanical-10.jpg) | [Turned](memory-tree-preview/botanical/botanical-10-side.jpg) |
| 50 | [Front](memory-tree-preview/botanical/botanical-50.jpg) | [Turned](memory-tree-preview/botanical/botanical-50-side.jpg) |
| 100 | [Front](memory-tree-preview/botanical/botanical-100.jpg) | [Turned](memory-tree-preview/botanical/botanical-100-side.jpg) |
| 500 | [Front](memory-tree-preview/botanical/botanical-500.jpg) | [Turned](memory-tree-preview/botanical/botanical-500-side.jpg) |
| 1,000 | [Front](memory-tree-preview/botanical/botanical-1000.jpg) | [Turned](memory-tree-preview/botanical/botanical-1000-side.jpg) |

[Desktop](memory-tree-preview/botanical/botanical-desktop.jpg) · [Tablet](memory-tree-preview/botanical/botanical-tablet.jpg) · [Phone](memory-tree-preview/botanical/botanical-phone.jpg) · [Example from behind](memory-tree-preview/botanical/botanical-back.jpg) · [Leaf detail](memory-tree-preview/botanical/botanical-leaf.jpg) · [Detail at 1,000 memories](memory-tree-preview/botanical/botanical-1000-leaf.jpg)

## Remaining device checks

Physical phones, Safari, Firefox, and long-running graphics sessions still need hands-on coverage. Surrounding leaves can obscure a leaf in a mature crown. Search, Timeline, Calendar, and the journal give access to each memory.
