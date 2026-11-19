import { validVoiceAsset, type VoiceAsset } from './book-voice';
import { localZone, resolveRelease, validRelease, validZone, wallEpoch, type Release, type Timing } from './letter-time';
import type { TextRun } from './memory-books';

export const kinds = { love: 'Love letter', when: 'Open When', tomorrow: 'Letter to Tomorrow', selves: 'To our future selves', occasion: 'Special occasion' } as const;
export const papers = { ivory: 'Classic ivory', handmade: 'Handmade paper', parchment: 'Vintage parchment', pink: 'Soft pink',
  lined: 'Lined notebook', floral: 'Floral stationery', white: 'Minimal white', custom: 'Custom color' } as const;
export const waxColors = { Burgundy: '#793844', Gold: '#ad7c35', Ivory: '#ded0ad', Blush: '#c5838e', Forest: '#395748' };
export const motifs = { none: 'None', branch: 'Olive sprig', flower: 'Pressed flower', heart: 'Hand-drawn heart', stars: 'Small constellation' } as const;
export const scenes = { morning: 'Morning Sun', candle: 'Candlelight', rain: 'Rainy Afternoon' } as const;
export const letterFonts = { editorial: 'Editorial serif', hand: 'Handwritten', classic: 'Classic serif', simple: 'Plain sans serif' } as const;
export const LIMITS = { letters: 100, collections: 32, pages: 24, words: 12_000, runs: 600, photo: 1_600_000,
  strokes: 28, points: 220, letter: 18_000_000, backup: 48_000_000 };
export type Kind = keyof typeof kinds;
export type State = 'draft' | 'sealed' | 'scheduled' | 'opened';
export type Preferences = { scene: keyof typeof scenes; paused: boolean; layout: 'envelopes' | 'list' };
export const defaultPreferences: Preferences = { scene: 'morning', paused: false, layout: 'envelopes' };
export type Collection = { id: string; name: string };
export const startingCollections: Collection[] = [
  { id: 'birthdays', name: 'Birthdays' }, { id: 'anniversaries', name: 'Anniversaries' }, { id: 'everyday', name: 'Everyday letters' },
];
export type Paper = { material: keyof typeof papers; color: string; border: boolean; texture: boolean; motif: keyof typeof motifs; watermark: string };
export type Envelope = {
  color: string; material: 'cotton' | 'linen' | 'kraft'; flap: 'pointed' | 'wallet' | 'curved'; ribbon: boolean;
  front: { to: string; from: string; note: string; border: boolean; stamp: string };
  back: { inscription: string; botanical: boolean; wax: string; emblem: 'initials' | 'heart' | 'flower' | 'star'; initials: string };
};
export type Photo = { data: string; caption: string; polaroid: boolean };
export type Stroke = { ink: string; points: [number, number][] };
export type Page = { id: string; text: string; runs?: TextRun[]; signature: string; font: keyof typeof letterFonts; ink: string;
  align: 'left' | 'center' | 'right'; size: number; spacing: number; photo: Photo | null; drawing: Stroke[] };
export type Letter = {
  version: 1; id: string; title: string; kind: Kind; state: State; updatedAt: number; createdAt: number;
  archived: boolean; favorite: boolean; collectionId: string; label: string; specialDate: string;
  envelope: Envelope; paper: Paper; pages: Page[]; timing: Timing; release: Release | null;
  hidden: string; voice: VoiceAsset | null; transcript: string;
};
export type LetterSummary = Pick<Letter, 'id'|'title'|'kind'|'state'|'updatedAt'|'createdAt'|'archived'|'favorite'|
  'collectionId'|'label'|'envelope'|'release'> & { excerpt: string };
export const defaultEnvelope: Envelope = {
  color: '#dba9a2', material: 'cotton', flap: 'pointed', ribbon: false,
  front: { to: '', from: '', note: '', border: false, stamp: 'Dear Tomorrow' },
  back: { inscription: '', botanical: false, wax: waxColors.Burgundy, emblem: 'heart', initials: '' },
};
export const defaultPaper: Paper = { material: 'ivory', color: '#f8edda', border: false, texture: true, motif: 'none', watermark: '' };

export function newPage(): Page {
  return { id: crypto.randomUUID(), text: '', signature: '', font: 'hand', ink: '#40312c', align: 'left',
    size: 22, spacing: 10, photo: null, drawing: [] };
}

const templates = {
  birthday: { title: 'On your birthday', to: 'Happy birthday,', message: 'One of my favorite things about you is…', material: 'pink', motif: 'stars' },
  anniversary: { title: 'Another year of us', to: 'My love,', message: 'One little moment I still think about…', material: 'floral', motif: 'branch' },
  apology: { title: 'What I want you to know', to: 'Dear you,', message: 'I’ve been thinking about what happened, and I want to say…', material: 'white', motif: 'none' },
  celebration: { title: 'You did it', to: 'Look at you,', message: 'I hope you take a moment to remember how far you’ve come.', material: 'handmade', motif: 'flower' },
} as const;
export const occasionNames = Object.keys(templates) as (keyof typeof templates)[];

export function createLetter(kind: Kind = 'love', occasion?: keyof typeof templates, now = Date.now(), zone = localZone()): Letter {
  const template = occasion ? templates[occasion] : null;
  const page = newPage();
  if (template) page.text = template.to + '\n\n' + template.message;
  return { version: 1, id: crypto.randomUUID(), title: template?.title ?? 'Untitled letter', kind, state: 'draft',
    createdAt: now, updatedAt: now, archived: false, favorite: false, collectionId: '', label: '',
    specialDate: '', envelope: { ...defaultEnvelope, front: { ...defaultEnvelope.front }, back: { ...defaultEnvelope.back } },
    paper: { ...defaultPaper, material: template?.material ?? 'ivory', motif: template?.motif ?? 'none' },
    pages: [page], timing: { wall: '', zone, occurrence: 'earlier' }, release: null, hidden: '', voice: null, transcript: '' };
}

export function summarize(letter: Letter): LetterSummary {
  const { id,title,kind,state,updatedAt,createdAt,archived,favorite,collectionId,label,envelope,release } = letter;
  // The shelf reads this small excerpt without loading the letter or its media.
  return { id,title,kind,state,updatedAt,createdAt,archived,favorite,collectionId,label,envelope,release,
    excerpt: letter.pages.map(page => page.text.slice(0,150)).join(' ').slice(0, 280) };
}

export function canOpen(letter: Pick<Letter,'state'|'release'>, now: number) {
  return letter.state !== 'draft' && (!letter.release || now >= letter.release.instant);
}
function hasContents(letter: Letter) {
  return letter.pages.some(p => p.text.trim() || p.photo || p.drawing.length || p.signature.trim()) ||
    !!letter.voice || !!letter.hidden.trim();
}
export function sealLetter(letter: Letter, now: number): Letter {
  if (letter.state !== 'draft') throw new Error('Open this letter in the Studio before sealing it again.');
  if (!letter.title.trim()) throw new Error('Give this letter a name before sealing.');
  if (letter.kind === 'when' && !letter.label.trim()) throw new Error('Give the reader an Open When label before sealing.');
  if (!hasContents(letter)) {
    throw new Error('Add something to the paper before sealing.');
  }
  const release = letter.kind === 'tomorrow' ? resolveRelease(letter.timing) : null;
  if (release && release.instant <= now) throw new Error('Choose an opening time in the future.');
  return { ...letter, title:letter.title.trim(), release, state:release?'scheduled':'sealed', updatedAt:Math.max(now,letter.createdAt) };
}
export function editLetter(letter: Letter, now = Date.now()): Letter {
  return { ...letter, state: 'draft', release: null, updatedAt: Math.max(now, letter.createdAt) };
}
export function duplicateLetter(letter: Letter, now = Date.now()): Letter {
  return { ...editLetter(letter,now), id: crypto.randomUUID(), createdAt: now, updatedAt: now, archived: false,
    title: letter.title.slice(0,108) + ' (copy)', pages: letter.pages.map(page => ({ ...page, id: crypto.randomUUID() })) };
}
export function stateLabel(item: Pick<Letter,'state'|'archived'|'release'>, now: number) {
  if (item.archived) return 'Archived';
  if (item.state === 'scheduled' && canOpen(item, now)) return 'Ready to open';
  return { draft: 'Draft', sealed: 'Sealed', scheduled: 'Scheduled locally', opened: 'Opened locally' }[item.state];
}

const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown) => text(value,80) && /^[a-z0-9_-]+$/i.test(value);
const has = (record: object, key: unknown) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(record, key);
const color = (value: unknown) => text(value,7) && /^#[a-f0-9]{6}$/i.test(value);
const bool = (value: unknown) => typeof value === 'boolean';
const num = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const stamp = (value: unknown) => num(value,0,8.64e15) && Number.isSafeInteger(value);
const fail = (): never => { throw new Error('This letter or backup could not be read. Your saved letters were kept.'); };
function fields(value: unknown, names: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = names.split(' ');
  return Object.keys(value).every(key=>allowed.includes(key));
}

export function validPhoto(value: unknown) {
  if (!text(value,LIMITS.photo)) return false;
  const match = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/]+={0,2})$/i.exec(value);
  if (!match || match[2].length % 4) return false;
  const header = atob(match[2].slice(0,16));
  if (match[1]==='jpeg') return header.startsWith('\xff\xd8\xff');
  if (match[1]==='png') return header.startsWith('\x89PNG\r\n\x1a\n');
  return header.startsWith('RIFF') && header.slice(8,12)==='WEBP';
}

function envelopeValid(e: Envelope) {
  if (!fields(e,'color material flap ribbon front back')) return false;
  const { front,back } = e;
  return color(e.color) && ['cotton','linen','kraft'].includes(e.material) && ['pointed','wallet','curved'].includes(e.flap) &&
    bool(e.ribbon) && fields(front,'to from note border stamp') && text(front.to,70) && text(front.from,70) && text(front.note,180) &&
    bool(front.border) && text(front.stamp,24) && fields(back,'inscription botanical wax emblem initials') &&
    text(back.inscription,160) && bool(back.botanical) && color(back.wax) && ['initials','heart','flower','star'].includes(back.emblem) && text(back.initials,4);
}
function pageValid(p: Page) {
  if (!fields(p,'id text runs signature font ink align size spacing photo drawing') || !id(p.id) ||
      !text(p.text,LIMITS.words) || !text(p.signature,100) || !has(letterFonts,p.font) || !color(p.ink) ||
      !['left','center','right'].includes(p.align) || !num(p.size,16,34) || !num(p.spacing,0,24)) return false;
  if (p.runs !== undefined && (!Array.isArray(p.runs) || p.runs.length>LIMITS.runs ||
      !p.runs.every(r=>fields(r,'text bold italic underline color') && text(r.text,LIMITS.words) &&
        [r.bold,r.italic,r.underline].every(value=>value===undefined || bool(value)) && (r.color===undefined || color(r.color))) ||
      p.runs.map(r=>r.text).join('')!==p.text)) return false;
  if (p.photo !== null && (!fields(p.photo,'data caption polaroid') || !validPhoto(p.photo.data) || !text(p.photo.caption,160) || !bool(p.photo.polaroid))) return false;
  return Array.isArray(p.drawing) && p.drawing.length<=LIMITS.strokes && p.drawing.every(s=>
    fields(s,'ink points') && color(s.ink) && Array.isArray(s.points) && s.points.length>0 && s.points.length<=LIMITS.points &&
    s.points.every(pair=>Array.isArray(pair) && pair.length===2 && pair.every(value=>num(value,0,1))));
}
export function validateLetter(data: unknown): Letter {
  const l = data as Letter;
  if (!fields(l,'version id title kind state updatedAt createdAt archived favorite collectionId label specialDate envelope paper pages timing release hidden voice transcript') ||
      l.version!==1 || !id(l.id) || !text(l.title,120) || !has(kinds,l.kind) ||
      !['draft','sealed','scheduled','opened'].includes(l.state) || !stamp(l.createdAt) || !stamp(l.updatedAt) ||
      !bool(l.archived) || !bool(l.favorite) || (l.collectionId!==''&&!id(l.collectionId)) || !text(l.label,120) ||
      (l.specialDate!=='' && (!text(l.specialDate,10) || !Number.isFinite(wallEpoch(l.specialDate+'T12:00')))) ||
      !envelopeValid(l.envelope)) return fail();
  const p=l.paper,t=l.timing;
  if (!fields(p,'material color border texture motif watermark') || !has(papers,p.material) || !color(p.color) ||
      !bool(p.border) || !bool(p.texture) || !has(motifs,p.motif) || !text(p.watermark,6) ||
      !fields(t,'wall zone occurrence') || (t.wall!=='' && (!text(t.wall,16) || !Number.isFinite(wallEpoch(t.wall)))) ||
      !validZone(t.zone) || !['earlier','later'].includes(t.occurrence)) return fail();
  const needsRelease = l.kind==='tomorrow' && l.state!=='draft';
  if ((l.state==='scheduled' && !needsRelease) || (l.state==='sealed' && needsRelease) ||
      (needsRelease ? !fields(l.release,'wall zone occurrence instant offset') || !validRelease(l.release!,t) : l.release!==null)) return fail();
  if (!Array.isArray(l.pages) || !l.pages.length || l.pages.length>LIMITS.pages || !l.pages.every(pageValid) ||
      new Set(l.pages.map(page=>page.id)).size!==l.pages.length || !text(l.hidden,6000) || !text(l.transcript,12000) ||
      (l.voice!==null && !validVoiceAsset(l.voice))) return fail();
  if(l.state!=='draft'&&(!l.title.trim()||l.kind==='when'&&!l.label.trim()||!hasContents(l)))return fail();
  if (new TextEncoder().encode(JSON.stringify(l)).byteLength>LIMITS.letter) throw new Error('This letter exceeds the 18 MB document limit. Try fewer photographs.');
  return l;
}
export function validateSummary(value: unknown): LetterSummary {
  const row=value as LetterSummary;
  if (!fields(row,'id title kind state updatedAt createdAt archived favorite collectionId label envelope release excerpt') ||
    !id(row.id) || !text(row.title,120) || !has(kinds,row.kind) || !['draft','sealed','opened','scheduled'].includes(row.state) ||
    !stamp(row.createdAt) || !stamp(row.updatedAt) || !bool(row.archived) || !bool(row.favorite) ||
    (row.collectionId!==''&&!id(row.collectionId)) || !text(row.excerpt,280) || !text(row.label,120) || !envelopeValid(row.envelope))return fail();
  if(row.release!==null&&(!fields(row.release,'wall zone occurrence instant offset')||!text(row.release.wall,16)||
    !validZone(row.release.zone)||!['earlier','later'].includes(row.release.occurrence)||!validRelease(row.release,row.release)))return fail();
  const scheduled=row.kind==='tomorrow'&&row.state!=='draft';
  if(scheduled!==(row.release!==null)||row.state==='scheduled'&&!scheduled||row.state==='sealed'&&scheduled)return fail();
  return row;
}
export function validateCollections(input: unknown): Collection[] {
  if (!Array.isArray(input) || input.length>LIMITS.collections || !input.every(c=>
    fields(c,'id name') && id(c.id) && text(c.name,70) && c.name.trim()) || new Set(input.map(c=>c.id)).size!==input.length) return fail();
  return input;
}
export function validatePreferences(p: Preferences) {
  if (!fields(p,'scene paused layout') || !has(scenes,p.scene) || !bool(p.paused) || !['envelopes','list'].includes(p.layout)) return fail();
  return p;
}

export type Backup = { format: 'dear-tomorrow-letters'; version: 1; collections: Collection[]; letters: Letter[] };
export function makeBackup(letters: Letter[], collections: Collection[]): Backup {
  return { format:'dear-tomorrow-letters', version:1, letters, collections:collections.filter(c=>letters.some(l=>l.collectionId===c.id)) };
}
export function validateBackup(data: unknown): Backup {
  const backup = data as Backup;
  if (!fields(backup,'format version collections letters') || backup.format!=='dear-tomorrow-letters' || backup.version!==1 ||
      !Array.isArray(backup.letters) || !backup.letters.length || backup.letters.length>LIMITS.letters) return fail();
  const collections=validateCollections(backup.collections),letters=backup.letters.map(validateLetter);
  const keys=new Set(collections.map(c=>c.id));
  if (letters.some(l=>l.collectionId&&!keys.has(l.collectionId)) || new Set(letters.map(l=>l.id)).size!==letters.length) return fail();
  return { ...backup, letters, collections };
}
export function importCopies(backup: Backup, existing: Collection[]) {
  const collections=[...existing],mapping=new Map<string,string>();
  for (const group of backup.collections) {
    const same=collections.find(c=>c.name.trim().toLowerCase()===group.name.trim().toLowerCase());
    const key=same?.id??crypto.randomUUID();
    if (!same) collections.push({ ...group, id:key });
    mapping.set(group.id,key);
  }
  return { collections, letters:backup.letters.map(letter=>({ ...letter,id:crypto.randomUUID(),collectionId:mapping.get(letter.collectionId)??'' })) };
}
