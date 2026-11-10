// HARRIER: the deck-landing MISSION. The jet starts in a hover off the ship's port side, as AV-8B pilots set up a
// recovery; slide right over the deck, settle over spot 5 and land on a deck rising and falling with the swell.
import { state } from '../../core/state.js';
import { applyRaw } from '../../input/lever.js';
import { FB, HRD, hovL } from './machine.js';

/* game rules: a gentle touchdown, the hard-landing limit, the spot circle's radius (m) */
const VT = 1,
  HARD = 2.5,
  SPOT = 5;
const dist = () => Math.hypot(HRD.x, HRD.z);

export default {
  name: 'DECK LANDING',
  tag: 'Harrier deck landing',
  /* no longer than the longest hint the layout checks try, so it fits a phone held sideways */
  brief: 'MISSION: drag sideways (or ←/→) to slide over the deck, land on spot 5.',
  /* the trace on the result card and the clip: the same three quantities as the readouts */
  traceLab: ['HEIGHT m', 'SINK m/s', 'TO SPOT m'],
  trace: () => [Math.max(0, state.alt - HRD.h), HRD.td ? 0 : HRD.hv - state.vz, dist()],
  clip: () => [
    ['HEIGHT', Math.max(0, state.alt - HRD.h).toFixed(1) + ' m'],
    ['SINK', (HRD.td ? 0 : HRD.hv - state.vz).toFixed(2) + ' m/s'],
    ['TO SPOT', dist().toFixed(1) + ' m'],
  ],
  share: (r) => 'Touchdown ' + r.rows[0][1] + ', ' + r.rows[1][1] + ' from the spot, ' + r.rows[2][1],
  start(r) {
    Object.assign(HRD, {
      on: 1,
      x: Math.round(-150 + r() * 300) / 10,
      z: Math.round(250 + r() * 100) / 10,
      vx: Math.round(-6 + r() * 12) / 10,
      vs: Math.round(-6 + r() * 12) / 10,
      ha: Math.round(3 + r() * 9) / 10,
      hp: Math.round(70 + r() * 40) / 10,
      rl: 0,
      t: 0,
      h: 0,
      hv: 0,
      td: 0,
      tdv: 0,
      wet: 0,
      hit: 0,
    });
    state.alt = Math.round(60 + r() * 60) / 10;
    state.vz = 0;
    state.slide = 1;
    state.side = 0;
    /* Already in the hover, so the engine is running, whatever it was doing when MISSION was pressed (still cranking,
       or switched off): otherwise there is no thrust yet and the jet drops into the sea before the try has begun. */
    if (state.ph != 2) {
      state.ph = 2;
      state.fu = 1;
    }
    /* engine at hover power, nozzles at the hover stop */
    state.raw = hovL();
    applyRaw();
    state.N = 0.27 + 0.73 * state.L;
    state.raw2 = 0.914;
    state.nz = 90;
  },
  end() {
    HRD.on = HRD.td = 0;
    state.slide = 0;
    state.side = 0;
    state.alt = Math.max(0, state.alt);
    state.vz = 0;
  },
  judge() {
    if (!HRD.td) return null;
    const v = HRD.tdv,
      d = dist(),
      rows = [
        ['TOUCHDOWN', v.toFixed(2) + ' m/s'],
        ['FROM SPOT', d.toFixed(1) + ' m'],
        ['TIME', HRD.t.toFixed(0) + ' s'],
      ];
    if (HRD.hit)
      return {
        ok: 0,
        title: 'HIT THE SHIP',
        why: 'It crossed the deck edge below deck level and struck the ship’s side. Stay above the deck before sliding over.',
        rows,
      };
    if (HRD.wet)
      return { ok: 0, title: 'IN THE SEA', why: 'It came down beside the ship, ' + FB + ' m below the deck.', rows };
    if (v > HARD)
      return {
        ok: 0,
        title: 'HARD LANDING',
        why: 'It hit the deck at ' + v.toFixed(1) + ' m/s; over ' + HARD + ' m/s counts as a crash here.',
        rows,
      };
    const soft = v <= VT ? 1 : (HARD - v) / (HARD - VT),
      acc = Math.max(0, Math.min(1, (SPOT + 1 - d) / SPOT)),
      quick = Math.max(0, Math.min(1, (100 - HRD.t) / 75)),
      score = Math.round(550 * soft + 300 * acc + 150 * quick);
    return {
      ok: 1,
      title: d <= SPOT ? 'ON THE SPOT' : 'DOWN, OFF THE SPOT',
      why:
        d <= SPOT
          ? 'Down inside the spot circle.'
          : 'Safely on the deck, but ' + (d - SPOT).toFixed(1) + ' m outside the spot circle.',
      rows,
      score,
    };
  },
  over: (t) => t > 2.5,
};
