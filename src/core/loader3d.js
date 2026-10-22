// 3D loader: fetches three and the renderer chunk; anything goes wrong (no WebGL2, offline, error) and the 2D renderer carries on.
import { chips, views } from './machine-switch.js';
import { state } from './state.js';
import { $, SN } from './util.js';
import { lab } from '../hud/controls.js';

/* ---------- 3D renderer loader: Three.js is a separate chunk, fetched only here; anything goes wrong (no WebGL2, offline, error) and the 2D renderer above carries on ---------- */
/* why: when 3D doesn't start, the reason (kept in state.no3D, shown by ?fps, logged) */
export function ready3D(ok, X, why) {
  if (state.R3done) return;
  state.R3done = true;
  if (!ok) state.no3D = why || 'unavailable';
  if (ok) {
    try {
      state.G3 = X.init3D(X.T, X);
      SN.splice(0, 3, 'DUSK', 'DAY', 'NIGHT');
      $('gl').addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        fail3D();
      });
    } catch (e) {
      console.error('3D init failed', e);
      state.G3 = null;
      state.no3D = 'init failed';
    }
  }
  if (!state.G3) $('gl').style.display = 'none';
  document.querySelector('#ov span').textContent = 'START ENGINE';
  chips();
  lab();
}
export function fail3D() {
  console.warn('3D stopped: WebGL context lost');
  state.no3D = 'context lost';
  state.G3 = null;
  state.lens = 0;
  if (!views().includes(state.view)) state.view = 0;
  $('gl').style.display = 'none';
  SN.splice(0, 3, 'VOID', 'DESERT DAWN', 'NIGHT');
  chips();
  lab();
}
/* load-time setup, called from main.js in v11's order */
export function load3D() {
  (function () {
    document.querySelector('#ov span').textContent = 'LOADING 3D...';
    if (new URLSearchParams(location.search).get('r') === '2d') {
      ready3D(false, null, 'r=2d');
      return;
    }
    const to = setTimeout(() => {
      if (!state.R3done) console.warn('3D: still loading after 20 s, using 2D');
      ready3D(false, null, 'load timeout');
    }, 20000);
    Promise.all([
      import('three'),
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/ShaderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
      import('../render3d/index.js'),
    ])
      .then(([T, a, b, c, d, r]) => {
        clearTimeout(to);
        ready3D(true, {
          T,
          EffectComposer: a.EffectComposer,
          ShaderPass: b.ShaderPass,
          UnrealBloomPass: c.UnrealBloomPass,
          OutputPass: d.OutputPass,
          init3D: r.init3D,
        });
      })
      .catch((e) => {
        console.error(e);
        clearTimeout(to);
        ready3D(false, null, 'load failed');
      });
  })();
}
