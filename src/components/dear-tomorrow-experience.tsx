"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";

type Moment = {
  id: string;
  title: string;
  date: string;
  category: string;
  story: string;
};

const initialMoments: Moment[] = [
  { id: "hello", title: "The first hello", date: "2025-02-14", category: "Firsts", story: "A conversation that neither of us wanted to end." },
  { id: "date", title: "Our first date", date: "2025-05-02", category: "Little days", story: "We took the long way home and called it an adventure." },
  { id: "journey", title: "A window-seat kind of day", date: "2025-08-18", category: "Journeys", story: "Two cities, one long train ride, and a view we still talk about." },
  { id: "chapter", title: "A new chapter", date: "2026-10-19", category: "Milestones", story: "A small beginning we wanted to remember before it became a big one." },
];

const bookPages = [
  { kicker: "Chapter one · the beginning", title: "The day we got lost on purpose", copy: "We missed the turn, found the sea, and decided the long way was ours now.", caption: "A little further than planned · 18 August 2025" },
  { kicker: "Chapter two · the in-between", title: "A seat by the window", copy: "Somewhere between the last station and the coast, the whole day felt like a note we were writing together.", caption: "The coast, on film · 18 August 2025" },
  { kicker: "Chapter three · small rituals", title: "Coffee, exactly how you like it", copy: "The cup was warm. The table wobbled. You saved the sugar packet anyway.", caption: "Sunday morning · 02 May 2026" },
  { kicker: "Chapter four · still becoming", title: "More pages, whenever we are ready", copy: "A book that can keep changing with us. Add a photograph, a note, or a day worth keeping.", caption: "Your next page is waiting" },
];

const covers = [
  { name: "Merlot", color: "#71394A", light: "#a26970", dark: "#40232f" },
  { name: "Olive", color: "#58664e", light: "#899578", dark: "#374333" },
  { name: "Sienna", color: "#a05d45", light: "#c58b69", dark: "#693b32" },
  { name: "Midnight", color: "#41485b", light: "#747d92", dark: "#282d3c" },
];

const checkpoints = [
  { time: "8:10 am", title: "Before we leave", location: "Lisbon", state: "Ready to open" },
  { time: "9:25 am", title: "When the train pulls away", location: "The first miles", state: "Scheduled preview" },
  { time: "11:40 am", title: "Somewhere between", location: "A window seat", state: "Scheduled preview" },
  { time: "1:05 pm", title: "A little lunch break", location: "On the way", state: "Scheduled preview" },
  { time: "3:30 pm", title: "Almost at the sea", location: "The last stretch", state: "Scheduled preview" },
  { time: "5:15 pm", title: "When you arrive", location: "The coast", state: "Scheduled preview" },
];

const dateLabel = (value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("en", options).format(new Date(`${value}T12:00:00`));

function todayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function calendarKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DearTomorrowExperience() {
  const [createOpen, setCreateOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterWriting, setLetterWriting] = useState(false);
  const [letterDraft, setLetterDraft] = useState("I wanted to leave a little piece of today with you. Open it when the evening gets quiet.\n\nUntil then, keep this close.\n\nAlways,\nA.");
  const [bookTitle, setBookTitle] = useState("The places that became ours");
  const [coverIndex, setCoverIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [turning, setTurning] = useState<"next" | "previous" | "">("");
  const [chapter, setChapter] = useState(1);
  const [photoUrl, setPhotoUrl] = useState("");
  const [moments, setMoments] = useState(initialMoments);
  const [datesView, setDatesView] = useState<"timeline" | "calendar">("timeline");
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [addingMoment, setAddingMoment] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(todayInputValue);
  const [newCategory, setNewCategory] = useState("Little days");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bookTitleRef = useRef<HTMLInputElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const createDialogRef = useRef<HTMLDivElement>(null);

  const sortedMoments = useMemo(() => [...moments].sort((a, b) => a.date.localeCompare(b.date)), [moments]);
  const selectedCover = covers[coverIndex];
  const activePage = bookPages[pageIndex];
  const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const calendarCells = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthMoments = sortedMoments.filter((moment) => {
    const date = new Date(`${moment.date}T12:00:00`);
    return date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth();
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!createOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = createButtonRef.current;
    document.body.style.overflow = "hidden";
    const dialog = createDialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])');
    focusable?.[0]?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
      if (event.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [createOpen]);

  useEffect(() => () => {
    if (photoUrl.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function chooseCreateAction(action: string) {
    setCreateOpen(false);
    window.setTimeout(() => {
      if (action === "letter") {
        setLetterWriting(true);
        setLetterOpen(true);
        scrollTo("letters");
        window.setTimeout(() => document.getElementById("letter-draft")?.focus(), 350);
      } else if (action === "journey") scrollTo("journeys");
      else if (action === "book") {
        scrollTo("books");
        window.setTimeout(() => bookTitleRef.current?.focus(), 450);
      } else if (action === "date") {
        setAddingMoment(true);
        scrollTo("dates");
      } else if (action === "photo") {
        scrollTo("books");
        fileRef.current?.click();
      } else if (action === "chapter") {
        setChapter((current) => current + 1);
        scrollTo("books");
        setToast("A new chapter was added to this local preview.");
      }
    }, 100);
  }

  function turnPage(direction: "next" | "previous") {
    if (turning) return;
    if (direction === "next" && pageIndex === bookPages.length - 1) return;
    if (direction === "previous" && pageIndex === 0) return;
    setTurning(direction);
    window.setTimeout(() => {
      setPageIndex((current) => current + (direction === "next" ? 1 : -1));
      setTurning("");
    }, 430);
  }

  function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setToast("Choose an image under 8 MB for this local preview.");
      event.target.value = "";
      return;
    }
    if (photoUrl.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setToast("Photo added to this preview in your browser only.");
    event.target.value = "";
  }

  function addMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || !newDate) return;
    const created: Moment = {
      id: `demo-${Date.now()}`,
      title,
      date: newDate,
      category: newCategory,
      story: "A new little moment, added just for this preview. Add a note about what made it yours.",
    };
    setMoments((current) => [...current, created]);
    const parsed = new Date(`${newDate}T12:00:00`);
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setSelectedMoment(created.id);
    setNewTitle("");
    setAddingMoment(false);
    setToast("Your sample moment is now in the timeline and calendar.");
  }

  function moveCalendar(direction: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setSelectedMoment(null);
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to the story</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href="#top" aria-label="Dear Tomorrow home">
            <span className="wordmark-mark" aria-hidden="true">d.</span>
            <span>Dear Tomorrow<span className="wordmark-period">.</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#journeys">The little things</a>
          </nav>
          <div className="header-actions">
            <Link className="sign-in-link" href="/login">Sign in</Link>
            <button className="button button-primary header-create" type="button" ref={createButtonRef} onClick={() => setCreateOpen(true)}>
              Create <Icon name="plus" />
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero section-wrap" id="top" aria-labelledby="hero-title">
          <div className="hero-copy" data-reveal>
            <span className="eyebrow"><span className="eyebrow-dot" /> A little space for the words that stay</span>
            <h1 id="hero-title">Some words are <em>worth waiting for.</em></h1>
            <p className="hero-intro">Letters for the moments you can’t be there. Memories for all the moments you are.</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => { setLetterWriting(true); setLetterOpen(true); scrollTo("letters"); }}>
                Write your first letter <Icon name="arrow" />
              </button>
              <a className="text-link" href="#how-it-works">Explore the story <Icon name="arrow-diagonal" /></a>
            </div>
            <div className="hero-note"><Icon name="spark" /><span>A private little world, made one moment at a time.</span></div>
          </div>
          <div className="hero-visual" data-reveal>
            <Image className="hero-art" src="/media/letter-ritual.webp" alt="A burgundy envelope and cream letter resting on handmade paper" fill unoptimized priority sizes="(max-width: 760px) calc(100vw - 40px), 52vw" />
            <div className={`hero-letter-card ${letterOpen ? "hero-letter-card-open" : ""}`}>
              {letterOpen ? (
                <div className="hero-letter-reveal">
                  <span className="eyebrow">A note for another day</span>
                  <p>“I hope the light found you today. If it didn’t, I saved a little here for later.”</p>
                  <button className="quiet-button" type="button" onClick={() => { setLetterOpen(false); setLetterWriting(false); }}>Fold it away <Icon name="close" /></button>
                </div>
              ) : (
                <button className="hero-open-button" type="button" onClick={() => { setLetterOpen(true); setLetterWriting(false); }} aria-label="Open a fictional letter preview">
                  <span className="mini-seal" aria-hidden="true">d</span>
                  <span>There’s a letter<br />for another day</span>
                  <span className="circle-arrow"><Icon name="arrow" /></span>
                </button>
              )}
            </div>
            <div className="art-caption"><span className="caption-rule" /> Made for the moments in between</div>
            <span className="floating-petal petal-one" aria-hidden="true">✳</span>
            <span className="floating-petal petal-two" aria-hidden="true">✳</span>
          </div>
          <div className="hero-index" aria-hidden="true"><span>01</span><span className="index-line" /><span>07</span></div>
        </section>

        <div className="marquee-band" aria-label="One person. A thousand moments. A lifetime of letters.">
          <span>One person</span><i>✳</i><span>A thousand moments</span><i>✳</i><span>A lifetime of letters</span><i>✳</i>
        </div>

        <section className="story-intro section-wrap" id="how-it-works" aria-labelledby="story-title">
          <div className="intro-marker" data-reveal><span className="eyebrow">A world you make together</span><span className="handwritten">Yours, over time.</span></div>
          <div className="intro-copy" data-reveal>
            <h2 id="story-title">Not another place to talk.<br /><em>A place to keep.</em></h2>
            <p>Dear Tomorrow is a private world for two people who choose each other: letters that wait, books that grow, and little moments that find their way back to the story.</p>
            <a className="text-link" href="#letters">Take a little look <Icon name="arrow" /></a>
          </div>
        </section>

        <section className="letter-scene full-bleed" id="letters" aria-labelledby="letter-title">
          <div className="letter-scene-inner section-wrap">
            <div className="scene-copy" data-reveal>
              <span className="eyebrow"><span className="scene-number">01</span> Our Letters</span>
              <h2 id="letter-title">A feeling, <em>folded gently.</em></h2>
              <p>Write now. Let the right words arrive when they mean the most. A birthday, a long trip, a difficult day, or no reason at all.</p>
              <ul className="small-list">
                <li>For a moment you’re not there</li>
                <li>For the day they need it</li>
                <li>For whenever you want to say “I’m here”</li>
              </ul>
              <div className="scene-footnote"><span className="fine-rule" /> Fictional demo · Nothing here is sent or saved</div>
            </div>
            <div className={`letter-table ${letterOpen ? "letter-table-open" : ""}`} data-reveal>
              <Image src="/media/letter-ritual.webp" alt="Original still-life artwork of a burgundy envelope and a cream note" fill unoptimized sizes="(max-width: 760px) calc(100vw - 40px), 60vw" />
              <div className="table-wash" />
              <div className={`unfolding-note ${letterOpen ? "unfolding-note-open" : ""}`}>
                {!letterOpen ? (
                  <button className="open-letter-control" type="button" onClick={() => { setLetterOpen(true); setLetterWriting(false); }}>
                    <span className="mini-seal" aria-hidden="true">d</span><span>Open this letter</span><Icon name="arrow" />
                  </button>
                ) : letterWriting ? (
                  <div className="letter-compose-demo">
                    <div className="note-topline"><span>Only a preview</span><button className="icon-button" aria-label="Close letter draft" type="button" onClick={() => { setLetterOpen(false); setLetterWriting(false); }}><Icon name="close" /></button></div>
                    <label htmlFor="letter-draft">A few words for later</label>
                    <textarea id="letter-draft" value={letterDraft} onChange={(event) => setLetterDraft(event.target.value)} rows={6} maxLength={500} />
                    <span className="note-count">{letterDraft.length}/500 · stays in this page only</span>
                  </div>
                ) : (
                  <div className="letter-reading-demo">
                    <span className="eyebrow">When the evening gets quiet</span>
                    <p>“I wanted to leave a little piece of today with you. Keep this close, and remember I’m always finding my way back.”</p>
                    <span className="letter-signature">Always, A.</span>
                    <div className="reading-actions"><button className="quiet-button" type="button" onClick={() => setLetterWriting(true)}>Make a little note <Icon name="edit" /></button><button className="quiet-button" type="button" onClick={() => setLetterOpen(false)}>Fold away <Icon name="close" /></button></div>
                  </div>
                )}
              </div>
              <span className="photo-note">PAPER NO. 01<br />FOR LATER, WITH LOVE</span>
            </div>
          </div>
          <div className="letter-ornament" aria-hidden="true">for<br />you</div>
        </section>

        <section className="journey-scene section-wrap" id="journeys" aria-labelledby="journey-title">
          <div className="journey-heading" data-reveal>
            <div><span className="eyebrow"><span className="scene-number">02</span> Our Journeys</span><h2 id="journey-title">A little note at <em>every mile.</em></h2></div>
            <p>Six small letters for one long day. A route drawn from where you leave to where you’re missed.</p>
          </div>
          <div className="journey-card" data-reveal>
            <div className="route-meta"><div><span className="eyebrow">A sample day together</span><strong>Lisbon <span>to</span> the coast</strong></div><span className="journey-pill"><Icon name="train" /> One long train ride</span></div>
            <div className="journey-map" aria-label="Decorative route from Lisbon to the coast">
              <svg viewBox="0 0 900 180" role="img" aria-labelledby="route-desc" preserveAspectRatio="none">
                <title id="route-desc">A dotted burgundy route connecting six letter checkpoints</title>
                <path className="route-base" d="M35 100 C130 100 120 43 205 58 S320 141 405 96 S525 38 600 65 S715 153 865 80" />
                <path className="route-draw" d="M35 100 C130 100 120 43 205 58 S320 141 405 96 S525 38 600 65 S715 153 865 80" />
                <path className="route-branch" d="M405 96 C430 39 461 29 495 27" />
              </svg>
              {checkpoints.map((checkpoint, index) => <span key={checkpoint.title} className={`route-stop route-stop-${index + 1}`} aria-hidden="true"><span>{index + 1}</span></span>)}
              <span className="route-train" aria-hidden="true">✦</span>
              <span className="route-end route-start">LISBON</span><span className="route-end route-finish">THE SEA</span>
            </div>
            <div className="checkpoint-grid">
              {checkpoints.map((checkpoint, index) => (
                <button className={`checkpoint ${index === 0 ? "checkpoint-ready" : "checkpoint-locked"}`} type="button" key={checkpoint.title} onClick={() => {
                  if (index === 0) { setLetterOpen(true); setLetterWriting(false); scrollTo("letters"); }
                  else setToast("This checkpoint is only a schedule preview. Real online release is part of a later phase.");
                }} aria-label={`${checkpoint.title}, ${checkpoint.time}, ${checkpoint.state}`}>
                  <span className="checkpoint-top"><span>{String(index + 1).padStart(2, "0")}</span><span className="checkpoint-lock">{index === 0 ? "Open" : "Sealed"}</span></span>
                  <span className="checkpoint-envelope" aria-hidden="true"><span className="envelope-flap" /><span className="envelope-seal">{index === 0 ? "d" : "·"}</span></span>
                  <strong>{checkpoint.title}</strong><span className="checkpoint-place">{checkpoint.time} <i>·</i> {checkpoint.location}</span>
                </button>
              ))}
            </div>
            <p className="online-note"><Icon name="info" /> Website letters open online at their scheduled time. This preview does not send, notify, or unlock real messages; offline travel access belongs to a future native app.</p>
          </div>
        </section>

        <section className="book-scene full-bleed" id="books" aria-labelledby="book-title">
          <div className="book-scene-inner section-wrap">
            <div className="book-heading" data-reveal>
              <span className="eyebrow"><span className="scene-number">03</span> Our Memory Books</span>
              <h2 id="book-title">A life, collected <em>by hand.</em></h2>
              <p>Every page can start with a name, a place, or something only the two of you understand. This one can be renamed to anything.</p>
            </div>
            <div className="book-controls" data-reveal>
              <div className="book-title-control">
                <label htmlFor="book-title-edit">Name this book</label>
                <input id="book-title-edit" ref={bookTitleRef} value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} maxLength={80} aria-describedby="book-preview-note" />
                <span id="book-preview-note" className="field-note">Updates on the cover right away · local preview</span>
              </div>
              <fieldset className="cover-choice">
                <legend>Choose a cover color</legend>
                <div>{covers.map((cover, index) => <button key={cover.name} type="button" className={`cover-swatch ${index === coverIndex ? "cover-swatch-selected" : ""}`} style={{ "--swatch": cover.color } as CSSProperties} onClick={() => setCoverIndex(index)} aria-label={`${cover.name} book cover`} aria-pressed={index === coverIndex}><span /></button>)}</div>
              </fieldset>
              <label className="upload-photo button button-secondary" htmlFor="book-photo-upload"><Icon name="photo" /> Add a local photo</label>
              <input className="visually-hidden" id="book-photo-upload" ref={fileRef} type="file" accept="image/*" onChange={onPhotoSelected} aria-describedby="photo-note" />
              <span className="field-note" id="photo-note">Under 8 MB · stays in this browser only</span>
            </div>

            <div className="book-showcase" data-reveal>
              <div className="book-cover-stage">
                <span className="book-stage-label">The cover, as you make it</span>
                <div className="physical-cover" style={{ "--cover": selectedCover.color, "--cover-light": selectedCover.light, "--cover-dark": selectedCover.dark } as CSSProperties}>
                  <div className="cover-spine" aria-hidden="true" />
                  <div className="cover-front"><span className="cover-emboss">d.</span><span className="cover-rule" /><strong>{bookTitle || "Your book title"}</strong><span className="cover-subtitle">a collection of little things</span><span className="cover-foil" aria-hidden="true">✳</span></div>
                </div>
                <span className="cover-caption"><span className="brass-dot" /> {selectedCover.name} linen · embossed with care</span>
              </div>
              <div className="book-reader">
                <div className="book-reader-top"><span className="book-stamp"><Icon name="book" /> SAMPLE BOOK</span><span className="chapter-label">Chapter {String(chapter).padStart(2, "0")} · {pageIndex + 1} of {bookPages.length}</span></div>
                <div className={`book-spread ${turning ? `book-turn-${turning}` : ""}`} aria-live="polite">
                  <Image className="book-spread-art" src="/media/memory-book-spread.webp" alt="An open burgundy memory book with handmade ivory pages and pressed flowers" fill unoptimized sizes="(max-width: 760px) 200vw, 70vw" />
                  <div className="book-paper-shadow" aria-hidden="true" />
                  <div className="book-copy book-copy-left">
                    <span className="page-kicker">The story we keep</span>
                    <p className="book-left-line">“Some days are so small<br />you almost miss how much<br />they mean.”</p>
                    <span className="page-flower" aria-hidden="true">✿</span>
                    <span className="book-page-number">0{pageIndex * 2 + 1}</span>
                  </div>
                  <div className="book-copy book-copy-right">
                    <span className="page-kicker">{activePage.kicker}</span>
                    <h3>{activePage.title}</h3>
                    <p>{activePage.copy}</p>
                    <figure className="memory-photo-frame">
                      <Image src={photoUrl || "/media/coast-memory.webp"} alt={photoUrl ? "Your selected local memory" : "Fictional coastal train-view photograph for the sample book"} width={900} height={600} unoptimized />
                      <figcaption>{activePage.caption}</figcaption>
                    </figure>
                    <span className="book-page-number book-page-number-right">0{pageIndex * 2 + 2}</span>
                  </div>
                  <div className="book-copy book-copy-mobile">
                    <span className="page-kicker">{activePage.kicker}</span>
                    <h3>{activePage.title}</h3>
                    <p>{activePage.copy}</p>
                    <figure className="memory-photo-frame">
                      <Image src={photoUrl || "/media/coast-memory.webp"} alt={photoUrl ? "Your selected local memory" : "Fictional coastal train-view photograph for the sample book"} width={900} height={600} unoptimized />
                      <figcaption>{activePage.caption}</figcaption>
                    </figure>
                    <span className="book-page-number">0{pageIndex + 1}</span>
                  </div>
                  <span className="page-turn-shadow" aria-hidden="true" />
                </div>
                <div className="book-reader-controls">
                  <button className="reader-arrow" type="button" onClick={() => turnPage("previous")} disabled={pageIndex === 0 || Boolean(turning)} aria-label="Previous page"><Icon name="chevron-left" /></button>
                  <span>Turn a page to keep going</span>
                  <button className="reader-arrow" type="button" onClick={() => turnPage("next")} disabled={pageIndex === bookPages.length - 1 || Boolean(turning)} aria-label="Next page"><Icon name="chevron-right" /></button>
                </div>
              </div>
            </div>
          </div>
          <div className="book-margin-note" aria-hidden="true">little things, kept close</div>
        </section>

        <section className="dates-scene section-wrap" id="dates" aria-labelledby="dates-title">
          <div className="dates-heading" data-reveal>
            <div><span className="eyebrow"><span className="scene-number">04</span> Our Dates</span><h2 id="dates-title">A story with <em>room to grow.</em></h2></div>
            <p>One date becomes a branch. A branch becomes a life you can follow back through.</p>
          </div>
          <div className="dates-toolbar" data-reveal>
            <div className="view-switch" role="group" aria-label="Choose timeline or calendar view">
              <button type="button" onClick={() => setDatesView("timeline")} aria-pressed={datesView === "timeline"}>Timeline <Icon name="timeline" /></button>
              <button type="button" onClick={() => setDatesView("calendar")} aria-pressed={datesView === "calendar"}>Calendar <Icon name="calendar" /></button>
              <span className={`switch-thumb ${datesView === "calendar" ? "switch-thumb-right" : ""}`} aria-hidden="true" />
            </div>
            <button className="button button-outline add-moment" type="button" onClick={() => setAddingMoment((current) => !current)}><Icon name="plus" /> Add a little moment</button>
          </div>
          {addingMoment && <form className="moment-form" onSubmit={addMoment}>
            <div className="moment-form-heading"><div><span className="eyebrow">A new leaf on the story</span><h3>Add a sample moment</h3></div><button type="button" className="icon-button" aria-label="Close add moment form" onClick={() => setAddingMoment(false)}><Icon name="close" /></button></div>
            <label>What should you remember?<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required maxLength={70} placeholder="A name only the two of you know" /></label>
            <div className="moment-form-row"><label>When?<input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} required /></label><label>Kind of moment<select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}><option>Little days</option><option>Firsts</option><option>Journeys</option><option>Milestones</option></select></label></div>
            <button className="button button-primary" type="submit">Add to our story <Icon name="arrow" /></button>
            <span className="field-note">This sample only lives while this page is open.</span>
          </form>}
          {datesView === "timeline" ? (
            <div className="timeline-wrap" data-reveal>
              <div className="timeline-year-rail"><span>2025</span><span className="year-rail-line" /><span>2026</span><span className="year-rail-line" /><span>2026</span></div>
              <div className="timeline-canvas">
                <svg className="timeline-branches" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
                  <path className="timeline-trunk" d="M50 0 C54 90 47 160 51 250 S55 410 50 510 S46 690 51 790 S54 930 50 1000" />
                  {sortedMoments.map((moment, index) => {
                    const y = ((index + 0.5) / sortedMoments.length) * 1000;
                    const side = index % 2 === 0 ? -1 : 1;
                    const end = side < 0 ? 23 : 77;
                    return <path key={`branch-${moment.id}`} className="timeline-branch" style={{ "--branch-delay": `${index * 140}ms` } as CSSProperties} d={`M50 ${y} C${50 + side * 5} ${y - 15} ${end - side * 7} ${y + 18} ${end} ${y + 4}`} />;
                  })}
                </svg>
                <ol className="timeline-list">
                  {sortedMoments.map((moment, index) => (
                    <li key={moment.id} className={`timeline-item ${index % 2 === 0 ? "timeline-left" : "timeline-right"}`}>
                      <span className="timeline-node" aria-hidden="true"><span>{index === 0 ? "✳" : "·"}</span></span>
                      <div className="timeline-card-wrap">
                        <button className={`timeline-card ${selectedMoment === moment.id ? "timeline-card-selected" : ""}`} type="button" onClick={() => setSelectedMoment((current) => current === moment.id ? null : moment.id)} aria-expanded={selectedMoment === moment.id}>
                          <span className="timeline-card-date">{dateLabel(moment.date, { day: "2-digit", month: "short", year: "numeric" })}</span>
                          <strong>{moment.title}</strong>
                          <span className="timeline-card-category"><i /> {moment.category}</span>
                          {selectedMoment === moment.id && <span className="timeline-card-story">{moment.story}<span className="linked-memory"><Icon name="book" /> A page to remember it by</span></span>}
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="timeline-endnote"><span className="endnote-flower">✳</span><span>And the story keeps growing…</span></div>
            </div>
          ) : (
            <div className="calendar-panel" data-reveal>
              <div className="calendar-main">
                <div className="calendar-heading"><div><span className="eyebrow">A month at a time</span><h3>{monthName}</h3></div><div className="calendar-stepper"><button type="button" aria-label="Previous month" onClick={() => moveCalendar(-1)}><Icon name="chevron-left" /></button><button type="button" aria-label="Next month" onClick={() => moveCalendar(1)}><Icon name="chevron-right" /></button></div></div>
                <div className="calendar-grid" role="group" aria-label={monthName}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span className="calendar-weekday" key={`${day}-${index}`}>{day}</span>)}
                  {calendarCells.map((day, index) => {
                    if (!day) return <span className="calendar-empty" aria-hidden="true" key={`empty-${index}`} />;
                    const key = calendarKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const events = monthMoments.filter((moment) => moment.date === key);
                    return <button className={`calendar-day ${events.length ? "calendar-day-event" : ""} ${selectedMoment && events.some((event) => event.id === selectedMoment) ? "calendar-day-selected" : ""}`} aria-label={`${dateLabel(key, { weekday: "long", day: "numeric", month: "long" })}${events.length ? `, ${events.map((event) => event.title).join(", ")}` : ""}`} key={key} onClick={() => setSelectedMoment(events[0]?.id ?? null)}>
                      <span>{day}</span>{events.length > 0 && <i aria-hidden="true" />}
                    </button>;
                  })}
                </div>
                <div className="calendar-legend"><span><i /> A moment to remember</span><span>{monthMoments.length} {monthMoments.length === 1 ? "moment" : "moments"} this month</span></div>
              </div>
              <aside className="calendar-moments" aria-live="polite"><span className="eyebrow">This month, in your story</span>
                {monthMoments.length === 0 ? <p className="calendar-empty-copy">A quiet month. Add a little moment whenever you’re ready.</p> : monthMoments.map((moment) => <button key={moment.id} type="button" className={`calendar-event ${selectedMoment === moment.id ? "calendar-event-active" : ""}`} onClick={() => setSelectedMoment(moment.id)}><span>{dateLabel(moment.date, { day: "numeric", month: "short" })}</span><strong>{moment.title}</strong><small>{moment.category}</small></button>)}
              </aside>
            </div>
          )}
          <p className="dates-demo-note"><Icon name="info" /> Timeline and calendar use the same fictional sample moments. Additions stay in this page and reset on reload.</p>
        </section>

        <section className="bond-scene full-bleed" id="privacy" aria-labelledby="bond-title">
          <div className="bond-scene-inner section-wrap" data-reveal>
            <div className="bond-emblem" aria-hidden="true"><span>you</span><i>·</i><span>me</span></div>
            <div className="bond-copy"><span className="eyebrow">Our Bond · one chosen person</span><h2 id="bond-title">A world for <em>the two of you.</em></h2><p>No audience to perform for. No public feed. Just a shared place you build together, with the freedom to leave when life asks you to.</p><div className="privacy-promise"><Icon name="lock" /><span>This preview uses fictional content only. Accounts, invitations, and privacy controls will be built and reviewed before real memories can be stored.</span></div></div>
            <div className="bond-side-note"><span className="fine-rule" /><span>Made for two<br />kept with care</span></div>
          </div>
        </section>

        <section className="closing-scene section-wrap" aria-labelledby="closing-title" data-reveal>
          <span className="closing-ornament" aria-hidden="true">✳</span>
          <span className="eyebrow">Whenever you’re ready</span>
          <h2 id="closing-title">The next page is <em>yours.</em></h2>
          <p>Start with a letter. Or stay awhile and turn a few pages.</p>
          <button className="button button-primary closing-button" type="button" onClick={() => setCreateOpen(true)}>Create a little something <Icon name="arrow" /></button>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main section-wrap">
          <div><Link className="wordmark footer-wordmark" href="#top"><span className="wordmark-mark" aria-hidden="true">d.</span><span>Dear Tomorrow<span className="wordmark-period">.</span></span></Link><p>Some words are worth waiting for.</p></div>
          <nav className="footer-nav" aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy preview</a><Link href="/login">Sign in</Link><a href="#top">Back to the beginning ↑</a></nav>
        </div>
        <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} Dear Tomorrow · A project preview</span><span>No real accounts or letters yet. Made with care.</span></div>
      </footer>

      <nav className="mobile-dock" aria-label="Quick navigation">
        <a href="#letters"><Icon name="letter" /><span>Letters</span></a>
        <a href="#books"><Icon name="book" /><span>Books</span></a>
        <button type="button" className="dock-create" onClick={() => setCreateOpen(true)} aria-label="Create"><Icon name="plus" /></button>
        <a href="#dates"><Icon name="timeline" /><span>Our Dates</span></a>
        <a href="#journeys"><Icon name="journey" /><span>Journeys</span></a>
      </nav>

      {createOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
        <div className="create-sheet" role="dialog" aria-modal="true" aria-labelledby="create-title" ref={createDialogRef}>
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-header"><div><span className="eyebrow">A place to begin</span><h2 id="create-title">What would you like to <em>make?</em></h2></div><button className="icon-button sheet-close" type="button" aria-label="Close create menu" onClick={() => setCreateOpen(false)}><Icon name="close" /></button></div>
          <div className="create-options">
            <button type="button" onClick={() => chooseCreateAction("letter")}><span className="option-icon option-letter"><Icon name="letter" /></span><span><strong>Write a letter</strong><small>Leave a little note for later</small></span><Icon name="arrow" /></button>
            <button type="button" onClick={() => chooseCreateAction("journey")}><span className="option-icon option-journey"><Icon name="journey" /></span><span><strong>Plan Journey Letters</strong><small>Send a note at every mile</small></span><Icon name="arrow" /></button>
            <button type="button" onClick={() => chooseCreateAction("book")}><span className="option-icon option-book"><Icon name="book" /></span><span><strong>Create a Memory Book</strong><small>Name it anything; make it yours</small></span><Icon name="arrow" /></button>
            <button type="button" onClick={() => chooseCreateAction("date")}><span className="option-icon option-date"><Icon name="timeline" /></span><span><strong>Add a memory or date</strong><small>Let your story grow a new branch</small></span><Icon name="arrow" /></button>
            <button type="button" onClick={() => chooseCreateAction("chapter")}><span className="option-icon option-chapter"><Icon name="chapter" /></span><span><strong>Start a chapter</strong><small>Add a new section to this sample book</small></span><Icon name="arrow" /></button>
            <button type="button" onClick={() => chooseCreateAction("photo")}><span className="option-icon option-photo"><Icon name="photo" /></span><span><strong>Add a photo</strong><small>Place one from this device in the preview</small></span><Icon name="arrow" /></button>
            <button type="button" className="option-later" disabled aria-describedby="surprise-note"><span className="option-icon option-surprise"><Icon name="spark" /></span><span><strong>Prepare a surprise</strong><small id="surprise-note">A future flow, not part of this preview yet</small></span><span className="coming-soon">Later</span></button>
          </div>
          <p className="sheet-note"><Icon name="info" /> Demo choices change this page only. Nothing is saved or sent.</p>
        </div>
      </div>}

      {toast && <div className="toast-message" role="status"><Icon name="spark" /> {toast}</div>}
    </>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="M3.5 10h12" /><path d="m10.5 5 5 5-5 5" /></>,
    "arrow-diagonal": <><path d="M5 14 14 5" /><path d="M6 5h8v8" /></>,
    plus: <><path d="M10 3.5v13" /><path d="M3.5 10h13" /></>,
    close: <><path d="m5 5 10 10" /><path d="M15 5 5 15" /></>,
    edit: <><path d="m4 13.5-.7 3.2 3.2-.7L16 6.5 13.5 4z" /><path d="m11.8 5.7 2.5 2.5" /></>,
    spark: <><path d="m10 2 1.7 5.1L17 9l-5.3 1.8L10 16l-1.7-5.2L3 9l5.3-1.9z" /><path d="m16 13 .8 2.2L19 16l-2.2.8L16 19l-.8-2.2L13 16l2.2-.8z" /></>,
    letter: <><rect x="2.5" y="4" width="15" height="12" rx="1.5" /><path d="m3.5 5 6.5 5.5L16.5 5" /></>,
    book: <><path d="M3 4.5c2.9-.8 5.3-.4 7 1.2v11c-1.7-1.6-4.1-2-7-1.2z" /><path d="M17 4.5c-2.9-.8-5.3-.4-7 1.2v11c1.7-1.6 4.1-2 7-1.2z" /></>,
    timeline: <><path d="M5 3v14" /><circle cx="5" cy="5" r="1.6" /><circle cx="5" cy="10" r="1.6" /><circle cx="5" cy="15" r="1.6" /><path d="M7 10h7l2-2" /></>,
    calendar: <><rect x="3" y="4.5" width="14" height="12" rx="1.5" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" /></>,
    journey: <><path d="M3 14.8 8.8 12l2-6.7c.3-.9 1.7-1 2 0l1.1 4.8 3.2-1.6c.8-.4 1.6.5 1 1.2L14 14.5l-5.8 2c-.8.3-1.5-.5-1.2-1.2z" /><path d="M3 18h5" /></>,
    train: <><rect x="5" y="2.8" width="10" height="12.5" rx="2" /><path d="M7.5 15.5 6 18m8-2.5 1.5 2.5M7.5 6h5M8 11h.1m3.8 0h.1" /></>,
    info: <><circle cx="10" cy="10" r="7.3" /><path d="M10 9v4.3M10 6.3h.1" /></>,
    photo: <><rect x="2.7" y="3.5" width="14.6" height="13" rx="1.5" /><circle cx="7" cy="8" r="1.4" /><path d="m4 14 4-3.8 2.5 2 2.1-2.1 3.4 4" /></>,
    chapter: <><path d="M4 3.5h8l4 4v9H4z" /><path d="M12 3.5v4h4M7 11h6M7 14h6" /></>,
    lock: <><rect x="4" y="8.5" width="12" height="9" rx="1.5" /><path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2.5" /></>,
    "chevron-left": <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />,
    "chevron-right": <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />,
  };
  return <svg className="icon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{paths[name] ?? paths.spark}</svg>;
}
