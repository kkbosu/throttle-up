// STARSHIP: the exhaust after the flame bucket has turned it, roaring out along both arms of the trench. A ray-marched
// volume drawn in the plume pass (half resolution, stops at the scene's depth, so the trench walls hide it), added on
// top of the main plume: turbulent tongues hottest near the bucket, cooling as they run out, spreading and lifting
// once past the trench mouths.
import * as T from 'three';
import { V3, cam } from '../../render3d/kit.js';
import { PU } from '../../render3d/plume.js';

export function buildFlame(mouth) {
  const B0 = V3(-mouth - 22, 0, -17),
    B1 = V3(mouth + 22, 24, 17),
    u = {
      tDepth: { value: null },
      uPRes: { value: new T.Vector2(1, 1) },
      uNear: { value: 0.2 },
      uFar: { value: 9000 },
      uFwd: { value: V3() },
      uSteps: { value: 24 },
      uT: { value: 0 },
      uI: { value: 0 },
      uLen: { value: 30 },
      uThr: { value: 0 },
      uB0: { value: B0 },
      uB1: { value: B1 },
    };
  const m = new T.ShaderMaterial({
    uniforms: u,
    side: T.BackSide,
    depthTest: false,
    depthWrite: false,
    /* added onto the main plume, colour and heat alike */
    blending: T.CustomBlending,
    blendSrc: T.OneFactor,
    blendDst: T.OneFactor,
    vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `#include <packing>
 uniform sampler2D tDepth;uniform vec2 uPRes;uniform float uNear,uFar,uSteps,uT,uI,uLen,uThr;uniform vec3 uFwd,uB0,uB1;varying vec3 vW;
 float hs(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){return n3(p)*.55+n3(p*2.07+vec3(1.7,9.2,3.1))*.3+n3(p*4.3+vec3(5.,1.,7.))*.15;}
 /* temperature to colour: dull red, orange, yellow, white-hot */
 vec3 ramp(float k){vec3 a=vec3(.3,.04,.01),b=vec3(1.5,.38,.06),c=vec3(2.7,1.3,.32),d=vec3(3.4,2.7,1.7);
  return k<.33?mix(a,b,k/.33):k<.66?mix(b,c,(k-.33)/.33):mix(c,d,(k-.66)/.34);}
 void main(){
  vec3 ro=cameraPosition,rd=normalize(vW-ro),iv=1./rd,a0=(uB0-ro)*iv,a1=(uB1-ro)*iv,tn=min(a0,a1),tf=max(a0,a1);
  float ta=max(max(max(tn.x,tn.y),tn.z),0.),tb=min(min(tf.x,tf.y),tf.z);
  float z=texture2D(tDepth,gl_FragCoord.xy/uPRes).x;
  tb=min(tb,-perspectiveDepthToViewZ(z,uNear,uFar)/max(dot(rd,uFwd),1e-3));
  if(tb<=ta||uI<1e-4){gl_FragColor=vec4(0.);return;}
  float dt=(tb-ta)/uSteps,j=hs(vec3(gl_FragCoord.xy,fract(uT*7.)*91.));vec3 c=vec3(0.);float ht=0.;
  for(int i=0;i<40;i++){if(float(i)>=uSteps)break;
   vec3 p=ro+rd*(ta+(float(i)+j)*dt);float s=abs(p.x);
   if(s>uLen+16.)continue;
   /* inside the trench the sheet is held to its floor and walls; past the mouth it spreads, lifts and cools */
   float o=max(s-${mouth.toFixed(1)},0.),hw=5.4+o*.5,yc=2.+o*.18+o*o*.01,hh=2.4+o*.32;
   float dz=p.z/hw,dy=(p.y-yc)/hh,shape=exp(-dz*dz*dz*dz*1.3-dy*dy*1.5);
   if(shape<.004)continue;
   vec3 q=vec3(s*.15-uT*(5.+3.*uThr),p.y*.33,p.z*.28+sign(p.x)*7.);
   float n=fbm(q),n2=n3(q*2.6+vec3(0.,-uT*1.6,0.));
   float tongue=smoothstep(.36,.74,n*.8+n2*.3);
   float reach=smoothstep(uLen+16.,uLen*.6,s)*smoothstep(1.,5.,s);
   float d=shape*tongue*reach*exp(-s/(uLen*.75));
   c+=ramp(clamp(d*1.3*exp(-s/55.)+.12,0.,.82))*d*dt*.75;
   ht+=d*dt*.06;}
  gl_FragColor=vec4(c*uI,ht*uI);}`,
  });
  const g = new T.BoxGeometry(B1.x - B0.x, B1.y - B0.y, B1.z - B0.z);
  g.translate((B0.x + B1.x) / 2, (B0.y + B1.y) / 2, (B0.z + B1.z) / 2);
  const mesh = new T.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh,
    /* N: thrust fraction, t: throttle, ig: ignition transient */
    upd(simT, N, t, ig) {
      u.tDepth.value = PU.tDepth.value;
      u.uPRes.value.copy(PU.uPRes.value);
      u.uNear.value = PU.uNear.value;
      u.uFar.value = PU.uFar.value;
      u.uSteps.value = PU.uSteps.value;
      cam.getWorldDirection(u.uFwd.value);
      u.uT.value = simT;
      u.uI.value = Math.min(1, N * 1.4 + ig * 0.4);
      u.uLen.value = 24 + 40 * N;
      u.uThr.value = t;
    },
  };
}
