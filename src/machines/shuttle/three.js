// SHUTTLE (RS-25): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, V3, beam, box, cyl, halfRing, lathe, pipe, ring, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, SPK, axisPt } from '../../render3d/particles.js';
import { C } from '../../render3d/plume.js';
import { lightPole } from '../../render3d/props.js';
import { gimb } from '../shared/gimbal.js';

/* ======================= RS-25: fired vertically into a flame deflector on a test stand ======================= */
export function buildSS(){const G=new T.Group(),gim=new T.Group();gim.position.set(0,9.6,0);gim.rotation.z=-Math.PI/2;G.add(gim);
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

export default {
cfg:{box:[7,3.2],sc:[1,6,0],sh:17,cams:[[[2.2,6.2,23.5],[-.6,5.6,0],8.6],[[2.9,5.0,6.4],[0,6.4,0],2.7],[[3.8,1.4,4.8],[0,6.0,0],2.6]],mt:0},
build:buildSS,
plume(u,fl){let li,lc;{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=1.08;u.uSp.value=.035;u.uLen.value=4.5+nn*2;u.uTurb.value=.3+ig*.6;u.uFire.value=ig*.3;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.0,1.15,2.3],[.55,.45,1.25],[.3,.17,.55],[.12,.05,.12]][i],b=[[6,3.4,1],[4,1.4,.25],[1.6,.3,.04],[.3,.03,0]][i];u[k].value.set(...C(a,b,ig*.85))});
  u.uI.value=(nn*.6+ig*.9)*fl;u.uDia.value=nn*2.4*fl;u.uDiaSp.value=1.3;u.uDiaN.value=1.3;u.uDiaOff.value=.25;u.uDisk.value=.85;u.uDiaR.value=.6;
  u.uDC.value.set(5,4.4,4.6);u.uGreen.value=0;u.uHeat.value=nn*1.6+ig*.6;u.uHeatLen.value=3.5;
  li=nn*95+ig*80;lc=ig>.2?[1,.55,.25]:[.72,.78,1]}return[li,lc]},
emit(dt,ax){const nn=state.N*state.fu;
  /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
  const qmax=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(nn*34+state.ign*24)*qmax;
  while(k3.steamAcc>1){k3.steamAcc--;const s=rnd(6,15)*(.5+nn*.7);SMK.add({x:rnd(.5,3.5),y:rnd(.9,2.4),z:rnd(-2.4,2.4),vx:s,vy:rnd(1.5,5),vz:rnd(-2.5,2.5),a:0,l:rnd(5,8),sd:Math.random(),k:2,s0:2.2,s1:rnd(12,20)})}
  /* steam drifting off the plume column near the bell */
  if(nn>.1&&Math.random()<dt*8*qmax){const p=axisPt(rnd(.3,2.5),rnd(1.2,1.8),rnd(0,6.3));SMK.add({x:p.x,y:p.y,z:p.z,vx:rnd(-1,2),vy:rnd(-.5,1.5),vz:rnd(-1,1),a:0,l:rnd(2,4),sd:Math.random(),k:3,s0:.6,s1:2.6})}
  /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
  if(state.ph==1&&state.st>.5){k3.sparkAcc+=dt*90;while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.floor(Math.random()*4)/4*6.283+.4,p=axisPt(rnd(.4,.8),1.6,a),s=rnd(4,10);SPK.add({x:p.x,y:p.y,z:p.z,vx:-Math.cos(a)*s*0+rnd(-3,3),vy:rnd(-2,4),vz:-Math.sin(a)*s*.5,a:0,l:rnd(.4,.9),sd:Math.random(),k:1})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+nn*25);thSet(TH.bell,amb+nn*520,-nn*270,-2.9,0);thSet(TH.inner,amb+nn*900);thSet(TH.hot,amb+nn*480)},
flame:()=>V3(.6,2.4,0),
};
