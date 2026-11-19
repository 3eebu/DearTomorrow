'use client';
import { useRef, useState } from 'react';
import { newElement, coverSurfaces, type MemoryBookDocument, type CoverSurface, type CoverDesign } from '@/lib/memory-books';
import { coverDesign } from '@/lib/bookmaking';
import { StudioHistory } from '@/lib/studio-history';
import { BookSurface, coverPage } from './cover-renderer';
import { BookStudio } from './book-studio';
import { BookReader } from './book-reader';
import s from './bookmaking.module.css';

const surfaceNames = { front: 'Front cover', back: 'Back cover', insideFront: 'Inside front', insideBack: 'Inside back' };
const materials = ['linen', 'cotton', 'velvet', 'leather', 'pebbled', 'suede', 'matte', 'vintage', 'modern'] as const;
const finishes = ['matte', 'satin', 'gloss', 'textured', 'distressed'] as const;
const lettering = ['print', 'gold', 'rose', 'silver', 'emboss', 'deboss', 'engraved'] as const;
const templates = ['Classic', 'Monogram', 'Botanical', 'Minimal', 'Blank'] as const;
const palette = [
  ['Burgundy', '#643e4a'], ['Rose', '#a66d76'], ['Ivory', '#ece1ce'], ['Sage', '#69765d'],
  ['Navy', '#374558'], ['Warm brown', '#765548'], ['Stone', '#aaa098'], ['Charcoal', '#393539'],
] as const;

export function CoverStudio({ book, onChange, onDone, status, onError }: {
  book: MemoryBookDocument;
  onChange: (book: MemoryBookDocument) => void;
  onDone: () => void;
  status: string;
  onError: (message: string) => void;
}) {
  const [surface, setSurface] = useState<CoverSurface>('front');
  const [mode, setMode] = useState<'guided' | 'advanced' | 'preview'>('guided');
  const [pendingTemplate, setPendingTemplate] = useState<typeof templates[number]>();
  const history = useRef(new StudioHistory());
  const design = coverDesign(book);

  function commit(next: MemoryBookDocument, group?: string) {
    history.current.record(book, next, group);
    onChange(next);
  }
  function patch(values: Partial<CoverDesign>, group?: string) {
    commit({ ...book, cover: { ...book.cover, design: { ...design, ...values } } }, group);
  }
  function changeColor(color: string) {
    const surfaces = { ...design.surfaces };
    for (const key of ['front', 'back'] as const) {
      const current = surfaces[key];
      if (current?.paper === book.cover.color) surfaces[key] = { ...current, paper: color };
    }
    commit({ ...book, cover: { ...book.cover, color, design: { ...design, surfaces } } });
  }
  function applyTemplate(name: typeof templates[number]) {
    const page = coverPage({ ...book, cover: { ...book.cover, design: { ...design, surfaces: {} } } }, 'front');
    if (name === 'Blank') page.elements = [];
    if (name === 'Minimal') page.elements = page.elements.filter(element => element.id === 'title')
      .map(element => ({ ...element, x: 10, y: 18, align: 'left', fontSize: 6 }));
    if (name === 'Monogram') page.elements = page.elements.filter(element => ['initials', 'title'].includes(element.id))
      .map(element => element.id === 'initials'
        ? { ...element, text: design.initials || 'Your initials', y: 30, fontSize: 12 }
        : { ...element, y: 66, fontSize: 5 });
    if (name === 'Botanical') page.elements.push({
      ...newElement('sticker'), sticker: 'branch', text: '', x: 36, y: 60, width: 28, height: 27,
      color: design.ink, background: book.cover.color,
    });
    if (name === 'Classic') page.elements.push({
      ...newElement('shape'), shape: 'border', fillNone: true, text: '', x: 6, y: 5, width: 88, height: 90, color: design.ink,
    });
    patch({ surfaces: { ...design.surfaces, front: page } });
    setPendingTemplate(undefined);
    setSurface('front');
  }
  const returnToCover = () => setMode('guided');
  if (mode === 'preview') return <BookReader book={book} onEdit={returnToCover} onExit={returnToCover}
    exitLabel="← Cover Studio" editLabel="Continue cover editing ↗"/>;
  if (mode === 'advanced') return <BookStudio
    book={{ ...book, pages: [coverPage(book, surface)] }} surfaceMode status={status}
    onError={onError} onDone={returnToCover} onRead={() => setMode('preview')}
    onChange={next => commit({
      ...book, assets: next.assets, cover: { ...book.cover, design: {
        ...design, surfaces: { ...design.surfaces, [surface]: { ...next.pages[0], chapterId: '' } },
      } },
    })}
  />;
  const designPreview = { ...book, cover: { ...book.cover, design } };
  return <div className={s.workshop}>
    <header className={s.bar}>
      <button onClick={onDone}>← Library</button><h1>The cover atelier.</h1><span role="status">{status}</span>
      <button disabled={!history.current.past.length} onClick={() => {
        const previous = history.current.undo(book);
        if (previous) onChange(previous);
      }}>Undo</button>
      <button disabled={!history.current.future.length} onClick={() => {
        const next = history.current.redo(book);
        if (next) onChange(next);
      }}>Redo</button>
      <button onClick={() => setMode('preview')}>Physical preview ↗</button>
    </header>
    <nav className={s.tabs} aria-label="Cover surface">
      {coverSurfaces.map(value => <button key={value} aria-pressed={surface === value} onClick={() => setSurface(value)}>
        {surfaceNames[value]}
      </button>)}
    </nav>
    <div className={s.coverGrid}>
      <main className={s.preview}>
        <div style={{ aspectRatio: book.widthMm / book.heightMm }}><BookSurface book={designPreview} surface={surface}/></div>
        <p>{book.widthMm} × {book.heightMm} mm · {book.pages.length} numbered pages</p>
      </main>
      <aside className={s.controls}>
        <details>
          <summary>Editable starting covers</summary>
          {templates.map(name => <button key={name} onClick={() =>
            design.surfaces.front ? setPendingTemplate(name) : applyTemplate(name)
          }>{name}</button>)}
          {pendingTemplate && <div role="group" aria-label="Confirm cover replacement">
            <p>Apply the {pendingTemplate} layout to the front cover? You can undo this.</p>
            <button onClick={() => applyTemplate(pendingTemplate)}>Apply layout</button>
            <button onClick={() => setPendingTemplate(undefined)}>Cancel</button>
          </div>}
        </details>
        <button onClick={() => setMode('advanced')}>Freeform surface Studio ↗</button>
        <label>Material<select value={design.fabric} onChange={event => patch({ fabric: event.target.value as CoverDesign['fabric'] })}>
          {materials.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <div className={s.palette} role="group" aria-label="Cover colour palette">
          {palette.map(([name, value]) => <button key={name} title={name} aria-label={name}
            aria-pressed={book.cover.color === value} style={{ backgroundColor: value }} onClick={() => changeColor(value)}/>)}
        </div>
        <label>Cover colour<input type="color" value={book.cover.color} onChange={event => changeColor(event.target.value)}/></label>
        <label>Finish<select value={design.finish} onChange={event => patch({ finish: event.target.value as CoverDesign['finish'] })}>
          {finishes.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Lettering<select value={design.lettering} onChange={event => patch({ lettering: event.target.value as CoverDesign['lettering'] })}>
          {lettering.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Printed ink<input type="color" value={design.ink} onChange={event => patch({ ink: event.target.value })}/></label>
        <details open>
          <summary>Guided lettering</summary>
          <p>These fields control guided surfaces. Freeform surfaces keep their independent objects.</p>
          {(['title', 'subtitle', 'dedication'] as const).map(key => <label key={key}>{key}
            <textarea maxLength={{ title: 120, subtitle: 200, dedication: 2000 }[key]} value={book[key]}
              onChange={event => commit({ ...book, [key]: event.target.value }, key)}/>
          </label>)}
          {(['initials', 'recipient', 'date', 'spineTitle'] as const).map(key => <label key={key}>
            {{ initials: 'Initials', recipient: 'Back-cover message', date: 'Date', spineTitle: 'Spine title' }[key]}
            <input maxLength={120} value={design[key]} onChange={event => patch({ [key]: event.target.value }, key)}/>
          </label>)}
          <label><input type="checkbox" checked={design.branding} onChange={event => patch({ branding: event.target.checked })}/>
            Dear Tomorrow branding on guided front
          </label>
        </details>
        <details>
          <summary>Binding details</summary>
          <label><input type="checkbox" checked={design.bands} onChange={event => patch({ bands: event.target.checked })}/>Spine bands</label>
          <label><input type="checkbox" checked={!!design.ribbon} onChange={event => patch({ ribbon: event.target.checked ? '#b98583' : undefined })}/>
            Ribbon bookmark
          </label>
          {design.ribbon && <label>Ribbon colour<input type="color" value={design.ribbon}
            onChange={event => patch({ ribbon: event.target.value })}/></label>}
          <p>Spine lettering appears on books with 20 or more pages.</p>
        </details>
      </aside>
    </div>
  </div>;
}
