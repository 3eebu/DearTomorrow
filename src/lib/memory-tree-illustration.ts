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
type SprigPoint = { shoot: Shoot; t: number; attach: Point };
type Appearance = Pick<Settings, 'species' | 'season' | 'south'>;

// The boughs are composed by hand. The shorter, higher boughs leave the crown
// rounded, with open space between its heavier lower limbs.
const arms: Arm[] = [
  { curve: [[420, 507], [402, 453], [436, 392], [409, 247]], width: 47,
    shoots: [[.92, 421, 188]] },
  { curve: [[409, 247], [399, 196], [466, 143], [427, 62]], width: 17,
    shoots: [[.28, 373, 177], [.55, 459, 115], [.81, 391, 76], [.98, 439, 50]] },
  { curve: [[423, 398], [347, 399], [275, 316], [117, 331]], width: 23,
    shoots: [[.44, 290, 311], [.58, 234, 375], [.73, 184, 285], [.88, 135, 342], [.98, 92, 278]] },
  { curve: [[411, 372], [494, 336], [619, 399], [711, 291]], width: 20,
    shoots: [[.34, 513, 300], [.52, 575, 374], [.67, 632, 293], [.82, 683, 334], [.98, 747, 250]] },
  { curve: [[402, 319], [325, 248], [243, 306], [148, 222]], width: 16,
    shoots: [[.28, 335, 261], [.46, 266, 313], [.64, 226, 205], [.82, 173, 246], [.99, 111, 180]] },
  { curve: [[415, 300], [517, 315], [530, 211], [696, 214]], width: 15,
    shoots: [[.27, 475, 230], [.47, 558, 290], [.61, 593, 187], [.77, 669, 237], [.98, 743, 162]] },
  { curve: [[423, 265], [351, 232], [319, 149], [225, 154]], width: 11,
    shoots: [[.36, 346, 167], [.53, 290, 231], [.72, 258, 135], [.98, 195, 111]] },
  { curve: [[419, 238], [491, 235], [530, 131], [618, 136]], width: 11,
    shoots: [[.28, 493, 218], [.54, 524, 139], [.79, 621, 162], [.98, 663, 100]] },
  { curve: [[406, 218], [375, 192], [349, 132], [296, 100]], width: 7,
    shoots: [[.44, 362, 105], [.72, 309, 147], [.96, 281, 75]] },
  { curve: [[407, 198], [450, 176], [465, 109], [548, 78]], width: 7,
    shoots: [[.38, 473, 147], [.62, 480, 85], [.98, 574, 67]] },
];

// Uneven masses of foliage around the main limbs. The gaps between them
// preserve the open silhouette and expose the crooked wood inside the crown.
const crown = [
  [377, 80, 98, 45, -.16], [487, 103, 92, 49, .31],
  [305, 145, 112, 52, .16], [520, 163, 148, 53, -.25],
  [238, 216, 136, 49, -.32], [339, 226, 91, 55, .31],
  [465, 226, 91, 53, -.23], [629, 215, 115, 55, .24],
  [219, 321, 149, 52, .19], [334, 297, 107, 52, .30],
  [525, 306, 113, 55, -.17], [625, 332, 126, 51, -.23],
  [158, 367, 77, 35, -.19], [677, 276, 86, 37, .39],
].map(([x,y,rx,ry,angle]) => ({x,y,rx,ry,cos:Math.cos(angle),sin:Math.sin(angle)}));

export const leafCenter = 24;
// An ellipse that encloses the three blade shapes, strokes and the growth overshoot.
export const bladeLength = 31;
export const bladeBreadth = 19;

export const gardenBaseline = 506;
export const gardenMiddle = 420;

const ageTones = {
  spring: [[146, 161, 77], [106, 132, 68], [93, 113, 68], [152, 137, 64], [176, 143, 66]],
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
function woodEdges(curve: Curve, width: number, tipRatio: number) {
  const left: Point[] = [], right: Point[] = [];
  const samples = width > 7 ? 28 : 14;
  for (let n = 0; n <= samples; n++) {
    const t = n / samples;
    const [x, y] = point(curve, t);
    const [dx, dy] = direction(curve, t);
    const roughness = Math.sin(t*15)*.13 + Math.sin(t*32)*.07 + Math.sin(t*61)*.035;
    const radius = width * .5 * (tipRatio + (1 - tipRatio) * (1-t) ** 1.15) *
      (1 + roughness*Math.sin(Math.PI*t));
    left.push([x - dy * radius, y + dx * radius]);
    right.push([x + dy * radius, y - dx * radius]);
  }
  return {left,right};
}

function ribbon(...sections: ReturnType<typeof woodEdges>[]) {
  const left = sections.flatMap(section=>section.left);
  const right = sections.flatMap(section=>section.right);
  return 'M' + [...left, ...right.reverse()].map(coords).join('L') + 'Z';
}

const distance = (a: Point, b: Point) => (a[0]-b[0]) ** 2 + (a[1]-b[1]) ** 2;

function closestSprig(p: Point, sprigs: SprigPoint[], leaderOnly = false) {
  let best = sprigs[0], gap = Infinity;
  for (const sprig of sprigs) {
    if (leaderOnly && sprig.shoot.arm !== 1) continue;
    const separation = distance(p, sprig.attach);
    if (separation < gap) { best = sprig; gap = separation; }
  }
  return { ...best, gap };
}

function spaceCanopy(count: number, seed: number, species: Species) {
  const candidates: Point[] = [];
  for (let row = 0; row < 68; row++) for (let column = 0; column < 135; column++) {
    const cell = row * 135 + column;
    const x = 51 + (column + (row % 2) * .5) * 5.5 + (variation(seed, cell, 21) - .5) * 3.8;
    const y = 28 + row * 5.1 + (variation(seed, cell, 22) - .5) * 3.8;
    if (crown.some(patch => {
      const dx = x - patch.x, dy = y - patch.y;
      const along = (dx * patch.cos + dy * patch.sin) / patch.rx;
      const across = (dy * patch.cos - dx * patch.sin) / patch.ry;
      return along ** 2 + across ** 2 < .94 + .11 * Math.sin(x * .087 + y * .065) + .08 * Math.cos(y * .14);
    })) candidates.push(reshape([x,y], species));
  }

  // Each new center fills the largest remaining gap. Earlier memories keep
  // their centers as new ones arrive. Blades shrink to fit their nearest neighbor.
  const gaps = new Float64Array(candidates.length);
  const centers: { point: Point; gap: number }[] = [];
  const first = reshape([433,104], species);
  gaps.set(candidates.map(p => -distance(p, first)));
  for (let i = 0; i < count; i++) {
    let chosen = 0;
    for (let j = 1; j < gaps.length; j++) if (gaps[j] > gaps[chosen]) chosen = j;
    const next = candidates[chosen];
    const gap = i ? gaps[chosen] : Infinity;
    gaps[chosen] = -Infinity;
    for (const center of centers) {
      const separation = distance(center.point, next);
      if (separation < center.gap) center.gap = separation;
    }
    centers.push({point:next,gap});
    for (let j = 0; j < gaps.length; j++) {
      if (gaps[j] < 0 && i > 0) continue;
      if (j === chosen) continue;
      const separation = distance(candidates[j],next);
      if (!i || separation < gaps[j]) gaps[j] = separation;
    }
  }
  return centers;
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
  const shoots: Shoot[][] = trees.map(({curve, shoots}, arm) => shoots.map(([at, x, y], index) => {
    const start = point(curve, at);
    const end = reshape([x, y], tree.settings.species);
    const mid = mix(start, end, .45);
    const elbow: Point = [mid[0] - (end[1] - start[1]) * .13, mid[1] + (end[0] - start[0]) * .16];
    return { arm, at, start, curve: [start, mix(start, elbow, .8), mix(elbow, end, .61), end],
      width: 1.9 + 1.5*variation(tree.seed,arm,index+24) };
  }));
  const reached = new Map<number, number>();
  const active = new Map<Shoot, number>();
  const leaves: PaintedLeaf[] = [];
  const centers = count ? spaceCanopy(count, tree.seed, tree.settings.species) : [];
  const sprigPoints = shoots.flatMap(arm => arm.flatMap(shoot => Array.from({length: 10}, (_, i) => {
    const t = (i + 1) / 10;
    return {shoot,t,attach:point(shoot.curve,t)};
  })));
  const bladeSize = (6 + 55 / (1 + Math.sqrt(Math.max(0,count - 1) / 28))) / 45;
  const cellWidth = bladeSize * bladeLength * 2.2;
  const cellKey = (x: number, y: number) => x + ':' + y;
  const neighbors = new Map<string, Point[]>();
  for (const {point:[x,y]} of centers) {
    const key = cellKey(Math.floor(x/cellWidth),Math.floor(y/cellWidth));
    const cell = neighbors.get(key);
    if (cell) cell.push([x,y]);
    else neighbors.set(key,[[x,y]]);
  }

  const twigs: PaintedSpray[] = [];
  const twigPoints: SprigPoint[] = [];
  if (count > 150) {
    const twigCount = Math.min(360, Math.ceil(count/7));
    for (const [index,{point:tip}] of centers.slice(0,twigCount).entries()) {
      const primary = closestSprig(tip,sprigPoints);
      const fork = twigPoints.length ? closestSprig(tip,twigPoints) : null;
      const useFork = fork !== null && fork.gap < primary.gap * .86;
      const {shoot,attach,t,gap} = useFork ? fork : primary;
      if (gap < 18) continue;
      reached.set(shoot.arm,Math.max(reached.get(shoot.arm) ?? 0,shoot.at));
      active.set(shoot,Math.max(active.get(shoot) ?? 0,t));
      const dx = tip[0]-attach[0], dy = tip[1]-attach[1];
      const bend = (variation(tree.seed,index,37)-.5)*.64;
      const curve: Curve = [attach,[attach[0]+dx*.28-dy*bend,attach[1]+dy*.28+dx*bend],
        [attach[0]+dx*.62-dy*bend*.5,attach[1]+dy*.62+dx*bend*.5],tip];
      twigs.push({path:sprayPath(curve),width:(useFork ? .38 : .69)+variation(tree.seed,index,38)*.44});
      twigPoints.push(...[.6,.82,1].map(at=>({shoot,t,attach:point(curve,at)})));
    }
  }

  for (const [rank, memory] of ordered.entries()) {
    const {point:center,gap} = centers[rank];
    const primary = closestSprig(center,sprigPoints,!rank);
    const twig = twigPoints.length ? closestSprig(center,twigPoints) : null;
    const {shoot,attach,t} = twig && twig.gap < primary.gap ? twig : primary;
    const bearing = Math.atan2(center[1]-primary.attach[1],center[0]-primary.attach[0]) + (variation(tree.seed,memory.slot,8)-.5)*1.25;
    const cos = Math.cos(bearing), sin = Math.sin(bearing);
    const cellX = Math.floor(center[0]/cellWidth), cellY = Math.floor(center[1]/cellWidth);
    let blade = Math.min(bladeSize, Math.sqrt(gap) * .47 / bladeBreadth);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const [x,y] of neighbors.get(cellKey(cellX+dx,cellY+dy)) ?? []) {
        const vx=x-center[0], vy=y-center[1], separation=vx*vx+vy*vy;
        if (!separation || separation > (2.2*blade*bladeLength)**2) continue;
        const along=(cos*vx+sin*vy)*bladeLength, cross=(cos*vy-sin*vx)*bladeBreadth;
        blade = Math.min(blade, .47*separation/Math.sqrt(along*along+cross*cross));
      }
    }
    blade *= .85 + .15 * variation(tree.seed,memory.slot,4);
    const position: Point = [center[0]-Math.cos(bearing)*blade*leafCenter,center[1]-Math.sin(bearing)*blade*leafCenter];
    reached.set(shoot.arm, Math.max(reached.get(shoot.arm) ?? 0, shoot.at));
    active.set(shoot, Math.max(active.get(shoot) ?? 0, t));
    const days = dayNumber(today) - dayNumber(memory.date);
    const palette = days < 80 ? 0 : days < 365 ? 1 : days < 950 ? 2 : days < 1600 ? 3 : 4;
    leaves.push({
      id: memory.id, slot: memory.slot, x: center[0], y: center[1], angle: bearing * 180 / Math.PI,
      size: blade, palette, wash: variation(tree.seed, memory.slot, 16),
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
  const stems = count ? [
    {curve:trees[0].curve, width:count === 1 ? 16 : trees[0].width, tip:.32},
    {curve:split(trees[1].curve, Math.max(upperReach, hasUpperStem ? .4 : .25)), width:count === 1 ? 16*.32 : trees[0].width*.32, tip:.08},
  ] : [];
  const trunk = count ? [ribbon(...stems.map(({curve,width,tip}) => woodEdges(curve,width,tip)))] : [];
  const boughs = trees.slice(2).flatMap(({curve, width}, i) => {
    const end = reached.get(i + 2);
    return end === undefined ? [] : [{curve:split(curve, Math.min(1, end + .035)),width,tip:.10}];
  });
  const bark = [...stems,...boughs].flatMap(({curve,width,tip}, branch) => Array.from({length:Math.ceil(width/3)}, (_, groove) => {
    const cross = (variation(tree.seed,branch,groove+43)-.5)*.84;
    const start = branch ? .03 + .18 * variation(tree.seed,branch,groove+91) : 0;
    const length = .51 + .43 * variation(tree.seed,branch,groove+117);
    const trace = Array.from({length:23}, (_, step) => {
      const t = Math.min(1,start+length*step/22);
      const [x,y] = point(curve,t), [dx,dy] = direction(curve,t);
      const taper = tip + (1-tip)*(1-t)**1.15;
      const drift = Math.sin(t*18+groove)*.76 + Math.sin(t*37+branch)*.28;
      const offset = width*taper*cross + drift;
      return coords([x-dy*offset,y+dx*offset]);
    });
    return {path:'M'+trace.join('L'), width:groove%3===0 ? 1.15 : .68, light:groove%2===0};
  }));
  const sprays = [...active].map(([shoot, end]) =>
    ribbon(woodEdges(split(shoot.curve, Math.min(1, end + .035)), shoot.width, .035)));
  return {size, leaves, boughs:boughs.map(({curve,width,tip})=>ribbon(woodEdges(curve,width,tip))), sprays, twigs, trunk, bark};
}
