# DEAR TOMORROW — DEFINITIVE CODEX MASTER BUILD DIRECTIVE

**Founder-approved product direction | Website first | Build real software | Working project brand: Dear Tomorrow**

> This file is a complete, self-contained execution brief. Read it in full before beginning. If `PRODUCT_BLUEPRINT_BACKGROUND.md` and the two `reference_images/` screenshots are present, inspect those as supplemental context. Where the older document says the brand is “Letters”, this newer prompt overrides it: the product is **Dear Tomorrow**. This prompt is the authority for scope and execution. Do not copy somebody else's visual brand or code. Do not assume the name is legally cleared for public launch: domain and trademark clearance are still pending.

## 0 — YOUR ROLE, OUR AGREEMENT, AND WHAT TO DO NOW

You are acting as a combined creative director, principal product designer, frontend engineer, backend architect, interaction/motion designer, accessibility engineer, security engineer, QA lead, and pragmatic startup technical cofounder. Own thoughtful implementation decisions. Do not ask the founder to specify routine UI components, layouts, transitions, database tables, responsive behaviors, loading states, or edge cases. Make good decisions and document them. Ask only when a decision requires real credentials, money, legal authorization, destructive changes, sensitive third-party access, or an irreversible choice.

**This is an instruction to BUILD, not merely write a product plan.** Inspect the existing repository. If it is empty, scaffold the real project. Preserve existing good work when present. Create a working, visually extraordinary, accessible, secure **website**; native iOS/Android apps are a future phase, NOT part of the current build. The website must be equally loved on a phone.

Never generate a shallow, static marketing page and report completion. The initial deliverable is a **runnable interactive vertical slice** with a cinematic homepage, truly interactive opening envelope, personalizable demo Memory Book, and growing animated Our Dates timeline + calendar. Subsequent phases turn everything into genuine stored, authorized multi-user functionality.

The standard is closer to a polished premium editorial studio or digital heirloom than a conventional product dashboard. We want people to fall in love with the first impression, then trust the functionality enough to store years of meaningful memories. Quality, performance, originality, mobile usability, security, and emotional resonance carry equal weight.

## 1 — THE PRODUCT'S HEART

**Brand:** Dear Tomorrow (wordmark may artistically display “Dear Tomorrow.”).  
**Tagline:** “Some words are worth waiting for.”  
**Secondary brand thought:** “One person. A thousand moments. A lifetime of letters.”  
**Product definition:** A private digital world for two people who choose each other. They can write letters that unlock at meaningful times, create breathtaking fully personal Memory Books, trace their relationship through an animated growing timeline, store important dates and memories, and accompany each other on journeys through scheduled letters. It is a lifelong emotional archive, not instant messaging or a social newsfeed.

A sender must feel: “I can turn the words I couldn't say at the right moment into an experience the person I love will remember.” A recipient must feel: “This is something someone made just for me.” A couple must feel: “This isn't a template; this is ours.”

**Differentiation:** timed and condition-based letters + tangible scrapbook book + organic, connected relationship timeline + journey-letter ritual + single-partner bond + tasteful limitless-feeling customization. These are **one interconnected experience**, not unrelated widgets. A milestone can reference a photo, a chapter, a letter, and a journey; clicking follows those relationships.

Inspired by emotional letter archives and commitment-centered jewelry branding, but **no copying** The Unsent Project's layouts, identities, copyrighted content, Darry Ring's trademarks, or competitors' interaction designs. Our creative expression is original.

## 2 — WHAT “PERFECT” MEANS IN PRACTICE

Never claim a product can literally be perfect or have zero missing features. Instead deliver an unusually complete, coherent experience. For each feature design all relevant states: first visit, empty, create, edit, save, share, invited, pending, accessible, locked, unlocked, expired, offline, failed, deleted/archived, permissions denied, loading, recovery, and mobile. Do not implement every aspirational feature at once; **track all requested scope and build it in verified stages**.

Non-negotiables:

1. The site genuinely works. Do not fake authentication, letter sending, or cloud persistence. Clearly distinguish a demonstration from a completed production integration.
2. Every main user object is customizable; users can give their books completely arbitrary titles and change them later.
3. Large numbers of smooth, meaningful animations throughout; cinematic and physically convincing, but no laggy controls or forced waiting.
4. Mobile is designed independently and intentionally, not a desktop shrunk down.
5. Strong privacy. A sealed letter's contents cannot be retrieved prematurely by a recipient through the API, database, HTML payload, preload request, or UI state.
6. Elegant brand tone: tender and cute in tasteful micro-details, NEVER childish, tacky, neon-pink, generic SaaS, or crowded.
7. Ethical experience: export, unpairing, deletion, privacy choices, no manipulative streaks, no data sold as emotional targeting, no automatically public intimate content.
8. Everything the user can do on a laptop must have an equivalent usable mobile web flow.

## 3 — WORLD-CLASS VISUAL IDENTITY / DESIGN SYSTEM

**Visual thesis:** a contemporary heirloom: quiet luxury stationery, archival books, intimate film photographs, vintage scrapbook details, and modern editorial space. Warm, airy, poetic, premium. Not retro overload.

**Starter palette (brand default, users personalize theirs later):**
- Paper/ivory `#F8F4ED`
- Soft parchment `#EEE0D4`
- Rose taupe `#BE9D88`
- Signature burgundy `#642F40`
- Ink `#282323`
- Warm charcoal, soft cream highlights, muted brass optional

Support beautiful light and dark themes, but the brand's signature presentation should start warm ivory + restrained wine burgundy. Use a tasteful editorial serif for titles, highly readable supporting sans, occasional carefully legible handwriting for *user content and details*; only legitimately licensed fonts/assets. Text contrast and legibility are never negotiable. Provide typography tokens, spacing tokens, colors, shadows, radius, paper materials, icon rules and animation tokens.

**Depth and art direction:** Realistically layered imagery matters. Memory Books should have perceptible cover thickness, spine, textured surfaces, stitching or embossing when appropriate, page-edge stacks, paper translucency hints, tiny page shadows, photographic frames, tape and pressed floral detail. Envelope flaps require accurate occlusion, layers, folding perspective, paper thickness and shadows. Do NOT replace the richness of an art-directed reference image with a few flat CSS rectangles, low-effort SVG line art, or icons and claim they are visually equivalent. High-end asset layers plus real DOM interactions are preferable to an enormous static screenshot. The decorative artwork may be raster/transparent WebP/AVIF; editable text/photos/controls must remain true editable elements.

**Asset plan:** Build an inventory of cover textures, paper textures, page-edge assets, floral pieces, photo frame styles, ribbons, stickers, stamps, seals, tasteful grain and decorative motifs. Use owned, licensed, or appropriately authorized assets. Never use watermarked stock art or copy the watermarked image embedded in a screenshot. If a critical premium asset is not available, build a coherent initial visual treatment and explicitly document the asset gap; do not claim photorealism from flat vector substitutes. Optimize/download locally or use authorized sources; use fallbacks for poor networks.

**Brand marks:** Create a text-first wordmark “Dear Tomorrow.”, plus a restrained emblem (optional sealed envelope, letterfold, book, or subtle interlocking paper motif). Logo animation should be short and understated. Do not hardcode a graphic so the name cannot be changed in future.

**Layout:** generous whitespace, excellent vertical rhythm, restrained rounded corners, fine borders, carefully lit shadows, no generic giant dashboard cards. Product feels like an elegant study or personal archive. Minimize top-level UI noise, but provide obvious access to features.

## 4 — AN EXCEPTIONAL OPENING EXPERIENCE / PUBLIC LANDING PAGE

The homepage must be **our showpiece**, not another template. Storyboard it as a scrollable cinematic narrative, with real compelling calls to action. On first visit:

**Scene A — the arrival:** Understated nav with wordmark, How it Works/Explore, Sign In and a signature “Create” call to action. Hero is a crafted oversized envelope/letter scene against warm textured paper, with genuine foreground/background layering. Gentle breathing/floating (optional), handwriting-like ink reveal, subtle grain. Headline: “Some words are worth waiting for.” Supporting copy explains sending letters for moments yet to come. Primary CTA “Write your first letter”; secondary “Explore the story.” No autoplay music. No endless intro that blocks access. Mobile hero is thoughtfully recomposed, not awkwardly cropped.

**Scene B — letter reveal:** As user interacts or scrolls, paper/envelope layers unfold, reveal a readable sample letter; editorial transitions show that messages can wait for exactly the right time. A short genuine interactive demo is available without an account.

**Scene C — Journey Letters:** A lyrical animated route (cities connected by traced line, floating postcard, appropriately moving plane/train icon), checkpoint envelopes appear along the journey with unlock labels. Include one short visual example of a journey with six letters. Clear statement about website's online scheduling vs future native offline functionality.

**Scene D — Memory Books:** A sumptuous book resting on a shelf or surface comes forward and opens; a full interactive sample spread shows photographs and small decorations. Visitors can try naming the book and flipping pages. Scroll should not trap them.

**Scene E — Our Dates:** Flowing thread/line becomes a branching timeline, with dates, photos, opened memory cards and a calendar toggle. Show real interaction, not a video that pretends to be interactive.

**Scene F — Our Bond / Privacy:** Two people choose to share a private space; straightforward copy about one active partner, consent, ownership, safe unpairing and privacy by default. No misleading “military-grade encryption” claims.

**Scene G — invitation to begin:** Signature CTA flows into write-a-letter or sign-in/signup, with lovely but clear transitions.

Include footer: How It Works, Support, Terms, Privacy, Contact; no fake social proof, fabricated stats or testimonials. Add semantic SEO metadata/OpenGraph, accessible reading order and performance-friendly loading.

## 5 — NAVIGATION & HOW THE EXPERIENCE FEELS

### Public routes
`/`, `/explore`, `/how-it-works`, `/login`, `/signup`, `/auth/callback`, `/invite/[token]`, `/letter/[share-token]` only if safe guest-letter viewing is implemented, `/legal/privacy`, `/legal/terms`, `/support`. A `/pricing` page only after price and billing model are real.

### Private routes
`/home`, `/create`, `/letters`, `/letters/new`, `/letters/[id]`, `/books`, `/books/new`, `/books/[id]`, `/books/[id]/edit`, `/dates`, `/dates/new`, `/dates/[id]`, `/journeys`, `/journeys/new`, `/journeys/[id]`, `/bond`, `/settings`, `/settings/personalization`, `/settings/privacy`.

### Main nav structure
`Home · Letters · Memory Books · Our Dates · Journeys` with a prominent, universal **Create** action. Couple account/our bond and settings are secondary. On a phone, accessible bottom navigation for frequent tasks, with `Create` prominent and secondary items in a More menu or sheet. Respect safe-area insets and one-handed use; no hover-exclusive commands.

### Create as a central product experience
Tap “Create” to open a polished, animated creator sheet/gallery that offers:
- **Write a Letter** (instant, scheduled, open-when, future, anniversary, goodnight, countdown, surprise)
- **Plan Journey Letters** (trip and scheduled envelope series)
- **Create a Memory Book** (new book, fully custom name/cover, chapters)
- **Add a Memory/Date** (branch/leaf milestone on timeline)
- **Start a Chapter** (existing book or new book)
- **Upload Photos/Decorations** (to library and use on book pages)
- **Prepare a Surprise** (optional later preset flow using letters/memory pages)

Users must not face a confusing blank canvas on day one; include curated starting templates with real editability. Onboarding should first gently ask whom they are writing for, not force five settings screens before someone can try an envelope. First-letter guest drafts may live locally temporarily, but must be labeled unsaved until account persistence is available.

### Personal home dashboard
Not an inbox or social feed. Greet user gently by preferred name and present their chosen theme, a centerpiece book/letter, upcoming letters, next occasion, a preview of Our Story's latest branch, and a meaningful “Continue creating” CTA. Clear empties (“Your first page is waiting”), not empty graphs. Display partner consent state honestly.

## 6 — LETTERS: THE SOUL OF THE PRODUCT

### Types and mechanics
- Normal/sealed letter (send when ready, or schedule for later)
- Journey Letters (multiple timed envelopes for travel)
- Open When letters (recipient intentionally opens based on an emotion or need; never imply mind-reading)
- Future letters (specific timestamp/month/year)
- Milestone/anniversary letters
- Goodnight/morning letters
- Countdown letters (daily series until a reunion/event)
- Surprise letters (sender schedules unknown-to-recipient moment)
- Memory letters (linked to date/book chapter)

### Real letter creator (not a fake textarea)
Offer guided simple mode and deeper customization. Select recipient, type, name/title, paper size/orientation where suitable, envelope type, paper material, ink color, typography, letter decoration, seal, scheduled availability, optional image/voice later, private notes, preview recipient perspective. Draft autosave and explicit Save/Seal/Send controls. Signature transitions: unfold paper to begin writing; press wax seal / fold envelope on send; open and slide out at release; allow skip/interrupt and always maintain accessible reading view. Do not animate existing text as it is being typed.

The library shows Draft, Scheduled, Sealed, Available, Opened, Archived; distinguish sender and receiver views. Allow search, sorting, filtering, collections, favorites/bookmarks, and links to moments/books. Provide clear confirmations, resend invitations if appropriate, and cancellation/edit behavior rules (sender may edit scheduled letters before their seal policy cutoff; record changes predictably).

### Integrity of sealed letters
Recipient cannot fetch the body before server authorization time even via network tools, Supabase clients, serialized HTML, cached hydration payloads, direct API calls, bulk exports, or preview URLs. Keep sensitive content in a separately protected table/object or use least-privilege server-side reading with DB policies. Sender can preview authorized own content. At exact scheduled timestamp (stored UTC), authorized endpoint starts permitting access. Unlock on read-time with correct time, not a cron job only. “Open When” is a separate explicit recipient action; guest links scoped/expiring. Build adversarial automated tests.

## 7 — MEMORY BOOKS: OUR VISUAL FLAGSHIP

**Reference:** `reference_images/memory_book_inspiration.png` demonstrates beloved scrapbook richness and warm analog character. It is a conceptual screenshot containing third-party imagery/watermark. Do NOT reproduce copyrighted/watermarked contents, faces, exact arrangement or marks. Derive the *creative principles*: warm vintage paper, photos, pressed flowers, writing, layered detail, tactile opened spread. Implement original book art, materials, content and functionality.

### Naming and bookshelves
Every user/couple may give a book **any title** (subject to safe content and reasonable length), edit it any time, set subtitle/dedication/cover photo/cover material/cover palette/font/spine details/gold or silver foil motif, choose books of different styles, create chapters with individual names. Multiple books and rearrange/order/rename/archive; “The Story of Us”, “Our Little Forever”, or any personal title must be supported. Beautiful animated shelf with books arranged and customizable covers/spines. Hover/tap lifts a book slightly, clicking brings it forward, gently rotates, and opens. Avoid prolonged forced choreography on repeat visits.

### Reader
- Desk/laptop: rich 3D-perspective **two-page spread** with distinct sheet stacking, spine/gutter, believable paper turn edge and responsive shadows.
- Tablet: adaptive dual/single pages depending on width and preference.
- Phone: **single full-width readable page** with touch swipe and visible Next/Previous buttons, always legible; no tiny dual page image.
- Page turn by drag/swipe and by buttons/keyboard; meaningful spring + physical easing, correct z-order, interruptible mid-gesture, accessible fallback. Book title, chapter navigation, bookmark, page numbers, chapter table of contents, zoom/read-mode and image full screen. Use real layered DOM, transforms or carefully chosen 3D techniques; prefer performance and text accessibility over an all-canvas flattening.

### Customization/editor — an actual creation tool
**Both modes:** thoughtful, editable beautiful templates, and a powerful **freeform scrapbook studio**. Everything is movable and adjustable with intuitive controls. Add actual images (with safe upload), polaroid frames, photos, cropped photos, captions, headlines, note blocks, handwriting, stickers, dried flowers, pressed petals, ticket stubs, tape, ribbons, stamps, borders, scrapbook paper, textured backgrounds, little drawings/icons, dates, links to memories/letters. Let users edit color, opacity, size, rotation, position, z-index, typography, text spacing, photo shape/crop/filter, layering, alignment, snapping, duplication, lock/unlock items, grouping when feasible, keyboard nudge, undo/redo, autosave, page reorder, add/remove pages, restore/version history. No flattening away editable content. Use page document JSON schemas and private assets. Sanitize user text and validate data.

Desktop editor: left library / canvas / right properties or another thoughtful arrangement; responsive controls. Phone editor: canvas with one page, tap-select, drag/pinch when appropriate, bottom toolbar and focused edit sheets. Mobile users can meaningfully place and edit content; do not make mobile read-only. Use responsive *page-coordinate model* with consistent geometry when returning to desktop; never randomly reposition page elements based on viewport.

Both partners may add memories; permissions matter. In v1, robust optimistic versioning/conflict detection or single-editor leases rather than silently overwriting each other's edits. Proper autosave states (Saving/Saved/Retry). Private assets scoped to bond; optimized thumbnails and originals; progressive photo loading. Lazy-render adjacent pages only; do not mount hundreds of pages, oversized effects or huge original photos at once.

### Delightful extensions (not first-phase blockers)
Personalizable bookshelf, multiple themed volumes; bookmarks/ribbons; mini audio memory; handwritten note mode; print-ready keepsake export, eventual printed book orders; anniversary replay; decorative seasonal packs. Track roadmap separately.

## 8 — OUR DATES: AN ORGANIC, BRANCHING LIVING STORY

**Reference:** `reference_images/our_dates_timeline_inspiration.png` shows the approved clear **Timeline / Calendar** toggle, vertically ordered emotional milestones and comfortable simplicity. Evolve it with far richer artistry and organic connecting paths/branches, without adding clutter. Do not replicate black backgrounds as a requirement; default should follow our ivory-burgundy theme while user can customize.

### Data and interactions
Milestone properties: any name, date (time optional), time zone where time matters, description/story, category, branch/parent milestone, icon, colors, photos, optional location (voluntarily entered), relevant book pages, letters, journeys, visibility/ownership, mood if explicitly authored. Quick-add controls and rich details. Suggested first moments: first hello, first date, first photograph, first trip, birthday, anniversary, moving cities, inside joke, graduation. Everything editable and removable with safe confirmation.

### Timeline visual
A main organic burgundy path/trunk grows along scroll, branches extend left and right toward individual dates; closely related moments sprout sub-branches like leaves. Milestone icons bloom with scale/opacity, photographs drift/settle into tiny frames, captions elegantly reveal. A selected milestone expands smoothly into a beautifully arranged memory card or overlay with its images, story and links. Hover accents on desktop, touch-first expansions on mobile. Include a “jump to year” navigation, collapse/expand branches, search, filter category, show important dates, chronological ordering and year/month grouping. Optional zoom/clustering for huge archives; maintain continuity while browsing years.

Use responsive SVG path geometry (viewBox/ResizeObserver or other robust measurements) and GSAP/ScrollTrigger path-drawing only where it adds value; coordinate systems must not break on resize, on font load or dynamic item heights. Do not create an unreadable spaghetti graph after 100 events. Virtualize/cluster/collapse older dense content. Respect reduced-motion and quickly changing user focus.

### Calendar visual
Month/year calendar toggle based on EXACTLY the same underlying milestone data. Day indicators, quick previews, beautiful event drawer, deep links, add a date, upcoming countdowns with correct international dates/time zones. Calendar has keyboard and screen reader semantics and supports different week starts/locales eventually. Timeline and calendar changes must save and remain in sync.

### Interconnections
From milestone -> Memory Book page/chapter, letter, journey, and associated photo. From book -> original milestone. From journey -> destination/trip moments. Link items through stable IDs and enforce security rules across both partners.

### Mobile treatment
Single elegant vertical organic trunk with compact alternating branch cards where space allows; otherwise logical linear layout. Tap expands bottom sheet/dialog with photos and links. No horizontal overflow or mandatory pinch. Accessible large click targets and controls for year jumps.

## 9 — JOURNEY LETTERS: OUR SIGNATURE RITUAL

Sender chooses travel mode (plane/train/car/bus/other), departure city, destination city, journey date, departure **local date/time plus IANA timezone**, arrival local date/time plus timezone. Adds 2–12 or more configurable checkpoints (by local timestamp or percentage of planned interval), names each moment (“Before takeoff”, “Somewhere above the clouds”, “Almost there”, “Welcome”), and writes/seals one letter per checkpoint. Allow six-letter sequence demonstration in public demo. Display route art, dotted path, tasteful moving plane/train on progress, envelopes along the way, next unlock countdown and accurate schedule previews for sender and receiver. Support overnight trips, daylight-saving edges, different cities, crossing the date line, cancellations/edits before sealed delivery, and predictable timezone display.

Critical honesty: **web release time** = scheduled online content access; offline airplane-mode letters cannot be guaranteed unlocked or notified as intended in a normal website. No unsupported live takeoff tracking or position tracking. A future **native app** may predownload encrypted letters and schedule local notifications, but cannot claim tamper-proof early lock when offline. Do not promise features until actually validated. For website, provide an elegant “Internet needed to unlock” explanation when necessary.

## 10 — THE BOND / COMMITMENT SYSTEM

Two people share a private world, **at most one active bond per account**, inspired by dedication to one person rather than a one-time public pledge. Invitation with an expiring, signed/random token; accept/decline, pending/canceled/revoked/expired, both members agree before shared access. Include beautiful pairing ceremony with optional custom bond name, date, and first letter; not mandatory. Meaningful account states for single users and pending invitations. Avoid forcing anyone to create an account simply to see public marketing or a safe demo.

Users should not be permanently trapped. Support unpair/leave, revocation, clear individual vs shared contributions and retention, archive, exports, account deletion, abusive partner controls where needed. Never leak one partner's memories through stale links, direct object IDs, old session access or a public profile. A person may create a new bond after unpairing under defined rules; preserve legal/ethical agency.

### Account sign-in
Real **Supabase Auth** email OTP or verified email, Google OAuth, Apple login (when appropriate provider developer configurations/keys exist). Keep auth callback, reset/recovery flow, session expiration, account linking, redirect validation, CSRF-aware routing, secure cookie handling. Never show mock OAuth buttons as though they actually sign in; if provider credentials are missing, gracefully disable/configure with accurate setup instructions. Guests may play with sample books/timeline and draft locally, but should know what is not saved. Limited guest letter invitation only if safe token-based access and explicit permissions are implemented.

### Shared worlds and permissions
Couple can set their space's name, aesthetic theme, cover aesthetic, private emblem, background and color tokens. Separate user settings for text size, animations, email notices, language and sound. Both can contribute to books/timeline by consent; revision handling, ownership and export rules are explicit. No public listing of partner's personal info.

## 11 — CUSTOMIZATION STUDIO: NOT JUST CHANGING A COLOR

Create a persistent, enjoyable **Customization Studio**. Levels:
1. Personal preference: light/dark, text scale, motion, sound, notification choice, personal name/profile.
2. Shared space: name, accent palette, background textures, wallpaper/theme, type family, decorative motif.
3. Book: name, subtitle, cover, spine, texture, embossing, chapters, internal styles.
4. Page: layout, paper, photo frames, inserts, editable freeform layered items.
5. Letter: envelope shape, colors, seal, stationery, fonts, paper and delivery animation preference.
6. Timeline: branch style/color, milestone icons, photo card treatment, filters and expansion behavior.
7. Journey: route style, transport icon, postcard accents, letter checkpoint style.

Provide curated high-quality presets for speed, plus advanced custom editing. Use typed versioned theme schemas/design tokens; safe fallbacks, contrast tests, theme migrations and predictable previews. Save everything to the user's permitted data scope. Avoid promising literally unlimited uploads/storage for a fixed free plan; allow creative freedom with transparent fair storage constraints.

## 12 — ANIMATION BIBLE: “EVERYTHING FEELS ALIVE”

Core motion rules: tactile, physical, springy where appropriate, calm, sophisticated, responsive to user intent. No gimmicky scroll hijacking, ambient audio autoplay, distracting infinite particle spam, forced 5-second intros, bouncing typography over meaningful text, animations that keep scrolling from working, or effects that turn mid-range phones into slideshows.

**Mandatory signature animations** (named components/utilities, test them on touch):
- `HeroEnvelope` — layered envelope lifts and opens, flap folds accurately, card emerges; cinematic on scroll / tap.
- `InkReveal` — concise title/ink flourish reveal; readable immediately with reduced motion.
- `SealLetter` — paper folds, envelope flap shuts, wax seal presses with subtle compression and shine.
- `OpenLetter` — realistic unfold with shadows, smooth readable letter reveal.
- `BookFromShelf` — book lifts, eases to reader, turns in perspective.
- `CoverOpen` — believable material hardcover and spine hinge.
- `PageTurn` — swipe/drag turn with occlusion, curvature/shading and no flicker.
- `PhotoPlace` — framed photo gently rotates/drops/settles on page when placed.
- `StickerPeel` — tiny reversible response when editing scrapbook elements.
- `TimelineDraw` — main line follows scroll; no jump on resize.
- `BranchGrow` — child paths extend naturally to a milestone.
- `MilestoneBloom` — photo/card/icon appears when relevant and expands on click.
- `JourneyTrace` — route progressively traces and checkpoint envelopes reveal.
- `ModalMorph` — elements transition coherently to detail views and back.
- `NavTransition` — restrained smooth switching without jarring blank frames.
- Optional later `StoryReplay` — deliberate playback of chosen private memories.

Approximate animation timings for refinement, not rigid rules: micro 100–180ms; card/overlay 180–380ms; envelope opening 500–900ms; page turn 350–750ms, responsive to touch velocity. Choreography must be interruptible; user controls take priority. Respect `prefers-reduced-motion` and an in-product motion setting; reduced motion preserves context without path-drawing/3D flourishes. Ensure browser back button, focus and screen-reader updates work. Keep layout transforms and heavy visual effects from conflicting.

**Libraries:** Next.js + TypeScript + Tailwind; Motion for React for components, gestures and view changes; GSAP/ScrollTrigger specifically for complex scroll path choreography; CSS 3D for physical layers, SVG for organic branches; selective additional libraries only when tested and justified. Avoid React-level rerender on every animation frame. Three.js/WebGL only if proven necessary and adaptive for performance—not automatically.

**Performance discipline:** Aim for 60fps on ordinary modern phones, adapt to higher refresh rates, minimize expensive per-frame filters; transform/opacity first; limit DOM layers and blurred full-screen backdrops, load decorative assets only when needed. Aim for p75 mobile Core Web Vitals LCP <=2.5s, INP <=200ms, CLS <=0.1 when measurable. Test on realistically throttled devices and report findings.

## 13 — MOBILE WEB IS A FIRST-CLASS PRODUCT

Test widths **320, 360, 390, 430, 768, 1024 and 1440 px** at minimum. iPhone Safari and Android Chrome, portrait and landscape where sensible; desktop browser too. Touch targets ~44 px, safe area, keyboard resizing, orientation, notches, zoom, screen readers, accessible input controls; no horizontal overflow. Submenus must be usable without hover. Touch interactions cannot conflict with vertical page scrolling. Never simply hide complex features on phone.

**Phone-specific compositions:** hero envelope fits without cropping significant content; bottom navigation; full-screen letter composing with fixed-safe actions; Memory Book single readable page; scrapbook editor with transform handles and bottom properties sheets, not a microscopic desktop canvas; timeline collapses to an elegant vertical story; journey checkpoint cards stack; invitation/auth is fast and reassuring. Run device emulation plus real device smoke tests where available. Use responsive media quality and a reduced effects mode for low-power devices.

## 14 — PRODUCTION-MINDED TECHNICAL ARCHITECTURE

Recommended baseline, verify current stable APIs before installing:
- Next.js App Router, TypeScript, React, Tailwind CSS, server components where practical and client islands for rich motion.
- Supabase Auth, PostgreSQL, private Storage with SQL migrations, explicit constraints, RLS policies, narrow grants, and secure server helpers.
- Motion for React; GSAP ScrollTrigger only for justified scroll effects.
- A robust touch/drag system for scrapbook editing, with predictable persistent document coordinates; choose a stable appropriate library if needed and explain why.
- Zod or equivalent shared schema validation, typed services, consistent errors.
- Vitest or comparable unit/component tests, Playwright E2E, RLS/database policy integration tests, axe-based accessibility checks, basic performance audits. Choose maintained compatible package versions.
- Responsive image formats/Next Image, optimized private uploads, upload validation and virus/malware scanning where feasible/operationally appropriate.
- Deployment target Vercel or equivalent, Supabase project configuration, preview environments, environment templates and CI. Founder must authorize any paid setup or production secrets.

### Suggested project organization
`src/app/(public)/...`, `src/app/(auth)/...`, `src/app/(private)/...`, `src/components/brand`, `src/components/motion`, `src/components/letters`, `src/components/books`, `src/components/timeline`, `src/components/journeys`, `src/components/create`, `src/lib/auth`, `src/lib/db`, `src/lib/security`, `src/lib/themes`, `src/lib/time`, `src/lib/media`, `src/domain/...`, `src/styles`, `supabase/migrations`, `tests/unit`, `tests/integration`, `tests/e2e`, `docs/`, `public/assets/`.

### Suggested domain entities
`profiles`, `bonds`, `bond_memberships`, `bond_invitations`, `letters` (metadata), `letter_contents` (stricter access), `letter_recipients_or_release_rules`, `letter_events`, `journeys`, `journey_checkpoints`, `books`, `book_chapters`, `book_pages`, `page_revisions`, `media_assets`, `milestones`, `milestone_links`, `theme_profiles`, `notification_preferences`, `audit_events` (without private message bodies), `guest_invites` if supported. Use sensible uniqueness, cascading/deletion restrictions, timestamp tracking, idempotent writes, index by bond/time/foreign key, public-safe ID handling, and migrations.

Book pages: structured, versioned JSON/objects; don't embed giant base64 photos in page JSON. Uploaded media in private object storage, access checked. Couples have appropriate shared read/write policies, but writing partner A's data as partner B must not be silently authorized. Use atomic revision checks for page saves. Large dates lists must page/virtualize. Scheduled releases compare UTC instants with authoritative server clock, never browser clock alone.

### Non-negotiable security/reliability
- No public-read default database tables containing relationship data.
- RLS, grants, endpoint authorization, input validation, secure sessions, anti-CSRF as appropriate, rate limiting, anti-spam, safe auth redirects, media type+size checks, virus scanning strategy, HTML/Rich-text XSS sanitization, signed media links, CSP/security headers where practical.
- Token expiry/revocation, credential handling, server-only secrets, secure backups, observability WITHOUT recording sensitive content, right to export/delete, account recovery, support/report block, user-friendly error messages.
- Abuse cases: guessed ID, stale invite, stolen preview URL, ex-partner access after unpair, recipient pre-unlock direct query, shared media URL leakage, time-zone manipulation, multi-tab edits, retry/double-click/idempotency.
- Never call the platform end-to-end encrypted without actually implementing and validating the required cryptographic architecture.
- No personal letter bodies/photos in product analytics, logs, AI prompts or public previews without explicit consent.
- If later adding public anonymous story discovery, require deliberate separate publishing, moderation, report/takedown, no private-to-public automatic copying.

## 15 — KEY USER FLOWS TO IMPLEMENT AND TEST

**Visitor -> first letter:** Hero CTA -> select letter kind -> compose sample/draft -> preview envelope -> sign up via email/Google/Apple -> save -> send invite / connect to partner -> recipient sees only authorized content when eligible -> writer sees actual status. Support guest demo without pretending unsaved drafts are secure storage.

**Two people pair:** A creates account -> invites B with expiry -> B accepts with correct identity -> single active bond created -> both can see shared permitted items -> B can leave/unpair -> archived visibility follows policy -> A cannot continue reading revoked personal assets if policy says no.

**Book creation:** Create -> book naming (“anything”) -> cover choice -> chapter creation -> template/freeform editor -> add and position actual photos/notes/stickers -> autosave -> reload page on laptop AND phone -> book appearance preserved -> swipe page turn -> links to timeline date.

**Dates creation:** Create -> choose milestone date/title -> add photo/story and branch parent -> timeline path and branch grow -> calendar reflects event -> clicking opens story -> clicking linked book page lands at right page -> editing event updates both views.

**Trip creation:** Choose cities, date, timezone-correct departure and arrival -> choose 6 checkpoints -> compose 6 letters -> preview times from sender/recipient locale -> send -> checkpoints unlock online at correct server times -> signed-in receiver cannot fetch others early; display offline limitations.

**Retention:** On a meaningful anniversary optionally (user-controlled) rediscover memories from previous year; do not pressure people into emotional “streaks”.

## 16 — BUSINESS/LAUNCH DESIGN, WITHOUT DISTRACTING FROM PRODUCT

Primary initial audience: long-distance couples, people who travel, sentimental scrapbooking/diary creators, anniversary gift givers, couples studying or living in different places. Primary acquisition loop is natural: one person creates -> invites the person they care about -> pair creates another memory -> voluntarily shares a safe visual example (never private letter body by default). Brand style should be recognizable when a non-private demo or gift image is shared. SEO content can include occasion-letter inspiration and carefully designed public landing pages, without indexing private information.

**Product-led core metrics:** visitor->first draft, first draft->account, invitation acceptance, first exchanged letter, first created memory, 7/30-day returning pairs, % couples opening letters, 30-day retained active bonds, time to first meaningful success, editor completion, bugs per release, storage/hosting cost per active pair. Measure aggregates only, not private contents.

**Monetization later:** Free basic letters, one bond and enough storage to experience the value; optional per-couple premium for advanced personalization, theme packs, more storage/media, exports/printed memory books. Gift products and printed keepsakes are natural later. Never paywall opening existing received letters or lock a personal archive hostage. No real payment integrations until legal eligibility, tax setup, target countries and provider suitability for a Pakistan-based founder have been checked and authorized. Avoid fake buy buttons.

**Localization later:** architecture handles Unicode/RTL, IANA time zones, accessible dates, international phones, translated strings, regional calendars; English initial copy but do not hardcode assumptions that break other languages/cultures.

**Brand legal risk:** “Dear Tomorrow” is founder-selected but similar letter/future-message brands exist. Do not present trademark/domain availability as confirmed. Founder must separately evaluate clearance before public release. Do not buy domains or subscribe to services without permission.

## 17 — PHASED ENGINEERING DELIVERY — STRICT ORDER

### Phase 0: Audit and decisions (brief, then IMPLEMENT)
Inspect repo, dependencies, existing work, supplied screenshots, specs. Choose compatible versions, create docs (`PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `MOTION_SYSTEM.md`, `ROUTES.md`, `DATA_MODEL.md`, `QA_MATRIX.md`, `DECISIONS.md`, `PROGRESS.md`, `.env.example`, README). Do not spend entire run writing documents. Create working app and start Phase 1 in the same work session.

### Phase 1: Cinematic interactive website prototype — **START HERE NOW**
Scaffold Next.js with theme foundation. Build original homepage scenes, desktop and phone navigation, opening letter demo, Creator action sheet, editable **named demo Memory Book with customizable cover** and genuinely interactive page turn, organic branching **Our Dates timeline and matching calendar**, and beautiful journey checkpoint demonstration. Use fictional locally defined seed content and label “Preview” / “Demo” anywhere content is not yet persistent. Buttons visible in this prototype must work, link somewhere meaningful, or be accurately disabled with explanation. No fake auth successes. Make screenshot-worthy desktop and phone layouts and ensure animations really execute (not dead mock CSS). Save demo customization in local component state (optional local storage if appropriate) without claiming cloud sync. Provide at least one end-to-end visitor flow from hero -> Explore -> Create -> book/timeline -> back.

**Phase 1 mandatory design signoff:** show/report visual screenshots at 390px and 1440px; book cover looks like a material object; page-turn has visible depth; timeline line visibly animates and branches; user can change book name and cover and see effects immediately; timeline/calendar switches and clicking events works; feature section animations play on both phone/desktop; page loads and scrolls without horizontal overflow or jank; no watermarked artwork, lorem ipsum, empty stock-template panels, and no slow unskippable intro. If screenshot/browser capability unavailable, explicitly say so rather than claiming inspection.

### Phase 2: Real accounts + bond
Implement verified email flow and configured Google/Apple OAuth, auth callbacks, profile setup, partner invites, 1-active-bond DB enforcement, acceptance, expiry/revocation, robust session and RLS tests. Credentials not present? Provide exact setup steps and keep non-credential flows working.

### Phase 3: Real letters
Persist drafts, sender/recipient authorization, sealed letter body protection, online unlocks, actual write/send/open/reply flows (reply optional), letter library/filter/search, and proper release-time E2E tests. First real proof: **two test users exchange one scheduled letter that is truly inaccessible before release**.

### Phase 4: The full customizable Memory Book Studio
Persist books and chapters, versioned page schemas, uploaded media, templates, drag/rotate/crop/layer items, touch editor, autosave, undo/redo, collaboration conflict safety, bookshelf, page-turn reader and exports strategy. Preserve visual quality while switching from demo to persistence; do not regress page-turn effects.

### Phase 5: Our Dates living story
Persist milestone graph, tree relationships, linked media/book pages/letters, timeline geometry and branching animation, calendar sync, mobile detail sheet, grouping/large datasets tests and deep links.

### Phase 6: Journey Letters
Persist journeys/checkpoints, IANA timezone calculations, complete sender/recipient flows, online timed access, cancellations, route animation and release tests. No false offline or live tracking claims.

### Phase 7: Closed beta hardening and launch readiness
Security audit, permission tests, rate limits, accessibility, performance, cross-browser and real-phone verification, recovery/export/deletion, support/privacy legal placeholder review by founder, privacy-safe analytics, monitoring, CI, backup/restore runbook, preview/prod deployment process, bug triage, founder signoff. Public launch only after risk review, legal brand checks and developer credential configuration.

**Out of initial scope:** native mobile app; guaranteed offline trip letter access; full multi-user real-time scrapbook cursor collaboration; live flight tracking; large public Unsent-like archive; physical fulfillment; live billing. Architect for these extensions without pretending they've shipped.

## 18 — MEASURABLE “DONE” REQUIREMENTS / TEST MATRIX

A task is not DONE because the screen looks approximately correct. Every shipped vertical slice must meet:

**Function:** click/tap actions work, saved state survives refresh and account relogin when real persistence is in scope, errors and permissions are correct, state transitions are genuine.

**Visual:** compositional hierarchy, rich depth and realistic asset treatment where required, coherent brand system, polished typography, no clipping/text overflows, no generic default dashboards, letter/book/timeline animations demonstrably work.

**Mobile:** 320/360/390/430 widths checked, safe areas, all feature flows usable via touch; book content readable, editor usable, pages switch, timeline expands, dialogs scroll, mobile keyboard never covers primary actions.

**Accessibility:** keyboard nav and visible focus, semantic headings, form labels, screen reader statuses, contrast, reduced motion, zoom, non-motion alternative, alt text for meaningful media.

**Security:** authorized access only, negative access tests for every bond/media/letter endpoint, schedule-timestamp protection, token expiry/revoke, no client-held private secrets, safe rich text and upload controls.

**Quality:** typecheck, lint, unit and E2E checks, build succeeds, no broken links, no obvious console errors. Profile Core Web Vitals and real interaction FPS where tooling exists; report actual measurements rather than inventing pass results.

Create and maintain a matrix of test scenarios covering: no account, account without bond, invite pending, bond active, sealed letter before time, after time, revoked bond, empty book, 100-page book, dense 200-milestone timeline, international trip across DST/date line, offline network, mobile touch, reduced motion, keyboard-only, slow connection. Mark PASSED / FAILED / NOT RUN honestly.

## 19 — HOW YOU (CODEX) MUST WORK AND REPORT

1. **Read before coding:** this master directive, background blueprint if present, both screenshot references (as inspiration only), and repo state.
2. Briefly state the immediate scope and structure. Then **write and run code**. Don't request more product details unless a decision is genuinely blocking or costly.
3. Start with **Phase 1**. Do not attempt 7 phases in a single giant unstable commit. Implement the smallest exceptional interactive slice, then progress through verified milestones.
4. Create/update `docs/PROGRESS.md` and a checklist of all core features. Preserve unfinished scope instead of silently dropping it.
5. Build reusable components and actual integrations; no placeholder buttons that appear functional; keep secret keys out of source control.
6. Use version control with reviewable, descriptive incremental commits where allowed; preserve good existing work.
7. **After each build batch:** explain what was built, main files changed, exact preview/run commands, demo vs persisted features, tests actually run and results, mobile/desktop review findings, missing visual assets and blockers, and the next precise task. Attach screenshots if supported.
8. If a feature needs credentials or account authorization, show steps for founder; don't claim integrations are active until they are.
9. Do not run destructive DB operations, bill for services, publish publicly, or purchase a domain without founder approval.
10. Treat this brand and user relationship data with care. The end goal is a genuinely beautiful, trustworthy global business, not a motion-tech demo.

## 20 — EXACT FIRST IMPLEMENTATION REQUEST

**START IMPLEMENTING NOW.**

- Check the repo and scaffold the web project if missing.
- Establish the Dear Tomorrow design tokens, wordmark, responsive navigation and animation utilities.
- Build the opening cinematic homepage with at least four genuinely animated story scenes and a working “Create” action.
- Build a clickable interactive envelope/letter preview with meaningful motion.
- Build a visually rich sample Memory Book with editable book title and cover palette, a believable opening/page-turn animation, and working next/previous on laptop and touch phone.
- Build a branching Our Dates timeline with scroll path growth, expanding moment cards, a real Timeline/Calendar switch, and a working add-example-milestone interaction (local demo state is fine and honestly labeled).
- Build a polished Journey Letters teaser with six scheduled checkpoint envelope cards and a moving route motif.
- Ensure keyboard, mobile responsive and reduced-motion alternatives work.
- Run the project, lint/typecheck/build/tests as feasible and inspect responsive layouts with screenshots if tooling allows.
- Report real implementation evidence. Then STOP at a review checkpoint before replacing prototype data with live accounts/production DB unless the founder explicitly asks you to continue.

**Acceptance goal:** a visitor can land on Dear Tomorrow on a phone, be emotionally drawn into the site, open a sample letter, personalize a book, turn a page, and explore or add a timeline milestone without a single dead control. On desktop it should feel like an editorial, textured, art-directed interactive experience. Once approved, move to real authentication and persistence in Phase 2.

---

**End of directive.** Do not answer with only an implementation proposal. Implement the first verified slice in the repository.
