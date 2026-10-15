// 2D drawing shared by the jets (F-TYPE, SR-71); emit/stream/sparks/metal are also used by the RS-25.
import { state } from '../core/state.js';
import { g, sm } from '../core/util.js';
import { EM, P, SM } from './index.js';
import { SP, blob } from './sprites.js';

export function emit(dt, r) {
  let n = state.A * dt * 420;
  n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
  for (; n > 0 && P.length < 700; n--)
    P.push({
      x: state.nx + Math.random() * 12 * state.u,
      y: state.ny + (Math.random() - 0.5) * r * 1.5,
      vx: (650 + state.A * 900) * state.u * (0.6 + Math.random() * 0.8),
      vy: (Math.random() - 0.5) * 160 * state.u,
      l: 0,
      m: 0.35 + Math.random() * 0.6,
      s: (5 + Math.random() * 9) * state.u,
      ab: 1,
    });
  n = sm(0.5, 1, state.N) * state.fu * dt * 150;
  n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
  for (; n > 0 && P.length < 700; n--)
    P.push({
      x: state.nx,
      y: state.ny + (Math.random() - 0.5) * r,
      vx: (380 + state.N * 400) * state.u * (0.7 + Math.random() * 0.6),
      vy: (Math.random() - 0.5) * 70 * state.u,
      l: 0,
      m: 0.2 + Math.random() * 0.25,
      s: (3 + Math.random() * 5) * state.u,
      ab: 0,
    });
  n = sm(0.35, 1, state.A) * dt * 60;
  n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
  for (; n > 0 && EM.length < 160; n--)
    EM.push({
      x: state.nx + Math.random() * 30 * state.u,
      y: state.ny + (Math.random() - 0.5) * r,
      vx: (700 + Math.random() * 900) * state.u,
      vy: (Math.random() - 0.5) * 520 * state.u,
      l: 0,
      m: 0.4 + Math.random() * 0.6,
    });
}
/* a flame column: soft sprites along the axis, colour cross-faded down the palette, width widening then tapering */
export function stream(len, r0, a, n, T, pal, seed) {
  const m = pal.length - 1;
  for (let k = 0; k < n; k++) {
    const t = k / n,
      wob =
        (Math.sin(T * 17 + k * 0.9 + seed) +
          0.7 * Math.sin(T * 31 + k * 0.55 + seed * 2) +
          0.4 * Math.sin(T * 53 + k * 1.7)) *
        0.33 *
        (0.2 + t),
      pr = Math.pow(1 - t, 0.85) * (0.8 + 0.4 * Math.sin(Math.min(1, t * 3.2) * 1.5708)),
      sz = r0 * 2.1 * pr,
      ci = Math.min(m - 0.001, t * m * 1.15),
      i0 = ci | 0,
      f = ci - i0,
      al = a * Math.pow(1 - t, 1.6),
      x = state.nx + t * len,
      y = state.ny + wob * r0 * 0.9,
      w = sz * (1.5 + t * 1.2);
    blob(pal[i0], x, y, w, sz, al * (1 - f));
    blob(pal[i0 + 1], x, y, w, sz, al * f);
  }
}
/* long, thin flickering tongues inside the afterburner flame */
export function tongues(len, r, a, T) {
  for (let i = 0; i < 8; i++) {
    const q = Math.sin(T * (5 + i * 1.3) + i * 2.3),
      ll = len * (0.18 + 0.3 * (Math.sin(T * (7 + i) + i * 5) * 0.5 + 0.5));
    blob(
      i % 2 ? SP.y : SP.w,
      state.nx + ll * 0.5 + r * 0.2,
      state.ny + q * r * 0.5,
      ll,
      r * (0.4 + 0.25 * Math.sin(T * 11 + i)),
      a * 0.09,
    );
  }
}
export function plume(r, dt) {
  g.globalCompositeOperation = 'lighter';
  const T = state.simT,
    fl = 0.92 + 0.08 * Math.sin(T * 47) * Math.sin(T * 29 + 1),
    Pm = state.M.pl;
  const gl = state.M.gl(),
    gr = gl[1] * state.u,
    rg = g.createRadialGradient(state.nx + 80 * state.u, state.ny, 0, state.nx + 80 * state.u, state.ny, gr);
  rg.addColorStop(0, `rgba(255,150,60,${gl[0] * fl})`);
  rg.addColorStop(1, 'rgba(255,100,20,0)');
  g.globalAlpha = 1;
  g.fillStyle = rg;
  g.fillRect(-state.W, -state.H, state.W * 3, state.H * 3);
  const dA = sm(0.3, 1, state.N) * state.fu * (1 - state.A * 0.6);
  if (dA > 0.01) stream((Pm.dl[0] + state.N * state.N * Pm.dl[1]) * state.u, r * 0.8, dA * fl * 0.85, 22, T, Pm.dp, 0);
  if (state.ign > 0.02)
    stream((50 + 90 * state.ign) * state.u, r * 0.8, state.ign * 0.7, 20, T * 1.3, [SP.y, SP.o, SP.o, SP.r], 5);
  /* TEB light-off: the J58's green flash */
  if (state.gn > 0.02) {
    stream((60 + 120 * state.gn) * state.u, r * 0.9, state.gn * 0.7, 20, T * 1.2, [SP.g, SP.g, SP.o, SP.r], 7);
    blob(SP.g, state.nx + 50 * state.u, state.ny, r * 5.5, r * 3.6, state.gn * 0.4);
  }
  if (state.A > 0.01) {
    const len = (Pm.al[0] + state.A * Pm.al[1]) * state.u * (1 + state.kick * 0.25);
    stream(len, r * 1.25, state.A * fl * 0.42 * Pm.ak, Pm.sn, T, Pm.ap, 1);
    stream(len * 0.5, r * 0.8, state.A * fl * 0.3 * Pm.ak, 34, T + 3, Pm.cp, 2);
    tongues(len, r, state.A * fl * (0.4 + 0.6 * Pm.ak), T);
  }
  emit(dt, r);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.l += dt;
    if (p.l > p.m) {
      P[i] = P[P.length - 1];
      P.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const f = p.l / p.m,
      z = p.s * (2.4 + 2 * f);
    blob(
      p.ab ? (f < 0.3 ? SP.y : f < 0.65 ? SP.o : SP.r) : f < 0.5 ? SP.b : SP.o,
      p.x,
      p.y,
      z,
      z,
      (1 - f) * (p.k || (p.ab ? 0.22 * state.A + 0.06 : 0.3)),
    );
  }
  /* soot puffs from a surge (drawn dark, not additive) */
  if (SM.length) {
    g.globalCompositeOperation = 'source-over';
    for (let i = SM.length - 1; i >= 0; i--) {
      const p = SM[i];
      p.l += dt;
      if (p.l > p.m) {
        SM[i] = SM[SM.length - 1];
        SM.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-dt * 0.8);
      const f = p.l / p.m,
        z = p.s * (1.2 + 2.2 * f);
      blob(SP.k, p.x, p.y, z, z, (1 - f) * (f < 0.15 ? f / 0.15 : 1) * 0.42);
    }
    g.globalCompositeOperation = 'lighter';
  }
  sparks(dt);
  /* shock diamonds: a body plus a hot core */
  const dn = Pm.dn[0] + Math.floor(state.N * Pm.dn[1] + state.A * Pm.dn[2]),
    sp = (Pm.ds[0] + state.A * Pm.ds[1] + state.N * Pm.ds[2]) * state.u,
    da = sm(0.5, 1, state.N) * state.fu * 0.45 + state.A * 0.5;
  for (let i = 0; i < dn; i++) {
    const a = da * (1 - i / (dn + 1)) * (0.85 + 0.15 * Math.sin(T * 70 + i * 2)),
      rr = Math.max(2, r * (0.62 - i * 0.04)),
      x = state.nx + (i + 0.6) * sp;
    blob(state.A > 0.05 ? Pm.dc[0] : Pm.dc[1], x, state.ny, sp * 1.15, rr * 2.2, a * 0.8);
    blob(SP.w, x, state.ny, sp * 0.55, rr * 1.1, a * (state.A > 0.05 ? 0.6 : 0.5));
  }
  g.globalAlpha = 1;
}
/* sparks: streaks that arc downward */
export function sparks(dt) {
  g.lineWidth = 1.4 * state.u;
  for (let i = EM.length - 1; i >= 0; i--) {
    const p = EM[i];
    p.l += dt;
    if (p.l > p.m) {
      EM[i] = EM[EM.length - 1];
      EM.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * state.u * dt;
    p.vx *= Math.exp(-dt * 0.6);
    const f = p.l / p.m;
    g.strokeStyle = `rgba(255,${(170 + (1 - f) * 60) | 0},90,${(1 - f) * 0.8})`;
    g.globalAlpha = 1;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
    g.stroke();
  }
}

/* rear view: exit petals around the rim, throat petals inside, flame down the pipe */
export function rear() {
  const cx = state.W * 0.44,
    cy = state.H * 0.5,
    T = state.simT,
    R = Math.min(state.W, state.H) * 0.34,
    r = R * (0.38 + 0.17 * state.A),
    rt = r * (0.74 + 0.22 * state.A),
    heat = state.hg,
    fl = 0.92 + 0.08 * Math.sin(T * 47) * Math.sin(T * 29 + 1),
    dA = sm(0.3, 1, state.N) * state.fu * (1 - state.A * 0.6);
  g.globalCompositeOperation = 'source-over';
  let gd = g.createRadialGradient(cx, cy, r, cx, cy, R * 1.25);
  gd.addColorStop(0, '#3a404c');
  gd.addColorStop(0.5, '#4a5160');
  gd.addColorStop(1, '#12151b');
  g.fillStyle = gd;
  g.beginPath();
  g.arc(cx, cy, R * 1.25, 0, 6.283);
  g.fill();
  const n = 16,
    da = 6.283 / n,
    ov = 0.22 * (1 - 0.7 * state.A);
  const pet = (r0, r1, a0, w, tw, col) => {
    g.beginPath();
    g.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
    g.lineTo(cx + Math.cos(a0 + w) * r0, cy + Math.sin(a0 + w) * r0);
    g.lineTo(cx + Math.cos(a0 + w + tw) * r1, cy + Math.sin(a0 + w + tw) * r1);
    g.lineTo(cx + Math.cos(a0 + tw) * r1, cy + Math.sin(a0 + tw) * r1);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.stroke();
  };
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = 1.5;
  const dk = state.M.dk,
    bl = state.M.bl;
  for (let i = 0; i < n; i++) {
    const a0 = i * da,
      lum = 0.5 + 0.5 * Math.cos(a0 + da / 2 - 3.93);
    pet(
      r * 1.04,
      R * 1.25,
      a0,
      da * (1 + ov),
      0.06,
      `rgb(${((34 + lum * 44) * dk) | 0},${((40 + lum * 48) * dk) | 0},${((52 + lum * 54) * dk + bl) | 0})`,
    );
  }
  for (let i = 0; i < n; i++) {
    const a0 = i * da + da / 2,
      lum = 0.5 + 0.5 * Math.cos(a0 + da / 2 - 3.93);
    pet(
      rt * 0.98,
      r,
      a0,
      da * (1 + ov * 1.5),
      -0.05,
      `rgb(${((30 + lum * 40) * dk + heat * 70) | 0},${((30 + lum * 35) * dk + heat * 20) | 0},${((34 + lum * 30) * dk + bl * 0.5) | 0})`,
    );
  }
  g.fillStyle = '#030406';
  g.beginPath();
  g.arc(cx, cy, rt, 0, 6.283);
  g.fill();
  g.globalCompositeOperation = 'lighter';
  gd = g.createRadialGradient(cx, cy, r, cx, cy, r * 1.7);
  gd.addColorStop(0, `rgba(255,110,30,${heat * 0.6})`);
  gd.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = gd;
  g.beginPath();
  g.arc(cx, cy, R * 1.25, 0, 6.283);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, 6.283);
  g.clip();
  blob(SP.b, cx, cy, r * 2.4, r * 2.4, dA * 0.9);
  blob(SP.o, cx, cy, r * 2.8, r * 2.8, state.A * 0.9 * fl);
  blob(SP.y, cx, cy, r * 1.9, r * 1.9, state.A * fl);
  blob(SP.w, cx, cy, r * 1.1, r * 1.1, state.A * fl);
  blob(SP.y, cx, cy, r * 2.2, r * 2.2, state.ign * 0.8);
  blob(SP.g, cx, cy, r * 2.4, r * 2.4, state.gn * 0.9);
  for (let k = 0; k < 18; k++) {
    const a = T * (1.5 + (k % 4)) + k * 2.4,
      d = r * 0.5 * Math.abs(Math.sin(T * 3 + k));
    blob(
      k % 2 ? SP.y : SP.o,
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      r * 0.9,
      r * 0.9,
      (state.A * 0.35 + dA * 0.1) * fl,
    );
  }
  g.globalAlpha = 1;
  g.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = `rgba(255,240,215,${(state.A * 0.5 + dA * 0.25) * (1 - i / 6)})`;
    g.beginPath();
    g.arc(cx, cy, r * (0.8 - i * 0.13), 0, 6.283);
    g.stroke();
  }
  g.restore();
  blob(SP.o, cx, cy, R * 4.5, R * 4.5, state.A * 0.35 * fl);
  g.globalAlpha = 1;
}
export function wires(ts, fh) {
  g.fillStyle = '#0b0d11';
  g.fillRect(-60, state.ny - fh, ts + 60, fh * 2);
  const v = state.N * 1.4 * state.u;
  for (let x = ts - 30 * state.u; x > -60; x -= 64 * state.u) {
    const gd = g.createLinearGradient(x, 0, x + 12 * state.u, 0);
    gd.addColorStop(0, '#2a2f3a');
    gd.addColorStop(0.5, '#6a7282');
    gd.addColorStop(1, '#1a1e26');
    g.fillStyle = gd;
    g.fillRect(x, state.ny - fh, 12 * state.u, fh * 2);
  }
  g.strokeStyle = '#9a7a30';
  g.lineWidth = 8 * state.u;
  g.beginPath();
  g.moveTo(ts - 44 * state.u, state.ny - fh * 0.96);
  g.lineTo(ts - 44 * state.u, state.ny + fh * 0.96);
  g.stroke();
  const C = ['#c0392b', '#e0b020', '#2e86de', '#2ea85a', '#b8bcc4', '#e67e22', '#8e44ad'];
  for (let i = 0; i < 16; i++) {
    const y0 = state.ny + (i / 15 - 0.5) * fh * 1.8;
    g.strokeStyle = C[i % 7];
    g.lineWidth = (1.6 + (i % 3)) * state.u;
    g.beginPath();
    for (let x = -60; x <= ts - 6 * state.u; x += 14 * state.u) {
      const y =
        y0 +
        Math.sin((x * 0.025) / state.u + i * 1.3) * 7 * state.u +
        Math.sin((x * 0.07) / state.u + i) * 3 * state.u +
        (Math.sin(state.simT * 83 + x * 0.37 + i * 2.1) + Math.sin(state.simT * 131 + x * 0.21 + i)) * 0.25 * v;
      x <= -60 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  const gd = g.createLinearGradient(ts - 160 * state.u, 0, ts, 0);
  gd.addColorStop(0, 'rgba(255,80,20,0)');
  gd.addColorStop(1, `rgba(255,90,30,${state.hg * 0.6})`);
  g.fillStyle = gd;
  g.fillRect(ts - 160 * state.u, state.ny - fh, 160 * state.u, fh * 2);
}
export function metal(b) {
  const gd = g.createLinearGradient(0, state.ny - b, 0, state.ny + b);
  state.M.mc.forEach((s) => gd.addColorStop(s[0], s[1]));
  return gd;
}
/* SR-71 blow-in doors: open at low flight speed to feed the ejector (below about Mach 1.2), shut above it; hot metal shows through when open */
export function doors(ts, fh) {
  const o = 1 - sm(0.6, 1.2, state.mach);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  for (let s = -1; s <= 1; s += 2)
    for (let i = 0; i < 5; i++) {
      const x = ts - (38 + i * 34) * state.u,
        y = state.ny + s * fh * 0.5,
        w = 22 * state.u,
        h = (2.5 + 9 * o) * state.u;
      g.fillStyle = '#02030a';
      g.fillRect(x - w, y - h / 2, w, h);
      if (o > 0.05 && state.hg > 0.05) {
        g.fillStyle = `rgba(255,90,30,${state.hg * 0.55 * o})`;
        g.fillRect(x - w, y - h / 2, w, h);
      }
      g.strokeStyle = 'rgba(0,0,0,.65)';
      g.lineWidth = state.u;
      g.strokeRect(x - w, y - h / 2, w, h);
      if (o > 0.08) {
        g.fillStyle = `rgba(140,160,200,${0.55 * o})`;
        g.fillRect(x - w, s > 0 ? y + h / 2 - 1.4 * state.u : y - h / 2, w, 1.4 * state.u);
      }
    }
}
/* exposed view: five actuators around the nozzle (edge-on top and bottom, a 45 degree pair, one facing us),
   rods push a sync ring aft as the nozzle opens, link arms run from the ring to the flap hinges */
export function actuators(ts, xt, hh, rt) {
  const rx = ts + 10 * state.u + 34 * state.u * state.A,
    ry = hh + 14 * state.u;
  g.globalCompositeOperation = 'source-over';
  [-1, -0.707, 0, 0.707, 1].forEach((f) => {
    const yb = state.ny + f * ry,
      yp = state.ny + f * rt,
      x0 = ts - 66 * state.u,
      x1 = ts - 22 * state.u;
    g.globalAlpha = Math.abs(f) == 1 ? 1 : 0.92;
    g.strokeStyle = '#8f99aa';
    g.lineWidth = 2.6 * state.u;
    g.beginPath();
    g.moveTo(rx, yb);
    g.lineTo(xt, yp);
    g.stroke();
    g.fillStyle = '#d0d6e0';
    g.beginPath();
    g.arc(xt, yp, 3 * state.u, 0, 6.283);
    g.fill();
    const gd = g.createLinearGradient(0, yb - 5 * state.u, 0, yb + 5 * state.u);
    gd.addColorStop(0, '#2a313d');
    gd.addColorStop(0.35, '#6a7a90');
    gd.addColorStop(1, '#1d2330');
    g.fillStyle = gd;
    g.fillRect(x0, yb - 5 * state.u, x1 - x0, 10 * state.u);
    g.fillStyle = '#0c0f14';
    g.fillRect(x1 - 3 * state.u, yb - 6 * state.u, 3 * state.u, 12 * state.u);
    g.fillRect(x0, yb - 6 * state.u, 3 * state.u, 12 * state.u);
    g.fillStyle = '#98a2b2';
    g.fillRect(x1, yb - 2 * state.u, rx - x1, 4 * state.u);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(x1, yb - 1.4 * state.u, rx - x1, 1 * state.u);
    g.fillStyle = '#e4e8ee';
    g.beginPath();
    g.arc(rx, yb, 3.2 * state.u, 0, 6.283);
    g.fill();
  });
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(rx - 4 * state.u, 0, rx + 4 * state.u, 0);
  gr.addColorStop(0, '#6a7282');
  gr.addColorStop(0.5, '#c4cbd6');
  gr.addColorStop(1, '#4a5160');
  g.fillStyle = gr;
  g.fillRect(rx - 3.5 * state.u, state.ny - ry - 5 * state.u, 7 * state.u, (ry + 5 * state.u) * 2);
}
/* nozzle: convergent primary petals to the throat hinge, divergent flaps out to the exit; both move with the afterburner */
export function body(r) {
  const B = state.M.bd;
  g.globalCompositeOperation = 'source-over';
  const ts = state.nx - B.ts * state.u,
    xt = ts + B.xt * state.u,
    hh = B.hh * state.u,
    fh = B.fh * state.u,
    rt = r * (0.72 + 0.24 * state.A);
  if (state.exposed) wires(ts, fh);
  else {
    g.fillStyle = metal(fh);
    g.fillRect(-60, state.ny - fh, ts + 60, fh * 2);
    if (B.doors) doors(ts, fh);
  }
  g.fillStyle = '#0a0c10';
  g.fillRect(ts - 3 * state.u, state.ny - fh, 3 * state.u, fh * 2);
  const poly = () => {
    g.beginPath();
    g.moveTo(ts, state.ny - hh);
    g.lineTo(xt, state.ny - rt);
    g.lineTo(state.nx, state.ny - r);
    g.lineTo(state.nx, state.ny + r);
    g.lineTo(xt, state.ny + rt);
    g.lineTo(ts, state.ny + hh);
    g.closePath();
  };
  poly();
  g.fillStyle = metal(hh);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.06)';
  g.beginPath();
  g.moveTo(xt, state.ny - rt);
  g.lineTo(state.nx, state.ny - r);
  g.lineTo(state.nx, state.ny + r);
  g.lineTo(xt, state.ny + rt);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.45)';
  g.lineWidth = 1.5 * state.u;
  for (let i = -3; i <= 3; i++) {
    const f = i / 3.5;
    g.beginPath();
    g.moveTo(ts, state.ny + hh * f);
    g.lineTo(xt, state.ny + rt * f);
    g.lineTo(state.nx, state.ny + r * f);
    g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,.6)';
  g.lineWidth = 2.5 * state.u;
  g.beginPath();
  g.moveTo(xt, state.ny - rt);
  g.lineTo(xt, state.ny + rt);
  g.stroke();
  g.strokeStyle = 'rgba(190,200,215,.35)';
  g.lineWidth = state.u;
  g.beginPath();
  g.moveTo(xt + 2 * state.u, state.ny - rt);
  g.lineTo(xt + 2 * state.u, state.ny + rt);
  g.stroke();
  for (let i = -3; i <= 3; i++) {
    const f = i / 3.5,
      w = (i & 1 ? 7 : 3) * state.u;
    g.fillStyle = i & 1 ? '#59616f' : '#2c323d';
    g.fillRect(state.nx - w, state.ny + r * f - 1.6 * state.u, w, 3.2 * state.u);
  }
  const heat = state.hg,
    gd = g.createLinearGradient(ts, 0, state.nx, 0);
  gd.addColorStop(0, 'rgba(255,70,20,0)');
  gd.addColorStop(1, `rgba(255,${(90 + state.A * 60) | 0},30,${heat * 0.6})`);
  poly();
  g.fillStyle = gd;
  g.fill();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(255,200,140,${heat * 0.6})`;
  g.beginPath();
  g.ellipse(state.nx, state.ny, 3 * state.u, r, 0, 0, 6.283);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  if (state.exposed) actuators(ts, xt, hh, rt);
}
