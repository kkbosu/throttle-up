// SHUTTLE (RS-25): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, V3, beam, box, cyl, halfRing, lathe, pipe, ring, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, SPK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
import { lightPole } from '../../render3d/props.js';
import { gimb } from '../shared/gimbal.js';

/* ======================= RS-25: fired vertically into a flame deflector on a test stand ======================= */
export function buildSS() {
  const G = new T.Group(),
    gim = new T.Group();
  gim.position.set(0, 9.6, 0);
  gim.rotation.z = -Math.PI / 2;
  G.add(gim);
  const E = new T.Group();
  gim.add(E);
  const h = (t) => 0.135 + (1.15 - 0.135) * (1 - Math.pow(1 - t, 2.1)),
    X0 = 1.42,
    X1 = 4.3;
  const prof = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    prof.push([h(t), X0 + t * (X1 - X0)]);
  }
  const bell = lathe(prof, MT.bell, 96);
  E.add(bell);
  const bellHM = MT.bell.clone();
  bellHM.side = T.DoubleSide;
  bellHM.emissive = new T.Color(0x6a70ff);
  bellHM.emissiveIntensity = 0;
  CAT.set(bellHM, 'bell');
  const bellH = lathe(prof, bellHM, 96, true);
  E.add(bellH);
  const bellIn = lathe(
    prof.map((p) => [p[0] - 0.012, p[1]]),
    std({
      color: 0x5a4a3c,
      metalness: 0.6,
      roughness: 0.55,
      side: T.BackSide,
      emissive: 0x6080ff,
      emissiveIntensity: 0,
    }),
    96,
  );
  E.add(bellIn);
  CAT.set(bellIn.material, 'bell');
  const rgF = new T.Group(),
    rgH = new T.Group();
  E.add(rgF, rgH);
  [
    [0.22, 0.02, 0.028],
    [0.45, 0.02, 0.028],
    [0.7, 0.02, 0.028],
    [1, 0.015, 0.05],
    [0.64, 0.06, 0.07],
  ].forEach(([t, o, tb]) => {
    const x = t == 1 ? X1 - 0.03 : X0 + t * (X1 - X0);
    rgF.add(ring(h(t) + o, tb, x, MT.steel, 96));
    rgH.add(halfRing(h(t) + o, tb, x, MT.steel, 56));
  });
  /* steerhorn: coolant feed from the main fuel valve down the outside of the bell to its manifold */
  E.add(
    pipe(
      [
        [0.95, 0.42, 0.35],
        [1.25, 0.55, 0.42],
        [1.8, 0.68, 0.48],
        [2.5, 0.8, 0.5],
        [3.1, 0.9, 0.52],
        [3.25, 0.98, 0.46],
      ],
      0.075,
      MT.steel,
      60,
    ),
  );
  /* main combustion chamber, injector, gimbal bearing */
  const mccP = [
      [0.13, X0],
      [0.18, 1.32],
      [0.255, 1.15],
      [0.26, 0.78],
      [0.36, 0.62],
      [0.36, 0.45],
      [0.16, 0.3],
    ],
    mccHM = MT.copper.clone();
  mccHM.side = T.DoubleSide;
  const mcc = lathe(mccP, MT.copper, 56),
    mccH = lathe(mccP, mccHM, 56, true);
  E.add(mcc, mccH);
  E.add(
    lathe(
      [
        [0.11, 0],
        [0.13, 0.05],
        [0.13, 0.22],
        [0.2, 0.3],
      ],
      MT.steel,
      32,
    ),
  );
  const thr = new T.Mesh(new T.CircleGeometry(0.14, 32), new T.MeshBasicMaterial({ color: 0x000000 }));
  thr.rotation.y = Math.PI / 2;
  thr.position.x = X0 - 0.02;
  E.add(thr);
  /* powerhead: hot-gas manifold across the top, high-pressure fuel and oxidiser turbopumps hanging either side */
  const hgm = cyl(0.33, 0.33, 1.55, MT.steel, 32);
  hgm.rotation.x = Math.PI / 2;
  hgm.position.set(0.55, 0, 0);
  E.add(hgm);
  [-1, 1].forEach((s) => {
    const d = new T.Mesh(new T.SphereGeometry(0.33, 24, 12), MT.steel);
    d.position.set(0.55, 0, s * 0.775);
    d.scale.set(1, 1, 0.4);
    E.add(d);
  });
  const pumps = [
    [0.66, 0.21, 1.1, MT.ti],
    [-0.64, 0.23, 1.0, MT.ti],
  ];
  pumps.forEach(([z, r, l, m]) => {
    const p = lathe(
      [
        [r * 0.7, 0.35],
        [r, 0.45],
        [r, 0.45 + l * 0.7],
        [r * 1.15, 0.45 + l * 0.78],
        [r * 1.15, 0.45 + l],
        [r * 0.6, 0.5 + l],
      ],
      m,
      32,
    );
    p.position.z = z;
    E.add(p);
    E.add(ring(r + 0.015, 0.02, 0.45 + l * 0.3, MT.steel, 32).translateZ(z));
  });
  E.add(
    pipe(
      [
        [1.35, 0, 0.66],
        [1.4, 0.2, 0.5],
        [1.3, 0.35, 0.3],
        [1.05, 0.38, 0.2],
      ],
      0.06,
      MT.steel,
    ),
  );
  E.add(
    pipe(
      [
        [1.3, 0, -0.64],
        [1.38, -0.2, -0.48],
        [1.25, -0.3, -0.25],
        [1.0, -0.3, -0.15],
      ],
      0.055,
      MT.steel,
    ),
  );
  const ins = std({ color: 0xd8cfae, metalness: 0.7, roughness: 0.35 });
  CAT.set(ins, 'cryo');
  E.add(
    pipe(
      [
        [0.3, 0.3, 0.66],
        [0.1, 0.45, 0.75],
        [-0.6, 0.6, 0.9],
        [-1.6, 0.7, 1.0],
      ],
      0.12,
      ins,
    ),
  );
  E.add(
    pipe(
      [
        [0.3, -0.3, -0.64],
        [0.1, -0.45, -0.75],
        [-0.6, -0.6, -0.9],
        [-1.6, -0.7, -1.0],
      ],
      0.11,
      ins,
    ),
  );
  /* test stand: concrete flame trench walls, curved steel deflector, steel tower with decks */
  const S = new T.Group();
  G.add(S);
  const dk = std({ color: 0x2c2b29, metalness: 0.5, roughness: 0.7 });
  const sh = new T.Shape();
  sh.moveTo(-3, 0);
  sh.lineTo(-3, 4.0);
  sh.quadraticCurveTo(-1.1, 1.0, 2.8, 0.75);
  sh.lineTo(12, 0.5);
  sh.lineTo(12, 0);
  sh.closePath();
  const dg = new T.ExtrudeGeometry(sh, { depth: 6.6, bevelEnabled: false, curveSegments: 24 });
  dg.translate(0, 0, -3.3);
  const defl = new T.Mesh(dg, dk);
  defl.receiveShadow = defl.castShadow = true;
  S.add(defl);
  S.add(
    box(1.4, 5.2, 8, MT.conc, -3.7, 2.6, 0),
    box(16, 5.2, 1.2, MT.conc, 4.5, 2.6, -3.9),
    box(14, 1.2, 1.2, MT.conc, 5, 0.6, 3.9),
  );
  const stl = std({ color: 0x5f6a72, metalness: 0.6, roughness: 0.5 });
  [
    [-3.6, -3.2],
    [3.6, -3.2],
  ].forEach(([x, z]) => beam(S, [x, 0, z], [x, 14.5, z], 0.42, stl));
  beam(S, [-3.6, 0, -1], [-3.6, 10.6, -1], 0.3, stl);
  beam(S, [3.6, 0, -1], [3.6, 10.6, -1], 0.3, stl);
  [10.9, 14.4].forEach((y) => {
    S.add(box(7.6, 0.25, 6.6, dk, 0, y, -0.1));
    [
      [-3.6, -3.2, 3.6, -3.2],
      [-3.6, 3, 3.6, 3],
      [-3.6, -3.2, -3.6, 3],
      [3.6, -3.2, 3.6, 3],
    ].forEach(([a, b, c, d]) => {
      beam(S, [a, y + 0.55, b], [c, y + 0.55, d], 0.05, MT.yel);
      beam(S, [a, y - 0.35, b], [c, y - 0.35, d], 0.35, stl);
    });
  });
  for (let i = 0; i < 5; i++) {
    beam(S, [-3.6, 1.2 + i * 1.9, -3.2], [-3.6, 3.1 + i * 1.9, -1], 0.12, stl);
    beam(S, [3.6, 1.2 + i * 1.9, -1], [3.6, 3.1 + i * 1.9, -3.2], 0.12, stl);
  }
  S.add(box(2.4, 0.4, 2.4, stl, 0, 10.45, 0));
  beam(S, [0, 10.3, 0], [0, 9.75, 0], 0.25, MT.steel);
  S.add(box(7.4, 0.12, 2.0, dk, 0, 7.4, -2.3));
  [[-3.6, -1.3, 3.6, -1.3]].forEach(([a, b, c, d]) => beam(S, [a, 7.95, b], [c, 7.95, d], 0.05, MT.yel));
  [-1, 1].forEach((s) => {
    beam(S, [s * 1.4, 10.2, -0.5], [s * 0.45, 9.05, -0.2], 0.1, MT.steel);
    beam(S, [s * 1.4, 10.2, -0.5], [s * 0.95, 9.6, -0.35], 0.16, MT.dark);
  });
  /* site: liquid hydrogen dewar sphere, water tower, run tank */
  const sp = new T.Mesh(new T.SphereGeometry(7, 32, 16), MT.white);
  sp.position.set(-32, 9, -38);
  sp.castShadow = true;
  S.add(sp);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    beam(
      S,
      [-32 + Math.cos(a) * 5, 0, -38 + Math.sin(a) * 5],
      [-32 + Math.cos(a) * 6, 8, -38 + Math.sin(a) * 6],
      0.4,
      MT.gry,
    );
  }
  const wt = cyl(4, 4, 6, MT.white, 24);
  wt.position.set(30, 24, -55);
  S.add(wt);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    beam(
      S,
      [30 + Math.cos(a) * 5, 0, -55 + Math.sin(a) * 5],
      [30 + Math.cos(a) * 3.5, 21, -55 + Math.sin(a) * 3.5],
      0.35,
      MT.gry,
    );
  }
  const rt = cyl(2.4, 2.4, 10, MT.white, 24);
  rt.position.set(-9, 13, -10);
  S.add(rt);
  beam(S, [-9, 0, -10], [-9, 8, -10], 1.2, MT.gry);
  const pad = new T.Mesh(new T.PlaneGeometry(40, 30), std({ map: padTex(0.45, 0.5, 0.4, 0.3), roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(6, 0.012, 0);
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  const lp1 = lightPole(G, -12, 9),
    lp2 = lightPole(G, 13, 8);
  const anchor = new T.Object3D();
  anchor.position.set(X1, 0, 0);
  E.add(anchor);
  const hpt = (t) => h(t) - 0.004;
  return {
    G,
    E,
    gim,
    anchor,
    bellIn,
    thr,
    lens: [lp1, lp2],
    labels: [
      ['GIMBAL BEARING', [0.08, 0, 0], [-120, 0]],
      ['HOT-GAS MANIFOLD', [0.55, 0.3, -0.3], [120, -16]],
      ['FUEL TURBOPUMP', [0.95, -0.2, 0.66], [-130, 10]],
      ['OXIDIZER TURBOPUMP', [0.9, 0.2, -0.64], [130, 8]],
      ['COMBUSTION CHAMBER', [1.0, 0, 0], [-140, -4]],
      ['THROAT', [1.42, 0, 0], [120, 0]],
      ['STEERHORN', [2.5, 0.82, 0.5], [110, -10]],
      ['COOLED NOZZLE WALL', [3.4, -0.9, -0.3], [-130, 0]],
    ],
    flow: () => [
      {
        w: 0.5,
        band: 1,
        k: 3,
        sp: 1,
        ax: [
          [0.32, 0, 0.2, 1],
          [0.75, 0, 0.24, 1],
          [1.25, 0, 0.16, 1],
          [1.42, 0, 0.11, 1],
          [2.0, 0, 0.5, 0.95],
          [3.0, 0, 0.82, 0.9],
          [4.3, 0, 1.06, 0.85],
          [5.2, 0, 1.12, 0.8],
        ],
      },
      {
        w: 0.14,
        k: 1,
        sp: 1,
        cv: [
          [0.95, 0.42, 0.35],
          [1.25, 0.55, 0.42],
          [1.8, 0.68, 0.48],
          [2.5, 0.8, 0.5],
          [3.1, 0.9, 0.52],
          [3.25, 0.98, 0.46],
        ],
        r: 0.045,
        t0: 0,
        t1: 0.25,
      },
      {
        w: 0.14,
        band: 1,
        k: 1,
        sp: 0.6,
        ax: [
          [X0 + 0.64 * (X1 - X0), hpt(0.64), hpt(0.64), 0.25],
          [X0 + 0.4 * (X1 - X0), hpt(0.4), hpt(0.4), 0.5],
          [X0 + 0.15 * (X1 - X0), hpt(0.15), hpt(0.15), 0.8],
          [X0, 0.13, 0.13, 1],
        ],
      },
      {
        w: 0.1,
        k: 2,
        sp: 1,
        cv: [
          [1.3, 0, -0.64],
          [1.05, -0.22, -0.45],
          [0.65, -0.2, -0.18],
          [0.35, 0, 0],
        ],
        r: 0.035,
        t0: 0.2,
        t1: 0.5,
      },
      {
        w: 0.12,
        k: 1,
        sp: 1,
        cv: [
          [-1.6, 0.7, 1.0],
          [-0.6, 0.6, 0.9],
          [0.1, 0.45, 0.75],
          [0.45, 0.2, 0.66],
          [0.9, 0, 0.66],
        ],
        r: 0.06,
        t0: 0,
        t1: 0.1,
      },
    ],
    upd(dt) {
      const gm = gimb();
      gim.rotation.z = -Math.PI / 2 + gm * 0.55;
      gim.rotation.x = 0.25 * gm * Math.sin(state.simT * 0.6);
      const ex = state.exposed;
      bell.visible = bellIn.visible = rgF.visible = mcc.visible = thr.visible = !ex;
      bellH.visible = rgH.visible = mccH.visible = ex;
      bellHM.emissiveIntensity = state.N * state.fu * 0.12;
      bellIn.material.emissiveIntensity = state.N * state.fu * 0.25;
      thr.material.color
        .setRGB(2 + state.N * state.fu * 14, 2.4 + state.N * state.fu * 16, 4 + state.N * state.fu * 24)
        .multiplyScalar(state.fu * state.N + state.ign * 0.4);
    },
  };
}

export default {
  cfg: {
    /* DRONE: aim where the plume leaves the trench (+x), high and further out so stand, bell and steam all show */
    drone: { t: [4, 2, 0], d: 70, el: 0.72, hw: 16 },
    box: [7, 3.2],
    sc: [1, 6, 0],
    sh: 17,
    cams: [
      [[2.2, 6.2, 23.5], [-0.6, 5.6, 0], 8.6],
      [[2.9, 5.0, 6.4], [0, 6.4, 0], 2.7],
      [[3.8, 1.4, 4.8], [0, 6.0, 0], 2.6],
    ],
    mt: 0,
  },
  build: buildSS,
  plume(u, fl) {
    let li, lc;
    {
      const nn = state.N * state.fu,
        ig = Math.min(1, state.ign);
      u.uCl.value = 0;
      u.uAnn.value = 0;
      u.uR0.value = 1.08;
      u.uSp.value = 0.035;
      u.uLen.value = 4.5 + nn * 2;
      u.uTurb.value = 0.3 + ig * 0.6;
      u.uFire.value = ig * 0.3;
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => {
        const a = [
            [1.0, 1.15, 2.3],
            [0.55, 0.45, 1.25],
            [0.3, 0.17, 0.55],
            [0.12, 0.05, 0.12],
          ][i],
          b = [
            [6, 3.4, 1],
            [4, 1.4, 0.25],
            [1.6, 0.3, 0.04],
            [0.3, 0.03, 0],
          ][i];
        u[k].value.set(...C(a, b, ig * 0.85));
      });
      u.uI.value = (nn * 0.6 + ig * 0.9) * fl;
      u.uDia.value = nn * 2.4 * fl;
      u.uDiaSp.value = 1.3;
      u.uDiaN.value = 1.3;
      u.uDiaOff.value = 0.25;
      u.uDisk.value = 0.85;
      u.uDiaR.value = 0.6;
      u.uDC.value.set(5, 4.4, 4.6);
      u.uGreen.value = 0;
      u.uHeat.value = nn * 1.6 + ig * 0.6;
      u.uHeatLen.value = 3.5;
      li = nn * 95 + ig * 80;
      lc = ig > 0.2 ? [1, 0.55, 0.25] : [0.72, 0.78, 1];
    }
    return [li, lc];
  },
  emit(dt, ax) {
    const nn = state.N * state.fu;
    /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
    const qmax = state.Q > 1 ? 1 : state.Q > 0 ? 0.6 : 0.35;
    k3.steamAcc += dt * (nn * 34 + state.ign * 24) * qmax;
    while (k3.steamAcc > 1) {
      k3.steamAcc--;
      const s = rnd(6, 15) * (0.5 + nn * 0.7);
      SMK.add({
        x: rnd(0.5, 3.5),
        y: rnd(0.9, 2.4),
        z: rnd(-2.4, 2.4),
        vx: s,
        vy: rnd(1.5, 5),
        vz: rnd(-2.5, 2.5),
        a: 0,
        l: rnd(5, 8),
        sd: Math.random(),
        k: 2,
        s0: 2.2,
        s1: rnd(12, 20),
      });
    }
    /* steam drifting off the plume column near the bell */
    if (nn > 0.1 && Math.random() < dt * 8 * qmax) {
      const p = axisPt(rnd(0.3, 2.5), rnd(1.2, 1.8), rnd(0, 6.3));
      SMK.add({
        x: p.x,
        y: p.y,
        z: p.z,
        vx: rnd(-1, 2),
        vy: rnd(-0.5, 1.5),
        vz: rnd(-1, 1),
        a: 0,
        l: rnd(2, 4),
        sd: Math.random(),
        k: 3,
        s0: 0.6,
        s1: 2.6,
      });
    }
    /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
    if (state.ph == 1 && state.st > 0.5) {
      k3.sparkAcc += dt * 90;
      while (k3.sparkAcc > 1) {
        k3.sparkAcc--;
        const a = (Math.floor(Math.random() * 4) / 4) * 6.283 + 0.4,
          p = axisPt(rnd(0.4, 0.8), 1.6, a),
          s = rnd(4, 10);
        SPK.add({
          x: p.x,
          y: p.y,
          z: p.z,
          vx: -Math.cos(a) * s * 0 + rnd(-3, 3),
          vy: rnd(-2, 4),
          vz: -Math.sin(a) * s * 0.5,
          a: 0,
          l: rnd(0.4, 0.9),
          sd: Math.random(),
          k: 1,
        });
      }
    }
  },
  thermal(amb, nn, fh) {
    thSet(TH.case, amb + nn * 25);
    thSet(TH.bell, amb + nn * 520, -nn * 270, -2.9, 0);
    thSet(TH.inner, amb + nn * 900);
    thSet(TH.hot, amb + nn * 480);
  },
  flame: () => V3(0.6, 2.4, 0),
};
