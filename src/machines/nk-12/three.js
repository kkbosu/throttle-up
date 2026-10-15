// NK-12: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { k3 } from '../../render3d/context.js';
import { rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';

export default {
plume(u,fl){let li,lc;{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=.42;u.uSp.value=.08;u.uLen.value=2+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[.6,.5,.45],[.4,.3,.25],[.2,.15,.12],[.05,.04,.03]][i],b=[[4,2.4,.9],[2.4,.9,.2],[1,.25,.04],[.2,.03,0]][i];u[k].value.set(...C(a,b,ig))});
  u.uI.value=nn*.03+ig*.7;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*1.3+ig*.3;u.uHeatLen.value=2.5;li=ig*25;lc=[1,.6,.3]}return[li,lc]},
emit(dt,ax){const nn=state.N*state.fu*sm(.5,1,state.prp);if(nn>.15){k3.sparkAcc+=dt*nn*14*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const z=rnd(-3.2,3.2),sp=rnd(7,18)*nn;SMK.add({x:rnd(-3.5,0),y:.2,z,vx:sp,vy:rnd(.2,1.4),vz:z*rnd(.1,.5),a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.5,s1:rnd(2.5,5)})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+state.N*25+state.hg*25);thSet(TH.hot,amb+state.N*330+state.hg*60);thSet(TH.inner,amb+state.N*700);thSet(TH.bell,amb)},
flame:()=>axisPt(.6,0,0),
};
