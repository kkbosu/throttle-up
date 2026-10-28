// MISSION: a scored run for machines that have one (MC entry `mission`). The machine sets the conditions and
// judges the result and shows its progress in its inset; this module runs it: the ◆ MISSION button and the result card.
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { $ } from '../core/util.js';
import { lab, say } from '../hud/controls.js';
import { SQ, seqStop } from '../sequence/sequence.js';

/* on: running; res: the machine's verdict once it has one; tr: seconds since then; seed: this attempt's conditions */
export const MS = { on: 0, t: 0, res: null, tr: 0, seed: 0 };
/* mulberry32: a small seeded generator, so a mission's conditions never draw from Math.random */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function misStart(seed) {
  const m = state.M.mission;
  if (!m || !state.ph) return;
  if (SQ.on) seqStop(false);
  hideCard();
  MS.seed = seed == null ? (Date.now() ^ (performance.now() * 1e3)) >>> 0 : seed >>> 0;
  MS.on = 1;
  MS.t = MS.tr = 0;
  MS.res = null;
  state.sl = 0;
  state.tsT = 1;
  m.start(rng(MS.seed));
  /* engines off (or the stage already flown away): light them again; the machine's own reset picks up the conditions */
  if (state.ph == 3) {
    state.N = 0;
    master();
  }
  say(m.brief);
  lab();
}
export function misStop() {
  if (!MS.on) return;
  MS.on = 0;
  MS.res = null;
  state.M.mission.end();
  hideCard();
  lab();
}
export function misTick(dr) {
  if (!MS.on) return;
  const m = state.M.mission;
  MS.t += dr;
  if (!MS.res) {
    MS.res = m.judge();
  } else if (MS.tr >= 0) {
    MS.tr += dr;
    if (m.over(MS.tr)) {
      MS.tr = -1;
      showCard(MS.res);
    }
  }
}
function showCard(r) {
  $('mish').textContent = r.title;
  $('mish').className = r.ok ? 'ok' : 'bad';
  $('misr').textContent = r.why;
  $('mist').innerHTML = '';
  r.rows.forEach(([k, v]) => {
    const d = document.createElement('div');
    d.innerHTML = '<span></span><b></b>';
    d.firstChild.textContent = k;
    d.lastChild.textContent = v;
    $('mist').appendChild(d);
  });
  $('miss').textContent = r.ok ? r.score + ' POINTS' : 'NO SCORE';
  $('mis').style.display = 'flex';
}
function hideCard() {
  $('mis').style.display = 'none';
}
/* load-time setup, called from main.js */
export function wireMission() {
  $('misa').onclick = () => misStart();
  $('misx').onclick = () => misStop();
}
