# Throttle Up — project guide for Claude Code

Throttle Up is a browser toy (heading toward a game) where you throttle up real engines and machines and watch, hear and read what happens. Owner: Kingsley. Goal: host it publicly, make it credible ("not taken for a joke"), and give it a real chance of spreading on social media.

**Source of truth:** the Vite project in `src/` (no framework, plain JavaScript, three@0.160.0 from npm). Run it with `npm install` once, then `npm run dev`; `npm run build` + `npm run preview` serves the production build. ES modules don't run from `file://`, so the built page needs a server (GitHub Pages is fine).

`legacy/throttle-up-v11.html` is the original single-file version the project was split from. It still runs from disk (Three.js from the jsDelivr CDN). The split was verified identical to it, pixel for pixel; since 2026-10-16 the game intentionally differs (EARTH view at high orbit, previous-machine control, heat haze kept off the nozzle, camera shake off, SR-71 spike inset shown), so it is kept for history and the golden reference now comes from the build (see Testing).

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
| 7 | SKY CRANE | Mars 2020 descent stage lowering Perseverance, Jezero Crater | yes | Mars gravity, 8 MLEs (4 drop to ~1%), second lever = bridle payout, auto cut + flyaway; MISSION (soft landing, scored) |
| 8 | STARSHIP | Super Heavy booster (33 Raptor 3) static fire on Pad 2's launch mount at Starbase, on the Gulf coast | yes | lever lights the centre 3, middle ring and outer ring, then throttles all 33 from 40 to 100%; dual flame trench (fire and steam both ways); its own coastal site (beach, sea, lagoons, tank farm, Pad 1) |

Machines 0–2 also have a hand-drawn 2D canvas renderer (fallback). Machines with `need3d:1` are hidden when 3D is unavailable.

## Architecture

Top level: `index.html` + `src/` (the game), `tools/` (golden suite, compare, chunk check), `legacy/` (v11 and the Python tests from its development), `docs/SOURCES.md`.

`index.html` (markup) + `src/style.css` + `src/main.js`. The code was moved verbatim from v11 by scripts and then formatted with Prettier (`npm run format`; `.prettierrc.json`, 120 columns), so variable names are still v11's short ones (`N`, `E`, `fu`, `hg` ... see the state list below).

```
src/
  main.js                 boot: wires listeners in v11's order (wireX()), picks ?m, resize, loop, 3D loader
  core/state.js           `state`: every shared mutable variable (N, A, E, F, ph, raw, raw2, view, exposed, scene,
                          lens, mi, M, simT, alt, vz, ...) with its initial value. Code reads/writes state.N etc.
  core/params.js          ?q (QP), ?manual (MAN), ?fps (FPS), ?nomerge, ?daily (DAILY); ?m is read in main.js, ?r=2d in
                          core/loader3d.js
  core/util.js            $, cv/g (HUD canvas), mk, sm (smoothstep), label tables, MONO font
  core/engine.js          update(dt): generic engine model, stall/surge, master switch; M.clu(dt) per-machine step
  core/machine-switch.js  setMachine (resets, then every machine's reset() and the selected one's onSelect()), chips
  core/loop.js            frame(), adapt() (auto quality, 4 levels: Q2, Q1, Q0, Q0 at 0.7 resolution; CPU-bound
                          frames skip the resolution drops), step() test hook
  core/loader3d.js        load3D(): fetches three + the renderer chunk; ready3D/fail3D fall back to 2D
  hud/                    layout.js (resize), gauges.js (gauges, lamps, engine switch, inset placement),
                          controls.js (lab, act, lever labels, START overlay), fps.js (?fps readout)
  input/lever.js          lever(s) with the MIL detent, keyboard
  audio/audio.js          Web Audio graph and one-shot sounds (per-machine voices live in the machine folders)
  sequence/sequence.js    SEQUENCE player (SQ, seqStart/Next/Stop/Tick/Cap)
  mission/mission.js      MISSION runner (MS, misStart(seed)/misStop/misTick, rng(seed), the result card #mis); the
                          machine's `mission` sets the conditions and judges; progress shows in the machine's inset.
                          Daily challenge: dayNo() (#1 = 2026-10-28, local date), daySeed(name, n), tries/best per day in
                          localStorage (`tu-daily-<name>`), shareText() (the SHARE line)
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
    merge.js              static-parts pass after all builds: merges static meshes per material, freezes static
                          matrices, gives instanced meshes their own material copies (see the rule below)
  machines/
    index.js              MC = [...] in machine order (index = ?m = chip order)
    three.js              M3 = [...] the 3D side, same order (filled by loadM3() when init3D starts)
    <name>/machine.js     default export = the MC entry, plus the machine's own sim, voice (au*) and constants
    <name>/three.js       default export = { cfg, build, hooks }: the 3D model, camera/plume config, renderer hooks
    <name>/inset.js       inset panel (hall, harrier, nk-12, sky-crane, sr-71)
    sky-crane/mission.js  the soft-landing MISSION (start conditions, hydrazine budget, verdict and score)
    shuttle/draw2d.js     the RS-25's 2D renderer
    shared/jet3d.js       3D hooks F-TYPE and SR-71 share;  shared/gimbal.js: RS-25/F-1 gimbal wobble
    starship/             three.js (cfg, hooks) builds booster.js (skin, frost, fins, bells), jets.js (33 jet shader), flame.js (trench flame volume)
                          and site.js (Starbase: land, water, mount and trench, towers, tank farm); runs in isolated()
  debug/globals.js        test bridge: every main-chunk export and state key on window
```

Frame: `frame(t)` → `seqTick` → `keys` → `update` → `misTick` → `audio` → 2D `draw` or `G3.render` → `gauges` → `G3.overlay` → `seqCap` → REC.

### Machine table entry (`MC[i]`, `machines/<name>/machine.js`) — key fields

`n` title, `btn` chip label, `sub` subtitle, `hint`, flags `need3d, space, warp, orbit, hover, nozzle, sky, inset, spike`, `insetF` (inset drawer).
Hooks: `clu(dt)` per-frame machine step (Hall orbit, Saturn V, Harrier hover, NK-12, sky crane, Starship), `reset()` (runs for every machine on any switch), `onSelect()` (sky crane), `seqPre()` (sky crane's SEQUENCE pre-step), `camA(view)`, `warpName(i)` (Hall).
Engine model: `idle, up, dn, coast, cN, cT, tk, ign, lk, e0f, lt, ab, stall, e:[EGT curve], f:[fuel curve]`.
UI: `g` (3 gauges: `{t,cap,min,max,maj,mn,red,d,f}`), `gv()` values, `lv`/`lv2` lever labels `[text,pos,'t'|'b']`, `lp()` lamps, status words `off/st/cl/cut/wait`.
Feel: `shk()` camera shake strength (currently switched off for every machine: `SHAKE = 0` in `core/util.js`; it was a stylistic cue, not a measured effect), `au(s,V,pm)` audio voice.
Game: `mission:{name, brief, tag, share(r), start(rng), end(), judge(), over(t)}` (sky crane): `start` sets the attempt's conditions from a seeded generator (never `Math.random`), `end` restores free play, `judge()` returns null until there is a verdict `{ok, title, why, rows:[[label,value]], score}`, `over(t)` says when to show the card (t = seconds since the verdict), `tag` names it in the share line and `share(r)` gives the line's detail. ◆ MISSION (and FLY AGAIN) starts today's daily challenge: the same conditions for everyone on the same date, tries counted; `misStart(seed)` with a seed (tests) is not a daily try. `?m=7&daily`, the link in the share line, starts it as soon as the engine runs. A machine with a mission shows ◆ MISSION in place of its FAULTS button (it has no stall); slow-mo is locked during a mission; SEQUENCE, machine switch and END MISSION stop it.
Story: `sqc` + `sq[]` SEQUENCE steps (`{cap, lever|()=>, dur, wait, until(), max, view, do()}`), `info:{f:[facts], a:[approximations], cut:string|array, s:[[title,url]]}` (a string `cut` gets the shared SCHLIEREN/THERMAL paragraphs appended).
2D-only: `nxf, r, gl, skyG, hzk, hzg, hza, blk, mc, dk, bl, bd, pl, draw, rear`.

### 3D side (`machines/<name>/three.js`) — fields

`cfg:{box:[len,radius], sc, sh, cams:[[pos,target,halfWidthFit] x3 or 4], mt, space?, mars?, land?, shD?, shF?, drone?}` (`land`: the machine builds its own ground and horizon, so the shared ground, mountains and trees are hidden; `shD`/`shF`: sun distance and shadow far plane for scenes bigger than the default 60/120 m; views: 0 SIDE, 1 CLOSE-UP, 2 REAR, 3 EARTH for the machine in orbit, 4 DRONE for the others; `drone:{t,d,el,hw}` tunes the circling drone: target, distance, elevation in radians, half-width to keep in frame; defaults come from the SIDE preset; while it flies, the camera's near plane moves out to 1 m so distant pads don't z-fight with the ground), `build()` → `{G, E, anchor, lens, labels, flow, upd(dt), P?, keep?}` (`keep`: every object any hook moves, shows/hides or re-materials; see the static-parts rule) (`P`: the machine's own volume mesh for the half-res plume pass, shown only while it is selected, e.g. Starship's trench flame) (plume runs along `anchor`'s local +X; labels/tracers in `E`'s local coords), `plume(u,fl)` → `[lightIntensity, lightColour]` (sets plume uniforms), `emit(dt,ax)`, `thermal(amb,nn,fh)`, `flame()` (flame-light position). Optional: `thFh(nn)`, `thR:[cold,ground]`, `flap()`, `inner()` (metal glow), `flowStr`, `flowSize`, `flowSpeed()`, `cam(P0,T0)` (Hall's EARTH view), `portrait` (swing round on portrait phones), `burst` (stall fireballs). A hook a machine leaves out gets the shared default.

### Rules the split relies on

- **Load order.** Modules do no work when they load except build constants. Listeners and DOM setup go in a module's `wireX()`, called from `main.js` in v11's order. Every three.js object is created inside `init3D` (`createX()` / `build()`), in v11's order: object ids and the random numbers three draws for UUIDs depend on it.
- **Import cycles exist** (the machine table, controls and renderer modules reference each other). Anything read *while modules are loading* must be a function declaration; a `const` or default export read that early is silently `undefined` in the bundle. That's why `M3` is filled by `loadM3()` and `jet3d.js` exports only functions.
- **Three.js stays out of the main chunk.** `npm run build` runs `tools/check-chunks.mjs`, which fails if the entry chunk reaches three, `render3d/` or a machine's `three.js` (`?r=2d` must never download three).
- **A big builder runs in `isolated()`** (`render3d/kit.js`): its own seeded `Math.random`, so the UUIDs and textures it draws don't shift the random numbers every other machine gets. Starship does this; a new machine with a large model should too.
- **Shaders must not produce NaN on real GPUs.** Software rendering (all automated tests) hides it, but on Direct3D a NaN pixel shows black and bloom smears it. Avoid `pow`/`sqrt` of values that can reach 0 or go negative, and divisions that can reach 0/0. To test on this machine's real GPU, launch Playwright's Chromium with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist` (no SwiftShader flags).
- **Static parts are merged and frozen** (`render3d/merge.js`, for phones, where every draw call and matrix update costs main-thread time). Everything in a machine's group that isn't in its build's `keep` (or under a kept object, relative to it) is treated as never moving: its meshes are merged per material and its matrices frozen (`matrixAutoUpdate = false`). A kept object is its own rigid part, so its static children merge under it and still move with it. Changing a material's properties is fine (merged meshes share it); moving, hiding or swapping the material of a non-kept object is not. `npm run check` catches it ("static part changed (add it to keep)", naming the object). `?nomerge` turns the pass off for comparison.
- `npm run lint` (ESLint `no-undef`): a forgotten import would otherwise silently resolve to an element with that id (`hd`, `trk`, `tq` are both).

**To add a machine:** create `src/machines/<name>/machine.js` (default export = the MC entry; its sim, voice, inset) and `src/machines/<name>/three.js` (default export `{cfg, build, plume, emit, thermal, flame, ...}`; list what its hooks move in `keep`), then add it at the same position in `machines/index.js` and `machines/three.js`. Add its sources to `info.s` and `docs/SOURCES.md`, and its expected SEQUENCE outcome to `OUTCOME` in `tools/check.mjs`. New ground types or scene sets go in `render3d/ground.js` / `render3d/scenes.js`.

## Hosting

Live at https://kkbosu.github.io/throttle-up/ (GitHub Pages, repo `kkbosu/throttle-up`, public). The local remote uses the SSH alias `git@github.com-dev:kkbosu/throttle-up.git` (a `~/.ssh/config` host for the right account).
- `.github/workflows/deploy.yml`: every push to `main` runs lint, format check and `npm run check` (which builds the site) in headless Chromium, then publishes `dist/` to Pages; pull requests get the checks only. One-time repo setting: Settings > Pages > Source: GitHub Actions.
- Sharing: `index.html` has the description, Open Graph / Twitter tags (absolute URLs to the live site) and the favicon. `public/` holds `favicon.svg`, `apple-touch-icon.png` and `og.png` (the 1200x630 preview, rendered from the game). Regenerate the PNGs with `node tools/site-images.mjs` when the visuals change (`--try <dir>` renders the candidate shots).

## Non-negotiable conventions

- **Credibility first.** Every user-facing fact in INFO must come from a source listed in that machine's `info.s` (see `docs/SOURCES.md`). Anything modelled, assumed or simplified goes in `info.a` ("WHAT IS APPROXIMATED"), stated plainly. Don't state numbers you can't source (e.g. NK-12 propeller rpm, sky-crane descent stage mass are deliberately not claimed as fact).
- Physics should be right in direction and order of magnitude even when simplified (e.g. Hall: thrust pushes the craft opposite to the beam; Earth slides away beneath in the beam's direction).
- Keep the 2D fallback working for machines 0–2 (`?r=2d`), and degrade gracefully when WebGL2 or the CDN fails.
- Mobile matters: portrait phones, phones held sideways, two-lever layouts, insets must not overlap gauges. Test at 390×780 and 734×283 (a phone sideways in Chrome). Screens under 480 px tall get a compact title, hint and buttons (`style.css`), and the dials shrink to the room left above the buttons (`fitDials()` in `hud/gauges.js`, down to 40 px).
- Captions/lamps are short (lamps fit ~9 characters).
- Sound is synthesized (Web Audio) — no recordings yet.

## Testing

URL params: `?m=N` machine, `?q=0|1|2` quality, `?r=2d` force 2D, `?manual` stop the render loop so tests drive frames, `?fps` frame-time readout under the title (fps, average and 95th-percentile frame time over 2 s; JavaScript time per frame, triangles and draw calls; quality level, render size, GPU name; `hud/fps.js`), for real-device reports; `?nomerge` skips the static-parts pass (`render3d/merge.js`) to compare; `?daily` starts the machine's daily MISSION once the engine runs.

Test hooks (in the page): `step(n, ms)` renders n frames at ms each (with sim update); fast-forward without rendering:
```js
(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}
```
`G3.snap()` jumps the camera to its target. Click `#ov span` to start the engine. `act('view'|'exp'|'scn'|'lens'|'seq'|...)` mirrors the buttons. In the Vite app these names reach `window` through the test bridge (`src/debug/globals.js`): state keys are readable and assignable (`view=1`), functions are callable but can't be replaced from outside.

**Behaviour checks (`npm run check`, about 2 min):** builds the app, serves it, and asserts that the game works, failing on any console or page error. Covers:
- every machine in 3D: engine reaches RUN; views cycle, with the button label checked; cutaway; lenses (Hall skips schlieren); scenes; INFO opens and closes;
- the sky-crane MISSION (`mission-m7`): button, seeded conditions in range and repeatable, a gentle landing scores, FLY AGAIN relights after the flyaway, the three failures (too fast, bridles not out, out of hydrazine), slow-mo locked, CLOSE restores free play, other machines hide the button; the daily challenge (day numbers, seed, tries and best kept, the card's daily line, the share line, SHARE copies it), and `?daily` (`daily-link-m7`);
- SEQUENCE runs to "Sequence complete." with a per-machine outcome: F-TYPE full afterburner, SR-71 Mach 2.8+, shuttle and NK-12 full power, Hall raises its orbit, Saturn V all five F-1s lit, Harrier lifts off, sky crane touches down, Starship lights all 33 at full throttle;
- machines 0–2 in 2D (`?r=2d`) and the fallback from `?m=3&r=2d` to F-TYPE;
- the compressor stall, deterministic in `?manual` mode. A slow ramp doesn't stall; a slam stalls with bangs and beeps and recovers; pulling back clears it early; FAULTS off prevents it;
- previous/next machine: the joined ◀ | MACHINE ▶ control and N / Shift+N, in 3D and 2D;
- the static-parts guard: in every 3D machine run, no merged or frozen part moves, hides or changes material;
- phones held sideways (734×283, 640×300, 844×390, and 734×283 with `?fps`): on every machine, also with a long hint, the dials/lamps/switch, inset, buttons, lever column, title and readout don't overlap and stay on screen;
- the hint text never runs under the lever column (tracks or labels) for any machine, even with the longest messages, on a 390×780 phone, an 800×600 window and 1280×720;
- a short real-time run, and the `?fps` readout (fills in at phone size, gauges below it; absent without the parameter).

`--only <regex>` picks scenarios; `--v11` runs the checks that apply to `legacy/throttle-up-v11.html` there (all pass; the navigation checks are skipped); `PAGE_URL` points at a running server. Unlike the golden suite it doesn't compare with v11, so it stays meaningful after intentional changes. Extend `OUTCOME` in `tools/check.mjs` when adding a machine. Shared Playwright setup (seeded random, CDN routing, build + preview) lives in `tools/harness.mjs`.

**Golden suite (Node Playwright, guards refactors):** `npm run snapshots` builds the app, serves it, and drives it through 41 scenarios, writing 333 screenshots plus `manifest.json` to `snapshots/golden` (it was the parity check for the Vite split against v11; `--v11` still records the legacy file). The scenarios cover:
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

Workflow: record the reference from a known-good commit (`npm run snapshots`), make the change, record again (`npm run snapshots -- snapshots/after`), then `npm run compare -- snapshots/golden snapshots/after`. A refactor that should not change behaviour must report 0 differences. When a change is *meant* to alter what you see or hear, review the diff images in `snapshots/after/_diff/` and the manifest differences (sim state should usually stay identical), then record the new reference. `--only <regex>` reruns selected scenarios into an existing folder; `compare --partial` compares only the scenarios a run contains. `snapshots/` is gitignored (about 6 min to record).

`legacy/tests/` holds the Playwright (Python) scripts used during development in a cloud sandbox with a software GPU, superseded by `npm run check` and the golden suite but kept for reference: `t10.py M OUT` screenshots a machine through views/lenses/scenes, `t10s.py OUT` runs SEQUENCE for machines 6 and 7, `t11s.py` runs Hall + sky crane sequences and checks the 2D chip list, `t10f.py` cycles all machines/scenes/quality and REC, `r10_stall.py 0` is the compressor-stall regression in 2D. They test the running Vite app (`npm run dev`, or set `PAGE_URL`). Needs `pip install playwright` and `playwright install chromium` (the repo's `.venv` has both). On a real GPU you can drop the SwiftShader flags in `h3.py`.

Real-device checks still outstanding: real GPU, mid-range Android, iPhone Safari, and listening on real speakers.

## Known issues

- Harrier and rover models are crude up close; Mars sunset blue glow is broad.
- Saturn V schlieren is busy where the plume meets the deflector.
- In the Hall EARTH view under the TERMINATOR scene the craft is a dark silhouette.
- Propellers are drawn slower than real (anti-strobe), stated in INFO.
- Starship's mount, tower and tank farm are blocky up close; its site is placed by eye (stated in INFO). Its scene is the heaviest (about 2x the software-rendered frame time of the others).
- Real phones (Mali-G52 Android, `?fps`): Starship was CPU-bound (JavaScript 33 of 43 ms a frame). After the triangle cut, the static-parts pass and CPU-aware auto quality (2026-10-22), JavaScript is about 10.5 ms, but the GPU now limits it to about 28 fps with auto quality at Q0 0.7 resolution (549×212 in landscape, blurry). Next step when this is picked up again: time the frame's GPU passes on this PC's real GPU (timer queries) and cut the costliest per-pixel work at low quality; suspects are the big blended steam sprites and Starship's site lights. The F-TYPE runs at about 50 fps on the same phone.
- Phones held sideways: the machine insets sit beside the dials, in the middle of the screen, so on a small phone they cover part of the machine (as on desktop).

## Roadmap (agreed)

1. **Make it shippable**
   - ~~Split into a Vite project, one module per machine (sim + builder + config + info together), shared renderer/HUD/audio modules. Behaviour identical to v11 — compare screenshots before/after.~~ Done (branch `refactor/vite-split`): identical to v11 on the full golden suite.
   - ~~Git, then host on GitHub Pages; social preview image (Open Graph), favicon.~~ Done (live, see Hosting). Still open: privacy-friendly analytics (not chosen yet; needs Kingsley's choice and account, e.g. GoatCounter, Plausible, Cloudflare Web Analytics).
   - Real-device test pass and fixes (performance budget for mid-range Android). Partly done (2026-10-22 to 10-28): the `?fps` readout, the CPU work above, and the landscape layout. Deferred until later (Kingsley's call, 2026-10-28): Starship's GPU cost on the Mali-G52 (see Known issues), iPhone Safari, listening on real speakers.

2. **Game layer**
   - Missions with scores: ~~sky-crane soft landing~~ (first version done 2026-10-28: random start height and sink rate, limited hydrazine, score = softness + hydrazine saved; no wind, because Mars's air at ~0.016 kg/m³ makes gusts negligible against the stage's weight, stated in INFO; terrain not yet), Harrier ship-deck landing, Hall reach-an-orbit on least xenon, F-type stall-free run-up.
   - ~~Daily challenge (same seed for everyone) with a Wordle-style share line.~~ Done 2026-10-28 for the sky crane: ◆ MISSION plays today's conditions, the card counts tries and today's best, SHARE copies (or, on phones, shares) a score bar plus a `?m=7&daily` link. Not yet: a leaderboard (would need a server).
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
