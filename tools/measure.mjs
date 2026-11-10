// Real-GPU measurements and screenshots (the golden suite and the checks run on SwiftShader, which says nothing
// about GPU cost and hides shader NaNs).
//
//   node tools/measure.mjs [--label name] [--only regex] [--frames n] [--phone-only|--desk-only]
//       frame cost per machine, quality level, view and viewport -> snapshots/perf/<label>.json and .md
//   node tools/measure.mjs --passes [--only regex] [--label name]
//       GPU time per render pass (one timer query per framebuffer switch), full power and idle
//   node tools/measure.mjs --shots <dir> [--only regex]
//       screenshots of every machine in every view and scene, at Q2 and Q0, plus contact sheets
//
// PAGE_URL=http://localhost:4173/ skips the build and uses a running server. HEADED=1 shows the window.
//
// How a frame is measured: the page runs in ?manual mode and this script drives it with step(1, 16), so every run
// renders the same frames. Per frame it records
//   gpu   GPU time of the frame's draw calls (EXT_disjoint_timer_query_webgl2), when Chromium exposes it
//   sync  wall time of the frame including a 1-pixel readback, which waits for the GPU to finish (CPU + GPU)
//   js    the game's own JavaScript time (state.jsT)
//   tris, calls  what three.js sent (renderer.info over the whole frame: shadow, main, plume and post passes)
// and reports medians. The GPU here is this PC's, not a phone's: compare runs with each other, not with a phone.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FF, ROOT, serveBuild } from './harness.mjs';

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf('--' + name);
  return i < 0 ? dflt : process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true;
};
const ONLY = arg('only') ? new RegExp(arg('only'), 'i') : null;
const LABEL = arg('label', 'run');
const FRAMES = +arg('frames', 120);
const SHOTS = arg('shots');
const PASSES = !!arg('passes');

const DESK = { name: 'desktop 1280×720', key: 'desk', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
// the reference phone's screen (Mali-G52 Android): 360×678 CSS px at DPR 3
const PHONE = { name: 'phone 360×678 @3', key: 'phone', viewport: { width: 360, height: 678 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SHOT_PHONE = { key: 'phone', viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LEVELS = [['Q2', 2, false], ['Q1', 1, false], ['Q0', 0, false], ['Q0 0.7', 0, true]];

// Timer queries, installed before the page's scripts. P.on = one query per framebuffer switch (--passes);
// otherwise the script brackets a whole frame with P.begin() / P.end().
const INIT = `(() => {
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = gc.call(this, type, ...rest);
    if (type === 'webgl2' && gl && !gl.__perf) { gl.__perf = 1; patch(gl); }
    return gl;
  };
  function patch(gl) {
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const P = window.__perf = { ext: !!ext, on: false, segs: [], cur: null, vp: '', fb: null, d: 0, gl, x: ext };
    for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const f = gl[m].bind(gl);
      gl[m] = (...a) => { P.d++; f(...a); };
    }
    const vp = gl.viewport.bind(gl);
    gl.viewport = (x, y, w, h) => { P.vp = w + 'x' + h; vp(x, y, w, h); };
    if (!ext) return;
    P.end = () => {
      if (!P.cur) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      P.segs.push({ q: P.cur, vp: P.vp, screen: P.fb === null, draws: P.d });
      P.cur = null;
    };
    P.begin = () => { P.cur = gl.createQuery(); P.d = 0; gl.beginQuery(ext.TIME_ELAPSED_EXT, P.cur); };
    const bf = gl.bindFramebuffer.bind(gl);
    gl.bindFramebuffer = (t, f) => {
      if (P.on && P.cur && f !== P.fb) { P.end(); P.fb = f; P.begin(); } else P.fb = f;
      bf(t, f);
    };
  }
})();`;

// What holds each machine in a steady, representative state at full power (run before every frame).
// Hover machines are pinned at a height where their dust shows; the jets run with FAULTS off (no stall).
const PIN = {
  0: 'faults = 0; raw = 1; applyRaw();',
  1: 'faults = 0; raw = 1; applyRaw();',
  5: 'raw = 1; raw2 = 1; applyRaw(); alt = 3; vz = 0;',
  7: 'alt = 20; vz = 0; raw = skyHov(); applyRaw();',
};
const pin = (m, idle) => (idle ? 'raw = 0; applyRaw();' : PIN[m] || 'raw = 1; applyRaw();');

async function launch() {
  const browser = await chromium.launch({
    headless: !process.env.HEADED,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync',
      '--disable-frame-rate-limit', '--autoplay-policy=no-user-gesture-required'],
  });
  return browser;
}

async function open(browser, base, ctxOpts, m, q = 2) {
  const { name: _n, key: _k, ...opts } = ctxOpts;
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`${base}?q=${q}&m=${m}&manual`);
  await page.waitForFunction('R3done && fontOK', null, { timeout: 60_000 });
  if (opts.isMobile) {
    await page.waitForTimeout(2500);   // mobile emulation's late resize
    await page.evaluate(() => dispatchEvent(new Event('resize')));
  }
  const gpu = await page.evaluate(() => {
    if (!G3) return null;
    const gl = G3.R.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info');
    return String(x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
  if (!gpu) throw new Error('3D did not start');
  if (/swiftshader|llvmpipe|basic render/i.test(gpu)) throw new Error('not a real GPU: ' + gpu);
  return { ctx, page, gpu, errors };
}

// Start the engine, bring the machine to its pinned state and let particles fill up.
async function run(page, m, idle = false, warm = 400) {
  await page.evaluate(() => { step(2, 16); document.querySelector('#ov span').click(); });
  for (let i = 0; i < 30 && !(await page.evaluate('ph == 2')); i++) await page.evaluate(FF, 1);
  await page.evaluate(([p, ff, warm]) => {
    const f = new Function(p);
    window.__pin = f;
    for (let t = 0; t < 12; t += .05) { f(); new Function('s', `(${ff})(s)`)(.05); }
    for (let i = 0; i < warm; i++) { f(); step(1, 16); }
  }, [pin(m, idle), FF.toString(), warm]);
}

const median = a => { const s = a.filter(v => v === v).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const p95 = a => { const s = a.filter(v => v === v).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * .95)] : NaN; };

// Measure `frames` frames in the page's current state. Returns per-frame arrays (and per-pass segments).
const measureInPage = async ([frames, passes]) => {
  const P = window.__perf, gl = P.gl, info = G3.R.info, px = new Uint8Array(4);
  info.autoReset = false;
  const out = { gpu: [], sync: [], js: [], tris: 0, calls: 0, size: '', segs: null };
  const pend = [];
  const tick = () => new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 60; i++) { __pin(); step(1, 16); }   // settle after a quality or view change
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  out.size = gl.drawingBufferWidth + '×' + gl.drawingBufferHeight;
  for (let i = 0; i < frames; i++) {
    __pin();
    info.reset();
    P.segs = [];
    P.on = passes;
    const t0 = performance.now();
    if (P.ext) P.begin();
    step(1, 16);
    if (P.ext) P.end();
    P.on = false;
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.sync.push(performance.now() - t0);
    out.js.push(jsT);
    out.tris = info.render.triangles;
    out.calls = info.render.calls;
    pend.push(P.segs);
    if (i % 8 == 7) await tick();
  }
  if (P.ext) {
    for (let n = 0; n < 200; n++) {
      await tick();
      const last = pend[pend.length - 1];
      if (gl.getQueryParameter(last[last.length - 1].q, gl.QUERY_RESULT_AVAILABLE)) break;
    }
    const disjoint = gl.getParameter(P.x.GPU_DISJOINT_EXT);
    const ms = s => (gl.getQueryParameter(s.q, gl.QUERY_RESULT_AVAILABLE) ? gl.getQueryParameter(s.q, gl.QUERY_RESULT) / 1e6 : NaN);
    for (const segs of pend) out.gpu.push(disjoint ? NaN : segs.reduce((a, s) => a + ms(s), 0));
    if (passes) {
      const n = pend[0].length;
      if (pend.every(s => s.length === n))
        out.segs = pend[0].map((s, i) => ({ vp: s.vp, screen: s.screen, draws: s.draws, ms: pend.map(f => ms(f[i])) }));
      else out.segs = 'pass count varies between frames: ' + [...new Set(pend.map(s => s.length))].join(', ');
    }
    for (const segs of pend) for (const s of segs) gl.deleteQuery(s.q);
  }
  return out;
};

const setLevel = (page, q, low) => page.evaluate(([q, low]) => { Q = q; lowRes = low; }, [q, low]);
const setView = (page, v) => page.evaluate(v => { view = v; lab(); G3.snap(); }, v);
const machines = async page => (await page.evaluate(() => MC.map((m, i) => ({ i, btn: m.btn, space: !!m.space }))))
  .filter(m => !ONLY || ONLY.test(m.btn));
const fx = (v, d = 2) => (v === v ? v.toFixed(d) : 'n/a');

async function perf(browser, base) {
  const rows = [];
  let gpuName = '', timer = false;
  const vps = arg('phone-only') ? [PHONE] : arg('desk-only') ? [DESK] : [DESK, PHONE];
  for (const vp of vps) {
    const probe = await open(browser, base, vp, 0);
    const list = await machines(probe.page);
    await probe.ctx.close();
    for (const m of list) {
      const { ctx, page, gpu, errors } = await open(browser, base, vp, m.i);
      gpuName = gpu;
      await run(page, m.i);
      timer = await page.evaluate('__perf.ext');
      for (const [lname, q, low] of LEVELS) {
        await setLevel(page, q, low);
        for (const v of [0, m.space ? 3 : 4]) {
          await setView(page, v);
          const r = await page.evaluate(measureInPage, [FRAMES, false]);
          const row = { vp: vp.key, m: m.i, btn: m.btn, level: lname, view: ['SIDE', '', '', 'EARTH', 'DRONE'][v], size: r.size,
            gpu: median(r.gpu), sync: median(r.sync), syncP95: p95(r.sync), js: median(r.js), tris: r.tris, calls: r.calls };
          rows.push(row);
          console.log(`${vp.key.padEnd(5)} ${m.btn.padEnd(10)} ${lname.padEnd(6)} ${row.view.padEnd(5)} ${r.size.padEnd(9)} gpu ${fx(row.gpu)} ms  sync ${fx(row.sync)}  js ${fx(row.js)}  ${row.tris} tris  ${row.calls} calls`);
        }
      }
      if (errors.length) console.log('  page errors:', errors);
      await ctx.close();
    }
  }
  const dir = resolve(ROOT, 'snapshots/perf');
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, LABEL + '.json'), JSON.stringify({ gpu: gpuName, timer, frames: FRAMES, date: new Date().toISOString(), rows }, null, 1));
  let md = `GPU: ${gpuName}. Timer queries: ${timer ? 'yes' : 'no'}. Medians over ${FRAMES} frames at full power; ms.\n`;
  for (const vp of vps) {
    md += `\n### ${vp.name}\n\n| Machine | Level | Size | View | GPU | CPU+GPU | JS | Triangles | Calls |\n|---|---|---|---|---|---|---|---|---|\n`;
    for (const r of rows.filter(r => r.vp === vp.key))
      md += `| ${r.btn} | ${r.level} | ${r.size} | ${r.view} | ${fx(r.gpu)} | ${fx(r.sync)} | ${fx(r.js)} | ${r.tris} | ${r.calls} |\n`;
  }
  await writeFile(resolve(dir, LABEL + '.md'), md);
  console.log(`\nwrote snapshots/perf/${LABEL}.json and .md  (${gpuName})`);
}

async function passes(browser, base) {
  const vp = arg('desk-only') ? DESK : PHONE;
  const probe = await open(browser, base, vp, 0);
  const list = await machines(probe.page);
  await probe.ctx.close();
  const out = [];
  for (const m of list) for (const idle of [false, true]) {
    const { ctx, page, gpu } = await open(browser, base, vp, m.i);
    await run(page, m.i, idle);
    for (const [lname, q, low] of LEVELS) {
      await setLevel(page, q, low);
      await setView(page, 0);
      const r = await page.evaluate(measureInPage, [FRAMES, true]);
      console.log(`\n${m.btn} ${idle ? 'idle' : 'full power'} ${lname} ${r.size} (${gpu}): GPU ${fx(median(r.gpu))} ms, ${r.calls} calls`);
      if (typeof r.segs === 'string' || !r.segs) console.log('  ' + r.segs);
      else for (const [i, s] of r.segs.entries()) {
        const t = median(s.ms);
        if (t > 0.02 || s.draws > 4) console.log(`  ${String(i).padStart(2)} ${(s.screen ? 'screen ' : '') + s.vp}`.padEnd(22) + `${String(s.draws).padStart(4)} draws  ${fx(t, 3)} ms`);
      }
      out.push({ btn: m.btn, idle, level: lname, size: r.size, gpu: median(r.gpu), calls: r.calls,
        segs: Array.isArray(r.segs) ? r.segs.map(s => ({ vp: s.vp, screen: s.screen, draws: s.draws, ms: median(s.ms) })) : r.segs });
    }
    await ctx.close();
  }
  const dir = resolve(ROOT, 'snapshots/perf');
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, LABEL + '-passes.json'), JSON.stringify(out, null, 1));
}

// Screenshots: HUD hidden, every view × scene at full power, Q2 and Q0; cutaway and lenses; a phone pair.
async function shots(browser, base, dirArg) {
  const dir = resolve(ROOT, dirArg);
  await mkdir(dir, { recursive: true });
  const HIDE = '#c,#tq,#ctl,#hud,#ov,#inf{display:none!important}';
  const probe = await open(browser, base, DESK, 0);
  const list = await machines(probe.page);
  await probe.ctx.close();
  const index = [];
  for (const m of list) {
    const slug = m.btn.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const views = m.space ? [0, 1, 2, 3] : [0, 1, 2, 4];
    const { ctx, page, gpu, errors } = await open(browser, base, DESK, m.i);
    await page.addStyleTag({ content: HIDE });
    await run(page, m.i, false, 500);
    const snap = async (file, settle = 6) => {
      await page.evaluate(n => { for (let i = 0; i < n; i++) { __pin(); step(1, 16); } }, settle);
      await page.screenshot({ path: resolve(dir, file) });
    };
    for (const [qn, q] of [['q2', 2], ['q0', 0]]) {
      await setLevel(page, q, false);
      const grid = [];
      for (let s = 0; s < 3; s++) {
        await page.evaluate(s => { scene = s; lab(); }, s);
        const row = [];
        for (const v of views) {
          await setView(page, v);
          const file = `${slug}-${qn}-s${s}-v${v}.png`;
          await snap(file, 8);
          row.push(file);
        }
        grid.push(row);
      }
      index.push({ title: `${m.btn} ${qn.toUpperCase()}: rows = scenes, columns = views (${gpu})`, file: `sheet-${slug}-${qn}.png`, grid });
    }
    await setLevel(page, 2, false);
    await page.evaluate(() => { scene = 0; lab(); });
    const extra = [];
    await setView(page, 1);
    await page.evaluate(() => act('exp'));
    await snap(`${slug}-cutaway.png`, 20); extra.push(`${slug}-cutaway.png`);
    await page.evaluate(() => act('exp'));
    await setView(page, 0);
    for (let l = 1; l <= 2; l++) {
      await page.evaluate(() => act('lens'));
      if (await page.evaluate('lens') === 0) break;
      const n = await page.evaluate('lens');
      await snap(`${slug}-lens${n}.png`, 8); extra.push(`${slug}-lens${n}.png`);
    }
    await page.evaluate(() => { lens = 0; lab(); });
    index.push({ title: `${m.btn}: cutaway close-up, lenses`, file: `sheet-${slug}-extra.png`, grid: [extra] });
    if (errors.length) console.log(m.btn, 'page errors:', errors);
    await ctx.close();

    // phone, with the HUD, as a visitor sees it
    const ph = await open(browser, base, SHOT_PHONE, m.i);
    await run(ph.page, m.i, false, 300);
    const prow = [];
    for (const v of [0, m.space ? 3 : 4]) {
      await setView(ph.page, v);
      await ph.page.evaluate(() => { for (let i = 0; i < 8; i++) { __pin(); step(1, 16); } });
      const file = `${slug}-phone-v${v}.png`;
      await ph.page.screenshot({ path: resolve(dir, file) });
      prow.push(file);
    }
    index.push({ title: `${m.btn}: phone 390×780, SIDE and ${m.space ? 'EARTH' : 'DRONE'}`, file: `sheet-${slug}-phone.png`, grid: [prow], tall: true });
    await ph.ctx.close();
    console.log('shots:', m.btn);
  }
  // contact sheets: one image per group, small enough to look over quickly
  const sheet = await (await browser.newContext({ viewport: { width: 1936, height: 900 }, deviceScaleFactor: 1 })).newPage();
  for (const s of index) {
    const cols = s.grid[0].length, w = s.tall ? 300 : Math.floor(1920 / Math.max(cols, 3));
    const html = resolve(dir, '_sheet.html');
    await writeFile(html, `<body style="margin:8px;background:#111;color:#ccc;font:14px sans-serif"><div id=s style="display:inline-block">
      <div style="margin-bottom:4px">${s.title}</div>${s.grid.map(r => `<div style="display:flex;gap:2px;margin-bottom:2px">${r.map(f =>
        `<img src="${f}" style="width:${w}px;display:block">`).join('')}</div>`).join('')}</div></body>`);
    await sheet.goto(pathToFileURL(html).href);
    await sheet.waitForFunction(() => [...document.images].every(i => i.complete));
    await sheet.locator('#s').screenshot({ path: resolve(dir, s.file) });
  }
  await writeFile(resolve(dir, 'index.json'), JSON.stringify(index, null, 1));
  console.log('wrote', index.length, 'contact sheets to', dirArg);
}

const server = process.env.PAGE_URL ? { url: process.env.PAGE_URL, close() {} } : await serveBuild();
const browser = await launch();
try {
  if (SHOTS) await shots(browser, server.url, SHOTS === true ? 'snapshots/audit' : SHOTS);
  else if (PASSES) await passes(browser, server.url);
  else await perf(browser, server.url);
} finally {
  await browser.close();
  await server.close();
}
