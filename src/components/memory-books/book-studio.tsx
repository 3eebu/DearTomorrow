'use client';
/* Personal images stay local. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react';
import { blankPage, LIMITS, newElement, uid, stickers, shapeNames, type BookElement, type BookPage, type DrawingStroke, type ElementKind, type MemoryBookDocument } from '@/lib/memory-books';
import { exportBook, readPhoto } from '@/lib/memory-book-storage';
import { constrain, outside, resizeObject, snapPosition, alignObjects, transformSelection, strokeHit } from '@/lib/studio-geometry';
import { copyObjects, insertPhoto, moveObjects } from '@/lib/studio-document';
import { StudioHistory } from '@/lib/studio-history';
import { clonePage, editText, templateNames, templatePage, textStyles } from '@/lib/studio-content';
import { ElementContent, elementStyle, PageContent } from './page-content';
import { CreativeGraphic, PaperBackground, strokePath } from './creative-objects';
import { StudioInspector } from './studio-inspector';
import { StudioBookSettings } from './studio-settings';
import s from './studio.module.css';
import shared from './memory-books.module.css';

type Tool = 'writing' | 'photos' | 'polaroids' | 'decorations' | 'shapes' | 'draw' | 'templates' | 'layers' | 'book' | 'pan';
type Gesture = { originals: BookElement[]; next: BookElement[]; x: number; y: number; rect: DOMRect; mode: string; pageId: string; nodes: Map<string, HTMLElement>; frames: number[]; previous: number };
const tools: [Tool, string, string][] = [['writing','T','Writing'],['photos','▧','Photos'],['polaroids','▣','Polaroids'],['decorations','❧','Little things'],['shapes','◇','Shapes'],['draw','〰','Draw'],['templates','▤','Layouts'],['layers','▱','Layers'],['book','⌑','Book'],['pan','✥','Hand']];
const handles = ['nw','n','ne','e','se','s','sw','w'];
export function BookStudio({ book, onChange, status, onRead, onDone, onError }: {
  book: MemoryBookDocument; onChange: (book: MemoryBookDocument) => void; status: string; onRead: () => void; onDone: () => void; onError: (message: string) => void;
}) {
  const [pageId, setPageId] = useState(book.pages[0].id), [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('writing'), [collection, setCollection] = useState(true), [properties, setProperties] = useState(true), [pagesOpen, setPagesOpen] = useState(true);
  const [zoom, setZoom] = useState(1), [grid, setGrid] = useState(false), [safe, setSafe] = useState(false), [gutter, setGutter] = useState(false), [snap, setSnap] = useState(true), [bleed, setBleed] = useState(true);
  const [fitWidth, setFitWidth] = useState(400);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('all'), [inline, setInline] = useState<string | null>(null), [overflow, setOverflow] = useState(false);
  const [historyTick, setHistoryTick] = useState(0), [uploading, setUploading] = useState(false);
  const [groupScale, setGroupScale] = useState(100), [groupAngle, setGroupAngle] = useState(0);
  const [multiSelect, setMultiSelect] = useState(false);
  const [clipboardCount, setClipboardCount] = useState(0);
  const [drawTool, setDrawTool] = useState<DrawingStroke['tool'] | 'eraser'>('pen'), [drawColor, setDrawColor] = useState('#643e4a'), [drawWidth, setDrawWidth] = useState(.5), [drawOpacity, setDrawOpacity] = useState(1);
  const latest = useRef(book); latest.current = book;
  const history = useRef(new StudioHistory()), clipboard = useRef<BookElement[]>([]), photoInput = useRef<HTMLInputElement>(null), replaceTarget = useRef<{ page: string; object: string } | null>(null);
  const canvas = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null), draft = useRef<SVGPathElement>(null), guides = useRef<HTMLDivElement>(null);
  const frame = useRef(0), gesture = useRef<Gesture | null>(null), drawing = useRef<DrawingStroke | null>(null), erased = useRef(new Set<string>()), layerDrag = useRef('');
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null), pointers = useRef(new Map<number, { x: number; y: number }>()), pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const page = book.pages.find(p => p.id === pageId) || book.pages[0], pageIndex = book.pages.indexOf(page);
  const selected = page.elements.filter(e => selectedIds.includes(e.id)), e = selected.length === 1 ? selected[0] : undefined;
  const locked = selected.length === 0 || selected.every(v => v.locked), size = { width: book.widthMm, height: book.heightMm };
  useLayoutEffect(() => {
    const media = matchMedia('(max-width:900px)');
    const adapt = () => { if (media.matches) { setCollection(false); setProperties(false); } };
    adapt(); media.addEventListener('change', adapt); return () => media.removeEventListener('change', adapt);
  }, []);
  useLayoutEffect(() => {
    const node = viewport.current; if (!node) return;
    const fit = () => { const style = getComputedStyle(node); setFitWidth(Math.max(100, Math.min(620, node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), (node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) * book.widthMm / book.heightMm))); };
    const observer = new ResizeObserver(fit); observer.observe(node); fit(); return () => observer.disconnect();
  }, [book.widthMm, book.heightMm]);
  useEffect(() => {
    const node = viewport.current; if (!node) return;
    const wheel = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom(v => constrain(v * Math.exp(-event.deltaY * .003), .5, 3)); } };
    node.addEventListener('wheel', wheel, { passive: false }); return () => node.removeEventListener('wheel', wheel);
  }, []);

  function commit(next: MemoryBookDocument, key = '') {
    if (next === latest.current) return;
    history.current.record(latest.current, next, key); latest.current = next; onChange(next); setHistoryTick(v => v + 1);
  }
  function changePage(next: BookPage, key = '') { const current = latest.current; commit({ ...current, pages: current.pages.map(p => p.id === next.id ? next : p) }, key ? `${next.id}:${key}` : ''); }
  function patch(patch: Partial<BookElement>, key = '') {
    if (!e || (e.locked && !Object.hasOwn(patch, 'locked'))) return;
    const next = { ...e, ...patch };
    if (e.aspectLocked && ((patch.width !== undefined) !== (patch.height !== undefined))) {
      if (patch.width !== undefined) next.height = constrain(e.height * next.width / e.width, 1, 200);
      else next.width = constrain(e.width * next.height / e.height, 1, 200);
    }
    changePage({ ...page, elements: page.elements.map(v => v.id === e.id ? next : v) }, key);
  }
  function applySelection(patch: Partial<BookElement>, includeLocked = false) { changePage({ ...page, elements: page.elements.map(v => selectedIds.includes(v.id) && (includeLocked || !v.locked) ? { ...v, ...patch } : v) }); }
  function restore(forward: boolean) { finish(true); const next = forward ? history.current.redo(latest.current) : history.current.undo(latest.current); if (next) { latest.current = next; onChange(next); setInline(null); setHistoryTick(v => v + 1); } }
  function addElement(kind: ElementKind, patch: Partial<BookElement> = {}) {
    if (page.elements.length >= LIMITS.elements) { onError('This page supports 100 objects. Add another page to keep creating.'); return; }
    const element = { ...newElement(kind), ...patch }; changePage({ ...page, elements: [...page.elements, element] }); setSelectedIds([element.id]);
    if (matchMedia('(max-width:900px)').matches) { setCollection(false); setProperties(false); } else setProperties(true);
  }
  function select(element: BookElement, additive = false) {
    const ids = page.elements.filter(v => v.id === element.id || (element.groupId && v.groupId === element.groupId)).map(v => v.id);
    const next = additive ? selectedIds.includes(element.id) ? selectedIds.filter(id => !ids.includes(id)) : [...new Set([...selectedIds, ...ids])] : ids;
    setSelectedIds(next); return next;
  }
  function paste(items = clipboard.current) {
    if (page.elements.length + items.length > LIMITS.elements) { onError('Pasting would exceed 100 objects on this page. Add a new page first.'); return; }
    if (!items.length) return;
    const copies = copyObjects(items); changePage({ ...page, elements: [...page.elements, ...copies] }); setSelectedIds(copies.map(v => v.id));
  }
  function copySelection() { clipboard.current = selected; setClipboardCount(selected.length); }
  function remove() { if (!locked) { changePage({ ...page, elements: page.elements.filter(v => !selectedIds.includes(v.id) || v.locked) }); setSelectedIds([]); } }
  function layer(where: number) {
    const items = [...page.elements], moving = items.filter(v => selectedIds.includes(v.id) && !v.locked);
    if (!moving.length) return;
    const rest = items.filter(v => !moving.includes(v));
    const first = items.indexOf(moving[0]), target = where === Infinity ? rest.length : where === -Infinity ? 0 : constrain(first + where, 0, rest.length);
    rest.splice(target, 0, ...moving); changePage({ ...page, elements: rest });
  }
  function group() { if (selected.length > 1 && !selected.some(v => v.locked)) applySelection({ groupId: uid() }); }
  function addPage(copy = false, content?: BookPage) {
    const current = latest.current, source = current.pages.find(p => p.id === page.id) || current.pages[0];
    if (current.pages.length >= LIMITS.pages) { onError('This book supports 200 pages. Export a backup and start another volume.'); return; }
    const next = content || (copy ? clonePage(source) : blankPage(source.chapterId));
    const pages = [...current.pages]; pages.splice(pages.findIndex(p => p.id === source.id) + 1, 0, next); commit({ ...current, pages }); setPageId(next.id); setSelectedIds([]); setInline(null);
  }
  async function upload(files: File[], replacement = replaceTarget.current) {
    replaceTarget.current = null; const destination = replacement?.page || page.id; setUploading(true);
    try {
      for (const file of replacement ? files.slice(0, 1) : files) {
        try { const data = await readPhoto(file); commit(insertPhoto(latest.current, destination, data, file.name, replacement?.object)); }
        catch (error) { onError(error instanceof Error ? error.message : 'Unable to prepare this photograph.'); }
      }
    } finally { setUploading(false); }
  }
  function start(event: PointerEvent<HTMLElement>, element: BookElement, mode: string) {
    if (tool === 'draw' || tool === 'pan' || pointers.current.size > 1) return;
    event.stopPropagation();
    const additive = event.shiftKey || multiSelect;
    const ids = additive ? select(element, true) : selectedIds.includes(element.id) ? selectedIds : select(element);
    if (additive || element.locked || !canvas.current || inline) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const originals = page.elements.filter(v => ids.includes(v.id) && !v.locked), nodes = new Map<string, HTMLElement>();
    canvas.current.querySelectorAll<HTMLElement>('[data-object]').forEach(node => { if (node.dataset.object) nodes.set(node.dataset.object, node); });
    gesture.current = { originals, next: originals, x: event.clientX, y: event.clientY, rect: canvas.current.getBoundingClientRect(), mode, pageId: page.id, nodes, frames: [], previous: 0 };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const g = gesture.current; if (!g) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (g.mode === 'move') {
      let offsetX = dx / g.rect.width * 100, offsetY = dy / g.rect.height * 100;
      if (snap && !event.altKey && g.originals.length === 1) {
        const value = snapPosition({ ...g.originals[0], x: g.originals[0].x + offsetX, y: g.originals[0].y + offsetY }, page.elements.filter(v => !selectedIds.includes(v.id)), 6 / g.rect.width * 100);
        offsetX = value.element.x - g.originals[0].x; offsetY = value.element.y - g.originals[0].y;
        if (guides.current) { guides.current.style.setProperty('--guide-x', `${value.guides.x ?? -100}%`); guides.current.style.setProperty('--guide-y', `${value.guides.y ?? -100}%`); }
      }
      g.next = g.originals.map(v => ({ ...v, x: constrain(v.x + offsetX, -100, 200), y: constrain(v.y + offsetY, -100, 200) }));
    } else if (g.mode === 'rotate') {
      g.next = g.originals.map(v => {
        const cx = g.rect.left + (v.x + v.width / 2) / 100 * g.rect.width, cy = g.rect.top + (v.y + v.height / 2) / 100 * g.rect.height;
        let a = v.rotation + (Math.atan2(event.clientY - cy, event.clientX - cx) - Math.atan2(g.y - cy, g.x - cx)) * 180 / Math.PI;
        a = ((a + 540) % 360) - 180; if (event.shiftKey) a = Math.round(a / 15) * 15;
        return { ...v, rotation: a };
      });
    } else g.next = g.originals.map(v => resizeObject(v, dx, dy, g.mode, { width: g.rect.width, height: g.rect.height }, v.aspectLocked || event.shiftKey));
    cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(time => {
      if (g.previous) g.frames.push(time - g.previous); g.previous = time;
      g.next.forEach(v => { const node = g.nodes.get(v.id); if (node) Object.assign(node.style, elementStyle(v)); });
    });
  }
  function finish(cancel = false) {
    const g = gesture.current; if (!g) return;
    cancelAnimationFrame(frame.current); gesture.current = null;
    if (guides.current) { guides.current.style.setProperty('--guide-x', '-100%'); guides.current.style.setProperty('--guide-y', '-100%'); }
    if (cancel) { g.originals.forEach(v => { const node = g.nodes.get(v.id); if (node) Object.assign(node.style, elementStyle(v)); }); return; }
    const current = latest.current;
    if (g.next.some((v, i) => JSON.stringify(v) !== JSON.stringify(g.originals[i]))) commit({ ...current, pages: current.pages.map(p => p.id === g.pageId ? { ...p, elements: p.elements.map(v => g.next.find(n => n.id === v.id) || v) } : p) });
    if (process.env.NODE_ENV === 'development' && canvas.current && g.frames.length) { const f = g.frames.sort((a,b)=>a-b); canvas.current.dataset.dragTiming = JSON.stringify({ frames: f.length, median: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * .95)] }); }
  }
  const commands = useRef({ key: (_event: KeyboardEvent) => {} });
  commands.current.key = event => {
    if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
    const mod = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
    if (mod && ['z','y','c','v','d','a','g'].includes(key)) {
      event.preventDefault();
      if (key === 'z' || key === 'y') restore(event.shiftKey || key === 'y');
      if (key === 'c') copySelection();
      if (key === 'v') paste(); if (key === 'd') paste(selected);
      if (key === 'a') setSelectedIds(page.elements.filter(v => !v.hidden).map(v => v.id));
      if (key === 'g') { if (event.shiftKey) applySelection({ groupId: undefined }); else group(); }
    }
    if (key === 'escape') { finish(true); setSelectedIds([]); }
    if (['delete','backspace'].includes(key)) { event.preventDefault(); remove(); }
    if (event.key.startsWith('Arrow') && selected.length) {
      event.preventDefault(); const n = event.shiftKey ? 2 : .2;
      const dx = event.key === 'ArrowLeft' ? -n : event.key === 'ArrowRight' ? n : 0, dy = event.key === 'ArrowUp' ? -n : event.key === 'ArrowDown' ? n : 0;
      changePage({ ...page, elements: page.elements.map(v => selectedIds.includes(v.id) && !v.locked ? { ...v, x: constrain(v.x + dx, -100, 200), y: constrain(v.y + dy, -100, 200) } : v) }, `nudge:${selectedIds.join()}`);
    }
  };
  useEffect(() => { const key = (event: KeyboardEvent) => commands.current.key(event); document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); cancelAnimationFrame(frame.current); }; }, []);
  useEffect(() => {
    const object = e && [...(canvas.current?.querySelectorAll<HTMLElement>('[data-object]') || [])].find(node => node.dataset.object === e.id);
    const node = e?.kind === 'text' && object?.querySelector<HTMLElement>('[data-writing]');
    if (!node) { setOverflow(false); return; }
    const check = () => setOverflow(node.scrollHeight > node.clientHeight + 2); const observer = new ResizeObserver(check); observer.observe(node); check(); return () => observer.disconnect();
  }, [e, zoom]);
  function point(event: PointerEvent) { const rect = canvas.current!.getBoundingClientRect(); return [constrain((event.clientX - rect.left) / rect.width * 100, 0, 100), constrain((event.clientY - rect.top) / rect.height * 100, 0, 100), event.pressure || .5] as [number, number, number]; }
  function drawStart(event: PointerEvent<HTMLDivElement>) {
    if (tool !== 'draw' || pointers.current.size > 1) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedIds([]);
    drawing.current = { id: uid(), tool: drawTool === 'eraser' ? 'pen' : drawTool, color: drawColor, width: drawWidth, opacity: drawTool === 'highlighter' ? drawOpacity * .3 : drawOpacity, points: [point(event)] }; erased.current.clear(); drawMove(event);
  }
  function drawMove(event: PointerEvent<HTMLDivElement>) {
    const line = drawing.current; if (!line) return;
    const pt = point(event);
    if (drawTool === 'eraser') {
      page.elements.filter(v => v.kind === 'drawing' && !v.locked && !v.hidden).forEach(v => v.strokes?.forEach(stroke => {
        if (strokeHit(v,stroke,pt,size)) erased.current.add(JSON.stringify([v.id,stroke.id]));
      }));
    } else {
      if (line.points.length >= LIMITS.points) return;
      const previous = line.points[line.points.length-1]; if (Math.hypot(pt[0]-previous[0],pt[1]-previous[1]) > .12) line.points.push(pt);
      cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => { if (draft.current) draft.current.setAttribute('d', strokePath(line)); });
    }
  }
  function drawFinish(cancel = false) {
    const line = drawing.current; if (!line) return; drawing.current = null; cancelAnimationFrame(frame.current); draft.current?.setAttribute('d', '');
    if (cancel) return;
    if (drawTool === 'eraser') { changePage({ ...page, elements: page.elements.map(v => v.kind === 'drawing' && !v.locked ? { ...v, strokes: v.strokes?.filter(stroke => !erased.current.has(JSON.stringify([v.id,stroke.id]))) } : v) }); return; }
    const previous = [...page.elements].reverse().find(v => v.kind === 'drawing' && !v.locked && v.x === 0 && v.y === 0 && v.width === 100 && v.height === 100 && v.rotation === 0 && (v.strokes?.length || 0) < LIMITS.strokes);
    if (previous) changePage({ ...page, elements: page.elements.map(v => v.id === previous.id ? { ...v, strokes: [...(v.strokes || []), line] } : v) });
    else addElement('drawing', { x: 0, y: 0, width: 100, height: 100, rotation: 0, name: 'A personal drawing', strokes: [line], text: '' });
  }
  function touchDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) { finish(true); drawFinish(true); const [a,b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x-b.x,a.y-b.y), zoom }; event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }
    else if (tool === 'pan') { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; }
  }
  function touchMove(event: PointerEvent<HTMLDivElement>) {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) { event.stopPropagation(); const [a,b] = [...pointers.current.values()]; setZoom(constrain(pinch.current.zoom * Math.hypot(a.x-b.x,a.y-b.y) / Math.max(1,pinch.current.distance), .5, 3)); }
    if (pan.current && viewport.current) { viewport.current.scrollLeft = pan.current.left + pan.current.x - event.clientX; viewport.current.scrollTop = pan.current.top + pan.current.y - event.clientY; }
  }
  function go(id: string) { finish(true); drawFinish(true); setPageId(id); setSelectedIds([]); setInline(null); }
  const matchingStickers = stickers.filter(v => v.includes(search.toLowerCase()) && (category === 'all' || ({ romance: ['heart','bow'], botanical: ['branch','rose','daisy'], stationery: ['tape','stamp','label','bookmark'], celebrations: ['stars'], travel: ['ticket','postmark'] }[category]?.includes(v))));
  const selectedSet = new Set(selectedIds);
  return <div className={s.studio} data-history={historyTick}>
    <header className={s.topbar}><button onClick={onDone}>← <span className={s.desktopLabel}>Library</span></button><div className={s.title}><input aria-label="Book title" maxLength={120} value={book.title} onChange={ev => commit({ ...book, title: ev.target.value }, 'book-title')}/><small role="status">{status}{uploading ? ' · Preparing photos…' : ''}</small></div><div className={s.undo}><button disabled={!history.current.past.length} aria-label="Undo" onClick={() => restore(false)}>↶</button><button disabled={!history.current.future.length} aria-label="Redo" onClick={() => restore(true)}>↷</button></div><button className={s.export} onClick={() => exportBook(latest.current)}>Export</button><button className={shared.primary} onClick={onRead}>Read my book ↗</button></header>
    <div className={`${s.workspace} ${collection ? s.withCollection : ''} ${properties ? s.withProperties : ''}`}>
      <nav className={s.rail} aria-label="Creative tools">{tools.map(([name,icon,label]) => <button key={name} aria-pressed={collection && tool === name} onClick={() => { setTool(name); if(matchMedia('(max-width:900px)').matches)setProperties(false); setCollection(tool !== name || !collection); setSearch(''); }}><b aria-hidden="true">{icon}</b><span>{label}</span></button>)}</nav>
      {collection && <aside className={s.collection} aria-label={`${tool} collection`}><div className={s.panelHeading}><h2>{tools.find(t=>t[0]===tool)?.[2]}</h2><button aria-label="Close collection" onClick={() => setCollection(false)}>×</button></div>
        {tool === 'writing' && <><p className={s.help}>A few words. A whole love letter. Every line is yours.</p>{textStyles.map(([label,fontSize,font,text]) => <button className={s.textSample} key={label} onClick={() => addElement('text', { name: label, fontSize, font, text, height: label === 'Paragraph' || label === 'Handwritten letter' ? 50 : 20, italic: label === 'Quote' })}><strong style={{ fontFamily: font === 'hand' ? 'cursive' : font === 'sans' ? 'Arial' : font === 'mono' ? 'monospace' : 'Georgia' }}>{label}</strong><small>{text.slice(0,42)}</small></button>)}<button onClick={() => addElement('note')}>＋ A folded little note</button></>}
        {tool === 'photos' && <><button className={s.upload} disabled={uploading} onClick={() => { replaceTarget.current = null; photoInput.current?.click(); }}>＋ Add photographs</button><p className={s.help}>Drop JPEG, PNG or WebP files onto the canvas. Up to 8 MB each. Prepared and kept only on this device. Transparent PNGs are welcome.</p><div className={s.assets}>{Object.entries(book.assets).map(([id,a]) => <button key={id} aria-label={`Insert ${a.name}`} onClick={() => addElement('photo', { assetId: id, text: a.name })}><img src={a.data} alt={a.name} loading="lazy"/><small>{a.name}</small></button>)}</div>{!Object.keys(book.assets).length && <p className={s.empty}>Your photographs will live here, ready to use again.</p>}</>}
        {tool === 'polaroids' && <><p className={s.help}>A photograph, a few words underneath, and a little room for feeling.</p>{['classic','vintage','wide','mini','retro','thin','custom'].map((frame,i) => <button key={frame} className={s.frameSample} onClick={() => addElement('polaroid', { frame: frame as BookElement['frame'], name: `${frame} instant photo`, background: i===1 ? '#e8dec7' : '#fffaf0', frameMargin: i===5 ? 2 : 5, captionMargin: i===5 ? 9 : 20, width: i===2 ? 62 : i===3 ? 30 : 45, height: i===2 ? 43 : 52 })}><span className={s.miniPolaroid} style={{ background: i===1 ? '#e8dec7' : '#fffaf0', transform: `rotate(${i%2 ? 4 : -4}deg)` }}><i/></span><span>{frame}<small>Fully yours to customize</small></span></button>)}</>}
        {tool === 'decorations' && <><label>Find a little thing<input value={search} onChange={ev=>setSearch(ev.target.value)} placeholder="A leaf, a bow…"/></label><label>Collection<select value={category} onChange={ev=>setCategory(ev.target.value)}>{['all','romance','botanical','stationery','celebrations','travel'].map(c=><option key={c}>{c}</option>)}</select></label><div className={s.decorations}>{matchingStickers.map(sticker => <button key={sticker} aria-label={`Add ${sticker}`} onClick={() => addElement('sticker', { sticker, name: sticker, text: '', x: 35, y: 35, width: sticker === 'tape' ? 30 : 20, height: sticker === 'tape' ? 10 : 20, color: ['branch','rose','daisy'].includes(sticker) ? '#78836b' : '#79505a', background: sticker === 'tape' ? '#d8c8a4' : '#e8c8bf', rotation: -5 })}><CreativeGraphic element={{ ...newElement('sticker'), sticker, background: '#ead7c5', color: '#79505a' }}/><small>{sticker}</small></button>)}</div>{!matchingStickers.length && <p className={s.help}>No little things match this search.</p>}</>}
        {tool === 'shapes' && <div className={s.decorations}>{shapeNames.map(shape => <button key={shape} aria-label={`Add ${shape}`} onClick={() => addElement('shape', { shape, name: shape, text: '', width: 30, height: shape === 'line' || shape === 'arrow' ? 5 : 30, background: '#e8c8bf', fillNone: ['line','arrow','border'].includes(shape) })}><CreativeGraphic element={{ ...newElement('shape'), shape, background: '#e8c8bf' }}/><small>{shape}</small></button>)}</div>}
        {tool === 'draw' && <><p className={s.help}>A signature, a small sketch, a line only you could make. Draw directly on the page.</p><div className={s.drawTools}>{(['pencil','pen','marker','highlighter','eraser'] as const).map(name => <button key={name} aria-pressed={drawTool === name} onClick={()=>{setDrawTool(name);if(name!=='eraser'){setDrawWidth(({pencil:.25,pen:.5,marker:1.4,highlighter:2.6})[name]);setDrawOpacity(name==='marker'?.85:1);}}}>{name}</button>)}</div><label>Ink<input type="color" value={drawColor} onChange={ev=>setDrawColor(ev.target.value)}/></label><label>Stroke width<input type="range" min=".1" max="4" step=".1" value={drawWidth} onChange={ev=>setDrawWidth(Number(ev.target.value))}/></label><label>Opacity<input type="range" min=".1" max="1" step=".05" value={drawOpacity} onChange={ev=>setDrawOpacity(Number(ev.target.value))}/></label><p className={s.help}>The eraser removes a touched stroke. Each stroke can be undone or recolored in Properties.</p><button onClick={()=>{setTool('layers');setCollection(false);}}>Done drawing</button></>}
        {tool === 'templates' && <><p className={s.help}>A place to start, never a rule to follow. Layouts are inserted as new pages; your current page stays safe.</p>{templateNames.map(name=><button className={s.template} key={name} onClick={()=>addPage(false,templatePage(name,page.chapterId))}>＋ {name}</button>)}<details><summary>Your saved layouts</summary>{book.templates?.map(t=><div className={s.savedTemplate} key={t.id}><button onClick={()=>addPage(false,clonePage(t.page,page.chapterId))}>{t.title}</button><button aria-label={`Remove saved layout ${t.title}`} onClick={()=>commit({...book,templates:book.templates?.filter(v=>v.id!==t.id)})}>×</button></div>)}<button disabled={(book.templates?.length||0)>=20} onClick={()=>{const title=window.prompt('Name this reusable layout', 'A page of our story');if(title)commit({...book,templates:[...(book.templates||[]),{id:uid(),title:title.slice(0,100),page:{...page,chapterId:''}}]});}}>Save this page as a layout</button></details></>}
        {tool === 'layers' && <><p className={s.help}>Topmost first. Drag a row to reorder, or use the selection toolbar’s layer controls.</p><div className={s.layers}>{[...page.elements].reverse().map(v=><div className={selectedIds.includes(v.id)?s.activeLayer:''} key={v.id} draggable={!v.locked} onDragStart={()=>{layerDrag.current=v.id;}} onDragOver={ev=>ev.preventDefault()} onDrop={ev=>{ev.preventDefault(); const source=page.elements.find(v=>v.id===layerDrag.current);if(!source||source.locked||source===v)return;const items=page.elements.filter(v=>v!==source);items.splice(items.indexOf(v),0,source);changePage({...page,elements:items});}}><button aria-label={`Select layer ${v.name||v.kind}`} aria-pressed={selectedIds.includes(v.id)} onClick={ev=>select(v,ev.shiftKey||multiSelect)}>{v.name||v.text.slice(0,20)||v.kind}{v.groupId&&<small> · group</small>}</button><button aria-label={`${v.hidden?'Show':'Hide'} ${v.name||v.kind}`} onClick={()=>changePage({...page,elements:page.elements.map(n=>n.id===v.id?{...n,hidden:!n.hidden}:n)})}>{v.hidden?'○':'◉'}</button><button aria-label={`${v.locked?'Unlock':'Lock'} ${v.name||v.kind}`} onClick={()=>changePage({...page,elements:page.elements.map(n=>n.id===v.id?{...n,locked:!n.locked}:n)})}>{v.locked?'⌑':'◇'}</button></div>)}</div></>}
        {tool === 'book' && <StudioBookSettings book={book} page={page} commit={commit} changePage={changePage} addPage={addPage} go={go}/>}
        {tool === 'pan' && <p className={s.help}>Drag the canvas to look around. Use ⌘ / Ctrl + wheel or two fingers to zoom. Your selection stays in place.</p>}
      </aside>}
      <main className={s.center}>
        <div className={s.canvasBar}><span>STUDIO <i> / </i> PAGE {pageIndex+1}</span><div><button aria-label="Zoom out" onClick={()=>setZoom(v=>constrain(v-.25,.5,3))}>−</button><button onClick={()=>setZoom(1)}>Fit page</button><button aria-label="Zoom in" onClick={()=>setZoom(v=>constrain(v+.25,.5,3))}>＋</button><span>{Math.round(zoom*100)}%</span><button aria-pressed={properties} onClick={()=>{if(matchMedia('(max-width:900px)').matches)setCollection(false);setProperties(v=>!v);}}>Properties</button></div></div>
        <div className={s.selectionBar} aria-label="Selection actions"><button aria-pressed={multiSelect} onClick={()=>setMultiSelect(v=>!v)}>Select several</button>{selected.length ? <><span>{selected.length} selected</span><button disabled={locked} onClick={()=>paste(selected)}>Duplicate</button><button onClick={copySelection}>Copy</button><button disabled={!clipboardCount} onClick={()=>paste()}>Paste</button><button onClick={()=>applySelection({locked:!selected.every(v=>v.locked)},true)}>{selected.every(v=>v.locked)?'Unlock':'Lock'}</button><button disabled={locked} onClick={remove}>Delete</button><details><summary>Arrange ↕</summary><div className={s.popover}><button onClick={()=>layer(1)}>Bring forward</button><button onClick={()=>layer(-1)}>Send backward</button><button onClick={()=>layer(Infinity)}>Bring to front</button><button onClick={()=>layer(-Infinity)}>Send to back</button><button disabled={selected.length<2||selected.some(v=>v.locked)} onClick={group}>Group · ⌘/Ctrl G</button><button onClick={()=>applySelection({groupId:undefined})}>Ungroup · ⇧ ⌘/Ctrl G</button>{(['x','y'] as const).flatMap(axis=>(['start','center','end','distribute'] as const).map(mode=><button key={axis+mode} disabled={locked||(mode==='distribute'&&selected.length<3)} onClick={()=>changePage({...page,elements:alignObjects(page.elements,selectedSet,axis,mode,size)})}>{axis==='x'?'Horizontal':'Vertical'} {mode}</button>))}<label>Move to page<select value="" onChange={ev=>{try{commit(moveObjects(book,page.id,ev.target.value,selectedSet));setSelectedIds([]);}catch(error){onError((error as Error).message);}}}><option value="">Choose a page…</option>{book.pages.filter(p=>p!==page).map(p=><option key={p.id} value={p.id}>Page {book.pages.indexOf(p)+1}</option>)}</select></label></div></details></> : <span>A page of possibilities. Make something only you could make.</span>}</div>
        <div ref={viewport} className={`${s.viewport} ${tool==='pan'?s.panning:''}`} onPointerDownCapture={touchDown} onPointerMoveCapture={touchMove} onPointerUpCapture={ev=>{pointers.current.delete(ev.pointerId);if(pointers.current.size<2)pinch.current=null;pan.current=null;}} onPointerCancelCapture={ev=>{pointers.current.delete(ev.pointerId);pinch.current=null;pan.current=null;}} onDragOver={ev=>{if(ev.dataTransfer.types.includes('Files'))ev.preventDefault();}} onDrop={ev=>{if(ev.dataTransfer.files.length){ev.preventDefault();void upload([...ev.dataTransfer.files],null);}}}>
          <div className={s.pageSizer} style={{ '--ratio':book.widthMm/book.heightMm, '--zoom':zoom, width:fitWidth*zoom } as CSSProperties}>
            <div ref={canvas} className={`${s.page} ${grid?s.grid:''}`} style={{aspectRatio:book.widthMm/book.heightMm,backgroundColor:page.paper,overflow:bleed?'visible':'hidden'}} onPointerDown={()=>{if(tool!=='draw')setSelectedIds([]);}}>
              <PaperBackground page={page} book={book}/>{safe&&<div className={s.safe} aria-hidden="true"/>}{gutter&&<div className={s.gutter} aria-hidden="true"/>}
              {page.elements.filter(v=>!v.hidden).map(v=><div key={v.id} data-object={v.id} className={`${shared.object} ${s.object} ${selectedIds.includes(v.id)?s.selected:''} ${v.locked?s.locked:''}`} style={elementStyle(v)} tabIndex={tool==='draw'?-1:0} role="group" aria-label={`${v.name||v.kind}: ${v.text.slice(0,50)}`} onFocus={ev=>{if(ev.target===ev.currentTarget&&!selectedIds.includes(v.id))select(v);}} onPointerDown={ev=>start(ev,v,'move')} onPointerMove={move} onPointerUp={()=>finish()} onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>{if(gesture.current)finish(true);}} onDoubleClick={ev=>{if(v.kind==='text'&&!v.locked){ev.stopPropagation();setSelectedIds([v.id]);setInline(v.id);}}}>
                {inline===v.id?<textarea className={s.inlineText} aria-label="Edit writing on page" autoFocus defaultValue={v.text} maxLength={20000} onPointerDown={ev=>ev.stopPropagation()} onBlur={ev=>{const text=ev.target.value;if(text!==v.text)changePage({...page,elements:page.elements.map(n=>n.id===v.id?{...n,text,runs:editText(n.text,text,n.runs)}:n)});setInline(null);}} onKeyDown={ev=>{ev.stopPropagation();if(ev.key==='Escape'){ev.currentTarget.value=v.text;ev.currentTarget.blur();}}}/>:<ElementContent element={v} book={book}/>}
                {selectedIds.length===1&&selectedIds[0]===v.id&&!v.locked&&!inline&&tool!=='draw'&&<><button className={s.rotate} aria-label="Rotate selected object" onPointerDown={ev=>start(ev,v,'rotate')}>↻</button>{handles.map(handle=><button key={handle} className={`${s.handle} ${s[handle]}`} aria-label={`Resize ${handle} corner or edge`} onPointerDown={ev=>start(ev,v,handle)}/>)}</>}
              </div>)}
              <div ref={guides} className={s.guides} aria-hidden="true"/>
              {tool==='draw'&&<div className={s.drawingOverlay} onPointerDown={drawStart} onPointerMove={drawMove} onPointerUp={()=>drawFinish()} onPointerCancel={()=>drawFinish(true)}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path ref={draft} fill="none" stroke={drawColor} strokeWidth={drawWidth} opacity={drawTool==='highlighter'?drawOpacity*.3:drawOpacity} strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
            </div>
          </div>
        </div>
        {(selected.some(v=>outside(v,size))||overflow)&&<div className={s.warning} role="status">{overflow?'Some writing extends beyond its text box. Enlarge the box or continue on another page. ':'Artwork extends beyond the paper. It is retained in your project and clipped to the page in Reading. '}</div>}
        <div className={s.viewOptions}>{([['Grid',grid,setGrid],['Safe area',safe,setSafe],['Gutter',gutter,setGutter],['Snapping',snap,setSnap],['Show bleed',bleed,setBleed]] as const).map(([label,checked,set])=><button key={label} aria-pressed={checked} onClick={()=>set(v=>!v)}>{label}</button>)}<button aria-expanded={pagesOpen} onClick={()=>setPagesOpen(v=>!v)}>Pages {pagesOpen?'⌄':'⌃'}</button></div>
        {pagesOpen&&<nav className={s.pages} aria-label="Book pages">{book.pages.map((p,i)=><PageThumbnail key={p.id} book={book} page={p} current={p.id===page.id} index={i} onClick={()=>go(p.id)}/>)}<button className={s.addPage} onClick={()=>addPage()}>＋<small>Add page</small></button></nav>}
      </main>
      {properties&&<aside className={s.properties} aria-label="Selection properties"><div className={s.panelHeading}><h2>{selected.length>1?`${selected.length} little things`:'Make it yours'}</h2><button aria-label="Close properties" onClick={()=>setProperties(false)}>×</button></div>{selected.length>1&&<p className={s.help}>Move the selection together. Use Arrange to group, layer, align or distribute. Select one layer for its individual details.</p>}{selected.length>1&&<form className={s.fields} onSubmit={ev=>{ev.preventDefault();try{const transformed=transformSelection(selected,size,groupScale/100,groupAngle);changePage({...page,elements:page.elements.map(v=>transformed.find(t=>t.id===v.id)||v)});setGroupScale(100);setGroupAngle(0);}catch(error){onError((error as Error).message);}}}><label>Scale selection (%)<input type="number" min="10" max="300" required value={groupScale} onChange={ev=>setGroupScale(ev.target.valueAsNumber)}/></label><label>Rotate selection (°)<input type="number" min="-180" max="180" required value={groupAngle} onChange={ev=>setGroupAngle(ev.target.valueAsNumber)}/></label><button disabled={selected.some(v=>v.locked)} type="submit">Apply to selection</button></form>}<StudioInspector book={book} page={page} selected={e} patch={patch} changePage={changePage} commit={commit} upload={()=>{if(e){replaceTarget.current={page:page.id,object:e.id};photoInput.current?.click();}}} continueText={()=>{if(!e)return;const p=blankPage(page.chapterId);p.elements=[{...newElement('text'),x:10,y:10,width:80,height:80,font:e.font,fontSize:e.fontSize,color:e.color,text:'Continue your letter here…'}];addPage(false,p);}}/><button className={s.mobileDone} onClick={()=>setProperties(false)}>Done</button></aside>}
    </div>
    <input ref={photoInput} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={ev=>{const files=[...(ev.target.files||[])];ev.target.value='';if(files.length)void upload(files);}}/>
  </div>;
}
function PageThumbnail({book,page,current,index,onClick}:{book:MemoryBookDocument;page:BookPage;current:boolean;index:number;onClick:()=>void}) {
  const ref=useRef<HTMLButtonElement>(null),[visible,setVisible]=useState(current||index<5);
  useEffect(()=>{if(!ref.current)return;const observer=new IntersectionObserver(entries=>setVisible(entries.some(v=>v.isIntersecting)),{rootMargin:'150px'});observer.observe(ref.current);return()=>observer.disconnect();},[]);
  return <button ref={ref} aria-current={current?'page':undefined} aria-label={`Edit page ${index+1}`} onClick={onClick}><div style={{aspectRatio:book.widthMm/book.heightMm,background:page.paper}}>{visible&&<PageContent book={book} page={page}/>}</div><small>{index+1}</small></button>;
}
