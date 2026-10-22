// Shared Playwright harness for tools/snapshots.mjs (golden screenshot suite) and tools/check.mjs (assertions).
//
// - INIT runs before any page script: seeded Math.random (re-seeded when the first WebGL context is created,
//   because three.js draws random numbers for every object's UUID), a resize log, and a hash of every value
//   the synth sends to an AudioParam.
// - three@0.160.0 requests to jsDelivr (only legacy/throttle-up-v11.html makes them) are served from
//   node_modules/three, so runs are offline and fixed.
// - Pages use ?manual: frames are driven by step() at a fixed 16 ms, the sim by FF at 50 ms.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const V11_URL = pathToFileURL(resolve(ROOT, 'legacy/throttle-up-v11.html')).href;
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
const THREE_DIR = resolve(ROOT, 'node_modules/three');

export const DESKTOP = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
export const PHONE = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

export const INIT = `(() => {
  const H = window.__h = { n: 0, gl: -1, an: 0, ah: 0x811c9dc5, rz: [] };
  addEventListener('resize', () => H.rz.push([Math.round(performance.now()), typeof R3done !== 'undefined' && R3done, innerWidth, innerHeight]));
  let a;
  const seed = s => { a = s; };
  seed(0x7417e);
  Math.random = () => {
    H.n++;
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if ((type === 'webgl2' || type === 'webgl') && H.gl < 0) { H.gl = H.n; H.n = 0; seed(0x3d5eed); }
    return gc.call(this, type, ...rest);
  };
  // Audio can't be screenshotted: hash every value the synth sends to an AudioParam (not the times, which are real time).
  const mix = v => { const s = String(v); for (let i = 0; i < s.length; i++) H.ah = Math.imul(H.ah ^ s.charCodeAt(i), 0x01000193) >>> 0; H.an++; };
  if (window.AudioParam) {
    for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime']) {
      const f = AudioParam.prototype[m];
      AudioParam.prototype[m] = function (v, ...r) { mix(v); return f.call(this, v, ...r); };
    }
    const d = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    Object.defineProperty(AudioParam.prototype, 'value', { ...d, set(v) { mix(v); d.set.call(this, v); } });
  }
})();`;

// Fast-forward helper from CLAUDE.md: advances the sim without rendering.
export const FF = s => { for (let t = 0; t < s; t += .05) { seqTick(.05); keys(.05); update(.05); } };

// Build the Vite app and serve it with `vite preview`. Fails (exits) if the chunk check fails.
export async function serveBuild() {
  const vite = await import('vite');
  await vite.build({ root: ROOT, logLevel: 'warn' });
  await import('./check-chunks.mjs');   // exits on failure
  const server = await vite.preview({ root: ROOT, logLevel: 'warn', preview: { port: 4173 } });
  return { url: server.resolvedUrls.local[0], close: () => server.close() };
}

export const launch = () => chromium.launch({
  headless: !process.env.HEADED,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    // Synchronous, single-path raster and compositing. Without these, the anti-aliased corners of the
    // semi-transparent buttons over the WebGL canvas vary by 1-2 levels between runs.
    '--disable-gpu-rasterization', '--disable-partial-raster', '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation', '--disable-checker-imaging'],
});

// Run `fn(browser, item)` over items with `jobs` parallel browsers (one browser per job: pages sharing a
// GPU process composite the semi-transparent buttons over the WebGL canvas slightly differently).
export async function pool(items, jobs, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    const browser = await launch();
    while (next < items.length) await fn(browser, items[next++]);
    await browser.close();
  }));
}

// A page for a scenario { q, m, r2d, manual, ctx, init }. `record.errors` collects page errors and console
// errors; `record.threeRequested` notes whether three was fetched.
export async function newPage(browser, sc, record) {
  const ctx = await browser.newContext(sc.ctx);
  await ctx.addInitScript(INIT);
  if (sc.init) await ctx.addInitScript(sc.init);
  await ctx.route(CDN + '**', async route => {
    const file = join(THREE_DIR, route.request().url().slice(CDN.length).split('?')[0]);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: await readFile(file), headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => record.errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error') record.errors.push(`console: ${msg.text()}`); });
  page.on('request', r => { if (/three/i.test(new URL(r.url()).pathname.split('/').pop() || '') || r.url().startsWith(CDN)) record.threeRequested = true; });
  return { ctx, page };
}

// Navigate to the scenario's URL and wait until the 3D loader has finished (3D ready, or fallen back to 2D).
export async function load(page, base, sc) {
  const qs = new URLSearchParams();
  if (sc.q != null) qs.set('q', sc.q);
  qs.set('m', sc.m);
  if (sc.r2d) qs.set('r', '2d');
  if (sc.fps) qs.set('fps', '');
  let url = `${base}?${qs}`;
  if (sc.manual !== false) url += '&manual';
  await page.goto(url);
  await page.waitForFunction('R3done', null, { timeout: 60_000 });
  if (sc.ctx.isMobile) {
    // Mobile emulation fires one resize at a variable time (34 ms to 2 s after load). After 3D has started it
    // makes the renderer rebuild its targets (24 random draws for UUIDs). Wait for it, then send one more, so
    // exactly one rebuild is pending either way.
    await page.waitForFunction(() => window.__h.rz.length > 0, null, { timeout: 10_000 });
    await page.evaluate(() => dispatchEvent(new Event('resize')));
  }
}
