# Memory Tree

Open `/memory-tree` to plant a tree or explore The Orchard Years, a fictional tree with 32 memories. A new personal tree starts as a seed. Each saved memory adds one leaf. The journal can open every memory by keyboard, including leaves hidden behind other foliage.

## Implementation

- `src/lib/memory-tree.ts` defines the versioned tree, chapter, memory, and photo records. Seed and insertion slots determine the physical layout. Editing the date changes the leaf color. Moving a memory to another chapter can move its attachment. Deleting or reordering unrelated memories leaves surviving positions intact. Branch and trunk thickness respond to saved memory counts.
- `src/lib/memory-tree-geometry.ts` generates the soil, roots, bark, wood, twigs, leaves, and milestone flowers. Flowering cherry has spreading boughs and broad blades. English oak has ascending boughs and lobed leaves. Weeping willow has arching limbs and narrow hanging leaves. Leaf ages use stored local calendar dates. Winter colors retain a visible leaf for every memory.
- `src/lib/memory-tree-renderer.ts` draws the meshes in WebGL. It uses one batched vertex buffer, a static shadow map, material shading, and a one-pixel color-ID pass for depth-aware picking. Camera gestures update uniforms. Simplified twigs and foliage reduce mesh cost at 450 memories. The tree is fully three-dimensional on supported devices and the journal remains available if graphics fail.
- Canvas 2D and SVG were considered for the journal and earlier tree. Native WebGL meets the requirements for depth, free orbit, exact picking, and a small number of draw calls with the geometry this route needs. Three.js and React Three Fiber would provide a broader scene and tooling layer. This implementation uses the existing React and browser APIs without adding a dependency.
- `src/lib/memory-tree-storage.ts` commits validated records to a dedicated IndexedDB database and detects stale writes from other tabs. Failed writes preserve the last committed record and the workspace can export the pending draft. The first personal tree and backup import are explicit actions. Imports get a new library identity and retain geometry identities. Photographs are resized in the browser and embedded in backups. Each memory supports four photos. Each tree supports up to 2,400 memories and 32 MB of embedded photo data. The local library supports up to eight trees. Backup files copy the stories and photos in the selected tree, so keep them somewhere private.
- Tree, Timeline, and Calendar share the same document. Date selection supports multiple entries, chapter and milestone markers, and recurring dates. February 29 anniversaries appear on February 28 in common years. Search and the browse view leave the geometry intact. Appearance, pause, and the last view are saved with the tree.

## Verification

Run the model and all Memory Book regression tests with `node --test tests/*.test.cjs`. The tests check unique leaf IDs through 1,000 memories, reproducible geometry, stable positions, age colors, species and seasons, calendar boundaries, and import validation.

The isolated browser test is `node tests/memory-tree.browser.cjs`. It expects a running preview at `http://127.0.0.1:3002` by default. Set `MEMORY_TREE_URL` to use another preview. Playwright and Chromium can be provided separately using `MEMORY_TREE_PLAYWRIGHT` and `MEMORY_TREE_CHROMIUM`. Set `MEMORY_TREE_SCREENSHOTS` to save stage captures. No existing browser data is used.

Browser checks passed on the development server and production build. Coverage includes planting, the first two leaves, actual pointer hits at two orbit angles, date highlighting and leap-day recurrence, timeline-to-leaf navigation, photo import, edits and duplication, deletion of test content, chapter rename and reorder, appearance and motion preferences, refresh persistence, backup import, and the journal with WebGL disabled. Viewport sizes are 1440 × 1000, 820 × 1180, and 390 × 844. Mobile input and reduced motion are emulated.

CPU mesh construction was about 4–82 ms for 1 to 1,000 synthetic memories on the development machine. The 1,000-memory fixture generated approximately 33,700 triangles. On the production build at 1,000 × 750 in Chromium using software graphics, the 1,000-memory import reached the viewer in 129 ms and had a 52 ms 95th-percentile interval between draw submissions in a short orbit sample. Draw submissions are measured at the WebGL call, with the renderer capped near 30 draws per second. Real-device presentation speed may differ.

## Remaining limits

Three species are available. The larger-tree tests use synthetic data and desktop Chromium. Physical phones, Safari, Firefox, and long-running graphics sessions still need hands-on profiling. Close views may occlude some leaves. Search, timeline, and calendar reach all memories, and the tree can focus a leaf even when surrounding branches overlap it. Device and browser settings determine the availability of WebGL and local storage.
