# Performance and accessibility

### Fresh measurements

Edge 158 on Windows, Intel graphics and ANGLE/D3D11. The main application used an optimized local server. Single observations are not field percentiles. For the mobile-sized cold navigation probe, viewport was 390×844, HTTP cache disabled, 150 ms emulated latency, 200,000/93,750 bytes per second download/upload and 4× CPU throttling. The browser ran on the same workstation, not on a physical phone or Vercel edge. Bytes are encoded response bodies seen by the resource timing API.

| Route | DOM ready | Load | Observed LCP | JS body | Requests | Longest task |
|---|---:|---:|---:|---:|---:|---:|
| Home | 965 ms | 1,522 ms | 956 ms | 146,728 B | 25 | 119 ms |
| Memory Tree | 684 ms | 1,823 ms | 692 ms | 191,236 B | 27 | 129 ms |
| Memory Books | 644 ms | 1,878 ms | 648 ms | 207,425 B | 20 | 157 ms |

LCP can measure heading paint before a later scene finishes. Font resource bytes were zero in all three measurements; the direct browser font check is important to interpreting apparent load speed. JS heap snapshots reported ~4 MiB at this sampling point. They do not demonstrate stable long-session heap, React rerender counts, physical-device thermals or a leak. Measure retained heap after repeated open/close and tab suspension before drawing that conclusion.

A 100-page/75-object fixture reached Studio’s first profiled callback in 33.3 ms after mount. The final 102-page reader stayed within a 320px viewport. Guest tree backup selection to SVG paint measured 293 ms at 2,400 memories, 129 ms at 1,000 and 61 ms at 100. Inputs and warm-up affect small runs; the single-memory run took 112 ms. Ten reader turns and 36 scratch frames are reported separately. No frame guarantee applies at launch. [Cold loads](evidence/recovery.json) · [Studio](evidence/studio.json) · [Tree](evidence/memory-tree-run.txt) · [Animation](04-ANIMATION-AUDIT.md).

### Accessibility

- At 390px axe found 38 contrast nodes across all 11 public starting pages. Home contributed 14, Letters 6, Books 5 and the other pages 13 combined. Normal homepage prose measured 3.66:1 against a 4.5:1 target. One 9px welcome overline measured 2.97:1. The login footer measured 3.52:1. These are element instances, not 38 independent themes.
- Replay montage is the visible label. Its accessible name inserts extra words between Replay and montage. A separate speech-label rule flagged the mismatch.
- Keyboard interaction opened the creation dialog, cycled twelve Tabs inside it, closed it with Escape and restored the original button. The four destination URLs were present. The illustrated tree also moved focus between leaves, detail and calendar intentionally.
- Primary forms exposed labels and status/error text. Signup and password recovery disabled/unauthorized states have code coverage. A failed local library initialization raised an alert with actionable recovery, then a reload succeeded.
- Reduced motion was exercised in the reader physics tests, Letters, Journey, illustrated tree, watercolor and experimental renderer. Accessibility of every custom editor selection, voice control, scratch pattern and high-contrast mode needs a hands-on assistive technology session.
- A 2× pinch and separate CSS enlargement check for login completed without document overflow. Inline text links and small icon affordances require manual spacing checks. An automated contrast and geometry scan cannot establish full WCAG conformance.

[Rule and element samples](evidence/recovery.json) · [All sampled routes](evidence/viewport-edge.json) · [Storage failure screenshot](evidence/screens/book-storage-error.jpg).
