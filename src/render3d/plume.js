// Ray-marched volumetric plume: shader, plume box, per-frame parameters from the simulation.
import * as T from 'three';
import { state } from '../core/state.js';
import { sm } from '../core/util.js';
import { MLE, sc, sicE } from '../machines/table.js';
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
 if(state.mi<2){u.uCl.value=0;u.uAnn.value=0;const sr=state.mi==1,re=sr?.62:.45-.1*sm(.3,.95,state.N)+.17*state.A,ab=sm(0,.22,state.A),dry=sm(.3,1,state.N)*state.fu,ig=Math.min(1,state.ign);
  u.uR0.value=re*.92;u.uSp.value=.04+.05*ab;u.uLen.value=(sr?2.6:2.0)+state.N*1.5*(1-ab)+ab*((sr?5:4)+state.A*(sr?9:7))+ig*2.5;
  const dC=[[.5,.62,1.5],[.25,.32,1.0],[.25,.15,.35],[.08,.03,.05]],aC=sr?[[3.4,2.6,2.2],[2.6,1.05,.4],[1.1,.24,.06],[.2,.025,0]]:[[3.2,2.4,1.5],[2.4,.95,.25],[1.0,.2,.03],[.18,.02,0]],iC=[[3,1.7,.5],[2,.7,.12],[.8,.15,.02],[.15,.015,0]];
  const mix=Math.max(ab,ig*.9,k3.fire);['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const b=ab>=Math.max(ig*.9,k3.fire)?aC[i]:iC[i];u[k].value.set(...C(dC[i],b,mix))});
  u.uI.value=(dry*.24*(1-ab)+ab*(.85+.75*state.A)+ig*.9+k3.fire*1.1)*fl;u.uTurb.value=.35+.4*ab+k3.fire;u.uFire.value=k3.fire+ig*.4;
  u.uDia.value=(dry*.3*(1-ab)+state.A*.75)*(sr?1.1:1)*fl;u.uDiaSp.value=(sr?1.15:.95)*(.8+.4*ab)*(re/.45)**.3;u.uDiaN.value=sr?5.5:3.6;u.uDiaOff.value=.35;u.uDisk.value=0;u.uDiaR.value=.62;
  u.uDC.value.set(...(state.A>.05?[3.4,2.9,2.3]:[.7,.95,2.0]));u.uGreen.value=state.gn;
  u.uHeat.value=state.N*state.N*.55*state.fu+state.A*.8+ig*.3+k3.fire*.6;u.uHeatLen.value=3+state.A*5;
  li=state.A*60+dry*5+ig*40+k3.fire*25+state.gn*40;lc=state.gn>.3?[.35,1,.45]:state.A>.05||ig>.1||k3.fire>.1?[1,.55,.25]:[.55,.65,1]}
 else if(state.mi==3){u.uCl.value=0;const nn=state.N*state.fu,ig=Math.min(1,state.ign),f2=.97+.03*Math.sin(state.simT*90);
  u.uR0.value=.058;u.uSp.value=11;u.uLen.value=.42+nn*.45;u.uTurb.value=.08;u.uFire.value=0;u.uAnn.value=.95;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.5,1.9,4.2],[.75,.85,2.8],[.4,.32,1.5],[.12,.07,.45]][i];u[k].value.set(...C(a,[3,3,4],ig*.6))});
  u.uI.value=(nn*2.8+ig*3)*f2;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=0;u.uHeatLen.value=1;
  li=nn*3+ig*4;lc=[.55,.62,1]}
 else if(state.mi==4){const fl2=.94+.06*Math.sin(state.simT*53)*Math.sin(state.simT*31+1),ig=Math.min(1,state.ign);u.uCl.value=1;u.uAnn.value=0;
  [[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=sicE[j]});u.uMR.value=4.6;u.uMg.value.set(3,11);
  u.uR0.value=1.75;u.uSp.value=.045;u.uLen.value=10+state.N*4;u.uTurb.value=.45+ig*.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[5,3.6,1.6],[3.4,1.5,.4],[1.4,.4,.08],[.3,.06,.01]][i]));
  u.uI.value=(state.N>.01?1.15:0)*fl2+ig*.8;u.uDia.value=.12*state.N;u.uDiaSp.value=2.2;u.uDiaN.value=2;u.uDiaOff.value=.3;u.uDisk.value=0;u.uDiaR.value=.6;u.uDC.value.set(4,3,2);u.uGreen.value=0;
  u.uHeat.value=state.N*1.6+ig*.5;u.uHeatLen.value=6;li=state.N*520+ig*220;lc=[1,.62,.3]}
 else if(state.mi==5){const nn=state.N*state.fu;u.uCl.value=1;u.uAnn.value=0;
  [[1.05,1.02,1],[1.05,-1.02,1],[-1,1.08,.3],[-1,-1.08,.3],[0,0,0]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=o[2]});u.uMR.value=1.5;u.uMg.value.set(2,7);
  u.uR0.value=.28;u.uSp.value=.09;u.uLen.value=2.5+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.5,.6,1.1],[.3,.35,.8],[.15,.15,.4],[.05,.04,.1]][i]));
  u.uI.value=nn*.22+Math.min(1,state.ign)*.6;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*nn*1.8+state.ign*.3;u.uHeatLen.value=3;li=nn*4+state.ign*20;lc=[.7,.75,1]}
 else if(state.mi==6){const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=.42;u.uSp.value=.08;u.uLen.value=2+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[.6,.5,.45],[.4,.3,.25],[.2,.15,.12],[.05,.04,.03]][i],b=[[4,2.4,.9],[2.4,.9,.2],[1,.25,.04],[.2,.03,0]][i];u[k].value.set(...C(a,b,ig))});
  u.uI.value=nn*.03+ig*.7;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*1.3+ig*.3;u.uHeatLen.value=2.5;li=ig*25;lc=[1,.6,.3]}
 else if(state.mi==7){const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=sc.done?0:1;u.uAnn.value=0;
  for(let j=0;j<5;j++){if(j<4){const a=Math.PI/4+j*Math.PI/2;u.uO.value[j].set(Math.cos(a)*1.6,Math.sin(a)*1.6);u.uW.value[j]=Math.min(1,(sc.thr[2*j]+sc.thr[2*j+1])/MLE*.7)}else u.uW.value[j]=0}
  u.uMR.value=2.4;u.uMg.value.set(8,30);u.uR0.value=.2;u.uSp.value=.22;u.uLen.value=5+nn*8;u.uTurb.value=.35;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.6,.55,.85],[.32,.3,.52],[.12,.1,.2],[.03,.02,.05]][i]));
  u.uI.value=(sc.done?0:1)*(nn*.12+ig*.25);u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=(sc.done?0:1)*nn*2.4;u.uHeatLen.value=4;li=(sc.done?0:1)*(nn*6+ig*8);lc=[.85,.75,1]}
 else{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=1.08;u.uSp.value=.035;u.uLen.value=4.5+nn*2;u.uTurb.value=.3+ig*.6;u.uFire.value=ig*.3;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.0,1.15,2.3],[.55,.45,1.25],[.3,.17,.55],[.12,.05,.12]][i],b=[[6,3.4,1],[4,1.4,.25],[1.6,.3,.04],[.3,.03,0]][i];u[k].value.set(...C(a,b,ig*.85))});
  u.uI.value=(nn*.6+ig*.9)*fl;u.uDia.value=nn*2.4*fl;u.uDiaSp.value=1.3;u.uDiaN.value=1.3;u.uDiaOff.value=.25;u.uDisk.value=.85;u.uDiaR.value=.6;
  u.uDC.value.set(5,4.4,4.6);u.uGreen.value=0;u.uHeat.value=nn*1.6+ig*.6;u.uHeatLen.value=3.5;
  li=nn*95+ig*80;lc=ig>.2?[1,.55,.25]:[.72,.78,1]}
 return[li*fl,lc]}
