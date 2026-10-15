import { defineConfig } from 'vite';

// Settings chosen so the build behaves exactly like throttle-up-v11.html (checked by tools/snapshots.mjs):
// - base './' so the site works from any sub-path (GitHub Pages).
// - CSS is not minified, so the stylesheet reaches the browser as written.
// - No modulepreload polyfill: it would add startup code v11 never ran.
// - Step 1a of the split: three still comes from the CDN through the import map in index.html.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    cssMinify: false,
    manifest: true,
    modulePreload: { polyfill: false },
    rolldownOptions: { external: ['three', /^three\/addons\//] },
  },
});
