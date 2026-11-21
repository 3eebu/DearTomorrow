# Accounts and private spaces

Dear Tomorrow uses Supabase Auth, PostgreSQL, and private Storage for signed-in workspaces. Guest editors use their existing IndexedDB stores. The public homepage, Our Story, How It Works, and the existing guest URLs work without a configured Supabase project.

## Start a disposable development backend

1. Use Node.js 22, install the project dependencies, and start a Docker-compatible engine. From the repository run `npx supabase start`. The checked-in configuration starts local email confirmation and recovery. The test inbox is at `http://127.0.0.1:54324`.
2. Copy `.env.example` to `.env.local`. Use `npx supabase status` to find the local URL and keys. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the URL and publishable or legacy anon key. Set `SUPABASE_SECRET_KEY` to the local secret or legacy service-role key. Keep that key on the Next.js server and out of browser code, screenshots, and Git.
3. Set `DEAR_TOMORROW_APP_URL=http://127.0.0.1:3002` and run `npm run dev -- --hostname 127.0.0.1 --port 3002`. Use that exact loopback origin for signup and emailed links. The private-space POST endpoint requires the configured origin.
4. Start with two fictional addresses. Open each account's confirmation link in its own browser profile. Set a display name, optionally save a photo in Settings, and open My Space. Use the account ID in Settings for the partner lookup.

The official Supabase SSR client stores server-managed cookies and refreshes the session in Next.js middleware. Protected pages and mutations call `auth.getUser()` and require a confirmed email. Email links exchange a token hash on the server and use a fixed callback destination. [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework&router=app) · [Local Supabase development](https://supabase.com/docs/guides/local-development)

## Identity and connection

- A trigger generates a permanent Dear Tomorrow ID from 96 random bits and retries on a unique-key collision. Internal foreign keys use the Auth UUID. The personal display name can be changed without altering either identifier. Account IDs appear separately in Settings.
- Verified users can search for one exact code at a time. Lookup returns a name and a short-lived, sender-bound match token. Limits are 12 lookups in 10 minutes and five requests in 24 hours per verified account. Declined requests have a seven-day cooling period. Settings can pause new requests.
- One database transaction accepts a pending request, inserts two membership rows, and cancels other pending requests for those people. Membership is unique per account. Transition locking and that constraint work together even if two requests arrive together.
- Sharing grants read access to one document for the current connection. Revocation deletes the grant. Disconnect removes active membership, and grants attached to that connection stop authorizing reads. The owners keep their private copies. A subsequent connection starts with its own permissions.

## Documents, media, and migration

- My Space opens the existing editors in an explicit cloud scope. The four document models use their existing validators. Supabase writes the workspace revision and modified documents in one transaction. Cross-tab conflicts preserve the newer server version and offer draft export or retry from the relevant editor.
- The browser sends the session's expected account ID for cloud requests. The server compares it to the authenticated UUID. Signed-in libraries keep data in memory, and returning to a hidden tab or restoring it checks the session before showing it. Guest libraries have a distinct data path.
- PostgreSQL gives raw document access to the verified owner. Partner reads go through a per-document permission check and, for scheduled letters, a server-time projection. Journey projections contain itinerary details, checkpoint labels, and opening times. They carry the letter and its attachment references only after the checkpoint is sealed and available. Only the authorized projection reaches the media proxy.
- Photos and supported audio use a private bucket. Files are scoped to their owner and document, named by a content hash, and served through authenticated, uncached application responses. The bucket has a restrictive policy that denies raw authenticated and anonymous access. Uploaded revisions and unreferenced files remain private until cleanup.
- First-time onboarding and My Space can read guest libraries and offer an optional import. Valid records are copied individually. Fingerprinted import receipts prevent duplicates, and an existing cloud ID is kept with its own version. Letter collections merge by name. Imported media are fetched back and the document is validated before the interface reports success. Failed or skipped imports leave their local originals available.
- Account deletion requires the current password and explicit confirmation. It marks the account as closing, ends its connection, removes private files, and then deletes the Auth record and its dependent data. If file cleanup or Auth deletion fails, the user can finish the operation from Settings.

## Hosted setup after review

Apply the migrations in `supabase/migrations` to a dedicated staging project first. Require verified email and a password length of at least 10 characters. Configure both provided Auth templates and allowlist only the app's trusted callback origin. Set `DEAR_TOMORROW_APP_URL` to the app's HTTPS origin. Configure real transactional email before inviting users. Run integration checks with fictional accounts and keep the service role restricted to the Next.js server.

The app runs on the Next.js Node runtime. Cloud document writes use a 54 MB bounded request, so choose a host and proxy with a request limit suited to existing large book and journey backups. The smaller file and model limits still apply. A host with a small request limit needs a chunked upload adapter before enabling large media libraries. [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

## Checks and release limits

- Run `node --test tests/*.test.cjs`. The account policy tests execute the actual migrations in disposable PostgreSQL with separate authenticated roles. They exercise private profiles, request transitions, one-partner enforcement, stale saves, import receipts, timed payload withholding, the private bucket boundary, and revoked access.
- Run `node tests/accounts-supabase.cjs` with `DT_TEST_SUPABASE_URL`, `DT_TEST_SUPABASE_KEY`, and `DT_TEST_SUPABASE_SECRET` on a disposable loopback Supabase project. This additionally checks real Auth sessions, API access, concurrent acceptance across clients, Storage, and release authorization. Auth email links, recovery, browser login, private media round trips, and the two-account UI walkthrough require that running stack.
- Run `node tests/accounts.browser.cjs` against the Next.js preview. Set `ACCOUNTS_PLAYWRIGHT` and `ACCOUNTS_CHROMIUM` if needed, and `ACCOUNTS_SHOTS` to capture the account forms. This checks the unauthenticated boundary without seeding a user session.
- Offline edits can remain in an open editor or be exported. Guest editors continue to support browser-local persistence. Durable offline cloud drafts and automatic resync across reloads are outside this version.
- Timed sharing makes existing content viewable through an authorized server request. The application offers no delivery notifications or end-to-end encryption. Previously retrieved or downloaded copies remain with their recipients.

The production build, lint, type checking, and 80 automated tests passed. Edge verified protected-route redirects, the fixed callback origin, and account forms at 1440, 820, 390, and 320 pixels. The guest Letters, Memory Tree, and Journey Letters browser suites passed. A separate browser check opened and turned the example Memory Book, saved an editable Studio copy, and found it again after refresh. No Supabase project, test credentials, or local container engine was available in this workspace. The full Supabase integration runner skipped, and signed-in screenshots and the pairing recording require that backend.
