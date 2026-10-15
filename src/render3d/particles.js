// Particles: instanced pools (sparks, smoke/steam/dust, fire, flow tracers), emitters, fire puffs.
import * as T from 'three';
import { state } from '../core/state.js';
import { sm } from '../core/util.js';
import { sc } from '../machines/table.js';
import { ENG } from './builders.js';
import { k3 } from './context.js';
import { V3, rnd, scn } from './kit.js';
import { flame } from './lights.js';

// assigned by create*() below, when init3D runs
export let SPK,SMK,FIR,FLW,W3,AX;

export function createParticles(){
SPK=Pool(400,0);SMK=Pool(420,1);FIR=Pool(200,0,0);FLW=Pool(700,0,.03);
}

export function createParticles2(){

/* ======================= particle emitters ======================= */
W3=V3();AX=V3();k3.steamAcc=0;k3.sparkAcc=0;k3.sootAcc=0;
}

/* ======================= particles: camera-facing quads, streaked along velocity for sparks ======================= */
export function Pool(max,smoke,str){
 const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
 const aP=new T.InstancedBufferAttribute(new Float32Array(max*3),3),aV=new T.InstancedBufferAttribute(new Float32Array(max*3),3),aS=new T.InstancedBufferAttribute(new Float32Array(max*2),2),aC=new T.InstancedBufferAttribute(new Float32Array(max*4),4);
 [aP,aV,aS,aC].forEach(a=>a.setUsage(T.DynamicDrawUsage));g.setAttribute('iP',aP);g.setAttribute('iV',aV);g.setAttribute('iS',aS);g.setAttribute('iC',aC);g.instanceCount=0;
 const u={uStr:{value:smoke?0:(str==null?.012:str)},uAmb:{value:new T.Color()},uLit:{value:new T.Color()},uFP:{value:V3()},uFC:{value:new T.Color()}};
 const m=new T.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:smoke?T.NormalBlending:T.AdditiveBlending,
  vertexShader:`attribute vec3 iP,iV;attribute vec2 iS;attribute vec4 iC;uniform float uStr;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  void main(){vec4 vp=viewMatrix*vec4(iP,1.);vec2 c=position.xy;vec3 vv=(viewMatrix*vec4(iV,0.)).xyz;float l=length(vv.xy)*uStr;vec2 d=l>1e-5?normalize(vv.xy):vec2(1.,0.),nn=vec2(-d.y,d.x);
   vp.xy+=d*c.x*(iS.x+l)+nn*c.y*iS.x;gl_Position=projectionMatrix*vp;vU=c;vC=iC;vSd=iS.y;vWP=iP;}`,
  fragmentShader:smoke?`uniform vec3 uAmb,uLit,uFC,uFP;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
  void main(){float r=length(vU);if(r>1.)discard;vec2 q=vU*1.7+vSd*13.;float n=n2(q)*.55+n2(q*2.4+3.)*.3+n2(q*5.)*.15;
   float a=smoothstep(1.,.15,r+.75*(n-.5))*vC.a;float sh=.25+.9*(vU.y*.5+.5)+.4*(n-.5);float fd=length(vWP-uFP);
   vec3 c=vC.rgb*(uAmb+uLit*sh)+vC.rgb*uFC/(1.+fd*fd*.05);gl_FragColor=vec4(c,a);}`
  :`varying vec2 vU;varying vec4 vC;void main(){float r=length(vU);float a=1.-smoothstep(0.,1.,r);gl_FragColor=vec4(vC.rgb,vC.a*a*a);}`});
 const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=smoke?2:3;mesh.userData.pt=1;scn.add(mesh);
 const L=[];
 return{L,u,mesh,add(p){if(L.length<max)L.push(p)},clear(){L.length=0},upd(dt,f){let n=0;const P=aP.array,Vv=aV.array,S=aS.array,C=aC.array;
  for(let i=L.length-1;i>=0;i--){const p=L[i];p.a+=dt;if(p.a>=p.l){L[i]=L[L.length-1];L.pop();continue}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const k=f(p,dt);if(!k)continue;
   P[n*3]=p.x;P[n*3+1]=p.y;P[n*3+2]=p.z;Vv[n*3]=p.vx;Vv[n*3+1]=p.vy;Vv[n*3+2]=p.vz;S[n*2]=k[0];S[n*2+1]=p.sd;C[n*4]=k[1];C[n*4+1]=k[2];C[n*4+2]=k[3];C[n*4+3]=k[4];n++}
  g.instanceCount=n;[aP,aV,aS,aC].forEach(a=>a.needsUpdate=true)}}}
export function axisPt(d,r,a){/* world point at distance d downstream of the exit, radius r, angle a */const e=ENG[state.mi].anchor;W3.set(d,Math.cos(a)*r,Math.sin(a)*r);return e.localToWorld(W3)}
export function axisDir(){const e=ENG[state.mi].anchor,o=e.localToWorld(V3(0,0,0));return e.localToWorld(V3(1,0,0)).sub(o).normalize()}
export function emitters(dt){const ax=axisDir();
 if(state.mi<2){/* afterburner embers (sparse) */k3.sparkAcc+=dt*(state.A>.5?state.A*14:0)+dt*(k3.fire*40);
  while(k3.sparkAcc>1){k3.sparkAcc--;const p=axisPt(rnd(0,1.5),rnd(0,.3),rnd(0,6.3)),s=rnd(18,45);SPK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-2,2),vy:ax.y*s+rnd(-1,3),vz:ax.z*s+rnd(-2,2),a:0,l:rnd(.3,.8),sd:Math.random(),k:0})}
  /* soot from a surge, a puff of vapour at light-off */
  k3.sootAcc+=dt*(k3.fire>.3?90:0);while(k3.sootAcc>1){k3.sootAcc--;const p=axisPt(rnd(0,1),rnd(0,.3),rnd(0,6.3)),s=rnd(6,16);SMK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s,vy:ax.y*s+rnd(.5,2),vz:ax.z*s+rnd(-1,1),a:0,l:rnd(2,3.5),sd:Math.random(),k:1,s0:.4,s1:3.5})}}
 else if(state.mi==4){const qm=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(state.N*48+state.ign*30)*qm;
  while(k3.steamAcc>1){k3.steamAcc--;const sp=rnd(7,20)*(.5+state.N*.6),sm2=Math.random()<.4;SMK.add({x:rnd(3,9),y:rnd(1,3.5),z:rnd(-6,6),vx:sp,vy:rnd(2,6),vz:rnd(-4,4),a:0,l:rnd(6,9),sd:Math.random(),k:sm2?6:2,s0:3,s1:rnd(16,26)})}}
 else if(state.mi==5){const nn=state.N*state.fu,e=ENG[5],gy=e.AC.position.y-1.9;if(state.alt<14&&nn>.4&&state.nz>45){k3.sparkAcc+=dt*nn*70*(1-state.alt/14)*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,2.5),sp=rnd(6,16)*(1-state.alt/16);SMK.add({x:Math.cos(a)*r,y:.25,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.4,2.2),vz:Math.sin(a)*sp,a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.6,s1:rnd(3,6)})}}}
 else if(state.mi==6){const nn=state.N*state.fu*sm(.5,1,state.prp);if(nn>.15){k3.sparkAcc+=dt*nn*14*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const z=rnd(-3.2,3.2),sp=rnd(7,18)*nn;SMK.add({x:rnd(-3.5,0),y:.2,z,vx:sp,vy:rnd(.2,1.4),vz:z*rnd(.1,.5),a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.5,s1:rnd(2.5,5)})}}}
 else if(state.mi==7){const h=state.alt,nn=state.N*state.fu;if(!sc.done&&h<30&&nn>.05){const k2=Math.pow(1-h/30,1.5);k3.sparkAcc+=dt*nn*260*k2*(state.Q>1?1:state.Q>0?.6:.35);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,4+h*.3),sp=rnd(5,16)*(.4+k2);SMK.add({x:sc.x+Math.cos(a)*r,y:.15,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.3,2.5),vz:Math.sin(a)*sp,a:0,l:rnd(2,4),sd:Math.random(),k:8,s0:.5,s1:rnd(3,7)})}}}
 else if(state.mi==2){const nn=state.N*state.fu;
  /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
  const qmax=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(nn*34+state.ign*24)*qmax;
  while(k3.steamAcc>1){k3.steamAcc--;const s=rnd(6,15)*(.5+nn*.7);SMK.add({x:rnd(.5,3.5),y:rnd(.9,2.4),z:rnd(-2.4,2.4),vx:s,vy:rnd(1.5,5),vz:rnd(-2.5,2.5),a:0,l:rnd(5,8),sd:Math.random(),k:2,s0:2.2,s1:rnd(12,20)})}
  /* steam drifting off the plume column near the bell */
  if(nn>.1&&Math.random()<dt*8*qmax){const p=axisPt(rnd(.3,2.5),rnd(1.2,1.8),rnd(0,6.3));SMK.add({x:p.x,y:p.y,z:p.z,vx:rnd(-1,2),vy:rnd(-.5,1.5),vz:rnd(-1,1),a:0,l:rnd(2,4),sd:Math.random(),k:3,s0:.6,s1:2.6})}
  /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
  if(state.ph==1&&state.st>.5){k3.sparkAcc+=dt*90;while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.floor(Math.random()*4)/4*6.283+.4,p=axisPt(rnd(.4,.8),1.6,a),s=rnd(4,10);SPK.add({x:p.x,y:p.y,z:p.z,vx:-Math.cos(a)*s*0+rnd(-3,3),vy:rnd(-2,4),vz:-Math.sin(a)*s*.5,a:0,l:rnd(.4,.9),sd:Math.random(),k:1})}}}}
export function updParticles(dt,lc,li){const s=k3.curP,a=SMK.u;
 a.uAmb.value.set(s.hG).multiplyScalar(s.hI*.35).add(new T.Color(s.hS).multiplyScalar(s.hI*.4));a.uLit.value.setRGB(...s.sunC).multiplyScalar(s.sunL*.35);
 a.uFC.value.setRGB(...lc).multiplyScalar(li*.012);a.uFP.value.copy(flame.position);
 SPK.upd(dt,(p,dt)=>{p.vy-=9.8*dt*(p.k?1:.25);const f=p.a/p.l;return p.k?[.05,12,8,4.5,(1-f)]:[.035,9,4,1.2,(1-f)*.9]});
 SMK.upd(dt,(p,dt)=>{const f=p.a/p.l;p.vx*=Math.exp(-dt*(p.k==2||p.k==6?.35:p.k==7?1.6:p.k==8?.7:.8));p.vz*=p.k==7?Math.exp(-dt*1.6):p.k==8?Math.exp(-dt*.3):1;p.vz*=Math.exp(-dt*.6);p.vy+=dt*(p.k==2?1.2:p.k==8?-.2:.6);p.vy*=Math.exp(-dt*.3);
  const sz=p.s0+(p.s1-p.s0)*Math.pow(f,.55),fa=Math.min(1,f*8)*(1-f);
  return p.k==8?[sz,.52,.33,.2,fa*.42]:p.k==6?[sz,.32,.26,.2,fa*.5]:p.k==7?[sz,.62,.55,.44,fa*.38]:p.k==1?[sz,.06,.055,.05,fa*.7]:p.k==2?[sz,.92,.93,.95,fa*.5]:[sz,.9,.92,.95,fa*.22]})}
/* ======================= fire puffs: compressor-stall fireballs, light-off flash ======================= */
export function burst(n,big){if(state.mi>1)return;const ax=axisDir();for(let i=0;i<n;i++){const p=axisPt(rnd(0,.6),rnd(0,.25),rnd(0,6.3)),s=rnd(6,18)*(big?1:.6);FIR.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-1.5,1.5),vy:ax.y*s+rnd(-.5,2),vz:ax.z*s+rnd(-1.5,1.5),a:0,l:rnd(.35,.8)*(big?1:.7),sd:Math.random(),s0:big?.35:.25,s1:big?rnd(1.4,2.4):rnd(.8,1.4)})}}
