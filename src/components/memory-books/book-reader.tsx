'use client';
/* Local photo data is already resized during import and must remain on the device. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { shouldCompleteTurn, type MemoryBookDocument } from '@/lib/memory-books';
import { Cover, PageContent } from './page-content';
import s from './memory-books.module.css';

const SEGMENTS = 12;
export function BookReader({ book, onEdit, onExit }: { book: MemoryBookDocument; onEdit: () => void; onExit: () => void }) {
  const [opened, setOpened] = useState(false);
  const [index, setIndex] = useState(0);
  const [single, setSingle] = useState(false);
  const [linear, setLinear] = useState(false);
  const [turn, setTurn] = useState<1 | -1 | null>(null);
  const scene = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null);
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(0), frame = useRef(0), busy = useRef(false);
  const drag = useRef<{ start: number; last: number; time: number; velocity: number; direction: 1 | -1; width: number } | null>(null);
  const reduced = useRef(false);
  useEffect(() => {
    const media = matchMedia('(max-width: 700px)'), motion = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => { setSingle(media.matches); if (!media.matches) setIndex(i => i - i % 2); };
    const preference = () => { reduced.current = motion.matches; };
    resize(); preference(); media.addEventListener('change', resize); motion.addEventListener('change', preference);
    return () => { cancelAnimationFrame(frame.current); media.removeEventListener('change', resize); motion.removeEventListener('change', preference); };
  }, []);
  const step = single ? 1 : 2;
  const last = single ? book.pages.length - 1 : Math.ceil(book.pages.length / 2) * 2;
  function paint(value: number) {
    progress.current = value;
    const width = sheet.current?.clientWidth || 300;
    let x = 0, z = 0;
    strips.current.forEach((strip, i) => {
      const u = (i + .5) / SEGMENTS;
      const angle = -Math.PI * value + Math.sin(Math.PI * value) * .72 * (1 - 2 * u);
      if (strip) {
        strip.style.transform = `translate3d(${x * width}px,0,${z * width}px) rotateY(${angle}rad)`;
        strip.style.filter = `brightness(${1 - .15 * Math.abs(Math.sin(angle))})`;
      }
      x += Math.cos(angle) / SEGMENTS; z -= Math.sin(angle) / SEGMENTS;
    });
    if (sheet.current) sheet.current.style.setProperty('--turn-shadow', String(Math.sin(Math.PI * value) * .2));
  }
  useLayoutEffect(() => { if (turn) paint(progress.current); }, [turn]);
  function settle(direction: 1 | -1, complete: boolean) {
    const from = progress.current, to = direction === 1 ? (complete ? 1 : 0) : (complete ? 0 : 1);
    const start = performance.now(), duration = reduced.current ? 0 : Math.max(220, Math.abs(to - from) * 780);
    cancelAnimationFrame(frame.current);
    const tick = (time: number) => {
      const t = duration ? Math.min(1, (time - start) / duration) : 1;
      paint(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else { if (complete) setIndex(current => Math.max(0, Math.min(last, current + direction * step))); setTurn(null); busy.current = false; drag.current = null; }
    };
    frame.current = requestAnimationFrame(tick);
  }
  function start(direction: 1 | -1, event?: PointerEvent<HTMLButtonElement>) {
    if (busy.current || !opened || (direction === -1 ? index === 0 : index >= last)) return;
    busy.current = true; progress.current = direction === 1 ? 0 : 1; setTurn(direction);
    if (event) {
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { start: event.clientX, last: event.clientX, time: performance.now(), velocity: 0, direction, width: event.currentTarget.parentElement!.clientWidth / (single ? 1 : 2) };
    } else settle(direction, true);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current; if (!d) return;
    const now = performance.now(); d.velocity = (event.clientX - d.last) / Math.max(1, now - d.time); d.last = event.clientX; d.time = now;
    const distance = (d.start - event.clientX) / d.width;
    const p = Math.max(0, Math.min(1, (d.direction === 1 ? 0 : 1) + distance));
    cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => paint(p));
  }
  function release(cancel = false) {
    const d = drag.current; if (!d) return;
    settle(d.direction, shouldCompleteTurn(d.direction, progress.current, d.velocity, performance.now() - d.time, cancel));
  }
  const commands = useRef({ next: () => start(1), previous: () => start(-1) }); commands.current = { next: () => start(1), previous: () => start(-1) };
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,button')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); commands.current.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); commands.current.previous(); }
    }; window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, []);
  const frontIndex = turn === -1 ? index - step : index;
  const backIndex = turn === -1 ? index - 1 : index + 1;
  const rightIndex = turn === 1 ? index + step : index;
  const leftIndex = turn === -1 ? index - 3 : index - 1;
  return <div className={s.reader} ref={scene}>
    <div className={s.readerTop}><button onClick={onExit}>← Library</button><span>{book.title}</span><div><button onClick={() => setLinear(v => !v)}>{linear ? 'Book view' : 'Simple reading'}</button><button onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await scene.current?.requestFullscreen(); } catch { /* Browser may decline fullscreen; book stays usable. */ } }}>Fullscreen</button><button onClick={onEdit}>Open Studio ↗</button></div></div>
    {linear ? <main className={s.linearReader}><h1>{book.title}</h1>{book.dedication && <p>{book.dedication}</p>}{book.pages.map((page, i) => <article key={page.id}><h2>Page {i + 1}</h2>{page.elements.map(e => <div key={e.id}>{e.assetId && book.assets[e.assetId] && <img src={book.assets[e.assetId].data} alt={e.text || 'Personal memory'}/>}<p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p></div>)}</article>)}</main> : <>
      <div className={`${s.readStage} ${single ? s.singleStage : ''}`}>
        <div className={`${s.physicalBook} ${opened ? s.bookOpened : ''}`} style={{ '--ratio': book.widthMm / book.heightMm, '--cover-color': book.cover.color } as CSSProperties}>
          <div className={s.backBoard}/><div className={s.paperBlock}/>
          {!single && <div className={s.leftPage} aria-hidden={!opened || turn !== null}><PageContent book={book} page={book.pages[leftIndex]} interactive={opened && !turn}/></div>}
          <div className={s.rightPage} aria-hidden={!opened || turn !== null}><PageContent book={book} page={book.pages[rightIndex]} interactive={opened && !turn}/></div>
          <div className={s.gutter} aria-hidden="true"/>
          <button className={s.hingedCover} aria-label={opened ? 'Close the cover' : `Open ${book.title}`} onClick={() => { if (!busy.current) { setOpened(v => !v); setIndex(0); } }} tabIndex={opened ? -1 : 0}><div className={s.coverFront}><Cover book={book}/></div><div className={s.coverBack}><PageContent book={book}/></div></button>
          {turn && <div ref={sheet} className={s.turnSheet} aria-hidden="true">{Array.from({ length: SEGMENTS }, (_, i) => <div key={i} ref={el => { strips.current[i] = el; }} className={s.strip} style={{ width: `${100 / SEGMENTS + .06}%` }}>
            <div className={s.stripFace}><div className={s.stripContent} style={{ width: `${SEGMENTS * 100}%`, left: `${-i * 100}%` }}><PageContent book={book} page={book.pages[frontIndex]}/></div></div>
            <div className={`${s.stripFace} ${s.stripBack}`}><div className={s.stripContent} style={{ width: `${SEGMENTS * 100}%`, left: `${-(SEGMENTS - i - 1) * 100}%` }}><PageContent book={book} page={book.pages[backIndex]}/></div></div>
          </div>)}</div>}
          {opened && <><button className={`${s.turnEdge} ${s.previousEdge}`} disabled={index === 0} aria-label="Drag left page edge to turn back" onPointerDown={e => start(-1, e)} onPointerMove={move} onPointerUp={() => release()} onPointerCancel={() => release(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(-1); } }}>‹</button><button className={`${s.turnEdge} ${s.nextEdge}`} disabled={index >= last} aria-label="Drag right page edge to turn forward" onPointerDown={e => start(1, e)} onPointerMove={move} onPointerUp={() => release()} onPointerCancel={() => release(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(1); } }}>›</button></>}
        </div>
      </div>
      <div className={s.readControls}>{opened ? <><button disabled={index === 0 || turn !== null} onClick={() => start(-1)}>← Previous</button><span aria-live="polite">{index >= book.pages.length ? 'The end of this little chapter.' : `Page ${single ? index + 1 : Math.max(1, index)}${!single && index > 0 && index < book.pages.length ? '–' + (index + 1) : ''} of ${book.pages.length}`}</span><button disabled={index >= last || turn !== null} onClick={() => start(1)}>Next →</button></> : <p>A story made to be opened. Tap the cover.</p>}</div>
      {opened && <div className={s.readerFoot}><button onClick={() => { if (!busy.current) { setOpened(false); setIndex(0); } }}>Close book</button><label>Find a chapter<select aria-label="Jump to chapter" value="" disabled={turn !== null} onChange={e => { const target = book.pages.findIndex(p => p.chapterId === e.target.value); if (target >= 0) setIndex(single ? target : Math.floor(target / 2) * 2); }}><option value="">Chapters…</option>{book.chapters.filter(c => book.pages.some(p => p.chapterId === c.id)).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><small>Drag an outer edge, use the arrows, or turn with your keyboard.</small></div>}
    </>}
  </div>;
}
