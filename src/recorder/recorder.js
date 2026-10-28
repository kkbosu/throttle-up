// REC: composites the WebGL frame and the HUD canvas into a clip with MediaRecorder; save/share.
import { S } from '../audio/audio.js';
import { state } from '../core/state.js';
import { $, MONO, cv, mk } from '../core/util.js';

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
      b.style.opacity = 0.4;
    }
    return;
  }
  const s = state.rec ? Math.floor((performance.now() - state.recT) / 1000) : -1;
  if (s === state.recLast) return;
  state.recLast = s;
  b.textContent = state.rec ? '● STOP ' + ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0') : '● REC';
  b.style.color = state.rec ? '#ff6a5a' : '';
}
/* the DOM lever isn't part of the canvas, so mirror it into the frame while recording */
export function recOverlay(x) {
  const b = state.TR;
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.fillStyle = '#0e1118';
  x.strokeStyle = '#2a3040';
  x.lineWidth = 1;
  x.fillRect(b.left, b.top, b.width, b.height);
  x.strokeRect(b.left + 0.5, b.top + 0.5, b.width - 1, b.height - 1);
  if (state.M.ab) {
    const zh = b.height * 0.3,
      gd = x.createLinearGradient(0, b.top, 0, b.top + zh);
    gd.addColorStop(0, '#ff8a2a');
    gd.addColorStop(1, '#5a2208');
    x.globalAlpha = 0.25 + state.A * 0.75;
    x.fillStyle = gd;
    x.fillRect(b.left + 1, b.top + 1, b.width - 2, zh);
    x.globalAlpha = 1;
  }
  const hy = b.bottom - state.L * b.height;
  x.fillStyle = '#2f3541';
  x.strokeStyle = '#6a7282';
  x.fillRect(b.left - 26, hy - 17, 64, 34);
  x.strokeRect(b.left - 25.5, hy - 16.5, 63, 33);
  x.fillStyle = '#6c7482';
  x.font = `10px ${MONO}`;
  x.textAlign = 'right';
  x.textBaseline = 'middle';
  state.M.lv.forEach((l) =>
    x.fillText(l[0], b.left - 6, l[2] == 't' ? b.top + 7 : l[2] == 'b' ? b.bottom - 7 : b.bottom - l[1] * b.height),
  );
  if (state.M.nozzle) {
    const c = $('trk2').getBoundingClientRect(),
      y2 = c.bottom - state.raw2 * c.height;
    x.fillStyle = '#0e1118';
    x.strokeStyle = '#2a3a44';
    x.fillRect(c.left, c.top, c.width, c.height);
    x.strokeRect(c.left + 0.5, c.top + 0.5, c.width - 1, c.height - 1);
    x.fillStyle = '#2a343a';
    x.strokeStyle = '#6a8a9a';
    x.fillRect(c.left - 20, y2 - 15, 52, 30);
    x.strokeRect(c.left - 19.5, y2 - 14.5, 51, 29);
    x.fillStyle = '#7f98a6';
    x.textAlign = 'right';
    state.M.lv2.forEach((l) =>
      x.fillText(l[0], c.left - 6, l[2] == 't' ? c.top + 7 : l[2] == 'b' ? c.bottom - 7 : c.bottom - l[1] * c.height),
    );
  }
  x.fillStyle = 'rgba(216,221,230,.5)';
  x.textAlign = 'right';
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
