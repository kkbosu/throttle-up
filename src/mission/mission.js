// MISSION: a scored run for machines that have one (MC entry `mission`). The machine sets the conditions and
// judges the result and shows its progress in its inset; this module runs it: the ◆ MISSION button, the daily
// challenge (the same conditions for everyone on the same date), the result card and its share line.
import { master } from '../core/engine.js';
import { DAILY } from '../core/params.js';
import { state } from '../core/state.js';
import { $ } from '../core/util.js';
import { lab, say } from '../hud/controls.js';
import { SQ, seqStop } from '../sequence/sequence.js';

/* on: running; res: the machine's verdict once it has one; tr: seconds since then; seed: this attempt's conditions;
   day: the daily challenge's number (0 for an attempt with a given seed); tries/best: today's attempts and best score;
   go: start the daily challenge once the engine runs (?daily) */
export const MS = { on: 0, t: 0, res: null, tr: 0, seed: 0, day: 0, tries: 0, best: 0, go: 0 };
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
/* the daily challenge's number: 1 on 2026-10-28, counted in the player's own calendar days (as Wordle does) */
export function dayNo(d = new Date()) {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 9, 28)) / 864e5) + 1;
}
/* the day's seed for a mission (FNV-1a of its name and the day), so each mission gets its own conditions */
export function daySeed(name, n) {
  let h = 0x811c9dc5;
  for (const ch of name + '#' + n) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
/* today's attempts and best score, per mission, kept in this browser only (storage can be missing or blocked) */
function load(name, n) {
  try {
    const s = JSON.parse(localStorage.getItem('tu-daily-' + name) || '{}');
    if (s.d === n) return s;
  } catch {
    /* no storage: count from zero */
  }
  return { d: n, tries: 0, best: 0, go: 0 };
}
function save(name) {
  try {
    localStorage.setItem('tu-daily-' + name, JSON.stringify({ d: MS.day, tries: MS.tries, best: MS.best }));
  } catch {
    /* no storage: nothing to keep */
  }
}
/* no seed: today's daily challenge; a seed (tests): those conditions, not counted as a daily try */
export function misStart(seed) {
  const m = state.M.mission;
  if (!m || !state.ph) return;
  if (SQ.on) seqStop(false);
  hideCard();
  if (seed == null) {
    const s = load(m.name, dayNo());
    MS.day = s.d;
    MS.tries = s.tries + 1;
    MS.best = s.best;
    MS.seed = daySeed(m.name, MS.day);
    save(m.name);
  } else {
    MS.day = 0;
    MS.seed = seed >>> 0;
  }
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
  /* ?daily: start today's challenge as soon as the engine runs (starting it earlier, the RUN hint would hide the brief) */
  if (MS.go && state.ph == 2) {
    MS.go = 0;
    misStart();
  }
  if (!MS.on) return;
  const m = state.M.mission;
  MS.t += dr;
  if (!MS.res) {
    MS.res = m.judge();
    if (MS.res && MS.res.ok && MS.day && MS.res.score > MS.best) {
      MS.best = MS.res.score;
      save(m.name);
    }
  } else if (MS.tr >= 0) {
    MS.tr += dr;
    if (m.over(MS.tr)) {
      MS.tr = -1;
      showCard(MS.res);
    }
  }
}
/* the result as a few lines of text to paste anywhere: a Wordle-style bar of the score (one square per 100 points) */
export function shareText(r = MS.res) {
  const m = state.M.mission,
    n = Math.round(r.score / 100) || 0,
    head = r.ok ? '🟩'.repeat(n) + '⬜'.repeat(10 - n) + ' ' + r.score + ' points' : '🟥 ' + r.title;
  return [
    'Throttle Up daily #' + MS.day + ' · ' + m.tag,
    head + ' (try ' + MS.tries + ')',
    m.share(r),
    location.origin + location.pathname + '?m=' + state.mi + '&daily',
  ].join('\n');
}
function share() {
  const t = shareText(),
    b = $('misy'),
    done = (s) => {
      b.textContent = s;
      setTimeout(() => (b.textContent = 'SHARE'), 2000);
    };
  /* a phone's share sheet where there is one, the clipboard elsewhere */
  if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({ text: t }).catch(() => {});
  else if (navigator.clipboard)
    navigator.clipboard.writeText(t).then(
      () => done('COPIED'),
      () => done('COPY FAILED'),
    );
  else done('COPY FAILED');
}
function showCard(r) {
  $('misd').textContent = MS.day
    ? 'DAILY #' + MS.day + ' · TRY ' + MS.tries + (MS.best ? ' · BEST ' + MS.best : '')
    : '';
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
  $('misy').style.display = MS.day ? '' : 'none';
  $('mis').style.display = 'flex';
}
function hideCard() {
  $('mis').style.display = 'none';
}
/* load-time setup, called from main.js */
export function wireMission() {
  $('misy').onclick = share;
  /* the same conditions again: today's (a new try) or the given seed's */
  $('misa').onclick = () => misStart(MS.day ? null : MS.seed);
  $('misx').onclick = () => misStop();
  MS.go = DAILY ? 1 : 0;
}
