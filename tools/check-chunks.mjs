// Build guard: the entry chunk must never statically reach three.js or 3D-only code (src/render3d/, and the
// machines' 3D hooks: src/machines/three.js, src/machines/*/three.js, src/machines/shared/jet3d.js).
// Otherwise ?r=2d, and the fallback when 3D fails, would download three before anything starts. Reads dist/.vite/manifest.json, written by `vite build` (build.manifest: true).

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(await readFile(resolve(ROOT, 'dist/.vite/manifest.json'), 'utf8'));
const THREE_ONLY = /^node_modules\/three\/|^src\/render3d\/|^src\/machines\/([^/]+\/)?three\.js$|^src\/machines\/shared\/jet3d\.js$/;

// A static import can also be merged into the entry chunk itself, where the manifest doesn't show it,
// so every reachable chunk is also scanned for strings only three.js and the 3D renderer contain
// (uHeatLen is a plume-shader uniform defined in src/render3d/).
const MARKS = ['THREE.WebGLRenderer', 'uHeatLen'];

const bad = [];
const seen = new Set();
const walk = async (key, path) => {
  if (seen.has(key)) return;
  seen.add(key);
  const c = man[key];
  if (THREE_ONLY.test(c.src || key)) bad.push(path.concat(key).join(' -> '));
  else {
    const text = await readFile(resolve(ROOT, 'dist', c.file), 'utf8');
    const hit = MARKS.find(m => text.includes(m));
    if (hit) bad.push(`${path.concat(key).join(' -> ')} (contains 3D-only code: "${hit}")`);
  }
  for (const k of c.imports || []) await walk(k, path.concat(key));
};
for (const [key, c] of Object.entries(man)) if (c.isEntry) await walk(key, []);

if (bad.length) {
  console.error('check-chunks: the entry chunk statically imports 3D-only code:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log(`check-chunks: ok (entry reaches ${seen.size} chunk(s), none of them 3D-only)`);
