# Memory Tree

Open `/memory-tree` to plant your own seed or explore The Orchard Years, a fictional example with 32 memories. Planting gives you a seed. Saving the first memory opens its first leaf. As you add memories, more boughs and leaves fill in the illustration.

## Using the tree

- A leaf opens its memory in the reading panel. From the keyboard, tab into the tree, move through leaves with the arrow keys, and press Enter or Space to read the selected memory.
- Browse through the journal, Timeline, or Calendar. **Find this leaf** returns you to the illustration and focuses that memory’s leaf. Search, chapter, favorite, and milestone filters quiet the other leaves.
- Select **Add a memory** to save a date, title, story, or photograph. The reading panel includes editing, duplication, and export. **Tree options** includes appearance, chapters, and backup controls.
- **Pause motion** stops the illustration’s movement. The page also follows the system reduced motion preference.

## Illustration and saved data

The painted SVG uses curved, tapered boughs, a textured trunk, seasonal washes, and shapes specific to cherry, oak, and willow. Every saved memory has one individually identified leaf. Younger leaves range from fresh greens through the deeper olives and golds of earlier memories. Milestone blossoms appear on the smaller trees and beside the selected milestone in dense crowns.

A saved tree’s seed and memory slots determine placement. Edits and additions keep existing attachment coordinates. Deleting leaves can let the remaining canopy redistribute. The model chooses spaced positions on an ordered set of boughs and uses simpler leaf detail in dense canopies. The journal remains an easier way to find an individual memory when there are hundreds of leaves.

The existing version 1 model, IndexedDB store, and import and export formats are used for personal trees. Earlier backups retain their memory IDs, dates, chapters, photos, and appearance preferences. The calendar supports multiple memories on the same day and recurring dates, including February 29 anniversaries on February 28 in common years.

## Review

[Watch the recorded progression from bare earth to leaf selection](../public/guide/memory-tree.mp4). The 28-second clip uses fictional memories in an isolated browser profile.

Run `node --test tests/*.test.cjs` for the model and site regression tests. Run `node tests/memory-tree.browser.cjs` against the preview to exercise planting, growth, pointer and keyboard selection, filters, calendar, timeline, editing, photos, saving, and old backups. The script accepts `MEMORY_TREE_URL`, `MEMORY_TREE_PLAYWRIGHT`, `MEMORY_TREE_CHROMIUM`, and `MEMORY_TREE_SCREENSHOTS` for the preview address, browser tooling, and optional screenshots.

The production browser run used Edge at widths of 1440, 820, 390, and 320 pixels. It checked reduced motion and touch selection at phone widths with WebGL disabled. Synthetic backups with 1, 5, 20, 100, 500, 1,000, and 2,400 memories rendered one selectable SVG leaf per memory. In one local desktop run, backup selection through two animation frames after the leaves mounted took 137 ms at 100 memories, 303 ms at 1,000, and 656 ms at 2,400. These timings include import and rendering.
