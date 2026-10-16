// 2D renderer (fallback for machines 0-2): off-screen buffers, particles, stars, sky, heat haze, bloom, frame draw.
import { fail3D } from '../core/loader3d.js';
import { state } from '../core/state.js';
import { SHAKE, ZT, cv, g, mk, sm } from '../core/util.js';

/* ---------- off-screen buffers: bloom + heat haze ---------- */
export const B0 = mk(8, 8),
  B1 = mk(8, 8),
  B2 = mk(8, 8),
  HS = mk(8, 8),
  HD = mk(8, 8);
export const b0 = B0.getContext('2d'),
  b1 = B1.getContext('2d'),
  b2 = B2.getContext('2d'),
  hs = HS.getContext('2d'),
  hd = HD.getContext('2d');

/* ---------- rendering ---------- */
export const P = [],
  EM = [],
  SM = [],
  VP = [];
export const ST = Array.from({ length: 110 }, () => [Math.random(), Math.random() * 0.72, Math.random()]);
export function sky() {
  const hy = state.H * 0.74;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  let gd = g.createLinearGradient(0, 0, 0, state.H);
  if (state.scene == 0) {
    gd.addColorStop(0, '#05060a');
    gd.addColorStop(1, '#0b0d14');
    g.fillStyle = gd;
    g.fillRect(0, 0, state.W, state.H);
    return;
  }
  if (state.scene == 1) {
    gd = g.createLinearGradient(0, 0, 0, hy);
    gd.addColorStop(0, '#141a33');
    gd.addColorStop(0.6, '#7a4a5a');
    gd.addColorStop(1, '#f0a060');
    g.fillStyle = gd;
    g.fillRect(0, 0, state.W, state.H);
    g.fillStyle = '#2a1c22';
    g.beginPath();
    g.moveTo(0, hy);
    for (let x = 0; x <= state.W + 20; x += 20)
      g.lineTo(x, hy - 14 - 22 * (Math.sin(x * 0.006 + 1) * 0.5 + 0.5) - 30 * (Math.sin(x * 0.0021 + 4) * 0.5 + 0.5));
    g.lineTo(state.W, hy);
    g.fill();
    gd = g.createLinearGradient(0, hy, 0, state.H);
    gd.addColorStop(0, '#2e1e1c');
    gd.addColorStop(1, '#0c0809');
    g.fillStyle = gd;
    g.fillRect(0, hy, state.W, state.H - hy);
  } else {
    gd = g.createLinearGradient(0, 0, 0, hy);
    gd.addColorStop(0, '#02030a');
    gd.addColorStop(1, '#0d1426');
    g.fillStyle = gd;
    g.fillRect(0, 0, state.W, state.H);
    ST.forEach((q) => {
      g.fillStyle = `rgba(255,255,255,${0.3 + q[2] * 0.6})`;
      g.fillRect(q[0] * state.W, q[1] * state.H, 1.5, 1.5);
    });
    g.fillStyle = '#06080d';
    g.fillRect(0, hy, state.W, state.H - hy);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(255,190,90,.75)';
      g.beginPath();
      g.arc(state.W * (0.04 + i * 0.07), hy + 16, 2, 0, 6.283);
      g.fill();
      g.fillStyle = 'rgba(120,170,255,.8)';
      g.beginPath();
      g.arc(state.W * (0.02 + i * 0.075), hy + 52, 3.5, 0, 6.283);
      g.fill();
    }
  }
  if (state.view != 2) {
    const gx2 = state.nx + 300 * state.u,
      rg = g.createRadialGradient(gx2, hy, 0, gx2, hy, 700 * state.u);
    rg.addColorStop(0, `rgba(255,150,60,${state.M.skyG()})`);
    rg.addColorStop(1, 'rgba(255,100,20,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rg;
    g.fillRect(0, state.H * 0.55, state.W, state.H * 0.45);
    g.globalCompositeOperation = 'source-over';
  }
}

/* heat haze: re-sample the frame behind the plume in two seamless passes (columns wobble vertically, then rows wobble
   sideways, both travelling downstream), feather the result with a radial mask, lay it back over the original */
export function haze() {
  const k = state.M.hzk();
  if (k < 0.03 || state.Q < 1) return;
  const T = state.simT,
    rad = state.view == 2;
  let x0, y0, x1, y1, gcx, gcy, grx, gry;
  if (rad) {
    const R = Math.min(state.W, state.H) * 0.34,
      c = state.W * 0.44;
    x0 = c - R * 1.3;
    x1 = c + R * 1.3;
    y0 = state.H * 0.5 - R * 1.3;
    y1 = state.H * 0.5 + R * 1.3;
    gcx = c;
    gcy = state.H * 0.5;
    grx = gry = R * 1.3;
  } else {
    const hz = state.M.hzg(),
      hw = hz[0] * state.u * state.zm,
      ln = hz[1] * state.u * state.zm;
    x0 = state.nx;
    x1 = state.nx + ln;
    y0 = state.ny - hw * 1.5;
    y1 = state.ny + hw * 1.5;
    gcx = x0 + (x1 - x0) * 0.38;
    gcy = state.ny;
    grx = (x1 - x0) * 0.62;
    gry = hw * 1.5;
  }
  x0 = Math.max(0, Math.floor(x0));
  x1 = Math.min(state.W, Math.ceil(x1));
  y0 = Math.max(0, Math.floor(y0));
  y1 = Math.min(state.H, Math.ceil(y1));
  const w = x1 - x0,
    h = y1 - y0;
  if (w < 24 || h < 24) return;
  const amp = state.M.hza() * state.u * Math.sqrt(state.zm) * state.D * (rad ? 0.45 : 1),
    pad = Math.ceil(amp) + 3,
    sw = Math.ceil(w * state.D),
    sh = Math.ceil(h * state.D),
    tw = sw + pad * 2,
    th = sh + pad * 2;
  if (HS.width < tw || HS.height < th) {
    const nw = Math.max(HS.width, tw),
      nh = Math.max(HS.height, th);
    HS.width = HD.width = nw;
    HS.height = HD.height = nh;
  }
  hs.globalCompositeOperation = 'copy';
  hs.drawImage(cv, Math.round(x0 * state.D), Math.round(y0 * state.D), sw, sh, pad, pad, sw, sh);
  hd.globalCompositeOperation = 'source-over';
  hd.clearRect(0, 0, tw, th);
  const cw = Math.max(2, Math.round(3 * state.u * (state.Q == 1 ? 2 : 1))),
    cwp = Math.max(2, Math.round(cw * state.D)),
    fs = T * (9 + state.A * 9),
    fq = 0.04 / state.u;
  /* pass 1: columns, vertical shift */
  for (let px = 0; px < sw; px += cwp) {
    const X = x0 + (px + cwp * 0.5) / state.D,
      env = rad ? 1 : sm(0, 90 * state.u * state.zm, X - state.nx),
      p2 = X * fq - fs + (rad ? Math.hypot(X - gcx, 0) * 0.02 : 0),
      dy = Math.round(env * amp * (Math.sin(p2) + 0.3 * Math.sin(p2 * 2.3 + T * 5)));
    hd.drawImage(HS, pad + px, pad + dy, cwp, sh, pad + px, pad, cwp, sh);
  }
  /* pass 2: rows, sideways shift (smaller) */
  if (state.Q > 1) {
    hs.globalCompositeOperation = 'copy';
    hs.drawImage(HD, 0, 0);
    hd.clearRect(0, 0, tw, th);
    const rh = Math.max(2, Math.round(3 * state.u * state.D));
    for (let py = 0; py < sh; py += rh) {
      const Y = y0 + (py + rh * 0.5) / state.D,
        p3 = Y * fq * 1.3 - fs * 0.8 + T * 3,
        dx = Math.round(amp * 0.55 * (Math.sin(p3) + 0.3 * Math.sin(p3 * 2.1 + 1.7)));
      hd.drawImage(HS, pad + dx, pad + py, sw, Math.min(rh, sh - py), pad, pad + py, sw, Math.min(rh, sh - py));
    }
  }
  /* feather */
  hd.globalCompositeOperation = 'destination-in';
  hd.save();
  hd.translate(pad + (gcx - x0) * state.D, pad + (gcy - y0) * state.D);
  hd.scale(grx * state.D, gry * state.D);
  const mg = hd.createRadialGradient(0, 0, 0, 0, 0, 1);
  mg.addColorStop(0, `rgba(0,0,0,${Math.min(1, k * 1.6)})`);
  mg.addColorStop(0.55, `rgba(0,0,0,${Math.min(0.9, k * 1.4)})`);
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  hd.fillStyle = mg;
  hd.fillRect(
    -(pad + (gcx - x0) * state.D) / (grx * state.D),
    -(pad + (gcy - y0) * state.D) / (gry * state.D),
    tw / (grx * state.D),
    th / (gry * state.D),
  );
  hd.restore();
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.drawImage(HD, pad, pad, sw, sh, x0, y0, w, h);
}
/* bloom: downsample, square to keep only the bright parts, add back blurred */
export function bloom() {
  const k = state.M.blk();
  if (k < 0.03 || state.Q < 1) return;
  b0.globalCompositeOperation = 'copy';
  b0.drawImage(cv, 0, 0, B0.width, B0.height);
  b1.globalCompositeOperation = 'copy';
  b1.drawImage(B0, 0, 0, B1.width, B1.height);
  b1.globalCompositeOperation = 'multiply';
  b1.drawImage(B1, 0, 0);
  b2.globalCompositeOperation = 'copy';
  b2.drawImage(B1, 0, 0, B2.width, B2.height);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, k * 0.8);
  g.drawImage(B2, 0, 0, state.W, state.H);
  g.globalAlpha = Math.min(1, k * 0.4);
  g.drawImage(B1, 0, 0, state.W, state.H);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}
export function draw(dt, dr) {
  if (state.G3) {
    g.setTransform(state.D, 0, 0, state.D, 0, 0);
    g.clearRect(0, 0, state.W, state.H);
    try {
      state.G3.render(dt, dr);
    } catch (e) {
      console.error(e);
      fail3D();
    }
    return;
  }
  state.zm += (ZT[state.view] - state.zm) * (1 - Math.exp(-dr * 5));
  sky();
  const sh = SHAKE * state.M.shk() * state.u,
    r = state.M.r(),
    T = state.simT,
    jx = Math.sin(T * 191) + Math.sin(T * 313 + 1.3),
    jy = Math.sin(T * 227 + 0.4) + Math.sin(T * 359 + 2.1);
  g.save();
  g.translate(jx * sh * 0.25, jy * sh * 0.25);
  if (state.view == 2) state.M.rear();
  else {
    g.translate(state.nx, state.ny);
    g.scale(state.zm, state.zm);
    g.translate(-state.nx, -state.ny);
    state.M.draw(r, dt);
  }
  g.restore();
  haze();
  bloom();
  if (state.kick > 0.02) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,220,180,${state.kick * 0.3})`;
    g.fillRect(0, 0, state.W, state.H);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}
