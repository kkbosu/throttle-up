// APOLLO LM: the 3D side. Builder (the lander and its patch of Moon), cfg (plume box, shadow area, camera presets) and
// renderer hooks (plume, dust, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { AS } from '../../render3d/assets.js';
import { k3 } from '../../render3d/context.js';
import { roverModel } from '../sky-crane/three.js';
import { CAT, MT, V3, beam, box, canvasTex, cyl, isolated, lathe, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { HI, PROBE, lm } from './machine.js';

/* ---------- the ground: a flat mare plain round the landing spot, craters and low swells further out ---------- */
/* craters as [x, z, radius]. Big ones stand well off; small ones come close, but none touches the strip the craft
   can drift along (z near 0), so wherever it comes down the ground is level */
function craters() {
  const L = [];
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * 6.283,
      r = 3 + Math.pow(Math.random(), 2.2) * 55,
      d = 52 + r * 1.5 + Math.pow(Math.random(), 1.3) * 520;
    L.push([Math.cos(a) * d, Math.sin(a) * d, r]);
  }
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * 6.283,
      r = 1.5 + Math.pow(Math.random(), 2) * 8,
      d = 12 + Math.random() * 75,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (Math.abs(z) > 7 + r * 1.9) L.push([x, z, r]);
  }
  return L;
}
function height(x, z, L) {
  const d0 = Math.hypot(x, z);
  /* long, low swells, fading in beyond the landing area */
  let y =
    (Math.sin(x * 0.011 + 1.3) * Math.cos(z * 0.009) * 5 + Math.sin(x * 0.031 + z * 0.027) * 1.2) *
    Math.min(1, Math.max(0, (d0 - 60) / 240));
  for (const [cx, cz, r] of L) {
    const d = Math.hypot(x - cx, z - cz) / r;
    /* a bowl about a fifth as deep as it is wide, a raised rim, and a blanket of thrown-out soil that dies away */
    if (d < 2.4) y += d < 1 ? -r * 0.36 * (1 - d * d) + r * 0.06 : r * 0.06 * Math.exp(-Math.pow((d - 1) / 0.42, 2));
  }
  return y;
}
/* The Earth as it looks from the Moon: a blue and white disc about 1.9 degrees across (its 12,742 km at 384,400 km),
   lit by the same Sun. It hangs in one place in the lunar sky; this one is placed by eye. */
const EARTH = [-0.62, 0.2, -0.76];
function buildEarth() {
  const D = 7000,
    u = { uSun: { value: V3(0, 1, 0) }, uFull: { value: 0 } },
    m = new T.Mesh(
      new T.SphereGeometry(D * Math.tan((0.95 * Math.PI) / 180), 40, 24),
      new T.ShaderMaterial({
        uniforms: u,
        vertexShader:
          'varying vec3 vN;void main(){vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform vec3 uSun;uniform float uFull;varying vec3 vN;
  float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){vec3 n=normalize(vN);float land=smoothstep(.52,.6,n3(n*2.3+4.)*.65+n3(n*6.)*.35);
   float cl=smoothstep(.45,.75,n3(n*vec3(3.,7.,3.)+9.)*.6+n3(n*11.)*.4);
   vec3 c=mix(vec3(.03,.12,.38),vec3(.16,.2,.1),land);c=mix(c,vec3(.95),cl);
   float l=mix(smoothstep(-.06,.22,dot(n,normalize(uSun))),1.,uFull);gl_FragColor=vec4(c*l*1.5,1.);}`,
      }),
    );
  m.position
    .set(...EARTH)
    .normalize()
    .multiplyScalar(D);
  m.userData.bg = 1;
  m.userData.u = u;
  return m;
}
function buildSite() {
  const S = new T.Group(),
    L = craters(),
    N = 200,
    W = 1400,
    g = new T.PlaneGeometry(W, W, N, N);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position,
    c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    /* finer squares near the middle: the grid is squeezed towards it */
    const u = p.getX(i) / (W / 2),
      v = p.getZ(i) / (W / 2),
      x = Math.sign(u) * Math.pow(Math.abs(u), 1.8) * (W / 2),
      z = Math.sign(v) * Math.pow(Math.abs(v), 1.8) * (W / 2),
      y = height(x, z, L),
      k = 0.82 + Math.random() * 0.16 + Math.max(-0.12, Math.min(0.12, y * 0.02));
    p.setXYZ(i, x, y, z);
    /* the texture is laid by the metre (it tiles every 9 m), not by the squeezed grid */
    g.attributes.uv.setXY(i, x / 9, z / 9);
    c[i * 3] = k;
    c[i * 3 + 1] = k * 0.985;
    c[i * 3 + 2] = k * 0.96;
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3));
  g.computeVertexNormals();
  /* regolith: grey dust, speckled, with small pits (tiles every 7 m) */
  const tex = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#8f8c86';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const px = Math.random() * w,
          py = Math.random() * h,
          r = 30 + Math.random() * 80,
          v = Math.random() < 0.5 ? 255 : 0;
        for (const ox of [-w, 0, w])
          for (const oy of [-h, 0, h]) {
            const gd = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
            gd.addColorStop(0, `rgba(${v},${v},${v},.07)`);
            gd.addColorStop(1, `rgba(${v},${v},${v},0)`);
            x.fillStyle = gd;
            x.fillRect(px + ox - r, py + oy - r, 2 * r, 2 * r);
          }
      }
      for (let i = 0; i < 24000; i++) {
        const v = Math.random() < 0.5 ? 30 : 200;
        x.fillStyle = `rgba(${v},${v},${v},.1)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      for (let i = 0; i < 160; i++) {
        const px = Math.random() * w,
          py = Math.random() * h,
          r = 2 + Math.pow(Math.random(), 3) * 12;
        x.fillStyle = 'rgba(20,20,20,.28)';
        x.beginPath();
        x.arc(px, py, r, 0, 6.283);
        x.fill();
        x.fillStyle = 'rgba(210,208,200,.22)';
        x.beginPath();
        x.arc(px + r * 0.25, py + r * 0.25, r * 0.8, 0, 6.283);
        x.fill();
      }
    },
    true,
    [1, 1],
  );
  const gm = std({ color: 0xffffff, map: tex, vertexColors: true, roughness: 1, metalness: 0 });
  CAT.set(gm, 'gnd');
  const land = new T.Mesh(g, gm);
  land.receiveShadow = true;
  land.userData.bg = 1;
  S.add(land);
  /* the plain carries on to the horizon */
  const far = new T.Mesh(
    new T.RingGeometry(W * 0.49, 14000, 48, 1),
    std({ color: 0x7c7974, roughness: 1, metalness: 0 }),
  );
  CAT.set(far.material, 'gnd');
  far.rotation.x = -Math.PI / 2;
  far.position.y = -1.5;
  far.userData.bg = 1;
  S.add(far);
  /* low, rounded highlands a few kilometres off, all the way round */
  const HN = 120,
    hp = [],
    hi = [];
  for (let i = 0; i <= HN; i++) {
    const a = (i / HN) * 6.283,
      h = 60 + 260 * Math.pow(0.5 + 0.5 * Math.sin(a * 3 + 1.7) * Math.sin(a * 7 + 0.4), 2) + 70 * Math.sin(a * 13 + 2);
    hp.push(
      Math.cos(a) * 5200,
      -8,
      Math.sin(a) * 5200,
      Math.cos(a) * 5900,
      Math.max(20, h),
      Math.sin(a) * 5900,
      Math.cos(a) * 6600,
      -8,
      Math.sin(a) * 6600,
    );
    if (i < HN) {
      const k = i * 3;
      hi.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
    }
  }
  const hg = new T.BufferGeometry();
  hg.setAttribute('position', new T.Float32BufferAttribute(hp, 3));
  hg.setIndex(hi);
  hg.computeVertexNormals();
  const hills = new T.Mesh(hg, std({ color: 0x8a8782, roughness: 1, metalness: 0, side: T.DoubleSide }));
  CAT.set(hills.material, 'gnd');
  hills.userData.bg = 1;
  S.add(hills);
  /* rocks, small near the middle */
  const rm = std({ color: 0x6d6a66, roughness: 0.95, flatShading: true }),
    rk = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), rm, 420),
    M4 = new T.Matrix4(),
    q = new T.Quaternion(),
    eu = new T.Euler();
  CAT.set(rm, 'gnd');
  for (let i = 0; i < 420; i++) {
    const a = Math.random() * 6.283,
      d = 7 + Math.pow(Math.random(), 1.5) * 330,
      s = 0.05 + Math.pow(Math.random(), 4) * 0.9 * (d / 80 + 0.25),
      x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    q.setFromEuler(eu.set(Math.random() * 3, Math.random() * 3, Math.random() * 3));
    M4.compose(
      V3(x, height(x, z, L) + s * 0.2, z),
      q,
      V3(s * (1 + Math.random()), s * (0.5 + Math.random() * 0.5), s * (1 + Math.random())),
    );
    rk.setMatrixAt(i, M4);
  }
  rk.castShadow = rk.receiveShadow = true;
  rk.userData.bg = 1;
  S.add(rk);
  return S;
}

/* ======================= APOLLO LUNAR MODULE: descent stage on four legs, ascent stage on top ======================= */
/* Origin at the bottom of the footpads; +X is the front (the ladder and the hatch). Drawn by eye from photographs:
   the proportions are about right, the detail is not a copy. */
function buildLM() {
  const G = new T.Group(),
    LM = new T.Group();
  /* HB: the hand-built lander. It is what you see if NASA's model did not arrive, and in CUTAWAY, where its foil
     comes off to show the tanks and the engine. */
  const HB = new T.Group();
  LM.add(HB);
  const earth = buildEarth();
  G.add(buildSite(), earth, LM);
  const foil = std({ color: 0xd9ab52, metalness: 0.5, roughness: 0.48, flatShading: true, side: T.DoubleSide }),
    blk = std({ color: 0x18181a, roughness: 0.75, flatShading: true, side: T.DoubleSide }),
    skinA = std({ color: 0x9c9a94, metalness: 0.55, roughness: 0.5, flatShading: true }),
    glass = std({ color: 0x0b0d12, metalness: 0.9, roughness: 0.15 });
  [foil, blk, skinA, glass].forEach((m) => CAT.set(m, 'case'));
  /* ---- descent stage: an octagonal box, foil outside; inside, four tanks round the engine ---- */
  const skin = new T.Group();
  HB.add(skin);
  const oct = cyl(2.25, 2.25, 1.7, foil, 8);
  oct.rotation.y = Math.PI / 8;
  oct.position.y = 2.4;
  skin.add(oct);
  /* black panels on four of its eight faces */
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4,
      pn = box(0.04, 1.5, 1.55, blk, Math.cos(a) * 2.09, 2.4, Math.sin(a) * 2.09);
    pn.rotation.y = -a;
    skin.add(pn);
  }
  const deck = cyl(2.25, 2.25, 0.06, blk, 8);
  deck.rotation.y = Math.PI / 8;
  deck.position.y = 3.27;
  HB.add(deck);
  const floor = cyl(2.2, 2.2, 0.05, blk, 8);
  floor.rotation.y = Math.PI / 8;
  floor.position.y = 1.56;
  HB.add(floor);
  beam(HB, [-2, 2.4, 0], [2, 2.4, 0], 0.09, MT.alu);
  beam(HB, [0, 2.4, -2], [0, 2.4, 2], 0.09, MT.alu);
  const TK = [
    [1.08, 1.08],
    [-1.08, 1.08],
    [-1.08, -1.08],
    [1.08, -1.08],
  ];
  TK.forEach(([x, z], i) => {
    const t = new T.Mesh(new T.SphereGeometry(0.62, 20, 12), i % 2 ? MT.steel : MT.ti);
    t.scale.y = 1.2;
    t.position.set(x, 2.42, z);
    HB.add(t);
  });
  /* the engine: chamber up inside the stage, the thin nozzle skirt hanging below it */
  const ch = cyl(0.32, 0.38, 0.6, MT.dark, 20);
  ch.position.y = 2.45;
  HB.add(ch);
  const bell = new T.Group();
  bell.position.y = 2.15;
  bell.rotation.z = -Math.PI / 2;
  HB.add(bell);
  bell.add(
    lathe(
      [
        [0.13, 0],
        [0.3, 0.3],
        [0.5, 0.72],
        [0.66, 1.15],
        [0.76, 1.5],
      ],
      MT.hot,
      28,
    ),
  );
  /* ---- landing gear: four legs, a dished pad on each, a contact probe under three of them ---- */
  /* the footpads' distance from the middle (NASA's model has them a little closer in than the hand-built one) */
  const probes = [],
    PR = AS.lander ? 4.05 : 4.3;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2,
      c = Math.cos(a),
      s = Math.sin(a),
      P = (r, y, t = 0) => [c * r - s * t, y, s * r + c * t];
    beam(HB, P(2.0, 3.2), P(2.75, 3.1), 0.1, foil);
    beam(HB, P(2.0, 1.75), P(2.75, 3.1), 0.09, foil);
    beam(HB, P(2.75, 3.1), P(PR, 0.16), 0.15, foil);
    beam(HB, P(1.9, 1.7, 0.85), P(3.7, 1.3), 0.07, MT.alu);
    beam(HB, P(1.9, 1.7, -0.85), P(3.7, 1.3), 0.07, MT.alu);
    const pad = cyl(0.455, 0.36, 0.14, foil, 18);
    pad.position.set(...P(PR, 0.07));
    pad.castShadow = true;
    HB.add(pad);
    if (k) {
      const pr = cyl(0.018, 0.018, PROBE, MT.alu, 5);
      pr.position.set(...P(PR, -PROBE / 2));
      LM.add(pr);
      probes.push(pr);
    } else {
      /* the front leg carries the ladder, and the porch above it leads to the hatch */
      for (const t of [-0.22, 0.22]) beam(HB, P(2.95, 3.0, t), P(3.85, 1.25, t), 0.035, MT.alu);
      for (let j = 0; j < 8; j++) {
        const f = j / 7;
        beam(HB, P(2.95 + 0.9 * f, 3.0 - 1.75 * f, -0.22), P(2.95 + 0.9 * f, 3.0 - 1.75 * f, 0.22), 0.03, MT.alu);
      }
      HB.add(box(1.0, 0.05, 0.85, MT.alu, 2.6, 3.32, 0));
    }
  }
  /* ---- ascent stage: the round crew cabin in front, a mid section, the equipment bay behind, a tank each side ---- */
  const cabin = cyl(1.17, 1.17, 1.25, skinA, 14);
  cabin.rotation.z = Math.PI / 2;
  cabin.position.set(0.95, 4.72, 0);
  HB.add(cabin);
  HB.add(
    box(1.35, 2.3, 2.1, skinA, -0.2, 4.55, 0),
    box(0.75, 1.55, 1.9, blk, -1.2, 4.5, 0),
    box(1.1, 0.5, 1.5, blk, 0.75, 3.62, 0),
  );
  [
    [1.42, 0.78],
    [-1.62, 0.84],
  ].forEach(([z, r]) => {
    const t = new T.Mesh(new T.SphereGeometry(r, 8, 6), skinA);
    t.position.set(-0.2, 4.15, z);
    t.castShadow = true;
    HB.add(t);
  });
  /* two triangular windows leaning in, the square hatch below them */
  [-1, 1].forEach((sg) => {
    const g2 = new T.BufferGeometry();
    g2.setAttribute(
      'position',
      new T.Float32BufferAttribute([0, 0.55, -0.1 * sg, 0, 0.55, 0.62 * sg, 0, -0.1, 0.52 * sg], 3),
    );
    g2.setIndex(sg > 0 ? [0, 1, 2] : [0, 2, 1]);
    g2.computeVertexNormals();
    const w = new T.Mesh(g2, glass);
    w.position.set(1.585, 4.85, 0.22 * sg);
    HB.add(w);
  });
  HB.add(box(0.03, 0.8, 0.8, blk, 1.585, 3.95, 0));
  /* on top: the docking hatch, the rendezvous radar in front, the steerable dish on its arm */
  const tun = cyl(0.42, 0.42, 0.3, MT.alu, 18);
  tun.position.set(-0.1, 5.85, 0);
  HB.add(tun);
  const rr = new T.Group();
  rr.position.set(1.05, 5.95, 0);
  HB.add(rr);
  rr.add(
    lathe(
      [
        [0.03, 0],
        [0.24, 0.06],
        [0.33, 0.16],
      ],
      MT.white,
      18,
    ),
  );
  beam(HB, [1.05, 5.5, 0], [1.05, 5.95, 0], 0.07, MT.alu);
  const sb = new T.Group();
  sb.position.set(0.1, 6.25, -1.5);
  sb.rotation.z = 1.1;
  HB.add(sb);
  sb.add(
    lathe(
      [
        [0.03, 0],
        [0.26, 0.05],
        [0.38, 0.14],
      ],
      MT.white,
      18,
    ),
  );
  beam(HB, [-0.2, 5.6, -1.0], [0.1, 6.25, -1.5], 0.05, MT.alu);
  beam(HB, [-0.6, 5.7, 0.7], [-0.75, 6.6, 0.8], 0.02, MT.alu);
  /* four thruster clusters at the corners, four small nozzles each */
  [
    [0.85, 1.55],
    [0.85, -1.55],
    [-1.25, 1.55],
    [-1.25, -1.55],
  ].forEach(([x, z]) => {
    beam(HB, [x * 0.7, 5.0, z * 0.6], [x, 5.15, z], 0.06, MT.alu);
    HB.add(box(0.26, 0.26, 0.26, MT.dark, x, 5.15, z));
    [
      [0, 1, 0],
      [0, -1, 0],
      [Math.sign(x), 0, 0],
      [0, 0, Math.sign(z)],
    ].forEach(([dx, dy, dz]) => {
      const n = cyl(0.07, 0.035, 0.16, MT.steel, 10);
      n.position.set(x + dx * 0.2, 5.15 + dy * 0.2, z + dz * 0.2);
      if (dx) n.rotation.z = (-Math.PI / 2) * dx;
      if (dz) n.rotation.x = (Math.PI / 2) * dz;
      if (dy < 0) n.rotation.x = Math.PI;
      HB.add(n);
    });
  });
  HB.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = true;
  });
  const anchor = new T.Object3D();
  anchor.position.y = 0.7;
  anchor.rotation.z = -Math.PI / 2;
  LM.add(anchor);
  /* NASA's own model of the lunar module takes the hand-built one's place when its file arrived (render3d/assets.js) */
  const MD = AS.lander ? roverModel(AS.lander) : null;
  if (MD) LM.add(MD);
  return {
    G,
    E: LM,
    anchor,
    lens: [],
    labels: [
      ['DESCENT ENGINE', [0, 1.1, 0.5], [90, 30]],
      ['FUEL AND OXIDIZER TANKS', [1.08, 2.42, 1.08], [100, -30]],
      ['CONTACT PROBE 1.73 m', [0, -0.8, 4.3], [-110, 10]],
      ['FOOTPAD', [4.3, 0.1, 0], [70, -10]],
      ['ASCENT STAGE', [-0.2, 4.9, 1.1], [-120, -40]],
    ],
    flow: () => {
      const P = [];
      TK.forEach(([x, z]) =>
        P.push({
          w: 0.2,
          k: 2,
          sp: 0.6,
          cv: [
            [x, 2.1, z],
            [x * 0.75, 1.75, z * 0.75],
            [x * 0.3, 1.9, z * 0.3],
            [0, 2.35, 0],
          ],
          r: 0.04,
          t0: 0,
          t1: 0.3,
        }),
      );
      P.push({
        w: 0.4,
        k: 3,
        sp: 1.4,
        cv: [
          [0, 2.1, 0],
          [0, 1.2, 0],
          [0, 0.2, 0],
          [0, -1.2, 0],
        ],
        r: 0.3,
        t0: 0.8,
        t1: 0.2,
        al: () => Math.min(1, (state.N / HI) * 2),
      });
      return P;
    },
    /* what upd() moves or shows/hides: not merged (render3d/merge.js) */
    keep: [LM, HB, skin, ...(MD ? [MD] : []), ...probes],
    upd() {
      LM.position.set(lm.x, Math.max(0, state.alt), 0);
      LM.rotation.z = -lm.tilt;
      skin.visible = !state.exposed;
      HB.visible = !MD || !!state.exposed;
      if (MD) MD.visible = !state.exposed;
      probes.forEach((p) => (p.visible = !lm.td));
      /* the Earth takes the day's Sun; in EARTHLIGHT it is nearly full */
      earth.userData.u.uSun.value.set(...k3.curP.sun);
      earth.userData.u.uFull.value = state.scene == 2 ? 1 : 0;
    },
  };
}

export default {
  cfg: {
    box: [14, 3.2],
    sc: [0, 3, 0],
    sh: 18,
    moon: 1,
    land: 1,
    bloom: 0.15,
    envG: [0.13, 0.13, 0.125],
    cams: [
      [[18, 4.2, 30], [0, 3.2, 0], 8],
      [[9.5, 2.6, 11], [0, 2.7, 0], 5.2],
      [[-13, 1.7, 21], [0, 2.6, 0], 7.5],
    ],
    mt: 0,
  },
  build: () => isolated(buildLM, 0x1969),
  /* the camera follows the craft sideways (camA lifts it) */
  cam(P0, T0) {
    P0.x += lm.x;
    T0.x += lm.x;
  },
  plume(u) {
    const nn = (state.N / HI) * state.fu,
      ig = Math.min(1, state.ign),
      on = lm.td ? 0 : 1;
    u.uCl.value = on;
    u.uAnn.value = 0;
    for (let j = 0; j < 5; j++) {
      u.uO.value[j].set(0, 0);
      u.uW.value[j] = j ? 0 : 1;
    }
    u.uMR.value = 2.6;
    u.uMg.value.set(8, 30);
    u.uR0.value = 0.7;
    u.uSp.value = 0.42;
    u.uLen.value = 5 + nn * 6;
    u.uTurb.value = 0.2;
    u.uFire.value = 0;
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) =>
      u[k].value.set(
        ...[
          [0.75, 0.68, 0.9],
          [0.4, 0.36, 0.56],
          [0.14, 0.12, 0.22],
          [0.03, 0.025, 0.05],
        ][i],
      ),
    );
    u.uI.value = on * (nn * 0.085 + ig * 0.15);
    u.uDia.value = 0;
    u.uGreen.value = 0;
    u.uHeat.value = 0;
    u.uHeatLen.value = 4;
    return [on * (nn * 5 + ig * 6), [0.9, 0.82, 1]];
  },
  /* dust: thrown out flat and fast from under the engine, on ballistic paths (no air to slow it or to make it billow) */
  emit(dt) {
    const h = state.alt,
      nn = (state.N / HI) * state.fu;
    if (lm.td || h > 30 || nn < 0.05) return;
    const k2 = Math.pow(1 - h / 30, 1.6);
    k3.sparkAcc += dt * nn * 620 * k2 * (state.Q > 1 ? 1 : state.Q > 0 ? 0.6 : 0.35);
    while (k3.sparkAcc > 1) {
      k3.sparkAcc--;
      const a = Math.random() * 6.283,
        r = rnd(0.6, 2.5 + h * 0.25),
        sp = rnd(10, 26) * (0.5 + k2 * 0.5);
      SMK.add({
        x: lm.x + Math.cos(a) * r,
        y: 0.12,
        z: Math.sin(a) * r,
        vx: Math.cos(a) * sp,
        vy: rnd(0.2, 1.6),
        vz: Math.sin(a) * sp,
        a: 0,
        l: rnd(0.5, 1.2),
        sd: Math.random(),
        k: 10,
        s0: 0.35,
        s1: rnd(0.6, 1.5),
      });
    }
  },
  thermal(amb, nn) {
    thSet(TH.case, amb + 6);
    thSet(TH.hot, amb + (nn / HI) * 900);
    thSet(TH.inner, amb + 120);
    thSet(TH.bell, amb);
  },
  flame: () => axisPt(1.2, 0, 0),
};
