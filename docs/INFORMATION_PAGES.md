# Dear Tomorrow — About and How It Works

Two editorial, accessible information pages have been added:
- `/about` opens with the personal reason Dear Tomorrow began, then restores the original “A little place for the things that stay” introduction as the next editorial section, followed by the four product areas and current preview status.
- `/how-it-works` explains simple first steps, what can be tried in Phase 1 and what has not launched.

Design: no stock photographs or external image assets. The About hero uses a cinematic montage of 16 fictional newspaper and magazine fragments, with a separate eight-fragment mobile composition. On desktop, selected clippings cross the center seam into the ivory area; the story copy stays clear above them. Medium desktop widths use a shorter spill, and mobile stacks the story above its separate montage. All paper, grain, folds, typography and shadows are made with HTML, CSS and inline SVG. These invented editions are decorative and do not claim real press coverage.

The sequence starts when the artwork enters view, builds through staggered arrivals, and settles. A keyboard-accessible replay control, bounded desktop pointer depth and one restrained paper movement support the installation. Reduced-motion preferences show the final arrangement immediately and disable animation and parallax. The information navigation, product descriptions and preview-status sections remain in place.

Important: first-person founder text is proposed copy, not a verified account of the founder's personal history. Confirm wording with founder before public publication.

Validation for the About hero refinement, 2026-11-14:
- `pnpm run typecheck`, `pnpm run lint` and `pnpm run build` all passed; the build prerendered `/`, `/about` and `/how-it-works`.
- Inspected desktop composition at 1024px and 1200px and mobile story layout at 320px and 390px. No horizontal page overflow or clipping into story copy was found. Eight fragments render in the mobile arrangement and 16 in the desktop arrangement.
- Replayed the montage, observed its playing state and confirmed it settles with all visible papers opaque. Browser console had no errors or warnings. Reduced-motion rules remain in place; browser emulation was unavailable, so a reduced-motion render was not performed.
- Local production preview: `http://127.0.0.1:3001/about` (available while its server is running). No public deployment was created.
