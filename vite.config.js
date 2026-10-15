import { defineConfig } from 'vite';

// Settings chosen so the build behaves exactly like throttle-up-v11.html (checked by tools/snapshots.mjs):
// - base './' so the site works from any sub-path (GitHub Pages).
// - CSS is not minified, so the stylesheet reaches the browser as written.
// - No modulepreload polyfill: it would add startup code v11 never ran.
// - three is imported dynamically by the 3D loader, so it lands in its own chunk; ?r=2d never fetches it.
//   optimizeDeps.include pre-bundles it for the dev server up front, so a mid-load "optimized deps, reload"
//   can't push the 3D load past its 20 s timeout.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    cssMinify: false,
    manifest: true,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 700,   // the lazy three chunk is the whole library (init3D uses it as a namespace)
  },
  optimizeDeps: {
    include: ['three', 'three/addons/postprocessing/EffectComposer.js', 'three/addons/postprocessing/ShaderPass.js',
      'three/addons/postprocessing/UnrealBloomPass.js', 'three/addons/postprocessing/OutputPass.js'],
  },
});
