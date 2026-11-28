# Phase 3 · Private accounts and cloud reliability

The revision was built from the approved refinement branch. The original audit and its protected staging deployment are separate from this candidate.

## DT-QA-07

- The book shelf uses an authorized metadata projection. Opening, editing, duplicating, archiving, and exporting hydrate only the chosen book. Existing books work without a migration. The shelf uses the saved cover color, material, title, and subtitle. The full cover design and its photos open with the book.
- The Memory Tree index includes the text and settings needed for the calendar, filters, and timeline. It defers private photographs until the corresponding memory is selected. Whole-tree saves and full backups retrieve that tree’s existing photos as needed. Saving and exporting a full tree still scale with that tree’s media size.
- Individual reads check the workspace revision before using the returned content. Writes use the same optimistic revision check and owned-document scope as before. Full private artwork remains in the existing Storage bucket.

### Browser performance

Five fresh 390 × 844 Edge sessions per case on a loopback production build connected to the hosted development backend. The baseline replays the previous summary plus full-document reads in batches of four. Candidate time starts at navigation and ends at a usable shelf or at the tree index and its first selected photograph. Baseline time starts with the first data request and ends when all responses are decoded. Baseline JS heap is from the replay page, and candidate heap includes the actual editor shell. These are different kinds of timing and memory measurements. Transfer bytes count private API responses as measured by the browser, including response headers.

| Library | Read path | Requests | Transfer bytes | Load median / p95 | JS heap median / p95 | Longest task median / p95 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 book | Previous data read | 2 | 134,697 | 1,125 / 4,878 ms | 4.00 / 4.01 MB | 0 / 0 ms |
| 1 book | Candidate page | 1 | 554 | 2,360 / 2,752 ms | 4.93 / 4.97 MB | 58 / 64 ms |
| 13 books | Previous data read | 14 | 5,723,704 | 5,483 / 20,725 ms | 11.54 / 11.55 MB | 0 / 0 ms |
| 13 books | Candidate page | 1 | 958 | 2,095 / 2,181 ms | 5.19 / 5.19 MB | 0 / 55 ms |
| 1 memory | Previous data read | 2 | 134,667 | 1,074 / 1,135 ms | 3.97 / 4.00 MB | 0 / 0 ms |
| 1 memory | Candidate page | 3 | 135,019 | 2,258 / 3,054 ms | 7.54 / 7.68 MB | 57 / 61 ms |
| 33 memories across 2 trees | Previous data read | 3 | 4,402,407 | 13,700 / 17,292 ms | 9.58 / 9.58 MB | 0 / 0 ms |
| 33 memories across 2 trees | Candidate page | 4 | 137,090 | 4,173 / 16,217 ms | 8.37 / 8.66 MB | 53 / 63 ms |

With five samples, p95 is the largest observed value. A zero long-task reading means no task over the browser observer threshold was reported. The 13-book corpus included one media-heavy book and twelve small books. The shelf fetched no photographs or audio. The large tree fetched one selected photograph and left the remaining 32 deferred. Its p95 included a slow request during a run alongside another fictional upload test. The browser loaded and decoded a second memory’s photo and saved Calendar view with all 32 original photo values in the active tree intact. [Aggregate measurements](evidence/phase-3/results.json)

## DT-QA-08

Large browser saves exercise the same fragment transport on loopback and HTTPS. A fragment requires a staging acknowledgment. Save success requires the next workspace revision or the existing import receipt on a repeated import. A canceled or missing fragment cannot acknowledge a save. If the final response is lost after the database commits, reopen the library and compare the saved version before retrying.

The 5,644,056-byte fictional backup contained four JPEGs and a 45-second WAV. It saved, restored identical bytes, and rejected duplicate completion. A browser request aborted the second fragment of an import. The retry control showed up and the preceding revision and its files remained readable. A double click on Retry advanced the revision once. Reloading during a subsequent second fragment retained the preceding saved revision. A downloaded backup validated and re-imported with all photograph and audio bytes. The paired recipient got identical bytes after the grant and got 404 before sharing and after revocation.

The application, Auth project, Postgres and private Storage can be exercised with a loopback production build. The Vercel gateway remains a separate release gate. Authorize a protected candidate deployment and confirm the intended HTTPS origin and exact commit before repeating the large upload, interruption, refresh, retry, download, re-import, partner read and revocation there.

## DT-QA-09

The existing hosted development regression confirmed generated verification and recovery links, the verified-session gate, onboarding, login after password recovery, pairing, logout behavior and session restoration. The responsive account browser suite exercised invalid and canceled OAuth callbacks, malformed codes and an exchange missing its browser’s PKCE state. Generated links exercise callback logic without demonstrating email delivery.

The existing [staging alias](https://deartomorrow.site/) returned an anonymous 302. The audit identified that alias as serving an earlier revision. The Phase 3 candidate was not deployed or verified there. On protected staging, verify the Supabase allowlist contains the precise release origin’s `/auth/confirm` and `/auth/callback`, the Google client’s redirect points to the designated Supabase provider callback, and the consent screen permits the approved test user. Verify confirmation and recovery templates against actual received messages. Record timestamps, outcome, release SHA and redirect route. Keep mailbox credentials, message contents and tokens out of the evidence.

On 28 November 2026, Supabase Auth logged one successful signup at 14:19:15 UTC and two requests for the same address rejected by its per-address email cooldown. Resend recorded delivery. The delivered link pointed first to the Supabase verification endpoint and specified the staging origin as its return address. The Auth record was still unconfirmed when inspected. The protected Preview at `7f4e22d` blocked anonymous callback access with Vercel Authentication, and the approved Chrome session reached the application callback.

The hosted confirmation template used the default verification link. The template was updated to send the configured application callback the token hash and email verification type, and the change persisted after a dashboard reload. The signup form now prevents repeated submissions while a request is pending and shows where to look for an already dispatched confirmation message. Real confirmation from a fresh message, password recovery and Google consent remain open.

## DT-QA-16

Settings offers a password setup link to the verified address on the current account. After using the recovery link, the owner sets a password, signs in, returns to Settings and enters the password again with `DELETE`. Password-based closure retains the same confirmation. The reset action and page require a short-lived, server-signed proof bound to the recovered session. A regular authenticated session cannot use the application’s reset action alone. [Supabase supports adding a password to an OAuth account](https://supabase.com/docs/guides/auth/auth-identity-linking#how-to-add-emailpassword-sign-in-to-an-oauth-account).

The customer closure form rejected an incorrect password. It then removed the fictional owner’s Auth identity and private Storage objects when the correct password was entered. The partner’s independently owned book and media bytes remained readable. A separate confirmed account created without a password completed the same closure flow after using a generated recovery link.

Use a fresh Google-only disposable identity to verify the complete route on the release origin, including receipt of the setup message and deletion through Settings. The founder needs to authorize protected staging, provide Vercel tester access, and make an approved disposable mailbox and Google consent identity available. Supabase custom SMTP, a verified sender and the confirmation and recovery templates must be working on that project.

## Reproducing the local evidence

Build with Node 22 and the designated development configuration. Start the production build on loopback. Set `DT_TEST_SUPABASE_HOSTED_REF` to the authorized development project and supply the test browser path in `ACCOUNTS_CHROMIUM` and, if needed, the Playwright module path in `ACCOUNTS_PLAYWRIGHT`. Run `node --env-file=.env.local tests/accounts-phase3.browser.cjs`. The runner creates and removes only its own disposable identities and Storage objects. Set `PHASE3_RESULTS` for the redacted aggregate evidence. The existing account API and browser regressions remain separate runners.

## Regression coverage

- Production build, lint, standalone type checking and all 100 automated tests passed on the reconciled candidate. The suite includes disposable PostgreSQL coverage for paired-account transitions, explicit sharing, stale revisions, idempotent imports, timed visibility, revocation and private Storage. It also checks the recovery proof and rejection of unconfirmed transport acknowledgments.
- The current candidate passed the hosted development Auth and RLS integration runner with three fictional accounts. The separate browser runner passed device copy with its photograph, retention of the guest original, idempotent retry, pairing, selective sharing, photo read, revocation and disconnect.
- Edge verified the unauthenticated boundary, fixed callback origin and responsive signup, login and recovery at desktop and mobile widths. The passwordless fixture was able to deny a regular-session reset, consume a generated recovery link, reject replay of that link, sign in with the new password and close successfully through Settings.
