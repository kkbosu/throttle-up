// Cutaway flow tracers along each machine's gas paths.
import { M3 } from '../machines/three.js';
import * as T from 'three';
import { state } from '../core/state.js';
import { ENG } from './builders.js';
import { k3 } from './context.js';
import { V3 } from './kit.js';
import { FLW, W3 } from './particles.js';

// assigned by create*() below, when init3D runs
export let TV;

export function createFlow() {
  /* ======================= cutaway airflow tracers: particles riding fixed paths, coloured by temperature ======================= */
  k3.flowKey = '';
  k3.flowP = [];
  TV = V3();
}

export function tv(t) {
  return t == -1 ? (state.fu < 0.5 ? 0.35 : 0.78 + 0.22 * state.A) : t == -2 ? 0.12 + 0.62 * state.A : t;
}
export function tcol(t, k) {
  if (k == 6) return [1.8, 1.0, 0.3];
  if (k == 7) return [0.6, 0.55, 0.5];
  if (k == 4) return t < 0.35 ? [0.55, 0.55, 0.6] : [0.55 + 0.3 * (1 - t), 0.75, 2.4];
  if (k == 5) return [1.7, 1.5, 0.35];
  if (k == 1) return [0.25 + 0.8 * t, 0.45 + 0.8 * t, 1.8 - 0.2 * t];
  if (k == 2) return [0.7 + 0.5 * t, 1.3 + 0.3 * t, 1.8];
  if (k == 3) return [1.1 + 1.1 * t, 0.8 + 1.0 * t, 1.9 + 0.9 * t];
  const S = [
    [0, 0.35, 0.62, 1.6],
    [0.4, 1.35, 1.4, 1.55],
    [0.72, 2.5, 1.65, 0.55],
    [1, 2.6, 0.85, 0.22],
  ];
  for (let i = 0; i < 3; i++)
    if (t <= S[i + 1][0]) {
      const a = S[i],
        b = S[i + 1],
        f = (t - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  return S[3].slice(1);
}
export function flowSetup() {
  const e = ENG[state.mi],
    on = state.exposed && !state.lens && !!e.flow,
    key = state.mi + '|' + state.Q + '|' + on;
  if (key === k3.flowKey) return;
  k3.flowKey = key;
  FLW.clear();
  if (!on) return;
  k3.flowP = e.flow();
  k3.flowP.forEach((p) => {
    if (p.ring) {
      p.len = 1;
    } else if (p.cv) {
      p.c = new T.CatmullRomCurve3(p.cv.map((q) => V3(...q)));
      p.len = p.c.getLength();
    } else {
      let L = 0;
      for (let i = 1; i < p.ax.length; i++)
        L += Math.hypot(p.ax[i][0] - p.ax[i - 1][0], (p.ax[i][1] + p.ax[i][2] - p.ax[i - 1][1] - p.ax[i - 1][2]) / 2);
      p.len = L;
    }
  });
  const n = [160, 320, 520][state.Q],
    tw = k3.flowP.reduce((s, p) => s + p.w, 0);
  k3.flowP.forEach((p, pi) => {
    const c = Math.max(4, Math.round((n * p.w) / tw));
    for (let i = 0; i < c; i++) {
      const bk = Math.random() < 0.5;
      FLW.L.push({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        a: 0,
        l: 1e12,
        sd: Math.random(),
        pi,
        s: Math.random(),
        f: Math.random(),
        an: p.band ? (bk ? Math.PI + Math.random() * 0.55 : 2 * Math.PI - Math.random() * 0.55) : Math.random() * 6.283,
        fresh: 1,
      });
    }
  });
}
export function flowUpd(dt) {
  FLW.u.uStr.value = M3[state.mi].flowStr ?? 0.03;
  const m3 = M3[state.mi],
    e = ENG[state.mi],
    sp = m3.flowSpeed ? m3.flowSpeed() : 0.1 + state.N * state.fu * 1.5 + (state.ph == 1 ? 0.25 : 0);
  FLW.upd(dt, (p, dt) => {
    const pa = k3.flowP[p.pi];
    if (!pa) return null;
    if (pa.ring) {
      const R4 = pa.ring;
      p.an += dt * pa.om * (0.15 + state.N * state.fu);
      if (Math.sin(p.an) > 0) p.an += Math.PI;
      const r = R4[2] + (R4[3] - R4[2]) * p.s;
      W3.set(R4[0] + (R4[1] - R4[0]) * p.f, Math.cos(p.an) * r, Math.sin(p.an) * r).applyMatrix4(e.E.matrixWorld);
      p.vx = p.vy = p.vz = 0;
      p.x = W3.x;
      p.y = W3.y;
      p.z = W3.z;
      const c = tcol(0, 5);
      return [0.004, c[0] * 0.75, c[1] * 0.75, c[2] * 0.75, 0.8 * Math.min(1, state.N * state.fu * 2 + 0.15)];
    }
    p.s += ((dt * sp * pa.sp) / Math.max(0.5, pa.len)) * 1.4;
    let wrap = false;
    if (p.s >= 1) {
      p.s -= 1;
      p.f = Math.random();
      wrap = true;
    }
    let lx, ly, lz, t;
    if (pa.ax) {
      const K = pa.ax,
        m = K.length - 1,
        u = p.s * m,
        i = Math.min(m - 1, Math.floor(u)),
        fr = u - i,
        a = K[i],
        b = K[i + 1],
        ri = a[1] + (b[1] - a[1]) * fr,
        ro = a[2] + (b[2] - a[2]) * fr,
        r = ri + (ro - ri) * p.f;
      lx = a[0] + (b[0] - a[0]) * fr;
      ly = Math.cos(p.an) * r;
      lz = Math.sin(p.an) * r;
      t = tv(a[3]) + (tv(b[3]) - tv(a[3])) * fr;
    } else {
      pa.c.getPointAt(p.s, TV);
      const j = pa.r * p.f;
      lx = TV.x + Math.cos(p.an) * j * 0.5;
      ly = TV.y + Math.cos(p.an) * j;
      lz = TV.z + Math.sin(p.an) * j;
      t = pa.t0 + (pa.t1 - pa.t0) * p.s;
    }
    W3.set(lx, ly, lz).applyMatrix4(e.E.matrixWorld);
    if (!p.fresh && !wrap && dt > 0) {
      p.vx = (W3.x - p.qx) / dt;
      p.vy = (W3.y - p.qy) / dt;
      p.vz = (W3.z - p.qz) / dt;
    } else {
      p.vx = p.vy = p.vz = 0;
    }
    p.fresh = 0;
    p.x = p.qx = W3.x;
    p.y = p.qy = W3.y;
    p.z = p.qz = W3.z;
    const c = tcol(t, pa.k),
      al = (pa.al ? pa.al() : 1) * Math.min(1, p.s * 12) * Math.min(1, (1 - p.s) * 12);
    return [m3.flowSize ?? 0.015, c[0] * 0.75, c[1] * 0.75, c[2] * 0.75, al * 0.8];
  });
}
