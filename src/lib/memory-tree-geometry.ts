import { activeSeason, dayNumber, type Tree, type Memory, type Species } from './memory-tree';

export type V = [number, number, number];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V, n: number): V => [a[0] * n, a[1] * n, a[2] * n];
export const mix = (a: V, b: V, t: number) => add(a, mul(sub(b, a), t));
export const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a: V): V => mul(a, 1 / (Math.hypot(...a) || 1));
const dot = (a: V, b: V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const radial = (angle: number, radius: number, y: number): V => [Math.cos(angle)*radius,y,Math.sin(angle)*radius];
const up: V = [0,1,0], origin: V = [0,0,0];
const tau = 2*Math.PI;
const fraction = (v: number) => v-Math.floor(v);
export const BRANCH = 2_000_000;
export const STRIDE = 17;

function noise(seed: number, slot: number, channel: number) {
  let n = (seed ^ Math.imul(slot+11,374761393) ^ Math.imul(channel+5,668265263)) >>> 0;
  n = Math.imul(n ^ (n>>>15),2246822519);
  return ((n ^ (n>>>13))>>>0)/4294967296;
}
const seasonColors: Record<ReturnType<typeof activeSeason>,V[]> = {
  spring: [[.60,.69,.29],[.47,.60,.24],[.39,.53,.22],[.49,.53,.23],[.63,.52,.24]],
  summer: [[.53,.67,.27],[.43,.58,.23],[.36,.52,.22],[.47,.51,.23],[.61,.49,.24]],
  autumn: [[.65,.69,.31],[.52,.61,.25],[.53,.55,.25],[.60,.48,.22],[.72,.48,.23]],
  winter: [[.61,.67,.41],[.51,.59,.34],[.44,.52,.30],[.49,.51,.32],[.63,.50,.34]],
};
export function leafColor(date: string, today: string, season: ReturnType<typeof activeSeason>, species: Species): V {
  const days = Math.max(0,dayNumber(today)-dayNumber(date));
  const age = Math.min(4,Math.log1p(days/50)*1.10);
  const step = Math.floor(age), palette = seasonColors[season];
  const base = mix(palette[step],palette[Math.min(4,step+1)],age-step);
  return species==='willow'?add(base,[-.04,.015,.035]):species==='oak'?add(base,[.018,-.018,-.018]):base;
}

export type LeafSite = { id: string; pick: number; tip: V; attach: V };
type LeafDetail = { pick:number; center:V; overviewStart:number; overviewEnd:number; detailStart:number; detailEnd:number };
export type Model = {
  vertices: Float32Array; indices: Uint32Array; overview: Uint32Array | null;
  leafDetails: LeafDetail[];
  leaves: Map<number,LeafSite>; branches: Map<number,{id:string;point:V}>;
  center: V; radius: number; widthRadius: number; heightRadius: number; trunkHeight: number; trunkRadius: number;
};

type Limb = { key:number; height:number; reach:number; rise:number; angle:number; sweep:number; fork?: {parent:number; join:number} };
type Site = { memory:Memory; limb:Limb|null; ordinal:number; t:number };
type LimbGroup = { limb:Limb; end:number; sites:Site[]; supports:boolean };
type Path = (t: number)=>V;
const cubic = (a:V,b:V,c:V,d:V,t:number):V => {
  const s=1-t;
  return add(add(mul(a,s*s*s),mul(b,3*s*s*t)),add(mul(c,3*s*t*t),mul(d,t*t*t)));
};

// The primary limbs trace a low, open bowl and turn upwards into an asymmetric crown.
const mainLimbs = [
  [2,.46,.59,.45,3.53,.26],[4,.62,.85,.67,.22,-.21],[7,.85,1.43,.83,2.92,.38],
  [10,1.04,1.79,.72,.16,-.29],[13,1.21,1.44,1.08,4.28,-.27],[16,1.27,1.88,.91,2.84,.39],
  [19,1.52,1.77,.95,.80,-.38],[22,1.65,1.71,1.33,3.81,-.25],[25,1.91,1.49,1.32,5.72,.34],
  [28,2.15,1.32,1.48,2.40,.29],[31,2.29,.86,1.58,.57,-.39],[35,2.53,1.28,1.55,4.73,.23],
  [40,2.77,.93,1.39,2.79,.37],[45,3.02,.74,1.58,6.14,-.35],
];
const attachments=[.82,.54,.985,.69,.37];
const sideFamilies=[3,5,6,2,7,8,4,9,10,11,12,13];
function primary(key:number): Limb {
  const [,height,reach,rise,angle,sweep]=mainLimbs[key];
  return {key,height,reach,rise,angle,sweep};
}
function placement(slot:number): {limb:Limb|null; ordinal:number;t:number} {
  if(slot<2)return {limb:null,ordinal:slot,t:0};
  if(slot<50){
    const next=mainLimbs.findIndex(limb=>limb[0]>slot);
    const key=(next<0?mainLimbs.length:next)-1;
    const ordinal=slot-mainLimbs[key][0];
    return {limb:primary(key),ordinal,t:attachments[ordinal]};
  }
  const extra=slot-50;
  const tier=Math.floor(Math.log2(1+extra/54));
  const offset=extra-54*(2**tier-1);
  const families=Math.min(12,8+tier*2);
  const branch=offset%families, ordinal=Math.floor(offset/families);
  const parent=sideFamilies[(branch+tier*5)%sideFamilies.length], base=primary(parent);
  const hand=(tier+branch)%2?1:-1;
  const join=.26+.60*fraction((tier+1)*.38197+(branch+1)*.271);
  const layer=(.45+.59*join);
  const limb: Limb={key:mainLimbs.length+tier*12+branch,height:base.height,
    reach:(.72+tier*.14)*layer,rise:(.48+tier*.132)*(.94+.22*Math.cos(branch*2.3)),
    angle:base.angle+hand*(.53+.16*(branch%3)),
    sweep:hand*(.23+.13*join),fork:{parent,join}};
  return {limb,ordinal,t:.21+.765*fraction((ordinal+1)*.618033989)};
}

function mesh(capacity:number, reduced:boolean) {
  let vertices=new Float32Array(Math.max(4800,capacity*1100));
  let indices=new Uint32Array(Math.max(3600,capacity*198));
  let overview=reduced?new Uint32Array(Math.max(3600,capacity*120)):null;
  let vertexCount=0, indexCount=0, overviewCount=0;
  function vertex(p:V,n:V,tint:V,u:number,v:number,id:number,material:number,pivot:V,shoot:number) {
    const offset=vertexCount*STRIDE;
    if(offset+STRIDE>vertices.length){
      const grown=new Float32Array(Math.ceil(vertices.length*1.55));
      grown.set(vertices);vertices=grown;
    }
    vertices[offset]=p[0];vertices[offset+1]=p[1];vertices[offset+2]=p[2];
    vertices[offset+3]=n[0];vertices[offset+4]=n[1];vertices[offset+5]=n[2];
    vertices[offset+6]=tint[0];vertices[offset+7]=tint[1];vertices[offset+8]=tint[2];
    vertices[offset+9]=u;vertices[offset+10]=v;
    vertices[offset+11]=pivot[0];vertices[offset+12]=pivot[1];vertices[offset+13]=pivot[2];
    vertices[offset+14]=id;vertices[offset+15]=material;vertices[offset+16]=shoot;
    return vertexCount++;
  }
  function face(a:number,b:number,c:number,detail:'both'|'near'|'far'='both') {
    if(detail!=='far'){
      if(indexCount+3>indices.length){
        const grown=new Uint32Array(Math.ceil(indices.length*1.6));
        grown.set(indices);indices=grown;
      }
      indices[indexCount++]=a;indices[indexCount++]=b;indices[indexCount++]=c;
    }
    if(overview&&detail!=='near'){
      if(overviewCount+3>overview.length){
        const grown=new Uint32Array(Math.ceil(overview.length*1.6));
        grown.set(overview);overview=grown;
      }
      overview[overviewCount++]=a;overview[overviewCount++]=b;overview[overviewCount++]=c;
    }
  }
  return {vertex,face,position:()=>({overview:overviewCount,detail:indexCount}),result:()=>({
    vertices:vertices.subarray(0,vertexCount*STRIDE),indices:indices.subarray(0,indexCount),
    overview:overview?.subarray(0,overviewCount)??null,
  })};
}

type TreeShape = Pick<Tree,'seed'|'memories'|'chapters'> &
  {settings:Pick<Tree['settings'],'species'|'season'|'south'>};
export function buildTree(tree:TreeShape,today:string):Model {
  const {seed,memories,settings}=tree, count=memories.length;
  const dense=count>=360;
  const oak=settings.species==='oak', willow=settings.species==='willow';
  const season=activeSeason(settings,today);
  const leaves=new Map<number,LeafSite>(),branches=new Map<number,{id:string;point:V}>();
  const chapters=new Map(tree.chapters.map(c=>[c.id,c.slot]));
  const heading=(noise(seed,1,7)-.5)*.44;
  const stature=oak?1.13:willow?1.04:1;
  const yaw=heading*.72;
  function trunk(height:number):V {
    // Two broad bends carry the eye from the root flare into the fork.
    const base=Math.min(1,height/.79);
    const x=(.378*Math.sin(height*2.46+.12)+.085*Math.sin(height*1.4))*base*base*(3-2*base)
      +.022*height+.037*Math.sin(height*6)*Math.exp(-height*2.1);
    const z=(.185*Math.sin(height*1.99+.46)-.10*Math.sin(height*.91))*Math.min(1,height/.92);
    return [x*Math.cos(yaw)-z*Math.sin(yaw),height*stature,x*Math.sin(yaw)+z*Math.cos(yaw)];
  }
  const limbPaths=new Map<number,Path>();
  function pathFor(limb:Limb):Path {
    const ready=limbPaths.get(limb.key);
    if(ready)return ready;
    const angle=limb.angle+heading+(noise(seed,limb.key,13)-.5)*.17;
    const lower=limb.height<2.2&&limb.height>=.8;
    const reach=limb.reach*(oak?.91:willow?1.18:1)*(lower?1.34:1.10);
    const rise=limb.rise*stature*(willow?.76:1);
    const start=limb.fork?pathFor(primary(limb.fork.parent))(limb.fork.join):trunk(limb.height);
    const a=add(start,radial(angle-limb.sweep*.24,reach*.24,rise*(lower?.47:.63)));
    const b=add(start,radial(angle+limb.sweep*.37,reach*.74,rise*(willow?1.26:.81)));
    const c=add(start,radial(angle+limb.sweep,reach,rise));
    const path=(t:number)=>cubic(start,a,b,c,t);
    limbPaths.set(limb.key,path);
    return path;
  }
  const groups=new Map<number,LimbGroup>();
  function include(limb:Limb,t:number){
    let group=groups.get(limb.key);
    if(!group){group={limb,end:t,sites:[],supports:false};groups.set(limb.key,group);}
    group.end=Math.max(group.end,t);
    return group;
  }
  const sites:Site[]=memories.map(memory=>{
    const site={memory,...placement(memory.slot)};
    const {limb,t}=site;
    if(limb){
      include(limb,t).sites.push(site);
      if(limb.fork)include(primary(limb.fork.parent),limb.fork.join).supports=true;
    }
    return site;
  });
  const trunkEnd=Math.max(.457, ...Array.from(groups.values(),group=>group.limb.height+.15));
  const trunkHeight=trunkEnd*stature;
  const radius=.011+.250*(1-Math.exp(-count/31))+.033*Math.log2(1+count/25);
  const wood:V=oak?[.47,.328,.211]:willow?[.51,.38,.258]:[.49,.350,.232];
  const bark=mix([.40,.444,.252],wood,1-Math.exp(-count/6));
  const twig=mix(bark,[.48,.433,.252],.32);
  const painter=mesh(count,dense);
  const leafDetails:LeafDetail[]=[];
  let width=.28, top=count?trunkHeight:.12;
  const {vertex,face}=painter;
  function sweep(path:Path,radii:(t:number)=>number,segments:number,sides:number,tint:V,id=0,kind=0,pivot=origin,shoot=0) {
    const centers=Array.from({length:segments+1},(_,i)=>path(i/segments));
    const tangents=centers.map((_,i)=>unit(sub(centers[Math.min(segments,i+1)],centers[Math.max(0,i-1)])));
    const startDir=tangents[0];
    let right=unit(cross(startDir,Math.abs(startDir[1])>.88?[1,0,0]:up)), distance=0;
    const rings:V[][]=[];
    const spans:number[]=[];
    for(let i=0;i<=segments;i++){
      const center=centers[i],t=i/segments,dir=tangents[i],r=radii(t);
      if(i)distance+=Math.hypot(...sub(center,centers[i-1]));
      right=unit(sub(right,mul(dir,dot(right,dir))));
      const front=cross(dir,right);
      spans.push(distance);
      const twist=distance*(kind===7?.87:kind===9?.61:.46);
      const fluted=kind===7||kind===9;
      rings.push(Array.from({length:sides},(_,j)=>{
        const angle=j*tau/sides+twist;
        const ridge=fluted?1+.101*Math.sin(angle*3-.8*distance)+.082*Math.sin(angle*5-.98*distance)+
          .046*Math.sin(angle*8+1.3*distance):1+.059*Math.sin(angle*3-.73*distance);
        const offset=mul(add(mul(right,Math.cos(angle)),mul(front,Math.sin(angle))),r*ridge);
        if(kind===9)offset[1]*=.76-.43*t;
        return add(center,offset);
      }));
    }
    const rows=rings.map((ring,i)=>Array.from({length:sides+1},(_,j)=>{
      const col=j%sides, point=ring[col];
      const across=sub(ring[(col+1)%sides],ring[(col+sides-1)%sides]);
      const along=sub(rings[Math.min(segments,i+1)][col],rings[Math.max(0,i-1)][col]);
      const normal=unit(cross(across,along));
      const outside=dot(normal,sub(point,centers[i]))<0?mul(normal,-1):normal;
      return vertex(point,outside,tint,j/sides,kind===2?i/segments:spans[i],id,kind,kind===7?centers[i]:pivot,shoot);
    }));
    for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
      face(rows[i][j],rows[i+1][j],rows[i+1][j+1]);face(rows[i][j],rows[i+1][j+1],rows[i][j+1]);
    }
  }
  // The six shadow indices are first so the picking pass can omit the patch.
  const shadow=count?Math.max(.18,radius*7.65):.26, shade:V=[.39,.32,.239];
  const sh=(x:number,z:number)=>vertex([x*shadow,-.028,z*shadow*.87],up,shade,x,z,0,3,origin,0);
  const sw=sh(-1,-1),nw=sh(-1,1),ne=sh(1,1),se=sh(1,-1);
  face(sw,nw,ne);face(sw,ne,se);
  if(!count){
    sweep(t=>cubic([-.14,-.004,0],[-.069,.03,0],[.052,.042,0],[.15,.07,.013],t),
      t=>.002+.066*Math.sin(Math.PI*t)**.82,12,22,[.535,.351,.208],0,5);
  }else{
    sweep(t=>trunk(trunkEnd*t),t=>radius*((1-t)**.69+.53*Math.exp(-t*trunkHeight*7.2))+.0015,
      Math.max(15,Math.ceil(trunkHeight*10)),count<150?34:26,bark,0,7);
    if(count>4){
      const flare=1-Math.exp(-(count-4)/12);
      for(let i=0;i<5;i++){
        const a=heading+i*tau/5+(noise(seed,i,6)-.5)*.63;
        const reach=radius*(2.64+noise(seed,i,8)*1.84)*(.68+.32*flare);
        const shaft=trunk(.10+.35*flare+noise(seed,i,9)*.12);
        const first=radial(a-.18,radius*.71,.078+radius*.14);
        const bend=radial(a+.38,reach*.83,.051+radius*.09);
        const tip=radial(a+.20,reach,-.006);
        const root=(t:number)=>cubic(shaft,first,bend,tip,t);
        const swell=(t:number)=>1+.18*Math.sin(t*4.9)+.063*Math.sin(t*13+i);
        sweep(root,t=>radius*(.66+.077*(i%3))*Math.sqrt(Math.max(0,1-t**5))*(1-t*.83)*swell(t)+.0007,
          13,18,mix(bark,[.43,.322,.21],.22),0,9);
        if(count>24&&i%2===0){
          const joint=root(.52), turn=a+.77;
          sweep(t=>cubic(joint,add(joint,radial(turn-.25,reach*.24,.019)),radial(turn,reach*.71,.022),
            radial(turn+.20,reach*.79,-.008),t),
            t=>radius*.26*(1-t*.79)*Math.sqrt(Math.max(0,1-t**6))+.0007,9,12,bark,0,9);
        }
      }
    }
  }
  for(const {limb,end,sites:groupSites,supports} of groups.values()){
    const member=groupSites.find(site=>chapters.has(site.memory.chapterId));
    const pick=member?BRANCH+chapters.get(member.memory.chapterId)!:0;
    const path=pathFor(limb), length=Math.min(1.007,end+.014);
    const shoulder=Math.min(radius*(limb.fork?.25:.67),.009+limb.reach*.027+.014*Math.sqrt(groupSites.length));
    const neck=limb.fork?.52:Math.min(.97,.38+.71*(1-limb.height/trunkEnd)**.52);
    sweep(t=>path(t*length), t=>shoulder*(1-t)**1.21*(neck+(1-neck)*Math.min(1,t*8))+.0012,
      dense?10:18,dense?9:17,bark,pick,0,path(0),!supports&&groupSites.length===1?groupSites[0].memory.slot+1:0);
  }

  for(const {memory,limb,t,ordinal} of sites){
    const id=memory.slot+1, rand=(salt:number)=>noise(seed,memory.slot,salt);
    const side=ordinal%2?1:-1;
    const path=limb?pathFor(limb):null;
    const start=path?path(t):trunk(memory.slot===0?.45:.30);
    const tangent=path?unit(sub(path(t+.012),path(t-.012))):unit(radial((memory.slot===0?.25:3.46)+heading,1,.72));
    const azimuth=Math.atan2(tangent[2],tangent[0]);
    const bearing=azimuth+side*(.27+rand(5)*.93);
    const shootLength=limb?Math.min(.35,.10+.12*limb.reach+.10*(1-t)):.067;
    const raise=willow&&limb?-.56:.48+rand(12)*.63;
    const stalk=add(start,radial(bearing,shootLength+(limb?.061:.043),shootLength*raise+.03));
    const b=add(start,mul(tangent,shootLength*.35));
    const c=add(stalk,radial(bearing,-.074,limb&&willow?.039:-.059));
    const shoot=(u:number)=>cubic(start,b,c,stalk,u);
    const twigWidth=.0058+Math.min(.008,(limb?.reach??.23)*.0055);
    sweep(shoot,u=>twigWidth*(1-.78*u),dense?3:6,dense?5:8,twig,id,2,start);
    const chapter=chapters.get(memory.chapterId);
    if(chapter!==undefined){
      const code=BRANCH+chapter;
      if(!branches.has(code)||branches.get(code)!.point[1]<start[1])branches.set(code,{id:memory.chapterId,point:start});
    }
    const leafBearing=bearing+side*(.16+rand(9)*.49);
    const lift=willow&&limb?-.91-rand(11)*.35:limb?-.55+rand(11)*1.31:.64;
    const along=unit(radial(leafBearing,1,lift));
    const crossAxis=radial(leafBearing+Math.PI/2,1,0);
    const tilt=limb?(rand(13)-.5)*1.40+.16:.63;
    const across=unit(add(crossAxis,[0,tilt,0])), normal=unit(cross(across,along));
    const size=limb?.86+.14*Math.min(1,limb.reach):.49;
    const length=(willow?.57:oak?.50:.59)*size*(.81+.34*rand(10))*(limb?.fork?.91:1);
    const breadth=length*(willow?.133:oak?.30:.293)*(.85+.27*rand(15));
    const bend=.105+.085*rand(14), drift=(rand(17)-.5)*.26;
    const bias=(rand(16)-.5)*.15, serration=rand(18)*tau;
    function blade(u:number,v:number):V {
      const belly=Math.pow(Math.max(.0,Math.sin(Math.PI*Math.pow(v,.87))),willow?.75:.86);
      const edge=oak?.84+.16*Math.sin(v*tau*5+.44):1+.026*Math.sin(v*tau*12+serration+u);
      const shift=u*(1+bias*Math.sin(v*4.5))*belly*edge+drift*Math.sin(v*2.6);
      const camber=bend*Math.sin(v*Math.PI)-.18*v*v-.114*u*u*belly;
      const advance=length*v, spread=breadth*shift, arch=length*camber;
      return [
        stalk[0]+along[0]*advance+across[0]*spread+normal[0]*arch,
        stalk[1]+along[1]*advance+across[1]*spread+normal[1]*arch,
        stalk[2]+along[2]*advance+across[2]*spread+normal[2]*arch,
      ];
    }
    const tint=mul(leafColor(memory.date,today,season,settings.species),.89+.22*rand(20));
    const rows=count<150?24:16;
    const steps=[-1,-.54,0,.54,1];
    const positions=Array.from({length:rows+1},(_,i)=>steps.map(u=>blade(u,i/rows)));
    const leafRows=positions.map((row,i)=>row.map((p,j)=>{
      const du=sub(row[Math.min(4,j+1)],row[Math.max(0,j-1)]);
      const dv=sub(positions[Math.min(rows,i+1)][j],positions[Math.max(0,i-1)][j]);
      const n=du.some(value=>value!==0)?unit(cross(du,dv)):normal;
      return vertex(p,n,tint,steps[j],i/rows,id,1,stalk,0);
    }));
    function leafQuads(step:number,crossStep:number,lod:'both'|'near'|'far'){
      for(let i=0;i<rows;i+=step)for(let j=0;j<4;j+=crossStep){
        const a=leafRows[i][j],b=leafRows[i][j+crossStep],c=leafRows[i+step][j+crossStep],d=leafRows[i+step][j];
        face(a,b,c,lod);face(a,c,d,lod);
      }
    }
    const first=painter.position();
    leafQuads(1,1,dense?'near':'both');
    if(dense)leafQuads(4,2,'far');
    for(const j of [0,4]){
      const edgeTint=mul(tint,.84);
      const edge=positions.map((row,i)=>vertex(row[j],normal,edgeTint,steps[j],i/rows,id,8,stalk,0));
      const rim=positions.map((row,i)=>vertex(add(row[j],mul(normal,-length*.006)),normal,edgeTint,steps[j],i/rows,id,8,stalk,0));
      for(let i=0;i<rows;i++){
        face(edge[i],edge[i+1],rim[i+1],'near');face(edge[i],rim[i+1],rim[i],'near');
      }
    }
    const tip=blade(0,.49);
    if(dense){
      const last=painter.position();
      leafDetails.push({pick:id,center:tip,
        overviewStart:first.overview,overviewEnd:last.overview,detailStart:first.detail,detailEnd:last.detail});
    }
    leaves.set(id,{id:memory.id,pick:id,tip,attach:start});
    for(const p of [positions[rows][2],positions[Math.floor(rows*.65)][0],positions[Math.floor(rows*.65)][4],stalk]){
      width=Math.max(width,Math.hypot(p[0],p[2]));
      top=Math.max(top,p[1]);
    }
    if(memory.milestone){
      const size=length*.26;
      const center=add(shoot(.69),radial(leafBearing+.47,size*.38,size*.48));
      const axis=unit(add([0,.62,0],radial(leafBearing+1,.77,0)));
      const x=unit(cross(axis,[0,0,1])), y=cross(axis,x);
      const ivory:V=[.91,.861,.744], pollen:V=[.78,.51,.22];
      const push=(p:V,n:V,tint:V,u:number,v:number)=>vertex(p,n,tint,u,v,id,6,stalk,0);
      const heart=push(add(center,mul(axis,size*.12)),axis,pollen,0,0);
      for(let petal=0;petal<5;petal++){
        const angle=petal*tau/5+leafBearing;
        const outward=add(mul(x,Math.cos(angle)),mul(y,Math.sin(angle)));
        const lateral=cross(axis,outward);
        const base=push(add(center,mul(outward,size*.08)),axis,[.84,.688,.488],0,0);
        const rays=Array.from({length:9},(_,i)=>{
          const q=i/8*Math.PI;
          const p=add(center, add(mul(outward,size*(.44+.54*Math.sin(q))),add(mul(lateral,size*.38*Math.cos(q)),mul(axis,size*(.08+.16*Math.sin(q))))));
          return push(p,unit(add(axis,mul(lateral,.27*Math.cos(q)))),ivory,1,.45+.55*Math.sin(q));
        });
        const cupped=push(add(center,add(mul(outward,.57*size),mul(axis,-.044*size))),axis,ivory,.52,.64);
        face(base,rays[0],cupped);face(base,cupped,rays[8]);
        for(let i=0;i<rays.length-1;i++)face(cupped,rays[i],rays[i+1]);
        const dust=push(add(center,add(mul(outward,size*.16),mul(axis,size*.14))),axis,pollen,.15,0);
        const dotTip=push(add(center,add(mul(outward,size*.18),mul(lateral,size*.09))),axis,pollen,.15,0);
        face(heart,dust,dotTip);
      }
    }
  }
  const heightRadius=Math.max(.25,(top+.037)*.5);
  return {...painter.result(),leafDetails,leaves,branches,center:[.04,(top-.025)*.5,0],
    radius:Math.hypot(width,heightRadius),widthRadius:width,heightRadius,
    trunkHeight:count?trunkHeight:0,trunkRadius:count?radius:0};
}
