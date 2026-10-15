// The machine table MC and every machine-specific helper (sim steps, voices, insets, RS-25 2D drawing). Split into src/machines/<name>/ in step 5.
import { S, thump } from '../audio/audio.js';
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { MONO, g, sm } from '../core/util.js';
import { say } from '../hud/controls.js';
import { applyRaw } from '../input/lever.js';
import { SQ } from '../sequence/sequence.js';
import m0 from './f-type/machine.js';
import m1 from './sr-71/machine.js';
import m2 from './shuttle/machine.js';
import m3 from './hall/machine.js';

/* ---------- machines: everything that differs between engines lives here ----------
   ab: has an afterburner zone (lever detent at MIL); stall: can surge; idle: spool target at lever 0; up/dn: spool time constants;
   coast: spin-down tau with fuel off; cN/cT: starter speed and duration; e/f: EGT and fuel-flow curves; teb: green light-off flash */
export const MC=[m0,m1,m2,m3,{reset:()=>sicE.fill(0),
 n:'SATURN V F-1',btn:'SATURN V',need3d:1,clu:dt=>sicStep(dt),sub:'Five F-1 engines at the base of an S-IC first stage, on a static test stand.',hint:'Drag the lever up: the engines light in the real centre, pair, pair order.',
 nxf:.4,ab:0,stall:0,idle:0,up:.6,dn:.3,coast:.5,cN:0,cT:3.6,tk:[1.2,.45],ign:1.3,lk:.8,e0f:60,lt:1.4,teb:0,
 e:[20,260,0],f:[0,0,1,0],off:'CUTOFF',st:'START',cl:'SHUTDOWN',cut:'Engine cutoff.',wait:'Wait for shutdown to finish.',
 r:()=>0,shk:()=>state.N*state.N*3.2*state.fu+state.kick*10,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
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
},{clu:dt=>hoverStep(dt),reset:()=>{state.nz=90},insetF:hoverInset,
 n:'HARRIER',btn:'HARRIER',need3d:1,hover:1,nozzle:1,inset:1,sub:'Pegasus vectored-thrust jump jet on a hover pad.',hint:'Throttle up to lift off. The second lever swivels the nozzles.',
 nxf:.4,ab:0,stall:0,idle:.27,up:1.2,dn:.9,coast:3,cN:.2,cT:3.2,tk:[1.6,.08],ign:.8,lk:.3,e0f:420,lt:.7,teb:0,
 e:[40,600,0],f:[.3,9,2,0],off:'FUEL OFF',st:'STARTING',cl:'RUNDOWN',cut:'Fuel off. Engine running down...',wait:'Let it run down before restarting.',
 r:()=>0,shk:()=>state.N*state.N*1.2+state.kick*10,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:104,d:1,f:v=>v|0},
    {t:'JPT',cap:'JPT °C x100',min:0,max:800,maj:200,mn:100,red:700,d:100,f:v=>v|0},
    {t:'NOZ',cap:'NOZZLE °',min:0,max:100,maj:20,mn:10,red:98.5,d:1,f:v=>v.toFixed(0)}],
 gv:()=>[state.N*100,state.E,state.nz],
 lv:[['MAX',1,'t'],['HOVER',.9],['IDLE',0,'b']],lv2:[['BRAKE 98.5°',1,'t'],['HOVER 90°',.914],['45°',.457],['AFT 0°',0,'b']],
 lp:()=>[['AIRBORNE',state.alt>.05,'#3fcf7a'],['JPT',state.E>620&&(state.simT*6%1<.6),'#e0392b']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auHR,
 sqc:'ENGINE START',
 sq:[{cap:'NOZZLES TO THE HOVER STOP',do:()=>{state.raw2=.914},wait:1.2},
  {cap:'FULL THROTTLE',lever:1,dur:2.5},
  {cap:'LIFT-OFF',until:()=>state.alt>.4,max:6},
  {cap:'CLIMBING',until:()=>state.alt>9,max:9,view:1},
  {cap:'HOVER',lever:()=>hovL(),dur:1.5,wait:2.5,view:0},
  {cap:'NOZZLES TO THE BRAKING STOP  98.5°',do:()=>{state.raw2=1},wait:2,view:2},
  {cap:'NOZZLES BACK TO 90°',do:()=>{state.raw2=.914},wait:1},
  {cap:'DESCENDING',lever:()=>hovL()-.08,dur:1,until:()=>state.alt<=0,max:14,view:0},
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
},{reset:()=>{state.prp=0;state.beta=86},
 n:'NK-12 TURBOPROP',btn:'NK-12',need3d:1,clu:dt=>tpStep(dt),inset:1,insetF:propInset,sub:'Kuznetsov NK-12 turboprop with contra-rotating propellers, on an outdoor test stand.',hint:'Throttle up: the RPM holds steady while the blades bite harder.',
 nxf:.4,ab:0,stall:0,idle:.08,up:1.4,dn:1.1,coast:2.2,cN:.25,cT:4,tk:[1.4,.12],ign:.6,lk:.2,e0f:380,lt:.5,teb:0,
 e:[300,250,0],f:[.5,6,1.3,0],off:'FUEL OFF',st:'STARTING',cl:'RUNDOWN',cut:'Fuel off. The propellers feather and stop...',wait:'Let the propellers stop before restarting.',
 r:()=>0,shk:()=>state.prp*.35+state.N*state.N*.9+state.kick*8,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:105,d:1,f:v=>v|0},
    {t:'PWR',cap:'POWER MW',min:0,max:12,maj:2,mn:1,red:11.03,d:1,f:v=>v.toFixed(1)},
    {t:'BLADE',cap:'BLADE ANGLE \u00b0',min:0,max:90,maj:15,mn:5,red:90,d:1,f:v=>v.toFixed(0)}],
 gv:()=>[state.prp*100,tpP()/1e6,state.beta],
 lv:[['MAX',1,'t'],['HALF',.5],['GROUND IDLE',0,'b']],
 lp:()=>[['FEATHER',state.beta>80,'#d9822b'],['CONST RPM',state.ph==2&&state.prp>.97,'#3fcf7a']],
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
},{onSelect:()=>{state.raw2=0;skyReset()},seqPre:()=>({cap:'POWERED DESCENT',do:()=>skyReset(),wait:.1}),
 n:'MARS SKY CRANE',btn:'SKY CRANE',need3d:1,sky:1,nozzle:1,inset:1,insetF:craneInset,clu:dt=>skyStep(dt),camA:v=>skyCam(v),sub:'Mars 2020 descent stage lowering the Perseverance rover on bridles, Jezero Crater.',hint:'HOVER to stop falling, BRIDLES to lower the rover.',
 nxf:.4,ab:0,stall:0,idle:0,up:.3,dn:.3,coast:.4,cN:0,cT:1.5,tk:[9,1],ign:.35,lk:.1,e0f:60,lt:.3,teb:0,
 e:[20,200,0],f:[0,1,1,0],off:'ENGINES OFF',st:'PRIMING',cl:'SHUTDOWN',cut:'Engines off!',wait:'Wait for the engines to stop.',
 r:()=>0,shk:()=>state.N*.5*(sc.done?0:1)+state.kick*8,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'THR',cap:'THRUST %',min:0,max:100,maj:20,mn:10,red:100,d:1,f:v=>v|0},
    {t:'ALT',cap:'ROVER m',min:0,max:40,maj:10,mn:5,red:40,d:1,f:v=>v.toFixed(1)},
    {t:'BRDL',cap:'BRIDLES m',min:0,max:7,maj:1,mn:.5,red:6.4,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[Math.max(...sc.thr)/MLE*100,Math.max(0,skyRy()),sc.bl],
 lv:[['MAX',1,'t'],['HOVER + ROVER',.343],['HOVER, EMPTY',.172],['MIN',0,'b']],lv2:[['6.4 m OUT',1,'t'],['STOWED',0,'b']],
 lp:()=>[[sc.act==4?'4 LIT':'8 LIT',state.ph==2&&!sc.done,'#3fcf7a'],[sc.cut?'CUT':'TOUCHDOWN',!!sc.td,sc.cut?'#ff9a3a':'#3fcf7a']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,spike:0,draw:()=>{},rear:()=>{},au:auSC,
 sqc:'ENGINES PRIMED',
 sq:[{cap:'POWERED DESCENT, 8 ENGINES',do:()=>{sc.vzT=-2.5},until:()=>state.alt<21.5,max:12},
  {cap:'SLOWING TO 0.75 m/s',do:()=>{sc.vzT=-.75},until:()=>state.alt<20.2,max:6},
  {cap:'SKY CRANE: LOWERING THE ROVER',do:()=>{state.raw2=1},until:()=>sc.bl>6.35,max:12,view:1},
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
export const sicE=[0,0,0,0,0];
export function sicStep(dt){const lit=state.ph==2?(state.L<.34?1:state.L<.67?3:5):0;for(let k=0;k<5;k++){const t=k<lit?1:0;sicE[k]+=(t-sicE[k])*(1-Math.exp(-dt/(t>sicE[k]?.55:.22)))}state.N=sicE.reduce((a,b)=>a+b,0)/5}
/* Harrier: fixed 8,000 kg, installed lift taken as 87% of the Pegasus 11-61's 106 kN; vertical motion only, with artificial damping */
export const HM=8000,HT=106e3*.87,G0=9.80665,harT=()=>state.ph==2?HT*Math.pow(Math.max(0,(state.N-.25)/.75),1.5)*state.fu:0,hovL=()=>(Math.pow(HM*G0/HT,1/1.5)*.75+.25-.27)/(1-.27);
export function hoverStep(dt){state.nz+=Math.max(-90*dt,Math.min(90*dt,state.raw2*98.5-state.nz));const T=harT(),a=(T*Math.sin(state.nz*Math.PI/180)-HM*G0)/HM-state.vz*.6;
 if(state.alt<=0&&a<=0){state.alt=0;state.vz=0;return}state.vz+=a*dt;state.alt+=state.vz*dt;if(state.alt<0){if(state.vz<-2.5){thump(Math.min(1,-state.vz/8));state.kick=Math.max(state.kick,.3)}state.alt=0;state.vz=0}if(state.alt>45){state.alt=45;state.vz=Math.min(state.vz,0)}}
export function auF1(s,V,pm){const nn=state.N*state.fu;
 s(S.rum.gn.gain,(nn*1.7+state.ign*1.2)*(1+.18*Math.sin(state.simT*29)*Math.sin(state.simT*7+1)));s(S.rum.fl.frequency,42+state.N*70);
 s(S.roar.gn.gain,Math.pow(nn,.8)*.75+state.ign*.5+state.sg*.05);s(S.roar.fl.frequency,150+state.N*650);
 s(S.crk.gn.gain,nn*(.6+Math.random()*1.3)*(.8+V.raw)+state.ign*.5,.02);s(S.crk.fl.frequency,520+state.N*300);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,state.sg*.07);s(S.so.frequency,(40+state.st*25)*pm);s(S.sg.fl.frequency,260);s(S.sg2.gn.gain,0)}
export function auHR(s,V,pm){
 s(S.rum.gn.gain,state.N*.55*(.35+.65*state.fu)+state.sg*.12+state.ign*.6);s(S.rum.fl.frequency,80+state.N*120);
 s(S.roar.gn.gain,state.N*state.N*(.07+.3*state.fu)+state.ign*.3);s(S.roar.fl.frequency,300+state.N*1100);
 s(S.wh.gn.gain,state.N*.09*(1+(1-state.fu)*1.4)+state.spd*.18);s(S.osc.frequency,(230+state.N*1800)*pm);s(S.wh.fl.frequency,(1200+state.N*2600)*pm);
 s(S.wh2.gn.gain,state.spd*.1+state.N*.035);s(S.osc2.frequency,(230+state.N*1800)*2.01*pm);s(S.crk.gn.gain,0);
 s(S.sg.gn.gain,state.sg*.12);s(S.so.frequency,(60+state.N*2600)*pm);s(S.sg.fl.frequency,300+state.N*3000);s(S.sg2.gn.gain,state.sg*.05);s(S.so2.frequency,(30+state.N*500)*pm)}
/* NK-12 turboprop. Power comes from the lever; a governor holds RPM by changing blade pitch, so once governed, more power means coarser blades, not faster ones.
   On shutdown the blades feather (turn edge-on). Static propeller thrust is a momentum-theory estimate with an assumed figure of merit of 0.6 */
export const TPW=11.03e6,TPJ=2780,tpP=()=>state.ph==2?TPW*state.N*state.fu:0,tpT=()=>2.79*Math.pow(tpP(),2/3)*sm(.3,.9,state.prp);
export function tpStep(dt){const tR=state.ph==1?.55*sm(0,state.M.cT,state.st):state.ph==2?.8+.2*sm(.08,.3,state.N):0;state.prp+=(tR-state.prp)*(1-Math.exp(-dt/(tR>state.prp?1.2:state.ph==3?1.4:.8)));
 const tB=state.ph==2?8+30*Math.pow(Math.max(0,(state.N-state.M.idle)/(1-state.M.idle)),.8):state.ph==1&&state.st>1?10:86;state.beta+=Math.max(-25*dt,Math.min(25*dt,tB-state.beta))}
/* Mars 2020 sky crane. Mars gravity 3.71 m/s2, rover 1,025 kg. Assumed: descent stage 1,100 kg at this point, engines canted 20 deg, fuel use ignored.
   The lever sets total thrust (fraction of 8 x 3,060 N); each lit engine runs between 400 N and 3,060 N, backups at about 1% */
export const GM=3.71,MR=1025,MS=1100,MLE=3060,MLN=400,CANT=Math.cos(20*Math.PI/180),RH=1.75,BL=6.4;
export const sc={bl:0,cut:0,td:0,tdT:0,ct:0,fly:0,done:0,x:0,vx:0,pit:0,act:8,vzT:null,thr:[0,0,0,0,0,0,0,0],T:0,lp:0,hard:0};
export function skyReset(){Object.assign(sc,{bl:0,cut:0,td:0,tdT:0,ct:0,fly:0,done:0,x:0,vx:0,pit:0,act:8,vzT:null,T:0,hard:0});sc.thr.fill(0);state.alt=32;state.vz=-2.5}
export const skyRy=()=>sc.td?0:state.alt-RH-sc.bl,skyHov=()=>Math.min(1,((sc.td||sc.cut?MS:MS+MR)*GM/CANT-(8-sc.act)*MLE*.01)/(8*MLE));
export function skyCam(v){const ry=sc.td?0:Math.max(0,state.alt-RH-sc.bl);if(sc.cut){const fl=sc.fly&&!sc.done,m2=fl?Math.min(30,state.alt*.5):.4,k=fl?Math.min(3,1+state.alt/30):1;return v==1?[0,0]:v==2?[0,m2,k]:[m2*.5,m2,k]}const m=(ry+state.alt+1.2)/2-1;return v==1?[ry,ry]:v==2?[0,m]:[m,m]}
export function skyStep(dt){
 if(state.ph!=sc.lp){if(state.ph==1)skyReset();sc.lp=state.ph}
 const run=state.ph==2&&!sc.done;
 /* SEQUENCE flies it with a simple loop that holds a vertical speed (the real stage is flown entirely by its guidance computer) */
 if(SQ.on&&sc.vzT!=null&&run&&!sc.cut){state.raw=Math.min(1,Math.max(0,skyHov()+.25*(sc.vzT-state.vz)));applyRaw()}
 /* sky-crane phase: four engines drop to ~1% as backups once the rover starts down */
 if(state.raw2>.02&&sc.act==8&&run)sc.act=4;
 /* bridles pay out (up to 1 m/s here) to the length set by the second lever; they cannot be reeled back in */
 if(!sc.cut&&!sc.td)sc.bl=Math.max(sc.bl,Math.min(state.raw2*BL,sc.bl+dt));
 const tot=sc.fly?8*MLE:state.L*8*MLE;let sum=0;
 for(let k=0;k<8;k++){const on=sc.act==8||k%2==0,t=!run?0:on?Math.min(MLE,Math.max(MLN,tot/sc.act)):MLE*.01;sc.thr[k]+=(t-sc.thr[k])*(1-Math.exp(-dt/.12));sum+=sc.thr[k]}
 sc.T=sum*CANT;state.N=sum/(8*MLE);
 if(sc.done||state.ph==0||state.ph==1)return;
 const m=sc.td||sc.cut?MS:MS+MR;
 if(sc.fly){sc.fly+=dt;sc.pit=Math.min(.75,sc.fly*.4);const a=sc.T/m;sc.vx+=a*Math.sin(sc.pit)*dt;state.vz+=(a*Math.cos(sc.pit)-GM)*dt;sc.x+=sc.vx*dt;state.alt+=state.vz*dt;
  if(sc.fly>8||Math.hypot(sc.x,state.alt)>260){sc.done=1;state.ph=3;state.lit=false;say('The descent stage flew off to crash a safe distance away. ENGINE to fly it again.')}return}
 if(sc.td&&!sc.cut){sc.tdT+=dt;if(sc.tdT>1){sc.cut=1;sc.vzT=null;say('Wheels down: the rover cuts the bridles.')}}
 if(sc.cut&&state.ph==2){sc.ct+=dt;if(sc.ct>.6)sc.fly=1e-3}
 state.vz+=(sc.T/m-GM-state.vz*.1)*dt;state.alt+=state.vz*dt;
 if(!sc.td&&state.alt-RH-sc.bl<=0){sc.td=1;sc.tdT=0;sc.tdv=-state.vz;sc.hard=-state.vz>1.6;thump(Math.min(.7,.15-state.vz*.15));state.kick=Math.max(state.kick,Math.min(.5,-state.vz*.08));
  say(sc.hard?'Hard touchdown at '+(-state.vz).toFixed(1)+' m/s.':'Touchdown at '+(-state.vz).toFixed(2)+' m/s.');state.alt=RH+sc.bl;state.vz=Math.max(state.vz,0)}
 if(sc.td&&!sc.cut&&state.alt>RH+sc.bl){state.alt=RH+sc.bl;state.vz=Math.min(state.vz,0)}   /* taut bridles: the rover holds the stage down until they are cut */
 if(state.alt<RH&&(sc.td||sc.bl<.05)){state.alt=RH;state.vz=Math.max(state.vz,0)}
 if(state.alt>80){state.alt=80;state.vz=Math.min(state.vz,0)}}
/* NK-12: the propellers' beating growl, a turbine whine, and the roar of a huge mass of air */
export function auTP(s,V,pm){const nn=state.N*state.fu,bp=state.prp*42*4,bt2=1+.35*Math.sin(state.simT*6.283*2.3);
 s(S.rum.gn.gain,state.prp*.35+nn*.55+state.sg*.08+state.ign*.4);s(S.rum.fl.frequency,70+nn*90);
 s(S.roar.gn.gain,nn*nn*.28+state.prp*.05+state.ign*.25);s(S.roar.fl.frequency,300+nn*700);
 s(S.sg.gn.gain,state.prp*(.05+nn*.25)*bt2+state.sg*.08);s(S.so.frequency,Math.max(30,bp)*pm);s(S.sg.fl.frequency,180+nn*500);
 s(S.sg2.gn.gain,state.prp*(.03+nn*.12));s(S.so2.frequency,Math.max(20,bp*1.02)*pm);
 s(S.wh.gn.gain,state.prp*.05+state.spd*.1);s(S.osc.frequency,(400+state.prp*2200)*pm);s(S.wh.fl.frequency,(1500+state.prp*2500)*pm);
 s(S.wh2.gn.gain,state.prp*.02);s(S.osc2.frequency,(400+state.prp*2200)*2.01*pm);s(S.crk.gn.gain,0)}
/* hydrazine engines: a harsh hissing roar that fades as the stage flies off */
export function auSC(s,V,pm){const nn=state.N*state.fu,cl=sc.done?0:Math.exp(-Math.hypot(sc.x,state.alt-10)/90);
 s(S.rum.gn.gain,(nn*1.1+state.ign*.4)*cl);s(S.rum.fl.frequency,70+nn*120);
 s(S.roar.gn.gain,(nn*.75+state.ign*.3)*cl*(1+.15*Math.sin(state.simT*23)));s(S.roar.fl.frequency,700+nn*1400);
 s(S.crk.gn.gain,nn*(.1+Math.random()*.35)*cl,.02);s(S.crk.fl.frequency,1800);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,0);s(S.sg2.gn.gain,0)}
/* turboprop panel: a blade section at its pitch angle to the plane of rotation, the thrust arrow, and where the thrust comes from */
export function propInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('PROPELLER',x+8,y+11);
 const cs=state.ph==2&&state.prp>.97;g.textAlign='right';g.fillStyle=state.beta>80?'#d9822b':cs?'#3fcf7a':'#6c7482';g.fillText(state.beta>80?'FEATHERED':cs?'CONSTANT SPEED':'',x+w-8,y+11);
 const s2=h-22,bx=x+8,cx=bx+s2/2,cy=y+16+s2*.62,b=state.beta*Math.PI/180,L2=s2*.34,T=tpT();
 g.strokeStyle='#4a5160';g.setLineDash([3,3]);g.beginPath();g.moveTo(bx,cy);g.lineTo(bx+s2,cy);g.stroke();g.setLineDash([]);
 g.fillStyle='#6c7482';g.textAlign='left';g.fillText('\u2192 SPIN',bx,cy+9);
 g.save();g.translate(cx,cy);g.rotate(-b);g.fillStyle='#b4bccb';g.beginPath();g.moveTo(L2,0);g.quadraticCurveTo(0,-L2*.2,-L2,-L2*.04);g.quadraticCurveTo(-L2*1.04,0,-L2,L2*.05);g.quadraticCurveTo(0,L2*.08,L2,0);g.fill();g.restore();
 const al=Math.min(s2*.5,3+T/140e3*s2*.48);g.strokeStyle='#ff9a3a';g.fillStyle='#ff9a3a';g.lineWidth=2;g.beginPath();g.moveTo(cx,cy-4);g.lineTo(cx,cy-4-al);g.stroke();g.lineWidth=1;
 if(al>6){g.beginPath();g.moveTo(cx,cy-8-al);g.lineTo(cx-4,cy-2-al);g.lineTo(cx+4,cy-2-al);g.closePath();g.fill()}
 g.textAlign='left';const tx=x+s2+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['PROPS','\u2248'+(T/1000).toFixed(0)+' kN'],['JET',(state.ph==2?TPJ*state.N*state.fu/1000:0).toFixed(1)+' kN'],['SHAFT',(tpP()/1e6).toFixed(1)+' MW'],['BLADE',state.beta.toFixed(0)+'\u00b0']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle='#d8dde6';g.fillText(l[1],tx+46,ty+i*lh)})}
/* sky crane panel: side view of descent stage, bridles and rover over the ground (to scale, 40 m tall) */
export function craneInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('SKY CRANE',x+8,y+11);
 const stt=sc.done?'ROVER DOWN':sc.fly?'FLYAWAY':sc.cut?'BRIDLES CUT':sc.td?'TOUCHDOWN':sc.bl>.05?'LOWERING':'DESCENT';g.textAlign='right';g.fillStyle=sc.td?'#3fcf7a':'#ff9a3a';g.fillText(stt,x+w-8,y+11);
 const s2=h-22,bx=x+8,gy2=y+16+s2-3,k=(s2-8)/40,Y=v=>gy2-Math.min(40,Math.max(0,v))*k,ry=Math.max(0,skyRy()),cx=bx+s2*.4;
 g.strokeStyle='#7a4a30';g.beginPath();g.moveTo(bx,gy2);g.lineTo(bx+s2,gy2);g.stroke();
 const rw=Math.max(5,3*k),rh=Math.max(3,RH*k);g.fillStyle='#d8dde6';g.fillRect(cx-rw/2,Y(ry)-rh,rw,rh);
 if(!sc.done){const sx=Math.min(bx+s2-4,cx+sc.x*k),sy=Y(state.alt),sw=Math.max(6,3.2*k),sh=Math.max(2.5,1.2*k);
  g.strokeStyle='rgba(232,228,216,.8)';if(sc.bl>.05&&!sc.cut){g.beginPath();g.moveTo(sx,sy);g.lineTo(cx,Y(ry)-rh);g.stroke()}
  g.fillStyle='#c8a050';g.fillRect(sx-sw/2,sy-sh,sw,sh);if(state.ph==2&&state.N>.02){g.fillStyle='rgba(255,154,58,.8)';g.fillRect(sx-sw/2,sy,1.5,2+state.N*6);g.fillRect(sx+sw/2-1.5,sy,1.5,2+state.N*6)}}
 g.textAlign='left';const tx=x+s2+18,lh=Math.min(13,(h-22)/4),ty=y+24,m=sc.td||sc.cut?MS:MS+MR,tw=sc.T/(m*GM);
 [['ROVER',ry.toFixed(1)+' m'],['V/S',(sc.td?0:state.vz).toFixed(2)+' m/s'],['T/W',tw.toFixed(2)],['ENGINES',sc.act==8?'8 LIT':'4 + 4 AT 1%']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle=l[0]=='T/W'&&tw>1?'#3fcf7a':'#d8dde6';g.fillText(l[1],tx+50,ty+i*lh)})}
/* Harrier hover panel: side view of the jet over the pad, thrust vector arrow, height, vertical speed, lift/weight */
export function hoverInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('HOVER',x+8,y+11);
 g.textAlign='right';g.fillStyle=state.alt>.05?'#3fcf7a':'#6c7482';g.fillText(state.alt>.05?'AIRBORNE':'ON PAD',x+w-8,y+11);
 const cs=h-22,bx=x+8,by=y+16,T=harT(),lw=T*Math.sin(state.nz*Math.PI/180)/(HM*G0),gy2=by+cs-3,py=gy2-6-Math.min(1,state.alt/30)*(cs-16),px=bx+cs*.45,a=state.nz*Math.PI/180,al2=6+Math.min(1.3,T/(HM*G0))*12;
 g.strokeStyle='#4a5160';g.beginPath();g.moveTo(bx,gy2);g.lineTo(bx+cs,gy2);g.stroke();
 g.strokeStyle='#ff9a3a';g.lineWidth=2;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*al2,py+Math.sin(a)*al2);g.stroke();g.lineWidth=1;
 g.fillStyle='#b4bccb';g.beginPath();g.moveTo(px-12,py);g.lineTo(px+10,py-1.5);g.lineTo(px+12,py+1.5);g.lineTo(px-12,py+2.5);g.closePath();g.fill();
 g.textAlign='left';const tx=x+cs+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['ALT',(state.alt*3.281).toFixed(0)+' ft'],['V/S',(state.vz*196.85).toFixed(0)+' fpm'],['LIFT/WT',lw.toFixed(2)],['FWD',(T*Math.cos(a)/1000).toFixed(1)+' kN']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle=l[0]=='LIFT/WT'&&lw>1?'#3fcf7a':'#d8dde6';g.fillText(l[1],tx+52,ty+i*lh)})}
