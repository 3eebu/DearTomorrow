import { newElement, type MemoryBookDocument, type CoverSurface, type BookPage } from '@/lib/memory-books';
import { coverDesign } from '@/lib/bookmaking';
import { PageContent } from './page-content';
import s from './bookmaking.module.css';
import legacy from './memory-books.module.css';

export function coverPage(book: MemoryBookDocument, surface: CoverSurface): BookPage {
  const design = coverDesign(book);
  const custom = design.surfaces[surface];
  if (custom) return custom;
  const inside = surface.startsWith('inside');
  const text = (id: string, value: string, y: number, size: number) => ({
    ...newElement('text', id), text: value, x: 12, y, width: 76, height: 20, fontSize: size,
    align: 'center' as const, color: inside ? '#57483c' : design.ink,
  });
  const message = surface === 'insideFront' ? book.dedication : surface === 'back' ? design.recipient : design.date;
  return {
    id: 'cover-' + surface, chapterId: '', paper: inside ? '#f6efdf' : book.cover.color, texture: 'plain',
    elements: surface === 'front' ? [
      ...(design.branding ? [text('brand', 'DEAR TOMORROW', 9, 2.4)] : []),
      text('initials', design.initials, 25, 9),
      text('title', book.title, 45, 8),
      text('subtitle', book.subtitle, 73, 3.5),
      text('date', design.date, 87, 2.5),
    ] : [text('message', message, 35, 4)],
  };
}

export function BookSurface({ book, surface = 'front' }: { book: MemoryBookDocument; surface?: CoverSurface }) {
  const design = coverDesign(book);
  const inside = surface.startsWith('inside');
  if (inside && !book.cover.design) return <PageContent book={book}/>;
  return <div className={s.surface} data-fabric={inside ? 'paper' : design.fabric}
    data-finish={design.finish} data-lettering={inside ? 'print' : design.lettering}>
    <PageContent book={book} page={coverPage(book, surface)}/>
  </div>;
}

export function Cover({ book }: { book: MemoryBookDocument }) {
  if (book.cover.design) return <BookSurface book={book}/>;
  return <div className={`${legacy.cover} ${legacy[book.cover.material]}`} style={{ backgroundColor: book.cover.color }}>
    <div className={legacy.coverInset}>
      <small>DEAR TOMORROW</small><span className={legacy.coverOrnament}>✧</span>
      <strong>{book.title}</strong><span className={legacy.coverRule}/>
      <em>{book.subtitle}</em><small>A BOOK OF MOMENTS</small>
    </div>
  </div>;
}
