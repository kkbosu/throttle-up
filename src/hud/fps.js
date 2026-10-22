// ?fps: a frame-time readout under the title, for reporting performance from real devices (a screenshot carries
// everything: frame rate, average and 95th-percentile frame time, quality level, render size, GPU).
// Its height is fixed (style.css), because the gauges are placed under #hud only when the window resizes.
import { FPS, QP } from '../core/params.js';
import { state } from '../core/state.js';
import { $ } from '../core/util.js';

const WIN = 2000; /* ms of frames the numbers cover */
let el = null,
  gpu = '',
  shown = 0;
/* frame timestamps and the real time between frames (ms) */
const ts = [],
  dts = [];

export function wireFps() {
  if (!FPS) return;
  el = document.createElement('div');
  el.id = 'fps';
  el.innerHTML = '<div>-- fps</div><div></div><div></div>';
  $('hud').insertBefore(el, $('hint'));
}

/* the GPU's name, from the context three.js already made (never creates one: in 2D the canvas stays unused) */
function gpuName() {
  if (gpu || !state.G3) return gpu;
  const c = $('gl').getContext('webgl2'),
    x = c && c.getExtension('WEBGL_debug_renderer_info');
  gpu = (c && c.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : c.RENDERER)) || '?';
  return gpu;
}

/* t: the frame's timestamp; dt: real ms since the previous frame. Updates the text twice a second. */
export function fpsTick(t, dt) {
  if (!el) return;
  if (dt > 0 && dt < 10000) {
    ts.push(t);
    dts.push(dt);
  }
  while (ts.length && ts[0] < t - WIN) {
    ts.shift();
    dts.shift();
  }
  if (t - shown < 500 || dts.length < 2) return;
  shown = t;
  const avg = dts.reduce((a, b) => a + b, 0) / dts.length,
    p95 = [...dts].sort((a, b) => a - b)[Math.floor(dts.length * 0.95)],
    gl = $('gl'),
    [a, b, c] = el.children;
  a.textContent = `${Math.round(1000 / avg)} fps · ${avg.toFixed(1)} ms · p95 ${p95.toFixed(1)}`;
  b.textContent = `Q${state.Q}${QP === null ? ' auto' : ''} · ${state.G3 ? `3D ${gl.width}×${gl.height}` : '2D'} · ${state.M.btn}`;
  c.textContent = state.G3 ? gpuName() : '';
}
