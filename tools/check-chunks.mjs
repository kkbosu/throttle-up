// Build guard: the entry chunk must never statically reach three.js or 3D-only code (src/render3d/,
// src/machines/*/three.js). Otherwise ?r=2d, and the fallback when 3D fails, would download three
// before anything starts. Reads dist/.vite/manifest.json, written by `vite build` (build.manifest: true).

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(await readFile(resolve(ROOT, 'dist/.vite/manifest.json'), 'utf8'));
const THREE_ONLY = /^node_modules\/three\/|^src\/render3d\/|^src\/machines\/[^/]+\/three\.js$/;

// A static import can also be merged into the entry chunk itself, where the manifest doesn't show it,
// so every reachable chunk is also scanned for a string only three.js contains.
const THREE_MARK = 'THREE.WebGLRenderer';

const bad = [];
const seen = new Set();
const walk = async (key, path) => {
  if (seen.has(key)) return;
  seen.add(key);
  const c = man[key];
  if (THREE_ONLY.test(c.src || key)) bad.push(path.concat(key).join(' -> '));
  else if ((await readFile(resolve(ROOT, 'dist', c.file), 'utf8')).includes(THREE_MARK)) bad.push(`${path.concat(key).join(' -> ')} (contains three.js code)`);
  for (const k of c.imports || []) await walk(k, path.concat(key));
};
for (const [key, c] of Object.entries(man)) if (c.isEntry) await walk(key, []);

if (bad.length) {
  console.error('check-chunks: the entry chunk statically imports 3D-only code:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log(`check-chunks: ok (entry reaches ${seen.size} chunk(s), none of them 3D-only)`);
