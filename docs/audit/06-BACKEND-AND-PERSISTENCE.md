# Backend, persistence and recovery

| Area | Storage and identity | Evidence |
|---|---|---|
| Guest Letters | Local IndexedDB shelf, document and collection preferences. Editor state can precede a confirmed write. | Draft, attachments, collection, manual seal/unseal, conflict recovery and backup import passed. |
| Guest Journey Letters | Separate local journey store, saved six-part records. | Manual route saved offline; refresh, backup, stale-tab and rollback checks passed. |
| Guest Tree | IndexedDB grove and metadata, strict document validation, deterministic illustrated placement. | Photo, edit/delete, chapter, selected leaf/calendar, refresh and backup tested up to 2,400 records. |
| Guest Books | IndexedDB local library and versioned documents containing images and voice assets; optimistic edits and a queued save. | Real browser restart preserved the guest book. Save/reopen and exported data verified. With storage unavailable the app displayed an alert, let the user read the example and recovered on reload. Empty library initialization was 18.5 ms in the recorded Studio run and 15.8 ms on recovery. |
| Personal spaces | Supabase Auth session; Postgres metadata, revisioned documents, private asset storage. | Three-account API run plus two-account browser run against the authorized development system. Book and photo retrieved by intended owner/recipient. A second browser profile independently retrieved the Letter body, Journey and Tree leaf created in the first. |
| Partner space | Pairing does not share every document. Per-item sharing, scheduled availability, revocation and disconnect are enforced on reads. | Unshared second book stayed private; revocation and disconnect changed access. Retained off-platform copies cannot be recalled. |
| Browser → cloud | Deliberate copy, migration receipt and confirmation, original browser data retained. | Copied guest book and photo and retried without duplicating it. No personal browser profile used. Other document types share infrastructure but were not individually migrated through every media case this run. |
| Examples | Built-in starting examples, route map and fixed mature landscape can render in an empty workspace. | Examples were explicitly selected for the 18-page book. The separate 100-page book was fictional imported data. |

### What can lose a keepsake

Clearing browser storage, changing browser profile/device or losing the device can remove the only guest copy. A saved-status indicator applies to the selected storage mode. A queued edit is not yet durable; the Book library debounces before persistence and flushes on visibility/page changes. Before-unload prompts and a recovery export help; abrupt termination during an in-flight save is still a window of uncertainty. The restart test deliberately verified an acknowledged write. A restore drill must include the document, the exact image/voice objects it references, ownership and per-item grants.

Library initialization loads the entire Books/Trees cloud collection in batches of four documents. Media restoration downloads scoped objects and converts them back into document data. This protects access boundaries, but cold list rendering can become proportional to total private media. Aggregate model round trips for 2/20/100-page fixtures measured 23/47/51 ms median, each with two 1.92-megapixel synthetic images. Those are local model measurements; they cannot justify a hosted library latency claim. [Model timings](evidence/book-model-profile.jsonl).

### Transfers and maintenance

A read-only query to the authorized development project found four expected migration versions; the storage bucket is private, its transfer-expiry job is active on a ten-minute schedule, and the latest run succeeded. Fragment cleanup does not prove cleanup of unreferenced permanent media, a successful media-complete disaster restore, or delivery of any letter. The app validates media and document models, scopes transfers per actor and uses revisions to reject mixed/stale results. A real hosted API account run and a localhost UI account run are different from a real transfer through Vercel's HTTPS gateway. [Hosted results](evidence/hosted-tests.md) · [Operational fields](evidence/hosted-config.json).

The highest-priority storage disclosures are the cloud photo tool and the Letter and Tree banners that still describe device storage (DT-QA-01). Suspected orphan retention and library hydration cost are separate findings (DT-QA-12 and 07).
