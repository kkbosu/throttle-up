// STARSHIP (Super Heavy): the 3D side. Builder (booster, jets and the Starbase site), cfg (plume box, shadow area,
// camera presets, own ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { V3, isolated, rnd } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { FIR, SMK } from '../../render3d/particles.js';
import { BELL, BL, BR, ENGINES, RINGS, buildBooster } from './booster.js';
import { buildJets } from './jets.js';
import { ssE, ssT } from './machine.js';
import { DECK, buildSite } from './site.js';

/* Sizes: the booster's height and width are sourced (72.3 m, 9 m); everything else is estimated (said in INFO). */
const AFT = DECK + 1.6; // bottom of the booster body; the engine bells hang below it into the mount's opening

/* booster frame E sits at the aft end with local +X pointing down (exhaust), like the other vertical engines:
   world (x, y, z) = (local y, AFT - local x, local z) */
const L = (wx, wy, wz) => [AFT - wy, wx, wz];

let jets, booster;

export function buildSH() {
  const G = new T.Group();
  const E = new T.Group();
  E.position.set(0, AFT, 0);
  E.rotation.z = -Math.PI / 2;
  G.add(E);
  booster = buildBooster(E);
  jets = buildJets(
    E,
    ENGINES,
    BELL,
    RINGS.map((r) => r[2]),
  );
  const anchor = new T.Object3D();
  anchor.position.x = BELL;
  E.add(anchor);
  const site = buildSite(G);

  return {
    G,
    E,
    anchor,
    lens: site.lens,
    labels: [
      ['VENTED INTERSTAGE', L(0, AFT + BL - 2.5, BR), [-140, -6]],
      ['GRID FIN', L(0, AFT - booster.finA, BR + 3), [130, -10]],
      ['METHANE TANK', L(0, AFT + 52, 0), [-130, 0]],
      ['COMMON DOME', L(0, AFT + 37.5, 0), [130, 0]],
      ['LIQUID OXYGEN TANK', L(0, AFT + 22, 0), [-140, 0]],
      ['METHANE DOWNCOMER', L(0, AFT + 12, 0), [130, 10]],
      ['33 RAPTOR 3 ENGINES', [BELL, 0, 0], [-140, 26]],
      ['LAUNCH MOUNT', L(12, DECK - 2, 12), [120, 20]],
      ['FLAME BUCKET', L(4, 3, 6), [130, 30]],
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
      booster.full.visible = !ex;
      booster.half.visible = ex;
      booster.upd(ssE, ssT);
      site.upd();
    },
  };
}

export default {
  cfg: {
    /* DRONE: circling high over the pad, the booster, tower and tank farm against the Gulf */
    drone: { t: [0, 30, -20], d: 210, el: 0.62, hw: 70 },
    box: [24, 10],
    sc: [0, 30, -10],
    sh: 120,
    shD: 170,
    shF: 340,
    cams: [
      [[70, 36, 165], [0, 42, -4], 62],
      [[15, 24.5, 19], [0, 24, 0], 8.5],
      [[4, 9, 40], [0, 12.5, 0], 13],
    ],
    land: 1,
  },
  build: () => isolated(buildSH),
  plume(u) {
    const fl2 = 0.94 + 0.06 * Math.sin(state.simT * 49) * Math.sin(state.simT * 33 + 1),
      ig = Math.min(1, state.ign),
      ring = (10 * ssE[1] + 20 * ssE[2]) / 30;
    jets.upd(state.simT, ssE, ssT, ig);
    /* the merged column below the jets: the centre group in the middle, the two outer rings as four lobes round it,
       all blending into one column a few metres down; the jets carry the near field and the shock diamonds */
    u.uCl.value = 1;
    u.uAnn.value = 0;
    [
      [0, 0, ssE[0] * 0.5],
      [2.3, 2.3, ring * 0.5],
      [-2.3, -2.3, ring * 0.5],
      [2.3, -2.3, ring * 0.5],
      [-2.3, 2.3, ring * 0.5],
    ].forEach((o, j) => {
      u.uO.value[j].set(o[0], o[1]);
      u.uW.value[j] = o[2];
    });
    u.uMR.value = 5.0;
    u.uMg.value.set(6, 15);
    u.uR0.value = 2.2;
    u.uSp.value = 0.06;
    u.uLen.value = 13 + state.N * 9;
    u.uTurb.value = 0.45 + ig * 0.4;
    u.uFire.value = 0;
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) =>
      u[k].value.set(
        ...[
          [2.2, 1.35, 0.6],
          [1.6, 0.66, 0.2],
          [0.7, 0.22, 0.07],
          [0.18, 0.06, 0.045],
        ][i],
      ),
    );
    u.uI.value = (state.N > 0.01 ? 0.6 : 0) * fl2 + ig * 0.5;
    /* the jets draw the shock diamonds; still set the spacing, or the last machine's would leak in */
    u.uDia.value = 0;
    u.uDiaSp.value = 2.0;
    u.uDiaN.value = 3;
    u.uDiaOff.value = 0.25;
    u.uDiaR.value = 0.6;
    u.uDC.value.set(4.4, 3.8, 3.2);
    u.uDisk.value = 0;
    u.uGreen.value = 0;
    u.uHeat.value = state.N * 1.8 + ig * 0.5;
    u.uHeatLen.value = 9;
    return [state.N * 650 + ig * 250, [1, 0.62, 0.36]];
  },
  emit(dt) {
    const N = state.N,
      ig = Math.min(1, state.ign),
      qm = state.Q > 1 ? 1 : state.Q > 0 ? 0.6 : 0.35;
    /* deluge steam billowing out of both mouths of the flame trench, with some sand; mist round the mount */
    k3.steamAcc += dt * (N * 34 + ig * 14) * qm;
    while (k3.steamAcc > 1) {
      k3.steamAcc--;
      const s = Math.random() < 0.5 ? -1 : 1;
      if (Math.random() < 0.72) {
        const dust = Math.random() < 0.12;
        SMK.add({
          x: s * rnd(44, 60),
          y: rnd(1.5, 6),
          z: rnd(-6, 6),
          vx: s * rnd(8, 22) * (0.5 + N * 0.6),
          vy: rnd(3, 9),
          vz: rnd(-4, 4),
          a: 0,
          l: rnd(8, 12),
          sd: Math.random(),
          k: dust ? 7 : 2,
          s0: 6,
          s1: rnd(36, 58),
        });
      } else {
        /* (kept off the near side, so the bottom view still looks in under the mount) */
        const a = Math.PI * (1.1 + Math.random() * 0.8),
          r = rnd(9, 17);
        SMK.add({
          x: Math.cos(a) * r,
          y: rnd(3, 15),
          z: Math.sin(a) * r,
          vx: Math.cos(a) * rnd(1, 4),
          vy: rnd(1, 4),
          vz: Math.sin(a) * rnd(1, 4),
          a: 0,
          l: rnd(5, 7),
          sd: Math.random(),
          k: 2,
          s0: 4,
          s1: rnd(10, 18),
        });
      }
    }
    /* exhaust turned by the flame bucket, roaring out along the trench both ways */
    k3.sparkAcc += dt * N * 110 * qm;
    while (k3.sparkAcc > 1) {
      k3.sparkAcc--;
      const s = Math.random() < 0.5 ? -1 : 1;
      FIR.add({
        x: s * rnd(4, 40),
        y: rnd(1.5, 5),
        z: rnd(-5, 5),
        vx: s * rnd(50, 90),
        vy: rnd(0, 4),
        vz: rnd(-3, 3),
        a: 0,
        l: rnd(0.45, 0.8),
        sd: Math.random(),
        s0: 2.2,
        s1: rnd(5, 8),
      });
    }
    /* the full booster: cold vapour sliding down off the frost, and venting from the top */
    k3.sootAcc += dt * 5 * qm;
    while (k3.sootAcc > 1) {
      k3.sootAcc--;
      const a = Math.random() * 6.283,
        top = Math.random() < 0.2;
      SMK.add(
        top
          ? {
              x: Math.cos(a) * BR,
              y: AFT + BL - 6,
              z: Math.sin(a) * BR,
              vx: Math.cos(a) * 1.5,
              vy: rnd(1, 2.5),
              vz: Math.sin(a) * 1.5,
              a: 0,
              l: rnd(4, 6),
              sd: Math.random(),
              k: 2,
              s0: 1,
              s1: rnd(5, 8),
            }
          : {
              x: Math.cos(a) * (BR + 0.4),
              y: AFT + rnd(6, 55),
              z: Math.sin(a) * (BR + 0.4),
              vx: Math.cos(a) * 0.5,
              vy: -0.4,
              vz: Math.sin(a) * 0.5,
              a: 0,
              l: rnd(4, 6),
              sd: Math.random(),
              k: 9,
              s0: 0.8,
              s1: rnd(3, 5),
            },
      );
    }
  },
  thermal(amb) {
    thSet(TH.case, amb + state.N * 30);
    thSet(TH.bell, amb + state.N * 520, -state.N * 240, -BELL, 0);
    thSet(TH.hot, amb + state.N * 480);
    thSet(TH.inner, amb + state.N * 900);
  },
  flame: () => V3(0, 8, 0),
  flowSize: 0.06,
};
