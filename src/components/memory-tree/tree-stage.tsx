'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { buildPaintedTree, gardenBaseline, gardenMiddle, leafPalette } from '@/lib/memory-tree-illustration';
import { displayDay, stage, type Tree } from '@/lib/memory-tree';

export type Focus = { id: string; grow?: boolean; reveal?: boolean };
const speciesNames = { cherry: 'Flowering cherry', oak: 'English oak', willow: 'Weeping willow' };

const blades = {
  cherry: 'M0 0Q5-6 8-8Q13-16 23-15Q30-16 36-10L46-2Q41 2 38 6Q34 12 28 13Q19 17 10 10Q5 6 0 0Z',
  oak: 'M0 0Q5-4 7-8Q9-13 14-10Q14-18 22-14Q28-18 33-12Q40-15 46-5Q48 2 44 5Q38 6 36 10Q30 16 25 12Q18 17 14 11Q8 11 5 6Z',
  willow: 'M0 0C10-13 25-13 47-2L51 3C31 4 25 12 10 6Q3 3 0 0Z',
};

const washes = {
  cherry: 'M4-1Q16-15 31-11Q36-9 42-3Q28-4 18 2Q10 4 4-1Z',
  oak: 'M4-1Q8-13 22-11Q30-15 39-6Q40-5 44-4Q27-3 17 2Z',
  willow: 'M4 0Q19-11 42-2Q25-3 16 2Z',
};
const cherryVariants = [
  blades.cherry,
  'M0 0Q6-8 12-11Q22-16 32-10Q39-6 47-6Q44-2 37 5Q29 14 18 13Q7 12 0 0Z',
  'M0 0Q5-7 13-10C23-19 32-15 38-8L47 0Q40 4 35 9Q26 17 16 12Q7 11 0 0Z',
];

const root = 'M397 470C406 485 404 495 394 502C378 514 350 515 327 526C360 523 389 527 410 518C415 516 414 523 400 531C421 529 427 521 431 513C440 520 460 523 485 526C469 518 457 511 450 504C444 497 437 484 433 475Z';
const grain = [
  'M407 514C431 478 384 456 393 420C400 393 428 367 425 340C424 316 411 286 420 258',
  'M432 508C414 485 409 464 408 446C401 417 433 382 431 359',
  'M393 514C408 502 412 496 411 487C407 471 393 464 390 445',
  'M433 378C441 346 421 316 413 288C404 253 424 243 420 219',
];

type Props = {
  tree: Tree;
  today: string;
  selected: string;
  focus: Focus | null;
  matches: ReadonlySet<string> | null;
  planted: boolean;
  onChoose: (id: string) => void;
  onRead: () => void;
  onPause: () => void;
};

const pigment = (rgb: number[]) => 'rgb(' + rgb.join(' ') + ')';
const tint = (rgb: number[], tone: number, amount: number) =>
  pigment(rgb.map(channel => Math.round(channel * (1 - amount) + tone * amount)));

export function TreeStage({ tree, today, selected, focus, matches, planted, onChoose, onRead, onPause }: Props) {
  const id = useId();
  const frame = useRef<HTMLDivElement>(null);
  const leafNodes = useRef(new Map<string, SVGElement>());
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [growth, setGrowth] = useState<{ id: string; key: number } | null>(null);
  const serial = useRef(0);
  const { seed, settings, memories } = tree;
  const count = memories.length;
  const { species, season, south } = settings;
  const paused = reduced || settings.paused;
  const model = useMemo(() => buildPaintedTree({ seed, settings: { species, season, south }, memories }, today),
    [seed, species, season, south, memories, today]);
  const tones = useMemo(() => leafPalette({ species, season, south }, today), [species, season, south, today]);
  const memoryById = useMemo(() => new Map(memories.map(memory => [memory.id, memory])), [memories]);
  const paintOrder = useMemo(() => {
    const order = model.leaves.map((leaf, index) => ({ leaf, index }));
    const chosen = model.leaves.findIndex(leaf => leaf.id === selected);
    if (chosen >= 0) order.push(order.splice(chosen, 1)[0]);
    return order;
  }, [model, selected]);
  const selectedMemory = memoryById.get(selected);
  const height = count ? 155 + 428 * model.size : 228;
  const width = count ? Math.min(840,548 + 292 * model.size) : 740;
  const top = 565 - height;
  const artStage = count ? count === 1 ? 'sprout' : 'tree' : planted ? 'seed' : 'empty';
  const woodTransform = 'translate(' + gardenMiddle + ' ' + gardenBaseline + ') scale(' + model.size +
    ') translate(' + -gardenMiddle + ' ' + -gardenBaseline + ')';
  const wash = (suffix: string) => 'url(#' + id + suffix + ')';

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    let intersects = true;
    const sync = () => setVisible(intersects && !document.hidden);
    const observer = typeof IntersectionObserver === 'undefined' ? null :
      new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; sync(); });
    if (observer) observer.observe(node);
    else sync();
    document.addEventListener('visibilitychange', sync);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);

  useEffect(() => {
    setGrowth(null);
    if (!focus?.grow || paused) return;
    setGrowth({ id: focus.id, key: ++serial.current });
    const timer = window.setTimeout(() => setGrowth(null), 1680);
    return () => window.clearTimeout(timer);
  }, [focus, paused]);

  useEffect(() => {
    if (focus?.reveal) leafNodes.current.get(focus.id)?.focus({ preventScroll: true });
  }, [focus]);

  function keyOnLeaf(event: KeyboardEvent<SVGElement>, index: number) {
    const leaf = model.leaves[index];
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChoose(leaf.id);
      return;
    }
    const byKey: Record<string, number> = {
      ArrowLeft: index - 1, ArrowUp: index - 1, ArrowRight: index + 1, ArrowDown: index + 1,
      Home: 0, End: count - 1,
    };
    const next = byKey[event.key];
    if (next === undefined) return;
    event.preventDefault();
    leafNodes.current.get(model.leaves[(next + count) % count].id)?.focus();
  }

  return (
    <div className="mt-stage" ref={frame} data-stage={artStage} data-motion={!paused && visible}>
      <div className="mt-specimen">
        <svg className="mt-painting" viewBox={(840 - width) / 2 + ' ' + top + ' ' + width + ' ' + height}
          width={width} height={height} role="group" aria-label={count ? 'Illustrated Memory Tree' : planted ? 'A seed resting in the earth' : 'Earth ready for a seed'}>
          <defs>
            <radialGradient id={id+'soil'}>
              <stop stopColor="#a59166" stopOpacity=".37"/>
              <stop offset=".57" stopColor="#c5b88e" stopOpacity=".21"/>
              <stop offset="1" stopColor="#d5c7a7" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id={id+'wood'} x1="7%" y1="64%" x2="100%" y2="20%">
              <stop stopColor="#71583f"/><stop offset=".26" stopColor="#9e7952"/>
              <stop offset=".49" stopColor="#bf9a66"/><stop offset=".65" stopColor="#a27c54"/>
              <stop offset=".87" stopColor="#846143"/><stop offset="1" stopColor="#a58e64"/>
            </linearGradient>
            <linearGradient id={id+'seed'} x1="30%" y1="0%" x2="62%" y2="100%">
              <stop stopColor="#bf9867"/><stop offset=".6" stopColor="#8e6949"/><stop offset="1" stopColor="#69543e"/>
            </linearGradient>
            {tones.map((tone, index) => (
              <linearGradient key={index} id={id+'leaf'+index} x1="0%" y1="5%" x2="82%" y2="100%">
                <stop stopColor={tint(tone, 243, .44)} stopOpacity=".78"/>
                <stop offset=".34" stopColor={pigment(tone)} stopOpacity=".93"/>
                <stop offset=".72" stopColor={tint(tone, 61, .17)} stopOpacity=".9"/>
                <stop offset="1" stopColor={tint(tone, 244, .22)} stopOpacity=".84"/>
              </linearGradient>
            ))}
            <g id={id+'flower'}>
              <path d="M0-2C-7-9-1-13 3-8C6-13 11-8 6-3C14-3 13 3 6 3C9 11 1 11 1 5C-5 11-10 5-4 1C-11-2-7-7 0-2Z" fill="#fff3df" stroke="#b98d73" strokeWidth=".65"/>
              <circle r="2.3" fill="#b3825d"/><circle cx="1.8" cy="-1.9" r=".65" fill="#f3d29a"/>
            </g>
            <clipPath id={id+'bark-edge'}>
              {count > 3 && <path d={root}/>}
              {model.trunk.map(d => <path key={d} d={d}/>)}
            </clipPath>
            <filter id={id+'paper-grain'} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency=".54" numOctaves="3" seed="4" stitchTiles="stitch"/>
              <feColorMatrix type="saturate" values="0"/>
            </filter>
          </defs>

          <g aria-hidden="true">
            <ellipse cx="418" cy="512" rx={count > 4 ? 208 : 130} ry={count ? 27 : 22} fill={wash('soil')}/>
            <path d="M303 515C337 509 358 517 377 512C398 506 412 507 437 510C466 505 503 518 538 513M330 522C366 525 383 519 414 520M462 520C479 521 501 525 524 520"
              fill="none" stroke="#b3a274" opacity=".42" strokeLinecap="round" strokeWidth="1.4"/>
            <path d="M353 515q8-5 16-4m26 10 9-2m33-6 12-2m36 8q13-3 20-1m-99 7 8-1"
              fill="none" stroke="#887457" opacity=".39" strokeLinecap="round" strokeWidth="1.2"/>
            <path d="M385 512l-5-8m5 8 5-6m79 11 5-7m-5 7-2-6m-94 3-4-3"
              fill="none" stroke="#9a9b6a" opacity=".68" strokeLinecap="round" strokeWidth="1.2"/>
          </g>

          {!count && planted && (
            <g className="mt-ink-seed" aria-hidden="true" transform="translate(418 508)">
              <g key={growth?.id === 'seed' ? growth.key : 'seed'} data-growing={growth?.id === 'seed'}>
                <path d="M-22-3C-21-12-10-21 0-25C9-28 19-26 22-17C25-7 13 1 4 4C-5 8-19 7-22-3Z" fill={wash('seed')}/>
                <path d="M-16 0C-15-7-4-16 11-22M-11 2Q-3-3 7-4M-12-9Q-9-13-4-15" fill="none" stroke="#d9bb8d" strokeWidth="1.5" strokeLinecap="round" opacity=".75"/>
              </g>
            </g>
          )}

          {!!count && <g className="mt-growth-shape" transform={woodTransform}>
            <g className="mt-ink-wood" aria-hidden="true" data-sprouting={count === 1 && growth?.id === selected}>
              {count > 3 && <path d={root} fill={wash('wood')} opacity=".91"/>}
              {model.boughs.map((d, index) => <path key={index} d={d} fill={wash('wood')} opacity=".92"/>)}
              {model.trunk.map((d, index) => <path key={index} d={d} fill={wash('wood')}/>)}
              <g clipPath={wash('bark-edge')}>
                {model.bark.map((d, index) => (
                  <path key={index} d={d} fill="none" stroke="#e2be89" strokeWidth={index ? 1.5 : 2.2} opacity=".52"/>
                ))}
                {count > 4 && species === 'cherry' && grain.map((d,index) => (
                  <path key={index} d={d} fill="none" stroke={index % 2 ? '#71533e' : '#d7ad7f'} strokeWidth="1.25" opacity=".5"/>
                ))}
                <rect x="300" y="37" width="236" height="499" filter={wash('paper-grain')} opacity=".14" className="mt-paper-grain"/>
              </g>
              <g fill="none" stroke="#967953" strokeLinecap="round" opacity=".78">
                {model.sprays.map(({path,width},index) => <path key={index} d={path} strokeWidth={width}/>)}
                {model.leaves.map(leaf => <path key={leaf.id} d={leaf.stem} strokeWidth="1.45"/>)}
              </g>
            </g>
            {paintOrder.map(({ leaf,index }) => {
              const memory = memoryById.get(leaf.id)!;
              const isSelected = selected === leaf.id;
              const activeGrowth = growth?.id === leaf.id;
              const sways = count >= 5 && leaf.slot % Math.max(6,Math.ceil(count / 8)) === 0;
              const detailed = count <= 360 || isSelected;
              const blade = species === 'cherry' ? cherryVariants[Math.floor(leaf.wash * 3)] : blades[species];
              const bindLeaf = (node: SVGElement | null) => {
                if (node) leafNodes.current.set(leaf.id, node);
                else leafNodes.current.delete(leaf.id);
              };
              const interaction = {
                ref: bindLeaf,
                role: 'button',
                'data-memory-id': leaf.id,
                'data-slot': leaf.slot,
                'data-muted': Boolean(matches && !matches.has(leaf.id)),
                'aria-label': memory.title + ', ' + displayDay(memory.date) + (memory.milestone ? ', milestone' : ''),
                'aria-pressed': isSelected,
                tabIndex: isSelected || (!selectedMemory && index === 0) ? 0 : -1,
                transform: 'translate(' + leaf.x + ' ' + leaf.y + ') rotate(' + leaf.angle + ') scale(' + leaf.size + ')',
                onClick: () => onChoose(leaf.id),
                onKeyDown: (event: KeyboardEvent<SVGElement>) => keyOnLeaf(event,index),
              };
              if (!detailed && !activeGrowth) {
                return <path key={leaf.id} {...interaction} className="mt-ink-leaf mt-leaf-pigment mt-compact-leaf"
                  d={blade} fill={wash('leaf'+leaf.palette)}/>;
              }
              return (
                <g key={leaf.id} {...interaction} className="mt-ink-leaf">
                  <title>{memory.title}</title>
                  <g className="mt-ink-leaf-pose" key={activeGrowth ? growth.key : 'leaf'} data-growing={activeGrowth}>
                    <g className={sways ? 'mt-ink-sway' : undefined} style={{ '--mt-drift': (leaf.wash * -8) + 's' } as CSSProperties}>
                      <path className="mt-leaf-halo" d={blade}/>
                      <path className="mt-leaf-pigment" d={blade} fill={wash('leaf'+leaf.palette)}/>
                      {detailed && <>
                        <path className="mt-leaf-wash" d={washes[species]} fill="#fff6ce" opacity={.18 + leaf.wash * .24}/>
                        <path d="M2 0Q20-2 43-2M12-1 17-8m2 7 7-9m0 9 7-6M12 0l6 7m2-7 8 8m0-9 7 4"
                          className="mt-leaf-veins" fill="none" aria-hidden="true"/>
                      </>}
                    </g>
                  </g>
                  {leaf.flower && (count < 190 || isSelected) && <use href={'#'+id+'flower'} transform="translate(0 -9) scale(.88)" className="mt-leaf-flower" aria-hidden="true"/>}
                </g>
              );
            })}
          </g>}
        </svg>
      </div>
      {count > 0 && (
        <div className="mt-stage-caption">
          <p>{stage(count)} <span aria-hidden="true">·</span> {speciesNames[species]}</p>
          {selectedMemory && <button className="mt-selected-leaf" onClick={onRead}>
            <span>{selectedMemory.title}</span><span aria-hidden="true">↗</span>
          </button>}
        </div>
      )}
      {(count > 0 || planted) && (
        <div className="mt-growth-actions">
          {growth && <button className="mt-link" onClick={() => setGrowth(null)}>Skip growth</button>}
          <button className="mt-link" disabled={reduced} onClick={onPause}>
            {reduced ? 'Reduced motion' : settings.paused ? 'Resume motion' : 'Pause motion'}
          </button>
        </div>
      )}
    </div>
  );
}
