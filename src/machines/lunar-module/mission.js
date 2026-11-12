// APOLLO LM: the lunar-landing MISSION. Each attempt starts about where Apollo 11 was half a minute before it landed:
// 100 to 150 ft up over Little West crater, still sinking and moving west, with a limited time before the call to land
// or abort. Fly clear of the crater, null the drift, land on level ground inside the landing gear's limits, and keep
// as many seconds in hand as you can.
import { state } from '../../core/state.js';
import { applyRaw } from '../../input/lever.js';
import { FT, GL, ISP, LM0, M0, lm, lmLimit, lmMass, lmRate, lmReset, lmSecs } from './machine.js';

/* the real decision point: land or abort at least this many seconds before the tanks run dry (sourced in INFO) */
const BINGO = 20,
  /* the automatic landing's sink rate, 3 ft/s, in m/s: at or under it scores full marks for softness. (A number, not
     3 * FT: this module loads before machine.js has set its constants, since each imports the other.) */
  SOFT = 0.9144;
/* seconds left before the land-or-abort point */
const toBingo = () => Math.max(0, lmSecs() - BINGO);
let t0 = 60,
  bingo = 0;

export default {
  name: 'LUNAR LANDING',
  tag: 'Apollo lunar landing',
  traceLab: ['ALTITUDE ft', 'DESCENT ft/s', 'DRIFT ft/s'],
  /* the clip keeps the craft in the middle of its frame */
  /* (a little under the middle, so the verdict panel over the top of the frame does not cover it) */
  aim: () => [lm.x, lm.h + 5.5 + state.alt * 0.1, lm.z],
  trace: () => [
    Math.max(0, state.alt) / FT,
    lm.td ? 0 : Math.max(0, -state.vz) / FT,
    lm.td ? 0 : Math.hypot(lm.vx, lm.vd) / FT,
  ],
  clip: () => [
    ['ALTITUDE', (Math.max(0, state.alt) / FT).toFixed(0) + ' ft'],
    ['DESCENT', (lm.td ? lm.tdv / FT : Math.max(0, -state.vz) / FT).toFixed(1) + ' ft/s'],
    ['TO BINGO', toBingo().toFixed(0) + ' s'],
  ],
  /* a friend's link carries the touchdown speed in tenths of a foot per second and the seconds in hand */
  vs: (r) => [Math.round(parseFloat(r.rows[0][1]) * 10), parseInt(r.rows[2][1])],
  vsText: (a, b) => 'touchdown ' + (a / 10).toFixed(1) + ' ft/s, ' + b + ' s before bingo',
  share: (r) => 'Touchdown ' + r.rows[0][1] + ', drift ' + r.rows[1][1] + ', ' + r.rows[2][1] + ' before bingo',
  /* a phone has no arrow keys, so its brief doesn't name them */
  get brief() {
    return matchMedia('(pointer: coarse)').matches
      ? 'MISSION: drag to lean. Clear the crater, stop the drift, land before bingo.'
      : 'MISSION: drag (or arrow keys) to lean. Clear the crater, stop the drift, land.';
  },
  start(r) {
    /* 100 to 150 ft up, sinking at 5 to 9 ft/s and moving west at 5 to 8 ft/s: left alone it lands beyond the gear's
       limits on both counts */
    LM0.alt = Math.round(30 + r() * 16);
    LM0.vz = -Math.round(15 + r() * 12) / 10;
    LM0.vx = Math.round(15 + r() * 9) / 10;
    /* over the western half of Little West crater (its middle is 60 m east of where Apollo 11 stood), a little to one
       side of the track, drifting sideways at 2 to 5 ft/s */
    LM0.x = -Math.round(42 + r() * 14);
    LM0.z = Math.round(-8 + r() * 16);
    LM0.vd = ((r() < 0.5 ? -1 : 1) * Math.round(6 + r() * 9)) / 10;
    /* enough propellant to hover for 50 to 70 seconds before the land-or-abort point */
    t0 = Math.round(50 + r() * 20);
    /* hover seconds = propellant / (weight / exhaust speed), and the propellant is part of the weight */
    const k = ((t0 + BINGO) * GL) / (ISP * 9.80665);
    LM0.prop = Math.round((k * M0) / (1 - k));
    lmReset();
    bingo = 0;
    t0 = toBingo();
    state.slide = 2;
    state.side = state.fwd = 0;
    /* already flying, whatever the engine was doing when MISSION was pressed */
    if (state.ph != 2) {
      state.ph = 2;
      state.fu = 1;
      state.lit = true;
    }
    /* (and the sim must not take this for a fresh engine start, which would put the switch at HOLD) */
    lm.lp = 2;
    /* the switch starts where the sink rate is: left alone, it keeps coming down that fast */
    state.raw = lmRate(Math.round(LM0.vz / FT));
    applyRaw();
    lm.T = lmMass() * GL;
  },
  end() {
    Object.assign(LM0, { alt: 30, vz: 0, x: 0, z: 0, vx: 0, vd: 0, prop: Infinity });
    lm.prop = Infinity;
    lm.vx = lm.vd = 0;
    state.slide = 0;
    state.side = state.fwd = 0;
  },
  /* the verdict: at touchdown, or at the bingo call if the pads are not down by then (null before) */
  judge() {
    /* past the point where the crew would have aborted: the try is over, though the craft flies on */
    if (!lm.td && toBingo() <= 0) bingo = 1;
    if (!lm.td && !bingo) return null;
    const left = bingo ? 0 : Math.floor(toBingo()),
      rows = bingo
        ? [
            ['ALTITUDE', (state.alt / FT).toFixed(0) + ' ft'],
            ['DESCENT', (Math.max(0, -state.vz) / FT).toFixed(1) + ' ft/s'],
            ['IN HAND', '0 s'],
          ]
        : [
            ['TOUCHDOWN', (lm.tdv / FT).toFixed(1) + ' ft/s'],
            ['DRIFT', (lm.tdh / FT).toFixed(1) + ' ft/s'],
            ['IN HAND', left + ' s'],
          ];
    if (bingo)
      return {
        ok: 0,
        title: 'BINGO: ABORT',
        why: 'Twenty seconds of propellant left and not down. At this point the crew had to be landing or abort to orbit on the ascent engine.',
        rows,
      };
    if (lm.hard)
      return {
        ok: 0,
        title: 'GEAR OVERLOADED',
        why:
          lm.tdh > 4 * FT
            ? 'It touched down sliding sideways at ' +
              (lm.tdh / FT).toFixed(1) +
              ' ft/s; the landing gear was built for 4.'
            : 'It hit at ' +
              (lm.tdv / FT).toFixed(1) +
              ' ft/s; with that drift the landing gear was built for ' +
              (lmLimit(lm.tdh) / FT).toFixed(1) +
              '.',
        rows,
      };
    if (lm.steep)
      return {
        ok: 0,
        title: 'TOO STEEP',
        why:
          'It came to rest on a slope of ' +
          ((lm.slope * 180) / Math.PI).toFixed(0) +
          '°, on a crater’s wall. The limit here is 12°; Apollo 11 stood 4.5° off level.',
        rows,
      };
    const soft = lm.tdv <= SOFT ? 1 : Math.max(0, (lmLimit(0) - lm.tdv) / (lmLimit(0) - SOFT)),
      still = Math.max(0, 1 - lm.tdh / (4 * FT)),
      spare = Math.min(1, left / Math.max(1, t0)),
      score = Math.round(450 * soft + 250 * still + 300 * spare);
    return {
      ok: 1,
      title: 'ON THE SURFACE',
      why: left + ' s before the land-or-abort point. Apollo 11 landed 20 to 30 s before it, at about 1.7 ft/s.',
      rows,
      score,
    };
  },
  over: (t) => t > 2.5,
};
