export const species = ['cherry', 'oak', 'willow'] as const;
export const seasons = ['automatic', 'spring', 'summer', 'autumn', 'winter'] as const;
export const gardens = ['garden', 'stars', 'rain'] as const;
export const views = ['tree', 'timeline', 'calendar'] as const;
export const MAX_MEMORIES = 2400;
export const MAX_PHOTOS = 4;
export const PHOTO_SIZE = 400_000;
export const BACKUP_LIMIT = 40_000_000;
export type Species = typeof species[number];
export type Season = typeof seasons[number];
export type Garden = typeof gardens[number];
export type View = typeof views[number];
export type Chapter = { id: string; slot: number; name: string; color: string };
export type Photo = { id: string; name: string; data: string };
export type MemoryInput = { title: string; date: string; time: string; story: string; location: string;
  chapterId: string; tags: string[]; favorite: boolean; milestone: boolean; annual: boolean; photos: Photo[] };
export type Memory = MemoryInput & { id: string; slot: number };
export type Settings = { name: string; you: string; partner: string; start: string; species: Species;
  season: Season; south: boolean; garden: Garden; paused: boolean; view: View };
export type Tree = { version: 1; id: string; seed: number; nextLeaf: number; nextBranch: number;
  settings: Settings; chapters: Chapter[]; memories: Memory[] };
export type Grove = { version: 1; activeId: string; trees: Tree[] };

export const initialSettings: Settings = { name: '', you: '', partner: '', start: '', species: 'cherry',
  season: 'automatic', south: false, garden: 'garden', paused: false, view: 'tree' };
export const chapterNames = ['Our Firsts', 'Little Everyday Moments', 'Our Adventures', 'Celebrations', 'Things We Love', 'Dreams for Tomorrow'];
const colors = ['#9d6373', '#667a50', '#656f95', '#9a7147', '#8b6589', '#4d8278'];

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function daysInMonth(year: number, month: number) { return new Date(year, month, 0, 12).getDate(); }
export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1900 && year <= 2199 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}
export function dayNumber(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}
export function displayDay(day: string) {
  return new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
export function activeSeason(settings: Pick<Settings,'season'|'south'>, today: string): Exclude<Season, 'automatic'> {
  if (settings.season !== 'automatic') return settings.season;
  const month = (Number(today.slice(5, 7)) - 1 + (settings.south ? 6 : 0)) % 12;
  return month < 2 || month === 11 ? 'winter' : month < 5 ? 'spring' : month < 8 ? 'summer' : 'autumn';
}
export function nextAnniversary(day: string, today: string) {
  const [, month, date] = day.split('-').map(Number);
  let year = Number(today.slice(0, 4));
  const at = () => `${year}-${String(month).padStart(2, '0')}-${String(Math.min(date, daysInMonth(year, month))).padStart(2, '0')}`;
  if (at() < today) year++;
  return at();
}
export function stage(count: number) {
  return count === 0 ? 'Seed' : count === 1 ? 'Sprout' : count < 5 ? 'Sapling' :
    count < 15 ? 'Young tree' : count < 50 ? 'Growing tree' : count < 150 ? 'Mature tree' : 'Flourishing tree';
}
export function newTree(settings: Settings, id = crypto.randomUUID(), seed = crypto.getRandomValues(new Uint32Array(1))[0]): Tree {
  return { version: 1, id, seed, nextLeaf: 0, nextBranch: chapterNames.length, settings,
    chapters: chapterNames.map((name, slot) => ({ id: 'branch-' + slot, slot, name, color: colors[slot] })), memories: [] };
}
export function putMemory(tree: Tree, input: MemoryInput, id?: string): Tree {
  const current = tree.memories.find(item => item.id === id);
  if (!current && (tree.memories.length >= MAX_MEMORIES || tree.nextLeaf >= 1_000_000)) {
    throw new Error('This tree has reached its memory limit. Start a new tree to keep growing.');
  }
  const memory = { ...input, id: current?.id ?? crypto.randomUUID(), slot: current?.slot ?? tree.nextLeaf };
  return { ...tree, nextLeaf: tree.nextLeaf + (current ? 0 : 1),
    memories: current ? tree.memories.map(item => item === current ? memory : item) : [...tree.memories, memory] };
}
export function removeChapter(tree: Tree, id: string): Tree {
  return { ...tree, chapters: tree.chapters.filter(chapter => chapter.id !== id),
    memories: tree.memories.map(memory => memory.chapterId === id ? { ...memory, chapterId: '' } : memory) };
}
export function chronological(memories: Memory[]) {
  return [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.slot - b.slot);
}
export function findMemories(tree: Tree, query: string, chapter: string, favorites: boolean, milestones: boolean) {
  const needle = query.trim().toLocaleLowerCase();
  const names = new Map(tree.chapters.map(item => [item.id, item.name]));
  return chronological(tree.memories.filter(m => (!chapter || (chapter === 'unassigned' ? !m.chapterId : m.chapterId === chapter)) &&
    (!favorites || m.favorite) && (!milestones || m.milestone) &&
    (!needle || [m.title, m.date, m.story, m.location, names.get(m.chapterId) ?? '', ...m.tags].some(text => text.toLocaleLowerCase().includes(needle)))));
}

const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const integer = (value: unknown, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
const oneOf = (options: readonly string[], value: unknown) => typeof value === 'string' && options.includes(value);
const key = (value: unknown) => string(value, 80) && /^[a-zA-Z0-9_-]+$/.test(value);
function validPhoto(value: unknown) {
  if (!string(value, PHOTO_SIZE)) return false;
  const match = /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4) return false;
  const header = atob(match[2].slice(0, 16));
  if (match[1] === 'jpeg') return header.startsWith('\xff\xd8\xff');
  if (match[1] === 'png') return header.startsWith('\x89PNG\r\n\x1a\n');
  return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
}

export function validateTree(input: unknown): Tree {
  const fail = (): never => { throw new Error('This backup is damaged or uses an unsupported Memory Tree format. Your saved trees were kept.'); };
  const t = input as Tree;
  if (!t || typeof t !== 'object' || t.version !== 1 || !key(t.id) || !integer(t.seed, 0xffffffff) ||
      !integer(t.nextLeaf, 1_000_000) || !integer(t.nextBranch, 1_000_000)) return fail();
  const s = t.settings;
  if (!s || !string(s.name, 80) || !string(s.you, 60) || !string(s.partner, 60) ||
      (s.start !== '' && !validDay(s.start)) || !oneOf(species, s.species) || !oneOf(seasons, s.season) ||
      !oneOf(gardens, s.garden) || !oneOf(views, s.view) || typeof s.south !== 'boolean' || typeof s.paused !== 'boolean') return fail();
  if (!Array.isArray(t.chapters) || t.chapters.length > 24 || !Array.isArray(t.memories) ||
      t.memories.length > MAX_MEMORIES) return fail();
  const chapters = new Set<string>(), branchSlots = new Set<number>(), memoryIds = new Set<string>(), leafSlots = new Set<number>();
  for (const c of t.chapters) {
    if (!c || !key(c.id) || chapters.has(c.id) || !integer(c.slot, t.nextBranch - 1) || branchSlots.has(c.slot) ||
        !string(c.name, 70) || !c.name.trim() || !string(c.color, 7) || !/^#[\da-f]{6}$/i.test(c.color)) return fail();
    chapters.add(c.id); branchSlots.add(c.slot);
  }
  let photoSize = 0;
  for (const m of t.memories) {
    if (!m || !key(m.id) || memoryIds.has(m.id) || !integer(m.slot, t.nextLeaf - 1) || leafSlots.has(m.slot) ||
        !string(m.title, 140) || !m.title.trim() || !validDay(m.date) || !string(m.time, 5) ||
        (m.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) || !string(m.story, 16000) ||
        !string(m.location, 140) || !string(m.chapterId, 80) || (m.chapterId && !chapters.has(m.chapterId)) ||
        !Array.isArray(m.tags) || m.tags.length > 12 || !m.tags.every(tag => string(tag, 36)) ||
        [m.favorite, m.milestone, m.annual].some(value => typeof value !== 'boolean') ||
        !Array.isArray(m.photos) || m.photos.length > MAX_PHOTOS) return fail();
    memoryIds.add(m.id); leafSlots.add(m.slot);
    const photoIds = new Set<string>();
    for (const p of m.photos) {
      if (!p || !key(p.id) || photoIds.has(p.id) || !string(p.name, 150) || !validPhoto(p.data)) return fail();
      photoIds.add(p.id);
      photoSize += p.data.length;
      if (photoSize > 32_000_000) throw new Error('This tree exceeds its local photo budget. Your saved trees were kept.');
    }
  }
  // Return only the fields supported by this version. Imported extra payloads are never retained.
  return {
    version: 1, id: t.id, seed: t.seed, nextLeaf: t.nextLeaf, nextBranch: t.nextBranch,
    settings: { name: s.name, you: s.you, partner: s.partner, start: s.start, species: s.species,
      season: s.season, south: s.south, garden: s.garden, paused: s.paused, view: s.view },
    chapters: t.chapters.map(({ id, slot, name, color }) => ({ id, slot, name, color })),
    memories: t.memories.map(({ id, slot, title, date, time, story, location, chapterId, tags, favorite, milestone, annual, photos }) =>
      ({ id, slot, title, date, time, story, location, chapterId, tags, favorite, milestone, annual,
        photos: photos.map(({ id, name, data }) => ({ id, name, data })) })),
  };
}

export function validateGrove(input: unknown): Grove {
  const g = input as Grove;
  if (!g || g.version !== 1 || !Array.isArray(g.trees) || g.trees.length > 8 ||
      !string(g.activeId, 80) || (g.trees.length ? !g.trees.some(t => t?.id === g.activeId) : g.activeId !== '')) {
    throw new Error('This local library could not be read. Its stored contents were kept.');
  }
  const trees = g.trees.map(validateTree);
  if (new Set(trees.map(tree => tree.id)).size !== trees.length) throw new Error('Duplicate tree identity.');
  return { version: 1, activeId: g.activeId, trees };
}
