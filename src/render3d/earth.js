// Earth from orbit: procedural continents, clouds, ocean glint, terminator, city lights, atmosphere.
import * as T from 'three';
import { V3, scn } from './kit.js';

// assigned by create*() below, when init3D runs
export let earthU, noiseGL, earthV, earth;

export function createEarth() {
  /* ---------------- Earth from orbit: procedural continents, clouds, ocean glint, terminator, city lights, atmosphere (1 unit = 1 km here; only angles matter) ---------------- */
  earthU = { uSun: { value: V3(1, 0, 0) }, uRot: { value: 0 }, uT: { value: 0 } };
  noiseGL = `float h3(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}`;
  earthV = `varying vec3 vN,vP;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
  earth = new T.Group();
  earth.visible = false;
  scn.add(earth);
  {
    const m = new T.ShaderMaterial({
      uniforms: earthU,
      vertexShader: earthV,
      fragmentShader:
        `uniform vec3 uSun;uniform float uRot,uT;varying vec3 vN,vP;` +
        noiseGL +
        `
 void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP),sd=normalize(uSun);float c=cos(uRot),s=sin(uRot);vec3 q=vec3(c*n.x-s*n.y,s*n.x+c*n.y,n.z);
  float hh=fbm(q*5.+vec3(3.,1.,7.))*.8+fbm(q*26.)*.2,land=smoothstep(.5,.53,hh),ice=smoothstep(.8,.9,abs(q.z));
  vec3 lc=mix(vec3(.10,.15,.05),vec3(.36,.28,.16),smoothstep(.42,.75,fbm(q*30.)));vec3 sc=mix(vec3(.004,.022,.07),lc,land);sc=mix(sc,vec3(.75,.78,.82),ice);
  float cl=smoothstep(.52,.82,fbm(q*12.+vec3(uT*.01,0.,uT*.004))*.75+fbm(q*48.)*.25);float d=dot(n,sd),day=smoothstep(-.1,.15,d),lit=max(d,0.);
  vec3 col=sc*(lit*.7+.004);vec3 rf=reflect(-sd,n);col+=(1.-land)*(1.-cl)*pow(max(dot(rf,v),0.),60.)*vec3(1.,.9,.75)*.9*step(0.,d);
  col=mix(col,vec3(.8)*(lit*.6+.003),cl*.75);
  col+=land*(1.-ice)*(1.-cl*.85)*(1.-day)*pow(smoothstep(.62,.95,n3(q*1100.)),2.)*smoothstep(.4,.65,fbm(q*22.))*vec3(1.,.66,.32)*2.2;
  float rim=pow(1.-max(dot(n,v),0.),3.);col+=(vec3(.25,.5,1.)*smoothstep(-.25,.4,d)+vec3(.9,.42,.15)*exp(-pow(d/.12,2.))*.7)*rim*.6;
  gl_FragColor=vec4(col,1.);}`,
    });
    const e = new T.Mesh(new T.SphereGeometry(6371, 192, 96), m);
    e.userData.bg = 1;
    earth.add(e);
    const a = new T.Mesh(
      new T.SphereGeometry(6371 * 1.016, 128, 64),
      new T.ShaderMaterial({
        uniforms: earthU,
        vertexShader: earthV,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        fragmentShader: `uniform vec3 uSun;varying vec3 vN,vP;void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP);float f=1.-abs(dot(n,v)),d=dot(n,normalize(uSun)),g=pow(f,5.);
   gl_FragColor=vec4((vec3(.3,.55,1.)*smoothstep(-.3,.3,d)*2.+vec3(1.,.5,.2)*exp(-pow(d/.15,2.)))*g,1.);}`,
      }),
    );
    a.userData.bg = 1;
    a.userData.pt = 1;
    earth.add(a);
  }
}
