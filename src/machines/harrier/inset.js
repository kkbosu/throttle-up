// HARRIER (Pegasus): the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { MONO, g } from '../../core/util.js';
import { DECK, G0, HM, HRD, deckUnder, harT } from './machine.js';

/* Harrier hover panel: side view of the jet over the pad, thrust vector arrow, height, vertical speed, lift/weight */
export function hoverInset(x, y, w, h) {
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(14,17,24,.85)';
  g.strokeStyle = '#2a3040';
  g.lineWidth = 1;
  g.fillRect(x, y, w, h);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.font = `600 9px ${MONO}`;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = '#6c7482';
  g.fillText('HOVER', x + 8, y + 11);
  g.textAlign = 'right';
  g.fillStyle = state.alt > 0.05 ? '#3fcf7a' : '#6c7482';
  if (HRD.on) return deckInset(x, y, w, h);
  g.fillText(state.alt > 0.05 ? 'AIRBORNE' : 'ON PAD', x + w - 8, y + 11);
  const cs = h - 22,
    bx = x + 8,
    by = y + 16,
    T = harT(),
    lw = (T * Math.sin((state.nz * Math.PI) / 180)) / (HM * G0),
    gy2 = by + cs - 3,
    py = gy2 - 6 - Math.min(1, state.alt / 30) * (cs - 16),
    px = bx + cs * 0.45,
    a = (state.nz * Math.PI) / 180,
    al2 = 6 + Math.min(1.3, T / (HM * G0)) * 12;
  g.strokeStyle = '#4a5160';
  g.beginPath();
  g.moveTo(bx, gy2);
  g.lineTo(bx + cs, gy2);
  g.stroke();
  g.strokeStyle = '#ff9a3a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px, py);
  g.lineTo(px + Math.cos(a) * al2, py + Math.sin(a) * al2);
  g.stroke();
  g.lineWidth = 1;
  g.fillStyle = '#b4bccb';
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
    ['FWD', ((T * Math.cos(a)) / 1000).toFixed(1) + ' kN'],
  ].forEach((l, i) => {
    g.fillStyle = '#6c7482';
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = l[0] == 'LIFT/WT' && lw > 1 ? '#3fcf7a' : '#d8dde6';
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
}
/* deck landing: a top-down hover position map (bow up, spot 5 in the middle) and the numbers that matter */
function deckInset(x, y, w, h) {
  const D = HRD,
    ht = state.alt - deckUnder(),
    sink = D.td ? 0 : D.hv - state.vz;
  g.fillStyle = D.td ? (D.wet ? '#ff6a4a' : '#3fcf7a') : '#5aa0ff';
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
  g.fillStyle = '#ffd25a';
  g.beginPath();
  g.moveTo(ax, ay - 5 * s);
  g.lineTo(ax + 3.5 * s, ay + 4 * s);
  g.lineTo(ax, ay + 2.5 * s);
  g.lineTo(ax - 3.5 * s, ay + 4 * s);
  g.closePath();
  g.fill();
  if (Math.abs(state.side) > 0.02) {
    g.strokeStyle = '#ffd25a';
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
    g.fillStyle = '#6c7482';
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = l[0] == 'TO SPOT' && d < 5 ? '#3fcf7a' : l[0] == 'SINK' && sink > 2.5 ? '#ff6a4a' : '#d8dde6';
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
}
