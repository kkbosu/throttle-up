// Lens passes: thermal (temperature into the red channel) and schlieren (black silhouettes on grey).
import { M3 } from '../machines/three.js';
import * as T from 'three';
import { state } from '../core/state.js';
import { k3 } from './context.js';
import { CAT, R, V3, cam, scn } from './kit.js';
import { flame } from './lights.js';
import { CFG } from './machine.js';
import { PU } from './plume.js';
import { sky } from './sky.js';

// assigned by create*() below, when init3D runs
export let thV, thF, mkTh, TH, SIL;

export function createLenses() {
  /* ======================= lens passes: thermal (temperature into the red channel) and schlieren (black silhouettes on grey) ======================= */
  thV = `varying vec3 vW;void main(){vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
vec4 w=modelMatrix*p;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
  thF = `uniform float uBase,uGain,uX0,uX1,uFH,uFR;uniform mat4 uInvE;uniform vec3 uFP;varying vec3 vW;
void main(){vec3 l=(uInvE*vec4(vW,1.)).xyz;float t=uBase+uGain*smoothstep(uX0,uX1,l.x),d=length(vW-uFP);t+=uFH*exp(-d*d/(uFR*uFR));gl_FragColor=vec4(t*.001,0.,0.,1.);}`;
  mkTh = () =>
    new T.ShaderMaterial({
      uniforms: {
        uBase: { value: 20 },
        uGain: { value: 0 },
        uX0: { value: 0 },
        uX1: { value: 1 },
        uFH: { value: 0 },
        uFR: { value: 5 },
        uInvE: { value: new T.Matrix4() },
        uFP: { value: V3() },
      },
      vertexShader: thV,
      fragmentShader: thF,
      side: T.DoubleSide,
    });
  TH = { cold: mkTh(), gnd: mkTh(), sky: mkTh(), case: mkTh(), hot: mkTh(), inner: mkTh(), bell: mkTh(), cryo: mkTh() };
  SIL = new T.MeshBasicMaterial({ color: 0x000000, side: T.DoubleSide });
  TH.sky.depthWrite = false;
  k3.thList = null;
}

export function thSet(m, b, g = 0, x0 = 0, x1 = 1, fh = 0, fr = 5) {
  const u = m.uniforms;
  u.uBase.value = b;
  u.uGain.value = g;
  u.uX0.value = x0;
  u.uX1.value = x1;
  u.uFH.value = fh;
  u.uFR.value = fr;
  u.uInvE.value.copy(PU.uInv.value);
  u.uFP.value.copy(flame.position);
}
export function thermalU() {
  const amb = CFG[state.mi].space
      ? [5, 20, -60][state.scene]
      : CFG[state.mi].mars
        ? [-20, -5, -45][state.scene]
        : [24, 38, 14][state.scene],
    nn = state.N * state.fu,
    fh = M3[state.mi].thFh ? M3[state.mi].thFh(nn) : nn * 190 + state.ign * 90;
  thSet(TH.cold, amb, 0, 0, 1, fh * 0.55, M3[state.mi].thR ? M3[state.mi].thR[0] : 7);
  thSet(TH.gnd, amb + (state.scene == 1 ? 10 : 0), 0, 0, 1, fh, M3[state.mi].thR ? M3[state.mi].thR[1] : 8);
  thSet(TH.sky, -40);
  M3[state.mi].thermal(amb, nn, fh);
  thSet(TH.cryo, state.ph ? -150 : amb);
}
export function lensRender() {
  if (!k3.thList) {
    k3.thList = [];
    scn.traverse((o) => {
      if (o.isMesh) k3.thList.push(o);
    });
  }
  const sch = state.lens == 1,
    keep = [];
  if (!sch) thermalU();
  for (const o of k3.thList) {
    keep.push(o.material, o.visible);
    if (o.userData.pt) {
      o.visible = false;
      continue;
    }
    if (sch) {
      if (o.userData.bg) o.visible = false;
      else o.material = SIL;
    } else o.material = o === sky ? TH.sky : TH[CAT.get(o.material) || 'cold'];
  }
  R.setClearColor(sch ? new T.Color(0.2, 0.2, 0.2) : new T.Color(0, 0, 0), 1);
  R.clear();
  R.render(scn, cam);
  let k = 0;
  for (const o of k3.thList) {
    o.material = keep[k++];
    o.visible = keep[k++];
  }
}
