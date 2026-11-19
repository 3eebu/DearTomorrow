import { blankPage, newElement, uid, LIMITS, type MemoryBookDocument, type CoverDesign } from './memory-books';
import { clonePage } from './studio-content';

export function coverDesign(book: MemoryBookDocument): CoverDesign {
  return book.cover.design ?? {
    version: 1,
    fabric: book.cover.material === 'smooth' ? 'matte' : book.cover.material,
    finish: 'matte', lettering: 'print', ink: '#f1dfbc', initials: '', recipient: '', date: '',
    branding: true, spineTitle: book.title.slice(0, 120), bands: true, surfaces: {},
  };
}

export function contents(book: MemoryBookDocument) {
  return book.chapters.map(chapter => {
    const matches = book.pages.flatMap((page, index) => page.chapterId === chapter.id ? [index + 1] : []);
    return { ...chapter, page: matches[0] ?? 0, count: matches.length };
  });
}

// The reader uses the canonical page array. Regroup only on an explicit move.
export function reorderChapter(book: MemoryBookDocument, id: string, delta: number) {
  const chapters = [...book.chapters];
  const from = chapters.findIndex(chapter => chapter.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= chapters.length) return book;
  const [chapter] = chapters.splice(from, 1);
  chapters.splice(to, 0, chapter);
  const order = new Map(chapters.map((item, index) => [item.id, index]));
  const position = (id: string) => id ? order.get(id) ?? chapters.length : chapters.length;
  const pages = [...book.pages].sort((a, b) => position(a.chapterId) - position(b.chapterId));
  return { ...book, chapters, pages };
}

export function duplicateChapter(book: MemoryBookDocument, id: string) {
  if (book.chapters.length >= 100) throw new Error('This book supports 100 chapters.');
  const original = book.chapters.find(chapter => chapter.id === id);
  if (!original) return book;
  const originals = book.pages.filter(page => page.chapterId === id);
  if (book.pages.length + originals.length > LIMITS.pages) throw new Error('Duplicating this chapter would exceed 200 pages.');
  const chapter = { ...original, id: uid(), title: (original.title + ' — copy').slice(0, 120) };
  const chapters = [...book.chapters];
  const pages = [...book.pages];
  chapters.splice(chapters.indexOf(original) + 1, 0, chapter);
  pages.splice(book.pages.lastIndexOf(originals[originals.length - 1]) + 1, 0,
    ...originals.map(page => clonePage(page, chapter.id)));
  return { ...book, chapters, pages };
}

export function movePages(book: MemoryBookDocument, ids: string[], chapterId: string) {
  if (chapterId === 'unassigned') chapterId = '';
  if (chapterId && !book.chapters.some(chapter => chapter.id === chapterId)) throw new Error('Choose an existing chapter.');
  const selected = new Set(ids);
  return { ...book, pages: book.pages.map(page => selected.has(page.id) ? { ...page, chapterId } : page) };
}

export function divider(chapterId: string, title: string, kind: string) {
  const page = blankPage(chapterId);
  page.elements = [{
    ...newElement('text'), text: title, x: 12, y: 35, width: 76, height: 30, fontSize: 9,
    align: 'center', font: kind === 'handwritten' ? 'hand' : 'serif',
  }];
  if (kind === 'botanical') page.elements.push({
    ...newElement('sticker'), sticker: 'branch', text: '', x: 40, y: 13, width: 20, height: 20,
  });
  if (kind === 'border') page.elements.push({
    ...newElement('shape'), shape: 'border', fillNone: true, text: '', x: 7, y: 7, width: 86, height: 86,
  });
  if (kind === 'photograph') page.elements.unshift({
    ...newElement('photo'), x: 0, y: 0, width: 100, height: 100, text: 'Your chapter photograph',
  });
  if (kind === 'colored') page.paper = '#e6eadf';
  return page;
}
