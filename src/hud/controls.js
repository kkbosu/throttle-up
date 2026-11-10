// Controls: button labels (lab), button actions (act), lever labels, hint text, the START overlay.
import { click, initAudio } from '../audio/audio.js';
import { master } from '../core/engine.js';
import { nextM, prevM, setMachine, views } from '../core/machine-switch.js';
import { state } from '../core/state.js';
import { $, SL, SLN, SN, SNM, VN } from '../core/util.js';
import { showInfo } from '../info/info.js';
import { tq, trk } from '../input/lever.js';
import { MS, misStart, misStop } from '../mission/mission.js';
import { startRec, stopRec } from '../recorder/recorder.js';
import { SQ, seqStart, seqStop } from '../sequence/sequence.js';

/* A key with a setting shows its name and its value as two parts (styled in style.css); the text still reads
   "NAME: VALUE". on: the thing it controls is on, so its edge lights. */
function setK(b, name, value, on) {
  if (b.textContent !== name + ': ' + value) {
    b.innerHTML = '<span class="kl"></span><i>: </i><em></em>';
    b.firstChild.textContent = name;
    b.lastChild.textContent = value;
  }
  b.classList.toggle('on', !!on);
}
/* a key that is one action: just its label */
function solo(b, text) {
  if (b.textContent !== text) b.textContent = text;
  b.classList.add('solo');
}
export function lab() {
  const q = (k) => document.querySelector('#ctl [data-k=' + k + ']');
  const sb = q('seq');
  solo(sb, SQ.on ? '■ STOP SEQUENCE' : '▶ SEQUENCE');
  sb.classList.toggle('run', !!SQ.on);
  const mb = q('mis');
  mb.style.display = state.M.mission ? '' : 'none';
  solo(mb, MS.on ? '■ END MISSION' : '◆ MISSION');
  mb.classList.toggle('run', !!MS.on);
  q('machp').classList.add('solo');
  setK(q('mach'), 'MACHINE', state.M.btn + ' ▶');
  setK(q('view'), 'VIEW', VN[state.view]);
  if (state.G3) setK(q('exp'), 'CUTAWAY', state.exposed ? 'ON' : 'OFF', state.exposed);
  else setK(q('exp'), 'CASING', state.exposed ? 'EXPOSED' : 'COVERED', state.exposed);
  const lb = q('lens');
  setK(lb, 'LENS', ['NORMAL', 'SCHLIEREN', 'THERMAL'][state.lens], state.lens);
  lb.classList.toggle('na', !state.G3);
  setK(
    q('scn'),
    'SCENE',
    state.M.space
      ? ['TERMINATOR', 'SUNLIT', 'ECLIPSE'][state.scene]
      : state.M.sky && state.G3
        ? SNM[state.scene]
        : SN[state.scene],
  );
  if (state.M.warp) setK(q('slow'), 'WARP', state.M.warpName(state.sl), state.sl);
  else setK(q('slow'), 'SLOW-MO', SLN[state.sl], state.sl);
  const f = q('flt');
  setK(f, 'FAULTS', state.M.stall ? (state.faults ? 'ON' : 'OFF') : 'N/A', state.M.stall && state.faults);
  /* only a machine that can stall has faults to switch (a machine with a mission shows MISSION in its place) */
  f.style.display = state.M.stall ? '' : 'none';
}
/* engine master: ON cranks and lights off; OFF cuts fuel (flame dies, rotor coasts, nozzle cools). Restart once the rotor is nearly stopped */
export function say(t) {
  $('hint').textContent = t;
  $('hint').style.opacity = 1;
  state.hinted = true;
}
/* The run clock beside the title: T+mm:ss while a SEQUENCE or a MISSION runs (a mission's stops at the verdict).
   The text is written only when the second changes. */
const CK = { t: 0, on: 0, s: -1 };
export function clock(dr) {
  const on = SQ.on || MS.on ? 1 : 0;
  if (MS.on) {
    if (!MS.res) CK.t = MS.t;
  } else if (on) CK.t = CK.on ? CK.t + dr : 0;
  CK.on = on;
  const s = on ? Math.floor(CK.t) : -1;
  if (s === CK.s) return;
  CK.s = s;
  $('clk').textContent = on ? 'T+' + String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') : '';
}
export function act(k) {
  if (k == 'view') {
    const v = views();
    state.view = v[(v.indexOf(state.view) + 1) % v.length];
  } else if (k == 'exp') state.exposed ^= 1;
  else if (k == 'scn') state.scene = (state.scene + 1) % 3;
  else if (k == 'slow') {
    if (MS.on) return say('Slow-mo is off during a mission.');
    state.sl = (state.sl + 1) % 3;
    state.tsT = state.M.warp ? 1 : SL[state.sl];
  } else if (k == 'rec') {
    state.rec ? stopRec() : startRec();
  } else if (k == 'eng') {
    seqStop(false);
    master();
  } else if (k == 'flt') {
    if (state.M.stall) state.faults = !state.faults;
  } else if (k == 'mach') setMachine(nextM(state.mi));
  else if (k == 'machp') setMachine(prevM(state.mi));
  else if (k == 'seq') {
    misStop();
    SQ.on ? seqStop(false) : seqStart();
  } else if (k == 'mis') {
    MS.on ? misStop() : misStart();
  } else if (k == 'inf') showInfo();
  else if (k == 'lens') {
    if (state.G3) {
      state.lens = (state.lens + 1) % 3;
      if (state.M.space && state.lens == 1) state.lens = 2;
    }
  }
  lab();
}
export function buildLabels() {
  const h = $('lbs');
  h.innerHTML = '';
  state.M.lv.forEach((l) => {
    const d = document.createElement('div');
    d.className = 'lb';
    d.textContent = l[0];
    if (l[2] == 't') {
      d.style.bottom = '100%';
      d.style.transform = 'translateY(100%)';
    } else if (l[2] == 'b') {
      d.style.bottom = '0';
      d.style.transform = 'translateY(0)';
    } else d.style.bottom = l[1] * 100 + '%';
    h.appendChild(d);
  });
  $('abz').style.display = $('gate').style.display = state.M.ab ? '' : 'none';
  const h2 = $('lbs2');
  h2.innerHTML = '';
  $('trk2').style.display = state.M.nozzle ? 'block' : 'none';
  tq.classList.toggle('two', !!state.M.nozzle);
  (state.M.lv2 || []).forEach((l) => {
    const d = document.createElement('div');
    d.className = 'lb2';
    d.textContent = l[0];
    if (l[2] == 't') {
      d.style.bottom = '100%';
      d.style.transform = 'translateY(100%)';
    } else if (l[2] == 'b') {
      d.style.bottom = '0';
      d.style.transform = 'translateY(0)';
    } else d.style.bottom = l[1] * 100 + '%';
    h2.appendChild(d);
  });
  state.TR = trk.getBoundingClientRect();
}
/* load-time setup, called from main.js in v11's order */
export function wireControls() {
  $('ov').addEventListener('click', () => {
    if (state.ph || !state.R3done) return;
    initAudio();
    if (state.AC) state.AC.resume();
    state.ph = 1;
    state.st = 0;
    $('hint').textContent = 'Engine starting...';
    $('ov').style.opacity = 0;
    setTimeout(() => ($('ov').style.display = 'none'), 600);
  });
  $('ctl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) {
      click();
      act(b.dataset.k);
    }
  });
}
