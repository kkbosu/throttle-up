// HALL thruster: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { T, lbl, num } from '../../core/tokens.js';
import { g } from '../../core/util.js';
import { insetFrame } from '../../hud/panel.js';
import { RE, WN, orb } from './machine.js';

/* what-if orbit raising: Earth, the orbit (altitude exaggerated), the spiral so far, mission clock */
export function orbitInset(x, y, w, h) {
  insetFrame(x, y, w, h, 'ORBIT (WHAT-IF)');
  g.textAlign = 'right';
  g.fillStyle = state.sl ? T.live : T.dim;
  g.fillText('WARP ' + WN[state.sl], x + w - 8, y + 11);
  const al = (orb.r - RE) / 1e3,
    cs = h - 22,
    cx = x + 8 + cs / 2,
    cy = y + 16 + cs / 2,
    er = cs * 0.26,
    orr = (a) => er * (1 + (a / 6371) * 6);
  g.fillStyle = '#1b3c78';
  g.beginPath();
  g.arc(cx, cy, er, 0, 6.283);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.beginPath();
  g.arc(cx - er * 0.25, cy - er * 0.25, er * 0.55, 0, 6.283);
  g.fill();
  g.strokeStyle = 'rgba(120,160,255,.35)';
  g.beginPath();
  g.arc(cx, cy, Math.min(cs * 0.5, orr(al)), 0, 6.283);
  g.stroke();
  if (orb.tr.length > 1) {
    g.strokeStyle = 'rgba(120,180,255,.8)';
    g.beginPath();
    orb.tr.forEach((p, i) => {
      const r = Math.min(cs * 0.5, orr(p[0])),
        X = cx + Math.cos(-p[1]) * r,
        Y = cy + Math.sin(-p[1]) * r;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.stroke();
  }
  const rr = Math.min(cs * 0.5, orr(al));
  g.fillStyle = T.live;
  g.beginPath();
  g.arc(cx + Math.cos(-orb.vph) * rr, cy + Math.sin(-orb.vph) * rr, 2.6, 0, 6.283);
  g.fill();
  g.textAlign = 'left';
  g.fillStyle = T.fg;
  const tx = x + cs + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24;
  [
    ['DAY', (orb.t / 86400).toFixed(2)],
    ['ALT', al.toFixed(1) + ' km'],
    ['\u0394v', orb.dv.toFixed(1) + ' m/s'],
    ['XENON', orb.xe.toFixed(2) + ' kg'],
  ].forEach((l, i) => {
    g.fillStyle = T.dim;
    g.font = lbl(10);
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 44, ty + i * lh);
  });
}
