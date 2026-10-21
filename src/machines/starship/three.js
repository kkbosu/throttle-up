// STARSHIP (Super Heavy): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and
// renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, V3, beam, box, canvasTex, cyl, lathe, pipe, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK } from '../../render3d/particles.js';
import { lightPole } from '../../render3d/props.js';
import { ssE, ssT } from './machine.js';

/* Sizes: the booster's height and width are sourced (72.3 m, 9 m); everything else is estimated (said in INFO). */
const BL = 72.3, // booster height
  BR = 4.5, // booster radius
  DECK = 20, // top of the launch mount
  AFT = DECK + 1.6, // bottom of the booster body; the engine bells hang below it into the mount's opening
  BELL = 2.4, // bell length below the body
  RINGS = [
    [3, 0.95, 0.6], // centre 3: [count, ring radius, bell exit radius]
    [10, 2.45, 0.6], // middle ring
    [20, 3.85, 0.55], // outer ring
  ],
  TOWER = [-3, -24], // launch tower position (x, z), behind the booster from the SIDE camera
  TOWER_H = 145;

/* booster frame E sits at the aft end with local +X pointing down (exhaust), like the other vertical engines:
   world (x, y, z) = (local y, AFT - local x, local z) */
const L = (wx, wy, wz) => [AFT - wy, wx, wz];

export function buildSH() {
  const G = new T.Group();
  const E = new T.Group();
  E.position.set(0, AFT, 0);
  E.rotation.z = -Math.PI / 2;
  G.add(E);

  /* ---------- booster: stainless skin with weld lines, cut in half for the CUTAWAY ---------- */
  const weld = canvasTex(
    64,
    1024,
    (x, w, h) => {
      x.fillStyle = '#d9dde2';
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(40,45,52,.28)';
      for (let i = 0; i < 40; i++) x.fillRect(0, (i * h) / 40, w, 2);
      x.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 64; i++) x.fillRect(i, 0, 1, h);
    },
    true,
  );
  const skinM = std({ color: 0xffffff, map: weld, metalness: 0.85, roughness: 0.3, side: T.DoubleSide });
  CAT.set(skinM, 'case');
  const prof = [
    [3.6, 0.2],
    [BR, -0.4],
    [BR, -BL + 0.4],
    [BR - 0.3, -BL],
  ];
  const full = new T.Group(),
    half = new T.Group();
  E.add(full, half);
  full.add(lathe(prof, skinM, 72));
  half.add(lathe(prof, skinM, 48, true));
  /* inside (CUTAWAY): oxygen tank below, methane tank above, common dome between, downcomer down the middle */
  const loxM = std({ color: 0x9fd4ec, metalness: 0.3, roughness: 0.6, side: T.DoubleSide }),
    ch4M = std({ color: 0xa8dcae, metalness: 0.3, roughness: 0.6, side: T.DoubleSide });
  CAT.set(loxM, 'cryo');
  CAT.set(ch4M, 'cryo');
  const dome = (x, mat, up) => {
    const p = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * (Math.PI / 2);
      p.push([Math.sin(a) * (BR - 0.15), x + (up ? -1 : 1) * Math.cos(a) * 1.6]);
    }
    return lathe(p, mat, 40, true);
  };
  half.add(
    lathe(
      [
        [BR - 0.12, -2.4],
        [BR - 0.12, -36.5],
      ],
      loxM,
      40,
      true,
    ),
    lathe(
      [
        [BR - 0.12, -38.5],
        [BR - 0.12, -64],
      ],
      ch4M,
      40,
      true,
    ),
    dome(-2.4, MT.steel, false),
    dome(-37.5, MT.steel, true),
    dome(-64, MT.steel, true),
  );
  const down = pipe(
    [
      [-37, 0, 0],
      [-20, 0, 0],
      [-2.6, 0, 0],
    ],
    0.45,
    MT.steel,
    16,
  );
  half.add(down);

  /* aft bay shielding and the vented interstage at the top */
  const dkM = std({ color: 0x2a2c30, metalness: 0.6, roughness: 0.55 });
  E.add(
    lathe(
      [
        [BR + 0.05, -0.3],
        [BR + 0.05, -2.2],
      ],
      dkM,
      72,
    ),
  );
  const ventBand = lathe(
    [
      [BR + 0.03, -BL + 4.2],
      [BR + 0.03, -BL + 1.2],
    ],
    std({ color: 0x8d9298, metalness: 0.8, roughness: 0.4 }),
    72,
  );
  E.add(ventBand);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4,
      v = box(2.2, 0.4, 2.6, MT.dark);
    v.position.set(-BL + 2.7, Math.cos(a) * (BR + 0.1), Math.sin(a) * (BR + 0.1));
    v.rotation.x = a;
    E.add(v);
  }
  /* three grid fins on the methane tank, two with hardpoints */
  const finT = canvasTex(
    128,
    128,
    (x, w, h) => {
      x.fillStyle = '#4a4e55';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#16181c';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) x.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
    },
    true,
  );
  const finM = std({ map: finT, metalness: 0.7, roughness: 0.5 });
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + 0.5,
      f = box(0.5, 4.6, 3.6, finM);
    f.position.set(-BL + 9, Math.cos(a) * (BR + 2.3), Math.sin(a) * (BR + 2.3));
    f.rotation.x = a;
    E.add(f);
    if (k < 2) {
      const h = box(1.4, 0.8, 1.2, dkM);
      h.position.set(-BL + 7.4, Math.cos(a + 0.45) * (BR + 0.4), Math.sin(a + 0.45) * (BR + 0.4));
      h.rotation.x = a + 0.45;
      E.add(h);
    }
  }

  /* ---------- 33 Raptor bells in three rings, each ring with its own glow ---------- */
  const glowM = RINGS.map(() => {
    const m = MT.bell.clone();
    m.side = T.DoubleSide;
    m.emissive = new T.Color(1, 0.48, 0.18);
    m.emissiveIntensity = 0;
    CAT.set(m, 'bell');
    return m;
  });
  RINGS.forEach(([n, rr, re], gi) => {
    const bp = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      bp.push([0.3 + (re - 0.3) * (1 - Math.pow(1 - t, 1.8)), t * BELL]);
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + gi * 0.3,
        b = lathe(bp, glowM[gi], 24);
      b.position.set(0, Math.cos(a) * rr, Math.sin(a) * rr);
      E.add(b);
    }
  });
  const anchor = new T.Object3D();
  anchor.position.x = BELL;
  E.add(anchor);

  /* ---------- orbital launch mount: deck with the booster's opening, water-cooled steel top plate, clamps, legs ---------- */
  const deckShape = new T.Shape();
  deckShape.moveTo(-12, -12);
  deckShape.lineTo(12, -12);
  deckShape.lineTo(12, 12);
  deckShape.lineTo(-12, 12);
  deckShape.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, BR + 0.8, 0, Math.PI * 2, true);
  deckShape.holes.push(hole);
  const slab = (th, mat, top) => {
    const g = new T.ExtrudeGeometry(deckShape, { depth: th, bevelEnabled: false, curveSegments: 48 });
    g.rotateX(-Math.PI / 2);
    const m = new T.Mesh(g, mat);
    m.position.y = top - th;
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const mountM = std({ color: 0x6c7076, metalness: 0.55, roughness: 0.6 }),
    plateM = std({ color: 0x9aa1a8, metalness: 0.8, roughness: 0.35 });
  CAT.set(mountM, 'gnd');
  CAT.set(plateM, 'gnd');
  G.add(slab(3.2, mountM, DECK - 0.3), slab(0.3, plateM, DECK));
  for (const x of [-9.5, 0, 9.5])
    for (const z of [-10.5, 10.5]) G.add(box(2.8, DECK - 3.5, 2.8, mountM, x, (DECK - 3.5) / 2, z));
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2,
      c = box(0.7, 1.1, 0.9, MT.dark, Math.cos(a) * (BR + 0.6), DECK + 0.55, Math.sin(a) * (BR + 0.6));
    c.rotation.y = -a;
    G.add(c);
  }

  /* ---------- flame trench running both ways along x, with the steel deflector ridge under the booster ---------- */
  const concM = MT.conc;
  for (const z of [-7.5, 7.5]) G.add(box(110, 3, 2, concM, 0, 1.5, z));
  const rs = new T.Shape();
  rs.moveTo(-9, 0);
  rs.quadraticCurveTo(-1.5, 0.6, 0, 5.2);
  rs.quadraticCurveTo(1.5, 0.6, 9, 0);
  rs.closePath();
  const pipesT = canvasTex(
    256,
    64,
    (x, w, h) => {
      x.fillStyle = '#5d646c';
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(20,22,26,.55)';
      for (let i = 0; i < 32; i++) x.fillRect(i * 8, 0, 2, h);
    },
    true,
    [6, 1],
  );
  const rg = new T.ExtrudeGeometry(rs, { depth: 13, bevelEnabled: false, curveSegments: 20 });
  rg.translate(0, 0, -6.5);
  const ridgeM = std({ map: pipesT, metalness: 0.7, roughness: 0.45 });
  CAT.set(ridgeM, 'gnd');
  const ridge = new T.Mesh(rg, ridgeM);
  ridge.castShadow = ridge.receiveShadow = true;
  G.add(ridge);

  /* ---------- launch tower: steel truss, chopstick arms parked high and open, quick-disconnect arm ---------- */
  const twM = std({ color: 0x3c3f45, metalness: 0.6, roughness: 0.62 });
  const [tx, tz] = TOWER,
    W = 6;
  const C = [
    [tx - W, tz - W],
    [tx + W, tz - W],
    [tx + W, tz + W],
    [tx - W, tz + W],
  ];
  C.forEach(([x, z]) => beam(G, [x, 0, z], [x, TOWER_H, z], 1.1, twM));
  for (let y = 9; y <= TOWER_H; y += 9) {
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = C[i],
        [x1, z1] = C[(i + 1) % 4];
      beam(G, [x0, y, z0], [x1, y, z1], 0.55, twM);
      beam(G, [x0, y - 9, z0], [x1, y, z1], 0.4, twM);
    }
  }
  const carY = 86;
  G.add(box(W * 2 + 3, 5, W * 2 + 3, twM, tx, carY, tz));
  const armM = std({ color: 0x55595f, metalness: 0.6, roughness: 0.5 });
  for (const s of [-1, 1]) {
    /* each arm hangs from a hinge on the tower's front corner and is parked swung open */
    const piv = new T.Group();
    piv.position.set(tx + s * (W - 1.2), carY - 1, tz + W + 1);
    piv.rotation.y = s * 0.55;
    piv.add(box(2.2, 2.6, 26, armM, 0, 0, 13));
    G.add(piv);
  }
  beam(G, [tx, DECK + 4, tz + W], [0, DECK + 3, -BR - 0.3], 1.2, twM);

  /* ---------- pad apron and lights ---------- */
  const pad = new T.Mesh(new T.PlaneGeometry(160, 120), std({ map: padTex(0.45, 0.5, 0.45, 0.3), roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.012, 0);
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  const lp1 = lightPole(G, -30, 30),
    lp2 = lightPole(G, 34, 26);

  return {
    G,
    E,
    anchor,
    lens: [lp1, lp2],
    labels: [
      ['VENTED INTERSTAGE', L(0, AFT + BL - 2.5, BR), [-140, -6]],
      ['GRID FIN', L(0, AFT + BL - 9, BR + 3), [130, -10]],
      ['METHANE TANK', L(0, AFT + 52, 0), [-130, 0]],
      ['COMMON DOME', L(0, AFT + 37.5, 0), [130, 0]],
      ['LIQUID OXYGEN TANK', L(0, AFT + 22, 0), [-140, 0]],
      ['METHANE DOWNCOMER', L(0, AFT + 12, 0), [130, 10]],
      ['33 RAPTOR 3 ENGINES', [BELL, 0, 0], [-140, 26]],
      ['LAUNCH MOUNT', L(10, DECK - 2, 12), [120, 20]],
      ['FLAME DEFLECTOR', L(4, 2.5, 6), [130, 30]],
    ],
    flow: () => [
      {
        w: 0.4,
        band: 1,
        k: 0,
        sp: 1,
        ax: [
          [0.2, 0, 0.35, 1],
          [BELL, 0, 0.6, 0.95],
          [7, 0, 2.6, 0.9],
          [14, 0, 5, 0.85],
        ],
      },
      {
        w: 0.3,
        k: 2,
        sp: 1,
        cv: [
          [-30, 2.6, 1.4],
          [-16, 2.8, 1.2],
          [-5, 2.4, 0.8],
          [-0.8, 1.4, 0.5],
          [0.3, 1.0, 0.4],
        ],
        r: 0.9,
        t0: 0.2,
        t1: 0.5,
      },
      {
        w: 0.3,
        k: 8,
        sp: 1,
        cv: [
          [-52, 1.6, 1.0],
          [-40, 0.6, 0.3],
          [-37, 0, 0],
          [-20, 0, 0],
          [-2.6, 0, 0],
          [-0.4, 0.5, 0.2],
          [0.3, 0.6, 0.3],
        ],
        r: 0.3,
        t0: 0,
        t1: 0,
      },
    ],
    upd() {
      const ex = state.exposed;
      full.visible = !ex;
      half.visible = ex;
      glowM.forEach((m, k) => (m.emissiveIntensity = ssE[k] * (0.5 + 0.9 * ssT)));
    },
  };
}

export default {
  cfg: {
    /* DRONE: high above the mount, taking in booster, tower and the steam out of both ends of the trench */
    drone: { t: [0, 22, 0], d: 300, el: 0.95, hw: 80 },
    box: [24, 10],
    sc: [0, 40, 0],
    sh: 70,
    cams: [
      [[70, 36, 165], [0, 42, -4], 62],
      [[16, 25, 22], [0, 22.5, 0], 9],
      [[62, 8, 8], [0, 15, 0], 22],
    ],
    mt: 1,
    flat: 1,
  },
  build: buildSH,
  plume(u, fl) {
    let li, lc;
    {
      const fl2 = 0.94 + 0.06 * Math.sin(state.simT * 49) * Math.sin(state.simT * 33 + 1),
        ig = Math.min(1, state.ign),
        ring = (10 * ssE[1] + 20 * ssE[2]) / 30;
      /* merged column: the centre group in the middle, the two outer rings as four lobes around it */
      u.uCl.value = 1;
      u.uAnn.value = 0;
      [
        [0, 0, ssE[0]],
        [2.3, 2.3, ring],
        [-2.3, -2.3, ring],
        [2.3, -2.3, ring],
        [-2.3, 2.3, ring],
      ].forEach((o, j) => {
        u.uO.value[j].set(o[0], o[1]);
        u.uW.value[j] = o[2];
      });
      u.uMR.value = 5.4;
      u.uMg.value.set(4, 14);
      u.uR0.value = 2.1;
      u.uSp.value = 0.05;
      u.uLen.value = 12 + state.N * 10;
      u.uTurb.value = 0.4 + ig * 0.4;
      u.uFire.value = 0;
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) =>
        u[k].value.set(
          ...[
            [5, 4, 2.6],
            [3.2, 2.0, 1.0],
            [1.3, 0.6, 0.3],
            [0.3, 0.1, 0.07],
          ][i],
        ),
      );
      u.uI.value = (state.N > 0.01 ? 1.2 : 0) * fl2 + ig * 0.8;
      u.uDia.value = 0.3 * Math.min(1, state.N * 2);
      u.uDiaSp.value = 2.0;
      u.uDiaN.value = 3;
      u.uDiaOff.value = 0.25;
      u.uDisk.value = 0;
      u.uDiaR.value = 0.6;
      u.uDC.value.set(4.4, 3.8, 3.2);
      u.uGreen.value = 0;
      u.uHeat.value = state.N * 1.8 + ig * 0.5;
      u.uHeatLen.value = 8;
      li = state.N * 750 + ig * 250;
      lc = [1, 0.7, 0.42];
    }
    return [li, lc];
  },
  emit(dt) {
    /* steam (and some sand) blowing out of both ends of the flame trench */
    const qm = state.Q > 1 ? 1 : state.Q > 0 ? 0.6 : 0.35;
    k3.steamAcc += dt * (state.N * 80 + state.ign * 30) * qm;
    while (k3.steamAcc > 1) {
      k3.steamAcc--;
      const s = Math.random() < 0.5 ? -1 : 1,
        sp = rnd(8, 24) * (0.5 + state.N * 0.7),
        dust = Math.random() < 0.25;
      SMK.add({
        x: s * rnd(6, 16),
        y: rnd(1, 4),
        z: rnd(-5, 5),
        vx: s * sp,
        vy: rnd(2, 7),
        vz: rnd(-3, 3),
        a: 0,
        l: rnd(7, 10),
        sd: Math.random(),
        k: dust ? 7 : 2,
        s0: 5,
        s1: rnd(30, 48),
      });
    }
  },
  thermal(amb) {
    thSet(TH.case, amb + state.N * 30);
    thSet(TH.bell, amb + state.N * 520, -state.N * 240, -BELL, 0);
    thSet(TH.hot, amb + state.N * 480);
    thSet(TH.inner, amb + state.N * 900);
  },
  flame: () => V3(0, DECK - 4, 0),
  flowSize: 0.06,
};
