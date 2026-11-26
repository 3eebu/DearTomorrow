# Functional audit

| Customer journey | Completed in this run | Boundary |
|---|---|---|
| First visit | Home, visible headline during entry, replay, guide, dedication, four actual creation destinations, public signup/login/reset states. | Seeing the personal value of a product is a design judgment. Google consent and signup email arrival need an authorized external actor. |
| New couple | Supabase created fictional identities; generated confirmation links, welcome/profile, permanent IDs, ID-only lookup, accepting a pairing, personal and shared spaces. The recipient read a shared book and private photo, could not read the other book, lost access after revocation and disconnected in the UI. | Hosted signup-link generation does not exercise the SMTP submission/delivery path. |
| Established couple | Imported a 100-page guest book with 75 objects on one page; edited the book, exported a new version and read the resulting 102-page book. Opened the 18-page example, all seven surprises, three reading environments; generated a 2,400-memory tree. Created letters with media, timelines and routes. | These are independent synthetic corpora; no multi-year, cross-device composite household was retained or populated at hosted scale. |
| Returning visitor | Guest book survived a full browser process restart in the same isolated profile. Edits survived refresh; bookmarks were toggled. Confirmed sessions and new-password login, guest import with original preserved and safe retry. A second independent profile read back the fictional cloud Letter, Journey and Tree leaf. | Returning through real Google and physical-device sync were not freshly tested. |
| Failure and recovery | Unavailable IndexedDB, reload/retry, absent landscape artwork, offline manual Journey, invalid local times, stale/concurrent saves, one-time-link reuse, test isolation after revoke, unsupported GPU fallback. | Live mid-flight HTTPS interruption and real grace-period/expired sessions in the Studio remain open. |

### Letters and Journey Letters

The Box test wrote text, selected stationery, signed, customized the envelope, prepared attachments, saved and reopened a draft, sealed/opened, organized a collection and imported a backup. A microphone test used a simulated device and actual browser recording APIs. Two competing letter edits retained the committed copy and exposed recovery export for the conflicting draft. Keyboard, emulated touch and reduced-motion modes were exercised. [Letters results](evidence/letters-run.txt).

The six-stop journey supports a manual route and time zones, edits and persisted states. The browser exercised creation, reading and opening, rollback/stale tabs, backup, and manual offline creation. Model tests cover daylight-saving gaps and ambiguous times. The decorative plane depicts progress; it does not track a live flight. Guest countdowns use local time; authorized cloud reads can be time-gated. No worker was found that sends letters by email or pushes a recipient notification. Describing passive availability as delivery would materially change the promise. [Journey results](evidence/journey-letters-run.txt) · [Model and policy tests](evidence/unit-tests.txt).

### Memory Books

| Feature | Observation |
|---|---|
| Creation, library and covers | Hosted UI created a book; library load/error/retry were tested locally. Four cover surfaces, material, finish, lettering, spine title and ribbon controls exercised. Layout and text varied on the live editable copy. |
| Pages, chapters and TOC | Added a template as page 101 to a 100-page book; independently inserted a chapter divider, then saw 102 pages in phone reading. Navigation TOC is separate from a physical page. Simple reading exposed all 18 articles of the example. |
| Canvas and arrangement | Wrote text; duplicate/undo/redo; uploaded an image; inserted an editable Polaroid, a rose, shape and pen stroke; resized a photograph by its handle; selected two layers, grouped, changed stacking, ungrouped, locked and unlocked. All ten tool panels opened. The edited backup had 77 objects on its original first page. |
| Recording | Created a voice card, recorded synthetic microphone input, supplied a transcript, uploaded a WAV and checked an actual exported voice asset and transcript. The example’s player played, sought and paused. Per-OS microphone rejection/interruption needs physical testing. |
| Gift and places | Presented the example wrapped, untied the ribbon, replayed and skipped it. Added a bookmark. Tested Morning Sun, Candlelight and Rainy Afternoon and their pressed states. Cross-device reading-position retention is unverified. |
| Little Surprises | Physically unfolded/refolded the note, opened/returned the envelope, flipped/restored the photo, scratched a card with a pointer and used the reveal/reset controls, pulled out/returned the ticket, lifted/lowered the flap, raised/closed the pop-up. |
| Reader | Actual forward/backward turns, page counters, covers and spread/simple view; 320px single page; edge drag canceled with Escape, repeated arrow input settled onto a valid page. Model tests verify segment length, reverse surfaces, odd/even spreads and momentum. Physical thumb flicks across hardware remain open. |
| Persistence | Renamed, saved, refreshed and reopened, re-imported fictional fixtures, exported and verified structured data. Guest-to-cloud migration retained original browser data and an idempotent retry. |

[Reader evidence](evidence/book-walkthrough.json) · [Studio evidence](evidence/studio.json) · [Walkthrough recording](evidence/book-walkthrough.mp4).

### Our Story, Memory Tree and dates

Our Story leads to the founder’s personal dedication. The requested branching timeline and editable relationship dates belong to Memory Tree. In an isolated grove the test planted a tree, created a photographed leap-day memory and a second memory for that same date, followed Calendar to the correct leaf, switched selected leaves with the keyboard, followed Timeline back to the tree, edited/deleted, managed chapters, reloaded and restored a backup. It checked the observed annual leap-day case in 2026. Seven growth sizes and the separate experiment’s seven specimens were exercised. The mature landscape is environmental art; it does not prove that personal leaves exist. Long histories were stress-tested with synthetic imports. [Tree evidence](evidence/memory-tree-run.txt) · [Landscape results](evidence/memory-tree-environment-run.txt).
