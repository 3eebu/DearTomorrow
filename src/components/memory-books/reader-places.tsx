'use client';
import { useEffect, useState } from 'react';
import { contents } from '@/lib/bookmaking';
import type { MemoryBookDocument } from '@/lib/memory-books';

type Bookmark = { pageId: string; name: string };
type ReadingPlace = { last?: string; marks: Bookmark[] };

function readPlace(key: string): ReadingPlace {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  return {
    last: typeof data?.last === 'string' ? data.last : undefined,
    marks: Array.isArray(data?.marks) ? data.marks.slice(0, 200).filter((mark: Bookmark) =>
      typeof mark?.pageId === 'string' && typeof mark.name === 'string' && mark.name.length <= 100
    ) : [],
  };
}

export function ReaderPlaces({ book, pageId, onJump }: {
  book: MemoryBookDocument;
  pageId?: string;
  onJump: (id: string) => void;
}) {
  const [place, setPlace] = useState<ReadingPlace>();
  const [error, setError] = useState('');
  const key = 'dt-reading:' + book.id;
  useEffect(() => {
    try {
      setPlace(readPlace(key));
    } catch {
      setError('Reading preferences could not be restored. Your book is unaffected.');
    }
  }, [key]);
  useEffect(() => {
    if (!place) return;
    try {
      const last = pageId ?? readPlace(key).last;
      localStorage.setItem(key, JSON.stringify({ last, marks: place.marks }));
    } catch {
      setError('Bookmarks could not be saved on this device.');
    }
  }, [key, pageId, place]);

  const marks = place?.marks.filter(mark => book.pages.some(page => page.id === mark.pageId)) ?? [];
  const currentPage = book.pages.findIndex(page => page.id === pageId) + 1;
  const bookmarked = marks.some(mark => mark.pageId === pageId);
  function changeMarks(marks: Bookmark[]) {
    setPlace(previous => previous && { ...previous, marks });
  }

  return <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 20px', fontSize: 11 }}>
    {book.bookmaking?.contents && <details>
      <summary>Table of contents · navigation only</summary>
      {contents(book).filter(chapter => chapter.page).map(chapter =>
        <button key={chapter.id} onClick={() => onJump(book.pages[chapter.page - 1].id)}>
          {chapter.title} · {chapter.page}
        </button>
      )}
    </details>}
    <details>
      <summary>Bookmarks &amp; reading place</summary>
      {place?.last && book.pages.some(page => page.id === place.last) &&
        <button onClick={() => onJump(place.last!)}>Resume saved page</button>}
      <button disabled={!place || !pageId || bookmarked || marks.length >= 200} onClick={() => {
        if (pageId) changeMarks([...marks, { pageId, name: 'Page ' + currentPage }]);
      }}>{bookmarked ? 'Page bookmarked' : 'Bookmark this page'}</button>
      {marks.map(mark => <div key={mark.pageId}>
        <input aria-label="Bookmark name" maxLength={100} value={mark.name} onChange={event =>
          changeMarks(marks.map(value => value === mark ? { ...value, name: event.target.value } : value))
        }/>
        <button onClick={() => onJump(mark.pageId)}>Go to page {book.pages.findIndex(page => page.id === mark.pageId) + 1}</button>
        <button onClick={() => changeMarks(marks.filter(value => value !== mark))}>Remove bookmark</button>
      </div>)}
    </details>
    {error && <p role="status">{error}</p>}
  </div>;
}
