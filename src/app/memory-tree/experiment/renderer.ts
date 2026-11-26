import * as shader from './shaders';
import { grow, meadow } from './botany';
import foothills from './art/foothills.webp';
import cumulus from './art/cumulus.webp';
import cirrus from './art/cirrus.webp';
import horizon from './art/horizon.webp';
import sprays from './art/sprays.webp';
import bole from './art/bole.webp';

export type TimeOfDay = 'Daylight' | 'Sunset' | 'Night';
export type StudyOptions = { stage: number; lighting: TimeOfDay; paused: boolean };
export type Measurements = { leaves: number; clusters:number; limbs: number; grass: number; width: number; height: number; median: number; p95: number; calls: number };

export async function startScene(canvas: HTMLCanvasElement, options: () => StudyOptions,
  report: (m: Measurements) => void, signal: AbortSignal) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL 2 unavailable');
  const dispose: (()=>void)[] = [];
  function release() { for (const fn of dispose.splice(0).reverse()) fn(); }
  signal.addEventListener('abort', release, {once: true});
  try {
    const urls = ['/memory-tree/environment/master.webp', foothills.src, cumulus.src, cirrus.src, horizon.src, sprays.src, bole.src];
    const pictures = await Promise.all(urls.map(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    }));
    if (signal.aborted) return;
    const textures = pictures.map(image => {
      const tex=gl.createTexture()!;
      dispose.push(()=>gl.deleteTexture(tex));
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      return tex;
    });
    function program(vs:string, fs:string) {
      const ctx=gl!;
      const handle=ctx.createProgram()!;
      dispose.push(()=>ctx.deleteProgram(handle));
      for (const [type,source] of [[ctx.VERTEX_SHADER,vs],[ctx.FRAGMENT_SHADER,fs]] as const) {
        const object=ctx.createShader(type)!;
        ctx.shaderSource(object, '#version 300 es\nprecision highp float;\n'+source);
        ctx.compileShader(object);
        if(!ctx.getShaderParameter(object,ctx.COMPILE_STATUS)) {
          const message=ctx.getShaderInfoLog(object);
          ctx.deleteShader(object);
          throw new Error(message || 'Shader compilation failed');
        }
        ctx.attachShader(handle,object);
        ctx.deleteShader(object);
      }
      ctx.linkProgram(handle);
      if(!ctx.getProgramParameter(handle,ctx.LINK_STATUS)) throw new Error(ctx.getProgramInfoLog(handle)||'Program link failed');
      const u:Record<string,WebGLUniformLocation|null>={};
      for(const key of ['frame','time','age','light','rect','drift','material'])u[key]=ctx.getUniformLocation(handle,key);
      return {handle,u};
    }
    const sky=program(shader.skyVertex,shader.skyFrag), plate=program(shader.landscapeVertex,shader.plateFrag);
    const bark=program(shader.woodVertex,shader.woodFrag), leaf=program(shader.leafVertex,shader.leafFrag);
    const foliage=program(shader.sprayVertex,shader.sprayFrag);
    function buffer(data?:Float32Array) {
      const b=gl!.createBuffer()!;
      dispose.push(()=>gl!.deleteBuffer(b));
      gl!.bindBuffer(gl!.ARRAY_BUFFER,b);
      if(data)gl!.bufferData(gl!.ARRAY_BUFFER,data,gl!.STATIC_DRAW);
      return b;
    }
    const unit=buffer(new Float32Array([0,0,1,0,0,1, 0,1,1,0,1,1]));
    const woodBuffer=buffer(), leafBuffer=buffer(), blades=meadow(), grassBuffer=buffer(blades);
    const tuftBuffer=buffer();
    type Attribute=[WebGLBuffer,number,number,number,number,number];
    function vao(attributes:Attribute[]){
      const result=gl!.createVertexArray()!;
      dispose.push(()=>gl!.deleteVertexArray(result));
      gl!.bindVertexArray(result);
      for(const [b,loc,size,stride,offset,divisor] of attributes){
        gl!.bindBuffer(gl!.ARRAY_BUFFER,b);
        gl!.enableVertexAttribArray(loc);
        gl!.vertexAttribPointer(loc,size,gl!.FLOAT,false,stride*4,offset*4);
        gl!.vertexAttribDivisor(loc,divisor);
      }
      return result;
    }
    const corners:Attribute=[unit,0,2,2,0,0];
    const quad=vao([corners]);
    const wood=vao([[woodBuffer,0,2,6,0,0],[woodBuffer,1,4,6,2,0]]);
    const instances=(b:WebGLBuffer)=>vao([corners,[b,1,4,8,0,1],[b,2,4,8,4,1]]);
    const crown=instances(leafBuffer), meadowVAO=instances(grassBuffer);
    const tufts=instances(tuftBuffer);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let inView=true, stage=-1, woodCount=0, leaves=0, clusters=0, limbs=0, scale=1;
    let simulation=0, amber=0, blue=0, previous=0, raf=0, lastReport=0;
    let intervals:number[]=[];
    function refreshSize(){
      const box=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio,1.5,1800/Math.max(box.width,1));
      canvas.width=Math.max(1,Math.round(box.width*dpr));
      canvas.height=Math.max(1,Math.round(box.height*dpr));
    }
    refreshSize();
    function render(now:number){
      raf=0;
      if (signal.aborted || document.hidden || !inView || gl!.isContextLost()) { previous=0; return; }
      const state=options();
      const delta=previous?now-previous:0;
      previous=now;
      if(stage!==state.stage) {
        stage=state.stage;
        const tree=grow(stage);
        gl!.bindBuffer(gl!.ARRAY_BUFFER,woodBuffer);
        gl!.bufferData(gl!.ARRAY_BUFFER,tree.wood,gl!.STATIC_DRAW);
        gl!.bindBuffer(gl!.ARRAY_BUFFER,leafBuffer);
        gl!.bufferData(gl!.ARRAY_BUFFER,tree.leaves,gl!.STATIC_DRAW);
        gl!.bindBuffer(gl!.ARRAY_BUFFER,tuftBuffer);
        gl!.bufferData(gl!.ARRAY_BUFFER,tree.clusters,gl!.STATIC_DRAW);
        clusters=tree.clusters.length/8;
        woodCount=tree.wood.length/6; leaves=tree.leaves.length/8; limbs=tree.limbs; scale=tree.scale;
        lastReport=0; intervals=[];
      }
      const still=state.paused || motion.matches;
      if(!still)simulation+=Math.min(delta,150)/1000;
      const tween=still || !delta ? 1 : 1-Math.exp(-Math.min(delta,200)*.0034);
      amber+=(Number(state.lighting==='Sunset')-amber)*tween;
      blue+=(Number(state.lighting==='Night')-blue)*tween;
      gl!.viewport(0,0,canvas.width,canvas.height);
      function bindProgram(p:typeof sky, geometry:WebGLVertexArrayObject) {
        gl!.useProgram(p.handle);gl!.bindVertexArray(geometry);
        gl!.uniform2f(p.u.frame,canvas.width,canvas.height);
        gl!.uniform2f(p.u.light,amber,blue);
        gl!.uniform1f(p.u.time,simulation);gl!.uniform1f(p.u.age,scale);
      }
      const texture=(n:number)=>gl!.bindTexture(gl!.TEXTURE_2D,textures[n]);
      bindProgram(sky,quad);texture(0);
      gl!.drawArrays(gl!.TRIANGLES,0,6);
      bindProgram(plate,quad);
      let calls=1;
      function drawPlate(n:number,x:number,y:number,w:number,h:number,speed:number){
        const origin=speed?((x+500-simulation*speed)%2100+2100)%2100-500:x;
        if(origin>1000 || origin+w<0)return;
        texture(n);
        gl!.uniform1i(plate.u.material,speed?1:0);
        gl!.uniform4f(plate.u.rect,x,y,w,h);gl!.uniform1f(plate.u.drift,speed);
        gl!.drawArrays(gl!.TRIANGLES,0,6); calls++;
      }
      for(const offset of [0,1050]){
        drawPlate(4,offset+12,257,285,123,.42);
        drawPlate(4,offset+648,223,395,141,.51);
        drawPlate(3,offset+603,-3,419,190,1.95);
        drawPlate(2,offset-29,-7,426,276,2.60);
      }
      drawPlate(1,0,248,1000,315,0);
      bindProgram(bark,wood);texture(0);gl!.drawArrays(gl!.TRIANGLES,0,woodCount);
      if(stage>=3){
        bindProgram(plate,quad);
        drawPlate(6,490+(355-490)*scale,481+(238-481)*scale,260*scale,250*scale,0);
        bindProgram(foliage,tufts);texture(5);
        gl!.drawArraysInstanced(gl!.TRIANGLES,0,6,clusters);
        calls++;
      }
      bindProgram(leaf,crown);gl!.drawArraysInstanced(gl!.TRIANGLES,0,6,leaves);
      gl!.bindVertexArray(meadowVAO);gl!.drawArraysInstanced(gl!.TRIANGLES,0,6,blades.length/8);
      calls+=3;
      if(!still && delta>0)intervals.push(delta);
      if(now-lastReport>1000 || lastReport===0){
        const sorted=intervals.sort((a,b)=>a-b);
        report({leaves,clusters,limbs,grass:blades.length/8,width:canvas.width,height:canvas.height,
          median:sorted[Math.floor(sorted.length*.5)]||0,p95:sorted[Math.floor(sorted.length*.95)]||0,calls});
        intervals=[]; lastReport=now;
      }
      if(!still)raf=requestAnimationFrame(render);
    }
    function wake(){ if(!raf && !signal.aborted)raf=requestAnimationFrame(render); }
    const resize=new ResizeObserver(()=>{refreshSize();wake();});
    const intersection=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting; if(inView){previous=0;wake();}});
    resize.observe(canvas);intersection.observe(canvas);
    document.addEventListener('visibilitychange',wake);
    motion.addEventListener('change',wake);
    canvas.addEventListener('studychange',wake);
    dispose.push(()=>{
      cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();
      document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);
      canvas.removeEventListener('studychange',wake);
    });
    wake();
  } catch (error) {release();throw error;}
}
