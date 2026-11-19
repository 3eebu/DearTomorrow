
import { add, cross, mix, mul, sub, unit, STRIDE, type Model, type V } from './memory-tree-geometry';

const vertexSource = `
attribute vec3 position,normal,color,pivot;
attribute vec2 uv;
attribute float identity,kind,shoot;
uniform vec3 eye,right,up,look;
uniform vec2 lens,pickOffset,pickScale;
uniform float picking,time,growing,growth,oldHeight,newHeight,oldWidth,newWidth;
varying vec3 tint,world,n;
varying vec2 tex;
varying float id,material;
void main(){
 vec3 p=position;
 float scale=1.;
 if (kind==5. && growing<0.) p.y+=.10*(1.-smoothstep(0.,.80,growth));
 if (growing>0. && kind==7.) {
   float height=mix(oldHeight,newHeight,smoothstep(0.,.43,growth));
   p.y=min(p.y,height);
   p.xz=mix(pivot.xz,p.xz,mix(max(.16,oldWidth/newWidth),1.,smoothstep(.0,.62,growth)));
 }
 if (growing>0. && shoot==growing) p=mix(pivot,p,smoothstep(.04,.42,growth));
 bool foliage=kind==1. || kind==6. || kind==8.;
 if (identity==growing && growing>0. && kind!=0.){
   scale=kind==2.?smoothstep(.34,.71,growth):smoothstep(.56,.99,growth);
   p=mix(pivot,p,scale);
   if (foliage) p+=normal*sin(scale*3.14159)*.060*uv.y;
 }
 if (time>0. && (foliage || kind==2.)) {
   float phase=identity*.47+pivot.y*.38;
   float motion=sin(time*.92+phase)+.33*sin(time*1.72+phase*1.8);
   float amplitude=kind==2.?smoothstep(0.,1.,uv.y):1.+.64*uv.y;
   p+=vec3(.010,.008,-.005)*motion*scale*amplitude;
 }
 vec3 d=p-eye;
 float depth=dot(d,look);
 gl_Position=vec4(dot(d,right)*lens.x,dot(d,up)*lens.y,depth*1.0002-.020002,depth);
 if(picking>.5) gl_Position.xy=(gl_Position.xy-pickOffset*depth)*pickScale;
 tint=color;world=p;n=normal;tex=uv;id=identity;material=kind;
}`;

const fragmentSource = `
precision highp float;
varying vec3 tint,world,n;
varying vec2 tex;
varying float id,material;
uniform vec3 eye;
uniform float picking,selected,hovered;
void main(){
 float key=floor(id+.5), surface=floor(material+.5);
 if(picking>.5){
   if(surface==3.) discard;
   gl_FragColor=vec4(mod(key,256.),mod(floor(key/256.),256.),floor(key/65536.),255.)/255.;
   return;
 }
 if(surface==3.){
   vec2 ellipse=tex*vec2(1.1,1.0);
   float contact=exp(-dot(ellipse,ellipse)*8.);
   float spread=exp(-dot(ellipse-.15,ellipse-.15)*4.5);
   float edge=1.-smoothstep(.55,1.,length(tex));
   gl_FragColor=vec4(tint,(.17*contact+.11*spread)*edge);
   return;
 }
 vec3 light=normalize(vec3(-.52,.76,.46));
 vec3 fill=normalize(vec3(.72,.48,-.46));
 vec3 view=normalize(eye-world);
 vec3 norm=normalize(n);
 float keyLight=dot(norm,light);
 float fillLight=dot(norm,fill);
 float gloss=0.;
 vec3 color=tint;
 if(surface==1. || surface==8.){
   // Curved secondary veins fork from the midrib and fade toward the margin.
   float flank=abs(tex.x), y=tex.y;
   float rib=1.-smoothstep(.006,.036,flank);
   float ribTint=rib*(.79-.51*y);
   float line=y*7.2-flank*.94+.24*flank*flank+tex.x*.07+.020*sin(y*32.0);
   float veins=1.-smoothstep(.022,.066,abs(fract(line)-.48));
   float fineVeins=1.-smoothstep(.015,.054,abs(fract(line*1.7+flank*.61)-.5));
   float envelope=smoothstep(.06,.24,y)*(1.-smoothstep(.80,.99,y))*(1.-smoothstep(.75,1.,flank));
   float pigment=sin(world.x*321.+world.y*110.)*sin(world.z*229.+world.y*183.);
   color*=.93+.075*sin(y*3.14)+.022*pigment-.11*pow(flank,2.3);
   color+=vec3(.145,.140,.074)*(ribTint+envelope*(.39*veins+.10*fineVeins));
   float facing=dot(norm,view);
   vec3 visibleNormal=norm*(facing<0.?-1.:1.);
   float transmitted=.13*max(0.,-dot(visibleNormal,light));
   gloss=.050*pow(max(0.,dot(visibleNormal,normalize(view+light))),13.);
   color*=.84+.18*abs(keyLight)+.055*abs(fillLight)+transmitted;
   color+=vec3(.08,.070,.033)*transmitted;
   if(surface==8.) color*=.76;
 } else if(surface==6.){
   color*=.89+.13*abs(keyLight)+.04*abs(fillLight);
   color+=vec3(.045,.018,.015)*tex.x;
 } else {
   // Angular grooves follow the length of the wood through each bend.
   float angle=tex.x*6.283185;
   float grain=sin(angle*18.+1.7*sin(tex.y*4.4+angle*5.)+.62*sin(tex.y*13.+angle*8.));
   float fibers=sin(angle*41.+tex.y*3.4+sin(tex.y*9.+angle*7.));
   float groove=smoothstep(.18,1.,grain);
   color*=.94-.12*groove+.028*fibers+.025*sin(tex.y*5.0+angle*3.);
   float rootShade=surface==0. || surface==7. || surface==9.?smoothstep(-.03,.34,world.y):1.;
   color*=.79+.29*max(0.,keyLight)+.09*max(0.,fillLight)-.095*(1.-rootShade);
   gloss=.085*pow(max(0.,dot(norm,normalize(view+light))),16.)*(1.-groove*.8);
 }
 color+=vec3(1.,.91,.80)*gloss;
 if(key>.5 && (key==selected || key==hovered)){
   color=mix(color,vec3(.82,.68,.38),key==hovered?.22:.26);
 }
 gl_FragColor=vec4(color,1.);
}`;

export type Camera = { target: V; yaw: number; pitch: number; distance: number };
const homeAngle = { yaw: .24, pitch: .18 };
export function makeRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!context) throw new Error('3D graphics are unavailable here.');
  const gl: WebGLRenderingContext = context;
  function shader(type: number, source: string) {
    const item = gl.createShader(type)!;
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(item);
      gl.deleteShader(item);
      throw Error(message || 'Shader compilation failed.');
    }
    return item;
  }
  const program = gl.createProgram()!;
  const shaders = [shader(gl.VERTEX_SHADER, vertexSource),shader(gl.FRAGMENT_SHADER, fragmentSource)];
  shaders.forEach(item=>gl.attachShader(program,item));
  gl.linkProgram(program);
  shaders.forEach(item=>gl.deleteShader(item));
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Unable to link the Memory Tree renderer.');

  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.DITHER);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  let offset = 0;
  for (const [name,size] of [['position',3],['normal',3],['color',3],['uv',2],['pivot',3],['identity',1],['kind',1],['shoot',1]] as const) {
    const loc = gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,size,gl.FLOAT,false,STRIDE*4,offset*4);
    offset += size;
  }
  const uniforms = Object.fromEntries('eye right up look lens pickOffset pickScale time growing growth picking selected hovered oldHeight newHeight oldWidth newWidth'.split(' ')
    .map(name=>[name,gl.getUniformLocation(program,name)]));
  const pickFrame = gl.createFramebuffer(), pickColor = gl.createTexture(), pickDepth = gl.createRenderbuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,pickFrame);
  gl.bindTexture(gl.TEXTURE_2D,pickColor);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.bindRenderbuffer(gl.RENDERBUFFER,pickDepth);
  gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,1,1);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,pickColor,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,pickDepth);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);

  let model: Model;
  let camera: Camera = { target:[0,0,0],...homeAngle,distance:4 }, goal = camera;
  let selected = 0, hovered = 0, growing = 0, growth = 1, time = 0, oldHeight = 0, oldWidth = 0, dirty = true, fitted = true;
  const float = (key: string, value: number) => gl.uniform1f(uniforms[key],value);
  const clamp = (v: number, a: number, b: number) => Math.max(a,Math.min(b,v));
  function basis(pose: Camera) {
    const back: V = [Math.cos(pose.pitch)*Math.sin(pose.yaw),Math.sin(pose.pitch),Math.cos(pose.pitch)*Math.cos(pose.yaw)];
    const right = unit(cross([0,1,0],back));
    return { back,right,up:cross(back,right) };
  }
  function paint(pick = false) {
    const { back,right,up } = basis(camera);
    gl.uniform3fv(uniforms.eye,add(camera.target,mul(back,camera.distance)));
    gl.uniform3fv(uniforms.look,mul(back,-1));
    gl.uniform3fv(uniforms.right,right);
    gl.uniform3fv(uniforms.up,up);
    gl.uniform2f(uniforms.lens,2.6*canvas.height/canvas.width,2.6);
    float('picking',Number(pick));
    float('time',time);float('growing',growing);float('growth',growth);
    float('selected',selected);float('hovered',hovered);
    float('oldHeight',oldHeight);float('newHeight',model.trunkHeight);
    float('oldWidth',oldWidth);float('newWidth',model.trunkRadius);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,pick?6:0,model.vertices.length/STRIDE-(pick?6:0));
  }
  function fit(instant = false) {
    if (!model) return;
    const aspect = canvas.width/canvas.height;
    const distance = Math.max(model.leaves.size ? 3.6 : 1.75,model.heightRadius*3.50,
      model.widthRadius*(aspect<1.1 ? 2.81 : 3.06)/aspect);
    goal = {...goal,target:model.center,distance};
    if (instant) camera = goal;
    fitted = true; dirty = true;
  }
  return {
    update(next: Model, reset: boolean) {
      oldHeight = reset ? 0 : model?.trunkHeight ?? 0;
      oldWidth = reset ? 0 : model?.trunkRadius ?? 0;
      model = next;
      gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
      if (fitted || reset) fit(reset);
      dirty = true;
    },
    resize() {
      if (!canvas.clientWidth || !canvas.clientHeight) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      const width = Math.max(1,Math.round(canvas.clientWidth*dpr)), height = Math.max(1,Math.round(canvas.clientHeight*dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width; canvas.height = height;
      gl.viewport(0,0,width,height);
      if (fitted) fit(true);
      dirty = true;
    },
    fit,
    reset() { goal = {...goal,...homeAngle};fit(); },
    orbit(dx:number,dy:number) { goal = {...goal,yaw:goal.yaw+dx,pitch:clamp(goal.pitch+dy,-.10,1.50)};dirty=true; },
    pan(dx:number,dy:number) {
      const b=basis(goal), k=goal.distance*.76/canvas.clientHeight;
      goal={...goal,target:add(goal.target,add(mul(b.right,-dx*k),mul(b.up,dy*k)))};
      fitted=false;dirty=true;
    },
    zoom(factor:number) {
      goal={...goal,distance:clamp(goal.distance*factor,.30,Math.max(15,model.radius*9))};
      fitted=false;dirty=true;
    },
    focus(point:V) {
      goal={...goal,target:point,distance:Math.max(.84,Math.min(3.7,model.radius*.69))};
      fitted=false;dirty=true;
    },
    pose() { return {...goal}; },
    restore(pose:Camera) { goal=pose;fitted=pose.target===model.center;dirty=true; },
    select(id:number) { selected=id;dirty=true; },
    hover(id:number) { if(hovered!==id){hovered=id;dirty=true;} },
    growth(id:number,progress:number) { growing=id;growth=progress;dirty=true; },
    tick(now:number,motion:boolean,snap:boolean) {
      if (!model) return;
      const k=snap?1:.26;
      const delta=Math.abs(goal.yaw-camera.yaw)+Math.abs(goal.pitch-camera.pitch)+Math.abs(goal.distance-camera.distance)+Math.hypot(...sub(goal.target,camera.target));
      if (!dirty && !motion && delta<.0001) return;
      camera={target:mix(camera.target,goal.target,k),yaw:camera.yaw+(goal.yaw-camera.yaw)*k,
        pitch:camera.pitch+(goal.pitch-camera.pitch)*k,distance:camera.distance+(goal.distance-camera.distance)*k};
      if (motion) time=now*.001;
      paint();dirty=false;
    },
    pick(x:number,y:number) {
      if (!model) return 0;
      const rect=canvas.getBoundingClientRect(), pixels=new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER,pickFrame);gl.viewport(0,0,1,1);
      gl.uniform2f(uniforms.pickOffset,(x-rect.left)/rect.width*2-1,(rect.bottom-y)/rect.height*2-1);
      gl.uniform2f(uniforms.pickScale,canvas.width,canvas.height);
      paint(true);
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
      return pixels[0]+pixels[1]*256+pixels[2]*65536;
    },
    dispose() {
      gl.deleteBuffer(buffer);gl.deleteFramebuffer(pickFrame);gl.deleteTexture(pickColor);
      gl.deleteRenderbuffer(pickDepth);gl.deleteProgram(program);
    }
  };
}
export type TreeRenderer = ReturnType<typeof makeRenderer>;
