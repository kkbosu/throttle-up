// HALL thruster: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers, EARTH view).
import { state } from '../../core/state.js';
import { V3 } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
import { RE, orb } from '../table.js';

export default {
plume(u,fl){let li,lc;{u.uCl.value=0;const nn=state.N*state.fu,ig=Math.min(1,state.ign),f2=.97+.03*Math.sin(state.simT*90);
  u.uR0.value=.058;u.uSp.value=11;u.uLen.value=.42+nn*.45;u.uTurb.value=.08;u.uFire.value=0;u.uAnn.value=.95;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.5,1.9,4.2],[.75,.85,2.8],[.4,.32,1.5],[.12,.07,.45]][i];u[k].value.set(...C(a,[3,3,4],ig*.6))});
  u.uI.value=(nn*2.8+ig*3)*f2;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=0;u.uHeatLen.value=1;
  li=nn*3+ig*4;lc=[.55,.62,1]}return[li,lc]},
emit(){},
thermal(amb,nn,fh){thSet(TH.case,amb+nn*90+(state.ph==1?40:0));thSet(TH.hot,amb+nn*420);thSet(TH.inner,amb+nn*520);thSet(TH.bell,amb)},
flame:()=>axisPt(.25,0,0),
flowStr:.004,
flowSize:.0035,
cam(P0,T0){if(state.view==3){const h=Math.max(100,(orb.r-RE)/1e3),pc=Math.acos(6371/(6371+h))+.13,hd=V3(-1,0,.12).normalize();P0.copy(T0).addScaledVector(hd,Math.cos(pc)*12);P0.y+=Math.sin(pc)*12}},
};
