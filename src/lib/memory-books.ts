export type ElementKind = 'text' | 'polaroid' | 'photo' | 'note' | 'shape' | 'sticker' | 'drawing';
export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; color?: string };
export type DrawingStroke = { id: string; tool: 'pencil' | 'pen' | 'marker' | 'highlighter'; color: string; width: number; opacity: number; points: [number, number, number][] };
export const stickers = ['heart', 'bow', 'branch', 'daisy', 'rose', 'tape', 'stamp', 'label', 'ticket', 'postmark', 'stars', 'bookmark'] as const;
export const shapeNames = ['rectangle', 'ellipse', 'heart', 'star', 'line', 'arrow', 'border', 'highlight'] as const;
export type BookElement = {
  id: string; kind: ElementKind; x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; locked: boolean; text: string; color: string;
  background: string; font: 'serif' | 'sans' | 'hand' | 'mono'; fontSize: number;
  align: 'left' | 'center' | 'right'; assetId?: string; cropX: number; cropY: number;
  name?: string; hidden?: boolean; groupId?: string; aspectLocked?: boolean;
  bold?: boolean; italic?: boolean; underline?: boolean; lineHeight?: number; letterSpacing?: number; padding?: number;
  verticalAlign?: 'top' | 'center' | 'bottom'; textShadow?: boolean; textBackground?: boolean; runs?: TextRun[];
  imageZoom?: number; flipX?: boolean; flipY?: boolean; fit?: 'cover' | 'contain'; radius?: number; border?: number; borderColor?: string;
  shadow?: number; filter?: 'none' | 'sepia' | 'mono' | 'warm'; frame?: 'classic' | 'vintage' | 'wide' | 'mini' | 'retro' | 'thin' | 'custom';
  frameMargin?: number; captionMargin?: number; captionPosition?: 'top' | 'bottom'; grain?: number; dateLabel?: string; tape?: boolean;
  shape?: typeof shapeNames[number]; fillNone?: boolean; strokeWidth?: number;
  sticker?: typeof stickers[number]; strokes?: DrawingStroke[];
};
export type BookPage = { id: string; chapterId: string; paper: string; texture: 'plain' | 'grain' | 'lines' | 'dots' | 'graph' | 'handmade' | 'vintage' | 'pattern'; elements: BookElement[]; textureStrength?: number; gradient?: string; backgroundAssetId?: string; backgroundX?: number; backgroundY?: number };
export type MemoryBookDocument = {
  version: 2; id: string; title: string; subtitle: string; dedication: string;
  createdAt: string; updatedAt: string; archived: boolean;
  widthMm: number; heightMm: number; cover: { color: string; material: 'linen' | 'leather' | 'smooth' };
  chapters: { id: string; title: string }[]; pages: BookPage[];
  assets: Record<string, { data: string; name: string }>;
  templates?: { id: string; title: string; page: BookPage }[];
};
export const LIMITS = { pages: 200, elements: 100, books: 32, uploadBytes: 8 * 1024 * 1024, projectBytes: 30 * 1024 * 1024, assetBytes: 24 * 1024 * 1024, strokes: 200, points: 2000 };
export const uid = () => crypto.randomUUID();
export function projectBytes(book: MemoryBookDocument) {
  const text = JSON.stringify(book);
  return text.length + (text.match(/[^\x00-\x7f]/gu) || []).reduce((extra, ch) => extra + (ch.codePointAt(0)! > 0xffff ? 2 : ch.charCodeAt(0) > 0x7ff ? 2 : 1), 0);
}
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
  return { version: 2, id: uid(), title: title.trim() || 'Our little forever', subtitle: 'A book of moments', dedication: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archived: false,
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
  const version = (input as { version: unknown }).version;
  if (![1, 2].includes(version as number) || !str(b.id, 100) || !str(b.title, 120) || !str(b.subtitle, 200) || !str(b.dedication) || !str(b.createdAt, 50) || !str(b.updatedAt, 50) || typeof b.archived !== 'boolean' || !num(b.widthMm, 100, 320) || !num(b.heightMm, 100, 320)) return fail();
  if (!b.cover || !color(b.cover.color) || !['linen', 'leather', 'smooth'].includes(b.cover.material)) return fail();
  if (!Array.isArray(b.chapters) || b.chapters.length > 100 || !b.chapters.every(c => c && str(c.id, 100) && str(c.title, 120))) return fail();
  if (!b.assets || typeof b.assets !== 'object' || Array.isArray(b.assets) || Object.keys(b.assets).length > 500) return fail();
  let assetSize = 0;
  for (const a of Object.values(b.assets)) {
    if (!a || !str(a.name, 300) || !str(a.data, 8 * 1024 * 1024) || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data)) return fail();
    assetSize += a.data.length;
  }
  if (assetSize > LIMITS.projectBytes) return fail();
  if (!Array.isArray(b.pages) || !b.pages.length || b.pages.length > LIMITS.pages) return fail();
  const ids = new Set<string>();
  const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v);
  function page(p: BookPage): BookPage {
    if (!p || !str(p.id, 100) || !str(p.chapterId, 100) || (p.chapterId && !b.chapters.some(c => c.id === p.chapterId)) || !color(p.paper) || !['plain', 'grain', 'lines', 'dots', 'graph', 'handmade', 'vintage', 'pattern'].includes(p.texture) || !Array.isArray(p.elements) || p.elements.length > LIMITS.elements) return fail();
    for (const key of ['textureStrength', 'backgroundX', 'backgroundY'] as const) if (!optional(p[key], v => num(v, 0, key === 'textureStrength' ? 1 : 100))) return fail();
    if (!optional(p.gradient, color) || !optional(p.backgroundAssetId, v => str(v, 100) && Object.hasOwn(b.assets, v as string))) return fail();
    const elementIds = new Set<string>();
    for (const e of p.elements) {
      if (!e || !str(e.id, 100) || elementIds.has(e.id) || !(version === 1 ? ['text', 'photo', 'polaroid', 'note'] : ['text', 'photo', 'polaroid', 'note', 'shape', 'sticker', 'drawing']).includes(e.kind) || !str(e.text, 20000) || !color(e.color) || !color(e.background) || !['serif', 'sans', 'hand', 'mono'].includes(e.font) || !['left', 'center', 'right'].includes(e.align) || typeof e.locked !== 'boolean' || !num(e.x, version === 1 ? 0 : -100, version === 1 ? 100 : 200) || !num(e.y, version === 1 ? 0 : -100, version === 1 ? 100 : 200) || !num(e.width, 1, version === 1 ? 100 : 200) || !num(e.height, 1, version === 1 ? 100 : 200) || (version === 1 && (e.x + e.width > 100.01 || e.y + e.height > 100.01)) || !num(e.rotation, -180, 180) || !num(e.opacity, 0, 1) || !num(e.fontSize, 1, 20) || !num(e.cropX, 0, 100) || !num(e.cropY, 0, 100) || (e.assetId !== undefined && (!str(e.assetId, 100) || !Object.hasOwn(b.assets, e.assetId)))) return fail();
      for (const key of ['hidden', 'aspectLocked', 'bold', 'italic', 'underline', 'textShadow', 'textBackground', 'flipX', 'flipY', 'tape', 'fillNone'] as const) if (!optional(e[key], v => typeof v === 'boolean')) return fail();
      for (const [key, min, max] of [['lineHeight', .6, 3], ['letterSpacing', -.2, 1], ['padding', 0, 20], ['imageZoom', 1, 5], ['radius', 0, 50], ['border', 0, 10], ['shadow', 0, 1], ['frameMargin', 0, 20], ['captionMargin', 0, 40], ['grain', 0, 1], ['strokeWidth', .1, 10]] as const) if (!optional(e[key], v => num(v, min, max))) return fail();
      for (const key of ['name', 'groupId', 'dateLabel'] as const) if (!optional(e[key], v => str(v, 100))) return fail();
      if (!optional(e.borderColor, color) || !optional(e.verticalAlign, v => ['top', 'center', 'bottom'].includes(v as string)) || !optional(e.fit, v => ['cover', 'contain'].includes(v as string)) || !optional(e.filter, v => ['none', 'sepia', 'mono', 'warm'].includes(v as string)) || !optional(e.frame, v => ['classic', 'vintage', 'wide', 'mini', 'retro', 'thin', 'custom'].includes(v as string)) || !optional(e.captionPosition, v => ['top', 'bottom'].includes(v as string)) || !optional(e.shape, v => (shapeNames as readonly unknown[]).includes(v)) || !optional(e.sticker, v => (stickers as readonly unknown[]).includes(v))) return fail();
      if (e.runs !== undefined && (!Array.isArray(e.runs) || e.runs.length > 1000 || !e.runs.every(r => r && str(r.text, 20000) && ['bold', 'italic', 'underline'].every(k => optional(r[k as keyof TextRun], v => typeof v === 'boolean')) && optional(r.color, color)) || e.runs.map(r => r.text).join('') !== e.text)) return fail();
      if (e.strokes !== undefined && (!Array.isArray(e.strokes) || e.strokes.length > LIMITS.strokes || new Set(e.strokes.map(s => s?.id)).size !== e.strokes.length || !e.strokes.every(s => s && str(s.id, 100) && ['pencil', 'pen', 'marker', 'highlighter'].includes(s.tool) && color(s.color) && num(s.width, .1, 10) && num(s.opacity, 0, 1) && Array.isArray(s.points) && s.points.length >= 1 && s.points.length <= LIMITS.points && s.points.every(pt => Array.isArray(pt) && pt.length === 3 && num(pt[0], 0, 100) && num(pt[1], 0, 100) && num(pt[2], 0, 1))))) return fail();
      elementIds.add(e.id);
    }
    return p;
  }
  b.pages.forEach(p => { if (ids.has(p.id)) fail(); ids.add(p.id); page(p); });
  if (b.templates !== undefined && (!Array.isArray(b.templates) || b.templates.length > 20 || !b.templates.every(t => t && str(t.id, 100) && str(t.title, 100) && page(t.page)))) return fail();
  if (version === 2 && projectBytes(b) > LIMITS.projectBytes) throw new Error('This project exceeds the 30 MB project budget. Your previously saved library has not been overwritten.');
  // An in-memory upgrade only. Stable IDs, media and user content are retained;
  // IndexedDB is not touched until a real edit is saved successfully.
  return { ...b, version: 2 };
}
