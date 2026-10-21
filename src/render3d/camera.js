// Camera: smooth glide between presets, drag to orbit, wheel to zoom, shake.
import { M3 } from '../machines/three.js';
import * as T from 'three';
import { state } from '../core/state.js';
import { SHAKE, cv } from '../core/util.js';
import { k3 } from './context.js';
import { V3, cam } from './kit.js';
import { CFG } from './machine.js';

// assigned by create*() below, when init3D runs
export let cP, cT, tmp, sph, SH, LK;

export function createCamera() {
  /* ======================= camera: smooth glide between presets, drag to orbit, wheel to zoom, shake ======================= */
  k3.yaw = 0;
  k3.pit = 0;
  k3.zoom = 1;
  k3.camSnap = true;
  k3.dragC = null;
  cP = V3();
  cT = V3();
  tmp = V3();
  sph = new T.Spherical();
  SH = V3();
  LK = V3();
  cv.addEventListener('pointerdown', (e) => {
    const r = state.SWR;
    if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) return;
    k3.dragC = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  cv.addEventListener('pointermove', (e) => {
    if (!k3.dragC || e.pointerId !== k3.dragC.id) return;
    k3.yaw -= (e.clientX - k3.dragC.x) * 0.006;
    k3.pit += (e.clientY - k3.dragC.y) * 0.005;
    k3.pit = Math.max(-0.5, Math.min(0.9, k3.pit));
    k3.yaw = Math.max(-2.2, Math.min(2.2, k3.yaw));
    k3.dragC.x = e.clientX;
    k3.dragC.y = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach((n) => cv.addEventListener(n, () => (k3.dragC = null)));
  cv.addEventListener('dblclick', () => {
    k3.yaw = k3.pit = 0;
    k3.zoom = 1;
  });
  cv.addEventListener(
    'wheel',
    (e) => {
      k3.zoom = Math.max(0.55, Math.min(1.9, k3.zoom * Math.exp(e.deltaY * 0.001)));
      e.preventDefault();
    },
    { passive: false },
  );
  k3.lastView = -1;
}

/* DRONE view: high above the machine, about 60° down, slowly circling (one orbit in ~105 s of sim time).
   Defaults come from the SIDE preset; a machine can tune it with cfg.drone {t: target, d: distance, el: elevation
   in radians, hw: half-width to keep in frame}. */
function droneCam() {
  const cf = CFG[state.mi],
    sd = cf.cams[0],
    o = cf.drone || {},
    t = o.t || sd[1],
    hw = o.hw || sd[2] * 1.6,
    d = o.d || hw * 3.2,
    el = o.el || 1.05,
    az = Math.atan2(sd[0][2] - sd[1][2], sd[0][0] - sd[1][0]) + state.simT * 0.06;
  return [
    [t[0] + Math.cos(el) * Math.cos(az) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(el) * Math.sin(az) * d],
    t,
    hw,
  ];
}

export function camera(dr) {
  const c = state.view == 4 ? droneCam() : CFG[state.mi].cams[state.view];
  if (state.view !== k3.lastView) {
    k3.lastView = state.view;
    k3.yaw = k3.pit = 0;
    k3.zoom = 1;
  }
  const P0 = V3(...c[0]),
    T0 = V3(...c[1]);
  if (M3[state.mi].cam) M3[state.mi].cam(P0, T0);
  if (state.M.camA) {
    const a = state.M.camA(state.view);
    P0.y += a[0];
    T0.y += a[1];
    if (a[2]) P0.sub(T0).multiplyScalar(a[2]).add(T0);
  } else if (state.M.hover) {
    P0.y += state.alt * 0.85;
    T0.y += state.alt;
  }
  const dir = P0.clone().sub(T0),
    d0 = dir.length(),
    tanH = Math.tan((cam.fov * Math.PI) / 360) * cam.aspect;
  /* portrait phones: swing the jets round to a rear three-quarter view so engine and flame stack in depth instead of running off the sides */
  const port = cam.aspect < 0.85 && !!M3[state.mi].portrait,
    hw = c[2] * (port ? (state.view == 0 ? 0.42 : 0.7) : 1);
  const dist = Math.min(d0 * 2.6, Math.max(d0, hw / tanH)) * k3.zoom;
  sph.setFromVector3(dir);
  sph.radius = dist;
  sph.theta += k3.yaw + (port && state.view == 0 ? 0.72 : 0);
  sph.phi = Math.max(0.15, Math.min(1.75, sph.phi - k3.pit));
  tmp.setFromSpherical(sph).add(T0);
  if (!CFG[state.mi].space && tmp.y < 0.35) tmp.y = 0.35;
  const k = k3.camSnap ? 1 : 1 - Math.exp(-dr * (k3.dragC ? 14 : 3.2));
  cP.lerp(tmp, k);
  cT.lerp(T0, k);
  k3.camSnap = false;
  const s = SHAKE * state.M.shk() * 0.0026 * (state.view == 1 ? 0.6 : 1),
    t = state.simT;
  /* Shake moves the camera and its aim point together: a pure sideways jolt, like a camera on a vibrating stand.
     Re-aiming at a fixed point turned each jolt into a small rotation, which made distant scenery jump and flicker. */
  SH.set(
    (Math.sin(t * 191) + Math.sin(t * 313 + 1.3)) * s,
    (Math.sin(t * 227 + 0.4) + Math.sin(t * 359 + 2.1)) * s,
    Math.sin(t * 263 + 0.8) * s,
  );
  cam.position.copy(cP).add(SH);
  cam.lookAt(LK.copy(cT).add(SH));
}
