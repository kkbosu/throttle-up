// NK-12: the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { k3 } from '../../render3d/context.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, beam, bladeRing, box, cyl, lathe, pipe, ring, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
import { lightPole } from '../../render3d/props.js';

/* ======================= NK-12 TURBOPROP on an outdoor test stand ======================= */
/* propeller blade: radial along +Y, chord along Z (in the plane of rotation), thin along X; twisted, wider in the middle, rounded tip */
export function bladeGeo(r0, r1) {
  const NS = 16,
    NK = 10,
    pos = [],
    idx = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS,
      r = r0 + (r1 - r0) * t,
      ch = (t < 0.3 ? 0.3 + 0.5 * t : 0.45 - (0.3 * (t - 0.3)) / 0.7) * (1 - 0.55 * Math.pow(t, 8)),
      th = ch * (0.2 - 0.13 * t),
      tw = 0.55 * (1 - t) - 0.1;
    for (let k = 0; k < NK; k++) {
      const a = (k / NK) * 6.283,
        cz = Math.cos(a) * ch * 0.5,
        cx = Math.sin(a) * th * 0.5 * (1 + 0.4 * Math.cos(a));
      pos.push(cx * Math.cos(tw) + cz * Math.sin(tw), r, -cx * Math.sin(tw) + cz * Math.cos(tw));
    }
  }
  for (let i = 0; i < NS; i++)
    for (let k = 0; k < NK; k++) {
      const a = i * NK + k,
        b = i * NK + ((k + 1) % NK);
      idx.push(a, a + NK, b, b, a + NK, b + NK);
    }
  const c = pos.length / 3;
  pos.push(0, r1, 0);
  for (let k = 0; k < NK; k++) idx.push(NS * NK + k, c, NS * NK + ((k + 1) % NK));
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export function buildTP() {
  const G = new T.Group(),
    E = new T.Group();
  E.position.y = 4;
  G.add(E);
  const cowM = std({ color: 0x9ba1a7, metalness: 0.85, roughness: 0.36, side: T.DoubleSide });
  CAT.set(cowM, 'case');
  const cowP = [
    [0.5, -2.55],
    [0.6, -2.35],
    [0.7, -1.9],
    [0.76, -1.2],
    [0.78, 0],
    [0.76, 1.2],
    [0.68, 2.3],
    [0.56, 3.1],
    [0.47, 3.55],
  ];
  const cow = lathe(cowP, cowM, 56),
    cowH = lathe(cowP, cowM, 48, true);
  E.add(cow, cowH);
  E.add(ring(0.5, 0.035, -2.55, MT.steel, 48));
  E.add(
    box(1.0, 0.2, 0.4, cowM, -1.5, -0.8, 0),
    lathe(
      [
        [0.45, 3.45],
        [0.43, 3.8],
        [0.41, 4.0],
      ],
      MT.hot,
      40,
    ),
  );
  /* spinner and two four-bladed propellers; the rear set is mirrored because it turns the other way */
  const bG = bladeGeo(0.5, 2.8),
    bM = std({ color: 0x2c2d30, metalness: 0.4, roughness: 0.5, side: T.DoubleSide });
  const spin = lathe(
    [
      [0, -4.42],
      [0.22, -4.3],
      [0.36, -4.07],
      [0.44, -3.78],
      [0.46, -3.56],
    ],
    MT.steel,
    40,
  );
  E.add(spin);
  function prop(x, dir) {
    const P = new T.Group();
    P.position.x = x;
    E.add(P);
    const piv = [];
    P.add(
      lathe(
        [
          [0.47, -0.22],
          [0.5, 0],
          [0.47, 0.22],
        ],
        MT.dark,
        40,
      ),
    );
    for (let i = 0; i < 4; i++) {
      const arm = new T.Group();
      arm.rotation.x = (i * Math.PI) / 2 + (dir < 0 ? Math.PI / 4 : 0);
      P.add(arm);
      const pv = new T.Group();
      arm.add(pv);
      const b = new T.Mesh(bG, bM);
      b.castShadow = true;
      if (dir < 0) b.scale.z = -1;
      pv.add(b);
      piv.push(pv);
    }
    return { P, piv };
  }
  const pF = prop(-3.42, 1),
    pR = prop(-2.86, -1);
  const disc = new T.Mesh(
    new T.RingGeometry(0.5, 2.8, 64),
    new T.MeshBasicMaterial({ color: 0x8a8c90, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }),
  );
  disc.rotation.y = Math.PI / 2;
  disc.position.x = -3.14;
  disc.userData.pt = 1;
  E.add(disc);
  /* inside (cutaway only): reduction gearbox, 14-stage compressor, cannular combustors, 5-stage turbine */
  const inn = new T.Group();
  E.add(inn);
  inn.add(
    lathe(
      [
        [0, -2.6],
        [0.44, -2.55],
        [0.48, -2.3],
        [0.42, -2.0],
        [0.26, -1.85],
      ],
      MT.dark,
      40,
      true,
    ),
    lathe(
      [
        [0.5, -1.85],
        [0.48, -0.4],
        [0.43, 0.5],
      ],
      MT.ti,
      40,
      true,
    ),
    lathe(
      [
        [0.47, 0.5],
        [0.5, 0.9],
        [0.5, 1.4],
        [0.47, 1.5],
      ],
      MT.steel,
      40,
      true,
    ),
    lathe(
      [
        [0.46, 1.5],
        [0.47, 2.3],
        [0.44, 3.4],
      ],
      MT.hot,
      40,
      true,
    ),
  );
  const rot = new T.Group();
  inn.add(rot);
  const bl2 = [];
  for (let k = 0; k < 14; k++) {
    const t = k / 13;
    bl2.push([-1.75 + t * 2.15, 0.22 + 0.08 * t, 0.47 - 0.07 * t, 24 + k, 0.07 - 0.02 * t, 0.5]);
  }
  for (let k = 0; k < 5; k++) bl2.push([1.6 + k * 0.13, 0.25, 0.43, 40, 0.06, -0.4]);
  rot.add(bladeRing(bl2, MT.ti));
  const sh = cyl(0.07, 0.07, 4.4, MT.steel, 12);
  sh.rotation.z = Math.PI / 2;
  sh.position.x = -0.3;
  rot.add(sh);
  rot.add(
    lathe(
      [
        [0.24, 2.3],
        [0.12, 3.2],
        [0, 3.45],
      ],
      MT.dark,
      32,
    ),
  );
  const pcM = std({
    color: 0x2a2420,
    metalness: 0.5,
    roughness: 0.6,
    side: T.DoubleSide,
    emissive: 0xff7a2a,
    emissiveIntensity: 0,
  });
  CAT.set(pcM, 'inner');
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + ((k + 0.5) / 5) * Math.PI,
      c = cyl(0.075, 0.06, 0.8, pcM, 14);
    c.rotation.z = Math.PI / 2;
    c.position.set(0.98, Math.cos(a) * 0.35, Math.sin(a) * 0.35);
    inn.add(c);
  }
  /* the stand: concrete block, yellow steel cradle with a load cell, fuel feed */
  const yel = std({ color: 0xd2a02a, metalness: 0.3, roughness: 0.55 }),
    S = new T.Group();
  G.add(S);
  S.add(
    box(4.2, 1.1, 2.4, MT.conc, 0, 0.55, 0),
    box(3.4, 0.22, 0.7, yel, 0.2, 3.08, 0),
    box(0.25, 0.32, 0.9, yel, -0.9, 3.3, 0),
    box(0.25, 0.32, 0.9, yel, 1.3, 3.3, 0),
    box(0.3, 0.3, 0.34, MT.dark, -1.55, 3.05, 0),
  );
  [-1.5, 1.7].forEach((x) =>
    [-1, 1].forEach((z) => {
      beam(S, [x, 1.1, z], [x * 0.75, 3.0, z * 0.28], 0.14, yel);
    }),
  );
  beam(S, [-1.5, 1.1, -1], [1.7 * 0.75, 3.0, -0.28], 0.1, yel);
  beam(S, [-1.5, 1.1, 1], [1.7 * 0.75, 3.0, 0.28], 0.1, yel);
  S.add(
    pipe(
      [
        [-0.6, 1.1, -1.15],
        [-0.5, 2.4, -1.0],
        [-0.4, 3.25, -0.6],
      ],
      0.05,
      MT.hose,
    ),
  );
  const pad = new T.Mesh(new T.PlaneGeometry(44, 40), std({ map: padTex(0.55, 0.5, 0.4, 0.22), roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(4, 0.012, 0);
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  S.add(
    box(8, 3, 5, MT.conc, -22, 1.5, -16),
    box(6, 0.45, 0.05, new T.MeshBasicMaterial({ color: 0x07090c }), -22, 2.1, -13.47),
  );
  for (let z = -9; z <= 9; z += 2.25) {
    const p = box(0.15, 4, 2.15, MT.gry, 23, 1.8, z);
    p.rotation.z = 0.45;
    S.add(p);
  }
  const lp1 = lightPole(G, -10, 9),
    lp2 = lightPole(G, 12, 10);
  const anchor = new T.Object3D();
  anchor.position.x = 4.0;
  E.add(anchor);
  return {
    G,
    E,
    anchor,
    lens: [lp1, lp2],
    labels: [
      ['FRONT PROPELLER', [-3.42, 2.2, 0], [-70, -40]],
      ['REAR PROPELLER, TURNING THE OTHER WAY', [-2.86, -2.2, 0], [-40, 40]],
      ['REDUCTION GEARBOX', [-2.3, 0.3, -0.3], [-30, -80]],
      ['14-STAGE COMPRESSOR', [-0.6, 0.45, -0.2], [30, -90]],
      ['CANNULAR COMBUSTORS', [0.98, -0.1, -0.35], [60, 60]],
      ['5-STAGE TURBINE', [1.85, 0.4, -0.2], [100, -60]],
      ['EXHAUST', [4.0, 0, -0.4], [80, 30]],
    ],
    flow: () => [
      {
        w: 0.55,
        band: 1,
        k: 0,
        sp: 1,
        ax: [
          [-2.6, 0.32, 0.5, 0],
          [-1.85, 0.24, 0.48, 0.05],
          [-0.6, 0.27, 0.45, 0.25],
          [0.45, 0.3, 0.4, 0.45],
          [0.6, 0.27, 0.42, 0.55],
          [1.45, 0.27, 0.42, 0.95],
          [1.6, 0.25, 0.44, 0.9],
          [2.15, 0.25, 0.44, 0.7],
          [3.4, 0.1, 0.42, 0.6],
          [4.0, 0, 0.4, 0.55],
          [5.2, 0, 0.55, 0.4],
        ],
      },
      {
        w: 0.45,
        band: 1,
        k: 0,
        sp: 0.8,
        ax: [
          [-6.5, 1.0, 2.9, 0],
          [-3.6, 0.95, 2.8, 0],
          [-2.0, 0.95, 2.6, 0],
          [1, 1.0, 2.45, 0],
          [5, 1.05, 2.4, 0],
          [9, 1.1, 2.5, 0],
        ],
      },
    ],
    upd(dt) {
      const ex = state.exposed;
      cow.visible = !ex;
      cowH.visible = ex;
      inn.visible = ex;
      const w = state.prp * dt * 6.283 * 2.6;
      pF.P.rotation.x += w;
      spin.rotation.x += w;
      pR.P.rotation.x -= w;
      rot.rotation.x += state.prp * dt * 9;
      const b = (state.beta * Math.PI) / 180;
      pF.piv.forEach((p) => (p.rotation.y = b));
      pR.piv.forEach((p) => (p.rotation.y = -b));
      disc.material.opacity = sm(0.6, 1, state.prp) * 0.09;
      pcM.emissiveIntensity = state.fu * (0.15 + state.N * 0.4);
    },
  };
}

export default {
  cfg: {
    box: [6, 1.3],
    sc: [0, 3, 0],
    sh: 14,
    cams: [
      [[-10, 5.8, 15], [0, 3.6, 0], 7.2],
      [[-7.2, 5.0, 5.8], [-2.6, 4.1, 0], 3.3],
      [[14, 5.4, 9], [2.2, 3.8, 0], 5],
    ],
    mt: 0,
  },
  build: buildTP,
  plume(u, fl) {
    let li, lc;
    {
      const nn = state.N * state.fu,
        ig = Math.min(1, state.ign);
      u.uCl.value = 0;
      u.uAnn.value = 0;
      u.uR0.value = 0.42;
      u.uSp.value = 0.08;
      u.uLen.value = 2 + nn * 2.5;
      u.uTurb.value = 0.4;
      u.uFire.value = 0;
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => {
        const a = [
            [0.6, 0.5, 0.45],
            [0.4, 0.3, 0.25],
            [0.2, 0.15, 0.12],
            [0.05, 0.04, 0.03],
          ][i],
          b = [
            [4, 2.4, 0.9],
            [2.4, 0.9, 0.2],
            [1, 0.25, 0.04],
            [0.2, 0.03, 0],
          ][i];
        u[k].value.set(...C(a, b, ig));
      });
      u.uI.value = nn * 0.03 + ig * 0.7;
      u.uDia.value = 0;
      u.uGreen.value = 0;
      u.uHeat.value = nn * 1.3 + ig * 0.3;
      u.uHeatLen.value = 2.5;
      li = ig * 25;
      lc = [1, 0.6, 0.3];
    }
    return [li, lc];
  },
  emit(dt, ax) {
    const nn = state.N * state.fu * sm(0.5, 1, state.prp);
    if (nn > 0.15) {
      k3.sparkAcc += dt * nn * 14 * (state.Q > 1 ? 1 : 0.6);
      while (k3.sparkAcc > 1) {
        k3.sparkAcc--;
        const z = rnd(-3.2, 3.2),
          sp = rnd(7, 18) * nn;
        SMK.add({
          x: rnd(-3.5, 0),
          y: 0.2,
          z,
          vx: sp,
          vy: rnd(0.2, 1.4),
          vz: z * rnd(0.1, 0.5),
          a: 0,
          l: rnd(1.4, 2.8),
          sd: Math.random(),
          k: 7,
          s0: 0.5,
          s1: rnd(2.5, 5),
        });
      }
    }
  },
  thermal(amb, nn, fh) {
    thSet(TH.case, amb + state.N * 25 + state.hg * 25);
    thSet(TH.hot, amb + state.N * 330 + state.hg * 60);
    thSet(TH.inner, amb + state.N * 700);
    thSet(TH.bell, amb);
  },
  flame: () => axisPt(0.6, 0, 0),
};
