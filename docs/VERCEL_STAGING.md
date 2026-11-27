# Dear Tomorrow on Vercel staging

Use a protected HTTPS Preview environment on Vercel and the designated development Supabase project `ryubhqpqfwuwrtyomsmz`. The audit verified `https://deartomorrow.site` as the protected staging origin on 26 November 2026. Check the current alias and revision before any approved rehearsal. The local environment can keep its existing `http://127.0.0.1:3002` origin and Google settings. Staging and local browsers have separate session cookies. Pointing both at the same Supabase project still means they share accounts and cloud data. Use fictional content and test accounts for staging.

## Vercel setup

1. Use a single staging project connected to `3eebu/DearTomorrow`. Before any Git-connected deployment, enable **Vercel Authentication** with **All Deployments** in the project or team defaults and grant access to the intended testers. Ensure the chosen Vercel plan permits the intended use. Hobby is for noncommercial personal use. [Deployment protection](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan) · [Hobby plan](https://vercel.com/docs/plans/hobby)
2. After authorization to create the first protected preview, use a dedicated `staging` Git branch from the verified commit. Keep deploys of `main` separate from this rehearsal. Use the stable branch URL shown in Vercel and record it as the one staging origin. Keep branch-specific environment variables under **Preview**. Enable automatic exposure of system environment variables so the app can detect Vercel and its Preview environment. [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables)
3. Choose **Next.js**, repository root, Node.js **22.x**, install command `npm ci`, build command `npm run build`, and the default output directory. Leave Fluid Compute enabled. Deploy from Git so the ignored local audio and test material stay local. Verify the chunked upload and streamed response through the actual Preview gateway before accepting large cloud transfers. [Vercel builds](https://vercel.com/docs/builds) · [Function limits](https://vercel.com/docs/functions/limitations)

### Preview environment values

| Name | Exposure | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://ryubhqpqfwuwrtyomsmz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Development publishable key or legacy anon key from the project's API Keys screen |
| `SUPABASE_SECRET_KEY` | Server only, mark Sensitive | Development secret key or legacy service-role key. Used by the private media proxy, account cleanup and staged transfers |
| `DEAR_TOMORROW_APP_URL` | Server only | Exact HTTPS staging origin displayed by Vercel, with no path or query |
| `DEAR_TOMORROW_GOOGLE_SIGN_IN` | Server only | `true` when the provider is enabled and this environment is ready for sign-in tests |
| `DEAR_TOMORROW_APPLE_SIGN_IN` | Server only | `false` |

Enter real values in the Vercel dashboard for Preview. Google client credentials stay in Supabase Auth. SMTP credentials belong in Supabase custom SMTP. Keep the ignored local environment file on the development machine. A hosted build reports missing settings and rejects loopback origins and private keys accidentally placed in the public key field.

## Supabase setup

1. Verify the selected project ref is `ryubhqpqfwuwrtyomsmz`. Review [the private upload transport migration](../supabase/migrations/202611220001_cloud_transfers.sql) and run `npx supabase@3.2.0 db push --remote=ryubhqpqfwuwrtyomsmz --dry-run`. Confirm the transport migration is the only pending entry. The designated development database already had this migration on 26 November 2026. Apply a pending migration only after confirming its target and receiving approval. The migration adds a temporary, service-only table and RPCs. The existing document, sharing and Storage policies remain in place. [Supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push)
2. In **Integrations → Cron**, verify the existing SQL job named `dear-tomorrow-expire-uploads` scheduled every ten minutes (`*/10 * * * *`). Run `delete from dt_private.cloud_chunks where expires_at <= now();`. Staged rows expire after 30 minutes. Finishing or canceling removes the rows, and later uploads also sweep expired rows. The scheduled job removes expired rows during idle periods. [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart)
3. In **Authentication → URL Configuration**, add the exact staging URLs `<staging-origin>/auth/callback` and `<staging-origin>/auth/confirm`. Retain `http://127.0.0.1:3002/auth/callback` and `http://127.0.0.1:3002/auth/confirm`. Keep the existing Site URL while the development project is shared with localhost. The app supplies the precise callback for each origin. [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
4. Keep email confirmation enabled and the `dear-tomorrow-private` bucket private. With custom SMTP available, install the repository's [confirmation](../supabase/templates/confirmation.html) and [recovery](../supabase/templates/recovery.html) templates. They use the callback URL passed by the app in `.RedirectTo`, which already includes `/auth/confirm`. Test delivery and the callback on both origins. Generated links can test the application route before inbox delivery is available. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Google Cloud setup

Keep the existing Web OAuth client connected to the same Supabase project. In **Google Auth Platform → Clients**, confirm its authorized redirect URI is still `https://ryubhqpqfwuwrtyomsmz.supabase.co/auth/v1/callback`. Keep the existing local JavaScript origin. The server-side flow reaches Google through Supabase, so the staging application URL belongs in the Supabase allowlist. Under **Audience → Test users**, add the intended Google testers. Use the same browser and the same staging origin for the whole exchange so the host-only PKCE cookie is available when Google returns. [Supabase Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

## Transfer and security checks

| Path | Staging behavior |
| --- | --- |
| Book import, photos and account cloud saves | Browser file processing and project limits remain in place. A cloud request over 4 MB is split into 2.5 MB fragments before validation and one atomic workspace commit. The existing 54 MB total save ceiling and 6 MB private attachment ceiling still apply. |
| Private books and media reads | Each document is separately authorized and streamed as uncached JSON. The same owner or authorized partner projection controls which attachments can be retrieved. Readers receive the existing data format and never receive Storage credentials or reusable public media URLs. |
| Downloads and backups | The browser assembles the existing JSON backup after reading scoped documents. Verify a multi-book export with attachments and an actual local re-import. |
| Stale or interrupted edits | Workspace revisions still reject a conflicting commit. Orphaned staged fragments expire and are removed by the cleanup job. Keep the editor open or export a local backup if there is a transfer failure. |
| HTTPS sessions and errors | Cookies use `Secure`, `HttpOnly` and `SameSite=Lax`. The trusted origin controls redirect destinations, alias-host callbacks discard authentication parameters, and account and media responses are uncached. Preview responses discourage indexing, alongside Vercel access controls. |

Streaming is the Vercel-documented approach for larger responses. Test actual gateway behavior before relying on it on staging. [Vercel large request and response guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)

### Required first-preview verification

1. Check the protected branch URL denies a visitor without Vercel access. Confirm the Vercel build completes and the static artwork and walkthroughs load.
2. Complete real Google sign-in through `/auth/callback`. Confirm the session cookie flags in browser DevTools without saving its value. Check refresh, sign-out, re-login and account persistence. Test both email callbacks on the HTTPS origin and ensure the local callbacks still work.
3. With two fictional accounts, save cloud books above the 4.5 MB gateway limit and close to the existing 30 MiB project budget. Verify reopen, photo and audio playback, and account and book exports. Interrupt a transfer, retry it, and check there is a single saved revision. Check the cron job succeeds and only removes expired transfer fragments.
4. Share a book with the other fictional account. Verify their reader plays its private media, other private items stay inaccessible, and subsequent reads fail after revocation. Verify a scheduled letter hides its body and media before its opening time.
5. Record the Vercel URL and results once verified. Keep staging and its custom domain protected until a separate release decision.

The locally supplied About recording is excluded from staging. A public recording requires a separately cleared asset.

## Historical readiness check · before staging configuration

- Node 22, a clean locked npm install, Next.js 16.4.6, and the official Vercel Next.js adapter passed locally. The adapter packaged the private API and both auth callbacks. The CLI's local Windows symlink setup failed, so the adapter ran directly in an isolated fixture with fictional staging values.
- All 89 automated tests, lint, type checking and the production build passed. The transfer fixture staged a 7 MB request and reconstructed a streamed private read. Disposable PostgreSQL covered transfer isolation and expiry. Browser checks covered account routes, guest workspaces, and a real guest book backup download.
- A staging-mode loopback test passed canonical host redirects, callback parameter handling, preview noindex headers and rejection of unauthenticated and foreign-origin private requests. The local Google-enabled preview still loaded.
- The hosted development project has the three existing account migrations and the restricted private 6 MB Storage bucket. The upload migration, cron job, actual Vercel project configuration, email inbox delivery, and the live protected HTTPS acceptance checks are pending. This is the earlier readiness snapshot. The 26 November audit subsequently verified four migration versions, the private bucket, a successful cleanup job and the protected domain assignment. [Current status](PROGRESS.md)
