// HARRIER (Pegasus): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { ENG } from '../../render3d/builders.js';
import { k3 } from '../../render3d/context.js';
import { ground, mountains } from '../../render3d/ground.js';
import {
  CAT,
  MT,
  V3,
  beam,
  bladeRing,
  box,
  canvasTex,
  cyl,
  foil,
  isolated,
  lathe,
  loft,
  rnd,
  std,
} from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { hangar, lightPole } from '../../render3d/props.js';
import { HRD, deckUnder } from './machine.js';
import { buildShip } from './ship.js';

/* ======================= HARRIER: Pegasus jump jet on a VTOL pad ======================= */
const HR_PAD = 332;
export function buildHR() {
  const G = new T.Group(),
    AC = new T.Group();
  AC.position.y = 1.9;
  G.add(AC);
  const camo = canvasTex(
    512,
    512,
    (x, w, h) => {
      /* low-visibility greys, as the US Marine Corps flies them: patches of slightly different grey for wear and
         touched-up paint, then panel lines */
      x.fillStyle = '#7f878e';
      x.fillRect(0, 0, w, h);
      x.globalAlpha = 0.45;
      for (let i = 0; i < 70; i++) {
        x.fillStyle = ['#737b83', '#8a9299', '#79818a'][i % 3];
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
      x.globalAlpha = 0.3;
      x.fillStyle = '#3c4248';
      for (let i = 0; i < 8; i++) {
        x.fillRect(i * 64 + (i % 3) * 9, 0, 1.5, h);
        x.fillRect(0, i * 64 + (i % 2) * 20, w, 1.5);
      }
    },
    true,
    [1, 1],
  );
  const paint = std({ map: camo, roughness: 0.6, metalness: 0.25, side: T.DoubleSide });
  CAT.set(paint, 'case');
  /* The airframe: AV-8B proportions (length 14.12 m, span 9.25 m, fin top 3.55 m above the ground; the rest by eye
     from three-view drawings). Nose at -X, tail at +X. It is built with its own random numbers. */
  const fst = [
    [-7.2, -0.28, 0.02, 0.02, 0.02],
    [-6.9, -0.28, 0.14, 0.14, 0.14],
    [-6.2, -0.24, 0.34, 0.32, 0.34],
    [-5.3, -0.16, 0.5, 0.42, 0.5, 0.9],
    [-4.3, -0.08, 0.6, 0.5, 0.62, 0.8],
    [-3.3, -0.02, 0.66, 0.62, 0.72, 0.7],
    [-2.4, 0, 0.8, 0.68, 0.78, 0.6],
    [-1.0, 0, 0.84, 0.7, 0.8, 0.55],
    [0.6, 0, 0.84, 0.7, 0.78, 0.55],
    [1.7, 0.02, 0.76, 0.68, 0.7, 0.62],
    [3.0, 0.08, 0.56, 0.58, 0.52, 0.78],
    [4.4, 0.14, 0.38, 0.46, 0.36, 0.9],
    [5.6, 0.18, 0.22, 0.32, 0.22],
    [6.6, 0.2, 0.1, 0.14, 0.1],
    [6.92, 0.2, 0.015, 0.015, 0.015],
  ];
  const { fus, fusH, top, NZ } = isolated(() => {
    const fus = loft(fst, paint, 24),
      fusH = loft(fst, paint, 12, Math.PI, Math.PI * 2),
      top = new T.Group(),
      NZ = [];
    AC.add(fus, fusH, top);
    /* raised bubble canopy */
    const glass = std({ color: 0x33424f, metalness: 0.7, roughness: 0.06 });
    top.add(
      loft(
        [
          [-5.75, 0.1, 0.02, 0.02, 0.02],
          [-5.35, 0.18, 0.3, 0.3, 0.1],
          [-4.7, 0.3, 0.42, 0.52, 0.1],
          [-4.0, 0.4, 0.44, 0.54, 0.1],
          [-3.45, 0.5, 0.32, 0.36, 0.1],
          [-3.05, 0.56, 0.04, 0.05, 0.04],
        ],
        glass,
        14,
      ),
    );
    const black = new T.MeshBasicMaterial({ color: 0x050608 });
    [-1, 1].forEach((sg) => {
      /* the big half-round intakes either side of the cockpit, fairing back into the fuselage */
      top.add(
        loft(
          [
            [-3.5, -0.04, 0.4, 0.66, 0.7, 0.8, sg * 0.86],
            [-3.2, -0.04, 0.44, 0.7, 0.74, 0.75, sg * 0.86],
            [-2.3, -0.02, 0.36, 0.66, 0.74, 0.7, sg * 0.74],
            [-1.3, 0, 0.2, 0.6, 0.7, 0.7, sg * 0.62],
          ],
          paint,
          14,
        ),
      );
      const lip = new T.Mesh(new T.CircleGeometry(1, 16), black);
      lip.rotation.y = -Math.PI / 2;
      lip.scale.set(0.34, 0.62, 1);
      lip.position.set(-3.51, -0.06, sg * 0.86);
      top.add(lip);
      /* shoulder wing with the leading-edge root extension, 12 degrees of anhedral; tailplane with 15 */
      top.add(
        foil(
          [
            [-2.7, sg * 0.5, 0.56, 4.5, 0.045],
            [-1.6, sg * 1.35, 0.53, 3.4, 0.1],
            [0.75, sg * 4.62, -0.14, 1.25, 0.08],
          ],
          paint,
        ),
        foil(
          [
            [4.35, 0, 0.3, 2.05, 0.06],
            [5.85, sg * 2.13, -0.24, 0.75, 0.06],
          ],
          paint,
        ),
      );
      /* outrigger wheels at mid-span, in their fairings */
      const oz = sg * 2.6;
      top.add(
        loft(
          [
            [0.9, 0.2, 0.02, 0.02, 0.02, 1, oz],
            [1.4, 0.16, 0.13, 0.12, 0.16, 1, oz],
            [2.1, 0.12, 0.13, 0.1, 0.18, 1, oz],
            [2.7, 0.1, 0.02, 0.02, 0.02, 1, oz],
          ],
          paint,
          8,
        ),
      );
      beam(top, [1.75, 0.16, oz], [1.75, -1.55, oz], 0.06, MT.steel);
      const ow = cyl(0.2, 0.2, 0.12, MT.hose, 14);
      ow.rotation.x = Math.PI / 2;
      ow.position.set(1.75, -1.7, oz);
      top.add(ow);
      /* the two gun-pod-shaped strakes under the belly */
      top.add(
        loft(
          [
            [-1.9, -0.76, 0.02, 0.02, 0.02, 1, sg * 0.42],
            [-1.4, -0.84, 0.17, 0.14, 0.17, 0.9, sg * 0.42],
            [0.5, -0.86, 0.2, 0.14, 0.2, 0.8, sg * 0.42],
            [1.4, -0.82, 0.14, 0.1, 0.14, 0.9, sg * 0.42],
            [1.8, -0.76, 0.02, 0.02, 0.02, 1, sg * 0.42],
          ],
          paint,
          8,
        ),
      );
    });
    /* Every surface starts inside the body it joins (fin and tailplane roots on the centre line, legs up inside the
       belly), so no gap shows from any side. */
    /* fin: its tip is 1.65 m above the fuselage centre line, which stands 1.9 m off the ground */
    top.add(
      foil(
        [
          [3.45, 0.05, 0, 3.3, 0.05],
          [5.95, 1.65, 0, 0.95, 0.05],
        ],
        paint,
        true,
      ),
    );
    /* bicycle undercarriage: nose wheel and twin main wheels on the centre line */
    [
      [-3.6, 0.27],
      [1.9, 0.36],
    ].forEach(([x, r]) => {
      beam(top, [x, -0.4, 0], [x, -1.6, 0], 0.1, MT.steel);
      const wl = cyl(r, r, 0.25, MT.hose, 16);
      wl.rotation.x = Math.PI / 2;
      wl.position.set(x, -1.9 + r, 0);
      top.add(wl);
    });
    /* four swivelling nozzles, each an elbow that comes out of the fuselage side and turns aft: cool fan air at the
       front pair, hot core exhaust at the rear pair. Each turns about the sideways axis through its root. */
    [
      [-1.0, -0.2, 1.08, 0.31, 0],
      [1.15, -0.32, 1.02, 0.28, 1],
    ].forEach(([x, y, z, r, hot]) =>
      [-1, 1].forEach((sg) => {
        const p = new T.Group();
        p.position.set(x, y, sg * z);
        AC.add(p);
        const cv = new T.CatmullRomCurve3(
            [
              [0, -0.45],
              [0, -0.2],
              [0.1, -0.04],
              [0.3, 0.03],
              [0.62, 0.03],
            ].map(([cx, cz]) => V3(cx, 0, sg * cz)),
          ),
          g = new T.TubeGeometry(cv, 10, r, 12, false);
        if (hot) {
          /* the heat-tint map runs up its height: lay that along the elbow, cool root to hot lip */
          const u = g.attributes.uv;
          for (let i = 0; i < u.count; i++) u.setXY(i, u.getY(i), 1 - u.getX(i) * 0.9);
        }
        const c = new T.Mesh(g, hot ? MT.hot : MT.steel);
        c.castShadow = true;
        p.add(c);
        [-0.45, 0, 0.45].forEach((o) => p.add(box(0.16, 0.02, r * 1.8, MT.dark, 0.56, o * r, sg * 0.03)));
        NZ.push(p);
      }),
    );
    return { fus, fusH, top, NZ };
  }, 0xa8b);
  /* the first airframe drew this many random numbers here; the pad texture and every machine built after this one
     were made with what followed, so the count is kept. (The sum is stored because the bundler removes a loop that
     only calls Math.random.) */
  let drawn = 0;
  for (let i = 0; i < HR_PAD; i++) drawn += Math.random();
  AC.userData.drawn = drawn;
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
  /* the pad and its surroundings, hidden while the deck-landing MISSION puts the ship under the aircraft */
  const land = isolated(() => new T.Group(), 0x1a4d); /* (its UUID mustn't shift the random numbers after it) */
  G.add(land);
  const pad = new T.Mesh(new T.PlaneGeometry(30, 30), std({ map: padT, roughness: 0.88 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.012;
  pad.receiveShadow = true;
  pad.userData.bg = 1;
  CAT.set(pad.material, 'gnd');
  land.add(pad);
  const lp1 = lightPole(land, -12, 9),
    lp2 = lightPole(land, 13, 8);
  hangar(land, 58, -150, -0.35);
  /* the ship and the sea (its own random numbers, so building it shifts nothing else) */
  const sh = isolated(() => buildShip(G), 0x5a1d);
  sh.ship.visible = sh.sea.visible = false;
  let atSea = false;
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
      ['WING', [0.6, 0.4, -3.0], [40, -48]],
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
    /* what upd() moves or shows/hides: not merged (render3d/merge.js) */
    keep: [fus, fusH, peg, rot, AC, ...NZ, anchor, land, ...sh.keep],
    upd(dt) {
      const ex = state.exposed;
      fus.visible = !ex;
      fusH.visible = ex;
      peg.visible = ex;
      rot.rotation.x += state.N * dt * 7;
      pcM.emissiveIntensity = state.fu * (0.1 + state.N * 0.3);
      AC.position.y = 1.9 + state.alt;
      AC.rotation.x = HRD.on ? -HRD.rl : state.alt > 0.05 ? 0.006 * Math.sin(state.simT * 1.3) : 0;
      AC.rotation.z = state.alt > 0.05 ? 0.004 * Math.sin(state.simT * 0.9 + 1) : 0;
      const a = (-state.nz * Math.PI) / 180;
      NZ.forEach((p) => (p.rotation.z = a));
      anchor.rotation.z = a;
      if (!!HRD.on !== atSea) {
        atSea = !!HRD.on;
        land.visible = !atSea;
        sh.ship.visible = sh.sea.visible = atSea;
        ground.visible = mountains.visible = !atSea;
      }
      if (atSea) sh.upd(HRD.x, HRD.z, HRD.h, state.simT, 5);
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
      [[-9.5, 2.3, 8.2], [-0.4, 1.7, 0], 5.6],
      [[13, 2.6, 7], [0, 1.7, 0], 5.2],
    ],
    mt: 1,
  },
  build: buildHR,
  /* deck landing: SIDE looks forward along the ship from behind the jet's port quarter, so sliding right over the deck
     is a slide to the right on screen; REAR stands off the port beam. (camA then lifts both with the jet.) */
  cam(P0, T0) {
    if (!HRD.on || state.view == 1) return;
    if (state.view == 2) {
      P0.set(4, 8, 40);
      T0.set(0, 1, -10);
    } else {
      /* about level with the jet, so the sea between it and the deck edge shows, aimed just to its right so it stays
         in a narrow frame (portrait phones, the 9:16 clip); near the deck, never below about 5 m or looking into it */
      const a = state.alt;
      P0.set(state.W < state.H ? 34 : 38, Math.max(1.5, 5 - a), state.W < state.H ? 5 : 9);
      T0.set(0, Math.max(-2, 1 - a), -4);
    }
  },
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
      gy = e.AC.position.y - 1.9,
      /* the surface the downwash strikes: the pad, or in the deck landing the deck or the sea below */
      sy = HRD.on ? deckUnder() : 0,
      ht = state.alt - sy;
    if (ht < 14 && nn > 0.4 && state.nz > 45) {
      k3.sparkAcc += dt * nn * 70 * (1 - ht / 14) * (state.Q > 1 ? 1 : 0.6);
      while (k3.sparkAcc > 1) {
        k3.sparkAcc--;
        const a = Math.random() * 6.283,
          r = rnd(0.5, 2.5),
          sp = rnd(6, 16) * (1 - ht / 16);
        SMK.add({
          x: Math.cos(a) * r,
          y: sy + 0.25,
          z: Math.sin(a) * r,
          vx: Math.cos(a) * sp,
          vy: rnd(0.4, 2.2),
          vz: Math.sin(a) * sp,
          a: 0,
          l: rnd(1.4, 2.8),
          sd: Math.random(),
          k: 7,
          w: HRD.on,
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
