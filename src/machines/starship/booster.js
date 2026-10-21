// STARSHIP: the Super Heavy booster model. Welded stainless-steel rings, frost over the propellant tanks, the vented
// hot-staging ring on top, three grid fins (90/90/180), a cable raceway, the aft heat shield and 33 Raptor 3 bells.
// Built in the engine frame E (local +X points down the exhaust, local x = 0 is the bottom of the booster body).
import * as T from 'three';
import { CAT, MT, V3, box, canvasTex, lathe, pipe, std } from '../../render3d/kit.js';

export const BL = 72.3, // booster height (sourced)
  BR = 4.5, // booster radius (9 m wide, sourced)
  BELL = 2.4, // bell length below the body
  RINGS = [
    [3, 0.95, 0.62], // centre 3: [count, ring radius, bell exit radius]
    [10, 2.45, 0.62], // middle ring
    [20, 3.85, 0.58], // outer ring
  ];
const AFT_H = 3.4, // aft skirt height
  VENT_H = 4.4; // vented hot-staging ring at the top

/* engine positions (local y, z) by group */
export const ENGINES = [];
RINGS.forEach(([n, rr], gi) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + gi * 0.3;
    ENGINES.push([Math.cos(a) * rr, Math.sin(a) * rr, gi]);
  }
});

/* stainless steel: ~1.8 m rings, each a slightly different sheet, with heat-tinted circumferential and staggered
   vertical welds; the grain of the rolled sheet runs round the booster */
function skinTex(rings, hgt) {
  const ring = [];
  for (let i = 0; i < rings; i++) ring.push(Math.random());
  const col = canvasTex(1024, hgt, (x, w, h) => {
    const rh = h / rings;
    for (let i = 0; i < rings; i++) {
      const v = 206 + ring[i] * 20;
      x.fillStyle = `rgb(${v | 0},${(v + 3) | 0},${(v + 7) | 0})`;
      x.fillRect(0, i * rh, w, rh + 1);
      for (let k = 0; k < 60; k++) {
        x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(60,64,70,.03)';
        x.fillRect(0, i * rh + Math.random() * rh, w, 1 + Math.random() * 2);
      }
      /* vertical seams, staggered ring to ring */
      const ns = 3;
      for (let j = 0; j < ns; j++) {
        const sx = ((j / ns + i * 0.37 + ring[i] * 0.1) % 1) * w;
        x.fillStyle = 'rgba(150,112,62,.22)';
        x.fillRect(sx - 3, i * rh, 6, rh);
        x.fillStyle = 'rgba(72,64,56,.4)';
        x.fillRect(sx - 0.6, i * rh, 1.2, rh);
      }
    }
    for (let i = 1; i < rings; i++) {
      const y = i * rh;
      x.fillStyle = 'rgba(160,118,64,.26)';
      x.fillRect(0, y - 4, w, 8);
      x.fillStyle = 'rgba(78,70,60,.45)';
      x.fillRect(0, y - 1, w, 2);
    }
    /* a few handling marks and discolorations */
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? 40 : 120},${Math.random() < 0.5 ? 40 : 110},${Math.random() < 0.5 ? 40 : 90},.07)`;
      x.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 60, 4 + Math.random() * 30);
    }
  });
  const rough = canvasTex(
    256,
    hgt / 4,
    (x, w, h) => {
      const rh = h / rings;
      for (let i = 0; i < rings; i++) {
        const v = 40 + ring[i] * 50;
        x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
        x.fillRect(0, i * rh, w, rh + 1);
      }
      x.fillStyle = 'rgb(150,150,150)';
      for (let i = 1; i < rings; i++) x.fillRect(0, i * rh - 1, w, 2);
    },
    false,
  );
  return [col, rough];
}

/* frost over the cryogenic tanks: thick over the oxygen tank, lighter over the methane tank, a clear band at the
   common dome, streaks where it runs and thins */
function frostTex(a0, a1, lox, ch4) {
  const H = 1024,
    row = (a) => ((a1 - a) / (a1 - a0)) * H;
  return canvasTex(
    512,
    H,
    (x, w) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, w, H);
      const band = ([lo, hi], a) => {
        for (let i = 0; i < w; i += 2) {
          const top = hi + Math.sin(i * 0.05) * 0.4 + Math.sin(i * 0.013 + 2) * 0.7 + (Math.random() - 0.5) * 0.5,
            bot = lo + Math.random() * 0.3;
          const g = x.createLinearGradient(0, row(top), 0, row(top) + 26);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(1, `rgba(255,255,255,${a})`);
          x.fillStyle = g;
          x.fillRect(i, row(top), 2, 26);
          x.fillStyle = `rgba(255,255,255,${a})`;
          x.fillRect(i, row(top) + 26, 2, row(bot) - row(top) - 26);
        }
      };
      band(lox, 0.66);
      band(ch4, 0.36);
      /* streaks and thin patches */
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 520; i++) {
        x.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.5})`;
        x.fillRect(Math.random() * w, Math.random() * H, 1 + Math.random() * 3, 20 + Math.random() * 160);
      }
      for (let i = 0; i < 60; i++) {
        const cx = Math.random() * w,
          cy = Math.random() * H,
          r = 6 + Math.random() * 26,
          g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(0,0,0,.6)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
      }
      x.globalCompositeOperation = 'source-over';
      /* frost builds up a little more along the circumferential welds */
      for (let a = AFT_H + 1.8; a < a1; a += 1.79) {
        x.fillStyle = 'rgba(255,255,255,.18)';
        x.fillRect(0, row(a) - 2, w, 4);
      }
    },
    false,
  );
}

export function buildBooster(E) {
  const full = new T.Group(),
    half = new T.Group();
  E.add(full, half);
  /* a part that is cut in half for the CUTAWAY: whole in `full`, the far half (local z <= 0) in `half` */
  const both = (prof, mat, seg) => {
    full.add(lathe(prof, mat, seg));
    half.add(lathe(prof, mat, Math.round(seg / 2), true));
  };

  /* ---------- skin ---------- */
  const top = BL - VENT_H,
    rings = Math.round((top - AFT_H) / 1.79),
    [skinC, skinR] = skinTex(rings, 2048);
  const skinM = std({
    color: 0xffffff,
    map: skinC,
    roughnessMap: skinR,
    metalness: 0.92,
    roughness: 1,
    side: T.DoubleSide,
  });
  CAT.set(skinM, 'case');
  both(
    [
      [BR, -AFT_H],
      [BR, -top],
    ],
    skinM,
    96,
  );
  /* aft skirt: the same steel, a little darker with soot and wear */
  const [aftC] = skinTex(2, 256);
  const aftM = std({ color: 0xb8b4ae, map: aftC, metalness: 0.85, roughness: 0.38, side: T.DoubleSide });
  CAT.set(aftM, 'case');
  both(
    [
      [BR - 0.35, 0.02],
      [BR - 0.05, -0.2],
      [BR, -0.45],
      [BR, -AFT_H],
    ],
    aftM,
    96,
  );
  /* frost over the tanks (the booster is full of subcooled propellant for the test) */
  const fa0 = AFT_H + 0.3,
    fa1 = 61,
    frostA = frostTex(fa0, fa1, [fa0, 34.6], [39.6, 57.5]),
    frostC = canvasTex(
      128,
      128,
      (x, w, h) => {
        x.fillStyle = '#eef3f7';
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) {
          const v = (205 + Math.random() * 50) | 0;
          x.fillStyle = `rgba(${v - 8},${v - 3},${v},.6)`;
          x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 3);
        }
      },
      true,
      [48, 40],
    );
  const frostM = std({
    color: 0xffffff,
    map: frostC,
    alphaMap: frostA,
    transparent: true,
    depthWrite: false,
    roughness: 0.82,
    metalness: 0,
    side: T.DoubleSide,
  });
  CAT.set(frostM, 'cryo');
  const fp = [
    [BR + 0.035, -fa0],
    [BR + 0.035, -fa1],
  ];
  const fF = lathe(fp, frostM, 96),
    fH = lathe(fp, frostM, 48, true);
  fF.castShadow = fH.castShadow = false;
  fF.renderOrder = fH.renderOrder = 1;
  full.add(fF);
  half.add(fH);

  /* ---------- vented hot-staging ring and forward dome on top ---------- */
  const ventA = canvasTex(
    1024,
    128,
    (x, w, h) => {
      x.fillStyle = '#fff';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#000';
      const n = 36,
        p = w / n;
      for (let i = 0; i < n; i++) {
        x.beginPath();
        x.moveTo(i * p + p * 0.18, h * 0.14);
        x.lineTo(i * p + p * 0.72, h * 0.14);
        x.lineTo(i * p + p * 0.86, h * 0.86);
        x.lineTo(i * p + p * 0.32, h * 0.86);
        x.closePath();
        x.fill();
      }
    },
    false,
  );
  const ventM = std({
    color: 0xaab0b6,
    alphaMap: ventA,
    alphaTest: 0.5,
    metalness: 0.85,
    roughness: 0.38,
    side: T.DoubleSide,
  });
  CAT.set(ventM, 'case');
  both(
    [
      [BR, -top],
      [BR, -(BL - 0.5)],
    ],
    ventM,
    96,
  );
  const darkM = std({ color: 0x24262a, metalness: 0.5, roughness: 0.7, side: T.DoubleSide });
  both(
    [
      [BR - 0.45, -top + 0.2],
      [BR - 0.45, -(BL - 0.5)],
    ],
    darkM,
    64,
  );
  /* forward dome, under its heat shield, seen from the drone */
  const dp = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    dp.push([Math.sin(a) * (BR - 0.45) + 0.001, -(top - 0.4) - Math.cos(a) * 2.6]);
  }
  dp.reverse();
  const domeM = std({ color: 0x4a4d52, metalness: 0.4, roughness: 0.6, side: T.DoubleSide });
  both(dp, domeM, 64);
  const lipG = new T.TorusGeometry(BR - 0.05, 0.16, 8, 96);
  lipG.rotateY(Math.PI / 2);
  const lip = new T.Mesh(lipG, MT.steel);
  lip.position.x = -(BL - 0.5);
  full.add(lip);
  for (const k of [0, 1]) {
    const band = lathe(
      [
        [BR + 0.04, -top - 0.02 - k * (VENT_H - 0.7)],
        [BR + 0.04, -top - 0.32 - k * (VENT_H - 0.7)],
      ],
      MT.steel,
      96,
    );
    full.add(band);
  }

  /* ---------- three grid fins in a 90/90/180 arrangement; the opposite pair carry the catch hardpoints ---------- */
  const latA = canvasTex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = '#fff';
      x.fillRect(0, 0, w, h);
      x.save();
      x.translate(w / 2, h / 2);
      x.rotate(Math.PI / 4);
      x.fillStyle = '#000';
      const c = 36;
      for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) x.fillRect(i * c + 3.5, j * c + 3.5, c - 7, c - 7);
      x.restore();
      x.strokeStyle = '#fff';
      x.lineWidth = 14;
      x.strokeRect(0, 0, w, h);
    },
    false,
  );
  const latM = std({
      color: 0x55595f,
      alphaMap: latA,
      alphaTest: 0.5,
      metalness: 0.7,
      roughness: 0.5,
      side: T.DoubleSide,
    }),
    finFrameM = std({ color: 0x3a3d42, metalness: 0.65, roughness: 0.5 });
  CAT.set(latM, 'case');
  CAT.set(finFrameM, 'case');
  const finA = -(BL - VENT_H - 4.2),
    FR = 4.4,
    FW = 3.6,
    FT = 1.0;
  [0, Math.PI / 2, Math.PI].forEach((a, k) => {
    const fin = new T.Group();
    fin.position.set(finA, 0, 0);
    fin.rotation.x = a;
    /* lattice faces the airflow (along the booster); thin plates frame its four edges */
    const lat = new T.Mesh(new T.BoxGeometry(FT, FR, FW), [latM, latM, finFrameM, finFrameM, finFrameM, finFrameM]);
    lat.position.y = BR + 0.35 + FR / 2;
    lat.castShadow = true;
    fin.add(lat);
    fin.add(box(FT + 0.5, 1.3, 1.8, finFrameM, 0, BR + 0.4, 0));
    if (k != 1) {
      const hp = box(1.2, 1.0, 1.4, finFrameM, 1.6, BR + 0.5, 0);
      fin.add(hp);
    }
    /* the fin facing the SIDE camera is on the half the CUTAWAY removes */
    (a == Math.PI / 2 ? full : E).add(fin);
  });

  /* ---------- cable raceway down the far side ---------- */
  const rwA = -Math.PI / 2 + 0.55;
  for (const g of [full, half]) {
    const rw = box(top - AFT_H - 1.5, 0.32, 0.7, MT.dark);
    rw.position.set(-(AFT_H + top) / 2 - 0.4, Math.cos(rwA) * (BR + 0.16), Math.sin(rwA) * (BR + 0.16));
    rw.rotation.x = rwA;
    g.add(rw);
  }

  /* ---------- inside (CUTAWAY): oxygen tank below, methane tank above, common dome, downcomer ---------- */
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
  half.add(
    pipe(
      [
        [-37, 0, 0],
        [-20, 0, 0],
        [-2.6, 0, 0],
      ],
      0.45,
      MT.steel,
      16,
    ),
  );

  /* ---------- aft heat shield with the engine openings ---------- */
  const SR = BR - 0.3;
  const shT = canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#3b3e43';
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      const v = (40 + Math.random() * 40) | 0;
      x.fillStyle = `rgba(${v},${v},${v + 4},.5)`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (const [y, z] of ENGINES) {
      const px = (-z / (2 * SR) + 0.5) * w,
        py = (1 - (y / (2 * SR) + 0.5)) * h;
      x.fillStyle = '#121315';
      x.beginPath();
      x.arc(px, py, (0.64 / (2 * SR)) * w, 0, 6.283);
      x.fill();
      x.strokeStyle = 'rgba(150,150,155,.5)';
      x.lineWidth = 3;
      x.stroke();
    }
  });
  const shG = new T.CircleGeometry(SR, 96);
  shG.rotateY(Math.PI / 2);
  const shield = new T.Mesh(shG, std({ map: shT, metalness: 0.3, roughness: 0.75 }));
  shield.position.x = 0.03;
  shield.receiveShadow = true;
  E.add(shield);

  /* ---------- 33 Raptor 3 bells (one draw call per group, so each group can glow on its own) ---------- */
  const bellT = canvasTex(
    16,
    256,
    (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      [
        [0, '#c9c3b8'],
        [0.06, '#8d9095'],
        [0.4, '#6f6a66'],
        [0.7, '#5d5048'],
        [0.88, '#4c4a5c'],
        [1, '#3a3940'],
      ].forEach(([s, c]) => g.addColorStop(s, c));
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    },
    true,
  );
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    prof.push(new T.Vector2(0.28 + (1 - 0.28) * (1 - Math.pow(1 - t, 1.9)), t * BELL));
  }
  const ex = [0.62, 0.62, 0.58];
  const M4 = new T.Matrix4(),
    q = new T.Quaternion(),
    glowM = [],
    bells = [];
  RINGS.forEach(([n], gi) => {
    const g = new T.LatheGeometry(
      prof.map((p) => new T.Vector2(p.x * ex[gi], p.y)),
      28,
    );
    g.rotateZ(-Math.PI / 2);
    const m = std({
      color: 0xffffff,
      map: bellT,
      metalness: 0.85,
      roughness: 0.36,
      side: T.DoubleSide,
      emissive: new T.Color(1, 0.42, 0.14),
      emissiveIntensity: 0,
    });
    CAT.set(m, 'bell');
    glowM.push(m);
    const im = new T.InstancedMesh(g, m, n);
    let k = 0;
    ENGINES.forEach(([y, z, gg]) => {
      if (gg != gi) return;
      M4.compose(V3(0, y, z), q, V3(1, 1, 1));
      im.setMatrixAt(k++, M4);
    });
    im.castShadow = true;
    E.add(im);
    bells.push(im);
  });
  /* the white-hot throat seen up inside each bell */
  const thG = new T.CircleGeometry(0.3, 20);
  thG.rotateY(Math.PI / 2);
  const throat = new T.InstancedMesh(thG, new T.MeshBasicMaterial({ color: 0xffffff }), ENGINES.length);
  ENGINES.forEach(([y, z], i) => {
    M4.compose(V3(0.35, y, z), q, V3(1, 1, 1));
    throat.setMatrixAt(i, M4);
    throat.setColorAt(i, new T.Color(0, 0, 0));
  });
  throat.userData.pt = 1;
  E.add(throat);

  return {
    full,
    half,
    glowM,
    top,
    finA,
    /* per group: lit fraction e[k], throttle t */
    upd(e, t) {
      glowM.forEach((m, k) => (m.emissiveIntensity = e[k] * (0.12 + 0.25 * t)));
      const c = new T.Color();
      ENGINES.forEach(([, , g], i) => {
        const v = e[g];
        throat.setColorAt(i, c.setRGB(v * (5 + 4 * t), v * (3.2 + 3 * t), v * (2.4 + 2.6 * t)));
      });
      throat.instanceColor.needsUpdate = true;
    },
  };
}
