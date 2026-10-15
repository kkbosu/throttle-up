// Input: throttle lever (with the MIL detent), second lever, keyboard.
import { tick } from '../audio/audio.js';
import { state } from '../core/state.js';
import { $ } from '../core/util.js';
import { act } from '../hud/controls.js';

/* ---------- input: lever with a detent at MIL ---------- */
export function applyRaw(){const r=state.raw,d=state.M.ab;state.L=d?(r<.7?r:r<.8?.7:.7+(r-.8)/.2*.3):r;const s=d&&r>=.7&&r<.8;if(s!==state.stuck){state.stuck=s;tick()}}
export const tq=$('tq'),trk=$('trk');
export function fromY(y){const b=trk.getBoundingClientRect();state.raw=Math.min(1,Math.max(0,1-(y-b.top)/b.height));applyRaw()}
export function fromY2(y){const b=$('trk2').getBoundingClientRect();state.raw2=Math.min(1,Math.max(0,1-(y-b.top)/b.height))}
export const K={};
export function keys(dt){if(state.M.nozzle){const n=(K.arrowright||K.d?1:0)-(K.arrowleft||K.a?1:0);if(n)state.raw2=Math.min(1,Math.max(0,state.raw2+n*.5*dt))}const d=(K.arrowup||K.w?1:0)-(K.arrowdown||K.s?1:0);if(!d)return;const sp=(state.M.ab&&state.raw>=.7&&state.raw<.8)?.1:.45;state.raw=Math.min(1,Math.max(0,state.raw+d*sp*dt));applyRaw()}
/* load-time setup, called from main.js in v11's order */
export function wireInput(){
tq.addEventListener('pointerdown',e=>{tq.setPointerCapture(e.pointerId);tq.style.cursor='grabbing';
 if(state.M.nozzle){const a=trk.getBoundingClientRect(),c=$('trk2').getBoundingClientRect();if(Math.abs(e.clientX-c.left-6)<Math.abs(e.clientX-a.left-6)){state.drag2=true;fromY2(e.clientY);return}}
 state.drag=true;fromY(e.clientY)});
tq.addEventListener('pointermove',e=>{if(state.drag2)fromY2(e.clientY);else if(state.drag)fromY(e.clientY)});
['pointerup','pointercancel'].forEach(n=>tq.addEventListener(n,()=>{state.drag=state.drag2=false;tq.style.cursor='grab'}));
addEventListener('keydown',e=>{const k=e.key.toLowerCase();K[k]=1;if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const m={v:'view',e:'exp',c:'scn',m:'slow',r:'rec',o:'eng',f:'flt',n:'mach',q:'seq',i:'inf',l:'lens'}[k];if(m&&state.ph)act(m)});
addEventListener('keyup',e=>K[e.key.toLowerCase()]=0);
}
