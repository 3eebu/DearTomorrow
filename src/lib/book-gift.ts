export const giftPatterns = ['sprigs', 'pinstripe', 'plain'] as const;
export const ribbonMaterials = ['satin', 'cotton'] as const;
export const giftBows = ['loop', 'knot'] as const;

export type GiftDesign = {
  version: 1; color: string; ribbon: string; pattern: typeof giftPatterns[number];
  material: typeof ribbonMaterials[number]; bow: typeof giftBows[number];
  tag: string; to: string; from: string; message: string;
};

export const defaultGift: GiftDesign = {
  version: 1, color: '#e9c9b8', ribbon: '#753d4a', pattern: 'sprigs', material: 'satin',
  bow: 'loop', tag: 'Something for you', to: '', from: '', message: '',
};

export function validGift(input: unknown): input is GiftDesign {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const gift = input as GiftDesign;
  const color = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const text = (value: unknown, limit: number) => typeof value === 'string' && value.length <= limit;
  return Object.keys(gift).every(key => Object.hasOwn(defaultGift, key)) &&
    gift.version === 1 && color(gift.color) && color(gift.ribbon) && giftPatterns.includes(gift.pattern) &&
    ribbonMaterials.includes(gift.material) && giftBows.includes(gift.bow) &&
    text(gift.tag, 60) && text(gift.to, 80) && text(gift.from, 80) && text(gift.message, 1000);
}
