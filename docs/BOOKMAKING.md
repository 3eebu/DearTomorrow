# The Art of Bookmaking

This increment extends the existing Memory Book library, Studio, and reader. Open a book’s options menu to find **Cover Studio** and **Chapters & pages**. The three environments are available from the reader and Cover Studio’s physical preview.

## Cover Studio

- Front, back, and both inside covers have independent canvases. Start with guided lettering or use the existing Studio tools for writing, photographs, shapes, drawing, and ornaments.
- The five editable front layouts are Classic, Monogram, Botanical, Minimal, and Blank. There are nine procedural cover materials, a colour palette and custom picker, five finishes, and seven lettering treatments. On a freeform layout the objects own their wording and styling.
- The shelf and physical reader share the cover renderer. The reader mounts the inside front on the moving cover and displays the inside back at the end of a spread. The back cover has a separate lightweight preview. A colourable ribbon and optional bands attach to the physical book. Spine lettering appears on books with at least 20 pages.
- Covers and endpapers sit outside the numbered page array. When a cover canvas is edited, only that surface and its asset references are updated.

## Chapters, collections, and reading

- The organizer supports chapter titles, descriptions, colours, collapse, duplication, page movement, six editable divider styles, and undo and redo. Removing a label can retain its pages. Deleting a chapter’s pages requires confirmation and retains at least one numbered page.
- A chapter move explicitly groups its pages in the new chapter order and leaves unassigned pages after the groups. Assigning selected pages to a chapter preserves the existing reading sequence. The table of contents derives its page numbers from the current document and occupies no physical pages.
- The library can filter by shared collection name and shows optional series and volume labels. Collection names are per-book metadata. Removing a name from a book leaves the book intact.
- Bookmarks and the last reading place live in this browser. They use page IDs so they can follow page moves. Morning Sun, Candlelight, and Rainy Afternoon use CSS scenery. The scene choice is remembered per book for the browser session, and reduced motion disables the ambient movement.

## Document compatibility

The version 2 document retains its existing pages, assets, and storage transaction protocol. The optional cover design and bookmaking metadata both carry their own version. The existing version 1 conversion preserves order and identity. Backups include the new surfaces and metadata. Reading position, bookmarks, and the environment selection are browser preferences and stay outside backup files.

## Verification

- Passed ESLint, TypeScript, the optimized Next.js production build, and 37 automated tests. The new tests exercise the backup round trip, unsupported metadata, stable page identity, grouping, bulk reassignment, chapter duplication, and derived contents numbers. Existing storage and page turn tests still pass.
- Tested in the in-app browser at 1440, 820, and 390 pixel viewport widths. Used synthetic books and began with an empty library on the test origin.
- Created a 180 × 240 mm burgundy book with gold lettering, a monogram, border, back message, dedication, spine title, and ribbon. Checked its closed cover, opening, and forward and reverse page turns. Observed a visible flame in Candlelight and checked turning with Morning Sun and Rainy Afternoon selected.
- Created five chapter dividers, moved a chapter and two selected pages, and duplicated a chapter. Verified the ten-page result and a jump from the table of contents. On the phone viewport, closed the book, refreshed, and reopened it with the bookmark and reading position intact.
- Made a second book with a minimalist cover and a freeform caption. Filtered both books under a shared collection. Exported and reimported the first book and verified that the imported copy showed the monogram and contents.

## Remaining work

The creation wizard keeps its existing three steps and basic cover choices. Advanced choices are available in Cover Studio. Physical corner treatments, page-edge finishes, a freeform spine, a compact library view, library-wide collection rename and removal, and a dedicated mobile cover controls sheet remain future work.

Verification used browser viewports. Real touch hardware, reduced-motion emulation, frame-rate measurements, and the visual appearance of lettering on a thicker spine still need manual checks. No external preview was established for this increment.
