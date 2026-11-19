# Memory Book Milestone 4 — The Magic Within

This increment builds on the existing physical reader and Studio at checkpoint `3d9a9454b2fd8c429c56cc671f94b8718200d0a0`.

## What you can make

Open **Little Surprises** in Studio. Select an object and open **Try this surprise** in Properties to use it as the reader would. Surprises use the same placement, resize, rotation, layering, groups, duplication, undo and autosave as the other objects on a page.

| Object | Customization and interaction |
| --- | --- |
| Sealed envelope | Three paper stocks, three flap cuts, exterior inscription, wax colour and initials. The seal releases, the flap hinges back, and the letter rises. Return letter reverses the sequence. |
| Folded love note | Heart, accordion, single, double and square folds. The exterior leaves hinge away from the writing along their creases. Existing notes can use the new fold while keeping their words. |
| Reversible photograph | Add a reverse to an existing photo or Polaroid, or start with a new reversible Polaroid. The back has independent writing, ornament, date, place and photo. The front keeps its existing frame and crop controls. |
| Scratch card | Heart, circle or rectangle coating. Drag to erase part of the coating. Reveal and reset are available to a keyboard user. Scratching reveals already embedded content. |
| Lift-up flap | Choose the hinged edge and customize both faces. Open and close the flap on the page. |
| Memory pocket | Up to six notes, photos, letters, tickets, quotes, dates or keepsakes. Pull out individual items, read or inspect them, and return them. |
| Paper pop-up | Heart, flower, paired hearts and birthday paper cutouts. Two hinged pieces rise and open along the centre crease. |

Book options include **Wrap as a gift**. The Gift Studio has paper colours and patterns, satin and cotton ribbons, two bow styles, a tag, sender and recipient, and an opening message. Untie the bow to see the wrapping fold away from the existing hardcover. The reader can replay or skip and open the book at their own pace. This presentation plays locally.

Morning Sun, Candlelight and Rainy Afternoon now have a textured tabletop with directional light and shadows. Candlelight has a wax well and warm light pool. The rainy window has moving droplets. **Pause scene motion** pauses the ambient movement. Reduced-motion preferences make the surprise transitions and gift release immediate and suppress the scene animation.

## Data and rendering

Version 2 documents carry optional version 1 surprise and gift fields. Validation checks the fields, compatible object types, local asset references, sizes and pocket item IDs before a backup reaches storage. The existing version 1 conversion and IndexedDB transaction protocol still apply. Image preparation is the existing local image pipeline. A late interior image upload updates the latest valid destination and preserves newer writing and the front photograph.

Transient reader state is scoped by book, page and object. Opened objects and scratch marks survive turns in the same reading session. Reader actions never change the exported document. Curved strips draw passive copies in the same pose and omit surprise objects whose visible bounds cannot reach the strip. The settling clock starts on the first animation frame after the sheet is mounted. Simple reading provides native disclosures for every hidden message and pocket item.

## Verification

- Imported a synthetic 180 × 240 mm, four-page anniversary book with all seven surprises. Generate it locally with `node tests/create-magic-fixture.cjs <output.json>`.
- Untied the gift from the physical reader and opened the revealed hardcover. Checked the opening message, mobile keyboard activation on the ribbon, skip and the replay control.
- Opened and returned the envelope, unfolded the heart note, reversed the Polaroid, lifted the flap, opened the paired-heart pop-up, and pulled out both a ticket and photograph. Dragged a mouse across a rotated scratch surface and inspected the partial erasure. Tested keyboard reveal and reset.
- Turned forward and backward in all three scenes and checked that the opened envelope survived a round trip. Confirmed that pausing the rainy scene puts its CSS animation in the paused state.
- At 820 px, added a flap in Studio and undid it. Changed the envelope flap, message and rotation, tried the preview and uploaded a hidden image. Waited for local save. Reopened after refresh at 390 px, used Simple reading, exported and reimported the updated book, and verified the message and uploaded image in the separate copy. Tested the 1440 px desktop reader and reopened the earlier ten-page Bookmaking sample.
- The 41 automated tests passed. The new cases cover all seven surprise types and gift backup, rejected fields and references, stale photograph destinations, page-scoped state and passive strip rendering. The existing migration, storage, editor, and physics suites still pass.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check` passed. The production build generated all six routes. Memory Books reports 136 kB of first-load JavaScript.

Review captures of the wrapped gift, opened letter, partially erased scratch card, and mobile page were inspected in the browser. The capture tool displayed the images in the session but did not provide a workspace file, and the Windows save attempt did not open a usable window.

## Browser timings and limitations

The development timing attribute showed roughly one-second callback gaps after the final changes, with two intervals per turn across six samples. The browser reported a visible document and reduced motion disabled. Mean geometry and style work was **0.37–0.83 ms** per paint callback. The near one-second callback cadence makes this environment unsuitable for a representative frame-rate claim. Manual cross-browser animation profiling and tests on physical touch hardware remain open.

Voice memories are deferred, including recording, playback, transcript editing, and a versioned audio asset budget and import/export pipeline. Paper geometry uses hinged CSS surfaces and cutouts. Denser scrapbooks, all individual paper variants, and cross-browser reduced-motion rendering still need broader device testing.

Local preview: `http://127.0.0.1:3002/memory-books`. An external preview was not started.
