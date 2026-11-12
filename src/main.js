// Entry point: wires the page up in the order v11 did, picks the machine from ?m (or the page's own), starts the loop and the 3D loader.
import { wireAudio } from './audio/audio.js';
import { load3D } from './core/loader3d.js';
import { frame } from './core/loop.js';
import { setMachine, wireMachineSwitch } from './core/machine-switch.js';
import { count, wireAnalytics } from './core/analytics.js';
import { DAILY, HOME, M0, MAN, VS } from './core/params.js';
import { state } from './core/state.js';
import { fontsReady, wireTokens } from './core/tokens.js';
import { wireControls } from './hud/controls.js';
import { wireFps } from './hud/fps.js';
import { buildFaces, wireGauges } from './hud/gauges.js';
import { resize, wireLayout } from './hud/layout.js';
import { wireInfo } from './info/info.js';
import { wireInput } from './input/lever.js';
import { MC } from './machines/index.js';
import { wireMission } from './mission/mission.js';
import { wireRecorder } from './recorder/recorder.js';
import './debug/globals.js';

wireTokens();
wireLayout();
wireInput();
wireInfo();
wireAudio();
wireControls();
wireGauges();
wireRecorder();
wireMachineSwitch();
wireMission();
wireFps();
wireAnalytics();
setMachine(Math.min(MC.length - 1, Math.max(0, M0)));
/* one page view per visit, under the machine's own address whichever link opened it (?m=9 or /lunar-module/);
   the bare home page is '/' */
count(HOME ? '/' : '/' + state.M.slug + (DAILY || VS ? '/daily' : ''));
if (VS) count('challenge/' + state.M.slug, 1);
resize();
/* the dial faces are cached drawings: draw them again once the typefaces are in */
fontsReady(buildFaces);
if (!MAN) requestAnimationFrame(frame);
load3D();
