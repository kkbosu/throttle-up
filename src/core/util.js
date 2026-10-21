// Small shared helpers and constants: DOM lookup, the main 2D canvas, smoothstep, label tables, the HUD font.

export const $ = (id) => document.getElementById(id),
  cv = $('c'),
  g = cv.getContext('2d');
export const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
export const sm = (a, b, x) => {
  x = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export const SNM = ['MIDDAY', 'AFTERNOON', 'SUNSET'];
export const SL = [1, 0.5, 0.2],
  SLN = ['OFF', '1/2x', '1/5x'],
  VN = ['SIDE', 'CLOSE-UP', 'REAR', 'EARTH', 'DRONE'],
  SN = ['VOID', 'DESERT DAWN', 'NIGHT'],
  ZT = [1, 2.3, 1, 1, 1];
export const MONO = 'ui-monospace,Menlo,Consolas,monospace';
/* Camera shake, 3D and 2D, scaled per machine by M.shk(). Off: it was a stylistic cue, not a measured effect.
   Set to 1 to bring it back. (The stall flash and phone vibration are separate and stay on.) */
export const SHAKE = 0;
