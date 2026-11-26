// Botanical drawing in a 1000 × 563 ortho view. y increases toward the ground.
function randomStream(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

type Point = [number, number];
type Limb = { a: Point; b: Point; c: Point; d: Point; base: number; tip: number };
function at({a,b,c,d}: Limb, t: number): Point {
  const s = 1-t;
  return [a[0]*s*s*s+3*b[0]*s*s*t+3*c[0]*s*t*t+d[0]*t*t*t,
    a[1]*s*s*s+3*b[1]*s*s*t+3*c[1]*s*t*t+d[1]*t*t*t];
}
const limb = (a:Point,b:Point,c:Point,d:Point,base:number,tip:number):Limb => ({a,b,c,d,base,tip});
const ages = [
  {scale:.042, girth:.96, depth:0}, {scale:.085,girth:.68,depth:0},
  {scale:.21,girth:.28,depth:1}, {scale:.39,girth:.48,depth:2},
  {scale:.65,girth:.72,depth:3}, {scale:.90,girth:.92,depth:4},
  {scale:1,girth:1.06,depth:4},
];
export function grow(stage: number) {
  const {scale,girth,depth} = ages[stage];
  const rand = randomStream(71059);
  const wood:number[] = [], leaves:number[] = [];
  const clusters:number[] = [];
  const paintRand=randomStream(5839);
  let limbs = 0;
  const world = (p:Point):Point => [490+(p[0]-490)*scale,481+(p[1]-481)*scale];
  function branch(l:Limb) {
    ++limbs;
    const seed = rand()*60;
    const steps = Math.max(5,Math.min(50,Math.ceil(Math.hypot(l.d[0]-l.a[0],l.d[1]-l.a[1])/3.2)));
    let prev:number[][] = [];
    for(let i=0;i<=steps;i++) {
      const t=i/steps, p=at(l,t), ahead=at(l,t+.0001);
      const length=Math.hypot(ahead[0]-p[0],ahead[1]-p[1])||1;
      const r=(l.tip+(l.base-l.tip)*Math.pow(1-t,1.17))*(1+.055*Math.sin(t*12+seed));
      const n:Point=[-(ahead[1]-p[1])/length,(ahead[0]-p[0])/length];
      const edge = [-1,1].map(u=>{
        const w=world([p[0]+r*girth*n[0]*u,p[1]+r*girth*n[1]*u]);
        return [...w,u,t,seed,r*scale];
      });
      if(i)wood.push(...prev[0],...prev[1],...edge[0], ...edge[0],...prev[1],...edge[1]);
      prev=edge;
    }
  }
  function spray(p:Point, angle:number, vigor:number, sun:number) {
    const length = stage<3 ? 12+rand()*7 : (2.4+rand()*3.8)*(.7+.3*vigor);
    const w=world(p);
    leaves.push(...w, Math.max(1.6,length*Math.sqrt(scale)), angle, rand()*6.28, sun, rand(), 0);
  }
  function shoot(l:Limb, level:number, light:number, side:number) {
    branch(l);
    if(level===0 || l.base<.48) {
      if(stage>=3){
        const tip=world(l.d), phase=paintRand()*6.283;
        const width=(14+paintRand()*19)*scale*(stage===3?.67:1);
        // A whole spray shares the light of its bough. A north-west highlight
        // and cool lower pockets create larger crown masses across tiny leaves.
        const pooled=.5+.23*Math.sin(l.d[1]*.081+l.d[0]*.046)
          +.15*Math.cos(l.d[0]*.039-l.d[1]*.021)+(490-l.d[0])*.0007;
        const tone=pooled+paintRand()*.16>.62?0:4;
        clusters.push(...tip,width,phase,paintRand()*6.28,pooled,Math.floor(paintRand()*4)+tone,paintRand());
      }
      const n=4+Math.floor(rand()*5);
      for(let j=0;j<n;j++) {
        const t=.24+.74*j/n, p=at(l,t), tip=at(l,t+.01);
        const tangent=Math.atan2(tip[1]-p[1],tip[0]-p[0]);
        spray(p,tangent+(j%2?1:-1)*(.38+rand()*.83),1,light+rand()*.32);
      }
      return;
    }
    const span=Math.hypot(l.d[0]-l.a[0],l.d[1]-l.a[1]);
    const count=level===depth ? 6 : 3+Math.floor(rand()*2);
    for(let j=0;j<count;j++){
      const t=.18+.78*(j+rand()*.48)/count;
      const start=at(l,t), near=at(l,t+.02);
      const tangent=Math.atan2(near[1]-start[1],near[0]-start[0]);
      const turn=(j%2?1:-1)*(.45+rand()*.83);
      let direction=tangent+turn;
      const reach=Math.max(3.4,span*(.25+rand()*.25)*(1.12-.29*t));
      const up=level>=2? .30:.16;
      direction=Math.atan2(Math.sin(direction)-up,Math.cos(direction));
      const end:Point=[start[0]+Math.cos(direction)*reach,start[1]+Math.sin(direction)*reach];
      const mid:Point=[start[0]+Math.cos(tangent)*reach*.26,start[1]+Math.sin(tangent)*reach*.26];
      const bend:Point=[end[0]-Math.cos(direction+.31*side)*reach*.34,end[1]-Math.sin(direction+.31*side)*reach*.34];
      const base=Math.max(.33,(l.base*(1-t)+l.tip*t)*(.37+rand()*.26));
      shoot(limb(start,mid,bend,end,base,base*.22),level-1,
        light+.07*(start[1]-end[1])/reach+(rand()-.5)*.22,-side);
    }
  }
  // Root ridges and overlapping buttresses connect to the same collar.
  const trunk=limb([490,480],[454,421],[519,341],[487,277],26,10);
  if(stage===0) {
    branch(limb([398,478],[444,430],[526,435],[568,474],40,9));
  } else if(stage<=2) {
    const stem=limb([490,481],[498,393],[452,327],[481,239],7,.9);
    branch(stem);
    for(let i=0;i<(stage===1?2:7);i++){
      const p=at(stem,.35+i*(stage===1?.40:.09));
      const sign=i%2?1:-1;
      const twig=limb(p,[p[0]+sign*18,p[1]-4],[p[0]+sign*38,p[1]-28],[p[0]+sign*(35+rand()*22),p[1]-45],2.5,.3);
      branch(twig); spray(twig.d,sign>0?-.64:-2.5,1,.73);
    }
  } else {
    for(const [offset, rise] of [[-103,30],[99,32],[-66,63],[58,68],[-31,45],[29,36]]){
      const a=at(trunk,rise/230);
      branch(limb(a,[a[0]+offset*.16,469],[490+offset*.46,476],[490+offset,481+rand()*4],Math.abs(offset)*.14,.55));
    }
    branch(trunk);
    const leader=limb(trunk.d,[518,235],[463,203],[514,159],10.8,5);
    branch(leader);
    const crown=limb(leader.d,[543,130],[489,103],[519,64],5.5,.65);
    // Lateral scaffold: parent coordinate, departure, bend, terminal, collar width.
    const scaffolds:[Limb,number,Point,Point,Point,number][]=[
      [trunk,.53,[456,313],[402,357],[335,326],15],
      [trunk,.61,[537,304],[592,343],[658,296],13],
      [trunk,.82,[451,253],[405,281],[365,232],10],
      [leader,.21,[530,234],[572,249],[626,210],9],
      [leader,.48,[458,191],[458,170],[408,156],7],
      [leader,.68,[515,172],[553,185],[585,145],7],
      [leader,.87,[488,150],[465,115],[433,110],5],
      [crown,.39,[534,119],[562,124],[579,99],3.6],
      [trunk,.81,[489,270],[467,234],[447,207],7],
      [leader,.51,[512,194],[540,163],[538,131],5.4],
    ];
    if(stage===6)scaffolds.push([trunk,.58,[466,318],[437,328],[398,276],8],
      [leader,.27,[512,215],[537,232],[565,199],6],
      [trunk,.68,[505,295],[531,307],[550,275],6]);
    const outer: Limb[]=[];
    for(const [parent,t,b,c,d,r] of scaffolds) {
      const main=limb(at(parent,t),b,c,d,r,r*.36);
      branch(main);
      const sign=d[0]<490?-1:1;
      const width=Math.abs(d[0]-490);
      for(let j=0;j<(stage===3?2:4);j++){
        const joint=at(main,.41+.19*j);
        const reach=(32+width*.52)*(.75+rand()*.4);
        const lift=(j%2?18:47)+rand()*24;
        outer.push(limb(joint,[joint[0]+sign*reach*.4,joint[1]-3],
          [joint[0]+sign*reach*.53,joint[1]-lift*1.15],
          [joint[0]+sign*reach,joint[1]-lift],r*(.39-.035*j),.55));
      }
    }
    outer.push(crown);
    for(const b of outer)shoot(b,depth,.39+(310-b.d[1])*.00085+rand()*.19,b.d[0]>490?1:-1);
  }
  return {wood:new Float32Array(wood),leaves:new Float32Array(leaves),clusters:new Float32Array(clusters),limbs,scale};
}
export function meadow() {
  const rand=randomStream(382);
  const blades:number[]=[];
  for(let i=0;i<1900;i++){
    const x=rand()*1000, y=449+rand()*117;
    const near=(y-447)/117;
    const flowers=rand()<.093;
    for(let j=0;j<3;j++) {
      blades.push(x+rand()*3,y+rand()*1.6,(2+near*(4+rand()*9))*(flowers?.67:1),
        -1.55+(rand()-.5)*1.26,rand()*6.28,.42+rand()*.43,rand(),flowers&&j===1?2:1);
    }
  }
  return new Float32Array(blades);
}
