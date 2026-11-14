"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./about-newspaper-montage.module.css";

// These are invented print layouts, never reproductions or claims of press coverage.
const clippings = [
  { publication: "The Keepsake Review", edition: "An edition for the everyday", title: "Dear Tomorrow", deck: "On the quiet art of holding on.", format: "folio", x: 3, y: 13, w: 46, r: -14, z: 1, delay: .08, from: [-70, -100, -22], spill: -21, mobile: [4, 9, 52, -12] },
  { publication: "The Sunday Edition", edition: "Words • Moments • Everything between", title: "DEAR TOMORROW", deck: "Some words are worth waiting for.", format: "sunday", x: 40, y: 5, w: 49, r: 10, z: 2, delay: .5, from: [65, -110, 19], mobile: [44, 4, 52, 9] },
  { publication: "Notes on a life", edition: "A small, occasional journal", title: "Dear Tomorrow.", deck: "The ordinary becomes the unforgettable.", format: "column", x: 73, y: 23, w: 27, r: 13, z: 3, delay: .86, from: [110, 10, 26] },
  { publication: "A Journal of Affection", edition: "Collected correspondence / 01", title: "Dear Tomorrow", deck: "For all the things we mean to say.", format: "journal", x: -4, y: 40, w: 43, r: -9, z: 4, delay: 1.12, from: [-120, 15, -20], spill: -18, mediumSpill: -5 },
  { publication: "The Art of Remembering", edition: "A study in the things that stay", title: "Dear Tomorrow.", deck: "A little place for a life well loved.", format: "review", x: 45, y: 42, w: 51, r: -12, z: 5, delay: 1.47, from: [80, 110, -19], mobile: [48, 40, 50, 11] },
  { publication: "From the archive", edition: "Keep this close", title: "DEAR TOMORROW", deck: "A story still being written.", format: "ink", x: 5, y: 73, w: 52, r: -7, z: 6, delay: 1.8, from: [-60, 110, -15], mobile: [1, 75, 65, -7] },
  { publication: "The Daily Journal", edition: "A fictional edition · No. 001", title: "DEAR TOMORROW", deck: "A place for the words we never want to lose.", format: "broadsheet", x: 17, y: 17, w: 60, r: -7, z: 10, delay: 2.06, from: [-100, -40, -16], spill: -3, mobile: [13, 23, 75, -6] },
  { publication: "The intimate issue", edition: "On love & the passing of time", title: "Dear Tomorrow", deck: "To remember is to love something twice.", format: "magazine", x: 57, y: 35, w: 43, r: 14, z: 8, delay: 2.45, from: [120, -20, 25] },
  { publication: "The Little Chronicle", edition: "For a slower kind of morning", title: "Dear Tomorrow", deck: "An ordinary day. An extraordinary life.", format: "chronicle", x: -1, y: 46, w: 40, r: -13, z: 9, delay: 2.72, from: [-110, 65, -24], spill: -21 },
  { publication: "Letters to the future", edition: "Collected words / Volume one", title: "Dear Tomorrow", deck: "One name. A thousand little moments.", format: "letters", x: 38, y: 36, w: 45, r: -3, z: 7, delay: 3.02, from: [75, 90, 10] },
  { publication: "A Quiet Quarterly", edition: "The words worth keeping", title: "Dear Tomorrow", deck: "An unfinished story.", format: "quarterly", x: 47, y: -5, w: 35, r: -5, z: 0, delay: 3.24, from: [0, -120, -14] },
  { publication: "An archive of affection", edition: "A typographic collection", title: "Dear Tomorrow", deck: "For the things that stay.", format: "cutout", x: 7, y: 3, w: 52, r: -5, z: 11, delay: 3.46, from: [-60, -100, -12], spill: -12, mobile: [7, -2, 66, -5] },
  { publication: "The Memory Ledger", edition: "Little things, carefully kept", title: "DEAR TOMORROW", deck: "Make a little room for what matters.", format: "ledger", x: 69, y: 54, w: 32, r: 9, z: 6, delay: 3.7, from: [110, 70, 21] },
  { publication: "Between the lines", edition: "A note for you", title: "Dear Tomorrow.", deck: "Always, yours.", format: "note", x: 1, y: 48, w: 32, r: 7, z: 12, delay: 3.95, from: [-90, 40, 16], spill: -21, mobile: [-4, 53, 47, -10] },
  { publication: "The things we keep", edition: "An imagined archive", title: "DEAR TOMORROW", deck: "Every story starts somewhere.", format: "strip", x: 30, y: 84, w: 64, r: 4, z: 13, delay: 4.18, from: [35, 110, 12] },
  { publication: "Archives of Affection", edition: "The collected edition", title: "Dear Tomorrow.", deck: "For the things that stay.", format: "affection", x: 36, y: 43, w: 55, r: 8, z: 14, delay: 4.52, from: [100, 85, 19], mobile: [27, 49, 65, 7] },
];

function NewspaperClipping({ clipping, index }: { clipping: typeof clippings[number]; index: number }) {
  const mobile = clipping.mobile;
  const variables = {
    "--paper-x": `${clipping.x}%`, "--paper-y": `${clipping.y}%`, "--paper-width": `${clipping.w}%`,
    "--paper-rotation": `${clipping.r}deg`, "--paper-z": clipping.z, "--paper-spill": `${clipping.spill ?? 0}%`, "--paper-spill-medium": `${clipping.mediumSpill ?? 0}%`,
    "--arrival-delay": `${clipping.delay}s`, "--arrival-duration": `${1.1 + index % 3 * .12}s`,
    "--arrival-easing": ["cubic-bezier(.18,.75,.24,1)", "cubic-bezier(.16,.85,.3,1)", "cubic-bezier(.22,.68,.2,1)"][index % 3],
    "--arrival-x": `${clipping.from[0]}%`, "--arrival-y": `${clipping.from[1]}%`, "--arrival-rotation": `${clipping.from[2]}deg`,
    ...(mobile ? { "--mobile-x": `${mobile[0]}%`, "--mobile-y": `${mobile[1]}%`, "--mobile-width": `${mobile[2]}%`, "--mobile-rotation": `${mobile[3]}deg` } : {}),
  } as CSSProperties;

  return <div className={`${styles.paper} ${styles[clipping.format]} ${mobile ? styles.mobilePaper : ""}`} style={variables}>
    <div className={styles.sheet}>
      <div className={styles.edition}><span>DT / {String(index + 1).padStart(2, "0")}</span><span>Words to keep</span></div>
      <span className={styles.publication}>{clipping.publication}</span>
      <span className={styles.issue}>{clipping.edition}</span>
      <span className={styles.headline}>{clipping.title}</span>
      <span className={styles.deck}>{clipping.deck}</span>
      <div className={styles.article}>
        <p>There are things we keep simply because they take us back. A sentence in a letter. The date in the margin. A little reminder of how it all began.</p>
        <p>Not every story needs an audience. Some only need a place to live, and someone who remembers. Here is to the little things, and to keeping them close.</p>
      </div>
      <span className={styles.colophon}>An unfinished story, beautifully kept.</span>
    </div>
  </div>;
}

export function AboutNewspaperMontage() {
  const scene = useRef<HTMLElement>(null);
  const frame = useRef<number>(0);
  const started = useRef(false);
  const [phase, setPhase] = useState<"waiting" | "playing" | "settled">("waiting");
  const [take, setTake] = useState(0);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      started.current = true;
      setPhase("settled");
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "settled" : "playing");
      observer.disconnect();
    }, { threshold: .18 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setTimeout(() => setPhase("settled"), 6200);
    return () => window.clearTimeout(timer);
  }, [phase, take]);

  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);

  function movePaper(event: PointerEvent<HTMLElement>) {
    if (phase !== "settled" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      scene.current?.style.setProperty("--drift-x", `${x * 4}px`);
      scene.current?.style.setProperty("--drift-y", `${y * 4}px`);
      scene.current?.style.setProperty("--tilt-x", `${-y * 1.2}deg`);
      scene.current?.style.setProperty("--tilt-y", `${x * 1.2}deg`);
      scene.current?.style.setProperty("--shadow-x", `${2 - x * 2}px`);
    });
  }

  function resetPaper() {
    window.cancelAnimationFrame(frame.current);
    for (const property of ["--drift-x", "--drift-y", "--tilt-x", "--tilt-y", "--shadow-x"]) scene.current?.style.removeProperty(property);
  }

  function replay() {
    resetPaper();
    setTake(value => value + 1);
    setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "settled" : "playing");
  }

  return <figure ref={scene} className={styles.scene} data-phase={phase} onPointerMove={movePaper} onPointerLeave={resetPaper} aria-label="An animated typographic archive of fictional Dear Tomorrow newspaper clippings">
    <div className={styles.archiveHeading}><span>The Dear Tomorrow archive</span><span>Vol. 01</span></div>
    <div className={styles.canvas} key={take} aria-hidden="true">
      {clippings.map((clipping, index) => <NewspaperClipping key={clipping.publication} clipping={clipping} index={index} />)}
    </div>
    <figcaption className={styles.caption}>
      <span className={styles.captionTitle}>One name. So many stories.</span>
      <span className={styles.captionNote}>Fictional editions. Real affection for the written word.</span>
    </figcaption>
    <button type="button" className={styles.replay} onClick={replay} aria-label="Replay the newspaper montage">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.2 6.1A6.4 6.4 0 1 1 3.6 12M4.2 2.8v3.7h3.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>Replay montage</span>
    </button>
    <span className={styles.srOnly} role="status">{take > 0 ? `Montage replay ${take} started.` : ""}</span>
    <noscript><style>{`.${styles.paper}{animation:none!important;opacity:1!important;transform:rotate(var(--paper-rotation))!important}`}</style></noscript>
  </figure>;
}
