# Phase 2 · Contrast, typography and navigation

28 November 2026. The baseline was the approved Phase 1 commit `a147271`. The [Phase 2 implementation](https://github.com/3eebu/DearTomorrow/commit/18a512a75af53d65042dfa3e3770a4d63afd6337) was verified together with the existing remote Phase 4 work on the refinement branch. The [original audit](https://github.com/3eebu/DearTomorrow/blob/1fa2c6fbadc9d8c82136579829f83c5ec6fba14c/docs/audit/10-MASTER-ISSUE-REGISTER.md) is preserved. All hosted account checks used fictional data against the authorized development backend from a local production build.

## DT-QA-02

**Finding and correction.** Darkened muted warm foregrounds, including overlines, welcome-room descriptions, account notes, book labels and Studio help and status. Improved placeholders and the browser’s file-picker label. Letters and Journeys keep their warm palette and use a readable neutral disabled state while the library initializes. Decorative illustration colors and editable document styles remain under their existing rules.

**Acceptance.** Repeated the original eleven routes at 390 and 1440 pixels. The approved Phase 1 baseline had 36 and 33 contrast findings respectively. Afterward axe reported **zero** at either width. The 17 signed-in and Book Studio checks also returned zero contrast findings. There were 56 in those same baseline checks, counting repeated elements per state. Contrast over actual gradients and textures was checked separately against background pixels underlying text in screenshots. All 58 sampled text regions met their applicable threshold. The lowest sampled ratio for normal text was 4.56:1. Scans provide evidence for these routes and states. They do not cover arbitrary colors set by users, every creative pane, every animation frame or every visible state of every form.

| Text and background | Before | After |
|---|---:|---:|
| Home welcome overline on ivory | 3.78:1 | 6.05:1 |
| Home room description on warm paper | 3.73:1 | 5.41:1 |
| Account and editorial footer on cream | 3.52:1 | 5.96:1 |
| Books example label on tan paper | 3.19:1 | 5.25:1 |
| Studio text sample on hover | 2.68:1 | 5.25:1 |
| Studio photo help on cream | 3.80:1 | 6.03:1 |
| Archive label over actual paper gradient at 390px | 4.00:1 | 5.51:1 |
| Montage caption over actual paper gradient at 390px | — | 4.60:1 |
| Auth provider divider over actual warm panel at 390px | — | 5.59:1 |

Solid colors were compared using relative luminance from computed foregrounds and background fills. For textured surfaces the runner captures the same region with and without glyph ink and reports the minimum and fifth percentile of sampled background pixels beneath the text. The three texture rows quote the fifth percentile. Thin strokes and pseudo-content decoration can require human judgment. The fictitious newspaper body is visual decoration. Icon-only guide controls were reviewed with their existing programmatic names. [Public scan](evidence/phase-2/after-edge.json) · [Signed-in and Studio scan](evidence/phase-2/after-auth-nav.json) · [Sampled paper surfaces](evidence/phase-2/painted-surfaces.json) · [WCAG contrast criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## DT-QA-03

**Finding and correction.** The replay button’s aria-label overrode the visible “Replay montage” label. The button now takes its accessible name directly from visible text. Increased its hit area to 44px high and kept the existing visible outline. Also aligned two encountered interactive names with the visible copy button and page thumbnails.

**Acceptance.** Edge found no measured label-content mismatches on the public pages or sampled signed-in or Studio states. The runner located “Replay montage” by its exact accessible name, activated it with Enter and observed the “Montage replay 1 started” status. It checked the button’s height and exercised the existing Create dialog’s Tab containment, Escape dismissal and return focus. [Interaction evidence](evidence/phase-2/after-auth-nav.json).

## DT-QA-04

**Finding and correction.** The home, editorial and feature-library headers used different phone navigation patterns. A shared Menu now presents Home, editorial pages and all four feature destinations. The wordmark returns home. A compact version lives in the Books library, while the reader and Studio retain their own focused exit controls. The account rail remains available for sign-in, My Space, Our Space when paired, and settings. Its disclosure closes after navigation.

**Acceptance.** Tested opening, visible focus, Tab and Escape, touch-to-route, return home and collapsed state after navigation across seven representative public route/width combinations. Menu links and triggers measured at least 44px high. Signed-in Settings was reachable from the homepage. Book Studio returned to the library, and the reader returned to it at 390 and 1440 while retaining the focused reader controls. A 200% CSS enlargement check on Home, About, Books and Login showed no horizontal document overflow. All 88 original public route and viewport combinations reported no horizontal document overflow at 320, 375, 390, 768, 820, 1280, 1440 and 1920 pixels. Touch and enlargement were browser emulations. [Mobile menu](evidence/phase-2/after-mobile-menu.jpg) · [Navigation and zoom evidence](evidence/phase-2/after-auth-nav.json).

## DT-QA-20

**Root cause and correction.** The baseline stylesheet used an external Google Fonts CSS import. Inspection of the eight emitted optimized CSS chunks found neither the external import nor a usable font-face rule. The browser issued no font requests and drew Georgia and Arial. The root layout now imports explicit local font faces so Next.js packages the WOFF2 files with its stylesheet output. Typeface choices in the rest of the site were retained, including places in the book design that deliberately specify Georgia. The files are from the pinned Fontsource 5.3.0 distributions. Both families ship with their original SIL Open Font License 1.1 notices. [Playfair Display license](../../src/app/fonts/playfair-OFL.txt) · [DM Sans license](../../src/app/fonts/dm-OFL.txt).

**Acceptance.** Chromium’s actual glyph-font inspection reported Playfair Display and DM Sans 9pt at both widths. The Firefox and WebKit measurements verified loaded font faces and differences in canvas advances against explicit Georgia/Arial, then verified those advances returned to fallback values when WOFF2 requests were blocked in a fresh context. About uses two lines at 390px with the brand face and three with fallback. The home primary CTA remained 48px high in both cases. The cold About view fetched three font resources totaling 114,140 bytes. No font provider request is needed at runtime. Chromium recorded a cumulative layout shift of 0.044 on the cold 390px About load and 0.0137 at 1440px. Those were single loopback measurements. Browser results do not establish network field performance or native Safari and physical mobile behavior. [Chromium](evidence/phase-2/after-edge.json) · [Firefox](evidence/phase-2/after-firefox.json) · [WebKit](evidence/phase-2/after-webkit.json).

## Before and after

| View | 390px | 1440px |
|---|---|---|
| Home | [Before](evidence/phase-2/before-home-390.jpg) · [After](evidence/phase-2/after-home-390.jpg) | [Before](evidence/phase-2/before-home-1440.jpg) · [After](evidence/phase-2/after-home-1440.jpg) |
| Our Story | [Before](evidence/phase-2/before-about-390.jpg) · [After](evidence/phase-2/after-about-390.jpg) | [Before](evidence/phase-2/before-about-1440.jpg) · [After](evidence/phase-2/after-about-1440.jpg) |
| Books | [Before](evidence/phase-2/before-memory-books-390.jpg) · [After](evidence/phase-2/after-memory-books-390.jpg) | [Before](evidence/phase-2/before-memory-books-1440.jpg) · [After](evidence/phase-2/after-memory-books-1440.jpg) |
| Sign in | [Before](evidence/phase-2/before-login-390.jpg) · [After](evidence/phase-2/after-login-390.jpg) | [Before](evidence/phase-2/before-login-1440.jpg) · [After](evidence/phase-2/after-login-1440.jpg) |
| Book Studio | [Before](evidence/phase-2/before-studio-390.jpg) · [After](evidence/phase-2/after-studio-390.jpg) | [Before](evidence/phase-2/before-studio-1440.jpg) · [After](evidence/phase-2/after-studio-1440.jpg) |

## Checks and reproducibility

- Lint, standalone TypeScript, the Next.js production build and all 98 integrated branch automated tests passed. The existing Privacy and Service Information pages rendered and returned zero findings on these two axe rules at both sampled widths.
- The public browser runner accepts `before` or `after` followed by `edge`, `firefox` or `webkit`. It uses `AUDIT_URL`, `AUDIT_PW`, `AUDIT_EDGE` and `AUDIT_AXE`. The signed-in runner also uses the repo’s approved development integration variables and creates, verifies and removes only its own fictional account. The texture runner uses the optimized loopback origin and the same browser binary.
- Source changes are limited to branded font assets and CSS, shared header navigation, nearby control labels and the audited color rules. [Implementation and files changed](https://github.com/3eebu/DearTomorrow/commit/18a512a75af53d65042dfa3e3770a4d63afd6337). Phase 2 was tested on loopback with the refinement branch’s existing deployment exclusion.
