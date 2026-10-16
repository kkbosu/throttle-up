// Images for sharing and bookmarks, made from the game itself:
// - public/og.png: social preview (Open Graph, 1200x630). Builds the app, sets up a shot with the HUD hidden,
//   adds a title band. Regenerate when the visuals change.
// - public/apple-touch-icon.png (180x180), rendered from public/favicon.svg.
//
//   node tools/site-images.mjs                    -> both (the preview uses the shot chosen in SHOT)
//   node tools/site-images.mjs --try <dir>        -> every preview candidate in CANDIDATES, to compare
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FF, ROOT, launch, load, newPage, serveBuild } from './harness.mjs';

const CANDIDATES = {
  'sr71-dusk-side': { m: 1, view: 0, scenes: 0, lever: 1, secs: 20 },
  'sr71-night-close': { m: 1, view: 1, scenes: 2, lever: 1, secs: 20 },
  'ftype-night-close': { m: 0, view: 1, scenes: 2, lever: 1, secs: 12 },
  'saturn-night-side': { m: 4, view: 0, scenes: 2, lever: 1, secs: 14 },
  'shuttle-day-side': { m: 2, view: 0, scenes: 1, lever: 1, secs: 10 },
};
const SHOT = 'ftype-night-close';
const TAGLINE = 'Throttle up real engines. Watch, hear and read what happens.';

const args = process.argv.slice(2);
const tryDir = args.includes('--try') ? args[args.indexOf('--try') + 1] : null;
const shots = tryDir ? Object.entries(CANDIDATES) : [[SHOT, CANDIDATES[SHOT]]];
const ctx = { viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 };

const srv = await serveBuild();
const browser = await launch();
for (const [name, s] of shots) {
  const rec = { errors: [] };
  const { page, ctx: c } = await newPage(browser, { ctx }, rec);
  await load(page, srv.url, { q: 2, m: s.m, ctx });
  await page.click('#ov span');
  await page.waitForSelector('#ov', { state: 'hidden' });
  await page.evaluate(FF, 6);
  await page.evaluate((l) => { raw = l; applyRaw(); }, s.lever);
  await page.evaluate(FF, s.secs);
  await page.evaluate((s) => { for (let i = 0; i < s.scenes; i++) act('scn'); view = s.view; lab(); step(1); G3.snap(); step(6); }, s);
  // hide the HUD, levers and buttons; add the title band
  await page.addStyleTag({ content: '#c,#tq,#ctl,#hud,#ov,#inf,#clip{display:none!important}' });
  await page.evaluate((tag) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:22px 34px 26px;background:linear-gradient(transparent,rgba(5,6,10,.82) 45%);font-family:ui-monospace,Menlo,Consolas,monospace;color:#e8ecf2';
    d.innerHTML = `<div style="font-size:44px;letter-spacing:.32em;font-weight:600">THROTTLE UP</div><div style="font-size:19px;letter-spacing:.06em;color:#b8c0cc;margin-top:6px">${tag}</div>`;
    document.body.appendChild(d);
  }, TAGLINE);
  const out = tryDir ? resolve(tryDir, `${name}.png`) : resolve(ROOT, 'public/og.png');
  await mkdir(resolve(out, '..'), { recursive: true });
  await page.screenshot({ path: out });
  console.log(`${name} -> ${out}${rec.errors.length ? `  (${rec.errors.length} page errors)` : ''}`);
  await c.close();
}
if (!tryDir) {
  // touch icon from the favicon (the SVG scales cleanly; iOS wants a PNG)
  const { page, ctx: c } = await newPage(browser, { ctx: { viewport: { width: 180, height: 180 } } }, { errors: [] });
  await page.setContent(`<body style="margin:0;background:#0b0e14"><img src="${srv.url}favicon.svg" style="width:180px;height:180px;display:block"></body>`);
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: resolve(ROOT, 'public/apple-touch-icon.png') });
  console.log('favicon.svg -> public/apple-touch-icon.png');
  await c.close();
}
await browser.close();
await srv.close();
