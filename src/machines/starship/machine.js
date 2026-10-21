// STARSHIP (Super Heavy booster): the machine's table entry (engine model numbers, gauges, lamps, lever labels,
// SEQUENCE, INFO with sources) plus its own simulation and synthesized voice.
import { S } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';

/* Super Heavy static fire: 33 Raptors in three groups (centre 3, middle ring 10, outer ring 20). The bottom of the
   lever lights the groups in turn at minimum throttle (40%); above that, all 33 throttle together from 40 to 100%.
   ssE: how lit each group is (0..1); ssT: throttle (0.4..1). */
export const GROUPS = [3, 10, 20],
  ssE = [0, 0, 0];
export let ssT = 0.4;
const L_MID = 0.2,
  L_ALL = 0.4;
export function ssStep(dt) {
  const L = state.L,
    lit = state.ph == 2 ? (L < L_MID ? 1 : L < L_ALL ? 2 : 3) : 0,
    thr = L < L_ALL ? 0.4 : 0.4 + (0.6 * (L - L_ALL)) / (1 - L_ALL);
  for (let k = 0; k < 3; k++) {
    const t = k < lit ? 1 : 0;
    ssE[k] += (t - ssE[k]) * (1 - Math.exp(-dt / (t > ssE[k] ? 0.45 : 0.25)));
  }
  ssT += (thr - ssT) * (1 - Math.exp(-dt / 0.6));
  /* N: thrust as a fraction of all 33 at full throttle */
  state.N = ((GROUPS[0] * ssE[0] + GROUPS[1] * ssE[1] + GROUPS[2] * ssE[2]) / 33) * ssT;
}
export const litCount = () => GROUPS[0] * ssE[0] + GROUPS[1] * ssE[1] + GROUPS[2] * ssE[2];

export function auSS33(s, V, pm) {
  const nn = state.N * state.fu;
  s(
    S.rum.gn.gain,
    (Math.pow(nn, 0.7) * 1.9 + state.ign * 1.2) * (1 + 0.2 * Math.sin(state.simT * 23) * Math.sin(state.simT * 5 + 1)),
  );
  s(S.rum.fl.frequency, 34 + state.N * 60);
  s(S.roar.gn.gain, Math.pow(nn, 0.65) * 0.85 + state.ign * 0.5 + state.sg * 0.05);
  s(S.roar.fl.frequency, 130 + state.N * 700);
  s(S.crk.gn.gain, Math.pow(nn, 0.7) * (0.7 + Math.random() * 1.4) * (0.8 + V.raw) + state.ign * 0.5, 0.02);
  s(S.crk.fl.frequency, 460 + state.N * 380);
  s(S.wh.gn.gain, 0);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, state.sg * 0.06);
  s(S.so.frequency, (36 + state.st * 22) * pm);
  s(S.sg.fl.frequency, 240);
  s(S.sg2.gn.gain, 0);
}

/* at full throttle: thrust 80.8 MN (sourced); flow from 2,452 kN and Isp 350 s per engine, 3.6:1 LOX:CH4 */
const FLOW = (33 * 2452e3) / (350 * 9.80665) / 1000; // t/s, all 33 at 100%
export default {
  reset: () => {
    ssE.fill(0);
    ssT = 0.4;
  },
  n: 'STARSHIP SUPER HEAVY',
  btn: 'STARSHIP',
  need3d: 1,
  clu: (dt) => ssStep(dt),
  sub: 'Super Heavy, the 33-engine Starship booster, on the orbital launch mount at Starbase.',
  hint: 'Drag the lever up: centre 3, middle ring, all 33, then throttle.',
  nxf: 0.4,
  ab: 0,
  stall: 0,
  idle: 0,
  up: 0.6,
  dn: 0.3,
  coast: 0.5,
  cN: 0,
  cT: 3,
  tk: [1, 0.4],
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
  shk: () => state.N * state.N * 3.4 * state.fu + state.kick * 10,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'THR', cap: 'THRUST MN', min: 0, max: 90, maj: 20, mn: 10, red: 82, d: 1, f: (v) => v.toFixed(1) },
    { t: 'LOX', cap: 'LOX t/s', min: 0, max: 20, maj: 5, mn: 1, red: 19, d: 1, f: (v) => v.toFixed(1) },
    { t: 'CH4', cap: 'CH4 t/s', min: 0, max: 6, maj: 1, mn: 0.5, red: 5.5, d: 1, f: (v) => v.toFixed(2) },
  ],
  gv: () => [state.N * 80.8, (state.N * FLOW * 3.6) / 4.6, (state.N * FLOW) / 4.6],
  lv: [
    ['100%', 1, 't'],
    ['ALL 33 AT 40%', L_ALL],
    ['13 LIT', L_MID],
    ['CENTRE 3', 0, 'b'],
  ],
  lp: () => {
    const n = litCount();
    return [
      ['13 LIT', n > 12.5, '#3fcf7a'],
      ['33 LIT', n > 32.5, '#e0392b'],
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
  au: auSS33,
  sqc: 'IGNITION',
  sq: [
    { cap: 'CENTRE 3 RAPTORS', wait: 1.6 },
    { cap: 'MIDDLE RING: 13 LIT', lever: 0.3, dur: 0.3, wait: 1.6, view: 1 },
    { cap: 'OUTER RING: ALL 33', lever: 0.42, dur: 0.3, wait: 2, view: 2 },
    { cap: 'THROTTLE UP', lever: 1, dur: 2.2, wait: 2.6, view: 4 },
    { cap: 'ABOUT 80 MN OF THRUST', wait: 3.4, view: 0 },
    { cap: 'SHUTDOWN', do: () => master(), wait: 3.5, view: 4 },
  ],
  info: {
    f: [
      "Super Heavy is the first stage of SpaceX's Starship. The Block 3 booster is 72.3 m tall and 9 m wide and carries about 3,650 t of propellant: 2,860 t of liquid oxygen and 790 t of liquid methane.",
      'It has 33 Raptor 3 engines. Each makes about 250 tf (2,452 kN) at sea level; the booster is quoted at 80.8 MN in total.',
      'Raptor burns subcooled liquid methane with liquid oxygen, about 3.6 kg of oxygen per kg of methane, in a full-flow staged combustion cycle, and can throttle between 40 and 100%.',
      'The thirteen engines in the centre and middle rings gimbal on electric actuators.',
      'The oxygen tank is at the bottom and the methane tank on top. Methane reaches the engines through a single downcomer pipe that runs down through the oxygen tank.',
      'Three grid fins sit on the methane tank. Two have hardpoints: the launch tower\'s "chopstick" arms use them to lift the booster onto the orbital launch mount, and to catch it when it flies back. Twenty clamps hold it down on the mount.',
      "Pad 2's mount has a water-cooled steel plate on its top level, and beneath it a flame bucket built from many steel pipes, which reduces sound levels and protects the pad. A water deluge system runs during firings.",
      'Static fires on the mount are short. Booster 19 fired all 33 Raptor 3 engines on Pad 2 on 15 April 2026. In February 2023 an earlier booster lit 31 of its 33 engines at once.',
    ],
    a: [
      'The start order here (centre 3, then the middle ring of 10, then the outer 20) and its timing are a simplification. The sources used here do not give the real ignition sequence.',
      'A real static fire lasts a few seconds. Here the engines run as long as you like, and once all 33 are lit the lever sets their throttle from 40 to 100%.',
      "Thrust is the quoted 80.8 MN scaled by how many engines are lit and by throttle. Propellant flow is derived, not quoted: from Raptor 3's thrust and sea-level specific impulse (about 350 s) and the 3.6:1 mixture ratio, and it is assumed to scale with thrust.",
      "The booster, mount, flame bucket, tower and chopsticks are simplified hand-built models. Apart from the booster's height and width, their sizes are estimated, and Starbase's surroundings are generic.",
      'The plume is drawn as one merged column that brightens as engine groups light. Its colours are illustrative, and the sound is synthesized.',
    ],
    cut: "CUTAWAY removes half of the booster's skin. Pale blue dots are liquid oxygen flowing down from the lower tank to the engines; green dots are liquid methane coming down the downcomer pipe from the upper tank, through the oxygen tank; orange is the exhaust. Speeds are slowed enormously so you can follow them.",
    s: [
      ['SpaceX Super Heavy (Wikipedia)', 'https://en.wikipedia.org/wiki/SpaceX_Super_Heavy'],
      ['SpaceX Raptor (Wikipedia)', 'https://en.wikipedia.org/wiki/SpaceX_Raptor'],
      ['SpaceX Starbase (Wikipedia)', 'https://en.wikipedia.org/wiki/SpaceX_Starbase'],
      [
        'Starship Flight 12 inches closer to launch with booster and ship static fires (Space Explored, April 2026)',
        'https://spaceexplored.com/2026/04/18/starship-flight-12-inches-closer-to-launch-with-booster-and-ship-static-fires/',
      ],
      [
        "SpaceX test-fires 31 engines on Starship's gigantic Super Heavy booster (Spaceflight Now, February 2023)",
        'https://spaceflightnow.com/2023/02/09/spacex-test-fires-31-engines-on-starships-gigantic-super-heavy-booster/',
      ],
    ],
  },
};
