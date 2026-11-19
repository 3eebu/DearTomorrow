
import { activeSeason, dayNumber, type Tree, type Memory, type Species } from './memory-tree';

export type V = [number, number, number];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V, n: number): V => [a[0] * n, a[1] * n, a[2] * n];
export const mix = (a: V, b: V, t: number) => add(a, mul(sub(b, a), t));
export const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a: V): V => mul(a, 1 / (Math.hypot(...a) || 1));
const radial = (angle: number, radius: number, y: number): V => [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
const tau = 2 * Math.PI;
const up: V = [0, 1, 0];
const origin: V = [0, 0, 0];
const fraction = (n: number) => n - Math.floor(n);
export const BRANCH = 2_000_000;
export const STRIDE = 17;

function noise(seed: number, slot: number, channel: number) {
  let n = (seed ^ Math.imul(slot + 11, 374761393) ^ Math.imul(channel + 5, 668265263)) >>> 0;
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
}

const greens: V[] = [[.68,.78,.39], [.52,.67,.32], [.37,.53,.26], [.34,.43,.23], [.52,.49,.26]];
const seasonColors: Record<ReturnType<typeof activeSeason>, V[]> = {
  spring: greens,
  summer: [[.58,.74,.32], [.45,.64,.29], [.32,.51,.25], [.30,.42,.22], [.48,.48,.25]],
  autumn: [[.73,.75,.40], [.63,.66,.33], [.58,.57,.29], [.56,.46,.25], [.68,.51,.29]],
  winter: [[.63,.72,.50], [.55,.63,.43], [.45,.54,.37], [.40,.47,.32], [.57,.52,.34]],
};
export function leafColor(date: string, today: string, season: ReturnType<typeof activeSeason>, species: Species): V {
  const days = Math.max(0, dayNumber(today) - dayNumber(date));
  const maturity = Math.min(4, Math.log1p(days / 38) * .88);
  const step = Math.floor(maturity);
  const palette = seasonColors[season];
  const base = mix(palette[step], palette[Math.min(4, step + 1)], maturity - step);
  return species === 'willow' ? add(base, [-.04,.009,.055]) : species === 'oak' ? add(base, [.019,-.012,-.014]) : base;
}

export type LeafSite = { id: string; pick: number; tip: V; attach: V };
export type Model = {
  vertices: Float32Array; leaves: Map<number, LeafSite>; branches: Map<number, { id: string; point: V }>;
  center: V; radius: number; widthRadius: number; heightRadius: number; trunkHeight: number; trunkRadius: number;
};
type Vertex = { p: V; n: V; u: number; v: number; axis?: V };
const vertex = (p: V, n: V, u = 0, v = 0): Vertex => ({ p, n, u, v });
type TreeShape = Pick<Tree, 'seed'|'memories'|'chapters'> & { settings: Pick<Tree['settings'], 'species'|'season'|'south'> };
type Limb = {
  key: number; index: number; height: number; reach: number; rise: number; angle: number; layer: number;
  fork?: { parent: number; join: number };
};
type Site = { memory: Memory; limb: Limb | null; t: number };

// Successive limbs open up useful negative space around the trunk as the tree grows.
// Each entry gives the first memory slot, attachment height, reach, rise, and bearing.
const youngLimbs = [
  [2,.37,.49,.47,3.43], [4,.52,.65,.55,.52], [7,.83,1.03,.81,4.23],
  [10,1.07,1.59,1.04,6.06], [14,1.31,1.70,1.20,3.04], [18,1.64,1.59,1.20,.98],
  [22,1.89,1.47,1.26,4.04], [26,2.17,1.13,1.38,.26], [30,2.42,.97,1.08,2.69],
  [34,2.64,1.00,1.42,5.25], [39,2.89,.82,1.48,1.75], [46,3.14,.55,1.55,3.75],
];
function youngLimb(key: number, slot: number): Limb {
  const [first,height,reach,rise,angle] = youngLimbs[key];
  return {key,index:slot-first,height,reach,rise,angle,layer:0};
}
function limbFor(slot: number): Limb | null {
  if (slot < 2) return null;
  if (slot < 50) {
    const after = youngLimbs.findIndex(limb => limb[0] > slot);
    const key = (after === -1 ? youngLimbs.length : after) - 1;
    return youngLimb(key,slot);
  }
  const extra = slot - 50;
  const layer = Math.floor(Math.log2(1 + extra / 50));
  const local = extra - 50 * (2 ** layer - 1);
  const limbs = 7 + Math.min(5, layer);
  const branch = local % limbs;
  const key = youngLimbs.length + layer * 12 + branch, index = Math.floor(local / limbs);
  if(branch%3===0){
    // A mature crown also extends its original limbs, so the lower canopy fills in.
    const parent = 3 + (branch/3 + layer*2)%6;
    const [,height,, ,bearing] = youngLimbs[parent];
    return {key,index,height,reach:.51+layer*.19,rise:.58+layer*.13,
      angle:bearing+(layer%2?.68:-.65),layer:layer+1,fork:{parent,join:.57+layer*.055}};
  }
  const around = fraction(branch * .6180339887 + layer * .382);
  const shoulder = Math.sin(branch / (limbs - 1) * Math.PI);
  return {
    key,index,
    height: 2.60 + layer * .60 + branch * .135,
    reach: 1.18 + layer * .28 + shoulder * (.72 + layer * .08),
    rise: .99 + (.42 + layer * .10) * (1 - shoulder),
    angle: around * tau, layer: layer + 1,
  };
}
const youngPositions = [.77,.56,.93,.68,.87,.50,.98];

export function buildTree(tree: TreeShape, today: string): Model {
  const { seed, memories, settings } = tree;
  const leaves = new Map<number, LeafSite>(), branches: Model['branches'] = new Map();
  const chapters = new Map(tree.chapters.map(chapter => [chapter.id, chapter.slot]));
  const species = settings.species, oak = species === 'oak', willow = species === 'willow';
  const season = activeSeason(settings, today);
  const count = memories.length;
  const fine = count < 150, dense = count >= 450;
  const twist = noise(seed, 0, 1) * tau;
  const heading = (noise(seed, 0, 14) - .5) * .50;
  const trunk = (height: number): V => [
    .22 * Math.sin(height * 1.4 + twist) * (1 - Math.exp(-height)) - .047 * height
      + .057 * Math.sin(height * 7.3) * Math.exp(-height * 2.6),
    height,
    .17 * Math.sin(height * 1.25 + twist + .6) * (1 - Math.exp(-height)),
  ];
  const radius = .010 + .131 * (1 - Math.exp(-count / 32)) + .032 * Math.log2(1 + count / 30);
  const wood: V = oak ? [.53,.38,.26] : willow ? [.53,.43,.31] : [.57,.415,.30];
  const bark = mix([.43,.49,.29],wood,1 - Math.exp(-count / 6));
  const twig: V = mix(bark, [.49,.49,.30], .34);
  const groups = new Map<number, { limb: Limb; sites: Site[]; end: number; support: boolean }>();
  function includeLimb(limb: Limb, end: number) {
    let group=groups.get(limb.key);
    if(!group){group={limb,sites:[],end,support:false};groups.set(limb.key,group);}
    group.end=Math.max(group.end,end);
    return group;
  }
  const sites: Site[] = memories.map(memory => {
    const limb = limbFor(memory.slot);
    const t = limb ? (limb.layer ? .39 + .59 * fraction((limb.index + 1) * .618) : youngPositions[limb.index]) : 0;
    const site = { memory, limb, t };
    if (limb) {
      includeLimb(limb,t).sites.push(site);
      if(limb.fork)includeLimb(youngLimb(limb.fork.parent,0),limb.fork.join).support=true;
    }
    return site;
  });
  const trunkHeight = Math.max(.451, ...Array.from(groups.values(), group => group.limb.height + .115));
  let data = new Float32Array(Math.max(30_000, count * (dense ? 3_900 : 5_500)));
  let offset = 0, top = count ? trunkHeight : .12, width = .28;
  function triangle(a: Vertex, b: Vertex, c: Vertex, tint: V, id = 0, kind = 0, pivot = origin, shoot = 0) {
    if (offset + STRIDE*3 > data.length) {
      const next = new Float32Array(Math.ceil(data.length * 1.55));
      next.set(data); data = next;
    }
    for (const v of [a,b,c]) {
      data.set(v.p, offset); data.set(v.n, offset + 3); data.set(tint, offset + 6);
      data[offset + 9] = v.u; data[offset + 10] = v.v; data.set(v.axis??pivot, offset + 11);
      data[offset + 14] = id; data[offset + 15] = kind; data[offset + 16] = shoot; offset += STRIDE;
    }
  }
  function tube(path: V[], radii: number[], color: V, sides: number, id = 0, kind = 0, pivot = origin, shoot = 0) {
    let previous: Vertex[] = [], distance = 0;
    const whole = unit(sub(path[path.length - 1], path[0]));
    const reference: V = Math.abs(whole[1]) > .86 ? [1,0,0] : up;
    for (let i = 0; i < path.length; i++) {
      const dir = unit(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(0, i - 1)]));
      const right = unit(cross(dir, reference)), front = unit(cross(dir, right));
      if (i) distance += Math.hypot(...sub(path[i], path[i - 1]));
      const ring = Array.from({ length: sides + 1 }, (_, j) => {
        const angle = tau * j / sides;
        const n = add(mul(right, Math.cos(angle)), mul(front, Math.sin(angle)));
        const ridge = 1 + .085 * Math.sin(angle * 5 + distance * 1.77) + .035 * Math.sin(angle * 9 - distance * 2.1);
        const radialOffset = mul(n, radii[i] * ridge);
        if (kind === 9) radialOffset[1] *= .64;
        const point=vertex(add(path[i],radialOffset), n, j / sides, kind === 2 ? i / (path.length - 1) : distance);
        if(kind===7)point.axis=path[i];
        return point;
      });
      if (i) for (let j = 0; j < sides; j++) {
        triangle(previous[j], ring[j], ring[j + 1], color, id, kind, pivot, shoot);
        triangle(previous[j], ring[j + 1], previous[j + 1], color, id, kind, pivot, shoot);
      }
      previous = ring;
    }
  }
  function limbPath(limb: Limb, t: number): V {
    const angle = limb.angle + heading + (noise(seed, limb.key, 4) - .5) * .30 + t * .21;
    const spread = Math.pow(t, 1.16) * limb.reach * (oak ? .91 : willow ? 1.14 : 1);
    const ascent = limb.rise * (oak ? 1.13 : willow ? .99 : 1);
    const y = willow ? ascent * (1.55 * t - .77 * t * t) + limb.reach * .36 * Math.sin(Math.PI * t)
      : ascent * (1.36 * t - .36 * t * t);
    const attachment=limb.fork?limbPath(youngLimb(limb.fork.parent,0),limb.fork.join):trunk(limb.height);
    return add(attachment, radial(angle, spread, y));
  }
  const arc = (a: V, b: V, c: V, t: number) => mix(mix(a, b, t), mix(b, c, t), t);

  // This translucent patch receives the contact shadow and has no selectable surface.
  const shadow = Math.max(count ? .18 : .28, radius * 6.2);
  const corner = (x: number, z: number) => vertex([x * shadow, -.013, z * shadow * .82], up, x, z);
  const floor: V = [.37,.29,.22];
  triangle(corner(-1,-1),corner(-1,1),corner(1,1),floor,0,3);
  triangle(corner(-1,-1),corner(1,1),corner(1,-1),floor,0,3);

  if (!count) {
    const seedPath: V[] = [[-.13,-.015,0],[-.104,.005,0],[-.055,.018,0],[.012,.026,0],[.075,.032,0],[.12,.042,.005],[.15,.053,.015]];
    tube(seedPath,[.004,.041,.063,.067,.051,.028,.001],[.54,.35,.23],24,0,5);
    tube([[-.094,.039,.025],[-.05,.073,.032],[.016,.09,.033],[.076,.062,.026],[.111,.057,.013]],
      [.001,.0028,.004,.0025,.001],[.71,.51,.32],6,0,5);
  } else {
    const sections = Math.max(8, Math.ceil(trunkHeight * 8));
    const levels = Array.from({ length: sections + 1 }, (_, i) => i / sections);
    const collar = count > 2 ? .38 : .03;
    tube(levels.map(t => trunk(t * trunkHeight)), levels.map(t =>
      radius * ((1 - t) ** .78 + collar * Math.exp(-t * trunkHeight * 13)) + .0025), bark, fine ? 26 : 18, 0, 7);
    if (count > 4) for (let i = 0; i < 4; i++) {
      const a = heading + i * tau / 4 + (noise(seed,i,18)-.5)*.72;
      const reach = radius * (2.75 + noise(seed,i,19)*2.4);
      const start = trunk(.11 + .10*noise(seed,i,20));
      const near = radial(a-.13,radius*.61,.026), far = radial(a+.21,reach*.59,.018);
      const tip = radial(a+.40,reach,.002);
      const steps = Array.from({length:9},(_,index)=>index/8);
      const path = steps.map(t=>mix(arc(start,near,far,t),arc(near,far,tip,t),t));
      tube(path,steps.map(t=>radius*(.63*(1-t)**1.29)+.0015),bark,14,0,9);
    }
  }
  for (const { limb, sites, end, support } of groups.values()) {
    const member = sites.find(site => chapters.has(site.memory.chapterId));
    const pick = member ? BRANCH + chapters.get(member.memory.chapterId)! : 0;
    const length = Math.min(1.02, end + .015);
    const segments = dense ? 9 : 16;
    const t = Array.from({length:segments+1},(_,i)=>i/segments);
    const shoulder = Math.min(radius*.79, .014 + .0175*Math.sqrt(sites.length) + limb.reach*.013);
    const neck = limb.fork ? .36 : Math.min(.81,(1-limb.height/trunkHeight)**.69);
    const firstShoot = !support && sites.length === 1 ? sites[0].memory.slot + 1 : 0;
    tube(t.map(u=>limbPath(limb,u*length)),t.map(u=>
      shoulder*(1-u)**1.08*(neck+(1-neck)*Math.min(1,u*6))+.0024),bark,dense?8:14,pick,0,limbPath(limb,0),firstShoot);
  }

  for (const { memory, limb, t } of sites) {
    const id = memory.slot + 1;
    const rand = (channel: number) => noise(seed, memory.slot, channel);
    const angle = limb ? limb.angle + heading : heading + (memory.slot === 0 ? .36 : 3.55);
    const spread = limb ? (.30 + rand(5) * .75) * (limb.index % 2 ? -1 : 1) : 0;
    const bearing = angle + spread;
    const start = limb ? limbPath(limb, t) : trunk(memory.slot === 0 ? .44 : .30);
    const shootLength = limb ? Math.min(.46,.09 + limb.reach * .125 + (1 - t) * .24) : .08;
    const shootTip = add(start, radial(bearing, shootLength, shootLength * (willow && limb ? -.66 : .91)));
    const bend = add(mix(start, shootTip, .47), radial(angle, shootLength * .16, -shootLength * .17));
    const stalk = add(shootTip, radial(bearing, limb ? .058 : .044, limb && willow ? -.051 : .03));
    const subdivisions = dense ? 3 : 6;
    const path = Array.from({length:subdivisions+1},(_,i)=>arc(start,bend,shootTip,i/subdivisions));
    path.push(stalk);
    const stemWidth = .008 + Math.min(.009, (limb?.reach ?? .15) * .005);
    tube(path,path.map((_,i)=>stemWidth*(1 - .78 * i / (path.length - 1))),twig,dense?4:7,id,2,start);
    const branchSlot = chapters.get(memory.chapterId);
    if (branchSlot !== undefined) {
      const pick = BRANCH + branchSlot;
      const candidate = branches.get(pick);
      if (!candidate || candidate.point[1] < start[1]) branches.set(pick, {id:memory.chapterId,point:start});
    }

    const youngScale = limb ? .84 + .16 * Math.min(1, limb.reach) : .58;
    const length = (willow ? .65 : oak ? .59 : .66) * youngScale * (.84 + .24 * rand(10));
    const bearingLeaf = bearing + (rand(9) - .5) * .76;
    const lift = willow && limb ? -.99 - .31 * rand(11) : .12 + (rand(11) - .5) * .88;
    const along = unit(radial(bearingLeaf,1,lift));
    const across = unit(add(radial(bearingLeaf + Math.PI / 2,1,0),[0,(rand(13) - .5) * .96 + .23,0]));
    const normal = unit(cross(across,along));
    const halfWidth = length * (willow ? .133 : oak ? .285 : .295) * (.91 + .15 * rand(15));
    const axes = oak ? 22 : 18;
    const rows = fine ? axes : dense ? 10 : 14;
    const acrossPoints = dense ? [-1,0,1] : [-1,-.51,0,.51,1];
    const twistBias=rand(16), camber=.115+.055*rand(14), leafSweep=halfWidth*.15*(rand(17)-.5);
    function blade(u: number, v: number): V {
      const shape = Math.pow(Math.max(.001,Math.sin(Math.PI*v)),willow?.78:.90);
      const lobes = oak ? .82 + .18 * Math.sin(v*Math.PI*10+.6) : 1 + .022*Math.sin(v*82+u*3);
      const asymmetry = 1 + u * .089 * Math.sin(v * Math.PI * 2.2 + twistBias);
      let p = add(add(stalk,mul(along,length*v)),mul(across,halfWidth*u*shape*lobes*asymmetry));
      const liftOnBlade = length * (camber*Math.sin(Math.PI*v) - .14*v*v - .095*u*u*shape);
      p = add(p,mul(normal,liftOnBlade));
      return add(p, mul(across, leafSweep * Math.sin(v * Math.PI)));
    }
    const bladeColor = mul(leafColor(memory.date,today,season,species),.95+.12*rand(12));
    const positions = Array.from({length:rows+1},(_,row)=>acrossPoints.map(u=>blade(u,row/rows)));
    const grid = positions.map((row,j)=>row.map((point,col)=>{
      const du=sub(row[Math.min(col+1,row.length-1)],row[Math.max(0,col-1)]);
      const dv=sub(positions[Math.min(j+1,rows)][col],positions[Math.max(0,j-1)][col]);
      return vertex(point,unit(cross(du,dv)),acrossPoints[col],j/rows);
    }));
    for (let row = 0; row < rows; row++) for (let col = 0; col + 1 < acrossPoints.length; col++) {
      const a=grid[row][col], b=grid[row][col+1], c=grid[row+1][col+1], d=grid[row+1][col];
      triangle(a,b,c,bladeColor,id,1,stalk);
      triangle(a,c,d,bladeColor,id,1,stalk);
    }
    // Each blade has a slim edge strip. In close-up it catches light at grazing angles.
    for (const col of [0,acrossPoints.length-1]) for (let row = 0; row < rows; row++) {
      const a=grid[row][col],b=grid[row+1][col];
      const c=vertex(add(b.p,mul(b.n,-length*.007)),b.n,b.u,b.v);
      const d=vertex(add(a.p,mul(a.n,-length*.007)),a.n,a.u,a.v);
      triangle(a,b,c,bladeColor,id,8,stalk);triangle(a,c,d,bladeColor,id,8,stalk);
    }

    if (memory.milestone) {
      const center=add(shootTip,[0,.038,0]), flowerSize=length*.18;
      const tint: V = species==='cherry' ? [.91,.74,.73] : [.91,.837,.714];
      for (let i = 0; i < 5; i++) {
        const a=bearing + i*tau/5;
        const base=vertex(center,up),mid=vertex(add(center,radial(a,flowerSize*.55,flowerSize*.10)),up,.55,.35);
        const end=vertex(add(center,radial(a,flowerSize,flowerSize*.26)),unit(radial(a,.42,1)),1,0);
        for (const sign of [-1,1]) {
          const edge=vertex(add(center,radial(a+sign*.37,flowerSize*.73,flowerSize*.12)),unit(radial(a+sign,.37,1)),.64,1);
          triangle(base,mid,edge,tint,id,6,stalk);triangle(mid,end,edge,tint,id,6,stalk);
        }
      }
    }
    const tip = blade(0,.49);
    leaves.set(id,{id:memory.id,pick:id,tip,attach:start});
    for (const v of [blade(-1,.42),blade(1,.42),blade(0,1),stalk]) {
      width=Math.max(width,Math.hypot(v[0],v[2]));
      top=Math.max(top,v[1]);
    }
  }
  const heightRadius = Math.max(.26,(top + .035) * .5);
  return {vertices:data.subarray(0,offset),leaves,branches,center:[-.014,(top-.02)*.5,0],
    radius:Math.hypot(width,heightRadius),widthRadius:width,heightRadius,trunkHeight:count?trunkHeight:0,trunkRadius:count?radius:0};
}
