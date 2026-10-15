const $=id=>document.getElementById(id),cv=$('c'),g=cv.getContext('2d');
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
let W,H,D=1,u,nx,ny,gx=18,gy=100,dsz=80,TR={left:0,top:0,right:0,bottom:0,width:12,height:100};
let L=0,raw=0,N=0,A=0,E=20,F=0,kick=0,ign=0,spd=0,sg=0,igt=0,fu=0,hg=0,Ns=0,sT=0,Nst=0,pulseT=0,bt=0,coolS=0,stl=0,Lp=0,Lrate=0,faults=true,lit=false,tm=0,stuck=false,last=0,hinted=true,gn=0,spk=0,mach=0;
let G3=null,R3done=false,lens=0,raw2=.914,drag2=false,alt=0,vz=0,nz=90,prp=0,beta=86;   /* 3D renderer handle (null = 2D fallback) */
let ph=0,st=0,TS=1,tsT=1,simT=0,sl=0,view=0,exposed=0,scene=0,zm=1,mi=0,M=null;
/* quality: 2 full, 1 coarse haze, 0 no haze/bloom. Steps down on its own if frames stay slow; ?q=0|1|2 pins it */
const QP=new URLSearchParams(location.search).get('q');let Q=QP===null?2:Math.max(0,Math.min(2,+QP||0)),emaT=16,slowT=0;
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)};
const SNM=['MIDDAY','AFTERNOON','SUNSET'];
const SL=[1,.5,.2],SLN=['OFF','1/2x','1/5x'],VN=['SIDE','CLOSE-UP','REAR','EARTH'],SN=['VOID','DESERT DAWN','NIGHT'],ZT=[1,2.3,1,1];

/* ---------- off-screen buffers: bloom + heat haze ---------- */
const B0=mk(8,8),B1=mk(8,8),B2=mk(8,8),HS=mk(8,8),HD=mk(8,8);
const b0=B0.getContext('2d'),b1=B1.getContext('2d'),b2=B2.getContext('2d'),hs=HS.getContext('2d'),hd=HD.getContext('2d');

/* ---------- gauges: static faces are cached, needles drawn per frame ---------- */
const A0=2.356,SW=4.712,MONO='ui-monospace,Menlo,Consolas,monospace';
let GC=[],FC=[];const GV=[0,0,0];let SWR={x:0,y:0,w:0,h:0};   /* GC comes from the active machine (M.g) */
function buildFaces(){const s=Math.round(dsz*D),R=s/2;
 FC=GC.map(c=>{const k=mk(s,s),x=k.getContext('2d'),a=v=>A0+(v-c.min)/(c.max-c.min)*SW;
  x.fillStyle='rgba(8,10,15,.84)';x.strokeStyle='#2a3040';x.lineWidth=s*.02;x.beginPath();x.arc(R,R,R-s*.012,0,6.283);x.fill();x.stroke();
  x.strokeStyle='#c0392b';x.lineWidth=s*.035;x.beginPath();x.arc(R,R,R*.84,a(c.red),a(c.max));x.stroke();
  x.fillStyle='#d8dde6';x.font=`${s*.1}px ${MONO}`;x.textAlign='center';x.textBaseline='middle';
  for(let v=c.min;v<=c.max+1e-6;v+=c.mn){const q=a(v),mj=Math.abs(v/c.maj-Math.round(v/c.maj))<1e-6,co=Math.cos(q),si=Math.sin(q),r0=R*(mj?.7:.76),r1=R*.9;
   x.strokeStyle=mj?'#d8dde6':'#6c7482';x.lineWidth=s*(mj?.022:.012);x.beginPath();x.moveTo(R+co*r0,R+si*r0);x.lineTo(R+co*r1,R+si*r1);x.stroke();
   if(mj)x.fillText(String(v/c.d),R+co*R*.55,R+si*R*.55)}
  x.fillStyle='#6c7482';x.font=`${s*.085}px ${MONO}`;x.fillText(c.t,R,R*1.42);
  return k})}

function resize(){
 D=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*D;cv.height=H*D;g.setTransform(D,0,0,D,0,0);
 u=Math.max(.5,Math.min(W/900,H/520));nx=W*M.nxf;ny=H*.5;
 const hr=$('hud').getBoundingClientRect();gx=hr.left;gy=hr.bottom+18;
 dsz=Math.round(Math.max(54,Math.min(88,(W-gx-170)/3.15)));TR=trk.getBoundingClientRect();
 B0.width=Math.max(8,W>>1);B0.height=Math.max(8,H>>1);B1.width=Math.max(8,W>>2);B1.height=Math.max(8,H>>2);B2.width=Math.max(8,W>>4);B2.height=Math.max(8,H>>4);
 buildFaces();if(G3)G3.resize()}
addEventListener('resize',resize);

/* ---------- input: lever with a detent at MIL ---------- */
function applyRaw(){const r=raw,d=M.ab;L=d?(r<.7?r:r<.8?.7:.7+(r-.8)/.2*.3):r;const s=d&&r>=.7&&r<.8;if(s!==stuck){stuck=s;tick()}}
const tq=$('tq'),trk=$('trk');let drag=false;
function fromY(y){const b=trk.getBoundingClientRect();raw=Math.min(1,Math.max(0,1-(y-b.top)/b.height));applyRaw()}
function fromY2(y){const b=$('trk2').getBoundingClientRect();raw2=Math.min(1,Math.max(0,1-(y-b.top)/b.height))}
tq.addEventListener('pointerdown',e=>{tq.setPointerCapture(e.pointerId);tq.style.cursor='grabbing';
 if(M.nozzle){const a=trk.getBoundingClientRect(),c=$('trk2').getBoundingClientRect();if(Math.abs(e.clientX-c.left-6)<Math.abs(e.clientX-a.left-6)){drag2=true;fromY2(e.clientY);return}}
 drag=true;fromY(e.clientY)});
tq.addEventListener('pointermove',e=>{if(drag2)fromY2(e.clientY);else if(drag)fromY(e.clientY)});
['pointerup','pointercancel'].forEach(n=>tq.addEventListener(n,()=>{drag=drag2=false;tq.style.cursor='grab'}));
const K={};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();K[k]=1;if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const m={v:'view',e:'exp',c:'scn',m:'slow',r:'rec',o:'eng',f:'flt',n:'mach',q:'seq',i:'inf',l:'lens'}[k];if(m&&ph)act(m)});
addEventListener('keydown',e=>{if(e.key==='Escape')closeInfo()});
addEventListener('keyup',e=>K[e.key.toLowerCase()]=0);
function keys(dt){if(M.nozzle){const n=(K.arrowright||K.d?1:0)-(K.arrowleft||K.a?1:0);if(n)raw2=Math.min(1,Math.max(0,raw2+n*.5*dt))}const d=(K.arrowup||K.w?1:0)-(K.arrowdown||K.s?1:0);if(!d)return;const sp=(M.ab&&raw>=.7&&raw<.8)?.1:.45;raw=Math.min(1,Math.max(0,raw+d*sp*dt));applyRaw()}

/* ---------- engine model: thrust chases the lever with lag ---------- */
/* ph: 0 off, 1 starter cranking, 2 running. E = exhaust temp (C), F = fuel flow (1000 lb/h) */
function update(dt){
 if(!ph||dt<=0)return;
 const N0=N;
 if(ph==1){st+=dt;N=Ns+(Math.max(M.cN,Ns)-Ns)*sm(0,M.cT,st);
  if(st>M.tk[0]){igt+=dt;if(igt>M.tk[1]){igt=0;tick()}}
  if(st>=M.cT){ph=2;ign=M.ign;kick=Math.max(kick,M.lk);E=Math.max(E,M.e0f);gn=M.teb?1:0;thump(M.lt);$('hint').textContent=M.hint}}
 else if(ph==2){const tN=M.ab?(L<=.7?M.idle+L/.7*(1-M.idle):1):M.idle+(1-M.idle)*L;
  coolS=Math.max(0,coolS-dt);
  /* a slam at low N1 can push the compressor into surge: roll once per slam, scaled by how hard it was */
  if(M.stall&&sT<=0&&coolS<=0&&Lrate>1.6&&N<.7&&tN-N>.3){coolS=3;if(faults&&Math.random()<Math.min(.9,Math.max(.25,(Lrate-1.6)/3)))startStall()}
  if(sT>0){sT-=dt*(L<.35?3:1);pulseT-=dt;bt-=dt;               /* pulling the lever back clears it ~3x faster */
   N+=(Nst*.55-N)*(1-Math.exp(-dt/.45));
   if(pulseT<=0){pulseT=.34+.1*Math.sin(simT*5);surge()}
   if(bt<=0){bt=.5;beep()}
   if(sT<=0){sT=0;say('Engine recovered. Advance the throttle smoothly.')}}
  else N+=(tN-N)*(1-Math.exp(-dt/(tN>N?M.up:M.dn)))}
 else{N-=N*(1-Math.exp(-dt/M.coast));if(N<.004)N=0}   /* ph 3: fuel off, rotor windmills down */
 const want=M.ab&&ph==2&&L>.702&&N>.93;
 if(want&&!lit){tm+=dt;if(tm>.3){lit=true;tm=0;kick=1;if(M.teb)gn=1;thump();navigator.vibrate&&navigator.vibrate(30)}}
 else if(L<=.702){lit=false;tm=0}
 const aT=lit?.2+.8*(L-.7)/.3:0;
 A+=(aT-A)*(1-Math.exp(-dt/(aT>A?.45:.3)));
 kick*=Math.exp(-dt*3.2);ign*=Math.exp(-dt*2.2);gn*=Math.exp(-dt*2.6);
 /* SR-71: the lever also sets a simulated Mach number (0 idle, 1.2 MIL, 3.2 full A/B). The spike stays forward until about Mach 1.6 and is fully aft (26 in) by Mach 3 */
 const tMach=ph==2&&M.spike?(L<=.7?L/.7*1.2:1.2+(L-.7)/.3*2):0;
 mach+=(tMach-mach)*(1-Math.exp(-dt/(tMach>mach?2.5:4)));spk=Math.min(1,Math.max(0,(mach-1.6)/1.4));
 spd+=(Math.max(0,(N0-N)/dt)*N-spd)*(1-Math.exp(-dt/.15));   /* spool-down rate drives the whine */
 sg=ph==1?1:ph==2?Math.max(0,1-(N-M.cN)/.1):0;                 /* starter motor drops out as the engine takes over */
 const Nf=sT>0?Math.max(N,Nst):N,tE=ph==2?M.e[0]+N*M.e[1]+A*M.e[2]+(sT>0?520:0):20,tF=ph==2?(M.f[0]+M.f[1]*Math.pow(Nf,M.f[2])+A*M.f[3])*(1+(sT>0?.35*Math.sin(simT*17):0)):0;
 E+=(tE-E)*(1-Math.exp(-dt/(tE>E?(sT>0?.7:1.6):2.8)));F+=(tF-F)*(1-Math.exp(-dt/(tF>F?.25:.4)));
 fu+=((ph==2?1:0)-fu)*(1-Math.exp(-dt/(ph==2?.35:.08)));   /* combustion: dies fast on fuel cut */
 stl+=((sT>0?1:0)-stl)*(1-Math.exp(-dt/.25));                   /* smoothed stall level for sound + gauges */
 hg=Math.min(1,Math.max(0,(E-150)/600));if(M.orbit)orbStep(dt);if(M.clu)M.clu(dt);if(M.hover)hoverStep(dt);                      /* metal glow follows EGT, so it cools slowly */
 if((A>.5||(!M.ab&&N>.9))&&hinted){hinted=false;$('hint').style.opacity=0}
}

/* ---------- audio: all synthesized ---------- */
let AC,S={ns:[]};
const VV=[{v:.9,raw:0,hs:-3},{v:1.05,raw:.12,hs:1},{v:1.35,raw:.42,hs:5},{v:.9,raw:0,hs:-3}];   /* per view: level, grit (waveshaper mix), treble (dB) */
function initAudio(){try{
 AC=new(window.AudioContext||window.webkitAudioContext)();const sr=AC.sampleRate,out=AC.createGain();out.gain.value=.9;
 const cp=AC.createDynamicsCompressor(),hsf=AC.createBiquadFilter(),mlp=AC.createBiquadFilter(),dry=AC.createGain(),wet=AC.createGain(),shp=AC.createWaveShaper(),bus=AC.createGain();
 hsf.type='highshelf';hsf.frequency.value=3000;mlp.type='lowpass';mlp.frequency.value=20000;mlp.Q.value=.5;wet.gain.value=0;
 const crv=new Float32Array(1024);for(let i=0;i<1024;i++)crv[i]=Math.tanh((i/512-1)*4);shp.curve=crv;
 out.connect(dry);dry.connect(bus);out.connect(shp);shp.connect(wet);wet.connect(bus);bus.connect(hsf);hsf.connect(mlp);mlp.connect(cp);cp.connect(AC.destination);
 try{S.dst=AC.createMediaStreamDestination();cp.connect(S.dst)}catch(e){S.dst=null}
 S.out=out;S.wet=wet;S.hsf=hsf;S.mlp=mlp;
 const noise=b=>{const bf=AC.createBuffer(1,sr*3,sr),d=bf.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(b){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w}const s=AC.createBufferSource();s.buffer=bf;s.loop=true;s.start();S.ns.push(s);return s};
 const ch=(src,t,f,q)=>{const fl=AC.createBiquadFilter();fl.type=t;fl.frequency.value=f;fl.Q.value=q||.7;const gn=AC.createGain();gn.gain.value=0;src.connect(fl);fl.connect(gn);gn.connect(out);return{fl,gn}};
 S.nb=AC.createBuffer(1,sr,sr);{const d=S.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 const osc=(t,f)=>{const o=AC.createOscillator();o.type=t;o.frequency.value=f;o.start();return o};
 S.rum=ch(noise(1),'lowpass',140);S.roar=ch(noise(0),'bandpass',500,.5);S.crk=ch(noise(1),'bandpass',700,.8);
 S.osc=osc('sawtooth',180);S.wh=ch(S.osc,'lowpass',2200,2);        /* compressor whine */
 S.osc2=osc('triangle',360);S.wh2=ch(S.osc2,'bandpass',3000,4);    /* upper siren on spool-down */
 S.so=osc('sawtooth',60);S.sg=ch(S.so,'bandpass',400,3);           /* starter motor */
 S.so2=osc('square',40);S.sg2=ch(S.so2,'lowpass',500,1);           /* starter gear whir */
}catch(e){AC=null}}
function audio(){if(!AC)return;const t=AC.currentTime,s=(p,v,k=.06)=>p.setTargetAtTime(v,t,k),V=VV[view],ts=TS,pm=.55+.45*ts;
 s(S.out.gain,.9*V.v,.2);s(S.wet.gain,V.raw,.25);s(S.hsf.gain,V.hs+(exposed?2:0),.25);
 s(S.mlp.frequency,1000*Math.pow(20,Math.max(0,(ts-.2)/.8)),.12);                 /* slow-mo muffles and drops the whole bed */
 S.ns.forEach(n=>s(n.playbackRate,.45+.55*ts,.12));
 M.au(s,V,pm)}
/* per-machine voices: each sets the same nodes (rumble, roar, whine, upper siren, crackle, starter) its own way */
function auF(s,V,pm){
 s(S.rum.gn.gain,(N*.6*(.35+.65*fu)+A*.7+sg*.12+ign*.7)*(1+stl*.4*Math.sin(simT*50)));s(S.rum.fl.frequency,90+N*110+A*240);
 s(S.roar.gn.gain,(N*N*(.05+.17*fu)+A*.5+sg*.04+ign*.35)*(1+stl*.6*Math.sin(simT*75)));s(S.roar.fl.frequency,250+N*800+A*1500);
 s(S.wh.gn.gain,N*.05*(1-A*.8)*(1+(1-fu)*1.6)+spd*.16);s(S.osc.frequency,(180+N*1500)*pm);s(S.wh.fl.frequency,(900+N*2200)*pm);
 s(S.wh2.gn.gain,spd*.09+N*.012*(1-A)*(1+(1-fu)*2));s(S.osc2.frequency,(180+N*1500)*2.01*pm);
 s(S.crk.gn.gain,A*(.5+Math.random()*1.2)*(.8+V.raw)+stl*(.3+Math.random()*.9),.02);s(S.crk.fl.frequency,700);
 s(S.sg.gn.gain,sg*.12);s(S.so.frequency,(60+N*2600)*pm);s(S.sg.fl.frequency,300+N*3000);
 s(S.sg2.gn.gain,sg*.05);s(S.so2.frequency,(30+N*500)*pm)}
/* J58: bigger, lower, rougher. Slow rolling rumble, deeper whine, harder crackle; the starter is a pair of V8 start-cart engines burbling */
function auSR(s,V,pm){const bur=.62+.38*Math.sin(simT*55)*Math.sin(simT*37+1);
 s(S.rum.gn.gain,(N*.78*(.35+.65*fu)+A*.85+sg*.3*bur+ign*.9)*(1+.12*Math.sin(simT*7.3))*(1+stl*.4*Math.sin(simT*50)));s(S.rum.fl.frequency,70+N*95+A*230);
 s(S.roar.gn.gain,(N*N*(.06+.21*fu)+A*.62+sg*.03+ign*.45)*(1+stl*.6*Math.sin(simT*75)));s(S.roar.fl.frequency,200+N*700+A*1300);
 s(S.wh.gn.gain,N*.055*(1-A*.7)*(1+(1-fu)*1.6)+spd*.16);s(S.osc.frequency,(130+N*1150)*pm);s(S.wh.fl.frequency,(700+N*1900)*pm);
 s(S.wh2.gn.gain,spd*.09+N*.01*(1-A)*(1+(1-fu)*2));s(S.osc2.frequency,(130+N*1150)*2.01*pm);
 s(S.crk.gn.gain,A*(.7+Math.random()*1.5)*(.8+V.raw)+stl*(.3+Math.random()*.9),.02);s(S.crk.fl.frequency,640);
 s(S.sg.gn.gain,sg*.2*bur);s(S.so.frequency,(46+N*220)*pm);s(S.sg.fl.frequency,170+N*500);
 s(S.sg2.gn.gain,sg*.1*bur);s(S.so2.frequency,(24+N*90)*pm)}
/* RS-25: no whine at all. Deep thunder, a wide roar and hydrogen crackle; during start a hiss of chilldown vents */
function auSS(s,V,pm){const nn=N*fu;
 s(S.rum.gn.gain,(nn*1.25+ign*1.1)*(1+.14*Math.sin(simT*37)*Math.sin(simT*11+2)));s(S.rum.fl.frequency,60+N*95);
 s(S.roar.gn.gain,nn*nn*.5+ign*.55+sg*.07);s(S.roar.fl.frequency,sg>.05&&nn<.05?3200:180+N*950);
 s(S.crk.gn.gain,nn*(.3+Math.random()*.8)*(.8+V.raw)+ign*.4,.02);s(S.crk.fl.frequency,900+N*500);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,0);s(S.sg2.gn.gain,0)}
function thump(v=1){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),n=AC.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(30,t+.5);n.gain.setValueAtTime(v,t);n.gain.exponentialRampToValueAtTime(.001,t+.6);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.65)}
function tick(){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),n=AC.createGain();o.type='square';o.frequency.value=1400;n.gain.setValueAtTime(.08,t);n.gain.exponentialRampToValueAtTime(.001,t+.03);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.04)}
/* surge bang: sharp noise crack falling through a lowpass, plus the low thump */
function bang(v=1){if(!AC)return;const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),n=AC.createGain();
 s.buffer=S.nb;f.type='lowpass';f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(180,t+.45);
 n.gain.setValueAtTime(0,t);n.gain.linearRampToValueAtTime(.9*v,t+.004);n.gain.exponentialRampToValueAtTime(.001,t+.5);
 s.connect(f);f.connect(n);n.connect(S.out);s.start(t);s.stop(t+.55);thump(.9*v)}
function beep(){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),n=AC.createGain();o.type='sine';o.frequency.value=1100;n.gain.setValueAtTime(.001,t);n.gain.linearRampToValueAtTime(.07,t+.01);n.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.16)}
document.addEventListener('visibilitychange',()=>{if(AC)document.hidden?AC.suspend():AC.resume()});
$('ov').addEventListener('click',()=>{if(ph||!R3done)return;initAudio();if(AC)AC.resume();ph=1;st=0;$('hint').textContent='Engine starting...';$('ov').style.opacity=0;setTimeout(()=>$('ov').style.display='none',600)});

/* ---------- rendering ---------- */
const P=[],EM=[],SM=[],VP=[];
const spr=c=>{const k=mk(64,64),x=k.getContext('2d'),q=x.createRadialGradient(32,32,0,32,32,32);q.addColorStop(0,`rgba(${c},1)`);q.addColorStop(.35,`rgba(${c},.4)`);q.addColorStop(1,`rgba(${c},0)`);x.fillStyle=q;x.fillRect(0,0,64,64);return k};
const SP={w:spr('255,248,235'),k:spr('16,13,12'),y:spr('255,200,110'),o:spr('255,120,35'),r:spr('220,50,15'),b:spr('150,180,255'),
 g:spr('70,255,120'),c:spr('205,228,255'),l:spr('175,150,255'),s:spr('214,219,232')};   /* g: TEB green flash, c: hydrogen-flame cyan white, l: lavender, s: steam */
const blob=(s,x,y,w,h,a)=>{g.globalAlpha=Math.min(1,a);g.drawImage(s,x-w/2,y-h/2,w,h)};
const ST=Array.from({length:110},()=>[Math.random(),Math.random()*.72,Math.random()]);
/* ---------- machines: everything that differs between engines lives here ----------
   ab: has an afterburner zone (lever detent at MIL); stall: can surge; idle: spool target at lever 0; up/dn: spool time constants;
   coast: spin-down tau with fuel off; cN/cT: starter speed and duration; e/f: EGT and fuel-flow curves; teb: green light-off flash */
const MC=[{
 n:'AFTERBURNER',btn:'F-TYPE',sub:'Afterburning turbofan. Push through the detent.',hint:'Drag the lever up. Push through the detent.',
 nxf:.34,ab:1,stall:1,idle:.28,up:1.1,dn:.8,coast:3.2,cN:.13,cT:2.4,tk:[1.5,.09],ign:1,lk:.4,e0f:480,lt:.8,teb:0,
 e:[40,620,90],f:[.35,7.1,2.2,36],off:'FUEL OFF',st:'STARTING',cl:'COASTING',cut:'Fuel cut. Rotor coasting down...',wait:'Let the rotor spool down before restarting.',
 r:()=>(30+18*A)*u,shk:()=>N*N*1.2+A*4+kick*12,
 gl:()=>[A*.3+N*N*.06*fu+ign*.2,160+A*700+N*120],skyG:()=>A*.4+N*N*.05*fu+ign*.1,
 hzk:()=>A+N*N*.28*fu+hg*hg*.12,hzg:()=>[62+A*46,300+A*900],hza:()=>.8+A*4.2+N*1.4,blk:()=>A*.3+N*N*.05*fu+kick*.3+ign*.15,
 g:[{t:'N1',cap:'N1 SPEED %',min:0,max:110,maj:20,mn:10,red:102,d:1,f:v=>v|0},
    {t:'EGT',cap:'EGT °C x100',min:0,max:900,maj:200,mn:100,red:760,d:100,f:v=>v|0},
    {t:'FF',cap:'FUEL klb/h',min:0,max:50,maj:10,mn:5,red:46,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[N*100,E,F],
 lv:[['MAX',1,'t'],['AFTERBURNER',.85],['MIL',.7],['IDLE',0,'b']],
 lp:()=>[['A/B',A>.05,'#ff8a2a'],['EGT HI',E>720&&(simT*6%1<.6),'#e0392b']],
 mc:[[0,'#1a1e26'],[.35,'#4a5160'],[.5,'#6a7282'],[.65,'#3a404c'],[1,'#12151b']],dk:1,bl:0,
 bd:{ts:120,xt:64,hh:64,fh:78,doors:0},
 pl:{dl:[70,140],dp:[SP.b,SP.b,SP.o,SP.r],al:[240,1000],ap:[SP.y,SP.y,SP.o,SP.r],sn:64,ak:1,cp:[SP.w,SP.y,SP.y,SP.o],dn:[3,2,5],ds:[34,38,8],dc:[SP.y,SP.b]},
 spike:0,draw:(r,dt)=>{plume(r,dt);body(r)},rear:rear,au:auF,
 sqc:'STARTER SPIN-UP',
 sq:[{cap:'IDLE',wait:1.6},
  {cap:'SPOOLING UP',lever:.74,dur:3.6},
  {cap:'MIL POWER',until:()=>N>.9,wait:.6,max:6},
  {cap:'PUSH THROUGH THE DETENT',lever:1,dur:1.6,view:1,slow:.35},
  {cap:'AFTERBURNER LIGHT',until:()=>lit,wait:1.3,max:6},
  {cap:'FULL AFTERBURNER',slow:1,wait:3.2,view:2},
  {cap:'FULL AFTERBURNER',wait:2.4,view:0},
  {cap:'THROTTLE BACK',lever:.45,dur:1.6},
  {cap:'FUEL CUT',do:()=>master(),wait:3.4}],
 info:{f:['A generic afterburning turbofan. It is not modelled on one specific engine.',
  'The lever detent is MIL (military power), the most thrust the engine makes dry. Past it, fuel is sprayed into the hot exhaust behind the turbine and burns again: the afterburner. It adds a lot of thrust for a very large jump in fuel flow.',
  'Shock diamonds appear when exhaust leaves the nozzle at a different pressure from the air around it, setting up a repeating pattern of shock waves.',
  'The nozzle petals open as the afterburner lights, to pass the extra flow. Fighter nozzles also open a little at idle and close toward MIL.',
  'A compressor stall is a breakdown of airflow through the compressor. Moving the throttle too fast from low power can trigger one: loud bangs, flames from the tailpipe and a jump in exhaust temperature. Pull the lever back to recover. The FAULTS button turns this off.'],
  a:['The gauge scales, spool times and temperatures are plausible but illustrative. They do not come from any engine manual.','The 3D engine and test stand are simplified, hand-built models, not CAD data.','The sound is synthesized, not recorded.'],s:[]}
},{
 n:'SR-71',btn:'SR-71 J58',sub:'Blackbird turbojet. Watch the inlet spike and the green flash.',hint:'Drag the lever up. It also sets the simulated Mach.',
 nxf:.34,ab:1,stall:1,idle:.53,up:1.7,dn:1.2,coast:4.6,cN:.43,cT:3.4,tk:[2,.1],ign:1.1,lk:.5,e0f:500,lt:.9,teb:1,
 e:[40,600,110],f:[.5,6,2.2,20],off:'FUEL OFF',st:'CART START',cl:'COASTING',cut:'Fuel cut. Rotor coasting down...',wait:'Let the rotor spool down before restarting.',
 r:()=>(34+20*A)*u,shk:()=>N*N*1.3+A*4.4+kick*12,
 gl:()=>[A*.32+N*N*.06*fu+ign*.2+gn*.1,200+A*800+N*120],skyG:()=>A*.42+N*N*.05*fu+ign*.1+gn*.05,
 hzk:()=>A+N*N*.3*fu+hg*hg*.14,hzg:()=>[66+A*52,340+A*1250],hza:()=>.9+A*4.6+N*1.5,blk:()=>A*.2+N*N*.05*fu+kick*.3+ign*.15+gn*.15,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:104,d:1,f:v=>v|0},
    {t:'EGT',cap:'EGT °C x100',min:0,max:900,maj:200,mn:100,red:780,d:100,f:v=>v|0},
    {t:'FF',cap:'FUEL klb/h',min:0,max:40,maj:10,mn:5,red:32,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[N*100,E,F],
 lv:[['MAX',1,'t'],['AFTERBURNER',.85],['MIL',.7],['IDLE',0,'b']],
 lp:()=>[['A/B',A>.05,'#ff8a2a'],['EGT HI',E>740&&(simT*6%1<.6),'#e0392b']],
 mc:[[0,'#0c0f16'],[.3,'#232b3a'],[.5,'#3a4558'],[.68,'#1d2431'],[1,'#080a10']],dk:.62,bl:14,
 bd:{ts:210,xt:110,hh:62,fh:78,doors:1},
 pl:{dl:[90,170],dp:[SP.b,SP.b,SP.o,SP.r],al:[320,1300],ap:[SP.c,SP.b,SP.y,SP.o,SP.r],sn:84,ak:.42,cp:[SP.c,SP.y,SP.y,SP.o],dn:[5,3,8],ds:[30,34,8],dc:[SP.b,SP.b]},
 spike:1,draw:(r,dt)=>{plume(r,dt);body(r)},rear:rear,au:auSR,
 sqc:'START CART SPINNING UP',
 sq:[{cap:'IDLE  ABOUT 3,950 RPM',wait:2},
  {cap:'ACCELERATING',lever:.74,dur:5},
  {cap:'MIL POWER',until:()=>N>.9&&mach>1.1,wait:.5,max:10},
  {cap:'PUSH THROUGH THE DETENT',lever:1,dur:2.2,view:1,slow:.35},
  {cap:'TEB LIGHT',until:()=>lit,wait:1.4,max:6},
  {cap:'FULL AFTERBURNER',slow:1,wait:1.5,view:0},
  {cap:'SPIKE SLIDING AFT',until:()=>mach>2.8,wait:2,max:14},
  {cap:'MACH 3',wait:2.5,view:2},
  {cap:'THROTTLE BACK',lever:.45,dur:2.2,view:0},
  {cap:'FUEL CUT',do:()=>master(),wait:3.6}],
 info:{f:['The J58 is the Pratt & Whitney engine that powered the SR-71. It burns JP-7, a fuel with a very high flash point. At cruise the aircraft burns about 8,000 gallons an hour.',
  'Inlet spike: a cone in each inlet slides aft as the aircraft speeds up, by up to 26 inches. It is fully aft at Mach 3 and above. Watch the inset.',
  'Blow-in doors around the nozzle feed extra air into the ejector at low speed, below about Mach 1.2. Above that they are shut.',
  'Starting: two Buick V8 engines on a ground cart (the AG330) spin the engine. They disengage at about 3,200 rpm. Idle is about 3,950 rpm and the maximum is 7,400 rpm.',
  'Ignition: triethylborane (TEB) ignites on contact with air. It lights the engine and the afterburner, and the start gives a green flash.'],
  a:['The lever also sets a simulated Mach number: 0 at idle, 1.2 at MIL, 3.2 at full afterburner. Real Mach comes from thrust against drag, not from a lever. It exists so the spike and doors have something to follow.',
  'The RPM dial is a percentage of 7,400 rpm, so idle reads about 53. I could not find sourced EGT limits, so the EGT scale and its warning lamp are illustrative.',
  'Fuel flow is scaled so full afterburner is about 26,000 lb/h per engine. That comes from the 8,000 gal/h cruise figure, assuming it covers both engines and about 6.5 lb per gallon. The dry figure is a guess.',
  'The nacelle, nozzle and ejector flaps are simplified hand-built models, and the sound is synthesized.',
  'The ground cart and cradles are a generic test setup; real ground runs were usually done with the engine in the aircraft.'],
  s:[['SR-71 Propulsion System (Aircraft Engine Historical Society)','https://enginehistory.org/Convention/2013/SR-71Propul/SR-71Propul.shtml'],
   ['The J58 Start Cart (Aircraft Engine Historical Society)','https://www.enginehistory.org/Convention/2015/J58Starting/J58Starting.shtml'],
   ['Pratt & Whitney J58 (Wikipedia)','https://en.wikipedia.org/wiki/Pratt_%26_Whitney_J58']]}
},{
 n:'RS-25',btn:'SHUTTLE',sub:'Space Shuttle main engine. Hydrogen and oxygen, no afterburner.',hint:'Drag the lever up. 100% is rated power, 109% is full.',
 nxf:.46,ab:0,stall:0,idle:.615,up:.8,dn:.35,coast:.35,cN:.03,cT:3.4,tk:[.9,.38],ign:1.2,lk:.6,e0f:60,lt:1.2,teb:0,
 e:[20,60,0],f:[0,1134,1,0],off:'CUTOFF',st:'PRIMING',cl:'SHUTDOWN',cut:'Engine cutoff.',wait:'Wait for shutdown to finish.',
 r:()=>74*u,shk:()=>N*N*2.4*fu+kick*10,
 gl:()=>[N*N*.15*fu+ign*.2,200+N*520],skyG:()=>N*N*.3*fu+ign*.15,
 hzk:()=>N*N*.85*fu,hzg:()=>[105,260+N*N*700*fu],hza:()=>1+N*3.4*fu,blk:()=>N*N*.22*fu+kick*.3+ign*.2,
 g:[{t:'THR',cap:'THRUST %',min:0,max:120,maj:20,mn:10,red:109.5,d:1,f:v=>v|0},
    {t:'Pc',cap:'Pc psia x100',min:0,max:35,maj:10,mn:5,red:30,d:1,f:v=>(v*100)|0},
    {t:'FLOW',cap:'lb/s x100',min:0,max:1200,maj:200,mn:100,red:1150,d:100,f:v=>v|0}],
 gv:()=>[N*109,N*29.94*fu,F],   /* 2,994 psia is the published figure at 109%; other levels scaled with thrust */
 lv:[['109% FPL',1,'t'],['104.5%',.89],['100% RATED',.78],['67% MIN',0,'b']],
 lp:()=>[['RATED',N>=.915&&fu>.9,'#3fcf7a'],['FPL',N>.995,'#e0392b']],
 mc:[[0,'#1a1e26'],[.35,'#4a5160'],[.5,'#6a7282'],[.65,'#3a404c'],[1,'#12151b']],dk:1,bl:0,
 bd:{ts:250,xt:0,hh:20,fh:74,doors:0},pl:null,
 spike:0,draw:drawSS,rear:rearSS,au:auSS,
 sqc:'BURN-OFF IGNITERS, THEN ENGINE START',
 sq:[{cap:'MAINSTAGE  67%',slow:.4,wait:1.3},
  {cap:'THROTTLE UP  100% RATED',slow:1,lever:.78,dur:2},
  {cap:'104.5%',lever:.89,dur:1.3,wait:.5},
  {cap:'FULL POWER LEVEL  109%',lever:1,dur:1.4,view:1},
  {cap:'109%',wait:3.2,view:2},
  {cap:'109%',wait:2.2,view:0},
  {cap:'THROTTLE DOWN  67%',lever:0,dur:2.4},
  {cap:'ENGINE CUTOFF',do:()=>master(),wait:3}],
 info:{f:['The RS-25 is the Space Shuttle main engine. It burns liquid hydrogen with liquid oxygen, at about 6 to 1 by mass.',
  'Throttle range is 67% to 109% of rated power in 1% steps (some NASA documents give 65% as the floor). 100% is rated power, about 470,000 lbf in vacuum. 104.5% is the normal power level and 109% is full power level.',
  'Published figures: chamber pressure 2,994 psia at 109%, and a total propellant flow of about 1,134 lb/s.',
  'Start: the start command comes 6.6 seconds before liftoff, and all three engines must reach 90% of rated thrust by T-3 seconds or the launch is aborted on the pad. The chamber spark igniters switch off after about 3 seconds.',
  'Hydrogen burn-off igniters fire at T-10 seconds, 3.4 seconds before engine start, showering zirconium sparks to burn off stray hydrogen. They are the sparklers during the start here.',
  'Each engine gimbals up to ±10.5° in pitch and yaw to steer the vehicle.',
  'Hydrogen and oxygen burn to water, so the flame is pale and nearly transparent and the plume is mostly steam.'],
  a:['I only found the chamber pressure for 109%. At other power levels the dial scales it in proportion to thrust.',
  'The toy swings the gimbal only a few degrees so you can see it. The real range is ±10.5°.',
  'The engine runs on its own at sea level. Lever zero is the 67% minimum, and the thrust build-up after ignition is a guess.',
  'The engine and test stand are simplified hand-built models. The stand is styled after the vertical stands at NASA Stennis, where RS-25s fire down into a flame deflector, but it is not a copy of any one stand.',
  'The sound is synthesized.'],
  s:[['RS-25 (Wikipedia)','https://en.wikipedia.org/wiki/RS-25'],
   ['RS-25 engine (L3Harris)','https://l3harris.com/all-capabilities/rs-25-engine'],
   ['Space Shuttle main propulsion system (GlobalSecurity)','https://www.globalsecurity.org/space/library/report/1988/sts-mps.html'],
   ['Heritage hardware: the hydrogen burn-off system (NASASpaceflight)','https://www.nasaspaceflight.com/2015/06/heritage-hardware-hydrogen-burn-off-system-sls/']]}
},{
 n:'HALL THRUSTER',btn:'HALL',need3d:1,space:1,warp:1,orbit:1,inset:1,sub:'Solar-electric Hall thruster in Earth orbit. Quiet, faint, relentless.',hint:'Drag the lever for more power, then try TIME WARP.',
 nxf:.4,ab:0,stall:0,idle:.2,up:.7,dn:.4,coast:.12,cN:0,cT:4.2,tk:[1.2,.6],ign:.9,lk:.08,e0f:30,lt:.22,teb:0,
 e:[20,320,0],f:[0,0,1,0],off:'OFF',st:'HEATER',cl:'PLASMA OFF',cut:'Discharge off.',wait:'Wait a moment before restarting.',
 r:()=>0,shk:()=>kick*2,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'THR',cap:'THRUST mN',min:0,max:300,maj:50,mn:25,red:260,d:1,f:v=>v|0},
    {t:'PWR',cap:'POWER kW',min:0,max:5,maj:1,mn:.5,red:4.6,d:1,f:v=>v.toFixed(2)},
    {t:'Xe',cap:'XENON mg/s',min:0,max:16,maj:4,mn:2,red:15,d:1,f:v=>v.toFixed(1)}],
 gv:()=>{const th=htT();return[th*1000,ph==1?.22+.03*Math.sin(simT*3):4.5*N*fu,th/((1300+500*N)*9.80665)*1e6]},
 lv:[['4.5 kW',1,'t'],['2.7 kW',.5],['0.9 kW',0,'b']],
 lp:()=>[['DISCHARGE',ph==2&&fu>.5,'#5aa0ff'],['MAX PWR',N>.98,'#e0392b']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,
 spike:0,draw:()=>{},rear:()=>{},au:auHT,
 sqc:'CATHODE HEATER, XENON FLOW, IGNITION',
 sq:[{cap:'DISCHARGE LIT  0.9 kW',wait:1.6},
  {cap:'THROTTLE UP  4.5 kW',lever:1,dur:3},
  {cap:'240 mN: ABOUT THREE QUARTERS IN YOUR HAND',wait:3,view:2},
  {cap:'TIME WARP  x100,000',do:()=>{sl=2;lab()},wait:4.5,view:0},
  {cap:'ORBIT CLIMBING',wait:3.5,view:3},
  {cap:'BACK TO REAL TIME',do:()=>{sl=0;lab()},wait:1.5},
  {cap:'THRUSTER OFF',do:()=>master(),wait:3}],
 info:{f:['A Hall thruster turns electricity into thrust. Xenon gas enters a ring-shaped ceramic channel; a strong radial magnetic field traps electrons, which swirl round the ring as the Hall current. They ionise the incoming xenon, and the electric field across the channel flings the heavy ions out at high speed.',
  'The ions leave many times faster than a chemical rocket\'s exhaust, so the thruster needs far less propellant. NASA estimates its Psyche mission would need about 15 times as much propellant with chemical thrusters.',
  'This one is modelled on the SPT-140 class flown on Psyche: 0.9 to 4.5 kW of power and a specific impulse of about 1,800 s.',
  'NASA gives up to 240 mN of thrust for Psyche\'s thrusters, "about the same amount of pressure you\'d feel holding three quarters in your hand." It is tiny, but it can run for months.',
  'Psyche carries four Hall thrusters and fires one at a time. It launched with up to 1,085 kg of xenon at a launch mass of up to 2,747 kg, and its solar arrays gave 21 kW near Earth.',
  'Ionised xenon glows blue, which is why the beam looks the way it does.',
  'To raise its orbit the craft fires along its direction of travel: the beam streams out behind and the craft is pushed forward, so it speeds up and its orbit grows. That is why Earth slides away beneath in the same direction as the beam. The EARTH view looks back down at the planet as the orbit climbs.'],
  a:['The 240 mN maximum is NASA\'s figure for Psyche. Thrust, power and xenon flow in between are interpolated, and the specific impulse is assumed to fall at low power.',
  'The orbit panel is a what-if: this spacecraft raising its orbit from 400 km with one thruster at full power, ignoring drag and eclipses. Psyche itself left Earth on its rocket.',
  'Real cathode start-up takes much longer than the few seconds here.',
  'There is no sound in a vacuum. The faint hum is a stand-in for the power electronics.',
  'The spacecraft is a generic solar-electric design inspired by Psyche, not a model of it, and the Earth is procedural.'],
  s:[['SPT-140 (Wikipedia)','https://en.wikipedia.org/wiki/SPT-140'],
   ['Solar electric propulsion makes NASA\'s Psyche spacecraft go (JPL)','https://www.jpl.nasa.gov/news/solar-electric-propulsion-makes-nasas-psyche-spacecraft-go/'],
   ['Psyche quick facts (JPL press kit)','https://jpl.nasa.gov/press-kits/psyche/quick-facts'],
   ['The Hall effect and rocket flight (Physics Today)','https://physicstoday.aip.org/quick-study/the-hall-effect-and-rocket-flight']]}
},{
 n:'SATURN V F-1',btn:'SATURN V',need3d:1,clu:dt=>sicStep(dt),sub:'Five F-1 engines at the base of an S-IC first stage, on a static test stand.',hint:'Drag the lever up: the engines light in the real centre, pair, pair order.',
 nxf:.4,ab:0,stall:0,idle:0,up:.6,dn:.3,coast:.5,cN:0,cT:3.6,tk:[1.2,.45],ign:1.3,lk:.8,e0f:60,lt:1.4,teb:0,
 e:[20,260,0],f:[0,0,1,0],off:'CUTOFF',st:'START',cl:'SHUTDOWN',cut:'Engine cutoff.',wait:'Wait for shutdown to finish.',
 r:()=>0,shk:()=>N*N*3.2*fu+kick*10,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'THR',cap:'THRUST MN',min:0,max:40,maj:10,mn:5,red:36,d:1,f:v=>v.toFixed(1)},
    {t:'LOX',cap:'LOX t/s',min:0,max:10,maj:2,mn:1,red:9.4,d:1,f:v=>v.toFixed(2)},
    {t:'RP-1',cap:'RP-1 t/s',min:0,max:5,maj:1,mn:.5,red:4.6,d:1,f:v=>v.toFixed(2)}],
 gv:()=>{const n=sicE.reduce((a,b)=>a+b,0);return[n*6.77,n*1.789,n*.788]},
 lv:[['ALL FIVE',1,'t'],['THREE',.5],['CENTRE',0,'b']],
 lp:()=>{const n=sicE.reduce((a,b)=>a+b,0);return[['3 LIT',n>2.5,'#3fcf7a'],['5 LIT',n>4.5,'#e0392b']]},
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auF1,
 sqc:'TURBOPUMP SPIN-UP, IGNITION',
 sq:[{cap:'CENTRE ENGINE',wait:1.6},
  {cap:'DIAGONAL PAIR',lever:.5,dur:.25,wait:1.6},
  {cap:'OUTER PAIR: ALL FIVE',lever:1,dur:.25,wait:2,view:2},
  {cap:'ABOUT 7.6 MILLION LBF',wait:3.2,view:0},
  {cap:'ABOUT 7.6 MILLION LBF',wait:2.4,view:1},
  {cap:'CUTOFF',do:()=>master(),wait:3.5,view:0}],
 info:{f:['The F-1 launched the Saturn V. Five of them sat in a quincunx at the base of the S-IC first stage, burning RP-1 kerosene with liquid oxygen.',
  'Each made about 6,770 kN (1,522,000 lbf) of thrust at sea level, at a chamber pressure of about 70 bar.',
  'One engine swallowed about 1,789 kg of liquid oxygen and 788 kg of RP-1 every second, fed by a turbopump of about 55,000 horsepower.',
  'The turbine exhaust was piped into the nozzle extension through a large tapered manifold, where the relatively cool gas formed a protective film against the roughly 3,200 °C exhaust.',
  'The centre engine was fixed and the four outer engines gimballed to steer. They started in a 1-2-2 sequence, centre engine, then one diagonal pair, then the other, 300 milliseconds apart, to ease the loads on the thrust structure.',
  'The stage burned for about 150 seconds.'],
  a:['The F-1 could not be throttled. The lever here only chooses how many engines are lit, in the real start order. In a real start the three steps were 300 ms apart, not as long as you like.',
  'Total thrust is five times the single-engine figure; the S-IC is quoted at up to 34,500 kN.',
  'The stand is a generic vertical test stand in the spirit of the S-IC static test stands, and the stage, engines and plume are simplified hand-built models.',
  'The sound is synthesized.'],
  cut:'CUTAWAY removes half of one outer engine. Pale blue dots are liquid oxygen, amber is RP-1 kerosene, grey is turbine exhaust piped into the manifold and down the inside wall of the nozzle extension, and orange is the burning gas. Speeds are slowed enormously so you can follow them.',
  s:[['Rocketdyne F-1 (Wikipedia)','https://en.wikipedia.org/wiki/Rocketdyne_F-1'],['S-IC (Wikipedia)','https://en.wikipedia.org/wiki/S-IC']]}
},{
 n:'HARRIER',btn:'HARRIER',need3d:1,hover:1,nozzle:1,inset:1,sub:'Pegasus vectored-thrust jump jet on a hover pad.',hint:'Throttle up to lift off. The second lever swivels the nozzles.',
 nxf:.4,ab:0,stall:0,idle:.27,up:1.2,dn:.9,coast:3,cN:.2,cT:3.2,tk:[1.6,.08],ign:.8,lk:.3,e0f:420,lt:.7,teb:0,
 e:[40,600,0],f:[.3,9,2,0],off:'FUEL OFF',st:'STARTING',cl:'RUNDOWN',cut:'Fuel off. Engine running down...',wait:'Let it run down before restarting.',
 r:()=>0,shk:()=>N*N*1.2+kick*10,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:104,d:1,f:v=>v|0},
    {t:'JPT',cap:'JPT °C x100',min:0,max:800,maj:200,mn:100,red:700,d:100,f:v=>v|0},
    {t:'NOZ',cap:'NOZZLE °',min:0,max:100,maj:20,mn:10,red:98.5,d:1,f:v=>v.toFixed(0)}],
 gv:()=>[N*100,E,nz],
 lv:[['MAX',1,'t'],['HOVER',.9],['IDLE',0,'b']],lv2:[['BRAKE 98.5°',1,'t'],['HOVER 90°',.914],['45°',.457],['AFT 0°',0,'b']],
 lp:()=>[['AIRBORNE',alt>.05,'#3fcf7a'],['JPT',E>620&&(simT*6%1<.6),'#e0392b']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auHR,
 sqc:'ENGINE START',
 sq:[{cap:'NOZZLES TO THE HOVER STOP',do:()=>{raw2=.914},wait:1.2},
  {cap:'FULL THROTTLE',lever:1,dur:2.5},
  {cap:'LIFT-OFF',until:()=>alt>.4,max:6},
  {cap:'CLIMBING',until:()=>alt>9,max:9,view:1},
  {cap:'HOVER',lever:()=>hovL(),dur:1.5,wait:2.5,view:0},
  {cap:'NOZZLES TO THE BRAKING STOP  98.5°',do:()=>{raw2=1},wait:2,view:2},
  {cap:'NOZZLES BACK TO 90°',do:()=>{raw2=.914},wait:1},
  {cap:'DESCENDING',lever:()=>hovL()-.08,dur:1,until:()=>alt<=0,max:14,view:0},
  {cap:'TOUCHDOWN',lever:0,dur:1.5,wait:1},
  {cap:'FUEL OFF',do:()=>master(),wait:3}],
 info:{f:['The Harrier takes off vertically by pointing its engine thrust at the ground. Its Rolls-Royce Pegasus turbofan has four swivelling nozzles that rotate together through 98.5 degrees, from straight back to slightly forward of straight down.',
  'The two front nozzles blow cooler air from the low-pressure compressor; the two rear nozzles carry the hot core exhaust at about 650 °C. Roughly 60% of the flow leaves through the front pair.',
  'The Pegasus 11-61 is rated at 23,800 lbf (106 kN). Its two spools turn in opposite directions, which greatly reduces gyroscopic effects at low speed.',
  'In the cockpit the nozzle lever sits beside the throttle, which is why this machine has two levers.',
  'For the AV-8B, a sea-level vertical take-off in standard conditions is quoted at up to 9,342 kg with the Pegasus 11-61, against an operating empty weight of about 6,336 kg.',
  'Water injection let the engine run faster and hotter for a short lift: up to about 227 kg of water, for at most about 90 seconds.'],
  a:['The jet weighs a fixed 8,000 kg here, and installed lift is taken as 87% of the rated thrust, so that a full-power vertical take-off near the published maximum weight would just work. The thrust curve against RPM is a guess.',
  'Only vertical motion is simulated. With the nozzles aft a real Harrier would accelerate forward; here it stays put, and the hover is artificially stable. Real hovering takes constant work from the pilot.',
  'The aircraft is a simplified hand-built model in the style of a Harrier, not an exact AV-8B or GR.7.',
  'Ground effects such as suck-down and hot-gas reingestion are not modelled, and the sound is synthesized.'],
  cut:'CUTAWAY opens the fuselage over the Pegasus. Blue dots are cool fan air heading for the front nozzles; the inner stream is compressed, burned and leaves hot through the rear nozzles. Speeds are slowed enormously so you can follow them.',
  s:[['Rolls-Royce Pegasus (Wikipedia)','https://en.wikipedia.org/wiki/Rolls-Royce_Pegasus'],['AV-8 Harrier (FAS)','https://man.fas.org/dod-101/sys/ac/av-8.htm']]}
},{
 n:'NK-12 TURBOPROP',btn:'NK-12',need3d:1,clu:dt=>tpStep(dt),inset:1,insetF:propInset,sub:'Kuznetsov NK-12 turboprop with contra-rotating propellers, on an outdoor test stand.',hint:'Throttle up: the RPM holds steady while the blades bite harder.',
 nxf:.4,ab:0,stall:0,idle:.08,up:1.4,dn:1.1,coast:2.2,cN:.25,cT:4,tk:[1.4,.12],ign:.6,lk:.2,e0f:380,lt:.5,teb:0,
 e:[300,250,0],f:[.5,6,1.3,0],off:'FUEL OFF',st:'STARTING',cl:'RUNDOWN',cut:'Fuel off. The propellers feather and stop...',wait:'Let the propellers stop before restarting.',
 r:()=>0,shk:()=>prp*.35+N*N*.9+kick*8,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:105,d:1,f:v=>v|0},
    {t:'PWR',cap:'POWER MW',min:0,max:12,maj:2,mn:1,red:11.03,d:1,f:v=>v.toFixed(1)},
    {t:'BLADE',cap:'BLADE ANGLE \u00b0',min:0,max:90,maj:15,mn:5,red:90,d:1,f:v=>v.toFixed(0)}],
 gv:()=>[prp*100,tpP()/1e6,beta],
 lv:[['MAX',1,'t'],['HALF',.5],['GROUND IDLE',0,'b']],
 lp:()=>[['FEATHER',beta>80,'#d9822b'],['CONST RPM',ph==2&&prp>.97,'#3fcf7a']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auTP,
 sqc:'ENGINE START',
 sq:[{cap:'GROUND IDLE: BLADES AT FINE PITCH',wait:2.5},
  {cap:'POWER UP: THE GOVERNOR CATCHES THE RPM',lever:.35,dur:2,wait:1.5,view:1},
  {cap:'MORE POWER: SAME RPM, COARSER BLADES',lever:1,dur:4,wait:2.5,view:0},
  {cap:'ABOUT 11 MW INTO THE PROPELLERS',wait:3,view:2},
  {cap:'BACK TO GROUND IDLE',lever:0,dur:2.5,wait:1.5,view:0},
  {cap:'FUEL OFF: THE BLADES FEATHER',do:()=>master(),wait:4.5,view:1}],
 info:{f:['The Kuznetsov NK-12 is the most powerful turboprop engine to enter service. Four of them power the Tupolev Tu-95 "Bear".',
  'A turboprop is a gas turbine that spends almost all of its energy turning a propeller instead of making a jet. The NK-12 drives two large four-bladed propellers that turn in opposite directions on the same axis.',
  'A 14-stage axial compressor feeds cannular combustors, and a five-stage turbine drives both the compressor and the propellers.',
  'Maximum power is quoted at 11,000 kW (14,750 shp) plus only 2.78 kN of residual jet thrust, at 9,250 rpm. The NK-12MV is rated at 14,795 hp (11,033 kW). Nearly all the push comes from the propellers.',
  'The Tu-95 has constant-speed, fully feathering propellers. A governor holds the rpm by changing the blade angle, so more power makes the blades take a bigger bite instead of spinning faster. When the engine stops, the blades turn edge-on to the air (feather) so they do not windmill.',
  'The Tu-95 is one of the loudest military aircraft, particularly because the tips of its propeller blades are supersonic.',
  'The engine is about 6 m long and 1.15 m across, weighs about 2,900 kg dry and burns about 0.219 kg of fuel per kWh.'],
  a:['The rpm schedule, blade angles and power curve against the lever are illustrative, not NK-12 data.',
  'Static thrust (the PROPS figure) is an estimate from simple momentum theory with an assumed figure of merit of 0.6, not a published number.',
  'The propellers are drawn turning far slower than real so they do not strobe on screen. The blur disc is a visual aid.',
  'Sources disagree on the propeller diameter (5.6 m or 6.2 m); 5.6 m is used. The engine, nacelle and stand are simplified hand-built models.',
  'The sound is synthesized, including the beat between the two propellers.'],
  cut:'CUTAWAY removes half of the cowling. Inner dots trace the engine\'s own air: blue intake air is squeezed by the compressor (white), burned (orange) and expanded through the turbine, which drives the propellers through a reduction gearbox. The outer band shows the far larger stream of air the propellers push back. Speeds are slowed enormously.',
  s:[['Kuznetsov NK-12 (Wikipedia)','https://en.wikipedia.org/wiki/Kuznetsov_NK-12'],['Tupolev Tu-95 (Wikipedia)','https://en.wikipedia.org/wiki/Tupolev_Tu-95']]}
},{
 n:'MARS SKY CRANE',btn:'SKY CRANE',need3d:1,sky:1,nozzle:1,inset:1,insetF:craneInset,clu:dt=>skyStep(dt),camA:v=>skyCam(v),sub:'Mars 2020 descent stage lowering the Perseverance rover on bridles, Jezero Crater.',hint:'HOVER to stop falling, BRIDLES to lower the rover.',
 nxf:.4,ab:0,stall:0,idle:0,up:.3,dn:.3,coast:.4,cN:0,cT:1.5,tk:[9,1],ign:.35,lk:.1,e0f:60,lt:.3,teb:0,
 e:[20,200,0],f:[0,1,1,0],off:'ENGINES OFF',st:'PRIMING',cl:'SHUTDOWN',cut:'Engines off!',wait:'Wait for the engines to stop.',
 r:()=>0,shk:()=>N*.5*(sc.done?0:1)+kick*8,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'THR',cap:'THRUST %',min:0,max:100,maj:20,mn:10,red:100,d:1,f:v=>v|0},
    {t:'ALT',cap:'ROVER m',min:0,max:40,maj:10,mn:5,red:40,d:1,f:v=>v.toFixed(1)},
    {t:'BRDL',cap:'BRIDLES m',min:0,max:7,maj:1,mn:.5,red:6.4,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[Math.max(...sc.thr)/MLE*100,Math.max(0,skyRy()),sc.bl],
 lv:[['MAX',1,'t'],['HOVER + ROVER',.343],['HOVER, EMPTY',.172],['MIN',0,'b']],lv2:[['6.4 m OUT',1,'t'],['STOWED',0,'b']],
 lp:()=>[[sc.act==4?'4 LIT':'8 LIT',ph==2&&!sc.done,'#3fcf7a'],[sc.cut?'CUT':'TOUCHDOWN',!!sc.td,sc.cut?'#ff9a3a':'#3fcf7a']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auSC,
 sqc:'ENGINES PRIMED',
 sq:[{cap:'POWERED DESCENT, 8 ENGINES',do:()=>{sc.vzT=-2.5},until:()=>alt<21.5,max:12},
  {cap:'SLOWING TO 0.75 m/s',do:()=>{sc.vzT=-.75},until:()=>alt<20.2,max:6},
  {cap:'SKY CRANE: LOWERING THE ROVER',do:()=>{raw2=1},until:()=>sc.bl>6.35,max:12,view:1},
  {cap:'BRIDLES OUT 6.4 m, DESCENDING AT 0.75 m/s',until:()=>sc.td,max:20,view:0},
  {cap:'TOUCHDOWN: THE WHEELS SENSE THE GROUND',until:()=>sc.cut,max:4,view:2},
  {cap:'BRIDLES CUT: FLYAWAY',until:()=>sc.done,max:12,view:2},
  {cap:'PERSEVERANCE IS ON MARS',wait:2.5,view:1}],
 info:{f:['Perseverance landed in Jezero Crater on Mars on 18 February 2021. For its last seconds of flight it hung beneath a rocket-powered descent stage: the sky crane.',
  'The descent stage uses the design that landed Curiosity in 2012: eight throttleable Mars Landing Engines burning hydrazine, each adjustable from 400 N to 3,060 N. Early in powered descent all eight fire; later four drop to a near-shutdown level of about 1% flow and serve as backups. Curiosity\'s stage carried 390 kg of hydrazine in four tanks.',
  'About 12 seconds before touchdown, roughly 20 m up, the stage had slowed to its final descent speed of about 0.75 m/s (1.7 mph) and began lowering the rover on cables about 6.4 m (21 ft) long.',
  'When the rover sensed its wheels on the ground it cut the cables, and the descent stage flew off to crash a safe distance away.',
  'Mars gravity is about 38% of Earth\'s, so the 1,025 kg rover weighs on Mars what about 390 kg would on Earth. Hover thrust is correspondingly small, and cutting the rover loose suddenly leaves the stage with far more thrust than weight.',
  'The Martian daytime sky is a dusty butterscotch, but around the setting Sun it turns blue: dust in the atmosphere sends blue light forward toward the viewer more efficiently than red.'],
  a:['Only the final sky-crane phase is simulated, starting about 32 m up. Entry, parachute and most of powered descent are not.',
  'The descent stage mass here (1,100 kg) and the 20\u00b0 engine cant are assumptions; no source was found for either. Fuel use is ignored.',
  'The lever sets total thrust; the real stage is flown entirely by its guidance computer. A little artificial damping makes hand-flying manageable, and SEQUENCE flies it with a simple speed-hold loop.',
  'Here the switch to four engines happens when you start lowering the rover and the bridles pay out at up to 1 m/s; the real timings differ, so this descent takes a few seconds longer than the real 12.',
  'The flyaway is simplified. The stage, rover, terrain and crater rim are hand-built approximations, and the dust is simple particles.',
  'Mars\'s thin carbon-dioxide air would make the engines sound far fainter than this; the sound is synthesized.'],
  cut:['CUTAWAY lifts the thermal blankets off the descent stage. Blue dots trace hydrazine from the tanks to the engines, where a catalyst decomposes it into hot gas (pale violet) with no ignition needed. Speeds are slowed enormously.','SCHLIEREN is drawn from the toy\'s exhaust model. Mars\'s air is less than 1% as dense as Earth\'s, so a real schlieren image would be far fainter.','THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative; the warm box at the rover\'s tail is its nuclear power source.'],
  s:[['Perseverance Touches Down on Mars (NASA)','https://science.nasa.gov/photojournal/perseverance-touches-down-on-mars-illustration/'],['Mars 2020 landing quick facts (NASA JPL)','https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts'],['MSL descent stage (Spaceflight101)','https://spaceflight101.com/msl/?p=311'],['The Sun Sets on Mars (NASA)','https://science.nasa.gov/?p=926395'],['Sky crane (Wikipedia)','https://en.wikipedia.org/wiki/Sky_crane_(landing_system)']]}
}];
/* Saturn V S-IC: five fixed-thrust F-1s; the lever picks how many are lit, in the real start order (centre, a diagonal pair, the other pair) */
const sicE=[0,0,0,0,0];
function sicStep(dt){const lit=ph==2?(L<.34?1:L<.67?3:5):0;for(let k=0;k<5;k++){const t=k<lit?1:0;sicE[k]+=(t-sicE[k])*(1-Math.exp(-dt/(t>sicE[k]?.55:.22)))}N=sicE.reduce((a,b)=>a+b,0)/5}
/* Harrier: fixed 8,000 kg, installed lift taken as 87% of the Pegasus 11-61's 106 kN; vertical motion only, with artificial damping */
const HM=8000,HT=106e3*.87,G0=9.80665,harT=()=>ph==2?HT*Math.pow(Math.max(0,(N-.25)/.75),1.5)*fu:0,hovL=()=>(Math.pow(HM*G0/HT,1/1.5)*.75+.25-.27)/(1-.27);
function hoverStep(dt){nz+=Math.max(-90*dt,Math.min(90*dt,raw2*98.5-nz));const T=harT(),a=(T*Math.sin(nz*Math.PI/180)-HM*G0)/HM-vz*.6;
 if(alt<=0&&a<=0){alt=0;vz=0;return}vz+=a*dt;alt+=vz*dt;if(alt<0){if(vz<-2.5){thump(Math.min(1,-vz/8));kick=Math.max(kick,.3)}alt=0;vz=0}if(alt>45){alt=45;vz=Math.min(vz,0)}}
function auF1(s,V,pm){const nn=N*fu;
 s(S.rum.gn.gain,(nn*1.7+ign*1.2)*(1+.18*Math.sin(simT*29)*Math.sin(simT*7+1)));s(S.rum.fl.frequency,42+N*70);
 s(S.roar.gn.gain,Math.pow(nn,.8)*.75+ign*.5+sg*.05);s(S.roar.fl.frequency,150+N*650);
 s(S.crk.gn.gain,nn*(.6+Math.random()*1.3)*(.8+V.raw)+ign*.5,.02);s(S.crk.fl.frequency,520+N*300);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,sg*.07);s(S.so.frequency,(40+st*25)*pm);s(S.sg.fl.frequency,260);s(S.sg2.gn.gain,0)}
function auHR(s,V,pm){
 s(S.rum.gn.gain,N*.55*(.35+.65*fu)+sg*.12+ign*.6);s(S.rum.fl.frequency,80+N*120);
 s(S.roar.gn.gain,N*N*(.07+.3*fu)+ign*.3);s(S.roar.fl.frequency,300+N*1100);
 s(S.wh.gn.gain,N*.09*(1+(1-fu)*1.4)+spd*.18);s(S.osc.frequency,(230+N*1800)*pm);s(S.wh.fl.frequency,(1200+N*2600)*pm);
 s(S.wh2.gn.gain,spd*.1+N*.035);s(S.osc2.frequency,(230+N*1800)*2.01*pm);s(S.crk.gn.gain,0);
 s(S.sg.gn.gain,sg*.12);s(S.so.frequency,(60+N*2600)*pm);s(S.sg.fl.frequency,300+N*3000);s(S.sg2.gn.gain,sg*.05);s(S.so2.frequency,(30+N*500)*pm)}
/* NK-12 turboprop. Power comes from the lever; a governor holds RPM by changing blade pitch, so once governed, more power means coarser blades, not faster ones.
   On shutdown the blades feather (turn edge-on). Static propeller thrust is a momentum-theory estimate with an assumed figure of merit of 0.6 */
const TPW=11.03e6,TPJ=2780,tpP=()=>ph==2?TPW*N*fu:0,tpT=()=>2.79*Math.pow(tpP(),2/3)*sm(.3,.9,prp);
function tpStep(dt){const tR=ph==1?.55*sm(0,M.cT,st):ph==2?.8+.2*sm(.08,.3,N):0;prp+=(tR-prp)*(1-Math.exp(-dt/(tR>prp?1.2:ph==3?1.4:.8)));
 const tB=ph==2?8+30*Math.pow(Math.max(0,(N-M.idle)/(1-M.idle)),.8):ph==1&&st>1?10:86;beta+=Math.max(-25*dt,Math.min(25*dt,tB-beta))}
/* Mars 2020 sky crane. Mars gravity 3.71 m/s2, rover 1,025 kg. Assumed: descent stage 1,100 kg at this point, engines canted 20 deg, fuel use ignored.
   The lever sets total thrust (fraction of 8 x 3,060 N); each lit engine runs between 400 N and 3,060 N, backups at about 1% */
const GM=3.71,MR=1025,MS=1100,MLE=3060,MLN=400,CANT=Math.cos(20*Math.PI/180),RH=1.75,BL=6.4;
const sc={bl:0,cut:0,td:0,tdT:0,ct:0,fly:0,done:0,x:0,vx:0,pit:0,act:8,vzT:null,thr:[0,0,0,0,0,0,0,0],T:0,lp:0,hard:0};
function skyReset(){Object.assign(sc,{bl:0,cut:0,td:0,tdT:0,ct:0,fly:0,done:0,x:0,vx:0,pit:0,act:8,vzT:null,T:0,hard:0});sc.thr.fill(0);alt=32;vz=-2.5}
const skyRy=()=>sc.td?0:alt-RH-sc.bl,skyHov=()=>Math.min(1,((sc.td||sc.cut?MS:MS+MR)*GM/CANT-(8-sc.act)*MLE*.01)/(8*MLE));
function skyCam(v){const ry=sc.td?0:Math.max(0,alt-RH-sc.bl);if(sc.cut){const fl=sc.fly&&!sc.done,m2=fl?Math.min(30,alt*.5):.4,k=fl?Math.min(3,1+alt/30):1;return v==1?[0,0]:v==2?[0,m2,k]:[m2*.5,m2,k]}const m=(ry+alt+1.2)/2-1;return v==1?[ry,ry]:v==2?[0,m]:[m,m]}
function skyStep(dt){
 if(ph!=sc.lp){if(ph==1)skyReset();sc.lp=ph}
 const run=ph==2&&!sc.done;
 /* SEQUENCE flies it with a simple loop that holds a vertical speed (the real stage is flown entirely by its guidance computer) */
 if(SQ.on&&sc.vzT!=null&&run&&!sc.cut){raw=Math.min(1,Math.max(0,skyHov()+.25*(sc.vzT-vz)));applyRaw()}
 /* sky-crane phase: four engines drop to ~1% as backups once the rover starts down */
 if(raw2>.02&&sc.act==8&&run)sc.act=4;
 /* bridles pay out (up to 1 m/s here) to the length set by the second lever; they cannot be reeled back in */
 if(!sc.cut&&!sc.td)sc.bl=Math.max(sc.bl,Math.min(raw2*BL,sc.bl+dt));
 const tot=sc.fly?8*MLE:L*8*MLE;let sum=0;
 for(let k=0;k<8;k++){const on=sc.act==8||k%2==0,t=!run?0:on?Math.min(MLE,Math.max(MLN,tot/sc.act)):MLE*.01;sc.thr[k]+=(t-sc.thr[k])*(1-Math.exp(-dt/.12));sum+=sc.thr[k]}
 sc.T=sum*CANT;N=sum/(8*MLE);
 if(sc.done||ph==0||ph==1)return;
 const m=sc.td||sc.cut?MS:MS+MR;
 if(sc.fly){sc.fly+=dt;sc.pit=Math.min(.75,sc.fly*.4);const a=sc.T/m;sc.vx+=a*Math.sin(sc.pit)*dt;vz+=(a*Math.cos(sc.pit)-GM)*dt;sc.x+=sc.vx*dt;alt+=vz*dt;
  if(sc.fly>8||Math.hypot(sc.x,alt)>260){sc.done=1;ph=3;lit=false;say('The descent stage flew off to crash a safe distance away. ENGINE to fly it again.')}return}
 if(sc.td&&!sc.cut){sc.tdT+=dt;if(sc.tdT>1){sc.cut=1;sc.vzT=null;say('Wheels down: the rover cuts the bridles.')}}
 if(sc.cut&&ph==2){sc.ct+=dt;if(sc.ct>.6)sc.fly=1e-3}
 vz+=(sc.T/m-GM-vz*.1)*dt;alt+=vz*dt;
 if(!sc.td&&alt-RH-sc.bl<=0){sc.td=1;sc.tdT=0;sc.tdv=-vz;sc.hard=-vz>1.6;thump(Math.min(.7,.15-vz*.15));kick=Math.max(kick,Math.min(.5,-vz*.08));
  say(sc.hard?'Hard touchdown at '+(-vz).toFixed(1)+' m/s.':'Touchdown at '+(-vz).toFixed(2)+' m/s.');alt=RH+sc.bl;vz=Math.max(vz,0)}
 if(sc.td&&!sc.cut&&alt>RH+sc.bl){alt=RH+sc.bl;vz=Math.min(vz,0)}   /* taut bridles: the rover holds the stage down until they are cut */
 if(alt<RH&&(sc.td||sc.bl<.05)){alt=RH;vz=Math.max(vz,0)}
 if(alt>80){alt=80;vz=Math.min(vz,0)}}
/* NK-12: the propellers' beating growl, a turbine whine, and the roar of a huge mass of air */
function auTP(s,V,pm){const nn=N*fu,bp=prp*42*4,bt2=1+.35*Math.sin(simT*6.283*2.3);
 s(S.rum.gn.gain,prp*.35+nn*.55+sg*.08+ign*.4);s(S.rum.fl.frequency,70+nn*90);
 s(S.roar.gn.gain,nn*nn*.28+prp*.05+ign*.25);s(S.roar.fl.frequency,300+nn*700);
 s(S.sg.gn.gain,prp*(.05+nn*.25)*bt2+sg*.08);s(S.so.frequency,Math.max(30,bp)*pm);s(S.sg.fl.frequency,180+nn*500);
 s(S.sg2.gn.gain,prp*(.03+nn*.12));s(S.so2.frequency,Math.max(20,bp*1.02)*pm);
 s(S.wh.gn.gain,prp*.05+spd*.1);s(S.osc.frequency,(400+prp*2200)*pm);s(S.wh.fl.frequency,(1500+prp*2500)*pm);
 s(S.wh2.gn.gain,prp*.02);s(S.osc2.frequency,(400+prp*2200)*2.01*pm);s(S.crk.gn.gain,0)}
/* hydrazine engines: a harsh hissing roar that fades as the stage flies off */
function auSC(s,V,pm){const nn=N*fu,cl=sc.done?0:Math.exp(-Math.hypot(sc.x,alt-10)/90);
 s(S.rum.gn.gain,(nn*1.1+ign*.4)*cl);s(S.rum.fl.frequency,70+nn*120);
 s(S.roar.gn.gain,(nn*.75+ign*.3)*cl*(1+.15*Math.sin(simT*23)));s(S.roar.fl.frequency,700+nn*1400);
 s(S.crk.gn.gain,nn*(.1+Math.random()*.35)*cl,.02);s(S.crk.fl.frequency,1800);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,0);s(S.sg2.gn.gain,0)}
/* Hall thruster thrust (N) from the power fraction N; what-if orbit raising from 400 km */
const htT=()=>ph==2?.24*Math.pow(N,.9)*fu:0,MU=3.986004418e14,RE=6371e3,WN=['1x','1,000x','100,000x'],WF=[1,1000,100000];
const orb={r:RE+400e3,m:2747,t:0,dv:0,xe:0,vph:0,tr:[]};
function orbReset(){orb.r=RE+400e3;orb.m=2747;orb.t=orb.dv=orb.xe=orb.vph=0;orb.tr=[]}
function orbStep(dt){const W=WF[sl],dtw=dt*W,T=htT(),md=T/((1300+500*N)*9.80665),a=T/orb.m;
 if(T>0){let v=Math.sqrt(MU/orb.r);v-=a*dtw;orb.r=MU/(v*v);orb.m-=md*dtw;orb.dv+=a*dtw;orb.xe+=md*dtw}
 orb.t+=dtw;orb.vph+=dt*Math.min(W,60)*Math.sqrt(MU/(orb.r*orb.r*orb.r));
 const al=(orb.r-RE)/1e3,lt=orb.tr[orb.tr.length-1];if(!lt||Math.abs(al-lt[0])>2||orb.vph-lt[1]>.25){orb.tr.push([al,orb.vph]);if(orb.tr.length>160)orb.tr.shift()}}
/* there is no sound in vacuum: a faint power-electronics hum stands in */
function auHT(s,V,pm){const nn=N*fu;
 s(S.rum.gn.gain,nn*.07+sg*.02+ign*.25);s(S.rum.fl.frequency,55+nn*20);
 s(S.roar.gn.gain,ign*.12);s(S.roar.fl.frequency,1800);s(S.crk.gn.gain,0);
 s(S.wh.gn.gain,nn*.01+sg*.004);s(S.osc.frequency,(1500+nn*700)*pm);s(S.wh.fl.frequency,2600);
 s(S.wh2.gn.gain,0);s(S.sg.gn.gain,sg*.015);s(S.so.frequency,100*pm);s(S.sg.fl.frequency,300);s(S.sg2.gn.gain,0)}
function lab(){const q=k=>document.querySelector('#ctl [data-k='+k+']');
 const sb=q('seq');sb.textContent=SQ.on?'■ STOP SEQUENCE':'▶ SEQUENCE';sb.classList.toggle('run',!!SQ.on);
 q('mach').textContent='MACHINE: '+M.btn;q('view').textContent='VIEW: '+VN[view];q('exp').textContent=G3?'CUTAWAY: '+(exposed?'ON':'OFF'):'CASING: '+(exposed?'EXPOSED':'COVERED');const lb=q('lens');lb.textContent='LENS: '+['NORMAL','SCHLIEREN','THERMAL'][lens];lb.style.opacity=G3?1:.4;q('scn').textContent='SCENE: '+(M.space?['TERMINATOR','SUNLIT','ECLIPSE'][scene]:M.sky&&G3?SNM[scene]:SN[scene]);q('slow').textContent=M.warp?'WARP: '+WN[sl]:'SLOW-MO: '+SLN[sl];
 const f=q('flt');f.textContent='FAULTS: '+(M.stall?(faults?'ON':'OFF'):'N/A');f.style.opacity=M.stall?1:.4}
function startStall(){sT=2.6;Nst=N;pulseT=0;bt=0;say('COMPRESSOR STALL! Ease the throttle back.')}
/* one surge pulse: fireball out of the nozzle, soot, flash and shake, rotor speed jolts down, bang */
function surge(){if(G3)G3.surge();ign=1.3;kick=Math.max(kick,.85);E+=60;N=Math.max(.06,N-.035);bang();navigator.vibrate&&navigator.vibrate(40);
 for(let i=0;i<34;i++)if(P.length<700)P.push({x:nx+Math.random()*20*u,y:ny+(Math.random()-.5)*30*u,vx:(450+Math.random()*900)*u,vy:(Math.random()-.5)*380*u,l:0,m:.4+Math.random()*.5,s:(14+Math.random()*16)*u,ab:1,k:.5});
 for(let i=0;i<10;i++)SM.push({x:nx+Math.random()*30*u,y:ny+(Math.random()-.5)*30*u,vx:(120+Math.random()*260)*u,vy:(Math.random()-.5)*60*u-20*u,l:0,m:1.4+Math.random()*.8,s:(26+Math.random()*30)*u})}
/* engine master: ON cranks and lights off; OFF cuts fuel (flame dies, rotor coasts, nozzle cools). Restart once the rotor is nearly stopped */
function say(t){$('hint').textContent=t;$('hint').style.opacity=1;hinted=true}
function master(){
 const hint=say;
 if(ph==1||ph==2){const was=ph;ph=3;lit=false;tm=0;sT=0;if(was==2){thump(.35);navigator.vibrate&&navigator.vibrate(20)}hint(M.cut)}
 else if(ph==3){if(N<.12){ph=1;st=0;igt=0;Ns=N;hint('Engine starting...')}else hint(M.wait)}}
function act(k){if(k=='view')view=(view+1)%(M.space&&G3?4:3);else if(k=='exp')exposed^=1;else if(k=='scn')scene=(scene+1)%3;else if(k=='slow'){sl=(sl+1)%3;tsT=M.warp?1:SL[sl]}else if(k=='rec'){rec?stopRec():startRec()}else if(k=='eng'){seqStop(false);master()}else if(k=='flt'){if(M.stall)faults=!faults}else if(k=='mach')setMachine(nextM(mi));else if(k=='seq'){SQ.on?seqStop(false):seqStart()}else if(k=='inf')showInfo();else if(k=='lens'){if(G3){lens=(lens+1)%3;if(M.space&&lens==1)lens=2}}lab()}
/* next machine in the cycle; the Hall thruster needs the 3D renderer */
function nextM(i){let j=i;do{j=(j+1)%MC.length}while(MC[j].need3d&&!G3&&j!==i);return j}
function chips(){[...$('mch').children].forEach((b,j)=>b.style.display=MC[j].need3d&&!G3?'none':'');if(M.need3d&&!G3)setMachine(0)}
/* switching machine resets the sim to cold and starts the new engine straight away (lever back to idle) */
function setMachine(i){
 seqStop(false);mi=i;M=MC[i];GC=M.g;sl=0;tsT=TS=1;orbReset();alt=vz=0;raw2=.914;nz=90;sicE.fill(0);prp=0;beta=86;if(M.sky){raw2=0;skyReset()}if(view>2&&!(M.space&&G3))view=0;if(M.space&&lens==1)lens=0;if(W)nx=W*M.nxf;N=A=kick=ign=spd=sg=fu=hg=sT=Nst=stl=gn=spk=mach=pulseT=bt=coolS=tm=0;E=20;F=0;lit=false;GV[0]=GV[1]=GV[2]=0;
 P.length=EM.length=SM.length=VP.length=0;raw=0;applyRaw();Lp=L;Lrate=0;
 buildFaces();buildLabels();$('ovh').textContent=M.n;$('ovs').textContent=M.sub;
 [...$('mch').children].forEach((b,j)=>b.classList.toggle('on',j==i));
 if(ph){ph=1;st=0;igt=0;Ns=0;say('Engine starting...')}
 lab()}
/* ---------- SEQUENCE: a scripted run for one-tap clips. Steps: wait / until / lever ramp / view cut / slow-mo. Any lever input cancels it.
   If REC was already running when it starts, the recording stops itself shortly after the sequence ends ---------- */
const SQ={on:0,steps:[],i:0,t:0,r0:0,v0:0,cap:'',rec:0};
function seqStart(){
 if(!ph||SQ.on)return;
 const pre=[];
 if(ph==3)pre.push({cap:'WAITING FOR SHUTDOWN',until:()=>N<.12,max:20},{cap:M.sqc,do:()=>{if(ph==3)master()},until:()=>ph==2,max:16});
 else if(ph==1)pre.push({cap:M.sqc,until:()=>ph==2,max:16});
 else if(M.sky)pre.push({cap:'POWERED DESCENT',do:()=>skyReset(),wait:.1});
 else pre.push({cap:'SETTLING TO IDLE',lever:0,dur:1.2,until:()=>sT<=0&&N<M.idle+.07,max:14});
 SQ.steps=pre.concat(M.sq);SQ.i=-1;SQ.on=1;SQ.v0=view;SQ.rec=rec?1:0;SQ.cap='';seqNext();lab()}
function seqNext(){
 SQ.i++;if(SQ.i>=SQ.steps.length){seqStop(true);return}
 const s=SQ.steps[SQ.i];SQ.t=0;SQ.r0=raw;if(typeof s.lever=='function')s._lv=s.lever();if(s.cap)SQ.cap=s.cap;if(s.do)s.do();
 if(s.view!=null){view=s.view;lab()}if(s.slow!=null)tsT=s.slow}
function seqStop(done){
 if(!SQ.on)return;SQ.on=0;tsT=M.warp?1:SL[sl];view=SQ.v0;
 if(done&&SQ.rec&&rec)setTimeout(stopRec,1500);
 say(done?'Sequence complete.':'Sequence stopped.');lab()}
function seqTick(dr){
 if(!SQ.on)return;
 if(drag||drag2||K.arrowup||K.arrowdown||K.w||K.s||K.arrowleft||K.arrowright||K.a||K.d){seqStop(false);return}
 const s=SQ.steps[SQ.i];SQ.t+=dr;
 if(s.lever!=null){const k=Math.min(1,SQ.t/(s.dur||1)),tg=s._lv!=null?s._lv:s.lever;raw=SQ.r0+(tg-SQ.r0)*k*k*(3-2*k);applyRaw()}
 if(SQ.t>=Math.max(s.lever!=null?(s.dur||1):0,s.wait||0)&&(!s.until||s.until()||SQ.t>(s.max||20)))seqNext()}
function seqCap(){
 if(!SQ.on||!SQ.cap)return;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 const x=gx,y=Math.min(ny+112*u,$('ctl').getBoundingClientRect().top-30),t='▶  '+SQ.cap;g.font=`600 12px ${MONO}`;g.textAlign='left';g.textBaseline='middle';
 const w=g.measureText(t).width+28;
 g.fillStyle='rgba(10,12,18,.74)';g.fillRect(x,y-15,w,30);g.fillStyle='#ff9a3a';g.fillRect(x,y-15,3,30);
 g.fillStyle='#e8ecf2';g.fillText(t,x+16,y+.5);
 g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x,y+17,w,2);g.fillStyle='#ff9a3a';g.fillRect(x,y+17,w*Math.min(1,(SQ.i+1)/SQ.steps.length),2)}
/* ---------- info panel: what is real, what is approximated, and where the numbers came from ---------- */
function showInfo(){
 const I=M.info,li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
 $('infc').innerHTML='<h2>'+M.n+': HOW IT WORKS</h2><p>A toy built from public sources. It is not an engineering simulation.</p>'+li(I.f)+(G3?'<h3>CUTAWAY AND LENSES</h3>'+li(Array.isArray(I.cut)?I.cut:M.space?['CUTAWAY removes half of the thruster. Grey dots are neutral xenon flowing from the anode; they turn blue when ionised and accelerate out as the beam. Yellow dots are electrons: trapped by the magnetic field, they circle the channel as the Hall current, and more stream in from the hollow cathode. Speeds are slowed enormously.','THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative.','SCHLIEREN needs air to bend light, so it is not available in space.']:[I.cut?I.cut:mi==2?'CUTAWAY removes half of the bell and chamber. Blue dots are liquid hydrogen (down the steerhorn and up through the nozzle cooling tubes), pale cyan is liquid oxygen, violet-white is the burning gas expanding through the throat and bell. Speeds are slowed enormously so you can follow them.':'CUTAWAY removes half of the casing. The moving dots trace the air: blue is cool intake air, white is compressed air, orange is combustion and exhaust.'+(mi==1?' Watch the bypass tubes carry air round the core above about Mach 2, and the secondary air flowing between engine and nacelle to the ejector.':' The outer band is bypass air going round the core.')+' Flow speed is slowed enormously so you can follow it.','SCHLIEREN mimics the optical technique that turns changes in air density into light and dark. Here it is drawn from the toy\'s exhaust model, so it shows the hot, otherwise invisible exhaust and the shock cells, but it is not a computed flow field.','THERMAL is false colour by temperature, like an infrared camera: black and purple are cool, red and yellow hot, white hottest. The temperatures are illustrative, not measured, and real cameras also see reflections and emissivity effects that are not modelled.']):'')+'<h3>WHAT IS APPROXIMATED</h3>'+li(I.a)+(I.s.length?'<h3>SOURCES</h3><ul>'+I.s.map(s=>'<li><a href="'+s[1]+'" target="_blank" rel="noopener">'+s[0]+'</a></li>').join('')+'</ul>':'');
 $('inf').style.display='flex';$('infb').scrollTop=0}
const closeInfo=()=>{$('inf').style.display='none'};
$('infx').onclick=closeInfo;$('inf').addEventListener('click',e=>{if(e.target===$('inf'))closeInfo()});
$('ib').addEventListener('click',()=>{if(ph)showInfo()});
function buildLabels(){const h=$('lbs');h.innerHTML='';
 M.lv.forEach(l=>{const d=document.createElement('div');d.className='lb';d.textContent=l[0];
  if(l[2]=='t'){d.style.bottom='100%';d.style.transform='translateY(100%)'}else if(l[2]=='b'){d.style.bottom='0';d.style.transform='translateY(0)'}else d.style.bottom=l[1]*100+'%';h.appendChild(d)});
 $('abz').style.display=M.ab?'':'none';
 const h2=$('lbs2');h2.innerHTML='';$('trk2').style.display=M.nozzle?'block':'none';tq.classList.toggle('two',!!M.nozzle);
 (M.lv2||[]).forEach(l=>{const d=document.createElement('div');d.className='lb2';d.textContent=l[0];if(l[2]=='t'){d.style.bottom='100%';d.style.transform='translateY(100%)'}else if(l[2]=='b'){d.style.bottom='0';d.style.transform='translateY(0)'}else d.style.bottom=l[1]*100+'%';h2.appendChild(d)});TR=trk.getBoundingClientRect()}
$('ctl').addEventListener('click',e=>{const k=e.target.dataset.k;if(k)act(k)});

function emit(dt,r){
 let n=A*dt*420;n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&P.length<700;n--)P.push({x:nx+Math.random()*12*u,y:ny+(Math.random()-.5)*r*1.5,vx:(650+A*900)*u*(.6+Math.random()*.8),vy:(Math.random()-.5)*160*u,l:0,m:.35+Math.random()*.6,s:(5+Math.random()*9)*u,ab:1});
 n=sm(.5,1,N)*fu*dt*150;n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&P.length<700;n--)P.push({x:nx,y:ny+(Math.random()-.5)*r,vx:(380+N*400)*u*(.7+Math.random()*.6),vy:(Math.random()-.5)*70*u,l:0,m:.2+Math.random()*.25,s:(3+Math.random()*5)*u,ab:0});
 n=sm(.35,1,A)*dt*60;n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&EM.length<160;n--)EM.push({x:nx+Math.random()*30*u,y:ny+(Math.random()-.5)*r,vx:(700+Math.random()*900)*u,vy:(Math.random()-.5)*520*u,l:0,m:.4+Math.random()*.6})}
/* a flame column: soft sprites along the axis, colour cross-faded down the palette, width widening then tapering */
function stream(len,r0,a,n,T,pal,seed){
 const m=pal.length-1;
 for(let k=0;k<n;k++){const t=k/n,
  wob=(Math.sin(T*17+k*.9+seed)+.7*Math.sin(T*31+k*.55+seed*2)+.4*Math.sin(T*53+k*1.7))*.33*(.2+t),
  pr=Math.pow(1-t,.85)*(.8+.4*Math.sin(Math.min(1,t*3.2)*1.5708)),sz=r0*2.1*pr,
  ci=Math.min(m-.001,t*m*1.15),i0=ci|0,f=ci-i0,al=a*Math.pow(1-t,1.6),x=nx+t*len,y=ny+wob*r0*.9,w=sz*(1.5+t*1.2);
  blob(pal[i0],x,y,w,sz,al*(1-f));blob(pal[i0+1],x,y,w,sz,al*f)}}
/* long, thin flickering tongues inside the afterburner flame */
function tongues(len,r,a,T){
 for(let i=0;i<8;i++){const q=Math.sin(T*(5+i*1.3)+i*2.3),ll=len*(.18+.3*(Math.sin(T*(7+i)+i*5)*.5+.5));
  blob(i%2?SP.y:SP.w,nx+ll*.5+r*.2,ny+q*r*.5,ll,r*(.4+.25*Math.sin(T*11+i)),a*.09)}}
function plume(r,dt){
 g.globalCompositeOperation='lighter';const T=simT,fl=.92+.08*Math.sin(T*47)*Math.sin(T*29+1),Pm=M.pl;
 const gl=M.gl(),gr=gl[1]*u,rg=g.createRadialGradient(nx+80*u,ny,0,nx+80*u,ny,gr);
 rg.addColorStop(0,`rgba(255,150,60,${gl[0]*fl})`);rg.addColorStop(1,'rgba(255,100,20,0)');g.globalAlpha=1;g.fillStyle=rg;g.fillRect(-W,-H,W*3,H*3);
 const dA=sm(.3,1,N)*fu*(1-A*.6);
 if(dA>.01)stream((Pm.dl[0]+N*N*Pm.dl[1])*u,r*.8,dA*fl*.85,22,T,Pm.dp,0);
 if(ign>.02)stream((50+90*ign)*u,r*.8,ign*.7,20,T*1.3,[SP.y,SP.o,SP.o,SP.r],5);
 /* TEB light-off: the J58's green flash */
 if(gn>.02){stream((60+120*gn)*u,r*.9,gn*.7,20,T*1.2,[SP.g,SP.g,SP.o,SP.r],7);blob(SP.g,nx+50*u,ny,r*5.5,r*3.6,gn*.4)}
 if(A>.01){const len=(Pm.al[0]+A*Pm.al[1])*u*(1+kick*.25);
  stream(len,r*1.25,A*fl*.42*Pm.ak,Pm.sn,T,Pm.ap,1);
  stream(len*.5,r*.8,A*fl*.3*Pm.ak,34,T+3,Pm.cp,2);
  tongues(len,r,A*fl*(.4+.6*Pm.ak),T)}
 emit(dt,r);
 for(let i=P.length-1;i>=0;i--){const p=P[i];p.l+=dt;if(p.l>p.m){P[i]=P[P.length-1];P.pop();continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;const f=p.l/p.m,z=p.s*(2.4+2*f);
  blob(p.ab?(f<.3?SP.y:f<.65?SP.o:SP.r):(f<.5?SP.b:SP.o),p.x,p.y,z,z,(1-f)*(p.k||(p.ab?.22*A+.06:.3)))}
 /* soot puffs from a surge (drawn dark, not additive) */
 if(SM.length){g.globalCompositeOperation='source-over';
  for(let i=SM.length-1;i>=0;i--){const p=SM[i];p.l+=dt;if(p.l>p.m){SM[i]=SM[SM.length-1];SM.pop();continue}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*.8);const f=p.l/p.m,z=p.s*(1.2+2.2*f);blob(SP.k,p.x,p.y,z,z,(1-f)*(f<.15?f/.15:1)*.42)}
  g.globalCompositeOperation='lighter'}
 sparks(dt);
 /* shock diamonds: a body plus a hot core */
 const dn=Pm.dn[0]+Math.floor(N*Pm.dn[1]+A*Pm.dn[2]),sp=(Pm.ds[0]+A*Pm.ds[1]+N*Pm.ds[2])*u,da=sm(.5,1,N)*fu*.45+A*.5;
 for(let i=0;i<dn;i++){const a=da*(1-i/(dn+1))*(.85+.15*Math.sin(T*70+i*2)),rr=Math.max(2,r*(.62-i*.04)),x=nx+(i+.6)*sp;
  blob(A>.05?Pm.dc[0]:Pm.dc[1],x,ny,sp*1.15,rr*2.2,a*.8);blob(SP.w,x,ny,sp*.55,rr*1.1,a*(A>.05?.6:.5))}
 g.globalAlpha=1}
/* sparks: streaks that arc downward */
function sparks(dt){
 g.lineWidth=1.4*u;
 for(let i=EM.length-1;i>=0;i--){const p=EM[i];p.l+=dt;if(p.l>p.m){EM[i]=EM[EM.length-1];EM.pop();continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*u*dt;p.vx*=Math.exp(-dt*.6);const f=p.l/p.m;
  g.strokeStyle=`rgba(255,${170+(1-f)*60|0},90,${(1-f)*.8})`;g.globalAlpha=1;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);g.stroke()}}

/* rear view: exit petals around the rim, throat petals inside, flame down the pipe */
function rear(){
 const cx=W*.44,cy=H*.5,T=simT,R=Math.min(W,H)*.34,r=R*(.38+.17*A),rt=r*(.74+.22*A),heat=hg,fl=.92+.08*Math.sin(T*47)*Math.sin(T*29+1),dA=sm(.3,1,N)*fu*(1-A*.6);
 g.globalCompositeOperation='source-over';
 let gd=g.createRadialGradient(cx,cy,r,cx,cy,R*1.25);gd.addColorStop(0,'#3a404c');gd.addColorStop(.5,'#4a5160');gd.addColorStop(1,'#12151b');
 g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R*1.25,0,6.283);g.fill();
 const n=16,da=6.283/n,ov=.22*(1-.7*A);
 const pet=(r0,r1,a0,w,tw,col)=>{g.beginPath();g.moveTo(cx+Math.cos(a0)*r0,cy+Math.sin(a0)*r0);g.lineTo(cx+Math.cos(a0+w)*r0,cy+Math.sin(a0+w)*r0);
  g.lineTo(cx+Math.cos(a0+w+tw)*r1,cy+Math.sin(a0+w+tw)*r1);g.lineTo(cx+Math.cos(a0+tw)*r1,cy+Math.sin(a0+tw)*r1);g.closePath();g.fillStyle=col;g.fill();g.stroke()};
 g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.5;
 const dk=M.dk,bl=M.bl;
 for(let i=0;i<n;i++){const a0=i*da,lum=.5+.5*Math.cos(a0+da/2-3.93);pet(r*1.04,R*1.25,a0,da*(1+ov),.06,`rgb(${(34+lum*44)*dk|0},${(40+lum*48)*dk|0},${(52+lum*54)*dk+bl|0})`)}
 for(let i=0;i<n;i++){const a0=i*da+da/2,lum=.5+.5*Math.cos(a0+da/2-3.93);pet(rt*.98,r,a0,da*(1+ov*1.5),-.05,`rgb(${(30+lum*40)*dk+heat*70|0},${(30+lum*35)*dk+heat*20|0},${(34+lum*30)*dk+bl*.5|0})`)}
 g.fillStyle='#030406';g.beginPath();g.arc(cx,cy,rt,0,6.283);g.fill();
 g.globalCompositeOperation='lighter';
 gd=g.createRadialGradient(cx,cy,r,cx,cy,r*1.7);gd.addColorStop(0,`rgba(255,110,30,${heat*.6})`);gd.addColorStop(1,'rgba(255,60,10,0)');g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R*1.25,0,6.283);g.fill();
 g.save();g.beginPath();g.arc(cx,cy,r,0,6.283);g.clip();
 blob(SP.b,cx,cy,r*2.4,r*2.4,dA*.9);blob(SP.o,cx,cy,r*2.8,r*2.8,A*.9*fl);blob(SP.y,cx,cy,r*1.9,r*1.9,A*fl);blob(SP.w,cx,cy,r*1.1,r*1.1,A*fl);
 blob(SP.y,cx,cy,r*2.2,r*2.2,ign*.8);blob(SP.g,cx,cy,r*2.4,r*2.4,gn*.9);
 for(let k=0;k<18;k++){const a=T*(1.5+k%4)+k*2.4,d=r*.5*Math.abs(Math.sin(T*3+k));blob(k%2?SP.y:SP.o,cx+Math.cos(a)*d,cy+Math.sin(a)*d,r*.9,r*.9,(A*.35+dA*.1)*fl)}
 g.globalAlpha=1;g.lineWidth=3;
 for(let i=0;i<5;i++){g.strokeStyle=`rgba(255,240,215,${(A*.5+dA*.25)*(1-i/6)})`;g.beginPath();g.arc(cx,cy,r*(.8-i*.13),0,6.283);g.stroke()}
 g.restore();blob(SP.o,cx,cy,R*4.5,R*4.5,A*.35*fl);g.globalAlpha=1}
function wires(ts,fh){
 g.fillStyle='#0b0d11';g.fillRect(-60,ny-fh,ts+60,fh*2);const v=N*1.4*u;
 for(let x=ts-30*u;x>-60;x-=64*u){const gd=g.createLinearGradient(x,0,x+12*u,0);gd.addColorStop(0,'#2a2f3a');gd.addColorStop(.5,'#6a7282');gd.addColorStop(1,'#1a1e26');g.fillStyle=gd;g.fillRect(x,ny-fh,12*u,fh*2)}
 g.strokeStyle='#9a7a30';g.lineWidth=8*u;g.beginPath();g.moveTo(ts-44*u,ny-fh*.96);g.lineTo(ts-44*u,ny+fh*.96);g.stroke();
 const C=['#c0392b','#e0b020','#2e86de','#2ea85a','#b8bcc4','#e67e22','#8e44ad'];
 for(let i=0;i<16;i++){const y0=ny+(i/15-.5)*fh*1.8;g.strokeStyle=C[i%7];g.lineWidth=(1.6+i%3)*u;g.beginPath();
  for(let x=-60;x<=ts-6*u;x+=14*u){const y=y0+Math.sin(x*.025/u+i*1.3)*7*u+Math.sin(x*.07/u+i)*3*u+(Math.sin(simT*83+x*.37+i*2.1)+Math.sin(simT*131+x*.21+i))*.25*v;x<=-60?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}
 const gd=g.createLinearGradient(ts-160*u,0,ts,0);gd.addColorStop(0,'rgba(255,80,20,0)');gd.addColorStop(1,`rgba(255,90,30,${hg*.6})`);g.fillStyle=gd;g.fillRect(ts-160*u,ny-fh,160*u,fh*2)}
function sky(){
 const hy=H*.74;g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createLinearGradient(0,0,0,H);
 if(scene==0){gd.addColorStop(0,'#05060a');gd.addColorStop(1,'#0b0d14');g.fillStyle=gd;g.fillRect(0,0,W,H);return}
 if(scene==1){gd=g.createLinearGradient(0,0,0,hy);gd.addColorStop(0,'#141a33');gd.addColorStop(.6,'#7a4a5a');gd.addColorStop(1,'#f0a060');g.fillStyle=gd;g.fillRect(0,0,W,H);
  g.fillStyle='#2a1c22';g.beginPath();g.moveTo(0,hy);for(let x=0;x<=W+20;x+=20)g.lineTo(x,hy-14-22*(Math.sin(x*.006+1)*.5+.5)-30*(Math.sin(x*.0021+4)*.5+.5));g.lineTo(W,hy);g.fill();
  gd=g.createLinearGradient(0,hy,0,H);gd.addColorStop(0,'#2e1e1c');gd.addColorStop(1,'#0c0809');g.fillStyle=gd;g.fillRect(0,hy,W,H-hy)}
 else{gd=g.createLinearGradient(0,0,0,hy);gd.addColorStop(0,'#02030a');gd.addColorStop(1,'#0d1426');g.fillStyle=gd;g.fillRect(0,0,W,H);
  ST.forEach(q=>{g.fillStyle=`rgba(255,255,255,${.3+q[2]*.6})`;g.fillRect(q[0]*W,q[1]*H,1.5,1.5)});
  g.fillStyle='#06080d';g.fillRect(0,hy,W,H-hy);
  for(let i=0;i<14;i++){g.fillStyle='rgba(255,190,90,.75)';g.beginPath();g.arc(W*(.04+i*.07),hy+16,2,0,6.283);g.fill();g.fillStyle='rgba(120,170,255,.8)';g.beginPath();g.arc(W*(.02+i*.075),hy+52,3.5,0,6.283);g.fill()}}
 if(view!=2){const gx2=nx+300*u,rg=g.createRadialGradient(gx2,hy,0,gx2,hy,700*u);rg.addColorStop(0,`rgba(255,150,60,${M.skyG()})`);rg.addColorStop(1,'rgba(255,100,20,0)');g.globalCompositeOperation='lighter';g.fillStyle=rg;g.fillRect(0,H*.55,W,H*.45);g.globalCompositeOperation='source-over'}}
function metal(b){const gd=g.createLinearGradient(0,ny-b,0,ny+b);M.mc.forEach(s=>gd.addColorStop(s[0],s[1]));return gd}
/* SR-71 blow-in doors: open at low flight speed to feed the ejector (below about Mach 1.2), shut above it; hot metal shows through when open */
function doors(ts,fh){
 const o=1-sm(.6,1.2,mach);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 for(let s=-1;s<=1;s+=2)for(let i=0;i<5;i++){const x=ts-(38+i*34)*u,y=ny+s*fh*.5,w=22*u,h=(2.5+9*o)*u;
  g.fillStyle='#02030a';g.fillRect(x-w,y-h/2,w,h);
  if(o>.05&&hg>.05){g.fillStyle=`rgba(255,90,30,${hg*.55*o})`;g.fillRect(x-w,y-h/2,w,h)}
  g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=u;g.strokeRect(x-w,y-h/2,w,h);
  if(o>.08){g.fillStyle=`rgba(140,160,200,${.55*o})`;g.fillRect(x-w,s>0?y+h/2-1.4*u:y-h/2,w,1.4*u)}}}
/* exposed view: five actuators around the nozzle (edge-on top and bottom, a 45 degree pair, one facing us),
   rods push a sync ring aft as the nozzle opens, link arms run from the ring to the flap hinges */
function actuators(ts,xt,hh,rt){
 const rx=ts+10*u+34*u*A,ry=hh+14*u;g.globalCompositeOperation='source-over';
 [-1,-.707,0,.707,1].forEach(f=>{const yb=ny+f*ry,yp=ny+f*rt,x0=ts-66*u,x1=ts-22*u;g.globalAlpha=Math.abs(f)==1?1:.92;
  g.strokeStyle='#8f99aa';g.lineWidth=2.6*u;g.beginPath();g.moveTo(rx,yb);g.lineTo(xt,yp);g.stroke();
  g.fillStyle='#d0d6e0';g.beginPath();g.arc(xt,yp,3*u,0,6.283);g.fill();
  const gd=g.createLinearGradient(0,yb-5*u,0,yb+5*u);gd.addColorStop(0,'#2a313d');gd.addColorStop(.35,'#6a7a90');gd.addColorStop(1,'#1d2330');
  g.fillStyle=gd;g.fillRect(x0,yb-5*u,x1-x0,10*u);g.fillStyle='#0c0f14';g.fillRect(x1-3*u,yb-6*u,3*u,12*u);g.fillRect(x0,yb-6*u,3*u,12*u);
  g.fillStyle='#98a2b2';g.fillRect(x1,yb-2*u,rx-x1,4*u);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x1,yb-1.4*u,rx-x1,1*u);
  g.fillStyle='#e4e8ee';g.beginPath();g.arc(rx,yb,3.2*u,0,6.283);g.fill()});
 g.globalAlpha=1;const gr=g.createLinearGradient(rx-4*u,0,rx+4*u,0);gr.addColorStop(0,'#6a7282');gr.addColorStop(.5,'#c4cbd6');gr.addColorStop(1,'#4a5160');
 g.fillStyle=gr;g.fillRect(rx-3.5*u,ny-ry-5*u,7*u,(ry+5*u)*2)}
/* nozzle: convergent primary petals to the throat hinge, divergent flaps out to the exit; both move with the afterburner */
function body(r){
 const B=M.bd;g.globalCompositeOperation='source-over';const ts=nx-B.ts*u,xt=ts+B.xt*u,hh=B.hh*u,fh=B.fh*u,rt=r*(.72+.24*A);
 if(exposed)wires(ts,fh);else{g.fillStyle=metal(fh);g.fillRect(-60,ny-fh,ts+60,fh*2);if(B.doors)doors(ts,fh)}
 g.fillStyle='#0a0c10';g.fillRect(ts-3*u,ny-fh,3*u,fh*2);
 const poly=()=>{g.beginPath();g.moveTo(ts,ny-hh);g.lineTo(xt,ny-rt);g.lineTo(nx,ny-r);g.lineTo(nx,ny+r);g.lineTo(xt,ny+rt);g.lineTo(ts,ny+hh);g.closePath()};
 poly();g.fillStyle=metal(hh);g.fill();
 g.fillStyle='rgba(255,255,255,.06)';g.beginPath();g.moveTo(xt,ny-rt);g.lineTo(nx,ny-r);g.lineTo(nx,ny+r);g.lineTo(xt,ny+rt);g.closePath();g.fill();
 g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=1.5*u;
 for(let i=-3;i<=3;i++){const f=i/3.5;g.beginPath();g.moveTo(ts,ny+hh*f);g.lineTo(xt,ny+rt*f);g.lineTo(nx,ny+r*f);g.stroke()}
 g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2.5*u;g.beginPath();g.moveTo(xt,ny-rt);g.lineTo(xt,ny+rt);g.stroke();
 g.strokeStyle='rgba(190,200,215,.35)';g.lineWidth=u;g.beginPath();g.moveTo(xt+2*u,ny-rt);g.lineTo(xt+2*u,ny+rt);g.stroke();
 for(let i=-3;i<=3;i++){const f=i/3.5,w=(i&1?7:3)*u;g.fillStyle=i&1?'#59616f':'#2c323d';g.fillRect(nx-w,ny+r*f-1.6*u,w,3.2*u)}
 const heat=hg,gd=g.createLinearGradient(ts,0,nx,0);
 gd.addColorStop(0,'rgba(255,70,20,0)');gd.addColorStop(1,`rgba(255,${90+A*60|0},30,${heat*.6})`);poly();g.fillStyle=gd;g.fill();
 g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,200,140,${heat*.6})`;g.beginPath();g.ellipse(nx,ny,3*u,r,0,0,6.283);g.fill();
 g.globalCompositeOperation='source-over';
 if(exposed)actuators(ts,xt,hh,rt)}

/* ---------- RS-25 (shuttle main engine): bell nozzle, near-invisible hydrogen plume with steam, gimbal ---------- */
const gimb=()=>.05*sm(.45,1,N)*fu*(Math.sin(simT*.8)*.6+Math.sin(simT*1.9+1)*.4)+.004*N*Math.sin(simT*23);
function drawSS(r,dt){
 const ts=nx-220*u,px=ts-64*u,gm=gimb();
 g.save();g.translate(px,ny);g.rotate(gm);g.translate(-px,-ny);plumeSS(r,dt);bellSS(r,ts,px);g.restore();baySS(px,gm)}
function plumeSS(r,dt){
 g.globalCompositeOperation='lighter';const T=simT,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),nn=N*fu;
 const gr=(200+nn*520)*u,rg=g.createRadialGradient(nx+140*u,ny,0,nx+140*u,ny,gr);
 rg.addColorStop(0,`rgba(150,175,255,${(nn*nn*.15+ign*.2)*fl})`);rg.addColorStop(.55,`rgba(255,150,90,${(nn*nn*.04+ign*.05)*fl})`);rg.addColorStop(1,'rgba(255,120,40,0)');
 g.globalAlpha=1;g.fillStyle=rg;g.fillRect(-W,-H,W*3,H*3);
 const len=(260+nn*nn*520)*u*(1+kick*.2);
 if(nn>.02){
  const qf=Q>1?1:.65;   /* fewer, brighter sprites when the frame rate is struggling */
  stream(len*1.05,r,nn*fl*.23/qf,Math.round(28*qf),T,[SP.l,SP.b,SP.b,SP.o],0);
  stream(len*.72,r*.78,nn*fl*.3/qf,Math.round(24*qf),T+2,[SP.c,SP.b,SP.l],1);
  stream(len*.2,r*.5,nn*fl*.16/qf,Math.round(12*qf),T+4,[SP.w,SP.c,SP.b],2);
  blob(SP.w,nx+6*u,ny,r*.7,r*1.8,nn*.28*fl)}
 if(ign>.02)stream((70+170*ign)*u,r*1.05,ign*.7,26,T*1.3,[SP.y,SP.o,SP.o,SP.r],5);
 /* burn-off igniters during priming: sparklers under the bell */
 if(ph==1&&st>.5){let n=dt*50;n=Math.floor(n)+(Math.random()<n%1?1:0);for(;n>0&&EM.length<120;n--)EM.push({x:nx+Math.random()*40*u,y:ny+(Math.random()-.5)*r*1.8,vx:(30+Math.random()*170)*u,vy:-Math.random()*240*u,l:0,m:.5+Math.random()*.6})}
 sparks(dt);
 /* diamonds: bright pale rings close to the exit */
 const dn=4+Math.floor(nn*3),sp=r*(1.05+nn*.15),da=sm(.45,1,nn)*.9;
 for(let i=0;i<dn;i++){const a=da*(1-i/(dn+1))*(.85+.15*Math.sin(T*90+i*2)),rr=Math.max(2,r*(.66-i*.075)),x=nx+(i+.9)*sp;
  blob(SP.b,x,ny,sp*.95,rr*2.1,a*.6);blob(SP.w,x,ny,sp*.42,rr*.9,a*.8)}
 /* steam: water vapour drifting off the plume */
 let n=nn*dt*(Q>1?16:9);n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&VP.length<(Q>1?70:34);n--)VP.push({x:nx+Math.random()*70*u,y:ny+(Math.random()-.5)*r*2.1,vx:(40+Math.random()*130)*u,vy:-(20+Math.random()*80)*u,l:0,m:1.6+Math.random()*1.4,s:(40+Math.random()*50)*u});
 g.globalCompositeOperation='source-over';
 for(let i=VP.length-1;i>=0;i--){const p=VP[i];p.l+=dt;if(p.l>p.m){VP[i]=VP[VP.length-1];VP.pop();continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=14*u*dt;p.vx*=Math.exp(-dt*.5);const f=p.l/p.m,z=p.s*(1+1.6*f);blob(SP.s,p.x,p.y,z,z,(f<.2?f/.2:1)*(1-f)*(.09+.18*nn))}
 g.globalCompositeOperation='lighter';g.globalAlpha=1}
/* bell: chamber barrel, throat, parabola-ish contour with cooling-tube lines and stiffening rings */
function bellSS(r,ts,px){
 const rth=11*u,len=nx-ts,h=t=>rth+(r-rth)*(1-Math.pow(1-t,1.8)),n=26,mr=22*u;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createLinearGradient(0,ny-mr,0,ny+mr);[[0,'#2a2f3a'],[.4,'#8f99aa'],[.55,'#c4cbd6'],[1,'#20252f']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.fillStyle=gd;g.beginPath();g.moveTo(px,ny-mr);g.lineTo(ts-26*u,ny-mr);g.lineTo(ts,ny-rth);g.lineTo(ts,ny+rth);g.lineTo(ts-26*u,ny+mr);g.lineTo(px,ny+mr);g.closePath();g.fill();
 gd=g.createLinearGradient(0,ny-r,0,ny+r);[[0,'#4a3320'],[.3,'#b88c52'],[.5,'#e6c48c'],[.7,'#a0743a'],[1,'#2e1e10']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.beginPath();g.moveTo(ts,ny-rth);for(let i=1;i<=n;i++){const t=i/n;g.lineTo(ts+t*len,ny-h(t))}
 for(let i=n;i>=0;i--){const t=i/n;g.lineTo(ts+t*len,ny+h(t))}g.closePath();g.fillStyle=gd;g.fill();
 g.strokeStyle='rgba(30,18,8,.38)';g.lineWidth=1.2*u;
 for(let k=-4;k<=4;k++){const f=k/4.6;g.beginPath();for(let i=0;i<=n;i++){const t=i/n,y=ny+f*h(t);i?g.lineTo(ts+t*len,y):g.moveTo(ts+t*len,y)}g.stroke()}
 g.strokeStyle='rgba(20,12,4,.55)';g.lineWidth=2.2*u;[.3,.58,.84].forEach(t=>{g.beginPath();g.moveTo(ts+t*len,ny-h(t));g.lineTo(ts+t*len,ny+h(t));g.stroke()});
 g.strokeStyle='rgba(235,225,205,.7)';g.lineWidth=2.5*u;g.beginPath();g.moveTo(nx,ny-r);g.lineTo(nx,ny+r);g.stroke();
 g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2*u;g.beginPath();g.moveTo(ts,ny-rth);g.lineTo(ts,ny+rth);g.stroke()}
/* engine bay behind the gimbal: sealed casing, or exposed pumps, ducts and the two gimbal actuators */
function baySS(px,gm){
 const fh=74*u,bx=px-4*u,co=Math.cos(gm),si=Math.sin(gm),rot=(dx,dy)=>[px+dx*co-dy*si,ny+dx*si+dy*co];
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(!exposed){g.fillStyle=metal(fh);g.fillRect(-60,ny-fh,bx+60,fh*2);g.fillStyle='#0a0c10';g.fillRect(bx-3*u,ny-fh,3*u,fh*2);return}
 g.fillStyle='#0b0d11';g.fillRect(-60,ny-fh,bx+60,fh*2);
 const cyl=(x,y0,y1,w)=>{const gd=g.createLinearGradient(x-w/2,0,x+w/2,0);gd.addColorStop(0,'#1d2330');gd.addColorStop(.4,'#8f99aa');gd.addColorStop(1,'#20262f');g.fillStyle=gd;g.fillRect(x-w/2,y0,w,y1-y0)};
 cyl(px-100*u,ny-fh*.93,ny-10*u,40*u);cyl(px-52*u,ny+10*u,ny+fh*.93,36*u);
 g.lineCap='round';
 g.strokeStyle='#b0703a';g.lineWidth=9*u;g.beginPath();g.moveTo(px-84*u,ny-36*u);g.lineTo(bx-4*u,ny-26*u);g.stroke();
 g.strokeStyle='#8f99aa';g.lineWidth=7*u;g.beginPath();g.moveTo(px-38*u,ny+34*u);g.lineTo(bx-4*u,ny+22*u);g.stroke();
 g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5*u;g.beginPath();g.moveTo(px-84*u,ny-39*u);g.lineTo(bx-4*u,ny-29*u);g.moveTo(px-38*u,ny+31*u);g.lineTo(bx-4*u,ny+19*u);g.stroke();
 [[-1,-26],[1,26]].forEach(a=>{const ax=px-135*u,ay=ny+a[0]*fh*.9,l=rot(14*u,a[1]*u),mx=ax+(l[0]-ax)*.55,my=ay+(l[1]-ay)*.55;
  g.strokeStyle='#2a313d';g.lineWidth=11*u;g.beginPath();g.moveTo(ax,ay);g.lineTo(mx,my);g.stroke();
  g.strokeStyle='#c4cbd6';g.lineWidth=4*u;g.beginPath();g.moveTo(mx,my);g.lineTo(l[0],l[1]);g.stroke();
  g.fillStyle='#e4e8ee';g.beginPath();g.arc(l[0],l[1],3.2*u,0,6.283);g.fill();g.beginPath();g.arc(ax,ay,3.4*u,0,6.283);g.fill()});
 g.lineCap='butt'}
/* rear view: looking up the bell, tube-wall rings shrinking to a glowing throat */
function rearSS(){
 const cx=W*.44,cy=H*.5,T=simT,R=Math.min(W,H)*.34,nn=N*fu,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),rth=R*.13;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createRadialGradient(cx,cy,R,cx,cy,R*1.4);gd.addColorStop(0,'#3a404c');gd.addColorStop(1,'#10131a');g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R*1.4,0,6.283);g.fill();
 for(let i=0;i<16;i++){const t=i/16,rr=R*(1-Math.pow(t,.7)*.87),b=(1-t*.9)*.3;g.fillStyle=`rgb(${190*b|0},${140*b|0},${84*b|0})`;g.beginPath();g.arc(cx,cy,rr,0,6.283);g.fill();g.strokeStyle='rgba(20,12,4,.35)';g.lineWidth=1.2;g.stroke()}
 g.strokeStyle='rgba(20,12,4,.22)';g.lineWidth=1;g.beginPath();for(let k=0;k<96;k++){const a=k/96*6.283;g.moveTo(cx+Math.cos(a)*rth,cy+Math.sin(a)*rth);g.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R)}g.stroke();
 g.fillStyle='#02030a';g.beginPath();g.arc(cx,cy,rth*.9,0,6.283);g.fill();
 g.globalCompositeOperation='lighter';
 gd=g.createRadialGradient(cx,cy,0,cx,cy,R);gd.addColorStop(0,`rgba(190,210,255,${nn*.7*fl})`);gd.addColorStop(.5,`rgba(120,150,255,${nn*.22*fl})`);gd.addColorStop(1,`rgba(255,140,80,${nn*.05})`);
 g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();
 blob(SP.w,cx,cy,rth*4.5,rth*4.5,nn*.8*fl);blob(SP.c,cx,cy,R*.8,R*.8,nn*.35*fl);
 g.lineWidth=3;for(let i=0;i<4;i++){g.strokeStyle=`rgba(210,225,255,${nn*.4*(1-i/5)})`;g.beginPath();g.arc(cx,cy,R*(.2+i*.09),0,6.283);g.stroke()}
 blob(SP.y,cx,cy,R*2.4,R*2.4,ign*.8);blob(SP.o,cx,cy,R*4,R*4,nn*.05*fl);g.globalAlpha=1}

/* heat haze: re-sample the frame behind the plume in two seamless passes (columns wobble vertically, then rows wobble
   sideways, both travelling downstream), feather the result with a radial mask, lay it back over the original */
function haze(){
 const k=M.hzk();if(k<.03||Q<1)return;
 const T=simT,rad=view==2;let x0,y0,x1,y1,gcx,gcy,grx,gry;
 if(rad){const R=Math.min(W,H)*.34,c=W*.44;x0=c-R*1.3;x1=c+R*1.3;y0=H*.5-R*1.3;y1=H*.5+R*1.3;gcx=c;gcy=H*.5;grx=gry=R*1.3}
 else{const hz=M.hzg(),hw=hz[0]*u*zm,ln=hz[1]*u*zm;x0=nx;x1=nx+ln;y0=ny-hw*1.5;y1=ny+hw*1.5;gcx=x0+(x1-x0)*.38;gcy=ny;grx=(x1-x0)*.62;gry=hw*1.5}
 x0=Math.max(0,Math.floor(x0));x1=Math.min(W,Math.ceil(x1));y0=Math.max(0,Math.floor(y0));y1=Math.min(H,Math.ceil(y1));
 const w=x1-x0,h=y1-y0;if(w<24||h<24)return;
 const amp=M.hza()*u*Math.sqrt(zm)*D*(rad?.45:1),pad=Math.ceil(amp)+3,sw=Math.ceil(w*D),sh=Math.ceil(h*D),tw=sw+pad*2,th=sh+pad*2;
 if(HS.width<tw||HS.height<th){const nw=Math.max(HS.width,tw),nh=Math.max(HS.height,th);HS.width=HD.width=nw;HS.height=HD.height=nh}
 hs.globalCompositeOperation='copy';hs.drawImage(cv,Math.round(x0*D),Math.round(y0*D),sw,sh,pad,pad,sw,sh);
 hd.globalCompositeOperation='source-over';hd.clearRect(0,0,tw,th);
 const cw=Math.max(2,Math.round(3*u*(Q==1?2:1))),cwp=Math.max(2,Math.round(cw*D)),fs=T*(9+A*9),fq=.04/u;
 /* pass 1: columns, vertical shift */
 for(let px=0;px<sw;px+=cwp){const X=x0+(px+cwp*.5)/D,env=rad?1:sm(0,90*u*zm,X-nx),
   p2=X*fq-fs+(rad?Math.hypot(X-gcx,0)*.02:0),dy=Math.round(env*amp*(Math.sin(p2)+.3*Math.sin(p2*2.3+T*5)));
  hd.drawImage(HS,pad+px,pad+dy,cwp,sh,pad+px,pad,cwp,sh)}
 /* pass 2: rows, sideways shift (smaller) */
 if(Q>1){hs.globalCompositeOperation='copy';hs.drawImage(HD,0,0);hd.clearRect(0,0,tw,th);
 const rh=Math.max(2,Math.round(3*u*D));
 for(let py=0;py<sh;py+=rh){const Y=y0+(py+rh*.5)/D,p3=Y*fq*1.3-fs*.8+T*3,dx=Math.round(amp*.55*(Math.sin(p3)+.3*Math.sin(p3*2.1+1.7)));
  hd.drawImage(HS,pad+dx,pad+py,sw,Math.min(rh,sh-py),pad,pad+py,sw,Math.min(rh,sh-py))}}
 /* feather */
 hd.globalCompositeOperation='destination-in';hd.save();hd.translate(pad+(gcx-x0)*D,pad+(gcy-y0)*D);hd.scale(grx*D,gry*D);
 const mg=hd.createRadialGradient(0,0,0,0,0,1);mg.addColorStop(0,`rgba(0,0,0,${Math.min(1,k*1.6)})`);mg.addColorStop(.55,`rgba(0,0,0,${Math.min(.9,k*1.4)})`);mg.addColorStop(1,'rgba(0,0,0,0)');
 hd.fillStyle=mg;hd.fillRect(-(pad+(gcx-x0)*D)/(grx*D),-(pad+(gcy-y0)*D)/(gry*D),tw/(grx*D),th/(gry*D));hd.restore();
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.drawImage(HD,pad,pad,sw,sh,x0,y0,w,h)}
/* bloom: downsample, square to keep only the bright parts, add back blurred */
function bloom(){
 const k=M.blk();if(k<.03||Q<1)return;
 b0.globalCompositeOperation='copy';b0.drawImage(cv,0,0,B0.width,B0.height);
 b1.globalCompositeOperation='copy';b1.drawImage(B0,0,0,B1.width,B1.height);
 b1.globalCompositeOperation='multiply';b1.drawImage(B1,0,0);
 b2.globalCompositeOperation='copy';b2.drawImage(B1,0,0,B2.width,B2.height);
 g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,k*.8);g.drawImage(B2,0,0,W,H);g.globalAlpha=Math.min(1,k*.4);g.drawImage(B1,0,0,W,H);
 g.globalAlpha=1;g.globalCompositeOperation='source-over'}
function draw(dt,dr){
 if(G3){g.setTransform(D,0,0,D,0,0);g.clearRect(0,0,W,H);try{G3.render(dt,dr)}catch(e){console.error(e);fail3D()}return}
 zm+=(ZT[view]-zm)*(1-Math.exp(-dr*5));sky();
 const sh=M.shk()*u,r=M.r(),T=simT,jx=Math.sin(T*191)+Math.sin(T*313+1.3),jy=Math.sin(T*227+.4)+Math.sin(T*359+2.1);
 g.save();g.translate(jx*sh*.25,jy*sh*.25);
 if(view==2)M.rear();else{g.translate(nx,ny);g.scale(zm,zm);g.translate(-nx,-ny);M.draw(r,dt)}
 g.restore();
 haze();bloom();
 if(kick>.02){g.globalCompositeOperation='lighter';g.fillStyle=`rgba(255,220,180,${kick*.3})`;g.fillRect(0,0,W,H)}
 g.globalCompositeOperation='source-over';g.globalAlpha=1}

/* ---------- cockpit gauges: N1, EGT, fuel flow, plus annunciator lamps (drawn on the canvas so clips include them) ---------- */
function gauges(dr){
 if(!FC.length)return;
 {const hb=$('hud').getBoundingClientRect().bottom+18;if(Math.abs(hb-gy)>1)gy=hb}
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 const vals=M.gv(),R=dsz/2,jit=N+A+stl*3;
 for(let i=0;i<3;i++){const c=GC[i],x=gx+i*(dsz+8),y=gy,cx=x+R,cy=y+R;
  g.fillStyle='#6c7482';g.font=`9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText(c.cap,cx,y-8);
  g.drawImage(FC[i],x,y,dsz,dsz);
  const v=Math.max(c.min,Math.min(c.max*1.03,vals[i]+(Math.random()-.5)*c.max*.006*jit));
  GV[i]+=(v-GV[i])*(1-Math.exp(-dr*12));
  const q=A0+(GV[i]-c.min)/(c.max-c.min)*SW,co=Math.cos(q),si=Math.sin(q);
  g.strokeStyle='#ff9a3a';g.lineWidth=Math.max(1.5,dsz*.026);g.lineCap='round';g.beginPath();g.moveTo(cx-co*R*.12,cy-si*R*.12);g.lineTo(cx+co*R*.8,cy+si*R*.8);g.stroke();g.lineCap='butt';
  g.fillStyle='#1a1e26';g.strokeStyle='#6a7282';g.lineWidth=1;g.beginPath();g.arc(cx,cy,R*.09,0,6.283);g.fill();g.stroke();
  g.fillStyle='#d8dde6';g.font=`600 ${dsz*.13}px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText(c.f(vals[i]),cx,cy+R*.68)}
 const ly=gy+dsz+6,lh=16,lamps=[[sT>0?'STALL':ph==3?M.off:'START',sT>0?simT*8%1<.6:ph==1||ph==3,sT>0?'#e0392b':ph==3?'#d9822b':'#3fcf7a']].concat(M.lp());
 g.font=`600 9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';
 lamps.forEach((l,i)=>{const x=gx+i*(dsz+8);g.fillStyle=l[1]?l[2]:'rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,ly,dsz,lh);g.strokeRect(x+.5,ly+.5,dsz-1,lh-1);g.fillStyle=l[1]?'#0a0c10':'#3a404c';g.fillText(l[0],x+dsz/2,ly+lh/2+.5)});
 /* engine master switch */
 const sy=ly+lh+8,sw=3*dsz+16,sh=26,on=ph==1||ph==2,tx=gx+68;SWR={x:gx,y:sy,w:sw,h:sh};
 g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(gx,sy,sw,sh);g.strokeRect(gx+.5,sy+.5,sw-1,sh-1);
 g.font=`600 10px ${MONO}`;g.textAlign='left';g.textBaseline='middle';g.fillStyle='#6c7482';g.fillText('ENGINE',gx+10,sy+sh/2+.5);
 g.fillStyle=on?'#1f5a38':'#232a36';g.strokeStyle=on?'#3fcf7a':'#4a5160';g.beginPath();g.arc(tx+8,sy+sh/2,8,Math.PI/2,Math.PI*1.5);g.arc(tx+30,sy+sh/2,8,-Math.PI/2,Math.PI/2);g.closePath();g.fill();g.stroke();
 g.fillStyle='#d8dde6';g.beginPath();g.arc(on?tx+30:tx+8,sy+sh/2,5.5,0,6.283);g.fill();
 g.textAlign='right';const msg=ph==1?M.st:ph==2?'RUN':N>.02?M.cl:'OFF';g.fillStyle=on?'#3fcf7a':N>.02?'#ff9a3a':'#6c7482';g.fillText(msg,gx+sw-10,sy+sh/2+.5);
 g.textAlign='left';
 /* SR-71 inlet spike schematic: beside the dials if there is room, else under the switch */
 if(M.inset){const rx=gx+sw+14,av=W-150-(M.nozzle?100:0)-rx,fn=M.insetF||(M.spike?spikeInset:M.orbit?orbitInset:hoverInset);
  if(av>=140)fn(rx,gy,Math.min(230,av),dsz+34);
  else{const y2=sy+sh+8,w2=Math.min(230,W-170-gx);if(w2>=150&&y2+58<ny-80*u)fn(gx,y2,w2,58)}}}
/* turboprop panel: a blade section at its pitch angle to the plane of rotation, the thrust arrow, and where the thrust comes from */
function propInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('PROPELLER',x+8,y+11);
 const cs=ph==2&&prp>.97;g.textAlign='right';g.fillStyle=beta>80?'#d9822b':cs?'#3fcf7a':'#6c7482';g.fillText(beta>80?'FEATHERED':cs?'CONSTANT SPEED':'',x+w-8,y+11);
 const s2=h-22,bx=x+8,cx=bx+s2/2,cy=y+16+s2*.62,b=beta*Math.PI/180,L2=s2*.34,T=tpT();
 g.strokeStyle='#4a5160';g.setLineDash([3,3]);g.beginPath();g.moveTo(bx,cy);g.lineTo(bx+s2,cy);g.stroke();g.setLineDash([]);
 g.fillStyle='#6c7482';g.textAlign='left';g.fillText('\u2192 SPIN',bx,cy+9);
 g.save();g.translate(cx,cy);g.rotate(-b);g.fillStyle='#b4bccb';g.beginPath();g.moveTo(L2,0);g.quadraticCurveTo(0,-L2*.2,-L2,-L2*.04);g.quadraticCurveTo(-L2*1.04,0,-L2,L2*.05);g.quadraticCurveTo(0,L2*.08,L2,0);g.fill();g.restore();
 const al=Math.min(s2*.5,3+T/140e3*s2*.48);g.strokeStyle='#ff9a3a';g.fillStyle='#ff9a3a';g.lineWidth=2;g.beginPath();g.moveTo(cx,cy-4);g.lineTo(cx,cy-4-al);g.stroke();g.lineWidth=1;
 if(al>6){g.beginPath();g.moveTo(cx,cy-8-al);g.lineTo(cx-4,cy-2-al);g.lineTo(cx+4,cy-2-al);g.closePath();g.fill()}
 g.textAlign='left';const tx=x+s2+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['PROPS','\u2248'+(T/1000).toFixed(0)+' kN'],['JET',(ph==2?TPJ*N*fu/1000:0).toFixed(1)+' kN'],['SHAFT',(tpP()/1e6).toFixed(1)+' MW'],['BLADE',beta.toFixed(0)+'\u00b0']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle='#d8dde6';g.fillText(l[1],tx+46,ty+i*lh)})}
/* sky crane panel: side view of descent stage, bridles and rover over the ground (to scale, 40 m tall) */
function craneInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('SKY CRANE',x+8,y+11);
 const stt=sc.done?'ROVER DOWN':sc.fly?'FLYAWAY':sc.cut?'BRIDLES CUT':sc.td?'TOUCHDOWN':sc.bl>.05?'LOWERING':'DESCENT';g.textAlign='right';g.fillStyle=sc.td?'#3fcf7a':'#ff9a3a';g.fillText(stt,x+w-8,y+11);
 const s2=h-22,bx=x+8,gy2=y+16+s2-3,k=(s2-8)/40,Y=v=>gy2-Math.min(40,Math.max(0,v))*k,ry=Math.max(0,skyRy()),cx=bx+s2*.4;
 g.strokeStyle='#7a4a30';g.beginPath();g.moveTo(bx,gy2);g.lineTo(bx+s2,gy2);g.stroke();
 const rw=Math.max(5,3*k),rh=Math.max(3,RH*k);g.fillStyle='#d8dde6';g.fillRect(cx-rw/2,Y(ry)-rh,rw,rh);
 if(!sc.done){const sx=Math.min(bx+s2-4,cx+sc.x*k),sy=Y(alt),sw=Math.max(6,3.2*k),sh=Math.max(2.5,1.2*k);
  g.strokeStyle='rgba(232,228,216,.8)';if(sc.bl>.05&&!sc.cut){g.beginPath();g.moveTo(sx,sy);g.lineTo(cx,Y(ry)-rh);g.stroke()}
  g.fillStyle='#c8a050';g.fillRect(sx-sw/2,sy-sh,sw,sh);if(ph==2&&N>.02){g.fillStyle='rgba(255,154,58,.8)';g.fillRect(sx-sw/2,sy,1.5,2+N*6);g.fillRect(sx+sw/2-1.5,sy,1.5,2+N*6)}}
 g.textAlign='left';const tx=x+s2+18,lh=Math.min(13,(h-22)/4),ty=y+24,m=sc.td||sc.cut?MS:MS+MR,tw=sc.T/(m*GM);
 [['ROVER',ry.toFixed(1)+' m'],['V/S',(sc.td?0:vz).toFixed(2)+' m/s'],['T/W',tw.toFixed(2)],['ENGINES',sc.act==8?'8 LIT':'4 + 4 AT 1%']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle=l[0]=='T/W'&&tw>1?'#3fcf7a':'#d8dde6';g.fillText(l[1],tx+50,ty+i*lh)})}
/* Harrier hover panel: side view of the jet over the pad, thrust vector arrow, height, vertical speed, lift/weight */
function hoverInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('HOVER',x+8,y+11);
 g.textAlign='right';g.fillStyle=alt>.05?'#3fcf7a':'#6c7482';g.fillText(alt>.05?'AIRBORNE':'ON PAD',x+w-8,y+11);
 const cs=h-22,bx=x+8,by=y+16,T=harT(),lw=T*Math.sin(nz*Math.PI/180)/(HM*G0),gy2=by+cs-3,py=gy2-6-Math.min(1,alt/30)*(cs-16),px=bx+cs*.45,a=nz*Math.PI/180,al2=6+Math.min(1.3,T/(HM*G0))*12;
 g.strokeStyle='#4a5160';g.beginPath();g.moveTo(bx,gy2);g.lineTo(bx+cs,gy2);g.stroke();
 g.strokeStyle='#ff9a3a';g.lineWidth=2;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*al2,py+Math.sin(a)*al2);g.stroke();g.lineWidth=1;
 g.fillStyle='#b4bccb';g.beginPath();g.moveTo(px-12,py);g.lineTo(px+10,py-1.5);g.lineTo(px+12,py+1.5);g.lineTo(px-12,py+2.5);g.closePath();g.fill();
 g.textAlign='left';const tx=x+cs+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['ALT',(alt*3.281).toFixed(0)+' ft'],['V/S',(vz*196.85).toFixed(0)+' fpm'],['LIFT/WT',lw.toFixed(2)],['FWD',(T*Math.cos(a)/1000).toFixed(1)+' kN']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle=l[0]=='LIFT/WT'&&lw>1?'#3fcf7a':'#d8dde6';g.fillText(l[1],tx+52,ty+i*lh)})}
/* what-if orbit raising: Earth, the orbit (altitude exaggerated), the spiral so far, mission clock */
function orbitInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('ORBIT (WHAT-IF)',x+8,y+11);
 g.textAlign='right';g.fillStyle=sl?'#ff9a3a':'#6c7482';g.fillText('WARP '+WN[sl],x+w-8,y+11);
 const al=(orb.r-RE)/1e3,cs=h-22,cx=x+8+cs/2,cy=y+16+cs/2,er=cs*.26,orr=a=>er*(1+a/6371*6);
 g.fillStyle='#1b3c78';g.beginPath();g.arc(cx,cy,er,0,6.283);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(cx-er*.25,cy-er*.25,er*.55,0,6.283);g.fill();
 g.strokeStyle='rgba(120,160,255,.35)';g.beginPath();g.arc(cx,cy,Math.min(cs*.5,orr(al)),0,6.283);g.stroke();
 if(orb.tr.length>1){g.strokeStyle='rgba(120,180,255,.8)';g.beginPath();orb.tr.forEach((p,i)=>{const r=Math.min(cs*.5,orr(p[0])),X=cx+Math.cos(-p[1])*r,Y=cy+Math.sin(-p[1])*r;i?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke()}
 const rr=Math.min(cs*.5,orr(al));g.fillStyle='#ffd27a';g.beginPath();g.arc(cx+Math.cos(-orb.vph)*rr,cy+Math.sin(-orb.vph)*rr,2.6,0,6.283);g.fill();
 g.textAlign='left';g.fillStyle='#d8dde6';const tx=x+cs+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['DAY',(orb.t/86400).toFixed(2)],['ALT',al.toFixed(1)+' km'],['\u0394v',orb.dv.toFixed(1)+' m/s'],['XENON',orb.xe.toFixed(2)+' kg']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle='#d8dde6';g.fillText(l[1],tx+44,ty+i*lh)})}
/* cutaway of the inlet: cowl, translating spike, shock lines running from the tip to the cowl lip */
function spikeInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('INLET SPIKE',x+8,y+11);
 g.textAlign='right';g.fillStyle=spk>.03?'#ff9a3a':'#6c7482';g.fillText('M'+mach.toFixed(1)+'  '+(spk*26).toFixed(0)+' IN AFT',x+w-8,y+11);
 const cy=y+11+(h-11)/2,hh=(h-26)*.44,x0=x+10,len=w-20,X=f=>x0+f*len;
 g.lineWidth=2;g.strokeStyle='#8f99aa';
 for(let s=-1;s<=1;s+=2){g.beginPath();g.moveTo(X(.02),cy+s*hh*1.12);g.lineTo(X(.3),cy+s*hh*.78);g.lineTo(X(.56),cy+s*hh*.52);g.lineTo(X(.8),cy+s*hh*.62);g.lineTo(X(.97),cy+s*hh*.62);g.stroke()}
 const tx=.08+spk*.24,cr=hh*.34;   /* tip travels aft with spk */g.fillStyle='#b4bccb';g.beginPath();g.moveTo(X(tx),cy);g.lineTo(X(tx+.3),cy-cr);g.lineTo(X(.8),cy-cr);g.lineTo(X(.8),cy+cr);g.lineTo(X(tx+.3),cy+cr);g.closePath();g.fill();
 g.fillStyle='#3a404c';g.fillRect(X(.8),cy-hh*.62,len*.17,hh*1.24);
 const sa=.18+.7*sm(1,2.6,mach);g.lineWidth=1.3;g.strokeStyle=`rgba(120,200,255,${sa})`;
 for(let s=-1;s<=1;s+=2){g.beginPath();g.moveTo(X(tx),cy);g.lineTo(X(.3),cy+s*hh*.78);g.stroke()}
 g.fillStyle='rgba(160,210,255,.6)';for(let k=0;k<5;k++){const f=((simT*(.15+mach*.3)+k*.2)%1)*.78+.04;g.fillRect(X(f),cy+(k%2?1:-1)*hh*.55-1,3,2)}
 g.textAlign='left'}
cv.addEventListener('pointerdown',e=>{const r=SWR;if(ph&&e.clientX>=r.x&&e.clientX<=r.x+r.w&&e.clientY>=r.y&&e.clientY<=r.y+r.h){seqStop(false);master()}});

/* ---------- slow-mo + clip recording ---------- */
let rec=null,recCh=[],recT=0,recMime='',clipURL=null,clipFile=null,recLast=-2;
const RC=mk(8,8),rc=RC.getContext('2d');   /* clips are captured from this composite: canvas + mirrored lever + watermark */
const canRec=!!(window.MediaRecorder&&RC.captureStream);
function startRec(){
 if(!canRec||rec||!ph)return;
 try{
  RC.width=cv.width;RC.height=cv.height;const vs=RC.captureStream(60);if(S.dst)S.dst.stream.getAudioTracks().forEach(t=>vs.addTrack(t));
  recMime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
  const o={videoBitsPerSecond:7e6};if(recMime)o.mimeType=recMime;
  const m=new MediaRecorder(vs,o);recCh=[];m.ondataavailable=e=>{if(e.data&&e.data.size)recCh.push(e.data)};m.onstop=showClip;m.start(250);rec=m;recT=performance.now()
 }catch(e){rec=null}}
function stopRec(){if(rec&&rec.state!=='inactive')rec.stop()}
function showClip(){
 const type=(recMime||'video/webm').split(';')[0],ext=type.includes('mp4')?'mp4':'webm',blob=new Blob(recCh,{type});rec=null;recCh=[];recLast=-2;
 if(clipURL)URL.revokeObjectURL(clipURL);clipURL=URL.createObjectURL(blob);clipFile=new File([blob],'throttle-up.'+ext,{type});
 const v=$('clipv');v.src=clipURL;$('clip').style.display='flex';
 $('shr').style.display=(navigator.canShare&&navigator.canShare({files:[clipFile]}))?'':'none';
 if(AC)AC.suspend();v.play().catch(()=>{})}
$('sv').onclick=()=>{const a=document.createElement('a');a.href=clipURL;a.download=clipFile.name;document.body.appendChild(a);a.click();a.remove()};
$('shr').onclick=()=>{navigator.share({files:[clipFile],title:'Throttle Up'}).catch(()=>{})};
$('cls').onclick=()=>{$('clip').style.display='none';const v=$('clipv');v.pause();v.removeAttribute('src');v.load();if(AC)AC.resume()};
function recLab(){const b=document.querySelector('#ctl [data-k=rec]');
 if(!canRec){if(recLast!==-9){recLast=-9;b.textContent='REC N/A';b.style.opacity=.4}return}
 const s=rec?Math.floor((performance.now()-recT)/1000):-1;if(s===recLast)return;recLast=s;
 b.textContent=rec?'● STOP '+(s/60|0)+':'+String(s%60).padStart(2,'0'):'● REC';b.style.color=rec?'#ff6a5a':''}
/* the DOM lever isn't part of the canvas, so mirror it into the frame while recording */
function recOverlay(x){
 const b=TR;x.globalCompositeOperation='source-over';x.globalAlpha=1;
 x.fillStyle='#0e1118';x.strokeStyle='#2a3040';x.lineWidth=1;x.fillRect(b.left,b.top,b.width,b.height);x.strokeRect(b.left+.5,b.top+.5,b.width-1,b.height-1);
 if(M.ab){const zh=b.height*.3,gd=x.createLinearGradient(0,b.top,0,b.top+zh);gd.addColorStop(0,'#ff8a2a');gd.addColorStop(1,'#5a2208');x.globalAlpha=.25+A*.75;x.fillStyle=gd;x.fillRect(b.left+1,b.top+1,b.width-2,zh);x.globalAlpha=1}
 const hy=b.bottom-L*b.height;x.fillStyle='#2f3541';x.strokeStyle='#6a7282';x.fillRect(b.left-26,hy-17,64,34);x.strokeRect(b.left-25.5,hy-16.5,63,33);
 x.fillStyle='#6c7482';x.font=`10px ${MONO}`;x.textAlign='right';x.textBaseline='middle';
 M.lv.forEach(l=>x.fillText(l[0],b.left-6,l[2]=='t'?b.top+7:l[2]=='b'?b.bottom-7:b.bottom-l[1]*b.height));
 if(M.nozzle){const c=$('trk2').getBoundingClientRect(),y2=c.bottom-raw2*c.height;x.fillStyle='#0e1118';x.strokeStyle='#2a3a44';x.fillRect(c.left,c.top,c.width,c.height);x.strokeRect(c.left+.5,c.top+.5,c.width-1,c.height-1);x.fillStyle='#2a343a';x.strokeStyle='#6a8a9a';x.fillRect(c.left-20,y2-15,52,30);x.strokeRect(c.left-19.5,y2-14.5,51,29);
  x.fillStyle='#7f98a6';x.textAlign='right';M.lv2.forEach(l=>x.fillText(l[0],c.left-6,l[2]=='t'?c.top+7:l[2]=='b'?c.bottom-7:c.bottom-l[1]*c.height))}
 x.fillStyle='rgba(216,221,230,.5)';x.textAlign='right';x.fillText('THROTTLE UP',W-18,H-12);x.textAlign='left'}

/* ---------- main loop: sim time is scaled by the slow-mo factor, input and UI run in real time ---------- */
function ui(){
 $('hd').style.bottom=L*100+'%';$('hd').style.boxShadow=`0 2px 6px #000,0 0 ${A*34}px rgba(255,140,40,${A})`;
 $('abz').style.opacity=.25+A*.75;if(M.nozzle)$('hd2').style.bottom=raw2*100+'%'}
function adapt(dr){emaT+=(dr*1000-emaT)*.05;if(QP===null&&Q>0&&ph&&!document.hidden){if(emaT>26){slowT+=dr;if(slowT>1.5){Q--;slowT=0;emaT=16}}else slowT=0}}
function frame(t){
 const dr=Math.min(.05,(t-last)/1000||.016);last=t;adapt(dr);
 Lrate+=((L-Lp)/Math.max(dr,.004)-Lrate)*(1-Math.exp(-dr/.07));Lp=L;
 TS+=(tsT-TS)*(1-Math.exp(-dr*5));const dt=dr*TS;simT+=dt;
 seqTick(dr);keys(dr);update(dt);audio();draw(dt,dr);gauges(dr);if(G3)G3.overlay();seqCap();
 if(rec){if(performance.now()-recT>60000)stopRec();else{rc.setTransform(1,0,0,1,0,0);rc.globalCompositeOperation='source-over';rc.globalAlpha=1;if(G3)rc.drawImage(G3.canvas,0,0,RC.width,RC.height);rc.drawImage(cv,0,0);rc.setTransform(D,0,0,D,0,0);recOverlay(rc)}}
 recLab();ui();if(!MAN)requestAnimationFrame(frame)}
/* test hook: ?manual stops the loop so a slow test machine can step frames one at a time */
const MAN=new URLSearchParams(location.search).has('manual');function step(n=1,ms=16){for(let i=0;i<n;i++)frame(last+ms)}
MC.forEach((m,i)=>{const b=document.createElement('button');b.textContent=m.btn;b.onclick=e=>{e.stopPropagation();setMachine(i)};$('mch').appendChild(b)});
setMachine(Math.min(MC.length-1,Math.max(0,+new URLSearchParams(location.search).get('m')||0)));
/* ---------- 3D renderer loader: Three.js from the CDN; anything goes wrong (no WebGL2, offline, error) and the 2D renderer above carries on ---------- */
function ready3D(ok,X){if(R3done)return;R3done=true;
 if(ok){try{G3=init3D(X.T,X);SN.splice(0,3,'DUSK','DAY','NIGHT');$('gl').addEventListener('webglcontextlost',e=>{e.preventDefault();fail3D()})}catch(e){console.error('3D init failed',e);G3=null}}
 if(!G3)$('gl').style.display='none';document.querySelector('#ov span').textContent='START ENGINE';chips();lab()}
function fail3D(){G3=null;lens=0;$('gl').style.display='none';SN.splice(0,3,'VOID','DESERT DAWN','NIGHT');chips();lab()}
resize();if(!MAN)requestAnimationFrame(frame);
(function(){document.querySelector('#ov span').textContent='LOADING 3D...';
 if(new URLSearchParams(location.search).get('r')==='2d'){ready3D(false);return}
 const to=setTimeout(()=>ready3D(false),20000);
 Promise.all(['three','three/addons/postprocessing/EffectComposer.js','three/addons/postprocessing/ShaderPass.js','three/addons/postprocessing/UnrealBloomPass.js','three/addons/postprocessing/OutputPass.js'].map(m=>import(m)))
 .then(([T,a,b,c,d])=>{clearTimeout(to);ready3D(true,{T,EffectComposer:a.EffectComposer,ShaderPass:b.ShaderPass,UnrealBloomPass:c.UnrealBloomPass,OutputPass:d.OutputPass})})
 .catch(e=>{console.error(e);clearTimeout(to);ready3D(false)})})();
/* =====================================================================================
   3D RENDERER (Three.js). The simulation above is unchanged; this only draws it.
   World units are metres, Y up. Each engine's exhaust axis is its local +X.
   Pipeline per frame: scene -> HDR target with depth; volumetric plume -> half-res target
   (ray-marched, stops at scene depth, alpha carries heat for the haze); composite (haze + plume + flash)
   -> bloom -> ACES tone map.
   ===================================================================================== */
function init3D(T,X){
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
const pm=new T.PMREMGenerator(R);let envRT=null;

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
const sKey=s=>(CFG[mi].space?3:CFG[mi].mars?6:0)+s;
let curS=-1,curP=SCN[0];
function applyScene(s){const sp=!!(CFG[mi]&&CFG[mi].space),mr=!!(CFG[mi]&&CFG[mi].mars),c=(sp?SCNS:mr?SCNM:SCN)[s];curS=sKey(s);curP=c;skyU.uSpace.value=sp?1:0;
 skyU.uZen.value.set(...c.zen);skyU.uHor.value.set(...c.hor);skyU.uGnd.value.set(...c.gnd);skyU.uSun.value.set(...c.sun).normalize();skyU.uSunC.value.set(...(c.glow||c.sunC));skyU.uSunI.value=c.sunI;skyU.uStars.value=c.stars;
 scn.fog=sp?null:new T.FogExp2(col(...c.hor),c.fog);earthU.uSun.value.set(...c.sun).normalize();
 sun.color.setRGB(...c.sunC);sun.intensity=c.sunL;hemi.color.set(c.hS);hemi.groundColor.set(c.hG);hemi.intensity=c.hI;
 floods.forEach(l=>{l.intensity=c.fl*320;l.visible=!!c.fl});R.toneMappingExposure=c.exp;
 if(envRT)envRT.dispose();envRT=pm.fromScene(envScn,.02,.1,200);scn.environment=envRT.texture;
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
   const re=.45-.1*sm(.3,.95,N)+.17*A,x0=-1.05,r0=.53,len=Math.hypot(-x0,r0-re),pitch=Math.atan2(re-r0,-x0);
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;q.setFromEuler(e.set(a,0,pitch,'XYZ'));M4.compose(V3(x0,Math.cos(a)*r0,Math.sin(a)*r0),q,V3(len,1,1));flaps.setMatrixAt(i,M4);
    const a2=a+Math.PI/16;q.setFromEuler(e.set(a2,0,pitch,'XYZ'));M4.compose(V3(x0,Math.cos(a2)*(r0-.012),Math.sin(a2)*(r0-.012)),q,V3(len,1,1));seals.setMatrixAt(i,M4)}
   flaps.instanceMatrix.needsUpdate=seals.instanceMatrix.needsUpdate=true;
   actu.forEach(([a,c,rod])=>{const ca=Math.cos(a),sa=Math.sin(a),rr=.62,ext=.12+A*.18+(.45-re)*.3;c.position.set(-1.55,ca*rr,sa*rr);c.rotation.set(a,0,Math.PI/2);rod.position.set(-1.55+.25+ext*.5,ca*rr,sa*rr);rod.rotation.set(a,0,Math.PI/2);rod.scale.y=(ext+.15)/.4});
   rotor.rotation.x+=N*dt*7;linM.emissiveIntensity=fu*(.1+N*.32)*(.85+.15*Math.sin(simT*37))+ign*.4;
   const ex=exposed;outer.visible=!ex;half.visible=ex;liner.visible=split.visible=ex}}}

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
   .concat(tubeCurves.map(pts=>({w:.07,k:0,sp:1,cv:pts,r:.035,t0:.32,t1:.42,al:()=>sm(1.8,2.6,mach)}))),
  upd(dt){const o=1-sm(.6,1.2,mach);doors.forEach(h=>{h.children[0].rotation.z=-.42*o});spike.position.x=spk*.66;
   const ex=exposed;shell.visible=noz.visible=tf.visible=!ex;shellH.visible=j58H.visible=tubes.visible=inside.visible=nozH.visible=ex;
   rot.rotation.x+=N*dt*6;burnM.emissiveIntensity=fu*(.1+N*.32)*(.85+.15*Math.sin(simT*41))+ign*.4;
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
  upd(dt){const gm=gimb();gim.rotation.z=-Math.PI/2+gm*.55;gim.rotation.x=.25*gm*Math.sin(simT*.6);
  const ex=exposed;bell.visible=bellIn.visible=rgF.visible=mcc.visible=thr.visible=!ex;bellH.visible=rgH.visible=mccH.visible=ex;bellHM.emissiveIntensity=N*fu*.12;
  bellIn.material.emissiveIntensity=N*fu*.25;thr.material.color.setRGB(2+N*fu*14,2.4+N*fu*16,4+N*fu*24).multiplyScalar(fu*N+ign*.4)}}}

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
  upd(dt){const nn=N*fu,ex=exposed;[t1,t2].forEach(t=>{t.full.visible=!ex;t.half.visible=t.inner.visible=ex});
   cer.emissiveIntensity=nn*.5+ign*.6;anM.emissiveIntensity=nn*2.2+ign*2;
   t1.glow.material.color.setRGB(.6,.7,2.6).multiplyScalar(nn*1.1+ign*1.8);t2.glow.material.color.setRGB(0,0,0);
   const ht=ph==1?Math.min(1,st/2.5):0;t1.tip.material.color.setRGB(3*ht+.8*nn,1.1*ht+1.1*nn,.2*ht+2.6*nn);t2.tip.material.color.setRGB(0,0,0);
   const al=Math.max(100,(orb.r-RE)/1e3);earth.position.set(0,-(6371+al),0);earthU.uRot.value+=dt*Math.min(WF[sl],60)*Math.sqrt(MU/(orb.r*orb.r*orb.r));earthU.uT.value+=dt*Math.min(WF[sl],60)}}}

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
  upd(dt){const ex=exposed;cE.full.visible=!ex;cE.half.visible=ex;const gm=gimb();for(let k=1;k<5;k++){engines[k].gim.rotation.x=gm*.25*Math.sin(k*1.7+simT*.3)}}}}

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
  upd(dt){const ex=exposed;fus.visible=!ex;fusH.visible=ex;peg.visible=ex;rot.rotation.x+=N*dt*7;pcM.emissiveIntensity=fu*(.1+N*.3);
   AC.position.y=1.9+alt;AC.rotation.x=alt>.05?.006*Math.sin(simT*1.3):0;AC.rotation.z=alt>.05?.004*Math.sin(simT*.9+1):0;
   const a=-nz*Math.PI/180;NZ.forEach(p=>p.rotation.z=a);anchor.rotation.z=a}}}

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
  upd(dt){const ex=exposed;cow.visible=!ex;cowH.visible=ex;inn.visible=ex;
   const w=prp*dt*6.283*2.6;pF.P.rotation.x+=w;spin.rotation.x+=w;pR.P.rotation.x-=w;rot.rotation.x+=prp*dt*9;
   const b=beta*Math.PI/180;pF.piv.forEach(p=>p.rotation.y=b);pR.piv.forEach(p=>p.rotation.y=-b);
   disc.material.opacity=sm(.6,1,prp)*.09;pcM.emissiveIntensity=fu*(.15+N*.4)}}}

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
    P.push({w:.15,k:3,sp:1.2,cv:[[c*1.7,-.15,s2*1.7],[c*1.9,-.6,s2*1.9],[c*2.2,-1.4,s2*2.2],[c*2.5,-2.2,s2*2.5]],r:.12,t0:.8,t1:.2,al:()=>Math.min(1,N*3)})}return P},
  upd(dt){const vis=!sc.done;ST.visible=vis;ST.position.set(sc.x,alt,0);ST.rotation.z=-sc.pit;
   const ry=Math.max(0,skyRy()),hang=sc.bl>.3&&!sc.td;RV.position.y=ry;RV.rotation.z=hang?.012*Math.sin(simT*1.1):0;RV.rotation.x=hang?.008*Math.sin(simT*.8+1):0;
   deck.visible=!exposed;ST.updateMatrixWorld(true);RV.updateMatrixWorld(true);
   const show=vis&&(sc.bl>.04||sc.cut);
   cords.forEach((m,i)=>{m.visible=show;if(!show)return;Wa.copy(cA[i][0]);ST.localToWorld(Wa);
    if(sc.cut)Wb.set(Wa.x+.15*Math.sin(simT*2+i),Wa.y-Math.max(.3,sc.bl)*(i<3?1:.9),Wa.z+.1*Math.cos(simT*1.7+i));else{Wb.copy(cA[i][1]);RV.localToWorld(Wb)}
    Dd.copy(Wb).sub(Wa);const l=Dd.length();m.position.copy(Wa).add(Wb).multiplyScalar(.5);m.scale.set(1,Math.max(.001,l),1);m.quaternion.setFromUnitVectors(Yv,Dd.normalize())});
   LR.forEach(l=>{Wa.copy(l[3]);RV.localToWorld(Wa);ST.worldToLocal(Wa);l[1][0]=Wa.x;l[1][1]=Wa.y;l[1][2]=Wa.z});LB[1][1]=(ry+1.32-alt)/2}}}

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
let plume=null;
function setPlumeBox(L,Rm){if(plume){pscn.remove(plume);plume.geometry.dispose()}const g=new T.BoxGeometry(L,Rm*2,Rm*2);g.translate(L/2,0,0);plume=new T.Mesh(g,plMat);plume.matrixAutoUpdate=false;plume.frustumCulled=false;pscn.add(plume);PU.uBox.value.set(L,Rm)}

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
let rtM=null,rtP=null,comp=null,cpass=null,bloom=null,pr=1,QA=-1,MA=-1;
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
function setup(){QA=Q;const D2=Math.min(devicePixelRatio||1,2);pr=Q>1?Math.min(D2,1.5):Q>0?Math.min(D2,1):.7;
 const w=Math.max(2,Math.round(W*pr)),h=Math.max(2,Math.round(H*pr));
 if(rtM){rtM.dispose();rtM.depthTexture.dispose();rtP.dispose()}
 rtM=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,samples:Q>1?4:0});rtM.depthTexture=new T.DepthTexture(w,h);rtM.depthTexture.type=T.UnsignedIntType;
 const ps=Q>1?.5:Q>0?.5:.34;rtP=new T.WebGLRenderTarget(Math.max(2,w*ps|0),Math.max(2,h*ps|0),{type:T.HalfFloatType,depthBuffer:false});
 PU.tDepth.value=rtM.depthTexture;PU.uPRes.value.set(rtP.width,rtP.height);PU.uSteps.value=Q>1?30:Q>0?22:14;
 R.setPixelRatio(pr);R.setSize(W,H,false);
 sun.shadow.map&&(sun.shadow.map.dispose(),sun.shadow.map=null);const sm2=Q>1?2048:1024;sun.shadow.mapSize.set(sm2,sm2);R.shadowMap.enabled=Q>0;
 if(!comp){comp=new X.EffectComposer(R);cpass=new X.ShaderPass(CS);comp.addPass(cpass);bloom=new X.UnrealBloomPass(new T.Vector2(w,h),.4,.45,1.4);comp.addPass(bloom);comp.addPass(new X.OutputPass())}
 comp.setPixelRatio(pr);comp.setSize(W,H);bloom.enabled=Q>0;flowKey='';
 cpass.uniforms.tMain.value=rtM.texture;cpass.uniforms.tPlume.value=rtP.texture;cpass.uniforms.uRes.value.set(w,h);
 cam.aspect=W/H;cam.updateProjectionMatrix()}

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
function applyMachine(){MA=mi;ENG.forEach((e,i)=>e.G.visible=i==mi);const c=CFG[mi];setPlumeBox(c.box[0],c.box[1]);
 mountains.visible=(!!c.mt||!!c.mars)&&!c.space;trees.visible=!c.mt&&!c.space&&!c.mars;rocks.visible=!!c.mars;ground.visible=!c.space;earth.visible=!!c.space;curS=-1;gMat.map=c.mars?marsC:c.mt?lakeC:grassC;gMat.normalMap=c.mars?marsN:c.mt?lakeN:null;gMat.needsUpdate=true;
 const sc=sun.shadow.camera;sc.left=sc.bottom=-c.sh;sc.right=sc.top=c.sh;sc.near=1;sc.far=120;sc.updateProjectionMatrix();sun.target.position.set(...c.sc);placeSun();
 floods.forEach(l=>l.target.position.set(...c.sc));SPK.clear();SMK.clear();camSnap=true;yaw=pit=0;zoom=1}
function placeSun(){const c=CFG[mi]||CFG[0],d=V3(...curP.sun).normalize();sun.position.set(...c.sc).addScaledVector(d,60)}

/* ======================= camera: smooth glide between presets, drag to orbit, wheel to zoom, shake ======================= */
let yaw=0,pit=0,zoom=1,camSnap=true,dragC=null;const cP=V3(),cT=V3(),tmp=V3(),sph=new T.Spherical();
cv.addEventListener('pointerdown',e=>{const r=SWR;if(e.clientX>=r.x&&e.clientX<=r.x+r.w&&e.clientY>=r.y&&e.clientY<=r.y+r.h)return;dragC={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!dragC||e.pointerId!==dragC.id)return;yaw-=(e.clientX-dragC.x)*.006;pit+=(e.clientY-dragC.y)*.005;pit=Math.max(-.5,Math.min(.9,pit));yaw=Math.max(-2.2,Math.min(2.2,yaw));dragC.x=e.clientX;dragC.y=e.clientY});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>dragC=null));
cv.addEventListener('dblclick',()=>{yaw=pit=0;zoom=1});
cv.addEventListener('wheel',e=>{zoom=Math.max(.55,Math.min(1.9,zoom*Math.exp(e.deltaY*.001)));e.preventDefault()},{passive:false});
let lastView=-1;
function camera(dr){const c=CFG[mi].cams[view];if(view!==lastView){lastView=view;yaw=pit=0;zoom=1}
 const P0=V3(...c[0]),T0=V3(...c[1]);if(CFG[mi].space&&view==3){const h=Math.max(100,(orb.r-RE)/1e3),pc=Math.acos(6371/(6371+h))+.13,hd=V3(-1,0,.12).normalize();P0.copy(T0).addScaledVector(hd,Math.cos(pc)*12);P0.y+=Math.sin(pc)*12}if(M.camA){const a=M.camA(view);P0.y+=a[0];T0.y+=a[1];if(a[2])P0.sub(T0).multiplyScalar(a[2]).add(T0)}else if(M.hover){P0.y+=alt*.85;T0.y+=alt}const dir=P0.clone().sub(T0),d0=dir.length(),tanH=Math.tan(cam.fov*Math.PI/360)*cam.aspect;
 /* portrait phones: swing the jets round to a rear three-quarter view so engine and flame stack in depth instead of running off the sides */
 const port=cam.aspect<.85&&mi<2,hw=c[2]*(port?(view==0?.42:.7):1);
 const dist=Math.min(d0*2.6,Math.max(d0,hw/tanH))*zoom;sph.setFromVector3(dir);sph.radius=dist;sph.theta+=yaw+(port&&view==0?.72:0);sph.phi=Math.max(.15,Math.min(1.75,sph.phi-pit));
 tmp.setFromSpherical(sph).add(T0);if(!CFG[mi].space&&tmp.y<.35)tmp.y=.35;
 const k=camSnap?1:1-Math.exp(-dr*(dragC?14:3.2));cP.lerp(tmp,k);cT.lerp(T0,k);camSnap=false;
 const s=M.shk()*.0026*(view==1?.6:1),t=simT;cam.position.set(cP.x+(Math.sin(t*191)+Math.sin(t*313+1.3))*s,cP.y+(Math.sin(t*227+.4)+Math.sin(t*359+2.1))*s,cP.z+Math.sin(t*263+.8)*s);cam.lookAt(cT)}

/* ======================= per-frame plume parameters from the simulation ======================= */
const C=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
let fire=0;
function plumeParams(dt){const fl=.93+.07*Math.sin(simT*47)*Math.sin(simT*29+1),u=PU;let lc=[1,.6,.3],li=0;
 fire*=Math.exp(-dt*3.2);fire=Math.max(fire,sT>0?ign*.5:0);
 if(mi<2){u.uCl.value=0;u.uAnn.value=0;const sr=mi==1,re=sr?.62:.45-.1*sm(.3,.95,N)+.17*A,ab=sm(0,.22,A),dry=sm(.3,1,N)*fu,ig=Math.min(1,ign);
  u.uR0.value=re*.92;u.uSp.value=.04+.05*ab;u.uLen.value=(sr?2.6:2.0)+N*1.5*(1-ab)+ab*((sr?5:4)+A*(sr?9:7))+ig*2.5;
  const dC=[[.5,.62,1.5],[.25,.32,1.0],[.25,.15,.35],[.08,.03,.05]],aC=sr?[[3.4,2.6,2.2],[2.6,1.05,.4],[1.1,.24,.06],[.2,.025,0]]:[[3.2,2.4,1.5],[2.4,.95,.25],[1.0,.2,.03],[.18,.02,0]],iC=[[3,1.7,.5],[2,.7,.12],[.8,.15,.02],[.15,.015,0]];
  const mix=Math.max(ab,ig*.9,fire);['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const b=ab>=Math.max(ig*.9,fire)?aC[i]:iC[i];u[k].value.set(...C(dC[i],b,mix))});
  u.uI.value=(dry*.24*(1-ab)+ab*(.85+.75*A)+ig*.9+fire*1.1)*fl;u.uTurb.value=.35+.4*ab+fire;u.uFire.value=fire+ig*.4;
  u.uDia.value=(dry*.3*(1-ab)+A*.75)*(sr?1.1:1)*fl;u.uDiaSp.value=(sr?1.15:.95)*(.8+.4*ab)*(re/.45)**.3;u.uDiaN.value=sr?5.5:3.6;u.uDiaOff.value=.35;u.uDisk.value=0;u.uDiaR.value=.62;
  u.uDC.value.set(...(A>.05?[3.4,2.9,2.3]:[.7,.95,2.0]));u.uGreen.value=gn;
  u.uHeat.value=N*N*.55*fu+A*.8+ig*.3+fire*.6;u.uHeatLen.value=3+A*5;
  li=A*60+dry*5+ig*40+fire*25+gn*40;lc=gn>.3?[.35,1,.45]:A>.05||ig>.1||fire>.1?[1,.55,.25]:[.55,.65,1]}
 else if(mi==3){u.uCl.value=0;const nn=N*fu,ig=Math.min(1,ign),f2=.97+.03*Math.sin(simT*90);
  u.uR0.value=.058;u.uSp.value=11;u.uLen.value=.42+nn*.45;u.uTurb.value=.08;u.uFire.value=0;u.uAnn.value=.95;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.5,1.9,4.2],[.75,.85,2.8],[.4,.32,1.5],[.12,.07,.45]][i];u[k].value.set(...C(a,[3,3,4],ig*.6))});
  u.uI.value=(nn*2.8+ig*3)*f2;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=0;u.uHeatLen.value=1;
  li=nn*3+ig*4;lc=[.55,.62,1]}
 else if(mi==4){const fl2=.94+.06*Math.sin(simT*53)*Math.sin(simT*31+1),ig=Math.min(1,ign);u.uCl.value=1;u.uAnn.value=0;
  [[0,0],[2.55,2.55],[-2.55,-2.55],[2.55,-2.55],[-2.55,2.55]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=sicE[j]});u.uMR.value=4.6;u.uMg.value.set(3,11);
  u.uR0.value=1.75;u.uSp.value=.045;u.uLen.value=10+N*4;u.uTurb.value=.45+ig*.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[5,3.6,1.6],[3.4,1.5,.4],[1.4,.4,.08],[.3,.06,.01]][i]));
  u.uI.value=(N>.01?1.15:0)*fl2+ig*.8;u.uDia.value=.12*N;u.uDiaSp.value=2.2;u.uDiaN.value=2;u.uDiaOff.value=.3;u.uDisk.value=0;u.uDiaR.value=.6;u.uDC.value.set(4,3,2);u.uGreen.value=0;
  u.uHeat.value=N*1.6+ig*.5;u.uHeatLen.value=6;li=N*520+ig*220;lc=[1,.62,.3]}
 else if(mi==5){const nn=N*fu;u.uCl.value=1;u.uAnn.value=0;
  [[1.05,1.02,1],[1.05,-1.02,1],[-1,1.08,.3],[-1,-1.08,.3],[0,0,0]].forEach((o,j)=>{u.uO.value[j].set(o[0],o[1]);u.uW.value[j]=o[2]});u.uMR.value=1.5;u.uMg.value.set(2,7);
  u.uR0.value=.28;u.uSp.value=.09;u.uLen.value=2.5+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.5,.6,1.1],[.3,.35,.8],[.15,.15,.4],[.05,.04,.1]][i]));
  u.uI.value=nn*.22+Math.min(1,ign)*.6;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*nn*1.8+ign*.3;u.uHeatLen.value=3;li=nn*4+ign*20;lc=[.7,.75,1]}
 else if(mi==6){const nn=N*fu,ig=Math.min(1,ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=.42;u.uSp.value=.08;u.uLen.value=2+nn*2.5;u.uTurb.value=.4;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[.6,.5,.45],[.4,.3,.25],[.2,.15,.12],[.05,.04,.03]][i],b=[[4,2.4,.9],[2.4,.9,.2],[1,.25,.04],[.2,.03,0]][i];u[k].value.set(...C(a,b,ig))});
  u.uI.value=nn*.03+ig*.7;u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=nn*1.3+ig*.3;u.uHeatLen.value=2.5;li=ig*25;lc=[1,.6,.3]}
 else if(mi==7){const nn=N*fu,ig=Math.min(1,ign);u.uCl.value=sc.done?0:1;u.uAnn.value=0;
  for(let j=0;j<5;j++){if(j<4){const a=Math.PI/4+j*Math.PI/2;u.uO.value[j].set(Math.cos(a)*1.6,Math.sin(a)*1.6);u.uW.value[j]=Math.min(1,(sc.thr[2*j]+sc.thr[2*j+1])/MLE*.7)}else u.uW.value[j]=0}
  u.uMR.value=2.4;u.uMg.value.set(8,30);u.uR0.value=.2;u.uSp.value=.22;u.uLen.value=5+nn*8;u.uTurb.value=.35;u.uFire.value=0;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>u[k].value.set(...[[.6,.55,.85],[.32,.3,.52],[.12,.1,.2],[.03,.02,.05]][i]));
  u.uI.value=(sc.done?0:1)*(nn*.12+ig*.25);u.uDia.value=0;u.uGreen.value=0;u.uHeat.value=(sc.done?0:1)*nn*2.4;u.uHeatLen.value=4;li=(sc.done?0:1)*(nn*6+ig*8);lc=[.85,.75,1]}
 else{const nn=N*fu,ig=Math.min(1,ign);u.uCl.value=0;u.uAnn.value=0;
  u.uR0.value=1.08;u.uSp.value=.035;u.uLen.value=4.5+nn*2;u.uTurb.value=.3+ig*.6;u.uFire.value=ig*.3;
  ['uC0','uC1','uC2','uC3'].forEach((k,i)=>{const a=[[1.0,1.15,2.3],[.55,.45,1.25],[.3,.17,.55],[.12,.05,.12]][i],b=[[6,3.4,1],[4,1.4,.25],[1.6,.3,.04],[.3,.03,0]][i];u[k].value.set(...C(a,b,ig*.85))});
  u.uI.value=(nn*.6+ig*.9)*fl;u.uDia.value=nn*2.4*fl;u.uDiaSp.value=1.3;u.uDiaN.value=1.3;u.uDiaOff.value=.25;u.uDisk.value=.85;u.uDiaR.value=.6;
  u.uDC.value.set(5,4.4,4.6);u.uGreen.value=0;u.uHeat.value=nn*1.6+ig*.6;u.uHeatLen.value=3.5;
  li=nn*95+ig*80;lc=ig>.2?[1,.55,.25]:[.72,.78,1]}
 return[li*fl,lc]}

/* ======================= particle emitters ======================= */
const W3=V3(),AX=V3();let steamAcc=0,sparkAcc=0,sootAcc=0;
function axisPt(d,r,a){/* world point at distance d downstream of the exit, radius r, angle a */const e=ENG[mi].anchor;W3.set(d,Math.cos(a)*r,Math.sin(a)*r);return e.localToWorld(W3)}
function axisDir(){const e=ENG[mi].anchor,o=e.localToWorld(V3(0,0,0));return e.localToWorld(V3(1,0,0)).sub(o).normalize()}
function emitters(dt){const ax=axisDir();
 if(mi<2){/* afterburner embers (sparse) */sparkAcc+=dt*(A>.5?A*14:0)+dt*(fire*40);
  while(sparkAcc>1){sparkAcc--;const p=axisPt(rnd(0,1.5),rnd(0,.3),rnd(0,6.3)),s=rnd(18,45);SPK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-2,2),vy:ax.y*s+rnd(-1,3),vz:ax.z*s+rnd(-2,2),a:0,l:rnd(.3,.8),sd:Math.random(),k:0})}
  /* soot from a surge, a puff of vapour at light-off */
  sootAcc+=dt*(fire>.3?90:0);while(sootAcc>1){sootAcc--;const p=axisPt(rnd(0,1),rnd(0,.3),rnd(0,6.3)),s=rnd(6,16);SMK.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s,vy:ax.y*s+rnd(.5,2),vz:ax.z*s+rnd(-1,1),a:0,l:rnd(2,3.5),sd:Math.random(),k:1,s0:.4,s1:3.5})}}
 else if(mi==4){const qm=Q>1?1:Q>0?.6:.35;steamAcc+=dt*(N*48+ign*30)*qm;
  while(steamAcc>1){steamAcc--;const sp=rnd(7,20)*(.5+N*.6),sm2=Math.random()<.4;SMK.add({x:rnd(3,9),y:rnd(1,3.5),z:rnd(-6,6),vx:sp,vy:rnd(2,6),vz:rnd(-4,4),a:0,l:rnd(6,9),sd:Math.random(),k:sm2?6:2,s0:3,s1:rnd(16,26)})}}
 else if(mi==5){const nn=N*fu,e=ENG[5],gy=e.AC.position.y-1.9;if(alt<14&&nn>.4&&nz>45){sparkAcc+=dt*nn*70*(1-alt/14)*(Q>1?1:.6);
  while(sparkAcc>1){sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,2.5),sp=rnd(6,16)*(1-alt/16);SMK.add({x:Math.cos(a)*r,y:.25,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.4,2.2),vz:Math.sin(a)*sp,a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.6,s1:rnd(3,6)})}}}
 else if(mi==6){const nn=N*fu*sm(.5,1,prp);if(nn>.15){sparkAcc+=dt*nn*14*(Q>1?1:.6);
  while(sparkAcc>1){sparkAcc--;const z=rnd(-3.2,3.2),sp=rnd(7,18)*nn;SMK.add({x:rnd(-3.5,0),y:.2,z,vx:sp,vy:rnd(.2,1.4),vz:z*rnd(.1,.5),a:0,l:rnd(1.4,2.8),sd:Math.random(),k:7,s0:.5,s1:rnd(2.5,5)})}}}
 else if(mi==7){const h=alt,nn=N*fu;if(!sc.done&&h<30&&nn>.05){const k2=Math.pow(1-h/30,1.5);sparkAcc+=dt*nn*260*k2*(Q>1?1:Q>0?.6:.35);
  while(sparkAcc>1){sparkAcc--;const a=Math.random()*6.283,r=rnd(.5,4+h*.3),sp=rnd(5,16)*(.4+k2);SMK.add({x:sc.x+Math.cos(a)*r,y:.15,z:Math.sin(a)*r,vx:Math.cos(a)*sp,vy:rnd(.3,2.5),vz:Math.sin(a)*sp,a:0,l:rnd(2,4),sd:Math.random(),k:8,s0:.5,s1:rnd(3,7)})}}}
 else if(mi==2){const nn=N*fu;
  /* steam: the plume hits the water-cooled deflector and blows out downstream as a huge white cloud */
  const qmax=Q>1?1:Q>0?.6:.35;steamAcc+=dt*(nn*34+ign*24)*qmax;
  while(steamAcc>1){steamAcc--;const s=rnd(6,15)*(.5+nn*.7);SMK.add({x:rnd(.5,3.5),y:rnd(.9,2.4),z:rnd(-2.4,2.4),vx:s,vy:rnd(1.5,5),vz:rnd(-2.5,2.5),a:0,l:rnd(5,8),sd:Math.random(),k:2,s0:2.2,s1:rnd(12,20)})}
  /* steam drifting off the plume column near the bell */
  if(nn>.1&&Math.random()<dt*8*qmax){const p=axisPt(rnd(.3,2.5),rnd(1.2,1.8),rnd(0,6.3));SMK.add({x:p.x,y:p.y,z:p.z,vx:rnd(-1,2),vy:rnd(-.5,1.5),vz:rnd(-1,1),a:0,l:rnd(2,4),sd:Math.random(),k:3,s0:.6,s1:2.6})}
  /* hydrogen burn-off igniters: sparklers spraying across under the bell before start */
  if(ph==1&&st>.5){sparkAcc+=dt*90;while(sparkAcc>1){sparkAcc--;const a=Math.floor(Math.random()*4)/4*6.283+.4,p=axisPt(rnd(.4,.8),1.6,a),s=rnd(4,10);SPK.add({x:p.x,y:p.y,z:p.z,vx:-Math.cos(a)*s*0+rnd(-3,3),vy:rnd(-2,4),vz:-Math.sin(a)*s*.5,a:0,l:rnd(.4,.9),sd:Math.random(),k:1})}}}}
function updParticles(dt,lc,li){const s=curP,a=SMK.u;
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
function thermalU(){const amb=CFG[mi].space?[5,20,-60][scene]:CFG[mi].mars?[-20,-5,-45][scene]:[24,38,14][scene],nn=N*fu,fh=mi<2?A*320+N*N*fu*80+fire*300+ign*120:nn*190+ign*90;
 thSet(TH.cold,amb,0,0,1,fh*.55,mi<2?5:7);thSet(TH.gnd,amb+(scene==1?10:0),0,0,1,fh,mi<2?4.5:8);thSet(TH.sky,-40);
 if(mi<2){thSet(TH.case,amb+N*35+hg*45,hg*hg*230+A*70,-3.4,-1.2,fh*.15,4);thSet(TH.hot,amb+70*N+hg*360+A*230,A*260,-1.6,0);thSet(TH.inner,amb+hg*620+A*880+ign*420+gn*300);thSet(TH.bell,amb)}
 else if(mi==4){thSet(TH.case,amb+N*40);thSet(TH.bell,amb+N*480,-N*220,-3.9,0);thSet(TH.hot,amb+N*450);thSet(TH.inner,amb+N*900)}
 else if(mi==5){thSet(TH.case,amb+N*30+hg*30);thSet(TH.hot,amb+80*N+hg*420);thSet(TH.inner,amb+hg*600);thSet(TH.bell,amb)}
 else if(mi==6){thSet(TH.case,amb+N*25+hg*25);thSet(TH.hot,amb+N*330+hg*60);thSet(TH.inner,amb+N*700);thSet(TH.bell,amb)}
 else if(mi==7){thSet(TH.case,amb+8);thSet(TH.hot,amb+nn*850);thSet(TH.inner,amb+150);thSet(TH.bell,amb)}
 else if(mi==3){thSet(TH.case,amb+nn*90+(ph==1?40:0));thSet(TH.hot,amb+nn*420);thSet(TH.inner,amb+nn*520);thSet(TH.bell,amb)}
 else{thSet(TH.case,amb+nn*25);thSet(TH.bell,amb+nn*520,-nn*270,-2.9,0);thSet(TH.inner,amb+nn*900);thSet(TH.hot,amb+nn*480)}
 thSet(TH.cryo,ph?-150:amb)}
let thList=null;
function lensRender(){if(!thList){thList=[];scn.traverse(o=>{if(o.isMesh)thList.push(o)})}
 const sch=lens==1,keep=[];if(!sch)thermalU();
 for(const o of thList){keep.push(o.material,o.visible);if(o.userData.pt){o.visible=false;continue}
  if(sch){if(o.userData.bg)o.visible=false;else o.material=SIL}else o.material=o===sky?TH.sky:TH[CAT.get(o.material)||'cold']}
 R.setClearColor(sch?new T.Color(.2,.2,.2):new T.Color(0,0,0),1);R.clear();R.render(scn,cam);
 let k=0;for(const o of thList){o.material=keep[k++];o.visible=keep[k++]}}

/* ======================= cutaway airflow tracers: particles riding fixed paths, coloured by temperature ======================= */
let flowKey='',flowP=[];const TV=V3();
function tv(t){return t==-1?(fu<.5?.35:.78+.22*A):t==-2?.12+.62*A:t}
function tcol(t,k){if(k==6)return[1.8,1.0,.3];if(k==7)return[.6,.55,.5];if(k==4)return t<.35?[.55,.55,.6]:[.55+.3*(1-t),.75,2.4];if(k==5)return[1.7,1.5,.35];if(k==1)return[.25+.8*t,.45+.8*t,1.8-.2*t];if(k==2)return[.7+.5*t,1.3+.3*t,1.8];if(k==3)return[1.1+1.1*t,.8+1.0*t,1.9+.9*t];
 const S=[[0,.35,.62,1.6],[.4,1.35,1.4,1.55],[.72,2.5,1.65,.55],[1,2.6,.85,.22]];for(let i=0;i<3;i++)if(t<=S[i+1][0]){const a=S[i],b=S[i+1],f=(t-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f,a[3]+(b[3]-a[3])*f]}return S[3].slice(1)}
function flowSetup(){const e=ENG[mi],on=exposed&&!lens&&!!e.flow,key=mi+'|'+Q+'|'+on;if(key===flowKey)return;flowKey=key;FLW.clear();if(!on)return;
 flowP=e.flow();flowP.forEach(p=>{if(p.ring){p.len=1}else if(p.cv){p.c=new T.CatmullRomCurve3(p.cv.map(q=>V3(...q)));p.len=p.c.getLength()}else{let L=0;for(let i=1;i<p.ax.length;i++)L+=Math.hypot(p.ax[i][0]-p.ax[i-1][0],(p.ax[i][1]+p.ax[i][2]-p.ax[i-1][1]-p.ax[i-1][2])/2);p.len=L}});
 const n=[160,320,520][Q],tw=flowP.reduce((s,p)=>s+p.w,0);
 flowP.forEach((p,pi)=>{const c=Math.max(4,Math.round(n*p.w/tw));for(let i=0;i<c;i++){const bk=Math.random()<.5;FLW.L.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,a:0,l:1e12,sd:Math.random(),pi,s:Math.random(),f:Math.random(),an:p.band?(bk?Math.PI+Math.random()*.55:2*Math.PI-Math.random()*.55):Math.random()*6.283,fresh:1})}})}
function flowUpd(dt){FLW.u.uStr.value=mi==3?.004:.03;const e=ENG[mi],sp=mi<2?.12+N*1.6:.1+N*fu*1.5+(ph==1?.25:0);
 FLW.upd(dt,(p,dt)=>{const pa=flowP[p.pi];if(!pa)return null;
  if(pa.ring){const R4=pa.ring;p.an+=dt*pa.om*(.15+N*fu);if(Math.sin(p.an)>0)p.an+=Math.PI;const r=R4[2]+(R4[3]-R4[2])*p.s;W3.set(R4[0]+(R4[1]-R4[0])*p.f,Math.cos(p.an)*r,Math.sin(p.an)*r).applyMatrix4(e.E.matrixWorld);p.vx=p.vy=p.vz=0;p.x=W3.x;p.y=W3.y;p.z=W3.z;const c=tcol(0,5);return[.004,c[0]*.75,c[1]*.75,c[2]*.75,.8*Math.min(1,N*fu*2+.15)]}p.s+=dt*sp*pa.sp/Math.max(.5,pa.len)*1.4;let wrap=false;if(p.s>=1){p.s-=1;p.f=Math.random();wrap=true}
  let lx,ly,lz,t;
  if(pa.ax){const K=pa.ax,m=K.length-1,u=p.s*m,i=Math.min(m-1,Math.floor(u)),fr=u-i,a=K[i],b=K[i+1],ri=a[1]+(b[1]-a[1])*fr,ro=a[2]+(b[2]-a[2])*fr,r=ri+(ro-ri)*p.f;
   lx=a[0]+(b[0]-a[0])*fr;ly=Math.cos(p.an)*r;lz=Math.sin(p.an)*r;t=tv(a[3])+(tv(b[3])-tv(a[3]))*fr}
  else{pa.c.getPointAt(p.s,TV);const j=pa.r*p.f;lx=TV.x+Math.cos(p.an)*j*.5;ly=TV.y+Math.cos(p.an)*j;lz=TV.z+Math.sin(p.an)*j;t=pa.t0+(pa.t1-pa.t0)*p.s}
  W3.set(lx,ly,lz).applyMatrix4(e.E.matrixWorld);
  if(!p.fresh&&!wrap&&dt>0){p.vx=(W3.x-p.qx)/dt;p.vy=(W3.y-p.qy)/dt;p.vz=(W3.z-p.qz)/dt}else{p.vx=p.vy=p.vz=0}
  p.fresh=0;p.x=p.qx=W3.x;p.y=p.qy=W3.y;p.z=p.qz=W3.z;
  const c=tcol(t,pa.k),al=(pa.al?pa.al():1)*Math.min(1,p.s*12)*Math.min(1,(1-p.s)*12);return[mi<2?.011:mi==3?.0035:.015,c[0]*.75,c[1]*.75,c[2]*.75,al*.8]})}

/* ======================= fire puffs: compressor-stall fireballs, light-off flash ======================= */
function burst(n,big){if(mi>1)return;const ax=axisDir();for(let i=0;i<n;i++){const p=axisPt(rnd(0,.6),rnd(0,.25),rnd(0,6.3)),s=rnd(6,18)*(big?1:.6);FIR.add({x:p.x,y:p.y,z:p.z,vx:ax.x*s+rnd(-1.5,1.5),vy:ax.y*s+rnd(-.5,2),vz:ax.z*s+rnd(-1.5,1.5),a:0,l:rnd(.35,.8)*(big?1:.7),sd:Math.random(),s0:big?.35:.25,s1:big?rnd(1.4,2.4):rnd(.8,1.4)})}}
let lastPh=0;

/* ======================= 2D overlay: part labels in cutaway, lens legend ======================= */
const LV=V3(),ironCss=v=>{const S=[[0,0,0,.06],[.2,.32,0,.5],[.4,.82,.1,.36],[.6,1,.47,0],[.8,1,.86,.12],[1,1,1,.94]];for(let i=0;i<5;i++)if(v<=S[i+1][0]){const a=S[i],b=S[i+1],f=(v-a[0])/(b[0]-a[0]);return`rgb(${(a[1]+(b[1]-a[1])*f)*255|0},${(a[2]+(b[2]-a[2])*f)*255|0},${(a[3]+(b[3]-a[3])*f)*255|0})`}return'#fff'};
function overlay(){const e=ENG[mi];g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(exposed&&lens!=2&&e.labels){g.font=`600 9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=1;const sc=Math.min(1,W/820);
  const inl=M.inset&&W-150-(gx+SWR.w+14)>=140,hudR=gx+SWR.w+(inl?Math.min(230,W-150-(gx+SWR.w+14))+14:0)+6,hudB=SWR.y+SWR.h+(M.inset&&!inl?66:0)+10,ctT=$('ctl').getBoundingClientRect().top-12,placed=[];
  for(const [t,p,o] of e.labels){LV.set(...p).applyMatrix4(e.E.matrixWorld).project(cam);if(LV.z>1||Math.abs(LV.x)>1.02||Math.abs(LV.y)>1.02)continue;
   const x=(LV.x*.5+.5)*W,y=(-LV.y*.5+.5)*H,tw=g.measureText(t).width+12,lx=Math.max(tw/2+4,Math.min(W-140-tw/2,x+o[0]*sc));let ly=Math.min(ctT-8,y+o[1]*sc);
   const box=()=>({x0:lx-tw/2-3,x1:lx+tw/2+3,y0:ly-9,y1:ly+9});let r=box();if(r.x0<hudR&&r.y0<hudB){ly=Math.max(ly,hudB+10);r=box()}
   for(let k=0;k<10;k++){if(!placed.some(q=>!(r.x1<q.x0||r.x0>q.x1||r.y1<q.y0||r.y0>q.y1)))break;ly+=(o[1]>=0?19:-19);if(ly<hudB+10&&lx-tw/2<hudR)ly=hudB+10+19*k;r=box()}
   if(ly>ctT-8)continue;placed.push(r);
   g.strokeStyle='rgba(232,236,242,.7)';g.beginPath();g.moveTo(x,y);g.lineTo(lx,ly);g.stroke();g.fillStyle='#ff9a3a';g.beginPath();g.arc(x,y,2.4,0,6.283);g.fill();
   g.fillStyle='rgba(10,12,18,.82)';g.fillRect(lx-tw/2,ly-8,tw,16);g.strokeStyle='#2a3040';g.strokeRect(lx-tw/2+.5,ly-7.5,tw-1,15);g.fillStyle='#e8ecf2';g.fillText(t,lx,ly+.5)}}
 if(lens){let y=SWR.y+SWR.h+8;if(M.inset&&W-150-(gx+SWR.w+14)<140)y+=66;const x=gx,w=SWR.w,h=lens==2?42:22;
  g.fillStyle='rgba(14,17,24,.85)';g.fillRect(x,y,w,h);g.strokeStyle='#2a3040';g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#d8dde6';
  if(lens==1)g.fillText('SCHLIEREN · density gradients (simulated)',x+8,y+11.5);
  else{g.fillText('THERMAL °C (illustrative)',x+8,y+10);const bx=x+8,bw=w-16,by=y+18,gr=g.createLinearGradient(bx,0,bx+bw,0);for(let i=0;i<=10;i++)gr.addColorStop(i/10,ironCss(i/10));
   g.fillStyle=gr;g.fillRect(bx,by,bw,8);g.fillStyle='#9aa2b0';g.textAlign='center';[0,100,500,1000,1600].forEach((t,i)=>{const v=Math.pow((t+40)/1640,.6);g.textAlign=i==0?'left':i==4?'right':'center';g.fillText(String(t),bx+v*bw,by+16)})}}
 g.restore()}

/* ======================= frame ======================= */
const pr0=V3();
function render(dt,dr){
 if(QA!==Q)setup();if(MA!==mi)applyMachine();if(curS!==sKey(scene))applyScene(scene);
 const e=ENG[mi];e.upd(dt);
 /* metal heat glow follows EGT (hg) and the afterburner */
 MT.hot.emissiveIntensity=hg*hg*hg*.12;MT.flap.emissiveIntensity=(mi==0?A*.05:0);MT.srHot.emissiveIntensity=hg*hg*hg*.08+A*.1;MT.inner.emissiveIntensity=(exposed?.35:1)*(mi<2?(hg*hg*.35+A*1.1+ign*1.2+gn*1)*(.9+.1*Math.sin(simT*40)):0);
 MT.inner.emissive.setRGB(gn>.3?.3:1,gn>.3?1:.42,gn>.3?.4:.13);
 const night=curP.fl;e.lens.forEach(l=>l.material.color.setRGB(night*6,night*5,night*3.6));
 camera(dr);
 const [li,lc]=plumeParams(dt);
 flame.color.setRGB(...lc);flame.intensity=li;flame.position.copy(mi<2?axisPt(3.2,0,0):mi==3?axisPt(.25,0,0):mi==4?V3(1.5,3.2,0):mi==5?axisPt(1.5,0,0):mi==6?axisPt(.6,0,0):mi==7?axisPt(1.2,0,0):V3(.6,2.4,0));
 emitters(dt);updParticles(dt,lc,li);
 if(lastPh==1&&ph==2)burst(10,false);lastPh=ph;
 flowSetup();scn.updateMatrixWorld();flowUpd(dt);
 FIR.upd(dt,(p,dt)=>{p.vx*=Math.exp(-dt*2.2);p.vy=p.vy*Math.exp(-dt*2.2)+dt*2;p.vz*=Math.exp(-dt*2.2);const f=p.a/p.l,k=Math.pow(1-f,1.6);return[p.s0+(p.s1-p.s0)*Math.sqrt(f),3*k+.25,1.2*k+.06,.3*k,(1-f)*.7]});
 scn.updateMatrixWorld();sky.position.copy(cam.position);
 plume.matrix.copy(e.anchor.matrixWorld);plume.matrixWorldNeedsUpdate=true;PU.uInv.value.copy(e.anchor.matrixWorld).invert();
 cam.getWorldDirection(PU.uFwd.value);PU.uT.value=simT;
 R.setRenderTarget(rtM);if(lens)lensRender();else{R.setClearColor(0x000000,1);R.clear();R.render(scn,cam)}
 R.toneMapping=lens?T.NoToneMapping:T.ACESFilmicToneMapping;bloom.enabled=Q>0&&!lens;cpass.uniforms.uMode.value=lens;
 R.setRenderTarget(rtP);R.setClearColor(0x000000,0);R.clear();R.render(pscn,cam);R.setRenderTarget(null);
 const cu=cpass.uniforms;cu.uT.value=simT;cu.uHaze.value=Q>0?(2.2+A*2.2)*pr*(view==2?.35:1):0;cu.uKick.value=kick*.2+(sT>0?ign*.05:0);
 bloom.strength=.35+A*.15;comp.render(dr);
 SPK.L.length=Math.min(SPK.L.length,400);P.length=EM.length=SM.length=VP.length=0}
setup();applyScene(scene);applyMachine();
return{canvas:glc,render,overlay,resize:()=>{QA=-1},surge:()=>{fire=1;burst(14,true)},snap:()=>{camSnap=true},R}}


/* ---------- test bridge (generated by tools/split/extract.mjs): tests read and assign these names on window, as they could when the scripts were classic ---------- */
{const d=(k,g,s)=>{const o=Object.getOwnPropertyDescriptor(window,k);if(o&&!o.configurable){console.error('test bridge: cannot expose '+k);return}Object.defineProperty(window,k,{get:g,set:s,configurable:true})};
d('$',()=>$);d('cv',()=>cv);d('g',()=>g);d('mk',()=>mk);d('W',()=>W,v=>{W=v});d('H',()=>H,v=>{H=v});d('D',()=>D,v=>{D=v});d('u',()=>u,v=>{u=v});d('nx',()=>nx,v=>{nx=v});d('ny',()=>ny,v=>{ny=v});d('gx',()=>gx,v=>{gx=v});d('gy',()=>gy,v=>{gy=v});d('dsz',()=>dsz,v=>{dsz=v});d('TR',()=>TR,v=>{TR=v});d('L',()=>L,v=>{L=v});d('raw',()=>raw,v=>{raw=v});d('N',()=>N,v=>{N=v});d('A',()=>A,v=>{A=v});d('E',()=>E,v=>{E=v});d('F',()=>F,v=>{F=v});d('kick',()=>kick,v=>{kick=v});d('ign',()=>ign,v=>{ign=v});d('spd',()=>spd,v=>{spd=v});d('sg',()=>sg,v=>{sg=v});d('igt',()=>igt,v=>{igt=v});d('fu',()=>fu,v=>{fu=v});d('hg',()=>hg,v=>{hg=v});d('Ns',()=>Ns,v=>{Ns=v});d('sT',()=>sT,v=>{sT=v});d('Nst',()=>Nst,v=>{Nst=v});d('pulseT',()=>pulseT,v=>{pulseT=v});d('bt',()=>bt,v=>{bt=v});d('coolS',()=>coolS,v=>{coolS=v});d('stl',()=>stl,v=>{stl=v});d('Lp',()=>Lp,v=>{Lp=v});d('Lrate',()=>Lrate,v=>{Lrate=v});d('faults',()=>faults,v=>{faults=v});d('lit',()=>lit,v=>{lit=v});d('tm',()=>tm,v=>{tm=v});d('stuck',()=>stuck,v=>{stuck=v});d('last',()=>last,v=>{last=v});d('hinted',()=>hinted,v=>{hinted=v});d('gn',()=>gn,v=>{gn=v});d('spk',()=>spk,v=>{spk=v});d('mach',()=>mach,v=>{mach=v});d('G3',()=>G3,v=>{G3=v});d('R3done',()=>R3done,v=>{R3done=v});d('lens',()=>lens,v=>{lens=v});d('raw2',()=>raw2,v=>{raw2=v});d('drag2',()=>drag2,v=>{drag2=v});d('alt',()=>alt,v=>{alt=v});d('vz',()=>vz,v=>{vz=v});d('nz',()=>nz,v=>{nz=v});d('prp',()=>prp,v=>{prp=v});d('beta',()=>beta,v=>{beta=v});d('ph',()=>ph,v=>{ph=v});d('st',()=>st,v=>{st=v});d('TS',()=>TS,v=>{TS=v});d('tsT',()=>tsT,v=>{tsT=v});d('simT',()=>simT,v=>{simT=v});d('sl',()=>sl,v=>{sl=v});d('view',()=>view,v=>{view=v});d('exposed',()=>exposed,v=>{exposed=v});d('scene',()=>scene,v=>{scene=v});d('zm',()=>zm,v=>{zm=v});d('mi',()=>mi,v=>{mi=v});d('M',()=>M,v=>{M=v});d('QP',()=>QP);d('Q',()=>Q,v=>{Q=v});d('emaT',()=>emaT,v=>{emaT=v});d('slowT',()=>slowT,v=>{slowT=v});d('sm',()=>sm);d('SNM',()=>SNM);d('SL',()=>SL);d('SLN',()=>SLN);d('VN',()=>VN);d('SN',()=>SN);d('ZT',()=>ZT);d('B0',()=>B0);d('B1',()=>B1);d('B2',()=>B2);d('HS',()=>HS);d('HD',()=>HD);d('b0',()=>b0);d('b1',()=>b1);d('b2',()=>b2);d('hs',()=>hs);d('hd',()=>hd);d('A0',()=>A0);d('SW',()=>SW);d('MONO',()=>MONO);d('GC',()=>GC,v=>{GC=v});d('FC',()=>FC,v=>{FC=v});d('GV',()=>GV);d('SWR',()=>SWR,v=>{SWR=v});d('buildFaces',()=>buildFaces,v=>{buildFaces=v});d('resize',()=>resize,v=>{resize=v});d('applyRaw',()=>applyRaw,v=>{applyRaw=v});d('tq',()=>tq);d('trk',()=>trk);d('drag',()=>drag,v=>{drag=v});d('fromY',()=>fromY,v=>{fromY=v});d('fromY2',()=>fromY2,v=>{fromY2=v});d('K',()=>K);d('keys',()=>keys,v=>{keys=v});d('update',()=>update,v=>{update=v});d('AC',()=>AC,v=>{AC=v});d('S',()=>S,v=>{S=v});d('VV',()=>VV);d('initAudio',()=>initAudio,v=>{initAudio=v});d('audio',()=>audio,v=>{audio=v});d('auF',()=>auF,v=>{auF=v});d('auSR',()=>auSR,v=>{auSR=v});d('auSS',()=>auSS,v=>{auSS=v});d('thump',()=>thump,v=>{thump=v});d('tick',()=>tick,v=>{tick=v});d('bang',()=>bang,v=>{bang=v});d('beep',()=>beep,v=>{beep=v});d('P',()=>P);d('EM',()=>EM);d('SM',()=>SM);d('VP',()=>VP);d('spr',()=>spr);d('SP',()=>SP);d('blob',()=>blob);d('ST',()=>ST);d('MC',()=>MC);d('sicE',()=>sicE);d('sicStep',()=>sicStep,v=>{sicStep=v});d('HM',()=>HM);d('HT',()=>HT);d('G0',()=>G0);d('harT',()=>harT);d('hovL',()=>hovL);d('hoverStep',()=>hoverStep,v=>{hoverStep=v});d('auF1',()=>auF1,v=>{auF1=v});d('auHR',()=>auHR,v=>{auHR=v});d('TPW',()=>TPW);d('TPJ',()=>TPJ);d('tpP',()=>tpP);d('tpT',()=>tpT);d('tpStep',()=>tpStep,v=>{tpStep=v});d('GM',()=>GM);d('MR',()=>MR);d('MS',()=>MS);d('MLE',()=>MLE);d('MLN',()=>MLN);d('CANT',()=>CANT);d('RH',()=>RH);d('BL',()=>BL);d('sc',()=>sc);d('skyReset',()=>skyReset,v=>{skyReset=v});d('skyRy',()=>skyRy);d('skyHov',()=>skyHov);d('skyCam',()=>skyCam,v=>{skyCam=v});d('skyStep',()=>skyStep,v=>{skyStep=v});d('auTP',()=>auTP,v=>{auTP=v});d('auSC',()=>auSC,v=>{auSC=v});d('htT',()=>htT);d('MU',()=>MU);d('RE',()=>RE);d('WN',()=>WN);d('WF',()=>WF);d('orb',()=>orb);d('orbReset',()=>orbReset,v=>{orbReset=v});d('orbStep',()=>orbStep,v=>{orbStep=v});d('auHT',()=>auHT,v=>{auHT=v});d('lab',()=>lab,v=>{lab=v});d('startStall',()=>startStall,v=>{startStall=v});d('surge',()=>surge,v=>{surge=v});d('say',()=>say,v=>{say=v});d('master',()=>master,v=>{master=v});d('act',()=>act,v=>{act=v});d('nextM',()=>nextM,v=>{nextM=v});d('chips',()=>chips,v=>{chips=v});d('setMachine',()=>setMachine,v=>{setMachine=v});d('SQ',()=>SQ);d('seqStart',()=>seqStart,v=>{seqStart=v});d('seqNext',()=>seqNext,v=>{seqNext=v});d('seqStop',()=>seqStop,v=>{seqStop=v});d('seqTick',()=>seqTick,v=>{seqTick=v});d('seqCap',()=>seqCap,v=>{seqCap=v});d('showInfo',()=>showInfo,v=>{showInfo=v});d('closeInfo',()=>closeInfo);d('buildLabels',()=>buildLabels,v=>{buildLabels=v});d('emit',()=>emit,v=>{emit=v});d('stream',()=>stream,v=>{stream=v});d('tongues',()=>tongues,v=>{tongues=v});d('plume',()=>plume,v=>{plume=v});d('sparks',()=>sparks,v=>{sparks=v});d('rear',()=>rear,v=>{rear=v});d('wires',()=>wires,v=>{wires=v});d('sky',()=>sky,v=>{sky=v});d('metal',()=>metal,v=>{metal=v});d('doors',()=>doors,v=>{doors=v});d('actuators',()=>actuators,v=>{actuators=v});d('body',()=>body,v=>{body=v});d('gimb',()=>gimb);d('drawSS',()=>drawSS,v=>{drawSS=v});d('plumeSS',()=>plumeSS,v=>{plumeSS=v});d('bellSS',()=>bellSS,v=>{bellSS=v});d('baySS',()=>baySS,v=>{baySS=v});d('rearSS',()=>rearSS,v=>{rearSS=v});d('haze',()=>haze,v=>{haze=v});d('bloom',()=>bloom,v=>{bloom=v});d('draw',()=>draw,v=>{draw=v});d('gauges',()=>gauges,v=>{gauges=v});d('propInset',()=>propInset,v=>{propInset=v});d('craneInset',()=>craneInset,v=>{craneInset=v});d('hoverInset',()=>hoverInset,v=>{hoverInset=v});d('orbitInset',()=>orbitInset,v=>{orbitInset=v});d('spikeInset',()=>spikeInset,v=>{spikeInset=v});d('rec',()=>rec,v=>{rec=v});d('recCh',()=>recCh,v=>{recCh=v});d('recT',()=>recT,v=>{recT=v});d('recMime',()=>recMime,v=>{recMime=v});d('clipURL',()=>clipURL,v=>{clipURL=v});d('clipFile',()=>clipFile,v=>{clipFile=v});d('recLast',()=>recLast,v=>{recLast=v});d('RC',()=>RC);d('rc',()=>rc);d('canRec',()=>canRec);d('startRec',()=>startRec,v=>{startRec=v});d('stopRec',()=>stopRec,v=>{stopRec=v});d('showClip',()=>showClip,v=>{showClip=v});d('recLab',()=>recLab,v=>{recLab=v});d('recOverlay',()=>recOverlay,v=>{recOverlay=v});d('ui',()=>ui,v=>{ui=v});d('adapt',()=>adapt,v=>{adapt=v});d('frame',()=>frame,v=>{frame=v});d('MAN',()=>MAN);d('step',()=>step,v=>{step=v});d('ready3D',()=>ready3D,v=>{ready3D=v});d('fail3D',()=>fail3D,v=>{fail3D=v});d('init3D',()=>init3D,v=>{init3D=v})}
