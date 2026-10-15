# Throttle Up — project guide for Claude Code

Throttle Up is a browser toy (heading toward a game) where you throttle up real engines and machines and watch, hear and read what happens. Owner: Kingsley. Goal: host it publicly, make it credible ("not taken for a joke"), and give it a real chance of spreading on social media.

**Source of truth:** the Vite project in `src/` (no framework, plain JavaScript, three@0.160.0 from npm). Run it with `npm install` once, then `npm run dev`; `npm run build` + `npm run preview` serves the production build. ES modules don't run from `file://`, so the built page needs a server (GitHub Pages is fine).

`legacy/throttle-up-v11.html` is the original single-file version the project was split from. It still runs from disk (Three.js from the jsDelivr CDN) and is kept as the reference the golden suite compares against: the split was verified to render and behave identically, pixel for pixel. Retire it once intentional changes start (then regenerate the golden reference from the build; see Testing).

## Machines (index = `?m=` URL param)

| # | Button | What it is | 3D only | Special mechanics |
|---|--------|------------|---------|-------------------|
| 0 | F-TYPE | Generic afterburning turbojet on a test stand | no | afterburner detent at MIL, compressor stall (FAULTS) |
| 1 | SR-71 J58 | J58 with inlet spike, bypass tubes, start cart | no | simulated Mach drives spike position; stall |
| 2 | SHUTTLE | RS-25 on a vertical test stand | no | hydrogen burn-off igniters, steam |
| 3 | HALL | SPT-140-class Hall thruster on a Psyche-like craft in Earth orbit | yes | TIME WARP (1x / 1,000x / 100,000x), what-if orbit raising, EARTH view |
| 4 | SATURN V | Five F-1s on an S-IC stage on a static stand | yes | lever lights engines in the real 1-2-2 order (F-1 can't throttle) |
| 5 | HARRIER | Pegasus jump jet on a hover pad | yes | second lever = nozzle angle; vertical hover physics |
| 6 | NK-12 | Kuznetsov NK-12 turboprop, contra-rotating props, test stand | yes | constant-speed propeller (RPM holds, blade pitch coarsens), feathering |
| 7 | SKY CRANE | Mars 2020 descent stage lowering Perseverance, Jezero Crater | yes | Mars gravity, 8 MLEs (4 drop to ~1%), second lever = bridle payout, auto cut + flyaway |

Machines 0–2 also have a hand-drawn 2D canvas renderer (fallback). Machines with `need3d:1` are hidden when 3D is unavailable.

## Architecture

Top level: `index.html` + `src/` (the game), `tools/` (golden suite, compare, chunk check), `legacy/` (v11 and the Python tests from its development), `docs/SOURCES.md`.

`index.html` (markup) + `src/style.css` + `src/main.js`. The code was moved verbatim from v11 by scripts and then formatted with Prettier (`npm run format`; `.prettierrc.json`, 120 columns), so variable names are still v11's short ones (`N`, `E`, `fu`, `hg` ... see the state list below).

```
src/
  main.js                 boot: wires listeners in v11's order (wireX()), picks ?m, resize, loop, 3D loader
  core/state.js           `state`: every shared mutable variable (N, A, E, F, ph, raw, raw2, view, exposed, scene,
                          lens, mi, M, simT, alt, vz, ...) with its initial value. Code reads/writes state.N etc.
  core/params.js          ?q (QP) and ?manual (MAN); ?m is read in main.js, ?r=2d in core/loader3d.js
  core/util.js            $, cv/g (HUD canvas), mk, sm (smoothstep), label tables, MONO font
  core/engine.js          update(dt): generic engine model, stall/surge, master switch; M.clu(dt) per-machine step
  core/machine-switch.js  setMachine (resets, then every machine's reset() and the selected one's onSelect()), chips
  core/loop.js            frame(), adapt(), step() test hook
  core/loader3d.js        load3D(): fetches three + the renderer chunk; ready3D/fail3D fall back to 2D
  hud/                    layout.js (resize), gauges.js (gauges, lamps, engine switch, inset placement),
                          controls.js (lab, act, lever labels, START overlay)
  input/lever.js          lever(s) with the MIL detent, keyboard
  audio/audio.js          Web Audio graph and one-shot sounds (per-machine voices live in the machine folders)
  sequence/sequence.js    SEQUENCE player (SQ, seqStart/Next/Stop/Tick/Cap)
  info/                   info.js (INFO panel), cut-text.js (the SCHLIEREN/THERMAL paragraphs)
  recorder/recorder.js    REC: WebGL + HUD composite into a MediaRecorder clip
  render2d/               index.js (2D renderer: sky, haze, bloom, draw), jet.js (2D jet parts), sprites.js
  render3d/               lazy chunk, the only code that imports three:
    index.js              init3D(): loadM3(), then every createX() in v11's order; returns G3
    kit.js                renderer, materials MT, thermal categories CAT, textures, geometry helpers
                          (lathe along local +X, ring, box, cyl, pipe, beam, bladeRing, canvasTex ...)
    sky, lights, scenes (SCN/SCNS/SCNM, applyScene), ground, earth, props
    plume.js              ray-marched volumetric plume shader; plumeParams() -> M3[mi].plume
    particles.js          pools (SPK, SMK, FIR, FLW), emitters() -> M3[mi].emit, burst()
    lenses.js             thermal/schlieren; thermalU() -> M3[mi].thermal
    composite, camera, flow (cutaway tracers), overlay (labels, legend), frame (render())
    machine.js            CFG (= M3.map(m=>m.cfg)), applyMachine();  builders.js: ENG (= M3.map(m=>m.build()))
    context.js            k3: renderer state several modules reassign (camera, plume, targets, accumulators)
  machines/
    index.js              MC = [...] in machine order (index = ?m = chip order)
    three.js              M3 = [...] the 3D side, same order (filled by loadM3() when init3D starts)
    <name>/machine.js     default export = the MC entry, plus the machine's own sim, voice (au*) and constants
    <name>/three.js       default export = { cfg, build, hooks }: the 3D model, camera/plume config, renderer hooks
    <name>/inset.js       inset panel (hall, harrier, nk-12, sky-crane, sr-71)
    shuttle/draw2d.js     the RS-25's 2D renderer
    shared/jet3d.js       3D hooks F-TYPE and SR-71 share;  shared/gimbal.js: RS-25/F-1 gimbal wobble
  debug/globals.js        test bridge: every main-chunk export and state key on window
```

Frame: `frame(t)` → `seqTick` → `keys` → `update` → `audio` → 2D `draw` or `G3.render` → `gauges` → `G3.overlay` → `seqCap` → REC.

### Machine table entry (`MC[i]`, `machines/<name>/machine.js`) — key fields

`n` title, `btn` chip label, `sub` subtitle, `hint`, flags `need3d, space, warp, orbit, hover, nozzle, sky, inset, spike`, `insetF` (inset drawer).
Hooks: `clu(dt)` per-frame machine step (Hall orbit, Saturn V, Harrier hover, NK-12, sky crane), `reset()` (runs for every machine on any switch), `onSelect()` (sky crane), `seqPre()` (sky crane's SEQUENCE pre-step), `camA(view)`, `warpName(i)` (Hall).
Engine model: `idle, up, dn, coast, cN, cT, tk, ign, lk, e0f, lt, ab, stall, e:[EGT curve], f:[fuel curve]`.
UI: `g` (3 gauges: `{t,cap,min,max,maj,mn,red,d,f}`), `gv()` values, `lv`/`lv2` lever labels `[text,pos,'t'|'b']`, `lp()` lamps, status words `off/st/cl/cut/wait`.
Feel: `shk()` camera shake, `au(s,V,pm)` audio voice.
Story: `sqc` + `sq[]` SEQUENCE steps (`{cap, lever|()=>, dur, wait, until(), max, view, do()}`), `info:{f:[facts], a:[approximations], cut:string|array, s:[[title,url]]}` (a string `cut` gets the shared SCHLIEREN/THERMAL paragraphs appended).
2D-only: `nxf, r, gl, skyG, hzk, hzg, hza, blk, mc, dk, bl, bd, pl, draw, rear`.

### 3D side (`machines/<name>/three.js`) — fields

`cfg:{box:[len,radius], sc, sh, cams:[[pos,target,halfWidthFit] x3 or 4], mt, space?, mars?}`, `build()` → `{G, E, anchor, lens, labels, flow, upd(dt)}` (plume runs along `anchor`'s local +X; labels/tracers in `E`'s local coords), `plume(u,fl)` → `[lightIntensity, lightColour]` (sets plume uniforms), `emit(dt,ax)`, `thermal(amb,nn,fh)`, `flame()` (flame-light position). Optional: `thFh(nn)`, `thR:[cold,ground]`, `flap()`, `inner()` (metal glow), `flowStr`, `flowSize`, `flowSpeed()`, `cam(P0,T0)` (Hall's EARTH view), `portrait` (swing round on portrait phones), `burst` (stall fireballs). A hook a machine leaves out gets the shared default.

### Rules the split relies on

- **Load order.** Modules do no work when they load except build constants. Listeners and DOM setup go in a module's `wireX()`, called from `main.js` in v11's order. Every three.js object is created inside `init3D` (`createX()` / `build()`), in v11's order: object ids and the random numbers three draws for UUIDs depend on it.
- **Import cycles exist** (the machine table, controls and renderer modules reference each other). Anything read *while modules are loading* must be a function declaration; a `const` or default export read that early is silently `undefined` in the bundle. That's why `M3` is filled by `loadM3()` and `jet3d.js` exports only functions.
- **Three.js stays out of the main chunk.** `npm run build` runs `tools/check-chunks.mjs`, which fails if the entry chunk reaches three, `render3d/` or a machine's `three.js` (`?r=2d` must never download three).
- `npm run lint` (ESLint `no-undef`): a forgotten import would otherwise silently resolve to an element with that id (`hd`, `trk`, `tq` are both).

**To add a machine:** create `src/machines/<name>/machine.js` (default export = the MC entry; its sim, voice, inset) and `src/machines/<name>/three.js` (default export `{cfg, build, plume, emit, thermal, flame, ...}`), then add it at the same position in `machines/index.js` and `machines/three.js`. Add its sources to `info.s` and `docs/SOURCES.md`, and its expected SEQUENCE outcome to `OUTCOME` in `tools/check.mjs`. New ground types or scene sets go in `render3d/ground.js` / `render3d/scenes.js`.

## Non-negotiable conventions

- **Credibility first.** Every user-facing fact in INFO must come from a source listed in that machine's `info.s` (see `docs/SOURCES.md`). Anything modelled, assumed or simplified goes in `info.a` ("WHAT IS APPROXIMATED"), stated plainly. Don't state numbers you can't source (e.g. NK-12 propeller rpm, sky-crane descent stage mass are deliberately not claimed as fact).
- Physics should be right in direction and order of magnitude even when simplified (e.g. Hall: thrust pushes the craft opposite to the beam; Earth slides away beneath in the beam's direction).
- Keep the 2D fallback working for machines 0–2 (`?r=2d`), and degrade gracefully when WebGL2 or the CDN fails.
- Mobile matters: portrait phones, two-lever layouts, insets must not overlap gauges. Test at 390×780.
- Captions/lamps are short (lamps fit ~9 characters).
- Sound is synthesized (Web Audio) — no recordings yet.

## Testing

URL params: `?m=N` machine, `?q=0|1|2` quality, `?r=2d` force 2D, `?manual` stop the render loop so tests drive frames.

Test hooks (in the page): `step(n, ms)` renders n frames at ms each (with sim update); fast-forward without rendering:
```js
(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}
```
`G3.snap()` jumps the camera to its target. Click `#ov span` to start the engine. `act('view'|'exp'|'scn'|'lens'|'seq'|...)` mirrors the buttons. In the Vite app these names reach `window` through the test bridge (`src/debug/globals.js`): state keys are readable and assignable (`view=1`), functions are callable but can't be replaced from outside.

**Behaviour checks (`npm run check`, about 2 min):** builds the app, serves it, and asserts that the game works, failing on any console or page error. Covers:
- every machine in 3D: engine reaches RUN; views cycle, with the button label checked; cutaway; lenses (Hall skips schlieren); scenes; INFO opens and closes;
- SEQUENCE runs to "Sequence complete." with a per-machine outcome: F-TYPE full afterburner, SR-71 Mach 2.8+, shuttle and NK-12 full power, Hall raises its orbit, Saturn V all five F-1s lit, Harrier lifts off, sky crane touches down;
- machines 0–2 in 2D (`?r=2d`) and the fallback from `?m=3&r=2d` to F-TYPE;
- the compressor stall, deterministic in `?manual` mode. A slow ramp doesn't stall; a slam stalls with bangs and beeps and recovers; pulling back clears it early; FAULTS off prevents it;
- a short real-time run.

`--only <regex>` picks scenarios; `--v11` runs the same checks on `legacy/throttle-up-v11.html` (all pass there too); `PAGE_URL` points at a running server. Unlike the golden suite it doesn't compare with v11, so it stays meaningful after intentional changes. Extend `OUTCOME` in `tools/check.mjs` when adding a machine. Shared Playwright setup (seeded random, CDN routing, build + preview) lives in `tools/harness.mjs`.

**Golden suite (Node Playwright, the parity check for the Vite split):** `npm run snapshots` drives `legacy/throttle-up-v11.html` through 38 scenarios and writes 290 screenshots plus `manifest.json` to `snapshots/golden`. The scenarios cover:
- every machine in every view, with cutaway, lenses and scenes, at power, and with INFO open;
- every SEQUENCE;
- the 2D renderer and its fallback;
- `q=0` and `q=1`;
- a phone at 390×780, DPR 2;
- REC, WebGL context loss, and a live run.

The manifest records sim state, `Math.random` counts, an audio-parameter hash, INFO HTML and chip lists. Runs are byte-for-byte reproducible:
- `Math.random` is seeded, and re-seeded when WebGL starts, because three.js draws randoms for every object's UUID;
- three@0.160.0 is served from `node_modules`;
- the Chromium flags make compositing deterministic.

Check the Vite build with `npm run snapshots -- --serve snapshots/after` (it builds, starts `vite preview`, and runs the suite), then `npm run compare -- snapshots/golden snapshots/after`. That must report 0 differences. `--only <regex>` reruns selected scenarios into an existing folder; `compare --partial` compares only the scenarios a run contains. `snapshots/` is gitignored; regenerate it from v11 (about 6 min). Any refactor that should not change behaviour must pass this. When a change is *meant* to alter what you see or hear, review the diff images in `snapshots/after/_diff/`, then make the build the new reference: `npm run snapshots -- --serve snapshots/golden`.

`legacy/tests/` holds the Playwright (Python) scripts used during development in a cloud sandbox with a software GPU, superseded by `npm run check` and the golden suite but kept for reference: `t10.py M OUT` screenshots a machine through views/lenses/scenes, `t10s.py OUT` runs SEQUENCE for machines 6 and 7, `t11s.py` runs Hall + sky crane sequences and checks the 2D chip list, `t10f.py` cycles all machines/scenes/quality and REC, `r10_stall.py 0` is the compressor-stall regression in 2D. They test the running Vite app (`npm run dev`, or set `PAGE_URL`). Needs `pip install playwright` and `playwright install chromium` (the repo's `.venv` has both). On a real GPU you can drop the SwiftShader flags in `h3.py`.

Real-device checks still outstanding: real GPU, mid-range Android, iPhone Safari, and listening on real speakers.

## Known issues

- Harrier and rover models are crude up close; Mars sunset blue glow is broad.
- Saturn V schlieren is busy where the plume meets the deflector.
- In the Hall EARTH view under the TERMINATOR scene the craft is a dark silhouette.
- Propellers are drawn slower than real (anti-strobe), stated in INFO.
- The SR-71 spike inset (`machines/sr-71/inset.js`) is never shown: the SR-71 entry has no `inset` flag, yet its INFO text about the inlet spike ends "Watch the inset." Inherited from v11 and kept for parity; fix it deliberately (add `inset:1`, check the phone layout).
- All testing so far was software-rendered; performance on real phones unknown.

## Roadmap (agreed)

1. **Make it shippable**
   - ~~Split into a Vite project, one module per machine (sim + builder + config + info together), shared renderer/HUD/audio modules. Behaviour identical to v11 — compare screenshots before/after.~~ Done (branch `refactor/vite-split`): identical to v11 on the full golden suite.
   - Git, then host on GitHub Pages or Cloudflare Pages; social preview image (Open Graph), favicon, privacy-friendly analytics.
   - Real-device test pass and fixes (performance budget for mid-range Android).
2. **Game layer**
   - Missions with scores: sky-crane soft landing (wind gusts, terrain), Harrier ship-deck landing, Hall reach-an-orbit on least xenon, F-type stall-free run-up.
   - Daily challenge (same seed for everyone) with a Wordle-style share line.
   - One-tap vertical (9:16) clip export with score overlay for TikTok/Reels/Shorts.
3. **Realism**
   - Sound overhaul: blend CC0 recordings, pitch-shifted by RPM.
   - Better models (check NASA 3D Resources for Perseverance; check usage terms).
   - Flight mode: Saturn V / Shuttle ascent to orbit with staging.
4. **Launch**: Show HN, r/space, r/aviation, r/InternetIsBeautiful, aviation/space creators, led by a 10-second clip.

## Working style for this project

- Small, verifiable steps; run the page after every change. Keep diffs focused.
- Before committing: `npm run format`, `npm run lint`, `npm run check` (builds, so it includes the chunk check). For changes that shouldn't alter behaviour, also the golden suite (see Testing).
- Before adding facts, find a source; record it in `info.s` and `docs/SOURCES.md`.
- Kingsley is a software developer (C#/.NET, Next.js), not an aerospace engineer — explain physics choices briefly in plain language when they matter.
