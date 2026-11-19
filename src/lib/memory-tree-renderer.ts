import { add, cross, mix, mul, sub, unit, STRIDE, type Model, type V } from './memory-tree-geometry';
import type { Garden } from './memory-tree';

const vertexSource = `
attribute vec3 position,normal,color,pivot;
attribute vec2 uv;
attribute float identity,kind;
uniform vec3 eye,right,up,look;
uniform vec2 lens,pickOffset,pickScale;
uniform float picking;
uniform float time, growing, growth, scene, shadowPass, extent;
varying vec3 tint,world,n;
varying vec2 tex;
varying float id,material,distanceToEye;
vec3 lightSpace(vec3 p) {
 return vec3(dot(p,vec3(.7071,0.,.7071)), dot(p,vec3(-.50,.7071,.50)),
 dot(p,vec3(.50,.7071,-.50)))/extent;
}
void main(){
 vec3 p=position;
 if(kind==5. && growing<0.) p.y+=.15-smoothstep(0.,.80,growth)*.15;
 if(growing==1. && kind==7.) p.y=mix(-.06,p.y,smoothstep(0.,.50,growth));
 if(identity==growing && growing>0. && kind>0.5 && kind!=3. && kind!=4.) {
   float f=kind==2.?smoothstep(0.,.52,growth):smoothstep(.26,.88,growth);
   p=mix(pivot,p,f);
   if(kind==1.) p.y+=sin(f*3.14159)*.09*uv.y;
 }
 if(kind==1.) p.y+=.014*sin(time*1.4+pivot.x*2.5+pivot.z)*uv.y*(scene==2.?1.6:1.);
 vec3 d=p-eye; float depth=dot(d,look);
 gl_Position=vec4(dot(d,right)*lens.x,dot(d,up)*lens.y,depth*1.0002-.020002,depth);
 if(picking>.5) gl_Position.xy=(gl_Position.xy-pickOffset*depth)*pickScale;
 if(shadowPass>.5){vec3 s=lightSpace(p); gl_Position=vec4(s.xy,-s.z,1.);}
 tint=color;world=p;n=normal;tex=uv;id=identity;material=kind;distanceToEye=depth;
}`;
const fragmentSource = `
precision highp float;
varying vec3 tint,world,n;
varying vec2 tex;
varying float id,material,distanceToEye;
uniform float picking,selected,hovered,scene,extent,shadowPass;
uniform sampler2D shade;
void main(){
 if(shadowPass>.5){gl_FragColor=vec4(vec3(gl_FragCoord.z),1.);return;}
 float key=floor(id+.5);
 float surface=floor(material+.5);
 if(picking>.5){gl_FragColor=vec4(mod(key,256.),mod(floor(key/256.),256.),floor(key/65536.),255.)/255.;return;}
 vec3 light=normalize(vec3(.5,.7071,-.5));
 float facing=dot(normalize(n),light);
 vec3 c=tint;
 float grain=sin(world.x*91.+world.z*55.+4.*sin(world.y*13.));
 if(surface==0. || surface==2. || surface==5. || surface==7.){
   c*=.93+.065*grain+.045*sin(world.y*35.+4.*sin(world.x*9.));
 } else if(surface==1.){
   float rib=1.-smoothstep(.012,.047,abs(tex.x));
   float diagonal=abs(fract(tex.y*6.5-abs(tex.x)*1.04)-.5);
   c*=.89+.13*(1.-abs(tex.x))+.07*tex.y;
   c+=vec3(.16,.17,.055)*(rib+.36*(1.-smoothstep(.016,.09,diagonal))*(1.-abs(tex.x)));
   facing=abs(facing)*.82;
 } else if(surface==3.){
   float soil=sin(world.x*12.+sin(world.z*16.))*sin(world.z*11.-world.x)+.4*grain;
   c*=.98+.043*soil;
 }
 vec2 coord=vec2(dot(world,vec3(.7071,0.,.7071)),dot(world,vec3(-.5,.7071,.5)))/extent*.5+.5;
 float depth=.5-dot(world,light)/extent*.5;
 float shadow=0.;
 if(all(lessThan(abs(coord-.5),vec2(.498)))){
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   float closest=texture2D(shade,coord+vec2(float(x),float(y))*.00195).r;
   shadow+=step(closest+.006,depth)/9.;
  }
 }
 c*=.76+.28*max(0.,facing)-shadow*.17;
 if(scene==1.) c=c*vec3(.61,.69,.95)+vec3(.035,.045,.082);
 if(scene==2.) c=c*vec3(.79,.91,.93)+vec3(.04,.04,.048);
 if(key>.5 && (key==selected || key==hovered)) c=mix(c,vec3(.94,.79,.40),key==hovered?.42:.30);
 float fog=(surface==3.||surface==4.)?1.-smoothstep(extent*.86,extent*2.9,distanceToEye):1.;
 gl_FragColor=vec4(c,fog);
}`;

export type Camera={target:V; yaw:number; pitch:number; distance:number};
export function makeRenderer(canvas:HTMLCanvasElement) {
  const context=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!context) throw new Error('3D graphics are unavailable here.');
  const gl:WebGLRenderingContext=context;
  function shader(type:number,source:string) {
    const item=gl!.createShader(type)!; gl!.shaderSource(item,source); gl!.compileShader(item);
    if(!gl!.getShaderParameter(item,gl!.COMPILE_STATUS)) {const message=gl!.getShaderInfoLog(item);gl!.deleteShader(item);throw Error(message||'Shader compilation failed');}
    return item;
  }
  const program=gl.createProgram()!;
  const shaders=[shader(gl.VERTEX_SHADER,vertexSource),shader(gl.FRAGMENT_SHADER,fragmentSource)];
  shaders.forEach(s=>gl.attachShader(program,s)); gl.linkProgram(program); shaders.forEach(s=>gl.deleteShader(s));
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Unable to link the garden lighting.');
  gl.useProgram(program); gl.enable(gl.DEPTH_TEST); gl.disable(gl.DITHER);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  let offset=0;
  for(const [attr,size] of [['position',3],['normal',3],['color',3],['uv',2],['pivot',3],['identity',1],['kind',1]] as const){
    const loc=gl.getAttribLocation(program,attr); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,size,gl.FLOAT,false,STRIDE*4,offset*4); offset+=size;
  }
  const uniforms=Object.fromEntries('eye right up look lens pickOffset pickScale time growing growth scene picking selected hovered shadowPass extent shade'.split(' ').map(k=>[k,gl.getUniformLocation(program,k)]));
  const shadow=gl.createTexture(), frame=gl.createFramebuffer(), depthBuffer=gl.createRenderbuffer();
  gl.bindTexture(gl.TEXTURE_2D,shadow);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,512,512,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shadow,0);
  gl.bindRenderbuffer(gl.RENDERBUFFER,depthBuffer);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,512,512);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthBuffer);
  const blank=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,blank);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  const pickFrame=gl.createFramebuffer(),pickColor=gl.createTexture(),pickDepth=gl.createRenderbuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,pickFrame);
  gl.bindTexture(gl.TEXTURE_2D,pickColor);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.bindRenderbuffer(gl.RENDERBUFFER,pickDepth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,1,1);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,pickColor,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,pickDepth);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  let model:Model,scene:Garden='garden',camera:Camera={target:[0,0,0],yaw:.52,pitch:.24,distance:4};
  let goal=camera,selected=0,hovered=0,growing=0,growth=1,time=0,dirty=true;
  const float=(key:string,value:number)=>gl.uniform1f(uniforms[key],value);
  const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
  function basis(pose:Camera) {
    const back:V=[Math.cos(pose.pitch)*Math.sin(pose.yaw),Math.sin(pose.pitch),Math.cos(pose.pitch)*Math.cos(pose.yaw)];
    const right=unit(cross([0,1,0],back)),up=cross(back,right);
    return {back,right,up};
  }
  function paint(pick=false) {
    const {back,right,up}=basis(camera);
    gl.uniform3fv(uniforms.eye,add(camera.target,mul(back,camera.distance)));
    gl.uniform3fv(uniforms.look,mul(back,-1));gl.uniform3fv(uniforms.right,right);gl.uniform3fv(uniforms.up,up);
    gl.uniform2f(uniforms.lens,2.6*canvas.height/canvas.width,2.6);
    float('scene',scene==='garden'?0:scene==='stars'?1:2);float('picking',Number(pick));
    float('time',time);float('growing',growing);float('growth',growth);
    float('selected',selected);float('hovered',hovered);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,model.vertices.length/STRIDE);
  }
  function fit(instant=false){
    if(!model)return;
    const aspect=canvas.width/canvas.height;
    const distance=Math.max(1.45,model.heightRadius*3.45,model.widthRadius*3.35/aspect);
    const target=aspect<.8?add(model.center,[0,-model.heightRadius*.35,0]):model.center;
    goal={...goal,target,distance};
    if(instant)camera=goal;dirty=true;
  }
  return {
    update(next:Model,environment:Garden,reset:boolean){
      model=next;scene=environment;gl.bufferData(gl.ARRAY_BUFFER,model.vertices,gl.STATIC_DRAW);
      gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.bindTexture(gl.TEXTURE_2D,blank);gl.viewport(0,0,512,512);
      float('shadowPass',1);float('extent',Math.max(1.7,model.radius*2.2));float('growth',1);float('growing',0);
      gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,model.vertices.length/STRIDE);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,shadow);float('shadowPass',0);
      gl.viewport(0,0,canvas.width,canvas.height);if(reset)fit(true);dirty=true;
    },
    resize(){if(!canvas.clientWidth||!canvas.clientHeight)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(canvas.clientWidth*dpr));canvas.height=Math.max(1,Math.round(canvas.clientHeight*dpr));
      gl.viewport(0,0,canvas.width,canvas.height);dirty=true;
    },fit,reset(){goal={...goal,yaw:.52,pitch:.24};fit();},
    orbit(dx:number,dy:number){goal={...goal,yaw:goal.yaw+dx,pitch:clamp(goal.pitch+dy,-.035,1.53)};dirty=true;},
    pan(dx:number,dy:number){const b=basis(goal),k=goal.distance*.76/canvas.clientHeight;
      goal={...goal,target:add(goal.target,add(mul(b.right,-dx*k),mul(b.up,dy*k)))};dirty=true;},
    zoom(factor:number){goal={...goal,distance:clamp(goal.distance*factor,.32,Math.max(15,model.radius*9))};dirty=true;},
    focus(point:V){goal={...goal,target:point,distance:Math.max(.75,Math.min(3.7,model.radius*.67))};dirty=true;},
    pose(){return {...goal};},restore(pose:Camera){goal=pose;dirty=true;},
    select(id:number){selected=id;dirty=true;},hover(id:number){if(hovered!==id){hovered=id;dirty=true;}},
    growth(id:number,f:number){growing=id;growth=f;dirty=true;},
    tick(now:number,motion:boolean,snap:boolean){
      if(!model)return;
      const k=snap?1:.25; const delta=Math.abs(goal.yaw-camera.yaw)+Math.abs(goal.pitch-camera.pitch)+Math.abs(goal.distance-camera.distance)+Math.hypot(...sub(goal.target,camera.target));
      if(!dirty && !motion && delta<.0001)return;
      camera={target:mix(camera.target,goal.target,k),yaw:camera.yaw+(goal.yaw-camera.yaw)*k,pitch:camera.pitch+(goal.pitch-camera.pitch)*k,distance:camera.distance+(goal.distance-camera.distance)*k};
      if(motion)time=now*.001;paint();dirty=false;
    },
    pick(x:number,y:number){
      if(!model)return 0;
      const rect=canvas.getBoundingClientRect();const pixels=new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER,pickFrame);gl.viewport(0,0,1,1);
      gl.uniform2f(uniforms.pickOffset,(x-rect.left)/rect.width*2-1,(rect.bottom-y)/rect.height*2-1);
      gl.uniform2f(uniforms.pickScale,canvas.width,canvas.height);
      paint(true);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
      return pixels[0]+pixels[1]*256+pixels[2]*65536;
    },
    dispose(){gl.deleteBuffer(buffer);gl.deleteFramebuffer(frame);gl.deleteRenderbuffer(depthBuffer);gl.deleteTexture(shadow);gl.deleteTexture(blank);
      gl.deleteFramebuffer(pickFrame);gl.deleteTexture(pickColor);gl.deleteRenderbuffer(pickDepth);gl.deleteProgram(program);}
  };
}
export type TreeRenderer=ReturnType<typeof makeRenderer>;
