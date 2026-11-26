# Hosted development acceptance

Fresh run on 2026-11-26. The client under test was the production build of main on loopback. The backend was the designated hosted development Supabase project. Isolated test identities were managed by the repository's integration runners. Raw authentication URLs, sessions, account codes, personal content and environment files are excluded from this artifact.

| Runner | Output and scope |
|---|---|
| tests/accounts-supabase.cjs | Passed Supabase Auth, three concurrent fictional accounts, PostgREST, ownership policies, timed sharing and private Storage. |
| tests/accounts-supabase.browser.cjs | Passed generated confirmation and recovery link verification without sending email. Sessions, permanent IDs, pairing, selected cloud Memory Book and photo, isolation of a second book, explicit revocation, disconnect and new-password login passed. |
| Same browser runner, local migration path | Passed copying a guest book with its photo, retaining the local original and idempotent retry. |
| Additional browser lifecycle | Created a cloud Letter, Journey and planted Tree with a leaf through the real personal workspaces. A second independently authenticated browser context retrieved all three document payloads through the normal private application endpoint. Removing the first context’s cookies returned My Space to login. The fictional password owner then used the real closure form; a separate read confirmed that exact identity was gone. [Per-step results](cloud-lifecycle.json). |
| Linked CLI, explicit read-only transaction | All four expected migration versions found. Private bucket flag true. Expiry job active with a ten-minute schedule and most recent run succeeded. [Selected values](hosted-config.json). |
| Vercel CLI inspection, read-only | Apex alias points to a READY preview of staging, 8f1dce45366214c6a19f1ed617699d024f13617e; project SSO protection covers all deployments. [Deployment metadata](staging-metadata.json). |
| Anonymous HTTPS | Apex and original Vercel staging address returned 302 to Vercel authentication. The www endpoint returned 307 to the apex. |

The hosted runner creates the signup identities using generated links instead of exercising a real mailbox. It never establishes that the provider sent or delivered an email. Its password recovery does exercise the application form. HTTPS through the deployed function gateway, the candidate version behind the staging alias, and a fresh real Google login are separate checks. No deployment or configuration change was part of the audit.
