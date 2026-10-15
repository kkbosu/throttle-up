// SHUTTLE (RS-25): 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { V3, rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, SPK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';

export default {
plume(u,fl){let li,lc;{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=1.08;u.uSp.value=.035;u.uLen.value=4.5+nn*2;u.uTurb.value=.3+ig*.6;u.uFire.value=ig*.3;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.0,1.15,2.3],[.55,.45,1.25],[.3,.17,.55],[.12,.05,.12]][i],b=[[6,3.4,1],[4,1.4,.25],[1.6,.3,.04],[.3,.03,0]][i];u[k].value.set(...C(a,b,ig*.85))});
  u.uI.value=(nn*.6+ig*.9)*fl;u.uDia.value=nn*2.4*fl;u.uDiaSp.value=1.3;u.uDiaN.value=1.3;u.uDiaOff.value=.25;u.uDisk.value=.85;u.uDiaR.value=.6;
  u.uDC.value.set(5,4.4,4.6);u.uGreen.value=0;u.uHeat.value=nn*1.6+ig*.6;u.uHeatLen.value=3.5;
  li=nn*95+ig*80;lc=ig>.2?[1,.55,.25]:[.72,.78,1]}return[li,lc]},
emit(dt,ax){const nn=state.N*state.fu;
  /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
  const qmax=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(nn*34+state.ign*24)*qmax;
  while(k3.steamAcc>1){k3.steamAcc--;const s=rnd(6,15)*(.5+nn*.7);SMK.add({x:rnd(.5,3.5),y:rnd(.9,2.4),z:rnd(-2.4,2.4),vx:s,vy:rnd(1.5,5),vz:rnd(-2.5,2.5),a:0,l:rnd(5,8),sd:Math.random(),k:2,s0:2.2,s1:rnd(12,20)})}
  /* steam drifting off the plume column near the bell */
  if(nn>.1&&Math.random()<dt*8*qmax){const p=axisPt(rnd(.3,2.5),rnd(1.2,1.8),rnd(0,6.3));SMK.add({x:p.x,y:p.y,z:p.z,vx:rnd(-1,2),vy:rnd(-.5,1.5),vz:rnd(-1,1),a:0,l:rnd(2,4),sd:Math.random(),k:3,s0:.6,s1:2.6})}
  /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
  if(state.ph==1&&state.st>.5){k3.sparkAcc+=dt*90;while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.floor(Math.random()*4)/4*6.283+.4,p=axisPt(rnd(.4,.8),1.6,a),s=rnd(4,10);SPK.add({x:p.x,y:p.y,z:p.z,vx:-Math.cos(a)*s*0+rnd(-3,3),vy:rnd(-2,4),vz:-Math.sin(a)*s*.5,a:0,l:rnd(.4,.9),sd:Math.random(),k:1})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+nn*25);thSet(TH.bell,amb+nn*520,-nn*270,-2.9,0);thSet(TH.inner,amb+nn*900);thSet(TH.hot,amb+nn*480)},
flame:()=>V3(.6,2.4,0),
};
