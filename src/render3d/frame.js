// The per-frame render: update the machine, camera, plume, particles, tracers, then the render passes.
import * as T from 'three';
import { state } from '../core/state.js';
import { EM, P, SM, VP } from '../render2d/index.js';
import { ENG } from './builders.js';
import { camera } from './camera.js';
import { setup } from './composite.js';
import { k3 } from './context.js';
import { flowSetup, flowUpd } from './flow.js';
import { MT, R, V3, cam, pscn, scn } from './kit.js';
import { lensRender } from './lenses.js';
import { flame } from './lights.js';
import { applyMachine } from './machine.js';
import { FIR, SPK, axisPt, burst, emitters, updParticles } from './particles.js';
import { PU, plumeParams } from './plume.js';
import { applyScene, sKey } from './scenes.js';
import { sky } from './sky.js';

// assigned by create*() below, when init3D runs
export let pr0;

export function createFrame(){
k3.lastPh=0;
}

export function createFrame2(){

/* ======================= frame ======================= */
pr0=V3();
}

export function render(dt,dr){
 if(k3.QA!==state.Q)setup();if(k3.MA!==state.mi)applyMachine();if(k3.curS!==sKey(state.scene))applyScene(state.scene);
 const e=ENG[state.mi];e.upd(dt);
 /* metal heat glow follows EGT (hg) and the afterburner */
 MT.hot.emissiveIntensity=state.hg*state.hg*state.hg*.12;MT.flap.emissiveIntensity=(state.mi==0?state.A*.05:0);MT.srHot.emissiveIntensity=state.hg*state.hg*state.hg*.08+state.A*.1;MT.inner.emissiveIntensity=(state.exposed?.35:1)*(state.mi<2?(state.hg*state.hg*.35+state.A*1.1+state.ign*1.2+state.gn*1)*(.9+.1*Math.sin(state.simT*40)):0);
 MT.inner.emissive.setRGB(state.gn>.3?.3:1,state.gn>.3?1:.42,state.gn>.3?.4:.13);
 const night=k3.curP.fl;e.lens.forEach(l=>l.material.color.setRGB(night*6,night*5,night*3.6));
 camera(dr);
 const [li,lc]=plumeParams(dt);
 flame.color.setRGB(...lc);flame.intensity=li;flame.position.copy(state.mi<2?axisPt(3.2,0,0):state.mi==3?axisPt(.25,0,0):state.mi==4?V3(1.5,3.2,0):state.mi==5?axisPt(1.5,0,0):state.mi==6?axisPt(.6,0,0):state.mi==7?axisPt(1.2,0,0):V3(.6,2.4,0));
 emitters(dt);updParticles(dt,lc,li);
 if(k3.lastPh==1&&state.ph==2)burst(10,false);k3.lastPh=state.ph;
 flowSetup();scn.updateMatrixWorld();flowUpd(dt);
 FIR.upd(dt,(p,dt)=>{p.vx*=Math.exp(-dt*2.2);p.vy=p.vy*Math.exp(-dt*2.2)+dt*2;p.vz*=Math.exp(-dt*2.2);const f=p.a/p.l,k=Math.pow(1-f,1.6);return[p.s0+(p.s1-p.s0)*Math.sqrt(f),3*k+.25,1.2*k+.06,.3*k,(1-f)*.7]});
 scn.updateMatrixWorld();sky.position.copy(cam.position);
 k3.plume.matrix.copy(e.anchor.matrixWorld);k3.plume.matrixWorldNeedsUpdate=true;PU.uInv.value.copy(e.anchor.matrixWorld).invert();
 cam.getWorldDirection(PU.uFwd.value);PU.uT.value=state.simT;
 R.setRenderTarget(k3.rtM);if(state.lens)lensRender();else{R.setClearColor(0x000000,1);R.clear();R.render(scn,cam)}
 R.toneMapping=state.lens?T.NoToneMapping:T.ACESFilmicToneMapping;k3.bloom.enabled=state.Q>0&&!state.lens;k3.cpass.uniforms.uMode.value=state.lens;
 R.setRenderTarget(k3.rtP);R.setClearColor(0x000000,0);R.clear();R.render(pscn,cam);R.setRenderTarget(null);
 const cu=k3.cpass.uniforms;cu.uT.value=state.simT;cu.uHaze.value=state.Q>0?(2.2+state.A*2.2)*k3.pr*(state.view==2?.35:1):0;cu.uKick.value=state.kick*.2+(state.sT>0?state.ign*.05:0);
 k3.bloom.strength=.35+state.A*.15;k3.comp.render(dr);
 SPK.L.length=Math.min(SPK.L.length,400);P.length=EM.length=SM.length=VP.length=0}
