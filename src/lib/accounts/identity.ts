export function normalizeDearId(value: string) {
  const flat = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return /^[2-9A-H]{24}$/.test(flat) ? flat.match(/.{8}/g)!.join('-') : null;
}

export function displayName(value: unknown) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= 60 && !/[\p{Cc}\p{Cf}]/u.test(name) ? name : null;
}

export const spaces = {
  letters: {name:'Letters',path:'/letters',note:'Paper, ink, and things you want to say.'},
  books: {name:'Memory Books',path:'/memory-books',note:'Photographs and stories between covers.'},
  trees: {name:'Memory Tree',path:'/memory-tree',note:'A leaf for every moment you keep.'},
  journeys: {name:'Journey Letters',path:'/journey-letters',note:'Six letters for someone on their way.'},
} as const;
export type SpaceKind = keyof typeof spaces;
export function isSpaceKind(kind: unknown): kind is SpaceKind {
  return typeof kind === 'string' && Object.hasOwn(spaces,kind);
}
