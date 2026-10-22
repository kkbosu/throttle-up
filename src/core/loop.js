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
/* Quality levels, best first: 3 = Q2, 2 = Q1, 1 = Q0 at full resolution, 0 = Q0 at 0.7 resolution. Slow frames
   (under ~38 fps for 1.5 s) step down; when the frame is mostly JavaScript (CPU-bound, as on many phones), a lower
   resolution would only blur the picture, so it drops straight to level 1 (no shadows or bloom, which do save
   draw calls) and no further. Fast frames (over ~52 fps for 5 s) step back up, but not to a level that was too
   slow within 15 s of reaching it. ?q pins the quality. */
const level = () => (state.Q > 0 ? state.Q + 1 : state.lowRes ? 0 : 1);
function setLevel(L) {
  state.Q = Math.max(0, L - 1);
  state.lowRes = L === 0;
  state.slowT = state.fastT = 0;
  state.emaT = 16;
}
export function adapt(dr, real) {
  state.emaT += (real * 1000 - state.emaT) * 0.05;
  state.emaJ += (state.jsT - state.emaJ) * 0.05;
  if (QP !== null || !state.ph || document.hidden) return;
  const L = level(),
    now = performance.now();
  if (state.emaT > 26) {
    state.fastT = 0;
    state.slowT += real;
    if (state.slowT > 1.5) {
      const cpu = state.emaJ > 0.7 * state.emaT,
        to = cpu ? Math.min(L, 1) : Math.max(0, L - 1);
      if (to < L) {
        if (now - state.qUpT < 15000) state.qCeil = L;
        setLevel(to);
      } else state.slowT = 0;
    }
  } else if (state.emaT < 19 && L < 3 && L + 1 < state.qCeil) {
    state.slowT = 0;
    state.fastT += real;
    if (state.fastT > 5) {
      setLevel(L + 1);
      state.qUpT = now;
    }
  } else state.slowT = state.fastT = 0;
}
export function frame(t) {
  fpsTick(t, t - state.last);
  const j0 = performance.now(),
    dr = Math.min(0.05, (t - state.last) / 1000 || 0.016);
  adapt(dr, Math.min(0.25, (t - state.last) / 1000 || 0.016));
  state.last = t;
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
  state.jsT = performance.now() - j0;
  fpsDone();
  if (!MAN) requestAnimationFrame(frame);
}
export function step(n = 1, ms = 16) {
  for (let i = 0; i < n; i++) frame(state.last + ms);
}
