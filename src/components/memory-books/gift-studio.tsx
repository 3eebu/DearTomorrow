'use client';
import { useState } from 'react';
import { defaultGift, giftBows, giftPatterns, ribbonMaterials, type GiftDesign } from '@/lib/book-gift';
import type { MemoryBookDocument } from '@/lib/memory-books';
import { BookReader } from './book-reader';
import { GiftPaper } from './gift-presentation';
import making from './bookmaking.module.css';
export function GiftStudio({ book, onChange, onDone, status }: {
  book: MemoryBookDocument; onChange: (book: MemoryBookDocument) => void; onDone: () => void; status: string;
}) {
  const [preview, setPreview] = useState(false);
  const gift = book.gift ?? defaultGift;
  function update(values: Partial<GiftDesign>) { onChange({ ...book, gift: { ...gift, ...values } }); }
  if (preview) return <BookReader book={{ ...book, gift }} startWrapped
    onExit={() => setPreview(false)} onEdit={() => setPreview(false)}
    exitLabel="← Gift Studio" editLabel="Edit wrapping ↗"/>;

  return <div className={making.workshop}>
    <header className={making.bar}>
      <button onClick={onDone}>← Library</button><h1>Wrap the book</h1><span role="status">{status}</span>
      <button onClick={() => { if (!book.gift) update({}); setPreview(true); }}>Preview opening ↗</button>
    </header>
    <div className={making.coverGrid}>
      <main className={making.preview}><div style={{ aspectRatio: book.widthMm / book.heightMm }}><GiftPaper gift={gift}/></div></main>
      <aside className={making.controls}>
        <label>Wrapping paper<input type="color" value={gift.color} onChange={event => update({ color: event.target.value })}/></label>
        <label>Paper pattern<select value={gift.pattern} onChange={event => update({ pattern: event.target.value as GiftDesign['pattern'] })}>
          {giftPatterns.map(option => <option key={option}>{option}</option>)}</select></label>
        <label>Ribbon colour<input type="color" value={gift.ribbon} onChange={event => update({ ribbon: event.target.value })}/></label>
        <label>Ribbon material<select value={gift.material} onChange={event => update({ material: event.target.value as GiftDesign['material'] })}>
          {ribbonMaterials.map(option => <option key={option}>{option}</option>)}</select></label>
        <label>Bow style<select value={gift.bow} onChange={event => update({ bow: event.target.value as GiftDesign['bow'] })}>
          {giftBows.map(option => <option key={option}>{option}</option>)}</select></label>
        {(['tag', 'to', 'from'] as const).map(key => <label key={key}>{{ tag: 'Gift tag', to: 'Recipient', from: 'Sender' }[key]}
          <input maxLength={key === 'tag' ? 60 : 80} value={gift[key]} onChange={event => update({ [key]: event.target.value })}/>
        </label>)}
        <label>Opening message<textarea maxLength={1000} value={gift.message} onChange={event => update({ message: event.target.value })}/></label>
        <p>Play this presentation on this device.</p>
      </aside>
    </div>
  </div>;
}
