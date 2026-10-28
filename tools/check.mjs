// Behaviour checks (npm run check): unlike the golden suite this compares nothing with v11, it asserts that
// the game works, so it stays meaningful after behaviour changes on purpose. Any console or page error fails.
//
//   npm run check                    build, serve with `vite preview`, run every scenario
//   npm run check -- --only stall    only scenarios whose id matches
//   npm run check -- --v11           run against legacy/throttle-up-v11.html instead (the checks hold there too)
//   PAGE_URL=http://localhost:5173/ npm run check     against a running server (e.g. npm run dev)
//
// Scenarios: every machine in 3D (start, views, cutaway, lenses, scenes, INFO, SEQUENCE to the end with a
// per-machine outcome), machines 0-2 in 2D, the 2D fallback for a 3D-only machine, the compressor stall
// (deterministic, in ?manual mode), and a short real-time run.

import { DESKTOP, FF, PHONE, V11_URL, load, newPage, pool, serveBuild } from './harness.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i < 0 ? def : args.splice(i, 2)[1]; };
const ONLY = new RegExp(opt('--only', '.'));
const JOBS = +opt('--jobs', 3);
const V11 = args.includes('--v11');
const SMALL = { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 };

// Counters the stall check reads: surge bangs (the only navigator.vibrate(40)) and warning beeps (the only
// oscillator set to 1100 Hz). Functions can't be patched from outside a module, so the page is observed instead.
const COUNTERS = `(() => {
  window.__bang = 0; window.__beep = 0;
  const v = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
  navigator.vibrate = t => { if (t === 40) window.__bang++; return v ? v(t) : false; };
  const co = (window.BaseAudioContext || window.AudioContext).prototype.createOscillator;
  (window.BaseAudioContext || window.AudioContext).prototype.createOscillator = function () {
    const o = co.call(this), d = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    Object.defineProperty(o.frequency, 'value', { get() { return d.get.call(this); }, set(x) { if (x === 1100) window.__beep++; d.set.call(this, x); } });
    return o;
  };
})();`;

// What each machine's SEQUENCE must achieve (peaks are tracked while it runs).
const OUTCOME = [
  ['F-TYPE', 'reaches full afterburner', r => r.mx.A > 0.9],
  ['SR-71 J58', 'reaches Mach 2.8 on full afterburner', r => r.mx.mach > 2.8 && r.mx.A > 0.9],
  ['SHUTTLE', 'reaches full power', r => r.mx.N > 0.95],
  ['HALL', 'raises the orbit (delta-v > 0)', r => r.dv > 0],
  ['SATURN V', 'has all five F-1s lit at once', r => r.mx.lit > 0.9],
  ['HARRIER', 'lifts off', r => r.mx.alt > 1],
  ['NK-12', 'reaches full power', r => r.mx.N > 0.9],
  ['SKY CRANE', 'puts the rover down', r => !!r.td],
  ['STARSHIP', 'lights all 33 Raptors and reaches full throttle', r => r.mx.N > 0.95],
];

// Merged static meshes (render3d/merge.js): the originals stay in the scene, hidden. If one moves, changes material
// or shadow flags, or is shown again, a moving part was merged by mistake (its builder must list it in keep).
// __mgInit records the selected machine's originals; __mgCheck, run after every rendered step, names the topmost
// object that changed.
const MERGE_GUARD = `(() => {
  const rel = (m, root) => { const a = [], b = []; root.matrixWorld.clone().invert().multiply(m.matrixWorld).elements.forEach(v => a.push(v)); return a; };
  const chain = (m, root) => { const c = []; for (let o = m.parent; o && o !== root; o = o.parent) c.push(o); return c; };
  const desc = (o, root) => { const p = []; for (let x = o; x && x !== root; x = x.parent) p.unshift(x.type + '#' + x.parent.children.indexOf(x)); const w = o.getWorldPosition(new o.position.constructor()); return p.join('/') + (o.isMesh ? ' ' + o.geometry.type + ' ' + o.material.type + (o.material.color ? ' #' + o.material.color.getHexString() : '') : ' (' + o.children.length + ' children)') + ' at ' + [w.x, w.y, w.z].map(v => v.toFixed(2)).join(','); };
  window.__mgInit = () => {
    const S = window.__mg = { list: [], anc: new Map(), bad: new Map() };
    for (const [m, root] of (G3 && G3.merged) || []) {
      if (!root.visible) continue;
      S.list.push({ m, root, r: rel(m, root), mat: m.material, cs: m.castShadow, rs: m.receiveShadow });
      for (const o of [m, ...chain(m, root)]) if (!S.anc.has(o)) S.anc.set(o, { root, v: o.visible, e: o.matrix.elements.slice() });
    }
    /* frozen objects (matrixAutoUpdate off): if code moves one, its position/rotation/scale no longer match */
    S.frozen = ((G3 && G3.frozen) || []).filter(([, root]) => root.visible).map(([o, root]) => ({ o, root }));
    return S.list.length;
  };
  window.__mgCheck = (where) => {
    const S = window.__mg; if (!S) return;
    for (const { o, root } of S.frozen) {
      const e = o.matrix.clone().compose(o.position, o.quaternion, o.scale).elements;
      if (!e.some((v, i) => Math.abs(v - o.matrix.elements[i]) > 1e-5)) continue;
      const k = desc(o, root);
      if (![...S.bad.keys()].some(b => b.replace(/ at .*/, '') === k.replace(/ at .*/, ''))) S.bad.set(k, where + ' moved (frozen)');
    }
    for (const x of S.list) {
      const r = rel(x.m, x.root), moved = r.some((v, i) => Math.abs(v - x.r[i]) > 1e-5);
      const hid = chain(x.m, x.root).some(o => !o.visible) !== chain(x.m, x.root).some(o => !S.anc.get(o).v);
      if (!(moved || hid || x.m.visible || x.m.material !== x.mat || x.m.castShadow !== x.cs || x.m.receiveShadow !== x.rs)) continue;
      /* blame the topmost object whose own matrix or visibility changed (else the mesh itself) */
      let culprit = x.m;
      for (const o of [x.m, ...chain(x.m, x.root)]) { const b = S.anc.get(o); if (o.visible !== b.v || o.matrix.elements.some((v, i) => Math.abs(v - b.e[i]) > 1e-6)) culprit = o; }
      const k = desc(culprit, x.root), kk = k.replace(/ at .*/, '');
      if (![...S.bad.keys()].some(b => b.replace(/ at .*/, '') === kk)) S.bad.set(k, where + (moved ? ' moved' : '') + (hid || x.m.visible ? ' visibility' : '') + (x.m.material !== x.mat ? ' material' : '') + (x.m.castShadow !== x.cs || x.m.receiveShadow !== x.rs ? ' shadow' : ''));
    }
  };
})();`;

function checker(page, rec) {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const expect = (ok, msg) => { if (!ok) rec.fails.push(msg); return ok; };
  return {
    ev, expect,
    frames: n => ev(n => { step(n); if (window.__mgCheck) __mgCheck('view ' + view + ' lens ' + lens + ' cut ' + exposed + ' scene ' + scene + ' seq ' + (SQ.on ? SQ.i : '-')); }, n),
    act: a => ev(a => act(a), a),
    chips: () => ev(() => [...document.querySelectorAll('#mch button')].filter(b => b.style.display !== 'none').map(b => b.textContent)),
    async start() {
      await page.click('#ov span');
      await page.waitForSelector('#ov', { state: 'hidden' });
      await ev(FF, 6);
      expect((await ev('ph')) === 2, 'engine reaches RUN within 6 s');
    },
  };
}

// START on a page whose render loop runs in real time. A DOM click, not page.click(): Playwright waits for the
// button to hold still over animation frames, and on a busy CI runner real-time 3D frames can take seconds.
const startLive = page => page.$eval('#ov span', e => e.click());

// Start, cycle views / cutaway / lenses / scenes, INFO, then SEQUENCE to the end.
async function machineRun(page, rec, m, r2d) {
  const c = checker(page, rec);
  const has3D = !r2d;
  const chips = await c.chips();
  const wantChips = await c.ev('MC.filter((m) => !m.need3d || !!G3).length');
  c.expect(chips.length === wantChips && chips.length >= (has3D ? 8 : 3), `${wantChips} machine buttons (got ${chips.length})`);
  c.expect((await c.ev('!!G3')) === has3D, has3D ? '3D renderer running' : '2D renderer (no 3D)');
  c.expect((await c.ev('M.btn')) === OUTCOME[m][0], `machine ${OUTCOME[m][0]} selected`);
  await c.start();
  await c.frames(2);
  const merged = has3D && !V11 ? await c.ev(() => __mgInit()) : 0;

  const space = await c.ev('!!M.space');
  // 2D: SIDE, CLOSE-UP, REAR; 3D adds EARTH for the machine in orbit, DRONE for the others
  const list = !has3D ? [0, 1, 2] : space ? [0, 1, 2, 3] : [0, 1, 2, 4];
  for (let i = 1; i <= list.length; i++) {
    await c.act('view'); await c.frames(2);
    const [v, label, VNv] = await c.ev(() => [view, document.querySelector('#ctl [data-k=view]').textContent, VN[view]]);
    const want = list[i % list.length];
    c.expect(v === want, `view cycles (${want} expected, got ${v})`);
    c.expect(label === 'VIEW: ' + VNv, `view button reads VIEW: ${VNv}`);
  }
  for (const e of [1, 0]) { await c.act('exp'); await c.frames(2); c.expect((await c.ev('exposed')) === e, `cutaway ${e ? 'on' : 'off'}`); }
  const lenses = [];
  for (let i = 0; i < 3; i++) { await c.act('lens'); await c.frames(2); const l = await c.ev('lens'); if (l === 0) break; lenses.push(l); }
  const wantLens = !has3D ? [] : space ? [2] : [1, 2];
  c.expect(JSON.stringify(lenses) === JSON.stringify(wantLens), `lenses cycle ${JSON.stringify(wantLens)} (got ${JSON.stringify(lenses)})`);
  for (let i = 1; i <= 3; i++) { await c.act('scn'); await c.frames(2); c.expect((await c.ev('scene')) === i % 3, `scene cycles to ${i % 3}`); }

  await c.act('inf'); await c.frames(1);
  const inf = await c.ev(() => ({ shown: getComputedStyle(document.getElementById('inf')).display !== 'none', html: document.getElementById('infc').innerHTML }));
  c.expect(inf.shown && inf.html.includes('<h2>') && inf.html.includes('WHAT IS APPROXIMATED'), 'INFO panel opens with facts and approximations');
  await c.ev(() => closeInfo());
  c.expect((await c.ev(() => getComputedStyle(document.getElementById('inf')).display)) === 'none', 'INFO panel closes');

  await c.act('seq');
  c.expect(!!(await c.ev('SQ.on')), 'SEQUENCE starts');
  let total = 0;
  for (;;) {
    const r = await c.ev(() => {
      const mx = window.__mx || (window.__mx = { A: 0, N: 0, mach: 0, lit: 0, alt: 0 });
      const i0 = SQ.i; let s = 0;
      while (SQ.on && SQ.i === i0 && s < 10) {
        seqTick(.05); keys(.05); update(.05); s += .05;
        mx.A = Math.max(mx.A, A); mx.N = Math.max(mx.N, N); mx.mach = Math.max(mx.mach, mach);
        mx.lit = Math.max(mx.lit, Math.min(...sicE)); mx.alt = Math.max(mx.alt, alt);
      }
      return { on: SQ.on, s };
    });
    total += r.s;
    if (!r.on) break;
    if (!c.expect(total <= 240, 'SEQUENCE finishes within 240 s')) return;
    await c.frames(1);   // render each step
  }
  await c.frames(2);
  const out = await c.ev(() => ({ mx: window.__mx, dv: orb.dv, td: sc.td, hint: document.getElementById('hint').textContent }));
  c.expect(out.hint === 'Sequence complete.', `SEQUENCE ends with "Sequence complete." (got "${out.hint}")`);
  c.expect(OUTCOME[m][2](out), `SEQUENCE: ${OUTCOME[m][0]} ${OUTCOME[m][1]}`);
  if (has3D && !V11) {
    const bad = await c.ev(() => [...window.__mg.bad].map(([k, w]) => k + '  <- ' + w));
    c.expect(merged > 0, 'static meshes were merged');
    for (const b of bad) c.expect(false, 'static part changed (add it to keep): ' + b);
  }
}

// Compressor stall on the F-TYPE in 2D, frame by frame at 16 ms. Math.random is forced low around each slam
// so the stall roll is a sure thing (as r10_stall.py did); stalls are counted on sT rising from 0.
async function stallRun(page, rec) {
  const c = checker(page, rec);
  await c.start();
  await c.ev(() => {
    window.__st = 0;
    window.__run = (n, each) => { for (let i = 0; i < n; i++) { const was = sT; if (each) each(i); step(1); if (was <= 0 && sT > 0) window.__st++; } };
    window.__force = on => { if (on) { window.__r = Math.random; Math.random = () => 0.0001; } else Math.random = window.__r; };
  });
  const s = () => c.ev(() => ({ sT, st: window.__st, bang: window.__bang, beep: window.__beep, faults, hint: document.getElementById('hint').textContent }));
  const idle = () => c.ev(() => { raw = 0; applyRaw(); window.__run(420); });   // ~6.7 s at idle

  // 1) a slow, deliberate ramp to MIL must not stall, even with a forced-yes roll
  await c.ev(() => { window.__force(true); window.__run(180, i => { raw = 0.7 * (i + 1) / 180; applyRaw(); }); window.__force(false); });
  let r = await s();
  c.expect(r.st === 0 && r.sT <= 0, `slow ramp to MIL does not stall (stalls ${r.st})`);
  await idle();

  // 2) a slam from idle stalls once, with surge bangs and warning beeps, and recovers on its own
  await c.ev(() => { window.__force(true); raw = 1; applyRaw(); window.__run(25); window.__force(false); });
  r = await s();
  c.expect(r.st === 1 && r.sT > 0, `slam from idle stalls (stalls ${r.st}, sT ${r.sT})`);
  c.expect(r.bang > 0 && r.beep > 0, `stall surges bang and the warning beeps (bangs ${r.bang}, beeps ${r.beep})`);
  const rec1 = await c.ev(() => { let n = 0; while (sT > 0 && n < 300) { window.__run(1); n++; } return { n, hint: document.getElementById('hint').textContent }; });
  c.expect(rec1.n < 300, `stall clears within 5 s (frames ${rec1.n})`);
  c.expect(/recovered/i.test(rec1.hint), `hint says the engine recovered (got "${rec1.hint}")`);
  await idle();

  // 3) pulling the lever back during a stall clears it sooner than a full stall (2.6 s)
  await c.ev(() => { window.__force(true); raw = 1; applyRaw(); window.__run(28); window.__force(false); raw = 0; applyRaw(); });
  const t2 = await c.ev(() => { let n = 0; while (sT > 0 && n < 300) { window.__run(1); n++; } return n * 0.016; });
  r = await s();
  c.expect(r.st === 2, `second slam stalls (stalls ${r.st})`);
  c.expect(t2 + 28 * 0.016 < 2.6, `pull-back clears the stall early (${(t2 + 28 * 0.016).toFixed(2)} s)`);
  await idle();

  // 4) with FAULTS off the same slam does nothing
  await c.act('flt');
  await c.ev(() => { window.__force(true); raw = 1; applyRaw(); window.__run(94); window.__force(false); });
  r = await s();
  c.expect(r.faults === false && r.st === 2, `FAULTS off: no stall (faults ${r.faults}, stalls ${r.st})`);
}

const scenarios = [
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(m => ({ id: `3d-m${m}`, q: 2, m, ctx: SMALL, init: MERGE_GUARD, notV11: m > 7, run: (p, r) => machineRun(p, r, m, false) })),
  ...[0, 1, 2].map(m => ({ id: `2d-m${m}`, q: 2, m, r2d: true, ctx: SMALL, run: (p, r) => machineRun(p, r, m, true) })),
  {
    id: '2d-fallback-m3', q: 2, m: 3, r2d: true, ctx: SMALL,
    async run(page, rec) {
      const c = checker(page, rec);
      c.expect((await c.ev('M.btn')) === 'F-TYPE', '?m=3&r=2d falls back to F-TYPE');
      c.expect((await c.chips()).length === 3, 'only the 2D machines are offered');
    },
  },
  { id: 'stall-2d-m0', q: 2, m: 0, r2d: true, ctx: SMALL, init: COUNTERS, run: stallRun },
  // previous / next machine: the joined ◀ | MACHINE ▶ control and N / Shift+N (not in v11)
  ...[false, true].map(r2d => ({
    id: r2d ? 'nav-2d' : 'nav-3d', q: 2, m: 0, r2d, ctx: SMALL, notV11: true,
    async run(page, rec) {
      const c = checker(page, rec);
      // previous from the first machine wraps to the last; in 2D it skips the 3D-only machines
      const prev = r2d ? 'SHUTTLE' : await page.evaluate(() => MC[MC.length - 1].btn);
      const is = async (want, how) => { await c.frames(1); const b = await c.ev('M.btn'); c.expect(b === want, `${how}: ${want} (got ${b})`); };
      await c.start();
      c.expect((await c.ev(() => document.querySelector('#ctl [data-k=mach]').textContent)) === 'MACHINE: F-TYPE ▶', 'machine button reads "MACHINE: F-TYPE ▶"');
      await page.click('#ctl [data-k=machp]'); await is(prev, '◀ goes to the previous machine');
      await page.click('#ctl [data-k=mach]'); await is('F-TYPE', 'MACHINE goes to the next machine');
      await page.keyboard.press('Shift+N'); await is(prev, 'Shift+N goes to the previous machine');
      await page.keyboard.press('n'); await is('F-TYPE', 'N goes to the next machine');
    },
  })),
  // The hint text must never run under the lever column (tracks or their labels), on any machine, at any width,
  // even with the longest messages. Checked on a phone, a laptop and a narrow window.
  ...[['phone', PHONE], ['desktop', DESKTOP], ['narrow', { viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 }]].map(([name, ctx]) => ({
    id: `hint-${name}`, q: 0, m: 0, ctx, notV11: true,
    async run(page, rec) {
      const c = checker(page, rec);
      await c.start();
      const count = await c.ev('MC.length');
      for (let m = 0; m < count; m++) {
        const r = await c.ev(m => {
          setMachine(m); step(1);
          const box = el => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
          const levers = [...document.querySelectorAll('#trk, #trk2, #lbs > *, #lbs2 > *')]
            // visible tracks, and lever labels that have text
            .filter(el => el.offsetParent && el.getBoundingClientRect().width > 0 && (el.id.startsWith('trk') || el.textContent !== ''))
            .map(el => ({ name: el.id || el.textContent, ...box(el) }));
          const hint = document.getElementById('hint'), out = [];
          for (const text of [M.hint, ...(M.mission ? [M.mission.brief] : []), 'The descent stage flew off to crash a safe distance away. ENGINE to fly it again.', 'COMPRESSOR STALL! Ease the throttle back.']) {
            hint.textContent = text;
            const h = box(hint);
            for (const l of levers) if (h.r > l.l && h.l < l.r && h.b > l.t && h.t < l.b) out.push(`"${text.slice(0, 24)}..." overlaps ${l.name} (hint right ${Math.round(h.r)}, lever left ${Math.round(l.l)})`);
          }
          return { btn: M.btn, out };
        }, m);
        for (const o of r.out.slice(0, 2)) c.expect(false, `${r.btn}: ${o}`);
      }
    },
  })),
  // Phones held sideways: the dials, lamps and engine switch, the inset, the buttons, the lever column and the title
  // must not overlap, and all must stay on screen, on every machine, also when a long hint wraps.
  ...[[734, 283], [640, 300], [844, 390], [734, 283, true]].map(([w, h, fps]) => ({
    id: `landscape-${w}x${h}${fps ? '-fps' : ''}`, q: 0, m: 0, fps, ctx: { viewport: { width: w, height: h }, deviceScaleFactor: 3 }, notV11: true,
    async run(page, rec) {
      const c = checker(page, rec);
      await c.start();
      const count = await c.ev('MC.length');
      for (let m = 0; m < count; m++) {
        const r = await c.ev(m => {
          setMachine(m); step(2);
          const rect = (n, l, t, r, b) => ({ n, l, t, r, b }),
            box = (n, el) => { const b = el.getBoundingClientRect(); return rect(n, b.left, b.top, b.right, b.bottom); },
            hit = (a, b) => a.r > b.l + 0.5 && a.l < b.r - 0.5 && a.b > b.t + 0.5 && a.t < b.b - 0.5,
            hint = document.getElementById('hint'), out = [];
          for (const text of [M.hint, ...(M.mission ? [M.mission.brief] : []), 'The descent stage flew off to crash a safe distance away. ENGINE to fly it again.']) {
            hint.textContent = text; step(2);
            const dials = rect('dials, lamps and switch', gx, gy - 14, gx + 3 * dsz + 16, SWR.y + SWR.h),
              parts = [dials, box('title and hint', document.getElementById('hint').parentElement)],
              fr = document.getElementById('fps');
            /* with ?fps: the readout, filled with a long line as on a phone */
            if (fr) { fr.children[1].textContent = 'JS 33.0 ms · 207k tris · 171 calls'; parts.push(box('fps readout', fr)); }
            const I = window.INR;
            if (I) parts.push(rect('inset', I[0], I[1], I[0] + I[2], I[1] + I[3]));
            for (const el of document.querySelectorAll('#ctl button, #trk, #trk2, #lbs > *, #lbs2 > *'))
              if (el.offsetParent && el.getBoundingClientRect().width > 0 && (!el.closest('#lbs, #lbs2') || el.textContent !== ''))
                parts.push(box(el.closest('#ctl') ? 'button ' + el.textContent : 'lever ' + (el.id || el.textContent), el));
            for (let i = 0; i < parts.length; i++)
              for (let j = i + 1; j < parts.length; j++)
                if (hit(parts[i], parts[j]) && !(parts[i].n.startsWith('lever') && parts[j].n.startsWith('lever')))
                  out.push(`${parts[i].n} overlaps ${parts[j].n}`);
            for (const p of parts) if (p.l < 0 || p.t < 0 || p.r > innerWidth + 0.5 || p.b > innerHeight + 0.5) out.push(`${p.n} runs off screen`);
          }
          return { btn: M.btn, out: [...new Set(out)], dsz };
        }, m);
        for (const o of r.out.slice(0, 3)) c.expect(false, `${r.btn} (dials ${r.dsz} px): ${o}`);
      }
    },
  })),
  // Sky-crane MISSION (not in v11): the button, a good landing scored, FLY AGAIN after the flyaway, the three ways to
  // fail (too fast, bridles not out, out of hydrazine), slow-mo locked, CLOSE back to free play.
  {
    id: 'mission-m7', q: 0, m: 7, ctx: SMALL, notV11: true,
    async run(page, rec) {
      const c = checker(page, rec);
      await c.start();
      const btn = () => c.ev(() => { const b = document.querySelector('#ctl [data-k=mis]'); return b.offsetParent ? b.textContent : null; });
      c.expect((await btn()) === '◆ MISSION', 'sky crane shows the ◆ MISSION button');
      await page.click('#ctl [data-k=mis]');
      c.expect((await c.ev('MS.on')) === 1 && (await btn()) === '■ END MISSION', 'MISSION starts and the button reads ■ END MISSION');
      c.expect(/^MISSION:/.test(await c.ev(() => document.getElementById('hint').textContent)), 'the hint gives the brief');
      const today = await c.ev('dayNo()');
      const d = await c.ev(() => ({ day: MS.day, tries: MS.tries, seed: MS.seed, want: daySeed(skyMission.name, dayNo()) }));
      c.expect(today >= 1 && d.day === today && d.tries === 1 && d.seed === d.want, `MISSION starts today's daily challenge (${JSON.stringify(d)}, today #${today})`);
      c.expect(await c.ev(() => dayNo(new Date(2026, 9, 28, 0, 1)) === 1 && dayNo(new Date(2026, 9, 28, 23, 59)) === 1 && dayNo(new Date(2026, 9, 29)) === 2 && dayNo(new Date(2027, 2, 29, 12)) === 153 && daySeed('A', 1) !== daySeed('A', 2)), 'daily numbers follow the calendar date, each day its own seed');
      // fly with a fixed seed; pilot(kind) flies until the result card is up (ff includes misTick, as frame() does)
      const fly = (seed, kind) => c.ev(([seed, kind]) => {
        if (seed === 'daily') misStart(); else if (seed != null) misStart(seed);
        const ff = (s, f) => { for (let t = 0; t < s; t += .05) { keys(.05); update(.05); misTick(.05); if (f && f()) return; } };
        ff(4, () => ph == 2);
        const c0 = { alt: alt, vz: vz, prop: sc.prop };
        if (kind !== 'nobridle') raw2 = 1;
        ff(200, () => {
          if (kind === 'drop') raw = 0;
          else if (kind === 'hover') raw = Math.min(1, Math.max(0, skyHov() + 0.4 * (0 - vz)));
          else { const ry = alt - RH - sc.bl; raw = Math.min(1, Math.max(0, skyHov() + 0.4 * ((ry > 4 ? -2.2 : -0.7) - vz))); }
          applyRaw();
          return MS.tr < 0;
        });
        step(2);
        const card = document.getElementById('mis');
        return { c0, shown: getComputedStyle(card).display !== 'none', title: document.getElementById('mish').textContent, why: document.getElementById('misr').textContent, score: document.getElementById('miss').textContent, res: MS.res,
          daily: document.getElementById('misd').textContent, share: getComputedStyle(document.getElementById('misy')).display !== 'none', text: MS.day ? shareText().split('\n') : [] };
      }, [seed, kind]);
      let r = await fly(7, 'good');
      c.expect(r.c0.alt >= 26 && r.c0.alt <= 38 && r.c0.vz <= -1.5 && r.c0.vz >= -3.5 && r.c0.prop > 70, `start conditions in range (${JSON.stringify(r.c0)})`);
      c.expect(r.shown && r.title === 'ROVER DOWN SAFELY' && /^\d+ POINTS$/.test(r.score) && r.res.score > 600, `a gentle landing scores (${r.title}, ${r.score})`);
      const same = await fly(7, 'good');
      c.expect(same.res.score === r.res.score && same.c0.alt === r.c0.alt, 'the same seed gives the same conditions and score');
      c.expect(same.daily === '' && !same.share, 'an attempt with a given seed is not a daily try (no daily line, no SHARE)');
      // FLY AGAIN relights after the flyaway and starts fresh, on the same conditions
      await page.click('#misa');
      const again = await c.ev(() => { for (let t = 0; t < 4 && ph != 2; t += .05) update(.05); return { ph, used: sc.used, hidden: getComputedStyle(document.getElementById('mis')).display === 'none', on: MS.on, res: MS.res, seed: MS.seed, day: MS.day }; });
      c.expect(again.ph === 2 && again.hidden && again.on === 1 && !again.res && again.seed === 7 && again.day === 0, `FLY AGAIN restarts the mission on the same seed (ph ${again.ph}, seed ${again.seed})`);
      // the daily challenge: tries counted, the share line
      r = await fly('daily', 'drop');
      c.expect(r.title === 'HARD LANDING' && r.score === 'NO SCORE', `falling fails as a hard landing (${r.title})`);
      c.expect(r.daily === `DAILY #${today} · TRY 2` && r.share, `the card shows the daily number and try (${r.daily})`);
      c.expect(r.text.length === 4 && r.text[0] === `Throttle Up daily #${today} · Mars sky crane landing` && r.text[1] === '🟥 HARD LANDING (try 2)' && /^Touchdown \d+\.\d\d m\/s, \d+ of \d+ kg hydrazine left$/.test(r.text[2]) && /\?m=7&daily$/.test(r.text[3]), `a failed try's share line (${JSON.stringify(r.text)})`);
      r = await fly('daily', 'good');
      const bar = r.res && r.res.ok ? '🟩'.repeat(Math.round(r.res.score / 100)) + '⬜'.repeat(10 - Math.round(r.res.score / 100)) : '';
      c.expect(r.title === 'ROVER DOWN SAFELY' && r.daily === `DAILY #${today} · TRY 3 · BEST ${r.res.score}`, `a good daily landing sets today's best (${r.title}, ${r.daily})`);
      c.expect(r.text[1] === `${bar} ${r.res.score} points (try 3)` && /^Touchdown \d\.\d\d m\/s, \d+ of \d+ kg hydrazine left$/.test(r.text[2]), `a scored try's share line (${JSON.stringify(r.text)})`);
      const kept = await c.ev(() => JSON.parse(localStorage.getItem('tu-daily-' + skyMission.name)));
      c.expect(kept.d === today && kept.tries === 3 && kept.best === r.res.score, `today's tries and best are kept in the browser (${JSON.stringify(kept)})`);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.click('#misy');
      await page.waitForFunction(() => document.getElementById('misy').textContent !== 'SHARE', null, { timeout: 5000 }).catch(() => {});
      const clip = await c.ev(async () => ({ b: document.getElementById('misy').textContent, t: await navigator.clipboard.readText() }));
      c.expect(clip.b === 'COPIED' && clip.t.replace(/\r\n/g, '\n') === r.text.join('\n'), `SHARE copies the share line (${clip.b}: ${JSON.stringify(clip.t)})`);
      r = await fly(11, 'nobridle');
      c.expect(r.title === 'STAGE TOO LOW', `touching down with the bridles in fails (${r.title})`);
      r = await fly(11, 'hover');
      c.expect(r.title === 'HARD LANDING' && /ran out/.test(r.why), `hovering until the hydrazine runs out fails (${r.title}: ${r.why})`);
      await c.act('slow');
      c.expect((await c.ev('sl')) === 0, 'slow-mo stays off during a mission');
      await page.click('#misx');
      const off = await c.ev(() => ({ on: MS.on, prop: SKY0.prop, alt0: SKY0.alt, hidden: getComputedStyle(document.getElementById('mis')).display === 'none' }));
      c.expect(off.on === 0 && off.hidden && off.prop === Infinity && off.alt0 === 32, 'CLOSE ends the mission and restores free play');
      c.expect((await btn()) === '◆ MISSION', 'the button reads ◎ MISSION again');
      await c.ev(() => setMachine(0));
      c.expect((await btn()) === null, 'machines without a mission hide the button');
    },
  },
  {
    // the link a shared result points to: START goes straight into today's challenge
    id: 'daily-link-m7', q: 0, m: 7, daily: true, ctx: SMALL, notV11: true,
    async run(page, rec) {
      const c = checker(page, rec);
      await c.start();
      await c.frames(2); // the mission starts from the frame loop (misTick) once the engine runs
      const r = await c.ev(() => ({ on: MS.on, day: MS.day, today: dayNo(), tries: MS.tries, alt: SKY0.alt, hint: document.getElementById('hint').textContent }));
      c.expect(r.on === 1 && r.day === r.today && r.tries === 1 && r.alt !== 32 && /^MISSION:/.test(r.hint), `?daily starts today's challenge at START (${JSON.stringify(r)})`);
    },
  },
  {
    id: 'live-m0', m: 0, manual: false, ctx: SMALL,
    async run(page, rec) {
      await startLive(page);
      await page.waitForTimeout(2500);
      const c = checker(page, rec);
      c.expect(await page.evaluate(() => ph >= 1 && simT > 0 && !!G3), 'real-time loop runs with 3D');
      c.expect(!(await page.$('#fps')), 'no frame-time readout without ?fps');
    },
  },
  {
    // ?fps: the readout fills in (frame rate, JS time, triangles and draw calls, quality, 3D size, GPU) and the
    // gauges sit below it
    // F-TYPE, not the heavy Starship: on CI two real-time 3D pages at once slow every frame to seconds.
    // Phone-sized but not isMobile: emulation's late resize, which load() waits for, can take over 10 s on CI.
    id: 'fps-m0', m: 0, manual: false, fps: true, ctx: { viewport: PHONE.viewport, deviceScaleFactor: 2 },
    async run(page, rec) {
      const c = checker(page, rec);
      await startLive(page);
      // the first readout can predate 3D (it says 2D while three loads), and on a slow runner the first 3D frames
      // take seconds: wait until it shows the 3D renderer, or a reason why 3D stopped
      await page.waitForFunction(() => no3D || /^Q.* 3D /.test(document.querySelectorAll('#fps div')[2].textContent), null, { timeout: 90_000 });
      const no3D = await c.ev('no3D');
      if (!c.expect(!no3D, `3D running (stopped: ${no3D})`)) return;
      const r = await c.ev(() => ({ t: [...document.querySelectorAll('#fps div')].map(d => d.textContent), b: document.getElementById('fps').getBoundingClientRect().bottom, gy }));
      c.expect(/^JS \d+\.\d ms · [1-9]\d*k? tris · [1-9]\d* calls$/.test(r.t[1]), `readout shows JS time and GPU work (got "${r.t[1]}")`);
      c.expect(/^Q[0-2] auto · 3D \d+×\d+ · F-TYPE$/.test(r.t[2]), `readout shows quality and 3D size (got "${r.t[2]}")`);
      c.expect(r.t[3].length > 0, 'readout shows the GPU');
      c.expect(r.gy > r.b, `gauges below the readout (gauges at ${r.gy}, readout ends at ${r.b})`);
    },
  },
];

let base = process.env.PAGE_URL, server = null;
if (V11) base = V11_URL;
else if (!base) { server = await serveBuild(); base = server.url; }
console.log(`checking ${base}`);

const todo = scenarios.filter(s => ONLY.test(s.id) && !(V11 && s.notV11));
const t0 = Date.now();
let failed = 0;
await pool(todo, JOBS, async (browser, sc) => {
  const rec = { fails: [], errors: [] }, s0 = Date.now();
  const { ctx, page } = await newPage(browser, sc, rec);
  try {
    await load(page, base, sc);
    await sc.run(page, rec);
  } catch (e) {
    rec.fails.push('crashed: ' + String(e.message || e).split('\n')[0]);
  }
  await ctx.close();
  // repeated errors (one per frame, typically) are shown once with a count
  const counts = new Map();
  for (const e of rec.errors) counts.set(e, (counts.get(e) || 0) + 1);
  const bad = [...rec.fails, ...[...counts].map(([e, n]) => (n > 1 ? `${e}  (×${n})` : e))];
  if (bad.length) failed++;
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${sc.id.padEnd(15)} ${((Date.now() - s0) / 1000).toFixed(1)}s` + bad.map(b => `\n       - ${b}`).join(''));
  // on GitHub Actions each failure is also an annotation: the public API shows those without signing in, unlike logs
  if (process.env.GITHUB_ACTIONS) for (const b of bad) console.log(`::error title=check ${sc.id}::${b.replace(/%/g, '%25').replace(/\r?\n/g, '%0A')}`);
});
if (server) await server.close();
console.log(`\n${todo.length - failed}/${todo.length} scenarios passed  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
process.exit(failed ? 1 : 0);
