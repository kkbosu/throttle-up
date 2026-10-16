// The per-frame render: update the machine, camera, plume, particles, tracers, then the render passes.
import { M3 } from '../machines/three.js';
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
export let pr0, ZA;

export function createFrame() {
  k3.lastPh = 0;
}

export function createFrame2() {
  /* ======================= frame ======================= */
  pr0 = V3();
  ZA = V3();
}

export function render(dt, dr) {
  if (k3.QA !== state.Q) setup();
  if (k3.MA !== state.mi) applyMachine();
  if (k3.curS !== sKey(state.scene)) applyScene(state.scene);
  const e = ENG[state.mi];
  e.upd(dt);
  /* metal heat glow follows EGT (hg) and the afterburner */
  MT.hot.emissiveIntensity = state.hg * state.hg * state.hg * 0.12;
  MT.flap.emissiveIntensity = M3[state.mi].flap ? M3[state.mi].flap() : 0;
  MT.srHot.emissiveIntensity = state.hg * state.hg * state.hg * 0.08 + state.A * 0.1;
  MT.inner.emissiveIntensity = (state.exposed ? 0.35 : 1) * (M3[state.mi].inner ? M3[state.mi].inner() : 0);
  MT.inner.emissive.setRGB(state.gn > 0.3 ? 0.3 : 1, state.gn > 0.3 ? 1 : 0.42, state.gn > 0.3 ? 0.4 : 0.13);
  const night = k3.curP.fl;
  e.lens.forEach((l) => l.material.color.setRGB(night * 6, night * 5, night * 3.6));
  camera(dr);
  const [li, lc] = plumeParams(dt);
  flame.color.setRGB(...lc);
  flame.intensity = li;
  flame.position.copy(M3[state.mi].flame());
  emitters(dt);
  updParticles(dt, lc, li);
  if (k3.lastPh == 1 && state.ph == 2) burst(10, false);
  k3.lastPh = state.ph;
  flowSetup();
  scn.updateMatrixWorld();
  flowUpd(dt);
  FIR.upd(dt, (p, dt) => {
    p.vx *= Math.exp(-dt * 2.2);
    p.vy = p.vy * Math.exp(-dt * 2.2) + dt * 2;
    p.vz *= Math.exp(-dt * 2.2);
    const f = p.a / p.l,
      k = Math.pow(1 - f, 1.6);
    return [p.s0 + (p.s1 - p.s0) * Math.sqrt(f), 3 * k + 0.25, 1.2 * k + 0.06, 0.3 * k, (1 - f) * 0.7];
  });
  scn.updateMatrixWorld();
  sky.position.copy(cam.position);
  k3.plume.matrix.copy(e.anchor.matrixWorld);
  k3.plume.matrixWorldNeedsUpdate = true;
  PU.uInv.value.copy(e.anchor.matrixWorld).invert();
  cam.getWorldDirection(PU.uFwd.value);
  PU.uT.value = state.simT;
  R.setRenderTarget(k3.rtM);
  if (state.lens) lensRender();
  else {
    R.setClearColor(0x000000, 1);
    R.clear();
    R.render(scn, cam);
  }
  R.toneMapping = state.lens ? T.NoToneMapping : T.ACESFilmicToneMapping;
  k3.bloom.enabled = state.Q > 0 && !state.lens;
  k3.cpass.uniforms.uMode.value = state.lens;
  R.setRenderTarget(k3.rtP);
  R.setClearColor(0x000000, 0);
  R.clear();
  R.render(pscn, cam);
  R.setRenderTarget(null);
  const cu = k3.cpass.uniforms;
  cu.uT.value = state.simT;
  cu.uHaze.value = state.Q > 0 ? (2.2 + state.A * 2.2) * k3.pr * (state.view == 2 ? 0.35 : 1) : 0;
  cu.uKick.value = state.kick * 0.2 + (state.sT > 0 ? state.ign * 0.05 : 0);
  /* nozzle exit depth along the view, and how far the hot exit reaches sideways (one bell, or the whole cluster) */
  cu.uZA.value = -ZA.setFromMatrixPosition(e.anchor.matrixWorld).applyMatrix4(cam.matrixWorldInverse).z;
  cu.uZR.value = PU.uR0.value + (PU.uCl.value > 0.5 ? PU.uMR.value : 0);
  k3.bloom.strength = 0.35 + state.A * 0.15;
  k3.comp.render(dr);
  SPK.L.length = Math.min(SPK.L.length, 400);
  P.length = EM.length = SM.length = VP.length = 0;
}
