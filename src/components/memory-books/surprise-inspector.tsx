'use client';
import {
  envelopeFlaps, flapHinges, folds, MAX_POCKET_ITEMS, newMessage, newSurprise, papers, pocketTypes,
  popupStyles, printMarks, scratchShapes, surpriseNames, type Surprise, type SurpriseKind, type SurpriseMessage,
} from '@/lib/book-surprises';
import { uid, type BookElement, type MemoryBookDocument } from '@/lib/memory-books';
import { ElementContent } from './page-content';
import s from './paper-surprise.module.css';

type Patch = (values: Partial<BookElement>, key?: string) => void;

function Choice<T extends string>({ label, value, choices, onChange }: {
  label: string; value: T; choices: readonly T[]; onChange: (value: T) => void;
}) {
  return <label>{label}<select value={value} onChange={event => onChange(event.target.value as T)}>
    {choices.map(option => <option key={option}>{option}</option>)}
  </select></label>;
}

function MessageFields({ message, book, update, upload }: {
  message: SurpriseMessage; book: MemoryBookDocument; update: (message: SurpriseMessage, key: string) => void;
  upload: () => void;
}) {
  return <>
    <label>Hidden message<textarea rows={4} maxLength={20000} value={message.words}
      onChange={event => update({ ...message, words: event.target.value }, 'words')}/>
    </label>
    <label>Date on the inside<input maxLength={100} value={message.date}
      onChange={event => update({ ...message, date: event.target.value }, 'date')}/>
    </label>
    <label>Place on the inside<input maxLength={100} value={message.place}
      onChange={event => update({ ...message, place: event.target.value }, 'place')}/>
    </label>
    <Choice label="Inside ornament" value={message.ornament} choices={printMarks}
      onChange={ornament => update({ ...message, ornament }, 'ornament')}/>
    <label>Inside photograph<select value={message.assetId ?? ''} onChange={event =>
      update({ ...message, assetId: event.target.value || undefined }, 'photo')}>
      <option value="">None</option>
      {Object.entries(book.assets).map(([id, asset]) => <option key={id} value={id}>{asset.name}</option>)}
    </select></label>
    <button type="button" onClick={upload}>Upload inside photograph ↗</button>
  </>;
}

export function SurpriseInspector({ element, book, patch, upload }: {
  element: BookElement; book: MemoryBookDocument; patch: Patch; upload: (type: SurpriseKind, itemId?: string) => void;
}) {
  const card = element.surprise;
  if (!card) {
    if (!['photo', 'polaroid', 'note'].includes(element.kind)) return null;
    const note = element.kind === 'note';
    return <button type="button" disabled={element.locked} onClick={() => {
      const surprise = newSurprise(note ? 'fold' : 'reverse');
      if (note) surprise.message.words = element.text;
      patch({ surprise });
    }}>{note ? 'Add an animated fold' : 'Customize the reverse'}</button>;
  }
  const update = (next: Surprise, key = '') => patch({ surprise: next }, key ? `${element.id}:surprise:${key}` : '');
  const paperColor = (key: 'insideColor' | 'ink', label: string) =>
    <label>{label}<input type="color" value={card[key]} onChange={event =>
      update({ ...card, [key]: event.target.value }, key)}/></label>;

  return <details open>
    <summary>{surpriseNames[card.type]}</summary>
    <details className={s.preview}>
      <summary>Try this surprise</summary>
      <div className={s.previewPaper} style={{ aspectRatio: (book.widthMm * element.width) / (book.heightMm * element.height) }}>
        <ElementContent key={`${element.id}:${JSON.stringify(card)}`} element={element} book={book} interactive/>
      </div>
    </details>
    <fieldset className={s.editorFields} disabled={element.locked}>
      <label>Exterior inscription<input maxLength={100} value={card.label}
        onChange={event => update({ ...card, label: event.target.value }, 'label')}/>
      </label>
      <Choice label="Paper stock" value={card.paper} choices={papers} onChange={paper => update({ ...card, paper })}/>
      {card.type !== 'reverse' && <label>Exterior paper<input type="color" value={element.background}
        onChange={event => patch({ background: event.target.value }, `${element.id}:paper`)}/></label>}
      {paperColor('insideColor', 'Interior paper')}{paperColor('ink', 'Message ink')}
      {card.type === 'envelope' && <>
        <Choice label="Envelope flap" value={card.flap} choices={envelopeFlaps} onChange={flap => update({ ...card, flap })}/>
        <label>Wax seal<input type="color" value={card.seal} onChange={event => update({ ...card, seal: event.target.value }, 'seal')}/></label>
        <label>Seal initials<input maxLength={6} value={card.initials}
          onChange={event => update({ ...card, initials: event.target.value }, 'initials')}/></label>
      </>}
      {card.type === 'fold' && <Choice label="Fold style" value={card.fold} choices={folds} onChange={fold => update({ ...card, fold })}/>}
      {card.type === 'scratch' && <Choice label="Scratch shape" value={card.shape} choices={scratchShapes} onChange={shape => update({ ...card, shape })}/>}
      {card.type === 'flap' && <Choice label="Hinged edge" value={card.hinge} choices={flapHinges} onChange={hinge => update({ ...card, hinge })}/>}
      {card.type === 'popup' && <Choice label="Paper cut" value={card.style} choices={popupStyles} onChange={style => update({ ...card, style })}/>}
      {card.type === 'pocket' ? <>
        {card.items.map((item, index) => {
          const change = (next: typeof item, key: string) =>
            update({ ...card, items: card.items.map(value => value === item ? next : value) }, `${item.id}:${key}`);
          return <details key={item.id}>
            <summary>{item.title || `Keepsake ${index + 1}`}</summary>
            <label>Keepsake name<input value={item.title} maxLength={100}
              onChange={event => change({ ...item, title: event.target.value }, 'title')}/></label>
            <Choice label="Keepsake style" value={item.type} choices={pocketTypes} onChange={type => change({ ...item, type }, 'type')}/>
            <MessageFields message={item} book={book} update={(message, key) => change({ ...item, ...message }, key)}
              upload={() => upload(card.type, item.id)}/>
            <button type="button" disabled={card.items.length === 1} onClick={() =>
              update({ ...card, items: card.items.filter(value => value !== item) })}>Remove keepsake</button>
          </details>;
        })}
        <button type="button" disabled={card.items.length >= MAX_POCKET_ITEMS} onClick={() =>
          update({ ...card, items: [...card.items, { ...newMessage(), id: uid(), title: 'A little keepsake', type: 'note' }] })
        }>＋ Add keepsake</button>
      </> : <MessageFields message={card.message} book={book} update={(message, key) => update({ ...card, message }, key)}
        upload={() => upload(card.type)}/>}
      {(element.kind === 'photo' || element.kind === 'polaroid') && <button type="button" onClick={() =>
        patch({ surprise: undefined })}>Remove custom reverse</button>}
      {element.kind === 'note' && <button type="button" onClick={() =>
        patch({ surprise: undefined, text: card.message.words, runs: undefined })}>Use the original note style</button>}
    </fieldset>
  </details>;
}
