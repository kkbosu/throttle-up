// A mission's telemetry trace: two of its readouts (for the missions so far, height and sink rate) sampled ten times a
// second while the try runs, and drawn as a small strip chart on the result card and at the end of the clip. It is a
// record for display only: nothing in the sim reads it, and it plots the same quantities the readouts showed.
import { T, lbl, num } from '../core/tokens.js';

/* t: sample times (s); a, b: the two series; next: when the next sample is due */
export const TRC = { t: [], a: [], b: [], next: 0 };
export function traceReset() {
  TRC.t.length = TRC.a.length = TRC.b.length = 0;
  TRC.next = 0;
}
/* called every sim step of a running try; `last` forces a final sample at the verdict */
export function traceSample(t, get, last) {
  if (!get || (!last && t < TRC.next) || TRC.t.length > 3000) return;
  const v = get();
  TRC.t.push(t);
  TRC.a.push(v[0]);
  TRC.b.push(v[1]);
  TRC.next = t + 0.1;
}
/* a round number at or above v, for the top of a scale */
function top(v) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-6)))),
    m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
/* Draw the trace into c (a 2D context) in the box x, y, w, h, at text scale k (1 on the card, larger on the clip).
   labs: the two series' names with units, e.g. ['ROVER m', 'DESCENT m/s']. Returns false when there is nothing to
   draw. The first series is the white line on the left scale, the second the amber line on the right scale. */
export function traceDraw(c, x, y, w, h, labs, k = 1) {
  const n = TRC.t.length;
  if (n < 2) return false;
  const fs = 9 * k,
    px = 26 * k,
    x0 = x + px,
    x1 = x + w - px,
    y0 = y + fs * 0.9,
    y1 = y + h - fs * 1.9,
    tEnd = TRC.t[n - 1] || 1,
    aTop = top(Math.max(...TRC.a, 0.1)),
    bTop = top(Math.max(...TRC.b, 0.1)),
    X = (t) => x0 + (t / tEnd) * (x1 - x0),
    line = (s, sTop, col, lw) => {
      c.strokeStyle = col;
      c.lineWidth = lw * k;
      c.beginPath();
      /* at most about 240 points: skip samples on a long try */
      const st = Math.max(1, Math.floor(n / 240));
      for (let i = 0; i < n; i += st) {
        const yy = y1 - (Math.max(0, Math.min(sTop, s[i])) / sTop) * (y1 - y0);
        i ? c.lineTo(X(TRC.t[i]), yy) : c.moveTo(X(TRC.t[i]), yy);
      }
      c.lineTo(X(tEnd), y1 - (Math.max(0, Math.min(sTop, s[n - 1])) / sTop) * (y1 - y0));
      c.stroke();
    };
  c.lineJoin = 'round';
  c.strokeStyle = T.rule;
  c.lineWidth = k;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x0, y1);
  c.lineTo(x1, y1);
  c.lineTo(x1, y0);
  c.moveTo(x0, (y0 + y1) / 2);
  c.lineTo(x1, (y0 + y1) / 2);
  c.stroke();
  line(TRC.b, bTop, T.live, 1.3);
  line(TRC.a, aTop, T.hi, 1.8);
  /* where the try ended */
  c.fillStyle = T.hi;
  c.beginPath();
  c.arc(x1, y1 - (Math.max(0, Math.min(aTop, TRC.a[n - 1])) / aTop) * (y1 - y0), 2.6 * k, 0, 6.283);
  c.fill();
  c.textBaseline = 'middle';
  c.font = num(fs);
  c.textAlign = 'right';
  c.fillStyle = T.dim;
  c.fillText(String(aTop), x0 - 4 * k, y0);
  c.fillText('0', x0 - 4 * k, y1);
  c.textAlign = 'left';
  c.fillStyle = T.live;
  c.fillText(String(bTop), x1 + 4 * k, y0);
  c.fillText('0', x1 + 4 * k, y1);
  c.font = lbl(fs + k);
  c.fillStyle = T.dim;
  c.fillText(labs[0], x0, y + h - fs * 0.7);
  c.textAlign = 'right';
  c.fillStyle = T.live;
  c.fillText(labs[1], x1, y + h - fs * 0.7);
  c.textAlign = 'center';
  c.fillStyle = T.dim;
  c.font = num(fs);
  c.fillText(Math.round(tEnd) + ' s', (x0 + x1) / 2, y + h - fs * 0.7);
  c.textAlign = 'left';
  return true;
}
