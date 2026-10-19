# Dear Tomorrow

An intimate, private world for letters, memory books, journeys, and the moments that connect them.

## Phase 1 preview

This repository currently contains the first interactive website slice. It includes a cinematic home page, an opening letter preview, a personalizable sample Memory Book, a branching Our Dates timeline with a matching calendar, and a six-stop Journey Letters demo. Demo changes and selected photos live only in the current browser session; nothing is uploaded or synced. The preview does not authenticate users, send letters, or unlock real scheduled content.

## Run locally

Requirements: Node.js 20.9 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Production checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

## Project guide

- Product and design decisions: `docs/`
- Supplied documents and conceptual screenshots: `docs/reference-pack/`
- Original generated editorial assets: `public/media/`
- Current delivery and remaining scope: `docs/PROGRESS.md`

Phase 1 is intentionally local-only. Do not add production credentials until the Phase 2 setup has been reviewed.
