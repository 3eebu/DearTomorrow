"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./about-keepsake.module.css";

const recording = {
  title: "Javeda Zindagi",
  credit: "Violin cover by Elena Blinova",
  url: "https://youtu.be/AVh5PNsOg1U?si=_iRL8HqfSSk6bkia",
};

const petals = [
  "M 1394 570 L 1394 548 Q 1425 491 1488 494 L 1534 523 L 1534 576 Z",
  "M 606 922 L 614 896 Q 645 873 661 844 Q 701 823 743 846 L 751 878 L 713 935 Z",
];

// Feather the attached details into the fixed painting. These small regions stay
// clear of the eyes and brows, including at the extremes of their transforms.
const details = [
  { x: 285, y: 102, rx: 82, ry: 90, className: styles.upperPetal },
  { x: 133, y: 211, rx: 82, ry: 63, className: styles.outerPetal },
  { x: 743, y: 179, rx: 109, ry: 60, className: styles.bud },
  { x: 1420, y: 794, rx: 72, ry: 60, className: styles.lowerPetal },
  { x: 1242, y: 902, rx: 72, ry: 57, className: styles.lowerBloom },
  { x: 1338, y: 196, rx: 95, ry: 42, className: styles.hair },
];

function Watercolor() {
  const id = useId();
  const frame = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const artwork = frame.current;
    if (!artwork || !("IntersectionObserver" in window)) return;
    let inView = false;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(artwork);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <figure className={styles.painting}>
      <svg
        ref={frame}
        className={styles.watercolor}
        data-watercolor-visible={visible}
        width="1536" height="1024" viewBox="0 0 1536 1024"
        role="img"
        aria-label="Watercolor of a woman’s brown eyes framed by blush flowers and loose strands of dark hair"
        focusable="false"
      >
        <defs>
          <image id={id + "-paint"} href="/about/watercolor-eyes.webp" width="1536" height="1024" />
          <mask id={id + "-fixed"} x="0" y="0" width="1536" height="1024" maskUnits="userSpaceOnUse">
            <rect width="1536" height="1024" fill="white" />
            {petals.map(path => <path key={path} d={path} fill="black" />)}
          </mask>
          {petals.map((path, index) => (
            <clipPath id={id + "-loose-" + index} key={path}><path d={path} /></clipPath>
          ))}
          <radialGradient id={id + "-feather"}>
            <stop offset=".40" stopColor="white" />
            <stop offset=".76" stopColor="white" stopOpacity=".6" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {details.map(({ x, y, rx, ry }, index) => (
            <mask id={id + "-detail-" + index} key={index} maskUnits="userSpaceOnUse"
              x={x-rx} y={y-ry} width={rx*2} height={ry*2}>
              <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id}-feather)`} />
            </mask>
          ))}
        </defs>
        <use href={`#${id}-paint`} mask={`url(#${id}-fixed)`} />
        {details.map(({ className }, index) => (
          <g key={index} className={styles.attached} mask={`url(#${id}-detail-${index})`}>
            <use className={`${styles.moving} ${className}`} href={`#${id}-paint`} />
          </g>
        ))}
        {petals.map((path, index) => (
          <g key={path} className={`${styles.moving} ${index === 0 ? styles.looseRight : styles.looseBottom}`}>
            <use href={`#${id}-paint`} clipPath={`url(#${id}-loose-${index})`} />
          </g>
        ))}
      </svg>
      <figcaption>A song for the eyes I could never forget.</figcaption>
    </figure>
  );
}

function MusicKeepsake() {
  const card = useRef<HTMLElement>(null);
  const [introduced, setIntroduced] = useState(false);

  useEffect(() => {
    if (!card.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIntroduced(true);
      observer.disconnect();
    });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);

  return (
    <aside ref={card} className={styles.music} aria-label="A song for her"
      data-introduced={introduced}>
      <svg className={styles.ink} viewBox="0 0 180 110" fill="none" aria-hidden="true">
        <path pathLength="1" d="M108 22c6-2 13-9 19-5 7 5-2 16-8 22-5-6-19-10-17-17 1-3 5-6 9-2l7 5"/>
        <path pathLength="1" d="M144 46c5 2 9 4 13 5m-9-10 2 16m-8-8 15-4"/>
        <path pathLength="1" d="M134 76c8 1 13-3 9-6-5-4-12 4-9 6Zm9-3 3-16c5 4 6 4 10 4M85 38l-6 7m5 32-6 1m33-20 4 3"/>
        <path pathLength="1" d="M76 95c14 8 41 10 68-2 11-5 20-12 18-24" />
      </svg>
      <div className={styles.song}>
        <p className={styles.label}>A song for her</p>
        <h2>{recording.title}</h2>
        <p className={styles.credit}>{recording.credit}</p>
      </div>
      <div className={styles.actions}>
        <a href={recording.url} target="_blank" rel="noreferrer">
          <span className={styles.playMark} aria-hidden="true">
            <svg viewBox="0 0 38 38" fill="none">
              <path d="M16 13.5v11l9-5.5-9-5.5Z" fill="currentColor" />
              <path pathLength="1" d="M32 27C38 16 31 6 21 5 10 3 4 10 4 19c1 11 8 16 18 14 4-1 7-3 10-6Z" />
            </svg>
          </span>
          Listen on YouTube <span aria-hidden="true">↗</span>
        </a>
      </div>
    </aside>
  );
}

export function AboutKeepsake() {
  return (
    <div className={styles.keepsake}>
      <Watercolor />
      <MusicKeepsake />
    </div>
  );
}
