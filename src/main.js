// Entry point: wires the page up in the order v11 did, picks the machine from ?m, starts the loop and the 3D loader.
import { wireAudio } from './audio/audio.js';
import { load3D } from './core/loader3d.js';
import { frame } from './core/loop.js';
import { setMachine, wireMachineSwitch } from './core/machine-switch.js';
import { MAN } from './core/params.js';
import { wireControls } from './hud/controls.js';
import { wireGauges } from './hud/gauges.js';
import { resize, wireLayout } from './hud/layout.js';
import { wireInfo } from './info/info.js';
import { wireInput } from './input/lever.js';
import { MC } from './machines/index.js';
import { wireRecorder } from './recorder/recorder.js';
import './debug/globals.js';

wireLayout();
wireInput();
wireInfo();
wireAudio();
wireControls();
wireGauges();
wireRecorder();
wireMachineSwitch();
setMachine(Math.min(MC.length - 1, Math.max(0, +new URLSearchParams(location.search).get('m') || 0)));
resize();
if (!MAN) requestAnimationFrame(frame);
load3D();
