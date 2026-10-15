// Renderer, scenes and camera objects, shared textures, materials (MT), thermal categories (CAT), geometry helpers.
import * as T from 'three';
import { $, mk } from '../core/util.js';

// assigned by create*() below, when init3D runs
export let glc,R,scn,pscn,cam,V3,col,rnd,ANI,std,heatTint,heatEm,brushed,tubeN,tubeC,MT,CAT,halfRing,lathe,ring,box,cyl,pipe,onCase;

export function createKit(){

glc=$('gl');R=new T.WebGLRenderer({canvas:glc,antialias:false,powerPreference:'high-performance',stencil:false});
if(!R.capabilities.isWebGL2)throw new Error('webgl2');
R.toneMapping=T.ACESFilmicToneMapping;R.outputColorSpace=T.SRGBColorSpace;R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
scn=new T.Scene();pscn=new T.Scene();cam=new T.PerspectiveCamera(38,1,.2,9000);
V3=(x,y,z)=>new T.Vector3(x,y,z);col=(r,g,b)=>new T.Color().setRGB(r,g,b);rnd=(a,b)=>a+Math.random()*(b-a);
ANI=R.capabilities.getMaxAnisotropy();
std=o=>new T.MeshStandardMaterial(o);
/* heat tint along a hot casing: steel -> straw -> bronze -> blue -> dark */
heatTint=canvasTex(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[[0,'#8d9197'],[.3,'#9a9284'],[.5,'#a08458'],[.66,'#7d5a3e'],[.8,'#4f4a6a'],[1,'#3a3a44']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<500;i++){x.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},.035)`;x.fillRect(0,Math.random()*h,w,1+Math.random()*3)}});
heatEm=canvasTex(8,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#000');g.addColorStop(.55,'#110300');g.addColorStop(1,'#ff6a20');x.fillStyle=g;x.fillRect(0,0,w,h)});
brushed=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const v=110+Math.random()*40|0;x.fillStyle=`rgb(${v},${v},${v})`;x.globalAlpha=.25;x.fillRect(0,Math.random()*h,w,1)}},false,[1,4]);
/* RS-25 nozzle: hundreds of brazed coolant tubes. Normal map stripes around, colour bands along */
tubeN=canvasTex(256,8,(x,w,h)=>{const id=x.createImageData(w,h),p=8;for(let i=0;i<w;i++){const f=((i%p)+.5)/p*2-1,nx=f*.85,nz=Math.sqrt(1-nx*nx);for(let j=0;j<h;j++){const k=(j*w+i)*4;id.data[k]=(nx*.5+.5)*255;id.data[k+1]=128;id.data[k+2]=nz*255;id.data[k+3]=255}}x.putImageData(id,0,0)},false,[14,1]);
tubeC=canvasTex(64,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);[[0,'#6c5a4a'],[.12,'#8a6e52'],[.4,'#9a7a5a'],[.75,'#8c7a68'],[1,'#a39484']].forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<220;i++){x.fillStyle=`rgba(${Math.random()<.5?30:200},${Math.random()<.5?20:170},${Math.random()<.5?10:140},.05)`;x.fillRect(0,Math.random()*h,w,1+Math.random()*6)}},true,[14,1]);
MT={
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
CAT=new Map([[MT.hot,'hot'],[MT.flap,'hot'],[MT.srHot,'hot'],[MT.inner,'inner'],[MT.ti,'case'],[MT.steel,'case'],[MT.alu,'case'],[MT.copper,'case'],[MT.brass,'case'],[MT.sr,'case'],[MT.hose,'case'],[MT.wireR,'case'],[MT.wireB,'case'],[MT.dark,'case'],[MT.bell,'bell']]);
halfRing=(r,tube,x,mat,seg=48)=>{const g=new T.TorusGeometry(r,tube,8,seg,Math.PI);g.rotateY(Math.PI/2);g.rotateX(-Math.PI/2);const m=new T.Mesh(g,mat);m.position.x=x;m.castShadow=true;return m};

/* ---------------- geometry helpers: lathes run along local +X ---------------- */
lathe=(prof,mat,seg=56,half=false)=>{const g=new T.LatheGeometry(prof.map(p=>new T.Vector2(p[0],p[1])),seg,half?Math.PI/2:0,half?Math.PI:Math.PI*2);g.rotateZ(-Math.PI/2);const m=new T.Mesh(g,mat);m.castShadow=m.receiveShadow=true;return m};
ring=(r,tube,x,mat,seg=72)=>{const g=new T.TorusGeometry(r,tube,8,seg);g.rotateY(Math.PI/2);const m=new T.Mesh(g,mat);m.position.x=x;m.castShadow=true;return m};
box=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m};
cyl=(r0,r1,h,mat,seg=24)=>{const m=new T.Mesh(new T.CylinderGeometry(r0,r1,h,seg),mat);m.castShadow=m.receiveShadow=true;return m};
pipe=(pts,r,mat,seg)=>{const c=new T.CatmullRomCurve3(pts.map(p=>V3(p[0],p[1],p[2])));const m=new T.Mesh(new T.TubeGeometry(c,seg||Math.max(12,pts.length*10),r,8,false),mat);m.castShadow=true;return m};
/* point on a casing of radius r at axial x, angle a (0 = top, +pi/2 = toward camera) */
onCase=(x,r,a)=>[x,Math.cos(a)*r,Math.sin(a)*r];
}

/* ---------------- materials ---------------- */
export function canvasTex(w,h,fn,srgb=true,rep){const c=mk(w,h),x=c.getContext('2d');fn(x,w,h);const t=new T.CanvasTexture(c);if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANI;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t}
/* rings of blades: [x, hub r, tip r, count, chord, twist] */
export function bladeRing(list,mat){const bg=new T.BoxGeometry(.11,1,.012);bg.translate(0,.5,0);const tot=list.reduce((s,b)=>s+b[3],0),im=new T.InstancedMesh(bg,mat,tot),M4=new T.Matrix4(),q=new T.Quaternion(),q2=new T.Quaternion(),eu=new T.Euler();let k=0;
 list.forEach(([x,r0,r1,n,ch,tw])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;q.setFromEuler(eu.set(a,0,0));q2.setFromAxisAngle(V3(0,1,0),tw);q.multiply(q2);M4.compose(V3(x,Math.cos(a)*r0,Math.sin(a)*r0),q,V3(ch/.11,r1-r0,1));im.setMatrixAt(k++,M4)}});im.castShadow=true;return im}
/* bolt heads around a flange */
export function bolts(grp,list,n){const g=new T.CylinderGeometry(.011,.011,.02,6);g.rotateZ(Math.PI/2);const im=new T.InstancedMesh(g,MT.steel,list.length*n),m=new T.Matrix4(),q=new T.Quaternion();let k=0;
 list.forEach(([x,r])=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2;m.compose(V3(x,Math.cos(a)*r,Math.sin(a)*r),q,V3(1,1,1));im.setMatrixAt(k++,m)}});grp.add(im);return im}
/* I-beam-ish steel member between two points */
export function beam(grp,a,b,s,mat){const A=V3(...a),B=V3(...b),d=B.clone().sub(A),m=box(s,d.length(),s,mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());grp.add(m);return m}
