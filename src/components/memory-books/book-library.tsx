'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createBook, formats, LIMITS, uid, validateBook, type MemoryBookDocument } from '@/lib/memory-books';
import { exportBook, loadLibrary, saveLibrary } from '@/lib/memory-book-storage';
import { Cover } from './cover-renderer';
import { BookStudio } from './book-studio';
import {CoverStudio} from './cover-studio';
import {ChapterOrganizer} from './chapter-organizer';
import { BookReader } from './book-reader';
import { GiftStudio } from './gift-studio';
import s from './memory-books.module.css';

export function BookLibrary() {
  const [books, setBooks] = useState<MemoryBookDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadMs, setLoadMs] = useState<number | undefined>();
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('Loading local drafts…');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<'library' | 'studio' | 'read' | 'cover' | 'organize' | 'gift'>('library');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [archive, setArchive] = useState(false);
  const [collection, setCollection] = useState('');
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const savedBooks = useRef<MemoryBookDocument[]>([]);
  const saveQueue = useRef(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const began = performance.now();
    loadLibrary().then(data => { if (!cancelled) { setLoadMs(performance.now() - began); savedBooks.current = data; setBooks(data); setLoaded(true); setLoadError(''); setStatus('Saved on this device'); } }).catch(error => { if (!cancelled) setLoadError(String(error.message)); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!loaded || (!revision.current && !retry)) return;
    const current = revision.current;
    setStatus('Unsaved changes');
    const timer = setTimeout(() => {
      setStatus('Saving…');
      // Serialize transactions; an older autosave cannot finish after a newer one.
      saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveLibrary(books, savedBooks.current)).then(() => {
        savedBooks.current = books;
        savedRevision.current = current;
        if (revision.current === current) setStatus('Saved on this device');
      }).catch(error => { setStatus('Unable to save'); setNotice(error.message); });
    }, 450);
    return () => clearTimeout(timer);
  }, [books, loaded, retry]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (revision.current !== savedRevision.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, []);
  function change(next: MemoryBookDocument[]) { revision.current++; setBooks(next); }
  function update(book: MemoryBookDocument) { change(books.map(b => b.id === book.id ? { ...book, updatedAt: new Date().toISOString() } : b)); }
  function open(book: MemoryBookDocument, next: 'read' | 'studio' | 'cover' | 'organize' | 'gift') { setActiveId(book.id); setMode(next); setNotice(''); }
  function add(book: MemoryBookDocument) {
    if (books.length >= LIMITS.books) { setNotice('This local library supports 32 books. Export a backup before deleting a book to make room.'); return; }
    change([...books, book]); setCreating(false); open(book, 'read');
  }
  const active = books.find(b => b.id === activeId);
  const collections = [...new Set(books.map(book => book.bookmaking?.collection?.trim()).filter((name): name is string => !!name))].sort();
  const activeCollection = collections.includes(collection) ? collection : '';
  const visible = books.filter(b => b.archived === archive && b.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeCollection || b.bookmaking?.collection?.trim() === activeCollection)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'pages' ? b.pages.length - a.pages.length : (sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));
  return <div className={s.app}>
    {mode === 'library' && <>
      <div className={s.topbar}><a href="/" className={s.brand}>Dear Tomorrow.</a><span className={s.localBadge}>YOUR PRIVATE LITTLE LIBRARY · ON THIS DEVICE</span><a href="/">Back to Dear Tomorrow ↗</a></div>
      <main className={s.library} data-library-load-ms={process.env.NODE_ENV === 'development' ? loadMs : undefined}>
        <div className={s.libraryIntro}><div><span className={s.eyebrow}>FOR THE THINGS THAT STAY</span><h1>My Memory <em>Books.</em></h1><p>A place for your photographs, your words, your wonderfully ordinary days.</p></div><button className={s.primary} disabled={!loaded} onClick={() => setCreating(true)}>＋ Create a book</button></div>
        <div className={s.libraryTools}><label>Find a book<input aria-label="Search books" placeholder="A title, a little story…" value={search} onChange={e => setSearch(e.target.value)}/></label><label>Arrange by<select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently edited</option><option value="created">Recently created</option><option value="title">Title</option><option value="pages">Page count</option></select></label><button aria-pressed={archive} onClick={() => setArchive(v => !v)}>{archive ? 'Show my books' : 'Archived books'}</button><button disabled={!loaded} onClick={() => importRef.current?.click()}>Import a backup ↗</button></div>
        {collections.length > 0 && <div className={s.libraryTools}><label>Collection<select value={activeCollection} onChange={event => setCollection(event.target.value)}>
          <option value="">All collections</option>{collections.map(name => <option key={name}>{name}</option>)}
        </select></label></div>}
        {loadError && <div role="alert" className={s.error}>{loadError} Reload this page to retry. Your stored library has not been changed.</div>}
        {!loaded && !loadError && <p>Opening your local library…</p>}
        {loaded && visible.length === 0 && <div className={s.empty}><span className={s.emptyBook}>✧</span><h2>{search || archive || activeCollection ? 'No books here yet.' : 'Every story deserves a beginning.'}</h2><p>{search || archive || activeCollection ? 'Try another title or collection, or return to your books.' : 'Choose a cover. Keep a moment. Make something that could only be yours.'}</p>{!search && !archive && !activeCollection && <button className={s.primary} onClick={() => setCreating(true)}>Create your first book ↗</button>}</div>}
        <div className={s.shelf}>{visible.map(book => <article className={s.libraryBook} key={book.id}>
          <button className={s.coverButton} style={{ aspectRatio: book.widthMm / book.heightMm }} aria-label={`Read ${book.title}`} onClick={() => open(book, 'read')}><Cover book={book}/></button>
          <h2>{book.title}</h2><p>{book.pages.length} pages · {book.chapters.length} {book.chapters.length === 1 ? 'chapter' : 'chapters'} · {book.widthMm} × {book.heightMm} mm</p>
          {(book.bookmaking?.collection || book.bookmaking?.series || book.bookmaking?.volume) &&
            <p>{[book.bookmaking.collection, book.bookmaking.series, book.bookmaking.volume && `Volume ${book.bookmaking.volume}`].filter(Boolean).join(' · ')}</p>}
          <div className={s.bookActions}><button onClick={() => open(book, 'read')}>Read ↗</button><button onClick={() => open(book, 'studio')}>Studio ↗</button><details><summary aria-label={`Options for ${book.title}`}>•••</summary><div><button onClick={() => { const copy = structuredClone(book); copy.id = uid(); copy.title = (book.title + ' — copy').slice(0, 120); copy.createdAt = copy.updatedAt = new Date().toISOString(); add(copy); }}>Duplicate</button><button onClick={() => open(book, 'cover')}>Cover Studio</button><button onClick={() => open(book, 'organize')}>Chapters & pages</button><button onClick={() => open(book, 'gift')}>Wrap as a gift</button><button onClick={() => exportBook(book)}>Export backup</button><button onClick={() => update({ ...book, archived: !book.archived })}>{book.archived ? 'Restore' : 'Archive'}</button><button onClick={() => { if (window.confirm(`Delete “${book.title}” from this device? Export a backup first if you want to keep it. This cannot be undone.`)) change(books.filter(b => b.id !== book.id)); }}>Delete…</button></div></details></div>
        </article>)}</div>
        <p className={s.storageNote}>Saved only in this browser on this device. Clearing browser data removes drafts. Export a project backup to keep a separate copy. Photos stay on your device.</p>
      </main>
    </>}
    {active && mode === 'studio' && <BookStudio key={active.id} book={active} onChange={update} status={status} onRead={() => setMode('read')} onDone={() => setMode('library')} onError={setNotice}/>}
    {active && mode === 'read' && <BookReader key={active.id} book={active} onEdit={() => setMode('studio')} onExit={() => setMode('library')}/>}
    {active && mode === 'cover' && <CoverStudio book={active} onChange={update} status={status} onDone={()=>setMode('library')} onError={setNotice}/>}
    {active && mode === 'organize' && <ChapterOrganizer book={active} onChange={update} onDone={()=>setMode('library')} onError={setNotice}/>}
    {active && mode === 'gift' && <GiftStudio book={active} onChange={update} status={status} onDone={() => setMode('library')}/>}
    {notice && <div className={s.toast} role="alert"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button>{status === 'Unable to save' && <><button onClick={() => setRetry(v => v + 1)}>Retry saving</button>{active && <button onClick={() => exportBook(active)}>Export current book</button>}</>}</div>}
    <input hidden ref={importRef} type="file" accept=".json,application/json" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { if (file.size > LIMITS.projectBytes) throw new Error('Choose a project smaller than 30 MB.'); const book = structuredClone(validateBook(JSON.parse(await file.text()))); book.id = uid(); book.title = (book.title + ' — imported').slice(0, 120); book.archived = false; book.createdAt = book.updatedAt = new Date().toISOString(); add(book); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to import this project.'); } }}/>
    {creating && <CreateBook onCreate={add} onClose={() => setCreating(false)}/>}
  </div>;
}

function CreateBook({ onCreate, onClose }: { onCreate: (book: MemoryBookDocument) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('Our Little Forever');
  const [subtitle, setSubtitle] = useState('A book of moments');
  const [width, setWidth] = useState(203.2), [height, setHeight] = useState(203.2);
  const [unit, setUnit] = useState('mm');
  const [format, setFormat] = useState('Classic square');
  const [color, setColor] = useState('#643e4a');
  const [material, setMaterial] = useState<MemoryBookDocument['cover']['material']>('linen');
  const [blank, setBlank] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const preview = { title, subtitle, cover: { color, material } } as MemoryBookDocument;
  function submit(event: FormEvent) { event.preventDefault(); if (step < 2) setStep(v => v + 1); else { const book = createBook(title, width, height, color, material, blank); book.subtitle = subtitle; onCreate(book); } }
  return <dialog ref={dialog} className={s.createDialog} onCancel={onClose}><form onSubmit={submit}>
    <button className={s.closeDialog} type="button" aria-label="Close book setup" onClick={onClose}>×</button>
    <div><span className={s.eyebrow}>A NEW LITTLE FOREVER · {step + 1} OF 3</span><h2>{['Begin with a feeling.', 'Give your story a shape.', 'Make it yours.'][step]}</h2>
      {step === 0 && <><label>Book title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/></label><label>Subtitle (optional)<input maxLength={200} value={subtitle} onChange={e => setSubtitle(e.target.value)}/></label><div className={s.startChoices}><button type="button" aria-pressed={!blank} onClick={() => setBlank(false)}>A gentle starting layout<small>Editable words & an empty Polaroid</small></button><button type="button" aria-pressed={blank} onClick={() => setBlank(true)}>A beautifully blank book<small>Room for your own beginning</small></button></div></>}
      {step === 1 && <><label>Format<select value={format} onChange={e => { const f = formats.find(v => v[0] === e.target.value)!; setFormat(f[0]); setWidth(f[1]); setHeight(f[2]); }}>{formats.map(f => <option key={f[0]}>{f[0]}</option>)}</select></label><label>Units<select value={unit} onChange={e => setUnit(e.target.value)}><option value="mm">Millimetres</option><option value="in">Inches</option></select></label><div className={s.twoFields}>{([['Width', width, setWidth], ['Height', height, setHeight]] as const).map(([name, value, setter]) => <label key={name}>{name} ({unit})<input type="number" min={unit === 'mm' ? 100 : 3.94} max={unit === 'mm' ? 320 : 12.59} step="0.01" required value={Number((value / (unit === 'in' ? 25.4 : 1)).toFixed(2))} onChange={e => { setter(Number(e.target.value) * (unit === 'in' ? 25.4 : 1)); setFormat('Custom'); }}/></label>)}</div><p className={s.help}>Dimensions describe one page. Supported: 100–320 mm per side. The canvas and reading book use these exact proportions.</p></>}
      {step === 2 && <><label>Cover material<select value={material} onChange={e => setMaterial(e.target.value as typeof material)}><option value="linen">Woven linen</option><option value="leather">Leather inspired</option><option value="smooth">Smooth hardcover</option></select></label><label>Cover colour<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label><p className={s.help}>Your book begins with two pages. Add more whenever a memory needs a home.</p></>}
      <div className={s.dialogActions}>{step > 0 && <button type="button" onClick={() => setStep(v => v - 1)}>Back</button>}<button className={s.primary} type="submit">{step === 2 ? 'Create & open my book ↗' : 'Continue ↗'}</button></div>
    </div><div className={s.setupPreview}><div style={{ aspectRatio: Math.max(100, width) / Math.max(100, height) }}><Cover book={preview}/></div><span>{Math.round(width)} × {Math.round(height)} mm per page · 2 pages</span></div>
  </form></dialog>;
}
