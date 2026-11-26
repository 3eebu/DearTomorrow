# Master issue register

2026-11-26. Ordered by identifier for stable references. No confirmed P0 was observed in the tested paths. P1 includes both current launch defects and release evidence that is still missing. Frozen entries are deliberate exclusions. Estimates describe the proposed refinement. [Machine-readable register](issues.json).

## DT-QA-01 · Cloud photo and workspace storage disclosures

**P1 · Confirmed defect** | /memory-books?space=mine, /letters?space=mine, /memory-tree?space=mine

The photo picker makes an incorrect device-only promise.

- **Expected.** A person should see where the image will be stored before adding it.
- **Observed.** The shared photo tool promises device-only storage even in My Space. A signed-in owner saved a book and a partner read the photo after an explicit share. The cloud Letter and Memory Tree page banners also say that records are saved on this device. Independent-session readback confirmed both were stored in the account.
- **Reproduce or verify.** Open a personal cloud book; enter Studio; choose Photographs; compare the help with the reader and the library storage notice.
- **Impact.** A customer can consent to an upload under a false impression. The tested private bucket still enforced permissions.
- **Cause or limit of diagnosis.** The tool renders one literal in both storage modes.
- **Refinement.** Use the active storage mode for the disclosure and verify it before upload and after navigation.
- **Effort and dependencies.** Small. Existing workspace scope and copy review.
- **Acceptance.** Guest and account pickers correctly describe storage; both modes and selective sharing covered in a UI check. The signed-in Letter and Tree banners match their real storage mode.
- **Evidence.** [book-studio.tsx](../../src/components/memory-books/book-studio.tsx#L283) · [06-BACKEND-AND-PERSISTENCE.md](06-BACKEND-AND-PERSISTENCE.md) · [home-studio.tsx](../../src/components/home-studio.tsx#L59) · [cloud-lifecycle.json](evidence/cloud-lifecycle.json)

## DT-QA-02 · Readable foregrounds

**P1 · Confirmed defect** | All 11 sampled public routes

Secondary instructions and body copy fail contrast at phone width.

- **Expected.** Normal-size essential text should meet 4.5:1 against its rendered surface.
- **Observed.** The 390px scan flagged 38 elements across 11 pages; homepage prose measured 3.66:1 and an overline 2.97:1.
- **Reproduce or verify.** Open the 390px home welcome section, Books introduction or login footer; inspect the computed samples.
- **Impact.** Readers with low vision can miss instructions and notices.
- **Cause or limit of diagnosis.** Muted foregrounds sit on very similar light surfaces.
- **Refinement.** Correct affected foreground/surface pairs and verify desktop, mobile, hover and disabled context separately.
- **Effort and dependencies.** Medium. Design tokens and component owners.
- **Acceptance.** No applicable contrast violations across the same 11 pages plus signed-in account and editor states; review texture-backed text manually.
- **Evidence.** [recovery.json](evidence/recovery.json) · [viewport-edge.json](evidence/viewport-edge.json)

## DT-QA-03 · Montage replay accessible name

**P2 · Confirmed defect** | /

The speech command suggested by the visible label differs from the accessible name.

- **Expected.** The accessible name should contain the displayed words in order.
- **Observed.** The button reads “Replay montage” and exposes “Replay the newspaper montage”.
- **Reproduce or verify.** Inspect the replay button at 390px and compare its text to its accessible name.
- **Impact.** Voice-control users may have difficulty activating replay by its visible name.
- **Cause or limit of diagnosis.** Custom aria-label overrides sufficient visible wording.
- **Refinement.** Align the two names.
- **Effort and dependencies.** Small. None.
- **Acceptance.** Visible text is included in the accessible name and axe label-content-name-mismatch clears.
- **Evidence.** [about-newspaper-montage.tsx](../../src/components/about-newspaper-montage.tsx) · [recovery.json](evidence/recovery.json)

## DT-QA-04 · Navigation continuity

**P2 · Design judgment** | /, /about, /memory-books, /letters, /journey-letters

Phone navigation changes conventions between neighboring experiences.

- **Expected.** A visitor should recognize the return path, account entry and main destinations.
- **Observed.** Home uses a bottom bar plus hamburger; editorial screens use small horizontal links; Books uses a return link. All sampled pages fit.
- **Reproduce or verify.** At 390px move from Home to About, Letters, Books and back; compare the top and bottom navigation.
- **Impact.** A first-time visitor repeatedly relearns navigation; protecting reader immersion still has value.
- **Cause or limit of diagnosis.** Several independent shells serve editorial, product and creative screens.
- **Refinement.** Retain an immersive reader; make entry and exit conventions legible and consistent across public landing pages.
- **Effort and dependencies.** Medium. Navigation owner and founder.
- **Acceptance.** First-time phone/keyboard users can return to the hub and locate all four features without backtracking.
- **Evidence.** [mobile-contact.jpg](evidence/mobile-contact.jpg)

## DT-QA-05 · Guest persistence messaging

**P2 · Confirmed inconsistency** | /, /letters, /memory-books

The home masthead describes a safe, unsaved demo while linked tools really save.

- **Expected.** The entry point should accurately set expectations for browser-local content.
- **Observed.** A fictional book survived closing and relaunching the browser profile; home labels the experience unsaved.
- **Reproduce or verify.** Open home; read the top strip; follow a creation action, save a guest book, restart the same profile.
- **Impact.** Users may abandon drafts or leave personal content on a shared computer.
- **Cause or limit of diagnosis.** Home, guest libraries and account libraries use separate copy.
- **Refinement.** Describe examples and device-only drafts accurately at the point of creation.
- **Effort and dependencies.** Small. Copy review with storage owner.
- **Acceptance.** No blanket unsaved claim when entry points create persistent browser data; guests can discover how to export it.
- **Evidence.** [home-studio.tsx](../../src/components/home-studio.tsx) · [recovery.json](evidence/recovery.json)

## DT-QA-06 · Landscape versus personal growth

**P2 · Design judgment** | /memory-tree

The first tree a new person sees is mature before they have planted one.

- **Expected.** A visitor should know which tree represents their records.
- **Observed.** The default landscape shows a full-grown specimen with the caption “The Memory Tree in full growth”; below it the empty state invites planting.
- **Reproduce or verify.** Open a new profile at /memory-tree; compare Landscape, Tree and the planting state.
- **Impact.** An empty grove can feel populated; people may miss the leaf selection and personal growth in Tree.
- **Cause or limit of diagnosis.** Fixed environmental illustration and data-bound illustrated tree are separate views.
- **Refinement.** Clarify the two views at the point of switching, keeping the artwork and all personal leaves intact.
- **Effort and dependencies.** Small. Product copy and view controls.
- **Acceptance.** New visitors can identify and plant their personal tree, select a leaf and return to Landscape unassisted.
- **Evidence.** [memory-tree-390.jpg](evidence/screens/memory-tree-390.jpg) · [memory-tree-run.txt](evidence/memory-tree-run.txt)

## DT-QA-07 · Media-heavy cloud libraries

**P2 · Suspected scale risk** | /memory-books?space=mine, /memory-tree?space=mine

Library initialization retrieves every full document.

- **Expected.** Listing items should not require reading and restoring every private photo.
- **Observed.** The client lists summaries, requests each full document four at a time, then validates the set. Guest initialization was fast; large remote library latency was not measured.
- **Reproduce or verify.** Inspect readCloud and loadLibrary; compare a single book with many authorized synthetic media-rich books on staged HTTPS.
- **Impact.** A growing couple may wait longer to see even the library controls; more data travels on metered links.
- **Cause or limit of diagnosis.** Full document hydration is part of the library API.
- **Refinement.** Profile bytes, latency and heap, then consider summary-first loading if the measurements warrant it.
- **Effort and dependencies.** Medium. Representative staged corpus; consistent-revision and ownership guarantees.
- **Acceptance.** Publish median/p95 for small and large libraries; opening a listing does not fetch unrelated full-resolution photos.
- **Evidence.** [cloud-client.ts](../../src/lib/accounts/cloud-client.ts#L31) · [media.ts](../../src/lib/accounts/media.ts#L67) · [studio.json](evidence/studio.json)

## DT-QA-08 · Hosted large upload and recovery

**P1 · Unverified release gate** | /api/private-space, /memory-books?space=mine

Localhost takes a different transport path from hosted HTTPS.

- **Expected.** A large real backup should round-trip through the deployed gateway; an interrupted save should leave the preceding version usable.
- **Observed.** Staged fragment and streamed read tests passed against fixtures. Loopback uses the direct POST path. The domain requires Vercel sign-in.
- **Reproduce or verify.** On authorized protected staging, use a >4.5 MB fictional book; interrupt one transfer, retry and re-import the verified export.
- **Impact.** Important photos and edits could fail at an untested platform boundary. No loss was observed.
- **Cause or limit of diagnosis.** Environment-specific gateway size limits, streaming and cleanup.
- **Refinement.** Make the protected HTTPS transfer test a release gate.
- **Effort and dependencies.** Medium. Authorized staging session, matching commit and disposable project data.
- **Acceptance.** Owner and authorized partner get expected media; interrupted transfer never confirms falsely; original or verified retry export re-imports.
- **Evidence.** [cloud-client.ts](../../src/lib/accounts/cloud-client.ts#L54) · [accounts-transport.test.cjs](../../tests/accounts-transport.test.cjs) · [VERCEL_STAGING.md](../../docs/VERCEL_STAGING.md)

## DT-QA-09 · Real mail and social sign-in on release origin

**P1 · Unverified release gate** | /signup, /forgot-password, /auth/confirm, /auth/callback

Identity testing did not establish the actual inbox and provider round trips for the candidate.

- **Expected.** Invited customers should receive and use confirmation and recovery mail, and Google should return to the intended origin.
- **Observed.** Generated verification/recovery links and new-password login passed. Google button rendered. No designated inbox or consenting fictional Google user was exercised.
- **Reproduce or verify.** Use an authorized disposable inbox and OAuth test user on the protected deployment; exercise single use, expiry, return login and reset.
- **Impact.** A correct callback can coexist with undelivered email or an invalid public origin.
- **Cause or limit of diagnosis.** Provider credentials, allowlists, SMTP and actual inbox filtering are external.
- **Refinement.** Rehearse with consent and keep Google proof separate from mail proof.
- **Effort and dependencies.** Small. Test mailbox, consent, HTTPS access.
- **Acceptance.** Evidence includes actual received messages and real return through Google; no tokens or message bodies stored.
- **Evidence.** [accounts-supabase.browser.cjs](../../tests/accounts-supabase.browser.cjs) · [ACCOUNTS.md](../../docs/ACCOUNTS.md) · [09-PRODUCTION-READINESS.md](09-PRODUCTION-READINESS.md)

## DT-QA-10 · Recovery, retention and incident response

**P1 · Unverified release gate** | Cloud workspaces and operator tooling

A production restore drill and alert delivery were not evidenced.

- **Expected.** The operator should know how to recover a missing memory and who is alerted to failed transfers.
- **Observed.** App-level backups and reimports work for fictional records. Database and private media restoration as one snapshot was not demonstrated.
- **Reproduce or verify.** Inventory configured retention and alerts; restore a disposable historical dataset into a separate recovery environment and validate a book with media.
- **Impact.** Personal keepsakes can be irreplaceable; a JSON export cannot establish operator recovery.
- **Cause or limit of diagnosis.** Operational evidence is outside the application repository.
- **Refinement.** Agree recovery objectives, run a paired database/media restore, and exercise a privacy-safe test alert.
- **Effort and dependencies.** Medium. Infrastructure owner, backup access and separate target.
- **Acceptance.** Document recovery time and restored versions; restore access control and referenced media together; named alert recipient acknowledges drill.
- **Evidence.** [06-BACKEND-AND-PERSISTENCE.md](06-BACKEND-AND-PERSISTENCE.md) · [09-PRODUCTION-READINESS.md](09-PRODUCTION-READINESS.md)

## DT-QA-11 · Customer privacy and service information

**P1 · Confirmed readiness gap** | Public footer and account creation

The audited application exposes no customer-facing privacy policy or terms route.

- **Expected.** Before public account collection customers need reviewed information on storage, sharing, recovery and deletion.
- **Observed.** Source inventory and public navigation have no such route; engineering documentation is internal.
- **Reproduce or verify.** Follow footer and signup links in a clean browser; inspect app routes.
- **Impact.** People cannot resolve basic questions about highly personal photos, letters and disposal from the product.
- **Cause or limit of diagnosis.** No approved publication or links were identified.
- **Refinement.** Obtain founder/legal review of accurate disclosures; surface approved destinations where accounts are created.
- **Effort and dependencies.** Medium. Founder/legal and actual operational practices.
- **Acceptance.** Reviewed and accessible information can be reached before signup and from the footer and Settings.
- **Evidence.** [source-inventory.json](evidence/source-inventory.json) · [01-FEATURE-INVENTORY.md](01-FEATURE-INVENTORY.md)

## DT-QA-12 · Private attachment retention after failed saves

**P2 · Suspected reliability risk** | /api/private-space

Document save and object upload span two systems.

- **Expected.** Unused private objects should have a documented and testable cleanup policy.
- **Observed.** Media extraction can upload before the document commit. Account deletion enumerates owned media. A database rollback cannot itself roll back an object upload.
- **Reproduce or verify.** Review save and failure paths; run a controlled post-upload failure with fictional files and compare object inventory across cleanup cycles.
- **Impact.** Temporary or removed files may persist longer than expected; inaccessible orphaned data is distinct from a disclosure.
- **Cause or limit of diagnosis.** Object storage and database commits are separate; fragment expiry covers transfer fragments.
- **Refinement.** Measure actual retention first and specify safe reconciliation.
- **Effort and dependencies.** Medium. Disposable bucket, operator inventory, retention decision.
- **Acceptance.** Record object lifetime for failed saves and removed attachments, prove unrelated referenced files survive cleanup.
- **Evidence.** [media.ts](../../src/lib/accounts/media.ts) · [route.ts](../../src/app/api/private-space/route.ts) · [202611220001_cloud_transfers.sql](../../supabase/migrations/202611220001_cloud_transfers.sql)

## DT-QA-13 · Browser navigation errors

**P2 · Observed diagnostic** | /letters → /journey-letters → /memory-books

WebKit raised fetch errors during fast route transitions.

- **Expected.** Leaving or entering a route should not create uncaught page errors.
- **Observed.** Two errors in the 1440px matrix. Three during a focused transition replay; none on a fresh direct journey visit. Pages rendered.
- **Reproduce or verify.** Use Playwright WebKit on Windows; visit the three routes with 200 ms intervals and record uncaught error categories.
- **Impact.** No visible outage established; an uncaught error makes real failures harder to diagnose.
- **Cause or limit of diagnosis.** Unconfirmed; a canceled navigation or prefetch is plausible.
- **Refinement.** Identify the request and owner and handle cancellation if actionable; repeat on Safari.
- **Effort and dependencies.** Small. WebKit tracing, iOS/macOS confirmation.
- **Acceptance.** Repeated transitions either produce no uncaught application exception or vendor-specific cancellation is documented with a trace.
- **Evidence.** [viewport-webkit.json](evidence/viewport-webkit.json) · [montage-and-webkit.json](evidence/montage-and-webkit.json)

## DT-QA-14 · Book turning under load

**P2 · Measured refinement** | /memory-books

Most page turns were smooth; one sampled turn missed multiple frame budgets.

- **Expected.** Rich pages should turn without conspicuous pauses under supported reading conditions.
- **Observed.** Of ten profiled reading/recording turns one had a 43 ms p95; one had four intervals above 33 ms. Scratch itself measured 6.2 ms p95 on this desktop.
- **Reproduce or verify.** Open the 18-page example with profiling, use environments and turn through the spreads. Compare against a second unrecorded run on a phone.
- **Impact.** An occasional hitch weakens the physical-book illusion. Widening the result to all hardware would be misleading.
- **Cause or limit of diagnosis.** The test includes recording/compositing; no code-level cause established.
- **Refinement.** Profile the affected spreads before changing physics or scratch rendering.
- **Effort and dependencies.** Medium. Real mobile hardware and a repeatable high-density book.
- **Acceptance.** Document mobile p95 and worst-frame pacing; ordinary turning, cancellation, audio and keyboard parity survive optimization.
- **Evidence.** [book-walkthrough.json](evidence/book-walkthrough.json) · [book-walkthrough.mp4](evidence/book-walkthrough.mp4)

## DT-QA-15 · Operational source of truth

**P2 · Confirmed documentation defect** | docs/PROGRESS.md

Current summary and historical milestones contradict the working hosted system.

- **Expected.** Support and operators need a dated source of truth for what actually works where.
- **Observed.** Progress says no live accounts or cloud uploads; hosted dev tests demonstrated both. Journey is also described as six demonstration checkpoints despite editable persisted journeys.
- **Reproduce or verify.** Compare the current/not-yet-done sections with accounts, Journey and hosted audit evidence.
- **Impact.** A maintainer can repeat work or communicate an incorrect product promise.
- **Cause or limit of diagnosis.** Historical notes and current status share the same headings.
- **Refinement.** Keep dated history, add a current environment-by-environment status.
- **Effort and dependencies.** Small. Verified staging and provider information.
- **Acceptance.** Each current statement identifies source, target and verification date.
- **Evidence.** [PROGRESS.md](../../docs/PROGRESS.md) · [ACCOUNTS.md](../../docs/ACCOUNTS.md) · [journey-letters-run.txt](evidence/journey-letters-run.txt)

## DT-QA-16 · Account closure after OAuth-only signup

**P2 · Suspected usability gap** | /settings

The closure form and server flow require a current password.

- **Expected.** Every supported account type should have a discoverable, secure path to close its account.
- **Observed.** Settings asks for a password and verifies it with signInWithPassword. A Google-only identity may never have set one; this specific journey was not exercised.
- **Reproduce or verify.** Use a consenting disposable Google-only identity; inspect Settings, recovery and closure guidance without involving a personal account.
- **Impact.** Some customers may be unable to finish the form unaided; no access-control bypass is suggested.
- **Cause or limit of diagnosis.** Deletion reauthentication is implemented for a password credential.
- **Refinement.** Verify supported recovery and provide the correct secure path for the account type.
- **Effort and dependencies.** Medium. OAuth identity and external test consent.
- **Acceptance.** A Google-only fictional user can complete a documented owner-verified closure; unrelated data survives.
- **Evidence.** [page.tsx](../../src/app/settings/page.tsx#L59) · [actions.ts](../../src/lib/accounts/actions.ts#L154)

## DT-QA-17 · Founder audio parity

**P2 · Design judgment** | /about

The locally supplied recording is omitted from clean builds.

- **Expected.** The intended edition should show its licensed audio card, or deliberately omit it.
- **Observed.** The component conditionally mounts the card; the local MP3 is ignored and excluded from deployment. The clean build has the watercolor and caption without a player.
- **Reproduce or verify.** Compare a checkout with the local recording to a fresh build without it.
- **Impact.** A founder-approved personal detail can disappear between preview and release.
- **Cause or limit of diagnosis.** Asset provisioning and rights for that file are separate from component code.
- **Refinement.** Decide what may ship and provision only an approved recording.
- **Effort and dependencies.** Small. Publishing rights and asset decision.
- **Acceptance.** Local and release editions match the documented decision; playback and reduced-motion behavior checked if present.
- **Evidence.** [about-keepsake.tsx](../../src/components/about-keepsake.tsx) · [.vercelignore](../../.vercelignore) · [about-1440.jpg](evidence/screens/about-1440.jpg)

## DT-QA-18 · Billing and new third-party delivery

**Frozen · Scope decision** | No payment routes; Letters and Journeys

Paid membership and proactive delivery are separate product commitments.

- **Expected.** A free protected preview should describe its current behavior accurately.
- **Observed.** No checkout, webhook, entitlements or active sending worker was identified. Shared timed reads are a real server-side capability.
- **Reproduce or verify.** Inspect routes, integrations and release descriptions for paid or push-delivery promises.
- **Impact.** Selling access or promising delivery now would exceed implemented capability.
- **Cause or limit of diagnosis.** No billing or push delivery system was found.
- **Refinement.** Keep both out of the release promise and out of the feature-freeze implementation.
- **Effort and dependencies.** Large if approved. Commercial and product decisions.
- **Acceptance.** No checkout or delivery claim appears without separately scoped and tested integrations.
- **Evidence.** [source-inventory.json](evidence/source-inventory.json) · [09-PRODUCTION-READINESS.md](09-PRODUCTION-READINESS.md)

## DT-QA-19 · GPU landscape replacement

**Frozen · Scope decision** | /memory-tree/experiment

The independent renderer trades hand-painted fidelity for motion and lighting.

- **Expected.** The approved painting should remain the launch baseline until a new rendering is artistically approved.
- **Observed.** Foliage, day/night and meadow move in real time; branch spacing is more regular and the crown less layered than the painting.
- **Reproduce or verify.** Compare the two landscapes at the same framing; inspect seven stage captures and daylight, sunset and night.
- **Impact.** Replacing the illustrated views would exchange proven composition and memory interaction for a visual study.
- **Cause or limit of diagnosis.** The experiment renders foliage geometry with painted background assets; specimens are illustrative.
- **Refinement.** Keep the branch separate and preserve the real illustrated tree.
- **Effort and dependencies.** Large. Separate art approval and real-device budget.
- **Acceptance.** No experimental route in the main production build; any later replacement has visual sign-off and memory interaction parity.
- **Evidence.** [painting-comparison.jpg](evidence/painting-comparison.jpg) · [growth.jpg](evidence/growth.jpg) · [experiment-run.txt](evidence/experiment-run.txt)

## DT-QA-20 · Production font delivery

**P2 · Confirmed presentation discrepancy** | /about and shared typography

The live browser uses a platform fallback for the editorial heading.

- **Expected.** An intended brand font should load consistently across platforms or the documented design should use its fallback.
- **Observed.** Main requests Playfair Display in computed CSS, but zero faces registered, zero external font requests were observed and Chromium reported Georgia drawing the heading. The source stylesheet imports Google Fonts.
- **Reproduce or verify.** Open the clean local optimized About page. Wait for document.fonts.ready, inspect the registered faces and rendered platform font. Compare with the intended design.
- **Impact.** Different operating systems can wrap and shape the headline differently; measurements with a fallback cannot validate the intended face.
- **Cause or limit of diagnosis.** The optimized styles checked here contained no usable font-face registration. The exact bundler or stylesheet cause is unconfirmed.
- **Refinement.** Decide the intended faces, inspect the emitted styles, and verify their delivery and licensing before adjusting layout.
- **Effort and dependencies.** Small to medium. Brand font decision and browser font diagnostics.
- **Acceptance.** The intended typeface is reported by a cold production browser; fallback remains readable and causes no clipped controls.
- **Evidence.** [watercolor-fonts.json](evidence/watercolor-fonts.json) · [globals.css](../../src/app/globals.css)
