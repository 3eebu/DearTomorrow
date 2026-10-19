# Motion system

## Principles

Motion is tactile, quiet, physically motivated, interruptible, and never blocks reading or navigation. Animate transforms and opacity before expensive filters. Scroll continues normally; there is no forced intro or autoplay sound.

## Phase 1 signatures

- Hero envelope: paper rises out of the envelope with perspective and an accessible skip/open control.
- Ink reveal: heading resolves quickly and remains readable with reduced motion.
- Book: cover lift and a reversible 3D page turn; buttons are always available on touch and keyboard.
- Timeline: SVG trunk and branch strokes draw when their section enters view; events bloom in place.
- Journey: a decorative route trace moves between six fixed checkpoints. It does not indicate actual travel.
- Creator/modal: focus remains available, Escape closes, and background scroll is restored.

## Timing

Micro 100–180ms; cards and sheets 180–380ms; envelope 500–800ms; page turn 380–600ms. All are shortened or removed under `prefers-reduced-motion`.

## Phase 2+

Real delivery, playback, and drag gestures require interruptibility, an accessible static reading state, and explicit testing on touch devices. Avoid adding a scroll animation library until path choreography is measurably insufficient with CSS/SVG and IntersectionObserver.
