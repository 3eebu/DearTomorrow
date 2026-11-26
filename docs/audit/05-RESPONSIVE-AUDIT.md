# Responsive layout and browser coverage

| Engine on Windows | Sizes | Result |
|---|---|---|
| Edge 158.0.4370.33 | 2560×1440, 1920×1080, 1440×900, 1280×800, 1024×768, 820×1180, 768×1024, 430×932, 390×844, 375×667, 320×640, 844×390 landscape | 132/132 public-route measurements returned HTTP 200. No page-wide horizontal overflow, completed broken images or page exceptions in these samples. Five canceled loopback requests. |
| Firefox 153 | 1440×900 and 390×844 | 22/22 rendered with no page-wide overflow or recorded exception; two canceled requests. |
| Playwright WebKit 26.5 | 1440×900 and 390×844 | 22/22 rendered with no page-wide overflow or completed broken images. Two page errors and twelve canceled requests. A fresh direct Journey navigation had no exception. Rapid navigation reproduced fetch errors. |
| Authenticated development browser | 1440, 820, 390, 320 | The existing two-account suite exercised account routes with fictional users and asserted no horizontal overflow. A full cross-engine signed-in matrix was not run. |
| Phone-scale editor and reader | 320×680 | Edited book reopened and turned in single-page mode. No page-wide overflow; cancellation preserved the page. Desktop pointer events at phone width do not establish thumb ergonomics. |

All width results above come from browsers on one Windows machine. Touch events were emulated in the specialist tests. Windows WebKit is not a substitute for Apple hardware. Physical keyboard occlusion, iOS safe-area behavior, dynamic toolbars, Android microphone permission UI, reader thumb reach and long-session heat remain unverified.

The login page reported a real emulated pinch scale of 2. A separate CSS 200% enlargement check reported 0px document overflow on that form. This is not system-level text scaling or a full native browser zoom review. The Create dialog retained focus through twelve Tab presses and restored it on dismissal. At 390px the raw geometry scan found 10 sub-24px controls on About and 13 on How It Works. Inline/link spacing exceptions exist: these counts prioritize review and do not by themselves establish criterion failures.

The phone landscape preserved the crown and roots within the common frame; the farthest right summit fell approximately 44px outside at 390px and 36px at 320px. The 960px source weighed 196,210 bytes against 2,268,292 bytes for the desktop master. The camera choice is defensible at phone width; do not resize individual layers to fix it. Full-bleed width did not introduce overflow.

[Edge matrix](evidence/viewport-edge.json) · [Firefox matrix](evidence/viewport-firefox.json) · [WebKit matrix](evidence/viewport-webkit.json) · [Mobile review](evidence/mobile-contact.jpg) · [320px reader](evidence/screens/book-reader-320.jpg) · [Zoom and keyboard](evidence/recovery.json).
