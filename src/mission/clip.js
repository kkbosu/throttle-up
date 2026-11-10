// Mission clip: while a MISSION runs, a 9:16 video (720×1280, for TikTok, Reels and Shorts) records on its own: the 3D
// view cropped around the machine, the title and daily number above, the mission's live readouts below, and the
// verdict at the end. The result card's CLIP button opens it in the CLIP READY panel to save or share.
import { S } from '../audio/audio.js';
import { state } from '../core/state.js';
import { T, lbl, num } from '../core/tokens.js';
import { $, mk } from '../core/util.js';
import { canRec, openClip, recMime } from '../recorder/recorder.js';
import { MS } from './mission.js';
import { traceDraw } from './trace.js';

/* the frame: a title band, the 3D view at 3:4, and a band for the readouts */
const VW = 720,
  VH = 1280,
  TOP = 150,
  VID = 960,
  PAD = 36;
/* rec: the recorder; blob: the finished clip; after: seconds since the verdict (the clip runs on 3.5 s);
   cv: the canvas it records */
export const CL = { rec: null, blob: null, after: 0, t: 0, cv: null };
let vc = null;

/* a new attempt: drop the last clip and start recording (not while REC is already recording, and only in 3D) */
export function clipStart() {
  clipDrop();
  if (!canRec || state.rec || !state.G3) return;
  try {
    if (!CL.cv) {
      CL.cv = mk(VW, VH);
      vc = CL.cv.getContext('2d');
    }
    const vs = CL.cv.captureStream(30);
    if (S.dst) S.dst.stream.getAudioTracks().forEach((t) => vs.addTrack(t));
    const mime = recMime(),
      o = { videoBitsPerSecond: 5e6 };
    if (mime) o.mimeType = mime;
    const m = new MediaRecorder(vs, o),
      ch = [];
    m.ondataavailable = (e) => {
      if (e.data && e.data.size) ch.push(e.data);
    };
    /* only a clip that ran to the verdict is kept; a dropped one just stops; an empty one (no frame reached the
       encoder) is not offered */
    m.onstop = () => {
      if (m.keep) {
        const b = new Blob(ch, { type: (mime || 'video/webm').split(';')[0] });
        CL.blob = b.size ? b : null;
        clipLab();
      }
    };
    m.start(500);
    CL.rec = m;
    CL.after = CL.t = 0;
  } catch (e) {
    CL.rec = null;
  }
}
function stop(keep) {
  const m = CL.rec;
  CL.rec = null;
  if (m && m.state !== 'inactive') {
    m.keep = keep;
    m.stop();
  }
}
/* the attempt was abandoned (FLY AGAIN, END MISSION, another machine): no clip */
export function clipDrop() {
  stop(false);
  CL.blob = null;
  clipLab();
}
/* the card's CLIP button: hidden where recording isn't possible, waiting while the clip finishes */
export function clipLab() {
  const b = $('misv');
  b.style.display = canRec && (CL.rec || CL.blob) ? '' : 'none';
  b.disabled = !CL.blob;
  b.textContent = CL.blob ? '▶ CLIP' : 'CLIP...';
}
export function clipOpen() {
  if (CL.blob) openClip(CL.blob, 'throttle-up' + (MS.day ? '-daily-' + MS.day : ''));
}
function txt(s, x, y, font, col, al = 'center', sp = 0) {
  vc.font = font;
  vc.fillStyle = col;
  vc.textAlign = al;
  if ('letterSpacing' in vc) vc.letterSpacing = sp + 'px';
  vc.fillText(s, x, y);
}
/* one video frame, after the 3D view has rendered (frame() in core/loop.js) */
export function clipFrame(dr) {
  if (!CL.rec) return;
  const m = state.M.mission,
    r = MS.res;
  CL.t += dr;
  if (r) CL.after += dr;
  vc.globalAlpha = 1;
  vc.fillStyle = T.bg;
  vc.fillRect(0, 0, VW, VH);
  /* the camera aims at the middle of the view, so the largest 3:4 box there holds the machine */
  const g = state.G3.canvas,
    gw = g.width,
    gh = g.height;
  let sw = gw,
    sh = (gw * VID) / VW;
  if (sh > gh) {
    sh = gh;
    sw = (gh * VW) / VID;
  }
  if (gw && gh) vc.drawImage(g, (gw - sw) / 2, (gh - sh) / 2, sw, sh, 0, TOP, VW, VID);
  vc.textBaseline = 'alphabetic';
  /* the title band: the name and the try on the left, the run clock on the right; its lower edge is amber while the
     try is flown, then green or red with the verdict */
  const edge = r ? (r.ok ? T.go : T.warn) : T.live,
    s = Math.floor(r ? MS.tv : MS.t);
  vc.fillStyle = T.well;
  vc.fillRect(0, 0, VW, TOP);
  vc.fillRect(0, TOP + VID, VW, VH - TOP - VID);
  vc.fillStyle = edge;
  vc.fillRect(0, TOP - 4, VW, 4);
  txt('THROTTLE UP', PAD, 74, lbl(42, 600), T.hi, 'left', 6);
  txt(
    (MS.day ? 'DAILY #' + MS.day + ' · TRY ' + MS.tries : 'MISSION') + ' · ' + m.tag.toUpperCase(),
    PAD,
    116,
    lbl(22),
    T.dim,
    'left',
    2,
  );
  txt(
    'T+' + String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'),
    VW - PAD,
    72,
    num(28),
    edge,
    'right',
  );
  /* the readouts, in columns */
  const rows = m.clip(),
    cw = VW / rows.length;
  rows.forEach(([k, v], i) => {
    txt(k, cw * (i + 0.5), TOP + VID + 50, lbl(20), T.dim, 'center', 3);
    txt(v, cw * (i + 0.5), TOP + VID + 96, num(34), T.hi, 'center');
  });
  txt(location.host + location.pathname.replace(/\/$/, ''), VW / 2, VH - 26, num(19), T.live, 'center');
  /* the verdict, over the top of the view (the sky), clear of the machine: a panel that fades in with the title, the
     score as the biggest thing in the frame, and the try's trace */
  if (r) {
    const tr = m.traceLab ? 128 : 0,
      y = TOP + 30,
      h = 176 + tr;
    vc.globalAlpha = Math.min(1, CL.after / 0.25);
    vc.fillStyle = T.panel;
    vc.fillRect(PAD, y, VW - 2 * PAD, h);
    vc.fillStyle = edge;
    vc.fillRect(PAD, y, 6, h);
    txt(r.title, PAD + 30, y + 52, lbl(36, 600), edge, 'left', 4);
    if (r.ok) {
      txt(String(r.score), PAD + 26, y + 148, num(100), T.hi, 'left', -3);
      const w = vc.measureText(String(r.score)).width;
      txt('POINTS', PAD + 44 + w, y + 148, lbl(24), T.dim, 'left', 4);
    } else txt('NO SCORE', PAD + 30, y + 138, lbl(60, 600), T.dim, 'left', 4);
    vc.letterSpacing = '0px';
    if (tr) traceDraw(vc, PAD + 22, y + 166, VW - 2 * PAD - 44, tr, m.traceLab, 2);
    vc.globalAlpha = 1;
  }
  vc.letterSpacing = '0px';
  /* the clip ends 3.5 s after the verdict (before the camera chases the stage out of frame), and never runs past
     3 minutes, the longest a Short can be */
  if (CL.after > 3.5 || CL.t > 180) stop(true);
}
