'use client';
/* Local, resized data images are rendered directly; no external image service is used. */
/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useState, type CSSProperties } from 'react';
import { fonts, type BookElement, type BookPage, type MemoryBookDocument } from '@/lib/memory-books';
import s from './memory-books.module.css';
export const ReadingNotes = createContext<{ open: ReadonlySet<string>; toggle: (id: string) => void } | null>(null);

export function ElementContent({ element: e, book, interactive = false }: { element: BookElement; book: MemoryBookDocument; interactive?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const notes = useContext(ReadingNotes);
  const isRevealed = notes ? notes.open.has(e.id) : revealed;
  const noteContent = isRevealed || (!interactive && !notes) ? e.text : <><span className={s.noteFold}/><em>Open a little note ↗</em></>;
  const image = e.assetId && book.assets[e.assetId];
  if (e.kind === 'text') return <div className={s.words}>{e.text}</div>;
  if (e.kind === 'note') return interactive ? <button type="button" className={s.note} style={{ background: e.background }} aria-expanded={isRevealed} onClick={() => notes ? notes.toggle(e.id) : setRevealed(v => !v)}>{noteContent}</button> : <div className={s.note} style={{ background: e.background }}>{noteContent}</div>;
  return <div className={e.kind === 'polaroid' ? s.polaroid : s.photo} style={{ background: e.background }}>
    <div className={s.photoWell}>{image ? <img src={image.data} alt={e.text || 'A personal memory'} draggable={false} style={{ objectPosition: `${e.cropX}% ${e.cropY}%` }}/>: <div className={s.photoPlaceholder}><svg viewBox="0 0 100 80" aria-hidden="true"><path d="M10 65 36 35 54 52 68 29 92 65M63 16a7 7 0 1 0 14 0a7 7 0 1 0-14 0" fill="none" stroke="currentColor" strokeWidth="1"/></svg><span>Your photograph, here</span></div>}</div>
    {e.kind === 'polaroid' && <div className={s.photoCaption}>{e.text}</div>}
  </div>;
}
export function elementStyle(e: BookElement): CSSProperties {
  return { left: `${e.x}%`, top: `${e.y}%`, width: `${e.width}%`, height: `${e.height}%`, transform: `rotate(${e.rotation}deg)`, opacity: e.opacity, color: e.color, fontFamily: fonts[e.font], fontSize: `${e.fontSize}cqw`, textAlign: e.align };
}
export function PageContent({ page, book, interactive = false }: { page?: BookPage; book: MemoryBookDocument; interactive?: boolean }) {
  return <div className={`${s.paper} ${s[page?.texture || 'plain']}`} style={{ backgroundColor: page?.paper || '#eee5d4' }}>
    {page ? page.elements.map(e => <div key={e.id} className={s.object} style={elementStyle(e)}><ElementContent element={e} book={book} interactive={interactive}/></div>) : <div className={s.endpaper}><span>Dear Tomorrow.</span><em>{book.dedication || 'For all the things that stay.'}</em></div>}
  </div>;
}
export function Cover({ book }: { book: MemoryBookDocument }) {
  return <div className={`${s.cover} ${s[book.cover.material]}`} style={{ backgroundColor: book.cover.color }}><div className={s.coverInset}><small>DEAR TOMORROW</small><span className={s.coverOrnament}>✧</span><strong>{book.title}</strong><span className={s.coverRule}/><em>{book.subtitle}</em><small>A BOOK OF MOMENTS</small></div></div>;
}
