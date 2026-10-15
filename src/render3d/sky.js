// Sky: analytic gradient + sun + stars; fog uses the same horizon colour so the ground blends in. Environment map.
import * as T from 'three';
import { k3 } from './context.js';
import { R, V3, scn } from './kit.js';

// assigned by create*() below, when init3D runs
export let skyU,skyMat,sky,envScn,pm;

export function createSky(){

/* ---------------- sky: analytic gradient + sun + stars; fog uses the same horizon colour so the ground blends in ---------------- */
skyU={uSpace:{value:0},uZen:{value:V3()},uHor:{value:V3()},uGnd:{value:V3()},uSun:{value:V3(0,1,0)},uSunC:{value:V3()},uSunI:{value:1},uStars:{value:0},uDisk:{value:1}};
skyMat=new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
 vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
 fragmentShader:`uniform vec3 uZen,uHor,uGnd,uSun,uSunC;uniform float uSunI,uStars,uDisk,uSpace;varying vec3 vD;
 float h3(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 void main(){vec3 d=normalize(vD);float y=d.y;
  if(uSpace>.5){vec3 c=y<-.25?uGnd*smoothstep(-.25,-.5,y):vec3(0.);float s=max(dot(d,normalize(uSun)),0.);c+=uSunC*uSunI*(smoothstep(.99965,.9999,s)*80.+pow(s,400.)*2.);
   vec3 g=d*520.;vec3 i=floor(g);float r=h3(i);if(r>.996){float st=smoothstep(.45,0.,length(fract(g)-.5));c+=mix(vec3(1.,.85,.7),vec3(.75,.85,1.),h3(i+3.))*st*(r-.996)*500.*uStars;}gl_FragColor=vec4(c,1.);return;}
  vec3 c=mix(uHor,uZen,pow(smoothstep(0.,.55,y),.55));
  float s=max(dot(d,normalize(uSun)),0.);
  c+=uSunC*uSunI*(pow(s,6.)*.18+pow(s,60.)*.5)*(.5+.5*smoothstep(-.05,.3,y));
  c+=uSunC*uSunI*smoothstep(.99955,.9998,s)*60.*uDisk;
  if(uStars>0.&&y>0.){vec3 g=d*420.;vec3 i=floor(g);float r=h3(i);if(r>.9965){float st=smoothstep(.45,0.,length(fract(g)-.5));c+=vec3(.9,.95,1.)*st*(r-.9965)*600.*uStars*smoothstep(0.,.15,y);}}
  if(y<0.)c=mix(uHor,uGnd,smoothstep(0.,.06,-y));
  gl_FragColor=vec4(c,1.);}`});
sky=new T.Mesh(new T.SphereGeometry(4000,48,24),skyMat);sky.frustumCulled=false;sky.userData.bg=1;sky.renderOrder=-10;scn.add(sky);
envScn=new T.Scene();envScn.add(new T.Mesh(new T.SphereGeometry(50,32,16),skyMat));
pm=new T.PMREMGenerator(R);k3.envRT=null;
}

