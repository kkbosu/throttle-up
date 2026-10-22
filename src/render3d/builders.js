// Builds every machine's 3D model in machine order (the builders live in src/machines/<name>/three.js).
import { isolated, pscn, scn } from './kit.js';
import { mergeStatic } from './merge.js';
import { M3 } from '../machines/three.js';
import { NOMERGE } from '../core/params.js';

// assigned by create*() below, when init3D runs
export let ENG;

export function createBuilders() {
  ENG = M3.map((m) => m.build());
  /* merge each machine's static meshes (its build() lists the parts it moves in keep); in its own random sequence,
     so the UUIDs of the new meshes don't shift the numbers drawn by everything created after */
  if (!NOMERGE) isolated(() => ENG.forEach((e) => mergeStatic(e.G, e.keep)), 0x3e6e);
  ENG.forEach((e) => {
    scn.add(e.G);
    e.G.visible = false;
    /* P: a machine's own volumes for the plume pass (Starship's trench flame), shown only while it is selected */
    if (e.P) {
      pscn.add(e.P);
      e.P.visible = false;
    }
  });
}
