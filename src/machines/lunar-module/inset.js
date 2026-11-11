// APOLLO LM: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { T, lbl, num } from '../../core/tokens.js';
import { g } from '../../core/util.js';
import { insetFrame } from '../../hud/panel.js';
import { FT, GL, lm, lmMass, lmSecs } from './machine.js';

/* lunar module panel: the craft over the ground (to scale, 150 ft tall), its lean and its drift; then height, sink
   rate, and in a mission the drift and the seconds left before the land-or-abort point */
export function lmInset(x, y, w, h) {
  insetFrame(x, y, w, h, 'LANDING');
  const mis = lm.prop < Infinity,
    secs = mis ? Math.max(0, lmSecs() - 20) : 0,
    stt = lm.td ? (lm.hard ? 'DOWN HARD' : 'ON SURFACE') : lm.con ? 'CONTACT' : mis && secs <= 0 ? 'BINGO' : 'DESCENT';
  g.textAlign = 'right';
  g.fillStyle = lm.td ? (lm.hard ? T.warn : T.go) : lm.con ? T.info : T.live;
  g.fillText(stt, x + w - 8, y + 11);
  const s2 = h - 22,
    bx = x + 8,
    gy = y + 16 + s2 - 3,
    k = (s2 - 10) / (150 * FT),
    cx = bx + s2 * 0.5,
    py = gy - Math.min(150 * FT, Math.max(0, state.alt)) * k;
  g.strokeStyle = '#8a8680';
  g.beginPath();
  g.moveTo(bx, gy);
  g.lineTo(bx + s2, gy);
  g.stroke();
  /* the craft: a body on splayed legs, leaning as it leans; an arrow for the drift */
  g.save();
  g.translate(cx, py);
  g.rotate(-lm.tilt);
  g.fillStyle = T.fg;
  g.fillRect(-4, -9, 8, 5);
  g.strokeStyle = T.fg;
  g.beginPath();
  g.moveTo(-3, -4);
  g.lineTo(-7, 0);
  g.moveTo(3, -4);
  g.lineTo(7, 0);
  g.stroke();
  if (state.ph == 2 && !lm.td && state.N > 0.02) {
    g.fillStyle = 'rgba(190,170,255,.8)';
    g.fillRect(-1.5, -4, 3, 2 + state.N * 14);
  }
  g.restore();
  if (!lm.td && Math.abs(lm.vx) > 0.05) {
    const d = Math.max(-1, Math.min(1, lm.vx / (4 * FT))) * 14;
    g.strokeStyle = Math.abs(lm.vx) > 4 * FT ? T.warn : T.live;
    g.beginPath();
    g.moveTo(cx, py - 14);
    g.lineTo(cx + d, py - 14);
    g.lineTo(cx + d - Math.sign(d) * 3, py - 17);
    g.moveTo(cx + d, py - 14);
    g.lineTo(cx + d - Math.sign(d) * 3, py - 11);
    g.stroke();
  }
  g.textAlign = 'left';
  const tx = x + s2 + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24,
    low = mis && secs < 30;
  [
    ['ALT', (Math.max(0, state.alt) / FT).toFixed(0) + ' ft'],
    ['DOWN', (lm.td ? 0 : -state.vz / FT).toFixed(1) + ' ft/s'],
    mis
      ? ['DRIFT', (lm.td ? 0 : Math.abs(lm.vx) / FT).toFixed(1) + ' ft/s']
      : ['T/W', (lm.T / (lmMass() * GL)).toFixed(2)],
    mis
      ? ['BINGO IN', secs.toFixed(0) + ' s']
      : [
          'THRUST',
          ((lm.T / 4.448222 / 1000) | 0) + ',' + String(((lm.T / 4.448222) % 1000) | 0).padStart(3, '0') + ' lb',
        ],
  ].forEach((l, i) => {
    g.fillStyle = T.dim;
    g.font = lbl(10);
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = i == 3 && low ? T.warn : i == 2 && mis && Math.abs(lm.vx) > 4 * FT ? T.warn : T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
  /* MISSION: a bar along the bottom for the seconds in hand */
  if (mis) {
    g.fillStyle = low ? T.warn : T.info;
    g.fillRect(x + 1, y + h - 3, (w - 2) * Math.min(1, secs / 80), 2);
  }
}
