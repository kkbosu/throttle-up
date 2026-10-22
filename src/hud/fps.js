// ?fps: a frame-time readout under the title, for reporting performance from real devices (a screenshot carries
// everything: frame rate, average and 95th-percentile frame time, JavaScript time, what the GPU was given, quality
// level, render size, GPU).
// Its height is fixed (style.css), because the gauges are placed under #hud only when the window resizes.
import { FPS, QP } from '../core/params.js';
import { state } from '../core/state.js';
import { $ } from '../core/util.js';

const WIN = 2000; /* ms of frames the numbers cover */
let el = null,
  gpu = '',
  shown = 0,
  t0 = 0,
  info = null,
  last = { triangles: 0, calls: 0 }; /* the previous frame's GPU work */
/* per frame over the window: timestamp, real time since the previous frame, JavaScript time in frame() (ms) */
const ts = [],
  dts = [],
  js = [];

export function wireFps() {
  if (!FPS) return;
  el = document.createElement('div');
  el.id = 'fps';
  el.innerHTML = '<div>-- fps</div><div></div><div></div><div></div>';
  $('hud').insertBefore(el, $('hint'));
}

/* the GPU's name, from the context three.js already made (never creates one: in 2D the canvas stays unused);
   ANGLE's wrapper "ANGLE (vendor, renderer, API)" is cut to what's inside it */
function gpuName() {
  if (gpu || !state.G3) return gpu;
  const c = $('gl').getContext('webgl2'),
    x = c && c.getExtension('WEBGL_debug_renderer_info');
  gpu = String((c && c.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : c.RENDERER)) || '?').replace(
    /^ANGLE \((.*)\)$/,
    '$1',
  );
  return gpu;
}

const k = (n) => (n >= 1e4 ? Math.round(n / 1000) + 'k' : String(n));

/* start of frame(): t is the frame's timestamp, dt the real ms since the previous frame */
export function fpsTick(t, dt) {
  if (!el) return;
  t0 = performance.now();
  if (state.G3 && !info) {
    /* three resets its counters on every render call; a frame makes several, so count the whole frame instead */
    info = state.G3.R.info;
    info.autoReset = false;
  }
  if (dt > 0 && dt < 10000) {
    ts.push(t);
    dts.push(dt);
    js.push(NaN); /* filled in by fpsDone() */
  }
  while (ts.length && ts[0] < t - WIN) {
    ts.shift();
    dts.shift();
    js.shift();
  }
  if (t - shown < 500 || dts.length < 3) return;
  shown = t;
  const avg = dts.reduce((a, b) => a + b, 0) / dts.length,
    p95 = [...dts].sort((a, b) => a - b)[Math.floor(dts.length * 0.95)],
    jsd = js.filter((v) => v === v),
    jsa = jsd.reduce((a, b) => a + b, 0) / Math.max(1, jsd.length),
    gl = $('gl'),
    [a, b, c, d] = el.children;
  a.textContent = `${Math.round(1000 / avg)} fps · ${avg.toFixed(1)} ms · p95 ${p95.toFixed(1)}`;
  b.textContent = `JS ${jsa.toFixed(1)} ms` + (info ? ` · ${k(last.triangles)} tris · ${last.calls} calls` : '');
  c.textContent = `Q${state.Q}${QP === null ? ' auto' : ''} · ${state.G3 ? `3D ${gl.width}×${gl.height}` : '2D'} · ${state.M.btn}`;
  d.textContent = state.G3 ? gpuName() : '';
}

/* end of frame(): its JavaScript time, and the GPU work it queued (read here, before the counters reset) */
export function fpsDone() {
  if (!el) return;
  if (js.length) js[js.length - 1] = performance.now() - t0;
  if (info) {
    last = { triangles: info.render.triangles, calls: info.render.calls };
    info.reset();
  }
}
