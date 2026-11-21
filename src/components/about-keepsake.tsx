"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./about-keepsake.module.css";

const recording = {
  title: "Javeda Zindagi",
  credit: "Violin cover by Elena Blinova",
  listen: "https://www.youtube.com/watch?v=AVh5PNsOg1U&t=22s",
};

const petals = [
  { path: "M 1399 570 L 1404 544 Q 1430 493 1488 495 L 1534 522 L 1534 575 L 1422 575 L 1418 559 Z", className: styles.looseRight },
  { path: "M 609 922 L 618 896 Q 650 871 667 846 Q 702 831 743 845 L 751 878 L 713 935 Z", className: styles.looseBottom },
];

// Each feather ends before the eye region. Its inverse on the fixed painting
// gives the moving patch exactly the coverage it replaces along the join.
const details = [
  { name: "upper-blossom", x: 312, y: 115, rx: 126, ry: 139, angle: 9, className: styles.upperBlossom },
  { name: "outer-petal", x: 119, y: 225, rx: 94, ry: 83, angle: 12, className: styles.outerPetal },
  { name: "bud", x: 766, y: 177, rx: 105, ry: 70, angle: -13, className: styles.bud },
  { name: "right-petal", x: 1424, y: 805, rx: 110, ry: 83, angle: 14, className: styles.rightPetal },
  { name: "lower-blossom", x: 1233, y: 901, rx: 99, ry: 78, angle: -25, className: styles.lowerBlossom },
  { name: "hair-curl", x: 1347, y: 199, rx: 113, ry: 50, angle: 14, className: styles.hair },
];

function Watercolor() {
  const id = useId();
  const frame = useRef<SVGSVGElement>(null);
  const [motion, setMotion] = useState<"still" | "running" | "paused">("still");

  useEffect(() => {
    const artwork = frame.current;
    if (!artwork || !("IntersectionObserver" in window)) return;
    let inView = false;
    const sync = () => setMotion(current =>
      inView && !document.hidden ? "running" : current === "still" ? "still" : "paused",
    );
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
        data-watercolor-motion={motion}
        width="1536" height="1024" viewBox="0 0 1536 1024"
        role="img"
        aria-label="Watercolor of a woman’s brown eyes framed by blush flowers and loose strands of dark hair"
        focusable="false"
      >
        <defs>
          <image id={id + "-paint"} href="/about/watercolor-eyes.webp" width="1536" height="1024" />
          {petals.map(({ path }, index) => (
            <clipPath id={id + "-loose-" + index} key={path}><path d={path} /></clipPath>
          ))}
          <radialGradient id={id + "-feather"}>
            <stop offset=".37" stopColor="white" />
            <stop offset=".69" stopColor="white" stopOpacity=".54" />
            <stop offset=".88" stopColor="white" stopOpacity=".14" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id + "-feather-cut"} href={`#${id}-feather`}>
            <stop offset=".37" stopColor="black" />
            <stop offset=".69" stopColor="black" stopOpacity=".54" />
            <stop offset=".88" stopColor="black" stopOpacity=".14" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </radialGradient>
          <mask id={id + "-fixed"} x="0" y="0" width="1536" height="1024" maskUnits="userSpaceOnUse">
            <rect width="1536" height="1024" fill="white" />
            {details.map(({ name, x, y, rx, ry, angle }) => (
              <ellipse key={name} cx={x} cy={y} rx={rx} ry={ry}
                transform={`rotate(${angle} ${x} ${y})`} fill={`url(#${id}-feather-cut)`} />
            ))}
            {petals.map(({ path }) => <path key={path} d={path} fill="black" />)}
          </mask>
          {details.map(({ name, x, y, rx, ry, angle }) => {
            const extent = Math.max(rx, ry);
            return (
              <mask id={id + "-" + name} key={name} maskUnits="userSpaceOnUse"
                x={x-extent} y={y-extent} width={extent*2} height={extent*2}>
                <ellipse cx={x} cy={y} rx={rx} ry={ry}
                  transform={`rotate(${angle} ${x} ${y})`} fill={`url(#${id}-feather)`} />
              </mask>
            );
          })}
        </defs>
        <use className={styles.still} href={`#${id}-paint`} />
        <g className={styles.animated}>
          <use href={`#${id}-paint`} mask={`url(#${id}-fixed)`} />
          {details.map(({ name, className }) => (
            <g key={name} className={styles.attached} mask={`url(#${id}-${name})`}>
              <use className={`${styles.moving} ${className}`} href={`#${id}-paint`} />
            </g>
          ))}
          {petals.map(({ path, className }, index) => (
            <g key={path} className={`${styles.cutout} ${styles.moving} ${className}`}>
              <use href={`#${id}-paint`} clipPath={`url(#${id}-loose-${index})`} />
            </g>
          ))}
        </g>
      </svg>
      <figcaption>The eyes I fell in love with, and the eyes I dream of seeing again in our daughter</figcaption>
    </figure>
  );
}

function MusicKeepsake() {
  return (
    <aside className={styles.music} aria-label="A song for her">
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
        <a href={recording.listen} target="_blank" rel="noopener noreferrer"
          aria-label="Listen to Javeda Zindagi on YouTube (opens in a new tab)">
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
