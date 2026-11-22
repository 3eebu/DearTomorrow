'use client';
/* Embedded images originate in the validated local project. */
/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { interactionKey, surpriseNames, type Interaction, type Surprise, type SurpriseMessage } from '@/lib/book-surprises';
import type { BookElement, MemoryBookDocument } from '@/lib/memory-books';
import s from './paper-surprise.module.css';

export const ReadingInteractions = createContext<{
  states: ReadonlyMap<string, Interaction>;
  update: (id: string, state: Interaction) => void;
} | null>(null);

export function useInteraction(pageId: string, elementId: string) {
  const context = useContext(ReadingInteractions);
  const [local, setLocal] = useState<Interaction>({});
  const key = interactionKey(pageId, elementId);
  return [context ? context.states.get(key) ?? {} : local,
    (next: Interaction) => context ? context.update(key, next) : setLocal(next)] as const;
}

const ornaments = { none: '', heart: '♡', branch: '❧', stars: '✧' };

function Message({ message, book, reading = false }: { message: SurpriseMessage; book: MemoryBookDocument; reading?: boolean }) {
  const image = message.assetId && book.assets[message.assetId];
  return <div className={s.message} tabIndex={reading ? 0 : undefined} aria-label={reading ? 'Hidden message' : undefined}>
    {message.ornament !== 'none' && <span className={s.ornament} aria-hidden="true">{ornaments[message.ornament]}</span>}
    {image && <img src={image.data} alt={image.name || 'A personal photograph'} draggable={false}/>}
    {message.words && <p>{message.words}</p>}
    {(message.date || message.place) && <small>{[message.date, message.place].filter(Boolean).join(' · ')}</small>}
  </div>;
}

const scratchPaths = {
  heart: 'M50 93C36 80 5 56 5 32C5 7 35 0 50 23C65 0 95 7 95 32C95 56 64 80 50 93Z',
  circle: 'M50 5A45 45 0 1 1 50 95A45 45 0 1 1 50 5Z',
  rectangle: 'M4 6H96V94H4Z',
};
const allowedScratchLength = 18_000;

function Scratch({ card, book, state, setState, interactive }: {
  card: Extract<Surprise, { type: 'scratch' }>; book: MemoryBookDocument; state: Interaction;
  setState: (value: Interaction) => void; interactive: boolean;
}) {
  const id = useId(), stroke = useRef<SVGPathElement>(null);
  const hasInkCut = interactive || !!state.scratches;
  const active = useRef<{ id: number; path: string; x: number; y: number }>(undefined);
  function scratch(event: PointerEvent<SVGSVGElement>, begin: boolean) {
    if (begin && (active.current || event.button !== 0)) return;
    if (begin && (state.scratches?.length ?? 0) >= allowedScratchLength) return;
    if (!begin && active.current?.id !== event.pointerId) return;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const x = Math.round(Math.max(-10, Math.min(110, point.x)) * 10) / 10;
    const y = Math.round(Math.max(-10, Math.min(110, point.y)) * 10) / 10;
    event.stopPropagation();
    if (begin) {
      event.currentTarget.setPointerCapture(event.pointerId);
      active.current = { id: event.pointerId, path: (state.scratches || '') + `M${x},${y}l.01,0`, x, y };
    } else {
      const draft = active.current!;
      if (draft.path.length >= allowedScratchLength || Math.hypot(x - draft.x, y - draft.y) < .8) return;
      draft.path += `L${x},${y}`;
      draft.x = x;
      draft.y = y;
    }
    if (active.current) stroke.current?.setAttribute('d', active.current.path);
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    if (active.current?.id !== event.pointerId) return;
    const path = active.current.path;
    active.current = undefined;
    setState({ scratches: path });
  }
  return <>
    <div className={s.scratchWell} data-revealed={!!state.revealed}>
      {(hasInkCut || state.revealed) && <div className={s.scratchMessage} aria-hidden={!state.revealed}
        style={{ clipPath: state.revealed ? undefined : `url(#${id}-outline)` }}>
        <Message message={card.message} book={book} reading={interactive && state.revealed}/>
      </div>}
      {!state.revealed && <>
        <svg className={s.scratchCoat} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
          data-scratch={interactive ? 'active' : undefined}
          onPointerDown={interactive ? event => scratch(event, true) : undefined}
          onPointerMove={interactive ? event => scratch(event, false) : undefined}
          onPointerUp={interactive ? finish : undefined} onPointerCancel={interactive ? finish : undefined}
          onLostPointerCapture={interactive ? finish : undefined}>
          <defs>
            <clipPath id={id + '-outline'} clipPathUnits="objectBoundingBox">
              <path transform="scale(.01)" d={scratchPaths[card.shape]}/>
            </clipPath>
            <pattern id={id + '-foil'} width="3" height="2" patternUnits="userSpaceOnUse">
              <path d="M0 .4H3M1 1.5H2.3" stroke="#fff9da" strokeOpacity=".45" strokeWidth=".45"/>
            </pattern>
            {hasInkCut && <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
              <rect width="100" height="100" fill="white"/>
              <path ref={stroke} d={state.scratches} fill="none" stroke="black" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
            </mask>}
          </defs>
          <g mask={hasInkCut ? `url(#${id})` : undefined}>
            <path d={scratchPaths[card.shape]} fill="#b79a6f" stroke="#9d815a" strokeWidth=".5"/>
            <path d={scratchPaths[card.shape]} fill={`url(#${id}-foil)`}/>
            <text x="50" y="49" textAnchor="middle" fill="#3e2d20" fontSize="7">{card.label.slice(0, 22)}</text>
          </g>
        </svg>
      </>}
    </div>
    {interactive && <div className={s.actions}>
      {!state.revealed && <button onClick={() => setState({ revealed: true })}>Reveal scratch card</button>}
      <button disabled={!state.revealed && !state.scratches} onClick={() => setState({})}>Reset</button>
    </div>}
  </>;
}

const popupCut = {
  heart: 'polygon(50% 95%, 6% 41%, 3% 24%, 10% 11%, 23% 4%, 36% 8%, 50% 23%, 64% 8%, 77% 4%, 90% 11%, 97% 24%, 94% 41%)',
  paired: 'polygon(31% 92%, 2% 53%, 2% 34%, 14% 26%, 31% 36%, 43% 24%, 54% 26%, 65% 39%, 74% 23%, 86% 21%, 98% 34%, 98% 50%, 67% 87%, 51% 63%)',
  flower: 'polygon(50% 3%, 65% 16%, 85% 12%, 90% 34%, 100% 49%, 88% 62%, 87% 81%, 67% 83%, 50% 98%, 33% 83%, 13% 81%, 12% 62%, 0 49%, 10% 34%, 15% 12%, 35% 16%)',
  birthday: 'polygon(3% 12%, 36% 19%, 50% 10%, 65% 19%, 97% 12%, 91% 47%, 98% 79%, 65% 73%, 50% 87%, 35% 73%, 2% 79%, 10% 47%)',
};

export function PaperSurprise({ element, book, pageId, interactive = false, front }: {
  element: BookElement; book: MemoryBookDocument; pageId: string; interactive?: boolean; front?: ReactNode;
}) {
  const card = element.surprise!;
  const stateLabel = useId();
  const [state, setState] = useInteraction(pageId, element.id);
  const opened = !!state.opened;
  const item = card.type === 'pocket' ? card.items.find(item => item.id === state.item) : undefined;
  const message = (value = card.message) => opened || item || interactive
    ? <Message message={value} book={book} reading={interactive && (opened || !!item)}/> : null;
  const actionNames = {
    envelope: ['Open envelope', 'Return letter'],
    fold: ['Unfold note', 'Fold note'],
    reverse: ['Turn photo over', 'Show photograph'],
    flap: ['Lift flap', 'Lower flap'],
    popup: ['Raise paper pop-up', 'Close paper pop-up'],
  } as const;
  return <div className={s.paperSurprise} data-paper={card.paper} data-surprise={card.type} data-open={opened || !!item}
    data-interactive={interactive || undefined} style={{
      '--stock': element.background, '--inside': card.insideColor, '--ink': card.ink,
    } as CSSProperties}>
    {card.type === 'scratch' ? <Scratch card={card} book={book} state={state} setState={setState} interactive={interactive}/> : <>
      <div className={s.art} id={interactive ? stateLabel : undefined}>
        {card.type === 'envelope' && <>
          <div className={s.envelopeBack}/>
          <div className={s.envelopeFlap} data-flap={card.flap}/>
          <div className={s.letter} aria-hidden={!opened}>{message()}</div>
          <div className={s.envelopePocket}><span>{card.label}</span></div>
          <div className={s.seal} style={{ backgroundColor: card.seal }} aria-hidden="true">{card.initials || '❧'}</div>
        </>}
        {card.type === 'fold' && <div className={s.foldBody} data-fold={card.fold}>
          <div className={s.foldInside} aria-hidden={!opened}>{message()}</div>
          <div className={s.foldLeaf}><span>{card.label}</span></div>
          {['accordion', 'double', 'square'].includes(card.fold) && <div className={s.secondLeaf}/>}
          {card.fold === 'accordion' && <div className={s.thirdLeaf}/>}
        </div>}
        {card.type === 'reverse' && <div className={s.photoTurn}>
          <div className={s.front} aria-hidden={opened}>{(!opened || interactive) && front}</div>
          <div className={s.reverse} aria-hidden={!opened}>{message()}</div>
        </div>}
        {card.type === 'flap' && <>
          <div className={s.flapInside} aria-hidden={!opened}>{message()}</div>
          <div className={s.flapFace} data-hinge={card.hinge}><span>{card.label}</span></div>
        </>}
        {card.type === 'pocket' && <>
          <div className={s.envelopeBack}/>
          {!item && <div className={s.pocketTabs}>{card.items.map((value, index) => interactive
            ? <button key={value.id} style={{ '--item': index } as CSSProperties}
              aria-label={`Pull out ${value.title || value.type}`} onClick={() => setState({ item: value.id })}>{value.title || value.type}</button>
            : <span key={value.id} style={{ '--item': index } as CSSProperties}>{value.title || value.type}</span>
          )}</div>}
          {item && <div className={s.keepsake} data-item={item.type}><strong>{item.title}</strong>{message(item)}</div>}
          <div className={s.envelopePocket}><span>{card.label}</span></div>
        </>}
        {card.type === 'popup' && <>
          <div className={s.popBase}/>
          <div className={s.popRise} style={{ '--cut': popupCut[card.style] } as CSSProperties} aria-hidden="true">
            <div/><div/>{card.style === 'birthday' && <span>Happy birthday</span>}
          </div>
          <div className={s.popMessage} aria-hidden={!opened}>{message()}</div>
          <div className={s.popFront}><span>{card.label}</span></div>
        </>}
      </div>
      {interactive && card.type !== 'pocket' && <div className={s.actions}>
        <button aria-expanded={opened} aria-controls={stateLabel} onClick={() => setState({ opened: !opened })}>
          {actionNames[card.type][opened ? 1 : 0]}
        </button>
      </div>}
      {interactive && card.type === 'pocket' && item && <div className={s.actions}>
        <button onClick={() => setState({})}>Return keepsake</button>
      </div>}
    </>}
  </div>;
}

export function SimpleSurprise({ element, book }: { element: BookElement; book: MemoryBookDocument }) {
  const card = element.surprise!;
  return <details className={s.simple}>
    <summary>{card.type === 'reverse' ? 'Reverse of photograph' : card.label || surpriseNames[card.type]}</summary>
    {card.type === 'pocket' ? card.items.map(item => <details key={item.id}>
      <summary>{item.title || item.type}</summary><Message book={book} message={item}/>
    </details>) : <Message book={book} message={card.message}/>}
  </details>;
}
