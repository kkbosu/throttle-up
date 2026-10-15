// SKY CRANE: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S, thump } from '../../audio/audio.js';
import { state } from '../../core/state.js';
import { say } from '../../hud/controls.js';
import { applyRaw } from '../../input/lever.js';
import { SQ } from '../../sequence/sequence.js';
import { craneInset } from './inset.js';

/* Mars 2020 sky crane. Mars gravity 3.71 m/s2, rover 1,025 kg. Assumed: descent stage 1,100 kg at this point, engines canted 20 deg, fuel use ignored.
   The lever sets total thrust (fraction of 8 x 3,060 N); each lit engine runs between 400 N and 3,060 N, backups at about 1% */
export const GM = 3.71,
  MR = 1025,
  MS = 1100,
  MLE = 3060,
  MLN = 400,
  CANT = Math.cos((20 * Math.PI) / 180),
  RH = 1.75,
  BL = 6.4;
export const sc = {
  bl: 0,
  cut: 0,
  td: 0,
  tdT: 0,
  ct: 0,
  fly: 0,
  done: 0,
  x: 0,
  vx: 0,
  pit: 0,
  act: 8,
  vzT: null,
  thr: [0, 0, 0, 0, 0, 0, 0, 0],
  T: 0,
  lp: 0,
  hard: 0,
};
export function skyReset() {
  Object.assign(sc, {
    bl: 0,
    cut: 0,
    td: 0,
    tdT: 0,
    ct: 0,
    fly: 0,
    done: 0,
    x: 0,
    vx: 0,
    pit: 0,
    act: 8,
    vzT: null,
    T: 0,
    hard: 0,
  });
  sc.thr.fill(0);
  state.alt = 32;
  state.vz = -2.5;
}
export const skyRy = () => (sc.td ? 0 : state.alt - RH - sc.bl),
  skyHov = () => Math.min(1, (((sc.td || sc.cut ? MS : MS + MR) * GM) / CANT - (8 - sc.act) * MLE * 0.01) / (8 * MLE));
export function skyCam(v) {
  const ry = sc.td ? 0 : Math.max(0, state.alt - RH - sc.bl);
  if (sc.cut) {
    const fl = sc.fly && !sc.done,
      m2 = fl ? Math.min(30, state.alt * 0.5) : 0.4,
      k = fl ? Math.min(3, 1 + state.alt / 30) : 1;
    return v == 1 ? [0, 0] : v == 2 ? [0, m2, k] : [m2 * 0.5, m2, k];
  }
  const m = (ry + state.alt + 1.2) / 2 - 1;
  return v == 1 ? [ry, ry] : v == 2 ? [0, m] : [m, m];
}
export function skyStep(dt) {
  if (state.ph != sc.lp) {
    if (state.ph == 1) skyReset();
    sc.lp = state.ph;
  }
  const run = state.ph == 2 && !sc.done;
  /* SEQUENCE flies it with a simple loop that holds a vertical speed (the real stage is flown entirely by its guidance computer) */
  if (SQ.on && sc.vzT != null && run && !sc.cut) {
    state.raw = Math.min(1, Math.max(0, skyHov() + 0.25 * (sc.vzT - state.vz)));
    applyRaw();
  }
  /* sky-crane phase: four engines drop to ~1% as backups once the rover starts down */
  if (state.raw2 > 0.02 && sc.act == 8 && run) sc.act = 4;
  /* bridles pay out (up to 1 m/s here) to the length set by the second lever; they cannot be reeled back in */
  if (!sc.cut && !sc.td) sc.bl = Math.max(sc.bl, Math.min(state.raw2 * BL, sc.bl + dt));
  const tot = sc.fly ? 8 * MLE : state.L * 8 * MLE;
  let sum = 0;
  for (let k = 0; k < 8; k++) {
    const on = sc.act == 8 || k % 2 == 0,
      t = !run ? 0 : on ? Math.min(MLE, Math.max(MLN, tot / sc.act)) : MLE * 0.01;
    sc.thr[k] += (t - sc.thr[k]) * (1 - Math.exp(-dt / 0.12));
    sum += sc.thr[k];
  }
  sc.T = sum * CANT;
  state.N = sum / (8 * MLE);
  if (sc.done || state.ph == 0 || state.ph == 1) return;
  const m = sc.td || sc.cut ? MS : MS + MR;
  if (sc.fly) {
    sc.fly += dt;
    sc.pit = Math.min(0.75, sc.fly * 0.4);
    const a = sc.T / m;
    sc.vx += a * Math.sin(sc.pit) * dt;
    state.vz += (a * Math.cos(sc.pit) - GM) * dt;
    sc.x += sc.vx * dt;
    state.alt += state.vz * dt;
    if (sc.fly > 8 || Math.hypot(sc.x, state.alt) > 260) {
      sc.done = 1;
      state.ph = 3;
      state.lit = false;
      say('The descent stage flew off to crash a safe distance away. ENGINE to fly it again.');
    }
    return;
  }
  if (sc.td && !sc.cut) {
    sc.tdT += dt;
    if (sc.tdT > 1) {
      sc.cut = 1;
      sc.vzT = null;
      say('Wheels down: the rover cuts the bridles.');
    }
  }
  if (sc.cut && state.ph == 2) {
    sc.ct += dt;
    if (sc.ct > 0.6) sc.fly = 1e-3;
  }
  state.vz += (sc.T / m - GM - state.vz * 0.1) * dt;
  state.alt += state.vz * dt;
  if (!sc.td && state.alt - RH - sc.bl <= 0) {
    sc.td = 1;
    sc.tdT = 0;
    sc.tdv = -state.vz;
    sc.hard = -state.vz > 1.6;
    thump(Math.min(0.7, 0.15 - state.vz * 0.15));
    state.kick = Math.max(state.kick, Math.min(0.5, -state.vz * 0.08));
    say(
      sc.hard
        ? 'Hard touchdown at ' + (-state.vz).toFixed(1) + ' m/s.'
        : 'Touchdown at ' + (-state.vz).toFixed(2) + ' m/s.',
    );
    state.alt = RH + sc.bl;
    state.vz = Math.max(state.vz, 0);
  }
  if (sc.td && !sc.cut && state.alt > RH + sc.bl) {
    state.alt = RH + sc.bl;
    state.vz = Math.min(state.vz, 0);
  } /* taut bridles: the rover holds the stage down until they are cut */
  if (state.alt < RH && (sc.td || sc.bl < 0.05)) {
    state.alt = RH;
    state.vz = Math.max(state.vz, 0);
  }
  if (state.alt > 80) {
    state.alt = 80;
    state.vz = Math.min(state.vz, 0);
  }
}
/* hydrazine engines: a harsh hissing roar that fades as the stage flies off */
export function auSC(s, V, pm) {
  const nn = state.N * state.fu,
    cl = sc.done ? 0 : Math.exp(-Math.hypot(sc.x, state.alt - 10) / 90);
  s(S.rum.gn.gain, (nn * 1.1 + state.ign * 0.4) * cl);
  s(S.rum.fl.frequency, 70 + nn * 120);
  s(S.roar.gn.gain, (nn * 0.75 + state.ign * 0.3) * cl * (1 + 0.15 * Math.sin(state.simT * 23)));
  s(S.roar.fl.frequency, 700 + nn * 1400);
  s(S.crk.gn.gain, nn * (0.1 + Math.random() * 0.35) * cl, 0.02);
  s(S.crk.fl.frequency, 1800);
  s(S.wh.gn.gain, 0);
  s(S.wh2.gn.gain, 0);
  s(S.sg.gn.gain, 0);
  s(S.sg2.gn.gain, 0);
}
export default {
  onSelect: () => {
    state.raw2 = 0;
    skyReset();
  },
  seqPre: () => ({ cap: 'POWERED DESCENT', do: () => skyReset(), wait: 0.1 }),
  n: 'MARS SKY CRANE',
  btn: 'SKY CRANE',
  need3d: 1,
  sky: 1,
  nozzle: 1,
  inset: 1,
  insetF: craneInset,
  clu: (dt) => skyStep(dt),
  camA: (v) => skyCam(v),
  sub: 'Mars 2020 descent stage lowering the Perseverance rover on bridles, Jezero Crater.',
  hint: 'HOVER to stop falling, BRIDLES to lower the rover.',
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
  off: 'ENGINES OFF',
  st: 'PRIMING',
  cl: 'SHUTDOWN',
  cut: 'Engines off!',
  wait: 'Wait for the engines to stop.',
  r: () => 0,
  shk: () => state.N * 0.5 * (sc.done ? 0 : 1) + state.kick * 8,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'THR', cap: 'THRUST %', min: 0, max: 100, maj: 20, mn: 10, red: 100, d: 1, f: (v) => v | 0 },
    { t: 'ALT', cap: 'ROVER m', min: 0, max: 40, maj: 10, mn: 5, red: 40, d: 1, f: (v) => v.toFixed(1) },
    { t: 'BRDL', cap: 'BRIDLES m', min: 0, max: 7, maj: 1, mn: 0.5, red: 6.4, d: 1, f: (v) => v.toFixed(1) },
  ],
  gv: () => [(Math.max(...sc.thr) / MLE) * 100, Math.max(0, skyRy()), sc.bl],
  lv: [
    ['MAX', 1, 't'],
    ['HOVER + ROVER', 0.343],
    ['HOVER, EMPTY', 0.172],
    ['MIN', 0, 'b'],
  ],
  lv2: [
    ['6.4 m OUT', 1, 't'],
    ['STOWED', 0, 'b'],
  ],
  lp: () => [
    [sc.act == 4 ? '4 LIT' : '8 LIT', state.ph == 2 && !sc.done, '#3fcf7a'],
    [sc.cut ? 'CUT' : 'TOUCHDOWN', !!sc.td, sc.cut ? '#ff9a3a' : '#3fcf7a'],
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
  au: auSC,
  sqc: 'ENGINES PRIMED',
  sq: [
    {
      cap: 'POWERED DESCENT, 8 ENGINES',
      do: () => {
        sc.vzT = -2.5;
      },
      until: () => state.alt < 21.5,
      max: 12,
    },
    {
      cap: 'SLOWING TO 0.75 m/s',
      do: () => {
        sc.vzT = -0.75;
      },
      until: () => state.alt < 20.2,
      max: 6,
    },
    {
      cap: 'SKY CRANE: LOWERING THE ROVER',
      do: () => {
        state.raw2 = 1;
      },
      until: () => sc.bl > 6.35,
      max: 12,
      view: 1,
    },
    { cap: 'BRIDLES OUT 6.4 m, DESCENDING AT 0.75 m/s', until: () => sc.td, max: 20, view: 0 },
    { cap: 'TOUCHDOWN: THE WHEELS SENSE THE GROUND', until: () => sc.cut, max: 4, view: 2 },
    { cap: 'BRIDLES CUT: FLYAWAY', until: () => sc.done, max: 12, view: 2 },
    { cap: 'PERSEVERANCE IS ON MARS', wait: 2.5, view: 1 },
  ],
  info: {
    f: [
      'Perseverance landed in Jezero Crater on Mars on 18 February 2021. For its last seconds of flight it hung beneath a rocket-powered descent stage: the sky crane.',
      "The descent stage uses the design that landed Curiosity in 2012: eight throttleable Mars Landing Engines burning hydrazine, each adjustable from 400 N to 3,060 N. Early in powered descent all eight fire; later four drop to a near-shutdown level of about 1% flow and serve as backups. Curiosity's stage carried 390 kg of hydrazine in four tanks.",
      'About 12 seconds before touchdown, roughly 20 m up, the stage had slowed to its final descent speed of about 0.75 m/s (1.7 mph) and began lowering the rover on cables about 6.4 m (21 ft) long.',
      'When the rover sensed its wheels on the ground it cut the cables, and the descent stage flew off to crash a safe distance away.',
      "Mars gravity is about 38% of Earth's, so the 1,025 kg rover weighs on Mars what about 390 kg would on Earth. Hover thrust is correspondingly small, and cutting the rover loose suddenly leaves the stage with far more thrust than weight.",
      'The Martian daytime sky is a dusty butterscotch, but around the setting Sun it turns blue: dust in the atmosphere sends blue light forward toward the viewer more efficiently than red.',
    ],
    a: [
      'Only the final sky-crane phase is simulated, starting about 32 m up. Entry, parachute and most of powered descent are not.',
      'The descent stage mass here (1,100 kg) and the 20\u00b0 engine cant are assumptions; no source was found for either. Fuel use is ignored.',
      'The lever sets total thrust; the real stage is flown entirely by its guidance computer. A little artificial damping makes hand-flying manageable, and SEQUENCE flies it with a simple speed-hold loop.',
      'Here the switch to four engines happens when you start lowering the rover and the bridles pay out at up to 1 m/s; the real timings differ, so this descent takes a few seconds longer than the real 12.',
      'The flyaway is simplified. The stage, rover, terrain and crater rim are hand-built approximations, and the dust is simple particles.',
      "Mars's thin carbon-dioxide air would make the engines sound far fainter than this; the sound is synthesized.",
    ],
    cut: [
      'CUTAWAY lifts the thermal blankets off the descent stage. Blue dots trace hydrazine from the tanks to the engines, where a catalyst decomposes it into hot gas (pale violet) with no ignition needed. Speeds are slowed enormously.',
      "SCHLIEREN is drawn from the toy's exhaust model. Mars's air is less than 1% as dense as Earth's, so a real schlieren image would be far fainter.",
      "THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative; the warm box at the rover's tail is its nuclear power source.",
    ],
    s: [
      [
        'Perseverance Touches Down on Mars (NASA)',
        'https://science.nasa.gov/photojournal/perseverance-touches-down-on-mars-illustration/',
      ],
      [
        'Mars 2020 landing quick facts (NASA JPL)',
        'https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts',
      ],
      ['MSL descent stage (Spaceflight101)', 'https://spaceflight101.com/msl/?p=311'],
      ['The Sun Sets on Mars (NASA)', 'https://science.nasa.gov/?p=926395'],
      ['Sky crane (Wikipedia)', 'https://en.wikipedia.org/wiki/Sky_crane_(landing_system)'],
    ],
  },
};
