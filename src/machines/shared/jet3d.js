import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { k3 } from '../../render3d/context.js';
import { rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, SPK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
// What the two jets (F-TYPE, SR-71) share in the 3D renderer: plume, embers/soot, thermal lens, flame light,
// inner glow, tracer speed. Bodies are v11's `mi<2` branches; isSR switches the J58-specific numbers.

export function jetPlume(u,fl,isSR){let li,lc;{u.uCl.value=0;u.uAnn.value=0;const sr=isSR,re=sr?.62:.45-.1*sm(.3,.95,state.N)+.17*state.A,ab=sm(0,.22,state.A),dry=sm(.3,1,state.N)*state.fu,ig=Math.min(1,state.ign);
  u.uR0.value=re*.92;u.uSp.value=.04+.05*ab;u.uLen.value=(sr?2.6:2.0)+state.N*1.5*(1-ab)+ab*((sr?5:4)+state.A*(sr?9:7))+ig*2.5;
  const dC=[[.5,.62,1.5],[.25,.32,1.0],[.25,.15,.35],[.08,.03,.05]],aC=sr?[[3.4,2.6,2.2],[2.6,1.05,.4],[1.1,.24,.06],[.2,.025,0]]:[[3.2,2.4,1.5],[2.4,.95,.25],[1.0,.2,.03],[.18,.02,0]],iC=[[3,1.7,.5],[2,.7,.12],[.8,.15,.02],[.15,.015,0]];
  const mix=Math.max(ab,ig*.9,k3.fire);['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const b=ab>=Math.max(ig*.9,k3.fire)?aC[i]:iC[i];u[k].value.set(...C(dC[i],b,mix))});
  u.uI.value=(dry*.24*(1-ab)+ab*(.85+.75*state.A)+ig*.9+k3.fire*1.1)*fl;u.uTurb.value=.35+.4*ab+k3.fire;u.uFire.value=k3.fire+ig*.4;
  u.uDia.value=(dry*.3*(1-ab)+state.A*.75)*(sr?1.1:1)*fl;u.uDiaSp.value=(sr?1.15:.95)*(.8+.4*ab)*(re/.45)**.3;u.uDiaN.value=sr?5.5:3.6;u.uDiaOff.value=.35;u.uDisk.value=0;u.uDiaR.value=.62;
  u.uDC.value.set(...(state.A>.05?[3.4,2.9,2.3]:[.7,.95,2.0]));u.uGreen.value=state.gn;
  u.uHeat.value=state.N*state.N*.55*state.fu+state.A*.8+ig*.3+k3.fire*.6;u.uHeatLen.value=3+state.A*5;
  li=state.A*60+dry*5+ig*40+k3.fire*25+state.gn*40;lc=state.gn>.3?[.35,1,.45]:state.A>.05||ig>.1||k3.fire>.1?[1,.55,.25]:[.55,.65,1]}return[li,lc]}
export function jetEmit(dt,ax){/* afterburner embers (sparse) */k3.sparkAcc+=dt*(state.A>.5?state.A*14:0)+dt*(k3.fire*40);
  while(k3.sparkAcc>1){k3.sparkAcc--;const p=axisPt(rnd(0,1.5),rnd(0,.3),rnd(0,6.3)),s=rnd(18,45);SPK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-2,2),vy:ax.y*s+rnd(-1,3),vz:ax.z*s+rnd(-2,2),a:0,l:rnd(.3,.8),sd:Math.random(),k:0})}
  /* soot from a surge, a puff of vapour at light-off */
  k3.sootAcc+=dt*(k3.fire>.3?90:0);while(k3.sootAcc>1){k3.sootAcc--;const p=axisPt(rnd(0,1),rnd(0,.3),rnd(0,6.3)),s=rnd(6,16);SMK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s,vy:ax.y*s+rnd(.5,2),vz:ax.z*s+rnd(-1,1),a:0,l:rnd(2,3.5),sd:Math.random(),k:1,s0:.4,s1:3.5})}}
export function jetThermal(amb,nn,fh){thSet(TH.case,amb+state.N*35+state.hg*45,state.hg*state.hg*230+state.A*70,-3.4,-1.2,fh*.15,4);thSet(TH.hot,amb+70*state.N+state.hg*360+state.A*230,state.A*260,-1.6,0);thSet(TH.inner,amb+state.hg*620+state.A*880+state.ign*420+state.gn*300);thSet(TH.bell,amb)}
export const jetThFh=()=>state.A*320+state.N*state.N*state.fu*80+k3.fire*300+state.ign*120;
export const jetFlame=()=>axisPt(3.2,0,0);
export const jetInner=()=>(state.hg*state.hg*.35+state.A*1.1+state.ign*1.2+state.gn*1)*(.9+.1*Math.sin(state.simT*40));
export const jetFlowSpeed=()=>.12+state.N*1.6;
