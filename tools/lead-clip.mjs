// The launch's lead clip: today's lunar landing flown by a simple autopilot on this PC's real GPU, saved as the
// game's own 9:16 mission clip.   node tools/lead-clip.mjs [out.webm]
// (The autopilot is the one the checks use: fly west clear of Little West crater, stop the drift, come down slowly.
// A hand-flown try recorded with the card's CLIP button is the same kind of file.)
// PAGE_URL=https://kkbosu.github.io/throttle-up/ records from the live site.
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, serveBuild } from './harness.mjs';

const OUT = resolve(ROOT, process.argv[2] || 'snapshots/lead-clip.webm');
const server = process.env.PAGE_URL ? { url: process.env.PAGE_URL, close() {} } : await serveBuild();
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
// AS_LIVE=1: serve this build under the live site's address, so the clip's footer reads as it will once deployed
const LIVE = 'https://kkbosu.github.io/throttle-up/';
if (process.env.AS_LIVE) {
  const local = server.url;
  await ctx.route(LIVE + '**', async route => route.fulfill({ response: await ctx.request.get(local + route.request().url().slice(LIVE.length)) }));
  server.url = LIVE;
}
const page = await ctx.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(server.url + '?m=9&q=2&daily');
await page.waitForFunction(() => window.G3 && window.fontOK);
await page.click('#ov span');
await page.waitForFunction(() => MS.on === 1 && CL.rec, null, { timeout: 60000 });
await page.evaluate(() => {
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  window.__ap = setInterval(() => {
    if (MS.tr < 0) return;
    raw = lmRate(alt > 10 ? -8 : alt > 4 ? -4 : -2);
    applyRaw();
    side = cl((cl((-22 - lm.x) * 0.25, -3, 3) - lm.vx) * 0.8, -1, 1);
    fwd = cl(lm.vd * 0.8, -1, 1);
  }, 16);
});
await page.waitForFunction(() => CL.blob, null, { timeout: 180000 });
const r = await page.evaluate(async () => {
  clearInterval(window.__ap);
  const b = new Uint8Array(await CL.blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768));
  return { data: btoa(s), type: CL.blob.type, res: MS.res, day: MS.day, t: CL.t };
});
await writeFile(OUT, Buffer.from(r.data, 'base64'));
console.log(`${OUT}  ${r.type}  ${(r.data.length * 0.75 / 1e6).toFixed(1)} MB  ${r.t.toFixed(1)} s  daily #${r.day}`);
console.log(JSON.stringify(r.res));
await browser.close();
await server.close();
