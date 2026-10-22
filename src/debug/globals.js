// Test bridge: in v11 everything was a global, and tests (tools/snapshots.mjs, tools/check.mjs, legacy/tests) read and
// assign names like view, raw, N or step() directly. Expose every module export and state key on window.
import { state } from '../core/state.js';
import * as m0 from '../audio/audio.js';
import * as m1 from '../core/engine.js';
import * as m2 from '../core/loader3d.js';
import * as m3 from '../core/loop.js';
import * as m4 from '../core/machine-switch.js';
import * as m5 from '../core/params.js';
import * as m6 from '../core/util.js';
import * as m7 from '../hud/controls.js';
import * as m8 from '../hud/gauges.js';
import * as m9 from '../hud/layout.js';
import * as m10 from '../info/cut-text.js';
import * as m11 from '../info/info.js';
import * as m12 from '../input/lever.js';
import * as m13 from '../machines/f-type/machine.js';
import * as m14 from '../machines/hall/inset.js';
import * as m15 from '../machines/hall/machine.js';
import * as m16 from '../machines/harrier/inset.js';
import * as m17 from '../machines/harrier/machine.js';
import * as m18 from '../machines/index.js';
import * as m19 from '../machines/nk-12/inset.js';
import * as m20 from '../machines/nk-12/machine.js';
import * as m21 from '../machines/saturn-v/machine.js';
import * as m22 from '../machines/shared/gimbal.js';
import * as m23 from '../machines/shuttle/draw2d.js';
import * as m24 from '../machines/shuttle/machine.js';
import * as m25 from '../machines/sky-crane/inset.js';
import * as m26 from '../machines/sky-crane/machine.js';
import * as m27 from '../machines/sr-71/inset.js';
import * as m28 from '../machines/sr-71/machine.js';
import * as m29 from '../recorder/recorder.js';
import * as m30 from '../render2d/index.js';
import * as m31 from '../render2d/jet.js';
import * as m32 from '../render2d/sprites.js';
import * as m33 from '../sequence/sequence.js';

const d = (k, g, s) => {
  const o = Object.getOwnPropertyDescriptor(window, k);
  if (o && !o.configurable) {
    console.error('test bridge: cannot expose ' + k);
    return;
  }
  Object.defineProperty(window, k, { get: g, set: s, configurable: true });
};
d(
  'W',
  () => state.W,
  (v) => {
    state.W = v;
  },
);
d(
  'H',
  () => state.H,
  (v) => {
    state.H = v;
  },
);
d(
  'D',
  () => state.D,
  (v) => {
    state.D = v;
  },
);
d(
  'u',
  () => state.u,
  (v) => {
    state.u = v;
  },
);
d(
  'nx',
  () => state.nx,
  (v) => {
    state.nx = v;
  },
);
d(
  'ny',
  () => state.ny,
  (v) => {
    state.ny = v;
  },
);
d(
  'gx',
  () => state.gx,
  (v) => {
    state.gx = v;
  },
);
d(
  'gy',
  () => state.gy,
  (v) => {
    state.gy = v;
  },
);
d(
  'dsz',
  () => state.dsz,
  (v) => {
    state.dsz = v;
  },
);
d(
  'TR',
  () => state.TR,
  (v) => {
    state.TR = v;
  },
);
d(
  'L',
  () => state.L,
  (v) => {
    state.L = v;
  },
);
d(
  'raw',
  () => state.raw,
  (v) => {
    state.raw = v;
  },
);
d(
  'N',
  () => state.N,
  (v) => {
    state.N = v;
  },
);
d(
  'A',
  () => state.A,
  (v) => {
    state.A = v;
  },
);
d(
  'E',
  () => state.E,
  (v) => {
    state.E = v;
  },
);
d(
  'F',
  () => state.F,
  (v) => {
    state.F = v;
  },
);
d(
  'kick',
  () => state.kick,
  (v) => {
    state.kick = v;
  },
);
d(
  'ign',
  () => state.ign,
  (v) => {
    state.ign = v;
  },
);
d(
  'spd',
  () => state.spd,
  (v) => {
    state.spd = v;
  },
);
d(
  'sg',
  () => state.sg,
  (v) => {
    state.sg = v;
  },
);
d(
  'igt',
  () => state.igt,
  (v) => {
    state.igt = v;
  },
);
d(
  'fu',
  () => state.fu,
  (v) => {
    state.fu = v;
  },
);
d(
  'hg',
  () => state.hg,
  (v) => {
    state.hg = v;
  },
);
d(
  'Ns',
  () => state.Ns,
  (v) => {
    state.Ns = v;
  },
);
d(
  'sT',
  () => state.sT,
  (v) => {
    state.sT = v;
  },
);
d(
  'Nst',
  () => state.Nst,
  (v) => {
    state.Nst = v;
  },
);
d(
  'pulseT',
  () => state.pulseT,
  (v) => {
    state.pulseT = v;
  },
);
d(
  'bt',
  () => state.bt,
  (v) => {
    state.bt = v;
  },
);
d(
  'coolS',
  () => state.coolS,
  (v) => {
    state.coolS = v;
  },
);
d(
  'stl',
  () => state.stl,
  (v) => {
    state.stl = v;
  },
);
d(
  'Lp',
  () => state.Lp,
  (v) => {
    state.Lp = v;
  },
);
d(
  'Lrate',
  () => state.Lrate,
  (v) => {
    state.Lrate = v;
  },
);
d(
  'faults',
  () => state.faults,
  (v) => {
    state.faults = v;
  },
);
d(
  'lit',
  () => state.lit,
  (v) => {
    state.lit = v;
  },
);
d(
  'tm',
  () => state.tm,
  (v) => {
    state.tm = v;
  },
);
d(
  'stuck',
  () => state.stuck,
  (v) => {
    state.stuck = v;
  },
);
d(
  'last',
  () => state.last,
  (v) => {
    state.last = v;
  },
);
d(
  'hinted',
  () => state.hinted,
  (v) => {
    state.hinted = v;
  },
);
d(
  'gn',
  () => state.gn,
  (v) => {
    state.gn = v;
  },
);
d(
  'spk',
  () => state.spk,
  (v) => {
    state.spk = v;
  },
);
d(
  'mach',
  () => state.mach,
  (v) => {
    state.mach = v;
  },
);
d(
  'G3',
  () => state.G3,
  (v) => {
    state.G3 = v;
  },
);
d(
  'R3done',
  () => state.R3done,
  (v) => {
    state.R3done = v;
  },
);
d(
  'lens',
  () => state.lens,
  (v) => {
    state.lens = v;
  },
);
d(
  'raw2',
  () => state.raw2,
  (v) => {
    state.raw2 = v;
  },
);
d(
  'drag2',
  () => state.drag2,
  (v) => {
    state.drag2 = v;
  },
);
d(
  'alt',
  () => state.alt,
  (v) => {
    state.alt = v;
  },
);
d(
  'vz',
  () => state.vz,
  (v) => {
    state.vz = v;
  },
);
d(
  'nz',
  () => state.nz,
  (v) => {
    state.nz = v;
  },
);
d(
  'prp',
  () => state.prp,
  (v) => {
    state.prp = v;
  },
);
d(
  'beta',
  () => state.beta,
  (v) => {
    state.beta = v;
  },
);
d(
  'ph',
  () => state.ph,
  (v) => {
    state.ph = v;
  },
);
d(
  'st',
  () => state.st,
  (v) => {
    state.st = v;
  },
);
d(
  'TS',
  () => state.TS,
  (v) => {
    state.TS = v;
  },
);
d(
  'tsT',
  () => state.tsT,
  (v) => {
    state.tsT = v;
  },
);
d(
  'simT',
  () => state.simT,
  (v) => {
    state.simT = v;
  },
);
d(
  'sl',
  () => state.sl,
  (v) => {
    state.sl = v;
  },
);
d(
  'view',
  () => state.view,
  (v) => {
    state.view = v;
  },
);
d(
  'exposed',
  () => state.exposed,
  (v) => {
    state.exposed = v;
  },
);
d(
  'scene',
  () => state.scene,
  (v) => {
    state.scene = v;
  },
);
d(
  'zm',
  () => state.zm,
  (v) => {
    state.zm = v;
  },
);
d(
  'mi',
  () => state.mi,
  (v) => {
    state.mi = v;
  },
);
d(
  'M',
  () => state.M,
  (v) => {
    state.M = v;
  },
);
d(
  'Q',
  () => state.Q,
  (v) => {
    state.Q = v;
  },
);
d(
  'emaT',
  () => state.emaT,
  (v) => {
    state.emaT = v;
  },
);
d(
  'slowT',
  () => state.slowT,
  (v) => {
    state.slowT = v;
  },
);
d(
  'lowRes',
  () => state.lowRes,
  (v) => {
    state.lowRes = v;
  },
);
d(
  'emaJ',
  () => state.emaJ,
  (v) => {
    state.emaJ = v;
  },
);
d(
  'jsT',
  () => state.jsT,
  (v) => {
    state.jsT = v;
  },
);
d(
  'fastT',
  () => state.fastT,
  (v) => {
    state.fastT = v;
  },
);
d(
  'qUpT',
  () => state.qUpT,
  (v) => {
    state.qUpT = v;
  },
);
d(
  'qCeil',
  () => state.qCeil,
  (v) => {
    state.qCeil = v;
  },
);
d(
  'GC',
  () => state.GC,
  (v) => {
    state.GC = v;
  },
);
d(
  'FC',
  () => state.FC,
  (v) => {
    state.FC = v;
  },
);
d(
  'SWR',
  () => state.SWR,
  (v) => {
    state.SWR = v;
  },
);
d(
  'drag',
  () => state.drag,
  (v) => {
    state.drag = v;
  },
);
d(
  'AC',
  () => state.AC,
  (v) => {
    state.AC = v;
  },
);
d(
  'rec',
  () => state.rec,
  (v) => {
    state.rec = v;
  },
);
d(
  'recCh',
  () => state.recCh,
  (v) => {
    state.recCh = v;
  },
);
d(
  'recT',
  () => state.recT,
  (v) => {
    state.recT = v;
  },
);
d(
  'recMime',
  () => state.recMime,
  (v) => {
    state.recMime = v;
  },
);
d(
  'clipURL',
  () => state.clipURL,
  (v) => {
    state.clipURL = v;
  },
);
d(
  'clipFile',
  () => state.clipFile,
  (v) => {
    state.clipFile = v;
  },
);
d(
  'recLast',
  () => state.recLast,
  (v) => {
    state.recLast = v;
  },
);
d('S', () => m0.S);
d('VV', () => m0.VV);
d('initAudio', () => m0.initAudio);
d('audio', () => m0.audio);
d('thump', () => m0.thump);
d('tick', () => m0.tick);
d('bang', () => m0.bang);
d('beep', () => m0.beep);
d('wireAudio', () => m0.wireAudio);
d('update', () => m1.update);
d('startStall', () => m1.startStall);
d('surge', () => m1.surge);
d('master', () => m1.master);
d('ready3D', () => m2.ready3D);
d('fail3D', () => m2.fail3D);
d('load3D', () => m2.load3D);
d('ui', () => m3.ui);
d('adapt', () => m3.adapt);
d('frame', () => m3.frame);
d('step', () => m3.step);
d('nextM', () => m4.nextM);
d('prevM', () => m4.prevM);
d('views', () => m4.views);
d('chips', () => m4.chips);
d('setMachine', () => m4.setMachine);
d('wireMachineSwitch', () => m4.wireMachineSwitch);
d('QP', () => m5.QP);
d('MAN', () => m5.MAN);
d('FPS', () => m5.FPS);
d('NOMERGE', () => m5.NOMERGE);
d('$', () => m6.$);
d('cv', () => m6.cv);
d('g', () => m6.g);
d('mk', () => m6.mk);
d('sm', () => m6.sm);
d('SNM', () => m6.SNM);
d('SL', () => m6.SL);
d('SLN', () => m6.SLN);
d('VN', () => m6.VN);
d('SN', () => m6.SN);
d('ZT', () => m6.ZT);
d('MONO', () => m6.MONO);
d('SHAKE', () => m6.SHAKE);
d('lab', () => m7.lab);
d('say', () => m7.say);
d('act', () => m7.act);
d('buildLabels', () => m7.buildLabels);
d('wireControls', () => m7.wireControls);
d('A0', () => m8.A0);
d('SW', () => m8.SW);
d('GV', () => m8.GV);
d('buildFaces', () => m8.buildFaces);
d('gauges', () => m8.gauges);
d('wireGauges', () => m8.wireGauges);
d('resize', () => m9.resize);
d('wireLayout', () => m9.wireLayout);
d('CUT_SCHLIEREN', () => m10.CUT_SCHLIEREN);
d('CUT_THERMAL', () => m10.CUT_THERMAL);
d('showInfo', () => m11.showInfo);
d('closeInfo', () => m11.closeInfo);
d('wireInfo', () => m11.wireInfo);
d('applyRaw', () => m12.applyRaw);
d('tq', () => m12.tq);
d('trk', () => m12.trk);
d('fromY', () => m12.fromY);
d('fromY2', () => m12.fromY2);
d('K', () => m12.K);
d('keys', () => m12.keys);
d('wireInput', () => m12.wireInput);
d('auF', () => m13.auF);
d('orbitInset', () => m14.orbitInset);
d('htT', () => m15.htT);
d('MU', () => m15.MU);
d('RE', () => m15.RE);
d('WN', () => m15.WN);
d('WF', () => m15.WF);
d('orb', () => m15.orb);
d('orbReset', () => m15.orbReset);
d('orbStep', () => m15.orbStep);
d('auHT', () => m15.auHT);
d('hoverInset', () => m16.hoverInset);
d('HM', () => m17.HM);
d('HT', () => m17.HT);
d('G0', () => m17.G0);
d('harT', () => m17.harT);
d('hovL', () => m17.hovL);
d('hoverStep', () => m17.hoverStep);
d('auHR', () => m17.auHR);
d('MC', () => m18.MC);
d('propInset', () => m19.propInset);
d('TPW', () => m20.TPW);
d('TPJ', () => m20.TPJ);
d('tpP', () => m20.tpP);
d('tpT', () => m20.tpT);
d('tpStep', () => m20.tpStep);
d('auTP', () => m20.auTP);
d('sicE', () => m21.sicE);
d('sicStep', () => m21.sicStep);
d('auF1', () => m21.auF1);
d('gimb', () => m22.gimb);
d('drawSS', () => m23.drawSS);
d('plumeSS', () => m23.plumeSS);
d('bellSS', () => m23.bellSS);
d('baySS', () => m23.baySS);
d('rearSS', () => m23.rearSS);
d('auSS', () => m24.auSS);
d('craneInset', () => m25.craneInset);
d('GM', () => m26.GM);
d('MR', () => m26.MR);
d('MS', () => m26.MS);
d('MLE', () => m26.MLE);
d('MLN', () => m26.MLN);
d('CANT', () => m26.CANT);
d('RH', () => m26.RH);
d('BL', () => m26.BL);
d('sc', () => m26.sc);
d('skyReset', () => m26.skyReset);
d('skyRy', () => m26.skyRy);
d('skyHov', () => m26.skyHov);
d('skyCam', () => m26.skyCam);
d('skyStep', () => m26.skyStep);
d('auSC', () => m26.auSC);
d('spikeInset', () => m27.spikeInset);
d('auSR', () => m28.auSR);
d('RC', () => m29.RC);
d('rc', () => m29.rc);
d('canRec', () => m29.canRec);
d('startRec', () => m29.startRec);
d('stopRec', () => m29.stopRec);
d('showClip', () => m29.showClip);
d('recLab', () => m29.recLab);
d('recOverlay', () => m29.recOverlay);
d('wireRecorder', () => m29.wireRecorder);
d('B0', () => m30.B0);
d('B1', () => m30.B1);
d('B2', () => m30.B2);
d('HS', () => m30.HS);
d('HD', () => m30.HD);
d('b0', () => m30.b0);
d('b1', () => m30.b1);
d('b2', () => m30.b2);
d('hs', () => m30.hs);
d('hd', () => m30.hd);
d('P', () => m30.P);
d('EM', () => m30.EM);
d('SM', () => m30.SM);
d('VP', () => m30.VP);
d('ST', () => m30.ST);
d('sky', () => m30.sky);
d('haze', () => m30.haze);
d('bloom', () => m30.bloom);
d('draw', () => m30.draw);
d('emit', () => m31.emit);
d('stream', () => m31.stream);
d('tongues', () => m31.tongues);
d('plume', () => m31.plume);
d('sparks', () => m31.sparks);
d('rear', () => m31.rear);
d('wires', () => m31.wires);
d('metal', () => m31.metal);
d('doors', () => m31.doors);
d('actuators', () => m31.actuators);
d('body', () => m31.body);
d('spr', () => m32.spr);
d('SP', () => m32.SP);
d('blob', () => m32.blob);
d('SQ', () => m33.SQ);
d('seqStart', () => m33.seqStart);
d('seqNext', () => m33.seqNext);
d('seqStop', () => m33.seqStop);
d('seqTick', () => m33.seqTick);
d('seqCap', () => m33.seqCap);
