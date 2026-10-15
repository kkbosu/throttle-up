// Engine model: spool, light-off, EGT, fuel flow, afterburner, compressor stall; machine hooks run from update().
import { bang, beep, thump, tick } from '../audio/audio.js';
import { state } from './state.js';
import { $, sm } from './util.js';
import { say } from '../hud/controls.js';
import { hoverStep, orbStep } from '../machines/table.js';
import { P, SM } from '../render2d/index.js';

/* ---------- engine model: thrust chases the lever with lag ---------- */
/* ph: 0 off, 1 starter cranking, 2 running. E = exhaust temp (C), F = fuel flow (1000 lb/h) */
export function update(dt){
 if(!state.ph||dt<=0)return;
 const N0=state.N;
 if(state.ph==1){state.st+=dt;state.N=state.Ns+(Math.max(state.M.cN,state.Ns)-state.Ns)*sm(0,state.M.cT,state.st);
  if(state.st>state.M.tk[0]){state.igt+=dt;if(state.igt>state.M.tk[1]){state.igt=0;tick()}}
  if(state.st>=state.M.cT){state.ph=2;state.ign=state.M.ign;state.kick=Math.max(state.kick,state.M.lk);state.E=Math.max(state.E,state.M.e0f);state.gn=state.M.teb?1:0;thump(state.M.lt);$('hint').textContent=state.M.hint}}
 else if(state.ph==2){const tN=state.M.ab?(state.L<=.7?state.M.idle+state.L/.7*(1-state.M.idle):1):state.M.idle+(1-state.M.idle)*state.L;
  state.coolS=Math.max(0,state.coolS-dt);
  /* a slam at low N1 can push the compressor into surge: roll once per slam, scaled by how hard it was */
  if(state.M.stall&&state.sT<=0&&state.coolS<=0&&state.Lrate>1.6&&state.N<.7&&tN-state.N>.3){state.coolS=3;if(state.faults&&Math.random()<Math.min(.9,Math.max(.25,(state.Lrate-1.6)/3)))startStall()}
  if(state.sT>0){state.sT-=dt*(state.L<.35?3:1);state.pulseT-=dt;state.bt-=dt;               /* pulling the lever back clears it ~3x faster */
   state.N+=(state.Nst*.55-state.N)*(1-Math.exp(-dt/.45));
   if(state.pulseT<=0){state.pulseT=.34+.1*Math.sin(state.simT*5);surge()}
   if(state.bt<=0){state.bt=.5;beep()}
   if(state.sT<=0){state.sT=0;say('Engine recovered. Advance the throttle smoothly.')}}
  else state.N+=(tN-state.N)*(1-Math.exp(-dt/(tN>state.N?state.M.up:state.M.dn)))}
 else{state.N-=state.N*(1-Math.exp(-dt/state.M.coast));if(state.N<.004)state.N=0}   /* ph 3: fuel off, rotor windmills down */
 const want=state.M.ab&&state.ph==2&&state.L>.702&&state.N>.93;
 if(want&&!state.lit){state.tm+=dt;if(state.tm>.3){state.lit=true;state.tm=0;state.kick=1;if(state.M.teb)state.gn=1;thump();navigator.vibrate&&navigator.vibrate(30)}}
 else if(state.L<=.702){state.lit=false;state.tm=0}
 const aT=state.lit?.2+.8*(state.L-.7)/.3:0;
 state.A+=(aT-state.A)*(1-Math.exp(-dt/(aT>state.A?.45:.3)));
 state.kick*=Math.exp(-dt*3.2);state.ign*=Math.exp(-dt*2.2);state.gn*=Math.exp(-dt*2.6);
 /* SR-71: the lever also sets a simulated Mach number (0 idle, 1.2 MIL, 3.2 full A/B). The spike stays forward until about Mach 1.6 and is fully aft (26 in) by Mach 3 */
 const tMach=state.ph==2&&state.M.spike?(state.L<=.7?state.L/.7*1.2:1.2+(state.L-.7)/.3*2):0;
 state.mach+=(tMach-state.mach)*(1-Math.exp(-dt/(tMach>state.mach?2.5:4)));state.spk=Math.min(1,Math.max(0,(state.mach-1.6)/1.4));
 state.spd+=(Math.max(0,(N0-state.N)/dt)*state.N-state.spd)*(1-Math.exp(-dt/.15));   /* spool-down rate drives the whine */
 state.sg=state.ph==1?1:state.ph==2?Math.max(0,1-(state.N-state.M.cN)/.1):0;                 /* starter motor drops out as the engine takes over */
 const Nf=state.sT>0?Math.max(state.N,state.Nst):state.N,tE=state.ph==2?state.M.e[0]+state.N*state.M.e[1]+state.A*state.M.e[2]+(state.sT>0?520:0):20,tF=state.ph==2?(state.M.f[0]+state.M.f[1]*Math.pow(Nf,state.M.f[2])+state.A*state.M.f[3])*(1+(state.sT>0?.35*Math.sin(state.simT*17):0)):0;
 state.E+=(tE-state.E)*(1-Math.exp(-dt/(tE>state.E?(state.sT>0?.7:1.6):2.8)));state.F+=(tF-state.F)*(1-Math.exp(-dt/(tF>state.F?.25:.4)));
 state.fu+=((state.ph==2?1:0)-state.fu)*(1-Math.exp(-dt/(state.ph==2?.35:.08)));   /* combustion: dies fast on fuel cut */
 state.stl+=((state.sT>0?1:0)-state.stl)*(1-Math.exp(-dt/.25));                   /* smoothed stall level for sound + gauges */
 state.hg=Math.min(1,Math.max(0,(state.E-150)/600));if(state.M.orbit)orbStep(dt);if(state.M.clu)state.M.clu(dt);if(state.M.hover)hoverStep(dt);                      /* metal glow follows EGT, so it cools slowly */
 if((state.A>.5||(!state.M.ab&&state.N>.9))&&state.hinted){state.hinted=false;$('hint').style.opacity=0}
}
export function startStall(){state.sT=2.6;state.Nst=state.N;state.pulseT=0;state.bt=0;say('COMPRESSOR STALL! Ease the throttle back.')}
/* one surge pulse: fireball out of the nozzle, soot, flash and shake, rotor speed jolts down, bang */
export function surge(){if(state.G3)state.G3.surge();state.ign=1.3;state.kick=Math.max(state.kick,.85);state.E+=60;state.N=Math.max(.06,state.N-.035);bang();navigator.vibrate&&navigator.vibrate(40);
 for(let i=0;i<34;i++)if(P.length<700)P.push({x:state.nx+Math.random()*20*state.u,y:state.ny+(Math.random()-.5)*30*state.u,vx:(450+Math.random()*900)*state.u,vy:(Math.random()-.5)*380*state.u,l:0,m:.4+Math.random()*.5,s:(14+Math.random()*16)*state.u,ab:1,k:.5});
 for(let i=0;i<10;i++)SM.push({x:state.nx+Math.random()*30*state.u,y:state.ny+(Math.random()-.5)*30*state.u,vx:(120+Math.random()*260)*state.u,vy:(Math.random()-.5)*60*state.u-20*state.u,l:0,m:1.4+Math.random()*.8,s:(26+Math.random()*30)*state.u})}
export function master(){
 const hint=say;
 if(state.ph==1||state.ph==2){const was=state.ph;state.ph=3;state.lit=false;state.tm=0;state.sT=0;if(was==2){thump(.35);navigator.vibrate&&navigator.vibrate(20)}hint(state.M.cut)}
 else if(state.ph==3){if(state.N<.12){state.ph=1;state.st=0;state.igt=0;state.Ns=state.N;hint('Engine starting...')}else hint(state.M.wait)}}
