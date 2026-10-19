# Data model and persistence boundary

Phase 1 has no backend or production data model. Fictional sample moments, book settings, page index, and an optional selected image are held in React state for the open browser session. No content is sent to a server; reload resets demo state.

## Later domain boundaries

The master spec proposes profiles, one-active-bond memberships and invitations, letter metadata separated from protected letter contents, journeys and checkpoints, books/chapters/pages with versioned JSON, private media, milestones and links, theme preferences, and privacy-safe audit events. These need explicit migrations, constraints, RLS/grants, service authorization, tests, and export/unpair/delete decisions before use.

## Security invariants for later phases

- No public-read relationship data.
- A recipient cannot fetch a sealed body before server time authorizes release.
- Media is private and scoped to authorized bond members; signed URLs are short lived.
- An unaccepted invitation grants no shared access; revoked relationships lose access predictably.
- Page saves use validated versioned documents and conflict checks.
- Never describe the product as end-to-end encrypted unless that architecture is implemented and reviewed.
