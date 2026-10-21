// Cockpit gauges, annunciator lamps, engine switch and inset placement, drawn on the canvas so clips include them.
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { $, MONO, cv, g, mk } from '../core/util.js';
import { seqStop } from '../sequence/sequence.js';

/* ---------- gauges: static faces are cached, needles drawn per frame ---------- */
export const A0 = 2.356,
  SW = 4.712;
export const GV = [0, 0, 0]; /* GC comes from the active machine (M.g) */
export function buildFaces() {
  const s = Math.round(state.dsz * state.D),
    R = s / 2;
  state.FC = state.GC.map((c) => {
    const k = mk(s, s),
      x = k.getContext('2d'),
      a = (v) => A0 + ((v - c.min) / (c.max - c.min)) * SW;
    x.fillStyle = 'rgba(8,10,15,.84)';
    x.strokeStyle = '#2a3040';
    x.lineWidth = s * 0.02;
    x.beginPath();
    x.arc(R, R, R - s * 0.012, 0, 6.283);
    x.fill();
    x.stroke();
    x.strokeStyle = '#c0392b';
    x.lineWidth = s * 0.035;
    x.beginPath();
    x.arc(R, R, R * 0.84, a(c.red), a(c.max));
    x.stroke();
    x.fillStyle = '#d8dde6';
    x.font = `${s * 0.1}px ${MONO}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let v = c.min; v <= c.max + 1e-6; v += c.mn) {
      const q = a(v),
        mj = Math.abs(v / c.maj - Math.round(v / c.maj)) < 1e-6,
        co = Math.cos(q),
        si = Math.sin(q),
        r0 = R * (mj ? 0.7 : 0.76),
        r1 = R * 0.9;
      x.strokeStyle = mj ? '#d8dde6' : '#6c7482';
      x.lineWidth = s * (mj ? 0.022 : 0.012);
      x.beginPath();
      x.moveTo(R + co * r0, R + si * r0);
      x.lineTo(R + co * r1, R + si * r1);
      x.stroke();
      if (mj) x.fillText(String(v / c.d), R + co * R * 0.55, R + si * R * 0.55);
    }
    x.fillStyle = '#6c7482';
    x.font = `${s * 0.085}px ${MONO}`;
    x.fillText(c.t, R, R * 1.42);
    return k;
  });
}

/* ---------- cockpit gauges: N1, EGT, fuel flow, plus annunciator lamps (drawn on the canvas so clips include them) ---------- */
export function gauges(dr) {
  if (!state.FC.length) return;
  {
    const hb = $('hud').getBoundingClientRect().bottom + 18;
    if (Math.abs(hb - state.gy) > 1) state.gy = hb;
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const vals = state.M.gv(),
    R = state.dsz / 2,
    jit = state.N + state.A + state.stl * 3;
  for (let i = 0; i < 3; i++) {
    const c = state.GC[i],
      x = state.gx + i * (state.dsz + 8),
      y = state.gy,
      cx = x + R,
      cy = y + R;
    /* caption sits over the 3D scene: light text with a dark halo, legible on bright sky and at night */
    g.font = `9px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(6,8,12,.85)';
    g.strokeText(c.cap, cx, y - 8);
    g.fillStyle = '#c3cad6';
    g.fillText(c.cap, cx, y - 8);
    g.drawImage(state.FC[i], x, y, state.dsz, state.dsz);
    const v = Math.max(c.min, Math.min(c.max * 1.03, vals[i] + (Math.random() - 0.5) * c.max * 0.006 * jit));
    GV[i] += (v - GV[i]) * (1 - Math.exp(-dr * 12));
    const q = A0 + ((GV[i] - c.min) / (c.max - c.min)) * SW,
      co = Math.cos(q),
      si = Math.sin(q);
    g.strokeStyle = '#ff9a3a';
    g.lineWidth = Math.max(1.5, state.dsz * 0.026);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - co * R * 0.12, cy - si * R * 0.12);
    g.lineTo(cx + co * R * 0.8, cy + si * R * 0.8);
    g.stroke();
    g.lineCap = 'butt';
    g.fillStyle = '#1a1e26';
    g.strokeStyle = '#6a7282';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, R * 0.09, 0, 6.283);
    g.fill();
    g.stroke();
    g.fillStyle = '#d8dde6';
    g.font = `600 ${state.dsz * 0.13}px ${MONO}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(c.f(vals[i]), cx, cy + R * 0.68);
  }
  const ly = state.gy + state.dsz + 6,
    lh = 16,
    lamps = [
      [
        state.sT > 0 ? 'STALL' : state.ph == 3 ? state.M.off : 'START',
        state.sT > 0 ? (state.simT * 8) % 1 < 0.6 : state.ph == 1 || state.ph == 3,
        state.sT > 0 ? '#e0392b' : state.ph == 3 ? '#d9822b' : '#3fcf7a',
      ],
    ].concat(state.M.lp());
  g.font = `600 9px ${MONO}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lamps.forEach((l, i) => {
    const x = state.gx + i * (state.dsz + 8);
    g.fillStyle = l[1] ? l[2] : 'rgba(14,17,24,.85)';
    g.strokeStyle = '#2a3040';
    g.lineWidth = 1;
    g.fillRect(x, ly, state.dsz, lh);
    g.strokeRect(x + 0.5, ly + 0.5, state.dsz - 1, lh - 1);
    g.fillStyle = l[1] ? '#0a0c10' : '#5d6573';
    g.fillText(l[0], x + state.dsz / 2, ly + lh / 2 + 0.5);
  });
  /* engine master switch */
  const sy = ly + lh + 8,
    sw = 3 * state.dsz + 16,
    sh = 26,
    on = state.ph == 1 || state.ph == 2,
    tx = state.gx + 68;
  state.SWR = { x: state.gx, y: sy, w: sw, h: sh };
  g.fillStyle = 'rgba(14,17,24,.85)';
  g.strokeStyle = '#2a3040';
  g.lineWidth = 1;
  g.fillRect(state.gx, sy, sw, sh);
  g.strokeRect(state.gx + 0.5, sy + 0.5, sw - 1, sh - 1);
  g.font = `600 10px ${MONO}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = '#8a93a2';
  g.fillText('ENGINE', state.gx + 10, sy + sh / 2 + 0.5);
  g.fillStyle = on ? '#1f5a38' : '#232a36';
  g.strokeStyle = on ? '#3fcf7a' : '#4a5160';
  g.beginPath();
  g.arc(tx + 8, sy + sh / 2, 8, Math.PI / 2, Math.PI * 1.5);
  g.arc(tx + 30, sy + sh / 2, 8, -Math.PI / 2, Math.PI / 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#d8dde6';
  g.beginPath();
  g.arc(on ? tx + 30 : tx + 8, sy + sh / 2, 5.5, 0, 6.283);
  g.fill();
  g.textAlign = 'right';
  const msg = state.ph == 1 ? state.M.st : state.ph == 2 ? 'RUN' : state.N > 0.02 ? state.M.cl : 'OFF';
  g.fillStyle = on ? '#3fcf7a' : state.N > 0.02 ? '#ff9a3a' : '#8a93a2';
  g.fillText(msg, state.gx + sw - 10, sy + sh / 2 + 0.5);
  g.textAlign = 'left';
  /* SR-71 inlet spike schematic: beside the dials if there is room, else under the switch */
  if (state.M.inset) {
    const rx = state.gx + sw + 14,
      av = state.W - 150 - (state.M.nozzle ? 100 : 0) - rx,
      fn = state.M.insetF;
    if (av >= 140) fn(rx, state.gy, Math.min(230, av), state.dsz + 34);
    else {
      const y2 = sy + sh + 8,
        w2 = Math.min(230, state.W - 170 - state.gx);
      if (w2 >= 150 && y2 + 58 < state.ny - 80 * state.u) fn(state.gx, y2, w2, 58);
    }
  }
}
/* load-time setup, called from main.js in v11's order */
export function wireGauges() {
  cv.addEventListener('pointerdown', (e) => {
    const r = state.SWR;
    if (state.ph && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
      seqStop(false);
      master();
    }
  });
}
