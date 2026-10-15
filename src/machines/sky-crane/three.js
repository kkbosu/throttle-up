// SKY CRANE: the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (plume, particles, thermal lens, flame light, tracers).
import * as T from 'three';
import { state } from '../../core/state.js';
import { k3 } from '../../render3d/context.js';
import { CAT, MT, V3, beam, box, canvasTex, cyl, lathe, rnd, std } from '../../render3d/kit.js';
import { TH, thSet } from '../../render3d/lenses.js';
import { SMK, axisPt } from '../../render3d/particles.js';
import { MLE, sc, skyRy } from './machine.js';

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

export default {
cfg:{box:[12,2.6],sc:[0,10,0],sh:24,mars:1,cams:[[[15,3.5,24],[0,0,0],6.5],[[5.2,1.8,7.2],[0,.9,0],2.9],[[8,1.3,12],[0,0,0],7]],mt:0},
build:buildSC,
plume(u,fl){let li,lc;{const nn=state.N*state.fu,ig=Math.min(1,state.ign);u.uCl.value=sc.done?0:1;u.uAnn.value=0;
  for(let j=0;j<5;j++){if(j<4){const a=Math.PI/4+j*Math.PI/2;u.uO.value[j].set(Math.cos(a)*1.6,Math.sin(a)*1.6);u.uW.value[j]=Math.min(1,(sc.thr[2*j]+sc.thr[2*j+1])/MLE*.7)}else u.uW.value[j]=0}
  u.uMR.value=2.4;u.uMg.value.set(8,30);u.uR0.value=.2;u.uSp.value=.22;u.uLen.value=5+nn*8;u.uTurb.value=.35;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.6,.55,.85],[.32,.3,.52],[.12,.1,.2],[.03,.02,.05]][i]));
  u.uI.value=(sc.done?0:1)*(nn*.12+ig*.25);u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=(sc.done?0:1)*nn*2.4;u.uHeatLen.value=4;li=(sc.done?0:1)*(nn*6+ig*8);lc=[.85,.75,1]}return[li,lc]},
emit(dt,ax){const h=state.alt,nn=state.N*state.fu;if(!sc.done&&h<30&&nn>.05){const k2=Math.pow(1-h/30,1.5);k3.sparkAcc+=dt*nn*260*k2*(state.Q>1?1:state.Q>0?.6:.35);
  while(k3.sparkAcc>1){k3.sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,4+h*.3),sp=rnd(5,16)*(.4+k2);SMK.add({x:sc.x+Math.cos(a)*r,y:.15,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.3,2.5),vz:Math.sin(a)*sp,a:0,l:rnd(2,4),sd:Math.random(),k:8,s0:.5,s1:rnd(3,7)})}}},
thermal(amb,nn,fh){thSet(TH.case,amb+8);thSet(TH.hot,amb+nn*850);thSet(TH.inner,amb+150);thSet(TH.bell,amb)},
flame:()=>axisPt(1.2,0,0),
};
