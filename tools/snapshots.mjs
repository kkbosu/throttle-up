// Golden suite: drives the page through its test hooks and records screenshots plus a manifest
// (sim state, Math.random call counts, an audio-parameter trace, INFO html, chip list, errors).
// It proved the Vite split identical to legacy/throttle-up-v11.html; now it guards refactors: record a reference
// from a known-good build, change code, record again, compare.
//
//   node tools/snapshots.mjs                     -> builds the app, serves it, records snapshots/golden
//   node tools/snapshots.mjs snapshots/after     -> same, into another folder
//   node tools/compare.mjs snapshots/golden snapshots/after
//   node tools/snapshots.mjs --v11 snapshots/v11 -> records legacy/throttle-up-v11.html instead
//   PAGE_URL=http://localhost:5173/ node tools/snapshots.mjs snapshots/dev   (any running server)
//
// Options: --only <regex> (scenario ids; replaces just those in an existing run), --jobs <n> (parallel
// browsers, default 3). HEADED=1 shows the browser.
//
// Runs are byte-for-byte reproducible; how is described in tools/harness.mjs.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DESKTOP, FF, PHONE, ROOT, V11_URL, load, newPage, pool, serveBuild } from './harness.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i < 0 ? def : args.splice(i, 2)[1]; };
const ONLY = new RegExp(opt('--only', '.'));
const JOBS = +opt('--jobs', 3);
const V11 = args.includes('--v11') && !!args.splice(args.indexOf('--v11'), 1);
if (args.includes('--serve')) args.splice(args.indexOf('--serve'), 1);   // the default now; accepted for old commands
const OUT = resolve(ROOT, args[0] || 'snapshots/golden');
let PAGE = process.env.PAGE_URL || (V11 ? V11_URL : null);

// Default: build the Vite app and test it through `vite preview` (references are always recorded from a build).
let server = null;
if (!PAGE) {
  server = await serveBuild();
  PAGE = server.url;
  console.log(`serving the build at ${PAGE}`);
}
const WARMUP_S = 6;

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
  const views = await t.ev('!G3 ? [0, 1, 2] : M.space ? [0, 1, 2, 3] : [0, 1, 2, 4]');
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
  const { ctx, page } = await newPage(browser, sc, record);
  await mkdir(join(OUT, sc.id), { recursive: true });
  try {
    await load(page, PAGE, sc);
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
const results = {};
const t0 = Date.now();
await pool(todo, JOBS, async (browser, sc) => {
  const s0 = Date.now();
  const r = await runScenario(browser, sc);
  results[sc.id] = r;
  const shots = r.checkpoints.filter(c => c.file).length;
  console.log(`${r.failure ? 'FAIL' : 'ok  '} ${sc.id.padEnd(16)} ${String(shots).padStart(3)} shots  ${((Date.now() - s0) / 1000).toFixed(1)}s` +
    (r.failure ? `  ${r.failure}` : '') + (r.errors.length ? `  ${r.errors.length} error(s): ${r.errors[0]}` : ''));
});

// Keep scenario order stable in the manifest regardless of which job finished first.
const ordered = Object.fromEntries(scenarios.filter(s => results[s.id] || previous[s.id]).map(s => [s.id, results[s.id] || previous[s.id]]));
await writeFile(MANIFEST, JSON.stringify({ page: PAGE, scenarios: ordered }, null, 1) + '\n');
if (server) await server.close();
const failed = Object.values(results).filter(r => r.failure || r.errors.length).length;
const shots = Object.values(results).reduce((n, r) => n + r.checkpoints.filter(c => c.file).length, 0);
console.log(`\n${shots} screenshots, ${todo.length} scenarios, ${failed} with failures/errors -> ${OUT}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
process.exit(failed ? 1 : 0);
