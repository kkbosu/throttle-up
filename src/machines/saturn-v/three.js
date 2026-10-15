// SATURN V (five F-1s): 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { V3, rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK } from '../../render3d/particles.js';
import { sicE } from '../table.js';

export default {
plume(u,fl){let li,lc;{const fl2=.94+.06*Math.sin(state.simT*53)*Math.sin(state.simT*31+1),ig=Math.min(1,state.ign);u.uCl.value=1;u.uAnn.value=0;
  [[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=sicE[j]});u.uMR.value=4.6;u.uMg.value.set(3,11);
  u.uR0.value=1.75;u.uSp.value=.045;u.uLen.value=10+state.N*4;u.uTurb.value=.45+ig*.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[5,3.6,1.6],[3.4,1.5,.4],[1.4,.4,.08],[.3,.06,.01]][i]));
  u.uI.value=(state.N>.01?1.15:0)*fl2+ig*.8;u.uDia.value=.12*state.N;u.uDiaSp.value=2.2;u.uDiaN.value=2;u.uDiaOff.value=.3;u.uDisk.value=0;u.uDiaR.value=.6;u.uDC.value.set(4,3,2);u.uGreen.value=0;
  u.uHeat.value=state.N*1.6+ig*.5;u.uHeatLen.value=6;li=state.N*520+ig*220;lc=[1,.62,.3]}return[li,lc]},
emit(dt,ax){const qm=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(state.N*48+state.ign*30)*qm;
  while(k3.steamAcc>1){k3.steamAcc--;const sp=rnd(7,20)*(.5+state.N*.6),sm2=Math.random()<.4;SMK.add({x:rnd(3,9),y:rnd(1,3.5),z:rnd(-6,6),vx:sp,vy:rnd(2,6),vz:rnd(-4,4),a:0,l:rnd(6,9),sd:Math.random(),k:sm2?6:2,s0:3,s1:rnd(16,26)})}},
thermal(amb,nn,fh){thSet(TH.case,amb+state.N*40);thSet(TH.bell,amb+state.N*480,-state.N*220,-3.9,0);thSet(TH.hot,amb+state.N*450);thSet(TH.inner,amb+state.N*900)},
flame:()=>V3(1.5,3.2,0),
};
