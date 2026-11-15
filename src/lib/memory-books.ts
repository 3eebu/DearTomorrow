export type ElementKind = 'text' | 'polaroid' | 'photo' | 'note';
export type BookElement = {
  id: string; kind: ElementKind; x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; locked: boolean; text: string; color: string;
  background: string; font: 'serif' | 'sans' | 'hand' | 'mono'; fontSize: number;
  align: 'left' | 'center' | 'right'; assetId?: string; cropX: number; cropY: number;
};
export type BookPage = { id: string; chapterId: string; paper: string; texture: 'plain' | 'grain' | 'lines'; elements: BookElement[] };
export type MemoryBookDocument = {
  version: 1; id: string; title: string; subtitle: string; dedication: string;
  createdAt: string; updatedAt: string; archived: boolean;
  widthMm: number; heightMm: number; cover: { color: string; material: 'linen' | 'leather' | 'smooth' };
  chapters: { id: string; title: string }[]; pages: BookPage[];
  assets: Record<string, { data: string; name: string }>;
};
export const LIMITS = { pages: 200, elements: 100, books: 32, uploadBytes: 8 * 1024 * 1024, projectBytes: 30 * 1024 * 1024 };
export const uid = () => crypto.randomUUID();
export function shouldCompleteTurn(direction: 1 | -1, progress: number, velocity: number, ageMs: number, cancelled = false) {
  const distance = direction === 1 ? progress : 1 - progress;
  const flick = ageMs < 100 && (direction === 1 ? velocity < -.4 : velocity > .4);
  return !cancelled && (distance > .38 || flick);
}
export const fonts = { serif: 'Georgia, serif', sans: 'Arial, sans-serif', hand: '"Segoe Print", "Bradley Hand", cursive', mono: '"Courier New", monospace' };
export const formats = [
  ['Small square', 152.4, 152.4], ['Classic square', 203.2, 203.2], ['Portrait keepsake', 152.4, 203.2],
  ['A5 portrait', 148, 210], ['Landscape album', 254, 203.2], ['Custom', 200, 200],
] as const;
export function blankPage(chapterId = ''): BookPage {
  return { id: uid(), chapterId, paper: '#f6efdf', texture: 'grain', elements: [] };
}
export function newElement(kind: ElementKind): BookElement {
  return { id: uid(), kind, x: 18, y: 20, width: kind === 'text' ? 64 : 45, height: kind === 'text' ? 28 : 52,
    rotation: kind === 'polaroid' ? -5 : 0, opacity: 1, locked: false,
    text: kind === 'text' ? 'A little moment worth keeping.' : kind === 'note' ? 'Something I never told you…' : 'The little things.',
    color: '#493b34', background: kind === 'note' ? '#e9dcb9' : '#fffaf0', font: kind === 'text' ? 'serif' : 'hand', fontSize: kind === 'text' ? 5 : 3.1,
    align: kind === 'text' ? 'left' : 'center', cropX: 50, cropY: 50 };
}
export function createBook(title: string, widthMm: number, heightMm: number, color: string, material: MemoryBookDocument['cover']['material'], blank: boolean): MemoryBookDocument {
  const chapterId = uid();
  const first = blankPage(chapterId);
  if (!blank) first.elements = [
    { ...newElement('text'), y: 12, height: 22, text: 'All the little things\nI love about us.', fontSize: 7.2, align: 'center' },
    { ...newElement('polaroid'), x: 26, y: 39, width: 48, height: 47 },
  ];
  return { version: 1, id: uid(), title: title.trim() || 'Our little forever', subtitle: 'A book of moments', dedication: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archived: false,
    widthMm, heightMm, cover: { color, material }, chapters: [{ id: chapterId, title: 'The beginning' }], pages: [first, blankPage(chapterId)], assets: {} };
}

// Validate every nested value before it reaches a renderer or the local library.
export function validateBook(input: unknown): MemoryBookDocument {
  const fail = (): never => { throw new Error('This project is damaged or uses an unsupported format. Your existing books were kept.'); };
  if (!input || typeof input !== 'object') return fail();
  const b = input as MemoryBookDocument;
  const str = (v: unknown, max = 2000) => typeof v === 'string' && v.length <= max;
  const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const color = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (b.version !== 1 || !str(b.id, 100) || !str(b.title, 120) || !str(b.subtitle, 200) || !str(b.dedication) || !str(b.createdAt, 50) || !str(b.updatedAt, 50) || typeof b.archived !== 'boolean' || !num(b.widthMm, 100, 320) || !num(b.heightMm, 100, 320)) return fail();
  if (!b.cover || !color(b.cover.color) || !['linen', 'leather', 'smooth'].includes(b.cover.material)) return fail();
  if (!Array.isArray(b.chapters) || b.chapters.length > 100 || !b.chapters.every(c => c && str(c.id, 100) && str(c.title, 120))) return fail();
  if (!b.assets || typeof b.assets !== 'object' || Array.isArray(b.assets) || Object.keys(b.assets).length > 500) return fail();
  for (const a of Object.values(b.assets)) if (!a || !str(a.name, 300) || !str(a.data, 8 * 1024 * 1024) || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data)) return fail();
  if (!Array.isArray(b.pages) || !b.pages.length || b.pages.length > LIMITS.pages) return fail();
  const ids = new Set<string>();
  for (const p of b.pages) {
    if (!p || !str(p.id, 100) || ids.has(p.id) || !str(p.chapterId, 100) || (p.chapterId && !b.chapters.some(c => c.id === p.chapterId)) || !color(p.paper) || !['plain', 'grain', 'lines'].includes(p.texture) || !Array.isArray(p.elements) || p.elements.length > LIMITS.elements) return fail();
    ids.add(p.id);
    const elementIds = new Set<string>();
    for (const e of p.elements) {
      if (!e || !str(e.id, 100) || elementIds.has(e.id) || !['text', 'photo', 'polaroid', 'note'].includes(e.kind) || !str(e.text, 20000) || !color(e.color) || !color(e.background) || !['serif', 'sans', 'hand', 'mono'].includes(e.font) || !['left', 'center', 'right'].includes(e.align) || typeof e.locked !== 'boolean' || !num(e.x, 0, 100) || !num(e.y, 0, 100) || !num(e.width, 5, 100) || !num(e.height, 5, 100) || e.x + e.width > 100.01 || e.y + e.height > 100.01 || !num(e.rotation, -180, 180) || !num(e.opacity, 0, 1) || !num(e.fontSize, 1, 20) || !num(e.cropX, 0, 100) || !num(e.cropY, 0, 100) || (e.assetId !== undefined && (!str(e.assetId, 100) || !Object.hasOwn(b.assets, e.assetId)))) return fail();
      elementIds.add(e.id);
    }
  }
  return b;
}
