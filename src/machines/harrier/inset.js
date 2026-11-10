// HARRIER (Pegasus): the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { T, lbl, num } from '../../core/tokens.js';
import { g } from '../../core/util.js';
import { insetFrame } from '../../hud/panel.js';
import { DECK, G0, HM, HRD, deckUnder, harT } from './machine.js';

/* Harrier hover panel: side view of the jet over the pad, thrust vector arrow, height, vertical speed, lift/weight */
export function hoverInset(x, y, w, h) {
  insetFrame(x, y, w, h, 'HOVER');
  g.textAlign = 'right';
  g.fillStyle = state.alt > 0.05 ? T.go : T.dim;
  if (HRD.on) return deckInset(x, y, w, h);
  g.fillText(state.alt > 0.05 ? 'AIRBORNE' : 'ON PAD', x + w - 8, y + 11);
  const cs = h - 22,
    bx = x + 8,
    by = y + 16,
    th = harT(),
    lw = (th * Math.sin((state.nz * Math.PI) / 180)) / (HM * G0),
    gy2 = by + cs - 3,
    py = gy2 - 6 - Math.min(1, state.alt / 30) * (cs - 16),
    px = bx + cs * 0.45,
    a = (state.nz * Math.PI) / 180,
    al2 = 6 + Math.min(1.3, th / (HM * G0)) * 12;
  g.strokeStyle = T.ruleHi;
  g.beginPath();
  g.moveTo(bx, gy2);
  g.lineTo(bx + cs, gy2);
  g.stroke();
  g.strokeStyle = T.live;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px, py);
  g.lineTo(px + Math.cos(a) * al2, py + Math.sin(a) * al2);
  g.stroke();
  g.lineWidth = 1;
  g.fillStyle = T.fg;
  g.beginPath();
  g.moveTo(px - 12, py);
  g.lineTo(px + 10, py - 1.5);
  g.lineTo(px + 12, py + 1.5);
  g.lineTo(px - 12, py + 2.5);
  g.closePath();
  g.fill();
  g.textAlign = 'left';
  const tx = x + cs + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24;
  [
    ['ALT', (state.alt * 3.281).toFixed(0) + ' ft'],
    ['V/S', (state.vz * 196.85).toFixed(0) + ' fpm'],
    ['LIFT/WT', lw.toFixed(2)],
    ['FWD', ((th * Math.cos(a)) / 1000).toFixed(1) + ' kN'],
  ].forEach((l, i) => {
    g.fillStyle = T.dim;
    g.font = lbl(10);
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = l[0] == 'LIFT/WT' && lw > 1 ? T.go : T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
}
/* deck landing: a top-down hover position map (bow up, spot 5 in the middle) and the numbers that matter */
function deckInset(x, y, w, h) {
  const D = HRD,
    ht = state.alt - deckUnder(),
    sink = D.td ? 0 : D.hv - state.vz;
  g.fillStyle = D.td ? (D.wet ? T.warn : T.go) : T.info;
  g.fillText(D.td ? (D.wet ? 'DOWN' : 'ON DECK') : 'TO SPOT 5', x + w - 8, y + 11);
  const cs = h - 22,
    bx = x + 8,
    by = y + 16,
    k = cs / 80,
    cx = bx + cs / 2,
    cy = by + cs / 2,
    /* ship frame to map: forward (-x) up, port (+z) left */
    P = (sx, sz) => [cx - sz * k, cy + sx * k];
  g.save();
  g.beginPath();
  g.rect(bx, by, cs, cs);
  g.clip();
  g.fillStyle = '#10283a';
  g.fillRect(bx, by, cs, cs);
  g.fillStyle = '#3a3f46';
  g.beginPath();
  DECK.forEach(([sx, sz], i) => (i ? g.lineTo(...P(sx, sz)) : g.moveTo(...P(sx, sz))));
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(232,232,226,.55)';
  g.beginPath();
  g.moveTo(...P(-60, 0));
  g.lineTo(...P(60, 0));
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 5 * k, 0, 6.2832);
  g.stroke();
  /* the jet: a dart pointing at the bow, banked toward the side it is sliding */
  const [ax, ay] = P(D.x, D.z),
    s = 1 + Math.max(0, Math.min(1, ht / 15));
  g.fillStyle = T.live;
  g.beginPath();
  g.moveTo(ax, ay - 5 * s);
  g.lineTo(ax + 3.5 * s, ay + 4 * s);
  g.lineTo(ax, ay + 2.5 * s);
  g.lineTo(ax - 3.5 * s, ay + 4 * s);
  g.closePath();
  g.fill();
  if (Math.abs(state.side) > 0.02) {
    g.strokeStyle = T.live;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(ax + state.side * 12, ay);
    g.stroke();
  }
  g.restore();
  g.textAlign = 'left';
  const tx = x + cs + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24,
    d = Math.hypot(D.x, D.z);
  [
    ['HEIGHT', (Math.max(0, ht) * 3.281).toFixed(0) + ' ft'],
    ['SINK', (sink * 196.85).toFixed(0) + ' fpm'],
    ['TO SPOT', d.toFixed(1) + ' m'],
    ['DECK', (D.h >= 0 ? '+' : '') + D.h.toFixed(1) + ' m'],
  ].forEach((l, i) => {
    g.fillStyle = T.dim;
    g.font = lbl(10);
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = l[0] == 'TO SPOT' && d < 5 ? T.go : l[0] == 'SINK' && sink > 2.5 ? T.warn : T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
}
