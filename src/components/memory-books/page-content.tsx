'use client';
/* Local, resized data images are rendered directly; no external image service is used. */
/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useState, type CSSProperties } from 'react';
import { fonts, type BookElement, type BookPage, type MemoryBookDocument } from '@/lib/memory-books';
import s from './memory-books.module.css';
import { CreativeGraphic, Drawing, PaperBackground } from './creative-objects';
export const ReadingNotes = createContext<{ open: ReadonlySet<string>; toggle: (id: string) => void } | null>(null);

export function ElementContent({ element: e, book, interactive = false }: { element: BookElement; book: MemoryBookDocument; interactive?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const notes = useContext(ReadingNotes);
  const isRevealed = notes ? notes.open.has(e.id) : revealed;
  const noteContent = isRevealed || (!interactive && !notes) ? e.text : <><span className={s.noteFold}/><em>Open a little note ↗</em></>;
  const image = e.assetId && book.assets[e.assetId];
  if (e.kind === 'drawing') return <Drawing strokes={e.strokes || []}/>;
  if (e.kind === 'shape' || e.kind === 'sticker') return <CreativeGraphic element={e}/>;
  if (e.kind === 'text') return <div data-writing className={s.words} style={{ padding: `${e.padding ?? 0}cqw`, background: e.textBackground ? e.background : undefined, textShadow: e.textShadow ? '.04em .08em .12em #30221e35' : undefined, display: 'flex', flexDirection: 'column', justifyContent: e.verticalAlign === 'center' ? 'center' : e.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start' }}><div style={{textDecoration:!e.runs && e.underline ? "underline" : undefined}}>{e.runs ? e.runs.map((r, i) => <span key={i} style={{ fontWeight: r.bold === undefined ? undefined : r.bold ? 700 : 400, fontStyle: r.italic === undefined ? undefined : r.italic ? 'italic' : 'normal', textDecoration: (r.underline ?? e.underline) ? 'underline' : undefined, color: r.color }}>{r.text}</span>) : e.text}</div></div>;
  if (e.kind === 'note') return interactive ? <button type="button" className={s.note} style={{ background: e.background }} aria-expanded={isRevealed} onClick={() => notes ? notes.toggle(e.id) : setRevealed(v => !v)}>{noteContent}</button> : <div className={s.note} style={{ background: e.background }}>{noteContent}</div>;
  const framed = e.kind === 'polaroid';
  return <><div className={framed ? s.polaroid : s.photo} style={{ background: framed || !image ? e.background : 'transparent', borderRadius: `${e.radius ?? 0}%`, border: e.border !== undefined ? `${e.border * .1}cqw solid ${e.borderColor || e.color}` : undefined, boxShadow: e.shadow !== undefined ? `0 ${e.shadow * .7}cqw ${e.shadow * 1.4}cqw #30231b35` : undefined, padding: framed && e.frameMargin !== undefined ? `${e.frameMargin}%` : undefined, flexDirection: e.captionPosition === 'top' ? 'column-reverse' : undefined }}>
    <div className={s.photoWell} style={{background:image ? 'transparent' : undefined}}>{image ? <img src={image.data} alt={e.text || 'A personal memory'} draggable={false} style={{ objectPosition: `${e.cropX}% ${e.cropY}%`, objectFit: e.fit ?? 'cover', transform: `scale(${(e.flipX ? -1 : 1) * (e.imageZoom ?? 1)},${(e.flipY ? -1 : 1) * (e.imageZoom ?? 1)})`, transformOrigin: `${e.cropX}% ${e.cropY}%`, filter: e.filter === 'sepia' ? 'sepia(.65)' : e.filter === 'mono' ? 'grayscale(1)' : e.filter === 'warm' ? 'sepia(.2) saturate(.8)' : undefined }}/>: <div className={s.photoPlaceholder}><svg viewBox="0 0 100 80" aria-hidden="true"><path d="M10 65 36 35 54 52 68 29 92 65M63 16a7 7 0 1 0 14 0a7 7 0 1 0-14 0" fill="none" stroke="currentColor" strokeWidth="1"/></svg><span>Your photograph, here</span></div>}</div>
    {framed && <div className={s.photoCaption} style={{ lineHeight:e.lineHeight ?? 1.15, justifyContent:e.align === 'left' ? 'flex-start' : e.align === 'right' ? 'flex-end' : 'center', height: e.captionMargin !== undefined ? `${e.captionMargin}%` : undefined, minHeight: e.captionMargin !== undefined ? `${e.captionMargin}%` : undefined }}>{e.text}</div>}
    {!!e.grain && <i aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: e.grain * .15, backgroundImage: 'repeating-linear-gradient(23deg,#453b2b33 0 1px,transparent 1px 3px)' }}/>}
    {e.dateLabel && <small style={{ position: 'absolute', bottom: '3%', right: '6%', fontSize: '.7em' }}>{e.dateLabel}</small>}
  </div>{e.tape && <span aria-hidden="true" style={{ position: 'absolute', left: '30%', top: '-6%', width: '40%', height: '12%', opacity: .8, background: '#d3c39f', transform: 'rotate(-4deg)', clipPath: 'polygon(3% 0,100% 8%,97% 100%,0 93%)' }}/>}</>;
}
export function elementStyle(e: BookElement): CSSProperties {
  return { left: `${e.x}%`, top: `${e.y}%`, width: `${e.width}%`, height: `${e.height}%`, transform: `rotate(${e.rotation}deg)`, opacity: e.opacity, color: e.color, fontFamily: fonts[e.font], fontSize: `${e.fontSize}cqw`, textAlign: e.align, fontWeight: e.bold ? 700 : undefined, fontStyle: e.italic ? 'italic' : undefined, textDecoration: e.kind !== 'text' && e.underline ? 'underline' : undefined, lineHeight: e.lineHeight ?? 1.5, letterSpacing: `${e.letterSpacing ?? 0}em`, display: e.hidden ? 'none' : undefined, pointerEvents: e.kind === 'drawing' ? 'none' : undefined };
}
export function PageContent({ page, book, interactive = false }: { page?: BookPage; book: MemoryBookDocument; interactive?: boolean }) {
  return <div className={s.paper} style={{backgroundColor:page?.paper||'#eee5d4'}}><PaperBackground page={page} book={book}/>
    {page ? page.elements.map(e => <div key={e.id} className={s.object} style={elementStyle(e)}><ElementContent element={e} book={book} interactive={interactive}/></div>) : <div className={s.endpaper}><span>Dear Tomorrow.</span><em>{book.dedication || 'For all the things that stay.'}</em></div>}
  </div>;
}
