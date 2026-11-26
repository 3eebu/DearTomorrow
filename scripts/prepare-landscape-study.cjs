// Build the experiment's transparent texture plates from the approved painting.
// Run from the repository root. Nothing reads or writes the production compositor.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const dest = 'src/app/memory-tree/experiment/art';
const clamp = (v,min=0,max=1) => Math.min(max, Math.max(min,v));
function ramp(v,a,b) {
  const t=clamp((v-a)/(b-a));
  return t*t*(3-2*t);
}
function interp(points,x) {
  const i=points.findIndex(([a])=>a>=x);
  if(i<=0) return points[i<0?points.length-1:0][1];
  const [a,b]=points[i-1], [c,d]=points[i];
  return b+(d-b)*(x-a)/(c-a);
}
async function generate(){
  const {data,info}=await sharp('public/memory-tree/environment/master.webp').removeAlpha().raw().toBuffer({resolveWithObject:true});
  const s=info.width/1000, sy=info.height/563;
  function rgb(x,y){
    const j=(clamp(Math.round(y*sy),0,info.height-1)*info.width+clamp(Math.round(x*s),0,info.width-1))*3;
    return [data[j],data[j+1],data[j+2]];
  }
  async function plate(name, w,h, pixel) {
    const width=Math.round(w*s),height=Math.round(h*sy),out=Buffer.alloc(width*height*4);
    for(let j=0;j<height;j++)for(let i=0;i<width;i++){
      const c=pixel(i/s,j/sy);
      for(let k=0;k<4;k++)out[4*(j*width+i)+k]=clamp(c[k],0,255);
    }
    await sharp(out,{raw:{width,height,channels:4}}).webp({quality:94,alphaQuality:100}).toFile(path.join(dest,name+'.webp'));
  }
  await fs.mkdir(dest,{recursive:true});
  const ridge=[[0,368],[21,369],[37,373],[66,370],[111,385],[140,378],[164,385],[199,384],[229,395],[257,386],[281,389],[317,380],[344,386],[369,384],[633,358],[679,349],[721,342],[755,330],[794,308],[821,295],[846,286],[875,273],[906,258],[930,269],[957,270],[980,281],[1000,284]];
  // Across the former trunk blend two *clear* pieces of the foothills. Preserve
  // the right-hand summit and the outer quarter of the meadow pixel for pixel.
  await plate('foothills',1000,315,(x,v)=>{
    const y=v+248;
    const left=x<230?x:230+(x-230)*.33;
    const right=x>775?x:775+(x-775)*.35;
    const weight=ramp(x+Math.sin(y*.043)*14,442,559);
    const ridgeLeft=interp(ridge,left),ridgeRight=interp(ridge,right);
    const skyline=ridgeLeft+(ridgeRight-ridgeLeft)*ramp(x,419,586);
    const heightCorrection=1-ramp(y,skyline,433);
    const a=rgb(left,y+(ridgeLeft-skyline)*heightCorrection);
    const b=rgb(right,y+(ridgeRight-skyline)*heightCorrection);
    // Erase the old tree's baked shadow from the central strip. The GPU casts
    // the prototype's current shadow onto sunny meadow of the same depth.
    const replaceShadow=ramp(x,370,480)*(1-ramp(x,675,814))*ramp(y,454,477)*(1-ramp(y,500,522));
    const sunlit=rgb(133+(x%190),y);
    const foreground=ramp(y,490,513), original=rgb(x,y);
    return [...a.map((c,k)=>{
      const mapped=original[k]*foreground+(1-foreground)*(c*(1-weight)+b[k]*weight);
      return mapped*(1-replaceShadow)+sunlit[k]*replaceShadow;
    }),255*ramp(y,skyline-.7,skyline+1)];
  });
  // Key painted blue out of each cloud, keeping its original internal strokes.
  async function cloud(name,box,edge){
    const [ox,oy,w,h]=box;
    await plate(name,w,h,(u,v)=>{
      const [r,g,b]=rgb(ox+u,oy+v);
      const luminance=ramp(r,112,202);
      const matte=ramp(r-b,-77,-13)*(.50+.50*luminance);
      return [r,g,b,255*matte*edge(u,v)*ramp(Math.min(u,w-u),0,9)*ramp(Math.min(v,h-v),0,6)];
    });
  }
  await cloud('cumulus',[0,0,307,235],(u,v)=>1-ramp(v,interp([[0,213],[93,206],[160,192],[206,147],[256,109],[307,89]],u)-7,interp([[0,213],[93,206],[160,192],[206,147],[256,109],[307,89]],u)+4));
  await cloud('cirrus',[663,0,337,189],(u,v)=>(1-ramp(v,105+u*.51,128+u*.52))*(1-ramp(v,154,189))*(1-ramp(u,310,332)*ramp(v,126,154)));
  await cloud('horizon',[0,263,173,97],(u,v)=>(1-ramp(u,143,173))*ramp(v,6,20));
  // Choose different *edge* sprays from the original crown. The pigment key
  // retains irregular individual leaf marks rather than a rectangular stamp.
  const sprays=[[238,226],[343,178],[396,125],[478,77],[669,181],[755,227],[697,308],[546,245]];
  const tile=52;
  await plate('sprays',tile*4,tile*2,(x,y)=>{
    const k=Math.min(3,Math.floor(x/tile))+4*Math.min(1,Math.floor(y/tile));
    const u=x%tile/tile*2-1,v=y%tile/tile*2-1;
    const [cx,cy]=sprays[k];
    const [r,g,b]=rgb(cx+u*24,cy+v*19);
    const a=Math.atan2(v,u),rad=Math.hypot(u,v);
    const boundary=.85+.09*Math.sin(5*a+k)+.06*Math.cos(9*a+2*k);
    const pigment=ramp(g-b,4,34)*(1-ramp(r-g,59,99));
    return [r,g,b,255*pigment*(1-ramp(rad,boundary-.21,boundary))];
  });
  // A UV-mapped bark study preserves the master painter's knot and buttress
  // detail on the central bole. Thin branches, foliage and their wind are live.
  const outline=[[360,483],[393,473],[428,456],[447,443],[453,428],[458,405],[460,380],[459,356],[451,343],[437,335],[415,327],[396,321],[392,313],[408,307],[429,312],[452,320],[467,328],[462,306],[450,285],[432,270],[426,259],[444,266],[468,281],[480,299],[479,269],[474,250],[481,242],[498,260],[506,285],[527,274],[546,270],[538,285],[521,304],[517,326],[552,314],[573,313],[588,304],[601,302],[592,314],[574,323],[551,327],[534,339],[526,355],[523,381],[523,407],[527,433],[537,448],[555,457],[586,468],[611,475],[591,478],[548,476],[533,480],[509,480],[494,486],[479,481],[457,484],[436,481],[411,485],[399,481],[380,485]];
  function inside(x,y){
    let hit=false;
    for(let i=0,j=outline.length-1;i<outline.length;j=i++){
      const [a,b]=outline[i],[c,d]=outline[j];
      if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
    }
    return hit;
  }
  await plate('bole',260,250,(u,v)=>{
    const x=u+355,y=v+238;
    let alpha=0;
    for(const dx of [-.55,.55])for(const dy of [-.55,.55])if(inside(x+dx,y+dy))alpha+=.25;
    const [r,g,b]=rgb(x,y);
    const taper=ramp(y,315+Math.abs(x-486)*.65,361+Math.abs(x-486)*.29);
    return [r,g,b,255*alpha*taper*(1-ramp(y,477,489))];
  });
}
generate().catch(e=>{console.error(e);process.exitCode=1;});
