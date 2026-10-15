// SHUTTLE (RS-25): the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { CUT_SCHLIEREN, CUT_THERMAL } from '../../info/cut-text.js';
import { drawSS, rearSS } from './draw2d.js';

/* RS-25: no whine at all. Deep thunder, a wide roar and hydrogen crackle; during start a hiss of chilldown vents */
export function auSS(s, V, pm) {
  const nn = state.N * state.fu;
  s(
    S.rum.gn.gain,
    (nn * 1.25 + state.ign * 1.1) * (1 + 0.14 * Math.sin(state.simT * 37) * Math.sin(state.simT * 11 + 2)),
  );
  s(S.rum.fl.frequency, 60 + state.N * 95);
  s(S.roar.gn.gain, nn * nn * 0.5 + state.ign * 0.55 + state.sg * 0.07);
  s(S.roar.fl.frequency, state.sg > 0.05 && nn < 0.05 ? 3200 : 180 + state.N * 950);
  s(S.crk.gn.gain, nn * (0.3 + Math.random() * 0.8) * (0.8 + V.raw) + state.ign * 0.4, 0.02);
  s(S.crk.fl.frequency, 900 + state.N * 500);
  s(S.wh.gn.gain, 0);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, 0);
  s(S.sg2.gn.gain, 0);
}
export default {
  n: 'RS-25',
  btn: 'SHUTTLE',
  sub: 'Space Shuttle main engine. Hydrogen and oxygen, no afterburner.',
  hint: 'Drag the lever up. 100% is rated power, 109% is full.',
  nxf: 0.46,
  ab: 0,
  stall: 0,
  idle: 0.615,
  up: 0.8,
  dn: 0.35,
  coast: 0.35,
  cN: 0.03,
  cT: 3.4,
  tk: [0.9, 0.38],
  ign: 1.2,
  lk: 0.6,
  e0f: 60,
  lt: 1.2,
  teb: 0,
  e: [20, 60, 0],
  f: [0, 1134, 1, 0],
  off: 'CUTOFF',
  st: 'PRIMING',
  cl: 'SHUTDOWN',
  cut: 'Engine cutoff.',
  wait: 'Wait for shutdown to finish.',
  r: () => 74 * state.u,
  shk: () => state.N * state.N * 2.4 * state.fu + state.kick * 10,
  gl: () => [state.N * state.N * 0.15 * state.fu + state.ign * 0.2, 200 + state.N * 520],
  skyG: () => state.N * state.N * 0.3 * state.fu + state.ign * 0.15,
  hzk: () => state.N * state.N * 0.85 * state.fu,
  hzg: () => [105, 260 + state.N * state.N * 700 * state.fu],
  hza: () => 1 + state.N * 3.4 * state.fu,
  blk: () => state.N * state.N * 0.22 * state.fu + state.kick * 0.3 + state.ign * 0.2,
  g: [
    { t: 'THR', cap: 'THRUST %', min: 0, max: 120, maj: 20, mn: 10, red: 109.5, d: 1, f: (v) => v | 0 },
    { t: 'Pc', cap: 'Pc psia x100', min: 0, max: 35, maj: 10, mn: 5, red: 30, d: 1, f: (v) => (v * 100) | 0 },
    { t: 'FLOW', cap: 'lb/s x100', min: 0, max: 1200, maj: 200, mn: 100, red: 1150, d: 100, f: (v) => v | 0 },
  ],
  gv: () => [
    state.N * 109,
    state.N * 29.94 * state.fu,
    state.F,
  ] /* 2,994 psia is the published figure at 109%; other levels scaled with thrust */,
  lv: [
    ['109% FPL', 1, 't'],
    ['104.5%', 0.89],
    ['100% RATED', 0.78],
    ['67% MIN', 0, 'b'],
  ],
  lp: () => [
    ['RATED', state.N >= 0.915 && state.fu > 0.9, '#3fcf7a'],
    ['FPL', state.N > 0.995, '#e0392b'],
  ],
  mc: [
    [0, '#1a1e26'],
    [0.35, '#4a5160'],
    [0.5, '#6a7282'],
    [0.65, '#3a404c'],
    [1, '#12151b'],
  ],
  dk: 1,
  bl: 0,
  bd: { ts: 250, xt: 0, hh: 20, fh: 74, doors: 0 },
  pl: null,
  spike: 0,
  draw: drawSS,
  rear: rearSS,
  au: auSS,
  sqc: 'BURN-OFF IGNITERS, THEN ENGINE START',
  sq: [
    { cap: 'MAINSTAGE  67%', slow: 0.4, wait: 1.3 },
    { cap: 'THROTTLE UP  100% RATED', slow: 1, lever: 0.78, dur: 2 },
    { cap: '104.5%', lever: 0.89, dur: 1.3, wait: 0.5 },
    { cap: 'FULL POWER LEVEL  109%', lever: 1, dur: 1.4, view: 1 },
    { cap: '109%', wait: 3.2, view: 2 },
    { cap: '109%', wait: 2.2, view: 0 },
    { cap: 'THROTTLE DOWN  67%', lever: 0, dur: 2.4 },
    { cap: 'ENGINE CUTOFF', do: () => master(), wait: 3 },
  ],
  info: {
    cut: [
      'CUTAWAY removes half of the bell and chamber. Blue dots are liquid hydrogen (down the steerhorn and up through the nozzle cooling tubes), pale cyan is liquid oxygen, violet-white is the burning gas expanding through the throat and bell. Speeds are slowed enormously so you can follow them.',
      CUT_SCHLIEREN,
      CUT_THERMAL,
    ],
    f: [
      'The RS-25 is the Space Shuttle main engine. It burns liquid hydrogen with liquid oxygen, at about 6 to 1 by mass.',
      'Throttle range is 67% to 109% of rated power in 1% steps (some NASA documents give 65% as the floor). 100% is rated power, about 470,000 lbf in vacuum. 104.5% is the normal power level and 109% is full power level.',
      'Published figures: chamber pressure 2,994 psia at 109%, and a total propellant flow of about 1,134 lb/s.',
      'Start: the start command comes 6.6 seconds before liftoff, and all three engines must reach 90% of rated thrust by T-3 seconds or the launch is aborted on the pad. The chamber spark igniters switch off after about 3 seconds.',
      'Hydrogen burn-off igniters fire at T-10 seconds, 3.4 seconds before engine start, showering zirconium sparks to burn off stray hydrogen. They are the sparklers during the start here.',
      'Each engine gimbals up to ±10.5° in pitch and yaw to steer the vehicle.',
      'Hydrogen and oxygen burn to water, so the flame is pale and nearly transparent and the plume is mostly steam.',
    ],
    a: [
      'I only found the chamber pressure for 109%. At other power levels the dial scales it in proportion to thrust.',
      'The toy swings the gimbal only a few degrees so you can see it. The real range is ±10.5°.',
      'The engine runs on its own at sea level. Lever zero is the 67% minimum, and the thrust build-up after ignition is a guess.',
      'The engine and test stand are simplified hand-built models. The stand is styled after the vertical stands at NASA Stennis, where RS-25s fire down into a flame deflector, but it is not a copy of any one stand.',
      'The sound is synthesized.',
    ],
    s: [
      ['RS-25 (Wikipedia)', 'https://en.wikipedia.org/wiki/RS-25'],
      ['RS-25 engine (L3Harris)', 'https://l3harris.com/all-capabilities/rs-25-engine'],
      [
        'Space Shuttle main propulsion system (GlobalSecurity)',
        'https://www.globalsecurity.org/space/library/report/1988/sts-mps.html',
      ],
      [
        'Heritage hardware: the hydrogen burn-off system (NASASpaceflight)',
        'https://www.nasaspaceflight.com/2015/06/heritage-hardware-hydrogen-burn-off-system-sls/',
      ],
    ],
  },
};
