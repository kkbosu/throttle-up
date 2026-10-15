// HARRIER (Pegasus): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { ENG } from '../../render3d/builders.js';
import { k3 } from '../../render3d/context.js';
import { CAT, MT, V3, beam, bladeRing, box, canvasTex, cyl, lathe, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { hangar, lightPole } from '../../render3d/props.js';

/* ======================= HARRIER: Pegasus jump jet on a VTOL pad ======================= */
export function buildHR() {
  const G = new T.Group(),
    AC = new T.Group();
  AC.position.y = 1.9;
  G.add(AC);
  const camo = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#646d66';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        x.fillStyle = ['#4f5a52', '#737c74', '#5a6458'][i % 3];
        x.beginPath();
        x.ellipse(
          Math.random() * w,
          Math.random() * h,
          20 + Math.random() * 60,
          10 + Math.random() * 30,
          Math.random() * 3,
          0,
          6.3,
        );
        x.fill();
      }
    },
    true,
  );
  const paint = std({ map: camo, roughness: 0.6, metalness: 0.25, side: T.DoubleSide });
  CAT.set(paint, 'case');
  const prof = [
    [0, -7.2],
    [0.25, -6.8],
    [0.45, -6.2],
    [0.62, -5.4],
    [0.78, -4.4],
    [0.88, -3.4],
    [0.98, -2.2],
    [1.02, -0.5],
    [1.0, 1.5],
    [0.92, 2.8],
    [0.75, 4.0],
    [0.55, 5.0],
    [0.38, 6.0],
    [0.28, 6.6],
    [0.05, 6.8],
  ];
  const fus = lathe(prof, paint, 48),
    fusH = lathe(prof, paint, 40, true);
  AC.add(fus, fusH);
  const glass = std({ color: 0x3a4a58, metalness: 0.6, roughness: 0.08 });
  const can = new T.Mesh(new T.SphereGeometry(0.55, 32, 16), glass);
  can.scale.set(2.1, 0.85, 0.95);
  can.position.set(-4.3, 0.72, 0);
  AC.add(can);
  const top = new T.Group();
  AC.add(top);
  top.add(box(4.2, 0.4, 0.75, paint, -1.6, 0.98, 0));
  [-1, 1].forEach((sg) => {
    const it = box(1.9, 1.15, 0.6, paint, -2.35, 0.05, sg * 1.12);
    top.add(it);
    top.add(box(0.06, 0.95, 0.46, new T.MeshBasicMaterial({ color: 0x050608 }), -3.31, 0.05, sg * 1.12));
  });
  const wing = (pts, th) => {
    const sh = new T.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => sh.lineTo(p[0], p[1]));
    sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
  };
  const wg = wing(
      [
        [-1.6, 0],
        [2.0, 0],
        [2.4, 3.6],
        [1.0, 3.6],
      ],
      0.14,
    ),
    tg = wing(
      [
        [4.7, 0],
        [6.0, 0],
        [6.35, 1.9],
        [5.7, 1.9],
      ],
      0.08,
    );
  [-1, 1].forEach((sg) => {
    const w = new T.Mesh(wg, paint);
    w.scale.z = sg;
    w.position.set(0, 0.98, sg * 0.98);
    w.rotation.x = sg * 0.2;
    w.castShadow = true;
    top.add(w);
    const t = new T.Mesh(tg, paint);
    t.scale.z = sg;
    t.position.set(0, 0.48, sg * 0.32);
    t.rotation.x = sg * 0.26;
    t.castShadow = true;
    top.add(t);
    const tip = V3(1.75, 0.98 - 3.55 * Math.sin(0.2), sg * (0.98 + 3.55 * Math.cos(0.2)));
    beam(top, [tip.x, tip.y, tip.z], [1.75, -1.55, tip.z], 0.06, MT.steel);
    const ow = cyl(0.2, 0.2, 0.12, MT.hose, 14);
    ow.rotation.x = Math.PI / 2;
    ow.position.set(1.75, -1.7, tip.z);
    top.add(ow);
  });
  const fsh = new T.Shape();
  fsh.moveTo(4.4, 0);
  fsh.lineTo(6.5, 0);
  fsh.lineTo(6.8, 2.3);
  fsh.lineTo(6.0, 2.3);
  fsh.closePath();
  const fg = new T.ExtrudeGeometry(fsh, { depth: 0.12, bevelEnabled: false });
  fg.translate(0, 0, -0.06);
  const fin = new T.Mesh(fg, paint);
  fin.position.y = 0.75;
  fin.castShadow = true;
  top.add(fin);
  [
    [-3.6, 0.27],
    [1.9, 0.36],
  ].forEach(([x, r]) => {
    beam(top, [x, -0.8, 0], [x, -1.6, 0], 0.1, MT.steel);
    const wl = cyl(r, r, 0.25, MT.hose, 16);
    wl.rotation.x = Math.PI / 2;
    wl.position.set(x, -1.9 + r, 0);
    top.add(wl);
  });
  /* four swivelling nozzles: cool fan air at the front pair, hot core exhaust at the rear pair */
  const NZ = [];
  [
    [-1.0, -0.2, 1.08, 0.31, 0],
    [1.15, -0.32, 1.02, 0.28, 1],
  ].forEach(([x, y, z, r, hot]) =>
    [-1, 1].forEach((sg) => {
      const p = new T.Group();
      p.position.set(x, y, sg * z);
      AC.add(p);
      const c = cyl(r, r * 0.92, 0.62, hot ? MT.hot : MT.steel, 24);
      c.rotation.z = -Math.PI / 2;
      c.position.x = 0.3;
      p.add(c);
      [-0.4, 0, 0.4].forEach((o) => p.add(box(0.52, 0.02, r * 1.7, MT.dark, 0.36, o * r, 0)));
      NZ.push(p);
    }),
  );
  /* Pegasus inside (cutaway only): fan, compressor, combustor, turbines */
  const peg = new T.Group();
  AC.add(peg);
  peg.add(
    lathe(
      [
        [0.0, -2.5],
        [0.6, -2.3],
        [0.62, -1.5],
        [0.5, -1.0],
        [0.46, -0.2],
      ],
      MT.ti,
      40,
      true,
    ),
    lathe(
      [
        [0.46, -0.2],
        [0.44, 1.3],
      ],
      MT.hot,
      40,
      true,
    ),
  );
  const rot = new T.Group();
  peg.add(rot);
  rot.add(
    lathe(
      [
        [0, -2.55],
        [0.12, -2.45],
        [0.2, -2.3],
      ],
      MT.alu,
      24,
    ),
  );
  const nb = [
    [-2.2, 0.2, 0.58, 22, 0.18, 0.6],
    [-1.85, 0.22, 0.56, 28, 0.12, 0.5],
  ];
  for (let k = 0; k < 6; k++) nb.push([-1.4 + k * 0.13, 0.24, 0.42 - k * 0.012, 30 + k * 2, 0.06, 0.4]);
  nb.push([0.35, 0.25, 0.4, 36, 0.06, 0.3], [0.55, 0.25, 0.42, 38, 0.06, 0.3]);
  rot.add(bladeRing(nb, MT.ti));
  const pcM = std({
    color: 0x2a2420,
    metalness: 0.5,
    roughness: 0.6,
    side: T.DoubleSide,
    emissive: 0xff7a2a,
    emissiveIntensity: 0,
  });
  CAT.set(pcM, 'inner');
  peg.add(
    lathe(
      [
        [0.26, -0.5],
        [0.38, -0.45],
        [0.4, -0.05],
        [0.27, 0],
      ],
      pcM,
      40,
      true,
    ),
  );
  /* pad with a painted landing circle */
  const padT = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#86837b';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 20000; i++) {
      const v = (100 + Math.random() * 60) | 0;
      x.fillStyle = `rgba(${v},${v - 2},${v - 6},.25)`;
      x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    x.strokeStyle = 'rgba(30,28,25,.7)';
    x.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      x.beginPath();
      x.moveTo(i * 128, 0);
      x.lineTo(i * 128, h);
      x.moveTo(0, i * 128);
      x.lineTo(w, i * 128);
      x.stroke();
    }
    const gd = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.32);
    gd.addColorStop(0, 'rgba(20,16,12,.55)');
    gd.addColorStop(1, 'rgba(20,16,12,0)');
    x.fillStyle = gd;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d8b22a';
    x.lineWidth = 18;
    x.beginPath();
    x.arc(w / 2, h / 2, w * 0.36, 0, 6.283);
    x.stroke();
    x.fillStyle = 'rgba(235,235,230,.85)';
    x.font = 'bold 220px sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('H', w / 2, h / 2);
  });
  const pad = new T.Mesh(new T.PlaneGeometry(30, 30), std({ map: padT, roughness: 0.88 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  G.add(pad);
  const lp1 = lightPole(G, -12, 9),
    lp2 = lightPole(G, 13, 8);
  hangar(G, 58, -150, -0.35);
  const anchor = new T.Object3D();
  anchor.position.set(0.1, -0.35, 0);
  AC.add(anchor);
  return {
    G,
    E: AC,
    AC,
    anchor,
    lens: [lp1, lp2],
    labels: [
      ['INTAKE', [-3.25, 0.1, -1.12], [-40, -56]],
      ['FAN', [-2.2, 0.35, -0.2], [10, -66]],
      ['COMBUSTOR', [-0.25, 0.3, -0.2], [30, -60]],
      ['FRONT NOZZLES: COOL FAN AIR', [-0.75, -0.55, -1.08], [-60, 62]],
      ['REAR NOZZLES: HOT CORE', [1.4, -0.65, -1.02], [70, 58]],
      ['WING', [1.2, 0.8, -3.0], [40, -48]],
    ],
    flow: () => [
      {
        w: 0.5,
        k: 0,
        sp: 1,
        cv: [
          [-4.4, 0.05, -1.12],
          [-3.2, 0.05, -1.0],
          [-2.4, 0.1, -0.45],
          [-1.7, -0.05, -0.75],
          [-1.05, -0.25, -1.05],
          [-0.8, -0.8, -1.1],
          [-0.75, -1.6, -1.1],
        ],
        r: 0.18,
        t0: 0,
        t1: 0.15,
      },
      {
        w: 0.5,
        k: 0,
        sp: 1,
        cv: [
          [-4.4, 0.05, -1.12],
          [-3.2, 0.05, -1.0],
          [-2.4, 0, -0.2],
          [-1.5, 0, -0.15],
          [-0.3, 0, -0.15],
          [0.5, 0, -0.2],
          [0.95, -0.2, -0.75],
          [1.2, -0.65, -1.02],
          [1.3, -1.4, -1.02],
        ],
        r: 0.12,
        t0: 0,
        t1: 0.95,
      },
    ],
    upd(dt) {
      const ex = state.exposed;
      fus.visible = !ex;
      fusH.visible = ex;
      peg.visible = ex;
      rot.rotation.x += state.N * dt * 7;
      pcM.emissiveIntensity = state.fu * (0.1 + state.N * 0.3);
      AC.position.y = 1.9 + state.alt;
      AC.rotation.x = state.alt > 0.05 ? 0.006 * Math.sin(state.simT * 1.3) : 0;
      AC.rotation.z = state.alt > 0.05 ? 0.004 * Math.sin(state.simT * 0.9 + 1) : 0;
      const a = (-state.nz * Math.PI) / 180;
      NZ.forEach((p) => (p.rotation.z = a));
      anchor.rotation.z = a;
    },
  };
}

export default {
  cfg: {
    box: [9, 3.4],
    sc: [0, 1, 0],
    sh: 12,
    cams: [
      [[3.5, 3.4, 19], [0, 2.0, 0], 9.5],
      [[-0.4, 1.25, 3.7], [0.5, 1.55, 1.0], 1.7],
      [[13, 2.6, 7], [0, 1.7, 0], 5.2],
    ],
    mt: 1,
  },
  build: buildHR,
  plume(u, fl) {
    let li, lc;
    {
      const nn = state.N * state.fu;
      u.uCl.value = 1;
      u.uAnn.value = 0;
      [
        [1.05, 1.02, 1],
        [1.05, -1.02, 1],
        [-1, 1.08, 0.3],
        [-1, -1.08, 0.3],
        [0, 0, 0],
      ].forEach((o, j) => {
        u.uO.value[j].set(o[0], o[1]);
        u.uW.value[j] = o[2];
      });
      u.uMR.value = 1.5;
      u.uMg.value.set(2, 7);
      u.uR0.value = 0.28;
      u.uSp.value = 0.09;
      u.uLen.value = 2.5 + nn * 2.5;
      u.uTurb.value = 0.4;
      u.uFire.value = 0;
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) =>
        u[k].value.set(
          ...[
            [0.5, 0.6, 1.1],
            [0.3, 0.35, 0.8],
            [0.15, 0.15, 0.4],
            [0.05, 0.04, 0.1],
          ][i],
        ),
      );
      u.uI.value = nn * 0.22 + Math.min(1, state.ign) * 0.6;
      u.uDia.value = 0;
      u.uGreen.value = 0;
      u.uHeat.value = nn * nn * 1.8 + state.ign * 0.3;
      u.uHeatLen.value = 3;
      li = nn * 4 + state.ign * 20;
      lc = [0.7, 0.75, 1];
    }
    return [li, lc];
  },
  emit(dt, ax) {
    const nn = state.N * state.fu,
      e = ENG[5],
      gy = e.AC.position.y - 1.9;
    if (state.alt < 14 && nn > 0.4 && state.nz > 45) {
      k3.sparkAcc += dt * nn * 70 * (1 - state.alt / 14) * (state.Q > 1 ? 1 : 0.6);
      while (k3.sparkAcc > 1) {
        k3.sparkAcc--;
        const a = Math.random() * 6.283,
          r = rnd(0.5, 2.5),
          sp = rnd(6, 16) * (1 - state.alt / 16);
        SMK.add({
          x: Math.cos(a) * r,
          y: 0.25,
          z: Math.sin(a) * r,
          vx: Math.cos(a) * sp,
          vy: rnd(0.4, 2.2),
          vz: Math.sin(a) * sp,
          a: 0,
          l: rnd(1.4, 2.8),
          sd: Math.random(),
          k: 7,
          s0: 0.6,
          s1: rnd(3, 6),
        });
      }
    }
  },
  thermal(amb, nn, fh) {
    thSet(TH.case, amb + state.N * 30 + state.hg * 30);
    thSet(TH.hot, amb + 80 * state.N + state.hg * 420);
    thSet(TH.inner, amb + state.hg * 600);
    thSet(TH.bell, amb);
  },
  flame: () => axisPt(1.5, 0, 0),
};
