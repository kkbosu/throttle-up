// SATURN V (five F-1s): the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { padTex } from '../../render3d/ground.js';
import { CAT, MT, V3, beam, box, canvasTex, cyl, halfRing, lathe, pipe, ring, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK } from '../../render3d/particles.js';
import { lightPole } from '../../render3d/props.js';
import { gimb } from '../shared/gimbal.js';
import { sicE } from './machine.js';

/* ======================= SATURN V S-IC: five F-1s on a vertical static test stand ======================= */
export function buildF1(){const G=new T.Group();
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

export default {
cfg:{box:[16,8],sc:[2,10,0],sh:26,cams:[[[16,14,50],[3,12.5,0],21],[[8.6,10.8,10.8],[2.4,12.4,2.4],4.6],[[9.5,3.2,13],[0,13,0],7.5]],mt:0},
build:buildF1,
plume(u,fl){let li,lc;{const fl2=.94+.06*Math.sin(state.simT*53)*Math.sin(state.simT*31+1),ig=Math.min(1,state.ign);u.uCl.value=1;u.uAnn.value=0;
  [[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=sicE[j]});u.uMR.value=4.6;u.uMg.value.set(3,11);
  u.uR0.value=1.75;u.uSp.value=.045;u.uLen.value=10+state.N*4;u.uTurb.value=.45+ig*.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[5,3.6,1.6],[3.4,1.5,.4],[1.4,.4,.08],[.3,.06,.01]][i]));
  u.uI.value=(state.N>.01?1.15:0)*fl2+ig*.8;u.uDia.value=.12*state.N;u.uDiaSp.value=2.2;u.uDiaN.value=2;u.uDiaOff.value=.3;u.uDisk.value=0;u.uDiaR.value=.6;u.uDC.value.set(4,3,2);u.uGreen.value=0;
  u.uHeat.value=state.N*1.6+ig*.5;u.uHeatLen.value=6;li=state.N*520+ig*220;lc=[1,.62,.3]}return[li,lc]},
emit(dt,ax){const qm=state.Q>1?1:state.Q>0?.6:.35;k3.steamAcc+=dt*(state.N*48+state.ign*30)*qm;
  while(k3.steamAcc>1){k3.steamAcc--;const sp=rnd(7,20)*(.5+state.N*.6),sm2=Math.random()<.4;SMK.add({x:rnd(3,9),y:rnd(1,3.5),z:rnd(-6,6),vx:sp,vy:rnd(2,6),vz:rnd(-4,4),a:0,l:rnd(6,9),sd:Math.random(),k:sm2?6:2,s0:3,s1:rnd(16,26)})}},
thermal(amb,nn,fh){thSet(TH.case,amb+state.N*40);thSet(TH.bell,amb+state.N*480,-state.N*220,-3.9,0);thSet(TH.hot,amb+state.N*450);thSet(TH.inner,amb+state.N*900)},
flame:()=>V3(1.5,3.2,0),
};
