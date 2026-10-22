// Render targets and the composite pass (heat haze, plume, schlieren/thermal modes) + bloom + output.
import * as T from 'three';
import { state } from '../core/state.js';
import { X } from './addons.js';
import { k3 } from './context.js';
import { R, cam } from './kit.js';
import { sun } from './lights.js';
import { PU } from './plume.js';

// assigned by create*() below, when init3D runs
export let CS;

export function createComposite() {
  /* ======================= render targets + post ======================= */
  k3.rtM = null;
  k3.rtP = null;
  k3.comp = null;
  k3.cpass = null;
  k3.bloom = null;
  k3.pr = 1;
  k3.QA = -1;
  k3.MA = -1;
  CS = {
    uniforms: {
      tMain: { value: null },
      tPlume: { value: null },
      tDepth: { value: null },
      uNear: { value: 0.2 },
      uFar: { value: 9000 },
      uZA: { value: 0 },
      uZR: { value: 0 },
      uRes: { value: new T.Vector2() },
      uT: { value: 0 },
      uHaze: { value: 0 },
      uKick: { value: 0 },
      uMode: { value: 0 },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `#include <packing>
 uniform sampler2D tMain,tPlume,tDepth;uniform vec2 uRes;uniform float uT,uHaze,uKick,uMode,uNear,uFar,uZA,uZR;varying vec2 vUv;
 float vz(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,uNear,uFar);}
 vec3 lin(vec3 c){return pow(c,vec3(2.2));}
 vec3 iron(float v){v=clamp(v,0.,1.);vec3 a=vec3(0.,0.,.06),b=vec3(.32,0.,.5),c=vec3(.82,.1,.36),d=vec3(1.,.47,0.),e=vec3(1.,.86,.12),f=vec3(1.,1.,.94);
  return lin(v<.2?mix(a,b,v/.2):v<.4?mix(b,c,(v-.2)/.2):v<.6?mix(c,d,(v-.4)/.2):v<.8?mix(d,e,(v-.6)/.2):mix(e,f,(v-.8)/.2));}
 float hsh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 float dens(vec2 uv){vec4 p=texture2D(tPlume,uv);return p.a+.35*dot(p.rgb,vec3(.3,.5,.2));}
 void main(){vec4 pl=texture2D(tPlume,vUv);
  if(uMode>1.5){float ts=texture2D(tMain,vUv).r*1000.,lp=dot(pl.rgb,vec3(.3,.5,.2)),tp=1350.*(1.-exp(-lp*.55))+700.*(1.-exp(-pl.a*.8)),t=tp>2.?max(ts,tp):ts;
   float v=pow(clamp((t+40.)/1640.,0.,1.),.6)+(hsh(vUv*uRes+fract(uT))-.5)*.02;gl_FragColor=vec4(iron(v),1.);return;}
  if(uMode>.5){float b=texture2D(tMain,vUv).r;vec2 e=2.2/uRes;
   float gx=dens(vUv+vec2(e.x,0.))-dens(vUv-vec2(e.x,0.)),gy=dens(vUv+vec2(0.,e.y))-dens(vUv-vec2(0.,e.y));
   vec2 q=(vUv-.5)*vec2(uRes.x/uRes.y,1.);float v=(b+clamp(gx*2.4,-.18,.18)+clamp(gy*.8,-.08,.08))*(1.-.4*dot(q,q))+(hsh(vUv*uRes+fract(uT))-.5)*.012;
   gl_FragColor=vec4(vec3(max(v,0.))*vec3(1.,.97,.92),1.);return;}
  float h=1.-exp(-pl.a);
  vec2 w=vec2(sin(vUv.y*uRes.y*.11+uT*9.+sin(vUv.x*uRes.x*.04+uT*3.)*2.),cos(vUv.x*uRes.x*.09-uT*7.+sin(vUv.y*uRes.y*.03)*2.));
  /* heat haze: refract only what lies behind the hot gas (further than the nozzle exit uZA plus its radius uZR), and never
     across an object's outline. The half-res plume blurs a pixel or two past edges, which made the nozzle lip ripple. */
  if(any(isnan(pl))||any(isinf(pl)))pl=vec4(0.);h=1.-exp(-pl.a);
  vec2 o=w*h*uHaze/uRes;float z0=vz(vUv),dz=abs(vz(vUv+o)-z0);o*=smoothstep(uZA+uZR,uZA+uZR+1.,z0)*(1.-smoothstep(.04*z0+.15,.08*z0+.3,dz));
  vec3 c=texture2D(tMain,vUv+o).rgb+pl.rgb+uKick*vec3(1.,.86,.72);
  /* never pass a NaN or infinity on: the bloom blur would smear one bad pixel into a growing black rectangle */
  if(any(isnan(c))||any(isinf(c)))c=vec3(0.);gl_FragColor=vec4(clamp(c,0.,6e4),1.);}`,
  };
}

export function setup() {
  k3.QA = state.Q;
  k3.LR = state.lowRes;
  const D2 = Math.min(devicePixelRatio || 1, 2);
  k3.pr = state.Q > 1 ? Math.min(D2, 1.5) : state.Q > 0 || !state.lowRes ? Math.min(D2, 1) : 0.7;
  const w = Math.max(2, Math.round(state.W * k3.pr)),
    h = Math.max(2, Math.round(state.H * k3.pr));
  if (k3.rtM) {
    k3.rtM.dispose();
    k3.rtM.depthTexture.dispose();
    k3.rtP.dispose();
  }
  k3.rtM = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: state.Q > 1 ? 4 : 0 });
  k3.rtM.depthTexture = new T.DepthTexture(w, h);
  k3.rtM.depthTexture.type = T.UnsignedIntType;
  const ps = state.Q > 1 ? 0.5 : state.Q > 0 ? 0.5 : 0.34;
  k3.rtP = new T.WebGLRenderTarget(Math.max(2, (w * ps) | 0), Math.max(2, (h * ps) | 0), {
    type: T.HalfFloatType,
    depthBuffer: false,
  });
  PU.tDepth.value = k3.rtM.depthTexture;
  PU.uPRes.value.set(k3.rtP.width, k3.rtP.height);
  PU.uSteps.value = state.Q > 1 ? 30 : state.Q > 0 ? 22 : 14;
  R.setPixelRatio(k3.pr);
  R.setSize(state.W, state.H, false);
  sun.shadow.map && (sun.shadow.map.dispose(), (sun.shadow.map = null));
  const sm2 = state.Q > 1 ? 2048 : 1024;
  sun.shadow.mapSize.set(sm2, sm2);
  R.shadowMap.enabled = state.Q > 0;
  if (!k3.comp) {
    k3.comp = new X.EffectComposer(R);
    k3.cpass = new X.ShaderPass(CS);
    k3.comp.addPass(k3.cpass);
    k3.bloom = new X.UnrealBloomPass(new T.Vector2(w, h), 0.4, 0.45, 1.4);
    k3.comp.addPass(k3.bloom);
    k3.comp.addPass(new X.OutputPass());
  }
  k3.comp.setPixelRatio(k3.pr);
  k3.comp.setSize(state.W, state.H);
  k3.bloom.enabled = state.Q > 0;
  k3.flowKey = '';
  k3.cpass.uniforms.tMain.value = k3.rtM.texture;
  k3.cpass.uniforms.tPlume.value = k3.rtP.texture;
  k3.cpass.uniforms.tDepth.value = k3.rtM.depthTexture;
  k3.cpass.uniforms.uNear.value = cam.near;
  k3.cpass.uniforms.uFar.value = cam.far;
  k3.cpass.uniforms.uRes.value.set(w, h);
  cam.aspect = state.W / state.H;
  cam.updateProjectionMatrix();
}
