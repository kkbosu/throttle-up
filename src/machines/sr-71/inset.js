// SR-71 J58: the inset panel drawn beside the gauges.
// Never shown, as in v11: the SR-71 entry has no `inset` flag (see Known issues in CLAUDE.md).
import { state } from '../../core/state.js';
import { MONO, g, sm } from '../../core/util.js';

/* cutaway of the inlet: cowl, translating spike, shock lines running from the tip to the cowl lip */
export function spikeInset(x, y, w, h) {
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
  g.fillText('INLET SPIKE', x + 8, y + 11);
  g.textAlign = 'right';
  g.fillStyle = state.spk > 0.03 ? '#ff9a3a' : '#6c7482';
  g.fillText('M' + state.mach.toFixed(1) + '  ' + (state.spk * 26).toFixed(0) + ' IN AFT', x + w - 8, y + 11);
  const cy = y + 11 + (h - 11) / 2,
    hh = (h - 26) * 0.44,
    x0 = x + 10,
    len = w - 20,
    X = (f) => x0 + f * len;
  g.lineWidth = 2;
  g.strokeStyle = '#8f99aa';
  for (let s = -1; s <= 1; s += 2) {
    g.beginPath();
    g.moveTo(X(0.02), cy + s * hh * 1.12);
    g.lineTo(X(0.3), cy + s * hh * 0.78);
    g.lineTo(X(0.56), cy + s * hh * 0.52);
    g.lineTo(X(0.8), cy + s * hh * 0.62);
    g.lineTo(X(0.97), cy + s * hh * 0.62);
    g.stroke();
  }
  const tx = 0.08 + state.spk * 0.24,
    cr = hh * 0.34;
  /* tip travels aft with spk */ g.fillStyle = '#b4bccb';
  g.beginPath();
  g.moveTo(X(tx), cy);
  g.lineTo(X(tx + 0.3), cy - cr);
  g.lineTo(X(0.8), cy - cr);
  g.lineTo(X(0.8), cy + cr);
  g.lineTo(X(tx + 0.3), cy + cr);
  g.closePath();
  g.fill();
  g.fillStyle = '#3a404c';
  g.fillRect(X(0.8), cy - hh * 0.62, len * 0.17, hh * 1.24);
  const sa = 0.18 + 0.7 * sm(1, 2.6, state.mach);
  g.lineWidth = 1.3;
  g.strokeStyle = `rgba(120,200,255,${sa})`;
  for (let s = -1; s <= 1; s += 2) {
    g.beginPath();
    g.moveTo(X(tx), cy);
    g.lineTo(X(0.3), cy + s * hh * 0.78);
    g.stroke();
  }
  g.fillStyle = 'rgba(160,210,255,.6)';
  for (let k = 0; k < 5; k++) {
    const f = ((state.simT * (0.15 + state.mach * 0.3) + k * 0.2) % 1) * 0.78 + 0.04;
    g.fillRect(X(f), cy + (k % 2 ? 1 : -1) * hh * 0.55 - 1, 3, 2);
  }
  g.textAlign = 'left';
}
