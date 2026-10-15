// The machine table MC and every machine-specific helper (sim steps, voices, insets, RS-25 2D drawing). Split into src/machines/<name>/ in step 5.
import { S, thump } from '../audio/audio.js';
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { MONO, g, sm } from '../core/util.js';
import { lab, say } from '../hud/controls.js';
import { applyRaw } from '../input/lever.js';
import { EM, VP } from '../render2d/index.js';
import { body, metal, plume, rear, sparks, stream } from '../render2d/jet.js';
import { SP, blob } from '../render2d/sprites.js';
import { SQ } from '../sequence/sequence.js';

/* per-machine voices: each sets the same nodes (rumble, roar, whine, upper siren, crackle, starter) its own way */
export function auF(s,V,pm){
 s(S.rum.gn.gain,(state.N*.6*(.35+.65*state.fu)+state.A*.7+state.sg*.12+state.ign*.7)*(1+state.stl*.4*Math.sin(state.simT*50)));s(S.rum.fl.frequency,90+state.N*110+state.A*240);
 s(S.roar.gn.gain,(state.N*state.N*(.05+.17*state.fu)+state.A*.5+state.sg*.04+state.ign*.35)*(1+state.stl*.6*Math.sin(state.simT*75)));s(S.roar.fl.frequency,250+state.N*800+state.A*1500);
 s(S.wh.gn.gain,state.N*.05*(1-state.A*.8)*(1+(1-state.fu)*1.6)+state.spd*.16);s(S.osc.frequency,(180+state.N*1500)*pm);s(S.wh.fl.frequency,(900+state.N*2200)*pm);
 s(S.wh2.gn.gain,state.spd*.09+state.N*.012*(1-state.A)*(1+(1-state.fu)*2));s(S.osc2.frequency,(180+state.N*1500)*2.01*pm);
 s(S.crk.gn.gain,state.A*(.5+Math.random()*1.2)*(.8+V.raw)+state.stl*(.3+Math.random()*.9),.02);s(S.crk.fl.frequency,700);
 s(S.sg.gn.gain,state.sg*.12);s(S.so.frequency,(60+state.N*2600)*pm);s(S.sg.fl.frequency,300+state.N*3000);
 s(S.sg2.gn.gain,state.sg*.05);s(S.so2.frequency,(30+state.N*500)*pm)}
/* J58: bigger, lower, rougher. Slow rolling rumble, deeper whine, harder crackle; the starter is a pair of V8 start-cart engines burbling */
export function auSR(s,V,pm){const bur=.62+.38*Math.sin(state.simT*55)*Math.sin(state.simT*37+1);
 s(S.rum.gn.gain,(state.N*.78*(.35+.65*state.fu)+state.A*.85+state.sg*.3*bur+state.ign*.9)*(1+.12*Math.sin(state.simT*7.3))*(1+state.stl*.4*Math.sin(state.simT*50)));s(S.rum.fl.frequency,70+state.N*95+state.A*230);
 s(S.roar.gn.gain,(state.N*state.N*(.06+.21*state.fu)+state.A*.62+state.sg*.03+state.ign*.45)*(1+state.stl*.6*Math.sin(state.simT*75)));s(S.roar.fl.frequency,200+state.N*700+state.A*1300);
 s(S.wh.gn.gain,state.N*.055*(1-state.A*.7)*(1+(1-state.fu)*1.6)+state.spd*.16);s(S.osc.frequency,(130+state.N*1150)*pm);s(S.wh.fl.frequency,(700+state.N*1900)*pm);
 s(S.wh2.gn.gain,state.spd*.09+state.N*.01*(1-state.A)*(1+(1-state.fu)*2));s(S.osc2.frequency,(130+state.N*1150)*2.01*pm);
 s(S.crk.gn.gain,state.A*(.7+Math.random()*1.5)*(.8+V.raw)+state.stl*(.3+Math.random()*.9),.02);s(S.crk.fl.frequency,640);
 s(S.sg.gn.gain,state.sg*.2*bur);s(S.so.frequency,(46+state.N*220)*pm);s(S.sg.fl.frequency,170+state.N*500);
 s(S.sg2.gn.gain,state.sg*.1*bur);s(S.so2.frequency,(24+state.N*90)*pm)}
/* RS-25: no whine at all. Deep thunder, a wide roar and hydrogen crackle; during start a hiss of chilldown vents */
export function auSS(s,V,pm){const nn=state.N*state.fu;
 s(S.rum.gn.gain,(nn*1.25+state.ign*1.1)*(1+.14*Math.sin(state.simT*37)*Math.sin(state.simT*11+2)));s(S.rum.fl.frequency,60+state.N*95);
 s(S.roar.gn.gain,nn*nn*.5+state.ign*.55+state.sg*.07);s(S.roar.fl.frequency,state.sg>.05&&nn<.05?3200:180+state.N*950);
 s(S.crk.gn.gain,nn*(.3+Math.random()*.8)*(.8+V.raw)+state.ign*.4,.02);s(S.crk.fl.frequency,900+state.N*500);
 s(S.wh.gn.gain,0);s(S.wh2.gn.gain,0);s(S.sg.gn.gain,0);s(S.sg2.gn.gain,0)}
/* ---------- machines: everything that differs between engines lives here ----------
   ab: has an afterburner zone (lever detent at MIL); stall: can surge; idle: spool target at lever 0; up/dn: spool time constants;
   coast: spin-down tau with fuel off; cN/cT: starter speed and duration; e/f: EGT and fuel-flow curves; teb: green light-off flash */
export const MC=[{
 n:'AFTERBURNER',btn:'F-TYPE',sub:'Afterburning turbofan. Push through the detent.',hint:'Drag the lever up. Push through the detent.',
 nxf:.34,ab:1,stall:1,idle:.28,up:1.1,dn:.8,coast:3.2,cN:.13,cT:2.4,tk:[1.5,.09],ign:1,lk:.4,e0f:480,lt:.8,teb:0,
 e:[40,620,90],f:[.35,7.1,2.2,36],off:'FUEL OFF',st:'STARTING',cl:'COASTING',cut:'Fuel cut. Rotor coasting down...',wait:'Let the rotor spool down before restarting.',
 r:()=>(30+18*state.A)*state.u,shk:()=>state.N*state.N*1.2+state.A*4+state.kick*12,
 gl:()=>[state.A*.3+state.N*state.N*.06*state.fu+state.ign*.2,160+state.A*700+state.N*120],skyG:()=>state.A*.4+state.N*state.N*.05*state.fu+state.ign*.1,
 hzk:()=>state.A+state.N*state.N*.28*state.fu+state.hg*state.hg*.12,hzg:()=>[62+state.A*46,300+state.A*900],hza:()=>.8+state.A*4.2+state.N*1.4,blk:()=>state.A*.3+state.N*state.N*.05*state.fu+state.kick*.3+state.ign*.15,
 g:[{t:'N1',cap:'N1 SPEED %',min:0,max:110,maj:20,mn:10,red:102,d:1,f:v=>v|0},
    {t:'EGT',cap:'EGT °C x100',min:0,max:900,maj:200,mn:100,red:760,d:100,f:v=>v|0},
    {t:'FF',cap:'FUEL klb/h',min:0,max:50,maj:10,mn:5,red:46,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[state.N*100,state.E,state.F],
 lv:[['MAX',1,'t'],['AFTERBURNER',.85],['MIL',.7],['IDLE',0,'b']],
 lp:()=>[['A/B',state.A>.05,'#ff8a2a'],['EGT HI',state.E>720&&(state.simT*6%1<.6),'#e0392b']],
 mc:[[0,'#1a1e26'],[.35,'#4a5160'],[.5,'#6a7282'],[.65,'#3a404c'],[1,'#12151b']],dk:1,bl:0,
 bd:{ts:120,xt:64,hh:64,fh:78,doors:0},
 pl:{dl:[70,140],dp:[SP.b,SP.b,SP.o,SP.r],al:[240,1000],ap:[SP.y,SP.y,SP.o,SP.r],sn:64,ak:1,cp:[SP.w,SP.y,SP.y,SP.o],dn:[3,2,5],ds:[34,38,8],dc:[SP.y,SP.b]},
 spike:0,draw:(r,dt)=>{plume(r,dt);body(r)},rear:rear,au:auF,
 sqc:'STARTER SPIN-UP',
 sq:[{cap:'IDLE',wait:1.6},
  {cap:'SPOOLING UP',lever:.74,dur:3.6},
  {cap:'MIL POWER',until:()=>state.N>.9,wait:.6,max:6},
  {cap:'PUSH THROUGH THE DETENT',lever:1,dur:1.6,view:1,slow:.35},
  {cap:'AFTERBURNER LIGHT',until:()=>state.lit,wait:1.3,max:6},
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
 r:()=>(34+20*state.A)*state.u,shk:()=>state.N*state.N*1.3+state.A*4.4+state.kick*12,
 gl:()=>[state.A*.32+state.N*state.N*.06*state.fu+state.ign*.2+state.gn*.1,200+state.A*800+state.N*120],skyG:()=>state.A*.42+state.N*state.N*.05*state.fu+state.ign*.1+state.gn*.05,
 hzk:()=>state.A+state.N*state.N*.3*state.fu+state.hg*state.hg*.14,hzg:()=>[66+state.A*52,340+state.A*1250],hza:()=>.9+state.A*4.6+state.N*1.5,blk:()=>state.A*.2+state.N*state.N*.05*state.fu+state.kick*.3+state.ign*.15+state.gn*.15,
 g:[{t:'RPM',cap:'RPM %',min:0,max:110,maj:20,mn:10,red:104,d:1,f:v=>v|0},
    {t:'EGT',cap:'EGT °C x100',min:0,max:900,maj:200,mn:100,red:780,d:100,f:v=>v|0},
    {t:'FF',cap:'FUEL klb/h',min:0,max:40,maj:10,mn:5,red:32,d:1,f:v=>v.toFixed(1)}],
 gv:()=>[state.N*100,state.E,state.F],
 lv:[['MAX',1,'t'],['AFTERBURNER',.85],['MIL',.7],['IDLE',0,'b']],
 lp:()=>[['A/B',state.A>.05,'#ff8a2a'],['EGT HI',state.E>740&&(state.simT*6%1<.6),'#e0392b']],
 mc:[[0,'#0c0f16'],[.3,'#232b3a'],[.5,'#3a4558'],[.68,'#1d2431'],[1,'#080a10']],dk:.62,bl:14,
 bd:{ts:210,xt:110,hh:62,fh:78,doors:1},
 pl:{dl:[90,170],dp:[SP.b,SP.b,SP.o,SP.r],al:[320,1300],ap:[SP.c,SP.b,SP.y,SP.o,SP.r],sn:84,ak:.42,cp:[SP.c,SP.y,SP.y,SP.o],dn:[5,3,8],ds:[30,34,8],dc:[SP.b,SP.b]},
 spike:1,draw:(r,dt)=>{plume(r,dt);body(r)},rear:rear,au:auSR,
 sqc:'START CART SPINNING UP',
 sq:[{cap:'IDLE  ABOUT 3,950 RPM',wait:2},
  {cap:'ACCELERATING',lever:.74,dur:5},
  {cap:'MIL POWER',until:()=>state.N>.9&&state.mach>1.1,wait:.5,max:10},
  {cap:'PUSH THROUGH THE DETENT',lever:1,dur:2.2,view:1,slow:.35},
  {cap:'TEB LIGHT',until:()=>state.lit,wait:1.4,max:6},
  {cap:'FULL AFTERBURNER',slow:1,wait:1.5,view:0},
  {cap:'SPIKE SLIDING AFT',until:()=>state.mach>2.8,wait:2,max:14},
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
 r:()=>74*state.u,shk:()=>state.N*state.N*2.4*state.fu+state.kick*10,
 gl:()=>[state.N*state.N*.15*state.fu+state.ign*.2,200+state.N*520],skyG:()=>state.N*state.N*.3*state.fu+state.ign*.15,
 hzk:()=>state.N*state.N*.85*state.fu,hzg:()=>[105,260+state.N*state.N*700*state.fu],hza:()=>1+state.N*3.4*state.fu,blk:()=>state.N*state.N*.22*state.fu+state.kick*.3+state.ign*.2,
 g:[{t:'THR',cap:'THRUST %',min:0,max:120,maj:20,mn:10,red:109.5,d:1,f:v=>v|0},
    {t:'Pc',cap:'Pc psia x100',min:0,max:35,maj:10,mn:5,red:30,d:1,f:v=>(v*100)|0},
    {t:'FLOW',cap:'lb/s x100',min:0,max:1200,maj:200,mn:100,red:1150,d:100,f:v=>v|0}],
 gv:()=>[state.N*109,state.N*29.94*state.fu,state.F],   /* 2,994 psia is the published figure at 109%; other levels scaled with thrust */
 lv:[['109% FPL',1,'t'],['104.5%',.89],['100% RATED',.78],['67% MIN',0,'b']],
 lp:()=>[['RATED',state.N>=.915&&state.fu>.9,'#3fcf7a'],['FPL',state.N>.995,'#e0392b']],
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
 r:()=>0,shk:()=>state.kick*2,gl:()=>[0,0],skyG:()=>0,hzk:()=>0,hzg:()=>[0,0],hza:()=>0,blk:()=>0,
 g:[{t:'THR',cap:'THRUST mN',min:0,max:300,maj:50,mn:25,red:260,d:1,f:v=>v|0},
    {t:'PWR',cap:'POWER kW',min:0,max:5,maj:1,mn:.5,red:4.6,d:1,f:v=>v.toFixed(2)},
    {t:'Xe',cap:'XENON mg/s',min:0,max:16,maj:4,mn:2,red:15,d:1,f:v=>v.toFixed(1)}],
 gv:()=>{const th=htT();return[th*1000,state.ph==1?.22+.03*Math.sin(state.simT*3):4.5*state.N*state.fu,th/((1300+500*state.N)*9.80665)*1e6]},
 lv:[['4.5 kW',1,'t'],['2.7 kW',.5],['0.9 kW',0,'b']],
 lp:()=>[['DISCHARGE',state.ph==2&&state.fu>.5,'#5aa0ff'],['MAX PWR',state.N>.98,'#e0392b']],
 mc:[[0,'#000'],[1,'#000']],dk:1,bl:0,bd:{ts:0,xt:0,hh:0,fh:0,doors:0},pl:null,
 spike:0,draw:()=>{},rear:()=>{},au:auHT,
 sqc:'CATHODE HEATER, XENON FLOW, IGNITION',
 sq:[{cap:'DISCHARGE LIT  0.9 kW',wait:1.6},
  {cap:'THROTTLE UP  4.5 kW',lever:1,dur:3},
  {cap:'240 mN: ABOUT THREE QUARTERS IN YOUR HAND',wait:3,view:2},
  {cap:'TIME WARP  x100,000',do:()=>{state.sl=2;lab()},wait:4.5,view:0},
  {cap:'ORBIT CLIMBING',wait:3.5,view:3},
  {cap:'BACK TO REAL TIME',do:()=>{state.sl=0;lab()},wait:1.5},
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
},{
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
},{
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
},{
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
/* Hall thruster thrust (N) from the power fraction N; what-if orbit raising from 400 km */
export const htT=()=>state.ph==2?.24*Math.pow(state.N,.9)*state.fu:0,MU=3.986004418e14,RE=6371e3,WN=['1x','1,000x','100,000x'],WF=[1,1000,100000];
export const orb={r:RE+400e3,m:2747,t:0,dv:0,xe:0,vph:0,tr:[]};
export function orbReset(){orb.r=RE+400e3;orb.m=2747;orb.t=orb.dv=orb.xe=orb.vph=0;orb.tr=[]}
export function orbStep(dt){const W=WF[state.sl],dtw=dt*W,T=htT(),md=T/((1300+500*state.N)*9.80665),a=T/orb.m;
 if(T>0){let v=Math.sqrt(MU/orb.r);v-=a*dtw;orb.r=MU/(v*v);orb.m-=md*dtw;orb.dv+=a*dtw;orb.xe+=md*dtw}
 orb.t+=dtw;orb.vph+=dt*Math.min(W,60)*Math.sqrt(MU/(orb.r*orb.r*orb.r));
 const al=(orb.r-RE)/1e3,lt=orb.tr[orb.tr.length-1];if(!lt||Math.abs(al-lt[0])>2||orb.vph-lt[1]>.25){orb.tr.push([al,orb.vph]);if(orb.tr.length>160)orb.tr.shift()}}
/* there is no sound in vacuum: a faint power-electronics hum stands in */
export function auHT(s,V,pm){const nn=state.N*state.fu;
 s(S.rum.gn.gain,nn*.07+state.sg*.02+state.ign*.25);s(S.rum.fl.frequency,55+nn*20);
 s(S.roar.gn.gain,state.ign*.12);s(S.roar.fl.frequency,1800);s(S.crk.gn.gain,0);
 s(S.wh.gn.gain,nn*.01+state.sg*.004);s(S.osc.frequency,(1500+nn*700)*pm);s(S.wh.fl.frequency,2600);
 s(S.wh2.gn.gain,0);s(S.sg.gn.gain,state.sg*.015);s(S.so.frequency,100*pm);s(S.sg.fl.frequency,300);s(S.sg2.gn.gain,0)}

/* ---------- RS-25 (shuttle main engine): bell nozzle, near-invisible hydrogen plume with steam, gimbal ---------- */
export const gimb=()=>.05*sm(.45,1,state.N)*state.fu*(Math.sin(state.simT*.8)*.6+Math.sin(state.simT*1.9+1)*.4)+.004*state.N*Math.sin(state.simT*23);
export function drawSS(r,dt){
 const ts=state.nx-220*state.u,px=ts-64*state.u,gm=gimb();
 g.save();g.translate(px,state.ny);g.rotate(gm);g.translate(-px,-state.ny);plumeSS(r,dt);bellSS(r,ts,px);g.restore();baySS(px,gm)}
export function plumeSS(r,dt){
 g.globalCompositeOperation='lighter';const T=state.simT,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),nn=state.N*state.fu;
 const gr=(200+nn*520)*state.u,rg=g.createRadialGradient(state.nx+140*state.u,state.ny,0,state.nx+140*state.u,state.ny,gr);
 rg.addColorStop(0,`rgba(150,175,255,${(nn*nn*.15+state.ign*.2)*fl})`);rg.addColorStop(.55,`rgba(255,150,90,${(nn*nn*.04+state.ign*.05)*fl})`);rg.addColorStop(1,'rgba(255,120,40,0)');
 g.globalAlpha=1;g.fillStyle=rg;g.fillRect(-state.W,-state.H,state.W*3,state.H*3);
 const len=(260+nn*nn*520)*state.u*(1+state.kick*.2);
 if(nn>.02){
  const qf=state.Q>1?1:.65;   /* fewer, brighter sprites when the frame rate is struggling */
  stream(len*1.05,r,nn*fl*.23/qf,Math.round(28*qf),T,[SP.l,SP.b,SP.b,SP.o],0);
  stream(len*.72,r*.78,nn*fl*.3/qf,Math.round(24*qf),T+2,[SP.c,SP.b,SP.l],1);
  stream(len*.2,r*.5,nn*fl*.16/qf,Math.round(12*qf),T+4,[SP.w,SP.c,SP.b],2);
  blob(SP.w,state.nx+6*state.u,state.ny,r*.7,r*1.8,nn*.28*fl)}
 if(state.ign>.02)stream((70+170*state.ign)*state.u,r*1.05,state.ign*.7,26,T*1.3,[SP.y,SP.o,SP.o,SP.r],5);
 /* burn-off igniters during priming: sparklers under the bell */
 if(state.ph==1&&state.st>.5){let n=dt*50;n=Math.floor(n)+(Math.random()<n%1?1:0);for(;n>0&&EM.length<120;n--)EM.push({x:state.nx+Math.random()*40*state.u,y:state.ny+(Math.random()-.5)*r*1.8,vx:(30+Math.random()*170)*state.u,vy:-Math.random()*240*state.u,l:0,m:.5+Math.random()*.6})}
 sparks(dt);
 /* diamonds: bright pale rings close to the exit */
 const dn=4+Math.floor(nn*3),sp=r*(1.05+nn*.15),da=sm(.45,1,nn)*.9;
 for(let i=0;i<dn;i++){const a=da*(1-i/(dn+1))*(.85+.15*Math.sin(T*90+i*2)),rr=Math.max(2,r*(.66-i*.075)),x=state.nx+(i+.9)*sp;
  blob(SP.b,x,state.ny,sp*.95,rr*2.1,a*.6);blob(SP.w,x,state.ny,sp*.42,rr*.9,a*.8)}
 /* steam: water vapour drifting off the plume */
 let n=nn*dt*(state.Q>1?16:9);n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&VP.length<(state.Q>1?70:34);n--)VP.push({x:state.nx+Math.random()*70*state.u,y:state.ny+(Math.random()-.5)*r*2.1,vx:(40+Math.random()*130)*state.u,vy:-(20+Math.random()*80)*state.u,l:0,m:1.6+Math.random()*1.4,s:(40+Math.random()*50)*state.u});
 g.globalCompositeOperation='source-over';
 for(let i=VP.length-1;i>=0;i--){const p=VP[i];p.l+=dt;if(p.l>p.m){VP[i]=VP[VP.length-1];VP.pop();continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=14*state.u*dt;p.vx*=Math.exp(-dt*.5);const f=p.l/p.m,z=p.s*(1+1.6*f);blob(SP.s,p.x,p.y,z,z,(f<.2?f/.2:1)*(1-f)*(.09+.18*nn))}
 g.globalCompositeOperation='lighter';g.globalAlpha=1}
/* bell: chamber barrel, throat, parabola-ish contour with cooling-tube lines and stiffening rings */
export function bellSS(r,ts,px){
 const rth=11*state.u,len=state.nx-ts,h=t=>rth+(r-rth)*(1-Math.pow(1-t,1.8)),n=26,mr=22*state.u;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createLinearGradient(0,state.ny-mr,0,state.ny+mr);[[0,'#2a2f3a'],[.4,'#8f99aa'],[.55,'#c4cbd6'],[1,'#20252f']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.fillStyle=gd;g.beginPath();g.moveTo(px,state.ny-mr);g.lineTo(ts-26*state.u,state.ny-mr);g.lineTo(ts,state.ny-rth);g.lineTo(ts,state.ny+rth);g.lineTo(ts-26*state.u,state.ny+mr);g.lineTo(px,state.ny+mr);g.closePath();g.fill();
 gd=g.createLinearGradient(0,state.ny-r,0,state.ny+r);[[0,'#4a3320'],[.3,'#b88c52'],[.5,'#e6c48c'],[.7,'#a0743a'],[1,'#2e1e10']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.beginPath();g.moveTo(ts,state.ny-rth);for(let i=1;i<=n;i++){const t=i/n;g.lineTo(ts+t*len,state.ny-h(t))}
 for(let i=n;i>=0;i--){const t=i/n;g.lineTo(ts+t*len,state.ny+h(t))}g.closePath();g.fillStyle=gd;g.fill();
 g.strokeStyle='rgba(30,18,8,.38)';g.lineWidth=1.2*state.u;
 for(let k=-4;k<=4;k++){const f=k/4.6;g.beginPath();for(let i=0;i<=n;i++){const t=i/n,y=state.ny+f*h(t);i?g.lineTo(ts+t*len,y):g.moveTo(ts+t*len,y)}g.stroke()}
 g.strokeStyle='rgba(20,12,4,.55)';g.lineWidth=2.2*state.u;[.3,.58,.84].forEach(t=>{g.beginPath();g.moveTo(ts+t*len,state.ny-h(t));g.lineTo(ts+t*len,state.ny+h(t));g.stroke()});
 g.strokeStyle='rgba(235,225,205,.7)';g.lineWidth=2.5*state.u;g.beginPath();g.moveTo(state.nx,state.ny-r);g.lineTo(state.nx,state.ny+r);g.stroke();
 g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2*state.u;g.beginPath();g.moveTo(ts,state.ny-rth);g.lineTo(ts,state.ny+rth);g.stroke()}
/* engine bay behind the gimbal: sealed casing, or exposed pumps, ducts and the two gimbal actuators */
export function baySS(px,gm){
 const fh=74*state.u,bx=px-4*state.u,co=Math.cos(gm),si=Math.sin(gm),rot=(dx,dy)=>[px+dx*co-dy*si,state.ny+dx*si+dy*co];
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(!state.exposed){g.fillStyle=metal(fh);g.fillRect(-60,state.ny-fh,bx+60,fh*2);g.fillStyle='#0a0c10';g.fillRect(bx-3*state.u,state.ny-fh,3*state.u,fh*2);return}
 g.fillStyle='#0b0d11';g.fillRect(-60,state.ny-fh,bx+60,fh*2);
 const cyl=(x,y0,y1,w)=>{const gd=g.createLinearGradient(x-w/2,0,x+w/2,0);gd.addColorStop(0,'#1d2330');gd.addColorStop(.4,'#8f99aa');gd.addColorStop(1,'#20262f');g.fillStyle=gd;g.fillRect(x-w/2,y0,w,y1-y0)};
 cyl(px-100*state.u,state.ny-fh*.93,state.ny-10*state.u,40*state.u);cyl(px-52*state.u,state.ny+10*state.u,state.ny+fh*.93,36*state.u);
 g.lineCap='round';
 g.strokeStyle='#b0703a';g.lineWidth=9*state.u;g.beginPath();g.moveTo(px-84*state.u,state.ny-36*state.u);g.lineTo(bx-4*state.u,state.ny-26*state.u);g.stroke();
 g.strokeStyle='#8f99aa';g.lineWidth=7*state.u;g.beginPath();g.moveTo(px-38*state.u,state.ny+34*state.u);g.lineTo(bx-4*state.u,state.ny+22*state.u);g.stroke();
 g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5*state.u;g.beginPath();g.moveTo(px-84*state.u,state.ny-39*state.u);g.lineTo(bx-4*state.u,state.ny-29*state.u);g.moveTo(px-38*state.u,state.ny+31*state.u);g.lineTo(bx-4*state.u,state.ny+19*state.u);g.stroke();
 [[-1,-26],[1,26]].forEach(a=>{const ax=px-135*state.u,ay=state.ny+a[0]*fh*.9,l=rot(14*state.u,a[1]*state.u),mx=ax+(l[0]-ax)*.55,my=ay+(l[1]-ay)*.55;
  g.strokeStyle='#2a313d';g.lineWidth=11*state.u;g.beginPath();g.moveTo(ax,ay);g.lineTo(mx,my);g.stroke();
  g.strokeStyle='#c4cbd6';g.lineWidth=4*state.u;g.beginPath();g.moveTo(mx,my);g.lineTo(l[0],l[1]);g.stroke();
  g.fillStyle='#e4e8ee';g.beginPath();g.arc(l[0],l[1],3.2*state.u,0,6.283);g.fill();g.beginPath();g.arc(ax,ay,3.4*state.u,0,6.283);g.fill()});
 g.lineCap='butt'}
/* rear view: looking up the bell, tube-wall rings shrinking to a glowing throat */
export function rearSS(){
 const cx=state.W*.44,cy=state.H*.5,T=state.simT,R=Math.min(state.W,state.H)*.34,nn=state.N*state.fu,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),rth=R*.13;
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
 blob(SP.y,cx,cy,R*2.4,R*2.4,state.ign*.8);blob(SP.o,cx,cy,R*4,R*4,nn*.05*fl);g.globalAlpha=1}
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
/* what-if orbit raising: Earth, the orbit (altitude exaggerated), the spiral so far, mission clock */
export function orbitInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('ORBIT (WHAT-IF)',x+8,y+11);
 g.textAlign='right';g.fillStyle=state.sl?'#ff9a3a':'#6c7482';g.fillText('WARP '+WN[state.sl],x+w-8,y+11);
 const al=(orb.r-RE)/1e3,cs=h-22,cx=x+8+cs/2,cy=y+16+cs/2,er=cs*.26,orr=a=>er*(1+a/6371*6);
 g.fillStyle='#1b3c78';g.beginPath();g.arc(cx,cy,er,0,6.283);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(cx-er*.25,cy-er*.25,er*.55,0,6.283);g.fill();
 g.strokeStyle='rgba(120,160,255,.35)';g.beginPath();g.arc(cx,cy,Math.min(cs*.5,orr(al)),0,6.283);g.stroke();
 if(orb.tr.length>1){g.strokeStyle='rgba(120,180,255,.8)';g.beginPath();orb.tr.forEach((p,i)=>{const r=Math.min(cs*.5,orr(p[0])),X=cx+Math.cos(-p[1])*r,Y=cy+Math.sin(-p[1])*r;i?g.lineTo(X,Y):g.moveTo(X,Y)});g.stroke()}
 const rr=Math.min(cs*.5,orr(al));g.fillStyle='#ffd27a';g.beginPath();g.arc(cx+Math.cos(-orb.vph)*rr,cy+Math.sin(-orb.vph)*rr,2.6,0,6.283);g.fill();
 g.textAlign='left';g.fillStyle='#d8dde6';const tx=x+cs+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['DAY',(orb.t/86400).toFixed(2)],['ALT',al.toFixed(1)+' km'],['\u0394v',orb.dv.toFixed(1)+' m/s'],['XENON',orb.xe.toFixed(2)+' kg']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle='#d8dde6';g.fillText(l[1],tx+44,ty+i*lh)})}
/* cutaway of the inlet: cowl, translating spike, shock lines running from the tip to the cowl lip */
export function spikeInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('INLET SPIKE',x+8,y+11);
 g.textAlign='right';g.fillStyle=state.spk>.03?'#ff9a3a':'#6c7482';g.fillText('M'+state.mach.toFixed(1)+'  '+(state.spk*26).toFixed(0)+' IN AFT',x+w-8,y+11);
 const cy=y+11+(h-11)/2,hh=(h-26)*.44,x0=x+10,len=w-20,X=f=>x0+f*len;
 g.lineWidth=2;g.strokeStyle='#8f99aa';
 for(let s=-1;s<=1;s+=2){g.beginPath();g.moveTo(X(.02),cy+s*hh*1.12);g.lineTo(X(.3),cy+s*hh*.78);g.lineTo(X(.56),cy+s*hh*.52);g.lineTo(X(.8),cy+s*hh*.62);g.lineTo(X(.97),cy+s*hh*.62);g.stroke()}
 const tx=.08+state.spk*.24,cr=hh*.34;   /* tip travels aft with spk */g.fillStyle='#b4bccb';g.beginPath();g.moveTo(X(tx),cy);g.lineTo(X(tx+.3),cy-cr);g.lineTo(X(.8),cy-cr);g.lineTo(X(.8),cy+cr);g.lineTo(X(tx+.3),cy+cr);g.closePath();g.fill();
 g.fillStyle='#3a404c';g.fillRect(X(.8),cy-hh*.62,len*.17,hh*1.24);
 const sa=.18+.7*sm(1,2.6,state.mach);g.lineWidth=1.3;g.strokeStyle=`rgba(120,200,255,${sa})`;
 for(let s=-1;s<=1;s+=2){g.beginPath();g.moveTo(X(tx),cy);g.lineTo(X(.3),cy+s*hh*.78);g.stroke()}
 g.fillStyle='rgba(160,210,255,.6)';for(let k=0;k<5;k++){const f=((state.simT*(.15+state.mach*.3)+k*.2)%1)*.78+.04;g.fillRect(X(f),cy+(k%2?1:-1)*hh*.55-1,3,2)}
 g.textAlign='left'}
