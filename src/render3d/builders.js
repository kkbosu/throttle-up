// One builder per machine, in ENG order (index = ?m). Moves into src/machines/<name>/ in step 5.
import * as T from 'three';
import { state } from '../core/state.js';
import { sm } from '../core/util.js';
import { buildF } from '../machines/f-type/three.js';
import { buildHT } from '../machines/hall/three.js';
import { buildHR } from '../machines/harrier/three.js';
import { buildF1 } from '../machines/saturn-v/three.js';
import { buildSS } from '../machines/shuttle/three.js';
import { buildSR } from '../machines/sr-71/three.js';
import { sc, skyRy } from '../machines/table.js';
import { padTex } from './ground.js';
import { CAT, MT, V3, beam, bladeRing, box, canvasTex, cyl, lathe, pipe, ring, scn, std } from './kit.js';
import { lightPole } from './props.js';

// assigned by create*() below, when init3D runs
export let ENG;

export function createBuilders(){

ENG=[buildF(),buildSR(),buildSS(),buildHT(),buildF1(),buildHR(),buildTP(),buildSC()];ENG.forEach(e=>{scn.add(e.G);e.G.visible=false});
}
/* ======================= NK-12 TURBOPROP on an outdoor test stand ======================= */
/* propeller blade: radial along +Y, chord along Z (in the plane of rotation), thin along X; twisted, wider in the middle, rounded tip */
export function bladeGeo(r0,r1){const NS=16,NK=10,pos=[],idx=[];
 for(let i=0;i<=NS;i++){const t=i/NS,r=r0+(r1-r0)*t,ch=(t<.3?.3+.5*t:.45-.3*(t-.3)/.7)*(1-.55*Math.pow(t,8)),th=ch*(.2-.13*t),tw=.55*(1-t)-.1;
  for(let k=0;k<NK;k++){const a=k/NK*6.283,cz=Math.cos(a)*ch*.5,cx=Math.sin(a)*th*.5*(1+.4*Math.cos(a));pos.push(cx*Math.cos(tw)+cz*Math.sin(tw),r,-cx*Math.sin(tw)+cz*Math.cos(tw))}}
 for(let i=0;i<NS;i++)for(let k=0;k<NK;k++){const a=i*NK+k,b=i*NK+(k+1)%NK;idx.push(a,a+NK,b,b,a+NK,b+NK)}
 const c=pos.length/3;pos.push(0,r1,0);for(let k=0;k<NK;k++)idx.push(NS*NK+k,c,NS*NK+(k+1)%NK);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
export function buildTP(){const G=new T.Group(),E=new T.Group();E.position.y=4;G.add(E);
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
export function buildSC(){const G=new T.Group(),ST=new T.Group(),RV=new T.Group();G.add(ST,RV);
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
