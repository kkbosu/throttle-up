// Golden suite: drives the page through its test hooks and records screenshots plus a manifest
// (sim state, Math.random call counts, an audio-parameter trace, INFO html, chip list, errors).
// Used to prove the Vite split behaves exactly like throttle-up-v11.html:
//
//   node tools/snapshots.mjs                         -> snapshots/golden from throttle-up-v11.html
//   node tools/snapshots.mjs --serve snapshots/after -> builds the Vite app and tests it via `vite preview`
//   PAGE_URL=http://localhost:5173/ node tools/snapshots.mjs snapshots/dev   (any running server)
//   node tools/compare.mjs snapshots/golden snapshots/after
//
// Options: --only <regex> (scenario ids; replaces just those in an existing run), --jobs <n> (parallel
// browsers, default 3). HEADED=1 shows the browser.
//
// Determinism:
// - ?manual drives frames at a fixed 16 ms; the fast-forward helper (FF) steps the sim at 50 ms.
// - Math.random is a seeded mulberry32, re-seeded when the first WebGL context is created. three.js draws
//   random numbers for every object's UUID, including objects it creates at import, and a bundled
//   three creates a different number of those than the CDN file.
// - three@0.160.0 requests to jsDelivr are served from node_modules/three, so runs are offline and fixed.

import { chromium } from 'playwright';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i < 0 ? def : args.splice(i, 2)[1]; };
const ONLY = new RegExp(opt('--only', '.'));
const JOBS = +opt('--jobs', 3);
const SERVE = args.includes('--serve') && !!args.splice(args.indexOf('--serve'), 1);
const OUT = resolve(ROOT, args[0] || 'snapshots/golden');
let PAGE = process.env.PAGE_URL || pathToFileURL(resolve(ROOT, 'throttle-up-v11.html')).href;

// --serve: build the Vite app and test it through `vite preview` (parity is always checked on the build).
let server = null;
if (SERVE) {
  const vite = await import('vite');
  await vite.build({ root: ROOT, logLevel: 'warn' });
  await import('./check-chunks.mjs');   // exits on failure
  server = await vite.preview({ root: ROOT, logLevel: 'warn', preview: { port: 4173 } });
  PAGE = server.resolvedUrls.local[0];
  console.log(`serving the build at ${PAGE}`);
}
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
const THREE_DIR = resolve(ROOT, 'node_modules/three');

const DESKTOP = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const WARMUP_S = 6;

// ---------- page-side helpers ----------

const INIT = `(() => {
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
const FF = s => { for (let t = 0; t < s; t += .05) { seqTick(.05); keys(.05); update(.05); } };

// Everything a checkpoint records about the page. Exact numbers, no rounding: the split must match bit for bit.
const STATE = () => ({
  ph, st, N, A, E, F, L, raw, raw2, fu, ign, kick, hg, sT, stl, lit, simT, view, exposed, scene, lens, Q, mi,
  btn: M.btn, gv: M.gv(), lp: M.lp().map(l => [l[0], !!l[1]]),
  alt, vz, nz, prp, beta, sicE: [...sicE],
  orb: { ...orb, tr: orb.tr.length }, sc: { ...sc, thr: [...sc.thr] },
  SQ: { on: SQ.on, i: SQ.i, cap: SQ.cap },
  hint: document.getElementById('hint').textContent,
  ctl: [...document.querySelectorAll('#ctl [data-k]')].map(b => b.textContent),
  G3: !!G3, rnd: window.__h.n, audio: [window.__h.an, window.__h.ah],
});

// ---------- scenario helpers ----------

function makeT(page, sc, record) {
  const dir = join(OUT, sc.id);
  let k = 0;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const t = {
    page, ev,
    ff: s => ev(FF, s),
    frames: n => ev(n => step(n), n),
    act: a => ev(a => act(a), a),
    async check(name, extra = {}) {
      record.checkpoints.push({ name, ...extra, state: await ev(STATE) });
    },
    // Set view/cutaway (if given), snap the camera to its preset, render a few frames, screenshot.
    async shot(name, { view, exposed, frames = 3 } = {}) {
      await ev(([v, e]) => { if (v != null) view = v; if (e != null) exposed = e; lab(); step(1); if (G3) G3.snap(); }, [view, exposed]);
      await t.frames(frames);
      const file = `${String(++k).padStart(2, '0')}-${name}.png`;
      await page.screenshot({ path: join(dir, file), animations: 'disabled', timeout: 120_000 });
      await t.check(name, { file: `${sc.id}/${file}` });
    },
    async start() {
      await page.click('#ov span');
      await page.waitForSelector('#ov', { state: 'hidden' });   // 0.6 s fade-out on a real-time timer
      await t.ff(WARMUP_S);
      if ((await ev('ph')) !== 2) throw new Error(`engine not running after ${WARMUP_S}s warm-up`);
    },
    chips: () => ev(() => [...document.querySelectorAll('#mch button')].filter(b => b.style.display !== 'none').map(b => b.textContent)),
    async info(name = 'info') {
      await t.act('inf');
      await t.frames(1);
      const html = await ev(() => document.getElementById('infc').innerHTML);
      const file = `${String(++k).padStart(2, '0')}-${name}.png`;
      await page.screenshot({ path: join(dir, file), animations: 'disabled', timeout: 120_000 });
      await t.check(name, { file: `${sc.id}/${file}`, html });
      await ev(() => closeInfo());
    },
  };
  return t;
}

const MACHINES = [0, 1, 2, 3, 4, 5, 6, 7];
const POWER = 'raw=1;applyRaw()';

async function viewsAndCutaway(t) {
  const views = (await t.ev('M.space&&!!G3')) ? [0, 1, 2, 3] : [0, 1, 2];
  for (const e of [0, 1]) for (const v of views) {
    await t.shot(`v${v}${e ? '-cut' : ''}`, { view: v, exposed: e });
  }
  await t.shot('reset', { view: 0, exposed: 0, frames: 1 });
}

const scenarios = [];

// 3D, desktop: cover, every view with cutaway off/on, every lens, every scene, at power, INFO.
for (const m of MACHINES) scenarios.push({
  id: `3d-m${m}`, q: 2, m, ctx: DESKTOP,
  async run(t) {
    await t.check('chips', { chips: await t.chips() });
    await t.shot('cover', { frames: 2 });
    await t.start();
    await t.check('running');
    await viewsAndCutaway(t);
    for (let i = 0; i < 3; i++) { await t.act('lens'); if ((await t.ev('lens')) === 0) break; await t.shot(`lens${await t.ev('lens')}`); }
    for (let i = 1; i <= 2; i++) { await t.act('scn'); await t.shot(`scene${i}`); }
    await t.act('scn');
    await t.ev(POWER); await t.ff(5);
    await t.shot('power-v0', { view: 0 });
    await t.shot('power-v1-cut', { view: 1, exposed: 1 });
    await t.shot('power-v2', { view: 2, exposed: 0 });
    await t.info();
  },
});

// SEQUENCE for every machine: a screenshot and the full state at each step change, until it finishes.
for (const m of MACHINES) scenarios.push({
  id: `seq-m${m}`, q: 2, m, ctx: DESKTOP,
  async run(t) {
    await t.start();
    await t.act('seq');
    await t.check('seq-start');
    let total = 0;
    for (;;) {
      // fast-forward until the step index changes or the sequence ends (at most 10 s per call)
      const r = await t.ev(() => {
        const i0 = SQ.i; let s = 0;
        while (SQ.on && SQ.i === i0 && s < 10) { seqTick(.05); keys(.05); update(.05); s += .05; }
        return { on: SQ.on, i: SQ.i, s };
      });
      total += r.s;
      if (!r.on) break;
      if (total > 240) throw new Error('sequence did not finish within 240 s');
      await t.shot(`step${r.i}`);
    }
    await t.shot('end');
  },
});

// 2D renderer (machines 0-2 have one): views, cutaway, scenes, power, INFO, chip list.
for (const m of [0, 1, 2]) scenarios.push({
  id: `2d-m${m}`, q: 2, m, r2d: true, ctx: DESKTOP,
  async run(t) {
    await t.check('chips', { chips: await t.chips() });
    await t.shot('cover', { frames: 2 });
    await t.start();
    await viewsAndCutaway(t);
    for (let i = 1; i <= 2; i++) { await t.act('scn'); await t.shot(`scene${i}`); }
    await t.act('scn');
    await t.ev(POWER); await t.ff(5);
    await t.shot('power-v0', { view: 0 });
    await t.shot('power-v2', { view: 2 });
    await t.info();
  },
});

// ?m=3 with ?r=2d: Hall needs 3D, so the page must fall back to machine 0.
scenarios.push({
  id: '2d-fallback-m3', q: 2, m: 3, r2d: true, ctx: DESKTOP,
  async run(t) {
    await t.check('chips', { chips: await t.chips() });
    await t.shot('cover', { frames: 2 });
  },
});

// Lower quality settings change flow tracers, haze, bloom and particle rates.
for (const q of [0, 1]) for (const m of [0, 4, 7]) scenarios.push({
  id: `q${q}-m${m}`, q, m, ctx: DESKTOP,
  async run(t) {
    await t.start();
    await t.ev(POWER); await t.ff(4);
    await t.shot('power-v0', { view: 0 });
    await t.shot('power-v1-cut', { view: 1, exposed: 1 });
  },
});

// Portrait phone at DPR 2 (jets swing round to a rear three-quarter view; insets must fit).
for (const m of MACHINES) scenarios.push({
  id: `phone-m${m}`, q: 2, m, ctx: PHONE,
  async run(t) {
    await t.shot('cover', { frames: 2 });
    await t.start();
    await t.shot('v0', { view: 0 });
    await t.shot('v1-cut', { view: 1, exposed: 1 });
    await t.ev(POWER); await t.ff(4);
    await t.shot('power-v0', { view: 0, exposed: 0 });
  },
});
scenarios.push({
  id: 'phone-2d-m0', q: 2, m: 0, r2d: true, ctx: PHONE,
  async run(t) {
    await t.start();
    await t.shot('v0', { view: 0 });
    await t.ev(POWER); await t.ff(4);
    await t.shot('power-v0', { view: 0 });
  },
});

// REC produces a clip (the encoded bytes vary, so only type and non-empty are recorded).
scenarios.push({
  id: 'rec-m0', q: 2, m: 0, ctx: DESKTOP,
  async run(t, record) {
    await t.start();
    await t.ev(POWER); await t.ff(3);
    await t.ev(() => startRec());
    await t.frames(20);
    await t.ev(() => stopRec());
    await t.page.waitForFunction(() => getComputedStyle(document.getElementById('clip')).display !== 'none', null, { timeout: 30_000 });
    // no full state here: the REC button shows real elapsed time
    record.checkpoints.push({ name: 'clip', clip: await t.ev(() => ({ type: clipFile.type, nonEmpty: clipFile.size > 0 })) });
  },
});

// WebGL context loss: the page must drop to 2D (and, for a 3D-only machine, back to machine 0).
scenarios.push({
  id: 'ctxloss-m4', q: 2, m: 4, ctx: DESKTOP,
  async run(t) {
    await t.start();
    await t.ev(() => G3.R.getContext().getExtension('WEBGL_lose_context').loseContext());
    await t.page.waitForFunction(() => !G3, null, { timeout: 10_000 });
    await t.check('lost', { chips: await t.chips() });
    await t.shot('after', { frames: 3 });
  },
});

// Real-time run without ?manual or ?q: timing varies, so only errors and "frames ran" are recorded.
scenarios.push({
  id: 'live-m0', m: 0, manual: false, ctx: DESKTOP,
  async run(t, record) {
    await t.page.click('#ov span');
    await t.page.waitForTimeout(2500);
    record.checkpoints.push({ name: 'live', ok: await t.ev(() => ph >= 1 && simT > 0 && !!G3) });
  },
});

// ---------- runner ----------

async function runScenario(browser, sc) {
  const record = { id: sc.id, checkpoints: [], errors: [], threeRequested: false };
  const ctx = await browser.newContext(sc.ctx);
  await ctx.addInitScript(INIT);
  await ctx.route(CDN + '**', async route => {
    const file = join(THREE_DIR, route.request().url().slice(CDN.length).split('?')[0]);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, body: await readFile(file), headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => record.errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error') record.errors.push(`console: ${msg.text()}`); });
  page.on('request', r => { if (/three/i.test(new URL(r.url()).pathname.split('/').pop() || '') || r.url().startsWith(CDN)) record.threeRequested = true; });

  const qs = new URLSearchParams();
  if (sc.q != null) qs.set('q', sc.q);
  qs.set('m', sc.m);
  if (sc.r2d) qs.set('r', '2d');
  let url = `${PAGE}?${qs}`;
  if (sc.manual !== false) url += '&manual';
  await mkdir(join(OUT, sc.id), { recursive: true });
  try {
    await page.goto(url);
    await page.waitForFunction('R3done', null, { timeout: 60_000 });
    if (sc.ctx.isMobile) {
      // Mobile emulation fires one resize at a variable time (34 ms to 2 s after load). After 3D has started it
      // makes the renderer rebuild its targets (24 random draws for UUIDs). Wait for it, then send one more, so
      // exactly one rebuild is pending either way.
      await page.waitForFunction(() => window.__h.rz.length > 0, null, { timeout: 10_000 });
      await page.evaluate(() => dispatchEvent(new Event('resize')));
    }
    await sc.run(makeT(page, sc, record), record);
  } catch (e) {
    record.failure = String(e.message || e).split('\n')[0];
  }
  record.env = await page.evaluate(() => ({
    preWebGLRandoms: window.__h.gl, resizes: window.__h.rz,
    gpu: (() => { try { const gl = G3 && G3.R.getContext(), x = gl && gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : null; } catch (_) { return null; } })(),
  })).catch(() => null);
  await ctx.close();
  return record;
}

const todo = scenarios.filter(s => ONLY.test(s.id));
// A full run starts from an empty folder; --only replaces just the selected scenarios in an existing run.
const MANIFEST = join(OUT, 'manifest.json');
const previous = ONLY.source !== '.' && existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')).scenarios : {};
if (ONLY.source === '.') await rm(OUT, { recursive: true, force: true });
else for (const s of todo) await rm(join(OUT, s.id), { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const launch = () => chromium.launch({
  headless: !process.env.HEADED,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    // Synchronous, single-path raster and compositing. Without these, the anti-aliased corners of the
    // semi-transparent buttons over the WebGL canvas vary by 1-2 levels between runs.
    '--disable-gpu-rasterization', '--disable-partial-raster', '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation', '--disable-checker-imaging'],
});

const results = {};
const t0 = Date.now();
let next = 0;
// One browser per job: pages sharing a GPU process composite the semi-transparent buttons over the
// WebGL canvas slightly differently from run to run.
await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, async () => {
  const browser = await launch();
  while (next < todo.length) {
    const sc = todo[next++], s0 = Date.now();
    const r = await runScenario(browser, sc);
    results[sc.id] = r;
    const shots = r.checkpoints.filter(c => c.file).length;
    console.log(`${r.failure ? 'FAIL' : 'ok  '} ${sc.id.padEnd(16)} ${String(shots).padStart(3)} shots  ${((Date.now() - s0) / 1000).toFixed(1)}s` +
      (r.failure ? `  ${r.failure}` : '') + (r.errors.length ? `  ${r.errors.length} error(s): ${r.errors[0]}` : ''));
  }
  await browser.close();
}));

// Keep scenario order stable in the manifest regardless of which job finished first.
const ordered = Object.fromEntries(scenarios.filter(s => results[s.id] || previous[s.id]).map(s => [s.id, results[s.id] || previous[s.id]]));
await writeFile(MANIFEST, JSON.stringify({ page: PAGE, scenarios: ordered }, null, 1) + '\n');
if (server) await server.close();
const failed = Object.values(results).filter(r => r.failure || r.errors.length).length;
const shots = Object.values(results).reduce((n, r) => n + r.checkpoints.filter(c => c.file).length, 0);
console.log(`\n${shots} screenshots, ${todo.length} scenarios, ${failed} with failures/errors -> ${OUT}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
process.exit(failed ? 1 : 0);
