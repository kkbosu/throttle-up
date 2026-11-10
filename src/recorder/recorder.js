// REC: composites the WebGL frame and the HUD canvas into a clip with MediaRecorder; save/share.
import { S } from '../audio/audio.js';
import { state } from '../core/state.js';
import { T, lbl } from '../core/tokens.js';
import { $, cv, mk } from '../core/util.js';

/* ---------- slow-mo + clip recording ---------- */

export const RC = mk(8, 8),
  rc = RC.getContext('2d'); /* clips are captured from this composite: canvas + mirrored lever + watermark */
export const canRec = !!(window.MediaRecorder && RC.captureStream);
/* the first clip format this browser can record (MP4 where it can, for sharing), or '' for its default */
export function recMime() {
  return (
    [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find((t) => MediaRecorder.isTypeSupported(t)) || ''
  );
}
export function startRec() {
  if (!canRec || state.rec || !state.ph) return;
  try {
    RC.width = cv.width;
    RC.height = cv.height;
    const vs = RC.captureStream(60);
    if (S.dst) S.dst.stream.getAudioTracks().forEach((t) => vs.addTrack(t));
    state.recMime = recMime();
    const o = { videoBitsPerSecond: 7e6 };
    if (state.recMime) o.mimeType = state.recMime;
    const m = new MediaRecorder(vs, o);
    state.recCh = [];
    m.ondataavailable = (e) => {
      if (e.data && e.data.size) state.recCh.push(e.data);
    };
    m.onstop = showClip;
    m.start(250);
    state.rec = m;
    state.recT = performance.now();
  } catch (e) {
    state.rec = null;
  }
}
export function stopRec() {
  if (state.rec && state.rec.state !== 'inactive') state.rec.stop();
}
export function showClip() {
  const type = (state.recMime || 'video/webm').split(';')[0],
    blob = new Blob(state.recCh, { type });
  state.rec = null;
  state.recCh = [];
  state.recLast = -2;
  openClip(blob, 'throttle-up');
}
/* the CLIP READY panel: play the clip, with SAVE and (where the browser can share files) SHARE */
export function openClip(blob, name) {
  const type = blob.type,
    ext = type.includes('mp4') ? 'mp4' : 'webm';
  if (state.clipURL) URL.revokeObjectURL(state.clipURL);
  state.clipURL = URL.createObjectURL(blob);
  state.clipFile = new File([blob], name + '.' + ext, { type });
  const v = $('clipv');
  v.src = state.clipURL;
  $('clip').style.display = 'flex';
  $('shr').style.display = navigator.canShare && navigator.canShare({ files: [state.clipFile] }) ? '' : 'none';
  if (state.AC) state.AC.suspend();
  v.play().catch(() => {});
}
export function recLab() {
  const b = document.querySelector('#ctl [data-k=rec]');
  if (!canRec) {
    if (state.recLast !== -9) {
      state.recLast = -9;
      b.textContent = 'REC N/A';
      b.classList.add('solo', 'na');
    }
    return;
  }
  const s = state.rec ? Math.floor((performance.now() - state.recT) / 1000) : -1;
  if (s === state.recLast) return;
  state.recLast = s;
  b.textContent = state.rec ? '● STOP ' + ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0') : '● REC';
  b.classList.add('solo');
  b.classList.toggle('run', !!state.rec);
}
/* the DOM lever isn't part of the canvas, so mirror it into the frame while recording */
export function recOverlay(x) {
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  /* one lever: track with its 10% ticks, knob at v (0..1), labels with the halo they have on the page */
  const lever = (b, v, labs, kx, kw, kh, lx) => {
    x.fillStyle = T.well;
    x.strokeStyle = T.ruleHi;
    x.lineWidth = 1;
    x.fillRect(b.left, b.top, b.width, b.height);
    x.strokeRect(b.left + 0.5, b.top + 0.5, b.width - 1, b.height - 1);
    x.fillStyle = T.ruleHi;
    for (let i = 1; i < 10; i++) x.fillRect(b.left + 1, b.bottom - (i * b.height) / 10, 5, 1);
    if (lx) {
      /* the main lever on a machine with an afterburner: its range and the gate at MIL */
      x.globalAlpha = 0.25 + state.A * 0.75;
      x.fillStyle = T.live;
      x.fillRect(b.right - 5, b.top + 1, 4, b.height * 0.3);
      x.globalAlpha = 1;
      x.fillStyle = state.stuck ? T.live : T.hi;
      x.fillRect(b.left - 5, b.bottom - b.height * 0.7 - 1, b.width + 10, 2);
    }
    const y = b.bottom - v * b.height;
    x.fillStyle = T.fg;
    x.fillRect(b.left + kx, y - kh / 2, kw, kh);
    x.fillStyle = T.well;
    x.fillRect(b.left + kx, y - 1, kw, 2);
    x.font = lbl(11);
    x.textAlign = 'right';
    x.lineWidth = 3;
    x.strokeStyle = T.halo;
    x.fillStyle = T.over;
    labs.forEach((l) => {
      const ly = l[2] == 't' ? b.top + 7 : l[2] == 'b' ? b.bottom - 7 : b.bottom - l[1] * b.height;
      x.strokeText(l[0], b.left - 8, ly);
      x.fillText(l[0], b.left - 8, ly);
    });
  };
  lever(state.TR, state.L, state.M.lv, -6, 44, 24, state.M.ab);
  if (state.M.nozzle) lever($('trk2').getBoundingClientRect(), state.raw2, state.M.lv2, -8, 28, 20, 0);
  x.font = lbl(11, 600);
  x.textAlign = 'right';
  x.strokeText('THROTTLE UP', state.W - 18, state.H - 12);
  x.fillStyle = T.over;
  x.fillText('THROTTLE UP', state.W - 18, state.H - 12);
  x.textAlign = 'left';
}
/* load-time setup, called from main.js in v11's order */
export function wireRecorder() {
  $('sv').onclick = () => {
    const a = document.createElement('a');
    a.href = state.clipURL;
    a.download = state.clipFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  $('shr').onclick = () => {
    navigator.share({ files: [state.clipFile], title: 'Throttle Up' }).catch(() => {});
  };
  $('cls').onclick = () => {
    $('clip').style.display = 'none';
    const v = $('clipv');
    v.pause();
    v.removeAttribute('src');
    v.load();
    if (state.AC) state.AC.resume();
  };
}
