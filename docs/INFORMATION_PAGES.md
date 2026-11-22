# Dear Tomorrow — About and How It Works

The editorial information pages cover the story and the current preview.

- `/about` is a personal dedication. The original story sits beside the watercolor and music keepsake on wide screens. On smaller screens the painting and keepsake follow the headline, with the story and a closing line beneath them.
- `/how-it-works` shows how to write a letter, grow a Memory Tree, and make a Memory Book. The guide explains browser-local saving, backups, and the current limits of the preview.

## How It Works recordings

The three walkthroughs were captured in the running Dear Tomorrow app with separate, clean Chromium profiles. The letters, tree memories, and book are fictional. The book uses a generated photograph of a rainy street, placed through the real Studio photo picker.

| Chapter | What the recording shows | Duration |
| --- | --- | ---: |
| [Letters](../public/guide/letters.mp4) | Write on paper, change the stationery and wax, seal the envelope, and open the finished letter | 27.5 s |
| [Memory Tree](../public/guide/memory-tree.mp4) | Plant a seed, save a dated memory, watch the illustrated tree grow, and select a leaf to read its story | 28.0 s |
| [Memory Books](../public/guide/memory-books.mp4) | Choose a cover, add writing and place a photo in Studio, open the cover, and turn a real page | 29.0 s |

The guide uses silent MP4 files with WebP posters and tighter phone crops. A video loads when its chapter comes into view or a visitor presses play. Only one video plays at a time. The controls offer play, pause, replay, seeking, and fullscreen. Videos pause offscreen and await manual play when reduced motion is enabled.

The production guide was verified in Chromium at 1440, 820, 390, and 320 pixels. All three desktop videos played, looped, paused offscreen, and accepted keyboard controls. The three phone crops played inline. Reduced motion loaded no video before a user action.

## Watercolor keepsake

The original lossless WebP supplies both the still painting and eight decorative layers. Complementary masks blend six local areas into the fixed painting, including parts of both blossoms, individual petals, an upper bud, and a hair curl. Two detached petals have their own clipped outlines. The eyes, lids, lashes, and brows stay on the fixed layer. The layers have independent timings, pause offscreen or in a hidden tab, and resume from the same position. Reduced motion displays the original still artwork.

The dark keepsake plays Elena Blinova’s violin cover of “Javeda Zindagi” in the page. Playback starts on request, and the supplied recording is trimmed by 22 seconds. The preview uses the ignored asset at `public/about/javeda-zindagi.mp3`. A build without that asset omits the song card. Provide a recording cleared for public distribution at that path before building a public deployment with the player.

The homepage still uses the fictional newspaper montage and its replay controls.

## Verification

- Review the full-page layout at 1440, 820, 390, and 320 pixels wide. The page uses the original story text, keeps the shared navigation and footer, and places the keepsake under the painting.
- Check the protected eye and brow regions at different animation phases, including before and after the loop boundary. Scroll the artwork out of view and back to verify that its decorative motion resumes from its paused position.
- With reduced motion enabled, verify that the SVG shows the still artwork. Use the keyboard or touch to start the recording, pause it, and resume from the same point.

The production Our Story page was checked in Edge at all four widths. The protected eye regions matched pixel for pixel at sampled phases on desktop and phone. The review included two real cycles of every layer, offscreen pause and resume, and a simulated 250-cycle repeat. How It Works matched its previous desktop screenshot byte for byte, and all three guide films played. The Letters and Memory Tree browser suites passed. The Memory Books sample opened, turned a page, and saved an editable copy in an isolated profile. Lint, type checking, the production build, and all 65 automated tests passed.
