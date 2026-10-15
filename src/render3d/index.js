// 3D renderer (Three.js). Loaded on demand by core/loader3d.js; split into modules in step 4.
import { state } from '../core/state.js';
import { $, MONO, cv, g, mk, sm } from '../core/util.js';
import { MLE, MU, RE, WF, gimb, orb, sc, sicE, skyRy } from '../machines/table.js';
import { EM, P, SM, VP } from '../render2d/index.js';

/* =====================================================================================
   3D RENDERER (Three.js). The simulation above is unchanged; this only draws it.
   World units are metres, Y up. Each engine's exhaust axis is its local +X.
   Pipeline per frame: scene -> HDR target with depth; volumetric plume -> half-res target
   (ray-marched, stops at scene depth, alpha carries heat for the haze); composite (haze + plume + flash)
   -> bloom -> ACES tone map.
   ===================================================================================== */
export function init3D(T,X){const k3={};/* 3D renderer state shared between sections */

const glc=$('gl'),R=new T.WebGLRenderer({canvas:glc,antialias:false,powerPreference:'high-performance',stencil:false});
if(!R.capabilities.isWebGL2)throw new Error('webgl2');
R.toneMapping=T.ACESFilmicToneMapping;R.outputColorSpace=T.SRGBColorSpace;R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
const scn=new T.Scene(),pscn=new T.Scene(),cam=new T.PerspectiveCamera(38,1,.2,9000);
const V3=(x,y,z)=>new T.Vector3(x,y,z),col=(r,g,b)=>new T.Color().setRGB(r,g,b),rnd=(a,b)=>a+Math.random()*(b-a);
const ANI=R.capabilities.getMaxAnisotropy();
const std=o=>new T.MeshStandardMaterial(o);

/* ---------------- materials ---------------- */
function canvasTex(w,h,fn,srgb=true,rep){const c=mk(w,h),x=c.getContext('2d');fn(x,w,h);const t=new T.CanvasTexture(c);if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANI;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t}
/* heat tint along a hot casing: steel -> straw -> bronze -> blue -> dark */
const heatTint=canvasTex(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[[0,'#8d9197'],[.3,'#9a9284'],[.5,'#a08458'],[.66,'#7d5a3e'],[.8,'#4f4a6a'],[1,'#3a3a44']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<500;i++){x.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},.035)`;x.fillRect(0,Math.random()*h,w,1+Math.random()*3)}});
const heatEm=canvasTex(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#000');g.addColorStop(.55,'#110300');g.addColorStop(1,'#ff6a20');x.fillStyle=g;x.fillRect(0,0,w,h)});
const brushed=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const v=110+Math.random()*40|0;x.fillStyle=`rgb(${v},${v},${v})`;x.globalAlpha=.25;x.fillRect(0,Math.random()*h,w,1)}},false,[1,4]);
/* RS-25 nozzle: hundreds of brazed coolant tubes. Normal map stripes around, colour bands along */
const tubeN=canvasTex(256,8,(x,w,h)=>{const id=x.createImageData(w,h),p=8;for(let i=0;i<w;i++){const f=((i%p)+.5)/p*2-1,nx=f*.85,nz=Math.sqrt(1-nx*nx);for(let j=0;j<h;j++){const k=(j*w+i)*4;id.data[k]=(nx*.5+.5)*255;id.data[k+1]=128;id.data[k+2]=nz*255;id.data[k+3]=255}}x.putImageData(id,0,0)},false,[14,1]);
const tubeC=canvasTex(64,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[[0,'#6c5a4a'],[.12,'#8a6e52'],[.4,'#9a7a5a'],[.75,'#8c7a68'],[1,'#a39484']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<220;i++){x.fillStyle=`rgba(${Math.random()<.5?30:200},${Math.random()<.5?20:170},${Math.random()<.5?10:140},.05)`;x.fillRect(0,Math.random()*h,w,1+Math.random()*6)}},true,[14,1]);
const MT={
 alu:std({color:0xb9bec6,metalness:1,roughness:.22}),
 ti:std({color:0x9a9ea4,metalness:.8,roughness:.42,roughnessMap:brushed,side:T.DoubleSide}),
 steel:std({color:0xaab0b6,metalness:.8,roughness:.34,side:T.DoubleSide}),
 dark:std({color:0x30333a,metalness:.7,roughness:.5}),
 hot:std({color:0xffffff,map:heatTint,metalness:.75,roughness:.45,emissive:0xffffff,emissiveMap:heatEm,emissiveIntensity:0,side:T.DoubleSide}),
 flap:std({color:0x6a6d72,metalness:.7,roughness:.52,emissive:0xff5a1a,emissiveIntensity:0}),
 sr:std({color:0x262a31,metalness:.55,roughness:.42,side:T.DoubleSide}),
 srHot:std({color:0x2a2622,metalness:.6,roughness:.5,emissive:0xff5a1a,emissiveIntensity:0,side:T.DoubleSide}),
 copper:std({color:0xc07a42,metalness:1,roughness:.32}),
 brass:std({color:0xc9a24a,metalness:1,roughness:.3}),
 hose:std({color:0x1e2025,metalness:.1,roughness:.75}),
 wireR:std({color:0x8a2a22,roughness:.6}),wireB:std({color:0x2a3d6a,roughness:.6}),
 yel:std({color:0xd8a91e,metalness:.2,roughness:.55}),
 gry:std({color:0x7a8078,metalness:.4,roughness:.6,side:T.DoubleSide}),
 conc:std({color:0xffffff,roughness:.92,map:canvasTex(256,256,(x,w,h)=>{x.fillStyle='#77746d';x.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const v=80+Math.random()*60|0;x.fillStyle=`rgba(${v},${v-2},${v-6},.3)`;x.fillRect(Math.random()*w,Math.random()*h,1.5,1.5)}for(let i=0;i<14;i++){const sx=Math.random()*w;const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(30,26,22,.12)');g.addColorStop(1,'rgba(30,26,22,0)');x.fillStyle=g;x.fillRect(sx,0,3+Math.random()*10,h*(.3+Math.random()*.7))}},true,[3,2])}),
 bell:std({color:0xffffff,map:tubeC,normalMap:tubeN,normalScale:new T.Vector2(.9,.9),metalness:.85,roughness:.42}),
 glowO:new T.MeshBasicMaterial({color:0x000000}),
 inner:std({color:0x15161a,metalness:.5,roughness:.7,side:T.DoubleSide,emissive:0xff6a20,emissiveIntensity:0}),
 white:std({color:0xe8e8e4,roughness:.5,metalness:.1})};
/* thermal-lens category per material; anything unlisted is 'cold' (ambient, warmed by the exhaust) */
const CAT=new Map([[MT.hot,'hot'],[MT.flap,'hot'],[MT.srHot,'hot'],[MT.inner,'inner'],[MT.ti,'case'],[MT.steel,'case'],[MT.alu,'case'],[MT.copper,'case'],[MT.brass,'case'],[MT.sr,'case'],[MT.hose,'case'],[MT.wireR,'case'],[MT.wireB,'case'],[MT.dark,'case'],[MT.bell,'bell']]);
const halfRing=(r,tube,x,mat,seg=48)=>{const g=new T.TorusGeometry(r,tube,8,seg,Math.PI);g.rotateY(Math.PI/2);g.rotateX(-Math.PI/2);const m=new T.Mesh(g,mat);m.position.x=x;m.castShadow=true;return m};
/* rings of blades: [x, hub r, tip r, count, chord, twist] */
function bladeRing(list,mat){const bg=new T.BoxGeometry(.11,1,.012);bg.translate(0,.5,0);const tot=list.reduce((s,b)=>s+b[3],0),im=new T.InstancedMesh(bg,mat,tot),M4=new T.Matrix4(),q=new T.Quaternion(),q2=new T.Quaternion(),eu=new T.Euler();let k=0;
 list.forEach(([x,r0,r1,n,ch,tw])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;q.setFromEuler(eu.set(a,0,0));q2.setFromAxisAngle(V3(0,1,0),tw);q.multiply(q2);M4.compose(V3(x,Math.cos(a)*r0,Math.sin(a)*r0),q,V3(ch/.11,r1-r0,1));im.setMatrixAt(k++,M4)}});im.castShadow=true;return im}

/* ---------------- geometry helpers: lathes run along local +X ---------------- */
const lathe=(prof,mat,seg=56,half=false)=>{const g=new T.LatheGeometry(prof.map(p=>new T.Vector2(p[0],p[1])),seg,half?Math.PI/2:0,half?Math.PI:Math.PI*2);g.rotateZ(-Math.PI/2);const m=new T.Mesh(g,mat);m.castShadow=m.receiveShadow=true;return m};
const ring=(r,tube,x,mat,seg=72)=>{const g=new T.TorusGeometry(r,tube,8,seg);g.rotateY(Math.PI/2);const m=new T.Mesh(g,mat);m.position.x=x;m.castShadow=true;return m};
const box=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m};
const cyl=(r0,r1,h,mat,seg=24)=>{const m=new T.Mesh(new T.CylinderGeometry(r0,r1,h,seg),mat);m.castShadow=m.receiveShadow=true;return m};
const pipe=(pts,r,mat,seg)=>{const c=new T.CatmullRomCurve3(pts.map(p=>V3(p[0],p[1],p[2])));const m=new T.Mesh(new T.TubeGeometry(c,seg||Math.max(12,pts.length*10),r,8,false),mat);m.castShadow=true;return m};
/* point on a casing of radius r at axial x, angle a (0 = top, +pi/2 = toward camera) */
const onCase=(x,r,a)=>[x,Math.cos(a)*r,Math.sin(a)*r];
/* bolt heads around a flange */
function bolts(grp,list,n){const g=new T.CylinderGeometry(.011,.011,.02,6);g.rotateZ(Math.PI/2);const im=new T.InstancedMesh(g,MT.steel,list.length*n),m=new T.Matrix4(),q=new T.Quaternion();let k=0;
 list.forEach(([x,r])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;m.compose(V3(x,Math.cos(a)*r,Math.sin(a)*r),q,V3(1,1,1));im.setMatrixAt(k++,m)}});grp.add(im);return im}
/* I-beam-ish steel member between two points */
function beam(grp,a,b,s,mat){const A=V3(...a),B=V3(...b),d=B.clone().sub(A),m=box(s,d.length(),s,mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());grp.add(m);return m}

/* ---------------- sky: analytic gradient + sun + stars; fog uses the same horizon colour so the ground blends in ---------------- */
const skyU={uSpace:{value:0},uZen:{value:V3()},uHor:{value:V3()},uGnd:{value:V3()},uSun:{value:V3(0,1,0)},uSunC:{value:V3()},uSunI:{value:1},uStars:{value:0},uDisk:{value:1}};
const skyMat=new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
 vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
 fragmentShader:`uniform vec3 uZen,uHor,uGnd,uSun,uSunC;uniform float uSunI,uStars,uDisk,uSpace;varying vec3 vD;
 float h3(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 void main(){vec3 d=normalize(vD);float y=d.y;
  if(uSpace>.5){vec3 c=y<-.25?uGnd*smoothstep(-.25,-.5,y):vec3(0.);float s=max(dot(d,normalize(uSun)),0.);c+=uSunC*uSunI*(smoothstep(.99965,.9999,s)*80.+pow(s,400.)*2.);
   vec3 g=d*520.;vec3 i=floor(g);float r=h3(i);if(r>.996){float st=smoothstep(.45,0.,length(fract(g)-.5));c+=mix(vec3(1.,.85,.7),vec3(.75,.85,1.),h3(i+3.))*st*(r-.996)*500.*uStars;}gl_FragColor=vec4(c,1.);return;}
  vec3 c=mix(uHor,uZen,pow(smoothstep(0.,.55,y),.55));
  float s=max(dot(d,normalize(uSun)),0.);
  c+=uSunC*uSunI*(pow(s,6.)*.18+pow(s,60.)*.5)*(.5+.5*smoothstep(-.05,.3,y));
  c+=uSunC*uSunI*smoothstep(.99955,.9998,s)*60.*uDisk;
  if(uStars>0.&&y>0.){vec3 g=d*420.;vec3 i=floor(g);float r=h3(i);if(r>.9965){float st=smoothstep(.45,0.,length(fract(g)-.5));c+=vec3(.9,.95,1.)*st*(r-.9965)*600.*uStars*smoothstep(0.,.15,y);}}
  if(y<0.)c=mix(uHor,uGnd,smoothstep(0.,.06,-y));
  gl_FragColor=vec4(c,1.);}`});
const sky=new T.Mesh(new T.SphereGeometry(4000,48,24),skyMat);sky.frustumCulled=false;sky.userData.bg=1;sky.renderOrder=-10;scn.add(sky);
const envScn=new T.Scene();envScn.add(new T.Mesh(new T.SphereGeometry(50,32,16),skyMat));
const pm=new T.PMREMGenerator(R);k3.envRT=null;

/* ---------------- lights ---------------- */
const hemi=new T.HemisphereLight(0xffffff,0x444444,.5),sun=new T.DirectionalLight(0xffffff,2);
sun.castShadow=true;sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;scn.add(hemi,sun,sun.target);
const flame=new T.PointLight(0xffa060,0,90,2);scn.add(flame);
const floods=[V3(-12,10.8,9),V3(13,10.8,8)].map(p=>{const l=new T.SpotLight(0xffd6a0,0,0,.55,.7,2);l.position.copy(p);scn.add(l,l.target);return l});
const SCN=[
 {n:'DUSK',zen:[.03,.055,.13],hor:[.78,.43,.24],gnd:[.36,.25,.19],sun:[.52,.07,-.85],sunC:[1,.55,.28],sunI:1.6,sunL:2.6,hS:0x7080a8,hG:0x5a3c2c,hI:.65,exp:.85,fog:.00042,stars:0,fl:0},
 {n:'DAY',zen:[.10,.24,.60],hor:[.62,.72,.84],gnd:[.62,.55,.45],sun:[-.42,.74,.52],sunC:[1,.95,.86],sunI:1.2,sunL:3.4,hS:0x9ab4e0,hG:0x8a7a62,hI:.9,exp:.62,fog:.00028,stars:0,fl:0},
 {n:'NIGHT',zen:[.002,.003,.009],hor:[.012,.018,.035],gnd:[.004,.004,.005],sun:[.35,.6,-.72],sunC:[.5,.6,1],sunI:0,sunL:.18,hS:0x2a3550,hG:0x0a0a0c,hI:.35,exp:1.15,fog:.0006,stars:1,fl:1}];
const SCNS=[
 {n:'TERMINATOR',zen:[0,0,0],hor:[0,0,0],gnd:[.03,.07,.16],sun:[.86,.1,-.5],sunC:[1,.97,.92],sunI:1.4,sunL:2.3,hS:0x000000,hG:0x2a4a80,hI:.3,exp:.78,fog:0,stars:1.2,fl:0},
 {n:'SUNLIT',zen:[0,0,0],hor:[0,0,0],gnd:[.05,.1,.22],sun:[-.42,.72,.55],sunC:[1,.97,.92],sunI:1.4,sunL:2.3,hS:0x000000,hG:0x3a5a90,hI:.4,exp:.8,fog:0,stars:1,fl:0},
 {n:'ECLIPSE',zen:[0,0,0],hor:[0,0,0],gnd:[.004,.006,.012],sun:[-.15,-.97,.2],sunC:[1,.97,.92],sunI:0,sunL:0,hS:0x000000,hG:0x0a0f1a,hI:.12,exp:1.1,fog:0,stars:1.4,fl:0}];
/* Mars: butterscotch dusty sky by day; around the setting Sun the dust scatters blue light forward, so the glow there is blue */
const SCNM=[
 {n:'MIDDAY',zen:[.36,.25,.17],hor:[.80,.60,.43],gnd:[.5,.33,.22],sun:[-.3,.85,.42],sunC:[1,.93,.84],sunI:.9,sunL:2.5,hS:0xc89a70,hG:0x7a4a30,hI:.75,exp:.68,fog:.00045,stars:0,fl:0},
 {n:'AFTERNOON',zen:[.28,.19,.13],hor:[.72,.50,.34],gnd:[.45,.29,.19],sun:[.62,.36,-.68],sunC:[1,.85,.68],sunI:.9,sunL:2.3,hS:0xa87a58,hG:0x6a3e28,hI:.65,exp:.76,fog:.0005,stars:0,fl:0},
 {n:'SUNSET',zen:[.03,.028,.034],hor:[.24,.16,.115],gnd:[.12,.08,.06],sun:[-.3,.07,-.95],sunC:[.78,.74,.72],glow:[.3,.5,1.1],sunI:1.5,sunL:.85,hS:0x4a4c60,hG:0x2a1a14,hI:.5,exp:1.05,fog:.0006,stars:.25,fl:0}];
const sKey=s=>(CFG[state.mi].space?3:CFG[state.mi].mars?6:0)+s;
k3.curS=-1;k3.curP=SCN[0];
function applyScene(s){const sp=!!(CFG[state.mi]&&CFG[state.mi].space),mr=!!(CFG[state.mi]&&CFG[state.mi].mars),c=(sp?SCNS:mr?SCNM:SCN)[s];k3.curS=sKey(s);k3.curP=c;skyU.uSpace.value=sp?1:0;
 skyU.uZen.value.set(...c.zen);skyU.uHor.value.set(...c.hor);skyU.uGnd.value.set(...c.gnd);skyU.uSun.value.set(...c.sun).normalize();skyU.uSunC.value.set(...(c.glow||c.sunC));skyU.uSunI.value=c.sunI;skyU.uStars.value=c.stars;
 scn.fog=sp?null:new T.FogExp2(col(...c.hor),c.fog);earthU.uSun.value.set(...c.sun).normalize();
 sun.color.setRGB(...c.sunC);sun.intensity=c.sunL;hemi.color.set(c.hS);hemi.groundColor.set(c.hG);hemi.intensity=c.hI;
 floods.forEach(l=>{l.intensity=c.fl*320;l.visible=!!c.fl});R.toneMappingExposure=c.exp;
 if(k3.envRT)k3.envRT.dispose();k3.envRT=pm.fromScene(envScn,.02,.1,200);scn.environment=k3.envRT.texture;
 mountMat.color.setRGB(c.hor[0]*.55,c.hor[1]*.55,c.hor[2]*.6);placeSun()}

/* ---------------- ground ---------------- */
/* dry lakebed: tileable mud-crack polygons (jittered-grid Voronoi), with a matching height map turned into normals */
function crackTex(){const s=512,cells=16,cs=s/cells,P=[],cv2=new Float32Array(cells*cells);
 for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){P.push([(i+.03+Math.random()*.94)*cs,(j+.03+Math.random()*.94)*cs]);cv2[j*cells+i]=Math.random()}
 const C=new Uint8ClampedArray(s*s*4),Hh=new Float32Array(s*s);
 const lw=(x,y)=>.5+.5*(Math.sin(x/s*6.283*2+1)*Math.sin(y/s*6.283*3+2)*.6+Math.sin(x/s*6.283*5+y/s*6.283*4)*.4);
 for(let y=0;y<s;y++)for(let x=0;x<s;x++){const ci=Math.floor(x/cs),cj=Math.floor(y/cs);let d1=1e9,d2=1e9,id=0;
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){let ii=ci+di,jj=cj+dj,ox=0,oy=0;if(ii<0){ii+=cells;ox=-s}else if(ii>=cells){ii-=cells;ox=s}if(jj<0){jj+=cells;oy=-s}else if(jj>=cells){jj-=cells;oy=s}
   const p=P[jj*cells+ii],dx=p[0]+ox-x,dy=p[1]+oy-y,d=dx*dx+dy*dy;if(d<d1){d2=d1;d1=d;id=jj*cells+ii}else if(d<d2)d2=d}
  const e=Math.sqrt(d2)-Math.sqrt(d1),cr=1-Math.min(1,e/1.6),k=(y*s+x)*4,v=(.86+.1*cv2[id]+.08*(lw(x,y)-.5)+(Math.random()-.5)*.06)*(1-cr*.22);
  C[k]=196*v;C[k+1]=178*v;C[k+2]=150*v;C[k+3]=255;Hh[y*s+x]=Math.min(1,e/4)+.25*(1-Math.min(1,e/12))*Math.min(1,e/2)}
 const c1=mk(s,s);c1.getContext('2d').putImageData(new ImageData(C,s,s),0,0);
 const N=new Uint8ClampedArray(s*s*4);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const hx=Hh[y*s+(x+1)%s]-Hh[y*s+(x+s-1)%s],hy=Hh[((y+1)%s)*s+x]-Hh[((y+s-1)%s)*s+x],nx=-hx*1.6,ny=-hy*1.6,l=Math.hypot(nx,ny,1),k=(y*s+x)*4;N[k]=(nx/l*.5+.5)*255;N[k+1]=(ny/l*.5+.5)*255;N[k+2]=(1/l*.5+.5)*255;N[k+3]=255}
 const c2=mk(s,s);c2.getContext('2d').putImageData(new ImageData(N,s,s),0,0);
 const t1=new T.CanvasTexture(c1),t2=new T.CanvasTexture(c2);t1.colorSpace=T.SRGBColorSpace;[t1,t2].forEach(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1300,1300);t.anisotropy=ANI});return[t1,t2]}
function grassTex(){const t=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#4a5a32';x.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const g=60+Math.random()*60|0;x.fillStyle=`rgba(${g*.75|0},${g},${g*.5|0},.35)`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,2+Math.random()*5)}
 for(let i=0;i<60;i++){const gx=Math.random()*w,gy=Math.random()*h,r=10+Math.random()*40,gd=x.createRadialGradient(gx,gy,0,gx,gy,r);gd.addColorStop(0,'rgba(110,95,60,.35)');gd.addColorStop(1,'rgba(110,95,60,0)');x.fillStyle=gd;x.fillRect(gx-r,gy-r,r*2,r*2)}},true,[900,900]);return t}
const [lakeC,lakeN]=crackTex(),grassC=grassTex();
/* Mars regolith: rusty dust with blotches and pebbles, tileable, plus a normal map from the pebble heights */
function marsTex(){const s=512,c1=mk(s,s),x=c1.getContext('2d'),c3=mk(s,s),h=c3.getContext('2d');
 x.fillStyle='#9c5c3a';x.fillRect(0,0,s,s);h.fillStyle='#000';h.fillRect(0,0,s,s);
 const wrap=(f,px,py,r)=>{for(const ox of[-s,0,s])for(const oy of[-s,0,s])if(px+ox>-r&&px+ox<s+r&&py+oy>-r&&py+oy<s+r)f(px+ox,py+oy)};
 for(let i=0;i<70;i++){const px=Math.random()*s,py=Math.random()*s,r=30+Math.random()*90,v=Math.random()<.5;wrap((X,Y)=>{const gd=x.createRadialGradient(X,Y,0,X,Y,r);gd.addColorStop(0,v?'rgba(70,35,20,.2)':'rgba(205,145,100,.17)');gd.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gd;x.fillRect(X-r,Y-r,2*r,2*r)},px,py,r)}
 for(let i=0;i<26000;i++){const v=Math.random()<.5;x.fillStyle=v?'rgba(60,30,18,.12)':'rgba(195,125,85,.12)';x.fillRect(Math.random()*s,Math.random()*s,1.5,1.5)}
 for(let i=0;i<900;i++){const px=Math.random()*s,py=Math.random()*s,r=1+Math.pow(Math.random(),3)*7,a=Math.random()*3,dk=40+Math.random()*60;
  wrap((X,Y)=>{x.fillStyle=`rgb(${dk+40|0},${dk*.6|0},${dk*.45|0})`;x.beginPath();x.ellipse(X,Y,r,r*.7,a,0,6.283);x.fill();const gd=h.createRadialGradient(X,Y,0,X,Y,r);gd.addColorStop(0,'rgba(255,255,255,1)');gd.addColorStop(1,'rgba(255,255,255,0)');h.fillStyle=gd;h.beginPath();h.ellipse(X,Y,r,r*.7,a,0,6.283);h.fill()},px,py,r)}
 const hd=h.getImageData(0,0,s,s).data,Nn=new Uint8ClampedArray(s*s*4),H=(i,j)=>hd[(((j+s)%s)*s+((i+s)%s))*4]/255;
 for(let j=0;j<s;j++)for(let i=0;i<s;i++){const nx=-(H(i+1,j)-H(i-1,j))*2.5,ny=-(H(i,j+1)-H(i,j-1))*2.5,l=Math.hypot(nx,ny,1),k=(j*s+i)*4;Nn[k]=(nx/l*.5+.5)*255;Nn[k+1]=(ny/l*.5+.5)*255;Nn[k+2]=(1/l*.5+.5)*255;Nn[k+3]=255}
 const c2=mk(s,s);c2.getContext('2d').putImageData(new ImageData(Nn,s,s),0,0);
 const t1=new T.CanvasTexture(c1),t2=new T.CanvasTexture(c2);t1.colorSpace=T.SRGBColorSpace;[t1,t2].forEach(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(900,900);t.anisotropy=ANI});return[t1,t2]}
const [marsC,marsN]=marsTex();
/* scattered rocks for the Mars site, kept clear of the landing spot */
const rocks=(()=>{const m=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),std({color:0x74503a,roughness:.95,flatShading:true}),600),M4=new T.Matrix4(),q=new T.Quaternion(),eu=new T.Euler();
 for(let i=0;i<600;i++){const a=Math.random()*6.283,d=7+Math.pow(Math.random(),1.6)*260,s=.08+Math.pow(Math.random(),4)*1.4*(d/60+.3);q.setFromEuler(eu.set(Math.random()*3,Math.random()*3,Math.random()*3));M4.compose(V3(Math.cos(a)*d,s*.2,Math.sin(a)*d),q,V3(s*(1+Math.random()),s*(.4+Math.random()*.5),s*(1+Math.random())));m.setMatrixAt(i,M4)}
 m.castShadow=m.receiveShadow=true;m.userData.bg=1;m.visible=false;scn.add(m);return m})();
const gMat=std({color:0xffffff,map:lakeC,normalMap:lakeN,normalScale:new T.Vector2(.35,.35),roughness:.95,metalness:0});
const ground=new T.Mesh(new T.PlaneGeometry(8000,8000),gMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.userData.bg=1;CAT.set(gMat,'gnd');scn.add(ground);
/* concrete pad: slabs, joints, oil, and the exhaust scorch fan downstream of the nozzle */
function padTex(scX,scY,len,wide){return canvasTex(1024,1024,(x,w,h)=>{x.fillStyle='#8e8a82';x.fillRect(0,0,w,h);
 for(let i=0;i<26000;i++){const v=100+Math.random()*70|0;x.fillStyle=`rgba(${v},${v-3},${v-8},.25)`;x.fillRect(Math.random()*w,Math.random()*h,1.5,1.5)}
 for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},.025)`;x.fillRect(i*128,j*128,128,128)}
 x.strokeStyle='rgba(30,28,25,.75)';x.lineWidth=2.5;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*128,0);x.lineTo(i*128,h);x.moveTo(0,i*128);x.lineTo(w,i*128);x.stroke()}
 for(let i=0;i<14;i++){const ox=Math.random()*w,oy=Math.random()*h,r=6+Math.random()*26,gd=x.createRadialGradient(ox,oy,0,ox,oy,r);gd.addColorStop(0,'rgba(20,18,14,.4)');gd.addColorStop(1,'rgba(20,18,14,0)');x.fillStyle=gd;x.fillRect(ox-r,oy-r,r*2,r*2)}
 x.save();x.translate(scX*w,scY*h);x.scale(len*w,wide*h);const gd=x.createRadialGradient(.5,0,0,.5,0,.75);gd.addColorStop(0,'rgba(18,14,10,.7)');gd.addColorStop(.6,'rgba(30,24,18,.3)');gd.addColorStop(1,'rgba(30,24,18,0)');x.fillStyle=gd;x.fillRect(0,-1,1.25,2);x.restore()})}
const mountMat=new T.MeshBasicMaterial({color:0x332222,fog:true});
{const n=220,pos=[],R0=2600;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,h=60+140*Math.max(0,Math.sin(a*3+1))*(.5+.5*Math.sin(a*7))+90*Math.abs(Math.sin(a*11+2))+40*Math.sin(a*23);pos.push(Math.cos(a)*R0,-20,Math.sin(a)*R0,Math.cos(a)*R0,Math.max(30,h),Math.sin(a)*R0)}
 const g=new T.BufferGeometry(),idx=[];for(let i=0;i<n;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);
 var mountains=new T.Mesh(g,mountMat);mountains.userData.bg=1;mountMat.side=T.DoubleSide;scn.add(mountains)}
/* pine tree line for the RS-25 site (Mississippi forest, not a desert) */
const trees=(()=>{const tp=[[0,13],[.9,11.5],[.5,11.2],[1.5,9.6],[.9,9.3],[2.1,7.6],[1.3,7.3],[2.6,5.4],[1.6,5.2],[2.9,3.2],[.3,3]].map(p=>new T.Vector2(p[0],p[1])).reverse();const g=new T.LatheGeometry(tp,8);const tr=new T.CylinderGeometry(.3,.4,2,6);tr.translate(0,1,0);
 const m=new T.InstancedMesh(g,std({color:0x1c2b1a,roughness:.9}),520),mt=new T.InstancedMesh(tr,std({color:0x2a2018,roughness:.9}),520),M4=new T.Matrix4(),q=new T.Quaternion();
 for(let i=0;i<520;i++){let a=Math.random()*Math.PI*2,d=110+Math.pow(Math.random(),.7)*260;const s=.6+Math.random()*1.0;q.setFromAxisAngle(V3(0,1,0),Math.random()*6.3);M4.compose(V3(Math.cos(a)*d,0,Math.sin(a)*d-40),q,V3(s*(.8+Math.random()*.4),s*(.8+Math.random()*.6),s*(.8+Math.random()*.4)));m.setMatrixAt(i,M4);mt.setMatrixAt(i,M4)}
 m.userData.bg=mt.userData.bg=1;const gr=new T.Group();gr.add(m,mt);scn.add(gr);return gr})();

/* ---------------- Earth from orbit: procedural continents, clouds, ocean glint, terminator, city lights, atmosphere (1 unit = 1 km here; only angles matter) ---------------- */
const earthU={uSun:{value:V3(1,0,0)},uRot:{value:0},uT:{value:0}};
const noiseGL=`float h3(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}`;
const earthV=`varying vec3 vN,vP;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const earth=new T.Group();earth.visible=false;scn.add(earth);
{const m=new T.ShaderMaterial({uniforms:earthU,vertexShader:earthV,fragmentShader:`uniform vec3 uSun;uniform float uRot,uT;varying vec3 vN,vP;`+noiseGL+`
 void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP),sd=normalize(uSun);float c=cos(uRot),s=sin(uRot);vec3 q=vec3(c*n.x-s*n.y,s*n.x+c*n.y,n.z);
  float hh=fbm(q*5.+vec3(3.,1.,7.))*.8+fbm(q*26.)*.2,land=smoothstep(.5,.53,hh),ice=smoothstep(.8,.9,abs(q.z));
  vec3 lc=mix(vec3(.10,.15,.05),vec3(.36,.28,.16),smoothstep(.42,.75,fbm(q*30.)));vec3 sc=mix(vec3(.004,.022,.07),lc,land);sc=mix(sc,vec3(.75,.78,.82),ice);
  float cl=smoothstep(.52,.82,fbm(q*12.+vec3(uT*.01,0.,uT*.004))*.75+fbm(q*48.)*.25);float d=dot(n,sd),day=smoothstep(-.1,.15,d),lit=max(d,0.);
  vec3 col=sc*(lit*.7+.004);vec3 rf=reflect(-sd,n);col+=(1.-land)*(1.-cl)*pow(max(dot(rf,v),0.),60.)*vec3(1.,.9,.75)*.9*step(0.,d);
  col=mix(col,vec3(.8)*(lit*.6+.003),cl*.75);
  col+=land*(1.-ice)*(1.-cl*.85)*(1.-day)*pow(smoothstep(.62,.95,n3(q*1100.)),2.)*smoothstep(.4,.65,fbm(q*22.))*vec3(1.,.66,.32)*2.2;
  float rim=pow(1.-max(dot(n,v),0.),3.);col+=(vec3(.25,.5,1.)*smoothstep(-.25,.4,d)+vec3(.9,.42,.15)*exp(-pow(d/.12,2.))*.7)*rim*.6;
  gl_FragColor=vec4(col,1.);}`});
 const e=new T.Mesh(new T.SphereGeometry(6371,192,96),m);e.userData.bg=1;earth.add(e);
 const a=new T.Mesh(new T.SphereGeometry(6371*1.016,128,64),new T.ShaderMaterial({uniforms:earthU,vertexShader:earthV,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  fragmentShader:`uniform vec3 uSun;varying vec3 vN,vP;void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP);float f=1.-abs(dot(n,v)),d=dot(n,normalize(uSun)),g=pow(f,5.);
   gl_FragColor=vec4((vec3(.3,.55,1.)*smoothstep(-.3,.3,d)*2.+vec3(1.,.5,.2)*exp(-pow(d/.15,2.)))*g,1.);}`}));a.userData.bg=1;a.userData.pt=1;earth.add(a)}

/* ---------------- props shared by the jet stands ---------------- */
function lightPole(grp,x,z){const p=cyl(.1,.14,11,MT.gry,10);p.position.set(x,5.5,z);grp.add(p);const h=box(.9,.35,.5,MT.dark,x,11,z);grp.add(h);
 const lens=new T.Mesh(new T.PlaneGeometry(.8,.3),new T.MeshBasicMaterial({color:0x000000}));lens.rotation.x=Math.PI/2;lens.position.set(x,10.82,z);grp.add(lens);return lens}
function hangar(grp,x,z,ry){const g=new T.Group();const b=box(46,10,34,std({color:0x7c7f80,metalness:.5,roughness:.6}),0,5,0);
 const roof=new T.Mesh(new T.CylinderGeometry(17,17,46,24,1,true,0,Math.PI),std({color:0x8a8d90,metalness:.6,roughness:.5,side:T.DoubleSide}));roof.rotation.z=Math.PI/2;roof.scale.set(.32,1,1);roof.position.y=10;
 g.add(b,roof);g.position.set(x,0,z);g.rotation.y=ry;grp.add(g)}
function blastFence(grp,x){const g=new T.Group();for(let i=0;i<9;i++){const s=box(16,.12,.9,MT.gry,0,.6+i*.55,i*-.35);s.rotation.x=-.75;g.add(s)}
 [-7.5,0,7.5].forEach(z=>{g.add(box(.25,5.4,.25,MT.dark,z,2.7,-1.6))});g.rotation.y=-Math.PI/2;g.position.set(x,0,0);grp.add(g)}

/* ======================= F-TYPE: afterburning turbofan on an open-air test stand ======================= */
function buildF(){const G=new T.Group(),E=new T.Group();E.position.set(0,1.65,0);G.add(E);
 const outer=new T.Group(),half=new T.Group(),core=new T.Group();E.add(outer,half,core);
 /* bellmouth inlet (part of the stand): a smooth aluminium flare that lets the engine breathe without a duct */
 E.add(lathe([[1.0,-5.86],[.93,-5.8],[.8,-5.7],[.68,-5.58],[.61,-5.44],[.585,-5.3],[.585,-5.18]],MT.alu,64));
 const screen=new T.Mesh(new T.SphereGeometry(1.0,24,12,0,Math.PI*2,0,Math.PI/2.4),new T.MeshStandardMaterial({color:0x777777,metalness:1,roughness:.5,wireframe:true,transparent:true,opacity:.35}));screen.rotation.z=Math.PI/2;screen.position.x=-5.55;screen.scale.set(.55,1,1);E.add(screen);
 const secs=[[[.59,-5.2],[.6,-4.75],[.6,-4.3]],[[.6,-4.3],[.555,-4.05],[.53,-3.9]],[[.53,-3.9],[.5,-3.3],[.475,-2.8]],[[.475,-2.8],[.51,-2.68],[.515,-2.2],[.505,-2.0]],[[.505,-2.0],[.535,-1.78],[.535,-1.4],[.53,-1.05]]];
 const smat=[MT.gry,MT.ti,MT.ti,MT.steel,MT.hot];
 secs.forEach((p,i)=>{outer.add(lathe(p,smat[i]));half.add(lathe(p,smat[i],56,true))});
 const fl=[[-5.2,.6],[-4.3,.61],[-3.9,.54],[-2.8,.49],[-2.0,.52],[-1.05,.54]];
 fl.forEach(([x,r])=>{outer.add(ring(r,.018,x,MT.steel));const hr=ring(r,.018,x,MT.steel);hr.geometry=new T.TorusGeometry(r,.018,8,40,Math.PI);hr.geometry.rotateY(Math.PI/2);hr.geometry.rotateX(-Math.PI/2);half.add(hr)});
 bolts(outer,fl.map(([x,r])=>[x+.012,r+.012]),44);
 [-3.6,-3.3,-3.0].forEach(x=>outer.add(ring(.53-(x+3.9)*.05+.006,.008,x,MT.steel)));
 /* plumbing: fuel manifold ring round the combustor with feeder pipes, long lines and wiring harnesses along the casing */
 outer.add(ring(.575,.017,-2.5,MT.copper,64));
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;outer.add(pipe([onCase(-2.5,.575,a),onCase(-2.47,.545,a),onCase(-2.42,.515,a)],.007,MT.copper,6))}
 outer.add(pipe([onCase(-4.25,.66,.9),onCase(-3.6,.6,.95),onCase(-2.9,.55,1.05),onCase(-2.5,.59,1.1)],.02,MT.steel));
 outer.add(pipe([onCase(-4.2,.66,1.35),onCase(-3.4,.58,1.4),onCase(-2.3,.585,1.38),onCase(-1.6,.6,1.3)],.016,MT.brass));
 outer.add(pipe([onCase(-4.1,.66,.4),onCase(-3.2,.58,.35),onCase(-2.2,.58,.42),onCase(-1.5,.6,.5)],.03,MT.hose));
 outer.add(pipe([onCase(-4.1,.66,-.5),onCase(-3.3,.58,-.45),onCase(-2.6,.6,-.4)],.026,MT.wireR));
 outer.add(pipe([onCase(-4.0,.66,1.8),onCase(-3.5,.6,1.9),onCase(-2.9,.55,1.85),onCase(-2.0,.58,1.7)],.022,MT.wireB));
 /* accessory gearbox slung under the fan case, driven by a tower shaft */
 const gb=box(.95,.24,.42,MT.dark,-3.7,-.78,0);outer.add(gb);[[-4.05,.13],[-3.75,.11],[-3.42,.12]].forEach(([x,r])=>{const c=cyl(r,r,.3,MT.ti,16);c.rotation.x=Math.PI/2;c.position.set(x,-.78,.3);outer.add(c)});
 const ts=cyl(.05,.05,.3,MT.steel,10);ts.position.set(-3.95,-.58,0);outer.add(ts);
 /* nozzle: 16 external flaps from the afterburner duct to the exit; radius moves with power. Inner faces glow with the afterburner */
 const fg=new T.BoxGeometry(1,.022,.215);fg.translate(.5,0,0);const flaps=new T.InstancedMesh(fg,MT.flap,16);flaps.castShadow=true;E.add(flaps);
 const seals=new T.InstancedMesh(new T.BoxGeometry(1,.012,.08).translate(.5,-.01,0),MT.dark,16);E.add(seals);
 const actu=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3,c=cyl(.03,.03,.5,MT.steel,10),rod=cyl(.014,.014,.4,MT.alu,8);E.add(c,rod);actu.push([a,c,rod])}
 /* inside the pipe: exhaust cone, flameholder rings, turbine face (seen from the rear) */
 const inner=new T.Group();E.add(inner);
 inner.add(lathe([[.0,-1.25],[.12,-1.45],[.2,-1.75]],MT.inner,32));
 const fh1=ring(.24,.015,-1.42,MT.inner,40),fh2=ring(.4,.015,-1.38,MT.inner,48);inner.add(fh1,fh2);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=box(.012,.32,.03,MT.inner);b.position.set(-1.4,Math.cos(a)*.32,Math.sin(a)*.32);b.rotation.x=-a;inner.add(b)}
 const tface=new T.Mesh(new T.CircleGeometry(.5,40),MT.inner);tface.rotation.y=Math.PI/2;tface.position.x=-1.8;inner.add(tface);
 inner.add(lathe([[.525,-1.8],[.525,-1.05]],MT.inner,48));
 /* cutaway internals: fan, 10-stage compressor, combustor liner, 2 turbine stages, afterburner spray bars; the rotor spins with N1 */
 const rotor=new T.Group();core.add(rotor);
 rotor.add(lathe([[0,-5.32],[.1,-5.25],[.18,-5.12],[.2,-5.0]],MT.alu,32));
 const bg=new T.BoxGeometry(.11,1,.012);bg.translate(0,.5,0);const nb=[];
 nb.push([-5.04,.2,.57,24,.16,.6]);for(let k=0;k<10;k++)nb.push([-3.95+k*.1,.24+k*.012,.425-k*.009,30+k*3,.055,.4]);nb.push([-1.98,.3,.47,40,.06,.3],[-1.86,.31,.49,44,.06,.3]);
 const tot=nb.reduce((s,b)=>s+b[3],0),blades=new T.InstancedMesh(bg,MT.ti,tot),M4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler();let bk=0;
 nb.forEach(([x,r0,r1,n,ch,tw])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;e.set(a,0,0);q.setFromEuler(e);const q2=new T.Quaternion().setFromAxisAngle(V3(0,1,0),tw);q.multiply(q2);M4.compose(V3(x,Math.cos(a)*r0*0+0,0),q,V3(ch/.11,r1-r0,1));
  const off=V3(0,r0,0).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(a,0,0)));M4.setPosition(x,off.y,off.z);blades.setMatrixAt(bk++,M4)}});
 rotor.add(blades);const shaft=cyl(.06,.06,3.3,MT.steel,12);shaft.rotation.z=Math.PI/2;shaft.position.x=-3.4;rotor.add(shaft);
 const drum=lathe([[.24,-4.0],[.3,-3.0],[.3,-2.8]],MT.ti,40);rotor.add(drum);
 const linM=std({color:0x2a2420,metalness:.5,roughness:.6,side:T.DoubleSide,emissive:0xff7a2a,emissiveIntensity:0});CAT.set(linM,'inner');const split=lathe([[.45,-4.3],[.445,-3.0],[.45,-2.75]],MT.ti,48,true);core.add(split);const liner=lathe([[.31,-2.75],[.42,-2.7],[.44,-2.4],[.4,-2.15],[.32,-2.1]],linM,48,true);core.add(liner);
 for(let i=0;i<14;i++){const a=Math.PI/2+i/13*Math.PI,sb=box(.015,.3,.015,MT.steel);sb.position.set(-1.5,Math.cos(a)*.27,Math.sin(a)*.27);sb.rotation.x=-a;core.add(sb)}
 /* test stand: yellow steel portal frames on the pad, engine hung from a thrust beam by links */
 const S=new T.Group();G.add(S);
 [-4.3,-1.7].forEach(x=>{[-1.25,1.25].forEach(z=>beam(S,[x,0,z],[x,2.55,z],.16,MT.yel));beam(S,[x,2.6,-1.35],[x,2.6,1.35],.2,MT.yel);
  beam(S,[x-.5,0,-1.25],[x,1.3,-1.25],.08,MT.yel);beam(S,[x+.5,0,1.25],[x,1.3,1.25],.08,MT.yel)});
 beam(S,[-4.9,2.75,0],[-1.1,2.75,0],.22,MT.yel);[[-4.3,-.12],[-1.7,.12]].forEach(([x,o])=>{beam(S,[x,2.65,0],[x+o,2.2,0],.06,MT.steel)});
 [-1.25,1.25].forEach(z=>beam(S,[-5.4,.1,z],[-.6,.1,z],.2,MT.yel));
 S.add(box(.5,.5,.5,MT.gry,-5,.25,-2.2));const cab=pipe([[-5,.5,-2.2],[-5.2,1.2,-1.4],[-4.6,2.2,-.6],[-4.0,2.3,-.2]],.04,MT.hose);S.add(cab);
 const pad=new T.Mesh(new T.PlaneGeometry(40,26),std({map:padTex(.41,.5,.5,.18),roughness:.88}));pad.rotation.x=-Math.PI/2;pad.position.set(4,.012,0);pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 const lp1=lightPole(G,-12,9),lp2=lightPole(G,13,8);blastFence(G,27);hangar(G,58,-150,-.35);
 /* fuel bowser parked off to the side */
 const tr=new T.Group();tr.add(box(2.2,1.6,2.1,std({color:0xd8d4c8,roughness:.5,metalness:.2}),-3.2,1.3,0));const tk=cyl(.95,.95,5,std({color:0xc9c9c2,metalness:.6,roughness:.35}),24);tk.rotation.z=Math.PI/2;tk.position.set(.6,1.55,0);tr.add(tk);tr.add(box(7.4,.3,1.9,MT.dark,-.6,.55,0));
 [-3.4,-.2,1.6,2.6].forEach(x=>[-1,1].forEach(z=>{const w=cyl(.45,.45,.3,MT.hose,16);w.rotation.x=Math.PI/2;w.position.set(x,.45,z);tr.add(w)}));tr.position.set(-8,0,-9);tr.rotation.y=.35;G.add(tr);
 const anchor=new T.Object3D();anchor.position.set(0,1.65,0);G.add(anchor);
 return{G,E,outer,half,core,rotor,liner,flaps,
  labels:[['FAN',[-5.05,.15,0],[0,-58]],['COMPRESSOR',[-3.5,.12,0],[0,62]],['BYPASS DUCT',[-3.3,.47,0],[0,-52]],['COMBUSTOR',[-2.42,.37,0],[-10,-70]],['TURBINE',[-1.92,.2,0],[10,64]],['AFTERBURNER',[-1.35,0,0],[20,-62]],['NOZZLE',[-.4,.42,0],[30,60]]],
  flow:()=>[{w:.55,band:1,k:0,sp:1,ax:[[-5.9,0,.42,0],[-5.05,.2,.44,.03],[-4.25,.25,.42,.1],[-3.0,.3,.4,.42],[-2.72,.33,.41,.5],[-2.42,.34,.41,.85],[-2.12,.33,.42,1.0],[-1.85,.31,.45,.9],[-1.3,.05,.45,-1],[-.55,0,.42,-1],[0,0,.36,-1],[1.2,0,.4,-1]]},
   {w:.45,band:1,k:0,sp:1,ax:[[-5.9,.42,.58,0],[-5.05,.46,.56,.03],[-4.25,.455,.52,.06],[-3.0,.455,.49,.08],[-2.2,.455,.5,.1],[-1.8,.46,.52,.15],[-1.3,.3,.5,-2],[-.55,.2,.46,-2],[0,.1,.36,-2],[1.2,.1,.42,-2]]}],seals,actu,inner,anchor,lens:[lp1,lp2],
  upd(dt){/* exit radius: open at idle, closes toward MIL, opens wide with the afterburner */
   const re=.45-.1*sm(.3,.95,state.N)+.17*state.A,x0=-1.05,r0=.53,len=Math.hypot(-x0,r0-re),pitch=Math.atan2(re-r0,-x0);
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;q.setFromEuler(e.set(a,0,pitch,'XYZ'));M4.compose(V3(x0,Math.cos(a)*r0,Math.sin(a)*r0),q,V3(len,1,1));flaps.setMatrixAt(i,M4);
    const a2=a+Math.PI/16;q.setFromEuler(e.set(a2,0,pitch,'XYZ'));M4.compose(V3(x0,Math.cos(a2)*(r0-.012),Math.sin(a2)*(r0-.012)),q,V3(len,1,1));seals.setMatrixAt(i,M4)}
   flaps.instanceMatrix.needsUpdate=seals.instanceMatrix.needsUpdate=true;
   actu.forEach(([a,c,rod])=>{const ca=Math.cos(a),sa=Math.sin(a),rr=.62,ext=.12+state.A*.18+(.45-re)*.3;c.position.set(-1.55,ca*rr,sa*rr);c.rotation.set(a,0,Math.PI/2);rod.position.set(-1.55+.25+ext*.5,ca*rr,sa*rr);rod.rotation.set(a,0,Math.PI/2);rod.scale.y=(ext+.15)/.4});
   rotor.rotation.x+=state.N*dt*7;linM.emissiveIntensity=state.fu*(.1+state.N*.32)*(.85+.15*Math.sin(state.simT*37))+state.ign*.4;
   const ex=state.exposed;outer.visible=!ex;half.visible=ex;liner.visible=split.visible=ex}}}

/* ======================= SR-71: J58 in its nacelle (spike, cowl, blow-in doors, ejector) on cradles ======================= */
function buildSR(){const G=new T.Group(),E=new T.Group();E.position.set(0,2.05,0);G.add(E);
 const shell=new T.Group(),shellH=new T.Group(),j58H=new T.Group(),tubes=new T.Group(),inside=new T.Group(),spike=new T.Group();E.add(shell,shellH,j58H,tubes,inside,spike);
 spike.add(lathe([[0,-9.25],[.12,-8.95],[.27,-8.55],[.4,-8.05],[.48,-7.5],[.52,-6.9],[.52,-6.2],[.44,-5.9]],MT.sr,56));
 spike.add(ring(.47,.008,-8.3,MT.dark,56),ring(.515,.008,-7.2,MT.dark,56));
 /* nacelle: cowl, inlet duct, door recess, aft section; each built whole and as a cut-away half */
 const ductM=std({color:0x0c0d10,metalness:.3,roughness:.7,side:T.DoubleSide});CAT.set(ductM,'case');
 [[[[.725,-8.15],[.75,-7.9],[.79,-7.4],[.835,-6.7],[.85,-6.0],[.855,-2.05]],MT.sr,72],[[[.715,-8.12],[.705,-7.5],[.67,-6.8],[.6,-6.1]],ductM,64],[[[.79,-2.05],[.79,-1.35]],MT.srHot,72],[[[.855,-1.35],[.85,-.7],[.82,-.1],[.8,0]],MT.sr,72]]
  .forEach(([p,m,sg])=>{shell.add(lathe(p,m,sg));shellH.add(lathe(p,m,sg,true))});
 const cface=new T.Mesh(new T.CircleGeometry(.6,40),std({color:0x3a3d44,metalness:.8,roughness:.4}));cface.rotation.y=-Math.PI/2;cface.position.x=-6.05;shell.add(cface);
 [-7.0,-5.4,-4.0,-3.2].forEach(x=>{shell.add(ring(.857,.006,x,MT.dark,72));shellH.add(halfRing(.857,.006,x,MT.dark,40))});
 /* blow-in doors: 8 panels hinged at their forward edge; they swing in at low Mach to feed the ejector */
 const dg=new T.BoxGeometry(.66,.025,.6);dg.translate(.33,0,0);const doors=[];
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,h=new T.Group();h.position.set(-2.03,Math.cos(a)*.852,Math.sin(a)*.852);h.rotation.x=a;const d=new T.Mesh(dg,MT.sr);d.castShadow=true;h.add(d);E.add(h);doors.push(h)}
 /* free-floating ejector flaps */
 const tg=new T.BoxGeometry(.42,.02,.32);tg.translate(.21,0,0);const tail=new T.InstancedMesh(tg,MT.sr,16),tm=[],Z=new T.Matrix4().makeScale(0,0,0);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const q=new T.Quaternion().setFromEuler(new T.Euler(a,0,-.14,'XYZ'));tm.push([new T.Matrix4().compose(V3(-.12,Math.cos(a)*.8,Math.sin(a)*.8),q,V3(1,1,1)),Math.sin(a)]);tail.setMatrixAt(i,tm[i][0])}tail.castShadow=true;E.add(tail);
 /* J58 afterburner nozzle, faked interior (turbine face, flameholders) for the closed view */
 const nozP=[[.62,-1.4],[.6,-.8],[.56,-.45]],noz=lathe(nozP,MT.srHot,56),nozH=lathe(nozP,MT.srHot,56,true);E.add(noz,nozH);
 const tf=new T.Mesh(new T.CircleGeometry(.6,40),MT.inner);tf.rotation.y=Math.PI/2;tf.position.x=-1.6;E.add(tf);E.add(ring(.32,.016,-1.2,MT.inner,40),ring(.48,.016,-1.15,MT.inner,40));
 /* J58 in section: compressor, burner, turbine, long afterburner duct */
 j58H.add(lathe([[.36,-6.05],[.56,-5.95],[.62,-5.6],[.62,-3.7],[.58,-3.35],[.64,-3.1]],MT.ti,56,true));
 j58H.add(lathe([[.64,-3.1],[.64,-1.4]],MT.hot,56,true));
 [-5.6,-4.8,-3.8,-2.9,-2.0].forEach(x=>j58H.add(halfRing(.645,.014,x,MT.steel,40)));
 j58H.add(box(1.1,.26,.4,MT.dark,-4.6,-.78,0));
 /* the six bleed-bypass tubes; only the three behind the cut are drawn in section */
 const tubeCurves=[];
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.26,pts=[onCase(-5.15,.62,a),onCase(-5.05,.74,a),onCase(-4.6,.76,a),onCase(-3.2,.78,a),onCase(-2.7,.76,a),onCase(-2.55,.64,a)];if(Math.sin(a)<.05){tubes.add(pipe(pts,.065,MT.steel,40));tubeCurves.push(pts)}}
 const rot=new T.Group();inside.add(rot);
 rot.add(lathe([[0,-6.15],[.15,-6.05],[.3,-5.92]],MT.alu,32));
 const nb=[];for(let k=0;k<9;k++)nb.push([-5.82+k*.24,.3+k*.018,.58-k*.014,26+k*3,.09,.45]);nb.push([-3.25,.33,.55,40,.07,.3],[-3.1,.34,.56,44,.07,.3]);
 rot.add(bladeRing(nb,MT.ti));const sh2=cyl(.07,.07,3,MT.steel,12);sh2.rotation.z=Math.PI/2;sh2.position.x=-4.6;rot.add(sh2);rot.add(lathe([[.3,-5.9],[.36,-4.0],[.36,-3.75]],MT.ti,40));
 const burnM=std({color:0x2a2420,metalness:.5,roughness:.6,side:T.DoubleSide,emissive:0xff7a2a,emissiveIntensity:0});CAT.set(burnM,'inner');
 inside.add(lathe([[.36,-3.72],[.5,-3.66],[.53,-3.48],[.48,-3.36],[.37,-3.33]],burnM,48,true));
 inside.add(lathe([[.62,-3.0],[.62,-1.4]],MT.inner,48,true));
 /* cradles */
 const S=new T.Group();G.add(S);
 [-6.4,-2.6].forEach(x=>{beam(S,[x,0,-.9],[x,1.0,-.35],.18,MT.yel);beam(S,[x,0,.9],[x,1.0,.35],.18,MT.yel);S.add(box(.3,.14,1.2,MT.yel,x,1.12,0));beam(S,[x,0,-.9],[x,0,.9],.2,MT.yel)});
 beam(S,[-7,.1,0],[-2,.1,0],.2,MT.yel);
 /* AG330 start cart: two big V8s in a yellow trailer, driveshaft up to the engine's starter pad */
 const cart=new T.Group();cart.add(box(2.8,1.2,1.3,MT.yel,0,1.0,0));cart.add(box(2.6,.15,1.2,MT.dark,0,.38,0));
 for(let i=0;i<6;i++)cart.add(box(.05,.5,1.1,MT.dark,-1+i*.4,1.25,.66));[-1,1].forEach(x=>[-.6,.6].forEach(z=>{const w=cyl(.32,.32,.22,MT.hose,16);w.rotation.x=Math.PI/2;w.position.set(x,.32,z);cart.add(w)}));
 cart.position.set(-4.4,0,-3.4);G.add(cart);G.add(pipe([[-4.4,1.5,-2.75],[-4.5,1.4,-1.6],[-4.55,1.32,-.5],[-4.6,1.27,0]],.05,MT.steel));
 const pad=new T.Mesh(new T.PlaneGeometry(44,26),std({map:padTex(.4,.5,.55,.22),roughness:.88}));pad.rotation.x=-Math.PI/2;pad.position.set(3,.012,0);pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 const lp1=lightPole(G,-12,9),lp2=lightPole(G,13,8);blastFence(G,30);hangar(G,64,-165,-.3);
 const anchor=new T.Object3D();anchor.position.set(0,2.05,0);G.add(anchor);
 let lastEx=-1;
 return{G,E,anchor,lens:[lp1,lp2],
  labels:[['INLET SPIKE',[-8.4,.25,0],[0,-62]],['COMPRESSOR',[-4.9,.25,0],[0,64]],['BYPASS TUBES',[-3.9,.76,-.3],[-20,-58]],['BURNER',[-3.5,.4,0],[-30,66]],['TURBINE',[-3.17,.3,0],[40,-64]],['AFTERBURNER',[-2.2,0,0],[20,62]],['BLOW-IN DOORS',[-1.7,.82,-.3],[10,-60]],['EJECTOR',[-.25,.8,0],[40,58]]],
  flow:()=>[{w:.48,band:1,k:0,sp:1,ax:[[-10.4,0,.5,0],[-8.8,.3,.6,0],[-7.6,.47,.66,.05],[-6.3,.36,.58,.08],[-5.9,.33,.57,.1],[-4.8,.34,.53,.3],[-3.75,.37,.49,.5],[-3.5,.38,.5,1],[-3.2,.36,.52,.92],[-2.4,.05,.56,-1],[-1,0,.56,-1],[0,0,.56,-1],[1.4,0,.62,-1]]},
   {w:.3,band:1,k:0,sp:1,ax:[[-10.4,.5,.9,0],[-8.8,.63,.72,0],[-7.6,.67,.71,.02],[-6.3,.63,.69,.04],[-5,.67,.82,.06],[-3,.69,.82,.08],[-1.4,.67,.8,.1],[0,.6,.8,-2],[1.4,.62,.85,-2]]}]
   .concat(tubeCurves.map(pts=>({w:.07,k:0,sp:1,cv:pts,r:.035,t0:.32,t1:.42,al:()=>sm(1.8,2.6,state.mach)}))),
  upd(dt){const o=1-sm(.6,1.2,state.mach);doors.forEach(h=>{h.children[0].rotation.z=-.42*o});spike.position.x=state.spk*.66;
   const ex=state.exposed;shell.visible=noz.visible=tf.visible=!ex;shellH.visible=j58H.visible=tubes.visible=inside.visible=nozH.visible=ex;
   rot.rotation.x+=state.N*dt*6;burnM.emissiveIntensity=state.fu*(.1+state.N*.32)*(.85+.15*Math.sin(state.simT*41))+state.ign*.4;
   if(ex!==lastEx){lastEx=ex;doors.forEach(h=>h.visible=!ex||h.position.z<.01);tm.forEach(([m,sn],i)=>tail.setMatrixAt(i,ex&&sn>.05?Z:m));tail.instanceMatrix.needsUpdate=true}}}}

/* ======================= RS-25: fired vertically into a flame deflector on a test stand ======================= */
function buildSS(){const G=new T.Group(),gim=new T.Group();gim.position.set(0,9.6,0);gim.rotation.z=-Math.PI/2;G.add(gim);
 const E=new T.Group();gim.add(E);
 const h=t=>.135+(1.15-.135)*(1-Math.pow(1-t,2.1)),X0=1.42,X1=4.3;
 const prof=[];for(let i=0;i<=26;i++){const t=i/26;prof.push([h(t),X0+t*(X1-X0)])}
 const bell=lathe(prof,MT.bell,96);E.add(bell);const bellHM=MT.bell.clone();bellHM.side=T.DoubleSide;bellHM.emissive=new T.Color(0x6a70ff);bellHM.emissiveIntensity=0;CAT.set(bellHM,'bell');const bellH=lathe(prof,bellHM,96,true);E.add(bellH);
 const bellIn=lathe(prof.map(p=>[p[0]-.012,p[1]]),std({color:0x5a4a3c,metalness:.6,roughness:.55,side:T.BackSide,emissive:0x6080ff,emissiveIntensity:0}),96);E.add(bellIn);CAT.set(bellIn.material,'bell');const rgF=new T.Group(),rgH=new T.Group();E.add(rgF,rgH);
 [[.22,.02,.028],[.45,.02,.028],[.7,.02,.028],[1,.015,.05],[.64,.06,.07]].forEach(([t,o,tb])=>{const x=t==1?X1-.03:X0+t*(X1-X0);rgF.add(ring(h(t)+o,tb,x,MT.steel,96));rgH.add(halfRing(h(t)+o,tb,x,MT.steel,56))});
 /* steerhorn: coolant feed from the main fuel valve down the outside of the bell to its manifold */
 E.add(pipe([[.95,.42,.35],[1.25,.55,.42],[1.8,.68,.48],[2.5,.8,.5],[3.1,.9,.52],[3.25,.98,.46]],.075,MT.steel,60));
 /* main combustion chamber, injector, gimbal bearing */
 const mccP=[[.13,X0],[.18,1.32],[.255,1.15],[.26,.78],[.36,.62],[.36,.45],[.16,.3]],mccHM=MT.copper.clone();mccHM.side=T.DoubleSide;const mcc=lathe(mccP,MT.copper,56),mccH=lathe(mccP,mccHM,56,true);E.add(mcc,mccH);
 E.add(lathe([[.11,0],[.13,.05],[.13,.22],[.2,.3]],MT.steel,32));
 const thr=new T.Mesh(new T.CircleGeometry(.14,32),new T.MeshBasicMaterial({color:0x000000}));thr.rotation.y=Math.PI/2;thr.position.x=X0-.02;E.add(thr);
 /* powerhead: hot-gas manifold across the top, high-pressure fuel and oxidiser turbopumps hanging either side */
 const hgm=cyl(.33,.33,1.55,MT.steel,32);hgm.rotation.x=Math.PI/2;hgm.position.set(.55,0,0);E.add(hgm);
 [-1,1].forEach(s=>{const d=new T.Mesh(new T.SphereGeometry(.33,24,12),MT.steel);d.position.set(.55,0,s*.775);d.scale.set(1,1,.4);E.add(d)});
 const pumps=[[.66,.21,1.1,MT.ti],[-.64,.23,1.0,MT.ti]];pumps.forEach(([z,r,l,m])=>{const p=lathe([[r*.7,.35],[r,.45],[r,.45+l*.7],[r*1.15,.45+l*.78],[r*1.15,.45+l],[r*.6,.5+l]],m,32);p.position.z=z;E.add(p);E.add(ring(r+.015,.02,.45+l*.3,MT.steel,32).translateZ(z))});
 E.add(pipe([[1.35,0,.66],[1.4,.2,.5],[1.3,.35,.3],[1.05,.38,.2]],.06,MT.steel));E.add(pipe([[1.3,0,-.64],[1.38,-.2,-.48],[1.25,-.3,-.25],[1.0,-.3,-.15]],.055,MT.steel));
 const ins=std({color:0xd8cfae,metalness:.7,roughness:.35});CAT.set(ins,'cryo');E.add(pipe([[.3,.3,.66],[.1,.45,.75],[-.6,.6,.9],[-1.6,.7,1.0]],.12,ins));E.add(pipe([[.3,-.3,-.64],[.1,-.45,-.75],[-.6,-.6,-.9],[-1.6,-.7,-1.0]],.11,ins));
 /* test stand: concrete flame trench walls, curved steel deflector, steel tower with decks */
 const S=new T.Group();G.add(S);const dk=std({color:0x2c2b29,metalness:.5,roughness:.7});
 const sh=new T.Shape();sh.moveTo(-3,0);sh.lineTo(-3,4.0);sh.quadraticCurveTo(-1.1,1.0,2.8,.75);sh.lineTo(12,.5);sh.lineTo(12,0);sh.closePath();
 const dg=new T.ExtrudeGeometry(sh,{depth:6.6,bevelEnabled:false,curveSegments:24});dg.translate(0,0,-3.3);const defl=new T.Mesh(dg,dk);defl.receiveShadow=defl.castShadow=true;S.add(defl);
 S.add(box(1.4,5.2,8,MT.conc,-3.7,2.6,0),box(16,5.2,1.2,MT.conc,4.5,2.6,-3.9),box(14,1.2,1.2,MT.conc,5,.6,3.9));
 const stl=std({color:0x5f6a72,metalness:.6,roughness:.5});
 [[-3.6,-3.2],[3.6,-3.2]].forEach(([x,z])=>beam(S,[x,0,z],[x,14.5,z],.42,stl));beam(S,[-3.6,0,-1],[-3.6,10.6,-1],.3,stl);beam(S,[3.6,0,-1],[3.6,10.6,-1],.3,stl);
 [10.9,14.4].forEach(y=>{S.add(box(7.6,.25,6.6,dk,0,y,-.1));[[-3.6,-3.2,3.6,-3.2],[-3.6,3,3.6,3],[-3.6,-3.2,-3.6,3],[3.6,-3.2,3.6,3]].forEach(([a,b,c,d])=>{beam(S,[a,y+.55,b],[c,y+.55,d],.05,MT.yel);beam(S,[a,y-.35,b],[c,y-.35,d],.35,stl)})});
 for(let i=0;i<5;i++){beam(S,[-3.6,1.2+i*1.9,-3.2],[-3.6,3.1+i*1.9,-1],.12,stl);beam(S,[3.6,1.2+i*1.9,-1],[3.6,3.1+i*1.9,-3.2],.12,stl)}
 S.add(box(2.4,.4,2.4,stl,0,10.45,0));beam(S,[0,10.3,0],[0,9.75,0],.25,MT.steel);
 S.add(box(7.4,.12,2.0,dk,0,7.4,-2.3));[[-3.6,-1.3,3.6,-1.3]].forEach(([a,b,c,d])=>beam(S,[a,7.95,b],[c,7.95,d],.05,MT.yel));
 [-1,1].forEach(s=>{beam(S,[s*1.4,10.2,-.5],[s*.45,9.05,-.2],.1,MT.steel);beam(S,[s*1.4,10.2,-.5],[s*.95,9.6,-.35],.16,MT.dark)});
 /* site: liquid hydrogen dewar sphere, water tower, run tank */
 const sp=new T.Mesh(new T.SphereGeometry(7,32,16),MT.white);sp.position.set(-32,9,-38);sp.castShadow=true;S.add(sp);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;beam(S,[-32+Math.cos(a)*5,0,-38+Math.sin(a)*5],[-32+Math.cos(a)*6,8,-38+Math.sin(a)*6],.4,MT.gry)}
 const wt=cyl(4,4,6,MT.white,24);wt.position.set(30,24,-55);S.add(wt);for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;beam(S,[30+Math.cos(a)*5,0,-55+Math.sin(a)*5],[30+Math.cos(a)*3.5,21,-55+Math.sin(a)*3.5],.35,MT.gry)}
 const rt=cyl(2.4,2.4,10,MT.white,24);rt.position.set(-9,13,-10);S.add(rt);beam(S,[-9,0,-10],[-9,8,-10],1.2,MT.gry);
 const pad=new T.Mesh(new T.PlaneGeometry(40,30),std({map:padTex(.45,.5,.4,.3),roughness:.9}));pad.rotation.x=-Math.PI/2;pad.position.set(6,.012,0);pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 const lp1=lightPole(G,-12,9),lp2=lightPole(G,13,8);
 const anchor=new T.Object3D();anchor.position.set(X1,0,0);E.add(anchor);
 const hpt=t=>h(t)-.004;
 return{G,E,gim,anchor,bellIn,thr,lens:[lp1,lp2],
  labels:[['GIMBAL BEARING',[.08,0,0],[-120,0]],['HOT-GAS MANIFOLD',[.55,.3,-.3],[120,-16]],['FUEL TURBOPUMP',[.95,-.2,.66],[-130,10]],['OXIDIZER TURBOPUMP',[.9,.2,-.64],[130,8]],['COMBUSTION CHAMBER',[1.0,0,0],[-140,-4]],['THROAT',[1.42,0,0],[120,0]],['STEERHORN',[2.5,.82,.5],[110,-10]],['COOLED NOZZLE WALL',[3.4,-.9,-.3],[-130,0]]],
  flow:()=>[{w:.5,band:1,k:3,sp:1,ax:[[.32,0,.2,1],[.75,0,.24,1],[1.25,0,.16,1],[1.42,0,.11,1],[2.0,0,.5,.95],[3.0,0,.82,.9],[4.3,0,1.06,.85],[5.2,0,1.12,.8]]},
   {w:.14,k:1,sp:1,cv:[[.95,.42,.35],[1.25,.55,.42],[1.8,.68,.48],[2.5,.8,.5],[3.1,.9,.52],[3.25,.98,.46]],r:.045,t0:0,t1:.25},
   {w:.14,band:1,k:1,sp:.6,ax:[[X0+.64*(X1-X0),hpt(.64),hpt(.64),.25],[X0+.4*(X1-X0),hpt(.4),hpt(.4),.5],[X0+.15*(X1-X0),hpt(.15),hpt(.15),.8],[X0,.13,.13,1]]},
   {w:.1,k:2,sp:1,cv:[[1.3,0,-.64],[1.05,-.22,-.45],[.65,-.2,-.18],[.35,0,0]],r:.035,t0:.2,t1:.5},
   {w:.12,k:1,sp:1,cv:[[-1.6,.7,1.0],[-.6,.6,.9],[.1,.45,.75],[.45,.2,.66],[.9,0,.66]],r:.06,t0:0,t1:.1}],
  upd(dt){const gm=gimb();gim.rotation.z=-Math.PI/2+gm*.55;gim.rotation.x=.25*gm*Math.sin(state.simT*.6);
  const ex=state.exposed;bell.visible=bellIn.visible=rgF.visible=mcc.visible=thr.visible=!ex;bellH.visible=rgH.visible=mccH.visible=ex;bellHM.emissiveIntensity=state.N*state.fu*.12;
  bellIn.material.emissiveIntensity=state.N*state.fu*.25;thr.material.color.setRGB(2+state.N*state.fu*14,2.4+state.N*state.fu*16,4+state.N*state.fu*24).multiplyScalar(state.fu*state.N+state.ign*.4)}}}

/* ======================= HALL THRUSTER on a solar-electric spacecraft ======================= */
function buildHT(){const G=new T.Group();
 const mliT=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#b8893a';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){const a=Math.random()*6.28,l=10+Math.random()*60,cx=Math.random()*w,cy=Math.random()*h,v=Math.random();x.strokeStyle=v<.5?`rgba(255,226,150,${.06+v*.16})`:`rgba(90,60,20,${.06+(v-.5)*.2})`;x.lineWidth=1+Math.random()*3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);x.stroke()}},true,[1.5,1.5]);
 const mli=std({color:0xffffff,map:mliT,metalness:.65,roughness:.42});
 const cellT=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#0a1630';x.fillRect(0,0,w,h);for(let i=0;i<16;i++)for(let j=0;j<12;j++){const g=x.createLinearGradient(i*32,j*42,i*32+30,j*42+40);g.addColorStop(0,'#13285a');g.addColorStop(1,'#0b1838');x.fillStyle=g;x.fillRect(i*32+1,j*42+1,30,40)}x.strokeStyle='rgba(200,210,230,.35)';x.lineWidth=1;for(let i=0;i<=16;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,h);x.stroke()}},true);
 const cellM=std({map:cellT,metalness:.35,roughness:.22}),backM=std({color:0xd8dbe0,roughness:.6,metalness:.1});
 const bus=box(1.9,1.7,1.7,mli,-1.25,0,0);G.add(bus);G.add(box(1.5,1.1,.02,MT.white,-1.25,0,.861),box(1.5,1.1,.02,MT.white,-1.25,0,-.861));
 const dish=lathe([[0,0],[.35,.05],[.7,.19],[.82,.27]],MT.white,40);dish.rotation.z=Math.PI/2;dish.position.set(-1.35,.88,0);G.add(dish);const fs=cyl(.025,.025,.5,MT.steel,8);fs.position.set(-1.35,1.3,0);G.add(fs);
 [-1,1].forEach(sg=>{beam(G,[-1.25,sg*.85,0],[-1.25,sg*1.55,0],.06,MT.steel);for(let i=0;i<5;i++){const p=new T.Mesh(new T.BoxGeometry(2.3,1.9,.035),[backM,backM,backM,backM,cellM,backM]);p.position.set(-1.25,sg*(1.62+i*1.96+.95),0);p.castShadow=p.receiveShadow=true;G.add(p)}});
 G.add(box(.08,.08,1.6,MT.steel,-2.2,.3,0));const mag=box(.12,.12,.12,MT.dark,-2.2,.3,.85);G.add(mag);
 /* thruster: front pole plate, ceramic channel, central pole, outer coils, anode ring, hollow cathode */
 const cer=std({color:0xe9e4da,roughness:.6,metalness:0,emissive:0x6a5cff,emissiveIntensity:0,side:T.DoubleSide});CAT.set(cer,'hot');
 const pole=std({color:0x3e4148,metalness:.8,roughness:.45,side:T.DoubleSide});CAT.set(pole,'case');
 const anM=std({color:0x8a8f96,metalness:.8,roughness:.4,emissive:0x7a6cff,emissiveIntensity:0,side:T.DoubleSide});CAT.set(anM,'inner');
 const ringM=new T.MeshBasicMaterial({color:0x000000,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 function thruster(px,py,pz,live){const E=new T.Group();E.position.set(px,py,pz);G.add(E);const full=new T.Group(),half=new T.Group(),inner=new T.Group();E.add(full,half,inner);
  [[[[.072,-.003],[.16,-.003],[.16,-.014],[.1,-.014],[.1,-.13],[.04,-.13]],pole],[[[.07,-.003],[.07,-.034]],cer],[[[.045,-.034],[.045,-.003]],cer],[[[0,-.001],[.04,-.001],[.043,-.003],[.043,-.03]],pole],[[[.0455,-.033],[.0695,-.033]],anM]]
   .forEach(([p,m])=>{full.add(lathe(p,m,64));half.add(lathe(p,m,48,true))});
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4,c=cyl(.026,.026,.096,MT.copper,16);c.rotation.z=Math.PI/2;c.position.set(-.062,Math.cos(a)*.132,Math.sin(a)*.132);(Math.sin(a)>0?full:E).add(c)}
  inner.add(lathe([[.028,-.035],[.038,-.035],[.038,-.12],[.028,-.12]],MT.copper,32,true));
  /* magnetic field lines across the channel mouth (cutaway only) */
  const flM=new T.MeshBasicMaterial({color:0x40e0ff,transparent:true,opacity:.75});
  [1,-1].forEach(sg=>[[.006],[.011],[.016]].forEach(([b])=>{inner.add(pipe([[-.004,sg*.041,-.002],[b*.6,sg*.05,-.002],[b,sg*.058,-.002],[b*.6,sg*.066,-.002],[-.004,sg*.075,-.002]],.0012,flM,24))}));
  const glow=new T.Mesh(new T.RingGeometry(.046,.069,64),ringM.clone());glow.rotation.y=Math.PI/2;glow.position.x=.002;E.add(glow);
  /* hollow cathode on its bracket above the channel, tip near the exit plane */
  const ca=V3(-.09,.24,0),cb=V3(.004,.19,0);const cm=cyl(.014,.014,ca.distanceTo(cb),MT.steel,12);cm.position.copy(ca).add(cb).multiplyScalar(.5);cm.quaternion.setFromUnitVectors(V3(0,1,0),cb.clone().sub(ca).normalize());E.add(cm);
  E.add(box(.02,.08,.03,MT.dark,-.09,.2,0));const tip=new T.Mesh(new T.SphereGeometry(.009,12,8),new T.MeshBasicMaterial({color:0x000000}));tip.position.copy(cb);E.add(tip);
  E.add(pipe([[-.13,0,0],[-.2,-.05,0],[-.28,-.08,.05]],.008,MT.steel),box(.06,.12,.12,MT.dark,-.17,0,0));
  return{E,full,half,inner,glow,tip,live}}
 const t1=thruster(-.17,-.35,.35,1),t2=thruster(-.17,-.35,-.35,0);
 const anchor=new T.Object3D();t1.E.add(anchor);
 return{G,E:t1.E,anchor,lens:[],
  labels:[['DISCHARGE CHANNEL',[-.006,.058,-.01],[-40,-62]],['ANODE / GAS FEED',[-.031,-.058,-.01],[-60,56]],['MAGNETIC COIL',[-.062,.093,-.093],[60,-58]],['HOLLOW CATHODE',[-.05,.215,0],[-80,-30]],['CENTRAL POLE',[0,0,0],[70,48]],['FIELD LINES',[.011,-.058,-.002],[70,30]],['ION BEAM',[.35,0,0],[30,-50]]],
  flow:()=>[{w:.42,band:1,k:4,sp:.35,ax:[[-.03,.048,.067,0],[-.018,.048,.067,.08],[-.008,.05,.065,.25],[0,.05,.066,.55],[.05,.04,.11,.75],[.25,.0,.3,.9],[.8,0,.75,1]]},
   {w:.38,k:5,ring:[-.012,-.001,.049,.066],om:9},
   {w:.2,k:5,sp:.6,cv:[[.004,.19,0],[.03,.15,-.01],[.03,.09,-.02],[0,.06,-.02]],r:.012,t0:0,t1:0}],
  upd(dt){const nn=state.N*state.fu,ex=state.exposed;[t1,t2].forEach(t=>{t.full.visible=!ex;t.half.visible=t.inner.visible=ex});
   cer.emissiveIntensity=nn*.5+state.ign*.6;anM.emissiveIntensity=nn*2.2+state.ign*2;
   t1.glow.material.color.setRGB(.6,.7,2.6).multiplyScalar(nn*1.1+state.ign*1.8);t2.glow.material.color.setRGB(0,0,0);
   const ht=state.ph==1?Math.min(1,state.st/2.5):0;t1.tip.material.color.setRGB(3*ht+.8*nn,1.1*ht+1.1*nn,.2*ht+2.6*nn);t2.tip.material.color.setRGB(0,0,0);
   const al=Math.max(100,(orb.r-RE)/1e3);earth.position.set(0,-(6371+al),0);earthU.uRot.value+=dt*Math.min(WF[state.sl],60)*Math.sqrt(MU/(orb.r*orb.r*orb.r));earthU.uT.value+=dt*Math.min(WF[state.sl],60)}}}

/* ======================= SATURN V S-IC: five F-1s on a vertical static test stand ======================= */
function buildF1(){const G=new T.Group();
 const extM=std({color:0x3a3936,metalness:.7,roughness:.5,side:T.DoubleSide});CAT.set(extM,'bell');
 const bellHM=MT.bell.clone();bellHM.side=T.DoubleSide;CAT.set(bellHM,'bell');
 const POS=[[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]],engines=[];
 function f1(px,pz,cut){const gim=new T.Group();gim.position.set(px,15,pz);gim.rotation.z=-Math.PI/2;G.add(gim);const E=new T.Group();gim.add(E);
  const h=t=>.46+(1.45-.46)*(1-Math.pow(1-t,2.0)),X0=1.75,X1=3.5,X2=5.6,prof=[];for(let i=0;i<=20;i++){const t=i/20;prof.push([h(t),X0+t*(X1-X0)])}
  const ext=[[1.45,X1],[1.6,4.2],[1.73,4.9],[1.84,X2]],cham=[[.46,X0],[.6,1.35],[.6,.75],[.62,.6],[.55,.35],[.15,.15]];
  const full=new T.Group(),half=new T.Group();E.add(full,half);
  full.add(lathe(prof,MT.bell,64),lathe(ext,extM,64),lathe(cham,MT.steel,48),ring(1.62,.21,X1+.06,MT.dark,64));
  [3.9,4.6,5.25].forEach(x=>full.add(ring(1.45+(x-X1)/(X2-X1)*.39+.02,.025,x,MT.steel,64)));
  if(cut){half.add(lathe(prof,bellHM,48,true),lathe(ext,extM,48,true),lathe(cham,MT.steel,40,true),halfRing(1.62,.21,X1+.06,MT.dark,40))}
  E.add(lathe([[.1,0],[.2,.05],[.2,.2],[.12,.25]],MT.steel,24));
  /* Mark 10 turbopump on the side, its turbine exhaust duct down to the manifold, feed lines up into the stage */
  const tp=lathe([[0,.35],[.42,.45],[.46,.9],[.42,1.6],[.3,2.0],[0,2.1]],MT.ti,32);tp.position.y=1.05;E.add(tp);
  E.add(pipe([[2.0,1.05,0],[2.6,1.25,0],[3.15,1.5,0],[3.45,1.62,0]],.19,MT.dark,24));
  E.add(pipe([[1.0,.95,.35],[.3,.85,.55],[-.7,.6,.6]],.17,MT.steel),pipe([[.9,-.62,0],[.2,-.62,0],[-.7,-.5,0]],.2,MT.steel),box(.5,.42,.42,MT.dark,1.4,1.05,.5));
  const anchor=new T.Object3D();anchor.position.x=X2;E.add(anchor);return{gim,E,full,half,anchor}}
 POS.forEach(([x,z],i)=>engines.push(f1(x,z,i==1)));
 /* stage: base heat shield, roll-pattern thrust section, fairings and fins over the outer engines */
 const stT=canvasTex(512,256,(x,w,h)=>{x.fillStyle='#e9e9e4';x.fillRect(0,0,w,h);x.fillStyle='#141414';for(let i=0;i<4;i++)x.fillRect(i*w/4,0,w/8,h*.6);x.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<64;i++)x.fillRect(i*8,0,1,h)},true);
 const stage=new T.Mesh(new T.CylinderGeometry(5,5,12,64,1,true),std({map:stT,roughness:.55,metalness:.1,side:T.DoubleSide}));stage.position.y=21.9;stage.castShadow=stage.receiveShadow=true;G.add(stage);
 const st2=cyl(5,5,36,MT.white,64);st2.position.y=45.9;G.add(st2);const base=cyl(5,5,.4,MT.dark,64);base.position.y=15.7;G.add(base);
 const frM=std({color:0xe4e4df,roughness:.55,side:T.DoubleSide});
 POS.slice(1).forEach(([x,z])=>{const f=new T.Mesh(new T.CylinderGeometry(.95,1.3,2.3,32,1,true),frM);f.position.set(x*1.24,14.75,z*1.24);f.castShadow=true;G.add(f);
  const a=Math.atan2(z,x),fn=box(3.4,4.6,.28,MT.white);fn.position.set(Math.cos(a)*6.6,17.9,Math.sin(a)*6.6);fn.rotation.y=-a;G.add(fn)});
 /* stand: concrete towers, crosshead, hold-down arms, flame deflector, service tower behind */
 const S=new T.Group();G.add(S);const dk=std({color:0x2c2b29,metalness:.5,roughness:.7}),stl=std({color:0x5f6a72,metalness:.6,roughness:.5});
 const sh=new T.Shape();sh.moveTo(-7,0);sh.lineTo(-7,8);sh.quadraticCurveTo(-2.5,1.8,6.5,1.4);sh.lineTo(32,1);sh.lineTo(32,0);sh.closePath();
 const dg=new T.ExtrudeGeometry(sh,{depth:17,bevelEnabled:false,curveSegments:24});dg.translate(0,0,-8.5);const defl=new T.Mesh(dg,dk);defl.receiveShadow=defl.castShadow=true;S.add(defl);
 [-1,1].forEach(sg=>{S.add(box(5,23,9,MT.conc,sg*10.6,11.5,-2.5));beam(S,[sg*8.2,17,-1.5],[sg*4.8,17,-.6],.7,stl);beam(S,[sg*8.2,13.5,-1.5],[sg*4.9,16.2,-.6],.5,stl)});
 S.add(box(26.2,4,6,MT.conc,0,25,-4.5),box(34,10,1.6,MT.conc,13,5,-9.6));
 for(let i=0;i<6;i++)beam(S,[-6+i*2.4,0,-12],[-6+i*2.4,62,-12],.5,stl);for(let y=4;y<62;y+=5)beam(S,[-6.5,y,-12],[6.5,y,-12],.35,stl);
 const pad=new T.Mesh(new T.PlaneGeometry(70,50),std({map:padTex(.45,.5,.45,.3),roughness:.9}));pad.rotation.x=-Math.PI/2;pad.position.set(12,.012,0);pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 const lp1=lightPole(G,-16,16),lp2=lightPole(G,22,15);
 const cE=engines[1];
 return{G,E:cE.E,anchor:engines[0].anchor,lens:[lp1,lp2],
  labels:[['GIMBAL',[.12,0,0],[-110,-10]],['LOX DOME',[.3,0,-.2],[-120,14]],['TURBOPUMP ~55,000 hp',[1.3,1.0,-.2],[120,-20]],['COMBUSTION CHAMBER',[1.0,0,0],[-140,30]],['TUBE-COOLED NOZZLE',[2.7,-1.1,-.4],[-130,10]],['TURBINE EXHAUST MANIFOLD',[3.56,1.62,-.2],[130,10]],['NOZZLE EXTENSION',[4.8,-1.6,-.6],[-120,0]]],
  flow:()=>[{w:.45,band:1,k:0,sp:1,ax:[[.65,0,.5,1],[1.35,0,.55,1],[1.75,0,.44,1],[3.5,0,1.4,.95],[5.6,0,1.8,.9],[7.2,0,2.2,.85]]},
   {w:.16,k:2,sp:1,cv:[[-.7,.6,.6],[.3,.85,.55],[1.0,.95,.35],[1.0,.45,-.1],[.5,.2,-.05],[.35,0,0]],r:.05,t0:.2,t1:.5},
   {w:.14,k:6,sp:1,cv:[[-.7,-.5,0],[.2,-.62,0],[.9,-.62,0],[1.3,-.55,-.1],[1.6,-.5,-.1]],r:.06,t0:0,t1:0},
   {w:.1,k:7,sp:1,cv:[[2.0,1.05,0],[2.6,1.25,0],[3.15,1.5,0],[3.45,1.62,0]],r:.06,t0:0,t1:0},
   {w:.15,band:1,k:7,sp:.8,ax:[[3.6,1.52,1.58,0],[4.5,1.66,1.72,0],[5.6,1.78,1.84,0],[6.4,1.9,2.0,0]]}],
  upd(dt){const ex=state.exposed;cE.full.visible=!ex;cE.half.visible=ex;const gm=gimb();for(let k=1;k<5;k++){engines[k].gim.rotation.x=gm*.25*Math.sin(k*1.7+state.simT*.3)}}}}

/* ======================= HARRIER: Pegasus jump jet on a VTOL pad ======================= */
function buildHR(){const G=new T.Group(),AC=new T.Group();AC.position.y=1.9;G.add(AC);
 const camo=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#646d66';x.fillRect(0,0,w,h);for(let i=0;i<70;i++){x.fillStyle=['#4f5a52','#737c74','#5a6458'][i%3];x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*60,10+Math.random()*30,Math.random()*3,0,6.3);x.fill()}},true);
 const paint=std({map:camo,roughness:.6,metalness:.25,side:T.DoubleSide});CAT.set(paint,'case');
 const prof=[[0,-7.2],[.25,-6.8],[.45,-6.2],[.62,-5.4],[.78,-4.4],[.88,-3.4],[.98,-2.2],[1.02,-.5],[1.0,1.5],[.92,2.8],[.75,4.0],[.55,5.0],[.38,6.0],[.28,6.6],[.05,6.8]];
 const fus=lathe(prof,paint,48),fusH=lathe(prof,paint,40,true);AC.add(fus,fusH);
 const glass=std({color:0x3a4a58,metalness:.6,roughness:.08});const can=new T.Mesh(new T.SphereGeometry(.55,32,16),glass);can.scale.set(2.1,.85,.95);can.position.set(-4.3,.72,0);AC.add(can);
 const top=new T.Group();AC.add(top);top.add(box(4.2,.4,.75,paint,-1.6,.98,0));
 [-1,1].forEach(sg=>{const it=box(1.9,1.15,.6,paint,-2.35,.05,sg*1.12);top.add(it);top.add(box(.06,.95,.46,new T.MeshBasicMaterial({color:0x050608}),-3.31,.05,sg*1.12))});
 const wing=(pts,th)=>{const sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>sh.lineTo(p[0],p[1]));sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:th,bevelEnabled:false});g.rotateX(Math.PI/2);return g};
 const wg=wing([[-1.6,0],[2.0,0],[2.4,3.6],[1.0,3.6]],.14),tg=wing([[4.7,0],[6.0,0],[6.35,1.9],[5.7,1.9]],.08);
 [-1,1].forEach(sg=>{const w=new T.Mesh(wg,paint);w.scale.z=sg;w.position.set(0,.98,sg*.98);w.rotation.x=sg*.2;w.castShadow=true;top.add(w);
  const t=new T.Mesh(tg,paint);t.scale.z=sg;t.position.set(0,.48,sg*.32);t.rotation.x=sg*.26;t.castShadow=true;top.add(t);
  const tip=V3(1.75,.98-3.55*Math.sin(.2),sg*(.98+3.55*Math.cos(.2)));beam(top,[tip.x,tip.y,tip.z],[1.75,-1.55,tip.z],.06,MT.steel);const ow=cyl(.2,.2,.12,MT.hose,14);ow.rotation.x=Math.PI/2;ow.position.set(1.75,-1.7,tip.z);top.add(ow)});
 const fsh=new T.Shape();fsh.moveTo(4.4,0);fsh.lineTo(6.5,0);fsh.lineTo(6.8,2.3);fsh.lineTo(6.0,2.3);fsh.closePath();const fg=new T.ExtrudeGeometry(fsh,{depth:.12,bevelEnabled:false});fg.translate(0,0,-.06);const fin=new T.Mesh(fg,paint);fin.position.y=.75;fin.castShadow=true;top.add(fin);
 [[-3.6,.27],[1.9,.36]].forEach(([x,r])=>{beam(top,[x,-.8,0],[x,-1.6,0],.1,MT.steel);const wl=cyl(r,r,.25,MT.hose,16);wl.rotation.x=Math.PI/2;wl.position.set(x,-1.9+r,0);top.add(wl)});
 /* four swivelling nozzles: cool fan air at the front pair, hot core exhaust at the rear pair */
 const NZ=[];[[-1.0,-.2,1.08,.31,0],[1.15,-.32,1.02,.28,1]].forEach(([x,y,z,r,hot])=>[-1,1].forEach(sg=>{const p=new T.Group();p.position.set(x,y,sg*z);AC.add(p);
  const c=cyl(r,r*.92,.62,hot?MT.hot:MT.steel,24);c.rotation.z=-Math.PI/2;c.position.x=.3;p.add(c);[-.4,0,.4].forEach(o=>p.add(box(.52,.02,r*1.7,MT.dark,.36,o*r,0)));NZ.push(p)}));
 /* Pegasus inside (cutaway only): fan, compressor, combustor, turbines */
 const peg=new T.Group();AC.add(peg);
 peg.add(lathe([[.0,-2.5],[.6,-2.3],[.62,-1.5],[.5,-1.0],[.46,-.2]],MT.ti,40,true),lathe([[.46,-.2],[.44,1.3]],MT.hot,40,true));
 const rot=new T.Group();peg.add(rot);rot.add(lathe([[0,-2.55],[.12,-2.45],[.2,-2.3]],MT.alu,24));
 const nb=[[-2.2,.2,.58,22,.18,.6],[-1.85,.22,.56,28,.12,.5]];for(let k=0;k<6;k++)nb.push([-1.4+k*.13,.24,.42-k*.012,30+k*2,.06,.4]);nb.push([.35,.25,.4,36,.06,.3],[.55,.25,.42,38,.06,.3]);rot.add(bladeRing(nb,MT.ti));
 const pcM=std({color:0x2a2420,metalness:.5,roughness:.6,side:T.DoubleSide,emissive:0xff7a2a,emissiveIntensity:0});CAT.set(pcM,'inner');peg.add(lathe([[.26,-.5],[.38,-.45],[.4,-.05],[.27,0]],pcM,40,true));
 /* pad with a painted landing circle */
 const padT=canvasTex(1024,1024,(x,w,h)=>{x.fillStyle='#86837b';x.fillRect(0,0,w,h);for(let i=0;i<20000;i++){const v=100+Math.random()*60|0;x.fillStyle=`rgba(${v},${v-2},${v-6},.25)`;x.fillRect(Math.random()*w,Math.random()*h,1.5,1.5)}
  x.strokeStyle='rgba(30,28,25,.7)';x.lineWidth=2;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*128,0);x.lineTo(i*128,h);x.moveTo(0,i*128);x.lineTo(w,i*128);x.stroke()}
  const gd=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.32);gd.addColorStop(0,'rgba(20,16,12,.55)');gd.addColorStop(1,'rgba(20,16,12,0)');x.fillStyle=gd;x.fillRect(0,0,w,h);
  x.strokeStyle='#d8b22a';x.lineWidth=18;x.beginPath();x.arc(w/2,h/2,w*.36,0,6.283);x.stroke();x.fillStyle='rgba(235,235,230,.85)';x.font='bold 220px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('H',w/2,h/2)});
 const pad=new T.Mesh(new T.PlaneGeometry(30,30),std({map:padT,roughness:.88}));pad.rotation.x=-Math.PI/2;pad.position.y=.012;pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 const lp1=lightPole(G,-12,9),lp2=lightPole(G,13,8);hangar(G,58,-150,-.35);
 const anchor=new T.Object3D();anchor.position.set(.1,-.35,0);AC.add(anchor);
 return{G,E:AC,AC,anchor,lens:[lp1,lp2],
  labels:[['INTAKE',[-3.25,.1,-1.12],[-40,-56]],['FAN',[-2.2,.35,-.2],[10,-66]],['COMBUSTOR',[-.25,.3,-.2],[30,-60]],['FRONT NOZZLES: COOL FAN AIR',[-.75,-.55,-1.08],[-60,62]],['REAR NOZZLES: HOT CORE',[1.4,-.65,-1.02],[70,58]],['WING',[1.2,.8,-3.0],[40,-48]]],
  flow:()=>[{w:.5,k:0,sp:1,cv:[[-4.4,.05,-1.12],[-3.2,.05,-1.0],[-2.4,.1,-.45],[-1.7,-.05,-.75],[-1.05,-.25,-1.05],[-.8,-.8,-1.1],[-.75,-1.6,-1.1]],r:.18,t0:0,t1:.15},
   {w:.5,k:0,sp:1,cv:[[-4.4,.05,-1.12],[-3.2,.05,-1.0],[-2.4,0,-.2],[-1.5,0,-.15],[-.3,0,-.15],[.5,0,-.2],[.95,-.2,-.75],[1.2,-.65,-1.02],[1.3,-1.4,-1.02]],r:.12,t0:0,t1:.95}],
  upd(dt){const ex=state.exposed;fus.visible=!ex;fusH.visible=ex;peg.visible=ex;rot.rotation.x+=state.N*dt*7;pcM.emissiveIntensity=state.fu*(.1+state.N*.3);
   AC.position.y=1.9+state.alt;AC.rotation.x=state.alt>.05?.006*Math.sin(state.simT*1.3):0;AC.rotation.z=state.alt>.05?.004*Math.sin(state.simT*.9+1):0;
   const a=-state.nz*Math.PI/180;NZ.forEach(p=>p.rotation.z=a);anchor.rotation.z=a}}}

/* ======================= NK-12 TURBOPROP on an outdoor test stand ======================= */
/* propeller blade: radial along +Y, chord along Z (in the plane of rotation), thin along X; twisted, wider in the middle, rounded tip */
function bladeGeo(r0,r1){const NS=16,NK=10,pos=[],idx=[];
 for(let i=0;i<=NS;i++){const t=i/NS,r=r0+(r1-r0)*t,ch=(t<.3?.3+.5*t:.45-.3*(t-.3)/.7)*(1-.55*Math.pow(t,8)),th=ch*(.2-.13*t),tw=.55*(1-t)-.1;
  for(let k=0;k<NK;k++){const a=k/NK*6.283,cz=Math.cos(a)*ch*.5,cx=Math.sin(a)*th*.5*(1+.4*Math.cos(a));pos.push(cx*Math.cos(tw)+cz*Math.sin(tw),r,-cx*Math.sin(tw)+cz*Math.cos(tw))}}
 for(let i=0;i<NS;i++)for(let k=0;k<NK;k++){const a=i*NK+k,b=i*NK+(k+1)%NK;idx.push(a,a+NK,b,b,a+NK,b+NK)}
 const c=pos.length/3;pos.push(0,r1,0);for(let k=0;k<NK;k++)idx.push(NS*NK+k,c,NS*NK+(k+1)%NK);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
function buildTP(){const G=new T.Group(),E=new T.Group();E.position.y=4;G.add(E);
 const cowM=std({color:0x9ba1a7,metalness:.85,roughness:.36,side:T.DoubleSide});CAT.set(cowM,'case');
 const cowP=[[.5,-2.55],[.6,-2.35],[.7,-1.9],[.76,-1.2],[.78,0],[.76,1.2],[.68,2.3],[.56,3.1],[.47,3.55]];
 const cow=lathe(cowP,cowM,56),cowH=lathe(cowP,cowM,48,true);E.add(cow,cowH);E.add(ring(.5,.035,-2.55,MT.steel,48));
 E.add(box(1.0,.2,.4,cowM,-1.5,-.8,0),lathe([[.45,3.45],[.43,3.8],[.41,4.0]],MT.hot,40));
 /* spinner and two four-bladed propellers; the rear set is mirrored because it turns the other way */
 const bG=bladeGeo(.5,2.8),bM=std({color:0x2c2d30,metalness:.4,roughness:.5,side:T.DoubleSide});
 const spin=lathe([[0,-4.42],[.22,-4.3],[.36,-4.07],[.44,-3.78],[.46,-3.56]],MT.steel,40);E.add(spin);
 function prop(x,dir){const P=new T.Group();P.position.x=x;E.add(P);const piv=[];P.add(lathe([[.47,-.22],[.5,0],[.47,.22]],MT.dark,40));
  for(let i=0;i<4;i++){const arm=new T.Group();arm.rotation.x=i*Math.PI/2+(dir<0?Math.PI/4:0);P.add(arm);const pv=new T.Group();arm.add(pv);const b=new T.Mesh(bG,bM);b.castShadow=true;if(dir<0)b.scale.z=-1;pv.add(b);piv.push(pv)}
  return{P,piv}}
 const pF=prop(-3.42,1),pR=prop(-2.86,-1);
 const disc=new T.Mesh(new T.RingGeometry(.5,2.8,64),new T.MeshBasicMaterial({color:0x8a8c90,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));disc.rotation.y=Math.PI/2;disc.position.x=-3.14;disc.userData.pt=1;E.add(disc);
 /* inside (cutaway only): reduction gearbox, 14-stage compressor, cannular combustors, 5-stage turbine */
 const inn=new T.Group();E.add(inn);
 inn.add(lathe([[0,-2.6],[.44,-2.55],[.48,-2.3],[.42,-2.0],[.26,-1.85]],MT.dark,40,true),lathe([[.5,-1.85],[.48,-.4],[.43,.5]],MT.ti,40,true),lathe([[.47,.5],[.5,.9],[.5,1.4],[.47,1.5]],MT.steel,40,true),lathe([[.46,1.5],[.47,2.3],[.44,3.4]],MT.hot,40,true));
 const rot=new T.Group();inn.add(rot);const bl2=[];for(let k=0;k<14;k++){const t=k/13;bl2.push([-1.75+t*2.15,.22+.08*t,.47-.07*t,24+k,.07-.02*t,.5])}
 for(let k=0;k<5;k++)bl2.push([1.6+k*.13,.25,.43,40,.06,-.4]);rot.add(bladeRing(bl2,MT.ti));
 const sh=cyl(.07,.07,4.4,MT.steel,12);sh.rotation.z=Math.PI/2;sh.position.x=-.3;rot.add(sh);rot.add(lathe([[.24,2.3],[.12,3.2],[0,3.45]],MT.dark,32));
 const pcM=std({color:0x2a2420,metalness:.5,roughness:.6,side:T.DoubleSide,emissive:0xff7a2a,emissiveIntensity:0});CAT.set(pcM,'inner');
 for(let k=0;k<5;k++){const a=Math.PI+(k+.5)/5*Math.PI,c=cyl(.075,.06,.8,pcM,14);c.rotation.z=Math.PI/2;c.position.set(.98,Math.cos(a)*.35,Math.sin(a)*.35);inn.add(c)}
 /* the stand: concrete block, yellow steel cradle with a load cell, fuel feed */
 const yel=std({color:0xd2a02a,metalness:.3,roughness:.55}),S=new T.Group();G.add(S);
 S.add(box(4.2,1.1,2.4,MT.conc,0,.55,0),box(3.4,.22,.7,yel,.2,3.08,0),box(.25,.32,.9,yel,-.9,3.3,0),box(.25,.32,.9,yel,1.3,3.3,0),box(.3,.3,.34,MT.dark,-1.55,3.05,0));
 [-1.5,1.7].forEach(x=>[-1,1].forEach(z=>{beam(S,[x,1.1,z],[x*.75,3.0,z*.28],.14,yel)}));beam(S,[-1.5,1.1,-1],[1.7*.75,3.0,-.28],.1,yel);beam(S,[-1.5,1.1,1],[1.7*.75,3.0,.28],.1,yel);
 S.add(pipe([[-.6,1.1,-1.15],[-.5,2.4,-1.0],[-.4,3.25,-.6]],.05,MT.hose));
 const pad=new T.Mesh(new T.PlaneGeometry(44,40),std({map:padTex(.55,.5,.4,.22),roughness:.9}));pad.rotation.x=-Math.PI/2;pad.position.set(4,.012,0);pad.receiveShadow=true;pad.userData.bg=1;CAT.set(pad.material,'gnd');G.add(pad);
 S.add(box(8,3,5,MT.conc,-22,1.5,-16),box(6,.45,.05,new T.MeshBasicMaterial({color:0x07090c}),-22,2.1,-13.47));
 for(let z=-9;z<=9;z+=2.25){const p=box(.15,4,2.15,MT.gry,23,1.8,z);p.rotation.z=.45;S.add(p)}
 const lp1=lightPole(G,-10,9),lp2=lightPole(G,12,10);
 const anchor=new T.Object3D();anchor.position.x=4.0;E.add(anchor);
 return{G,E,anchor,lens:[lp1,lp2],
  labels:[['FRONT PROPELLER',[-3.42,2.2,0],[-70,-40]],['REAR PROPELLER, TURNING THE OTHER WAY',[-2.86,-2.2,0],[-40,40]],['REDUCTION GEARBOX',[-2.3,.3,-.3],[-30,-80]],['14-STAGE COMPRESSOR',[-.6,.45,-.2],[30,-90]],
   ['CANNULAR COMBUSTORS',[.98,-.1,-.35],[60,60]],['5-STAGE TURBINE',[1.85,.4,-.2],[100,-60]],['EXHAUST',[4.0,0,-.4],[80,30]]],
  flow:()=>[{w:.55,band:1,k:0,sp:1,ax:[[-2.6,.32,.5,0],[-1.85,.24,.48,.05],[-.6,.27,.45,.25],[.45,.3,.4,.45],[.6,.27,.42,.55],[1.45,.27,.42,.95],[1.6,.25,.44,.9],[2.15,.25,.44,.7],[3.4,.1,.42,.6],[4.0,0,.4,.55],[5.2,0,.55,.4]]},
   {w:.45,band:1,k:0,sp:.8,ax:[[-6.5,1.0,2.9,0],[-3.6,.95,2.8,0],[-2.0,.95,2.6,0],[1,1.0,2.45,0],[5,1.05,2.4,0],[9,1.1,2.5,0]]}],
  upd(dt){const ex=state.exposed;cow.visible=!ex;cowH.visible=ex;inn.visible=ex;
   const w=state.prp*dt*6.283*2.6;pF.P.rotation.x+=w;spin.rotation.x+=w;pR.P.rotation.x-=w;rot.rotation.x+=state.prp*dt*9;
   const b=state.beta*Math.PI/180;pF.piv.forEach(p=>p.rotation.y=b);pR.piv.forEach(p=>p.rotation.y=-b);
   disc.material.opacity=sm(.6,1,state.prp)*.09;pcM.emissiveIntensity=state.fu*(.15+state.N*.4)}}}

/* ======================= MARS 2020 SKY CRANE: descent stage, bridles, Perseverance ======================= */
function buildSC(){const G=new T.Group(),ST=new T.Group(),RV=new T.Group();G.add(ST,RV);
 const gold=std({color:0xc9a04c,metalness:.95,roughness:.32,side:T.DoubleSide});CAT.set(gold,'case');
 const blk=std({color:0x1c1c1e,roughness:.7,side:T.DoubleSide});CAT.set(blk,'case');
 /* frame: two octagonal rings joined by struts, cross beams */
 [.3,.95].forEach(y=>{const r=new T.Mesh(new T.TorusGeometry(1.45,.06,6,8),MT.alu);r.rotation.x=Math.PI/2;r.rotation.z=Math.PI/8;r.position.y=y;r.castShadow=true;ST.add(r)});
 for(let k=0;k<8;k++){const a=(k+.5)/8*6.283;beam(ST,[Math.cos(a)*1.4,.3,Math.sin(a)*1.4],[Math.cos(a)*1.4,.95,Math.sin(a)*1.4],.07,MT.alu)}
 beam(ST,[-1.4,.3,0],[1.4,.3,0],.1,MT.alu);beam(ST,[0,.3,-1.4],[0,.3,1.4],.1,MT.alu);
 /* four hydrazine tanks, two pressurant tanks, the bridle and umbilical device in the middle, a radar */
 [[.78,0],[-.78,0],[0,.78],[0,-.78]].forEach(([x,z])=>{const t=new T.Mesh(new T.SphereGeometry(.42,28,16),MT.ti);t.position.set(x,.66,z);t.castShadow=true;ST.add(t)});
 [[.55,.55],[-.55,-.55]].forEach(([x,z])=>{const t=new T.Mesh(new T.SphereGeometry(.2,20,12),MT.steel);t.position.set(x,1.12,z);t.castShadow=true;ST.add(t)});
 const bud=cyl(.28,.32,.45,MT.dark,24);bud.position.y=.12;ST.add(bud);ST.add(box(.42,.08,.3,MT.white,0,.22,1.05));
 const deck=cyl(1.5,1.5,.05,gold,8);deck.rotation.y=Math.PI/8;deck.position.y=1.0;ST.add(deck);
 /* eight engines in four pods at the corners, canted outward */
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,pod=new T.Group();pod.position.set(Math.cos(a)*1.58,.32,Math.sin(a)*1.58);pod.rotation.y=-a;ST.add(pod);pod.add(box(.32,.35,.62,blk,0,0,0));
  [-.17,.17].forEach(o=>{const n=new T.Group();n.position.set(.05,-.12,o);n.rotation.z=-Math.PI/2+.35;pod.add(n);n.add(lathe([[.05,0],[.07,.12],[.13,.36],[.16,.5]],MT.hot,20),lathe([[0,-.2],[.075,-.18],[.075,0]],MT.steel,16))})}
 /* Perseverance (origin at the bottom of the wheels): six wheels on rocker-bogies, body, deck, RTG at the tail, stowed mast and arm */
 const wM=std({color:0x8e9298,metalness:.7,roughness:.45}),wT=std({color:0xffffff,metalness:.6,roughness:.5,map:canvasTex(256,64,(x,w,h)=>{x.fillStyle='#8e9298';x.fillRect(0,0,w,h);x.strokeStyle='#4a4e54';x.lineWidth=3;for(let i=0;i<48;i++){const u=i/48*w;x.beginPath();x.moveTo(u,0);x.lineTo(u+5,h/2);x.lineTo(u,h);x.stroke()}x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,w,5);x.fillRect(0,h-5,w,5)})});CAT.set(wM,'case');CAT.set(wT,'case');
 [-1.05,-.02,1.0].forEach(x=>[-1,1].forEach(sg=>{const w=new T.Mesh(new T.CylinderGeometry(.26,.26,.4,28),[wT,wM,wM]);w.castShadow=true;w.rotation.x=Math.PI/2;w.position.set(x,.26,sg*1.2);RV.add(w)}));
 [-1,1].forEach(sg=>{const z=sg*1.0;beam(RV,[1.0,.4,z],[.25,.82,z],.07,MT.alu);beam(RV,[.25,.82,z],[-.5,.62,z],.07,MT.alu);beam(RV,[-1.05,.4,z],[-.5,.62,z],.07,MT.alu);beam(RV,[-.02,.4,z],[-.5,.62,z],.07,MT.alu)});
 const bodyM=std({color:0xffffff,roughness:.55,metalness:.15,map:canvasTex(256,128,(x,w,h)=>{x.fillStyle='#e6e3dc';x.fillRect(0,0,w,h);x.strokeStyle='rgba(60,55,50,.45)';x.lineWidth=2;for(let i=1;i<6;i++){x.beginPath();x.moveTo(i*w/6,0);x.lineTo(i*w/6,h);x.stroke()}x.beginPath();x.moveTo(0,h*.35);x.lineTo(w,h*.35);x.stroke();x.fillStyle='rgba(40,40,40,.5)';for(let i=0;i<14;i++)x.fillRect(Math.random()*w,h*.45+Math.random()*h*.4,6+Math.random()*14,4+Math.random()*8)})});
 RV.add(box(2.1,.55,1.55,bodyM,0,1.0,0),box(2.0,.04,1.45,std({color:0x8a8070,roughness:.7}),0,1.3,0));
 const rtgM=std({color:0x2a2a2c,metalness:.5,roughness:.6});CAT.set(rtgM,'inner');
 const rtg=cyl(.22,.22,.7,rtgM,8);rtg.rotation.z=Math.PI/2+.5;rtg.position.set(-1.3,1.12,0);RV.add(rtg);for(let k=0;k<4;k++){const f=box(.03,.66,.62,rtgM);f.rotation.y=k*Math.PI/4;rtg.add(f)}
 RV.add(box(1.1,.1,.1,MT.white,.2,1.4,.55),box(.22,.18,.3,MT.white,.8,1.42,.55),box(.2,.2,.2,MT.dark,1.12,.95,.6));beam(RV,[1.1,.95,-.6],[1.1,.95,.6],.07,MT.alu);
 const hga=cyl(.2,.2,.04,MT.white,6);hga.position.set(-.5,1.36,-.45);RV.add(hga);
 /* three nylon bridles and the umbilical */
 const cordM=std({color:0xe6e2d6,roughness:.8}),cords=[];for(let i=0;i<4;i++){const r=i<3?.012:.025,m=new T.Mesh(new T.CylinderGeometry(r,r,1,5),i<3?cordM:MT.dark);m.castShadow=true;G.add(m);cords.push(m)}
 const cA=[0,1,2].map(i=>{const a=i/3*6.283+.5;return[V3(Math.cos(a)*.24,-.08,Math.sin(a)*.24),V3(Math.cos(a)*.8,1.32,Math.sin(a)*.6)]});cA.push([V3(0,-.1,0),V3(.1,1.32,0)]);
 const Wa=V3(),Wb=V3(),Dd=V3(),Yv=V3(0,1,0);
 const LR=[['ROVER  1,025 kg',[0,0,0],[110,10],V3(.6,1.0,.78)],['RTG POWER SOURCE',[0,0,0],[-110,30],V3(-1.4,1.15,0)]],LB=['NYLON BRIDLES',[.25,-2,0],[-100,0]];
 const anchor=new T.Object3D();anchor.position.y=-.15;anchor.rotation.z=-Math.PI/2;ST.add(anchor);
 return{G,E:ST,anchor,lens:[],
  labels:[['HYDRAZINE TANKS',[.78,.66,-.3],[60,-50]],['MARS LANDING ENGINES (8)',[1.12,-.1,-1.12],[90,20]],['BRIDLE AND UMBILICAL DEVICE',[0,.1,0],[-130,-30]],LB,...LR],
  flow:()=>{const P=[],TK=[[.78,0],[0,.78],[-.78,0],[0,-.78]];for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,c=Math.cos(a),s2=Math.sin(a),t=TK[i];
    P.push({w:.2,k:2,sp:.7,cv:[[t[0],.4,t[1]],[t[0]*.5+c*.3,.28,t[1]*.5+s2*.3],[c*1.2,.3,s2*1.2],[c*1.6,.22,s2*1.6],[c*1.7,-.05,s2*1.7]],r:.03,t0:0,t1:.3});
    P.push({w:.15,k:3,sp:1.2,cv:[[c*1.7,-.15,s2*1.7],[c*1.9,-.6,s2*1.9],[c*2.2,-1.4,s2*2.2],[c*2.5,-2.2,s2*2.5]],r:.12,t0:.8,t1:.2,al:()=>Math.min(1,state.N*3)})}return P},
  upd(dt){const vis=!sc.done;ST.visible=vis;ST.position.set(sc.x,state.alt,0);ST.rotation.z=-sc.pit;
   const ry=Math.max(0,skyRy()),hang=sc.bl>.3&&!sc.td;RV.position.y=ry;RV.rotation.z=hang?.012*Math.sin(state.simT*1.1):0;RV.rotation.x=hang?.008*Math.sin(state.simT*.8+1):0;
   deck.visible=!state.exposed;ST.updateMatrixWorld(true);RV.updateMatrixWorld(true);
   const show=vis&&(sc.bl>.04||sc.cut);
   cords.forEach((m,i)=>{m.visible=show;if(!show)return;Wa.copy(cA[i][0]);ST.localToWorld(Wa);
    if(sc.cut)Wb.set(Wa.x+.15*Math.sin(state.simT*2+i),Wa.y-Math.max(.3,sc.bl)*(i<3?1:.9),Wa.z+.1*Math.cos(state.simT*1.7+i));else{Wb.copy(cA[i][1]);RV.localToWorld(Wb)}
    Dd.copy(Wb).sub(Wa);const l=Dd.length();m.position.copy(Wa).add(Wb).multiplyScalar(.5);m.scale.set(1,Math.max(.001,l),1);m.quaternion.setFromUnitVectors(Yv,Dd.normalize())});
   LR.forEach(l=>{Wa.copy(l[3]);RV.localToWorld(Wa);ST.worldToLocal(Wa);l[1][0]=Wa.x;l[1][1]=Wa.y;l[1][2]=Wa.z});LB[1][1]=(ry+1.32-state.alt)/2}}}

const ENG=[buildF(),buildSR(),buildSS(),buildHT(),buildF1(),buildHR(),buildTP(),buildSC()];ENG.forEach(e=>{scn.add(e.G);e.G.visible=false});

/* ======================= volumetric plume (ray-marched, half resolution) ======================= */
const PU={uInv:{value:new T.Matrix4()},uFwd:{value:V3()},tDepth:{value:null},uPRes:{value:new T.Vector2(1,1)},uNear:{value:cam.near},uFar:{value:cam.far},
 uT:{value:0},uLen:{value:5},uR0:{value:.4},uSp:{value:.05},uI:{value:0},uTurb:{value:.5},uSteps:{value:28},uHeat:{value:0},uHeatLen:{value:3},uGreen:{value:0},uFire:{value:0},
 uDia:{value:0},uDiaSp:{value:1},uDiaN:{value:3},uDiaOff:{value:.3},uDisk:{value:0},uDiaR:{value:.6},uBox:{value:new T.Vector2(14,2.5)},
 uAnn:{value:0},uCl:{value:0},uO:{value:[0,1,2,3,4].map(()=>new T.Vector2())},uW:{value:[0,0,0,0,0]},uMR:{value:4},uMg:{value:new T.Vector2(3,10)},uC0:{value:V3()},uC1:{value:V3()},uC2:{value:V3()},uC3:{value:V3()},uDC:{value:V3()},uGC:{value:V3(.25,1.9,.55)}};
const plMat=new T.ShaderMaterial({uniforms:PU,side:T.BackSide,depthTest:false,depthWrite:false,blending:T.NoBlending,
 vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`#include <packing>
 uniform mat4 uInv;uniform vec3 uFwd;uniform sampler2D tDepth;uniform vec2 uPRes,uBox;uniform float uNear,uFar;
 uniform float uT,uLen,uR0,uSp,uI,uTurb,uSteps,uHeat,uHeatLen,uGreen,uFire,uDia,uDiaSp,uDiaN,uDiaOff,uDisk,uDiaR,uAnn,uCl,uMR;uniform vec2 uO[5],uMg;uniform float uW[5];
 uniform vec3 uC0,uC1,uC2,uC3,uDC,uGC;varying vec3 vW;
 float hs(vec3 p){p=fract(p*vec3(.1031,.103,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
 float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}
 vec3 ramp(float k){k=clamp(k,0.,1.);return k>.66?mix(uC1,uC0,(k-.66)/.34):k>.33?mix(uC2,uC1,(k-.33)/.33):mix(uC3,uC2,k/.33);}
 void main(){
  vec3 ro=(uInv*vec4(cameraPosition,1.)).xyz,rd=normalize((uInv*vec4(vW,1.)).xyz-ro);
  vec3 bn=vec3(0.,-uBox.y,-uBox.y),bx=vec3(uBox.x,uBox.y,uBox.y),iv=1./rd,a0=(bn-ro)*iv,a1=(bx-ro)*iv,tn=min(a0,a1),tf=max(a0,a1);
  float ta=max(max(max(tn.x,tn.y),tn.z),0.),tb=min(min(tf.x,tf.y),tf.z);
  float z=texture2D(tDepth,gl_FragCoord.xy/uPRes).x;vec3 wd=normalize(vW-cameraPosition);
  tb=min(tb,-perspectiveDepthToViewZ(z,uNear,uFar)/max(dot(wd,uFwd),1e-3));
  if(tb<=ta||uI+uDia+uHeat<1e-4){gl_FragColor=vec4(0.);return;}
  float dt=(tb-ta)/uSteps,j=hs(vec3(gl_FragCoord.xy,fract(uT*7.)*91.));vec3 c=vec3(0.);float ht=0.;
  for(int i=0;i<48;i++){if(float(i)>=uSteps)break;
   vec3 p=ro+rd*(ta+(float(i)+j)*dt);float x=p.x;if(x<0.)continue;
   float r=length(p.yz),u=x/uLen,R=uR0*(1.+uSp*x)*(1.+uFire*.5*(1.-exp(-x)));
   vec3 q=vec3(x*1.5-uT*10.,p.y*2.4,p.z*2.4);float nz=n3(q)*.62+n3(q*2.3+vec3(5.2,1.3,2.7))*.38;
   float ae=uAnn*exp(-x/(uR0*2.5)),ra=abs(r-ae*uR0),rr=ra/(R*(1.-.55*ae)*(1.+uTurb*(nz-.45)*(.3+u*1.6)));
   float core=exp(-rr*rr*2.3),k=core*exp(-u*1.8);
   if(uCl>.5){float tb=1.+uTurb*(nz-.45)*(.3+u*1.6),c=0.,wt=0.;for(int j=0;j<5;j++){float d=length(p.yz-uO[j])/(R*tb);c=max(c,uW[j]*exp(-d*d*2.3));wt+=uW[j];}
    float rm=r/(uMR*(1.+.05*x)*tb);core=mix(c,exp(-rm*rm*2.)*min(1.,wt/2.5),smoothstep(uMg.x,uMg.y,x));k=core*exp(-u*1.8);}
   vec3 e=ramp(k)*core*exp(-u*1.15)*(1.-smoothstep(.62,1.05,u))*(.5+nz)*uI;
   float ph=x/uDiaSp-uDiaOff;
   if(ph>0.){float fp=fract(ph),tri=1.-abs(2.*fp-1.),rd2=R*uDiaR*(1.-.05*floor(ph));
    float lens=smoothstep(0.,.45,tri*.95-r/rd2)*tri*tri+.35*exp(-pow(r/rd2,2.)*3.)*tri*tri*tri,disk=exp(-pow((fp-.5)/.06,2.))*smoothstep(rd2,rd2*.4,r);
    e+=uDC*mix(lens,disk,uDisk)*exp(-x/(uDiaSp*uDiaN))*uDia*(.75+.5*nz);}
   e=mix(e,uGC*dot(e,vec3(.34)),clamp(uGreen*exp(-u*1.2),0.,1.));
   c+=e*dt;ht+=(uCl>.5?core:exp(-pow(r/(R*1.4),2.)))*exp(-x/uHeatLen)*(.4+1.2*nz)*dt;}
  gl_FragColor=vec4(c,ht*uHeat);}`});
k3.plume=null;
function setPlumeBox(L,Rm){if(k3.plume){pscn.remove(k3.plume);k3.plume.geometry.dispose()}const g=new T.BoxGeometry(L,Rm*2,Rm*2);g.translate(L/2,0,0);k3.plume=new T.Mesh(g,plMat);k3.plume.matrixAutoUpdate=false;k3.plume.frustumCulled=false;pscn.add(k3.plume);PU.uBox.value.set(L,Rm)}

/* ======================= particles: camera-facing quads, streaked along velocity for sparks ======================= */
function Pool(max,smoke,str){
 const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
 const aP=new T.InstancedBufferAttribute(new Float32Array(max*3),3),aV=new T.InstancedBufferAttribute(new Float32Array(max*3),3),aS=new T.InstancedBufferAttribute(new Float32Array(max*2),2),aC=new T.InstancedBufferAttribute(new Float32Array(max*4),4);
 [aP,aV,aS,aC].forEach(a=>a.setUsage(T.DynamicDrawUsage));g.setAttribute('iP',aP);g.setAttribute('iV',aV);g.setAttribute('iS',aS);g.setAttribute('iC',aC);g.instanceCount=0;
 const u={uStr:{value:smoke?0:(str==null?.012:str)},uAmb:{value:new T.Color()},uLit:{value:new T.Color()},uFP:{value:V3()},uFC:{value:new T.Color()}};
 const m=new T.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:smoke?T.NormalBlending:T.AdditiveBlending,
  vertexShader:`attribute vec3 iP,iV;attribute vec2 iS;attribute vec4 iC;uniform float uStr;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  void main(){vec4 vp=viewMatrix*vec4(iP,1.);vec2 c=position.xy;vec3 vv=(viewMatrix*vec4(iV,0.)).xyz;float l=length(vv.xy)*uStr;vec2 d=l>1e-5?normalize(vv.xy):vec2(1.,0.),nn=vec2(-d.y,d.x);
   vp.xy+=d*c.x*(iS.x+l)+nn*c.y*iS.x;gl_Position=projectionMatrix*vp;vU=c;vC=iC;vSd=iS.y;vWP=iP;}`,
  fragmentShader:smoke?`uniform vec3 uAmb,uLit,uFC,uFP;varying vec2 vU;varying vec4 vC;varying float vSd;varying vec3 vWP;
  float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
  void main(){float r=length(vU);if(r>1.)discard;vec2 q=vU*1.7+vSd*13.;float n=n2(q)*.55+n2(q*2.4+3.)*.3+n2(q*5.)*.15;
   float a=smoothstep(1.,.15,r+.75*(n-.5))*vC.a;float sh=.25+.9*(vU.y*.5+.5)+.4*(n-.5);float fd=length(vWP-uFP);
   vec3 c=vC.rgb*(uAmb+uLit*sh)+vC.rgb*uFC/(1.+fd*fd*.05);gl_FragColor=vec4(c,a);}`
  :`varying vec2 vU;varying vec4 vC;void main(){float r=length(vU);float a=1.-smoothstep(0.,1.,r);gl_FragColor=vec4(vC.rgb,vC.a*a*a);}`});
 const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=smoke?2:3;mesh.userData.pt=1;scn.add(mesh);
 const L=[];
 return{L,u,mesh,add(p){if(L.length<max)L.push(p)},clear(){L.length=0},upd(dt,f){let n=0;const P=aP.array,Vv=aV.array,S=aS.array,C=aC.array;
  for(let i=L.length-1;i>=0;i--){const p=L[i];p.a+=dt;if(p.a>=p.l){L[i]=L[L.length-1];L.pop();continue}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const k=f(p,dt);if(!k)continue;
   P[n*3]=p.x;P[n*3+1]=p.y;P[n*3+2]=p.z;Vv[n*3]=p.vx;Vv[n*3+1]=p.vy;Vv[n*3+2]=p.vz;S[n*2]=k[0];S[n*2+1]=p.sd;C[n*4]=k[1];C[n*4+1]=k[2];C[n*4+2]=k[3];C[n*4+3]=k[4];n++}
  g.instanceCount=n;[aP,aV,aS,aC].forEach(a=>a.needsUpdate=true)}}}
const SPK=Pool(400,0),SMK=Pool(420,1),FIR=Pool(200,0,0),FLW=Pool(700,0,.03);

/* ======================= render targets + post ======================= */
k3.rtM=null;k3.rtP=null;k3.comp=null;k3.cpass=null;k3.bloom=null;k3.pr=1;k3.QA=-1;k3.MA=-1;
const CS={uniforms:{tMain:{value:null},tPlume:{value:null},uRes:{value:new T.Vector2()},uT:{value:0},uHaze:{value:0},uKick:{value:0},uMode:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tMain,tPlume;uniform vec2 uRes;uniform float uT,uHaze,uKick,uMode;varying vec2 vUv;
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
  vec3 c=texture2D(tMain,vUv+w*h*uHaze/uRes).rgb+pl.rgb+uKick*vec3(1.,.86,.72);gl_FragColor=vec4(c,1.);}`};
function setup(){k3.QA=state.Q;const D2=Math.min(devicePixelRatio||1,2);k3.pr=state.Q>1?Math.min(D2,1.5):state.Q>0?Math.min(D2,1):.7;
 const w=Math.max(2,Math.round(state.W*k3.pr)),h=Math.max(2,Math.round(state.H*k3.pr));
 if(k3.rtM){k3.rtM.dispose();k3.rtM.depthTexture.dispose();k3.rtP.dispose()}
 k3.rtM=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples:state.Q>1?4:0});k3.rtM.depthTexture=new T.DepthTexture(w,h);k3.rtM.depthTexture.type=T.UnsignedIntType;
 const ps=state.Q>1?.5:state.Q>0?.5:.34;k3.rtP=new T.WebGLRenderTarget(Math.max(2,w*ps|0),Math.max(2,h*ps|0),{type:T.HalfFloatType,depthBuffer:false});
 PU.tDepth.value=k3.rtM.depthTexture;PU.uPRes.value.set(k3.rtP.width,k3.rtP.height);PU.uSteps.value=state.Q>1?30:state.Q>0?22:14;
 R.setPixelRatio(k3.pr);R.setSize(state.W,state.H,false);
 sun.shadow.map&&(sun.shadow.map.dispose(),sun.shadow.map=null);const sm2=state.Q>1?2048:1024;sun.shadow.mapSize.set(sm2,sm2);R.shadowMap.enabled=state.Q>0;
 if(!k3.comp){k3.comp=new X.EffectComposer(R);k3.cpass=new X.ShaderPass(CS);k3.comp.addPass(k3.cpass);k3.bloom=new X.UnrealBloomPass(new T.Vector2(w,h),.4,.45,1.4);k3.comp.addPass(k3.bloom);k3.comp.addPass(new X.OutputPass())}
 k3.comp.setPixelRatio(k3.pr);k3.comp.setSize(state.W,state.H);k3.bloom.enabled=state.Q>0;k3.flowKey='';
 k3.cpass.uniforms.tMain.value=k3.rtM.texture;k3.cpass.uniforms.tPlume.value=k3.rtP.texture;k3.cpass.uniforms.uRes.value.set(w,h);
 cam.aspect=state.W/state.H;cam.updateProjectionMatrix()}

/* ======================= per-machine configuration ======================= */
/* camera presets per view: [position, target, half-width that must stay in frame] */
const CFG=[
 {box:[16,2.6],sc:[-2,1,0],sh:13,cams:[[[1.4,3.0,10.8],[-.9,2.2,0],5.8],[[2.75,2.0,3.35],[-.45,1.62,0],1.9],[[8.8,2.1,2.7],[-.6,1.65,0],2.3]],mt:1},
 {box:[20,3],sc:[-3.5,1,0],sh:15,cams:[[[1.0,3.5,14.2],[-2.5,2.65,0],7.6],[[3.3,2.5,3.7],[-.45,2.05,0],2.1],[[10.5,2.5,3.1],[-.8,2.05,0],2.5]],mt:1},
 {box:[7,3.2],sc:[1,6,0],sh:17,cams:[[[2.2,6.2,23.5],[-.6,5.6,0],8.6],[[2.9,5.0,6.4],[0,6.4,0],2.7],[[3.8,1.4,4.8],[0,6.0,0],2.6]],mt:0},
 {box:[1.8,1.0],sc:[-1,0,0],sh:7,space:1,cams:[[[3.7,2.7,8.4],[-.25,-.45,0],2.6],[[1.0,.02,1.65],[.05,-.36,.33],.55],[[2.1,.2,1.05],[-.17,-.38,.35],.62],[[0,0,0],[-.6,-2.6,-1.6],2.6]],mt:0},
 {box:[16,8],sc:[2,10,0],sh:26,cams:[[[16,14,50],[3,12.5,0],21],[[8.6,10.8,10.8],[2.4,12.4,2.4],4.6],[[9.5,3.2,13],[0,13,0],7.5]],mt:0},
 {box:[9,3.4],sc:[0,1,0],sh:12,cams:[[[3.5,3.4,19],[0,2.0,0],9.5],[[-.4,1.25,3.7],[.5,1.55,1.0],1.7],[[13,2.6,7],[0,1.7,0],5.2]],mt:1},
 {box:[6,1.3],sc:[0,3,0],sh:14,cams:[[[-10,5.8,15],[0,3.6,0],7.2],[[-7.2,5.0,5.8],[-2.6,4.1,0],3.3],[[14,5.4,9],[2.2,3.8,0],5]],mt:0},
 {box:[12,2.6],sc:[0,10,0],sh:24,mars:1,cams:[[[15,3.5,24],[0,0,0],6.5],[[5.2,1.8,7.2],[0,.9,0],2.9],[[8,1.3,12],[0,0,0],7]],mt:0}];
function applyMachine(){k3.MA=state.mi;ENG.forEach((e,i)=>e.G.visible=i==state.mi);const c=CFG[state.mi];setPlumeBox(c.box[0],c.box[1]);
 mountains.visible=(!!c.mt||!!c.mars)&&!c.space;trees.visible=!c.mt&&!c.space&&!c.mars;rocks.visible=!!c.mars;ground.visible=!c.space;earth.visible=!!c.space;k3.curS=-1;gMat.map=c.mars?marsC:c.mt?lakeC:grassC;gMat.normalMap=c.mars?marsN:c.mt?lakeN:null;gMat.needsUpdate=true;
 const sc=sun.shadow.camera;sc.left=sc.bottom=-c.sh;sc.right=sc.top=c.sh;sc.near=1;sc.far=120;sc.updateProjectionMatrix();sun.target.position.set(...c.sc);placeSun();
 floods.forEach(l=>l.target.position.set(...c.sc));SPK.clear();SMK.clear();k3.camSnap=true;k3.yaw=k3.pit=0;k3.zoom=1}
function placeSun(){const c=CFG[state.mi]||CFG[0],d=V3(...k3.curP.sun).normalize();sun.position.set(...c.sc).addScaledVector(d,60)}

/* ======================= camera: smooth glide between presets, drag to orbit, wheel to zoom, shake ======================= */
k3.yaw=0;k3.pit=0;k3.zoom=1;k3.camSnap=true;k3.dragC=null;const cP=V3(),cT=V3(),tmp=V3(),sph=new T.Spherical();
cv.addEventListener('pointerdown',e=>{const r=state.SWR;if(e.clientX>=r.x&&e.clientX<=r.x+r.w&&e.clientY>=r.y&&e.clientY<=r.y+r.h)return;k3.dragC={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!k3.dragC||e.pointerId!==k3.dragC.id)return;k3.yaw-=(e.clientX-k3.dragC.x)*.006;k3.pit+=(e.clientY-k3.dragC.y)*.005;k3.pit=Math.max(-.5,Math.min(.9,k3.pit));k3.yaw=Math.max(-2.2,Math.min(2.2,k3.yaw));k3.dragC.x=e.clientX;k3.dragC.y=e.clientY});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>k3.dragC=null));
cv.addEventListener('dblclick',()=>{k3.yaw=k3.pit=0;k3.zoom=1});
cv.addEventListener('wheel',e=>{k3.zoom=Math.max(.55,Math.min(1.9,k3.zoom*Math.exp(e.deltaY*.001)));e.preventDefault()},{passive:false});
k3.lastView=-1;
function camera(dr){const c=CFG[state.mi].cams[state.view];if(state.view!==k3.lastView){k3.lastView=state.view;k3.yaw=k3.pit=0;k3.zoom=1}
 const P0=V3(...c[0]),T0=V3(...c[1]);if(CFG[state.mi].space&&state.view==3){const h=Math.max(100,(orb.r-RE)/1e3),pc=Math.acos(6371/(6371+h))+.13,hd=V3(-1,0,.12).normalize();P0.copy(T0).addScaledVector(hd,Math.cos(pc)*12);P0.y+=Math.sin(pc)*12}if(state.M.camA){const a=state.M.camA(state.view);P0.y+=a[0];T0.y+=a[1];if(a[2])P0.sub(T0).multiplyScalar(a[2]).add(T0)}else if(state.M.hover){P0.y+=state.alt*.85;T0.y+=state.alt}const dir=P0.clone().sub(T0),d0=dir.length(),tanH=Math.tan(cam.fov*Math.PI/360)*cam.aspect;
 /* portrait phones: swing the jets round to a rear three-quarter view so engine and flame stack in depth instead of running off the sides */
 const port=cam.aspect<.85&&state.mi<2,hw=c[2]*(port?(state.view==0?.42:.7):1);
 const dist=Math.min(d0*2.6,Math.max(d0,hw/tanH))*k3.zoom;sph.setFromVector3(dir);sph.radius=dist;sph.theta+=k3.yaw+(port&&state.view==0?.72:0);sph.phi=Math.max(.15,Math.min(1.75,sph.phi-k3.pit));
 tmp.setFromSpherical(sph).add(T0);if(!CFG[state.mi].space&&tmp.y<.35)tmp.y=.35;
 const k=k3.camSnap?1:1-Math.exp(-dr*(k3.dragC?14:3.2));cP.lerp(tmp,k);cT.lerp(T0,k);k3.camSnap=false;
 const s=state.M.shk()*.0026*(state.view==1?.6:1),t=state.simT;cam.position.set(cP.x+(Math.sin(t*191)+Math.sin(t*313+1.3))*s,cP.y+(Math.sin(t*227+.4)+Math.sin(t*359+2.1))*s,cP.z+Math.sin(t*263+.8)*s);cam.lookAt(cT)}

/* ======================= per-frame plume parameters from the simulation ======================= */
const C=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
k3.fire=0;
function plumeParams(dt){const fl=.93+.07*Math.sin(state.simT*47)*Math.sin(state.simT*29+1),u=PU;let lc=[1,.6,.3],li=0;
 k3.fire*=Math.exp(-dt*3.2);k3.fire=Math.max(k3.fire,state.sT>0?state.ign*.5:0);
 if(state.mi<2){u.uCl.value=0;u.uAnn.value=0;const sr=state.mi==1,re=sr?.62:.45-.1*sm(.3,.95,state.N)+.17*state.A,ab=sm(0,.22,state.A),dry=sm(.3,1,state.N)*state.fu,ig=Math.min(1,state.ign);
  u.uR0.value=re*.92;u.uSp.value=.04+.05*ab;u.uLen.value=(sr?2.6:2.0)+state.N*1.5*(1-ab)+ab*((sr?5:4)+state.A*(sr?9:7))+ig*2.5;
  const dC=[[.5,.62,1.5],[.25,.32,1.0],[.25,.15,.35],[.08,.03,.05]],aC=sr?[[3.4,2.6,2.2],[2.6,1.05,.4],[1.1,.24,.06],[.2,.025,0]]:[[3.2,2.4,1.5],[2.4,.95,.25],[1.0,.2,.03],[.18,.02,0]],iC=[[3,1.7,.5],[2,.7,.12],[.8,.15,.02],[.15,.015,0]];
  const mix=Math.max(ab,ig*.9,k3.fire);['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const b=ab>=Math.max(ig*.9,k3.fire)?aC[i]:iC[i];u[k].value.set(...C(dC[i],b,mix))});
  u.uI.value=(dry*.24*(1-ab)+ab*(.85+.75*state.A)+ig*.9+k3.fire*1.1)*fl;u.uTurb.value=.35+.4*ab+k3.fire;u.uFire.value=k3.fire+ig*.4;
  u.uDia.value=(dry*.3*(1-ab)+state.A*.75)*(sr?1.1:1)*fl;u.uDiaSp.value=(sr?1.15:.95)*(.8+.4*ab)*(re/.45)**.3;u.uDiaN.value=sr?5.5:3.6;u.uDiaOff.value=.35;u.uDisk.value=0;u.uDiaR.value=.62;
  u.uDC.value.set(...(state.A>.05?[3.4,2.9,2.3]:[.7,.95,2.0]));u.uGreen.value=state.gn;
  u.uHeat.value=state.N*state.N*.55*state.fu+state.A*.8+ig*.3+k3.fire*.6;u.uHeatLen.value=3+state.A*5;
  li=state.A*60+dry*5+ig*40+k3.fire*25+state.gn*40;lc=state.gn>.3?[.35,1,.45]:state.A>.05||ig>.1||k3.fire>.1?[1,.55,.25]:[.55,.65,1]}
 else if(state.mi==3){u.uCl.value=0;const nn=state.N*state.fu,ig=Math.min(1,state.ign),f2=.97+.03*Math.sin(state.simT*90);
  u.uR0.value=.058;u.uSp.value=11;u.uLen.value=.42+nn*.45;u.uTurb.value=.08;u.uFire.value=0;u.uAnn.value=.95;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.5,1.9,4.2],[.75,.85,2.8],[.4,.32,1.5],[.12,.07,.45]][i];u[k].value.set(...C(a,[3,3,4],ig*.6))});
  u.uI.value=(nn*2.8+ig*3)*f2;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=0;u.uHeatLen.value=1;
  li=nn*3+ig*4;lc=[.55,.62,1]}
 else if(state.mi==4){const fl2=.94+.06*Math.sin(state.simT*53)*Math.sin(state.simT*31+1),ig=Math.min(1,state.ign);u.uCl.value=1;u.uAnn.value=0;
  [[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=sicE[j]});u.uMR.value=4.6;u.uMg.value.set(3,11);
  u.uR0.value=1.75;u.uSp.value=.045;u.uLen.value=10+state.N*4;u.uTurb.value=.45+ig*.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[5,3.6,1.6],[3.4,1.5,.4],[1.4,.4,.08],[.3,.06,.01]][i]));
  u.uI.value=(state.N>.01?1.15:0)*fl2+ig*.8;u.uDia.value=.12*state.N;u.uDiaSp.value=2.2;u.uDiaN.value=2;u.uDiaOff.value=.3;u.uDisk.value=0;u.uDiaR.value=.6;u.uDC.value.set(4,3,2);u.uGreen.value=0;
  u.uHeat.value=state.N*1.6+ig*.5;u.uHeatLen.value=6;li=state.N*520+ig*220;lc=[1,.62,.3]}
 else if(state.mi==5){const nn=state.N*state.fu;u.uCl.value=1;u.uAnn.value=0;
  [[1.05,1.02,1],[1.05,-1.02,1],[-1,1.08,.3],[-1,-1.08,.3],[0,0,0]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=o[2]});u.uMR.value=1.5;u.uMg.value.set(2,7);
  u.uR0.value=.28;u.uSp.value=.09;u.uLen.value=2.5+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.5,.6,1.1],[.3,.35,.8],[.15,.15,.4],[.05,.04,.1]][i]));
  u.uI.value=nn*.22+Math.min(1,state.ign)*.6;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*nn*1.8+state.ign*.3;u.uHeatLen.value=3;li=nn*4+state.ign*20;lc=[.7,.75,1]}
 else if(state.mi==6){const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=.42;u.uSp.value=.08;u.uLen.value=2+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[.6,.5,.45],[.4,.3,.25],[.2,.15,.12],[.05,.04,.03]][i],b=[[4,2.4,.9],[2.4,.9,.2],[1,.25,.04],[.2,.03,0]][i];u[k].value.set(...C(a,b,ig))});
  u.uI.value=nn*.03+ig*.7;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*1.3+ig*.3;u.uHeatLen.value=2.5;li=ig*25;lc=[1,.6,.3]}
 else if(state.mi==7){const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=sc.done?0:1;u.uAnn.value=0;
  for(let j=0;j<5;j++){if(j<4){const a=Math.PI/4+j*Math.PI/2;u.uO.value[j].set(Math.cos(a)*1.6,Math.sin(a)*1.6);u.uW.value[j]=Math.min(1,(sc.thr[2*j]+sc.thr[2*j+1])/MLE*.7)}else u.uW.value[j]=0}
  u.uMR.value=2.4;u.uMg.value.set(8,30);u.uR0.value=.2;u.uSp.value=.22;u.uLen.value=5+nn*8;u.uTurb.value=.35;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.6,.55,.85],[.32,.3,.52],[.12,.1,.2],[.03,.02,.05]][i]));
  u.uI.value=(sc.done?0:1)*(nn*.12+ig*.25);u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=(sc.done?0:1)*nn*2.4;u.uHeatLen.value=4;li=(sc.done?0:1)*(nn*6+ig*8);lc=[.85,.75,1]}
 else{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=1.08;u.uSp.value=.035;u.uLen.value=4.5+nn*2;u.uTurb.value=.3+ig*.6;u.uFire.value=ig*.3;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.0,1.15,2.3],[.55,.45,1.25],[.3,.17,.55],[.12,.05,.12]][i],b=[[6,3.4,1],[4,1.4,.25],[1.6,.3,.04],[.3,.03,0]][i];u[k].value.set(...C(a,b,ig*.85))});
  u.uI.value=(nn*.6+ig*.9)*fl;u.uDia.value=nn*2.4*fl;u.uDiaSp.value=1.3;u.uDiaN.value=1.3;u.uDiaOff.value=.25;u.uDisk.value=.85;u.uDiaR.value=.6;
  u.uDC.value.set(5,4.4,4.6);u.uGreen.value=0;u.uHeat.value=nn*1.6+ig*.6;u.uHeatLen.value=3.5;
  li=nn*95+ig*80;lc=ig>.2?[1,.55,.25]:[.72,.78,1]}
 return[li*fl,lc]}

/* ======================= particle emitters ======================= */
const W3=V3(),AX=V3();k3.steamAcc=0;k3.sparkAcc=0;k3.sootAcc=0;
function axisPt(d,r,a){/* world point at distance d downstream of the exit, radius r, angle a */const e=ENG[state.mi].anchor;W3.set(d,Math.cos(a)*r,Math.sin(a)*r);return e.localToWorld(W3)}
function axisDir(){const e=ENG[state.mi].anchor,o=e.localToWorld(V3(0,0,0));return e.localToWorld(V3(1,0,0)).sub(o).normalize()}
function emitters(dt){const ax=axisDir();
 if(state.mi<2){/* afterburner embers (sparse) */k3.sparkAcc+=dt*(state.A>.5?state.A*14:0)+dt*(k3.fire*40);
  while(k3.sparkAcc>1){k3.sparkAcc--;const p=axisPt(rnd(0,1.5),rnd(0,.3),rnd(0,6.3)),s=rnd(18,45);SPK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-2,2),vy:ax.y*s+rnd(-1,3),vz:ax.z*s+rnd(-2,2),a:0,l:rnd(.3,.8),sd:Math.random(),k:0})}
  /* soot from a surge, a puff of vapour at light-off */
  k3.sootAcc+=dt*(k3.fire>.3?90:0);while(k3.sootAcc>1){k3.sootAcc--;const p=axisPt(rnd(0,1),rnd(0,.3),rnd(0,6.3)),s=rnd(6,16);SMK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s,vy:ax.y*s+rnd(.5,2),vz:ax.z*s+rnd(-1,1),a:0,l:rnd(2,3.5),sd:Math.random(),k:1,s0:.4,s1:3.5})}}
 else if(state.mi==4){const qm=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(state.N*48+state.ign*30)*qm;
  while(k3.steamAcc>1){k3.steamAcc--;const sp=rnd(7,20)*(.5+state.N*.6),sm2=Math.random()<.4;SMK.add({x:rnd(3,9),y:rnd(1,3.5),z:rnd(-6,6),vx:sp,vy:rnd(2,6),vz:rnd(-4,4),a:0,l:rnd(6,9),sd:Math.random(),k:sm2?6:2,s0:3,s1:rnd(16,26)})}}
 else if(state.mi==5){const nn=state.N*state.fu,e=ENG[5],gy=e.AC.position.y-1.9;if(state.alt<14&&nn>.4&&state.nz>45){k3.sparkAcc+=dt*nn*70*(1-state.alt/14)*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,2.5),sp=rnd(6,16)*(1-state.alt/16);SMK.add({x:Math.cos(a)*r,y:.25,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.4,2.2),vz:Math.sin(a)*sp,a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.6,s1:rnd(3,6)})}}}
 else if(state.mi==6){const nn=state.N*state.fu*sm(.5,1,state.prp);if(nn>.15){k3.sparkAcc+=dt*nn*14*(state.Q>1?1:.6);
  while(k3.sparkAcc>1){k3.sparkAcc--;const z=rnd(-3.2,3.2),sp=rnd(7,18)*nn;SMK.add({x:rnd(-3.5,0),y:.2,z,vx:sp,vy:rnd(.2,1.4),vz:z*rnd(.1,.5),a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.5,s1:rnd(2.5,5)})}}}
 else if(state.mi==7){const h=state.alt,nn=state.N*state.fu;if(!sc.done&&h<30&&nn>.05){const k2=Math.pow(1-h/30,1.5);k3.sparkAcc+=dt*nn*260*k2*(state.Q>1?1:state.Q>0?.6:.35);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,4+h*.3),sp=rnd(5,16)*(.4+k2);SMK.add({x:sc.x+Math.cos(a)*r,y:.15,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.3,2.5),vz:Math.sin(a)*sp,a:0,l:rnd(2,4),sd:Math.random(),k:8,s0:.5,s1:rnd(3,7)})}}}
 else if(state.mi==2){const nn=state.N*state.fu;
  /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
  const qmax=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(nn*34+state.ign*24)*qmax;
  while(k3.steamAcc>1){k3.steamAcc--;const s=rnd(6,15)*(.5+nn*.7);SMK.add({x:rnd(.5,3.5),y:rnd(.9,2.4),z:rnd(-2.4,2.4),vx:s,vy:rnd(1.5,5),vz:rnd(-2.5,2.5),a:0,l:rnd(5,8),sd:Math.random(),k:2,s0:2.2,s1:rnd(12,20)})}
  /* steam drifting off the plume column near the bell */
  if(nn>.1&&Math.random()<dt*8*qmax){const p=axisPt(rnd(.3,2.5),rnd(1.2,1.8),rnd(0,6.3));SMK.add({x:p.x,y:p.y,z:p.z,vx:rnd(-1,2),vy:rnd(-.5,1.5),vz:rnd(-1,1),a:0,l:rnd(2,4),sd:Math.random(),k:3,s0:.6,s1:2.6})}
  /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
  if(state.ph==1&&state.st>.5){k3.sparkAcc+=dt*90;while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.floor(Math.random()*4)/4*6.283+.4,p=axisPt(rnd(.4,.8),1.6,a),s=rnd(4,10);SPK.add({x:p.x,y:p.y,z:p.z,vx:-Math.cos(a)*s*0+rnd(-3,3),vy:rnd(-2,4),vz:-Math.sin(a)*s*.5,a:0,l:rnd(.4,.9),sd:Math.random(),k:1})}}}}
function updParticles(dt,lc,li){const s=k3.curP,a=SMK.u;
 a.uAmb.value.set(s.hG).multiplyScalar(s.hI*.35).add(new T.Color(s.hS).multiplyScalar(s.hI*.4));a.uLit.value.setRGB(...s.sunC).multiplyScalar(s.sunL*.35);
 a.uFC.value.setRGB(...lc).multiplyScalar(li*.012);a.uFP.value.copy(flame.position);
 SPK.upd(dt,(p,dt)=>{p.vy-=9.8*dt*(p.k?1:.25);const f=p.a/p.l;return p.k?[.05,12,8,4.5,(1-f)]:[.035,9,4,1.2,(1-f)*.9]});
 SMK.upd(dt,(p,dt)=>{const f=p.a/p.l;p.vx*=Math.exp(-dt*(p.k==2||p.k==6?.35:p.k==7?1.6:p.k==8?.7:.8));p.vz*=p.k==7?Math.exp(-dt*1.6):p.k==8?Math.exp(-dt*.3):1;p.vz*=Math.exp(-dt*.6);p.vy+=dt*(p.k==2?1.2:p.k==8?-.2:.6);p.vy*=Math.exp(-dt*.3);
  const sz=p.s0+(p.s1-p.s0)*Math.pow(f,.55),fa=Math.min(1,f*8)*(1-f);
  return p.k==8?[sz,.52,.33,.2,fa*.42]:p.k==6?[sz,.32,.26,.2,fa*.5]:p.k==7?[sz,.62,.55,.44,fa*.38]:p.k==1?[sz,.06,.055,.05,fa*.7]:p.k==2?[sz,.92,.93,.95,fa*.5]:[sz,.9,.92,.95,fa*.22]})}

/* ======================= lens passes: thermal (temperature into the red channel) and schlieren (black silhouettes on grey) ======================= */
const thV=`varying vec3 vW;void main(){vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
vec4 w=modelMatrix*p;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const thF=`uniform float uBase,uGain,uX0,uX1,uFH,uFR;uniform mat4 uInvE;uniform vec3 uFP;varying vec3 vW;
void main(){vec3 l=(uInvE*vec4(vW,1.)).xyz;float t=uBase+uGain*smoothstep(uX0,uX1,l.x),d=length(vW-uFP);t+=uFH*exp(-d*d/(uFR*uFR));gl_FragColor=vec4(t*.001,0.,0.,1.);}`;
const mkTh=()=>new T.ShaderMaterial({uniforms:{uBase:{value:20},uGain:{value:0},uX0:{value:0},uX1:{value:1},uFH:{value:0},uFR:{value:5},uInvE:{value:new T.Matrix4()},uFP:{value:V3()}},vertexShader:thV,fragmentShader:thF,side:T.DoubleSide});
const TH={cold:mkTh(),gnd:mkTh(),sky:mkTh(),case:mkTh(),hot:mkTh(),inner:mkTh(),bell:mkTh(),cryo:mkTh()},SIL=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide});
TH.sky.depthWrite=false;
function thSet(m,b,g=0,x0=0,x1=1,fh=0,fr=5){const u=m.uniforms;u.uBase.value=b;u.uGain.value=g;u.uX0.value=x0;u.uX1.value=x1;u.uFH.value=fh;u.uFR.value=fr;u.uInvE.value.copy(PU.uInv.value);u.uFP.value.copy(flame.position)}
function thermalU(){const amb=CFG[state.mi].space?[5,20,-60][state.scene]:CFG[state.mi].mars?[-20,-5,-45][state.scene]:[24,38,14][state.scene],nn=state.N*state.fu,fh=state.mi<2?state.A*320+state.N*state.N*state.fu*80+k3.fire*300+state.ign*120:nn*190+state.ign*90;
 thSet(TH.cold,amb,0,0,1,fh*.55,state.mi<2?5:7);thSet(TH.gnd,amb+(state.scene==1?10:0),0,0,1,fh,state.mi<2?4.5:8);thSet(TH.sky,-40);
 if(state.mi<2){thSet(TH.case,amb+state.N*35+state.hg*45,state.hg*state.hg*230+state.A*70,-3.4,-1.2,fh*.15,4);thSet(TH.hot,amb+70*state.N+state.hg*360+state.A*230,state.A*260,-1.6,0);thSet(TH.inner,amb+state.hg*620+state.A*880+state.ign*420+state.gn*300);thSet(TH.bell,amb)}
 else if(state.mi==4){thSet(TH.case,amb+state.N*40);thSet(TH.bell,amb+state.N*480,-state.N*220,-3.9,0);thSet(TH.hot,amb+state.N*450);thSet(TH.inner,amb+state.N*900)}
 else if(state.mi==5){thSet(TH.case,amb+state.N*30+state.hg*30);thSet(TH.hot,amb+80*state.N+state.hg*420);thSet(TH.inner,amb+state.hg*600);thSet(TH.bell,amb)}
 else if(state.mi==6){thSet(TH.case,amb+state.N*25+state.hg*25);thSet(TH.hot,amb+state.N*330+state.hg*60);thSet(TH.inner,amb+state.N*700);thSet(TH.bell,amb)}
 else if(state.mi==7){thSet(TH.case,amb+8);thSet(TH.hot,amb+nn*850);thSet(TH.inner,amb+150);thSet(TH.bell,amb)}
 else if(state.mi==3){thSet(TH.case,amb+nn*90+(state.ph==1?40:0));thSet(TH.hot,amb+nn*420);thSet(TH.inner,amb+nn*520);thSet(TH.bell,amb)}
 else{thSet(TH.case,amb+nn*25);thSet(TH.bell,amb+nn*520,-nn*270,-2.9,0);thSet(TH.inner,amb+nn*900);thSet(TH.hot,amb+nn*480)}
 thSet(TH.cryo,state.ph?-150:amb)}
k3.thList=null;
function lensRender(){if(!k3.thList){k3.thList=[];scn.traverse(o=>{if(o.isMesh)k3.thList.push(o)})}
 const sch=state.lens==1,keep=[];if(!sch)thermalU();
 for(const o of k3.thList){keep.push(o.material,o.visible);if(o.userData.pt){o.visible=false;continue}
  if(sch){if(o.userData.bg)o.visible=false;else o.material=SIL}else o.material=o===sky?TH.sky:TH[CAT.get(o.material)||'cold']}
 R.setClearColor(sch?new T.Color(.2,.2,.2):new T.Color(0,0,0),1);R.clear();R.render(scn,cam);
 let k=0;for(const o of k3.thList){o.material=keep[k++];o.visible=keep[k++]}}

/* ======================= cutaway airflow tracers: particles riding fixed paths, coloured by temperature ======================= */
k3.flowKey='';k3.flowP=[];const TV=V3();
function tv(t){return t==-1?(state.fu<.5?.35:.78+.22*state.A):t==-2?.12+.62*state.A:t}
function tcol(t,k){if(k==6)return[1.8,1.0,.3];if(k==7)return[.6,.55,.5];if(k==4)return t<.35?[.55,.55,.6]:[.55+.3*(1-t),.75,2.4];if(k==5)return[1.7,1.5,.35];if(k==1)return[.25+.8*t,.45+.8*t,1.8-.2*t];if(k==2)return[.7+.5*t,1.3+.3*t,1.8];if(k==3)return[1.1+1.1*t,.8+1.0*t,1.9+.9*t];
 const S=[[0,.35,.62,1.6],[.4,1.35,1.4,1.55],[.72,2.5,1.65,.55],[1,2.6,.85,.22]];for(let i=0;i<3;i++)if(t<=S[i+1][0]){const a=S[i],b=S[i+1],f=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f,a[3]+(b[3]-a[3])*f]}return S[3].slice(1)}
function flowSetup(){const e=ENG[state.mi],on=state.exposed&&!state.lens&&!!e.flow,key=state.mi+'|'+state.Q+'|'+on;if(key===k3.flowKey)return;k3.flowKey=key;FLW.clear();if(!on)return;
 k3.flowP=e.flow();k3.flowP.forEach(p=>{if(p.ring){p.len=1}else if(p.cv){p.c=new T.CatmullRomCurve3(p.cv.map(q=>V3(...q)));p.len=p.c.getLength()}else{let L=0;for(let i=1;i<p.ax.length;i++)L+=Math.hypot(p.ax[i][0]-p.ax[i-1][0],(p.ax[i][1]+p.ax[i][2]-p.ax[i-1][1]-p.ax[i-1][2])/2);p.len=L}});
 const n=[160,320,520][state.Q],tw=k3.flowP.reduce((s,p)=>s+p.w,0);
 k3.flowP.forEach((p,pi)=>{const c=Math.max(4,Math.round(n*p.w/tw));for(let i=0;i<c;i++){const bk=Math.random()<.5;FLW.L.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,a:0,l:1e12,sd:Math.random(),pi,s:Math.random(),f:Math.random(),an:p.band?(bk?Math.PI+Math.random()*.55:2*Math.PI-Math.random()*.55):Math.random()*6.283,fresh:1})}})}
function flowUpd(dt){FLW.u.uStr.value=state.mi==3?.004:.03;const e=ENG[state.mi],sp=state.mi<2?.12+state.N*1.6:.1+state.N*state.fu*1.5+(state.ph==1?.25:0);
 FLW.upd(dt,(p,dt)=>{const pa=k3.flowP[p.pi];if(!pa)return null;
  if(pa.ring){const R4=pa.ring;p.an+=dt*pa.om*(.15+state.N*state.fu);if(Math.sin(p.an)>0)p.an+=Math.PI;const r=R4[2]+(R4[3]-R4[2])*p.s;W3.set(R4[0]+(R4[1]-R4[0])*p.f,Math.cos(p.an)*r,Math.sin(p.an)*r).applyMatrix4(e.E.matrixWorld);p.vx=p.vy=p.vz=0;p.x=W3.x;p.y=W3.y;p.z=W3.z;const c=tcol(0,5);return[.004,c[0]*.75,c[1]*.75,c[2]*.75,.8*Math.min(1,state.N*state.fu*2+.15)]}p.s+=dt*sp*pa.sp/Math.max(.5,pa.len)*1.4;let wrap=false;if(p.s>=1){p.s-=1;p.f=Math.random();wrap=true}
  let lx,ly,lz,t;
  if(pa.ax){const K=pa.ax,m=K.length-1,u=p.s*m,i=Math.min(m-1,Math.floor(u)),fr=u-i,a=K[i],b=K[i+1],ri=a[1]+(b[1]-a[1])*fr,ro=a[2]+(b[2]-a[2])*fr,r=ri+(ro-ri)*p.f;
   lx=a[0]+(b[0]-a[0])*fr;ly=Math.cos(p.an)*r;lz=Math.sin(p.an)*r;t=tv(a[3])+(tv(b[3])-tv(a[3]))*fr}
  else{pa.c.getPointAt(p.s,TV);const j=pa.r*p.f;lx=TV.x+Math.cos(p.an)*j*.5;ly=TV.y+Math.cos(p.an)*j;lz=TV.z+Math.sin(p.an)*j;t=pa.t0+(pa.t1-pa.t0)*p.s}
  W3.set(lx,ly,lz).applyMatrix4(e.E.matrixWorld);
  if(!p.fresh&&!wrap&&dt>0){p.vx=(W3.x-p.qx)/dt;p.vy=(W3.y-p.qy)/dt;p.vz=(W3.z-p.qz)/dt}else{p.vx=p.vy=p.vz=0}
  p.fresh=0;p.x=p.qx=W3.x;p.y=p.qy=W3.y;p.z=p.qz=W3.z;
  const c=tcol(t,pa.k),al=(pa.al?pa.al():1)*Math.min(1,p.s*12)*Math.min(1,(1-p.s)*12);return[state.mi<2?.011:state.mi==3?.0035:.015,c[0]*.75,c[1]*.75,c[2]*.75,al*.8]})}

/* ======================= fire puffs: compressor-stall fireballs, light-off flash ======================= */
function burst(n,big){if(state.mi>1)return;const ax=axisDir();for(let i=0;i<n;i++){const p=axisPt(rnd(0,.6),rnd(0,.25),rnd(0,6.3)),s=rnd(6,18)*(big?1:.6);FIR.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-1.5,1.5),vy:ax.y*s+rnd(-.5,2),vz:ax.z*s+rnd(-1.5,1.5),a:0,l:rnd(.35,.8)*(big?1:.7),sd:Math.random(),s0:big?.35:.25,s1:big?rnd(1.4,2.4):rnd(.8,1.4)})}}
k3.lastPh=0;

/* ======================= 2D overlay: part labels in cutaway, lens legend ======================= */
const LV=V3(),ironCss=v=>{const S=[[0,0,0,.06],[.2,.32,0,.5],[.4,.82,.1,.36],[.6,1,.47,0],[.8,1,.86,.12],[1,1,1,.94]];for(let i=0;i<5;i++)if(v<=S[i+1][0]){const a=S[i],b=S[i+1],f=(v-a[0])/(b[0]-a[0]);return`rgb(${(a[1]+(b[1]-a[1])*f)*255|0},${(a[2]+(b[2]-a[2])*f)*255|0},${(a[3]+(b[3]-a[3])*f)*255|0})`}return'#fff'};
function overlay(){const e=ENG[state.mi];g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(state.exposed&&state.lens!=2&&e.labels){g.font=`600 9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=1;const sc=Math.min(1,state.W/820);
  const inl=state.M.inset&&state.W-150-(state.gx+state.SWR.w+14)>=140,hudR=state.gx+state.SWR.w+(inl?Math.min(230,state.W-150-(state.gx+state.SWR.w+14))+14:0)+6,hudB=state.SWR.y+state.SWR.h+(state.M.inset&&!inl?66:0)+10,ctT=$('ctl').getBoundingClientRect().top-12,placed=[];
  for(const [t,p,o] of e.labels){LV.set(...p).applyMatrix4(e.E.matrixWorld).project(cam);if(LV.z>1||Math.abs(LV.x)>1.02||Math.abs(LV.y)>1.02)continue;
   const x=(LV.x*.5+.5)*state.W,y=(-LV.y*.5+.5)*state.H,tw=g.measureText(t).width+12,lx=Math.max(tw/2+4,Math.min(state.W-140-tw/2,x+o[0]*sc));let ly=Math.min(ctT-8,y+o[1]*sc);
   const box=()=>({x0:lx-tw/2-3,x1:lx+tw/2+3,y0:ly-9,y1:ly+9});let r=box();if(r.x0<hudR&&r.y0<hudB){ly=Math.max(ly,hudB+10);r=box()}
   for(let k=0;k<10;k++){if(!placed.some(q=>!(r.x1<q.x0||r.x0>q.x1||r.y1<q.y0||r.y0>q.y1)))break;ly+=(o[1]>=0?19:-19);if(ly<hudB+10&&lx-tw/2<hudR)ly=hudB+10+19*k;r=box()}
   if(ly>ctT-8)continue;placed.push(r);
   g.strokeStyle='rgba(232,236,242,.7)';g.beginPath();g.moveTo(x,y);g.lineTo(lx,ly);g.stroke();g.fillStyle='#ff9a3a';g.beginPath();g.arc(x,y,2.4,0,6.283);g.fill();
   g.fillStyle='rgba(10,12,18,.82)';g.fillRect(lx-tw/2,ly-8,tw,16);g.strokeStyle='#2a3040';g.strokeRect(lx-tw/2+.5,ly-7.5,tw-1,15);g.fillStyle='#e8ecf2';g.fillText(t,lx,ly+.5)}}
 if(state.lens){let y=state.SWR.y+state.SWR.h+8;if(state.M.inset&&state.W-150-(state.gx+state.SWR.w+14)<140)y+=66;const x=state.gx,w=state.SWR.w,h=state.lens==2?42:22;
  g.fillStyle='rgba(14,17,24,.85)';g.fillRect(x,y,w,h);g.strokeStyle='#2a3040';g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#d8dde6';
  if(state.lens==1)g.fillText('SCHLIEREN · density gradients (simulated)',x+8,y+11.5);
  else{g.fillText('THERMAL °C (illustrative)',x+8,y+10);const bx=x+8,bw=w-16,by=y+18,gr=g.createLinearGradient(bx,0,bx+bw,0);for(let i=0;i<=10;i++)gr.addColorStop(i/10,ironCss(i/10));
   g.fillStyle=gr;g.fillRect(bx,by,bw,8);g.fillStyle='#9aa2b0';g.textAlign='center';[0,100,500,1000,1600].forEach((t,i)=>{const v=Math.pow((t+40)/1640,.6);g.textAlign=i==0?'left':i==4?'right':'center';g.fillText(String(t),bx+v*bw,by+16)})}}
 g.restore()}

/* ======================= frame ======================= */
const pr0=V3();
function render(dt,dr){
 if(k3.QA!==state.Q)setup();if(k3.MA!==state.mi)applyMachine();if(k3.curS!==sKey(state.scene))applyScene(state.scene);
 const e=ENG[state.mi];e.upd(dt);
 /* metal heat glow follows EGT (hg) and the afterburner */
 MT.hot.emissiveIntensity=state.hg*state.hg*state.hg*.12;MT.flap.emissiveIntensity=(state.mi==0?state.A*.05:0);MT.srHot.emissiveIntensity=state.hg*state.hg*state.hg*.08+state.A*.1;MT.inner.emissiveIntensity=(state.exposed?.35:1)*(state.mi<2?(state.hg*state.hg*.35+state.A*1.1+state.ign*1.2+state.gn*1)*(.9+.1*Math.sin(state.simT*40)):0);
 MT.inner.emissive.setRGB(state.gn>.3?.3:1,state.gn>.3?1:.42,state.gn>.3?.4:.13);
 const night=k3.curP.fl;e.lens.forEach(l=>l.material.color.setRGB(night*6,night*5,night*3.6));
 camera(dr);
 const [li,lc]=plumeParams(dt);
 flame.color.setRGB(...lc);flame.intensity=li;flame.position.copy(state.mi<2?axisPt(3.2,0,0):state.mi==3?axisPt(.25,0,0):state.mi==4?V3(1.5,3.2,0):state.mi==5?axisPt(1.5,0,0):state.mi==6?axisPt(.6,0,0):state.mi==7?axisPt(1.2,0,0):V3(.6,2.4,0));
 emitters(dt);updParticles(dt,lc,li);
 if(k3.lastPh==1&&state.ph==2)burst(10,false);k3.lastPh=state.ph;
 flowSetup();scn.updateMatrixWorld();flowUpd(dt);
 FIR.upd(dt,(p,dt)=>{p.vx*=Math.exp(-dt*2.2);p.vy=p.vy*Math.exp(-dt*2.2)+dt*2;p.vz*=Math.exp(-dt*2.2);const f=p.a/p.l,k=Math.pow(1-f,1.6);return[p.s0+(p.s1-p.s0)*Math.sqrt(f),3*k+.25,1.2*k+.06,.3*k,(1-f)*.7]});
 scn.updateMatrixWorld();sky.position.copy(cam.position);
 k3.plume.matrix.copy(e.anchor.matrixWorld);k3.plume.matrixWorldNeedsUpdate=true;PU.uInv.value.copy(e.anchor.matrixWorld).invert();
 cam.getWorldDirection(PU.uFwd.value);PU.uT.value=state.simT;
 R.setRenderTarget(k3.rtM);if(state.lens)lensRender();else{R.setClearColor(0x000000,1);R.clear();R.render(scn,cam)}
 R.toneMapping=state.lens?T.NoToneMapping:T.ACESFilmicToneMapping;k3.bloom.enabled=state.Q>0&&!state.lens;k3.cpass.uniforms.uMode.value=state.lens;
 R.setRenderTarget(k3.rtP);R.setClearColor(0x000000,0);R.clear();R.render(pscn,cam);R.setRenderTarget(null);
 const cu=k3.cpass.uniforms;cu.uT.value=state.simT;cu.uHaze.value=state.Q>0?(2.2+state.A*2.2)*k3.pr*(state.view==2?.35:1):0;cu.uKick.value=state.kick*.2+(state.sT>0?state.ign*.05:0);
 k3.bloom.strength=.35+state.A*.15;k3.comp.render(dr);
 SPK.L.length=Math.min(SPK.L.length,400);P.length=EM.length=SM.length=VP.length=0}
setup();applyScene(state.scene);applyMachine();
return{canvas:glc,render,overlay,resize:()=>{k3.QA=-1},surge:()=>{k3.fire=1;burst(14,true)},snap:()=>{k3.camSnap=true},R}}
