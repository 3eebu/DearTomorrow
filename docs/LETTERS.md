# Letters

Open `/letters` to write on paper, lift the Letter Box lid, or open the anniversary example. The example uses fictional writing and stays outside the personal collection.

## What you can do

- Keep drafts, sealed letters, Letter to Tomorrow schedules, opened letters, favorites, and archived letters. The box shows up to three recent envelopes. Choose an envelope gallery or a list, search by title, address, label, collection, or writing excerpt, and sort by date or title. Organize a letter from its menu, or duplicate it as a draft.
- Write a love letter, an Open When letter with a custom label, a Letter to Tomorrow, a letter to your future selves, or a special occasion letter. Birthday, anniversary, apology, and celebration stationery starts with editable writing.
- Write directly on the page, add or reorder pages, apply bold, italic and underline, and adjust type, ink, alignment, and spacing. The writing control preserves native text editing and mobile keyboards. Formatting appears in the paper preview and the reader.
- Choose paper, a border, pressed-flower or other ornament, and initials. Customize both sides of the envelope. Changes appear immediately on the front or back preview, including flap, wax, and monogram. Pages support a photo or Polaroid, typed signature, and freehand ink. One optional audio attachment, transcript, special date, and hidden note travel with the letter.
- Seal, turn the envelope over, release the seal, read the pages, and fold the letter away. The paper uses separate hinged panels and slides between the flap and pocket. The Morning Sun, Candlelight, and Rainy Afternoon scenes share the same original tabletop effects used in Memory Books. The reader offers a skip button and honors system reduced motion. Scene motion can be paused independently.
- Export an individual letter or all letters in a collection. Imports make independent letter copies and match existing collection names when possible. A versioned backup carries the letter’s writing, styling, drawings, and any personal media, so store it privately.

## Storage and timing

`src/lib/letters.ts` validates the version 1 model and attachment formats. Existing book helpers handle mixed formatting, image preparation, and validated local PCM audio. Microphone access begins when the user presses **Record voice**. The player starts paused.

`src/lib/letter-storage.ts` separates the lightweight Letter Box catalog from letter records in IndexedDB. It loads a full document only when needed. Writes update the catalog and affected documents in one transaction. A revision check stops another tab’s changes from being overwritten. The Studio autosaves after typing pauses. A failed write leaves the editor open with retry and backup actions. Letters are saved before the sealing animation starts. Scene, pause, and gallery preferences are stored in the Letter Box catalog.

`src/lib/letter-time.ts` resolves the chosen wall-clock time and time zone to an instant. A skipped daylight-saving time is rejected, and a repeated hour offers both occurrences. A saved countdown uses that instant when the device moves to another time zone. The countdown and opening restriction are a local simulation and follow the device clock. Account-based delivery and secure scheduling are future milestones.

The library supports 100 letters and 32 collections. Each letter allows up to 24 pages, one photo per page, one voice attachment up to a minute, and 18 MB of document data. A combined backup has a 48 MB limit. Export large collections as individual letters if needed. Keeping a backup protects against browser storage clearing and profile loss.

## Verification

- All 64 tests passed with `node --test tests/*.test.cjs`, including the Memory Book and Memory Tree regression suites. Letters tests exercise state transitions, an exact opening boundary, daylight-saving gaps and repeats, calendar boundaries, seven custom Open When letters, and validated media and formatting round trips.
- `node tests/letters.browser.cjs` exercises the actual workspace in isolated Chromium profiles. It expects a preview at `http://127.0.0.1:3002`. Set `LETTERS_URL` for another preview, `LETTERS_PLAYWRIGHT` for a Playwright module path, and `LETTERS_CHROMIUM` for a compatible Chromium executable. `LETTERS_SHOTS` saves optional synthetic screenshots.
- Browser workflows passed on the production build at 1440 × 1050, 820 × 1180, and 390 × 844. Coverage included the anniversary letter, multiple handwritten pages, paper and envelope customization, full sealing and opening, photo preview, voice playback and simulated microphone capture, fold and reopen, all three scenes, reduced motion, calendar scheduling, favorites, archive, refresh, backups, the seven-letter collection, stale tab recovery, and Journey Letters. The Memory Tree Chromium regression suite also passed through 1,000 synthetic memories.
- Lint, type checking, and the production build passed.

At 1440 × 1050, the production Chromium test recorded 197 animation frame callbacks across the 3.16-second sealing sequence and 181 across the 2.89-second opening sequence. The 95th-percentile interval was 18 ms for both. The test also confirmed changing flap and paper transforms. The measurements describe animation callbacks on the development machine. Physical-device presentation may differ.

## Review images

[Letter Box](letters-preview/letter-box.jpg) · [Personalized seal](letters-preview/sealed-envelope.jpg) · [Paper unfolding](letters-preview/emerging-letter.jpg) · [Phone reading](letters-preview/mobile-reading.jpg)

## Remaining device checks

Physical phone touch, physical microphones, Safari and Firefox still need hands-on coverage. The folds are three-dimensional CSS panels with stylized creases. Formatting tools work through text selection and a paper preview. Sketching uses mouse, pen, or touch. Stamps support custom wording and use a fixed stamp illustration.
