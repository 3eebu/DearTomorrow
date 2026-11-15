'use client';

import { useId } from 'react';
import type { CSSProperties } from 'react';
import styles from './memory-tree-art.module.css';

type Memory = { id: string; title: string };

// The first boughs establish a balanced silhouette. Later shoots fill the crown
// in a golden-angle spiral, without a fixed limit or moving existing memories.
function position(index: number) {
  const first = [[215, 300], [475, 275], [265, 185], [410, 145], [155, 220], [530, 200], [345, 105], [350, 320]];
  if (index < first.length) return first[index];
  const angle = index * 2.399963;
  const radius = Math.sqrt(((index - 8) * .618034) % 1);
  return [350 + Math.cos(angle) * radius * 215, 235 + Math.sin(angle) * radius * 145];
}

function Leaf({ paint }: { paint: string }) {
  return <>
    <path d="M0 0 C-17-9-17-29-2-43 C12-34 18-14 0 0Z" fill={paint} stroke="#405d3c" strokeWidth=".45"/>
    <path d="M0-1 Q1-20-2-40 M0-10 L-9-19 M0-17 L8-26 M-1-24 L-8-31 M0-29 L4-34" fill="none" stroke="#d4d9a2" strokeOpacity=".65" strokeWidth=".65"/>
  </>;
}

export function MemoryTreeArt({ memories, selectedId, newestId, onSelect }: {
  memories: Memory[]; selectedId: string | null; newestId: string | null; onSelect: (id: string) => void;
}) {
  const id = useId().replace(/:/g, '');
  const growth = .72 + .26 * (1 - Math.exp(-memories.length / 14));
  const paints = ['#526f47', '#748650', '#8b985e', '#657d49', '#a1a56c'];
  return <div className={styles.art}>
    <svg viewBox="0 0 700 660" className={styles.tree} role="group" aria-label={`Memory Tree with ${memories.length} memories. Each memory grows a leafy bough.`}>
      <defs>
        <linearGradient id={`${id}-wood`}><stop stopColor="#564333"/><stop offset=".35" stopColor="#9b8060"/><stop offset=".55" stopColor="#786044"/><stop offset="1" stopColor="#4f4032"/></linearGradient>
        <radialGradient id={`${id}-light`}><stop stopColor="#d5d3a8" stopOpacity=".35"/><stop offset="1" stopColor="#d5d3a8" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="350" cy="320" rx="300" ry="280" fill={`url(#${id}-light)`} aria-hidden="true"/>
      <ellipse cx="350" cy="614" rx="126" ry="9" fill="#65553b" opacity=".08" aria-hidden="true"/>
      <g className={styles.growth} style={{ transform: `translate(350px, 610px) scale(${growth}) translate(-350px, -610px)` }}>
        <g aria-hidden="true">
          <path d="M312 610 C329 593 333 556 336 509 C342 442 332 409 344 354 C357 298 344 242 358 193 L366 166 C358 234 371 279 366 327 C357 392 369 442 362 508 C355 556 362 589 386 609 L361 603 352 619 343 605Z" fill={`url(#${id}-wood)`}/>
          <path d="M343 602 Q301 604 275 617 Q316 609 336 610 M361 600 Q394 600 432 615 Q394 607 374 610" fill="#786044"/>
          <path d="M346 580 Q340 535 349 493 T352 401 M355 569 Q362 523 355 468 M350 370 Q364 323 358 286" fill="none" stroke="#cab28a" strokeWidth="1.2" opacity=".45"/>
        </g>
        {memories.map((memory, index) => {
          const [x, y] = position(index);
          const side = x < 350 ? -1 : 1;
          const originY = Math.min(500, y + 190);
          const isNew = memory.id === newestId;
          return <g key={memory.id} className={`${styles.bough} ${isNew ? styles.newBough : ''}`}>
            <path className={styles.branch} d={`M350 ${originY} Q${x + side * 15} ${y + 140} ${x} ${y}`} fill="none" stroke={`url(#${id}-wood)`} strokeWidth={Math.max(3, 10 - index * .25)} strokeLinecap="round" pathLength="1" aria-hidden="true"/>
            <g aria-hidden="true">
              {Array.from({ length: 7 }, (_, shoot) => {
                const angle = -100 + shoot * 31 + (index % 3) * 7;
                const length = 64 + ((shoot * 17 + index * 11) % 40);
                return <g key={shoot} transform={`translate(${x} ${y + 20}) rotate(${angle})`}>
                  <path d={`M0 0 Q-8 ${-length / 2} 0 ${-length}`} fill="none" stroke="#6e7050" strokeWidth="1.3"/>
                  {Array.from({ length: 5 }, (_, leaf) => <g key={leaf} transform={`translate(${-3 + leaf % 2 * 2} ${-18 - leaf * (length - 22) / 5}) rotate(${leaf % 2 ? 57 : -57}) scale(${.58 + ((leaf + shoot) % 3) * .12})`}>
                    <g className={styles.foliage} style={{ '--leaf-delay': `${shoot * 55 + leaf * 70}ms` } as CSSProperties}><Leaf paint={paints[(index + shoot + leaf) % paints.length]}/></g>
                  </g>)}
                  <g transform={`translate(0 ${-length}) scale(.7)`}><g className={styles.foliage}><Leaf paint={paints[(index + shoot) % paints.length]}/></g></g>
                </g>;
              })}
            </g>
          </g>;
        })}
        {/* Draw the memory leaves last so every one remains reachable above foliage. */}
        {memories.map((memory, index) => {
          const [x, y] = position(index);
          return <g key={memory.id} transform={`translate(${x} ${y + 25})`}>
            <g role="button" tabIndex={0} aria-label={`Read memory: ${memory.title}`} aria-pressed={selectedId === memory.id}
              className={`${styles.memory} ${selectedId === memory.id ? styles.selected : ''} ${newestId === memory.id ? styles.newLeaf : ''}`}
              onClick={() => onSelect(memory.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(memory.id); } }}>
              <title>{memory.title}</title>
              <circle className={styles.hit} cx="0" cy="-20" r="29"/>
              <g transform="rotate(24) scale(1.1)"><Leaf paint={selectedId === memory.id ? '#90636a' : '#b0b77a'}/></g>
              <circle cx="1" cy="-17" r="3" fill="#fff7dc"/>
            </g>
          </g>;
        })}
      </g>
    </svg>
    <p className={styles.caption} role="status"><span>{memories.length} memories taking root</span><em>{newestId ? 'A new leaf. A little more life.' : 'A little more life with every memory.'}</em></p>
  </div>;
}
