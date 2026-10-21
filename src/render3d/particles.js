// Particles: instanced pools (sparks, smoke/steam/dust, fire, flow tracers), emitters, fire puffs.
import { M3 } from '../machines/three.js';
import * as T from 'three';
import { state } from '../core/state.js';
import { sm } from '../core/util.js';
import { ENG } from './builders.js';
import { k3 } from './context.js';
import { V3, rnd, scn } from './kit.js';
import { flame } from './lights.js';

// assigned by create*() below, when init3D runs
export let SPK, SMK, FIR, FLW, W3, AX;

export function createParticles() {
  SPK = Pool(400, 0);
  SMK = Pool(420, 1);
  FIR = Pool(200, 0, 0);
  FLW = Pool(700, 0, 0.03);
}

export function createParticles2() {
  /* ======================= particle emitters ======================= */
  W3 = V3();
  AX = V3();
  k3.steamAcc = 0;
  k3.sparkAcc = 0;
  k3.sootAcc = 0;
}

/* ======================= particles: camera-facing quads, streaked along velocity for sparks ======================= */
export function Pool(max, smoke, str) {
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const aP = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3),
    aV = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3),
    aS = new T.InstancedBufferAttribute(new Float32Array(max * 2), 2),
    aC = new T.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  [aP, aV, aS, aC].forEach((a) => a.setUsage(T.DynamicDrawUsage));
  g.setAttribute('iP', aP);
  g.setAttribute('iV', aV);
  g.setAttribute('iS', aS);
  g.setAttribute('iC', aC);
  g.instanceCount = 0;
  const u = {
    uStr: { value: smoke ? 0 : str == null ? 0.012 : str },
    uAmb: { value: new T.Color() },
    uLit: { value: new T.Color() },
    uFP: { value: V3() },
    uFC: { value: new T.Color() },
  };
  const m = new T.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: smoke ? T.NormalBlending : T.AdditiveBlending,
    vertexShader: `attribute vec3 iP,iV;attribute vec2 iS;attribute vec4 iC;uniform float uStr;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  void main(){vec4 vp=viewMatrix*vec4(iP,1.);vec2 c=position.xy;vec3 vv=(viewMatrix*vec4(iV,0.)).xyz;float l=length(vv.xy)*uStr;vec2 d=l>1e-5?normalize(vv.xy):vec2(1.,0.),nn=vec2(-d.y,d.x);
   vp.xy+=d*c.x*(iS.x+l)+nn*c.y*iS.x;gl_Position=projectionMatrix*vp;vU=c;vC=iC;vSd=iS.y;vWP=iP;}`,
    fragmentShader: smoke
      ? `uniform vec3 uAmb,uLit,uFC,uFP;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
  void main(){float r=length(vU);if(r>1.)discard;vec2 q=vU*1.7+vSd*13.;float n=n2(q)*.55+n2(q*2.4+3.)*.3+n2(q*5.)*.15;
   float a=smoothstep(1.,.15,r+.75*(n-.5))*vC.a;float sh=.25+.9*(vU.y*.5+.5)+.4*(n-.5);float fd=length(vWP-uFP);
   vec3 c=vC.rgb*(uAmb+uLit*sh)+vC.rgb*uFC/(1.+fd*fd*.05);gl_FragColor=vec4(c,a);}`
      : `varying vec2 vU;varying vec4 vC;void main(){float r=length(vU);float a=1.-smoothstep(0.,1.,r);gl_FragColor=vec4(vC.rgb,vC.a*a*a);}`,
  });
  const mesh = new T.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = smoke ? 2 : 3;
  mesh.userData.pt = 1;
  scn.add(mesh);
  const L = [];
  return {
    L,
    u,
    mesh,
    add(p) {
      if (L.length < max) L.push(p);
    },
    clear() {
      L.length = 0;
    },
    upd(dt, f) {
      let n = 0;
      const P = aP.array,
        Vv = aV.array,
        S = aS.array,
        C = aC.array;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.a += dt;
        if (p.a >= p.l) {
          L[i] = L[L.length - 1];
          L.pop();
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const k = f(p, dt);
        if (!k) continue;
        P[n * 3] = p.x;
        P[n * 3 + 1] = p.y;
        P[n * 3 + 2] = p.z;
        Vv[n * 3] = p.vx;
        Vv[n * 3 + 1] = p.vy;
        Vv[n * 3 + 2] = p.vz;
        S[n * 2] = k[0];
        S[n * 2 + 1] = p.sd;
        C[n * 4] = k[1];
        C[n * 4 + 1] = k[2];
        C[n * 4 + 2] = k[3];
        C[n * 4 + 3] = k[4];
        n++;
      }
      g.instanceCount = n;
      [aP, aV, aS, aC].forEach((a) => (a.needsUpdate = true));
    },
  };
}
export function axisPt(d, r, a) {
  /* world point at distance d downstream of the exit, radius r, angle a */ const e = ENG[state.mi].anchor;
  W3.set(d, Math.cos(a) * r, Math.sin(a) * r);
  return e.localToWorld(W3);
}
export function axisDir() {
  const e = ENG[state.mi].anchor,
    o = e.localToWorld(V3(0, 0, 0));
  return e
    .localToWorld(V3(1, 0, 0))
    .sub(o)
    .normalize();
}
export function emitters(dt) {
  const ax = axisDir();
  M3[state.mi].emit(dt, ax);
}
export function updParticles(dt, lc, li) {
  const s = k3.curP,
    a = SMK.u;
  a.uAmb.value
    .set(s.hG)
    .multiplyScalar(s.hI * 0.35)
    .add(new T.Color(s.hS).multiplyScalar(s.hI * 0.4));
  a.uLit.value.setRGB(...s.sunC).multiplyScalar(s.sunL * 0.35);
  a.uFC.value.setRGB(...lc).multiplyScalar(li * 0.012);
  a.uFP.value.copy(flame.position);
  SPK.upd(dt, (p, dt) => {
    p.vy -= 9.8 * dt * (p.k ? 1 : 0.25);
    const f = p.a / p.l;
    return p.k ? [0.05, 12, 8, 4.5, 1 - f] : [0.035, 9, 4, 1.2, (1 - f) * 0.9];
  });
  SMK.upd(dt, (p, dt) => {
    const f = p.a / p.l;
    p.vx *= Math.exp(-dt * (p.k == 2 || p.k == 6 ? 0.35 : p.k == 7 ? 1.6 : p.k == 8 ? 0.7 : 0.8));
    p.vz *= p.k == 7 ? Math.exp(-dt * 1.6) : p.k == 8 ? Math.exp(-dt * 0.3) : 1;
    p.vz *= Math.exp(-dt * 0.6);
    p.vy += dt * (p.k == 2 ? 1.2 : p.k == 8 ? -0.2 : p.k == 9 ? -0.6 : 0.6);
    p.vy *= Math.exp(-dt * 0.3);
    const sz = p.s0 + (p.s1 - p.s0) * Math.pow(f, 0.55),
      fa = Math.min(1, f * 8) * (1 - f);
    /* k 9: cold vapour off a frosted tank, sinking */
    return p.k == 9
      ? [sz, 0.93, 0.95, 0.98, fa * 0.3]
      : p.k == 8
        ? [sz, 0.52, 0.33, 0.2, fa * 0.42]
        : p.k == 6
          ? [sz, 0.32, 0.26, 0.2, fa * 0.5]
          : p.k == 7
            ? [sz, 0.62, 0.55, 0.44, fa * 0.38]
            : p.k == 1
              ? [sz, 0.06, 0.055, 0.05, fa * 0.7]
              : p.k == 2
                ? [sz, 0.92, 0.93, 0.95, fa * 0.5]
                : [sz, 0.9, 0.92, 0.95, fa * 0.22];
  });
}
/* ======================= fire puffs: compressor-stall fireballs, light-off flash ======================= */
export function burst(n, big) {
  if (!M3[state.mi].burst) return;
  const ax = axisDir();
  for (let i = 0; i < n; i++) {
    const p = axisPt(rnd(0, 0.6), rnd(0, 0.25), rnd(0, 6.3)),
      s = rnd(6, 18) * (big ? 1 : 0.6);
    FIR.add({
      x: p.x,
      y: p.y,
      z: p.z,
      vx: ax.x * s + rnd(-1.5, 1.5),
      vy: ax.y * s + rnd(-0.5, 2),
      vz: ax.z * s + rnd(-1.5, 1.5),
      a: 0,
      l: rnd(0.35, 0.8) * (big ? 1 : 0.7),
      sd: Math.random(),
      s0: big ? 0.35 : 0.25,
      s1: big ? rnd(1.4, 2.4) : rnd(0.8, 1.4),
    });
  }
}
