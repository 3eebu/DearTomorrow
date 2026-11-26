// All vertex stages use the same orthographic coordinates. The scene light contains
// the sunset and night weights; daylight is the remaining weight.
export const uniforms = `
uniform vec2 frame;
uniform vec2 light;
uniform float time;
uniform float age;
out vec2 world;
vec4 project(vec2 p) {
  world = p;
  float span = min(1000., 563.*frame.x/frame.y);
  float height = span*frame.y/frame.x;
  return vec4((p.x-500.)/(span*.5), (281.5-p.y)/(height*.5), 0., 1.);
}
float wind(vec2 p) {
  return sin(.025*p.x + .009*p.y - time*1.27)*.53
    + sin(.061*p.x - .017*p.y - time*2.1)*.19 + sin(.013*p.x-time*.48)*.58;
}
`;
export const pigment = `
uniform vec2 light;
uniform float time;
in vec2 world;
out vec4 color;
float hash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 lit(vec3 c, float face) {
  float l = dot(c,vec3(.27,.59,.14));
  vec3 amber = c*vec3(1.02,.77,.64) + vec3(.17,.052,.009)*face + vec3(.038,.031,.091)*(1.-face);
  vec3 moon = vec3(.018,.039,.075) + mix(vec3(l), c, .24)*vec3(.24,.38,.48)*(.49+.66*face);
  return mix(mix(c, amber, light.x), moon, light.y);
}
`;
export const skyVertex = `layout(location=0) in vec2 xy;
${uniforms}
void main(){gl_Position=project(xy*vec2(1400.,800.)+vec2(-200.,-100.));}`;
export const skyFrag = `
${pigment}
uniform sampler2D paint;
void main(){
  vec2 p=world/vec2(1000.,563.);
  float h=clamp(p.y*1.27,0.,1.);
  vec3 day=mix(vec3(.29,.53,.74),vec3(.98,.869,.676),pow(h,1.24));
  vec3 dusk=mix(vec3(.29,.316,.52),vec3(1.,.672,.372),pow(h,.87));
  vec3 night=mix(vec3(.046,.084,.174),vec3(.236,.322,.411),pow(h,1.37));
  vec3 c=mix(mix(day,dusk,light.x),night,light.y);
  vec2 solar=(world-vec2(178.,337.))/vec2(106.,92.);
  c+=vec3(.38,.21,.085)*exp(-dot(solar,solar)*.53)*light.x;
  vec2 grainUV=vec2(.94,.04)+.035*sin(p.yx*4.+p.xy*3.);
  c+=(texture(paint,grainUV).b-.67)*.18;
  vec2 moon=(world-vec2(694.,39.))/8.;
  float disc=1.-smoothstep(.87,1.,length(moon));
  c+=vec3(.78,.82,.79)*disc*light.y;
  c+=vec3(.079,.10,.13)*exp(-length(moon)*.22)*light.y;
  vec2 grid=world/8.7;
  vec2 cell=floor(grid);
  vec2 center=vec2(hash(cell),hash(cell+8.4))*.74+.13;
  float star=(1.-smoothstep(.02,.115,length(fract(grid)-center)))
    *smoothstep(.88,.999,hash(cell+.31))*(1.-h)*light.y;
  color=vec4(c+star*.72,1.);
}`;
export const landscapeVertex = `layout(location=0) in vec2 xy;
${uniforms}
uniform vec4 rect;
uniform float drift;
out vec2 uv;
void main(){
 uv=xy;
 vec2 p=rect.xy+xy*rect.zw;
 if(drift>0.) {
   p.x=mod(rect.x+500.-time*drift,2100.)-500.+xy.x*rect.z;
 }
 gl_Position=project(p);
}`;
// Cloud displacement is applied to the quad as a whole; wrap its origin offscreen.
export const plateFrag = `
${pigment}
uniform sampler2D plate;
uniform int material;
uniform float age;
in vec2 uv;
void main(){
 vec2 sampleUV=uv;
 if(material==1){
   sampleUV.x+=.0018*sin(uv.y*7.+time*.105)*sin(uv.x*3.14159);
   sampleUV.y+=.0025*sin(uv.x*8.-time*.087)*sin(uv.y*3.14159);
 }
 vec4 tex=texture(plate,sampleUV);
 if(tex.a<.006)discard;
 float l=dot(tex.rgb,vec3(.3,.55,.15));
 vec3 c=lit(tex.rgb,smoothstep(.16,.9,l));
 if(material==1){
   vec3 amber=mix(vec3(.414,.324,.421),vec3(1.,.769,.483),smoothstep(.38,.95,l));
   c=mix(mix(tex.rgb,amber,light.x),mix(vec3(.103,.159,.245),vec3(.46,.54,.61),smoothstep(.44,.99,l))*.72,light.y);
 }else{
   float g=smoothstep(442.,475.,world.y);
   float east=age*(58.+81.*light.x-86.*light.y);
   vec2 footprint=(world-vec2(490.+east,481.+5.*age))/vec2((85.+65.*light.x)*age+2.,9.*age+1.);
   float shade=exp(-dot(footprint,footprint));
   c=mix(c,c*vec3(.54,.64,.75),g*shade*.87);
   c+=light.x*vec3(.14,.045,.035)*(1.-g)*smoothstep(.37,.85,l);
 }
 color=vec4(c,tex.a);
}`;
export const woodVertex = `layout(location=0) in vec2 xy;
layout(location=1) in vec4 bark;
${uniforms}
out vec4 surface;
void main(){
 surface=bark;
 vec2 p=xy;
 p.x+=wind(p)*clamp(1.-bark.w/2.5,0.,1.)*.55*age;
 gl_Position=project(p);
}`;
export const woodFrag = `
${pigment}
uniform sampler2D paint;
in vec4 surface;
void main(){
 float u=surface.x,t=surface.y,seed=surface.z,r=surface.w;
 float twist=u*.49+.5+.14*sin(t*5.+seed)+.062*sin(t*13.+seed);
 vec3 grain=texture(paint,vec2(.485+(.5-fract(twist+seed*.15))*.026,.615+t*.173)).rgb;
 float ridge=sin((twist*13.+.14*sin(t*19.+seed))*6.283);
 float face=clamp(.55-.47*u+.085*sin(t*6.+seed),0.,1.);
 vec3 c=mix(vec3(.21,.155,.105),grain,.52+.32*face);
 c*=.68+.51*face+.16*max(0.,ridge)*smoothstep(1.,5.,r);
 c+=vec3(.084,.062,.039)*face*face*(.45+.55*smoothstep(.0,.85,ridge));
 color=vec4(lit(c,face),1.);
}`;
export const sprayVertex = `layout(location=0) in vec2 corner;
layout(location=1) in vec4 shoot;
layout(location=2) in vec4 pigmentData;
${uniforms}
out vec2 uv;
out float sun;
void main(){
 float b=wind(shoot.xy);
 vec2 q=corner-.5;
 q.x*=shoot.z;
 q.y*=shoot.z*(.55+.27*pigmentData.w);
 float a=sin(shoot.w)*.64+b*.035;
 vec2 p=shoot.xy+mat2(cos(a),sin(a),-sin(a),cos(a))*q;
 p+=vec2(.8*b,-.2*b)*age;
 vec2 tile=vec2(mod(pigmentData.z,4.),floor(pigmentData.z/4.));
 uv=(tile+mix(vec2(.014),vec2(.986),corner))/vec2(4.,2.);
 sun=pigmentData.y;
 gl_Position=project(p);
}`;
export const sprayFrag = `
${pigment}
uniform sampler2D atlas;
in vec2 uv;
in float sun;
void main(){
 vec4 dab=texture(atlas,uv);
 if(dab.a<.04)discard;
 float volume=clamp(sun,0.,1.);
 vec3 c=dab.rgb*(.60+.46*volume)+vec3(.014,.024,.023)*(1.-volume);
 color=vec4(lit(c,clamp(dot(c,vec3(.31,.56,.13)),0.,1.)),dab.a);
}`;
export const leafVertex = `layout(location=0) in vec2 corner;
layout(location=1) in vec4 stem;
layout(location=2) in vec4 detail;
${uniforms}
out vec2 uv;
out vec4 ink;
void main(){
 uv=corner;
 ink=detail;
 float type=detail.w;
 float breeze=wind(stem.xy);
 float angle=stem.w+breeze*.14+.045*sin(time*2.+detail.x+stem.x*.025);
 vec2 dir=vec2(cos(angle),sin(angle)), side=vec2(-dir.y,dir.x);
 float breadth=type>.5?(type>1.5?.32:.095):(.24+.12*detail.z);
 float x=corner.x, y=(corner.y-.5)*2.;
 vec2 p=stem.xy+dir*stem.z*x+side*(stem.z*breadth*y);
 p+=side*stem.z*x*x*(.095*breeze+.06*sin(detail.x));
 if(type<.5)p.x+=breeze*.5*age;
 gl_Position=project(p);
}`;
export const leafFrag = `
${pigment}
in vec2 uv;
in vec4 ink;
void main(){
 float x=uv.x,y=uv.y*2.-1.;
 float type=ink.w, k=ink.z;
 float width=pow(max(0.,sin(x*3.14159)),.65)*(1.+.074*sin(x*24.+ink.x));
 if(type>.5)width=(1.-x)*.93+.04;
 if(type>1.5){
   float petal=(x-.82)/.18;
   width=x>.65?sqrt(max(0.,1.-petal*petal)):.13;
 }
 float edge=width-abs(y);
 float aa=max(.035,fwidth(edge)*.73);
 float alpha=smoothstep(-aa,aa,edge);
 if(alpha<.02)discard;
 float lightness=clamp(ink.y-.16*x+.13*(1.-y)+.07*sin(ink.x+time*.5),0.,1.);
 vec3 dark=mix(vec3(.112,.191,.126),vec3(.24,.291,.12),k);
 vec3 mid=mix(vec3(.258,.395,.178),vec3(.47,.481,.13),k);
 vec3 gold=mix(vec3(.64,.678,.274),vec3(.965,.783,.293),k);
 vec3 c=mix(mix(dark,mid,smoothstep(.15,.67,lightness)),gold,smoothstep(.65,1.,lightness));
 c*=.90+.10*smoothstep(-.16,.1,y)+.055*sin(x*17.+y*5.+ink.x);
 if(type<.5)c+=vec3(.082,.066,.023)*(1.-smoothstep(.0,.13,abs(y+.09*sin(x*5.))))*(1.-x);
 if(type>.5)c=mix(vec3(.18,.27,.12),vec3(.71,.67,.30),k*.58+x*.40);
 if(type>1.5&&x>.65)c=mix(vec3(.86,.48,.43),vec3(.99,.89,.57),smoothstep(.22,.80,k));
 color=vec4(lit(c,lightness),alpha);
}`;
