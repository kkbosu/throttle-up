// SR-71 J58: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { CUT_SCHLIEREN, CUT_THERMAL } from '../../info/cut-text.js';
import { body, plume, rear } from '../../render2d/jet.js';
import { SP } from '../../render2d/sprites.js';
import { spikeInset } from './inset.js';

/* J58: bigger, lower, rougher. Slow rolling rumble, deeper whine, harder crackle; the starter is a pair of V8 start-cart engines burbling */
export function auSR(s, V, pm) {
  const bur = 0.62 + 0.38 * Math.sin(state.simT * 55) * Math.sin(state.simT * 37 + 1);
  s(
    S.rum.gn.gain,
    (state.N * 0.78 * (0.35 + 0.65 * state.fu) + state.A * 0.85 + state.sg * 0.3 * bur + state.ign * 0.9) *
      (1 + 0.12 * Math.sin(state.simT * 7.3)) *
      (1 + state.stl * 0.4 * Math.sin(state.simT * 50)),
  );
  s(S.rum.fl.frequency, 70 + state.N * 95 + state.A * 230);
  s(
    S.roar.gn.gain,
    (state.N * state.N * (0.06 + 0.21 * state.fu) + state.A * 0.62 + state.sg * 0.03 + state.ign * 0.45) *
      (1 + state.stl * 0.6 * Math.sin(state.simT * 75)),
  );
  s(S.roar.fl.frequency, 200 + state.N * 700 + state.A * 1300);
  s(S.wh.gn.gain, state.N * 0.055 * (1 - state.A * 0.7) * (1 + (1 - state.fu) * 1.6) + state.spd * 0.16);
  s(S.osc.frequency, (130 + state.N * 1150) * pm);
  s(S.wh.fl.frequency, (700 + state.N * 1900) * pm);
  s(S.wh2.gn.gain, state.spd * 0.09 + state.N * 0.01 * (1 - state.A) * (1 + (1 - state.fu) * 2));
  s(S.osc2.frequency, (130 + state.N * 1150) * 2.01 * pm);
  s(
    S.crk.gn.gain,
    state.A * (0.7 + Math.random() * 1.5) * (0.8 + V.raw) + state.stl * (0.3 + Math.random() * 0.9),
    0.02,
  );
  s(S.crk.fl.frequency, 640);
  s(S.sg.gn.gain, state.sg * 0.2 * bur);
  s(S.so.frequency, (46 + state.N * 220) * pm);
  s(S.sg.fl.frequency, 170 + state.N * 500);
  s(S.sg2.gn.gain, state.sg * 0.1 * bur);
  s(S.so2.frequency, (24 + state.N * 90) * pm);
}
export default {
  insetF: spikeInset,
  n: 'SR-71',
  btn: 'SR-71 J58',
  sub: 'Blackbird turbojet. Watch the inlet spike and the green flash.',
  hint: 'Drag the lever up. It also sets the simulated Mach.',
  nxf: 0.34,
  ab: 1,
  stall: 1,
  idle: 0.53,
  up: 1.7,
  dn: 1.2,
  coast: 4.6,
  cN: 0.43,
  cT: 3.4,
  tk: [2, 0.1],
  ign: 1.1,
  lk: 0.5,
  e0f: 500,
  lt: 0.9,
  teb: 1,
  e: [40, 600, 110],
  f: [0.5, 6, 2.2, 20],
  off: 'FUEL OFF',
  st: 'CART START',
  cl: 'COASTING',
  cut: 'Fuel cut. Rotor coasting down...',
  wait: 'Let the rotor spool down before restarting.',
  r: () => (34 + 20 * state.A) * state.u,
  shk: () => state.N * state.N * 1.3 + state.A * 2.2 + state.kick * 12,
  gl: () => [
    state.A * 0.32 + state.N * state.N * 0.06 * state.fu + state.ign * 0.2 + state.gn * 0.1,
    200 + state.A * 800 + state.N * 120,
  ],
  skyG: () => state.A * 0.42 + state.N * state.N * 0.05 * state.fu + state.ign * 0.1 + state.gn * 0.05,
  hzk: () => state.A + state.N * state.N * 0.3 * state.fu + state.hg * state.hg * 0.14,
  hzg: () => [66 + state.A * 52, 340 + state.A * 1250],
  hza: () => 0.9 + state.A * 4.6 + state.N * 1.5,
  blk: () =>
    state.A * 0.2 + state.N * state.N * 0.05 * state.fu + state.kick * 0.3 + state.ign * 0.15 + state.gn * 0.15,
  g: [
    { t: 'RPM', cap: 'RPM %', min: 0, max: 110, maj: 20, mn: 10, red: 104, d: 1, f: (v) => v | 0 },
    { t: 'EGT', cap: 'EGT °C x100', min: 0, max: 900, maj: 200, mn: 100, red: 780, d: 100, f: (v) => v | 0 },
    { t: 'FF', cap: 'FUEL klb/h', min: 0, max: 40, maj: 10, mn: 5, red: 32, d: 1, f: (v) => v.toFixed(1) },
  ],
  gv: () => [state.N * 100, state.E, state.F],
  lv: [
    ['MAX', 1, 't'],
    ['AFTERBURNER', 0.85],
    ['MIL', 0.7],
    ['IDLE', 0, 'b'],
  ],
  lp: () => [
    ['A/B', state.A > 0.05, '#ff8a2a'],
    ['EGT HI', state.E > 740 && (state.simT * 6) % 1 < 0.6, '#e0392b'],
  ],
  mc: [
    [0, '#0c0f16'],
    [0.3, '#232b3a'],
    [0.5, '#3a4558'],
    [0.68, '#1d2431'],
    [1, '#080a10'],
  ],
  dk: 0.62,
  bl: 14,
  bd: { ts: 210, xt: 110, hh: 62, fh: 78, doors: 1 },
  pl: {
    dl: [90, 170],
    dp: [SP.b, SP.b, SP.o, SP.r],
    al: [320, 1300],
    ap: [SP.c, SP.b, SP.y, SP.o, SP.r],
    sn: 84,
    ak: 0.42,
    cp: [SP.c, SP.y, SP.y, SP.o],
    dn: [5, 3, 8],
    ds: [30, 34, 8],
    dc: [SP.b, SP.b],
  },
  spike: 1,
  inset: 1,
  draw: (r, dt) => {
    plume(r, dt);
    body(r);
  },
  rear: rear,
  au: auSR,
  sqc: 'START CART SPINNING UP',
  sq: [
    { cap: 'IDLE  ABOUT 3,950 RPM', wait: 2 },
    { cap: 'ACCELERATING', lever: 0.74, dur: 5 },
    { cap: 'MIL POWER', until: () => state.N > 0.9 && state.mach > 1.1, wait: 0.5, max: 10 },
    { cap: 'PUSH THROUGH THE DETENT', lever: 1, dur: 2.2, view: 1, slow: 0.35 },
    { cap: 'TEB LIGHT', until: () => state.lit, wait: 1.4, max: 6 },
    { cap: 'FULL AFTERBURNER', slow: 1, wait: 1.5, view: 0 },
    { cap: 'SPIKE SLIDING AFT', until: () => state.mach > 2.8, wait: 2, max: 14 },
    { cap: 'MACH 3', wait: 2.5, view: 2 },
    { cap: 'THROTTLE BACK', lever: 0.45, dur: 2.2, view: 0 },
    { cap: 'FUEL CUT', do: () => master(), wait: 3.6 },
  ],
  info: {
    cut: [
      'CUTAWAY removes half of the casing. The moving dots trace the air: blue is cool intake air, white is compressed air, orange is combustion and exhaust.' +
        ' Watch the bypass tubes carry air round the core above about Mach 2, and the secondary air flowing between engine and nacelle to the ejector.' +
        ' Flow speed is slowed enormously so you can follow it.',
      CUT_SCHLIEREN,
      CUT_THERMAL,
    ],
    f: [
      'The J58 is the Pratt & Whitney engine that powered the SR-71. It burns JP-7, a fuel with a very high flash point. At cruise the aircraft burns about 8,000 gallons an hour.',
      'Inlet spike: a cone in each inlet slides aft as the aircraft speeds up, by up to 26 inches. It is fully aft at Mach 3 and above. Watch the inset.',
      'Blow-in doors around the nozzle feed extra air into the ejector at low speed, below about Mach 1.2. Above that they are shut.',
      'Starting: two Buick V8 engines on a ground cart (the AG330) spin the engine. They disengage at about 3,200 rpm. Idle is about 3,950 rpm and the maximum is 7,400 rpm.',
      'Ignition: triethylborane (TEB) ignites on contact with air. It lights the engine and the afterburner, and the start gives a green flash.',
    ],
    a: [
      'The lever also sets a simulated Mach number: 0 at idle, 1.2 at MIL, 3.2 at full afterburner. Real Mach comes from thrust against drag, not from a lever. It exists so the spike and doors have something to follow.',
      'The RPM dial is a percentage of 7,400 rpm, so idle reads about 53. I could not find sourced EGT limits, so the EGT scale and its warning lamp are illustrative.',
      'Fuel flow is scaled so full afterburner is about 26,000 lb/h per engine. That comes from the 8,000 gal/h cruise figure, assuming it covers both engines and about 6.5 lb per gallon. The dry figure is a guess.',
      'The nacelle, nozzle and ejector flaps are simplified hand-built models, and the sound is synthesized.',
      'The inlet inset is a schematic. The spike travel, the Mach numbers at which it moves, and the terminal shock moving behind the throat when the inlet starts (about Mach 1.7) follow the source; the shapes and shock angles are illustrative.',
      'The ground cart and cradles are a generic test setup; real ground runs were usually done with the engine in the aircraft.',
    ],
    s: [
      [
        'SR-71 Propulsion System (Aircraft Engine Historical Society)',
        'https://enginehistory.org/Convention/2013/SR-71Propul/SR-71Propul.shtml',
      ],
      [
        'The J58 Start Cart (Aircraft Engine Historical Society)',
        'https://www.enginehistory.org/Convention/2015/J58Starting/J58Starting.shtml',
      ],
      ['Pratt & Whitney J58 (Wikipedia)', 'https://en.wikipedia.org/wiki/Pratt_%26_Whitney_J58'],
    ],
  },
};
