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
  /* a game number: how far the craft may lean to move sideways, and how fast it gets there */
  TILT = (10 * Math.PI) / 180,
  TILTR = (6 * Math.PI) / 180;
/* start of the run: height (m), sink rate (m/s), sideways speed (m/s) and usable propellant (kg; MISSION sets its own,
   free play has no limit) */
export const LM0 = { alt: 30, vz: 0, vx: 0, prop: Infinity };
/* T: thrust (N); x, vx: sideways place and speed; tilt: lean (rad); used: propellant burned (kg); con: a probe has
   touched; td: the pads are down; tdv, tdh: speeds at touchdown; hard: beyond the gear's limits; dry: tanks empty */
export const lm = {
  T: 0,
  x: 0,
  vx: 0,
  tilt: 0,
  used: 0,
  prop: Infinity,
  con: 0,
  td: 0,
  tdv: 0,
  tdh: 0,
  hard: 0,
  dry: 0,
  lp: 0,
  vzT: null,
};
export function lmReset() {
  Object.assign(lm, {
    T: 0,
    x: 0,
    vx: LM0.vx,
    tilt: 0,
    used: 0,
    prop: LM0.prop,
    con: 0,
    td: 0,
    tdv: 0,
    tdh: 0,
    hard: 0,
    dry: 0,
    vzT: null,
  });
  state.alt = LM0.alt;
  state.vz = LM0.vz;
}
/* what it weighs now (kg): Apollo 11's landing weight, which here stands for the craft with its tanks at the end of
   the run, plus whatever usable propellant is still on board in a mission */
export const lmMass = () => M0 + (lm.prop < Infinity ? Math.max(0, lm.prop - lm.used) : 0),
  /* the lever setting that holds a hover */
  lmHov = () => Math.min(1, Math.max(0, ((lmMass() * GL) / TMAX - LO) / (HI - LO))),
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
  /* SEQUENCE holds a sink rate with a simple loop, which is what the real computer did for the crew in the landing */
  if (SQ.on && lm.vzT != null && run) {
    state.raw = Math.min(1, Math.max(0, lmHov() + 0.6 * (lm.vzT - state.vz)));
    applyRaw();
  }
  lm.dry = lm.used >= lm.prop ? 1 : 0;
  const want = run && !lm.dry ? (LO + (HI - LO) * state.L) * TMAX : 0;
  lm.T += (want - lm.T) * (1 - Math.exp(-dt / 0.25));
  state.N = lm.T / TMAX;
  if (run) lm.used += (lm.T / (ISP * 9.80665)) * dt;
  if (lm.td || state.ph == 0 || state.ph == 1) return;
  /* leaning tilts the thrust: the only way a lunar module moves sideways (sideways input: a drag on the view or the
     arrow keys, in a mission) */
  const tt = (state.slide ? state.side : 0) * TILT,
    d = Math.max(-TILTR * dt, Math.min(TILTR * dt, tt - lm.tilt));
  lm.tilt += d;
  const m = lmMass(),
    a = lm.T / m;
  state.vz += (a * Math.cos(lm.tilt) - GL) * dt;
  lm.vx += a * Math.sin(lm.tilt) * dt;
  state.alt += state.vz * dt;
  lm.x += lm.vx * dt;
  if (!lm.con && state.alt <= PROBE) {
    lm.con = 1;
    say('CONTACT LIGHT: a probe has touched the surface.');
  }
  if (state.alt <= 0) {
    lm.td = 1;
    lm.tdv = Math.max(0, -state.vz);
    lm.tdh = Math.abs(lm.vx);
    lm.hard = lm.tdh > 4 * FT || lm.tdv > lmLimit(lm.tdh) ? 1 : 0;
    thump(Math.min(0.8, 0.15 + lm.tdv * 0.2));
    state.kick = Math.max(state.kick, Math.min(0.5, lm.tdv * 0.1));
    state.alt = 0;
    state.vz = lm.vx = 0;
    lm.tilt = 0;
    /* pads down: engine stop */
    state.ph = 3;
    state.lit = false;
    say(
      (lm.hard ? 'Down too hard: ' : 'Touchdown: ') +
        (lm.tdv / FT).toFixed(1) +
        ' ft/s down, ' +
        (lm.tdh / FT).toFixed(1) +
        ' ft/s sideways. ENGINE to fly it again.',
    );
  }
  if (state.alt > 60) {
    state.alt = 60;
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
  camA: (v) => (v == 1 ? [state.alt, state.alt] : [state.alt * 0.5, state.alt * 0.5, 1 + state.alt / 24]),
  sub: 'The lunar module on its descent engine, the last hundred feet above the Moon.',
  hint: 'Hovering. Ease the THROTTLE down to descend; land at about 3 ft/s.',
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
    ['60%', 1, 't'],
    ['HOVER', 0.31],
    ['10%', 0, 'b'],
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
      do: () => {
        lm.vzT = 0;
      },
      wait: 2.5,
    },
    {
      cap: 'DOWN AT 3 FEET PER SECOND',
      do: () => {
        lm.vzT = -3 * FT;
      },
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
      'Three of the four footpads carried a probe 1.73 m long. When one touched, a CONTACT light told the crew to stop the engine.',
      'The landing gear was built to take 10 feet per second straight down, or 7 feet per second with 4 feet per second of sideways speed. Apollo 11 touched down at about 1.7 feet per second, drifting about 2.1 feet per second to the left.',
      'A light came on when any tank was down to 5.6%. From then, mission control counted down to the point, at least 20 seconds before the tanks ran dry, where the crew had to be landing or abort. Apollo 11 landed 20 to 30 seconds before that point with about 770 lb of propellant left; Apollo 12 had about twice the margin.',
      'Dust blown out by the engine showed from about 100 feet on Apollo 11 and got worse on the way down, though the crew could still judge their motion through it.',
      "The Moon's gravity is 1.62 m/s², about a sixth of Earth's. Apollo 11's lunar module weighed 16,153 lb (Earth pounds) at landing, so hovering took only about a quarter of the engine's rated thrust.",
    ],
    a: [
      'Only the last hundred feet or so are simulated. The braking burn from orbit and the approach are not.',
      'Here you work the throttle by hand. On the real landings the computer worked it and the commander set the sink rate; full manual throttle existed but was not normally used.',
      'The craft weighs what Apollo 11 did at landing, plus the propellant still on board in a mission. Propellant use is worked out from thrust with the specific impulse the engine was designed to meet, 305 seconds.',
      'MISSION is a game, not a re-enactment: the start height, sink rate, drift and propellant are drawn for the day, and the score is a game rule. The limits it judges by (the gear limits and the 20-second point) are the real ones.',
      'Sideways motion is in one direction only, by leaning up to 10°; the real craft could lean any way and further. Thrusters, the ground radar and the computer are not modelled.',
      'The engine stops by itself when the footpads touch. The crew stopped it by hand at the contact light, or just after touchdown as on Apollo 11. The probes simply vanish here; the real ones bent or broke.',
      'In free play the propellant never runs out.',
      'The lander and the ground are simplified, hand-built approximations, and the dust is simple particles thrown out along the ground. The site is not a real place on the Moon, and the Earth is not drawn in the sky.',
      'The exhaust is drawn much brighter than it was: in a vacuum this engine’s plume spreads wide and is almost invisible.',
      'There is no sound on the Moon. The rumble is a stand-in for what came through the cabin structure; it is synthesized.',
    ],
    cut: [
      'CUTAWAY takes the foil off the descent stage. Four tanks, two of fuel and two of oxidizer, sit round the engine. Blue dots trace the two liquids to the engine, where they burn; violet dots are the exhaust. Speeds are slowed enormously.',
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
      ['Moon Fact Sheet (NASA NSSDC)', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html'],
    ],
  },
};
