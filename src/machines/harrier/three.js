// HARRIER (Pegasus): 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { state } from '../../core/state.js';
import { ENG } from '../../render3d/builders.js';
import { k3 } from '../../render3d/context.js';
import { rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';

export default {
plume(u,fl){let li,lc;{const nn=state.N*state.fu;u.uCl.value=1;u.uAnn.value=0;
  [[1.05,1.02,1],[1.05,-1.02,1],[-1,1.08,.3],[-1,-1.08,.3],[0,0,0]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=o[2]});u.uMR.value=1.5;u.uMg.value.set(2,7);
  u.uR0.value=.28;u.uSp.value=.09;u.uLen.value=2.5+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.5,.6,1.1],[.3,.35,.8],[.15,.15,.4],[.05,.04,.1]][i]));
  u.uI.value=nn*.22+Math.min(1,state.ign)*.6;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*nn*1.8+state.ign*.3;u.uHeatLen.value=3;li=nn*4+state.ign*20;lc=[.7,.75,1]}return[li,lc]},
emit(dt,ax){const nn=state.N*state.fu,e=ENG[5],gy=e.AC.position.y-1.9;if(state.alt<14&&nn>.4&&state.nz>45){k3.sparkAcc+=dt*nn*70*(1-state.alt/14)*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,2.5),sp=rnd(6,16)*(1-state.alt/16);SMK.add({x:Math.cos(a)*r,y:.25,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.4,2.2),vz:Math.sin(a)*sp,a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.6,s1:rnd(3,6)})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+state.N*30+state.hg*30);thSet(TH.hot,amb+80*state.N+state.hg*420);thSet(TH.inner,amb+state.hg*600);thSet(TH.bell,amb)},
flame:()=>axisPt(1.5,0,0),
};
