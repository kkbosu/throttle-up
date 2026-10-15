// HALL thruster: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { lab } from '../../hud/controls.js';
import { orbitInset } from './inset.js';

/* Hall thruster thrust (N) from the power fraction N; what-if orbit raising from 400 km */
export const htT = () => (state.ph == 2 ? 0.24 * Math.pow(state.N, 0.9) * state.fu : 0),
  MU = 3.986004418e14,
  RE = 6371e3,
  WN = ['1x', '1,000x', '100,000x'],
  WF = [1, 1000, 100000];
export const orb = { r: RE + 400e3, m: 2747, t: 0, dv: 0, xe: 0, vph: 0, tr: [] };
export function orbReset() {
  orb.r = RE + 400e3;
  orb.m = 2747;
  orb.t = orb.dv = orb.xe = orb.vph = 0;
  orb.tr = [];
}
export function orbStep(dt) {
  const W = WF[state.sl],
    dtw = dt * W,
    T = htT(),
    md = T / ((1300 + 500 * state.N) * 9.80665),
    a = T / orb.m;
  if (T > 0) {
    let v = Math.sqrt(MU / orb.r);
    v -= a * dtw;
    orb.r = MU / (v * v);
    orb.m -= md * dtw;
    orb.dv += a * dtw;
    orb.xe += md * dtw;
  }
  orb.t += dtw;
  orb.vph += dt * Math.min(W, 60) * Math.sqrt(MU / (orb.r * orb.r * orb.r));
  const al = (orb.r - RE) / 1e3,
    lt = orb.tr[orb.tr.length - 1];
  if (!lt || Math.abs(al - lt[0]) > 2 || orb.vph - lt[1] > 0.25) {
    orb.tr.push([al, orb.vph]);
    if (orb.tr.length > 160) orb.tr.shift();
  }
}
/* there is no sound in vacuum: a faint power-electronics hum stands in */
export function auHT(s, V, pm) {
  const nn = state.N * state.fu;
  s(S.rum.gn.gain, nn * 0.07 + state.sg * 0.02 + state.ign * 0.25);
  s(S.rum.fl.frequency, 55 + nn * 20);
  s(S.roar.gn.gain, state.ign * 0.12);
  s(S.roar.fl.frequency, 1800);
  s(S.crk.gn.gain, 0);
  s(S.wh.gn.gain, nn * 0.01 + state.sg * 0.004);
  s(S.osc.frequency, (1500 + nn * 700) * pm);
  s(S.wh.fl.frequency, 2600);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, state.sg * 0.015);
  s(S.so.frequency, 100 * pm);
  s(S.sg.fl.frequency, 300);
  s(S.sg2.gn.gain, 0);
}
export default {
  clu: (dt) => orbStep(dt),
  reset: () => orbReset(),
  insetF: orbitInset,
  warpName: (i) => WN[i],
  n: 'HALL THRUSTER',
  btn: 'HALL',
  need3d: 1,
  space: 1,
  warp: 1,
  orbit: 1,
  inset: 1,
  sub: 'Solar-electric Hall thruster in Earth orbit. Quiet, faint, relentless.',
  hint: 'Drag the lever for more power, then try TIME WARP.',
  nxf: 0.4,
  ab: 0,
  stall: 0,
  idle: 0.2,
  up: 0.7,
  dn: 0.4,
  coast: 0.12,
  cN: 0,
  cT: 4.2,
  tk: [1.2, 0.6],
  ign: 0.9,
  lk: 0.08,
  e0f: 30,
  lt: 0.22,
  teb: 0,
  e: [20, 320, 0],
  f: [0, 0, 1, 0],
  off: 'OFF',
  st: 'HEATER',
  cl: 'PLASMA OFF',
  cut: 'Discharge off.',
  wait: 'Wait a moment before restarting.',
  r: () => 0,
  shk: () => state.kick * 2,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'THR', cap: 'THRUST mN', min: 0, max: 300, maj: 50, mn: 25, red: 260, d: 1, f: (v) => v | 0 },
    { t: 'PWR', cap: 'POWER kW', min: 0, max: 5, maj: 1, mn: 0.5, red: 4.6, d: 1, f: (v) => v.toFixed(2) },
    { t: 'Xe', cap: 'XENON mg/s', min: 0, max: 16, maj: 4, mn: 2, red: 15, d: 1, f: (v) => v.toFixed(1) },
  ],
  gv: () => {
    const th = htT();
    return [
      th * 1000,
      state.ph == 1 ? 0.22 + 0.03 * Math.sin(state.simT * 3) : 4.5 * state.N * state.fu,
      (th / ((1300 + 500 * state.N) * 9.80665)) * 1e6,
    ];
  },
  lv: [
    ['4.5 kW', 1, 't'],
    ['2.7 kW', 0.5],
    ['0.9 kW', 0, 'b'],
  ],
  lp: () => [
    ['DISCHARGE', state.ph == 2 && state.fu > 0.5, '#5aa0ff'],
    ['MAX PWR', state.N > 0.98, '#e0392b'],
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
  au: auHT,
  sqc: 'CATHODE HEATER, XENON FLOW, IGNITION',
  sq: [
    { cap: 'DISCHARGE LIT  0.9 kW', wait: 1.6 },
    { cap: 'THROTTLE UP  4.5 kW', lever: 1, dur: 3 },
    { cap: '240 mN: ABOUT THREE QUARTERS IN YOUR HAND', wait: 3, view: 2 },
    {
      cap: 'TIME WARP  x100,000',
      do: () => {
        state.sl = 2;
        lab();
      },
      wait: 4.5,
      view: 0,
    },
    { cap: 'ORBIT CLIMBING', wait: 3.5, view: 3 },
    {
      cap: 'BACK TO REAL TIME',
      do: () => {
        state.sl = 0;
        lab();
      },
      wait: 1.5,
    },
    { cap: 'THRUSTER OFF', do: () => master(), wait: 3 },
  ],
  info: {
    cut: [
      'CUTAWAY removes half of the thruster. Grey dots are neutral xenon flowing from the anode; they turn blue when ionised and accelerate out as the beam. Yellow dots are electrons: trapped by the magnetic field, they circle the channel as the Hall current, and more stream in from the hollow cathode. Speeds are slowed enormously.',
      'THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative.',
      'SCHLIEREN needs air to bend light, so it is not available in space.',
    ],
    f: [
      'A Hall thruster turns electricity into thrust. Xenon gas enters a ring-shaped ceramic channel; a strong radial magnetic field traps electrons, which swirl round the ring as the Hall current. They ionise the incoming xenon, and the electric field across the channel flings the heavy ions out at high speed.',
      "The ions leave many times faster than a chemical rocket's exhaust, so the thruster needs far less propellant. NASA estimates its Psyche mission would need about 15 times as much propellant with chemical thrusters.",
      'This one is modelled on the SPT-140 class flown on Psyche: 0.9 to 4.5 kW of power and a specific impulse of about 1,800 s.',
      'NASA gives up to 240 mN of thrust for Psyche\'s thrusters, "about the same amount of pressure you\'d feel holding three quarters in your hand." It is tiny, but it can run for months.',
      'Psyche carries four Hall thrusters and fires one at a time. It launched with up to 1,085 kg of xenon at a launch mass of up to 2,747 kg, and its solar arrays gave 21 kW near Earth.',
      'Ionised xenon glows blue, which is why the beam looks the way it does.',
      'To raise its orbit the craft fires along its direction of travel: the beam streams out behind and the craft is pushed forward, so it speeds up and its orbit grows. That is why Earth slides away beneath in the same direction as the beam. The EARTH view looks back down at the planet as the orbit climbs.',
    ],
    a: [
      "The 240 mN maximum is NASA's figure for Psyche. Thrust, power and xenon flow in between are interpolated, and the specific impulse is assumed to fall at low power.",
      'The orbit panel is a what-if: this spacecraft raising its orbit from 400 km with one thruster at full power, ignoring drag and eclipses. Psyche itself left Earth on its rocket.',
      'Real cathode start-up takes much longer than the few seconds here.',
      'There is no sound in a vacuum. The faint hum is a stand-in for the power electronics.',
      'The spacecraft is a generic solar-electric design inspired by Psyche, not a model of it, and the Earth is procedural.',
    ],
    s: [
      ['SPT-140 (Wikipedia)', 'https://en.wikipedia.org/wiki/SPT-140'],
      [
        "Solar electric propulsion makes NASA's Psyche spacecraft go (JPL)",
        'https://www.jpl.nasa.gov/news/solar-electric-propulsion-makes-nasas-psyche-spacecraft-go/',
      ],
      ['Psyche quick facts (JPL press kit)', 'https://jpl.nasa.gov/press-kits/psyche/quick-facts'],
      [
        'The Hall effect and rocket flight (Physics Today)',
        'https://physicstoday.aip.org/quick-study/the-hall-effect-and-rocket-flight',
      ],
    ],
  },
};
