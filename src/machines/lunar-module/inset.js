// APOLLO LM: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { T, lbl, num } from '../../core/tokens.js';
import { g } from '../../core/util.js';
import { insetFrame } from '../../hud/panel.js';
import { FT, GL, lm, lmMass, lmSecs } from './machine.js';
import { CRATERS } from './site.js';

/* lunar module panel: a map of the ground under the craft, seen from above and turned the way the screen is (right is
   west, the way it faces; up is away from the camera), with the craters round it, a ring for the gear's 4 ft/s limit
   and a line for its speed over the ground (the real cabin had a cross-pointer meter for the same two speeds); then
   height, sink rate, and in a mission the drift and the seconds left before the land-or-abort point */
export function lmInset(x, y, w, h) {
  insetFrame(x, y, w, h, 'LANDING');
  const mis = lm.prop < Infinity,
    secs = mis ? Math.max(0, lmSecs() - 20) : 0,
    dr = lm.td ? 0 : Math.hypot(lm.vx, lm.vd),
    bad = lm.hard || lm.steep,
    stt = lm.td
      ? lm.hard
        ? 'DOWN HARD'
        : lm.steep
          ? 'TOO STEEP'
          : 'ON SURFACE'
      : lm.con
        ? 'CONTACT'
        : mis && secs <= 0
          ? 'BINGO'
          : 'DESCENT';
  g.textAlign = 'right';
  g.fillStyle = lm.td ? (bad ? T.warn : T.go) : lm.con ? T.info : T.live;
  g.fillText(stt, x + w - 8, y + 11);
  const s2 = h - 22,
    bx = x + 8,
    by = y + 16,
    cx = bx + s2 / 2,
    cy = by + s2 / 2,
    /* 30 m from the middle to the edge */
    k = s2 / 60;
  g.save();
  g.beginPath();
  g.rect(bx, by, s2, s2);
  g.clip();
  g.fillStyle = T.well;
  g.fillRect(bx, by, s2, s2);
  g.lineWidth = 1;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i],
      px = cx + (c[0] - lm.x) * k,
      py = cy + (c[1] - lm.z) * k,
      r = c[2] * k;
    if (c[2] < 1.5 || px + r < bx || px - r > bx + s2 || py + r < by || py - r > by + s2) continue;
    /* deep for its size: its wall is too steep to stand on */
    g.strokeStyle = c[3] / c[2] > 0.2 ? T.dim : T.off;
    g.beginPath();
    g.arc(px, py, r, 0, 6.283);
    g.stroke();
  }
  /* the gear's limit on speed over the ground, and the speed now */
  const R = Math.min(s2 * 0.3, 16),
    lim = 4 * FT;
  g.strokeStyle = T.off;
  g.setLineDash([2, 2]);
  g.beginPath();
  g.arc(cx, cy, R, 0, 6.283);
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = T.fg;
  g.beginPath();
  g.moveTo(cx - 3, cy);
  g.lineTo(cx + 3, cy);
  g.moveTo(cx, cy - 3);
  g.lineTo(cx, cy + 3);
  g.stroke();
  if (dr > 0.03) {
    const f = Math.min(2.2, dr / lim) / dr;
    g.strokeStyle = dr > lim ? T.warn : T.live;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + lm.vx * f * R, cy + lm.vd * f * R);
    g.stroke();
    g.lineWidth = 1;
  }
  g.restore();
  g.textAlign = 'left';
  const tx = x + s2 + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24,
    low = mis && secs < 30;
  [
    ['ALT', (Math.max(0, state.alt) / FT).toFixed(0) + ' ft'],
    ['DOWN', (lm.td ? 0 : -state.vz / FT).toFixed(1) + ' ft/s'],
    mis ? ['DRIFT', (dr / FT).toFixed(1) + ' ft/s'] : ['T/W', (lm.T / (lmMass() * GL)).toFixed(2)],
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
    g.fillStyle = i == 3 && low ? T.warn : i == 2 && mis && dr > 4 * FT ? T.warn : T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 52, ty + i * lh);
  });
  /* MISSION: a bar along the bottom for the seconds in hand */
  if (mis) {
    g.fillStyle = low ? T.warn : T.info;
    g.fillRect(x + 1, y + h - 3, (w - 2) * Math.min(1, secs / 80), 2);
  }
}
