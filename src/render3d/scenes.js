// Scene presets (DUSK/DAY/NIGHT, space, Mars) and applying them; sun placement.
import * as T from 'three';
import { state } from '../core/state.js';
import { k3 } from './context.js';
import { earthU } from './earth.js';
import { mountMat } from './ground.js';
import { R, V3, col, scn } from './kit.js';
import { floods, hemi, sun } from './lights.js';
import { CFG } from './machine.js';
import { envScn, pm, skyU } from './sky.js';

// assigned by create*() below, when init3D runs
export let SCN, SCNS, SCNM, sKey;

export function createScenes() {
  SCN = [
    {
      n: 'DUSK',
      zen: [0.03, 0.055, 0.13],
      hor: [0.78, 0.43, 0.24],
      gnd: [0.36, 0.25, 0.19],
      sun: [0.52, 0.07, -0.85],
      sunC: [1, 0.55, 0.28],
      sunI: 1.6,
      sunL: 2.6,
      hS: 0x7080a8,
      hG: 0x5a3c2c,
      hI: 0.65,
      exp: 0.85,
      fog: 0.00042,
      stars: 0,
      fl: 0,
    },
    {
      n: 'DAY',
      zen: [0.1, 0.24, 0.6],
      hor: [0.62, 0.72, 0.84],
      gnd: [0.62, 0.55, 0.45],
      sun: [-0.42, 0.74, 0.52],
      sunC: [1, 0.95, 0.86],
      sunI: 1.2,
      sunL: 3.4,
      hS: 0x9ab4e0,
      hG: 0x8a7a62,
      hI: 0.9,
      exp: 0.62,
      fog: 0.00028,
      stars: 0,
      fl: 0,
    },
    {
      n: 'NIGHT',
      zen: [0.002, 0.003, 0.009],
      hor: [0.012, 0.018, 0.035],
      gnd: [0.004, 0.004, 0.005],
      sun: [0.35, 0.6, -0.72],
      sunC: [0.5, 0.6, 1],
      sunI: 0,
      sunL: 0.18,
      hS: 0x2a3550,
      hG: 0x0a0a0c,
      hI: 0.35,
      exp: 1.15,
      fog: 0.0006,
      stars: 1,
      fl: 1,
    },
  ];
  SCNS = [
    {
      n: 'TERMINATOR',
      zen: [0, 0, 0],
      hor: [0, 0, 0],
      gnd: [0.03, 0.07, 0.16],
      sun: [0.86, 0.1, -0.5],
      sunC: [1, 0.97, 0.92],
      sunI: 1.4,
      sunL: 2.3,
      hS: 0x000000,
      hG: 0x2a4a80,
      hI: 0.3,
      exp: 0.78,
      fog: 0,
      stars: 1.2,
      fl: 0,
    },
    {
      n: 'SUNLIT',
      zen: [0, 0, 0],
      hor: [0, 0, 0],
      gnd: [0.05, 0.1, 0.22],
      sun: [-0.42, 0.72, 0.55],
      sunC: [1, 0.97, 0.92],
      sunI: 1.4,
      sunL: 2.3,
      hS: 0x000000,
      hG: 0x3a5a90,
      hI: 0.4,
      exp: 0.8,
      fog: 0,
      stars: 1,
      fl: 0,
    },
    {
      n: 'ECLIPSE',
      zen: [0, 0, 0],
      hor: [0, 0, 0],
      gnd: [0.004, 0.006, 0.012],
      sun: [-0.15, -0.97, 0.2],
      sunC: [1, 0.97, 0.92],
      sunI: 0,
      sunL: 0,
      hS: 0x000000,
      hG: 0x0a0f1a,
      hI: 0.12,
      exp: 1.1,
      fog: 0,
      stars: 1.4,
      fl: 0,
    },
  ];
  /* Mars: butterscotch dusty sky by day; around the setting Sun the dust scatters blue light forward, so the glow there is blue */
  SCNM = [
    {
      n: 'MIDDAY',
      zen: [0.36, 0.25, 0.17],
      hor: [0.8, 0.6, 0.43],
      gnd: [0.5, 0.33, 0.22],
      sun: [-0.3, 0.85, 0.42],
      sunC: [1, 0.93, 0.84],
      sunI: 0.9,
      sunL: 2.5,
      hS: 0xc89a70,
      hG: 0x7a4a30,
      hI: 0.75,
      exp: 0.68,
      fog: 0.00045,
      stars: 0,
      fl: 0,
    },
    {
      n: 'AFTERNOON',
      zen: [0.28, 0.19, 0.13],
      hor: [0.72, 0.5, 0.34],
      gnd: [0.45, 0.29, 0.19],
      sun: [0.62, 0.36, -0.68],
      sunC: [1, 0.85, 0.68],
      sunI: 0.9,
      sunL: 2.3,
      hS: 0xa87a58,
      hG: 0x6a3e28,
      hI: 0.65,
      exp: 0.76,
      fog: 0.0005,
      stars: 0,
      fl: 0,
    },
    {
      n: 'SUNSET',
      zen: [0.03, 0.028, 0.034],
      hor: [0.24, 0.16, 0.115],
      gnd: [0.12, 0.08, 0.06],
      sun: [-0.3, 0.07, -0.95],
      sunC: [0.78, 0.74, 0.72],
      glow: [0.3, 0.5, 1.1],
      sunI: 1.5,
      sunL: 0.85,
      hS: 0x4a4c60,
      hG: 0x2a1a14,
      hI: 0.5,
      exp: 1.05,
      fog: 0.0006,
      stars: 0.25,
      fl: 0,
    },
  ];
  sKey = (s) => (CFG[state.mi].space ? 3 : CFG[state.mi].mars ? 6 : 0) + s;
  k3.curS = -1;
  k3.curP = SCN[0];
}

export function applyScene(s) {
  const sp = !!(CFG[state.mi] && CFG[state.mi].space),
    mr = !!(CFG[state.mi] && CFG[state.mi].mars),
    c = (sp ? SCNS : mr ? SCNM : SCN)[s];
  k3.curS = sKey(s);
  k3.curP = c;
  skyU.uSpace.value = sp ? 1 : 0;
  skyU.uZen.value.set(...c.zen);
  skyU.uHor.value.set(...c.hor);
  skyU.uGnd.value.set(...c.gnd);
  skyU.uSun.value.set(...c.sun).normalize();
  skyU.uSunC.value.set(...(c.glow || c.sunC));
  skyU.uSunI.value = c.sunI;
  skyU.uStars.value = c.stars;
  scn.fog = sp ? null : new T.FogExp2(col(...c.hor), c.fog);
  earthU.uSun.value.set(...c.sun).normalize();
  sun.color.setRGB(...c.sunC);
  sun.intensity = c.sunL;
  hemi.color.set(c.hS);
  hemi.groundColor.set(c.hG);
  hemi.intensity = c.hI;
  floods.forEach((l) => {
    l.intensity = c.fl * 320;
    l.visible = !!c.fl;
  });
  R.toneMappingExposure = c.exp;
  if (k3.envRT) k3.envRT.dispose();
  k3.envRT = pm.fromScene(envScn, 0.02, 0.1, 200);
  scn.environment = k3.envRT.texture;
  mountMat.color.setRGB(c.hor[0] * 0.55, c.hor[1] * 0.55, c.hor[2] * 0.6);
  placeSun();
}
export function placeSun() {
  const c = CFG[state.mi] || CFG[0],
    d = V3(...k3.curP.sun).normalize();
  sun.position.set(...c.sc).addScaledVector(d, c.shD || 60);
}
