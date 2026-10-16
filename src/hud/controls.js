// Controls: button labels (lab), button actions (act), lever labels, hint text, the START overlay.
import { initAudio } from '../audio/audio.js';
import { master } from '../core/engine.js';
import { nextM, prevM, setMachine } from '../core/machine-switch.js';
import { state } from '../core/state.js';
import { $, SL, SLN, SN, SNM, VN } from '../core/util.js';
import { showInfo } from '../info/info.js';
import { tq, trk } from '../input/lever.js';
import { startRec, stopRec } from '../recorder/recorder.js';
import { SQ, seqStart, seqStop } from '../sequence/sequence.js';

export function lab() {
  const q = (k) => document.querySelector('#ctl [data-k=' + k + ']');
  const sb = q('seq');
  sb.textContent = SQ.on ? '■ STOP SEQUENCE' : '▶ SEQUENCE';
  sb.classList.toggle('run', !!SQ.on);
  q('mach').textContent = 'MACHINE: ' + state.M.btn + ' ▶';
  q('view').textContent = 'VIEW: ' + VN[state.view];
  q('exp').textContent = state.G3
    ? 'CUTAWAY: ' + (state.exposed ? 'ON' : 'OFF')
    : 'CASING: ' + (state.exposed ? 'EXPOSED' : 'COVERED');
  const lb = q('lens');
  lb.textContent = 'LENS: ' + ['NORMAL', 'SCHLIEREN', 'THERMAL'][state.lens];
  lb.style.opacity = state.G3 ? 1 : 0.4;
  q('scn').textContent =
    'SCENE: ' +
    (state.M.space
      ? ['TERMINATOR', 'SUNLIT', 'ECLIPSE'][state.scene]
      : state.M.sky && state.G3
        ? SNM[state.scene]
        : SN[state.scene]);
  q('slow').textContent = state.M.warp ? 'WARP: ' + state.M.warpName(state.sl) : 'SLOW-MO: ' + SLN[state.sl];
  const f = q('flt');
  f.textContent = 'FAULTS: ' + (state.M.stall ? (state.faults ? 'ON' : 'OFF') : 'N/A');
  f.style.opacity = state.M.stall ? 1 : 0.4;
}
/* engine master: ON cranks and lights off; OFF cuts fuel (flame dies, rotor coasts, nozzle cools). Restart once the rotor is nearly stopped */
export function say(t) {
  $('hint').textContent = t;
  $('hint').style.opacity = 1;
  state.hinted = true;
}
export function act(k) {
  if (k == 'view') state.view = (state.view + 1) % (state.M.space && state.G3 ? 4 : 3);
  else if (k == 'exp') state.exposed ^= 1;
  else if (k == 'scn') state.scene = (state.scene + 1) % 3;
  else if (k == 'slow') {
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
    SQ.on ? seqStop(false) : seqStart();
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
  $('abz').style.display = state.M.ab ? '' : 'none';
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
    const k = e.target.dataset.k;
    if (k) act(k);
  });
}
