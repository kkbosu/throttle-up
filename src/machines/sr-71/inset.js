// SR-71 J58: the inlet-spike inset drawn beside the gauges.
import { state } from '../../core/state.js';
import { MONO, g, sm } from '../../core/util.js';

/* Schematic cutaway of the inlet (half above the axis, mirrored below), following the AEHS SR-71 propulsion
   article: the spike is full forward at low Mach and retracts progressively above Mach 1.6, up to 26 in;
   compression is a series of shocks up to the throat, ending in a terminal (normal) shock that moves downstream
   of the throat when the inlet starts, at about Mach 1.7; retracting the spike narrows the throat.
   Shapes and shock angles are illustrative (said in INFO). x runs 0..1 along the inset, radii are in units of hh. */
const LIP = 0.36, // cowl lip
  THR = 0.7, // throat (narrowest part of the cowl)
  END = 0.97, // engine face
  RS = 0.4; // spike shoulder radius
const rCowl = (x) => (x < THR ? 1 - (0.38 * (x - LIP)) / (THR - LIP) : 0.62 + (0.08 * (x - THR)) / (END - THR));

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
    X = (f) => x0 + f * len,
    M = state.mach,
    xt = 0.1 + 0.2 * state.spk, // spike tip: always ahead of the lip, moves aft as the spike retracts
    xs = xt + 0.34, // spike shoulder
    rSpike = (f) => (f <= xt ? 0 : f >= xs ? RS : (RS * (f - xt)) / (xs - xt));

  /* cowl: inner wall from the lip to the throat and on to the engine face, outer skin behind the lip */
  g.lineWidth = 2;
  g.strokeStyle = '#8f99aa';
  for (let s = -1; s <= 1; s += 2) {
    g.beginPath();
    g.moveTo(X(END), cy + s * hh * 1.18);
    g.lineTo(X(LIP), cy + s * hh);
    g.lineTo(X(THR), cy + s * hh * rCowl(THR));
    g.lineTo(X(END), cy + s * hh * rCowl(END));
    g.stroke();
  }
  /* spike: cone, shoulder, centrebody */
  g.fillStyle = '#b4bccb';
  g.beginPath();
  g.moveTo(X(xt), cy);
  g.lineTo(X(xs), cy - hh * RS);
  g.lineTo(X(END), cy - hh * RS);
  g.lineTo(X(END), cy + hh * RS);
  g.lineTo(X(xs), cy + hh * RS);
  g.closePath();
  g.fill();
  g.fillStyle = '#3a404c';
  g.fillRect(X(END), cy - hh * rCowl(END), x0 + len - X(END), hh * 2 * rCowl(END));

  /* shocks exist only in supersonic flow */
  const sa = (0.18 + 0.7 * sm(1, 2.6, M)) * sm(1, 1.1, M);
  if (sa > 0.01) {
    g.lineWidth = 1.3;
    g.strokeStyle = `rgba(120,200,255,${sa})`;
    /* cone shock from the tip, sweeping aft; shallower as Mach rises (Mach angle plus the cone's deflection).
       It ends at the cowl wall (or just outside the lip); inside the cowl it reflects once toward the spike. */
    const b = Math.asin(1 / Math.max(M, 1.0001)) + 0.17,
      kx = 1 / Math.tan(b) / len; // x per unit of radius, in inset fractions
    let f = xt,
      r = 0;
    while (r < 1.05 && f < END && !(f > LIP && r >= rCowl(f))) {
      f += 0.004;
      r = (f - xt) / (kx * hh);
    }
    for (let s = -1; s <= 1; s += 2) {
      g.beginPath();
      g.moveTo(X(xt), cy);
      g.lineTo(X(f), cy + s * hh * r);
      if (f > LIP) {
        let f2 = f,
          r2 = r;
        while (f2 < THR && r2 > rSpike(f2) + 0.02) {
          f2 += 0.004;
          r2 = r - (f2 - f) / (kx * hh);
        }
        g.lineTo(X(f2), cy + s * hh * r2);
      }
      g.stroke();
    }
    /* terminal (normal) shock: ahead of the lip until the inlet starts (~Mach 1.7), then just behind the throat */
    const fn = M >= 1.7 ? THR + 0.03 : LIP - 0.03,
      rOut = M >= 1.7 ? rCowl(fn) : 1.1;
    g.lineWidth = 2;
    for (let s = -1; s <= 1; s += 2) {
      g.beginPath();
      g.moveTo(X(fn), cy + s * hh * rSpike(fn));
      g.lineTo(X(fn), cy + s * hh * rOut);
      g.stroke();
    }
  }

  /* air: dots stream into the inlet and along the channel between spike and cowl, faster at higher Mach */
  g.fillStyle = 'rgba(160,210,255,.6)';
  for (let k = 0; k < 5; k++) {
    const f = ((state.simT * (0.15 + M * 0.3) + k * 0.2) % 1) * 0.9 + 0.04,
      r = f < LIP ? 0.7 : (rCowl(f) + rSpike(f)) / 2;
    g.fillRect(X(f), cy + (k % 2 ? 1 : -1) * hh * r - 1, 3, 2);
  }
  g.textAlign = 'left';
}
