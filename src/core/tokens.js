// Design tokens for everything drawn on a canvas (gauges, lamps, insets, captions, the recorded lever, the clip frame).
// The values are defined once, in src/style.css (:root); wireTokens() copies them here at boot, so canvas code and the
// DOM share one definition. Nothing reads a style per frame.
import { state } from './state.js';

/* colours by role (see style.css for what each is for), and the two font families */
export const T = {};
const NAMES = {
  bg: '--bg',
  well: '--well',
  plate: '--plate',
  panel: '--panel',
  scrimLo: '--scrim-lo',
  rule: '--rule',
  ruleHi: '--rule-hi',
  fg: '--fg',
  hi: '--hi',
  dim: '--dim',
  off: '--off',
  over: '--over',
  halo: '--halo-c',
  live: '--live',
  liveDim: '--live-dim',
  go: '--go',
  goDim: '--go-dim',
  goInk: '--go-ink',
  warn: '--warn',
  warnBg: '--warn-bg',
  info: '--info',
  fLabel: '--f-label',
  fNum: '--f-num',
};
export function wireTokens() {
  const cs = getComputedStyle(document.documentElement);
  for (const k in NAMES) T[k] = cs.getPropertyValue(NAMES[k]).trim();
}
/* canvas font strings: lbl for labels (condensed sans), num for numbers (monospace) */
export function lbl(px, w = 500) {
  return `${w} ${px}px ${T.fLabel}`;
}
export function num(px, w = 600) {
  return `${w} ${px}px ${T.fNum}`;
}
/* The canvas must not draw text before the faces have loaded (it would cache fallback glyphs in the dial faces):
   state.fontOK goes true when they are in, or after 3 s if they never arrive, and `done` runs once. */
export function fontsReady(done) {
  let fired = 0;
  const go = () => {
    if (fired) return;
    fired = 1;
    state.fontOK = 1;
    done();
  };
  const f = document.fonts;
  if (!f || !f.load) return go();
  Promise.all([f.load(lbl(12, 500)), f.load(lbl(12, 600)), f.load(num(12, 600))]).then(go, go);
  setTimeout(go, 3000);
}
