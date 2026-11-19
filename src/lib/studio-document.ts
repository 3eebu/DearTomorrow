import { LIMITS, uid, newElement, projectBytes, type BookElement, type MemoryBookDocument } from './memory-books';
import { newSurprise, surpriseNames, type SurpriseKind } from './book-surprises';

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
  const id = uid(), n = page.elements.length % 5;
  const element = { ...newElement('photo'), assetId: id, text: name.slice(0, 300), x: 12 + n * 5, y: 18 + n * 5 };
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
