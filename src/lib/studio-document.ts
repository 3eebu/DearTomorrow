import { LIMITS, uid, newElement, projectBytes, type BookElement, type MemoryBookDocument } from './memory-books';
import { newSurprise, surpriseNames, type SurpriseKind } from './book-surprises';
import { VOICE_BOOK_LIMIT, VOICE_COUNT_LIMIT, validVoiceAsset, type VoiceAsset } from './book-voice';

export function placeNewObject(element: BookElement, existing: BookElement[]): BookElement {
  if (!existing.length || element.kind === 'drawing') return element;
  const width = element.width, height = element.height;
  const xs = [element.x, 6, 50 - width / 2, 94 - width];
  const ys = [element.y, 6, 50 - height / 2, 94 - height];
  const objects = existing.filter(other => !other.hidden && other.kind !== 'drawing');
  let best = element, overlap = Infinity;
  for (const y of ys) for (const x of xs) {
    if (x < 2 || y < 2 || x + width > 98 || y + height > 98) continue;
    const covered = objects.reduce((total, other) => {
      const w = Math.min(x + width, other.x + other.width + 2) - Math.max(x, other.x - 2);
      const h = Math.min(y + height, other.y + other.height + 2) - Math.max(y, other.y - 2);
      return total + Math.max(0, w) * Math.max(0, h);
    }, 0);
    if (covered < overlap) { best = { ...element, x, y }; overlap = covered; }
    if (overlap === 0) return best;
  }
  return best;
}

export function voiceElement(): BookElement {
  return { ...newElement('voice'), name: 'Voice memory', text: '', width: 52, height: 24,
    x: 24, y: 38, background: '#efdfc7', voice: { version: 1, style: 'handwritten', title: 'A voice to keep', transcript: '' } };
}

export function pruneVoiceAssets(book: MemoryBookDocument) {
  if (!book.voiceAssets) return book;
  const pages = [...book.pages, ...(book.templates?.map(template => template.page) ?? []),
    ...Object.values(book.cover.design?.surfaces ?? {})];
  const used = new Set(pages.flatMap(page => page.elements.map(element => element.voice?.assetId)));
  const entries = Object.entries(book.voiceAssets);
  const kept = entries.filter(([id]) => used.has(id));
  return kept.length === entries.length ? book : { ...book, voiceAssets: kept.length ? Object.fromEntries(kept) : undefined };
}

export function setVoiceAsset(book: MemoryBookDocument, pageId: string, elementId: string, recording?: VoiceAsset) {
  const page = book.pages.find(value => value.id === pageId);
  const target = page?.elements.find(element => element.id === elementId && !element.locked);
  if (!page || !target?.voice) throw new Error('The voice card changed. Select it again before attaching a recording.');
  if (recording && !validVoiceAsset(recording)) throw new Error('The recording could not be verified.');
  const id = recording ? uid() : undefined;
  const next = pruneVoiceAssets({
    ...book, voiceAssets: recording && id ? { ...book.voiceAssets, [id]: recording } : book.voiceAssets,
    pages: book.pages.map(value => value !== page ? value : {
      ...page, elements: page.elements.map(element => element !== target ? element : { ...target, voice: { ...target.voice!, assetId: id } }),
    }),
  });
  const assets = Object.values(next.voiceAssets ?? {});
  if (assets.length > VOICE_COUNT_LIMIT || assets.reduce((size, asset) => size + asset.data.length, 0) > VOICE_BOOK_LIMIT) {
    throw new Error('This book has reached its voice recording budget. Replace an existing recording or start another book.');
  }
  if (projectBytes(next) > LIMITS.projectBytes) throw new Error('The recording would put this book over its 30 MB backup limit.');
  return next;
}

export function surpriseElement(type: SurpriseKind): BookElement {
  const element = newElement(type === 'reverse' ? 'polaroid' : 'surprise');
  return { ...element, surprise: newSurprise(type), text: type === 'reverse' ? 'A favorite moment' : '',
    name: surpriseNames[type], width: 48, height: type === 'reverse' ? 49 : 37,
    x: 25, y: 27, rotation: type === 'reverse' ? -3 : 0, fontSize: 4.4,
    background: type === 'reverse' ? '#fffaf0' : type === 'envelope' ? '#e9c8bd' : '#e8d7b9' };
}
export function copyObjects(elements: BookElement[], offset = 3) {
  const groups = new Map<string, string>();
  return elements.map(e => {
    if (e.groupId && !groups.has(e.groupId)) groups.set(e.groupId, uid());
    return { ...e, id: uid(), x: Math.min(200, e.x + offset), y: Math.min(200, e.y + offset), groupId: e.groupId ? groups.get(e.groupId) : undefined };
  });
}
export function insertPhoto(book: MemoryBookDocument, pageId: string, data: string, name: string, targetId?: string,
  hidden?: { type: SurpriseKind; itemId?: string }): MemoryBookDocument {
  const page = book.pages.find(p => p.id === pageId);
  const target = page?.elements.find(e => e.id === targetId && !e.locked);
  const surprise = target?.surprise;
  if (!page || (targetId && !target) || (hidden && (!surprise || surprise.type !== hidden.type ||
      (surprise.type === 'pocket' && !surprise.items.some(item => item.id === hidden.itemId))))) {
    throw new Error('The destination changed while the photo was loading. Please choose it again.');
  }
  if (!targetId && page.elements.length >= LIMITS.elements) throw new Error('This page already has 100 objects. Add another page for this photograph.');
  if (Object.keys(book.assets).length >= 500 || Object.values(book.assets).reduce((n, a) => n + a.data.length, data.length) > LIMITS.assetBytes) throw new Error('This book has reached its 24 MB photo budget. Export a backup and begin another volume.');
  const id = uid();
  const element = placeNewObject({ ...newElement('photo'), assetId: id, text: name.slice(0, 300) }, page.elements);
  let replacement: BookElement | undefined = target && { ...target, assetId: id };
  if (target && surprise && hidden) {
    const changed = surprise.type === 'pocket'
      ? { ...surprise, items: surprise.items.map(item => item.id === hidden.itemId ? { ...item, assetId: id } : item) }
      : { ...surprise, message: { ...surprise.message, assetId: id } };
    replacement = { ...target, surprise: changed };
  }
  const next = { ...book, assets: { ...book.assets, [id]: { data, name: name.slice(0, 300) } },
    pages: book.pages.map(p => p.id !== pageId ? p : { ...p,
      elements: replacement ? p.elements.map(e => e.id === targetId ? replacement : e) : [...p.elements, element] }) };
  if (projectBytes(next) > LIMITS.projectBytes) throw new Error('This project has reached its 30 MB project budget. Export a backup and begin another volume.');
  return next;
}
export function moveObjects(book: MemoryBookDocument, sourceId: string, targetId: string, ids: Set<string>) {
  const from = book.pages.find(p => p.id === sourceId), to = book.pages.find(p => p.id === targetId);
  if (!from || !to || from === to) return book;
  const moving = from.elements.filter(e => ids.has(e.id) && !e.locked);
  if (to.elements.length + moving.length > LIMITS.elements) throw new Error('The destination page would exceed 100 objects. Choose another page.');
  return { ...book, pages: book.pages.map(p => p.id === sourceId ? { ...p, elements: p.elements.filter(e => !moving.includes(e)) } : p.id === targetId ? { ...p, elements: [...p.elements, ...moving] } : p) };
}
