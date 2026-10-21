// STARSHIP: the 33 individual Raptor exhaust jets below the bells, before they merge and hit the flame bucket.
// Each jet is a flared open cylinder drawn additively: a translucent violet core, bright shock diamonds on the axis and
// an orange fringe where it mixes with air. The merged column further down is the shared ray-marched plume.
import * as T from 'three';
import { V3 } from '../../render3d/kit.js';

export const JL = 15; // jet length drawn, metres

export function buildJets(E, engines, bell, exitR) {
  const g = new T.CylinderGeometry(2.1, 1, 1, 24, 6, true);
  g.translate(0, 0.5, 0);
  g.rotateZ(-Math.PI / 2);
  const n = engines.length,
    aG = new Float32Array(n),
    aSd = new Float32Array(n);
  engines.forEach(([, , gi], i) => {
    aG[i] = gi;
    aSd[i] = (i * 0.618) % 1;
  });
  g.setAttribute('aG', new T.InstancedBufferAttribute(aG, 1));
  g.setAttribute('aSd', new T.InstancedBufferAttribute(aSd, 1));
  const u = {
    uT: { value: 0 },
    uI: { value: 0 },
    uDia: { value: 0 },
    uCut: { value: 1 },
    uW: { value: [0, 0, 0] },
  };
  const m = new T.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    vertexShader: `attribute float aG,aSd;varying float vS,vF,vG,vSd;
 void main(){mat4 mw=modelViewMatrix*instanceMatrix;vec4 mv=mw*vec4(position,1.);
  vec3 n=normalize(mat3(mw)*vec3(0.,position.y,position.z));vF=abs(dot(n,normalize(-mv.xyz)));
  vS=position.x;vG=aG;vSd=aSd;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uT,uI,uDia,uCut;uniform float uW[3];varying float vS,vF,vG,vSd;
 void main(){float w=vG<.5?uW[0]:vG<1.5?uW[1]:uW[2];if(w<.004)discard;
  float s=vS,x=s*${JL.toFixed(1)},th=pow(vF,1.4),ax=pow(vF,7.);
  float fl=.84+.16*sin(uT*71.+vSd*40.+x*2.3)*sin(uT*37.+vSd*13.);
  /* translucent violet core just below the nozzle */
  vec3 c=vec3(.36,.26,1.)*exp(-s*3.2)*.06*th;
  /* shock diamonds: bright bands, sharpest on the jet's axis, fading downstream */
  float ph=x/1.2-.4;
  if(ph>0.){float f=fract(ph);c+=vec3(1.8,1.3,.7)*exp(-pow((f-.5)/.12,2.))*exp(-x/6.)*ax*uDia*.45;}
  /* the jet mixing with air: an orange fringe that grows downstream */
  c+=vec3(1.,.5,.15)*smoothstep(.04,.3,s)*exp(-s*1.3)*th*.12;
  c*=w*uI*fl*(1.-smoothstep(uCut-.4,uCut,s));
  gl_FragColor=vec4(c,1.);}`,
  });
  const im = new T.InstancedMesh(g, m, n),
    M4 = new T.Matrix4(),
    q = new T.Quaternion();
  engines.forEach(([y, z, gi], i) => {
    const r = exitR[gi] * 0.92;
    M4.compose(V3(bell, y, z), q, V3(JL, r, r));
    im.setMatrixAt(i, M4);
  });
  im.frustumCulled = false;
  im.renderOrder = 3;
  im.userData.pt = 1;
  E.add(im);
  return {
    /* e: lit fraction per group, t: throttle (0.4..1), ig: ignition transient */
    upd(simT, e, t, ig) {
      u.uT.value = simT;
      for (let k = 0; k < 3; k++) u.uW.value[k] = Math.min(1, e[k] * 1.15);
      u.uI.value = 0.45 + 0.45 * t + ig * 0.3;
      u.uDia.value = 0.5 + 0.5 * t;
      u.uCut.value = 0.62 + 0.38 * t;
    },
  };
}
