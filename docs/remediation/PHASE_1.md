# Phase 1 · Storage and operational clarity

Completed 27 November 2026 on `codex/pre-launch-refinement`. The implementation is [c66df75](https://github.com/3eebu/DearTomorrow/commit/c66df758ec0b85c657af8c3c38cc332d6b480472), based on main `f3aef74`. The original findings remain at [the audit revision](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/10-MASTER-ISSUE-REGISTER.md). This phase resolves DT-QA-01, DT-QA-05 and DT-QA-15.

## DT-QA-01

**Original finding.** The cloud Memory Book photo picker said photos stayed on the device. The signed-in Letters and Tree banners made the same storage claim.

**Correction.** Workspace labels use the existing cloud scope. Book photo tools, cover editing, the photo inspector and voice controls describe the book's storage. The Letters and Journey Studio share scoped photo and audio disclosures. The Tree shows its photo disclosure immediately above the picker. A shared keepsake now explains what revocation does to later access and what happens to separate downloaded copies.

**Files.** `src/app/letters/page.tsx`, `src/app/memory-tree/page.tsx`, `src/components/home-studio.tsx`, `src/components/accounts/memory-page.tsx`, `src/components/journey-letters/journey-workspace.tsx`, `src/components/letters/{letter-studio,letter-attachments}.tsx`, `src/components/memory-books/{book-library,book-studio,cover-studio,studio-inspector,voice-inspector}.tsx`, and `src/components/memory-tree/{memory-tree-workspace,tree-dialogs}.tsx`.

**Acceptance and evidence.** Guest and authenticated Book Studio showed the correct destination before choosing a file on desktop. Authenticated Studio also did so at 390px. The Letters and Tree banners and photo controls showed My Space when reached through the authenticated workspace. The timed Letter form described opening rather than automatic delivery. Two independent authenticated browser contexts verified the correct user identities, selective sharing of a Book with a private photo, isolation of a second Book and revocation. [Before and after](#screenshots) · [Verification steps](evidence/phase-1/verify-disclosures.cjs)

**Limits.** The browser walkthrough used the development Supabase service from a local optimized build. It did not certify hosted Vercel transport, access through every attachment control, or provider availability on a release build. The diff contains UI, copy and documentation. There are no changes to adapters, data formats, migrations, API handlers or authorization.

## DT-QA-05

**Original finding.** The homepage said the site was an unsaved demo even though a guest book survived a full browser restart.

**Correction.** The home strip explains guest browser storage. The creation dialog identifies fictional examples, explains that clearing browser data can remove keepsakes, and links to the existing guide. The guide names the four existing export actions. The book and Journey screens also point to their backups.

**Files.** `src/components/home-studio.tsx`, `src/app/home-studio.css`, `src/app/how-it-works/page.tsx`, `src/components/memory-books/book-library.tsx`, and `src/components/journey-letters/journey-workspace.tsx`.

**Acceptance and evidence.** Opened the creation dialog at desktop and 390px. The storage link reached the backup guidance. Saved a fictional guest book, downloaded its backup, verified its title and two pages in the file, closed the browser and reopened the same isolated profile. The book was still in the library. Existing Letters, Journey Letters and Tree browser suites verified backup and restore workflows. [Before and after](#screenshots)

**Limits.** Restart persistence was verified in the same browser profile. A download creates a separate file. The app does not promise recovery after the profile or its data is cleared.

## DT-QA-15

**Original finding.** The progress document treated historical statements about storage, accounts and example journeys as current.

**Correction.** Progress now distinguishes implementation, dated development verification, the current protected staging revision, unverified release work, the experiment and frozen scope. Earlier milestone statements are archived with their context. Status distinguishes browser-clock previews, server-checked unlocking and proactive delivery. The staging runbook points to the verified configuration and preserves its earlier readiness snapshot.

**Files.** [Current progress](../PROGRESS.md), [historical record](../PROGRESS_HISTORY.md), [staging runbook](../VERCEL_STAGING.md) and [accounts notes](../ACCOUNTS.md).

**Acceptance and evidence.** Cross-checked workspace behavior against the original audit and Phase 1 runs. On 27 November the Vercel CLI reported READY Preview, `staging` at `8f1dce45366214c6a19f1ed617699d024f13617e`, with All Deployments protection. Anonymous HTTPS returned 302 at the apex and 307 at `www`. The Phase 1 production build and development Supabase browser tests are recorded separately.

**Limits.** The staging revision was inspected read-only. Real inbox delivery, release-origin Google consent, a large authenticated HTTPS transfer, and infrastructure restoration remain unverified.

## Screenshots

Captured in Edge with fictional content. Desktop samples use 1440×960. Phone samples use 390×844.

| Interface | Before | After |
|---|---|---|
| Homepage strip | [Before](evidence/phase-1/before-home.jpg) | [After](evidence/phase-1/after-home.jpg) |
| Guest Book photograph picker | [Before](evidence/phase-1/before-guest-book.jpg) | [After](evidence/phase-1/after-guest-book.jpg) |
| My Space Book photograph picker | [Before](evidence/phase-1/before-cloud-book.jpg) | [After](evidence/phase-1/after-cloud-book.jpg) · [390px](evidence/phase-1/after-cloud-book-390.jpg) |
| My Space Letters | [Before](evidence/phase-1/before-cloud-letters.jpg) | [After](evidence/phase-1/after-cloud-letters.jpg) · [Photograph picker](evidence/phase-1/after-cloud-letter-photo.jpg) |
| My Space Memory Tree | [Before](evidence/phase-1/before-cloud-tree.jpg) | [After](evidence/phase-1/after-cloud-tree.jpg) · [Photograph picker](evidence/phase-1/after-cloud-tree-photo.jpg) |
| Creation dialog and backup guidance link | Earlier homepage strip above | [Desktop](evidence/phase-1/after-home-create.jpg) · [390px](evidence/phase-1/after-home-create-390.jpg) |

## Checks

- `node --test tests/*.test.cjs` passed all 93 tests with zero failures or skips. Lint, standalone typecheck and the optimized Next.js production build passed.
- The disclosure runner passed the final build with fictional accounts. To reproduce, start the optimized app with the matching loopback origin and set `AUDIT_URL`, `AUDIT_PW`, `AUDIT_EDGE` and the repository's hosted-test environment variables. Run `node docs/remediation/evidence/phase-1/verify-disclosures.cjs after`. Run the same script with `before` against the audit's pinned main revision. The runner accepts only the designated development backend and creates its own fixture.
- The existing Letters, Journey Letters and Memory Tree browser suites passed in Edge. The hosted accounts suite passed generated confirmation and recovery, password login, account isolation, partner pairing, private photo sharing, revocation, disconnect and guest copy with idempotent retry.

[All original issue IDs and remaining statuses](README.md). The branch excludes its own automatic Git deployments in `vercel.json`. Phase 1 was reviewed in a separate worktree. The original audit and local edits in the experimental checkout were preserved.
