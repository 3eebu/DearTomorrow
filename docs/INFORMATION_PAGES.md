# Dear Tomorrow — About and How It Works

The editorial information pages cover the story and the current preview.

- `/about` opens with the personal reason Dear Tomorrow began. The watercolor and its song sit alongside the founder’s story on wide screens and between the headline and story on phones. The “A little place for the things that stay” introduction, product areas, and preview status follow.
- `/how-it-works` explains simple first steps, what can be tried in Phase 1 and what has not launched.

## Watercolor keepsake

The supplied transparent artwork is served as lossless WebP. The conversion preserves the color of every pixel with nonzero opacity and the original alpha channel. The eyes and brows stay on the fixed base. Feathered masks limit motion to parts of two blossoms, an outer bud, and a loose hair curl. Two detached petals occupy their own layers. Each transform repeats back to its starting pose. The artwork pauses offscreen and in a hidden tab, and reduced motion displays the still composition.

The dark keepsake links to Elena Blinova’s violin cover of “Javeda Zindagi.” The official player returned error 150 for this video in the browser, so the card opens the exact recording on YouTube. The About page makes no video or audio requests on load. [Recording](https://youtu.be/AVh5PNsOg1U?si=_iRL8HqfSSk6bkia) · [YouTube player errors](https://developers.google.com/youtube/iframe_api_reference#onError)

The homepage still uses the fictional newspaper montage and its replay controls.

## Verification

- Inspected the production page at 1440, 820, 390, and 320 pixels wide. Captures show the two-column and single-column layouts.
- Compared eye, eyebrow, and eyelid crops over 32 seconds of continuous motion. The pixels matched throughout. All eight decorative layers returned to the same rendered pose after 250 additional simulated cycles, paused when scrolled out of view, and resumed in place.
- Checked the still composition with reduced motion, followed the exact recording by keyboard, and rendered all six site routes in Chromium. Lint, type checking, the production build, and all 64 automated tests passed.
