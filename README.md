# Dear Tomorrow

Dear Tomorrow is a Next.js website for private letters, books, trees and journeys. Guest libraries save in the browser. Configured development environments also support Supabase accounts and private cloud workspaces.

## Run locally

Use Node.js 22 and the checked-in npm lockfile.

```bash
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Open `http://127.0.0.1:3002`. Verify with `node --test tests/*.test.cjs`, `npm run typecheck`, `npm run lint` and `npm run build`.

See [project progress](docs/PROGRESS.md), [account setup](docs/ACCOUNTS.md) and the [Vercel staging runbook](docs/VERCEL_STAGING.md).
