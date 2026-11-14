# Dear Tomorrow — Codex repository instructions

This repository is the **single source of truth** for Dear Tomorrow. The canonical remote is `https://github.com/3eebu/DearTomorrow` and the default branch is `main`.

## Product and design boundaries
- Dear Tomorrow is a warm, intimate, premium website that should feel like coming home. Visuals should rely on thoughtful interaction, animation, beautiful typography, textures and code-driven ornamentation rather than stock photography or tacky decorations.
- The relationship timeline experience is called **Memory Tree**. Maintain its accessible calendar view.
- Keep existing site functionality and previously approved work; iterate rather than rebuilding the project for each request.
- Preserve mobile responsiveness, keyboard interactions and `prefers-reduced-motion`.
- Current work is Phase 1. Do not imply that account sign-in, subscriptions, scheduled delivery, persistence or offline support is implemented without actually building and testing it. Do not install paid services, deploy production, or initiate payments without authorization.

## Every Codex change — same repository, tracked in Git
1. At the start of each task, confirm the working directory is the Dear Tomorrow repository; inspect `git status --short --branch`, `git remote -v`, and `git branch --show-current`. Never create a new disconnected repo, app, or preview to replace the original.
2. Preserve all uncommitted work, including changes made by the user or another Codex session. Never reset, clean, discard, overwrite, force-push or rebase over someone's changes. Do not stage or commit unrelated changes.
3. If it is safe, incorporate the latest remote updates before editing. Where branches diverge, or a merge conflict is possible, carefully reconcile without discarding either side. If safe reconciliation is not possible, stop and report the exact conflict rather than choosing one version silently.
4. Make the **smallest coherent change** requested. Keep the existing look and working features unless asked to change them. Do not replace the entire website to fix one component.
5. Run appropriate checks after editing (at minimum `npm run typecheck`, `npm run lint`, and `npm run build` when supported). Verify responsive behavior where browser tooling is available. Report what passed, failed, or was not run — never invent test outcomes.
6. After a requested change has been implemented and checked, stage **only the files that belong to that task**, create a descriptive Git commit, and push it to the current authorized remote branch. If on a feature branch, push that branch and provide its PR/review link instead of silently changing `main`. Prefer maintaining an orderly mainline for small approved iterations.
7. If GitHub credentials, network access, branch protection or user approval prevent a push, do not report a successful sync. Preserve the commit locally and provide the exact error and the command/action needed to finish syncing.
8. Each task's final report should include: what changed; files modified; checks run and their actual results; current branch; commit SHA; confirmation whether push to GitHub succeeded; and the URL of any verified live deployment. A GitHub push is **not** proof that a preview site updated.
9. Use a single GitHub-connected deployment project (such as Vercel), once set up by the user, so each approved GitHub push can produce an updated preview. Do not assume existing ChatGPT/Codex preview URLs are auto-synced.

## Reference files
- `docs/PROGRESS.md` tracks what is built versus only planned.
- `docs/INFORMATION_PAGES.md` tracks the About and How It Works work.
- The founder's master directive is the product specification when available.
- When current requirements conflict with older copy (for example, "Our Dates" vs "Memory Tree"), the founder's latest explicit instruction wins.
