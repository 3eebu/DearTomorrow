# Phase 4 privacy, recovery and attachment retention

Evidence collected 27 November 2026. All writes and removals in the drill used temporary local fixtures with fictional identities and generated media. Provider settings were read where existing access allowed it. [Operations runbook, setup and cost estimates](PHASE_4_OPERATIONS.md)

## DT-QA-10

**Isolated recovery drill passed.** The test restored a PostgreSQL data-directory snapshot into a fresh PGlite engine using the current application migrations and permissions. It separately restored a filesystem backup of the private file bytes into an empty target directory. The source database was closed when the restore began. Four documents across Books, Memory Tree, Letters and Journeys, four photo or audio references and their full bytes, owner ID, workspace revisions, partner membership and selective grants survived. The owner could read all records. The partner could read the explicitly shared book and its photograph and audio, while the scheduled letter body and audio stayed sealed. An unrelated verified account and anonymous requests could not access the documents. Direct authenticated bucket metadata reads were denied. Revocation removed the partner's future access to the shared book while the owner's read continued to succeed.

The dedicated run measured **867 ms** from opening the backup through the restored access and media checks. Fixture setup through backup capture took 3,421 ms. This small local drill used stubbed Supabase-managed Auth and Storage interfaces with real PostgreSQL application policies and separate media bytes. It did not measure hosted provisioning, provider Auth sessions, managed backup retention, network transfers, usable recovery-point age or a provider recovery time objective. [Reproducible recovery test](../../tests/phase4-recovery.test.cjs)

**Monitoring instrumentation and local test passed.** The app emits allowlisted events for failed saves, storage failures, auth service failures, expired or failed uploads, database connectivity and unfinished closure. An isolated log sink received one synthetic warning. Tests confirmed private provider error contents were discarded and that expected revision conflicts remained distinguishable from service availability failures. The live provider-level restore and actual alert receipt remain **pending external verification**. Backup availability, retention, offsite media coverage, a protected recovery target and the named recipients still require owner verification. [Monitoring and alert setup](PHASE_4_OPERATIONS.md#monitoring-and-alert-setup)

## DT-QA-11

**Draft screens are ready for review.** Privacy and Service information are accessible before registration, from the home and shared footers, and from Settings, including during an incomplete account closure. The drafts explain browser data, cloud files, partner grants and copies, service providers, export and recovery, active data cleanup and the current password-only deletion requirement. Registration continues to work as before and the draft links do not capture policy acceptance. [Privacy page source](../../src/app/privacy/page.tsx) · [Service information source](../../src/app/terms/page.tsx)

| Decision | Needed before release |
|---|---|
| Operator and support | Legal operator identity, confirmed support and privacy contact, supported requests and escalation workflow. |
| Privacy rights and jurisdictions | Qualified review of applicable rights, requests, eligibility, lawful processing grounds, data transfers and regions, cookies, logs, retention, and deletion obligations. |
| Service providers | Confirm hosting, database, mail and identity providers for the intended environment, their roles and terms, backup vendors and regions, and any analytics or monitoring integrations. |
| Retention and recovery | Approve specific periods for active records, orphaned files, backup copies and operational logs, and a procedure for honoring deletion if an older backup is restored. Agree on disclosure of actual recovery capability. |
| Service terms | Review permitted use, ownership and licensing, partner sharing expectations, age limits, dispute and governing-law terms, effective date and any acceptance flow. |
| Account closure | Define a supported path for provider-only users and finalize how interrupted cleanup is handled. DT-QA-16 remains separate. |

## DT-QA-12

| Scenario | What was observed in isolation | Hosted implications to verify |
|---|---|---|
| Interrupted large transfer | An incomplete transfer could not be read as a complete upload. PostgreSQL set a deadline 1,800 seconds after the first fragment. After the test advanced expiry, a later upload removed the expired fragment. No private object was written by staging alone. | The audited cron ran every ten minutes, so database removal can lag expiry. Provider logs, backups and actual wall-clock idle cleanup remain unmeasured. |
| Save racing a newer revision | The stale transaction failed and the uploaded file remained. The route now rejects an already stale revision before the upload, but a race after the check or an ambiguous response can still leave an object. | Storage object retention after partial or failed saves has no automatic deletion in current app code. |
| Attachment removed and document deleted | Neither operation removed its former Storage object. Both remained visible to the operator's read-only inventory after the test moved the object timestamps beyond a sample cutoff. | The cutoff proves candidate selection and establishes no hosted retention period. |
| Existing reference and recent upload | The inventory excluded draft and workspace metadata references, recent files and unrelated owners. A subsequent successful commit made the former failed-save file disappear from the candidate list. | Content hashes are reused. An upload can be active even when the existing object timestamp is old. Live removals require a verified pause and second inventory. |
| Scoped cleanup | In the drained fixture, two confirmed candidates were removed. Referenced files, the recent object and another account's file were still readable through the fixture store. | No scheduled object deletion was introduced. [Operator procedure](PHASE_4_OPERATIONS.md#private-media-reconciliation) |
| Account deletion | After the closure flag, the account was excluded from ordinary inventory. The app's owned-media cleanup removed its fixture files. Deleting its fictional Auth identity cascaded staged fragments; another account's file remained. | In-flight uploads overlapping closure and the expired retention of provider copies still need provider-level verification. Actual authentication-provider closure still requires resolution of DT-QA-16. |

No customer data was involved in the tests. The hosted application and backup settings stayed as found.

## Verification

All 98 automated tests passed, along with lint, type checking and the Next.js production build. The headless Edge run checked the registration links and draft pages at 320, 390, 820 and 1440 pixels, home and About footer links, signed-out route boundaries and the fixed authentication callback origin. The Settings links are in the authenticated page source. The browser run used an unconfigured local server, so signed-in Settings and hosted authentication still need the isolated provider rehearsal.
