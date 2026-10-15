// Ray-marched volumetric plume: shader, plume box, per-frame parameters from the simulation.
import { M3 } from '../machines/three.js';
import * as T from 'three';
import { state } from '../core/state.js';
import { sm } from '../core/util.js';
import { k3 } from './context.js';
import { V3, cam, pscn } from './kit.js';

// assigned by create*() below, when init3D runs
export let PU,plMat,C;

export function createPlume(){

/* ======================= volumetric plume (ray-marched, half resolution) ======================= */
PU={uInv:{value:new T.Matrix4()},uFwd:{value:V3()},tDepth:{value:null},uPRes:{value:new T.Vector2(1,1)},uNear:{value:cam.near},uFar:{value:cam.far},
 uT:{value:0},uLen:{value:5},uR0:{value:.4},uSp:{value:.05},uI:{value:0},uTurb:{value:.5},uSteps:{value:28},uHeat:{value:0},uHeatLen:{value:3},uGreen:{value:0},uFire:{value:0},
 uDia:{value:0},uDiaSp:{value:1},uDiaN:{value:3},uDiaOff:{value:.3},uDisk:{value:0},uDiaR:{value:.6},uBox:{value:new T.Vector2(14,2.5)},
 uAnn:{value:0},uCl:{value:0},uO:{value:[0,1,2,3,4].map(()=>new T.Vector2())},uW:{value:[0,0,0,0,0]},uMR:{value:4},uMg:{value:new T.Vector2(3,10)},uC0:{value:V3()},uC1:{value:V3()},uC2:{value:V3()},uC3:{value:V3()},uDC:{value:V3()},uGC:{value:V3(.25,1.9,.55)}};
plMat=new T.ShaderMaterial({uniforms:PU,side:T.BackSide,depthTest:false,depthWrite:false,blending:T.NoBlending,
 vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`#include <packing>
 uniform mat4 uInv;uniform vec3 uFwd;uniform sampler2D tDepth;uniform vec2 uPRes,uBox;uniform float uNear,uFar;
 uniform float uT,uLen,uR0,uSp,uI,uTurb,uSteps,uHeat,uHeatLen,uGreen,uFire,uDia,uDiaSp,uDiaN,uDiaOff,uDisk,uDiaR,uAnn,uCl,uMR;uniform vec2 uO[5],uMg;uniform float uW[5];
 uniform vec3 uC0,uC1,uC2,uC3,uDC,uGC;varying vec3 vW;
 float hs(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
 vec3 ramp(float k){k=clamp(k,0.,1.);return k>.66?mix(uC1,uC0,(k-.66)/.34):k>.33?mix(uC2,uC1,(k-.33)/.33):mix(uC3,uC2,k/.33);}
 void main(){
  vec3 ro=(uInv*vec4(cameraPosition,1.)).xyz,rd=normalize((uInv*vec4(vW,1.)).xyz-ro);
  vec3 bn=vec3(0.,-uBox.y,-uBox.y),bx=vec3(uBox.x,uBox.y,uBox.y),iv=1./rd,a0=(bn-ro)*iv,a1=(bx-ro)*iv,tn=min(a0,a1),tf=max(a0,a1);
  float ta=max(max(max(tn.x,tn.y),tn.z),0.),tb=min(min(tf.x,tf.y),tf.z);
  float z=texture2D(tDepth,gl_FragCoord.xy/uPRes).x;vec3 wd=normalize(vW-cameraPosition);
  tb=min(tb,-perspectiveDepthToViewZ(z,uNear,uFar)/max(dot(wd,uFwd),1e-3));
  if(tb<=ta||uI+uDia+uHeat<1e-4){gl_FragColor=vec4(0.);return;}
  float dt=(tb-ta)/uSteps,j=hs(vec3(gl_FragCoord.xy,fract(uT*7.)*91.));vec3 c=vec3(0.);float ht=0.;
  for(int i=0;i<48;i++){if(float(i)>=uSteps)break;
   vec3 p=ro+rd*(ta+(float(i)+j)*dt);float x=p.x;if(x<0.)continue;
   float r=length(p.yz),u=x/uLen,R=uR0*(1.+uSp*x)*(1.+uFire*.5*(1.-exp(-x)));
   vec3 q=vec3(x*1.5-uT*10.,p.y*2.4,p.z*2.4);float nz=n3(q)*.62+n3(q*2.3+vec3(5.2,1.3,2.7))*.38;
   float ae=uAnn*exp(-x/(uR0*2.5)),ra=abs(r-ae*uR0),rr=ra/(R*(1.-.55*ae)*(1.+uTurb*(nz-.45)*(.3+u*1.6)));
   float core=exp(-rr*rr*2.3),k=core*exp(-u*1.8);
   if(uCl>.5){float tb=1.+uTurb*(nz-.45)*(.3+u*1.6),c=0.,wt=0.;for(int j=0;j<5;j++){float d=length(p.yz-uO[j])/(R*tb);c=max(c,uW[j]*exp(-d*d*2.3));wt+=uW[j];}
    float rm=r/(uMR*(1.+.05*x)*tb);core=mix(c,exp(-rm*rm*2.)*min(1.,wt/2.5),smoothstep(uMg.x,uMg.y,x));k=core*exp(-u*1.8);}
   vec3 e=ramp(k)*core*exp(-u*1.15)*(1.-smoothstep(.62,1.05,u))*(.5+nz)*uI;
   float ph=x/uDiaSp-uDiaOff;
   if(ph>0.){float fp=fract(ph),tri=1.-abs(2.*fp-1.),rd2=R*uDiaR*(1.-.05*floor(ph));
    float lens=smoothstep(0.,.45,tri*.95-r/rd2)*tri*tri+.35*exp(-pow(r/rd2,2.)*3.)*tri*tri*tri,disk=exp(-pow((fp-.5)/.06,2.))*smoothstep(rd2,rd2*.4,r);
    e+=uDC*mix(lens,disk,uDisk)*exp(-x/(uDiaSp*uDiaN))*uDia*(.75+.5*nz);}
   e=mix(e,uGC*dot(e,vec3(.34)),clamp(uGreen*exp(-u*1.2),0.,1.));
   c+=e*dt;ht+=(uCl>.5?core:exp(-pow(r/(R*1.4),2.)))*exp(-x/uHeatLen)*(.4+1.2*nz)*dt;}
  gl_FragColor=vec4(c,ht*uHeat);}`});
k3.plume=null;
}

export function createPlume2(){

/* ======================= per-frame plume parameters from the simulation ======================= */
C=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
k3.fire=0;
}

export function setPlumeBox(L,Rm){if(k3.plume){pscn.remove(k3.plume);k3.plume.geometry.dispose()}const g=new T.BoxGeometry(L,Rm*2,Rm*2);g.translate(L/2,0,0);k3.plume=new T.Mesh(g,plMat);k3.plume.matrixAutoUpdate=false;k3.plume.frustumCulled=false;pscn.add(k3.plume);PU.uBox.value.set(L,Rm)}
export function plumeParams(dt){const fl=.93+.07*Math.sin(state.simT*47)*Math.sin(state.simT*29+1),u=PU;let lc=[1,.6,.3],li=0;
 k3.fire*=Math.exp(-dt*3.2);k3.fire=Math.max(k3.fire,state.sT>0?state.ign*.5:0);
 [li,lc]=M3[state.mi].plume(u,fl)
 return[li*fl,lc]}
