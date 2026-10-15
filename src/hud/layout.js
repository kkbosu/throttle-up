// Layout: sizes the canvases and buffers to the window, places the HUD and lever.
import { state } from '../core/state.js';
import { $, cv, g } from '../core/util.js';
import { buildFaces } from './gauges.js';
import { trk } from '../input/lever.js';
import { B0, B1, B2 } from '../render2d/index.js';

export function resize() {
  state.D = Math.min(devicePixelRatio || 1, 2);
  state.W = innerWidth;
  state.H = innerHeight;
  cv.width = state.W * state.D;
  cv.height = state.H * state.D;
  g.setTransform(state.D, 0, 0, state.D, 0, 0);
  state.u = Math.max(0.5, Math.min(state.W / 900, state.H / 520));
  state.nx = state.W * state.M.nxf;
  state.ny = state.H * 0.5;
  const hr = $('hud').getBoundingClientRect();
  state.gx = hr.left;
  state.gy = hr.bottom + 18;
  state.dsz = Math.round(Math.max(54, Math.min(88, (state.W - state.gx - 170) / 3.15)));
  state.TR = trk.getBoundingClientRect();
  B0.width = Math.max(8, state.W >> 1);
  B0.height = Math.max(8, state.H >> 1);
  B1.width = Math.max(8, state.W >> 2);
  B1.height = Math.max(8, state.H >> 2);
  B2.width = Math.max(8, state.W >> 4);
  B2.height = Math.max(8, state.H >> 4);
  buildFaces();
  if (state.G3) state.G3.resize();
}
/* load-time setup, called from main.js in v11's order */
export function wireLayout() {
  addEventListener('resize', resize);
}
