// F-TYPE: the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, V3, beam, bolts, box, cyl, lathe, onCase, pipe, ring, std } from '../../render3d/kit.js';
import { blastFence, hangar, lightPole } from '../../render3d/props.js';
import { jetEmit, jetFlame, jetFlowSpeed, jetInner, jetPlume, jetThFh, jetThermal } from '../shared/jet3d.js';

/* ======================= F-TYPE: afterburning turbofan on an open-air test stand ======================= */
export function buildF() {
  const G = new T.Group(),
    E = new T.Group();
  E.position.set(0, 1.65, 0);
  G.add(E);
  const outer = new T.Group(),
    half = new T.Group(),
    core = new T.Group();
  E.add(outer, half, core);
  /* bellmouth inlet (part of the stand): a smooth aluminium flare that lets the engine breathe without a duct */
  E.add(
    lathe(
      [
        [1.0, -5.86],
        [0.93, -5.8],
        [0.8, -5.7],
        [0.68, -5.58],
        [0.61, -5.44],
        [0.585, -5.3],
        [0.585, -5.18],
      ],
      MT.alu,
      64,
    ),
  );
  const screen = new T.Mesh(
    new T.SphereGeometry(1.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4),
    new T.MeshStandardMaterial({
      color: 0x777777,
      metalness: 1,
      roughness: 0.5,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    }),
  );
  screen.rotation.z = Math.PI / 2;
  screen.position.x = -5.55;
  screen.scale.set(0.55, 1, 1);
  E.add(screen);
  const secs = [
    [
      [0.59, -5.2],
      [0.6, -4.75],
      [0.6, -4.3],
    ],
    [
      [0.6, -4.3],
      [0.555, -4.05],
      [0.53, -3.9],
    ],
    [
      [0.53, -3.9],
      [0.5, -3.3],
      [0.475, -2.8],
    ],
    [
      [0.475, -2.8],
      [0.51, -2.68],
      [0.515, -2.2],
      [0.505, -2.0],
    ],
    [
      [0.505, -2.0],
      [0.535, -1.78],
      [0.535, -1.4],
      [0.53, -1.05],
    ],
  ];
  const smat = [MT.gry, MT.ti, MT.ti, MT.steel, MT.hot];
  secs.forEach((p, i) => {
    outer.add(lathe(p, smat[i]));
    half.add(lathe(p, smat[i], 56, true));
  });
  const fl = [
    [-5.2, 0.6],
    [-4.3, 0.61],
    [-3.9, 0.54],
    [-2.8, 0.49],
    [-2.0, 0.52],
    [-1.05, 0.54],
  ];
  fl.forEach(([x, r]) => {
    outer.add(ring(r, 0.018, x, MT.steel));
    const hr = ring(r, 0.018, x, MT.steel);
    hr.geometry = new T.TorusGeometry(r, 0.018, 8, 40, Math.PI);
    hr.geometry.rotateY(Math.PI / 2);
    hr.geometry.rotateX(-Math.PI / 2);
    half.add(hr);
  });
  bolts(
    outer,
    fl.map(([x, r]) => [x + 0.012, r + 0.012]),
    44,
  );
  [-3.6, -3.3, -3.0].forEach((x) => outer.add(ring(0.53 - (x + 3.9) * 0.05 + 0.006, 0.008, x, MT.steel)));
  /* plumbing: fuel manifold ring round the combustor with feeder pipes, long lines and wiring harnesses along the casing */
  outer.add(ring(0.575, 0.017, -2.5, MT.copper, 64));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    outer.add(pipe([onCase(-2.5, 0.575, a), onCase(-2.47, 0.545, a), onCase(-2.42, 0.515, a)], 0.007, MT.copper, 6));
  }
  outer.add(
    pipe(
      [onCase(-4.25, 0.66, 0.9), onCase(-3.6, 0.6, 0.95), onCase(-2.9, 0.55, 1.05), onCase(-2.5, 0.59, 1.1)],
      0.02,
      MT.steel,
    ),
  );
  outer.add(
    pipe(
      [onCase(-4.2, 0.66, 1.35), onCase(-3.4, 0.58, 1.4), onCase(-2.3, 0.585, 1.38), onCase(-1.6, 0.6, 1.3)],
      0.016,
      MT.brass,
    ),
  );
  outer.add(
    pipe(
      [onCase(-4.1, 0.66, 0.4), onCase(-3.2, 0.58, 0.35), onCase(-2.2, 0.58, 0.42), onCase(-1.5, 0.6, 0.5)],
      0.03,
      MT.hose,
    ),
  );
  outer.add(pipe([onCase(-4.1, 0.66, -0.5), onCase(-3.3, 0.58, -0.45), onCase(-2.6, 0.6, -0.4)], 0.026, MT.wireR));
  outer.add(
    pipe(
      [onCase(-4.0, 0.66, 1.8), onCase(-3.5, 0.6, 1.9), onCase(-2.9, 0.55, 1.85), onCase(-2.0, 0.58, 1.7)],
      0.022,
      MT.wireB,
    ),
  );
  /* accessory gearbox slung under the fan case, driven by a tower shaft */
  const gb = box(0.95, 0.24, 0.42, MT.dark, -3.7, -0.78, 0);
  outer.add(gb);
  [
    [-4.05, 0.13],
    [-3.75, 0.11],
    [-3.42, 0.12],
  ].forEach(([x, r]) => {
    const c = cyl(r, r, 0.3, MT.ti, 16);
    c.rotation.x = Math.PI / 2;
    c.position.set(x, -0.78, 0.3);
    outer.add(c);
  });
  const ts = cyl(0.05, 0.05, 0.3, MT.steel, 10);
  ts.position.set(-3.95, -0.58, 0);
  outer.add(ts);
  /* nozzle: 16 external flaps from the afterburner duct to the exit; radius moves with power. Inner faces glow with the afterburner */
  const fg = new T.BoxGeometry(1, 0.022, 0.215);
  fg.translate(0.5, 0, 0);
  const flaps = new T.InstancedMesh(fg, MT.flap, 16);
  flaps.castShadow = true;
  E.add(flaps);
  const seals = new T.InstancedMesh(new T.BoxGeometry(1, 0.012, 0.08).translate(0.5, -0.01, 0), MT.dark, 16);
  E.add(seals);
  const actu = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3,
      c = cyl(0.03, 0.03, 0.5, MT.steel, 10),
      rod = cyl(0.014, 0.014, 0.4, MT.alu, 8);
    E.add(c, rod);
    actu.push([a, c, rod]);
  }
  /* inside the pipe: exhaust cone, flameholder rings, turbine face (seen from the rear) */
  const inner = new T.Group();
  E.add(inner);
  inner.add(
    lathe(
      [
        [0.0, -1.25],
        [0.12, -1.45],
        [0.2, -1.75],
      ],
      MT.inner,
      32,
    ),
  );
  const fh1 = ring(0.24, 0.015, -1.42, MT.inner, 40),
    fh2 = ring(0.4, 0.015, -1.38, MT.inner, 48);
  inner.add(fh1, fh2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      b = box(0.012, 0.32, 0.03, MT.inner);
    b.position.set(-1.4, Math.cos(a) * 0.32, Math.sin(a) * 0.32);
    b.rotation.x = -a;
    inner.add(b);
  }
  const tface = new T.Mesh(new T.CircleGeometry(0.5, 40), MT.inner);
  tface.rotation.y = Math.PI / 2;
  tface.position.x = -1.8;
  inner.add(tface);
  inner.add(
    lathe(
      [
        [0.525, -1.8],
        [0.525, -1.05],
      ],
      MT.inner,
      48,
    ),
  );
  /* cutaway internals: fan, 10-stage compressor, combustor liner, 2 turbine stages, afterburner spray bars; the rotor spins with N1 */
  const rotor = new T.Group();
  core.add(rotor);
  rotor.add(
    lathe(
      [
        [0, -5.32],
        [0.1, -5.25],
        [0.18, -5.12],
        [0.2, -5.0],
      ],
      MT.alu,
      32,
    ),
  );
  const bg = new T.BoxGeometry(0.11, 1, 0.012);
  bg.translate(0, 0.5, 0);
  const nb = [];
  nb.push([-5.04, 0.2, 0.57, 24, 0.16, 0.6]);
  for (let k = 0; k < 10; k++) nb.push([-3.95 + k * 0.1, 0.24 + k * 0.012, 0.425 - k * 0.009, 30 + k * 3, 0.055, 0.4]);
  nb.push([-1.98, 0.3, 0.47, 40, 0.06, 0.3], [-1.86, 0.31, 0.49, 44, 0.06, 0.3]);
  const tot = nb.reduce((s, b) => s + b[3], 0),
    blades = new T.InstancedMesh(bg, MT.ti, tot),
    M4 = new T.Matrix4(),
    q = new T.Quaternion(),
    e = new T.Euler();
  let bk = 0;
  nb.forEach(([x, r0, r1, n, ch, tw]) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      e.set(a, 0, 0);
      q.setFromEuler(e);
      const q2 = new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), tw);
      q.multiply(q2);
      M4.compose(V3(x, Math.cos(a) * r0 * 0 + 0, 0), q, V3(ch / 0.11, r1 - r0, 1));
      const off = V3(0, r0, 0).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(a, 0, 0)));
      M4.setPosition(x, off.y, off.z);
      blades.setMatrixAt(bk++, M4);
    }
  });
  rotor.add(blades);
  const shaft = cyl(0.06, 0.06, 3.3, MT.steel, 12);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = -3.4;
  rotor.add(shaft);
  const drum = lathe(
    [
      [0.24, -4.0],
      [0.3, -3.0],
      [0.3, -2.8],
    ],
    MT.ti,
    40,
  );
  rotor.add(drum);
  const linM = std({
    color: 0x2a2420,
    metalness: 0.5,
    roughness: 0.6,
    side: T.DoubleSide,
    emissive: 0xff7a2a,
    emissiveIntensity: 0,
  });
  CAT.set(linM, 'inner');
  const split = lathe(
    [
      [0.45, -4.3],
      [0.445, -3.0],
      [0.45, -2.75],
    ],
    MT.ti,
    48,
    true,
  );
  core.add(split);
  const liner = lathe(
    [
      [0.31, -2.75],
      [0.42, -2.7],
      [0.44, -2.4],
      [0.4, -2.15],
      [0.32, -2.1],
    ],
    linM,
    48,
    true,
  );
  core.add(liner);
  for (let i = 0; i < 14; i++) {
    const a = Math.PI / 2 + (i / 13) * Math.PI,
      sb = box(0.015, 0.3, 0.015, MT.steel);
    sb.position.set(-1.5, Math.cos(a) * 0.27, Math.sin(a) * 0.27);
    sb.rotation.x = -a;
    core.add(sb);
  }
  /* test stand: yellow steel portal frames on the pad, engine hung from a thrust beam by links */
  const S = new T.Group();
  G.add(S);
  [-4.3, -1.7].forEach((x) => {
    [-1.25, 1.25].forEach((z) => beam(S, [x, 0, z], [x, 2.55, z], 0.16, MT.yel));
    beam(S, [x, 2.6, -1.35], [x, 2.6, 1.35], 0.2, MT.yel);
    beam(S, [x - 0.5, 0, -1.25], [x, 1.3, -1.25], 0.08, MT.yel);
    beam(S, [x + 0.5, 0, 1.25], [x, 1.3, 1.25], 0.08, MT.yel);
  });
  beam(S, [-4.9, 2.75, 0], [-1.1, 2.75, 0], 0.22, MT.yel);
  [
    [-4.3, -0.12],
    [-1.7, 0.12],
  ].forEach(([x, o]) => {
    beam(S, [x, 2.65, 0], [x + o, 2.2, 0], 0.06, MT.steel);
  });
  [-1.25, 1.25].forEach((z) => beam(S, [-5.4, 0.1, z], [-0.6, 0.1, z], 0.2, MT.yel));
  S.add(box(0.5, 0.5, 0.5, MT.gry, -5, 0.25, -2.2));
  const cab = pipe(
    [
      [-5, 0.5, -2.2],
      [-5.2, 1.2, -1.4],
      [-4.6, 2.2, -0.6],
      [-4.0, 2.3, -0.2],
    ],
    0.04,
    MT.hose,
  );
  S.add(cab);
  const pad = new T.Mesh(new T.PlaneGeometry(40, 26), std({ map: padTex(0.41, 0.5, 0.5, 0.18), roughness: 0.88 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(4, 0.012, 0);
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  const lp1 = lightPole(G, -12, 9),
    lp2 = lightPole(G, 13, 8);
  blastFence(G, 27);
  hangar(G, 58, -150, -0.35);
  /* fuel bowser parked off to the side */
  const tr = new T.Group();
  tr.add(box(2.2, 1.6, 2.1, std({ color: 0xd8d4c8, roughness: 0.5, metalness: 0.2 }), -3.2, 1.3, 0));
  const tk = cyl(0.95, 0.95, 5, std({ color: 0xc9c9c2, metalness: 0.6, roughness: 0.35 }), 24);
  tk.rotation.z = Math.PI / 2;
  tk.position.set(0.6, 1.55, 0);
  tr.add(tk);
  tr.add(box(7.4, 0.3, 1.9, MT.dark, -0.6, 0.55, 0));
  [-3.4, -0.2, 1.6, 2.6].forEach((x) =>
    [-1, 1].forEach((z) => {
      const w = cyl(0.45, 0.45, 0.3, MT.hose, 16);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.45, z);
      tr.add(w);
    }),
  );
  tr.position.set(-8, 0, -9);
  tr.rotation.y = 0.35;
  G.add(tr);
  const anchor = new T.Object3D();
  anchor.position.set(0, 1.65, 0);
  G.add(anchor);
  return {
    G,
    E,
    outer,
    half,
    core,
    rotor,
    liner,
    flaps,
    labels: [
      ['FAN', [-5.05, 0.15, 0], [0, -58]],
      ['COMPRESSOR', [-3.5, 0.12, 0], [0, 62]],
      ['BYPASS DUCT', [-3.3, 0.47, 0], [0, -52]],
      ['COMBUSTOR', [-2.42, 0.37, 0], [-10, -70]],
      ['TURBINE', [-1.92, 0.2, 0], [10, 64]],
      ['AFTERBURNER', [-1.35, 0, 0], [20, -62]],
      ['NOZZLE', [-0.4, 0.42, 0], [30, 60]],
    ],
    flow: () => [
      {
        w: 0.55,
        band: 1,
        k: 0,
        sp: 1,
        ax: [
          [-5.9, 0, 0.42, 0],
          [-5.05, 0.2, 0.44, 0.03],
          [-4.25, 0.25, 0.42, 0.1],
          [-3.0, 0.3, 0.4, 0.42],
          [-2.72, 0.33, 0.41, 0.5],
          [-2.42, 0.34, 0.41, 0.85],
          [-2.12, 0.33, 0.42, 1.0],
          [-1.85, 0.31, 0.45, 0.9],
          [-1.3, 0.05, 0.45, -1],
          [-0.55, 0, 0.42, -1],
          [0, 0, 0.36, -1],
          [1.2, 0, 0.4, -1],
        ],
      },
      {
        w: 0.45,
        band: 1,
        k: 0,
        sp: 1,
        ax: [
          [-5.9, 0.42, 0.58, 0],
          [-5.05, 0.46, 0.56, 0.03],
          [-4.25, 0.455, 0.52, 0.06],
          [-3.0, 0.455, 0.49, 0.08],
          [-2.2, 0.455, 0.5, 0.1],
          [-1.8, 0.46, 0.52, 0.15],
          [-1.3, 0.3, 0.5, -2],
          [-0.55, 0.2, 0.46, -2],
          [0, 0.1, 0.36, -2],
          [1.2, 0.1, 0.42, -2],
        ],
      },
    ],
    seals,
    actu,
    inner,
    anchor,
    lens: [lp1, lp2],
    upd(dt) {
      /* exit radius: open at idle, closes toward MIL, opens wide with the afterburner */
      const re = 0.45 - 0.1 * sm(0.3, 0.95, state.N) + 0.17 * state.A,
        x0 = -1.05,
        r0 = 0.53,
        len = Math.hypot(-x0, r0 - re),
        pitch = Math.atan2(re - r0, -x0);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        q.setFromEuler(e.set(a, 0, pitch, 'XYZ'));
        M4.compose(V3(x0, Math.cos(a) * r0, Math.sin(a) * r0), q, V3(len, 1, 1));
        flaps.setMatrixAt(i, M4);
        const a2 = a + Math.PI / 16;
        q.setFromEuler(e.set(a2, 0, pitch, 'XYZ'));
        M4.compose(V3(x0, Math.cos(a2) * (r0 - 0.012), Math.sin(a2) * (r0 - 0.012)), q, V3(len, 1, 1));
        seals.setMatrixAt(i, M4);
      }
      flaps.instanceMatrix.needsUpdate = seals.instanceMatrix.needsUpdate = true;
      actu.forEach(([a, c, rod]) => {
        const ca = Math.cos(a),
          sa = Math.sin(a),
          rr = 0.62,
          ext = 0.12 + state.A * 0.18 + (0.45 - re) * 0.3;
        c.position.set(-1.55, ca * rr, sa * rr);
        c.rotation.set(a, 0, Math.PI / 2);
        rod.position.set(-1.55 + 0.25 + ext * 0.5, ca * rr, sa * rr);
        rod.rotation.set(a, 0, Math.PI / 2);
        rod.scale.y = (ext + 0.15) / 0.4;
      });
      rotor.rotation.x += state.N * dt * 7;
      linM.emissiveIntensity =
        state.fu * (0.1 + state.N * 0.32) * (0.85 + 0.15 * Math.sin(state.simT * 37)) + state.ign * 0.4;
      const ex = state.exposed;
      outer.visible = !ex;
      half.visible = ex;
      liner.visible = split.visible = ex;
    },
  };
}

export default {
  cfg: {
    box: [16, 2.6],
    sc: [-2, 1, 0],
    sh: 13,
    cams: [
      [[1.4, 3.0, 10.8], [-0.9, 2.2, 0], 5.8],
      [[2.75, 2.0, 3.35], [-0.45, 1.62, 0], 1.9],
      [[8.8, 2.1, 2.7], [-0.6, 1.65, 0], 2.3],
    ],
    mt: 1,
  },
  build: buildF,
  plume: (u, fl) => jetPlume(u, fl, false),
  emit: jetEmit,
  thermal: jetThermal,
  thFh: jetThFh,
  thR: [5, 4.5],
  flame: jetFlame,
  flap: () => state.A * 0.05,
  inner: jetInner,
  flowSpeed: jetFlowSpeed,
  flowSize: 0.011,
  portrait: true,
  burst: true,
};
