// SATURN V (five F-1s): the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';

/* Saturn V S-IC: five fixed-thrust F-1s; the lever picks how many are lit, in the real start order (centre, a diagonal pair, the other pair) */
export const sicE = [0, 0, 0, 0, 0];
export function sicStep(dt) {
  const lit = state.ph == 2 ? (state.L < 0.34 ? 1 : state.L < 0.67 ? 3 : 5) : 0;
  for (let k = 0; k < 5; k++) {
    const t = k < lit ? 1 : 0;
    sicE[k] += (t - sicE[k]) * (1 - Math.exp(-dt / (t > sicE[k] ? 0.55 : 0.22)));
  }
  state.N = sicE.reduce((a, b) => a + b, 0) / 5;
}
export function auF1(s, V, pm) {
  const nn = state.N * state.fu;
  s(
    S.rum.gn.gain,
    (nn * 1.7 + state.ign * 1.2) * (1 + 0.18 * Math.sin(state.simT * 29) * Math.sin(state.simT * 7 + 1)),
  );
  s(S.rum.fl.frequency, 42 + state.N * 70);
  s(S.roar.gn.gain, Math.pow(nn, 0.8) * 0.75 + state.ign * 0.5 + state.sg * 0.05);
  s(S.roar.fl.frequency, 150 + state.N * 650);
  s(S.crk.gn.gain, nn * (0.6 + Math.random() * 1.3) * (0.8 + V.raw) + state.ign * 0.5, 0.02);
  s(S.crk.fl.frequency, 520 + state.N * 300);
  s(S.wh.gn.gain, 0);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, state.sg * 0.07);
  s(S.so.frequency, (40 + state.st * 25) * pm);
  s(S.sg.fl.frequency, 260);
  s(S.sg2.gn.gain, 0);
}
export default {
  reset: () => sicE.fill(0),
  n: 'SATURN V F-1',
  btn: 'SATURN V',
  need3d: 1,
  clu: (dt) => sicStep(dt),
  sub: 'Five F-1 engines at the base of an S-IC first stage, on a static test stand.',
  hint: 'Drag the lever up: the engines light in the real centre, pair, pair order.',
  nxf: 0.4,
  ab: 0,
  stall: 0,
  idle: 0,
  up: 0.6,
  dn: 0.3,
  coast: 0.5,
  cN: 0,
  cT: 3.6,
  tk: [1.2, 0.45],
  ign: 1.3,
  lk: 0.8,
  e0f: 60,
  lt: 1.4,
  teb: 0,
  e: [20, 260, 0],
  f: [0, 0, 1, 0],
  off: 'CUTOFF',
  st: 'START',
  cl: 'SHUTDOWN',
  cut: 'Engine cutoff.',
  wait: 'Wait for shutdown to finish.',
  r: () => 0,
  shk: () => state.N * state.N * 3.2 * state.fu + state.kick * 10,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'THR', cap: 'THRUST MN', min: 0, max: 40, maj: 10, mn: 5, red: 36, d: 1, f: (v) => v.toFixed(1) },
    { t: 'LOX', cap: 'LOX t/s', min: 0, max: 10, maj: 2, mn: 1, red: 9.4, d: 1, f: (v) => v.toFixed(2) },
    { t: 'RP-1', cap: 'RP-1 t/s', min: 0, max: 5, maj: 1, mn: 0.5, red: 4.6, d: 1, f: (v) => v.toFixed(2) },
  ],
  gv: () => {
    const n = sicE.reduce((a, b) => a + b, 0);
    return [n * 6.77, n * 1.789, n * 0.788];
  },
  lv: [
    ['ALL FIVE', 1, 't'],
    ['THREE', 0.5],
    ['CENTRE', 0, 'b'],
  ],
  lp: () => {
    const n = sicE.reduce((a, b) => a + b, 0);
    return [
      ['3 LIT', n > 2.5, '#3fcf7a'],
      ['5 LIT', n > 4.5, '#e0392b'],
    ];
  },
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
  au: auF1,
  sqc: 'TURBOPUMP SPIN-UP, IGNITION',
  sq: [
    { cap: 'CENTRE ENGINE', wait: 1.6 },
    { cap: 'DIAGONAL PAIR', lever: 0.5, dur: 0.25, wait: 1.6 },
    { cap: 'OUTER PAIR: ALL FIVE', lever: 1, dur: 0.25, wait: 2, view: 2 },
    { cap: 'ABOUT 7.6 MILLION LBF', wait: 3.2, view: 0 },
    { cap: 'ABOUT 7.6 MILLION LBF', wait: 2.4, view: 1 },
    { cap: 'CUTOFF', do: () => master(), wait: 3.5, view: 0 },
  ],
  info: {
    f: [
      'The F-1 launched the Saturn V. Five of them sat in a quincunx at the base of the S-IC first stage, burning RP-1 kerosene with liquid oxygen.',
      'Each made about 6,770 kN (1,522,000 lbf) of thrust at sea level, at a chamber pressure of about 70 bar.',
      'One engine swallowed about 1,789 kg of liquid oxygen and 788 kg of RP-1 every second, fed by a turbopump of about 55,000 horsepower.',
      'The turbine exhaust was piped into the nozzle extension through a large tapered manifold, where the relatively cool gas formed a protective film against the roughly 3,200 °C exhaust.',
      'The centre engine was fixed and the four outer engines gimballed to steer. They started in a 1-2-2 sequence, centre engine, then one diagonal pair, then the other, 300 milliseconds apart, to ease the loads on the thrust structure.',
      'The stage burned for about 150 seconds.',
    ],
    a: [
      'The F-1 could not be throttled. The lever here only chooses how many engines are lit, in the real start order. In a real start the three steps were 300 ms apart, not as long as you like.',
      'Total thrust is five times the single-engine figure; the S-IC is quoted at up to 34,500 kN.',
      'The stand is a generic vertical test stand in the spirit of the S-IC static test stands, and the stage, engines and plume are simplified hand-built models.',
      'The sound is synthesized.',
    ],
    cut: 'CUTAWAY removes half of one outer engine. Pale blue dots are liquid oxygen, amber is RP-1 kerosene, grey is turbine exhaust piped into the manifold and down the inside wall of the nozzle extension, and orange is the burning gas. Speeds are slowed enormously so you can follow them.',
    s: [
      ['Rocketdyne F-1 (Wikipedia)', 'https://en.wikipedia.org/wiki/Rocketdyne_F-1'],
      ['S-IC (Wikipedia)', 'https://en.wikipedia.org/wiki/S-IC'],
    ],
  },
};
