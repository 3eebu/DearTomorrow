'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode, TouchEvent } from 'react';

type Moment = { id: string; title: string; date: string; story: string; chapter: string };
type Section = 'letters' | 'books' | 'memory-tree' | 'journeys';
const initialMoments: Moment[] = [
  { id: 'first-hello', title: 'The very first hello', date: '2026-02-14', story: 'It was such a small thing at the time. Only later did we realize it was where the whole story began.', chapter: 'Our firsts' },
  { id: 'ordinary-day', title: 'An ordinary Tuesday', date: '2026-05-12', story: 'Nothing extraordinary happened. We just laughed until we forgot what we were laughing about.', chapter: 'Little days' },
  { id: 'first-trip', title: 'Somewhere new together', date: '2026-08-22', story: 'We took the longer road and somehow found our favorite memory along the way.', chapter: 'Adventures' },
  { id: 'next-chapter', title: 'A promise for tomorrow', date: '2026-11-07', story: 'A reminder that our favorite moments are not all behind us.', chapter: 'Tomorrow' },
];
const chapters = ['Our firsts', 'Little days', 'Adventures', 'Tomorrow'];
const treePositions = [
  [169, 282], [278, 163], [468, 202], [541, 320], [213, 398], [476, 414],
  [369, 118], [104, 248], [573, 232], [317, 344], [417, 293], [231, 227],
  [405, 470], [138, 345], [524, 136], [315, 92]
];
const pages = [
  { chapter: 'I', eyebrow: 'THE VERY BEGINNING', title: 'It started with a hello.', text: 'And somehow, in the middle of all the ordinary days, one small moment became the beginning of everything.', footer: 'The first of many little forevers' },
  { chapter: 'II', eyebrow: 'THE EVERYDAY', title: 'The little things were everything.', text: 'A familiar voice. A long walk. The way a good day gets better when you have someone to tell about it.', footer: 'Somewhere between here and forever' },
  { chapter: 'III', eyebrow: 'THE ADVENTURES', title: 'Every road led us here.', text: 'The places mattered, but the best part was always who I got to share them with.', footer: 'Postcards from our story' },
  { chapter: 'IV', eyebrow: 'TO BE CONTINUED', title: 'There is still so much ahead.', text: 'May we never run out of new beginnings, unlikely adventures, and quiet moments to call our own.', footer: 'With love, for tomorrow' },
];
const journeyStops = [
  { name: 'Before you leave', clock: 'Before departure', note: 'A little reminder to carry with you.' },
  { name: 'Takeoff', clock: 'At departure', note: 'For the moment the world begins to get smaller beneath you.' },
  { name: 'Above the clouds', clock: 'Along the way', note: 'A familiar voice for an unfamiliar sky.' },
  { name: 'Halfway home', clock: 'Journey midpoint', note: 'Every mile is another mile closer.' },
  { name: 'Almost there', clock: 'Before arrival', note: 'The happiest part is nearly here.' },
  { name: 'Welcome back', clock: 'At arrival', note: 'You made it. The rest of the story starts here.' },
];

function useReveals() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (typeof IntersectionObserver === 'undefined') {
      elements.forEach(el => el.classList.add('dt-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('dt-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = ref.current?.querySelector<HTMLElement>('button, input, select, textarea, a[href]');
    first?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]'));
      const start = focusable[0];
      const end = focusable[focusable.length - 1];
      if (!start || !end) return;
      if (event.shiftKey && document.activeElement === start) { event.preventDefault(); end.focus(); }
      if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); start.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', keyboard); before?.focus(); };
  }, []);
  return <div className="dt-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="dt-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <button className="dt-dialog-close" type="button" onClick={onClose} aria-label="Close window">×</button>
      {children}
    </div>
  </div>;
}

function Envelope({ onWrite }: { onWrite: () => void }) {
  const [opened, setOpened] = useState(false);
  return <div className="dt-envelope-scene">
    <div className="dt-envelope-aura" aria-hidden="true" />
    <button type="button" aria-label={opened ? 'Close the example envelope' : 'Open the example envelope'} aria-expanded={opened}
      className={'dt-envelope ' + (opened ? 'dt-envelope-open' : '')} onClick={() => setOpened(value => !value)}>
      <span className="dt-envelope-back" aria-hidden="true" />
      <span className="dt-envelope-paper">
        <span className="dt-paper-overline">A LETTER FOR YOU</span>
        <span className="dt-paper-greeting">My dearest,</span>
        <span className="dt-paper-words">If this finds you on an ordinary day, I hope it makes the day feel a little extraordinary.</span>
        <span className="dt-paper-sign">Always, yours.</span>
      </span>
      <span className="dt-envelope-front" aria-hidden="true" />
      <span className="dt-envelope-flap" aria-hidden="true" />
      <span className="dt-envelope-seal" aria-hidden="true">✳</span>
    </button>
    <div className="dt-envelope-caption">
      <span>{opened ? 'A little note, just for you.' : 'An envelope, waiting to be opened.'}</span>
      <button type="button" onClick={opened ? onWrite : () => setOpened(true)}>
        {opened ? 'Write your own note' : 'Open the letter'} <span aria-hidden="true">↗</span>
      </button>
    </div>
  </div>;
}

function MemoryBook() {
  const [name, setName] = useState('Our Little Forever');
  const [coverColor, setCoverColor] = useState('#583a44');
  const [opened, setOpened] = useState(false);
  const [page, setPage] = useState(0);
  const swipeOrigin = useRef<number | null>(null);
  const changePage = (direction: number) => setPage(current => Math.max(0, Math.min(pages.length - 1, current + direction)));
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (swipeOrigin.current === null) return;
    const distance = event.changedTouches[0].clientX - swipeOrigin.current;
    if (Math.abs(distance) > 55) {
      if (!opened) setOpened(true);
      else changePage(distance < 0 ? 1 : -1);
    }
    swipeOrigin.current = null;
  };
  return <section id="books" className="dt-section dt-book-section" aria-labelledby="book-heading">
    <div className="dt-section-content" data-reveal>
      <span className="dt-overline">02 / MEMORY BOOKS</span>
      <h2 id="book-heading">A whole world<br /><em>between the pages.</em></h2>
      <p>Some memories deserve more than a place in your phone. Give them a name, a cover, and somewhere to live.</p>
      <div className="dt-book-editor">
        <label htmlFor="dt-book-name">THE NAME ON YOUR COVER</label>
        <input id="dt-book-name" value={name} maxLength={70} onChange={event => setName(event.target.value)} placeholder="Name this little forever" />
        <span className="dt-sub-label">CHOOSE A COVER</span>
        <div className="dt-cover-palette" role="group" aria-label="Choose a cover color">
          {[
            ['#583a44', 'Mulberry'], ['#657369', 'Sage'], ['#3d4b5b', 'Midnight'], ['#a27868', 'Terracotta']
          ].map(([hex, label]) => <button key={hex} type="button" title={label} aria-label={label} aria-pressed={coverColor === hex}
            className={coverColor === hex ? 'dt-color-active' : ''} style={{ backgroundColor: hex }} onClick={() => setCoverColor(hex)} />)}
        </div>
      </div>
      <p className="dt-inline-note">Interactive sample · Your changes stay in this tab only.</p>
    </div>
    <div className="dt-book-stage" data-reveal>
      <div className="dt-book-light" aria-hidden="true"/>
      <div className={'dt-book-object ' + (opened ? 'dt-is-open' : '')} style={{ '--dt-cover': coverColor } as CSSProperties}
        tabIndex={0} aria-label="Memory Book. Use left and right arrow keys to turn pages."
        onKeyDown={event => { if (!opened || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return; event.preventDefault(); changePage(event.key === 'ArrowRight' ? 1 : -1); }}
        onTouchStart={event => { swipeOrigin.current = event.touches[0].clientX; }}
        onTouchEnd={onTouchEnd}>
        {!opened ? <button type="button" className="dt-book-cover" onClick={() => setOpened(true)} aria-label={'Open memory book ' + name}>
          <span className="dt-book-spine" aria-hidden="true"/>
          <span className="dt-book-ornament" aria-hidden="true">✧</span>
          <span className="dt-cover-border">
            <span className="dt-cover-small">A BOOK OF MOMENTS</span>
            <strong>{name || 'Untitled memories'}</strong>
            <span className="dt-cover-divider"/>
            <em>an unfinished story</em>
          </span>
          <span className="dt-cover-small dt-cover-foot">DEAR TOMORROW · VOLUME ONE</span>
        </button> : <div className="dt-book-spread">
          <div className="dt-book-left-page">
            <span className="dt-page-overline">DEAR TOMORROW</span>
            <div className="dt-page-illustration" aria-hidden="true"><span className="dt-page-arch"/><span className="dt-page-orbit"/><span className="dt-page-star">✧</span></div>
            <span className="dt-page-handwritten">A little piece of us.</span>
          </div>
          <div className="dt-book-right-page" key={page}>
            <span className="dt-page-overline">CHAPTER {pages[page].chapter} · {pages[page].eyebrow}</span>
            <span className="dt-chapter-rule" aria-hidden="true"/>
            <h3>{pages[page].title}</h3>
            <p>{pages[page].text}</p>
            <span className="dt-page-handwritten">{pages[page].footer}</span>
            <small className="dt-book-pagination">{page + 1} / {pages.length}</small>
          </div>
        </div>}
      </div>
      <div className="dt-book-controls">
        {!opened ? <button type="button" className="dt-text-action" onClick={() => setOpened(true)}>Open this book <span aria-hidden="true">↗</span></button>
        : <>
          <button type="button" className="dt-icon-button" onClick={() => changePage(-1)} disabled={page === 0} aria-label="Previous page">←</button>
          <span className="dt-page-count">{page + 1} of {pages.length}</span>
          <button type="button" className="dt-icon-button" onClick={() => changePage(1)} disabled={page === pages.length - 1} aria-label="Next page">→</button>
          <button type="button" className="dt-text-action" onClick={() => { setOpened(false); setPage(0); }}>Close book</button>
        </>}
      </div>
    </div>
  </section>;
}

function MemoryTree({ addSignal }: { addSignal: number }) {
  const [moments, setMoments] = useState<Moment[]>(initialMoments);
  const [view, setView] = useState<'tree' | 'calendar'>('tree');
  const [selectedId, setSelectedId] = useState<string | null>(initialMoments[0].id);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [chapter, setChapter] = useState(chapters[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 10, 1));
  useEffect(() => { if (addSignal > 0) setAdding(true); }, [addSignal]);
  const selected = moments.find(moment => moment.id === selectedId);
  const displayMonth = calendarDate.getMonth();
  const displayYear = calendarDate.getFullYear();
  const days = new Date(displayYear, displayMonth + 1, 0).getDate();
  const startOfMonth = new Date(displayYear, displayMonth, 1).getDay();
  const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shiftCalendar = (delta: number) => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  function addMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    const moment: Moment = { id: 'demo-' + Date.now(), title: title.trim(), date, story: story.trim() || 'One more moment worth keeping.', chapter };
    setMoments(existing => [...existing, moment]);
    setSelectedId(moment.id);
    setCalendarDate(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1));
    setTitle('');
    setStory('');
    setAdding(false);
  }
  return <section className="dt-tree-section dt-section" id="memory-tree" aria-labelledby="tree-heading">
    <div className="dt-tree-intro" data-reveal>
      <span className="dt-overline">03 / THE MEMORY TREE</span>
      <h2 id="tree-heading">Every love story<br /><em>grows somewhere.</em></h2>
      <p>Its roots are the beginning. Its branches are the chapters. Every leaf holds a moment that made it yours.</p>
    </div>
    <div className="dt-tree-topbar">
      <div className="dt-view-switch" role="group" aria-label="Choose your memory view">
        <button type="button" aria-pressed={view === 'tree'} className={view === 'tree' ? 'dt-active' : ''} onClick={() => setView('tree')}>Memory Tree</button>
        <button type="button" aria-pressed={view === 'calendar'} className={view === 'calendar' ? 'dt-active' : ''} onClick={() => setView('calendar')}>Calendar</button>
      </div>
      <button type="button" className="dt-subtle-button" onClick={() => setAdding(true)}>＋ Add a memory</button>
    </div>
    {view === 'tree' ? <div className="dt-tree-world" data-reveal>
      <div className="dt-tree-stage">
        <svg className="dt-living-tree" viewBox="0 0 700 620" role="img" aria-label="A growing tree with four organic branches">
          <defs>
            <linearGradient id="dt-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#765749"/><stop offset=".5" stopColor="#a27b67"/><stop offset="1" stopColor="#77584b"/></linearGradient>
          </defs>
          <path className="dt-tree-root" d="M345 603 C306 595 283 609 253 614 M347 603 C385 592 408 611 449 616 M349 602 Q349 618 334 620"/>
          <path className="dt-tree-trunk" d="M347 605 C340 525 354 471 354 408 C351 346 344 307 354 254 C365 198 360 133 356 92"/>
          <path className="dt-tree-limb dt-limb-one" d="M354 407 Q312 385 281 350 T211 302 Q182 285 163 279 M276 348 Q245 354 212 398"/>
          <path className="dt-tree-limb dt-limb-two" d="M354 344 Q408 315 450 273 T541 228 M438 284 Q466 320 539 324"/>
          <path className="dt-tree-limb dt-limb-three" d="M355 260 Q308 239 288 198 Q272 171 277 162 M309 213 Q272 199 228 222"/>
          <path className="dt-tree-limb dt-limb-four" d="M359 187 Q413 159 442 122 Q468 111 493 104 M411 160 Q388 133 370 117"/>
          <g className="dt-living-leaves" aria-hidden="true">
            {[
              [169,282,-35],[213,398,25],[278,163,-35],[228,222,55],[468,202,42],[541,228,30],
              [541,320,-45],[476,414,22],[370,117,-15],[493,104,33],[440,122,60],[310,290,-25],
              [310,355,48],[425,280,-50],[199,293,20],[512,266,37],[318,188,18]
            ].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={i % 3 === 0 ? 13 : 10} ry={i % 2 === 0 ? 26 : 20} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'} className={i % 3 === 0 ? 'dt-leaf-muted' : ''}/>)}
          </g>
        </svg>
        {moments.slice(0, treePositions.length).map((moment, index) => {
          const position = treePositions[index];
          return <button key={moment.id} type="button" aria-label={'Read memory: ' + moment.title}
            aria-pressed={selectedId === moment.id} onClick={() => setSelectedId(selectedId === moment.id ? null : moment.id)}
            className={'dt-tree-marker ' + (selectedId === moment.id ? 'dt-marker-selected' : '')}
            style={{ left: (position[0] / 700 * 100) + '%', top: (position[1] / 620 * 100) + '%' }}>
            <span className="dt-marker-leaf" aria-hidden="true"/><span className="dt-marker-core" aria-hidden="true"/>
          </button>;
        })}
        <span className="dt-tree-ground" aria-hidden="true"/>
      </div>
      <div className="dt-tree-side">
        <span className="dt-overline">THE LEAVES OF OUR STORY</span>
        <p className="dt-tree-side-intro">Tap a leaf. Every one has something to tell.</p>
        <div className="dt-tree-moment-list">
          {[...moments].sort((a, b) => a.date.localeCompare(b.date)).map(moment => <button type="button" key={moment.id}
            aria-pressed={selectedId === moment.id} className={selectedId === moment.id ? 'dt-moment-active' : ''}
            onClick={() => setSelectedId(moment.id)}>
            <span>{new Date(moment.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            <strong>{moment.title}</strong><span aria-hidden="true">↗</span>
          </button>)}
        </div>
        <div className="dt-moment-detail" aria-live="polite">
          {selected ? <><span className="dt-overline">{selected.chapter} · {selected.date}</span><h3>{selected.title}</h3><p>{selected.story}</p></> :
            <p>Choose a leaf to open its memory.</p>}
        </div>
      </div>
      <p className="dt-inline-note dt-tree-note">A living-tree prototype · New memories appear as leaves; larger collections will need clustering.</p>
    </div> :
      <div className="dt-calendar-panel" data-reveal>
        <div className="dt-calendar-bar">
          <button type="button" aria-label="Previous month" onClick={() => shiftCalendar(-1)}>←</button>
          <h3>{monthLabel}</h3>
          <button type="button" aria-label="Next month" onClick={() => shiftCalendar(1)}>→</button>
        </div>
        <div className="dt-calendar-grid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <span className="dt-calendar-weekday" key={day}>{day}</span>)}
          {Array.from({ length: startOfMonth }, (_, n) => <span key={'empty-' + n} />)}
          {Array.from({ length: days }, (_, n) => {
            const day = n + 1;
            const key = [displayYear, String(displayMonth + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
            const onDay = moments.filter(moment => moment.date === key);
            return <button type="button" key={key} className={onDay.length ? 'dt-calendar-has-memory' : ''}
              aria-label={day + (onDay.length ? ': ' + onDay.map(m => m.title).join(', ') : '')}
              onClick={() => { if (onDay.length) setSelectedId(onDay[0].id); }} >
              {day}{onDay.length > 0 && <span aria-hidden="true">✦</span>}
            </button>;
          })}
        </div>
        <div className="dt-calendar-result" aria-live="polite">
          <span className="dt-overline">SELECTED MEMORY</span>
          {selected ? <><h4>{selected.title}</h4><p>{selected.story}</p><button type="button" className="dt-text-action" onClick={() => setView('tree')}>Find it on the tree ↗</button></> : <p>Select a marked day, or add a new memory.</p>}
        </div>
      </div>}
    <p className="dt-demo-disclaimer">DEMO — Memories are fictional and are not saved online. Refreshing resets new entries.</p>
    {adding && <Dialog title="Add a memory to your tree" onClose={() => setAdding(false)}>
      <span className="dt-overline">ANOTHER LEAF, ANOTHER MEMORY</span>
      <h2 className="dt-dialog-title">What would you like to <em>remember?</em></h2>
      <form className="dt-form" onSubmit={addMoment}>
        <label htmlFor="dt-moment-title">Give this moment a name</label>
        <input id="dt-moment-title" maxLength={90} required placeholder="The day everything changed..." value={title} onChange={event => setTitle(event.target.value)}/>
        <div className="dt-form-split">
          <div><label htmlFor="dt-moment-date">Date</label><input id="dt-moment-date" type="date" required value={date} onChange={event => setDate(event.target.value)}/></div>
          <div><label htmlFor="dt-moment-chapter">Chapter</label><select id="dt-moment-chapter" value={chapter} onChange={event => setChapter(event.target.value)}>{chapters.map(c => <option key={c}>{c}</option>)}</select></div>
        </div>
        <label htmlFor="dt-moment-story">A few words about it</label>
        <textarea id="dt-moment-story" rows={4} value={story} onChange={event => setStory(event.target.value)} placeholder="What made this day special?"/>
        <button className="dt-button dt-button-dark" type="submit">Grow this memory <span aria-hidden="true">↗</span></button>
        <p className="dt-inline-note">Local preview only. Not yet saved to an account.</p>
      </form>
    </Dialog>}
  </section>;
}

function JourneyLetters() {
  const [selected, setSelected] = useState(0);
  return <section id="journeys" className="dt-journey-section dt-section" aria-labelledby="journey-heading">
    <div className="dt-journey-intro" data-reveal>
      <span className="dt-overline">04 / JOURNEY LETTERS</span>
      <h2 id="journey-heading">A little closer,<br /><em>with every mile.</em></h2>
      <p>Six small notes for the journey between goodbye and hello again. A gentle reminder that someone is thinking of you.</p>
    </div>
    <div className="dt-journey-route" data-reveal>
      <div className="dt-route-city"><strong>LAHORE</strong><span>Where the journey begins</span></div>
      <div className="dt-route-path" aria-hidden="true"><span className="dt-route-track"/><span className="dt-route-plane">✈</span></div>
      <div className="dt-route-city dt-route-end"><strong>LONDON</strong><span>One moment closer</span></div>
    </div>
    <div className="dt-checkpoints" data-reveal role="group" aria-label="Six journey letter moments">
      {journeyStops.map((checkpoint, index) => <button type="button" key={checkpoint.name}
        aria-pressed={selected === index} className={'dt-checkpoint ' + (selected === index ? 'dt-checkpoint-active' : '')}
        onClick={() => setSelected(index)}>
        <span className="dt-checkpoint-index">0{index + 1}</span>
        <span className="dt-checkpoint-envelope" aria-hidden="true"><span/></span>
        <strong>{checkpoint.name}</strong>
        <small>{checkpoint.clock}</small>
      </button>)}
    </div>
    <div className="dt-journey-readout" aria-live="polite"><span className="dt-overline">LETTER 0{selected + 1} / A PREVIEW</span>
      <p>{journeyStops[selected].note}</p><span>These checkpoint times are illustrative. Real online scheduling and delivery are not available yet.</span>
    </div>
  </section>;
}

export default function HomeStudio() {
  useReveals();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [letterKind, setLetterKind] = useState('A simple letter');
  const [previewLetter, setPreviewLetter] = useState(false);
  const [addSignal, setAddSignal] = useState(0);
  function goTo(section: Section) {
    setMobileMenu(false);
    setCreateOpen(false);
    if (section === 'letters') { setComposeOpen(true); return; }
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (section === 'books') window.setTimeout(() => document.getElementById('dt-book-name')?.focus({ preventScroll: true }), 500);
  }
  return <div className="dt-app" id="home">
    <a className="dt-skip" href="#dt-main">Skip to the story</a>
    <div className="dt-prototype-banner">A WORK IN PROGRESS · THIS IS A SAFE, UNSAVED DEMO</div>
    <header className="dt-header">
      <Link className="dt-wordmark" href="/" aria-label="Dear Tomorrow home">Dear <em>Tomorrow.</em></Link>
      <nav className={'dt-navigation ' + (mobileMenu ? 'dt-nav-open' : '')} aria-label="Primary navigation">
        <Link onClick={() => setMobileMenu(false)} href="/about">Our story</Link>
        <Link onClick={() => setMobileMenu(false)} href="/how-it-works">How it works</Link>
        <a onClick={() => setMobileMenu(false)} href="#books">Memory Books</a>
        <a onClick={() => setMobileMenu(false)} href="#memory-tree">Memory Tree</a>
        <a onClick={() => setMobileMenu(false)} href="#journeys">Journeys</a>
      </nav>
      <div className="dt-header-right">
        <button className="dt-button dt-header-create" type="button" onClick={() => setCreateOpen(true)}>Create something <span aria-hidden="true">↗</span></button>
        <button className="dt-menu-button" type="button" onClick={() => setMobileMenu(open => !open)} aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu}>
          <span/><span/>
        </button>
      </div>
    </header>
    <main id="dt-main">
      <section className="dt-hero" aria-labelledby="dt-hero-title">
        <div className="dt-hero-light" aria-hidden="true"/>
        <div className="dt-hero-copy" data-reveal>
          <p className="dt-overline">A QUIET LITTLE CORNER OF THE WORLD</p>
          <h1 id="dt-hero-title">Some words<br />are worth<br /><em>waiting for.</em></h1>
          <p className="dt-hero-lead">A place to leave love in the little things. To hold on to your favorite moments. To build a story that feels like home.</p>
          <div className="dt-hero-actions">
            <button type="button" className="dt-button dt-button-dark" onClick={() => setComposeOpen(true)}>Write your first letter <span aria-hidden="true">↗</span></button>
            <a className="dt-text-action" href="#dt-discover">Take a look around <span aria-hidden="true">↓</span></a>
          </div>
          <span className="dt-hero-footnote">ONE PERSON. A THOUSAND MOMENTS. A LIFETIME OF LETTERS.</span>
        </div>
        <Envelope onWrite={() => setComposeOpen(true)} />
      </section>

      <section id="dt-discover" className="dt-welcome-section" aria-labelledby="welcome-heading">
        <div className="dt-welcome-heading" data-reveal>
          <span className="dt-overline">COME IN. MAKE YOURSELF AT HOME.</span>
          <h2 id="welcome-heading">For all the things<br /><em>you never want to lose.</em></h2>
        </div>
        <div className="dt-welcome-copy" data-reveal>
          <p>Not everything meaningful needs to be posted, shared or announced. Some things are just for the two of you.</p>
          <p>Dear Tomorrow is being made for those things — the words, the firsts, the ordinary afternoons that somehow become everything.</p>
          <Link href="/about" className="dt-text-action">Why I started Dear Tomorrow <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="dt-rooms-section dt-section" aria-labelledby="rooms-heading">
        <div className="dt-rooms-top" data-reveal><span className="dt-overline">THERE IS A PLACE FOR EVERY PART OF YOUR STORY</span><h2 id="rooms-heading">Find your little <em>corner.</em></h2></div>
        <div className="dt-room-links" data-reveal>
          {[
            ['01', 'Letters', 'Words for a moment still to come.', 'letters'],
            ['02', 'Memory Books', 'A lifetime of little chapters.', 'books'],
            ['03', 'Memory Tree', 'A living story, growing with you.', 'memory-tree'],
            ['04', 'Journey Letters', 'A familiar feeling, miles from home.', 'journeys']
          ].map(item => <button type="button" key={item[0]} onClick={() => goTo(item[3] as Section)}>
            <span>{item[0]}</span><strong>{item[1]}</strong><span className="dt-room-description">{item[2]}</span><span className="dt-room-arrow" aria-hidden="true">↗</span>
          </button>)}
        </div>
      </section>

      <section id="letters" className="dt-letters-section dt-section" aria-labelledby="letters-heading">
        <div className="dt-letters-copy" data-reveal><span className="dt-overline">01 / LETTERS FOR LATER</span>
          <h2 id="letters-heading">Some things are better <em>said in a letter.</em></h2>
          <p>For the big days, the hard days, and the ones you don't know are important until you look back.</p>
          <button type="button" className="dt-text-action" onClick={() => setComposeOpen(true)}>Write a little something <span aria-hidden="true">↗</span></button>
        </div>
        <div className="dt-stationery-panel" data-reveal aria-hidden="true">
          <div className="dt-stationery-line"/><div className="dt-stationery-letter"><span>FOR AN ORDINARY DAY</span><strong>Here is a little reminder.</strong><p>You are loved, even from far away.</p><em>with all my heart.</em></div><div className="dt-stationery-shadow"/>
        </div>
      </section>

      <MemoryBook />
      <MemoryTree addSignal={addSignal}/>
      <JourneyLetters />

      <section className="dt-closing" data-reveal aria-labelledby="closing-heading">
        <div className="dt-closing-symbol" aria-hidden="true">✳</div>
        <span className="dt-overline">A PLACE TO COME BACK TO</span>
        <h2 id="closing-heading">However the story unfolds,<br /><em>there's room for it here.</em></h2>
        <p>For now, this is just the beginning. And sometimes that's the loveliest part.</p>
        <button className="dt-button dt-button-cream" type="button" onClick={() => setCreateOpen(true)}>Start with a little something <span aria-hidden="true">↗</span></button>
      </section>
    </main>
    <footer className="dt-footer">
      <div><Link href="/" className="dt-wordmark">Dear <em>Tomorrow.</em></Link><span>Some words are worth waiting for.</span></div>
      <nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><a href="#memory-tree">Memory Tree</a><a href="#books">Memory Books</a></nav>
      <small>© 2026 Dear Tomorrow · An interactive preview, not a live service</small>
    </footer>
    <nav className="dt-bottom-nav" aria-label="Quick mobile navigation">
      <a href="#home"><span aria-hidden="true">⌂</span>Home</a>
      <a href="#books"><span aria-hidden="true">▤</span>Books</a>
      <button type="button" className="dt-bottom-create" onClick={() => setCreateOpen(true)}><span aria-hidden="true">＋</span>Create</button>
      <a href="#memory-tree"><span aria-hidden="true">♧</span>Tree</a>
      <a href="#journeys"><span aria-hidden="true">✈</span>Trips</a>
    </nav>

    {createOpen && <Dialog title="What would you like to make?" onClose={() => setCreateOpen(false)}>
      <span className="dt-overline">THE START OF SOMETHING LOVELY</span>
      <h2 className="dt-dialog-title">What would you like <em>to make?</em></h2>
      <p className="dt-dialog-intro">Just start with one small thing. The rest can come later.</p>
      <div className="dt-create-choices">
        <button type="button" onClick={() => goTo('letters')}><span className="dt-choice-ornament">✉</span><span><strong>Write a letter</strong><small>Something meaningful, in your own words</small></span><span aria-hidden="true">↗</span></button>
        <button type="button" onClick={() => goTo('books')}><span className="dt-choice-ornament">▤</span><span><strong>Make a Memory Book</strong><small>Give your story its very own cover</small></span><span aria-hidden="true">↗</span></button>
        <button type="button" onClick={() => { goTo('memory-tree'); setAddSignal(number => number + 1); }}><span className="dt-choice-ornament">♧</span><span><strong>Add a memory</strong><small>Let a new leaf grow on your tree</small></span><span aria-hidden="true">↗</span></button>
      </div><p className="dt-inline-note">This is a demo. Nothing is shared or stored online.</p>
    </Dialog>}

    {composeOpen && <Dialog title="Write a guest letter" onClose={() => setComposeOpen(false)}>
      <span className="dt-overline">A LETTER, JUST FOR YOU</span>
      <h2 className="dt-dialog-title">Dear <em>someone special,</em></h2>
      <div className="dt-form">
        <label htmlFor="dt-letter-kind">What kind of letter is this?</label>
        <select id="dt-letter-kind" value={letterKind} onChange={event => setLetterKind(event.target.value)}>
          <option>A simple letter</option><option>Open when…</option><option>A future letter (preview only)</option><option>A journey letter (preview only)</option>
        </select>
        <label htmlFor="dt-letter-draft">Your words</label>
        <textarea id="dt-letter-draft" rows={7} maxLength={7000} placeholder="There is something I've been meaning to tell you..." value={draft} onChange={event => setDraft(event.target.value)} />
        {previewLetter && <div className="dt-draft-preview"><span className="dt-overline">{letterKind}</span><p>{draft.trim() || 'Your words will appear here.'}</p><em>With love.</em></div>}
        <div className="dt-dialog-actions"><button type="button" className="dt-button dt-button-dark" onClick={() => setPreviewLetter(value => !value)}>{previewLetter ? 'Return to writing' : 'Preview my letter'} <span aria-hidden="true">↗</span></button>
          <button type="button" className="dt-text-action" onClick={() => setComposeOpen(false)}>Close for now</button></div>
        <p className="dt-inline-note">Guest draft only. Not sent, securely stored or available after refresh.</p>
      </div>
    </Dialog>}
  </div>;
}
