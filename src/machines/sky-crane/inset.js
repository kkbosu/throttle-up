// SKY CRANE: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { MONO, g } from '../../core/util.js';
import { GM, MR, MS, RH, sc, skyRy } from './machine.js';

/* sky crane panel: side view of descent stage, bridles and rover over the ground (to scale, 40 m tall) */
export function craneInset(x, y, w, h) {
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
  g.fillText('SKY CRANE', x + 8, y + 11);
  const stt = sc.done
    ? 'ROVER DOWN'
    : sc.fly
      ? 'FLYAWAY'
      : sc.cut
        ? 'BRIDLES CUT'
        : sc.td
          ? 'TOUCHDOWN'
          : sc.bl > 0.05
            ? 'LOWERING'
            : 'DESCENT';
  g.textAlign = 'right';
  g.fillStyle = sc.td ? '#3fcf7a' : '#ff9a3a';
  g.fillText(stt, x + w - 8, y + 11);
  const s2 = h - 22,
    bx = x + 8,
    gy2 = y + 16 + s2 - 3,
    k = (s2 - 8) / 40,
    Y = (v) => gy2 - Math.min(40, Math.max(0, v)) * k,
    ry = Math.max(0, skyRy()),
    cx = bx + s2 * 0.4;
  g.strokeStyle = '#7a4a30';
  g.beginPath();
  g.moveTo(bx, gy2);
  g.lineTo(bx + s2, gy2);
  g.stroke();
  const rw = Math.max(5, 3 * k),
    rh = Math.max(3, RH * k);
  g.fillStyle = '#d8dde6';
  g.fillRect(cx - rw / 2, Y(ry) - rh, rw, rh);
  if (!sc.done) {
    const sx = Math.min(bx + s2 - 4, cx + sc.x * k),
      sy = Y(state.alt),
      sw = Math.max(6, 3.2 * k),
      sh = Math.max(2.5, 1.2 * k);
    g.strokeStyle = 'rgba(232,228,216,.8)';
    if (sc.bl > 0.05 && !sc.cut) {
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(cx, Y(ry) - rh);
      g.stroke();
    }
    g.fillStyle = '#c8a050';
    g.fillRect(sx - sw / 2, sy - sh, sw, sh);
    if (state.ph == 2 && state.N > 0.02) {
      g.fillStyle = 'rgba(255,154,58,.8)';
      g.fillRect(sx - sw / 2, sy, 1.5, 2 + state.N * 6);
      g.fillRect(sx + sw / 2 - 1.5, sy, 1.5, 2 + state.N * 6);
    }
  }
  g.textAlign = 'left';
  const tx = x + s2 + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24,
    m = sc.td || sc.cut ? MS : MS + MR,
    tw = sc.T / (m * GM);
  [
    ['ROVER', ry.toFixed(1) + ' m'],
    ['V/S', (sc.td ? 0 : state.vz).toFixed(2) + ' m/s'],
    ['T/W', tw.toFixed(2)],
    ['ENGINES', sc.act == 8 ? '8 LIT' : '4 + 4 AT 1%'],
  ].forEach((l, i) => {
    g.fillStyle = '#6c7482';
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = l[0] == 'T/W' && tw > 1 ? '#3fcf7a' : '#d8dde6';
    g.fillText(l[1], tx + 50, ty + i * lh);
  });
}
