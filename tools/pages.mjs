// A page per machine, written into dist/ after the build (npm run build runs this).
//
// A static host can't vary a link's preview by ?m=, so every link used to show the same title and the same picture.
// Each machine in tools/pages.json gets dist/<slug>/index.html, and each mission dist/<slug>/daily/index.html: the
// built index.html with its own <title>, description and preview image, asset paths pointing back up to the root,
// and <meta name="tu-..."> tags the app reads (src/core/params.js): tu-m (the machine to open), tu-daily (start
// the daily challenge), tu-pages (the way back to the site's root, so share links can use these addresses).
// The preview images are public/og/<slug>.jpg, rendered by tools/site-images.mjs.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kkbosu.github.io/throttle-up/';
const PAGES = JSON.parse(await readFile(resolve(ROOT, 'tools/pages.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const base = await readFile(resolve(ROOT, 'dist/index.html'), 'utf8');
/* replace exactly one thing, or stop: a silent miss would ship a page with the wrong preview */
function sub(html, re, to, what) {
  if (!re.test(html)) throw new Error('pages: ' + what + ' not found in dist/index.html');
  return html.replace(re, to);
}
function page({ up, path, title, desc, image, alt, metas }) {
  let h = base;
  h = sub(h, /<title>[^<]*<\/title>/, `<title>${esc(title)} · Throttle Up</title>`, 'title');
  h = sub(h, /(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`, 'description');
  h = sub(h, /(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`, 'og:title');
  h = sub(h, /(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`, 'og:description');
  h = sub(h, /(<meta property="og:url" content=")[^"]*/, `$1${SITE}${path}`, 'og:url');
  h = sub(h, /(<meta property="og:image" content=")[^"]*/, `$1${SITE}${image}`, 'og:image');
  h = sub(h, /(<meta property="og:image:alt" content=")[^"]*/, `$1${esc(alt)}`, 'og:image:alt');
  /* the build's own paths are relative to the root */
  h = h.replace(/((?:href|src)=")\.\//g, `$1${up}`);
  return sub(h, /<meta name="theme-color"/, metas.map(([n, v]) => `<meta name="tu-${n}" content="${v}">\n`).join('') + '<meta name="theme-color"', 'theme-color');
}
async function put(path, html) {
  const f = resolve(ROOT, 'dist', path, 'index.html');
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, html);
}

let n = 0;
for (const p of PAGES) {
  const src = await readFile(resolve(ROOT, `src/machines/${p.slug}/machine.js`), 'utf8');
  if (!src.includes(`slug: '${p.slug}'`)) throw new Error(`pages: src/machines/${p.slug}/machine.js has no slug '${p.slug}'`);
  /* a machine whose picture hasn't been rendered yet keeps the site's own */
  const image = existsSync(resolve(ROOT, `public/og/${p.slug}.jpg`)) ? `og/${p.slug}.jpg` : 'og.png';
  if (image === 'og.png') console.warn(`pages: no public/og/${p.slug}.jpg (run node tools/site-images.mjs); using og.png`);
  const alt = image === 'og.png' ? 'Throttle Up' : p.alt;
  await put(p.slug, page({ up: '../', path: p.slug + '/', title: p.title, desc: p.desc, image, alt, metas: [['m', p.m], ['pages', '../']] }));
  n++;
  if (p.daily) {
    await put(p.slug + '/daily', page({ up: '../../', path: p.slug + '/daily/', title: p.daily.title, desc: p.daily.desc, image, alt, metas: [['m', p.m], ['daily', '1'], ['pages', '../../']] }));
    n++;
  }
}
/* the root page learns that the pages exist */
await writeFile(resolve(ROOT, 'dist/index.html'), sub(base, /<meta name="theme-color"/, '<meta name="tu-pages" content="./">\n<meta name="theme-color"', 'theme-color'));
console.log(`pages: ${n} written (${PAGES.map((p) => p.slug).join(', ')})`);
