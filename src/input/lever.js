// Input: throttle lever (with the MIL detent), second lever, keyboard.
import { tick } from '../audio/audio.js';
import { state } from '../core/state.js';
import { $, cv } from '../core/util.js';
import { act } from '../hud/controls.js';

/* ---------- input: lever with a detent at MIL ---------- */
export function applyRaw() {
  const r = state.raw,
    d = state.M.ab;
  state.L = d ? (r < 0.7 ? r : r < 0.8 ? 0.7 : 0.7 + ((r - 0.8) / 0.2) * 0.3) : r;
  const s = d && r >= 0.7 && r < 0.8;
  if (s !== state.stuck) {
    state.stuck = s;
    tick();
    /* the gate lights while the lever sits in the detent, and a phone gives a short buzz as a dragged lever goes in or out */
    tq.classList.toggle('latch', !!s);
    if (state.drag && navigator.vibrate) navigator.vibrate(10);
  }
}
export const tq = $('tq'),
  trk = $('trk');
export function fromY(y) {
  const b = trk.getBoundingClientRect();
  state.raw = Math.min(1, Math.max(0, 1 - (y - b.top) / b.height));
  applyRaw();
}
export function fromY2(y) {
  const b = $('trk2').getBoundingClientRect();
  state.raw2 = Math.min(1, Math.max(0, 1 - (y - b.top) / b.height));
}
export const K = {};
let sideK = 0;
export function keys(dt) {
  /* sliding (Harrier deck landing): ←/→ steer, A/D keep the nozzle lever */
  if (state.slide) {
    const s = (K.arrowright ? 1 : 0) - (K.arrowleft ? 1 : 0);
    /* a key held sets the input; releasing it centres it (a drag in progress is left alone) */
    if (s || sideK) state.side = s;
    sideK = s;
  }
  if (state.M.nozzle) {
    const n = (state.slide ? K.d : K.arrowright || K.d) ? 1 : 0,
      m = (state.slide ? K.a : K.arrowleft || K.a) ? 1 : 0;
    if (n - m) state.raw2 = Math.min(1, Math.max(0, state.raw2 + (n - m) * 0.5 * dt));
  }
  const d = (K.arrowup || K.w ? 1 : 0) - (K.arrowdown || K.s ? 1 : 0);
  if (!d) return;
  const sp = state.M.ab && state.raw >= 0.7 && state.raw < 0.8 ? 0.1 : 0.45;
  state.raw = Math.min(1, Math.max(0, state.raw + d * sp * dt));
  applyRaw();
}
/* load-time setup, called from main.js in v11's order */
export function wireInput() {
  tq.addEventListener('pointerdown', (e) => {
    tq.setPointerCapture(e.pointerId);
    tq.classList.add('drag');
    if (state.M.nozzle) {
      const a = trk.getBoundingClientRect(),
        c = $('trk2').getBoundingClientRect();
      if (Math.abs(e.clientX - c.left - 6) < Math.abs(e.clientX - a.left - 6)) {
        state.drag2 = true;
        tq.classList.add('drag2');
        fromY2(e.clientY);
        return;
      }
    }
    state.drag = true;
    fromY(e.clientY);
  });
  tq.addEventListener('pointermove', (e) => {
    if (state.drag2) fromY2(e.clientY);
    else if (state.drag) fromY(e.clientY);
  });
  ['pointerup', 'pointercancel'].forEach((n) =>
    tq.addEventListener(n, () => {
      state.drag = state.drag2 = false;
      tq.classList.remove('drag', 'drag2');
    }),
  );
  /* sliding: drag sideways anywhere on the view; the input springs back to centre on release */
  let sx = null;
  cv.addEventListener('pointerdown', (e) => {
    if (!state.slide) return;
    sx = { x: e.clientX, id: e.pointerId };
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  cv.addEventListener('pointermove', (e) => {
    if (sx && e.pointerId === sx.id)
      state.side = Math.max(-1, Math.min(1, (e.clientX - sx.x) / Math.max(60, Math.min(160, state.W * 0.15))));
  });
  ['pointerup', 'pointercancel'].forEach((n) =>
    cv.addEventListener(n, (e) => {
      if (sx && e.pointerId === sx.id) {
        sx = null;
        state.side = 0;
      }
    }),
  );
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    K[k] = 1;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = {
      v: 'view',
      e: 'exp',
      c: 'scn',
      m: 'slow',
      r: 'rec',
      o: 'eng',
      f: 'flt',
      n: 'mach',
      q: 'seq',
      i: 'inf',
      l: 'lens',
    }[k];
    if (m && state.ph) act(m == 'mach' && e.shiftKey ? 'machp' : m); /* Shift+N: previous machine */
  });
  addEventListener('keyup', (e) => (K[e.key.toLowerCase()] = 0));
}
