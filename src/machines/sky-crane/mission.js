// SKY CRANE: the soft-landing MISSION. Each attempt starts at a different height and sink rate with a limited
// hydrazine load; land the rover gently, with the bridles fully out, and save as much hydrazine as you can.
import { state } from '../../core/state.js';
import { applyRaw } from '../../input/lever.js';
import { BL, SKY0, sc, skyHov, skyLeft, skyReset } from './machine.js';

/* the real target touchdown speed (sourced in INFO) and the hard-landing limit (a game rule) */
const VT = 0.75,
  HARD = 1.6;

export default {
  name: 'SOFT LANDING',
  /* for the share line */
  tag: 'Mars sky crane landing',
  share: (r) => 'Touchdown ' + sc.tdv.toFixed(2) + ' m/s, ' + r.rows[2][1] + ' hydrazine left',
  /* no longer than the longest hint the layout checks try, so it fits a phone held sideways */
  brief: 'MISSION: all 6.4 m of bridle out, land at 0.75 m/s or less, save hydrazine.',
  start(r) {
    SKY0.alt = Math.round(260 + r() * 120) / 10;
    SKY0.vz = -Math.round(15 + r() * 20) / 10;
    /* enough for a careful descent with some margin; more for a higher start */
    SKY0.prop = Math.round(2.4 * (SKY0.alt + 8));
    state.raw2 = 0;
    skyReset();
    state.raw = skyHov();
    applyRaw();
  },
  end() {
    Object.assign(SKY0, { alt: 32, vz: -2.5, prop: Infinity });
    sc.prop = Infinity;
  },
  /* the verdict, once the wheels are down (null before) */
  judge() {
    if (!sc.td) return null;
    const v = sc.tdv,
      kg = skyLeft(),
      rows = [
        ['TOUCHDOWN', v.toFixed(2) + ' m/s'],
        ['BRIDLES OUT', sc.bl.toFixed(1) + ' of ' + BL + ' m'],
        ['HYDRAZINE LEFT', Math.floor(kg) + ' of ' + sc.prop + ' kg'],
      ];
    if (sc.hard)
      return {
        ok: 0,
        title: 'HARD LANDING',
        why:
          (kg <= 0 ? 'The hydrazine ran out and the stage fell. ' : '') +
          'The rover hit the ground at ' +
          v.toFixed(1) +
          ' m/s; over ' +
          HARD +
          ' m/s counts as a crash here.',
        rows,
      };
    if (sc.bl < BL - 0.05)
      return {
        ok: 0,
        title: 'STAGE TOO LOW',
        why:
          'The wheels touched with only ' +
          sc.bl.toFixed(1) +
          ' m of bridle out, so the engines were firing just above the ground. Let all 6.4 m out first.',
        rows,
      };
    const soft = v <= VT ? 1 : (HARD - v) / (HARD - VT),
      score = Math.round(600 * soft + (400 * kg) / sc.prop);
    return {
      ok: 1,
      title: 'ROVER DOWN SAFELY',
      why:
        v <= VT
          ? 'Within the real touchdown speed of 0.75 m/s.'
          : 'Down, but faster than the real touchdown speed of 0.75 m/s.',
      rows,
      score,
    };
  },
  /* show the result once the stage has flown off (or after a few seconds) */
  over: (t) => sc.done || t > 6,
};
