import { activeSeason, dayNumber, type Tree, type Memory, type Species } from './memory-tree';

export type V = [number, number, number];
export const add = (a: V, b: V): V => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
export const sub = (a: V, b: V): V => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
export const mul = (a: V, n: number): V => [a[0]*n, a[1]*n, a[2]*n];
export const mix = (a: V, b: V, k: number) => add(a, mul(sub(b,a),k));
export const cross = (a: V,b: V): V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit = (a: V): V => mul(a,1/(Math.hypot(...a)||1));
const radial = (angle: number, radius: number, y: number): V => [Math.cos(angle)*radius,y,Math.sin(angle)*radius];
const tau = 2*Math.PI;
export const BRANCH = 2_000_000;
export const STRIDE = 16;
function noise(seed: number, slot: number, channel: number) {
  let n = (seed ^ Math.imul(slot+11, 374761393) ^ Math.imul(channel+5, 668265263)) >>> 0;
  n = Math.imul(n ^ (n>>>15), 2246822519);
  return ((n ^ (n>>>13))>>>0)/4294967296;
}

export function leafColor(date: string, today: string, season: ReturnType<typeof activeSeason>, species: Species): V {
  const maturity = Math.min(1, Math.log1p(Math.max(0,dayNumber(today)-dayNumber(date))/90)/4);
  const palettes: Record<typeof season,[V,V]> = {
    spring: [[.55,.74,.26],[.36,.46,.18]], summer: [[.41,.66,.22],[.32,.41,.12]],
    autumn: [[.85,.57,.20],[.62,.27,.11]], winter: [[.69,.65,.47],[.48,.36,.24]],
  };
  const tint = species === 'willow' ? [.01,.04,.055] : species === 'cherry' ? [.045,0,0] : [0,0,0];
  return add(mix(...palettes[season],maturity),tint as V);
}

export type LeafSite = { id: string; pick: number; tip: V; attach: V };
export type Model = { vertices: Float32Array; leaves: Map<number,LeafSite>; branches: Map<number,{id:string;point:V}>;
  center: V; radius: number; widthRadius: number; heightRadius: number };
type Vertex = { p: V; n: V; u: number; v: number };
const vertex = (p: V,n: V,u=0,v=0): Vertex => ({p,n,u,v});

type TreeShape = Pick<Tree,'seed'|'memories'|'chapters'> & {settings:Pick<Tree['settings'],'species'|'season'|'south'|'garden'>};
export function buildTree(tree: TreeShape, today: string): Model {
  const {seed, memories,settings} = tree;
  let data = new Float32Array(Math.max(50000, memories.length*1750));
  let offset = 0;
  const leaves = new Map<number,LeafSite>(), branches: Model['branches'] = new Map();
  const zero: V = [0,0,0], up: V = [0,1,0];
  const species = settings.species, oak = species==='oak', willow = species==='willow';
  const season = activeSeason(settings,today);
  const lightweight = memories.length>=450;
  const generation = Math.log2(Math.max(1,...memories.map(m=>m.slot+1)));
  const height = memories.length ? .46 + generation*.64 : .12;
  const thickness = .026 + Math.log2(memories.length+1)*.029;
  const phase = noise(seed,0,1)*tau;
  const trunk = (h: number): V => [(.10*Math.sin(h*1.05+phase)-.10*Math.sin(phase))*h*.24,h,.032*h*Math.sin(h+.3+phase)];
  let maxRadius = .48, top = height;
  function triangle(a: Vertex,b: Vertex,c: Vertex,color: V,id=0,kind=0,pivot=zero) {
    if(offset+48>data.length) { const next=new Float32Array(Math.ceil(data.length*1.65)); next.set(data); data=next; }
    for(const v of [a,b,c]) {
      data.set(v.p,offset); data.set(v.n,offset+3); data.set(color,offset+6);
      data[offset+9]=v.u; data[offset+10]=v.v; data.set(pivot,offset+11);
      data[offset+14]=id; data[offset+15]=kind; offset+=STRIDE;
    }
  }
  function tube(path: V[], radii: number[], color: V, sides: number, id=0,kind=0,pivot=zero) {
    let previous: Vertex[] = [];
    const tangent = unit(sub(path[path.length-1],path[0]));
    const reference: V = Math.abs(tangent[1])>.88 ? [1,0,0] : up;
    for(let i=0;i<path.length;i++) {
      const dir=unit(sub(path[Math.min(i+1,path.length-1)],path[Math.max(0,i-1)]));
      const right=unit(cross(dir,reference)), forward=unit(cross(dir,right));
      const ring = Array.from({length:sides},(_,j)=>{
        const angle=tau*j/sides;
        const n=add(mul(right,Math.cos(angle)),mul(forward,Math.sin(angle)));
        return vertex(add(path[i],mul(n,radii[i])),n,j/sides,i);
      });
      if(i) for(let j=0;j<sides;j++) { const k=(j+1)%sides;
        triangle(previous[j],ring[j],ring[k],color,id,kind,pivot);
        triangle(previous[j],ring[k],previous[k],color,id,kind,pivot);
      }
      previous=ring;
    }
  }
  // A low, uneven mound is real geometry and can be viewed from overhead.
  const soil: V = settings.garden==='rain'?[.34,.40,.32]:[.47,.51,.32];
  const ground = (r: number, angle: number): Vertex => vertex(radial(angle,r,-.075-.045*Math.log1p(r)+.014*Math.sin(3*angle)*Math.min(1,r)),up);
  for(let i=0;i<72;i++) {
    const a=i*tau/72,b=(i+1)*tau/72;
    const inner=ground(2,a),innerNext=ground(2,b),outer=ground(38,a),outerNext=ground(38,b);
    triangle(ground(0,0),innerNext,inner,soil,0,3);
    triangle(inner,innerNext,outer,soil,0,3);
    triangle(innerNext,outerNext,outer,soil,0,3);
  }
  // Short blades cluster in tufts. They never share a memory leaf's pick identity.
  for(let i=0;i<265;i++) {
    const angle=noise(seed,i,21)*tau, r=.30+Math.pow(noise(seed,i,22),.6)*12;
    const p=ground(r,angle).p, size=.055+.12*noise(seed,i,23);
    for(let j=0;j<3;j++) {
      const lean=angle+j*2.4;
      triangle(vertex(add(p,radial(lean+.9,.022,0)),up),vertex(add(p,radial(lean,size*.48,size)),up),
        vertex(add(p,radial(lean-.9,.022,0)),up),[.43,.50+.07*noise(seed,i,24),.28],0,4);
    }
  }
  const bark: V=oak?[.39,.29,.21]:willow?[.43,.37,.24]:[.46,.32,.27];
  if(!memories.length) {
    const line: V[]=[[-.19,-.042,0],[-.115,.012,0],[.025,.04,0],[.14,.062,0],[.22,.10,0]];
    tube(line,[.018,.108,.125,.077,.002],[.46,.28,.13],16,0,5);
    tube([[-.16,.012,.035],[-.065,.112,.036],[.05,.154,.025],[.16,.106,.013]],[.006,.009,.007,.002],[.72,.53,.31],6);
  } else {
    const spine=Array.from({length:Math.max(4,Math.ceil(height*4))},(_,i)=>i);
    const line=spine.map(i=>trunk(height*i/(spine.length-1)));
    tube(line,spine.map(i=>thickness*Math.pow(1-i/(spine.length-1),.83)+.003),bark,12,0,7);
    for(let i=0;i<7;i++) {
      const a=phase+i*tau/7+.25*noise(seed,i,18),reach=thickness*(3.5+noise(seed,i,19)*2);
      tube([trunk(.13),radial(a,thickness,.016),radial(a+.08,reach*.63,-.04),radial(a+.15,reach,-.09)],
        [thickness*.5,thickness*.64,thickness*.26,.002],bark,7);
    }
  }
  const chapters = new Map(tree.chapters.map(c=>[c.id,c]));
  const groups = new Map<string,{path:(t:number)=>V; count:number; chapter:number}>();
  function group(m: Memory) {
    const tier=Math.floor(Math.log2(m.slot+1));
    const chapter=chapters.get(m.chapterId)?.slot ?? -1;
    const key=chapter+'/'+tier;
    const existing=groups.get(key);
    if(existing) return existing;
    const angle=phase+(chapter+1)*2.39996+tier*.51+noise(seed,chapter,4)*.32;
    const base=trunk(.11+tier*.49);
    const reach=(.22+tier*.40)*(oak?.92:willow?1.11:1.19);
    const path=(t:number):V=>add(base,radial(angle+.19*Math.sin(t*2.7+tier)*t,reach*t,
      (.11+tier*.205)*t+(willow?1.2:oak?.39:.20)*reach*Math.sin(t*Math.PI*.85)-(willow?.69:0)*reach*t*t));
    const g={path,count:0,chapter}; groups.set(key,g); return g;
  }
  for(const m of memories) if(m.slot>1)group(m).count++;
  for(const g of Array.from(groups.values())) {
    const id=g.chapter<0?0:BRANCH+g.chapter;
    if(id){
      const point=g.path(.68),prior=branches.get(id);
      if(!prior||prior.point[1]<point[1])branches.set(id,{id:tree.chapters.find(c=>c.slot===g.chapter)!.id,point});
    }
    const radius=.013+Math.log2(g.count+1)*.017;
    const steps=[0,.23,.47,.70,.88,1];
    tube(steps.map(g.path),steps.map(t=>radius*(1-t*.96)),bark,lightweight?5:8,id);
  }
  for(const m of memories) {
    const id=m.slot+1, tier=Math.floor(Math.log2(id)), r=(i:number)=>noise(seed,m.slot,i);
    const angle=m.slot<2?phase+m.slot*Math.PI:r(9)*tau;
    const path=m.slot<2?(t:number)=>add(trunk(.24+m.slot*.34),radial(angle,t*.13,t*.16)):group(m).path;
    const t=.32+.63*r(3), start=m.slot<2?path(0):path(t), tangent=unit(sub(path(t+.02),start));
    const lateral=unit(cross(tangent,up)), direction=r(5)>.5?1:-1;
    const length=(.12+tier*.24)*(.30+.77*r(6));
    const tip=m.slot<2?path(1):add(add(start,mul(lateral,length*direction)),add(mul(tangent,length*(.26+.5*r(7))),[0,length*(willow?-.85:oak?.88:.51)*(.35+r(8)),0]));
    const elbow=add(mix(start,tip,.52),[0,length*(willow?.19:.12),0]);
    const twigStops=lightweight?[0,.5,1]:[0,.25,.5,.75,1];
    tube(twigStops.map(t=>mix(mix(start,elbow,t),mix(elbow,tip,t),t)),twigStops.map(t=>(.012+tier*.0017)*(1-.83*t)),bark,lightweight?3:5,id,2,start);
    const leafLength=(willow?.42:oak?.40:.44)*(.85+.32*r(10))*Math.min(1,.6+tier*.09);
    const axis=radial(angle,leafLength,(willow?-1.2:-.39+1.42*r(11))*leafLength);
    const width=leafLength*(willow?.16:oak?.43:.40), side=radial(angle+Math.PI/2,width,width*(r(13)-.5)*1.5);
    const normal=unit(cross(side,axis));
    const shade=mul(leafColor(m.date,today,season,species),.92+.12*r(12));
    const rows=oak?12:lightweight?4:7;
    const blade=(u:number,v:number):Vertex=>{
      const profile=Math.pow(Math.max(.006,Math.sin(Math.PI*v)),willow?.8:.75)*(oak?.79+.21*Math.cos(v*Math.PI*10):1);
      const p=add(add(tip,mul(axis,v)),mul(side,u*profile));
      p[1]+=leafLength*(.23*Math.sin(v*Math.PI)-.19*v*v-.13*Math.abs(u)*profile);
      return vertex(p,unit(add(normal,mul(side,u*.8))),u,v);
    };
    for(let j=0;j<rows;j++) for(const u of [-1,0]){
      const a=blade(u,j/rows),b=blade(u+1,j/rows),c=blade(u+1,(j+1)/rows),d=blade(u,(j+1)/rows);
      triangle(a,b,c,shade,id,1,tip); triangle(a,c,d,shade,id,1,tip);
    }
    if(m.milestone) for(let petal=0;petal<5;petal++){
      const a=angle+petal*tau/5, size=leafLength*.27;
      const center=vertex(add(tip,[0,.02,0]),up), outer=vertex(add(tip,radial(a,size,.037)),up);
      for(const sign of [-1,1]) triangle(center,outer,vertex(add(tip,radial(a+sign*.53,size*.75,.05)),up),[.92,.74,.68],id,6,tip);
    }
    const target=add(tip,mul(axis,.52));
    leaves.set(id,{id:m.id,pick:id,tip:target,attach:start});
    maxRadius=Math.max(maxRadius,Math.hypot(target[0],target[2])+leafLength);
    top=Math.max(top,target[1]+leafLength);
  }
  return {vertices:data.subarray(0,offset),leaves,branches,center:[0,top*.48,0],
    radius:Math.max(.69,Math.hypot(maxRadius,top*.52)),widthRadius:maxRadius,heightRadius:Math.max(.32,top*.52)};
}
