// Mission clip: while a MISSION runs, a 9:16 video (720×1280, for TikTok, Reels and Shorts) records on its own: the 3D
// view cropped around the machine, the title and daily number above, the mission's live readouts below, and the
// verdict at the end. The result card's CLIP button opens it in the CLIP READY panel to save or share.
import { S } from '../audio/audio.js';
import { state } from '../core/state.js';
import { $, MONO, mk } from '../core/util.js';
import { canRec, openClip, recMime } from '../recorder/recorder.js';
import { MS } from './mission.js';

/* the frame: a title band, the 3D view at 3:4, and a band for the readouts */
const VW = 720,
  VH = 1280,
  TOP = 150,
  VID = 960;
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
    /* only a clip that ran to the verdict is kept; a dropped one just stops */
    m.onstop = () => {
      if (m.keep) {
        CL.blob = new Blob(ch, { type: (mime || 'video/webm').split(';')[0] });
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
function txt(s, x, y, px, col, al = 'center', sp = 0) {
  vc.font = `${px}px ${MONO}`;
  vc.fillStyle = col;
  vc.textAlign = al;
  if ('letterSpacing' in vc) vc.letterSpacing = sp + 'px';
  vc.fillText(s, x, y);
}
/* one video frame, after the 3D view has rendered (frame() in core/loop.js) */
export function clipFrame(dr) {
  if (!CL.rec) return;
  const m = state.M.mission;
  CL.t += dr;
  if (MS.res) CL.after += dr;
  vc.globalAlpha = 1;
  vc.fillStyle = '#05060a';
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
  txt('THROTTLE UP', VW / 2, 70, 40, '#d8dde6', 'center', 10);
  txt(
    (MS.day ? 'DAILY #' + MS.day + ' · TRY ' + MS.tries : 'MISSION') + ' · ' + m.tag.toUpperCase(),
    VW / 2,
    116,
    20,
    '#8a93a3',
    'center',
    3,
  );
  /* the readouts, in columns */
  const rows = m.clip(),
    cw = VW / rows.length;
  rows.forEach(([k, v], i) => {
    txt(k, cw * (i + 0.5), TOP + VID + 50, 18, '#6c7482', 'center', 3);
    txt(v, cw * (i + 0.5), TOP + VID + 94, 34, '#d8dde6', 'center', 1);
  });
  txt(location.host + location.pathname.replace(/\/$/, ''), VW / 2, VH - 28, 20, '#6c7482', 'center', 2);
  /* the verdict, over the top of the view (the sky), clear of the machine */
  const r = MS.res;
  if (r) {
    vc.fillStyle = 'rgba(5,6,10,.72)';
    vc.fillRect(0, TOP + 40, VW, 200);
    txt(r.title, VW / 2, TOP + 110, 40, r.ok ? '#3fcf7a' : '#ff8a5a', 'center', 6);
    txt(r.ok ? r.score + ' POINTS' : 'NO SCORE', VW / 2, TOP + 194, 60, '#d8dde6', 'center', 6);
  }
  vc.letterSpacing = '0px';
  /* the clip ends 3.5 s after the verdict (before the camera chases the stage out of frame), and never runs past
     3 minutes, the longest a Short can be */
  if (CL.after > 3.5 || CL.t > 180) stop(true);
}
