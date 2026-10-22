// Main loop: sim time scaled by slow-mo, adaptive quality; step() is the test hook used with ?manual.
import { audio } from '../audio/audio.js';
import { update } from './engine.js';
import { MAN, QP } from './params.js';
import { state } from './state.js';
import { $, cv } from './util.js';
import { fpsDone, fpsTick } from '../hud/fps.js';
import { gauges } from '../hud/gauges.js';
import { keys } from '../input/lever.js';
import { RC, rc, recLab, recOverlay, stopRec } from '../recorder/recorder.js';
import { draw } from '../render2d/index.js';
import { seqCap, seqTick } from '../sequence/sequence.js';

/* ---------- main loop: sim time is scaled by the slow-mo factor, input and UI run in real time ---------- */
export function ui() {
  $('hd').style.bottom = state.L * 100 + '%';
  $('hd').style.boxShadow = `0 2px 6px #000,0 0 ${state.A * 34}px rgba(255,140,40,${state.A})`;
  $('abz').style.opacity = 0.25 + state.A * 0.75;
  if (state.M.nozzle) $('hd2').style.bottom = state.raw2 * 100 + '%';
}
export function adapt(dr) {
  state.emaT += (dr * 1000 - state.emaT) * 0.05;
  if (QP === null && state.Q > 0 && state.ph && !document.hidden) {
    if (state.emaT > 26) {
      state.slowT += dr;
      if (state.slowT > 1.5) {
        state.Q--;
        state.slowT = 0;
        state.emaT = 16;
      }
    } else state.slowT = 0;
  }
}
export function frame(t) {
  fpsTick(t, t - state.last);
  const dr = Math.min(0.05, (t - state.last) / 1000 || 0.016);
  state.last = t;
  adapt(dr);
  state.Lrate += ((state.L - state.Lp) / Math.max(dr, 0.004) - state.Lrate) * (1 - Math.exp(-dr / 0.07));
  state.Lp = state.L;
  state.TS += (state.tsT - state.TS) * (1 - Math.exp(-dr * 5));
  const dt = dr * state.TS;
  state.simT += dt;
  seqTick(dr);
  keys(dr);
  update(dt);
  audio();
  draw(dt, dr);
  gauges(dr);
  if (state.G3) state.G3.overlay();
  seqCap();
  if (state.rec) {
    if (performance.now() - state.recT > 60000) stopRec();
    else {
      rc.setTransform(1, 0, 0, 1, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      rc.globalAlpha = 1;
      if (state.G3) rc.drawImage(state.G3.canvas, 0, 0, RC.width, RC.height);
      rc.drawImage(cv, 0, 0);
      rc.setTransform(state.D, 0, 0, state.D, 0, 0);
      recOverlay(rc);
    }
  }
  recLab();
  ui();
  fpsDone();
  if (!MAN) requestAnimationFrame(frame);
}
export function step(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) frame(state.last + ms);
}
