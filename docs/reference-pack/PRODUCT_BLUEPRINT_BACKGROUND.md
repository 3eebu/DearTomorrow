# THE LETTERS PLATFORM
## Founder's Master Blueprint - Product, Design, Engineering and Business
**Version:** 1.0 | **Prepared:** 19 October 2026  
**Working name:** Letters (placeholder - not a final brand or domain)  
**Product:** Private relationship platform, web first, mobile-first design, native apps later.

> **Product thesis:** One person. A thousand moments. A lifetime of letters.  
> Two people can create an entirely personalized world of letters, books, dates, journeys and memories. The signature experience is a sealed letter that becomes meaningful at exactly the right moment.

**Important:** This is a build-ready plan, not a guarantee of product-market fit or profits. Features, schedules, costs and pricing assumptions require user testing and implementation validation.

---

# 01. North Star, positioning and principles

### The experience we are building
- Not another chat app, social feed or photo storage product.
- A private, expressive home for two people to preserve the story of their relationship.
- The platform's appearance is luxurious, emotionally resonant, delicate and richly animated.
- Most meaningful objects are interactive: envelopes unfold, book pages turn, memory cards expand, and timeline branches grow.
- Everything feels personal. Couples can name books, create multiple books, change covers and layout, decorate pages, select paper, ink, typography and themes, and choose how memories are organized.
- The experience must be compelling on a phone, not merely functional after a desktop-first design is squeezed onto a small screen.

### Product promises
1. **Intimacy:** Private by default. Sharing is deliberate, never automatic.
2. **Ownership:** Both partners control what they contribute; export and deletion are accessible.
3. **Emotional timing:** The right words arrive at the right moment.
4. **Self-expression:** Build a personal experience rather than live in a fixed template.
5. **Beautiful performance:** Cinematic feeling without sluggish interfaces.
6. **Trust:** No deceptive locks, surprise monetization or artificial relationship streak pressure.
7. **Longevity:** A couple should want to revisit the archive five years later.

### Initial ideal users
- Long-distance couples, particularly around travel, studies, deployments and visits.
- Young couples who enjoy documenting memories and customizing scrapbooks.
- Couples preparing for special dates, anniversaries and milestones.
- People who prefer thoughtful writing to instant messages.

### Differentiation
Existing relationship apps have daily prompts, sealed letters or calendars. Our differentiation must be the *combined* experience of a customizable living Memory Book, branching relationship timeline, scheduled journey-letter rituals, a carefully designed one-partner bond and physical-feeling animations. Competitors may copy isolated features, so brand, content quality, reliability and community trust matter at least as much as code.

# 02. Product scope and priority tiers

### P0: Must exist before public beta
- Responsive public landing page with brand story and examples.
- Accessible sign-up/sign-in through email (OTP or verified email), Google and Apple when provider credentials are configured.
- User profiles; one active partner bond per user; invitations, acceptance and rejection.
- Private letter editor with autosaved drafts, title, content, sender, recipient, type, scheduled unlocking.
- Secure online delivery: the recipient cannot fetch a sealed letter's body before its release time.
- Letter library with sent, received, sealed, opened, scheduled and drafted states.
- Journey planner: date, origin, destination, departure and arrival local times/time zones, multiple letters per journey, timeline preview.
- Memory Book: create, freely name/rename, select cover/theme, chapters, edit pages, insert/rearrange photos/text/decoration, save, read and swipe through pages.
- Our Dates: add milestones, classify as events, branches and sub-events; interactive timeline and calendar; link milestones to letters and book pages.
- Clear privacy permissions, report/help channel, account export and deletion workflows.
- Analytics limited to product usage events without capturing private letter content.
- Real mobile web experience and reduced-motion mode.

### P1: After functional beta / before broader scale
- More scrapbook components (tape, stamps, pressed flowers, ribbons, stickers, handwriting).
- Voice notes, photo collections, collaborative edits with conflict handling.
- Curated thematic templates and layout packs.
- Optional public, independently consented, moderated excerpts.
- Saved occasions, anniversary reminders, reminders to prepare for travel.
- Book printing experiment and high-quality export to PDF.
- Richer timeline zoom and memory cluster visualization.
- Localizations, currencies and cultural date settings.

### P2: Distinctive future product expansion
- Native iOS/Android app with verified offline preloading and local scheduled reminders.
- Journey playback, voluntary trip check-in, animated map atlas.
- Cinematic 'Relive Our Story' playback.
- Giftable physical editions, printed QR-coded envelopes, personalized keepsakes.
- Multi-volume bookshelf and collaborative book creation.
- Optional partner-created themes and a curated theme marketplace (only after moderation, licensing and payment setup).

**Scope discipline:** P0 is already substantial. Build and release it in vertical slices. The first playable slice is two people exchanging one real scheduled letter.

# 03. Experience architecture and navigation

## Public website
- `/` - immersive landing page: hero, showcase of Letters / Book / Timeline / Journeys, proof of privacy, how it works, FAQ, create first letter.
- `/explore` - interactive demos with fictional content; no real user content by default.
- `/how-it-works` - how the bond, sending, scheduling and receiving work.
- `/pricing` - once there is real billing and a validated plan.
- `/login`, `/signup`, `/auth/callback` - real authentication flows.
- `/invite/[token]` - guarded partner invitation and preview experience.
- `/letter/[share-token]` - optional narrowly scoped guest access to a *single* letter, with expiry and consent; never unrestricted archive access.
- `/legal/privacy`, `/legal/terms`, `/support` - practical trust pages.

## Private application
- `/home` - welcome and personally meaningful upcoming moments, not a distracting feed.
- `/letters` - private collection; accessible filtering and search on authorized content.
- `/letters/new` - letter writer and creation steps.
- `/letters/[id]` - letter reader and unlock state.
- `/books` - bookshelf, create/rename and manage volumes.
- `/books/[id]` - immersive book reader.
- `/books/[id]/edit` - scrapbook editor with tools and autosave.
- `/dates` - timeline with switchable calendar mode.
- `/dates/[id]` - moment detail, images, linked letters and books.
- `/journeys` - list of trips and their letter schedules.
- `/journeys/new`, `/journeys/[id]` - journey planning and preview.
- `/bond` - invite, partner settings, permissions, consent and unlinking.
- `/settings` - theme preferences, auth, export, delete, privacy, motion, time zone and notifications.

## Navigation design
- Desktop: premium sidebar or restrained top navigation; the selected module feels like entering a room in the couple's world.
- Tablet: compact navigation with content still spacious enough for book editing.
- Mobile: a simple bottom bar (Home, Letters, Book, Dates, More); journeys from Home and More, or via a context-specific shortcut. Avoid forcing six tiny tabs.
- Always provide direct routes and a clear back action. Motion should reinforce where users are, not hide navigation.
- First use: guided empty states. A meaningful first action (write, invite, create book) beats a dashboard of zero counters.

# 04. Interaction-by-interaction design specification

## 04A. Onboarding and bond creation
1. Visitor sees the brand story and can explore a fictional sample book/letter without signing in.
2. 'Write your first letter' opens a preview composer and permits a local draft (with clear indication it is not backed up yet).
3. Save or send leads to email, Google or Apple sign-in.
4. First-time user chooses: 'I have an invitation' or 'Create our space'.
5. User invites *one* partner with an expiring one-use invitation; recipient verifies access and explicitly accepts.
6. Partners can choose their shared world name, book starter theme and optional meaningful start date.
7. Successful activation occurs when the bond exists and at least one letter is exchanged or a memory is created.

**Bond rule:** At most one active bond per person, but not a punitive irreversible lifetime lock. People must be able to leave a bond, remove access, export their own content, and understand what shared materials remain. Previous relationships must never bleed into a new one. Protect against coercive invitations and repeated harassment.

## 04B. Letters
**Types:** Just Because, Open When, Future, Anniversary, Birthday, Journey, Goodnight, Milestone, Surprise, Apology/Reconciliation (optional). All types share an underlying letter object with different scheduling rules.

**Composer flow:** Choose type -> choose paper/layout -> write -> optional photo/voice (later) -> preview -> set recipient/unlock rule -> seal -> success confirmation. Save draft at any point. Never silently publish or send.

**Opening scene:** Envelope slightly responds to tap; recipient sees release status; seal lifts when eligible; flap unfolds; letter emerges; content remains readable and selectable; the closing animation never prevents using Back or screen reader navigation. Support replay/skip.

**Release rules:** `immediate`, `at_timestamp`, `open_when_user_chooses`, and `journey_checkpoint`. Use UTC for actual instants and store a separate IANA time zone and original civil time for human-readable display. Server authorizes retrieval at/after release, not CSS obfuscation.

**Status transitions:** `draft -> scheduled/ready -> released -> opened` with cancel/unsend constraints documented clearly. Define what edits after send can do (recommend read-only after release; before release allow rescheduling with history and notification).

## 04C. Journey Letters - signature feature
**Creator inputs:** recipient, trip mode (flight/train/car/bus/other), departure city, destination city, departure local date/time and zone, arrival local date/time and zone, 2-12 checkpoints, custom checkpoint labels, optional actual flight identifier in a future connected implementation.

**Timeline:** creator selects points on a timeline, e.g. 09:00, 10:30, 12:00, 13:30, 15:00 and 18:00 for a fictional nine-hour interval. For intercontinental trips, normalize to UTC before comparing, since local clock times can be misleading.

**Sender view:** create all letters, preview sequence, edit times, see what the recipient can access, schedule or cancel while safely allowed.

**Recipient view:** elegant journey card, countdown, first available envelope, timeline of sealed letters, optional 'prepare for offline' capability when native app exists.

**Offline truthfulness:** A web-only MVP should not promise guaranteed offline notifications or strict offline unlocking. The native app can predownload encrypted/local data and schedule local notifications; local clocks may be changed and OS policies can delay notifications. An offline device cannot reliably detect actual takeoff or route progress. Call offline milestones *scheduled*, not live flight-aware, unless flight data is truly integrated. Test airplane mode, device restart, time-zone changes, DST boundaries and notification permissions on physical phones.

## 04D. Memory Books - flagship visual feature
**Create:** user chooses freely editable book name, subtitle, cover material/color, spine treatment, typography, orientation and initial chapter.
**Bookshelf:** multiple independently named books over time; sort, favorite, duplicate permitted templates, archive, and gentle 'take a book off shelf' transition.
**Reader:** subtle 3D hardcover opening, desktop two-page spreads, tablet adaptive spread, mobile single-page swipe with always-accessible page navigation. Retain selection, text zoom and keyboard access; disable heavy shadows in low-power mode.
**Editor:** both template mode (fast, lovely) and freeform mode (powerful). Templates should always remain editable. Drag/drop or touch-place photos, text, stickers, flowers, tickets, handwritten annotations, frames, ribbons and backgrounds; reorder layers, duplicate items, rotate, scale, crop, align, snap, undo/redo, autosave and restore versions. Support photos, image captions and alt text.
**Collaboration:** both members may contribute to a shared book according to permissions; show a lightweight 'partner editing' state and avoid silent overwrites. For first version, use temporary page editing locks or conflict detection, not an expensive real-time multi-cursor engine.
**Data portability:** export book pages and media. A printed book can be a paid feature after demand is established.

**Performance:** Store pages as structured data plus separate original/optimized media. Render only current/adjacent spreads; lazy load heavy images; don't render hundreds of 3D pages at once. This is a core architecture requirement.

## 04E. Our Dates - living branching story
**Dual modes:** Branching Timeline and Calendar, always sharing the same underlying milestone data.
**Milestones:** title, date/time optional, IANA timezone, memory category, story text, photos, linked letters, linked book pages, place optional, permission, year grouping, parent milestone and branch type.
**Timeline:** one elegant central path, branches to significant events, smaller leaves/cards for related moments, progressive line drawing as the user scrolls, expand/collapse branches, year-jump navigation, zoom-level clustering and search. The path can feel organic, but must not turn into an indecipherable tangled graph.
**Calendar:** month/year navigation; gentle day indicators for important dates; a tap reveals a milestone card and can deep link into the story or the Memory Book.
**Mobile:** timeline becomes a vertical trunk with alternating compact cards; offscreen branches collapse; tap expands details in a bottom sheet; preserve vertical scroll and do not require pinch zoom.
**Connections:** choosing 'First Date' can open the specific book chapter and relevant letters. The story is one connected content graph, not four disconnected widgets.

## 04F. Optional future features
- 'Open when...' letter library with recipient-selected conditions.
- On-this-day resurfacing with opt-in controls, avoiding insensitive surprise reminders.
- Relationship replay: chronological cinematic story with selectable private moments and instant skip.
- Travel Memory Atlas with user-entered locations; never covertly track anyone.
- Print products and physical sealed letter gifting.
- Multilingual paper motifs, typography and templates without cultural stereotypes.

# 05. Customization engine: power with guardrails

**Customization is a core product pillar, not a cosmetic settings page.**

### Levels
1. Global profile preferences: light/dark, default accent color, text sizing, reduced motion, sound preference.
2. Shared world: couple name, cover art, palette, visual motif and background.
3. Individual books: freely named, independently themed, chapter titles, covers/spines and formatting.
4. Pages: per-page background, layout, media, frames, stamps, elements and interactions.
5. Letters: stationery, ink color, legible font choice, seal style, envelope styling and delivery reveal.
6. Timeline: branching style, event icon, colors, card themes, visible details; keep accessible contrasts.

### Engineering design
- Define a versioned theme token schema; don't save arbitrary CSS from end users.
- Represent page content as a typed JSON scene graph: `elementId`, `type`, `x`, `y`, `width`, `height`, `rotation`, `zIndex`, `content`, `style`, `assetId`.
- Use normalized page coordinates (0..1) or a virtual-canvas coordinate system with responsive scaling rather than absolute desktop pixels as the only source of truth.
- Provide mobile-safe zones and text reflow options. Text must never be clipped when viewed on smaller phones.
- Design interaction primitives for pointer, touch and keyboard: select, move, scale, rotate, align, multi-select, undo, redo and autosave.
- Media have size limits, MIME checks, server-side validation and optimized derived assets; never trust uploaded filenames.
- Allow users to reset a customization without losing letters or memories. Ship aesthetically strong starting themes.
- Build a version number and migration path for saved page documents from day one.

### Customization acceptance criteria
- Renaming a book instantly updates cover, shelf, title and navigation; persists after reload and on other signed-in devices.
- A book stays readable at 320px-wide phone screens and at desktop widths.
- No photo/sticker is lost through save, undo/redo or page turn.
- The partner sees the same saved layout, with correct permissions.
- A user can swap themes without erasing custom page content.

# 06. Motion system and animation direction

**Visual mood:** heirloom stationery, premium editorial design, inviting warmth, expressive but restrained. Working palette: warm ivory `#F8F4ED`, burgundy `#642F40`, rose-taupe `#BE9D88`, parchment `#EEE0D4`, ink `#282323`; final colors remain customizable and subject to accessibility contrast testing.

### Named signature animations
- `HeroEnvelope`: one beautiful envelope rotates imperceptibly, seal lifts, letter appears as the main promise is introduced.
- `SealLetter`: press, subtle deformation, embossed seal lock-in and quiet completion feedback.
- `RevealLetter`: flap release, letter slides, perspective flattens into accessible reading view.
- `BookFromShelf`: book lifts, moves toward center, opens; transitions to two-page/single-page reader.
- `PageTurn`: pointer/touch-controlled page turn with a convincing bend, light shadow and a clear fast fallback.
- `PhotoDrop`: image floats into a frame, tiny settle motion, no violent bounce.
- `TimelineDraw`: path length progressively reveals as scroll position advances; branches grow at milestones.
- `MilestoneBloom`: node appears, nearby photo/card expands into a readable detail.
- `JourneyTrace`: dotted path/vehicle moves across a static route illustration only; not a claim about actual current position.
- `StoryReplay`: handpicked scenes flow between dates, photos and letters, with pause/skip.

### Implementation preferences
- Motion for React: state-driven interactions, layout morphs, entry/exit, touch and gestures.
- GSAP + ScrollTrigger: editorial scroll sequences, path drawing and hero choreography, in isolated components to avoid conflicting animations.
- Native CSS transitions for tiny interactions; SVG for branches/routes; CSS 3D only where well supported. Use WebGL/Canvas sparingly and only after profiling.
- A central motion token system for duration, easing, spring behavior and reduced-motion fallbacks.
- Use transforms/opacity where possible; no uncontrolled long-running continuous GPU effects; lazy-initialize below-the-fold motion.

### Proposed durations (tune in real user testing)
- Tap/hover feedback: 90-180ms.
- Card reveal/navigation transition: 180-400ms.
- Envelope opening: 500-900ms, skip immediately available.
- Page turn: 350-750ms dependent on drag velocity, interruptible.
- Scroll choreography: bound to scroll instead of pausing reading; avoid mandatory animations longer than 1s.

### Performance contract
- Target smooth animation under realistic mid-tier Android device conditions, not only a fast gaming laptop.
- Core Web Vitals targets at 75th percentile: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1, measured separately for mobile and desktop.
- Respect `prefers-reduced-motion`; preserve semantic information in the static version.
- Avoid forced smooth scrolling on touch; maintain normal scroll restoration and accessible focus.
- Every visual interaction must have an instant or simplified fallback on weak devices.

# 07. Mobile-first design contract

| Area | Desktop | Phone | Non-negotiable |
|---|---|---|---|
| Navigation | top/side rail | bottom navigation / More | clear route and back behavior |
| Letters | center-column reader | full-width readable paper | text selection, zoom, accessibility |
| Book reader | 2 facing pages | 1 page, swipe/tap | no microscopic scaled-down spread |
| Book editor | side panels + canvas | bottom-sheet tools + canvas | gestures, undo, autosave |
| Timeline | rich branching tree | vertical grouped branches | same memories, readable nodes |
| Dates | multi-column month view | tap-friendly calendar | readable at 320px |
| Journey | route + letter cards | stacked timeline cards | local/UTC time correctness |
| Account | full dialogs | one-column flows | secure OAuth handoff |

**Test matrix:** iOS Safari (small and large iPhones), Android Chrome (low/mid-tier phone), tablets in portrait/landscape, desktop Chrome/Firefox/Edge/Safari where supported, reduced motion, 200% text zoom, screen reader, keyboard navigation, touch with no hover. Test variable networks and background/foreground transitions. Use Playwright for web E2E with real-device smoke tests.

# 08. Technical architecture

### Recommended stack, with reasons
- **Web:** Next.js App Router + TypeScript for full-stack React routes and strong ecosystem.
- **UI styling:** Tailwind CSS + custom semantic tokens, component library built for this brand.
- **Motion:** Motion for React; GSAP ScrollTrigger for a few scroll-dependent hero/timeline sequences.
- **Auth:** Supabase Auth for email, Google and Apple; session handling integrated with server-rendered Next.js routes.
- **Data:** Supabase PostgreSQL with explicit migrations, grants, constraints and row-level security policies.
- **Files:** private object storage with signed short-lived media URLs, image processing/optimization and quotas.
- **Jobs:** idempotent scheduled workers/queues for release notifications, lifecycle processing and email; avoid assuming a frontend timer is a scheduling service.
- **Email:** a transactional email provider for confirmation, invitations and alerts with verified DNS domain.
- **Hosting:** managed web host/CDN initially; expand based on actual traffic, cost and data residency needs.
- **Future native:** React Native + Expo, reusing shared validation/types, server API and some styling concepts rather than assuming entire web UI is reusable.
- **Observability:** error monitoring, privacy-safe analytics, traces, alerting, backups and deployment rollback.

### Repository structure
```
/apps/web                 # public and signed-in website
/apps/mobile              # added at native-app phase
/packages/domain          # typed shared rules, schemas, time logic
/packages/theme           # design tokens and theme schemas
/packages/motion          # reusable animation primitives
/packages/ui-web          # branded accessible web components
/packages/supabase-types  # generated database types
/supabase/migrations      # versioned database schema
/supabase/tests           # policy and database-level tests
/docs                    # architecture, decision logs, QA, design specs
```

Do not over-engineer a monorepo at the cost of shipping the first vertical slice; the structure may start simpler, but the boundaries should be explicit.

### Initial data entities
- `profiles(user_id, display_name, timezone, avatar, preferences, created_at)`.
- `bonds(id, title, status, started_at, created_by)`.
- `bond_memberships(bond_id, user_id, role, joined_at, left_at)` with a database-enforced one-active-bond-per-user invariant.
- `bond_invitations(id, bond_id, invitee_hint, token_hash, expires_at, accepted_at, revoked_at)`.
- `letters(id, bond_id, author_id, recipient_id, title, content, category, state, created_at, release_at_utc, time_zone, opened_at)`; use separate revision/audit data where necessary.
- `journeys(id, bond_id, created_by, origin, destination, mode, depart_at_utc, arrive_at_utc, origin_tz, destination_tz, status)`.
- `journey_checkpoints(id, journey_id, release_at_utc, label, sort_order, letter_id)`.
- `books(id, bond_id, title, subtitle, cover_theme, ordering, state, created_at)`.
- `book_chapters(id, book_id, title, position)`, `book_pages(id, chapter_id, position, page_json, revision)`.
- `media_assets(id, owner_id, bond_id, storage_path, mime_type, bytes, visibility, created_at)`.
- `milestones(id, bond_id, title, event_date, timezone, parent_id, type, detail, branch_style, visibility)`.
- `milestone_links(milestone_id, entity_type, entity_id)`.
- `notification_settings`, `device_tokens` (future), `audit_events`, `billing_entitlements` (future).

### Key permission rules
- Only active members of a bond can query its private objects, unless ownership/export rules explicitly extend access after dissolution.
- Only the recipient can read a delivered letter, and only once eligibility checks pass; sender can always preview their own writing. Database or server RPC gates release, not only UI states.
- An unaccepted invitation creates no shared access.
- Media URLs must not reveal the rest of a private bucket; do not embed permanent public media URLs.
- A user can only edit what their role permits, even if they call APIs directly.
- For shared memories after a breakup, document provenance and retention; don't silently transfer or expose personal materials.
- Restrict, log and review any administrative access; the service operator is not equivalent to zero-knowledge encryption.

### Security, trust and safety checklist
- Database constraints + RLS + appropriate grants on every exposed table; test negative cases.
- Sanitized rich text; restrict HTML; CSP, CSRF protections where relevant and secure sessions.
- Invite token hash at rest, expiry, single-use and throttling; prevent enumeration.
- Abuse protection, rate limiting, CAPTCHA when necessary, verified email for sensitive actions.
- Encryption in transit and at rest; avoid claiming end-to-end encryption unless independently implemented and audited.
- Malware/content checks and media moderation where appropriate; minimize access to personal data.
- User control over AI features and whether intimate content is ever processed by AI. Default: no AI on private letters.
- Clear export/delete functions, privacy policy, retention windows, breach processes and lawful request handling.
- No public profile discoverability without active opt-in; optional publication always separate from private bond consent.

# 09. Engineering acceptance criteria and tests

### Minimum working integration demo
Two test accounts sign in using real configured authentication -> Account A invites B -> B accepts -> A writes and schedules a private letter -> B cannot retrieve contents before release -> B can read it afterward -> B creates a named book -> B adds a memory/page -> A sees it according to permissions -> both can navigate the related timeline and calendar on a phone.

### Functional test cases
1. Authentication: valid email OTP, Google and Apple, OAuth cancellation, logout, expired sessions, identity linking and duplicate-email edge cases.
2. Bonds: double invites, decline, expiry, one-active-bond enforcement, unlink, delete, race conditions.
3. Letters: save draft, clock skew, offline transitions, release in different time zones, scheduled edits, notification failures.
4. Journey: travel across date line, DST, 9am-6pm local times in distinct time zones, sender preview, crossing to next day.
5. Books: rename, reload, mobile sync, layer saving, crop, undo/redo, large assets, concurrent editing, exports.
6. Timeline: nested branches, month/year navigation, duplicate dates, missing times, 1,000+ milestones with clustering.
7. Permissions: user C attempting to read another bond's book, private URL guess, forged asset requests.
8. Resilience: spotty connection, browser back, refresh mid-editor, quota errors, failed uploads, request retry.
9. Accessibility: meaningful keyboard flow, touch targets, contrast, reduced-motion, alt text and screen-reader labels.
10. Performance: route transition profile, long book profile, iOS mobile actual devices, lazy-loading verification.

### Production release gates
- All P0 flows functional with backend persisted data; no simulated account/letter success UI.
- No unresolved high-severity auth, data leakage or payment vulnerability.
- Valid backup-restore rehearsal and deployment rollback.
- Usability study with at least 10-20 representative couples, including long-distance users.
- Clear support/contact, reporting, privacy and incident procedures.
- Mobile acceptance pass on supported real devices.

# 10. Business model and monetization

## What people are really paying for
People are not paying for generic text messages. They may pay for self-expression, beautiful lasting collections, extraordinary gifts, convenience and preservation of their memories. Pricing must support the service without exploiting emotional vulnerability.

## Recommended initial model
**Free for two people to begin:** one partner bond, letters, a starter Memory Book with meaningful but reasonable storage limits, a usable timeline, scheduled letters and basic personalization. A free tier must remain a complete experience, not a hostage archive.

**One shared Couple Plus subscription (test, do not assume):** additional books/pages/storage, premium stationery and book covers, advanced editor decorations, printable exports, richer multimedia, advanced story replay and extra theme packs. A subscription covers the *bond*, not double charges to each member.

**One-off purchases:** a printed keepsake book, specially crafted theme pack or anniversary gift; physical production should be piloted before nationwide or international promises.

**Illustrative willingness-to-pay experiments:** test $2.99-$5.99/month per couple and a lower annual effective price; these are hypotheses, not validated market prices. Test local purchasing power and conversion before fixing regional prices.

**Never do:** paywall the only copy of an existing letter, sell intimate content or personal data, publish private memories for growth, trap someone inside a bond, advertise inside private letters, force daily streaks or charge unexpectedly to retrieve personal materials.

## Payments and Pakistan-specific operational reality
- Founder is based in Pakistan while the product is intended for global customers. Payment processing eligibility, merchant incorporation, payouts, tax handling and chargebacks must be verified for that actual business entity **before** choosing a provider or claiming it works.
- Stripe's current official supported-country list does **not** list Pakistan for direct local merchant account onboarding. Do not build assumptions around personally using a standard Pakistan Stripe account.
- Evaluate legitimate payment processors/merchants of record or a properly constituted legal entity and accountant advice. Verify each provider's current country and category eligibility, pricing and settlement currency.
- Mobile in-app digital subscriptions have store billing policy implications; assess Apple/Google platform rules in the mobile-app phase rather than reusing web checkout blindly.

## Unit economics model (illustration, not forecast)
Let `active_couples` = couples using product in a month; `paid_rate` = fraction subscribing; `ARPPU` = average paid monthly revenue per paying couple; `store_cost` = payment/platform fees; `infra` = hosting + database + storage + delivery; `people` = salaries/contractors/support; `other` = marketing, insurance, legal, taxes.

Monthly gross subscription revenue ~= `active_couples * paid_rate * ARPPU`.  
Operating contribution ~= `gross revenue - payment fees - infra - people - other`.

Example scenarios at $4 paid ARPPU (purely illustrative):

| Monthly active couples | Paid conversion | Paying couples | Monthly gross subscription revenue |
|---:|---:|---:|---:|
| 1,000 | 3% | 30 | $120 |
| 10,000 | 5% | 500 | $2,000 |
| 100,000 | 5% | 5,000 | $20,000 |
| 1,000,000 | 5% | 50,000 | $200,000 |

These are simple multiplication illustrations, not predictions. Real net income can be substantially lower or negative after salaries, marketing, hosting, tax, refunds, processing and customer support. More stored photos and media increase infrastructure costs.

# 11. Go-to-market, distribution and retention

### Positioning statement
"Write for the moments you can't be there. Build a private, beautiful world of letters and memories for the person you love."

### Key growth loop: sender -> recipient -> shared memory
1. Visitor sees a beautiful and emotionally comprehensible demonstration.
2. Visitor writes a first letter and creates a secure invitation.
3. Recipient opens it with minimal friction; understands the emotional benefit before being required to sign up.
4. Recipient creates an account and joins the bond, or remains in limited guest mode for that one letter.
5. Both contribute their first shared page or date, which creates lasting value.
6. Users return for upcoming dates, future letters and book-building rather than only sending a single message.

### Launch wedge
**Journey Letters:** a sender can prepare a series of letters for someone taking a journey. This is specific, demonstrable, simple to explain and naturally tied to a real-world moment. Show actual prototypes, not hypothetical promises.

### Content that people may want to share voluntarily
- A short demo of an envelope opening with no private text shown.
- A couple flipping through a *demo* book they opted to publish.
- A timeline line drawing through fictional anniversaries.
- A before/after video of a blank scrapbook transformed into a beautiful book.
- A tasteful giftable invitation preview.

### Organic distribution tests
- Short vertical video for TikTok, Instagram Reels, YouTube Shorts.
- Niche long-distance relationship communities (participate honestly; follow community rules; no spam).
- Small creators in journaling, scrapbooking, travel, couples and stationery niches.
- Seasonal campaigns: Valentine's Day, graduations, reunions, anniversaries, trips and new school years.
- Referral gestures that reward existing subscribers with harmless cosmetic perks, never coercive access or partner tracking.

### Brand and originality
- Do not copy The Unsent Project's name, layouts, content, art or proprietary visual identity. Its emotional resonance can inspire us without imitation.
- Darry Ring's exclusivity theme is an inspiration; our bond model must have its own branding and healthy privacy boundaries.
- Clear trademark/domain search before naming; own original illustrations, visual assets, copy and commercially licensed fonts.

## Metrics that actually matter
**North Star:** monthly *meaningful shared moments per active bond*, such as a letter read, a saved new book page or a milestone jointly revisited. Avoid optimizing raw engagement minutes or daily streaks.

**Acquisition:** qualified landing visitors, sample-demo completion, first draft started, signup conversion and invited recipient activation.

**Activation:** percentage of people who form a bond within seven days; percentage of bonded couples that exchange a first letter or create a memory within seven days; first journey created.

**Engagement:** returning active bonds at D7/D30/D90; percentage with both partners contributing, letters delivered/read, number of revisited book chapters.

**Retention:** cohort retention of *bonds*, not only individuals, meaningful moments per bond/month, organic referral rate, churn reason, archived/deleted bonds.

**Trust:** reports of unauthorized access, failed unlocks, failed upload restores, account recovery time, privacy complaints.

**Revenue:** paywall impressions, trial-to-paid conversion, churn, gross and net revenue per paying bond, lifetime value estimate, storage/delivery cost per active bond.

**Do not instrument:** raw private letter bodies, private photographs or sensitive relationship sentiment in third-party analytics by default.

## 30/60/90-day validation experiment after prototype
**First 30 days:** interview 15-25 target users; run usability tests with 8-12 people on real phones; ask each to create one letter and one page; document the friction and fixes. These are research targets, not promises.

**Next 30 days:** invite 25-50 consenting pilot couples; monitor first-letter completion, invitation acceptance, mobile failures, and whether both people participate. Make Journey Letters trustworthy before mass promotion.

**Next 30 days:** conduct small creator/content tests and optionally an honest waitlist; compare landing messages and record repeat usage, retention and intended willingness-to-pay. Stop or change course if recipients don't find value after the initial surprise.

**Key decision rule:** if people love the *demo* but do not return to write/read/revisit actual memories, prioritizing more animation is the wrong fix. Solve the recurring user value first.

# 12. Project stages, deliverables, dependencies and exit tests

**Important:** Schedules are planning hypotheses for a capable small development effort with AI assistance, not commitments. Security, editor complexity and provider approval may extend timelines substantially. Do not schedule a public launch from a mockup alone.

| Stage | Focus | Deliverables | Exit gate |
|---|---|---|---|
| 0 - Discovery | Naming, scope, product decisions | vision, references, user stories, sitemap, privacy decision log | all P0 flows decided |
| 1 - Design system | brand and animations | color/type tokens, responsive components, motion language, 5 clickable screens | mobile and desktop visual signoff |
| 2 - Vertical slice | accounts, bond, real letters | sign-in, invitations, create/send/release/read a letter | 2 real test users complete without developer help |
| 3 - Living archive | books and dates | customizable book/pages, calendar, branching timeline | editing works on real phones with persisted data |
| 4 - Journeys | many letters over one trip | journey planner, scheduled checkpoints, time-zone robustness | test date line/DST and failed-job recovery |
| 5 - Private beta | hardening | accessibility, performance, security, support, deletion/export, logs | release gates met and testers are satisfied |
| 6 - Monetization | optional premium | entitlements, billing, restore purchases, transparent plans | actual legal/payment eligibility verified |
| 7 - Native mobile | reliable offline experience | React Native/Expo app, preloads, local notifications | airplane-mode real-device testing passes |
| 8 - Scale | resilience and growth | queues, indexing, cost controls, CDN/media optimizations, moderation | measured reliability and business demand |

### An approximate effort model
- Stage 0-1: ~2-4 weeks for thoughtful product/design system and prototypes.
- Stage 2: ~3-6 weeks for a reliable initial letter vertical slice with authentication and permissions.
- Stage 3-4: ~6-12+ weeks; the rich scrapbook editor is more difficult than standard CRUD screens.
- Stage 5: ~3-6 weeks of iteration depending on test findings.
- Native app: additional dedicated development and real-device QA after backend is stable.
These ranges can overlap and may stretch considerably for a solo founder using AI tools; avoid interpreting them as a guaranteed calendar.

# 13. First implementation sprint - exact order

**Sprint objective:** a beautiful responsive homepage plus authenticated two-person private letter flow, with no fake functionality.

### Work items
1. Initialize repository, Next.js/TypeScript/Tailwind, formatter/linter, CI and README.
2. Add `PRODUCT_DECISIONS.md`, `DESIGN_TOKENS.md`, `MOTION_SPEC.md`, `DATA_ACCESS.md` and current-version action list.
3. Build shared page shell, responsive navigation, hero preview and accessible button/form primitives.
4. Implement one *quality* animation prototype: closed envelope -> opened letter -> reading view, with reduced-motion alternative.
5. Configure Supabase environment safely and add migrations for profiles, bonds, invitations and letters.
6. Implement email auth end to end first; then add Google and Apple when credentials are present; never fake successful login.
7. Implement invite/accept with permissions and one-active-bond constraint.
8. Implement write, save draft, send now, schedule in future and open after release.
9. Write permissions tests attempting to read letters from a third account and sealed letters before release.
10. Test complete flow on 360px phone and desktop; run accessibility scan and measure interaction responsiveness.

### Sprint design acceptance
- Homepage feels special but main CTA remains above the fold on common phones.
- All buttons have visible keyboard focus and sensible accessible names.
- One animation is polished enough to set the standard for the app.
- Functional UI remains responsive if animation is disabled.
- Real persistence is confirmed through refresh, not only local component state.

### Then build Memory Book in this implementation order
A. create/rename/customize cover -> B. shelf and page reader -> C. template-based editable pages -> D. freeform page canvas -> E. multi-user collaboration -> F. export and printing.

### Then build Our Dates in this implementation order
A. add/list milestone -> B. calendar -> C. simple responsive timeline -> D. animated branching SVG -> E. clustering/zoom -> F. linked book/letter deep links.

### Then build Journey Letters in this implementation order
A. planner -> B. UTC checkpoint calculations -> C. scheduled releases -> D. author/recipient previews -> E. time-zone/DST tests -> F. native offline feature later.

# 14. Risk register and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Animation-heavy site runs poorly on phones | users abandon beautiful but slow products | performance budget, real-device profiling, lazy animations, reduced motion |
| Freeform scrapbook editor becomes huge | production complexity, bugs and slow delivery | template editor first, scene-graph model, freeform later |
| Scheduled letter exposes early | core promise and trust failure | server-side eligibility checks + RLS tests |
| Offline locks aren't truly tamper-proof | device clocks/local caches can be manipulated | honest UX claim, distinguish from server-enforced mode |
| Only one partner is interpreted as coercive | emotional and safety issues | consent, easy exit, privacy controls, no forced permanence |
| Private content leaks via assets | catastrophic trust damage | private buckets, signed URLs, tested access checks, incident plan |
| Provider fees, storage grow too fast | can harm gross margin | resize media, quotas, TTL, cost monitoring, staged rollout |
| No users come back | a novel gift is not necessarily a habit | validation, recurring memory utility, listener interviews |
| Unavailable payment provider in founder country | cannot legally receive global subscriptions | early entity/payment eligibility checks |
| Over-imitation of existing companies | legal and branding risk | unique name, visual language, copy and trademark checks |
| Breakup or harassment | privacy and abuse issues | block/report, unlink, export/delete, no unconsented contact |
| Third-party providers or mobile app policies change | shipping delay | verify current docs before each integration; feature flags |

# 15. Founder dashboard and operating cadence

### Weekly project review
- What's actually shipped and user-testable?
- Which exact P0 acceptance tests fail?
- What frustrated users on phones this week?
- Did a couple create, receive or revisit something meaningful?
- Are private data and scheduled unlocks functioning correctly?
- How much did our hosting/storage cost per active bond?
- What feature is **not** worth building yet?

### Artifacts to keep under version control
- `MASTER_BLUEPRINT.md` - this plan, revised as decisions change.
- `PRODUCT_DECISIONS.md` - dated decisions and rationale.
- `FEATURE_BACKLOG.md` - P0/P1/P2 and scope changes.
- `SCREEN_INVENTORY.md` - every screen and mobile/desktop state.
- `MOTION_SPEC.md` - animation recipes, fallbacks, budgets.
- `DATA_MODEL.md` - models, releases, roles, persistence.
- `SECURITY_CHECKLIST.md` - data access, incident, auth and legal work.
- `QA_MATRIX.md` - viewport/browser/phone pass criteria.
- `GROWTH_EXPERIMENTS.md` - hypotheses and observed actual results.

# 16. Resolved design decisions (from founder conversation)

- Web first; native mobile app later. Responsive and touch-first phone behavior in web phase 1.
- Product is for one active partner bond at a time, with humane exit and separation controls.
- Entry through Google, Apple or email; allow demo/limited guest receiving where safe.
- Priority on many elegant, fluid animations, without lag or inaccessible motion.
- Memory Book must be a realistic scrapbook-style book, and each couple can choose *any* name for its book.
- Memory Book supports full personalization: covers, colors, fonts, pages, photos, stickers, layouts and chapters. Templates and freeform mode both matter.
- Our Dates starts with timeline/calendar but expands into graceful growing lines, branches, milestone cards and linked memories.
- Journey Letters lets sender choose city-to-city dates and multiple scheduled checkpoints; offline reading is a future app capability with a preflight download step.
- Private-by-default relationship story; public submissions optional and explicitly consented, never copied automatically from private content.
- Theme is mature/editorial romantic, with warm ivory and burgundy as a starting palette, not a mandatory user theme.
- Working product name is NOT settled and should not be treated as trademark cleared.

# 17. Decisions to confirm before committing expensive development

1. **Final brand identity and name.** Temporary name 'Letters' is fine during engineering.
2. **Bond lifecycle specifics.** One active partner at a time, with clear archive/export rules on separation; confirm handling of joint books after one user leaves.
3. **Publishing model.** Private-only at launch is recommended; decide if optional public anonymous stories should be in beta or later.
4. **Free tier limits.** Define storage/books/letters limits without compromising archive access.
5. **Launch geographies and languages.** Recommended English-first global audience, then localize according to user demand.
6. **Offline delivery philosophy.** Treat native offline as best-effort scheduled access, with a truthful user-facing disclosure; strict lock is server-side only.
7. **Payments.** Verify actual provider eligibility for Pakistan-based founder or appropriate registered business before monetization.

# 18. What success looks like

**A successful first prototype:** a user says 'this feels exactly like a private world for us' and completes a letter on phone without explanation.

**A successful closed beta:** invited couples use it to exchange real messages, make real memories and return on their own accord. Security checks hold and no major editor/phone blockers persist.

**A successful product:** people trust it with meaningful content, revisit it over months, recommend it voluntarily and see enough value to support a fair premium service.

**A sustainable global business:** retention, referrals and paid conversion exceed the costs of running, maintaining, securing and improving the service. This requires observation and iteration, not only a grand launch.

---

# 19. Technical and policy reference points

Primary public documentation consulted for feasibility; re-verify before implementation:

- Supabase Authentication: https://supabase.com/docs/guides/auth
- Supabase SSR integration: https://supabase.com/docs/guides/auth/server-side
- Supabase Next.js quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js authentication guidance: https://nextjs.org/docs/app/guides/authentication
- Apple Sign in with Apple: https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Motion for React: https://motion.dev/docs/react
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Expo local notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Google Web Vitals thresholds: https://web.dev/articles/vitals
- Stripe country availability: https://stripe.com/global

---

# 20. Codex implementation protocol

For each scoped feature, the coding agent should:
1. Read `MASTER_BLUEPRINT.md` and relevant specs before changing code.
2. Explicitly restate the user story, affected routes, database tables and device behavior.
3. Implement the **smallest complete vertical slice**, not mock buttons or static demo content disguised as production functionality.
4. Handle loading, empty, error, offline/not-connected and permissions states.
5. Implement responsive mobile behavior and reduced-motion alternative in the same change.
6. Write automated tests (component, database policy, integration or E2E as applicable).
7. Run lint, type check and tests; document any environmental blocker and do not claim success without evidence.
8. Record what changed, screenshots/preview where feasible, known issues and next small task.
9. Never mutate production data or use provider secrets without explicit authorized setup.
10. Keep a consistent original visual identity and avoid substituting generic SaaS cards for the immersive story design.

**The rule:** We are not building an animation demo. We are building a private, reliable, mobile-first relationship product where the most important user actions happen to feel magical.
