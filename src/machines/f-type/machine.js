// F-TYPE: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { CUT_SCHLIEREN, CUT_THERMAL } from '../../info/cut-text.js';
import { body, plume, rear } from '../../render2d/jet.js';
import { SP } from '../../render2d/sprites.js';

/* per-machine voices: each sets the same nodes (rumble, roar, whine, upper siren, crackle, starter) its own way */
export function auF(s, V, pm) {
  s(
    S.rum.gn.gain,
    (state.N * 0.6 * (0.35 + 0.65 * state.fu) + state.A * 0.7 + state.sg * 0.12 + state.ign * 0.7) *
      (1 + state.stl * 0.4 * Math.sin(state.simT * 50)),
  );
  s(S.rum.fl.frequency, 90 + state.N * 110 + state.A * 240);
  s(
    S.roar.gn.gain,
    (state.N * state.N * (0.05 + 0.17 * state.fu) + state.A * 0.5 + state.sg * 0.04 + state.ign * 0.35) *
      (1 + state.stl * 0.6 * Math.sin(state.simT * 75)),
  );
  s(S.roar.fl.frequency, 250 + state.N * 800 + state.A * 1500);
  s(S.wh.gn.gain, state.N * 0.05 * (1 - state.A * 0.8) * (1 + (1 - state.fu) * 1.6) + state.spd * 0.16);
  s(S.osc.frequency, (180 + state.N * 1500) * pm);
  s(S.wh.fl.frequency, (900 + state.N * 2200) * pm);
  s(S.wh2.gn.gain, state.spd * 0.09 + state.N * 0.012 * (1 - state.A) * (1 + (1 - state.fu) * 2));
  s(S.osc2.frequency, (180 + state.N * 1500) * 2.01 * pm);
  s(
    S.crk.gn.gain,
    state.A * (0.5 + Math.random() * 1.2) * (0.8 + V.raw) + state.stl * (0.3 + Math.random() * 0.9),
    0.02,
  );
  s(S.crk.fl.frequency, 700);
  s(S.sg.gn.gain, state.sg * 0.12);
  s(S.so.frequency, (60 + state.N * 2600) * pm);
  s(S.sg.fl.frequency, 300 + state.N * 3000);
  s(S.sg2.gn.gain, state.sg * 0.05);
  s(S.so2.frequency, (30 + state.N * 500) * pm);
}
export default {
  n: 'AFTERBURNER',
  btn: 'F-TYPE',
  sub: 'Afterburning turbofan. Push through the detent.',
  hint: 'Drag the lever up. Push through the detent.',
  nxf: 0.34,
  ab: 1,
  stall: 1,
  idle: 0.28,
  up: 1.1,
  dn: 0.8,
  coast: 3.2,
  cN: 0.13,
  cT: 2.4,
  tk: [1.5, 0.09],
  ign: 1,
  lk: 0.4,
  e0f: 480,
  lt: 0.8,
  teb: 0,
  e: [40, 620, 90],
  f: [0.35, 7.1, 2.2, 36],
  off: 'FUEL OFF',
  st: 'STARTING',
  cl: 'COASTING',
  cut: 'Fuel cut. Rotor coasting down...',
  wait: 'Let the rotor spool down before restarting.',
  r: () => (30 + 18 * state.A) * state.u,
  shk: () => state.N * state.N * 1.2 + state.A * 4 + state.kick * 12,
  gl: () => [
    state.A * 0.3 + state.N * state.N * 0.06 * state.fu + state.ign * 0.2,
    160 + state.A * 700 + state.N * 120,
  ],
  skyG: () => state.A * 0.4 + state.N * state.N * 0.05 * state.fu + state.ign * 0.1,
  hzk: () => state.A + state.N * state.N * 0.28 * state.fu + state.hg * state.hg * 0.12,
  hzg: () => [62 + state.A * 46, 300 + state.A * 900],
  hza: () => 0.8 + state.A * 4.2 + state.N * 1.4,
  blk: () => state.A * 0.3 + state.N * state.N * 0.05 * state.fu + state.kick * 0.3 + state.ign * 0.15,
  g: [
    { t: 'N1', cap: 'N1 SPEED %', min: 0, max: 110, maj: 20, mn: 10, red: 102, d: 1, f: (v) => v | 0 },
    { t: 'EGT', cap: 'EGT °C x100', min: 0, max: 900, maj: 200, mn: 100, red: 760, d: 100, f: (v) => v | 0 },
    { t: 'FF', cap: 'FUEL klb/h', min: 0, max: 50, maj: 10, mn: 5, red: 46, d: 1, f: (v) => v.toFixed(1) },
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
    ['EGT HI', state.E > 720 && (state.simT * 6) % 1 < 0.6, '#e0392b'],
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
  bd: { ts: 120, xt: 64, hh: 64, fh: 78, doors: 0 },
  pl: {
    dl: [70, 140],
    dp: [SP.b, SP.b, SP.o, SP.r],
    al: [240, 1000],
    ap: [SP.y, SP.y, SP.o, SP.r],
    sn: 64,
    ak: 1,
    cp: [SP.w, SP.y, SP.y, SP.o],
    dn: [3, 2, 5],
    ds: [34, 38, 8],
    dc: [SP.y, SP.b],
  },
  spike: 0,
  draw: (r, dt) => {
    plume(r, dt);
    body(r);
  },
  rear: rear,
  au: auF,
  sqc: 'STARTER SPIN-UP',
  sq: [
    { cap: 'IDLE', wait: 1.6 },
    { cap: 'SPOOLING UP', lever: 0.74, dur: 3.6 },
    { cap: 'MIL POWER', until: () => state.N > 0.9, wait: 0.6, max: 6 },
    { cap: 'PUSH THROUGH THE DETENT', lever: 1, dur: 1.6, view: 1, slow: 0.35 },
    { cap: 'AFTERBURNER LIGHT', until: () => state.lit, wait: 1.3, max: 6 },
    { cap: 'FULL AFTERBURNER', slow: 1, wait: 3.2, view: 2 },
    { cap: 'FULL AFTERBURNER', wait: 2.4, view: 0 },
    { cap: 'THROTTLE BACK', lever: 0.45, dur: 1.6 },
    { cap: 'FUEL CUT', do: () => master(), wait: 3.4 },
  ],
  info: {
    cut: [
      'CUTAWAY removes half of the casing. The moving dots trace the air: blue is cool intake air, white is compressed air, orange is combustion and exhaust.' +
        ' The outer band is bypass air going round the core.' +
        ' Flow speed is slowed enormously so you can follow it.',
      CUT_SCHLIEREN,
      CUT_THERMAL,
    ],
    f: [
      'A generic afterburning turbofan. It is not modelled on one specific engine.',
      'The lever detent is MIL (military power), the most thrust the engine makes dry. Past it, fuel is sprayed into the hot exhaust behind the turbine and burns again: the afterburner. It adds a lot of thrust for a very large jump in fuel flow.',
      'Shock diamonds appear when exhaust leaves the nozzle at a different pressure from the air around it, setting up a repeating pattern of shock waves.',
      'The nozzle petals open as the afterburner lights, to pass the extra flow. Fighter nozzles also open a little at idle and close toward MIL.',
      'A compressor stall is a breakdown of airflow through the compressor. Moving the throttle too fast from low power can trigger one: loud bangs, flames from the tailpipe and a jump in exhaust temperature. Pull the lever back to recover. The FAULTS button turns this off.',
    ],
    a: [
      'The gauge scales, spool times and temperatures are plausible but illustrative. They do not come from any engine manual.',
      'The 3D engine and test stand are simplified, hand-built models, not CAD data.',
      'The sound is synthesized, not recorded.',
    ],
    s: [],
  },
};
