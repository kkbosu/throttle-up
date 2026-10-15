// HALL thruster: the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers, EARTH view).
import * as T from 'three';
import { state } from '../../core/state.js';
import { earth, earthU } from '../../render3d/earth.js';
import { CAT, MT, V3, beam, box, canvasTex, cyl, lathe, pipe, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
import { MU, RE, WF, orb } from './machine.js';

/* ======================= HALL THRUSTER on a solar-electric spacecraft ======================= */
export function buildHT() {
  const G = new T.Group();
  const mliT = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#b8893a';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const a = Math.random() * 6.28,
          l = 10 + Math.random() * 60,
          cx = Math.random() * w,
          cy = Math.random() * h,
          v = Math.random();
        x.strokeStyle = v < 0.5 ? `rgba(255,226,150,${0.06 + v * 0.16})` : `rgba(90,60,20,${0.06 + (v - 0.5) * 0.2})`;
        x.lineWidth = 1 + Math.random() * 3;
        x.beginPath();
        x.moveTo(cx, cy);
        x.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
        x.stroke();
      }
    },
    true,
    [1.5, 1.5],
  );
  const mli = std({ color: 0xffffff, map: mliT, metalness: 0.65, roughness: 0.42 });
  const cellT = canvasTex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#0a1630';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++)
        for (let j = 0; j < 12; j++) {
          const g = x.createLinearGradient(i * 32, j * 42, i * 32 + 30, j * 42 + 40);
          g.addColorStop(0, '#13285a');
          g.addColorStop(1, '#0b1838');
          x.fillStyle = g;
          x.fillRect(i * 32 + 1, j * 42 + 1, 30, 40);
        }
      x.strokeStyle = 'rgba(200,210,230,.35)';
      x.lineWidth = 1;
      for (let i = 0; i <= 16; i++) {
        x.beginPath();
        x.moveTo(i * 32, 0);
        x.lineTo(i * 32, h);
        x.stroke();
      }
    },
    true,
  );
  const cellM = std({ map: cellT, metalness: 0.35, roughness: 0.22 }),
    backM = std({ color: 0xd8dbe0, roughness: 0.6, metalness: 0.1 });
  const bus = box(1.9, 1.7, 1.7, mli, -1.25, 0, 0);
  G.add(bus);
  G.add(box(1.5, 1.1, 0.02, MT.white, -1.25, 0, 0.861), box(1.5, 1.1, 0.02, MT.white, -1.25, 0, -0.861));
  const dish = lathe(
    [
      [0, 0],
      [0.35, 0.05],
      [0.7, 0.19],
      [0.82, 0.27],
    ],
    MT.white,
    40,
  );
  dish.rotation.z = Math.PI / 2;
  dish.position.set(-1.35, 0.88, 0);
  G.add(dish);
  const fs = cyl(0.025, 0.025, 0.5, MT.steel, 8);
  fs.position.set(-1.35, 1.3, 0);
  G.add(fs);
  [-1, 1].forEach((sg) => {
    beam(G, [-1.25, sg * 0.85, 0], [-1.25, sg * 1.55, 0], 0.06, MT.steel);
    for (let i = 0; i < 5; i++) {
      const p = new T.Mesh(new T.BoxGeometry(2.3, 1.9, 0.035), [backM, backM, backM, backM, cellM, backM]);
      p.position.set(-1.25, sg * (1.62 + i * 1.96 + 0.95), 0);
      p.castShadow = p.receiveShadow = true;
      G.add(p);
    }
  });
  G.add(box(0.08, 0.08, 1.6, MT.steel, -2.2, 0.3, 0));
  const mag = box(0.12, 0.12, 0.12, MT.dark, -2.2, 0.3, 0.85);
  G.add(mag);
  /* thruster: front pole plate, ceramic channel, central pole, outer coils, anode ring, hollow cathode */
  const cer = std({
    color: 0xe9e4da,
    roughness: 0.6,
    metalness: 0,
    emissive: 0x6a5cff,
    emissiveIntensity: 0,
    side: T.DoubleSide,
  });
  CAT.set(cer, 'hot');
  const pole = std({ color: 0x3e4148, metalness: 0.8, roughness: 0.45, side: T.DoubleSide });
  CAT.set(pole, 'case');
  const anM = std({
    color: 0x8a8f96,
    metalness: 0.8,
    roughness: 0.4,
    emissive: 0x7a6cff,
    emissiveIntensity: 0,
    side: T.DoubleSide,
  });
  CAT.set(anM, 'inner');
  const ringM = new T.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
    side: T.DoubleSide,
  });
  function thruster(px, py, pz, live) {
    const E = new T.Group();
    E.position.set(px, py, pz);
    G.add(E);
    const full = new T.Group(),
      half = new T.Group(),
      inner = new T.Group();
    E.add(full, half, inner);
    [
      [
        [
          [0.072, -0.003],
          [0.16, -0.003],
          [0.16, -0.014],
          [0.1, -0.014],
          [0.1, -0.13],
          [0.04, -0.13],
        ],
        pole,
      ],
      [
        [
          [0.07, -0.003],
          [0.07, -0.034],
        ],
        cer,
      ],
      [
        [
          [0.045, -0.034],
          [0.045, -0.003],
        ],
        cer,
      ],
      [
        [
          [0, -0.001],
          [0.04, -0.001],
          [0.043, -0.003],
          [0.043, -0.03],
        ],
        pole,
      ],
      [
        [
          [0.0455, -0.033],
          [0.0695, -0.033],
        ],
        anM,
      ],
    ].forEach(([p, m]) => {
      full.add(lathe(p, m, 64));
      half.add(lathe(p, m, 48, true));
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4,
        c = cyl(0.026, 0.026, 0.096, MT.copper, 16);
      c.rotation.z = Math.PI / 2;
      c.position.set(-0.062, Math.cos(a) * 0.132, Math.sin(a) * 0.132);
      (Math.sin(a) > 0 ? full : E).add(c);
    }
    inner.add(
      lathe(
        [
          [0.028, -0.035],
          [0.038, -0.035],
          [0.038, -0.12],
          [0.028, -0.12],
        ],
        MT.copper,
        32,
        true,
      ),
    );
    /* magnetic field lines across the channel mouth (cutaway only) */
    const flM = new T.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.75 });
    [1, -1].forEach((sg) =>
      [[0.006], [0.011], [0.016]].forEach(([b]) => {
        inner.add(
          pipe(
            [
              [-0.004, sg * 0.041, -0.002],
              [b * 0.6, sg * 0.05, -0.002],
              [b, sg * 0.058, -0.002],
              [b * 0.6, sg * 0.066, -0.002],
              [-0.004, sg * 0.075, -0.002],
            ],
            0.0012,
            flM,
            24,
          ),
        );
      }),
    );
    const glow = new T.Mesh(new T.RingGeometry(0.046, 0.069, 64), ringM.clone());
    glow.rotation.y = Math.PI / 2;
    glow.position.x = 0.002;
    E.add(glow);
    /* hollow cathode on its bracket above the channel, tip near the exit plane */
    const ca = V3(-0.09, 0.24, 0),
      cb = V3(0.004, 0.19, 0);
    const cm = cyl(0.014, 0.014, ca.distanceTo(cb), MT.steel, 12);
    cm.position.copy(ca).add(cb).multiplyScalar(0.5);
    cm.quaternion.setFromUnitVectors(V3(0, 1, 0), cb.clone().sub(ca).normalize());
    E.add(cm);
    E.add(box(0.02, 0.08, 0.03, MT.dark, -0.09, 0.2, 0));
    const tip = new T.Mesh(new T.SphereGeometry(0.009, 12, 8), new T.MeshBasicMaterial({ color: 0x000000 }));
    tip.position.copy(cb);
    E.add(tip);
    E.add(
      pipe(
        [
          [-0.13, 0, 0],
          [-0.2, -0.05, 0],
          [-0.28, -0.08, 0.05],
        ],
        0.008,
        MT.steel,
      ),
      box(0.06, 0.12, 0.12, MT.dark, -0.17, 0, 0),
    );
    return { E, full, half, inner, glow, tip, live };
  }
  const t1 = thruster(-0.17, -0.35, 0.35, 1),
    t2 = thruster(-0.17, -0.35, -0.35, 0);
  const anchor = new T.Object3D();
  t1.E.add(anchor);
  return {
    G,
    E: t1.E,
    anchor,
    lens: [],
    labels: [
      ['DISCHARGE CHANNEL', [-0.006, 0.058, -0.01], [-40, -62]],
      ['ANODE / GAS FEED', [-0.031, -0.058, -0.01], [-60, 56]],
      ['MAGNETIC COIL', [-0.062, 0.093, -0.093], [60, -58]],
      ['HOLLOW CATHODE', [-0.05, 0.215, 0], [-80, -30]],
      ['CENTRAL POLE', [0, 0, 0], [70, 48]],
      ['FIELD LINES', [0.011, -0.058, -0.002], [70, 30]],
      ['ION BEAM', [0.35, 0, 0], [30, -50]],
    ],
    flow: () => [
      {
        w: 0.42,
        band: 1,
        k: 4,
        sp: 0.35,
        ax: [
          [-0.03, 0.048, 0.067, 0],
          [-0.018, 0.048, 0.067, 0.08],
          [-0.008, 0.05, 0.065, 0.25],
          [0, 0.05, 0.066, 0.55],
          [0.05, 0.04, 0.11, 0.75],
          [0.25, 0.0, 0.3, 0.9],
          [0.8, 0, 0.75, 1],
        ],
      },
      { w: 0.38, k: 5, ring: [-0.012, -0.001, 0.049, 0.066], om: 9 },
      {
        w: 0.2,
        k: 5,
        sp: 0.6,
        cv: [
          [0.004, 0.19, 0],
          [0.03, 0.15, -0.01],
          [0.03, 0.09, -0.02],
          [0, 0.06, -0.02],
        ],
        r: 0.012,
        t0: 0,
        t1: 0,
      },
    ],
    upd(dt) {
      const nn = state.N * state.fu,
        ex = state.exposed;
      [t1, t2].forEach((t) => {
        t.full.visible = !ex;
        t.half.visible = t.inner.visible = ex;
      });
      cer.emissiveIntensity = nn * 0.5 + state.ign * 0.6;
      anM.emissiveIntensity = nn * 2.2 + state.ign * 2;
      t1.glow.material.color.setRGB(0.6, 0.7, 2.6).multiplyScalar(nn * 1.1 + state.ign * 1.8);
      t2.glow.material.color.setRGB(0, 0, 0);
      const ht = state.ph == 1 ? Math.min(1, state.st / 2.5) : 0;
      t1.tip.material.color.setRGB(3 * ht + 0.8 * nn, 1.1 * ht + 1.1 * nn, 0.2 * ht + 2.6 * nn);
      t2.tip.material.color.setRGB(0, 0, 0);
      const al = Math.max(100, (orb.r - RE) / 1e3);
      earth.position.set(0, -(6371 + al), 0);
      earthU.uRot.value += dt * Math.min(WF[state.sl], 60) * Math.sqrt(MU / (orb.r * orb.r * orb.r));
      earthU.uT.value += dt * Math.min(WF[state.sl], 60);
    },
  };
}

export default {
  cfg: {
    box: [1.8, 1.0],
    sc: [-1, 0, 0],
    sh: 7,
    space: 1,
    cams: [
      [[3.7, 2.7, 8.4], [-0.25, -0.45, 0], 2.6],
      [[1.0, 0.02, 1.65], [0.05, -0.36, 0.33], 0.55],
      [[2.1, 0.2, 1.05], [-0.17, -0.38, 0.35], 0.62],
      [[0, 0, 0], [-0.6, -2.6, -1.6], 2.6],
    ],
    mt: 0,
  },
  build: buildHT,
  plume(u, fl) {
    let li, lc;
    {
      u.uCl.value = 0;
      const nn = state.N * state.fu,
        ig = Math.min(1, state.ign),
        f2 = 0.97 + 0.03 * Math.sin(state.simT * 90);
      u.uR0.value = 0.058;
      u.uSp.value = 11;
      u.uLen.value = 0.42 + nn * 0.45;
      u.uTurb.value = 0.08;
      u.uFire.value = 0;
      u.uAnn.value = 0.95;
      ['uC0', 'uC1', 'uC2', 'uC3'].forEach((k, i) => {
        const a = [
          [1.5, 1.9, 4.2],
          [0.75, 0.85, 2.8],
          [0.4, 0.32, 1.5],
          [0.12, 0.07, 0.45],
        ][i];
        u[k].value.set(...C(a, [3, 3, 4], ig * 0.6));
      });
      u.uI.value = (nn * 2.8 + ig * 3) * f2;
      u.uDia.value = 0;
      u.uGreen.value = 0;
      u.uHeat.value = 0;
      u.uHeatLen.value = 1;
      li = nn * 3 + ig * 4;
      lc = [0.55, 0.62, 1];
    }
    return [li, lc];
  },
  emit() {},
  thermal(amb, nn, fh) {
    thSet(TH.case, amb + nn * 90 + (state.ph == 1 ? 40 : 0));
    thSet(TH.hot, amb + nn * 420);
    thSet(TH.inner, amb + nn * 520);
    thSet(TH.bell, amb);
  },
  flame: () => axisPt(0.25, 0, 0),
  flowStr: 0.004,
  flowSize: 0.0035,
  cam(P0, T0) {
    if (state.view == 3) {
      const h = Math.max(100, (orb.r - RE) / 1e3),
        pc = Math.acos(6371 / (6371 + h)) + 0.13,
        hd = V3(-1, 0, 0.12).normalize();
      P0.copy(T0).addScaledVector(hd, Math.cos(pc) * 12);
      P0.y += Math.sin(pc) * 12;
    }
  },
};
