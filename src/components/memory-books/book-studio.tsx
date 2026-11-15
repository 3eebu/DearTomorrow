'use client';
import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react';
import { blankPage, LIMITS, newElement, uid, type BookElement, type BookPage, type ElementKind, type MemoryBookDocument } from '@/lib/memory-books';
import { exportBook, readPhoto } from '@/lib/memory-book-storage';
import { ElementContent, elementStyle, PageContent } from './page-content';
import s from './memory-books.module.css';

export function BookStudio({ book, onChange, status, onRead, onDone, onError }: {
  book: MemoryBookDocument; onChange: (book: MemoryBookDocument) => void; status: string; onRead: () => void; onDone: () => void; onError: (message: string) => void;
}) {
  const [pageId, setPageId] = useState(book.pages[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'object' | 'pages' | 'cover'>('object');
  const [zoom, setZoom] = useState(1);
  const [historyTick, setHistoryTick] = useState(0);
  const past = useRef<MemoryBookDocument[]>([]), future = useRef<MemoryBookDocument[]>([]);
  const grouping = useRef({ key: '', time: 0 });
  const latest = useRef(book); latest.current = book;
  const canvas = useRef<HTMLDivElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const frame = useRef(0);
  const gesture = useRef<{ original: BookElement; next: BookElement; startX: number; startY: number; rect: DOMRect; element: HTMLElement; mode: string } | null>(null);
  const page = book.pages.find(p => p.id === pageId) || book.pages[0];
  const pageIndex = book.pages.indexOf(page);
  const selected = page.elements.find(e => e.id === selectedId);
  const radians = (selected?.rotation || 0) * Math.PI / 180;
  const boundsWidth = selected ? Math.abs(selected.width * Math.cos(radians)) + Math.abs(selected.height * Math.sin(radians)) * book.heightMm / book.widthMm : 0;
  const boundsHeight = selected ? Math.abs(selected.height * Math.cos(radians)) + Math.abs(selected.width * Math.sin(radians)) * book.widthMm / book.heightMm : 0;
  const outsidePage = selected && (selected.x + selected.width / 2 - boundsWidth / 2 < 0 || selected.x + selected.width / 2 + boundsWidth / 2 > 100 || selected.y + selected.height / 2 - boundsHeight / 2 < 0 || selected.y + selected.height / 2 + boundsHeight / 2 > 100);
  function commit(next: MemoryBookDocument, key = '') {
    if (next === latest.current) return;
    const now = Date.now();
    if (!key || key !== grouping.current.key || now - grouping.current.time > 700) { past.current = [...past.current.slice(-59), latest.current]; }
    grouping.current = { key, time: now }; future.current = []; onChange(next); setHistoryTick(v => v + 1);
  }
  function undo() { const previous = past.current.pop(); if (previous) { future.current.push(latest.current); grouping.current.key = ''; onChange(previous); setSelectedId(null); setHistoryTick(v => v + 1); } }
  function redo() { const next = future.current.pop(); if (next) { past.current.push(latest.current); grouping.current.key = ''; onChange(next); setSelectedId(null); setHistoryTick(v => v + 1); } }
  function changePage(next: BookPage, key = '') { commit({ ...book, pages: book.pages.map(p => p.id === page.id ? next : p) }, key); }
  function patchElement(patch: Partial<BookElement>, key = '') {
    if (!selected) return;
    if (selected.locked && !Object.hasOwn(patch, 'locked')) return;
    const next = { ...selected, ...patch };
    next.width = Math.max(5, Math.min(100, next.width)); next.height = Math.max(5, Math.min(100, next.height));
    next.x = Math.max(0, Math.min(100 - next.width, next.x)); next.y = Math.max(0, Math.min(100 - next.height, next.y));
    changePage({ ...page, elements: page.elements.map(e => e.id === next.id ? next : e) }, key);
  }
  function addElement(kind: ElementKind) {
    if (page.elements.length >= LIMITS.elements) { onError('This page supports 100 objects. Add another page to keep creating.'); return; }
    const e = newElement(kind); changePage({ ...page, elements: [...page.elements, e] }); setSelectedId(e.id); setPanel('object');
  }
  function duplicate() {
    if (!selected || page.elements.length >= LIMITS.elements) return;
    const copy = { ...selected, id: uid(), x: Math.min(100 - selected.width, selected.x + 3), y: Math.min(100 - selected.height, selected.y + 3) };
    changePage({ ...page, elements: [...page.elements, copy] }); setSelectedId(copy.id);
  }
  function remove() { if (selected && !selected.locked) { changePage({ ...page, elements: page.elements.filter(e => e.id !== selected.id) }); setSelectedId(null); } }
  function layer(delta: number) {
    if (!selected) return;
    const items = [...page.elements], index = items.indexOf(selected), to = Math.max(0, Math.min(items.length - 1, index + delta));
    items.splice(index, 1); items.splice(to, 0, selected); changePage({ ...page, elements: items });
  }
  const commands = useRef({ undo, redo, duplicate, remove }); commands.current = { undo, redo, duplicate, remove };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) commands.current.redo(); else commands.current.undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); commands.current.duplicate(); }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); commands.current.remove(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); cancelAnimationFrame(frame.current); };
  }, []);
  function start(event: PointerEvent<HTMLElement>, e: BookElement, mode: string) {
    event.stopPropagation(); setSelectedId(e.id); setPanel('object');
    if (e.locked || !canvas.current) return;
    event.preventDefault();
    const target = event.currentTarget.closest('[data-object]') as HTMLElement;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { original: e, next: e, startX: event.clientX, startY: event.clientY, rect: canvas.current.getBoundingClientRect(), element: target, mode };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const g = gesture.current; if (!g) return;
    const dx = (event.clientX - g.startX) / g.rect.width * 100, dy = (event.clientY - g.startY) / g.rect.height * 100;
    const e = g.original;
    if (g.mode === 'rotate') {
      const cx = g.rect.left + (e.x + e.width / 2) / 100 * g.rect.width, cy = g.rect.top + (e.y + e.height / 2) / 100 * g.rect.height;
      const angle = (Math.atan2(event.clientY - cy, event.clientX - cx) - Math.atan2(g.startY - cy, g.startX - cx)) * 180 / Math.PI;
      g.next = { ...e, rotation: Math.max(-180, Math.min(180, Math.round(e.rotation + angle))) };
    } else if (g.mode === 'resize') {
      // Project the pointer delta onto the object's own axes when it is rotated.
      const angle = e.rotation * Math.PI / 180;
      const px = event.clientX - g.startX, py = event.clientY - g.startY;
      g.next = { ...e, width: Math.max(5, Math.min(100 - e.x, e.width + (px * Math.cos(angle) + py * Math.sin(angle)) / g.rect.width * 100)), height: Math.max(5, Math.min(100 - e.y, e.height + (-px * Math.sin(angle) + py * Math.cos(angle)) / g.rect.height * 100)) };
    } else {
      let x = Math.max(0, Math.min(100 - e.width, e.x + dx)), y = Math.max(0, Math.min(100 - e.height, e.y + dy));
      if (Math.abs(x + e.width / 2 - 50) < 1) x = 50 - e.width / 2;
      if (Math.abs(y + e.height / 2 - 50) < 1) y = 50 - e.height / 2;
      g.next = { ...e, x, y };
    }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => { Object.assign(g.element.style, elementStyle(g.next)); });
  }
  function finish(cancel = false) {
    const g = gesture.current; if (!g) return;
    cancelAnimationFrame(frame.current); gesture.current = null;
    if (cancel) { Object.assign(g.element.style, elementStyle(g.original)); return; }
    if (JSON.stringify(g.next) !== JSON.stringify(g.original)) changePage({ ...page, elements: page.elements.map(e => e.id === g.next.id ? g.next : e) });
  }
  function addPage(copy = false) {
    if (book.pages.length >= LIMITS.pages) { onError('This prototype supports 200 pages per book. Export a backup and begin another book.'); return; }
    const next = copy ? { ...structuredClone(page), id: uid(), elements: page.elements.map(e => ({ ...e, id: uid() })) } : blankPage(page.chapterId);
    const pages = [...book.pages]; pages.splice(pageIndex + 1, 0, next); commit({ ...book, pages }); setPageId(next.id); setSelectedId(null);
  }
  async function upload(file: File) {
    if (!selected) return;
    const objectId = selected.id, targetPage = page.id;
    try {
      const data = await readPhoto(file), assetId = uid(), current = latest.current;
      if (data.length + Object.values(current.assets).reduce((total, asset) => total + asset.data.length, 0) > 24 * 1024 * 1024) throw new Error('This book has reached its 24 MB photo budget. Keep a backup and begin another book for more photographs.');
      commit({ ...current, assets: { ...current.assets, [assetId]: { data, name: file.name } }, pages: current.pages.map(p => p.id === targetPage ? { ...p, elements: p.elements.map(e => e.id === objectId ? { ...e, assetId } : e) } : p) });
    } catch (error) { onError(error instanceof Error ? error.message : 'Could not add the photograph.'); }
  }
  const numberField = (label: string, key: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'fontSize' | 'opacity' | 'cropX' | 'cropY', min: number, max: number, step = 1) => selected && <label>{label}<input type="number" min={min} max={max} step={step} value={Number(selected[key].toFixed(2))} disabled={selected.locked} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) patchElement({ [key]: Math.min(max, Math.max(min, n)) }, key); }}/></label>;
  return <div className={s.studio} data-history={historyTick}>
    <div className={s.studioTop}><button onClick={onDone}>← Library</button><div><strong>{book.title}</strong><small role="status">{status}</small></div><div className={s.history}><button disabled={!past.current.length} onClick={undo} aria-label="Undo">↶</button><button disabled={!future.current.length} onClick={redo} aria-label="Redo">↷</button></div><button onClick={() => exportBook(book)}>Export</button><button className={s.primary} onClick={onRead}>Read my book ↗</button></div>
    <div className={s.studioGrid}>
      <aside className={s.toolRail} aria-label="Add to your page"><span className={s.eyebrow}>MAKE IT YOURS</span>{([['text', 'T', 'Writing'], ['polaroid', '▧', 'Polaroid'], ['photo', '▨', 'Photograph'], ['note', '⌑', 'Folded note']] as const).map(([kind, icon, label]) => <button key={kind} onClick={() => addElement(kind)}><b>{icon}</b><span>{label}</span></button>)}<hr/><button onClick={() => setPanel('pages')}>Pages & chapters</button><button onClick={() => setPanel('cover')}>Book & cover</button><button onClick={() => setPanel('object')}>Properties</button></aside>
      <main className={s.canvasRegion}>
        <div className={s.canvasBar}><span>STUDIO · PAGE {pageIndex + 1}</span><label>Zoom<select aria-label="Canvas zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))}><option value={1}>Fit page</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option></select></label></div>
        <div className={s.canvasScroll}><div className={s.canvasSizer} style={{ '--page-ratio': book.widthMm / book.heightMm, '--zoom': zoom } as CSSProperties}>
          <div ref={canvas} className={`${s.editorPage} ${s[page.texture]}`} style={{ aspectRatio: book.widthMm / book.heightMm, backgroundColor: page.paper }} onPointerDown={() => setSelectedId(null)}>
            <div className={s.safeArea} aria-hidden="true"/>
            {page.elements.map(e => <div key={e.id} data-object className={`${s.object} ${s.editObject} ${selectedId === e.id ? s.selectedObject : ''}`} style={elementStyle(e)} tabIndex={0} role="group" aria-label={`${e.kind}: ${e.text.slice(0, 60)}`} onFocus={() => setSelectedId(e.id)} onPointerDown={event => start(event, e, 'move')} onPointerMove={move} onPointerUp={() => finish()} onPointerCancel={() => finish(true)} onKeyDown={event => { if (e.locked || !event.key.startsWith('Arrow')) return; event.preventDefault(); const delta = event.shiftKey ? 2 : .4; patchElement({ x: e.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0), y: e.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0) }, 'nudge'); }}>
              <ElementContent element={e} book={book}/>
              {selectedId === e.id && !e.locked && <><button className={s.rotateHandle} aria-label="Drag to rotate object" onPointerDown={event => start(event, e, 'rotate')}>↻</button><button className={s.resizeHandle} aria-label="Drag to resize object" onPointerDown={event => start(event, e, 'resize')}>↘</button></>}
            </div>)}
          </div>
        </div></div><p className={s.canvasHint}>Drag to arrange. Use the handles to resize & rotate. Arrow keys nudge a selected object.</p>
        <nav className={s.thumbnailStrip} aria-label="Book pages">{book.pages.map((p, i) => <button key={p.id} aria-current={p.id === page.id ? 'page' : undefined} aria-label={`Edit page ${i + 1}`} onClick={() => { setPageId(p.id); setSelectedId(null); }}><div style={{ aspectRatio: book.widthMm / book.heightMm }}><PageContent book={book} page={p}/></div><span>{i + 1}</span></button>)}<button className={s.addPage} onClick={() => addPage()}>＋<span>Add page</span></button></nav>
      </main>
      <aside className={s.properties} aria-label="Page and object properties">
        <div className={s.panelTabs}>{(['object', 'pages', 'cover'] as const).map(p => <button key={p} aria-pressed={panel === p} onClick={() => setPanel(p)}>{p === 'object' ? 'Design' : p === 'pages' ? 'Pages' : 'Cover'}</button>)}</div>
        {panel === 'object' && <>{selected ? <><span className={s.eyebrow}>{selected.kind.toUpperCase()}</span><label>{selected.kind === 'text' || selected.kind === 'note' ? 'Your words' : 'Caption / image description'}<textarea rows={5} value={selected.text} maxLength={20000} disabled={selected.locked} onChange={e => patchElement({ text: e.target.value }, 'text')}/></label><p className={s.help}>Long writing may need a larger box or another page. Check the preview for clipped text.</p>
          {(selected.kind === 'photo' || selected.kind === 'polaroid') && <><button disabled={selected.locked} onClick={() => photoInput.current?.click()}>{selected.assetId ? 'Replace photograph' : 'Choose your photograph'}</button><p className={s.help}>JPEG, PNG, WebP · up to 8 MB · kept on this device.</p><div className={s.twoFields}>{numberField('Crop left/right', 'cropX', 0, 100)}{numberField('Crop up/down', 'cropY', 0, 100)}</div></>}
          <label>Writing style<select value={selected.font} disabled={selected.locked} onChange={e => patchElement({ font: e.target.value as BookElement['font'] })}><option value="serif">Classic book</option><option value="sans">Simple sans</option><option value="hand">Handwritten</option><option value="mono">Typewriter</option></select></label>
          <div className={s.twoFields}>{numberField('Type size (% page)', 'fontSize', 1, 20, .1)}<label>Alignment<select value={selected.align} onChange={e => patchElement({ align: e.target.value as BookElement['align'] })}><option>left</option><option>center</option><option>right</option></select></label><label>Ink<input type="color" value={selected.color} onChange={e => patchElement({ color: e.target.value }, 'ink')}/></label><label>Frame / note<input type="color" value={selected.background} onChange={e => patchElement({ background: e.target.value }, 'frame')}/></label></div>
          <details open><summary>Position & size</summary><div className={s.twoFields}>{numberField('Left (%)', 'x', 0, 100)}{numberField('Top (%)', 'y', 0, 100)}{numberField('Width (%)', 'width', 5, 100)}{numberField('Height (%)', 'height', 5, 100)}{numberField('Rotation (°)', 'rotation', -180, 180)}{numberField('Opacity', 'opacity', 0, 1, .05)}</div>{outsidePage && <p role="status" className={s.help}>Part of this rotated object extends beyond the page. Move it inward or reduce its size before Reading.</p>}</details>
          <div className={s.propertyActions}><button onClick={duplicate}>Duplicate</button><button onClick={() => patchElement({ locked: !selected.locked })}>{selected.locked ? 'Unlock' : 'Lock'}</button><button disabled={selected.locked} onClick={() => layer(-1)}>Send backward</button><button disabled={selected.locked} onClick={() => layer(1)}>Bring forward</button><button disabled={selected.locked} onClick={remove}>Delete object</button></div></> : <><h3>A page of your own.</h3><p className={s.help}>Add a photograph, a few words, or a little note. Select any object to make it yours.</p></>}
          <hr/><label>Paper colour<input type="color" value={page.paper} onChange={e => changePage({ ...page, paper: e.target.value }, 'paper')}/></label><label>Paper texture<select value={page.texture} onChange={e => changePage({ ...page, texture: e.target.value as BookPage['texture'] })}><option value="grain">Natural grain</option><option value="plain">Plain</option><option value="lines">Notebook lines</option></select></label>
          <details><summary>Layers · top to bottom</summary>{[...page.elements].reverse().map(e => <button key={e.id} className={s.layerRow} aria-pressed={selectedId === e.id} onClick={() => setSelectedId(e.id)}>{e.locked ? '⌑ ' : ''}{e.kind} · {e.text.slice(0, 22)}</button>)}</details>
        </>}
        {panel === 'pages' && <><h3>Your pages.</h3><div className={s.propertyActions}><button onClick={() => addPage()}>＋ Blank page</button><button onClick={() => addPage(true)}>Duplicate page</button><button disabled={book.pages.length === 1} onClick={() => { if (window.confirm('Delete this page and its objects? You can Undo this action.')) { commit({ ...book, pages: book.pages.filter(p => p.id !== page.id) }); setPageId(book.pages[Math.max(0, pageIndex - 1)].id); setSelectedId(null); } }}>Delete page…</button>{[-1, 1].map(delta => <button key={delta} disabled={pageIndex + delta < 0 || pageIndex + delta >= book.pages.length} onClick={() => { const pages = [...book.pages]; pages.splice(pageIndex, 1); pages.splice(pageIndex + delta, 0, page); commit({ ...book, pages }); }}>{delta < 0 ? 'Move page earlier' : 'Move page later'}</button>)}</div>
          <label>This page belongs to<select value={page.chapterId} onChange={e => changePage({ ...page, chapterId: e.target.value })}><option value="">No chapter</option>{book.chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><hr/><h3>Chapters</h3>{book.chapters.map((c, i) => <div className={s.chapterRow} key={c.id}><input aria-label={`Chapter ${i + 1} title`} maxLength={120} value={c.title} onChange={e => commit({ ...book, chapters: book.chapters.map(ch => ch.id === c.id ? { ...ch, title: e.target.value } : ch) }, c.id)}/><button aria-label={`Move chapter ${i + 1} earlier`} disabled={i === 0} onClick={() => { const chapters = [...book.chapters]; chapters.splice(i, 1); chapters.splice(i - 1, 0, c); commit({ ...book, chapters }); }}>↑</button><button aria-label={`Remove chapter ${i + 1}`} onClick={() => { if (window.confirm('Remove this chapter label? Its pages will be kept without a chapter.')) commit({ ...book, chapters: book.chapters.filter(ch => ch.id !== c.id), pages: book.pages.map(p => p.chapterId === c.id ? { ...p, chapterId: '' } : p) }); }}>×</button></div>)}<button disabled={book.chapters.length >= 100} onClick={() => commit({ ...book, chapters: [...book.chapters, { id: uid(), title: 'A new chapter' }] })}>＋ Add a chapter</button><p className={s.help}>Chapters label pages without changing their reading order. Reorder pages using the page controls.</p></>}
        {panel === 'cover' && <><h3>The first impression.</h3><label>Book title<input maxLength={120} value={book.title} onChange={e => commit({ ...book, title: e.target.value }, 'title')}/></label><label>Subtitle<input maxLength={200} value={book.subtitle} onChange={e => commit({ ...book, subtitle: e.target.value }, 'subtitle')}/></label><label>Inside-cover dedication<textarea maxLength={2000} value={book.dedication} onChange={e => commit({ ...book, dedication: e.target.value }, 'dedication')}/></label><label>Cover colour<input type="color" value={book.cover.color} onChange={e => commit({ ...book, cover: { ...book.cover, color: e.target.value } }, 'cover-color')}/></label><label>Material<select value={book.cover.material} onChange={e => commit({ ...book, cover: { ...book.cover, material: e.target.value as MemoryBookDocument['cover']['material'] } })}><option value="linen">Woven linen</option><option value="leather">Leather inspired</option><option value="smooth">Smooth hardcover</option></select></label><div className={s.twoFields}>{(['widthMm', 'heightMm'] as const).map(key => <label key={key}>{key === 'widthMm' ? 'Width' : 'Height'} (mm)<input type="number" min={100} max={320} value={book[key]} onChange={e => { const n = Number(e.target.value); if (n >= 100 && n <= 320) commit({ ...book, [key]: n }, key); }}/></label>)}</div><p className={s.help}>One page: {book.widthMm} × {book.heightMm} mm. Changing proportions keeps each object’s relative position; review text wrapping afterward.</p></>}
      </aside>
    </div>
    <input hidden ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }}/>
  </div>;
}
