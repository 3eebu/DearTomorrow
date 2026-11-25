'use client';

import Link from 'next/link';
import { AboutNewspaperMontage } from './about-newspaper-montage';
import { StationeryDialog } from './stationery-dialog';
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode, TouchEvent } from 'react';

type WorkspacePage = 'home' | 'memory-tree' | 'letters';
const pages = [
  { chapter: 'I', eyebrow: 'THE VERY BEGINNING', title: 'It started with a hello.', text: 'And somehow, in the middle of all the ordinary days, one small moment became the beginning of everything.', footer: 'The first of many little forevers' },
  { chapter: 'II', eyebrow: 'THE EVERYDAY', title: 'The little things were everything.', text: 'A familiar voice. A long walk. The way a good day gets better when you have someone to tell about it.', footer: 'Somewhere between here and forever' },
  { chapter: 'III', eyebrow: 'THE ADVENTURES', title: 'Every road led us here.', text: 'The places mattered, but the best part was always who I got to share them with.', footer: 'Postcards from our story' },
  { chapter: 'IV', eyebrow: 'TO BE CONTINUED', title: 'There is still so much ahead.', text: 'May we never run out of new beginnings, unlikely adventures, and quiet moments to call our own.', footer: 'With love, for tomorrow' },
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

function JourneyLetters() {
  return <section id="journey-letters" className="dt-journey-section dt-section" aria-labelledby="journey-heading">
    <div className="dt-journey-intro" data-reveal>
      <span className="dt-overline">LETTERS FOR THE JOURNEY</span>
      <h2 id="journey-heading">A little closer,<br /><em>with every mile.</em></h2>
      <p>Six little letters for the distance between goodbye and hello.</p>
      <Link href="/journey-letters" className="dt-button">Explore Journey Letters <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="dt-journey-route" data-reveal>
      <div className="dt-route-city"><strong>LAHORE</strong><span>Where the journey begins</span></div>
      <div className="dt-route-path" aria-hidden="true"><span className="dt-route-track"/><span className="dt-route-plane">✈</span></div>
      <div className="dt-route-city dt-route-end"><strong>LONDON</strong><span>One moment closer</span></div>
    </div>
  </section>;
}

export default function HomeStudio({ page = 'home', tree, letters }: { page?: WorkspacePage; tree?: ReactNode; letters?: ReactNode }) {
  useReveals();
  const isHome = page === 'home';
  const [mobileMenu, setMobileMenu] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  return <div className="dt-app" id="home">
    <a className="dt-skip" href="#dt-main">Skip to the story</a>
    <div className="dt-prototype-banner">{page === 'memory-tree' ? 'A WORK IN PROGRESS · YOUR MEMORIES ARE SAVED ON THIS DEVICE' : page === 'letters' ? 'A WORK IN PROGRESS · YOUR LETTERS ARE SAVED ON THIS DEVICE' : 'A WORK IN PROGRESS · THIS IS A SAFE, UNSAVED DEMO'}</div>
    <header className="dt-header">
      <Link className="dt-wordmark" href="/" aria-label="Dear Tomorrow home">Dear <em>Tomorrow.</em></Link>
      <nav className={'dt-navigation ' + (mobileMenu ? 'dt-nav-open' : '')} aria-label="Primary navigation">
        <Link onClick={() => setMobileMenu(false)} href="/about">Our story</Link>
        <Link onClick={() => setMobileMenu(false)} href="/how-it-works">How it works</Link>
        <Link onClick={() => setMobileMenu(false)} href="/memory-books">Memory Books</Link>
        <Link onClick={() => setMobileMenu(false)} href="/memory-tree">Memory Tree</Link>
        <Link onClick={() => setMobileMenu(false)} href="/letters">Letters</Link>
      </nav>
      <div className="dt-header-right">
        <button className="dt-button dt-header-create" type="button" onClick={() => setCreateOpen(true)}>Create something <span aria-hidden="true">↗</span></button>
        <button className="dt-menu-button" type="button" onClick={() => setMobileMenu(open => !open)} aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenu}>
          <span/><span/>
        </button>
      </div>
    </header>
    <main id="dt-main">
      {isHome && <section className="dt-hero" aria-labelledby="dt-hero-title">
        <div className="dt-hero-light" aria-hidden="true"/>
        <div className="dt-hero-copy" data-reveal>
          <p className="dt-overline">A QUIET LITTLE CORNER OF THE WORLD</p>
          <h1 id="dt-hero-title">Some words<br />are worth<br /><em>waiting for.</em></h1>
          <p className="dt-hero-lead">A place to leave love in the little things. To hold on to your favorite moments. To build a story that feels like home.</p>
          <div className="dt-hero-actions">
          <Link className="dt-button dt-button-dark" href="/letters">Write your first letter <span aria-hidden="true">↗</span></Link>
            <a className="dt-text-action" href="#dt-discover">Take a look around <span aria-hidden="true">↓</span></a>
          </div>
          <span className="dt-hero-footnote">ONE PERSON. A THOUSAND MOMENTS. A LIFETIME OF LETTERS.</span>
        </div>
        <AboutNewspaperMontage variant="home" />
      </section>}

      {isHome && <section id="dt-discover" className="dt-welcome-section" aria-labelledby="welcome-heading">
        <div className="dt-welcome-heading" data-reveal>
          <span className="dt-overline">COME IN. MAKE YOURSELF AT HOME.</span>
          <h2 id="welcome-heading">For all the things<br /><em>you never want to lose.</em></h2>
        </div>
        <div className="dt-welcome-copy" data-reveal>
          <p>Not everything meaningful needs to be posted, shared or announced. Some things are just for the two of you.</p>
          <p>Dear Tomorrow is being made for those things — the words, the firsts, the ordinary afternoons that somehow become everything.</p>
          <Link href="/about" className="dt-text-action">Why I started Dear Tomorrow <span aria-hidden="true">↗</span></Link>
        </div>
      </section>}

      {isHome && <section className="dt-rooms-section dt-section" aria-labelledby="rooms-heading">
        <div className="dt-rooms-top" data-reveal><span className="dt-overline">THERE IS A PLACE FOR EVERY PART OF YOUR STORY</span><h2 id="rooms-heading">Find your little <em>corner.</em></h2></div>
        <div className="dt-room-links" data-reveal>
          {[
            ['01', 'Letters', 'Words for a moment still to come.', '/letters'],
            ['02', 'Memory Books', 'A lifetime of little chapters.', '/memory-books'],
            ['03', 'Memory Tree', 'A living story, growing with you.', '/memory-tree']
          ].map(item => <Link href={item[3]} className="dt-room-link" key={item[0]}>
            <span>{item[0]}</span><strong>{item[1]}</strong><span className="dt-room-description">{item[2]}</span><span className="dt-room-arrow" aria-hidden="true">↗</span>
          </Link>)}
        </div>
      </section>}

      {page === 'letters' && <>{letters}<JourneyLetters /></>}

      {page === 'memory-tree' && tree}

      {isHome && <section className="dt-closing" data-reveal aria-labelledby="closing-heading">
        <div className="dt-closing-symbol" aria-hidden="true">✳</div>
        <span className="dt-overline">A PLACE TO COME BACK TO</span>
        <h2 id="closing-heading">However the story unfolds,<br /><em>there&apos;s room for it here.</em></h2>
        <p>For now, this is just the beginning. And sometimes that&apos;s the loveliest part.</p>
        <button className="dt-button dt-button-cream" type="button" onClick={() => setCreateOpen(true)}>Start with a little something <span aria-hidden="true">↗</span></button>
      </section>}
    </main>
    <footer className="dt-footer">
      <div><Link href="/" className="dt-wordmark">Dear <em>Tomorrow.</em></Link><span>Some words are worth waiting for.</span></div>
      <nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><Link href="/memory-tree">Memory Tree</Link><Link href="/memory-books">Memory Books</Link><Link href="/letters">Letters</Link></nav>
      <small>© 2026 Dear Tomorrow · An interactive preview, not a live service</small>
    </footer>
    {isHome && <nav className="dt-bottom-nav" aria-label="Quick mobile navigation">
      <Link href="/"><span aria-hidden="true">⌂</span>Home</Link>
      <Link href="/memory-books"><span aria-hidden="true">▤</span>Books</Link>
      <button type="button" className="dt-bottom-create" onClick={() => setCreateOpen(true)}><span aria-hidden="true">＋</span>Create</button>
      <Link href="/memory-tree"><span aria-hidden="true">♧</span>Tree</Link>
      <Link href="/letters"><span aria-hidden="true">✉</span>Letters</Link>
    </nav>}

    {createOpen && <StationeryDialog className="dt-create-sheet" closeLabel="Close window" dismissOnBackdrop
      title={<>What would you like <em>to make?</em></>} onClose={() => setCreateOpen(false)}
      eyebrow={<span className="dt-overline">THE START OF SOMETHING LOVELY</span>}>
      <p className="dt-dialog-intro">Just start with one small thing. The rest can come later.</p>
      <div className="dt-create-choices">
        <Link className="dt-relief-card" href="/letters" onClick={() => setCreateOpen(false)}><span className="dt-choice-ornament" aria-hidden="true">✉</span><span><strong>Write a letter</strong><small>Something meaningful, in your own words</small></span><span aria-hidden="true">↗</span></Link>
        <Link className="dt-relief-card" href="/journey-letters" onClick={() => setCreateOpen(false)}><span className="dt-choice-ornament" aria-hidden="true">↗</span><span><strong>Create a journey</strong><small>Six letters for someone on their way</small></span><span aria-hidden="true">↗</span></Link>
        <Link className="dt-relief-card" href="/memory-books" onClick={() => setCreateOpen(false)}><span className="dt-choice-ornament" aria-hidden="true">▤</span><span><strong>Make a Memory Book</strong><small>Give your story its very own cover</small></span><span aria-hidden="true">↗</span></Link>
        <Link className="dt-relief-card" href="/memory-tree" onClick={() => setCreateOpen(false)}><span className="dt-choice-ornament" aria-hidden="true">♧</span><span><strong>Add a memory</strong><small>Let a new leaf grow on your tree</small></span><span aria-hidden="true">↗</span></Link>
      </div><p className="dt-inline-note">This is a demo. Nothing is shared or stored online.</p>
    </StationeryDialog>}

  </div>;
}
