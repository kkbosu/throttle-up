// Per-machine configuration (plume box, shadow area, camera presets, ground type) and switching machines.
import { M3 } from '../machines/three.js';
import { state } from '../core/state.js';
import { ENG } from './builders.js';
import { k3 } from './context.js';
import { earth } from './earth.js';
import { gMat, grassC, ground, lakeC, lakeN, marsC, marsN, mountains, rocks, trees } from './ground.js';
import { floods, sun } from './lights.js';
import { SMK, SPK } from './particles.js';
import { setPlumeBox } from './plume.js';
import { placeSun } from './scenes.js';

// assigned by create*() below, when init3D runs
export let CFG;

export function createMachine() {
  /* ======================= per-machine configuration ======================= */
  /* camera presets per view: [position, target, half-width that must stay in frame] */
  CFG = M3.map((m) => m.cfg);
}

export function applyMachine() {
  k3.MA = state.mi;
  ENG.forEach((e, i) => (e.G.visible = i == state.mi));
  const c = CFG[state.mi];
  setPlumeBox(c.box[0], c.box[1]);
  /* land: the machine builds its own ground and horizon (Starbase) */
  mountains.visible = (!!c.mt || !!c.mars) && !c.space && !c.land;
  trees.visible = !c.mt && !c.space && !c.mars && !c.land;
  rocks.visible = !!c.mars;
  ground.visible = !c.space && !c.land;
  earth.visible = !!c.space;
  k3.curS = -1;
  gMat.map = c.mars ? marsC : c.mt ? lakeC : grassC;
  gMat.normalMap = c.mars ? marsN : c.mt ? lakeN : null;
  gMat.needsUpdate = true;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -c.sh;
  sc.right = sc.top = c.sh;
  sc.near = 1;
  sc.far = c.shF || 120;
  sc.updateProjectionMatrix();
  sun.target.position.set(...c.sc);
  placeSun();
  floods.forEach((l) => l.target.position.set(...c.sc));
  SPK.clear();
  SMK.clear();
  k3.camSnap = true;
  k3.yaw = k3.pit = 0;
  k3.zoom = 1;
}
