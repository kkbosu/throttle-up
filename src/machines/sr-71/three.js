// SR-71 J58: the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { padTex } from '../../render3d/ground.js';
import {
  CAT,
  MT,
  V3,
  beam,
  bladeRing,
  box,
  cyl,
  halfRing,
  lathe,
  onCase,
  pipe,
  ring,
  std,
} from '../../render3d/kit.js';
import { blastFence, hangar, lightPole } from '../../render3d/props.js';
import { jetEmit, jetFlame, jetFlowSpeed, jetInner, jetPlume, jetThFh, jetThermal } from '../shared/jet3d.js';

/* ======================= SR-71: J58 in its nacelle (spike, cowl, blow-in doors, ejector) on cradles ======================= */
export function buildSR() {
  const G = new T.Group(),
    E = new T.Group();
  E.position.set(0, 2.05, 0);
  G.add(E);
  const shell = new T.Group(),
    shellH = new T.Group(),
    j58H = new T.Group(),
    tubes = new T.Group(),
    inside = new T.Group(),
    spike = new T.Group();
  E.add(shell, shellH, j58H, tubes, inside, spike);
  spike.add(
    lathe(
      [
        [0, -9.25],
        [0.12, -8.95],
        [0.27, -8.55],
        [0.4, -8.05],
        [0.48, -7.5],
        [0.52, -6.9],
        [0.52, -6.2],
        [0.44, -5.9],
      ],
      MT.sr,
      56,
    ),
  );
  spike.add(ring(0.47, 0.008, -8.3, MT.dark, 56), ring(0.515, 0.008, -7.2, MT.dark, 56));
  /* nacelle: cowl, inlet duct, door recess, aft section; each built whole and as a cut-away half */
  const ductM = std({ color: 0x0c0d10, metalness: 0.3, roughness: 0.7, side: T.DoubleSide });
  CAT.set(ductM, 'case');
  [
    [
      [
        [0.725, -8.15],
        [0.75, -7.9],
        [0.79, -7.4],
        [0.835, -6.7],
        [0.85, -6.0],
        [0.855, -2.05],
      ],
      MT.sr,
      72,
    ],
    [
      [
        [0.715, -8.12],
        [0.705, -7.5],
        [0.67, -6.8],
        [0.6, -6.1],
      ],
      ductM,
      64,
    ],
    [
      [
        [0.79, -2.05],
        [0.79, -1.35],
      ],
      MT.srHot,
      72,
    ],
    [
      [
        [0.855, -1.35],
        [0.85, -0.7],
        [0.82, -0.1],
        [0.8, 0],
      ],
      MT.sr,
      72,
    ],
  ].forEach(([p, m, sg]) => {
    shell.add(lathe(p, m, sg));
    shellH.add(lathe(p, m, sg, true));
  });
  const cface = new T.Mesh(new T.CircleGeometry(0.6, 40), std({ color: 0x3a3d44, metalness: 0.8, roughness: 0.4 }));
  cface.rotation.y = -Math.PI / 2;
  cface.position.x = -6.05;
  shell.add(cface);
  [-7.0, -5.4, -4.0, -3.2].forEach((x) => {
    shell.add(ring(0.857, 0.006, x, MT.dark, 72));
    shellH.add(halfRing(0.857, 0.006, x, MT.dark, 40));
  });
  /* blow-in doors: 8 panels hinged at their forward edge; they swing in at low Mach to feed the ejector */
  const dg = new T.BoxGeometry(0.66, 0.025, 0.6);
  dg.translate(0.33, 0, 0);
  const doors = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      h = new T.Group();
    h.position.set(-2.03, Math.cos(a) * 0.852, Math.sin(a) * 0.852);
    h.rotation.x = a;
    const d = new T.Mesh(dg, MT.sr);
    d.castShadow = true;
    h.add(d);
    E.add(h);
    doors.push(h);
  }
  /* free-floating ejector flaps */
  const tg = new T.BoxGeometry(0.42, 0.02, 0.32);
  tg.translate(0.21, 0, 0);
  const tail = new T.InstancedMesh(tg, MT.sr, 16),
    tm = [],
    Z = new T.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const q = new T.Quaternion().setFromEuler(new T.Euler(a, 0, -0.14, 'XYZ'));
    tm.push([new T.Matrix4().compose(V3(-0.12, Math.cos(a) * 0.8, Math.sin(a) * 0.8), q, V3(1, 1, 1)), Math.sin(a)]);
    tail.setMatrixAt(i, tm[i][0]);
  }
  tail.castShadow = true;
  E.add(tail);
  /* J58 afterburner nozzle, faked interior (turbine face, flameholders) for the closed view */
  const nozP = [
      [0.62, -1.4],
      [0.6, -0.8],
      [0.56, -0.45],
    ],
    noz = lathe(nozP, MT.srHot, 56),
    nozH = lathe(nozP, MT.srHot, 56, true);
  E.add(noz, nozH);
  const tf = new T.Mesh(new T.CircleGeometry(0.6, 40), MT.inner);
  tf.rotation.y = Math.PI / 2;
  tf.position.x = -1.6;
  E.add(tf);
  E.add(ring(0.32, 0.016, -1.2, MT.inner, 40), ring(0.48, 0.016, -1.15, MT.inner, 40));
  /* J58 in section: compressor, burner, turbine, long afterburner duct */
  j58H.add(
    lathe(
      [
        [0.36, -6.05],
        [0.56, -5.95],
        [0.62, -5.6],
        [0.62, -3.7],
        [0.58, -3.35],
        [0.64, -3.1],
      ],
      MT.ti,
      56,
      true,
    ),
  );
  j58H.add(
    lathe(
      [
        [0.64, -3.1],
        [0.64, -1.4],
      ],
      MT.hot,
      56,
      true,
    ),
  );
  [-5.6, -4.8, -3.8, -2.9, -2.0].forEach((x) => j58H.add(halfRing(0.645, 0.014, x, MT.steel, 40)));
  j58H.add(box(1.1, 0.26, 0.4, MT.dark, -4.6, -0.78, 0));
  /* the six bleed-bypass tubes; only the three behind the cut are drawn in section */
  const tubeCurves = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26,
      pts = [
        onCase(-5.15, 0.62, a),
        onCase(-5.05, 0.74, a),
        onCase(-4.6, 0.76, a),
        onCase(-3.2, 0.78, a),
        onCase(-2.7, 0.76, a),
        onCase(-2.55, 0.64, a),
      ];
    if (Math.sin(a) < 0.05) {
      tubes.add(pipe(pts, 0.065, MT.steel, 40));
      tubeCurves.push(pts);
    }
  }
  const rot = new T.Group();
  inside.add(rot);
  rot.add(
    lathe(
      [
        [0, -6.15],
        [0.15, -6.05],
        [0.3, -5.92],
      ],
      MT.alu,
      32,
    ),
  );
  const nb = [];
  for (let k = 0; k < 9; k++) nb.push([-5.82 + k * 0.24, 0.3 + k * 0.018, 0.58 - k * 0.014, 26 + k * 3, 0.09, 0.45]);
  nb.push([-3.25, 0.33, 0.55, 40, 0.07, 0.3], [-3.1, 0.34, 0.56, 44, 0.07, 0.3]);
  rot.add(bladeRing(nb, MT.ti));
  const sh2 = cyl(0.07, 0.07, 3, MT.steel, 12);
  sh2.rotation.z = Math.PI / 2;
  sh2.position.x = -4.6;
  rot.add(sh2);
  rot.add(
    lathe(
      [
        [0.3, -5.9],
        [0.36, -4.0],
        [0.36, -3.75],
      ],
      MT.ti,
      40,
    ),
  );
  const burnM = std({
    color: 0x2a2420,
    metalness: 0.5,
    roughness: 0.6,
    side: T.DoubleSide,
    emissive: 0xff7a2a,
    emissiveIntensity: 0,
  });
  CAT.set(burnM, 'inner');
  inside.add(
    lathe(
      [
        [0.36, -3.72],
        [0.5, -3.66],
        [0.53, -3.48],
        [0.48, -3.36],
        [0.37, -3.33],
      ],
      burnM,
      48,
      true,
    ),
  );
  inside.add(
    lathe(
      [
        [0.62, -3.0],
        [0.62, -1.4],
      ],
      MT.inner,
      48,
      true,
    ),
  );
  /* cradles */
  const S = new T.Group();
  G.add(S);
  [-6.4, -2.6].forEach((x) => {
    beam(S, [x, 0, -0.9], [x, 1.0, -0.35], 0.18, MT.yel);
    beam(S, [x, 0, 0.9], [x, 1.0, 0.35], 0.18, MT.yel);
    S.add(box(0.3, 0.14, 1.2, MT.yel, x, 1.12, 0));
    beam(S, [x, 0, -0.9], [x, 0, 0.9], 0.2, MT.yel);
  });
  beam(S, [-7, 0.1, 0], [-2, 0.1, 0], 0.2, MT.yel);
  /* AG330 start cart: two big V8s in a yellow trailer, driveshaft up to the engine's starter pad */
  const cart = new T.Group();
  cart.add(box(2.8, 1.2, 1.3, MT.yel, 0, 1.0, 0));
  cart.add(box(2.6, 0.15, 1.2, MT.dark, 0, 0.38, 0));
  for (let i = 0; i < 6; i++) cart.add(box(0.05, 0.5, 1.1, MT.dark, -1 + i * 0.4, 1.25, 0.66));
  [-1, 1].forEach((x) =>
    [-0.6, 0.6].forEach((z) => {
      const w = cyl(0.32, 0.32, 0.22, MT.hose, 16);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.32, z);
      cart.add(w);
    }),
  );
  cart.position.set(-4.4, 0, -3.4);
  G.add(cart);
  G.add(
    pipe(
      [
        [-4.4, 1.5, -2.75],
        [-4.5, 1.4, -1.6],
        [-4.55, 1.32, -0.5],
        [-4.6, 1.27, 0],
      ],
      0.05,
      MT.steel,
    ),
  );
  const pad = new T.Mesh(new T.PlaneGeometry(44, 26), std({ map: padTex(0.4, 0.5, 0.55, 0.22), roughness: 0.88 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(3, 0.012, 0);
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  const lp1 = lightPole(G, -12, 9),
    lp2 = lightPole(G, 13, 8);
  blastFence(G, 30);
  hangar(G, 64, -165, -0.3);
  const anchor = new T.Object3D();
  anchor.position.set(0, 2.05, 0);
  G.add(anchor);
  let lastEx = -1;
  return {
    G,
    E,
    anchor,
    lens: [lp1, lp2],
    labels: [
      ['INLET SPIKE', [-8.4, 0.25, 0], [0, -62]],
      ['COMPRESSOR', [-4.9, 0.25, 0], [0, 64]],
      ['BYPASS TUBES', [-3.9, 0.76, -0.3], [-20, -58]],
      ['BURNER', [-3.5, 0.4, 0], [-30, 66]],
      ['TURBINE', [-3.17, 0.3, 0], [40, -64]],
      ['AFTERBURNER', [-2.2, 0, 0], [20, 62]],
      ['BLOW-IN DOORS', [-1.7, 0.82, -0.3], [10, -60]],
      ['EJECTOR', [-0.25, 0.8, 0], [40, 58]],
    ],
    flow: () =>
      [
        {
          w: 0.48,
          band: 1,
          k: 0,
          sp: 1,
          ax: [
            [-10.4, 0, 0.5, 0],
            [-8.8, 0.3, 0.6, 0],
            [-7.6, 0.47, 0.66, 0.05],
            [-6.3, 0.36, 0.58, 0.08],
            [-5.9, 0.33, 0.57, 0.1],
            [-4.8, 0.34, 0.53, 0.3],
            [-3.75, 0.37, 0.49, 0.5],
            [-3.5, 0.38, 0.5, 1],
            [-3.2, 0.36, 0.52, 0.92],
            [-2.4, 0.05, 0.56, -1],
            [-1, 0, 0.56, -1],
            [0, 0, 0.56, -1],
            [1.4, 0, 0.62, -1],
          ],
        },
        {
          w: 0.3,
          band: 1,
          k: 0,
          sp: 1,
          ax: [
            [-10.4, 0.5, 0.9, 0],
            [-8.8, 0.63, 0.72, 0],
            [-7.6, 0.67, 0.71, 0.02],
            [-6.3, 0.63, 0.69, 0.04],
            [-5, 0.67, 0.82, 0.06],
            [-3, 0.69, 0.82, 0.08],
            [-1.4, 0.67, 0.8, 0.1],
            [0, 0.6, 0.8, -2],
            [1.4, 0.62, 0.85, -2],
          ],
        },
      ].concat(
        tubeCurves.map((pts) => ({
          w: 0.07,
          k: 0,
          sp: 1,
          cv: pts,
          r: 0.035,
          t0: 0.32,
          t1: 0.42,
          al: () => sm(1.8, 2.6, state.mach),
        })),
      ),
    upd(dt) {
      const o = 1 - sm(0.6, 1.2, state.mach);
      doors.forEach((h) => {
        h.children[0].rotation.z = -0.42 * o;
      });
      spike.position.x = state.spk * 0.66;
      const ex = state.exposed;
      shell.visible = noz.visible = tf.visible = !ex;
      shellH.visible = j58H.visible = tubes.visible = inside.visible = nozH.visible = ex;
      rot.rotation.x += state.N * dt * 6;
      burnM.emissiveIntensity =
        state.fu * (0.1 + state.N * 0.32) * (0.85 + 0.15 * Math.sin(state.simT * 41)) + state.ign * 0.4;
      if (ex !== lastEx) {
        lastEx = ex;
        doors.forEach((h) => (h.visible = !ex || h.position.z < 0.01));
        tm.forEach(([m, sn], i) => tail.setMatrixAt(i, ex && sn > 0.05 ? Z : m));
        tail.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

export default {
  cfg: {
    box: [20, 3],
    sc: [-3.5, 1, 0],
    sh: 15,
    cams: [
      [[1.0, 3.5, 14.2], [-2.5, 2.65, 0], 7.6],
      [[3.3, 2.5, 3.7], [-0.45, 2.05, 0], 2.1],
      [[10.5, 2.5, 3.1], [-0.8, 2.05, 0], 2.5],
    ],
    mt: 1,
  },
  build: buildSR,
  plume: (u, fl) => jetPlume(u, fl, true),
  emit: jetEmit,
  thermal: jetThermal,
  thFh: jetThFh,
  thR: [5, 4.5],
  flame: jetFlame,
  inner: jetInner,
  flowSpeed: jetFlowSpeed,
  flowSize: 0.011,
  portrait: true,
  burst: true,
};
