// SKY CRANE: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers).
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { MLE, sc } from '../table.js';

export default {
plume(u,fl){let li,lc;{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=sc.done?0:1;u.uAnn.value=0;
  for(let j=0;j<5;j++){if(j<4){const a=Math.PI/4+j*Math.PI/2;u.uO.value[j].set(Math.cos(a)*1.6,Math.sin(a)*1.6);u.uW.value[j]=Math.min(1,(sc.thr[2*j]+sc.thr[2*j+1])/MLE*.7)}else u.uW.value[j]=0}
  u.uMR.value=2.4;u.uMg.value.set(8,30);u.uR0.value=.2;u.uSp.value=.22;u.uLen.value=5+nn*8;u.uTurb.value=.35;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.6,.55,.85],[.32,.3,.52],[.12,.1,.2],[.03,.02,.05]][i]));
  u.uI.value=(sc.done?0:1)*(nn*.12+ig*.25);u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=(sc.done?0:1)*nn*2.4;u.uHeatLen.value=4;li=(sc.done?0:1)*(nn*6+ig*8);lc=[.85,.75,1]}return[li,lc]},
emit(dt,ax){const h=state.alt,nn=state.N*state.fu;if(!sc.done&&h<30&&nn>.05){const k2=Math.pow(1-h/30,1.5);k3.sparkAcc+=dt*nn*260*k2*(state.Q>1?1:state.Q>0?.6:.35);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,4+h*.3),sp=rnd(5,16)*(.4+k2);SMK.add({x:sc.x+Math.cos(a)*r,y:.15,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.3,2.5),vz:Math.sin(a)*sp,a:0,l:rnd(2,4),sd:Math.random(),k:8,s0:.5,s1:rnd(3,7)})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+8);thSet(TH.hot,amb+nn*850);thSet(TH.inner,amb+150);thSet(TH.bell,amb)},
flame:()=>axisPt(1.2,0,0),
};
