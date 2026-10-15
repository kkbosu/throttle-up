// 3D loader: fetches three and the renderer chunk; anything goes wrong (no WebGL2, offline, error) and the 2D renderer carries on.
import { chips } from './machine-switch.js';
import { state } from './state.js';
import { $, SN } from './util.js';
import { lab } from '../hud/controls.js';

/* ---------- 3D renderer loader: Three.js is a separate chunk, fetched only here; anything goes wrong (no WebGL2, offline, error) and the 2D renderer above carries on ---------- */
export function ready3D(ok,X){if(state.R3done)return;state.R3done=true;
 if(ok){try{state.G3=X.init3D(X.T,X);SN.splice(0,3,'DUSK','DAY','NIGHT');$('gl').addEventListener('webglcontextlost',e=>{e.preventDefault();fail3D()})}catch(e){console.error('3D init failed',e);state.G3=null}}
 if(!state.G3)$('gl').style.display='none';document.querySelector('#ov span').textContent='START ENGINE';chips();lab()}
export function fail3D(){state.G3=null;state.lens=0;$('gl').style.display='none';SN.splice(0,3,'VOID','DESERT DAWN','NIGHT');chips();lab()}
/* load-time setup, called from main.js in v11's order */
export function load3D(){
(function(){document.querySelector('#ov span').textContent='LOADING 3D...';
 if(new URLSearchParams(location.search).get('r')==='2d'){ready3D(false);return}
 const to=setTimeout(()=>ready3D(false),20000);
 Promise.all([import('three'),import('three/addons/postprocessing/EffectComposer.js'),import('three/addons/postprocessing/ShaderPass.js'),import('three/addons/postprocessing/UnrealBloomPass.js'),import('three/addons/postprocessing/OutputPass.js'),import('../render3d/index.js')])
 .then(([T,a,b,c,d,r])=>{clearTimeout(to);ready3D(true,{T,EffectComposer:a.EffectComposer,ShaderPass:b.ShaderPass,UnrealBloomPass:c.UnrealBloomPass,OutputPass:d.OutputPass,init3D:r.init3D})})
 .catch(e=>{console.error(e);clearTimeout(to);ready3D(false)})})();
}
