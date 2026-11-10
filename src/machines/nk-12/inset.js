// NK-12: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { T, lbl, num } from '../../core/tokens.js';
import { g } from '../../core/util.js';
import { insetFrame } from '../../hud/panel.js';
import { TPJ, tpP, tpT } from './machine.js';

/* turboprop panel: a blade section at its pitch angle to the plane of rotation, the thrust arrow, and where the thrust comes from */
export function propInset(x, y, w, h) {
  insetFrame(x, y, w, h, 'PROPELLER');
  const cs = state.ph == 2 && state.prp > 0.97;
  g.textAlign = 'right';
  g.fillStyle = state.beta > 80 ? T.live : cs ? T.go : T.dim;
  g.fillText(state.beta > 80 ? 'FEATHERED' : cs ? 'CONSTANT SPEED' : '', x + w - 8, y + 11);
  const s2 = h - 22,
    bx = x + 8,
    cx = bx + s2 / 2,
    cy = y + 16 + s2 * 0.62,
    b = (state.beta * Math.PI) / 180,
    L2 = s2 * 0.34,
    th = tpT();
  g.strokeStyle = T.ruleHi;
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(bx, cy);
  g.lineTo(bx + s2, cy);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = T.dim;
  g.textAlign = 'left';
  g.fillText('\u2192 SPIN', bx, cy + 9);
  g.save();
  g.translate(cx, cy);
  g.rotate(-b);
  g.fillStyle = T.fg;
  g.beginPath();
  g.moveTo(L2, 0);
  g.quadraticCurveTo(0, -L2 * 0.2, -L2, -L2 * 0.04);
  g.quadraticCurveTo(-L2 * 1.04, 0, -L2, L2 * 0.05);
  g.quadraticCurveTo(0, L2 * 0.08, L2, 0);
  g.fill();
  g.restore();
  const al = Math.min(s2 * 0.5, 3 + (th / 140e3) * s2 * 0.48);
  g.strokeStyle = T.live;
  g.fillStyle = T.live;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy - 4);
  g.lineTo(cx, cy - 4 - al);
  g.stroke();
  g.lineWidth = 1;
  if (al > 6) {
    g.beginPath();
    g.moveTo(cx, cy - 8 - al);
    g.lineTo(cx - 4, cy - 2 - al);
    g.lineTo(cx + 4, cy - 2 - al);
    g.closePath();
    g.fill();
  }
  g.textAlign = 'left';
  const tx = x + s2 + 18,
    lh = Math.min(13, (h - 22) / 4),
    ty = y + 24;
  [
    ['PROPS', '\u2248' + (th / 1000).toFixed(0) + ' kN'],
    ['JET', (state.ph == 2 ? (TPJ * state.N * state.fu) / 1000 : 0).toFixed(1) + ' kN'],
    ['SHAFT', (tpP() / 1e6).toFixed(1) + ' MW'],
    ['BLADE', state.beta.toFixed(0) + '\u00b0'],
  ].forEach((l, i) => {
    g.fillStyle = T.dim;
    g.font = lbl(10);
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = T.fg;
    g.font = num(9);
    g.fillText(l[1], tx + 46, ty + i * lh);
  });
}
