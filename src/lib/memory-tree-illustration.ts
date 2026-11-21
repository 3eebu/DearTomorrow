import { activeSeason, dayNumber, type Settings, type Species, type Tree } from './memory-tree';

type Point = [number, number];
type Curve = [Point, Point, Point, Point];

export type PaintedSpray = { path: string; width: number };
export type PaintedLeaf = {
  id: string;
  slot: number;
  x: number;
  y: number;
  angle: number;
  size: number;
  palette: number;
  wash: number;
  stem: string;
  flower: boolean;
};

type Arm = { curve: Curve; width: number; shoots: [number, number, number][] };
type Shoot = { arm: number; at: number; start: Point; curve: Curve; width: number };
type Appearance = Pick<Settings, 'species' | 'season' | 'south'>;

// The boughs are composed by hand. The shorter, higher boughs leave the crown
// rounded, with open space between its heavier lower limbs.
const arms: Arm[] = [
  { curve: [[424, 505], [366, 417], [462, 338], [416, 247]], width: 33,
    shoots: [[.92, 421, 188]] },
  { curve: [[416, 247], [379, 173], [451, 135], [426, 55]], width: 11,
    shoots: [[.28, 373, 177], [.55, 459, 115], [.81, 391, 76], [.98, 439, 50]] },
  { curve: [[423, 398], [367, 356], [224, 383], [117, 297]], width: 17,
    shoots: [[.44, 290, 311], [.58, 234, 375], [.73, 184, 285], [.88, 135, 342], [.98, 92, 278]] },
  { curve: [[411, 372], [467, 329], [586, 352], [725, 272]], width: 16,
    shoots: [[.34, 513, 300], [.52, 575, 374], [.67, 632, 293], [.82, 683, 334], [.98, 747, 250]] },
  { curve: [[402, 331], [339, 288], [249, 298], [139, 207]], width: 14,
    shoots: [[.28, 335, 261], [.46, 266, 313], [.64, 226, 205], [.82, 173, 246], [.99, 111, 180]] },
  { curve: [[415, 309], [487, 287], [567, 250], [718, 185]], width: 13,
    shoots: [[.27, 475, 230], [.47, 558, 290], [.61, 593, 187], [.77, 669, 237], [.98, 743, 162]] },
  { curve: [[423, 270], [384, 222], [293, 212], [214, 133]], width: 10,
    shoots: [[.36, 346, 167], [.53, 290, 231], [.72, 258, 135], [.98, 195, 111]] },
  { curve: [[419, 246], [493, 219], [523, 166], [643, 125]], width: 10,
    shoots: [[.28, 493, 218], [.54, 524, 139], [.79, 621, 162], [.98, 663, 100]] },
  { curve: [[406, 218], [375, 192], [349, 132], [296, 100]], width: 7,
    shoots: [[.44, 362, 105], [.72, 309, 147], [.96, 281, 75]] },
  { curve: [[407, 198], [450, 176], [465, 109], [548, 78]], width: 7,
    shoots: [[.38, 473, 147], [.62, 480, 85], [.98, 574, 67]] },
];

export const gardenBaseline = 506;
export const gardenMiddle = 420;

const ageTones = {
  spring: [[149, 163, 93], [122, 142, 80], [117, 130, 85], [153, 144, 78], [172, 143, 73]],
  summer: [[137, 155, 88], [104, 132, 79], [104, 122, 75], [141, 131, 73], [164, 137, 69]],
  autumn: [[151, 158, 86], [143, 145, 79], [160, 144, 73], [180, 139, 74], [174, 118, 65]],
  winter: [[147, 156, 120], [124, 140, 107], [122, 132, 99], [142, 136, 98], [157, 129, 91]],
};

export function leafPalette(settings: Appearance, today: string) {
  return ageTones[activeSeason(settings, today)].map(([r, g, b]) => {
    if (settings.species === 'willow') return [r - 9, g + 3, b + 12];
    if (settings.species === 'oak') return [r + 7, g - 5, b - 6];
    return [r, g, b];
  });
}

const round = (value: number) => Math.round(value * 10) / 10;
const coords = ([x, y]: Point) => round(x) + ' ' + round(y);
const mix = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function split([a, b, c, d]: Curve, t: number): Curve {
  const ab = mix(a, b, t), bc = mix(b, c, t), cd = mix(c, d, t);
  const near = mix(ab, bc, t), far = mix(bc, cd, t);
  return [a, ab, near, mix(near, far, t)];
}

function point([a, b, c, d]: Curve, t: number): Point {
  const s = 1 - t;
  const first = s ** 3, second = 3 * s * s * t, third = 3 * s * t * t, last = t ** 3;
  return [a[0] * first + b[0] * second + c[0] * third + d[0] * last,
    a[1] * first + b[1] * second + c[1] * third + d[1] * last];
}

function trunkPoint(y: number) {
  const stem = y < arms[0].curve[3][1] ? arms[1].curve : arms[0].curve;
  let low = 0, high = 1;
  for (let n = 0; n < 16; n++) {
    const t = (low + high) / 2;
    if (point(stem, t)[1] > y) low = t;
    else high = t;
  }
  return point(stem, (low + high) / 2);
}

function direction(c: Curve, t: number) {
  const a = point(c, Math.max(0, t - .025));
  const b = point(c, Math.min(1, t + .025));
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length] as Point;
}

// Keep variation repeatable across reloads and backups.
function variation(seed: number, slot: number, channel: number) {
  let value = Math.imul(seed ^ Math.imul(slot + 11, 1664525) ^ Math.imul(channel + 17, 3812015801), 1597334677);
  value = Math.imul(value ^ value >>> 15, 2246822519);
  return ((value ^ value >>> 13) >>> 0) / 4294967296;
}

function treeSize(count: number) {
  const stops = [[0, .08], [1, .28], [5, .46], [20, .74], [40, .91], [110, 1]];
  const upper = stops.findIndex(([limit]) => count <= limit);
  if (upper <= 0) return upper === 0 ? .08 : 1;
  const [a, sizeA] = stops[upper - 1], [b, sizeB] = stops[upper];
  return sizeA + (sizeB - sizeA) * (count - a) / (b - a);
}

function reshape([x, y]: Point, species: Species): Point {
  if (species === 'willow') return [420 + (x - 420) * 1.029, y + Math.abs(x - 420) * .125];
  if (species === 'oak') return [420 + (x - 420) * 1.038, 506 + (y - 506) * .93];
  return [x, y];
}

function sprayPath(curve: Curve) {
  return 'M' + coords(curve[0]) + 'C' + curve.slice(1).map(coords).join(' ');
}

// The branches are closed, tapering shapes, with rounded brush-like edges.
function ribbon(curve: Curve, width: number, tipRatio: number) {
  const left: Point[] = [], right: Point[] = [];
  const samples = width > 7 ? 28 : 14;
  for (let n = 0; n <= samples; n++) {
    const t = n / samples;
    const [x, y] = point(curve, t);
    const [dx, dy] = direction(curve, t);
    const radius = width * .5 * (tipRatio + (1 - tipRatio) * (1-t) ** 1.15) *
      (1 + Math.sin(t * 15) * .07);
    left.push([x - dy * radius, y + dx * radius]);
    right.push([x + dy * radius, y - dx * radius]);
  }
  return 'M' + [...left, ...right.reverse()].map(coords).join('L') + 'Z';
}

export function buildPaintedTree(tree: Pick<Tree, 'seed' | 'memories'> & { settings: Appearance }, today: string) {
  const ordered = [...tree.memories].sort((a, b) => a.slot - b.slot);
  const count = ordered.length;
  const size = treeSize(count);
  const curveFor = (curve: Curve) => curve.map(p => reshape(p, tree.settings.species)) as Curve;
  const trees = arms.map((arm, index) => ({
    ...arm,
    curve: curveFor(index < 2 ? arm.curve : [trunkPoint(arm.curve[0][1]), ...arm.curve.slice(1)] as Curve),
  }));
  const shoots: Shoot[][] = trees.map(({curve, shoots}, arm) => shoots.map(([at, x, y]) => {
    const start = point(curve, at);
    const end = reshape([x, y], tree.settings.species);
    const mid = mix(start, end, .45);
    const elbow: Point = [mid[0] - (end[1] - start[1]) * .13, mid[1] + (end[0] - start[0]) * .16];
    return { arm, at, start, curve: [start, mix(start, elbow, .8), mix(elbow, end, .61), end], width: 3.3 };
  }));
  const armOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  const schedule = Array.from({ length: 6 }, (_, index) => armOrder.flatMap(arm =>
    shoots[arm][index] ? [shoots[arm][index]] : [],
  )).flat();
  const reached = new Map<number, number>();
  const active = new Map<Shoot, number>();
  const leaves: PaintedLeaf[] = [];
  const occupied = new Map<string, Point[]>();
  const grid = 30;
  const bladeSize = (16 + 48 / (1 + Math.sqrt(Math.max(0,count - 1) / 65))) *
    (1 - Math.min(.21, Math.max(0, count - 120) / 4200));
  const nearest = (p: Point) => {
    const [x, y] = p.map(value => Math.floor(value / grid));
    let best = 2600;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const [px, py] of occupied.get((x + dx) + ',' + (y + dy)) ?? []) {
        best = Math.min(best, (p[0] - px) ** 2 + (p[1] - py) ** 2);
      }
    }
    return best;
  };

  for (const [rank, memory] of ordered.entries()) {
    const shoot = schedule[rank % schedule.length];
    const layer = Math.floor(rank / schedule.length);
    let best: { position: Point; attach: Point; t: number; angle: number; center: Point; score: number } | undefined;
    const blade = bladeSize * (.83 + .34 * variation(tree.seed, memory.slot, 4));
    const room = rank < 45 ? 38 : rank < 135 ? 30 : 23;
    const width = blade / 45;
    for (let tryIndex = 0; tryIndex < 11; tryIndex++) {
      const salt = layer * 137 + tryIndex * 7;
      const t = !rank ? .8 : .25 + .74 * variation(tree.seed, memory.slot, salt);
      const attach = point(shoot.curve, t);
      const [dx, dy] = direction(shoot.curve, t);
      const side = variation(tree.seed, memory.slot, salt+2) > .5 ? 1 : -1;
      const bearing = Math.atan2(dy, dx) + side * (.48 + variation(tree.seed, memory.slot, salt+3) * 1.02);
      const reach = 4 + variation(tree.seed, memory.slot, salt+5) * (layer > 2 ? 16 : 7);
      const lift = tree.settings.species === 'willow' ? 8 : 0;
      const position: Point = [attach[0] + Math.cos(bearing) * reach, attach[1] + Math.sin(bearing) * reach + lift];
      const center: Point = [position[0] + Math.cos(bearing) * room * .48, position[1] + Math.sin(bearing) * room * .48];
      const score = nearest(center);
      if (!best || score > best.score) best = { position, attach, t, center, angle: bearing * 180 / Math.PI, score };
      if (score >= room ** 2 * .77) break;
    }
    if (!best) continue;
    const {position, attach, t, center, angle} = best;
    const cell = Math.floor(center[0] / grid) + ',' + Math.floor(center[1] / grid);
    const neighbors = occupied.get(cell) ?? [];
    neighbors.push(center);
    occupied.set(cell, neighbors);
    reached.set(shoot.arm, Math.max(reached.get(shoot.arm) ?? 0, shoot.at));
    active.set(shoot, Math.max(active.get(shoot) ?? 0, t));
    const days = dayNumber(today) - dayNumber(memory.date);
    const palette = days < 80 ? 0 : days < 365 ? 1 : days < 950 ? 2 : days < 1600 ? 3 : 4;
    leaves.push({
      id: memory.id, slot: memory.slot, x: round(position[0]), y: round(position[1]), angle: round(angle),
      size: width, palette, wash: variation(tree.seed, memory.slot, 16),
      stem: 'M' + coords(attach) + 'Q' + coords(mix(attach, position, .27)) + ' ' + coords(position),
      flower: memory.milestone,
    });
  }
  const hasUpperStem = [...reached.keys()].some(arm => arm > 1);
  const upperReach = Math.max(reached.get(1) ?? 0, ...trees.slice(2).map(({curve},i) => {
    if (!reached.has(i+2) || curve[0][1] >= trees[0].curve[3][1]) return 0;
    let low = 0, high = 1;
    for (let n = 0; n < 12; n++) {
      const t = (low + high) / 2;
      if (point(trees[1].curve,t)[1] > curve[0][1]) low = t;
      else high = t;
    }
    return Math.min(1, high + .08);
  }));
  const trunk = count ? [
    ribbon(trees[0].curve, count === 1 ? 16 : 33, .31),
    ribbon(split(trees[1].curve, Math.max(upperReach, hasUpperStem ? .4 : .25)), count === 1 ? 10 : 13, .08),
  ] : [];
  const bark = count ? [sprayPath(trees[0].curve), sprayPath(split(trees[1].curve, Math.max(upperReach, .25)))] : [];
  const boughs = trees.slice(2).flatMap(({curve, width}, i) => {
    const end = reached.get(i + 2);
    return end === undefined ? [] : [ribbon(split(curve, Math.min(1, end + .035)), width, .10)];
  });
  const sprays: PaintedSpray[] = [...active].map(([shoot, end]) => ({
    path: sprayPath(split(shoot.curve, Math.min(1, end + .035))),
    width: shoot.width,
  }));
  return {size, leaves, boughs, sprays, trunk, bark};
}
