// Compare two snapshot runs made by tools/snapshots.mjs.
//
//   node tools/compare.mjs snapshots/golden snapshots/after
//
// Passes only if every screenshot is byte-identical and the manifests match (sim state, random-call
// counts, audio trace, INFO html, chip lists, errors). For screenshots that differ it reports how many
// pixels changed and writes a diff image (changed pixels in magenta) to <after>/_diff/.
// The manifest's `env` (GPU string, randoms drawn before WebGL) and `page` are informational and not compared.

import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const argv = process.argv.slice(2);
const PARTIAL = argv.includes('--partial') && !!argv.splice(argv.indexOf('--partial'), 1);   // only scenarios present in <other>
const [A, B] = argv.map(p => resolve(p || ''));
if (!argv[1]) { console.error('usage: node tools/compare.mjs [--partial] <golden dir> <other dir>'); process.exit(2); }
const load = async d => JSON.parse(await readFile(join(d, 'manifest.json'), 'utf8')).scenarios;
const [ma, mb] = await Promise.all([load(A), load(B)]);
if (PARTIAL) for (const id of Object.keys(ma)) if (!mb[id]) delete ma[id];

const diffs = [];
function deep(a, b, path) {
  if (diffs.length > 200) return;
  if (Object.is(a, b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) deep(a[k], b[k], `${path}.${k}`);
    return;
  }
  const s = v => { const j = JSON.stringify(v); return j && j.length > 120 ? j.slice(0, 117) + '...' : j; };
  diffs.push(`${path}: ${s(a)} -> ${s(b)}`);
}
const strip = r => r && (({ env, ...rest }) => rest)(r);
for (const id of new Set([...Object.keys(ma), ...Object.keys(mb)])) deep(strip(ma[id]), strip(mb[id]), id);

// Screenshots: every file named in either manifest.
const files = [...new Set([ma, mb].flatMap(m => Object.values(m).flatMap(r => r.checkpoints.filter(c => c.file).map(c => c.file))))];
const changed = [];
let same = 0;
for (const f of files) {
  const pa = join(A, f), pb = join(B, f);
  if (!existsSync(pa) || !existsSync(pb)) { changed.push({ f, missing: !existsSync(pa) ? 'golden' : 'other' }); continue; }
  const [x, y] = await Promise.all([readFile(pa), readFile(pb)]);
  if (x.equals(y)) same++; else changed.push({ f, x, y });
}

if (changed.some(c => c.x)) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const c of changed.filter(c => c.x)) {
    const r = await page.evaluate(async ([a, b]) => {
      const img = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
      const [ia, ib] = await Promise.all([img(a), img(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      const cv = new OffscreenCanvas(ia.width, ia.height), g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, ia.width, ia.height);
      g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, ia.width, ia.height);
      let n = 0, max = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
        if (d) { n++; max = Math.max(max, d); db.data[i] = 255; db.data[i + 1] = 0; db.data[i + 2] = 255; }
        else { const v = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 9; db.data[i] = db.data[i + 1] = db.data[i + 2] = v; }
      }
      g.putImageData(db, 0, 0);
      const blob = await cv.convertToBlob();
      const u8 = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      const png = btoa(bin);
      return { n, max, total: da.data.length / 4, png };
    }, ['data:image/png;base64,' + c.x.toString('base64'), 'data:image/png;base64,' + c.y.toString('base64')]);
    Object.assign(c, r);
    if (r.png) {
      const out = join(B, '_diff', c.f);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(r.png, 'base64'));
    }
  }
  await browser.close();
}

console.log(`screenshots: ${same} identical, ${changed.length} different (of ${files.length})`);
for (const c of changed) console.log('  ' + c.f + ': ' + (c.missing ? `missing in ${c.missing}` : c.size ? `size ${c.size}` :
  `${c.n} px changed (${(100 * c.n / c.total).toFixed(3)}%), max channel delta ${c.max}`));
console.log(`manifest: ${diffs.length ? diffs.length + (diffs.length > 200 ? '+' : '') + ' differences' : 'identical'}`);
for (const d of diffs.slice(0, 60)) console.log('  ' + d);
if (changed.some(c => c.png)) console.log(`diff images: ${join(B, '_diff')}`);
process.exit(changed.length || diffs.length ? 1 : 0);
