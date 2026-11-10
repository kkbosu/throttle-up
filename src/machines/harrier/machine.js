// HARRIER (Pegasus): the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)
// plus its own simulation and synthesized voice.
import { S, thump } from '../../audio/audio.js';
import { master } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { hoverInset } from './inset.js';
import harMission from './mission.js';

/* Harrier: fixed 8,000 kg, installed lift taken as 87% of the Pegasus 11-61's 106 kN; vertical motion only, with artificial damping */
export const HM = 8000,
  HT = 106e3 * 0.87,
  G0 = 9.80665,
  harT = () => (state.ph == 2 ? HT * Math.pow(Math.max(0, (state.N - 0.25) / 0.75), 1.5) * state.fu : 0),
  hovL = () => (Math.pow((HM * G0) / HT, 1 / 1.5) * 0.75 + 0.25 - 0.27) / (1 - 0.27);
/* deck-landing MISSION: the aircraft's place relative to the landing spot on the ship (ship frame, metres): x fore and
   aft (+ aft), z sideways (+ to port), vx/vs their rates; rl: bank angle (rad, + = right wing down); h/hv: the deck's
   heave and its rate; td: down (tdv: sink rate against the deck then; wet: in the sea; hit: flew into the ship's
   side); ha/hp: heave amplitude (m) and period (s); t: seconds since the start; on: the ship is out */
export const HRD = {
    on: 0,
    x: 0,
    z: 0,
    vx: 0,
    vs: 0,
    rl: 0,
    h: 0,
    hv: 0,
    ha: 0,
    hp: 9,
    t: 0,
    td: 0,
    tdv: 0,
    wet: 0,
    hit: 0,
  },
  /* freeboard: the flight deck stands 65 ft above the water (USS Kearsarge) */
  FB = 19.8,
  /* the flight deck's outline (x, z) in the same frame: 249 m long (818 ft), about 34 m wide; stern +109, bow -139 */
  DECK = [
    [109, 13],
    [109, -21],
    [-92, -21],
    [-122, -17],
    [-139, -9],
    [-139, -1],
    [-124, 7],
    [-96, 13],
  ],
  /* bank angle at full sideways input (a game choice), and the damping that stands in for the pilot's corrections */
  RL = (8 * Math.PI) / 180,
  DMP = 0.45;
/* is (x, z) over the flight deck? */
export function onDeck(x, z) {
  let c = false;
  for (let i = 0, j = DECK.length - 1; i < DECK.length; j = i++) {
    const [xi, zi] = DECK[i],
      [xj, zj] = DECK[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/* the deck landing: nozzles aft push the jet forward, banking tilts the lift sideways; touchdown on the deck or in the sea */
function deckStep(dt, T, n) {
  const D = HRD,
    w = (2 * Math.PI) / D.hp;
  D.t += dt;
  /* the deck rises and falls with the swell: two waves, so it never repeats exactly */
  D.h = D.ha * (0.8 * Math.sin(w * D.t) + 0.2 * Math.sin(1.9 * w * D.t + 1));
  D.hv = D.ha * w * (0.8 * Math.cos(w * D.t) + 0.38 * Math.cos(1.9 * w * D.t + 1));
  D.rl += (state.side * RL - D.rl) * (1 - Math.exp(-dt / 0.5));
  if (D.td) {
    state.alt = D.wet ? -FB : D.h;
    state.vz = 0;
    return;
  }
  const up = T * Math.sin(n),
    ay = (up * Math.cos(D.rl) - HM * G0) / HM - state.vz * 0.6,
    ax = (-T * Math.cos(n)) / HM - D.vx * DMP,
    az = (-up * Math.sin(D.rl)) / HM - D.vs * DMP;
  state.vz += ay * dt;
  D.vx += ax * dt;
  D.vs += az * dt;
  state.alt += state.vz * dt;
  D.x += D.vx * dt;
  D.z += D.vs * dt;
  const deck = onDeck(D.x, D.z),
    s = deck ? D.h : -FB;
  if (state.alt <= s) {
    D.td = 1;
    D.wet = deck ? 0 : 1;
    /* below the deck edge as it came over the deck: it flew into the ship's side and falls into the sea */
    D.hit = deck && state.alt < s - 0.5 ? 1 : 0;
    if (D.hit) D.wet = 1;
    D.tdv = Math.max(0, D.hv - state.vz);
    if (deck) thump(Math.min(1, D.tdv / 4));
    state.kick = Math.max(state.kick, 0.3);
    state.alt = D.wet ? -FB : s;
    state.vz = D.vx = D.vs = 0;
  }
  if (state.alt > 45) {
    state.alt = 45;
    state.vz = Math.min(state.vz, 0);
  }
}
/* the surface under the jet in the deck landing: the deck (with its heave) or the sea */
export const deckUnder = () => (onDeck(HRD.x, HRD.z) ? HRD.h : -FB);
export function hoverStep(dt) {
  state.nz += Math.max(-90 * dt, Math.min(90 * dt, state.raw2 * 98.5 - state.nz));
  if (HRD.on) return deckStep(dt, harT(), (state.nz * Math.PI) / 180);
  const T = harT(),
    a = (T * Math.sin((state.nz * Math.PI) / 180) - HM * G0) / HM - state.vz * 0.6;
  if (state.alt <= 0 && a <= 0) {
    state.alt = 0;
    state.vz = 0;
    return;
  }
  state.vz += a * dt;
  state.alt += state.vz * dt;
  if (state.alt < 0) {
    if (state.vz < -2.5) {
      thump(Math.min(1, -state.vz / 8));
      state.kick = Math.max(state.kick, 0.3);
    }
    state.alt = 0;
    state.vz = 0;
  }
  if (state.alt > 45) {
    state.alt = 45;
    state.vz = Math.min(state.vz, 0);
  }
}
export function auHR(s, V, pm) {
  s(S.rum.gn.gain, state.N * 0.55 * (0.35 + 0.65 * state.fu) + state.sg * 0.12 + state.ign * 0.6);
  s(S.rum.fl.frequency, 80 + state.N * 120);
  s(S.roar.gn.gain, state.N * state.N * (0.07 + 0.3 * state.fu) + state.ign * 0.3);
  s(S.roar.fl.frequency, 300 + state.N * 1100);
  s(S.wh.gn.gain, state.N * 0.09 * (1 + (1 - state.fu) * 1.4) + state.spd * 0.18);
  s(S.osc.frequency, (230 + state.N * 1800) * pm);
  s(S.wh.fl.frequency, (1200 + state.N * 2600) * pm);
  s(S.wh2.gn.gain, state.spd * 0.1 + state.N * 0.035);
  s(S.osc2.frequency, (230 + state.N * 1800) * 2.01 * pm);
  s(S.crk.gn.gain, 0);
  s(S.sg.gn.gain, state.sg * 0.12);
  s(S.so.frequency, (60 + state.N * 2600) * pm);
  s(S.sg.fl.frequency, 300 + state.N * 3000);
  s(S.sg2.gn.gain, state.sg * 0.05);
  s(S.so2.frequency, (30 + state.N * 500) * pm);
}
export default {
  clu: (dt) => hoverStep(dt),
  reset: () => {
    state.nz = 90;
  },
  /* the camera rises with the jet (in the deck landing it keeps its height above the jet: three.js cam() places it) */
  camA: (v) => (HRD.on && v != 1 ? [state.alt, state.alt] : [state.alt * 0.85, state.alt]),
  mission: harMission,
  insetF: hoverInset,
  n: 'HARRIER',
  btn: 'HARRIER',
  need3d: 1,
  hover: 1,
  nozzle: 1,
  inset: 1,
  sub: 'Pegasus vectored-thrust jump jet on a hover pad.',
  hint: 'Throttle up to lift off. The second lever swivels the nozzles.',
  nxf: 0.4,
  ab: 0,
  stall: 0,
  idle: 0.27,
  up: 1.2,
  dn: 0.9,
  coast: 3,
  cN: 0.2,
  cT: 3.2,
  tk: [1.6, 0.08],
  ign: 0.8,
  lk: 0.3,
  e0f: 420,
  lt: 0.7,
  teb: 0,
  e: [40, 600, 0],
  f: [0.3, 9, 2, 0],
  off: 'FUEL OFF',
  st: 'STARTING',
  cl: 'RUNDOWN',
  cut: 'Fuel off. Engine running down...',
  wait: 'Let it run down before restarting.',
  r: () => 0,
  shk: () => state.N * state.N * 1.2 + state.kick * 10,
  gl: () => [0, 0],
  skyG: () => 0,
  hzk: () => 0,
  hzg: () => [0, 0],
  hza: () => 0,
  blk: () => 0,
  g: [
    { t: 'RPM', cap: 'RPM %', min: 0, max: 110, maj: 20, mn: 10, red: 104, d: 1, f: (v) => v | 0 },
    { t: 'JPT', cap: 'JPT °C x100', min: 0, max: 800, maj: 200, mn: 100, red: 700, d: 100, f: (v) => v | 0 },
    { t: 'NOZ', cap: 'NOZZLE °', min: 0, max: 100, maj: 20, mn: 10, red: 98.5, d: 1, f: (v) => v.toFixed(0) },
  ],
  gv: () => [state.N * 100, state.E, state.nz],
  lv: [
    ['MAX', 1, 't'],
    ['HOVER', 0.9],
    ['IDLE', 0, 'b'],
  ],
  lv2: [
    ['BRAKE 98.5°', 1, 't'],
    ['HOVER 90°', 0.914],
    ['45°', 0.457],
    ['AFT 0°', 0, 'b'],
  ],
  lp: () => [
    ['AIRBORNE', state.alt > 0.05, '#3fcf7a'],
    ['JPT', state.E > 620 && (state.simT * 6) % 1 < 0.6, '#e0392b'],
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
  au: auHR,
  sqc: 'ENGINE START',
  sq: [
    {
      cap: 'NOZZLES TO THE HOVER STOP',
      do: () => {
        state.raw2 = 0.914;
      },
      wait: 1.2,
    },
    { cap: 'FULL THROTTLE', lever: 1, dur: 2.5 },
    { cap: 'LIFT-OFF', until: () => state.alt > 0.4, max: 6 },
    { cap: 'CLIMBING', until: () => state.alt > 9, max: 9, view: 1 },
    { cap: 'HOVER', lever: () => hovL(), dur: 1.5, wait: 2.5, view: 0 },
    {
      cap: 'NOZZLES TO THE BRAKING STOP  98.5°',
      do: () => {
        state.raw2 = 1;
      },
      wait: 2,
      view: 2,
    },
    {
      cap: 'NOZZLES BACK TO 90°',
      do: () => {
        state.raw2 = 0.914;
      },
      wait: 1,
    },
    { cap: 'DESCENDING', lever: () => hovL() - 0.08, dur: 1, until: () => state.alt <= 0, max: 14, view: 0 },
    { cap: 'TOUCHDOWN', lever: 0, dur: 1.5, wait: 1 },
    { cap: 'FUEL OFF', do: () => master(), wait: 3 },
  ],
  info: {
    f: [
      'The Harrier takes off vertically by pointing its engine thrust at the ground. Its Rolls-Royce Pegasus turbofan has four swivelling nozzles that rotate together through 98.5 degrees, from straight back to slightly forward of straight down.',
      'The two front nozzles blow cooler air from the low-pressure compressor; the two rear nozzles carry the hot core exhaust at about 650 °C. Roughly 60% of the flow leaves through the front pair.',
      'The Pegasus 11-61 is rated at 23,800 lbf (106 kN). Its two spools turn in opposite directions, which greatly reduces gyroscopic effects at low speed.',
      'In the cockpit the nozzle lever sits beside the throttle, which is why this machine has two levers.',
      'For the AV-8B, a sea-level vertical take-off in standard conditions is quoted at up to 9,342 kg with the Pegasus 11-61, against an operating empty weight of about 6,336 kg.',
      'Water injection let the engine run faster and hotter for a short lift: up to about 227 kg of water, for at most about 90 seconds.',
      'Landing on an amphibious assault ship, an AV-8B pilot usually sets up a hover to the left of the ship, then moves right over the deck in the hover before landing. At night without night-vision goggles they fly straight in over the stern instead.',
      'The amphibious assault ship USS Kearsarge (LHD-3) has an 818 ft (249 m) flight deck standing 65 ft (about 20 m) above the water.',
    ],
    a: [
      'The jet weighs a fixed 8,000 kg here, and installed lift is taken as 87% of the rated thrust, so that a full-power vertical take-off near the published maximum weight would just work. The thrust curve against RPM is a guess.',
      'Over the pad only vertical motion is simulated. With the nozzles aft a real Harrier would accelerate forward; here it stays put, and the hover is artificially stable. Real hovering takes constant work from the pilot.',
      'In MISSION the jet also moves: the nozzle angle pushes it forward or back, and banking tilts its lift sideways. Damping stands in for the pilot’s constant small corrections, the nose always points along the ship, and there is no wind and no turbulence in the air behind the ship’s island.',
      'MISSION’s ship is a generic big-deck amphibious assault ship in the style of a Wasp class: its deck length and height come from USS Kearsarge, the rest is placed by eye. Its deck rises and falls with the swell (up to about 1 m, every 7 to 11 s), which is illustrative, not measured; real decks also pitch and roll. The ship’s speed shows only in the sea sliding past.',
      'MISSION is a game, not a re-enactment: the start position, the spot circle, the 2.5 m/s crash limit and the score are game rules.',
      'The aircraft is a simplified hand-built model in the style of a Harrier, not an exact AV-8B or GR.7.',
      'Ground effects such as suck-down and hot-gas reingestion are not modelled, and the sound is synthesized.',
    ],
    cut: 'CUTAWAY opens the fuselage over the Pegasus. Blue dots are cool fan air heading for the front nozzles; the inner stream is compressed, burned and leaves hot through the rear nozzles. Speeds are slowed enormously so you can follow them.',
    s: [
      ['Rolls-Royce Pegasus (Wikipedia)', 'https://en.wikipedia.org/wiki/Rolls-Royce_Pegasus'],
      ['AV-8 Harrier (FAS)', 'https://man.fas.org/dod-101/sys/ac/av-8.htm'],
      [
        'Have You Ever Seen An AV-8B Harrier Use The Meatball To Land On An Amphibious Assault Ship? (The War Zone)',
        'https://www.twz.com/42664/av-8b-harriers-also-use-the-meatball-when-landing-on-amphibious-assault-ships',
      ],
      [
        "USS Kearsarge (LHD-3) Ship's Loading Characteristics Pamphlet (FAS)",
        'https://man.fas.org/dod-101/sys/ship/docs/slcp-lhd-3/Secti.html',
      ],
    ],
  },
};
