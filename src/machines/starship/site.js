// STARSHIP: the Starbase site around the booster. Coastal ground (beach, dunes, tidal flats and lagoons) and the Gulf,
// the Pad 2 launch mount over its dual flame trench, the launch tower with its chopsticks, the tank farm, Pad 1 a
// little way along the coast and the build site on the horizon. An impression placed by eye, not a survey (INFO says so).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { CAT, MT, V3, box, canvasTex, std } from '../../render3d/kit.js';

/* World layout (metres, y up): the booster stands on the mount at the origin, the flame trench runs along x, the tower
   is behind it (-z) and the Gulf beyond that, so the SIDE view looks out to sea. */
export const DECK = 20,
  BR = 4.5,
  TOWER = [-3, -24],
  TOWER_H = 145;
const shore = (x) => -360 + 22 * Math.sin(x / 260 + 0.7) + 9 * Math.sin(x / 83 + 2),
  WATER = -0.3;

/* ---------- deterministic value noise (no Math.random, so the ground is the same whatever ran before) ---------- */
function hash(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z),
    fx = x - i,
    fz = z - j,
    u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  return (
    (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v
  );
}
function fbm(x, z, o = 4) {
  let s = 0,
    a = 0.5,
    f = 1,
    t = 0;
  for (let k = 0; k < o; k++) {
    s += a * vnoise(x * f + k * 17.3, z * f - k * 9.1);
    t += a;
    f *= 2.03;
    a *= 0.5;
  }
  return s / t;
}
const sst = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/* graded ground around the two pads and the roads: kept flat and dry */
const graded = (x, z) =>
  Math.max(
    1 - sst(150, 230, Math.hypot((x - 10) / 1.15, z + 5)),
    1 - sst(110, 170, Math.hypot(x + 250, z + 110)),
    1 - sst(10, 24, Math.abs(z - roadZ(x))) * (x < 330 ? 1 : 0),
  );
const roadZ = (x) => 120 + 30 * Math.sin(x / 700);
/* lagoons and tidal flats inland, as around Boca Chica */
const lagoon = (x, z) => sst(0.43, 0.36, fbm(x / 340 + 3.1, z / 340 - 1.7, 4)) * sst(260, 420, Math.hypot(x, z));

/* height of the land; anything below WATER is under the Gulf or a lagoon */
function height(x, z) {
  const d = z - shore(x);
  if (d < 0) return WATER - 0.2 + d * 0.03;
  let y = WATER - 0.12 + 0.42 * sst(0, 60, d);
  /* a line of dunes behind the beach */
  const du = sst(50, 70, d) * (1 - sst(95, 130, d));
  y += du * (0.6 + 2.4 * fbm(x / 45, z / 45, 3));
  /* gentle undulation inland, lagoons cut below the water line */
  const inl = sst(110, 170, d),
    g = graded(x, z);
  y += inl * (1 - g) * ((fbm(x / 150, z / 150, 3) - 0.5) * 0.5 - lagoon(x, z) * 0.75);
  return y * (1 - g) + 0.02 * g;
}
function landColour(x, z, y, c) {
  const d = z - shore(x),
    n = fbm(x / 60, z / 60, 4),
    n2 = fbm(x / 13 + 7, z / 13 - 3, 3);
  let r, g, b;
  if (d < 6) [r, g, b] = [0.5, 0.46, 0.38];
  else if (d < 55) {
    const w = sst(6, 30, d);
    [r, g, b] = [0.62 + 0.18 * w, 0.57 + 0.15 * w, 0.46 + 0.12 * w];
  } else {
    /* dunes and flats: sand, coastal grass and scrub, grey mud near the lagoons */
    const veg = sst(0.42, 0.62, n) * sst(50, 80, d),
      wet = sst(-0.1, 0.25, WATER + 0.25 - y),
      dry = 0.5 + 0.5 * n2;
    r = 0.7 - veg * (0.32 - 0.06 * dry);
    g = 0.64 - veg * (0.2 - 0.05 * dry);
    b = 0.5 - veg * (0.28 - 0.02 * dry);
    r += (0.42 - r) * wet * 0.7;
    g += (0.4 - g) * wet * 0.7;
    b += (0.35 - b) * wet * 0.7;
  }
  const gr = graded(x, z);
  r += (0.6 - r) * gr * 0.6;
  g += (0.58 - g) * gr * 0.6;
  b += (0.53 - b) * gr * 0.6;
  const k = 0.88 + 0.24 * n2;
  return c.setRGB(r * k, g * k, b * k, T.SRGBColorSpace);
}

/* ---------- helpers ---------- */
const beamGeo = new Map();
/* many steel members in one draw call: list of [a, b, size] (square section) or [a, b, w, d] */
function beams(grp, list, mat, cast = true) {
  let g = beamGeo.get('b');
  if (!g) beamGeo.set('b', (g = new T.BoxGeometry(1, 1, 1)));
  const m = new T.InstancedMesh(g, mat, list.length),
    M4 = new T.Matrix4(),
    q = new T.Quaternion(),
    up = V3(0, 1, 0);
  list.forEach(([a, b, s, s2], i) => {
    const A = V3(...a),
      B = V3(...b),
      d = B.clone().sub(A),
      l = d.length();
    q.setFromUnitVectors(up, d.normalize());
    M4.compose(A.add(B).multiplyScalar(0.5), q, V3(s, l, s2 || s));
    m.setMatrixAt(i, M4);
  });
  m.castShadow = cast;
  m.receiveShadow = true;
  grp.add(m);
  return m;
}
/* decal plane lying on the ground; polygon offset keeps it from fighting the land at any distance */
function decal(grp, w, d, mat, x, z, y = 0.04, ry = 0) {
  const m = new T.Mesh(new T.PlaneGeometry(w, d), mat);
  m.rotation.set(-Math.PI / 2, 0, ry);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.userData.bg = 1;
  grp.add(m);
  return m;
}
const flat = (o) => {
  const m = std(o);
  m.polygonOffset = true;
  m.polygonOffsetFactor = -1;
  m.polygonOffsetUnits = -4;
  CAT.set(m, 'gnd');
  return m;
};
function speckle(base, n, lo, hi, a, rep, size = 256) {
  return canvasTex(
    size,
    size,
    (x, w, h) => {
      x.fillStyle = base;
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const v = (lo + Math.random() * (hi - lo)) | 0;
        x.fillStyle = `rgba(${v},${v - 3},${v - 9},${a})`;
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    },
    true,
    rep,
  );
}

/* ---------- ground and water ---------- */
function buildLand(G) {
  /* one mesh out to 4 km: about 5 m between vertices near the pad, coarser towards the horizon */
  const S = 200,
    warp = (u) => 900 * u + 3100 * Math.pow(u, 5),
    pos = [],
    col = [],
    uv = [],
    idx = [],
    c = new T.Color();
  for (let j = 0; j <= S; j++)
    for (let i = 0; i <= S; i++) {
      const x = warp((i / S) * 2 - 1),
        z = warp((j / S) * 2 - 1) - 100,
        y = height(x, z);
      pos.push(x, y, z);
      landColour(x, z, y, c);
      col.push(c.r, c.g, c.b);
      uv.push(x / 7, z / 7);
    }
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const a = j * (S + 1) + i;
      idx.push(a, a + S + 1, a + 1, a + 1, a + S + 1, a + S + 2);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  /* fine grain: sand speckle and grass tufts, tiled every 7 m */
  const det = canvasTex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = '#e4e0d8';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = (170 + Math.random() * 85) | 0;
        x.fillStyle = `rgba(${v},${v},${(v * 0.96) | 0},.5)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
      }
      for (let i = 0; i < 900; i++) {
        const v = (120 + Math.random() * 70) | 0;
        x.fillStyle = `rgba(${(v * 0.9) | 0},${v},${(v * 0.7) | 0},.35)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 4);
      }
    },
    true,
    [1, 1],
  );
  const mat = std({ color: 0xffffff, map: det, vertexColors: true, roughness: 0.96, metalness: 0 });
  CAT.set(mat, 'gnd');
  const land = new T.Mesh(g, mat);
  land.receiveShadow = true;
  land.userData.bg = 1;
  G.add(land);

  /* scrub and dune grass: low clumps where the ground is green */
  const N = 2600,
    cg = new T.IcosahedronGeometry(1, 0);
  cg.translate(0, 0.35, 0);
  const shrubs = new T.InstancedMesh(cg, std({ color: 0xffffff, roughness: 0.92 }), N),
    M4 = new T.Matrix4(),
    q = new T.Quaternion(),
    sc = V3();
  let n = 0;
  for (let t = 0; n < N && t < N * 12; t++) {
    const x = (Math.random() * 2 - 1) * 900,
      z = Math.random() * 1100 - 560,
      d = z - shore(x),
      y = height(x, z);
    if (d < 58 || y < WATER + 0.12 || graded(x, z) > 0.05) continue;
    const veg = sst(0.4, 0.6, fbm(x / 60, z / 60, 4)) + (d < 130 ? 0.35 : 0);
    if (Math.random() > veg) continue;
    const s = 0.5 + Math.random() * 1.1;
    q.setFromAxisAngle(V3(0, 1, 0), Math.random() * 6.3);
    M4.compose(V3(x, y - 0.1, z), q, sc.set(s * (1 + Math.random()), s * (0.4 + Math.random() * 0.4), s));
    shrubs.setMatrixAt(n, M4);
    c.setRGB(0.22 + Math.random() * 0.12, 0.27 + Math.random() * 0.1, 0.13 + Math.random() * 0.06, T.SRGBColorSpace);
    shrubs.setColorAt(n++, c);
  }
  shrubs.count = n;
  shrubs.receiveShadow = true;
  shrubs.userData.bg = 1;
  G.add(shrubs);
}

/* the Gulf (and the lagoons): one water plane under the land, with moving waves and surf along the beach */
function buildWater(G) {
  const waves = canvasTex(
    256,
    256,
    (x, w, h) => {
      const id = x.createImageData(w, h),
        H = new Float32Array(w * h);
      /* a sum of travelling-wave components in random directions (integer wave numbers, so it tiles) */
      const W = [];
      for (let k = 0; k < 28; k++) {
        const f = 2 + Math.floor(Math.pow(Math.random(), 1.6) * 22),
          a = Math.random() * 6.2832;
        W.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), Math.random() * 6.2832, 1 / f]);
      }
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const u = (i / w) * 6.2832,
            v = (j / h) * 6.2832;
          let s = 0;
          for (const [kx, ky, p, a] of W) s += Math.sin(u * kx + v * ky + p) * a;
          H[j * w + i] = s * 2.2;
        }
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const k = (j * w + i) * 4,
            nx = -(H[j * w + ((i + 1) % w)] - H[j * w + ((i + w - 1) % w)]) * 1.4,
            ny = -(H[((j + 1) % h) * w + i] - H[((j + h - 1) % h) * w + i]) * 1.4,
            l = Math.hypot(nx, ny, 1);
          id.data[k] = ((nx / l) * 0.5 + 0.5) * 255;
          id.data[k + 1] = ((ny / l) * 0.5 + 0.5) * 255;
          id.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
          id.data[k + 3] = 255;
        }
      x.putImageData(id, 0, 0);
    },
    false,
    [600, 600],
  );
  const wm = std({
    color: 0x1b4650,
    roughness: 0.16,
    metalness: 0,
    normalMap: waves,
    normalScale: new T.Vector2(0.22, 0.22),
  });
  /* sample the wave map at three unrelated scales so its repeat never shows across the sea */
  wm.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      T.ShaderChunk.normal_fragment_maps,
    );
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
      vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 0.137 + vec2( 0.31, 0.17 ) ).xyz * 2.0 - 1.0;
      vec3 mapN3 = texture2D( normalMap, vNormalMapUv * 0.0213 + vec2( 0.7, 0.2 ) ).xyz * 2.0 - 1.0;
      mapN = normalize( vec3( ( mapN.xy + mapN2.xy * 1.2 + mapN3.xy * 0.9 ) * 0.6, mapN.z ) );`,
    );
  };
  const water = new T.Mesh(new T.PlaneGeometry(9000, 9000), wm);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, WATER, -100);
  water.receiveShadow = true;
  water.userData.bg = 1;
  G.add(water);
  /* surf: three foam lines that roll in towards the beach and fade */
  const foamT = canvasTex(
    512,
    32,
    (x, w, h) => {
      x.clearRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {
        const a = Math.random() * 0.5,
          yy = h * (0.5 + (Math.random() - 0.5) * Math.random() * 0.9);
        x.fillStyle = `rgba(255,255,255,${a})`;
        x.fillRect(Math.random() * w, yy, 2 + Math.random() * 14, 1 + Math.random() * 2);
      }
    },
    true,
    [14, 1],
  );
  const foam = [0, 1, 2].map((k) => {
    const pts = [],
      ix = [],
      uv = [];
    for (let i = 0; i <= 200; i++) {
      const x = -2600 + i * 26,
        z = shore(x);
      pts.push(x, 0, z - 4, x, 0, z + 4);
      uv.push(i / 200, 0, i / 200, 1);
      if (i < 200) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    const m = new T.Mesh(
      g,
      std({ color: 0xffffff, alphaMap: foamT, transparent: true, depthWrite: false, roughness: 0.7, opacity: 0 }),
    );
    m.material.map = foamT;
    m.userData.bg = 1;
    m.userData.ph = k / 3;
    G.add(m);
    return m;
  });
  return (t) => {
    waves.offset.set(t * 0.004, t * 0.0065);
    foam.forEach((m) => {
      const f = (t / 9 + m.userData.ph) % 1;
      m.position.set(0, WATER + 0.03, -(1 - f) * 34);
      m.material.opacity = Math.sin(f * Math.PI) * 0.85;
    });
  };
}

/* ---------- concrete, gravel, roads ---------- */
function buildGrounds(G) {
  const gravel = flat({ map: speckle('#7d7a72', 9000, 95, 165, 0.35, [90, 90], 512), roughness: 0.95 });
  decal(G, 300, 250, gravel, 10, -10, 0.03);
  decal(G, 240, 210, gravel, -250, -110, 0.03);
  /* concrete apron: 6 m slabs, stains, and the scorch fans where the trench throws the exhaust out */
  const apronT = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#8c8880';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) {
      const v = (110 + Math.random() * 80) | 0;
      x.fillStyle = `rgba(${v},${v - 3},${v - 8},.22)`;
      x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    const s = w / 22;
    for (let i = 0; i < 22; i++)
      for (let j = 0; j < 22; j++) {
        const v = Math.random() < 0.5 ? 0 : 255;
        x.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.06})`;
        x.fillRect(i * s, j * s, s, s);
      }
    x.strokeStyle = 'rgba(40,38,34,.08)';
    x.lineWidth = 1.5;
    for (let i = 0; i <= 22; i++) {
      x.beginPath();
      x.moveTo(i * s, 0);
      x.lineTo(i * s, h);
      x.moveTo(0, i * s);
      x.lineTo(w, i * s);
      x.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const ox = Math.random() * w,
        oy = Math.random() * h,
        r = 5 + Math.random() * 30,
        gd = x.createRadialGradient(ox, oy, 0, ox, oy, r);
      gd.addColorStop(0, 'rgba(30,26,20,.3)');
      gd.addColorStop(1, 'rgba(30,26,20,0)');
      x.fillStyle = gd;
      x.fillRect(ox - r, oy - r, 2 * r, 2 * r);
    }
    /* scorch at both trench mouths (the apron spans x -90..90, the trench ends at |x| = 58) */
    for (const sx of [-1, 1]) {
      const cx = w / 2 + (sx * w * 58) / 180,
        gd = x.createRadialGradient(cx, h * 0.5, 0, cx, h * 0.5, w * 0.2);
      gd.addColorStop(0, 'rgba(25,20,15,.65)');
      gd.addColorStop(0.5, 'rgba(40,32,24,.3)');
      gd.addColorStop(1, 'rgba(40,32,24,0)');
      x.fillStyle = gd;
      x.fillRect(0, 0, w, h);
    }
  });
  decal(G, 180, 140, flat({ map: apronT, roughness: 0.88 }), 0, 0, 0.06);
  /* roads: Highway 4 inland to the build site, a spur to each pad */
  const roadT = canvasTex(
    64,
    256,
    (x, w, h) => {
      x.fillStyle = '#3d3d3d';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) {
        const v = (40 + Math.random() * 50) | 0;
        x.fillStyle = `rgba(${v},${v},${v},.5)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      x.fillStyle = 'rgba(220,200,120,.8)';
      for (let i = 0; i < 4; i++) x.fillRect(w / 2 - 1, i * 64, 2, 36);
      x.fillStyle = 'rgba(230,230,230,.6)';
      x.fillRect(3, 0, 1.5, h);
      x.fillRect(w - 4.5, 0, 1.5, h);
    },
    true,
    [1, 1],
  );
  const roadM = flat({ map: roadT, roughness: 0.85 });
  const ribbon = (pts, wd) => {
    const P = [],
      U = [],
      I = [];
    let len = 0;
    pts.forEach(([x, z], i) => {
      const [x0, z0] = pts[Math.max(0, i - 1)],
        [x1, z1] = pts[Math.min(pts.length - 1, i + 1)],
        dx = x1 - x0,
        dz = z1 - z0,
        l = Math.hypot(dx, dz),
        nx = -dz / l,
        nz = dx / l;
      if (i) len += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
      P.push(x + (nx * wd) / 2, 0.05, z + (nz * wd) / 2, x - (nx * wd) / 2, 0.05, z - (nz * wd) / 2);
      U.push(0, len / 24, 1, len / 24);
      if (i < pts.length - 1) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    g.setIndex(I);
    g.computeVertexNormals();
    const m = new T.Mesh(g, roadM);
    m.receiveShadow = true;
    m.userData.bg = 1;
    G.add(m);
  };
  const hw = [];
  for (let x = -2600; x <= 300; x += 20) hw.push([x, roadZ(x)]);
  ribbon(hw, 9);
  ribbon(
    [
      [40, roadZ(40)],
      [40, 90],
      [30, 75],
    ],
    7,
  );
  ribbon(
    [
      [-250, roadZ(-250)],
      [-250, 0],
    ],
    7,
  );
}

/* ---------- Pad 2: launch mount over the dual flame trench ---------- */
function buildMount(G) {
  const concT = canvasTex(
      512,
      256,
      (x, w, h) => {
        x.fillStyle = '#9d988f';
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 12000; i++) {
          const v = (110 + Math.random() * 70) | 0;
          x.fillStyle = `rgba(${v},${v - 2},${v - 7},.25)`;
          x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
        }
        /* formwork panels and tie holes, soot streaking down from the top */
        x.strokeStyle = 'rgba(50,46,40,.25)';
        for (let i = 0; i <= 4; i++)
          (x.strokeRect((i * w) / 4, 0, w / 4, h / 2), x.strokeRect((i * w) / 4, h / 2, w / 4, h / 2));
        x.fillStyle = 'rgba(40,36,30,.35)';
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 4; j++) x.fillRect(((i + 0.5) * w) / 8, ((j + 0.5) * h) / 4, 2.5, 2.5);
        for (let i = 0; i < 14; i++) {
          const sx = Math.random() * w,
            g = x.createLinearGradient(0, 0, 0, h * 0.8);
          g.addColorStop(0, 'rgba(30,26,22,.12)');
          g.addColorStop(1, 'rgba(30,26,22,0)');
          x.fillStyle = g;
          x.fillRect(sx, 0, 4 + Math.random() * 16, h * (0.3 + Math.random() * 0.5));
        }
      },
      true,
      [12, 1],
    ),
    wallM = std({ color: 0xffffff, map: concT, roughness: 0.9 }),
    scorchT = canvasTex(512, 128, (x, w, h) => {
      x.fillStyle = '#7c776e';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        const v = (60 + Math.random() * 70) | 0;
        x.fillStyle = `rgba(${v},${v - 4},${v - 10},.3)`;
        x.fillRect(Math.random() * w, Math.random() * h, 2, 1.5);
      }
      const gd = x.createLinearGradient(0, 0, w, 0);
      gd.addColorStop(0, 'rgba(20,16,12,0)');
      gd.addColorStop(0.35, 'rgba(20,16,12,.55)');
      gd.addColorStop(0.5, 'rgba(15,12,10,.7)');
      gd.addColorStop(0.65, 'rgba(20,16,12,.55)');
      gd.addColorStop(1, 'rgba(20,16,12,0)');
      x.fillStyle = gd;
      x.fillRect(0, 0, w, h);
    }),
    floorM = std({ map: scorchT, roughness: 0.92 });
  CAT.set(wallM, 'gnd');
  CAT.set(floorM, 'gnd');
  /* trench: two long walls, a floor, the mount's piers standing on the walls */
  const TL = 116,
    TW = 13,
    WH = 6;
  for (const s of [-1, 1]) G.add(box(TL, WH, 2.6, wallM, 0, WH / 2, s * (TW / 2 + 1.3)));
  const fl = new T.Mesh(new T.PlaneGeometry(TL, TW), floorM);
  fl.rotation.x = -Math.PI / 2;
  fl.position.y = 0.08;
  fl.receiveShadow = true;
  G.add(fl);
  /* flame bucket: a ridge of steel pipes under the booster that turns the exhaust both ways along the trench */
  const rs = new T.Shape();
  rs.moveTo(-14, 0);
  rs.quadraticCurveTo(-2.2, 0.4, 0, 6.5);
  rs.quadraticCurveTo(2.2, 0.4, 14, 0);
  rs.closePath();
  const pipesT = canvasTex(
    512,
    64,
    (x, w, h) => {
      x.fillStyle = '#6d747b';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 64; i++) {
        const g = x.createLinearGradient(i * 8, 0, i * 8 + 8, 0);
        g.addColorStop(0, 'rgba(20,22,26,.6)');
        g.addColorStop(0.45, 'rgba(255,255,255,.12)');
        g.addColorStop(1, 'rgba(20,22,26,.5)');
        x.fillStyle = g;
        x.fillRect(i * 8, 0, 8, h);
      }
    },
    true,
    [1, 3],
  );
  const rg = new T.ExtrudeGeometry(rs, { depth: TW, bevelEnabled: false, curveSegments: 24 });
  rg.translate(0, 0, -TW / 2);
  /* ExtrudeGeometry's side UVs run along the outline; rotate the stripes so the pipes run across the trench */
  const ridgeM = std({ map: pipesT, metalness: 0.75, roughness: 0.4 });
  pipesT.rotation = Math.PI / 2;
  CAT.set(ridgeM, 'gnd');
  const ridge = new T.Mesh(rg, ridgeM);
  ridge.castShadow = ridge.receiveShadow = true;
  G.add(ridge);

  /* the mount: four steel-clad piers on the trench walls, a deep deck with the booster's opening, water-cooled top plate */
  const steelT = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#7f858b';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 8; j++) {
          const v = (124 + Math.random() * 12) | 0;
          x.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
          x.fillRect(i * 64 + 1, j * 64 + 1, 62, 62);
        }
      for (let i = 0; i < 3000; i++) {
        x.fillStyle = `rgba(40,30,25,${Math.random() * 0.12})`;
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 8);
      }
    },
    true,
    [2, 2],
  );
  const mountM = std({ color: 0xffffff, map: steelT, metalness: 0.6, roughness: 0.5 }),
    darkM = std({ color: 0x45494f, metalness: 0.6, roughness: 0.55 });
  CAT.set(mountM, 'gnd');
  const PX = 10.5,
    PZ = TW / 2 + 1.3;
  for (const x of [-PX, PX])
    for (const z of [-PZ, PZ]) {
      G.add(box(4.2, DECK - 3.2 - WH, 3.4, mountM, x, WH + (DECK - 3.2 - WH) / 2, z));
      G.add(box(5.2, 1.2, 4.4, darkM, x, WH + 0.6, z));
    }
  const deck = new T.Shape(),
    D = 13.5,
    ch = 3.5;
  deck.moveTo(-D + ch, -D);
  deck.lineTo(D - ch, -D);
  deck.lineTo(D, -D + ch);
  deck.lineTo(D, D - ch);
  deck.lineTo(D - ch, D);
  deck.lineTo(-D + ch, D);
  deck.lineTo(-D, D - ch);
  deck.lineTo(-D, -D + ch);
  deck.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, BR + 0.7, 0, Math.PI * 2, true);
  deck.holes.push(hole);
  const slab = (th, mat, top, inset = 0) => {
    const g = new T.ExtrudeGeometry(deck, { depth: th, bevelEnabled: false, curveSegments: 64 });
    g.rotateX(-Math.PI / 2);
    if (inset) g.scale(inset, 1, inset);
    const m = new T.Mesh(g, mat);
    m.position.y = top - th;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const plateM = std({ color: 0xb4bac0, metalness: 0.85, roughness: 0.32 });
  CAT.set(plateM, 'gnd');
  G.add(slab(3.0, mountM, DECK - 0.35), slab(0.35, plateM, DECK, 0.97));
  /* girders under the deck, a ring beam round the opening */
  for (const s of [-1, 1]) {
    G.add(box(2 * D, 1.6, 1.4, darkM, 0, DECK - 4.1, s * (BR + 2.2)));
    G.add(box(1.4, 1.6, 2 * D, darkM, s * (BR + 2.2), DECK - 4.1, 0));
  }
  const rb = new T.Mesh(new T.TorusGeometry(BR + 1.1, 0.55, 8, 64), darkM);
  rb.rotation.x = Math.PI / 2;
  rb.position.y = DECK - 3.4;
  G.add(rb);
  /* 20 hold-down clamps round the opening, hydraulic units, handrail */
  const clampG = new T.BoxGeometry(0.6, 1.0, 0.8),
    clamps = new T.InstancedMesh(clampG, MT.steel, 20),
    M4 = new T.Matrix4(),
    q = new T.Quaternion();
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2 + 0.08;
    q.setFromAxisAngle(V3(0, 1, 0), -a);
    M4.compose(V3(Math.cos(a) * (BR + 0.55), DECK + 0.6, Math.sin(a) * (BR + 0.55)), q, V3(1, 1, 1));
    clamps.setMatrixAt(k, M4);
  }
  clamps.castShadow = true;
  G.add(clamps);
  for (const [x, z] of [
    [-9, 9],
    [9, -9],
  ])
    G.add(box(3.2, 1.8, 2.2, MT.gry, x, DECK + 0.9, z));
  const rail = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8,
      a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8,
      r = D * 1.04;
    rail.push([
      [Math.cos(a0) * r, DECK + 1.1, Math.sin(a0) * r],
      [Math.cos(a1) * r, DECK + 1.1, Math.sin(a1) * r],
      0.08,
    ]);
  }
  beams(G, rail, MT.yel, false);
  /* booster quick-disconnect on the tower side of the mount */
  G.add(box(2.4, 2.8, 1.8, darkM, -0.5, DECK + 1.4, -BR - 1.2));
  return { TL };
}

/* ---------- integration tower ("Mechazilla") with chopsticks ---------- */
function buildTower(G, [tx, tz], ry, opts = {}) {
  const T0 = new T.Group();
  T0.position.set(tx, 0, tz);
  T0.rotation.y = ry;
  G.add(T0);
  const twM = std({ color: 0x3a3d42, metalness: 0.55, roughness: 0.6 }),
    W = 6.5,
    H = TOWER_H,
    C = [
      [-W, -W],
      [W, -W],
      [W, W],
      [-W, W],
    ],
    L = [];
  C.forEach(([x, z]) => L.push([[x, 0, z], [x, H, z], 1.6]));
  for (let y = 0; y < H - 1; y += 9) {
    const y1 = Math.min(H, y + 9);
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = C[i],
        [x1, z1] = C[(i + 1) % 4];
      L.push([[x0, y1, z0], [x1, y1, z1], 0.8]);
      L.push([[x0, y, z0], [x1, y1, z1], 0.5]);
      L.push([[x1, y, z1], [x0, y1, z0], 0.5]);
    }
  }
  /* lightning mast and aviation lights on top, the elevator shaft and stairs up the back */
  L.push([[0, H, 0], [0, H + 16, 0], 0.5]);
  beams(T0, L, twM);
  T0.add(box(2 * W + 2, 1.2, 2 * W + 2, twM, 0, H + 0.6, 0));
  T0.add(box(4, H, 4, std({ color: 0x5b5f64, metalness: 0.4, roughness: 0.7 }), 0, H / 2, -W - 2.4));
  T0.add(box(2 * W + 6, 2.5, 2 * W + 6, MT.conc, 0, 1.25, 0));
  const beacons = [];
  for (const [x, z] of C) {
    const b = new T.Mesh(new T.SphereGeometry(0.45, 8, 6), new T.MeshBasicMaterial({ color: 0x000000 }));
    b.position.set(x, H + 1.6, z);
    b.userData.pt = 0;
    T0.add(b);
    beacons.push(b);
  }
  /* carriage and chopsticks: two truss arms on hinges at the tower's front corners, parked open */
  const cy = opts.carY || 86,
    armM = std({ color: 0x4d5157, metalness: 0.55, roughness: 0.5 });
  T0.add(box(2 * W + 4, 7, 2 * W + 4, armM, 0, cy, 0));
  const AL = 34;
  for (const s of [-1, 1]) {
    const piv = new T.Group();
    piv.position.set(s * (W - 0.8), cy - 1.5, W + 1.8);
    piv.rotation.y = s * (opts.open || 0.55);
    const A = [];
    for (const y of [-1.9, 1.9]) for (const x of [-0.8, 0.8]) A.push([[x, y, 0], [x, y, AL], 0.55]);
    for (let z = 0; z <= AL; z += AL / 10) {
      A.push([[-0.8, -1.9, z], [-0.8, 1.9, z], 0.3]);
      A.push([[0.8, -1.9, z], [0.8, 1.9, z], 0.3]);
      if (z < AL) A.push([[-s * 0.8, -1.9, z], [-s * 0.8, 1.9, z + AL / 10], 0.25]);
    }
    beams(piv, A, armM);
    /* catch rail on top, where the booster's hardpoints land */
    piv.add(box(1.4, 0.5, AL * 0.62, MT.steel, -s * 0.1, 2.25, AL * 0.62));
    T0.add(piv);
  }
  /* ship quick-disconnect arm, swung back along the tower */
  const qd = new T.Group();
  qd.position.set(W, opts.qdY || 104, W);
  qd.rotation.y = -1.2;
  beams(
    qd,
    [
      [[0, -1.5, 0], [0, -1.5, 22], 1.2],
      [[0, 1.5, 0], [0, 1.5, 22], 1.2],
      [[0, -1.5, 22], [0, 1.5, 22], 1],
      ...[4, 8, 12, 16, 20].map((z) => [[0, -1.5, z - 4], [0, 1.5, z], 0.35]),
    ],
    armM,
  );
  T0.add(qd);
  return { beacons };
}

/* ---------- tank farm: shrouded vertical tanks, horizontal tanks, the subcooler, a pipe rack to the mount ---------- */
function buildTanks(G) {
  const F = new T.Group();
  G.add(F);
  const shroudT = canvasTex(
    256,
    64,
    (x, w, h) => {
      x.fillStyle = '#b9bcbe';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 64; i++) {
        const g = x.createLinearGradient(i * 4, 0, i * 4 + 4, 0);
        g.addColorStop(0, 'rgba(0,0,0,.18)');
        g.addColorStop(0.5, 'rgba(255,255,255,.18)');
        g.addColorStop(1, 'rgba(0,0,0,.18)');
        x.fillStyle = g;
        x.fillRect(i * 4, 0, 4, h);
      }
    },
    true,
    [6, 4],
  );
  const shroudM = std({ color: 0xffffff, map: shroudT, metalness: 0.35, roughness: 0.55 }),
    tankM = std({ color: 0xc6cbd0, metalness: 0.85, roughness: 0.3 }),
    capM = std({ color: 0xaeb2b6, metalness: 0.7, roughness: 0.4 });
  const vtank = (x, z, r, h, shr) => {
    const c = new T.Mesh(new T.CylinderGeometry(r, r, h, 40), shr ? shroudM : tankM);
    c.position.set(x, h / 2, z);
    const d = new T.Mesh(new T.SphereGeometry(r, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    d.scale.y = 0.35;
    d.position.set(x, h, z);
    c.castShadow = c.receiveShadow = d.castShadow = true;
    F.add(c, d);
  };
  for (let i = 0; i < 4; i++) {
    vtank(52 + i * 11, -62, 4.6, i % 2 ? 22 : 27, i % 3 != 1);
    vtank(52 + i * 11, -75, 4.6, i % 2 ? 27 : 23, i % 3 == 1);
  }
  for (let i = 0; i < 3; i++) vtank(-46 + i * 7, 36, 2.6, 17, false);
  for (let i = 0; i < 4; i++) {
    const c = new T.Mesh(new T.CapsuleGeometry(2.4, 24, 6, 24), tankM);
    c.rotation.z = Math.PI / 2;
    c.position.set(66, 3.6, -88 - i * 6.2);
    c.castShadow = c.receiveShadow = true;
    F.add(c);
    for (const sx of [-8, 8]) F.add(box(1.2, 1.8, 3.6, MT.conc, 66 + sx, 0.9, -88 - i * 6.2));
  }
  /* subcooler building with roof fans */
  const fanT = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#8a8e92';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#2a2d31';
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++) {
        x.beginPath();
        x.arc(32 + i * 64, 32 + j * 64, 24, 0, 6.283);
        x.fill();
      }
  });
  const sb = box(26, 8, 12, std({ color: 0xd2d4d6, roughness: 0.7 }), 102, 4, -90);
  F.add(sb, box(26, 0.3, 12, std({ map: fanT, roughness: 0.7 }), 102, 8.15, -90));
  /* pipe rack from the farm to the mount */
  const rack = [],
    pts = [
      [50, -56],
      [24, -30],
      [8, -14],
    ];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, z0] = pts[k],
      [x1, z1] = pts[k + 1],
      n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 7);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n,
        z = z0 + ((z1 - z0) * i) / n;
      rack.push([[x, 0, z], [x, 4.4, z], 0.4]);
    }
    for (const [dy, dz, r] of [
      [4.9, -0.8, 0.45],
      [4.9, 0.1, 0.35],
      [4.9, 0.9, 0.5],
      [5.8, 0, 0.3],
    ])
      rack.push([[x0, dy, z0 + dz], [x1, dy, z1 + dz], r]);
  }
  beams(F, rack, MT.steel);
  F.traverse((o) => (o.userData.bg = o.userData.bg || 0));
}

/* ---------- Pad 1 along the coast: its tower, and the older six-legged mount ---------- */
function buildPad1(G) {
  const P = new T.Group();
  P.position.set(-250, 0, -110);
  G.add(P);
  const legM = std({ color: 0x5c6066, metalness: 0.5, roughness: 0.6 });
  const L = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    L.push([[Math.cos(a) * 10, 0, Math.sin(a) * 10], [Math.cos(a) * 8.5, 20, Math.sin(a) * 8.5], 2.4]);
  }
  beams(P, L, legM);
  const top = new T.Mesh(new T.CylinderGeometry(11, 11, 3, 6, 1), legM);
  top.position.y = 20;
  P.add(top);
  const r = new T.Mesh(new T.TorusGeometry(5.6, 0.9, 8, 40), MT.dark);
  r.rotation.x = Math.PI / 2;
  r.position.y = 21.6;
  P.add(r);
  const t = buildTower(P, [-4, -26], 0.15, { carY: 70, open: 0.95, qdY: 96 });
  P.traverse((o) => (o.userData.bg = 1));
  return t;
}

/* ---------- the build site, a few kilometres inland: big assembly bays and the factory on the horizon ---------- */
function buildFar(G) {
  const m1 = std({ color: 0xd9dbdc, roughness: 0.7 }),
    m2 = std({ color: 0xa6aaae, roughness: 0.7, metalness: 0.2 });
  [
    [-2350, 520, 70, 92, 120, m1],
    [-2270, 560, 50, 80, 70, m1],
    [-2470, 640, 60, 64, 90, m2],
    [-2150, 700, 260, 34, 110, m1],
    [-2560, 470, 40, 40, 50, m2],
  ].forEach(([x, z, w, h, d, m]) => {
    const b = box(w, h, d, m, x, h / 2, z);
    b.userData.bg = 1;
    b.castShadow = false;
    G.add(b);
  });
}

/* ---------- tall light masts round the pad ---------- */
function buildLights(G) {
  const lens = [];
  for (const [x, z, a] of [
    [-62, 48, 0.7],
    [66, 52, -0.7],
    [-70, -46, 2.4],
    [32, -60, -2.6],
  ]) {
    G.add(box(0.7, 32, 0.7, MT.gry, x, 16, z));
    const head = new T.Group();
    head.position.set(x, 32, z);
    head.rotation.y = a;
    head.add(box(4.6, 2.6, 0.5, MT.dark, 0, 0, 0));
    const l = new T.Mesh(new T.PlaneGeometry(4.2, 2.2), new T.MeshBasicMaterial({ color: 0x000000 }));
    l.position.z = 0.26;
    l.rotation.x = 0;
    head.add(l);
    head.lookAt(V3(0, 18, 0));
    G.add(head);
    lens.push(l);
  }
  /* at night two of the masts floodlight the booster (lights in a hidden group cost the other machines nothing) */
  const spots = [
    [-62, 48, 46],
    [66, 52, 24],
  ].map(([x, z, ty]) => {
    const s = new T.SpotLight(0xffeedd, 0, 0, 0.3, 0.7, 2);
    s.position.set(x, 31, z);
    s.target.position.set(0, ty, 0);
    G.add(s, s.target);
    return s;
  });
  return { lens, spots };
}

export function buildSite(G) {
  buildLand(G);
  const water = buildWater(G);
  buildGrounds(G);
  const mount = buildMount(G);
  const tw = buildTower(G, TOWER, 0);
  buildTanks(G);
  const p1 = buildPad1(G);
  buildFar(G);
  const { lens, spots } = buildLights(G);
  const beacons = [...tw.beacons, ...p1.beacons];
  return {
    lens,
    TL: mount.TL,
    upd() {
      const t = state.simT;
      water(t);
      /* red aviation lights on the towers, blinking, brighter at night */
      const on = Math.sin(t * 2.4) > 0.2 ? 1 : 0.05,
        nt = k3.curP ? k3.curP.fl : 0;
      beacons.forEach((b) => b.material.color.setRGB(on * (2 + nt * 6), 0, 0));
      spots.forEach((s) => (s.intensity = nt * 26000));
    },
  };
}
