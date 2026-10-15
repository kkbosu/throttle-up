// NK-12: the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { MONO, g } from '../../core/util.js';
import { TPJ, tpP, tpT } from './machine.js';

/* turboprop panel: a blade section at its pitch angle to the plane of rotation, the thrust arrow, and where the thrust comes from */
export function propInset(x, y, w, h) {
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
  g.fillText('PROPELLER', x + 8, y + 11);
  const cs = state.ph == 2 && state.prp > 0.97;
  g.textAlign = 'right';
  g.fillStyle = state.beta > 80 ? '#d9822b' : cs ? '#3fcf7a' : '#6c7482';
  g.fillText(state.beta > 80 ? 'FEATHERED' : cs ? 'CONSTANT SPEED' : '', x + w - 8, y + 11);
  const s2 = h - 22,
    bx = x + 8,
    cx = bx + s2 / 2,
    cy = y + 16 + s2 * 0.62,
    b = (state.beta * Math.PI) / 180,
    L2 = s2 * 0.34,
    T = tpT();
  g.strokeStyle = '#4a5160';
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(bx, cy);
  g.lineTo(bx + s2, cy);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#6c7482';
  g.textAlign = 'left';
  g.fillText('\u2192 SPIN', bx, cy + 9);
  g.save();
  g.translate(cx, cy);
  g.rotate(-b);
  g.fillStyle = '#b4bccb';
  g.beginPath();
  g.moveTo(L2, 0);
  g.quadraticCurveTo(0, -L2 * 0.2, -L2, -L2 * 0.04);
  g.quadraticCurveTo(-L2 * 1.04, 0, -L2, L2 * 0.05);
  g.quadraticCurveTo(0, L2 * 0.08, L2, 0);
  g.fill();
  g.restore();
  const al = Math.min(s2 * 0.5, 3 + (T / 140e3) * s2 * 0.48);
  g.strokeStyle = '#ff9a3a';
  g.fillStyle = '#ff9a3a';
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
    ['PROPS', '\u2248' + (T / 1000).toFixed(0) + ' kN'],
    ['JET', (state.ph == 2 ? (TPJ * state.N * state.fu) / 1000 : 0).toFixed(1) + ' kN'],
    ['SHAFT', (tpP() / 1e6).toFixed(1) + ' MW'],
    ['BLADE', state.beta.toFixed(0) + '\u00b0'],
  ].forEach((l, i) => {
    g.fillStyle = '#6c7482';
    g.fillText(l[0], tx, ty + i * lh);
    g.fillStyle = '#d8dde6';
    g.fillText(l[1], tx + 46, ty + i * lh);
  });
}
