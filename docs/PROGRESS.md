# Dear Tomorrow development status

Updated 27 November 2026. This page tracks implementation and verification by environment. The [historical build record](PROGRESS_HISTORY.md) preserves earlier milestones in their original context. The [original audit](https://github.com/3eebu/DearTomorrow/tree/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit) and [remediation tracker](remediation/README.md) track findings and resolutions.

## Implemented in the application

| Surface | Current behavior | Reference |
|---|---|---|
| Homepage and guides | Editorial homepage with a fictional newspaper montage, creation entry points, Our Story and How It Works. Examples are separate from keepsakes a visitor creates. | [Information pages](INFORMATION_PAGES.md) |
| Guest workspaces | Letters, Memory Books, Memory Tree and Journey Letters save to separate IndexedDB stores in the current browser. Clearing browser data can remove guest work. Each workspace can export a backup. | [Letters](LETTERS.md) · [Books](MEMORY_BOOKS.md) · [Tree](MEMORY_TREE.md) · [Journeys](JOURNEY_LETTERS.md) |
| Accounts and My Space | Supabase-backed email sign-in and recovery, permanent Dear Tomorrow ID, private cloud documents and media, and an optional guest copy into My Space. The browser originals remain. Google Sign-In depends on provider and feature configuration. | [Accounts](ACCOUNTS.md) |
| Partner sharing | Connected partners can share individual keepsakes. Revocation and disconnection limit later access in Dear Tomorrow. A downloaded export remains a separate copy. | [Accounts](ACCOUNTS.md) |
| Opening times | The device clock drives guest previews. For timed content explicitly shared through My Space, the server checks whether the recipient can read it. This is a scheduled unlock in Dear Tomorrow. There is no proactive letter email, notification or third-party delivery integration. Authentication emails are a separate system. | [Letters](LETTERS.md) · [Journeys](JOURNEY_LETTERS.md) |
| Creative tools | Book Studio, chapters, physical reader, seven paper surprises and voice memories. Memory Tree uses the painted landscape and the interactive illustrated tree with timeline and calendar. Journey Letters supports creating and saving journeys and editing six checkpoints. | [Memory Book final review](MEMORY_BOOK_FINAL_REVIEW.md) · [Landscape foundation](MEMORY_TREE_ENVIRONMENT.md) |

## Verified development behavior

- **26 November 2026 · main `f3aef74`, local optimized build.** The audit exercised all four guest workspaces, backup and recovery, and a browser restart. It recorded 176 route/viewport samples across Edge, Firefox and WebKit. The test sizes were browser emulations. [Test coverage](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/12-TEST-COVERAGE.md)
- **26 November 2026 · hosted development Supabase from a loopback build.** Fictional accounts passed generated confirmation and recovery links, onboarding, independent access to saved content, selective book and private photo sharing, revocation and guest migration. Read-only metadata verified all four expected migrations, a private bucket and a successful run of the ten-minute transfer-fragment cleanup job. [Hosted evidence](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/evidence/hosted-tests.md)
- **27 November 2026 · pre-launch refinement branch.** Phase 1 addresses storage and backup wording. The tracker records the scope, results and exact revision tested. [Remediation tracker](remediation/README.md)

## Protected staging

On 27 November 2026, authenticated Vercel metadata confirmed a READY Vercel Preview serving `staging` at `8f1dce4` with All Deployments protection. An anonymous request to the apex returned the sign-in redirect (302). The `www` address returned a redirect (307). The candidate and Phase 1 branch were tested locally. [Protected staging](https://deartomorrow.site) · [Recorded deployment metadata](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/evidence/staging-metadata.json) · [Runbook](VERCEL_STAGING.md)

## Unverified release work

Verify the intended release revision on protected HTTPS. This includes actual signup and recovery inbox delivery, a fresh Google consent and return, interrupted large Vercel transfers and exports, a matched restore of cloud records and private media, and operational alert delivery. Public privacy and terms information, accessibility refinements and physical-device coverage remain on the release checklist. Generated Auth links verify callbacks and account behavior without verifying inbox delivery. [Audit readiness evidence](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/09-PRODUCTION-READINESS.md)

## Experimental and frozen work

- **Experimental.** The WebGL living landscape is isolated from main on `codex/living-landscape-rd`. Its lighting and growth demonstrations are research. The launch candidate uses the approved painting and the existing illustrated Memory Tree.
- **Frozen.** Paid membership and checkout, proactive letter delivery and the experimental landscape replacement are outside refinement. The Couples Arcade remains future scope. [Original audit roadmap](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/11-REFINEMENT-ROADMAP.md)
