'use client';
import { useRef, useState } from 'react';
import { uid, LIMITS, type MemoryBookDocument } from '@/lib/memory-books';
import { reorderChapter, duplicateChapter, movePages, divider, contents } from '@/lib/bookmaking';
import { StudioHistory } from '@/lib/studio-history';
import s from './bookmaking.module.css';

type Chapter = MemoryBookDocument['chapters'][number];
const dividerStyles = ['minimal', 'handwritten', 'botanical', 'border', 'colored', 'photograph'];

export function ChapterOrganizer({ book, onChange, onDone, onError }: {
  book: MemoryBookDocument;
  onChange: (book: MemoryBookDocument) => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<{ id: string; delta?: number }>();
  const history = useRef(new StudioHistory());

  function commit(next: MemoryBookDocument) {
    history.current.record(book, next);
    onChange(next);
  }
  function patchChapter(id: string, patch: Partial<Chapter>) {
    commit({ ...book, chapters: book.chapters.map(chapter => chapter.id === id ? { ...chapter, ...patch } : chapter) });
  }
  function removeChapter(id: string, deletePages: boolean) {
    const pages = deletePages ? book.pages.filter(page => page.chapterId !== id) :
      book.pages.map(page => page.chapterId === id ? { ...page, chapterId: '' } : page);
    if (!pages.length) {
      onError('Keep at least one page in the book.');
      return;
    }
    const templates = book.templates?.map(template => template.page.chapterId === id ?
      { ...template, page: { ...template.page, chapterId: '' } } : template);
    commit({ ...book, chapters: book.chapters.filter(chapter => chapter.id !== id), pages, templates });
    setSelected(ids => ids.filter(id => pages.some(page => page.id === id)));
  }
  function movePage(index: number, delta: number) {
    const pages = [...book.pages];
    const [page] = pages.splice(index, 1);
    pages.splice(index + delta, 0, page);
    commit({ ...book, pages });
  }

  return <div className={s.workshop}>
    <header className={s.bar}>
      <button onClick={onDone}>← Library</button>
      <h1>The chapters of your story.</h1>
      <button disabled={!history.current.past.length} onClick={() => {
        const previous = history.current.undo(book);
        if (previous) onChange(previous);
      }}>Undo</button>
      <button disabled={!history.current.future.length} onClick={() => {
        const next = history.current.redo(book);
        if (next) onChange(next);
      }}>Redo</button>
    </header>
    <main className={s.organizer}>
      <button disabled={book.chapters.length >= 100} onClick={() =>
        commit({ ...book, chapters: [...book.chapters, { id: uid(), title: 'A new chapter' }] })
      }>＋ Chapter</button>
      <label><input type="checkbox" checked={!!book.bookmaking?.contents} onChange={event =>
        commit({ ...book, bookmaking: { ...book.bookmaking, version: 1, contents: event.target.checked } })
      }/>Show navigation table of contents (adds no physical pages)</label>
      <label>Move selected pages to
        <select disabled={!selected.length} value="" onChange={event => {
          const destination = event.target.value;
          if (!destination) return;
          commit(movePages(book, selected, destination));
          setSelected([]);
        }}>
          <option value="">Choose destination…</option>
          <option value="unassigned">Unassigned</option>
          {book.chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
        </select>
      </label>
      {[...book.chapters, { id: '', title: 'Unassigned pages' } as Chapter].map((chapter, index) => {
        const pages = book.pages.filter(page => page.chapterId === chapter.id);
        return <details key={chapter.id} open className={s.chapter}>
          <summary style={{ borderLeft: `4px solid ${chapter.color || '#a79279'}` }}>
            {chapter.title} · {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </summary>
          {chapter.id && <>
            <label>Chapter title<input maxLength={120} value={chapter.title}
              onChange={event => patchChapter(chapter.id, { title: event.target.value })}/></label>
            <label>Description<textarea maxLength={2000} value={chapter.description || ''}
              onChange={event => patchChapter(chapter.id, { description: event.target.value })}/></label>
            <label>Colour<input type="color" value={chapter.color || '#a79279'}
              onChange={event => patchChapter(chapter.id, { color: event.target.value })}/></label>
            <button disabled={index === 0} onClick={() => setPending({ id: chapter.id, delta: -1 })}>Move chapter up</button>
            <button disabled={index + 1 === book.chapters.length} onClick={() => setPending({ id: chapter.id, delta: 1 })}>Move chapter down</button>
            <button onClick={() => {
              try { commit(duplicateChapter(book, chapter.id)); }
              catch (error) { onError((error as Error).message); }
            }}>Duplicate chapter</button>
            <button onClick={() => removeChapter(chapter.id, false)}>Remove label, keep pages</button>
            <button disabled={pages.length === book.pages.length} onClick={() => setPending({ id: chapter.id })}>Delete chapter content…</button>
            {pending?.id === chapter.id && <div role="group" aria-label="Confirm chapter change">
              <p>{pending.delta
                ? 'Group pages in the new chapter order? Unassigned pages will follow. You can undo this.'
                : 'Delete this chapter and its pages? You can undo this here.'}</p>
              <button onClick={() => {
                if (pending.delta) commit(reorderChapter(book, chapter.id, pending.delta));
                else removeChapter(chapter.id, true);
                setPending(undefined);
              }}>{pending.delta ? 'Confirm chapter move' : 'Delete chapter and pages'}</button>
              <button onClick={() => setPending(undefined)}>Cancel</button>
            </div>}
            <label>Insert editable divider
              <select value="" disabled={book.pages.length >= LIMITS.pages} onChange={event => {
                if (!event.target.value) return;
                const nextPages = [...book.pages];
                const position = pages.length ? nextPages.indexOf(pages[0]) : nextPages.length;
                nextPages.splice(position, 0, divider(chapter.id, chapter.title, event.target.value));
                commit({ ...book, pages: nextPages });
              }}>
                <option value="">Choose divider…</option>
                {dividerStyles.map(style => <option key={style}>{style}</option>)}
              </select>
            </label>
          </>}
          {pages.map(page => {
            const index = book.pages.indexOf(page);
            return <div key={page.id} className={s.pageRow}>
              <label><input type="checkbox" checked={selected.includes(page.id)} onChange={event =>
                setSelected(ids => event.target.checked ? [...ids, page.id] : ids.filter(id => id !== page.id))
              }/>Page {index + 1}</label>
              <button disabled={!index} onClick={() => movePage(index, -1)}>↑ Earlier</button>
              <button disabled={index + 1 === book.pages.length} onClick={() => movePage(index, 1)}>↓ Later</button>
            </div>;
          })}
        </details>;
      })}
      <details>
        <summary>Collection &amp; volume</summary>
        {(['collection', 'series'] as const).map(key => <label key={key}>{key}
          <input maxLength={100} value={book.bookmaking?.[key] || ''} onChange={event =>
            commit({ ...book, bookmaking: { ...book.bookmaking, version: 1, [key]: event.target.value } })
          }/>
        </label>)}
        <label>Volume<input type="number" min={1} max={999} value={book.bookmaking?.volume ?? ''} onChange={event => {
          const volume = event.target.valueAsNumber;
          if (!event.target.value || Number.isInteger(volume) && volume >= 1 && volume <= 999) {
            commit({ ...book, bookmaking: { ...book.bookmaking, version: 1, volume: event.target.value ? volume : undefined } });
          }
        }}/></label>
      </details>
      <h2>Current contents</h2>
      {contents(book).filter(chapter => chapter.page).map(chapter =>
        <p key={chapter.id}>{chapter.title} · page {chapter.page}</p>
      )}
    </main>
  </div>;
}
