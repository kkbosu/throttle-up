// NK-12: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';
import { propInset } from './inset.js';

/* NK-12 turboprop. Power comes from the lever; a governor holds RPM by changing blade pitch, so once governed, more power means coarser blades, not faster ones.
   On shutdown the blades feather (turn edge-on). Static propeller thrust is a momentum-theory estimate with an assumed figure of merit of 0.6 */
export const TPW=11.03e6,TPJ=2780,tpP=()=>state.ph==2?TPW*state.N*state.fu:0,tpT=()=>2.79*Math.pow(tpP(),2/3)*sm(.3,.9,state.prp);
export function tpStep(dt){const tR=state.ph==1?.55*sm(0,state.M.cT,state.st):state.ph==2?.8+.2*sm(.08,.3,state.N):0;state.prp+=(tR-state.prp)*(1-Math.exp(-dt/(tR>state.prp?1.2:state.ph==3?1.4:.8)));
 const tB=state.ph==2?8+30*Math.pow(Math.max(0,(state.N-state.M.idle)/(1-state.M.idle)),.8):state.ph==1&&state.st>1?10:86;state.beta+=Math.max(-25*dt,Math.min(25*dt,tB-state.beta))}
/* NK-12: the propellers' beating growl, a turbine whine, and the roar of a huge mass of air */
export function auTP(s,V,pm){const nn=state.N*state.fu,bp=state.prp*42*4,bt2=1+.35*Math.sin(state.simT*6.283*2.3);
 s(S.rum.gn.gain,state.prp*.35+nn*.55+state.sg*.08+state.ign*.4);s(S.rum.fl.frequency,70+nn*90);
 s(S.roar.gn.gain,nn*nn*.28+state.prp*.05+state.ign*.25);s(S.roar.fl.frequency,300+nn*700);
 s(S.sg.gn.gain,state.prp*(.05+nn*.25)*bt2+state.sg*.08);s(S.so.frequency,Math.max(30,bp)*pm);s(S.sg.fl.frequency,180+nn*500);
 s(S.sg2.gn.gain,state.prp*(.03+nn*.12));s(S.so2.frequency,Math.max(20,bp*1.02)*pm);
 s(S.wh.gn.gain,state.prp*.05+state.spd*.1);s(S.osc.frequency,(400+state.prp*2200)*pm);s(S.wh.fl.frequency,(1500+state.prp*2500)*pm);
 s(S.wh2.gn.gain,state.prp*.02);s(S.osc2.frequency,(400+state.prp*2200)*2.01*pm);s(S.crk.gn.gain,0)}
export default {reset:()=>{state.prp=0;state.beta=86},
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
};
