// Cockpit gauges, annunciator lamps, engine switch and inset placement, drawn on the canvas so clips include them.
import { click } from '../audio/audio.js';
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { T, lbl, num } from '../core/tokens.js';
import { $, cv, g, mk } from '../core/util.js';
import { seqStop } from '../sequence/sequence.js';

/* ---------- gauges: static faces are cached, the value arc and numeral drawn per frame ---------- */
export const A0 = 2.356,
  SW = 4.712;
export const GV = [0, 0, 0]; /* GC comes from the active machine (M.g) */
/* A dial is read as a number first: the value sits in the middle in the number face, and the arc round it is its bar,
   from the scale's start to the value, with the red range marked on the track. The face (panel, track, red range,
   ticks, the scale's end values, the unit) is drawn once per size into state.FC. */
export function buildFaces() {
  const s = Math.round(state.dsz * state.D),
    R = s / 2;
  state.FC = state.GC.map((c) => {
    const k = mk(s, s),
      x = k.getContext('2d'),
      a = (v) => A0 + ((v - c.min) / (c.max - c.min)) * SW;
    x.fillStyle = T.panel;
    x.strokeStyle = T.rule;
    x.lineWidth = s * 0.012;
    x.beginPath();
    x.arc(R, R, R - s * 0.012, 0, 6.283);
    x.fill();
    x.stroke();
    x.lineWidth = s * 0.055;
    x.strokeStyle = T.rule;
    x.beginPath();
    x.arc(R, R, R * 0.8, A0, A0 + SW);
    x.stroke();
    x.strokeStyle = T.warnBg;
    x.beginPath();
    x.arc(R, R, R * 0.8, a(c.red), a(c.max));
    x.stroke();
    for (let v = c.min; v <= c.max + 1e-6; v += c.mn) {
      const q = a(v),
        mj = Math.abs(v / c.maj - Math.round(v / c.maj)) < 1e-6,
        co = Math.cos(q),
        si = Math.sin(q),
        r0 = R * (mj ? 0.88 : 0.91),
        r1 = R * 0.96;
      x.strokeStyle = mj ? T.fg : T.ruleHi;
      x.lineWidth = s * (mj ? 0.02 : 0.012);
      x.beginPath();
      x.moveTo(R + co * r0, R + si * r0);
      x.lineTo(R + co * r1, R + si * r1);
      x.stroke();
    }
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = T.dim;
    x.font = lbl(s * 0.1);
    x.fillText(c.t, R, R * 1.4);
    x.font = num(s * 0.08);
    x.fillText(String(c.min / c.d), R * 0.6, R * 1.7);
    x.fillText(String(c.max / c.d), R * 1.4, R * 1.7);
    return k;
  });
}

/* Dial size: as big as the space beside the lever column allows, and on short screens (phones held sideways) small
   enough that dials, lamps and engine switch (dsz + 56 px below gy) end above the buttons. */
export function fitDials() {
  const w = Math.max(54, Math.min(88, (state.W - state.gx - 170) / 3.15)),
    c = (state.CTR = $('ctl').getBoundingClientRect()),
    h = (c.height ? c.top : state.H) - 8 - 56 - state.gy;
  return Math.round(Math.max(40, Math.min(w, h)));
}

/* Where the middle of the 3D picture should sit, as a shift in CSS px from the middle of the screen: towards the
   centre of the biggest area the HUD leaves free. Three candidates, all left of the levers: everything to the right
   of the dials, inset and buttons; the band between the dials and the buttons (a phone held upright); and the strip
   between the inset and the lever tracks above the buttons (a phone held sideways, where that strip is all there is,
   so it may run under the lever labels). The picture keeps its size; the camera's lens shifts (render3d/camera.js).
   With plenty of room it goes half way, so a plume that runs off to one side keeps its space; with little room it
   goes nearly all the way. Never more than a quarter of the width or 15% of the height. No DOM reads: it uses what
   the HUD worked out this frame. */
export function viewShift() {
  const W = state.W,
    H = state.H,
    c = state.CTR,
    sw = state.SWR,
    n = state.INR;
  if (!sw || !c || !c.height || !state.TR) return [0, 0];
  const lx = state.TR.left - (state.M.nozzle ? 150 : 95),
    dr = Math.max(sw.x + sw.w, n ? n[0] + n[2] : 0),
    db = Math.max(sw.y + sw.h, n ? n[1] + n[3] : 0),
    ar = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]),
    r = [
      [Math.max(dr, c.right) + 8, 0, lx, H],
      [0, db + 8, lx, c.top - 8],
      [dr + 8, 0, state.TR.left - (state.M.nozzle ? 90 : 24), c.top - 8],
    ].reduce((p, q) => (ar(q) > ar(p) ? q : p)),
    cl = (v, m) => Math.max(-m, Math.min(m, v));
  if (!ar(r)) return [0, 0];
  const k = ar(r) < W * H * 0.25 ? 0.9 : 0.5;
  return [cl(((r[0] + r[2]) / 2 - W / 2) * k, W * 0.25), cl(((r[1] + r[3]) / 2 - H / 2) * k, H * 0.15)];
}

/* lamp display state: lv, how lit each lamp is (0..1); test, seconds of bulb check left; ph, the phase last frame */
const LP = { lv: [0, 0, 0, 0], test: 0, ph: 0 };
/* ---------- cockpit gauges: N1, EGT, fuel flow, plus annunciator lamps (drawn on the canvas so clips include them) ---------- */
export function gauges(dr) {
  if (!state.FC.length || !state.fontOK) return;
  {
    const hb = $('hud').getBoundingClientRect().bottom + 18;
    if (Math.abs(hb - state.gy) > 1) state.gy = hb;
    /* a hint that wraps onto another line, or a longer button label, can change the room the dials have */
    const d = fitDials();
    if (d !== state.dsz) {
      state.dsz = d;
      buildFaces();
    }
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const vals = state.M.gv(),
    R = state.dsz / 2,
    jit = state.N + state.A + state.stl * 3;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const c = state.GC[i],
      x = state.gx + i * (state.dsz + 8),
      y = state.gy,
      cx = x + R,
      cy = y + R;
    /* caption sits over the 3D scene: light text with a dark halo, legible on bright sky and at night */
    g.font = lbl(10, 600);
    g.lineWidth = 3;
    g.strokeStyle = T.halo;
    g.strokeText(c.cap, cx, y - 8);
    g.fillStyle = T.over;
    g.fillText(c.cap, cx, y - 8);
    g.drawImage(state.FC[i], x, y, state.dsz, state.dsz);
    const v = Math.max(c.min, Math.min(c.max * 1.03, vals[i] + (Math.random() - 0.5) * c.max * 0.006 * jit));
    GV[i] += (v - GV[i]) * (1 - Math.exp(-dr * 12));
    const q = A0 + ((GV[i] - c.min) / (c.max - c.min)) * SW,
      co = Math.cos(q),
      si = Math.sin(q),
      /* in the red range the arc and the number take the warning colour */
      hot = GV[i] >= c.red;
    g.strokeStyle = hot ? T.warn : T.live;
    g.lineWidth = state.dsz * 0.055;
    g.beginPath();
    g.arc(cx, cy, R * 0.8, A0, Math.max(A0 + 0.001, q));
    g.stroke();
    g.strokeStyle = T.hi;
    g.lineWidth = Math.max(1.5, state.dsz * 0.024);
    g.beginPath();
    g.moveTo(cx + co * R * 0.68, cy + si * R * 0.68);
    g.lineTo(cx + co * R * 0.95, cy + si * R * 0.95);
    g.stroke();
    const t = c.f(vals[i]);
    g.fillStyle = hot ? T.warn : T.hi;
    g.font = num(state.dsz * (t.length < 4 ? 0.25 : t.length < 5 ? 0.21 : 0.17));
    g.fillText(t, cx, cy + R * 0.02);
  }
  /* Lamps. Lit, a lamp shows its colour as an edge, a tint and its text (a warning fills solid). Like filaments they
     take a moment to light and longer to cool, and switching the engine on lights them all for half a second, the
     bulb check a real panel does. Display only: it reads the sim and changes nothing in it. */
  if (state.ph == 1 && LP.ph != 1) LP.test = 0.5;
  LP.ph = state.ph;
  LP.test = Math.max(0, LP.test - dr);
  const ly = state.gy + state.dsz + 6,
    lh = 16,
    lamps = [
      [
        state.sT > 0 ? 'STALL' : state.ph == 3 ? state.M.off : 'START',
        state.sT > 0 ? (state.simT * 8) % 1 < 0.6 : state.ph == 1 || state.ph == 3,
        state.sT > 0 ? 'warn' : state.ph == 3 ? 'live' : 'go',
      ],
    ].concat(state.M.lp());
  g.font = lbl(10, 600);
  lamps.forEach((l, i) => {
    const x = state.gx + i * (state.dsz + 8),
      on = l[1] || LP.test > 0 ? 1 : 0,
      k = (LP.lv[i] += (on - LP.lv[i]) * (1 - Math.exp(-dr / (on ? 0.04 : 0.09)))),
      col = T[l[2]];
    g.fillStyle = T.panel;
    g.strokeStyle = T.rule;
    g.lineWidth = 1;
    g.fillRect(x, ly, state.dsz, lh);
    g.strokeRect(x + 0.5, ly + 0.5, state.dsz - 1, lh - 1);
    g.fillStyle = T.off;
    g.fillText(l[0], x + state.dsz / 2, ly + lh / 2 + 0.5);
    if (k > 0.02) {
      g.globalAlpha = k;
      if (l[2] == 'warn') {
        g.fillStyle = T.warnBg;
        g.fillRect(x, ly, state.dsz, lh);
      } else {
        g.fillStyle = T.plate;
        g.fillRect(x + 1, ly + 1, state.dsz - 2, lh - 2);
        g.globalAlpha = k * 0.2;
        g.fillStyle = col;
        g.fillRect(x + 1, ly + 1, state.dsz - 2, lh - 2);
        g.globalAlpha = k;
      }
      g.fillStyle = col;
      g.fillRect(x, ly, state.dsz, 2);
      g.fillStyle = l[2] == 'warn' ? T.hi : col;
      g.fillText(l[0], x + state.dsz / 2, ly + lh / 2 + 0.5);
      g.globalAlpha = 1;
    }
  });
  /* engine master switch: a two-position selector, OFF | ON, and what the engine is doing */
  const sy = ly + lh + 8,
    sw = 3 * state.dsz + 16,
    sh = 26,
    on = state.ph == 1 || state.ph == 2,
    tx = state.gx + 68,
    my = sy + sh / 2 + 0.5;
  state.SWR = { x: state.gx, y: sy, w: sw, h: sh };
  g.fillStyle = T.panel;
  g.strokeStyle = T.rule;
  g.lineWidth = 1;
  g.fillRect(state.gx, sy, sw, sh);
  g.strokeRect(state.gx + 0.5, sy + 0.5, sw - 1, sh - 1);
  g.font = lbl(11);
  g.textAlign = 'left';
  g.fillStyle = T.dim;
  g.fillText('ENGINE', state.gx + 10, my);
  /* the two positions, 26 px each: the selected one is filled */
  g.strokeStyle = T.ruleHi;
  g.strokeRect(tx - 9.5, sy + 5.5, 53, sh - 11);
  g.fillStyle = on ? T.go : T.ruleHi;
  g.fillRect(on ? tx + 17 : tx - 9, sy + 6, 26, sh - 12);
  g.font = lbl(9, 600);
  g.textAlign = 'center';
  g.fillStyle = on ? T.off : T.hi;
  g.fillText('OFF', tx + 4, my);
  g.fillStyle = on ? T.goInk : T.off;
  g.fillText('ON', tx + 30, my);
  g.textAlign = 'right';
  g.font = num(11);
  const msg = state.ph == 1 ? state.M.st : state.ph == 2 ? 'RUN' : state.N > 0.02 ? state.M.cl : 'OFF';
  g.fillStyle = on ? T.go : state.N > 0.02 ? T.live : T.dim;
  g.fillText(msg, state.gx + sw - 10, my);
  g.textAlign = 'left';
  /* SR-71 inlet spike schematic: beside the dials if there is room, else under the switch */
  state.INR = null;
  if (state.M.inset) {
    const rx = state.gx + sw + 14,
      av = state.W - 150 - (state.M.nozzle ? 100 : 0) - rx,
      fn = state.M.insetF;
    /* INR: where the inset went (for the layout checks) */
    if (av >= 140) fn(...(state.INR = [rx, state.gy, Math.min(230, av), state.dsz + 34]));
    else {
      const y2 = sy + sh + 8,
        w2 = Math.min(230, state.W - 170 - state.gx);
      if (w2 >= 150 && y2 + 58 < state.ny - 80 * state.u) fn(...(state.INR = [state.gx, y2, w2, 58]));
    }
  }
}
/* load-time setup, called from main.js in v11's order */
export function wireGauges() {
  cv.addEventListener('pointerdown', (e) => {
    const r = state.SWR;
    if (state.ph && e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
      click(2);
      seqStop(false);
      master();
    }
  });
}
