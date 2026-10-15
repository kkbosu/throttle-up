// Lights: hemisphere, sun (shadows), flame point light, two flood lights.
import * as T from 'three';
import { V3, scn } from './kit.js';

// assigned by create*() below, when init3D runs
export let hemi, sun, flame, floods;

export function createLights() {
  /* ---------------- lights ---------------- */
  hemi = new T.HemisphereLight(0xffffff, 0x444444, 0.5);
  sun = new T.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.03;
  scn.add(hemi, sun, sun.target);
  flame = new T.PointLight(0xffa060, 0, 90, 2);
  scn.add(flame);
  floods = [V3(-12, 10.8, 9), V3(13, 10.8, 8)].map((p) => {
    const l = new T.SpotLight(0xffd6a0, 0, 0, 0.55, 0.7, 2);
    l.position.copy(p);
    scn.add(l, l.target);
    return l;
  });
}
