'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { StationeryConfirm, StationeryDialog } from '@/components/stationery-dialog';
import {cloudBooks} from '@/lib/accounts/cloud-client';
import type {CloudScope} from '@/lib/accounts/documents';
import { createBook, formats, LIMITS, uid, validateBook, type MemoryBookDocument } from '@/lib/memory-books';
import { exportBook, loadLibrary, saveLibrary } from '@/lib/memory-book-storage';
import { Cover } from './cover-renderer';
import { BookStudio } from './book-studio';
import {CoverStudio} from './cover-studio';
import {ChapterOrganizer} from './chapter-organizer';
import { BookReader } from './book-reader';
import { GiftStudio } from './gift-studio';
import { pruneVoiceAssets } from '@/lib/studio-document';
import { profileBook } from '@/lib/book-perf';
import { FrameProbe } from './frame-probe';
import s from './memory-books.module.css';

export function BookLibrary({scope}:{scope?:CloudScope}={}) {
  const store=useMemo(()=>scope?cloudBooks(scope):{loadLibrary,saveLibrary},[scope]);
  const savedLabel=scope?'Saved to My Space':'Saved on this device';
  const [books, setBooks] = useState<MemoryBookDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadMs, setLoadMs] = useState<number | undefined>();
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState(scope?'Loading My Space…':'Loading local drafts…');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<'library' | 'studio' | 'read' | 'cover' | 'organize' | 'gift' | 'example'>('library');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MemoryBookDocument | null>(null);
  const [guide, setGuide] = useState(false);
  const [example, setExample] = useState<MemoryBookDocument>();
  const [exampleLoading, setExampleLoading] = useState(false);
  const [fromStudio, setFromStudio] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [archive, setArchive] = useState(false);
  const [collection, setCollection] = useState('');
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const queuedRevision = useRef(0);
  const drafts = useRef<MemoryBookDocument[]>([]);
  const savedBooks = useRef<MemoryBookDocument[]>([]);
  const saveQueue = useRef(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const importRef = useRef<HTMLInputElement>(null);
  const save = useCallback(() => {
    clearTimeout(saveTimer.current);
    const current = revision.current;
    if (current <= savedRevision.current || current <= queuedRevision.current) return;
    const snapshot = drafts.current;
    queuedRevision.current = current;
    setStatus(scope?'Syncing…':'Saving…');
    saveQueue.current = saveQueue.current.then(() => store.saveLibrary(snapshot, savedBooks.current)).then(() => {
      savedBooks.current = snapshot;
      savedRevision.current = current;
      if (revision.current === current) setStatus(savedLabel);
    }).catch(error => {
      if (queuedRevision.current === current) queuedRevision.current = savedRevision.current;
      if (revision.current === current) { setStatus('Unable to save'); setNotice(error.message); }
    });
  }, [store,scope,savedLabel]);
  useEffect(() => {
    let cancelled = false;
    const began = performance.now();
    store.loadLibrary().then(data => { if (!cancelled) { setLoadMs(performance.now() - began); drafts.current = data; savedBooks.current = data; setBooks(data); setLoaded(true); setLoadError(''); setStatus(savedLabel); } }).catch(error => { if (!cancelled) setLoadError(String(error.message)); });
    return () => { cancelled = true; };
  }, [store,savedLabel]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (revision.current === savedRevision.current) return;
      save();
      event.preventDefault();
      event.returnValue = '';
    };
    const hide = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', save);
      clearTimeout(saveTimer.current);
    };
  }, [save]);
  function change(next: (current: MemoryBookDocument[]) => MemoryBookDocument[]) {
    drafts.current = next(drafts.current);
    revision.current++;
    setBooks(drafts.current);
    setStatus('Unsaved changes');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 230);
  }
  function update(book: MemoryBookDocument) {
    const draft = pruneVoiceAssets(book);
    change(current => current.map(b => b.id === book.id ? { ...draft, updatedAt: new Date().toISOString() } : b));
  }
  function go(next: typeof mode) { save(); setMode(next); }
  function open(book: MemoryBookDocument, next: 'read' | 'studio' | 'cover' | 'organize' | 'gift') {
    setActiveId(book.id);
    setFromStudio(false);
    if (status !== 'Unable to save') setNotice('');
    go(next);
  }
  function add(book: MemoryBookDocument, next: 'studio' | 'read' = 'read') {
    if (!loaded) { setNotice('Your library is unavailable. You can still read the example.'); return; }
    if (drafts.current.length >= LIMITS.books) { setNotice('Your library is full. Export a backup before making room for another book.'); return; }
    change(current => [...current, book]); setCreating(false); open(book, next);
  }
  async function browseExample() {
    setExampleLoading(true);
    setGuide(false);
    try {
      const { newShowcase } = await import('@/lib/book-showcase');
      setExample(newShowcase());
      go('example');
    } catch {
      setNotice('The example could not open. Try again in a moment.');
    } finally { setExampleLoading(false); }
  }
  const active = books.find(b => b.id === activeId);
  const collections = [...new Set(books.map(book => book.bookmaking?.collection?.trim()).filter((name): name is string => !!name))].sort();
  const activeCollection = collections.includes(collection) ? collection : '';
  const visible = books.filter(b => b.archived === archive && b.title.toLowerCase().includes(search.toLowerCase()) &&
    (!activeCollection || b.bookmaking?.collection?.trim() === activeCollection)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'pages' ? b.pages.length - a.pages.length : (sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));
  return <div className={s.app}>
    <FrameProbe/>
    {mode === 'library' && <>
      <div className={s.topbar}><a href="/" className={s.brand}>Dear Tomorrow.</a><span className={s.localBadge}>YOUR PRIVATE LITTLE LIBRARY · ON THIS DEVICE</span><a href="/">Back to Dear Tomorrow ↗</a></div>
      <main className={s.library} data-library-load-ms={profileBook() ? loadMs : undefined}>
        <div className={s.libraryIntro}><div><span className={s.eyebrow}>FOR THE THINGS THAT STAY</span><h1>My Memory <em>Books.</em></h1><p>A place for your photographs, your words, your wonderfully ordinary days.</p></div><button className={s.primary} disabled={!loaded} onClick={() => setCreating(true)}>＋ Create a book</button></div>
        <section className={s.exampleInvitation} aria-label="An example Memory Book">
          <div className={s.sampleSeal} aria-hidden="true">A<span>&amp;</span>M</div>
          <div><span className={s.eyebrow}>A FICTIONAL KEEPSAKE · 18 PAGES</span>
            <h2>Every Little Thing About Us</h2>
            <p>Open a completed book to try its pages and surprises, or make an editable copy.</p>
          </div>
          <div><button disabled={exampleLoading} onClick={() => void browseExample()}>{exampleLoading ? 'Opening…' : 'Explore example ↗'}</button>
            <button onClick={() => setGuide(true)}>First book guide</button></div>
        </section>
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
          <div className={s.bookActions}><button onClick={() => open(book, 'read')}>Read ↗</button><button onClick={() => open(book, 'studio')}>Studio ↗</button><details><summary aria-label={`Options for ${book.title}`}>•••</summary><div><button onClick={() => { const copy = structuredClone(book); copy.id = uid(); copy.title = (book.title + ' — copy').slice(0, 120); copy.createdAt = copy.updatedAt = new Date().toISOString(); add(copy); }}>Duplicate</button><button onClick={() => open(book, 'cover')}>Cover Studio</button><button onClick={() => open(book, 'organize')}>Chapters & pages</button><button onClick={() => open(book, 'gift')}>Wrap as a gift</button><button onClick={() => exportBook(book)}>Export backup</button><button onClick={() => update({ ...book, archived: !book.archived })}>{book.archived ? 'Restore' : 'Archive'}</button><button onClick={() => setDeleting(book)}>Delete…</button></div></details></div>
        </article>)}</div>
        <p className={s.storageNote}>{scope?'Books in this library save to My Space. Export a project backup to keep a separate copy.':'Saved only in this browser on this device. Clearing browser data removes drafts. Export a project backup to keep a separate copy. Photos stay on your device.'}</p>
      </main>
    </>}
    {active && mode === 'studio' && <BookStudio key={active.id} book={active} onChange={update} status={status}
      onCover={() => { setFromStudio(true); go('cover'); }} onGift={() => { setFromStudio(true); go('gift'); }}
      onRead={() => go('read')} onDone={() => go('library')} onError={setNotice}/>}
    {active && mode === 'read' && <BookReader key={active.id} book={active} onEdit={() => go('studio')} onExit={() => go('library')}/>}
    {active && mode === 'cover' && <CoverStudio book={active} onChange={update} status={status}
      exitLabel={fromStudio ? '← Studio' : undefined} onDone={() => go(fromStudio ? 'studio' : 'library')} onError={setNotice}/>}
    {active && mode === 'organize' && <ChapterOrganizer book={active} onChange={update} onDone={() => go('library')} onError={setNotice}/>}
    {active && mode === 'gift' && <GiftStudio book={active} onChange={update} status={status}
      exitLabel={fromStudio ? '← Studio' : undefined} onDone={() => go(fromStudio ? 'studio' : 'library')}/>}
    {example && mode === 'example' && <BookReader book={example} editLabel="Make an editable copy ↗" onExit={() => go('library')} onEdit={() => {
      const now = new Date().toISOString();
      add({ ...structuredClone(example), id: uid(), title: `${example.title} — copy`, createdAt: now, updatedAt: now }, 'studio');
    }}/>}
    {notice && <div className={s.toast} role="alert"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button>{status === 'Unable to save' && <><button onClick={save}>Retry saving</button>{active && <button onClick={() => exportBook(active)}>Export current book</button>}</>}</div>}
    <input hidden ref={importRef} type="file" accept=".json,application/json" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { if (file.size > LIMITS.projectBytes) throw new Error('Choose a project smaller than 30 MB.'); const book = structuredClone(validateBook(JSON.parse(await file.text()))); book.id = uid(); book.title = (book.title + ' — imported').slice(0, 120); book.archived = false; book.createdAt = book.updatedAt = new Date().toISOString(); add(book); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to import this project.'); } }}/>
    {deleting && <StationeryConfirm title={`Delete “${deleting.title}”?`}
      message={scope ? 'This removes the book from My Space. Export a backup first if you want to keep a copy.' :
        'This removes the book from this device. Export a backup first if you want to keep a copy.'}
      action="Delete book" onClose={() => setDeleting(null)} onConfirm={() => {
        change(current => current.filter(book => book.id !== deleting.id));
        setDeleting(null);
      }}/>}
    {creating && <CreateBook onCreate={book => add(book, 'studio')} onClose={() => setCreating(false)}/>}
    {guide && <BookGuide onClose={() => setGuide(false)} onExample={() => void browseExample()} onCreate={loaded ? () => {
      setGuide(false); setCreating(true);
    } : undefined}/>}
  </div>;
}

function BookGuide({ onClose, onExample, onCreate }: { onClose: () => void; onExample: () => void; onCreate?: () => void }) {
  return <StationeryDialog className={s.guide} size="small" title="Make your first Memory Book"
    closeLabel="Close first book guide" onClose={onClose}>
    <ol>
      <li><strong>Give it a shape.</strong> Name the book and choose a size for each page.</li>
      <li><strong>Make the cover yours.</strong> Open Cover Studio to add initials, a message or a ribbon.</li>
      <li><strong>Start with one memory.</strong> In Studio, choose Photographs to add a picture and Writing to tell its story.</li>
      <li><strong>Turn the page.</strong> Choose Add page to keep going, then Read my book to open the finished cover.</li>
    </ol>
    <div className={s.dialogActions}><button className="dt-tactile-secondary" onClick={onExample}>Explore the example</button>{onCreate &&
      <button className="dt-tactile-primary" onClick={onCreate}>Make a book ↗</button>}</div>
  </StationeryDialog>;
}

function CreateBook({ onCreate, onClose }: { onCreate: (book: MemoryBookDocument) => void; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('Our Little Forever');
  const [subtitle, setSubtitle] = useState('A book of moments');
  const [width, setWidth] = useState(203.2), [height, setHeight] = useState(203.2);
  const [unit, setUnit] = useState('mm');
  const [format, setFormat] = useState('Classic square');
  const [color, setColor] = useState('#643e4a');
  const [material, setMaterial] = useState<MemoryBookDocument['cover']['material']>('linen');
  const [blank, setBlank] = useState(false);
  const preview = { title, subtitle, cover: { color, material } } as MemoryBookDocument;
  function moveStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      const element = form.current?.closest('dialog');
      element?.querySelector('.dt-sheet-scroll')?.scrollTo(0, 0);
      element?.querySelector('h2')?.focus({ preventScroll: true });
    });
  }
  function submit(event: FormEvent) { event.preventDefault(); if (step < 2) moveStep(step + 1); else { const book = createBook(title, width, height, color, material, blank); book.subtitle = subtitle; onCreate(book); } }
  const ratio = Math.max(100, width) / Math.max(100, height);
  return <StationeryDialog className={s.createDialog} size="wide" closeLabel="Close book setup" onClose={onClose}
    title={['Begin with a feeling.', 'Give your story a shape.', 'Make it yours.'][step]}
    eyebrow={<span className={s.eyebrow}>A NEW LITTLE FOREVER · {step + 1} OF 3</span>}>
    <form ref={form} className={s.setupForm} onSubmit={submit}>
    <div className={s.setupFields}>
      {step === 0 && <><label>Book title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/></label><label>Subtitle (optional)<input maxLength={200} value={subtitle} onChange={e => setSubtitle(e.target.value)}/></label><div className={s.startChoices}><button className="dt-relief-card" type="button" aria-pressed={!blank} onClick={() => setBlank(false)}><span>A gentle starting layout<small>Editable words & an empty Polaroid</small></span><span className="dt-option-mark" aria-hidden="true">✓</span></button><button className="dt-relief-card" type="button" aria-pressed={blank} onClick={() => setBlank(true)}><span>A beautifully blank book<small>Room for your own beginning</small></span><span className="dt-option-mark" aria-hidden="true">✓</span></button></div></>}
      {step === 1 && <><label>Format<select value={format} onChange={e => { const f = formats.find(v => v[0] === e.target.value)!; setFormat(f[0]); setWidth(f[1]); setHeight(f[2]); }}>{formats.map(f => <option key={f[0]}>{f[0]}</option>)}</select></label><label>Units<select value={unit} onChange={e => setUnit(e.target.value)}><option value="mm">Millimetres</option><option value="in">Inches</option></select></label><div className={s.twoFields}>{([['Width', width, setWidth], ['Height', height, setHeight]] as const).map(([name, value, setter]) => <label key={name}>{name} ({unit})<input type="number" min={unit === 'mm' ? 100 : 3.94} max={unit === 'mm' ? 320 : 12.59} step="0.01" required value={Number((value / (unit === 'in' ? 25.4 : 1)).toFixed(2))} onChange={e => { setter(Number(e.target.value) * (unit === 'in' ? 25.4 : 1)); setFormat('Custom'); }}/></label>)}</div><p className={s.help}>Dimensions describe one page. Supported: 100–320 mm per side. The canvas and reading book use these exact proportions.</p></>}
      {step === 2 && <><label>Cover material<select value={material} onChange={e => setMaterial(e.target.value as typeof material)}><option value="linen">Woven linen</option><option value="leather">Leather inspired</option><option value="smooth">Smooth hardcover</option></select></label><label>Cover colour<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label><p className={s.help}>Your book begins with two pages. Add more whenever a memory needs a home.</p></>}
      <div className={s.dialogActions}>{step > 0 && <button className="dt-tactile-secondary" type="button" onClick={() => moveStep(step - 1)}>Back</button>}<button className="dt-tactile-primary" type="submit">{step === 2 ? 'Create & edit my book ↗' : 'Continue ↗'}</button></div>
    </div><div className={s.setupPreview}><div style={{ aspectRatio: ratio, width: `min(100%, ${340 * ratio}px)` }}><Cover book={preview}/></div><span>{Math.round(width)} × {Math.round(height)} mm per page · 2 pages</span></div>
  </form></StationeryDialog>;
}
