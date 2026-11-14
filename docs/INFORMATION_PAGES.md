# Dear Tomorrow — About and How It Works

Two editorial, accessible information pages have been added:
- `/about` explains the founding vision in first person (draft voice for founder approval), the four product areas and the current preview status.
- `/how-it-works` explains simple first steps, what can be tried in Phase 1 and what has not launched.

Design: no stock photographs or external image assets. The About hero uses a cinematic montage of 16 fictional newspaper and magazine fragments, with a separate eight-fragment mobile composition. All paper, grain, folds, typography and shadows are made with HTML, CSS and inline SVG. These invented editions are decorative and do not claim real press coverage.

The sequence starts when the artwork enters view, builds through staggered arrivals, and settles. A keyboard-accessible replay control, bounded desktop pointer depth and one restrained paper movement support the installation. Reduced-motion preferences show the final arrangement immediately and disable animation and parallax. The existing left-hand introduction, navigation and About sections below the hero are preserved.

Important: first-person founder text is proposed copy, not a verified account of the founder's personal history. Confirm wording with founder before public publication.

Validation for the montage, 2026-11-14:
- Type checking (`tsc --noEmit`), lint (`next lint`) and the production build (`next build`) passed using the installed Node/Next.js tools, equivalent to the package scripts. Existing unescaped JSX apostrophes in About, How It Works and the homepage were encoded as entities; displayed copy and behavior are unchanged.
- Inspected the production preview at 320, 390, 760, 1024 and 1440px. No horizontal page overflow or headline overhang remained; captions stay clear of the paper stack. Eight fragments render in the mobile arrangement and 16 in the desktop arrangement.
- Observed the opening sequence and settled composition. Keyboard replay restarts the sequence and retains button focus. Pointer depth updates and resets on leave. No browser console errors were reported in the final preview.
- Twelve read-only static assertions checked reduced-motion CSS/code paths and preserved page scope. Reduced-motion browser emulation was unavailable in the connected browser, so an emulated reduced-motion render was not performed.
- Local production preview: `http://127.0.0.1:3000/about`, available while its server is running. No public deployment was created.
