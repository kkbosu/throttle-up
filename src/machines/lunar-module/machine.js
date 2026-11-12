// APOLLO LM: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S, thump } from '../../audio/audio.js';
import { DAILY, VS } from '../../core/params.js';
import { state } from '../../core/state.js';
import { say } from '../../hud/controls.js';
import { applyRaw } from '../../input/lever.js';
import { SQ } from '../../sequence/sequence.js';
import { lmInset } from './inset.js';
import lmMission from './mission.js';
import { siteH, siteSlope } from './site.js';

/* Apollo lunar module, the last 100 ft or so of the landing. Sourced (INFO): lunar gravity 1.62 m/s2; descent engine
   rated at 10,500 lb, throttled between 10 and 60% of that in the landing; Apollo 11's weight at landing 16,153 lb;
   specific impulse 305 s (the design figure); probes 1.73 m long under three footpads; landing gear good for 10 ft/s
   straight down, tapering to 7 ft/s at 4 ft/s sideways. Heights here are the footpads' height above the ground. */
export const GL = 1.62,
  FT = 0.3048,
  TMAX = 10500 * 4.448222,
  LO = 0.1,
  HI = 0.6,
  M0 = 16153.2 * 0.45359237,
  ISP = 305,
  PROBE = 1.73,
  /* game numbers: how far the craft may lean to move over the ground, how fast it gets there, and the steepest
     ground it may come to rest on */
  TILT = (10 * Math.PI) / 180,
  TILTR = (6 * Math.PI) / 180,
  STEEP = (12 * Math.PI) / 180;
/* start of the run: height above the ground (m), sink rate (m/s), place and speed over the ground (x: west, the way
   the craft faces; z: north, its right) and usable propellant (kg; MISSION sets its own, free play has no limit) */
export const LM0 = { alt: 30, vz: 0, x: 0, z: 0, vx: 0, vd: 0, prop: Infinity };
/* T: thrust (N); x, z: place over the site (site.js); vx, vd: speed forward (west) and to the right (north);
   tilt, roll: lean forward and to the left (rad); h: height above the site's datum (state.alt is the height above the
   ground straight below, as the landing radar read it); used: propellant burned (kg); con: a probe has touched;
   td: the pads are down; tdv, tdh: speeds at touchdown; hard: beyond the gear's limits; slope: the ground's slope
   where it stands (rad) and steep: too much of it; dry: tanks empty */
export const lm = {
  T: 0,
  x: 0,
  z: 0,
  vx: 0,
  vd: 0,
  tilt: 0,
  roll: 0,
  h: 30,
  slope: 0,
  steep: 0,
  used: 0,
  prop: Infinity,
  con: 0,
  td: 0,
  tdv: 0,
  tdh: 0,
  hard: 0,
  dry: 0,
  lp: 0,
  call: 0,
  sec: 1e9,
};
const CALLS = [100, 75, 50, 40, 30, 20, 10];
export function lmReset() {
  Object.assign(lm, {
    T: 0,
    x: LM0.x,
    z: LM0.z,
    vx: LM0.vx,
    vd: LM0.vd,
    tilt: 0,
    roll: 0,
    h: LM0.alt + siteH(LM0.x, LM0.z),
    slope: 0,
    steep: 0,
    used: 0,
    prop: LM0.prop,
    con: 0,
    td: 0,
    tdv: 0,
    tdh: 0,
    hard: 0,
    dry: 0,
  });
  state.alt = LM0.alt;
  state.vz = LM0.vz;
  /* callouts already passed at this height, and the seconds calls not yet made */
  lm.call = CALLS.findIndex((c) => c < LM0.alt / FT);
  if (lm.call < 0) lm.call = CALLS.length;
  lm.sec = 1e9;
}
/* what it weighs now (kg): Apollo 11's landing weight, which here stands for the craft with its tanks at the end of
   the run, plus whatever usable propellant is still on board in a mission */
export const lmMass = () => M0 + (lm.prop < Infinity ? Math.max(0, lm.prop - lm.used) : 0),
  /* The lever is the rate-of-descent switch: each notch is one foot per second, from 4 up (top) to 12 down (bottom).
     lmRate: the lever setting for a rate in ft/s (up is positive); lmHov: the one that holds height; lmCmd: the
     rate the lever is asking for now */
  lmRate = (ft) => Math.min(1, Math.max(0, (ft + 12) / 16)),
  lmHov = () => lmRate(0),
  lmCmd = () => Math.round(-12 + 16 * state.L),
  lmLeft = () => Math.max(0, lm.prop - lm.used),
  /* seconds of hover left in the tanks: propellant over the flow a hover needs */
  lmSecs = () => lmLeft() / ((lmMass() * GL) / (ISP * 9.80665)),
  /* the landing gear's limit on sink rate (m/s) for a sideways speed (m/s): 10 ft/s at none, 7 ft/s at 4 ft/s */
  lmLimit = (h) => (10 - 0.75 * Math.min(4, h / FT)) * FT;
export function lmStep(dt) {
  if (state.ph != lm.lp) {
    if (state.ph == 1) lmReset();
    /* Free play begins in a hover (as the sky crane's does): a visitor who does nothing sees it hold still. A daily
       or challenge link starts its mission at this moment and SEQUENCE flies it itself. */
    if (state.ph == 2 && !SQ.on && !DAILY && !VS) {
      state.raw = lmHov();
      applyRaw();
    }
    lm.lp = state.ph;
  }
  const run = state.ph == 2 && !lm.td;
  lm.dry = lm.used >= lm.prop ? 1 : 0;
  /* the computer works the throttle to hold the sink rate asked for, inside the 10 to 60% it can use */
  const acc = GL + 0.9 * (lmCmd() * FT - state.vz),
    lean = Math.cos(lm.tilt) * Math.cos(lm.roll),
    want = run && !lm.dry ? Math.min(HI, Math.max(LO, (lmMass() * acc) / lean / TMAX)) * TMAX : 0;
  lm.T += (want - lm.T) * (1 - Math.exp(-dt / 0.25));
  state.N = lm.T / TMAX;
  if (run) lm.used += (lm.T / (ISP * 9.80665)) * dt;
  if (lm.td || state.ph == 0 || state.ph == 1) return;
  /* leaning tilts the thrust: the only way a lunar module moves over the ground (the input: a drag on the view or
     the arrow keys, in a mission) */
  const tt = (state.slide ? state.side : 0) * TILT,
    rt = (state.slide ? state.fwd : 0) * TILT;
  lm.tilt += Math.max(-TILTR * dt, Math.min(TILTR * dt, tt - lm.tilt));
  lm.roll += Math.max(-TILTR * dt, Math.min(TILTR * dt, rt - lm.roll));
  const m = lmMass(),
    a = lm.T / m,
    ct = Math.cos(lm.tilt);
  state.vz += (a * ct * Math.cos(lm.roll) - GL) * dt;
  lm.vx += a * Math.sin(lm.tilt) * dt;
  lm.vd -= a * ct * Math.sin(lm.roll) * dt;
  lm.h += state.vz * dt;
  lm.x += lm.vx * dt;
  lm.z += lm.vd * dt;
  /* the height that matters is the one above the ground below, craters and all */
  const gh = siteH(lm.x, lm.z);
  state.alt = lm.h - gh;
  /* callouts on the way down, in the style of the ones the lunar module pilot read out (height, sink rate, drift),
     and mission control's count of the seconds left before the land-or-abort point */
  const ft = state.alt / FT;
  while (lm.call < CALLS.length && ft <= CALLS[lm.call]) {
    const dn = -state.vz / FT,
      fw = lm.vx / FT,
      rg = lm.vd / FT;
    if (ft > CALLS[lm.call] - 8 && state.alt > PROBE)
      say(
        CALLS[lm.call] +
          ' feet, ' +
          (dn >= 0 ? 'down ' : 'up ') +
          Math.abs(dn).toFixed(1) +
          (Math.abs(fw) >= 0.5 ? ', ' + Math.abs(fw).toFixed(0) + (fw > 0 ? ' forward' : ' back') : '') +
          (Math.abs(rg) >= 0.5 ? ', ' + Math.abs(rg).toFixed(0) + (rg > 0 ? ' right' : ' left') : '') +
          '.',
      );
    lm.call++;
  }
  if (lm.prop < Infinity) {
    const left = lmSecs() - 20;
    for (const n of [60, 30])
      if (left <= n && lm.sec > n) {
        if (left > n - 2) say(n + ' seconds.');
        lm.sec = n;
      }
  }
  if (!lm.con && state.alt <= PROBE) {
    lm.con = 1;
    say('CONTACT LIGHT: a probe has touched the surface.');
  }
  if (state.alt <= 0) {
    lm.td = 1;
    lm.tdv = Math.max(0, -state.vz);
    lm.tdh = Math.hypot(lm.vx, lm.vd);
    lm.hard = lm.tdh > 4 * FT || lm.tdv > lmLimit(lm.tdh) ? 1 : 0;
    lm.slope = siteSlope(lm.x, lm.z);
    lm.steep = lm.slope > STEEP ? 1 : 0;
    thump(Math.min(0.8, 0.15 + lm.tdv * 0.2));
    state.kick = Math.max(state.kick, Math.min(0.5, lm.tdv * 0.1));
    state.alt = 0;
    lm.h = gh;
    state.vz = lm.vx = lm.vd = 0;
    /* it rests the way the ground lies under its pads */
    lm.tilt = -Math.atan((siteH(lm.x + 4, lm.z) - siteH(lm.x - 4, lm.z)) / 8);
    lm.roll = Math.atan((siteH(lm.x, lm.z + 4) - siteH(lm.x, lm.z - 4)) / 8);
    /* pads down: engine stop */
    state.ph = 3;
    state.lit = false;
    say(
      (lm.hard ? 'Down too hard: ' : 'Touchdown: ') +
        (lm.tdv / FT).toFixed(1) +
        ' ft/s down, ' +
        (lm.tdh / FT).toFixed(1) +
        ' ft/s drift. ENGINE to fly it again.',
    );
  }
  if (state.alt > 60) {
    state.alt = 60;
    lm.h = gh + 60;
    state.vz = Math.min(state.vz, 0);
  }
}
/* There is no air to carry sound on the Moon. What plays is a stand-in for what the crew felt through the cabin: a
   low rumble that follows the thrust */
export function auLM(s) {
  const nn = (state.N / HI) * state.fu;
  s(S.rum.gn.gain, nn * 0.75 + state.ign * 0.3);
  s(S.rum.fl.frequency, 55 + nn * 50);
  s(S.roar.gn.gain, nn * 0.16 + state.ign * 0.1);
  s(S.roar.fl.frequency, 260 + nn * 240);
  s(S.crk.gn.gain, 0);
  s(S.wh.gn.gain, 0);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, 0);
  s(S.sg2.gn.gain, 0);
}
export default {
  onSelect: () => lmReset(),
  seqPre: () => ({ cap: 'LANDING PHASE', do: () => lmReset(), wait: 0.1 }),
  n: 'APOLLO LUNAR MODULE',
  btn: 'APOLLO LM',
  /* its own page: /lunar-module/ (tools/pages.mjs) */
  slug: 'lunar-module',
  need3d: 1,
  moon: 1,
  inset: 1,
  insetF: lmInset,
  mission: lmMission,
  clu: (dt) => lmStep(dt),
  /* SIDE and REAR pull back as it climbs, so the ground stays in the picture and the craft grows as it comes down;
     CLOSE-UP stays with it */
  camA: (v) => (v == 1 ? [lm.h, lm.h] : [lm.h * 0.5, lm.h * 0.5, 1 + state.alt / 24]),
  sub: 'The lunar module on its descent engine, the last hundred feet above the Moon.',
  hint: 'Holding height. Each notch down is 1 ft/s more descent; land at about 3.',
  nxf: 0.4,
  ab: 0,
  stall: 0,
  idle: 0,
  up: 0.3,
  dn: 0.3,
  coast: 0.4,
  cN: 0,
  cT: 1.5,
  tk: [9, 1],
  ign: 0.35,
  lk: 0.1,
  e0f: 60,
  lt: 0.3,
  teb: 0,
  e: [20, 200, 0],
  f: [0, 1, 1, 0],
  off: 'ENGINE STOP',
  st: 'ENGINE ARM',
  cl: 'ENGINE STOP',
  cut: 'Engine stop.',
  wait: 'Wait for the engine to stop.',
  r: () => 0,
  shk: () => state.N * 0.5 + state.kick * 8,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'THR', cap: 'THRUST %', min: 0, max: 100, maj: 20, mn: 10, red: 60, d: 1, f: (v) => v | 0 },
    { t: 'ALT', cap: 'ALTITUDE ft', min: 0, max: 200, maj: 50, mn: 10, red: 200, d: 1, f: (v) => v.toFixed(0) },
    { t: 'DOWN', cap: 'DESCENT ft/s', min: 0, max: 12, maj: 2, mn: 1, red: 10, d: 1, f: (v) => v.toFixed(1) },
  ],
  gv: () => [(lm.T / TMAX) * 100, Math.max(0, state.alt) / FT, lm.td ? 0 : Math.max(0, -state.vz) / FT],
  lv: [
    ['UP 4', 1, 't'],
    ['HOLD', 0.75],
    ['DOWN 3', 0.5625],
    ['DOWN 8', 0.25],
    ['DOWN 12 ft/s', 0, 'b'],
  ],
  lp: () => [
    ['CONTACT', !!lm.con, 'info'],
    ['QUANTITY', lm.prop < Infinity && !lm.td && lmSecs() < 50 && (state.simT * 3) % 1 < 0.6, 'warn'],
  ],
  mc: [
    [0, '#000'],
    [1, '#000'],
  ],
  dk: 1,
  bl: 0,
  bd: { ts: 0, xt: 0, hh: 0, fh: 0, doors: 0 },
  pl: null,
  spike: 0,
  draw: () => {},
  rear: () => {},
  au: auLM,
  sqc: 'DESCENT ENGINE ARMED',
  sq: [
    {
      cap: '100 FEET: HOLDING THE HOVER',
      lever: 0.75,
      dur: 0.3,
      wait: 2.5,
    },
    {
      cap: 'DOWN AT 3 FEET PER SECOND',
      lever: 0.5625,
      dur: 0.6,
      until: () => state.alt < 12,
      max: 30,
    },
    { cap: 'THE ENGINE BLOWS DUST OUT ALONG THE GROUND', until: () => state.alt < 4, max: 14, view: 2 },
    { cap: 'CONTACT LIGHT: A PROBE TOUCHES', until: () => lm.td, max: 8, view: 1 },
    { cap: 'ENGINE STOP. ON THE SURFACE', wait: 3, view: 0 },
  ],
  info: {
    f: [
      'The lunar module took Apollo’s crews down to the Moon, first on 20 July 1969. Its descent engine was rated at 10,500 lb of thrust and could be throttled down to a tenth of that.',
      'Between about 65% and 92.5% the engine was not run: throat erosion and trouble holding the mixture ratio ruled that band out. So it ran either at one fixed high setting for the long braking burn, or throttled between 10% and about 60% for the approach and the landing.',
      'It burned a half-and-half mix of hydrazine and UDMH with nitrogen tetroxide, pushed out of the tanks by helium with no pumps. The chamber was cooled by a liner that chars away; the nozzle skirt was a thin columbium-alloy sheet that simply glowed its heat away.',
      'The engine was lit at its lowest setting and held there for 26 seconds while it was swivelled to point through the centre of gravity, before going to full thrust.',
      'In the landing phase the commander steered by leaning the craft while the computer worked the throttle to hold the sink rate he asked for, changed one foot per second at a time with a switch. The automatic landing came straight down from about 150 feet at 3 feet per second.',
      'To lean, the craft fired small thrusters: sixteen of them, about 100 lb of thrust each, in four clusters of four round the ascent stage. Over the whole Apollo 11 flight they are estimated to have fired about 12,000 times, an estimate that takes a typical pulse as a twentieth of a second.',
      'In Apollo 11’s last minute Armstrong leaned the craft back as far as 16° to kill its forward speed, then held about 6° for the final descent.',
      'Three of the four footpads carried a probe 1.73 m long. When one touched, a CONTACT light told the crew to stop the engine.',
      'The landing gear was built to take 10 feet per second straight down, or 7 feet per second with 4 feet per second of sideways speed. Apollo 11 touched down at about 1.7 feet per second, drifting about 2.1 feet per second to the left.',
      'A light came on when any tank was down to 5.6%. From then, mission control counted down to the point, at least 20 seconds before the tanks ran dry, where the crew had to be landing or abort. Apollo 11 landed 20 to 30 seconds before that point with about 770 lb of propellant left; Apollo 12 had about twice the margin.',
      'Dust blown out by the engine showed from about 100 feet on Apollo 11 and got worse on the way down, though the crew could still judge their motion through it.',
      'The ground here is Tranquility Base, where Apollo 11 landed at 0.674° north, 23.473° east. About 400 m to the east is West crater, roughly 165 to 180 m across and ringed by boulders up to 2 or 3 m; the computer was taking the craft into that boulder field when Armstrong took over and flew on past it. Little West crater, 33 m across and 4 m deep, lies 50 to 60 m east of where he set down, and the 12 m Double crater just to the south-west.',
      'At the landing the Sun stood 11° up in the east, so the 7 m lander threw a shadow about 35 m long over the ground ahead of it. The Earth hung high overhead, about 23° west of straight up. Apollo 11 came to rest 4.5° off level.',
      "The Moon's gravity is 1.62 m/s², about a sixth of Earth's. Apollo 11's lunar module weighed 16,153 lb (Earth pounds) at landing, so hovering took only about a quarter of the engine's rated thrust.",
    ],
    a: [
      'Only the last hundred feet or so are simulated. The braking burn from orbit and the approach are not.',
      'The lever stands in for the rate-of-descent switch: each notch asks for one foot per second more or less, and a simple loop works the throttle to hold it, as the computer did. The real switch was clicked up or down, not left in a position.',
      'The craft weighs what Apollo 11 did at landing, plus the propellant still on board in a mission. Propellant use is worked out from thrust with the specific impulse the engine was designed to meet, 305 seconds.',
      'MISSION is a game, not a re-enactment. It starts over Little West crater moving west, as Apollo 11 was about half a minute before it landed, but the start height, sink rate, speeds and propellant are drawn for the day, and the score is a game rule. The gear limits and the 20-second point it judges by are the real ones; the 12° limit on the slope it may rest on is a game rule.',
      'You can lean the craft any way, but only up to 10°, and it does not turn to face another way. The ground radar and the computer are not modelled.',
      'The thruster puffs are drawn so that you can see them: a puff as each lean starts and another as it stops, from the up- and down-firing thrusters only. Which thrusters really fired, and how visible their exhaust was, our sources do not say.',
      'The engine stops by itself when the footpads touch. The crew stopped it by hand at the contact light, or just after touchdown as on Apollo 11. The probes simply vanish here; the real ones bent or broke.',
      'In free play the propellant never runs out.',
      'The ground is a model of Tranquility Base, not a survey. The named craters have the sizes and distances our sources give; where a source gives a distance but no bearing, or no depth, those are set by eye, and the craters are drawn as simple round bowls. The many small craters and rocks are scattered at random to match Armstrong’s description of the place. The lander faces due west; Apollo 11’s stood turned 13° from that.',
      'LOW SUN is the Sun as it stood at the landing. HIGH SUN and EARTHLIGHT show the same place later in the lunar day and in the night; the Earth is too high to see in most views. The ground is drawn brighter under the low Sun than a plain matt surface would be, and the dust is simple particles thrown out along the ground.',
      'The lander is NASA’s own 3D model of the lunar module, simplified to about 16,000 triangles with its textures reduced to flat colours, and scaled to stand about 7 m tall. CUTAWAY swaps it for a plainer hand-built one whose foil comes off. The contact probes are added by hand.',
      'The callouts in the hint copy the style of the real ones (height, sink rate, drift), with this run’s numbers.',
      'The exhaust is drawn much brighter than it was: in a vacuum this engine’s plume spreads wide and is almost invisible.',
      'There is no sound on the Moon. The rumble is a stand-in for what came through the cabin structure; it is synthesized.',
    ],
    cut: [
      'CUTAWAY swaps in a plainer model and takes the foil off its descent stage. Four tanks, two of fuel and two of oxidizer, sit round the engine. Blue dots trace the two liquids to the engine, where they burn; violet dots are the exhaust. Speeds are slowed enormously.',
      "SCHLIEREN shows density changes in a gas. It is drawn from the toy's exhaust model; on the Moon there is no air around the plume to disturb.",
      'THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative.',
    ],
    s: [
      [
        'Bennett, Apollo Lunar Descent and Ascent Trajectories (NASA TM X-58040, 1970)',
        'https://ntrs.nasa.gov/api/citations/19700024568/downloads/19700024568.pdf',
      ],
      [
        'Apollo Experience Report: Descent Propulsion System (NASA TN D-7143, 1973)',
        'https://ntrs.nasa.gov/api/citations/19730011150/downloads/19730011150.pdf',
      ],
      [
        'Apollo 11 Mission Report (NASA MSC-00171, 1969)',
        'https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf',
      ],
      [
        'Rogers, Apollo Lunar Module Landing Gear (NASA, 1972)',
        'https://www.nasa.gov/wp-content/uploads/static/history/alsj/LM_Landing%20Gear1973010151.pdf',
      ],
      [
        'Apollo 11 Lunar Surface Journal: The First Lunar Landing (NASA)',
        'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html',
      ],
      [
        'Apollo 11 Lunar Surface Journal: Post-landing Activities (NASA)',
        'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.postland.html',
      ],
      [
        'Pustynski and Jones, Photogrammetric Analysis of Apollo 11 Imagery (Apollo Lunar Surface Journal, NASA)',
        'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11Photogrammetry.html',
      ],
      [
        'Iqbal, Hiesinger and van der Bogert, Geological Mapping and Chronology of Lunar Landing Sites: Apollo 11 (Icarus, 2019)',
        'https://arxiv.org/abs/2003.03292',
      ],
      ['A Stark Beauty All Its Own (Lunar Reconnaissance Orbiter Camera)', 'https://lroc.im-ldi.com/images/484'],
      [
        'Apollo 11 Mission Report, Supplement 5: Performance of Lunar Module Reaction Control System (NASA MSC-00171, 1971)',
        'https://ntrs.nasa.gov/api/citations/19720018196/downloads/19720018196.pdf',
      ],
      [
        'Apollo SM-LM RCS Engine Development Program Summary Report (Marquardt, for NASA)',
        'https://ntrs.nasa.gov/api/citations/19690029231/downloads/19690029231.pdf',
      ],
      ['Moon Fact Sheet (NASA NSSDC)', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html'],
      [
        'Apollo Lunar Module, 3D model (NASA 3D Resources)',
        'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Apollo%20Lunar%20Module',
      ],
    ],
  },
};
