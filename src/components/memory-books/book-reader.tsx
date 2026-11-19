'use client';
/* Local photo data stays in the shared DOM renderer; no remote textures. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { type MemoryBookDocument } from '@/lib/memory-books';
import { clamp, lastSpread, motionDuration, paperSurface, releaseTurn, turnPages, visiblePages } from '@/lib/book-physics';
import { PageContent, ElementContent } from './page-content';
import { ReadingInteractions, SimpleSurprise } from './paper-surprise';
import type { Interaction } from '@/lib/book-surprises';
import { GiftActions, WrappedCover, useGiftPresentation } from './gift-presentation';
import giftStyles from './gift-presentation.module.css';
import s from './book-reader.module.css';

import {ReaderEnvironment,useEnvironment} from './reader-environment';
import { Cover, BookSurface } from './cover-renderer';
import {ReaderPlaces} from './reader-places';
import making from './bookmaking.module.css';
import environment from './reader-environment.module.css';
type Direction = 1 | -1;
type Gesture = { x: number; y: number; last: number; time: number; velocity: number; width: number; height: number; initial: number; corner: number; moved: boolean };
export function BookReader({ book, onEdit, onExit, exitLabel = '← Library', editLabel = 'Open Studio ↗', startWrapped = false }: {
  book: MemoryBookDocument; onEdit: () => void; onExit: () => void; exitLabel?: string; editLabel?: string;
  startWrapped?: boolean;
}) {
  const gift = useGiftPresentation(startWrapped && !!book.gift, book.id);
  const {scene:environmentScene,choose:chooseEnvironment}=useEnvironment(book.id);
  const [backPreview,setBackPreview]=useState(false);
  const [opened, setOpened] = useState(false), [opening, setOpening] = useState(false);
  const [index, setIndex] = useState(0), [single, setSingle] = useState(false), [linear, setLinear] = useState(false);
  const [advancedAvailable, setAdvancedAvailable] = useState(true);
  const [turn, setTurn] = useState<Direction | null>(null);
  const [interactions, setInteractions] = useState<ReadonlyMap<string, Interaction>>(new Map());
  const scene = useRef<HTMLDivElement>(null), volume = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null);
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(0), corner = useRef(0), frame = useRef(0), coverFrame = useRef(0), openAmount = useRef(0);
  const active = useRef<Direction | null>(null), drag = useRef<Gesture | null>(null), queued = useRef<Direction | null>(null);
  const reduced = useRef(false), hover = useRef(false);
  const count = single ? 20 : 32, step = single ? 1 : 2, last = lastSpread(book.pages.length, single);
  const pageWidth = useRef(350);
  const timing = useRef<{ previous: number; intervals: number[]; costs: number[] }>({ previous: 0, intervals: [], costs: [] });
  const thickness = Math.max(2.2, book.pages.length * .22); // Visual stock allowance in CSS px, including scrapbook inserts.
  const commands = useRef({ next: () => {}, previous: () => {}, cancel: () => {} });
  const coverTarget = useRef(false);

  useLayoutEffect(() => {
    const media = matchMedia('(max-width: 700px)'), motion = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      cancelAnimationFrame(frame.current); active.current = null; drag.current = null; queued.current = null; setTurn(null);
      setSingle(media.matches); setIndex(i => media.matches ? Math.min(i, book.pages.length - 1) : Math.ceil(i / 2) * 2);
    };
    const preference = () => { reduced.current = motion.matches; };
    if (!CSS.supports('transform-style', 'preserve-3d')) { setAdvancedAvailable(false); setLinear(true); }
    resize(); preference(); media.addEventListener('change', resize); motion.addEventListener('change', preference);
    return () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(coverFrame.current); media.removeEventListener('change', resize); motion.removeEventListener('change', preference); };
  }, [book.pages.length]);

  function stacks(cursor: number) {
    const root = volume.current; if (!root) return;
    const left = single ? 0 : clamp(cursor / book.pages.length);
    root.style.setProperty('--left-depth', `${(1.2 + left * thickness).toFixed(2)}px`);
    root.style.setProperty('--right-depth', `${(1.2 + (1 - left) * thickness).toFixed(2)}px`);
  }
  useLayoutEffect(() => { stacks(index); }, [index, single, book.pages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function paint(value: number) {
    const began = performance.now();
    if (timing.current.previous) timing.current.intervals.push(began - timing.current.previous);
    timing.current.previous = began;
    progress.current = clamp(value);
    const isBack = single && active.current === -1;
    const surface = paperSurface(progress.current, count, corner.current, isBack);
    const width = pageWidth.current;
    surface.forEach((part, i) => {
      const strip = strips.current[i]; if (!strip) return;
      strip.style.transform = `translate3d(${part.x * width}px,0,${part.z * width}px) rotateY(${part.angle}rad) rotateX(${part.twist}rad)`;
      strip.style.setProperty('--shade', String(part.shade));
    });
    const lift = Math.sin(Math.PI * progress.current);
    volume.current?.style.setProperty('--sheet-lift', String(lift));
    volume.current?.style.setProperty('--shadow-position', `${(single ? 30 : 50) + (progress.current - .5) * 30}%`);
    if (active.current) {
      const travel = single || active.current === 1 ? progress.current : 1 - progress.current;
      stacks(index + active.current * step * travel);
    }
    timing.current.costs.push(performance.now() - began);
  }
  useLayoutEffect(() => {
    if (turn !== null) {
      pageWidth.current = sheet.current?.clientWidth || 350;
      sheet.current?.style.setProperty('--page-width', `${pageWidth.current}px`);
      paint(progress.current);
    }
  }, [turn, count]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(complete: boolean) {
    // Development-only measurements describe actual animation callbacks, not a claimed FPS target.
    if (process.env.NODE_ENV !== 'production' && volume.current) {
      const values = timing.current.intervals.filter(v => v > 1).sort((a, b) => a - b);
      const costs = timing.current.costs;
      volume.current.dataset.frameTiming = JSON.stringify({ frames: values.length, median: values[Math.floor(values.length / 2)] || 0,
        p95: values[Math.floor(values.length * .95)] || 0, over33ms: values.filter(v => v > 33.4).length,
        meanPaintMs: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0 });
    }
    const direction = active.current;
    if (direction && complete) setIndex(i => clamp(i + direction * step, 0, last));
    else stacks(index);
    active.current = null; drag.current = null; setTurn(null);
    volume.current?.style.setProperty('--sheet-lift', '0');
  }
  function settle(complete: boolean, velocity = 0) {
    if (!active.current) return;
    const direction = active.current, from = progress.current;
    const to = single || direction === 1 ? (complete ? 1 : 0) : (complete ? 0 : 1);
    let started: number | undefined;
    const duration = motionDuration(reduced.current, Math.max(180, Math.abs(to - from) * 840 / (1 + Math.min(1.6, Math.abs(velocity)) * .35)));
    cancelAnimationFrame(frame.current);
    const tick = (time: number) => {
      // Mounting the strip contents can take longer on a dense scrapbook page.
      // Start the settling clock only when the sheet can actually be painted.
      started ??= time;
      const t = duration ? clamp((time - started) / duration) : 1;
      // Quintic smoothstep has zero acceleration at rest: no abrupt stop at the binding.
      const ease = t * t * t * (t * (t * 6 - 15) + 10);
      paint(from + (to - from) * ease);
      if (t < 1) frame.current = requestAnimationFrame(tick); else finish(complete);
    };
    frame.current = requestAnimationFrame(tick);
  }
  function start(direction: Direction, event?: PointerEvent<HTMLButtonElement>) {
    if (!opened || opening || (direction === -1 ? index === 0 : index >= last)) return;
    if (active.current && hover.current && !event) {
      hover.current = false;
      if (active.current === direction) settle(true);
      else { queued.current = direction; settle(false); }
      return;
    }
    if (active.current && !event) { queued.current = direction; return; }
    if (active.current && active.current !== direction) { if (event) { cancelAnimationFrame(frame.current); finish(false); } return; }
    if (!active.current) {
      timing.current = { previous: 0, intervals: [], costs: [] };
      progress.current = single || direction === 1 ? 0 : 1;
      active.current = direction; setTurn(direction);
    }
    cancelAnimationFrame(frame.current); hover.current = false;
    if (event) {
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.parentElement!.getBoundingClientRect();
      corner.current = clamp((event.clientY - rect.top) / rect.height) * 2 - 1;
      drag.current = { x: event.clientX, y: event.clientY, last: event.clientX, time: performance.now(), velocity: 0,
        width: rect.width / (single ? 1 : 2), height: rect.height, initial: progress.current, corner: corner.current, moved: false };
    } else { corner.current = .65; settle(true); }
  }
  useEffect(() => {
    if (turn === null && queued.current) {
      const direction = queued.current; queued.current = null;
      if (direction === 1) commands.current.next(); else commands.current.previous();
    }
  }, [turn, index]);
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current; if (!d || !active.current) return;
    const now = performance.now(), dx = event.clientX - d.last;
    d.velocity = d.velocity * .25 + dx / Math.max(1, now - d.time) * .75;
    d.last = event.clientX; d.time = now; d.moved ||= Math.abs(event.clientX - d.x) > 4;
    corner.current = clamp(d.corner + (event.clientY - d.y) / d.height * .6, -1, 1);
    const distance = (d.x - event.clientX) / (d.width * (single ? 1 : 2));
    const value = single && active.current === -1 ? d.initial - distance : d.initial + distance;
    cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => paint(value));
  }
  function release(cancel = false) {
    const d = drag.current, direction = active.current; if (!d || !direction) return;
    const travel = single || direction === 1 ? progress.current : 1 - progress.current;
    const velocity = direction === 1 ? -d.velocity : d.velocity;
    const complete = !d.moved && !cancel ? true : releaseTurn(travel, velocity, performance.now() - d.time, cancel);
    drag.current = null; settle(complete, velocity);
  }
  function peek(direction: Direction, event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || active.current || reduced.current || opening) return;
    if (direction === -1 ? index === 0 : index >= last) return;
    active.current = direction; hover.current = true; corner.current = .85;
    progress.current = single || direction === 1 ? .035 : .965; setTurn(direction);
  }
  function unpeek() { if (hover.current && !drag.current) { hover.current = false; settle(false); } }
  function openCover(next: boolean) {
    if (active.current) { cancelAnimationFrame(frame.current); finish(false); }
    queued.current = null; coverTarget.current = next;
    setOpened(next); setOpening(true);
    const from = openAmount.current, started = performance.now(), duration = motionDuration(reduced.current, Math.abs((next ? 1 : 0) - from) * 1300);
    cancelAnimationFrame(coverFrame.current);
    const tick = (time: number) => {
      const t = duration ? clamp((time - started) / duration) : 1;
      const amount = from + ((next ? 1 : 0) - from) * (t * t * (3 - 2 * t));
      openAmount.current = amount;
      volume.current?.style.setProperty('--open', String(amount));
      volume.current?.style.setProperty('--cover-shadow', String(Math.sin(Math.PI * amount)));
      if (t < 1) coverFrame.current = requestAnimationFrame(tick);
      else { setOpening(false); if (!next) setIndex(0); }
    };
    coverFrame.current = requestAnimationFrame(tick);
  }
  commands.current = { next: () => start(1), previous: () => start(-1), cancel: () => { if (active.current) { drag.current = null; queued.current = null; settle(false); } } };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { commands.current.cancel(); return; }
      if ((event.target as HTMLElement).closest('input,textarea,select,button,summary,[contenteditable],[data-surprise-object]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); commands.current.next(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); commands.current.previous(); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, []);

  const mapping = turnPages(index, turn || 1, single);
  const leftIndex = turn === -1 && !single ? mapping.under : index - 1;
  const rightIndex = turn === 1 || (single && turn === -1) ? mapping.under : index;
  const visible = visiblePages(index, book.pages.length, single);
  function jumpToPage(id: string) {
    const target = book.pages.findIndex(page => page.id === id);
    if (target < 0 || opening || turn !== null || linear || gift.wrapped) return;
    if (!opened) openCover(true);
    setIndex(single ? target : Math.ceil(target / 2) * 2);
  }
  const label = visible.length ? `Page ${visible.map(i => i + 1).join('–')} of ${book.pages.length}` : `End of ${book.pages.length} pages`;
  const edge = (direction: Direction) => <button type="button" className={`${s.turnEdge} ${direction === 1 ? s.nextEdge : s.previousEdge}`} disabled={direction === 1 ? index >= last : index === 0}
    aria-label={direction === 1 ? 'Turn next page — drag or press Enter' : 'Turn previous page — drag or press Enter'}
    onPointerEnter={e => peek(direction, e)} onPointerLeave={unpeek} onPointerDown={e => start(direction, e)} onPointerMove={move}
    onPointerUp={() => release()} onPointerCancel={() => release(true)} onLostPointerCapture={() => { if (drag.current) release(true); }}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(direction); } if (e.key === 'Escape') commands.current.cancel(); }}><span aria-hidden="true">{direction === 1 ? '›' : '‹'}</span></button>;
  return <ReadingInteractions.Provider value={{
    states: interactions,
    update: (id, state) => setInteractions(previous => {
      const updated = new Map(previous);
      if (Object.keys(state).length) updated.set(id, state);
      else updated.delete(id);
      if (updated.size > 500) updated.delete(updated.keys().next().value!);
      return updated;
    }),
  }}><div className={`${s.reader} ${environment.world}`} data-scene={environmentScene} ref={scene} onKeyDownCapture={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); commands.current.cancel(); } }}>
    <header className={s.readerTop}><button onClick={onExit}>{exitLabel}</button><span>{book.title}</span><div><button disabled={!advancedAvailable} onClick={() => { commands.current.cancel(); cancelAnimationFrame(coverFrame.current); openAmount.current = 0; coverTarget.current = false; setOpening(false); setOpened(false); if (gift.wrapped) gift.skip(); setLinear(v => !v); }}>{linear ? 'Book view' : 'Simple reading'}</button><button onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await scene.current?.requestFullscreen(); } catch { /* Simple reading remains available if fullscreen is declined. */ } }}>Fullscreen</button>{book.gift && !opened && !opening && !gift.wrapped && !linear && <button onClick={() => { setBackPreview(false); gift.replay(); }}>{gift.presented ? "Replay gift opening" : "Present wrapped"}</button>}<button disabled={gift.wrapped} aria-pressed={backPreview} onClick={() => setBackPreview(v => !v)}>Back cover</button><button onClick={onEdit}>{editLabel}</button></div></header>
    {!linear && !gift.wrapped && <ReaderPlaces book={book} pageId={opened ? book.pages[visible[0]]?.id : undefined} onJump={jumpToPage}/>}{backPreview&&<div className={making.backPreview} style={{aspectRatio:book.widthMm/book.heightMm}}><BookSurface book={book} surface="back"/></div>}<ReaderEnvironment scene={environmentScene} choose={chooseEnvironment}/>{gift.presented && !gift.wrapped && !opened && book.gift?.message && <p className={giftStyles.openingMessage} role="status">{book.gift.message}</p>}{linear ? <main className={s.linearReader}><h1>{book.title}</h1>{book.dedication && <p>{book.dedication}</p>}{book.pages.map((page, i) => <article key={page.id}><h2>Page {i + 1}</h2>{page.elements.filter(e => !e.hidden).map(e => <div key={e.id}>{["shape", "sticker", "drawing"].includes(e.kind) && <div style={{ width: "min(100%, 400px)", aspectRatio: (e.width * book.widthMm) / (e.height * book.heightMm), containerType: "inline-size" }}><ElementContent element={e} book={book}/></div>}{e.assetId && book.assets[e.assetId] && <img src={book.assets[e.assetId].data} alt={e.text || 'Personal memory'}/>}{e.text && e.kind !== 'surprise' && <p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>}{e.surprise && <SimpleSurprise element={e} book={book}/>}</div>)}</article>)}</main> : <>
      <main className={`${s.readStage} ${single ? s.singleStage : ''}`} aria-label="Memory book reading area">
        <div className={s.groundShadow} aria-hidden="true"/>
        <div ref={volume} className={`${s.physicalBook} ${opened ? s.bookOpened : ''} ${opening ? s.opening : ''}`} data-material={book.cover.material} data-turning={turn !== null} style={{ '--open': openAmount.current, '--cover-shadow': Math.sin(Math.PI * openAmount.current), '--ratio': book.widthMm / book.heightMm, '--cover-color': book.cover.color, '--depth': `${thickness}px`, '--page-count': book.pages.length } as CSSProperties}>
          <div className={s.backBoard} aria-hidden="true"/><div className={s.spine} aria-hidden="true">{book.cover.design?.bands!==false&&<><i/><i/><i/></>}{book.pages.length>=20&&<span className={making.spineText}>{book.cover.design?.spineTitle||book.title}</span>}</div>{book.cover.design?.ribbon&&<div className={making.ribbon} style={{"--ribbon":book.cover.design.ribbon} as CSSProperties}/>}
          <div className={`${s.pageStack} ${s.stackLeft}`} aria-hidden="true"/><div className={`${s.pageStack} ${s.stackRight}`} aria-hidden="true"/>
          {!single && <div className={s.leftPage} aria-hidden={!opened || opening || turn !== null}>{book.pages[leftIndex]?<PageContent book={book} page={book.pages[leftIndex]} interactive={opened && !opening && !turn}/>:<BookSurface book={book} surface="insideFront"/>}</div>}
          <div className={s.rightPage} aria-hidden={!opened || opening || turn !== null}>{book.pages[rightIndex]?<PageContent book={book} page={book.pages[rightIndex]} interactive={opened && !opening && !turn}/>:<BookSurface book={book} surface="insideBack"/>}</div>
          <div className={s.gutter} aria-hidden="true"/><div className={s.castShadow} aria-hidden="true"/>
          <button className={s.hingedCover} aria-label={opened ? 'Close the cover' : `Open ${book.title}`} aria-hidden={gift.wrapped || undefined} onClick={() => { if (!gift.wrapped) openCover(!coverTarget.current); }} tabIndex={opened || gift.wrapped ? -1 : 0}>
            <div className={s.coverFront}><Cover book={book}/><i className={s.coverLight}/></div><div className={s.coverBack}><BookSurface book={book} surface="insideFront"/></div><i className={s.boardEdge}/><i className={s.boardBottom}/>
          </button>
          {gift.wrapped && book.gift && <WrappedCover gift={book.gift} releasing={gift.releasing} unwrap={gift.unwrap}/>}
          {turn !== null && <div ref={sheet} className={s.turnSheet} aria-hidden="true">{Array.from({ length: count }, (_, i) => <div key={i} ref={el => { strips.current[i] = el; }} className={s.strip} style={{ width: `${100 / count + .035}%` }}>
            <div className={s.stripFace}><div className={s.stripContent} style={{ width: 'var(--page-width)', left: `calc(var(--page-width) * ${-i / count})` }}><PageContent book={book} page={book.pages[mapping.front]} strip={[i / count * 100, (i + 1) / count * 100]}/></div><i className={s.surfaceLight}/></div>
            <div className={`${s.stripFace} ${s.stripBack}`}><div className={s.stripContent} style={{ width: 'var(--page-width)', left: `calc(var(--page-width) * ${-(count - i - 1) / count})` }}><PageContent book={book} page={book.pages[mapping.back]} strip={[(count - i - 1) / count * 100, (count - i) / count * 100]}/></div><i className={s.surfaceLight}/></div>
          </div>)}</div>}
          {opened && !opening && <>{edge(-1)}{edge(1)}</>}
        </div>
      </main>
      {gift.wrapped ? <GiftActions releasing={gift.releasing} unwrap={gift.unwrap} skip={gift.skip}/> : <div className={s.readControls}>{opened ? <><button disabled={index === 0 || opening} onClick={() => start(-1)}>← Previous</button><span aria-live="polite">{label}</span><button disabled={index >= last || opening} onClick={() => start(1)}>Next →</button></> : <p>A story made to be opened. Tap the cover.</p>}</div>}
      {opened && <footer className={s.readerFoot}><button onClick={() => openCover(false)}>Close book</button><label>Find a chapter<select aria-label="Jump to chapter" value="" disabled={turn !== null || opening} onChange={e => { const target = book.pages.findIndex(p => p.chapterId === e.target.value); if (target >= 0) setIndex(single ? target : Math.ceil(target / 2) * 2); }}><option value="">Chapters…</option>{book.chapters.filter(c => book.pages.some(p => p.chapterId === c.id)).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><small>Drag a page edge · Arrow keys to turn · Escape to let go</small></footer>}
    </>}
  </div></ReadingInteractions.Provider>;
}
