export const surpriseKinds = ['envelope', 'fold', 'reverse', 'scratch', 'flap', 'pocket', 'popup'] as const;
export const papers = ['vellum', 'cotton', 'laid'] as const;
export const folds = ['heart', 'accordion', 'single', 'double', 'square'] as const;
export const scratchShapes = ['heart', 'circle', 'rectangle'] as const;
export const flapHinges = ['top', 'left', 'right', 'bottom'] as const;
export const envelopeFlaps = ['pointed', 'rounded', 'straight'] as const;
export const pocketTypes = ['note', 'photo', 'letter', 'ticket', 'quote', 'date', 'keepsake'] as const;
export const popupStyles = ['heart', 'flower', 'birthday', 'paired'] as const;
export const printMarks = ['none', 'heart', 'branch', 'stars'] as const;
export const MAX_POCKET_ITEMS = 6;

export type SurpriseKind = typeof surpriseKinds[number];
export type SurpriseMessage = { words: string; date: string; place: string; assetId?: string; ornament: typeof printMarks[number] };
export type PocketItem = SurpriseMessage & { id: string; title: string; type: typeof pocketTypes[number] };
type Stock = { version: 1; label: string; paper: typeof papers[number]; ink: string; insideColor: string; message: SurpriseMessage };
export type Surprise = Stock & (
  { type: 'envelope'; flap: typeof envelopeFlaps[number]; seal: string; initials: string } |
  { type: 'fold'; fold: typeof folds[number] } |
  { type: 'reverse' } |
  { type: 'scratch'; shape: typeof scratchShapes[number] } |
  { type: 'flap'; hinge: typeof flapHinges[number] } |
  { type: 'pocket'; items: PocketItem[] } |
  { type: 'popup'; style: typeof popupStyles[number] }
);

export const surpriseNames: Record<SurpriseKind, string> = {
  envelope: 'Sealed envelope', fold: 'Folded love note', reverse: 'Reversible Polaroid',
  scratch: 'Scratch card', flap: 'Lift-up flap', pocket: 'Memory pocket', popup: 'Paper pop-up',
};

export function newMessage(words = ''): SurpriseMessage {
  return { words, date: '', place: '', ornament: 'none' };
}

export function newSurprise(type: SurpriseKind): Surprise {
  const stock: Stock = {
    version: 1, label: 'For you', paper: 'cotton', ink: '#44332d',
    insideColor: '#fbf0da', message: newMessage('All the ordinary days with you are my favorite.'),
  };
  switch (type) {
    case 'envelope': return { ...stock, type, flap: 'pointed', seal: '#844f5a', initials: '' };
    case 'fold': return { ...stock, type, fold: 'single' };
    case 'reverse': return { ...stock, type };
    case 'scratch': return { ...stock, type, shape: 'heart', label: 'Scratch here' };
    case 'flap': return { ...stock, type, hinge: 'top', label: 'Lift here' };
    case 'pocket': return {
      ...stock, type, label: 'Little keepsakes', items: [
        { ...newMessage('The day we took the long way home.'), id: crypto.randomUUID(), title: 'A little note', type: 'note' },
      ],
    };
    case 'popup': return { ...stock, type, style: 'heart', label: 'Open for a surprise' };
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const color = (value: unknown) => text(value, 7) && /^#[0-9a-f]{6}$/i.test(value);
const oneOf = (options: readonly unknown[], value: unknown) => options.includes(value);
const only = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).every(key => fields.includes(key));

export function validSurprise(input: unknown, hasAsset: (id: string) => boolean): input is Surprise {
  const messageFields = ['words', 'date', 'place', 'assetId', 'ornament'];
  function validMessage(value: unknown, extra: string[] = []) {
    return record(value) && only(value, [...messageFields, ...extra]) && text(value.words, 20000) &&
      text(value.date, 100) && text(value.place, 100) && oneOf(printMarks, value.ornament) &&
      (value.assetId === undefined || text(value.assetId, 100) && hasAsset(value.assetId));
  }
  if (!record(input) || input.version !== 1 || !text(input.label, 100) || !oneOf(papers, input.paper) ||
      !color(input.ink) || !color(input.insideColor) || !validMessage(input.message)) return false;
  const fields = ['version', 'type', 'label', 'paper', 'ink', 'insideColor', 'message'];
  const hasFields = (...extra: string[]) => only(input, [...fields, ...extra]);
  switch (input.type) {
    case 'envelope': return hasFields('flap', 'seal', 'initials') && oneOf(envelopeFlaps, input.flap) &&
      color(input.seal) && text(input.initials, 6);
    case 'fold': return hasFields('fold') && oneOf(folds, input.fold);
    case 'reverse': return hasFields();
    case 'scratch': return hasFields('shape') && oneOf(scratchShapes, input.shape);
    case 'flap': return hasFields('hinge') && oneOf(flapHinges, input.hinge);
    case 'popup': return hasFields('style') && oneOf(popupStyles, input.style);
    case 'pocket': {
      if (!hasFields('items') || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_POCKET_ITEMS) return false;
      const ids = new Set<string>();
      for (const item of input.items) {
        if (!record(item) || !validMessage(item, ['id', 'title', 'type']) || !text(item.id, 100) ||
          !item.id || ids.has(item.id) || !text(item.title, 100) || !oneOf(pocketTypes, item.type)) return false;
        ids.add(item.id);
      }
      return true;
    }
    default: return false;
  }
}

export type Interaction = { opened?: boolean; item?: string; revealed?: boolean; scratches?: string };
export function interactionKey(pageId: string, elementId: string) {
  return JSON.stringify([pageId, elementId]);
}

// A moving sheet repeats only the objects that overlap its visible strip.
// Include shadows and the raised envelope flap beyond the nominal object box.
export function surpriseOverlapsStrip(
  geometry: { x: number; width: number; height: number; rotation: number },
  pageRatio: number, left: number, right: number,
) {
  const angle = geometry.rotation * Math.PI / 180;
  const center = geometry.x + geometry.width / 2;
  const halfWidth = Math.abs(Math.cos(angle)) * geometry.width / 2;
  const angledHeight = Math.abs(Math.sin(angle)) * geometry.height / pageRatio;
  const extent = halfWidth + angledHeight * .82 + 7;
  return center + extent >= left && center - extent <= right;
}
