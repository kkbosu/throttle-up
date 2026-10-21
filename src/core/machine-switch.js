// Machine selection: the chip buttons, which machines are available (3D-only ones need 3D), switching and resetting.
import { state } from './state.js';
import { $ } from './util.js';
import { buildLabels, lab, say } from '../hud/controls.js';
import { GV, buildFaces } from '../hud/gauges.js';
import { applyRaw } from '../input/lever.js';
import { MC } from '../machines/index.js';
import { EM, P, SM, VP } from '../render2d/index.js';
import { seqStop } from '../sequence/sequence.js';

/* next machine in the cycle; the Hall thruster needs the 3D renderer */
export function nextM(i) {
  let j = i;
  do {
    j = (j + 1) % MC.length;
  } while (MC[j].need3d && !state.G3 && j !== i);
  return j;
}
/* views on offer: 2D has SIDE, CLOSE-UP, REAR; 3D adds EARTH for the machine in orbit, DRONE for the others */
export function views() {
  return !state.G3 ? [0, 1, 2] : state.M.space ? [0, 1, 2, 3] : [0, 1, 2, 4];
}
export function prevM(i) {
  let j = i;
  do {
    j = (j - 1 + MC.length) % MC.length;
  } while (MC[j].need3d && !state.G3 && j !== i);
  return j;
}
export function chips() {
  [...$('mch').children].forEach((b, j) => (b.style.display = MC[j].need3d && !state.G3 ? 'none' : ''));
  if (state.M.need3d && !state.G3) setMachine(0);
}
/* switching machine resets the sim to cold and starts the new engine straight away (lever back to idle) */
export function setMachine(i) {
  seqStop(false);
  state.mi = i;
  state.M = MC[i];
  state.GC = state.M.g;
  state.sl = 0;
  state.tsT = state.TS = 1;
  state.alt = state.vz = 0;
  state.raw2 = 0.914;
  MC.forEach((m) => {
    if (m.reset) m.reset();
  });
  if (state.M.onSelect) state.M.onSelect();
  if (!views().includes(state.view)) state.view = 0;
  if (state.M.space && state.lens == 1) state.lens = 0;
  if (state.W) state.nx = state.W * state.M.nxf;
  state.N =
    state.A =
    state.kick =
    state.ign =
    state.spd =
    state.sg =
    state.fu =
    state.hg =
    state.sT =
    state.Nst =
    state.stl =
    state.gn =
    state.spk =
    state.mach =
    state.pulseT =
    state.bt =
    state.coolS =
    state.tm =
      0;
  state.E = 20;
  state.F = 0;
  state.lit = false;
  GV[0] = GV[1] = GV[2] = 0;
  P.length = EM.length = SM.length = VP.length = 0;
  state.raw = 0;
  applyRaw();
  state.Lp = state.L;
  state.Lrate = 0;
  buildFaces();
  buildLabels();
  $('ovh').textContent = state.M.n;
  $('ovs').textContent = state.M.sub;
  [...$('mch').children].forEach((b, j) => b.classList.toggle('on', j == i));
  if (state.ph) {
    state.ph = 1;
    state.st = 0;
    state.igt = 0;
    state.Ns = 0;
    say('Engine starting...');
  }
  lab();
}
/* load-time setup, called from main.js in v11's order */
export function wireMachineSwitch() {
  MC.forEach((m, i) => {
    const b = document.createElement('button');
    b.textContent = m.btn;
    b.onclick = (e) => {
      e.stopPropagation();
      setMachine(i);
    };
    $('mch').appendChild(b);
  });
}
