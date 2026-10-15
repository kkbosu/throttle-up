// Ground: lakebed, grass, Mars terrain and rocks, test-pad texture, mountains, trees.
import * as T from 'three';
import { mk } from '../core/util.js';
import { ANI, CAT, V3, canvasTex, scn, std } from './kit.js';

// assigned by create*() below, when init3D runs
export let lakeC, lakeN, grassC, marsC, marsN, rocks, gMat, ground, mountMat, trees, mountains;

export function createGround() {
  [lakeC, lakeN] = crackTex();
  grassC = grassTex();
  [marsC, marsN] = marsTex();
  /* scattered rocks for the Mars site, kept clear of the landing spot */
  rocks = (() => {
    const m = new T.InstancedMesh(
        new T.DodecahedronGeometry(1, 0),
        std({ color: 0x74503a, roughness: 0.95, flatShading: true }),
        600,
      ),
      M4 = new T.Matrix4(),
      q = new T.Quaternion(),
      eu = new T.Euler();
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * 6.283,
        d = 7 + Math.pow(Math.random(), 1.6) * 260,
        s = 0.08 + Math.pow(Math.random(), 4) * 1.4 * (d / 60 + 0.3);
      q.setFromEuler(eu.set(Math.random() * 3, Math.random() * 3, Math.random() * 3));
      M4.compose(
        V3(Math.cos(a) * d, s * 0.2, Math.sin(a) * d),
        q,
        V3(s * (1 + Math.random()), s * (0.4 + Math.random() * 0.5), s * (1 + Math.random())),
      );
      m.setMatrixAt(i, M4);
    }
    m.castShadow = m.receiveShadow = true;
    m.userData.bg = 1;
    m.visible = false;
    scn.add(m);
    return m;
  })();
  gMat = std({
    color: 0xffffff,
    map: lakeC,
    normalMap: lakeN,
    normalScale: new T.Vector2(0.35, 0.35),
    roughness: 0.95,
    metalness: 0,
  });
  ground = new T.Mesh(new T.PlaneGeometry(8000, 8000), gMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.bg = 1;
  CAT.set(gMat, 'gnd');
  scn.add(ground);
  mountMat = new T.MeshBasicMaterial({ color: 0x332222, fog: true });
  {
    const n = 220,
      pos = [],
      R0 = 2600;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        h =
          60 +
          140 * Math.max(0, Math.sin(a * 3 + 1)) * (0.5 + 0.5 * Math.sin(a * 7)) +
          90 * Math.abs(Math.sin(a * 11 + 2)) +
          40 * Math.sin(a * 23);
      pos.push(Math.cos(a) * R0, -20, Math.sin(a) * R0, Math.cos(a) * R0, Math.max(30, h), Math.sin(a) * R0);
    }
    const g = new T.BufferGeometry(),
      idx = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    mountains = new T.Mesh(g, mountMat);
    mountains.userData.bg = 1;
    mountMat.side = T.DoubleSide;
    scn.add(mountains);
  }
  /* pine tree line for the RS-25 site (Mississippi forest, not a desert) */
  trees = (() => {
    const tp = [
      [0, 13],
      [0.9, 11.5],
      [0.5, 11.2],
      [1.5, 9.6],
      [0.9, 9.3],
      [2.1, 7.6],
      [1.3, 7.3],
      [2.6, 5.4],
      [1.6, 5.2],
      [2.9, 3.2],
      [0.3, 3],
    ]
      .map((p) => new T.Vector2(p[0], p[1]))
      .reverse();
    const g = new T.LatheGeometry(tp, 8);
    const tr = new T.CylinderGeometry(0.3, 0.4, 2, 6);
    tr.translate(0, 1, 0);
    const m = new T.InstancedMesh(g, std({ color: 0x1c2b1a, roughness: 0.9 }), 520),
      mt = new T.InstancedMesh(tr, std({ color: 0x2a2018, roughness: 0.9 }), 520),
      M4 = new T.Matrix4(),
      q = new T.Quaternion();
    for (let i = 0; i < 520; i++) {
      let a = Math.random() * Math.PI * 2,
        d = 110 + Math.pow(Math.random(), 0.7) * 260;
      const s = 0.6 + Math.random() * 1.0;
      q.setFromAxisAngle(V3(0, 1, 0), Math.random() * 6.3);
      M4.compose(
        V3(Math.cos(a) * d, 0, Math.sin(a) * d - 40),
        q,
        V3(s * (0.8 + Math.random() * 0.4), s * (0.8 + Math.random() * 0.6), s * (0.8 + Math.random() * 0.4)),
      );
      m.setMatrixAt(i, M4);
      mt.setMatrixAt(i, M4);
    }
    m.userData.bg = mt.userData.bg = 1;
    const gr = new T.Group();
    gr.add(m, mt);
    scn.add(gr);
    return gr;
  })();
}

/* ---------------- ground ---------------- */
/* dry lakebed: tileable mud-crack polygons (jittered-grid Voronoi), with a matching height map turned into normals */
export function crackTex() {
  const s = 512,
    cells = 16,
    cs = s / cells,
    P = [],
    cv2 = new Float32Array(cells * cells);
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) {
      P.push([(i + 0.03 + Math.random() * 0.94) * cs, (j + 0.03 + Math.random() * 0.94) * cs]);
      cv2[j * cells + i] = Math.random();
    }
  const C = new Uint8ClampedArray(s * s * 4),
    Hh = new Float32Array(s * s);
  const lw = (x, y) =>
    0.5 +
    0.5 *
      (Math.sin((x / s) * 6.283 * 2 + 1) * Math.sin((y / s) * 6.283 * 3 + 2) * 0.6 +
        Math.sin((x / s) * 6.283 * 5 + (y / s) * 6.283 * 4) * 0.4);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const ci = Math.floor(x / cs),
        cj = Math.floor(y / cs);
      let d1 = 1e9,
        d2 = 1e9,
        id = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          let ii = ci + di,
            jj = cj + dj,
            ox = 0,
            oy = 0;
          if (ii < 0) {
            ii += cells;
            ox = -s;
          } else if (ii >= cells) {
            ii -= cells;
            ox = s;
          }
          if (jj < 0) {
            jj += cells;
            oy = -s;
          } else if (jj >= cells) {
            jj -= cells;
            oy = s;
          }
          const p = P[jj * cells + ii],
            dx = p[0] + ox - x,
            dy = p[1] + oy - y,
            d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = jj * cells + ii;
          } else if (d < d2) d2 = d;
        }
      const e = Math.sqrt(d2) - Math.sqrt(d1),
        cr = 1 - Math.min(1, e / 1.6),
        k = (y * s + x) * 4,
        v = (0.86 + 0.1 * cv2[id] + 0.08 * (lw(x, y) - 0.5) + (Math.random() - 0.5) * 0.06) * (1 - cr * 0.22);
      C[k] = 196 * v;
      C[k + 1] = 178 * v;
      C[k + 2] = 150 * v;
      C[k + 3] = 255;
      Hh[y * s + x] = Math.min(1, e / 4) + 0.25 * (1 - Math.min(1, e / 12)) * Math.min(1, e / 2);
    }
  const c1 = mk(s, s);
  c1.getContext('2d').putImageData(new ImageData(C, s, s), 0, 0);
  const N = new Uint8ClampedArray(s * s * 4);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const hx = Hh[y * s + ((x + 1) % s)] - Hh[y * s + ((x + s - 1) % s)],
        hy = Hh[((y + 1) % s) * s + x] - Hh[((y + s - 1) % s) * s + x],
        nx = -hx * 1.6,
        ny = -hy * 1.6,
        l = Math.hypot(nx, ny, 1),
        k = (y * s + x) * 4;
      N[k] = ((nx / l) * 0.5 + 0.5) * 255;
      N[k + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      N[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      N[k + 3] = 255;
    }
  const c2 = mk(s, s);
  c2.getContext('2d').putImageData(new ImageData(N, s, s), 0, 0);
  const t1 = new T.CanvasTexture(c1),
    t2 = new T.CanvasTexture(c2);
  t1.colorSpace = T.SRGBColorSpace;
  [t1, t2].forEach((t) => {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(1300, 1300);
    t.anisotropy = ANI;
  });
  return [t1, t2];
}
export function grassTex() {
  const t = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#4a5a32';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const g = (60 + Math.random() * 60) | 0;
        x.fillStyle = `rgba(${(g * 0.75) | 0},${g},${(g * 0.5) | 0},.35)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 5);
      }
      for (let i = 0; i < 60; i++) {
        const gx = Math.random() * w,
          gy = Math.random() * h,
          r = 10 + Math.random() * 40,
          gd = x.createRadialGradient(gx, gy, 0, gx, gy, r);
        gd.addColorStop(0, 'rgba(110,95,60,.35)');
        gd.addColorStop(1, 'rgba(110,95,60,0)');
        x.fillStyle = gd;
        x.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
    },
    true,
    [900, 900],
  );
  return t;
}
/* Mars regolith: rusty dust with blotches and pebbles, tileable, plus a normal map from the pebble heights */
export function marsTex() {
  const s = 512,
    c1 = mk(s, s),
    x = c1.getContext('2d'),
    c3 = mk(s, s),
    h = c3.getContext('2d');
  x.fillStyle = '#9c5c3a';
  x.fillRect(0, 0, s, s);
  h.fillStyle = '#000';
  h.fillRect(0, 0, s, s);
  const wrap = (f, px, py, r) => {
    for (const ox of [-s, 0, s])
      for (const oy of [-s, 0, s])
        if (px + ox > -r && px + ox < s + r && py + oy > -r && py + oy < s + r) f(px + ox, py + oy);
  };
  for (let i = 0; i < 70; i++) {
    const px = Math.random() * s,
      py = Math.random() * s,
      r = 30 + Math.random() * 90,
      v = Math.random() < 0.5;
    wrap(
      (X, Y) => {
        const gd = x.createRadialGradient(X, Y, 0, X, Y, r);
        gd.addColorStop(0, v ? 'rgba(70,35,20,.2)' : 'rgba(205,145,100,.17)');
        gd.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gd;
        x.fillRect(X - r, Y - r, 2 * r, 2 * r);
      },
      px,
      py,
      r,
    );
  }
  for (let i = 0; i < 26000; i++) {
    const v = Math.random() < 0.5;
    x.fillStyle = v ? 'rgba(60,30,18,.12)' : 'rgba(195,125,85,.12)';
    x.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
  }
  for (let i = 0; i < 900; i++) {
    const px = Math.random() * s,
      py = Math.random() * s,
      r = 1 + Math.pow(Math.random(), 3) * 7,
      a = Math.random() * 3,
      dk = 40 + Math.random() * 60;
    wrap(
      (X, Y) => {
        x.fillStyle = `rgb(${(dk + 40) | 0},${(dk * 0.6) | 0},${(dk * 0.45) | 0})`;
        x.beginPath();
        x.ellipse(X, Y, r, r * 0.7, a, 0, 6.283);
        x.fill();
        const gd = h.createRadialGradient(X, Y, 0, X, Y, r);
        gd.addColorStop(0, 'rgba(255,255,255,1)');
        gd.addColorStop(1, 'rgba(255,255,255,0)');
        h.fillStyle = gd;
        h.beginPath();
        h.ellipse(X, Y, r, r * 0.7, a, 0, 6.283);
        h.fill();
      },
      px,
      py,
      r,
    );
  }
  const hd = h.getImageData(0, 0, s, s).data,
    Nn = new Uint8ClampedArray(s * s * 4),
    H = (i, j) => hd[(((j + s) % s) * s + ((i + s) % s)) * 4] / 255;
  for (let j = 0; j < s; j++)
    for (let i = 0; i < s; i++) {
      const nx = -(H(i + 1, j) - H(i - 1, j)) * 2.5,
        ny = -(H(i, j + 1) - H(i, j - 1)) * 2.5,
        l = Math.hypot(nx, ny, 1),
        k = (j * s + i) * 4;
      Nn[k] = ((nx / l) * 0.5 + 0.5) * 255;
      Nn[k + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      Nn[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      Nn[k + 3] = 255;
    }
  const c2 = mk(s, s);
  c2.getContext('2d').putImageData(new ImageData(Nn, s, s), 0, 0);
  const t1 = new T.CanvasTexture(c1),
    t2 = new T.CanvasTexture(c2);
  t1.colorSpace = T.SRGBColorSpace;
  [t1, t2].forEach((t) => {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(900, 900);
    t.anisotropy = ANI;
  });
  return [t1, t2];
}
/* concrete pad: slabs, joints, oil, and the exhaust scorch fan downstream of the nozzle */
export function padTex(scX, scY, len, wide) {
  return canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#8e8a82';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = (100 + Math.random() * 70) | 0;
      x.fillStyle = `rgba(${v},${v - 3},${v - 8},.25)`;
      x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        x.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},.025)`;
        x.fillRect(i * 128, j * 128, 128, 128);
      }
    x.strokeStyle = 'rgba(30,28,25,.75)';
    x.lineWidth = 2.5;
    for (let i = 0; i <= 8; i++) {
      x.beginPath();
      x.moveTo(i * 128, 0);
      x.lineTo(i * 128, h);
      x.moveTo(0, i * 128);
      x.lineTo(w, i * 128);
      x.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const ox = Math.random() * w,
        oy = Math.random() * h,
        r = 6 + Math.random() * 26,
        gd = x.createRadialGradient(ox, oy, 0, ox, oy, r);
      gd.addColorStop(0, 'rgba(20,18,14,.4)');
      gd.addColorStop(1, 'rgba(20,18,14,0)');
      x.fillStyle = gd;
      x.fillRect(ox - r, oy - r, r * 2, r * 2);
    }
    x.save();
    x.translate(scX * w, scY * h);
    x.scale(len * w, wide * h);
    const gd = x.createRadialGradient(0.5, 0, 0, 0.5, 0, 0.75);
    gd.addColorStop(0, 'rgba(18,14,10,.7)');
    gd.addColorStop(0.6, 'rgba(30,24,18,.3)');
    gd.addColorStop(1, 'rgba(30,24,18,0)');
    x.fillStyle = gd;
    x.fillRect(0, -1, 1.25, 2);
    x.restore();
  });
}
