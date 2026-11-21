# Dear Tomorrow — About and How It Works

The editorial information pages cover the story and the current preview.

- `/about` opens with the personal reason Dear Tomorrow began. The watercolor and its song sit alongside the founder’s story on wide screens and between the headline and story on phones. The “A little place for the things that stay” introduction, product areas, and preview status follow.
- `/how-it-works` shows how to write a letter, grow a Memory Tree, and make a Memory Book. The guide explains browser-local saving, backups, and the current limits of the preview.

## How It Works recordings

The three walkthroughs were captured in the running Dear Tomorrow app with separate, clean Chromium profiles. The letters, tree memories, and book are fictional. The book uses a generated photograph of a rainy street, placed through the real Studio photo picker.

| Chapter | What the recording shows | Duration |
| --- | --- | ---: |
| [Letters](../public/guide/letters.mp4) | Write on paper, change the stationery and wax, seal the envelope, and open the finished letter | 27.5 s |
| [Memory Tree](../public/guide/memory-tree.mp4) | Plant a seed, save a dated memory, watch its leaf emerge, rotate and click the leaf, and revisit the timeline | 28.0 s |
| [Memory Books](../public/guide/memory-books.mp4) | Choose a cover, add writing and place a photo in Studio, open the cover, and turn a real page | 29.0 s |

The guide uses silent MP4 files with WebP posters and tighter phone crops. A video loads when its chapter comes into view or a visitor presses play. Only one video plays at a time. The controls offer play, pause, replay, seeking, and fullscreen. Videos pause offscreen and await manual play when reduced motion is enabled.

The production guide was verified in Chromium at 1440, 820, 390, and 320 pixels. All three desktop videos played, looped, paused offscreen, and accepted keyboard controls. The three phone crops played inline. Reduced motion loaded no video before a user action. The About screenshot matched the pre-change baseline, and all six routes rendered without browser errors. Lint, type checking, the production build, and all 64 existing automated tests passed.

## Watercolor keepsake

The supplied cherry-blossom artwork is served as lossless WebP. The eyes and brows stay on the fixed base. Feathered masks limit motion to parts of two blossoms, an outer bud, and a loose hair curl. Two detached petals occupy their own layers. Each transform repeats back to its starting pose. The artwork pauses offscreen and in a hidden tab, and reduced motion displays the still composition.

The dark keepsake plays the user-supplied Elena Blinova violin cover of “Javeda Zindagi” from a local audio file. The first 22 seconds were cut from the file before adding it to the site. Playback starts with an explicit button press, exposes the native player controls, and pauses when the page unloads. The audio is not requested until playback begins.

The homepage still uses the fictional newspaper montage and its replay controls.

## Verification

- Inspected the production page at 1440, 820, 390, and 320 pixels wide. Captures show the two-column and single-column layouts.
- Compared eye, eyebrow, and eyelid crops over 32 seconds of continuous motion. The pixels matched throughout. All eight decorative layers returned to the same rendered pose after 250 additional simulated cycles, paused when scrolled out of view, and resumed in place.
- Checked the still composition with reduced motion, followed the exact recording by keyboard, and rendered all six site routes in Chromium. Lint, type checking, the production build, and all 64 automated tests passed.
- Checked that the supplied recording plays from its trimmed beginning and pauses at desktop and phone sizes.
