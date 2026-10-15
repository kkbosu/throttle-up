# Throttle Up — project guide for Claude Code

Throttle Up is a browser toy (heading toward a game) where you throttle up real engines and machines and watch, hear and read what happens. Owner: Kingsley. Goal: host it publicly, make it credible ("not taken for a joke"), and give it a real chance of spreading on social media.

**Source of truth right now:** `throttle-up-v11.html`, a single self-contained file (about 227 KB, 2,000 lines). It runs straight from disk; Three.js comes from the jsDelivr CDN through an import map. The first job in this repo is to split it into a proper project **without changing behaviour** (see Roadmap).

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

## Architecture of the single file

Three `<script>` blocks:

1. **Import map** for `three@0.160.0` and its addons.
2. **Script 1 — simulation, 2D renderer, HUD, audio, UI** (classic script, globals).
   - Global sim state: `N` (spool/power 0..1), `A` (afterburner), `E` (EGT °C), `F` (fuel flow), `L`/`raw` (lever), `ph` (0 off, 1 starting, 2 running, 3 fuel off/run-down), `fu` (combustion 0..1), `ign`, `kick`, `hg` (metal heat glow), `simT`, `view`, `exposed` (cutaway), `scene`, `lens` (0 normal, 1 schlieren, 2 thermal), `mi`/`M` (machine index / entry).
   - Second lever: `raw2` (Harrier nozzles, sky-crane bridles), shown when `M.nozzle`.
   - Machine-specific state: `alt, vz, nz` (Harrier), `sicE[]` (Saturn V), `orb{}` (Hall orbit), `prp, beta` (NK-12), `sc{}` (sky crane).
   - `update(dt)`: generic engine model, then per-machine hooks `M.orbit → orbStep`, `M.clu(dt)` (custom step: Saturn V, NK-12, sky crane), `M.hover → hoverStep`.
   - `MC[]` — **the machine table. Everything that differs per machine lives in its entry** (see below).
   - Gauges, lamps, engine switch, insets (`spikeInset`, `orbitInset`, `hoverInset`, `propInset`, `craneInset`; chosen by `M.insetF` or flags), SEQUENCE player (`SQ`, `seqStart/seqNext/seqTick`), INFO panel (`showInfo`), REC clip recorder (canvas + WebGL composite → MediaRecorder), Web Audio synth (`initAudio`, per-machine voices `M.au`).
   - Frame loop `frame(t)` → `update` → 2D draw or `G3.render` → `gauges` → `G3.overlay` → `seqCap`.
3. **Script 2 — `init3D(T, X)`, the Three.js renderer.** Draws the sim; never changes it (exceptions: camera follow uses sim state).
   - Helpers: `lathe` (profiles run along local +X), `ring`, `box`, `cyl`, `pipe`, `beam`, `bladeRing`, `canvasTex`, materials `MT.*`, thermal categories `CAT` (material → 'case' / 'hot' / 'inner' / 'bell' / 'gnd' / 'cold' …).
   - Builders, one per machine, in `ENG[]` order: `buildF, buildSR, buildSS, buildHT, buildF1, buildHR, buildTP, buildSC`. Each returns `{G, E, anchor, lens, labels, flow, upd(dt)}`:
     - `G` group added to the scene; `E` the engine frame (labels and tracers are in E's local coords); `anchor` = nozzle exit, **plume runs along anchor's local +X**; `lens` = light-pole lens meshes for night; `labels` = `[text,[x,y,z],[dxPx,dyPx]]` shown in cutaway; `flow()` = cutaway tracer paths (`ax` axial keyframes `[x,rIn,rOut,temp]`, `cv` CatmullRom paths, `ring` electron rings); `upd(dt)` per frame.
   - `CFG[]` per machine: `box:[len,radius]` plume volume, `sc` shadow centre, `sh` shadow half-size, `cams:[[pos,target,halfWidthFit] x3 or 4]`, `mt` (1 = desert lakebed, 0 = grass + trees), `space`, `mars`.
   - Scenes: `SCN` (DUSK/DAY/NIGHT), `SCNS` (space: TERMINATOR/SUNLIT/ECLIPSE), `SCNM` (Mars: MIDDAY/AFTERNOON/SUNSET); `applyScene`, `sKey`.
   - Pipeline: scene → HDR render target with depth (MSAA at Q2) → **ray-marched volumetric plume** in a box at half res (stops at scene depth; alpha = heat) → composite pass (heat haze, plume, Schlieren/thermal modes) → bloom → ACES output.
   - `plumeParams(dt)` has one branch per machine setting plume uniforms (colour ramp `uC0..3`, shock diamonds, cluster mode `uCl/uO/uW` for multi-nozzle machines). `emitters(dt)` (particles: smoke, steam, dust kinds), `thermalU()` (per-machine temperatures for the thermal lens), `lensRender()` (material swap for lenses), `camera(dr)` (glide between presets, drag orbit, wheel zoom, `M.camA(view)` vertical follow, EARTH view for space).
   - Returns `{canvas, render, overlay, resize, surge, snap, R}` as `G3`.

### Machine table entry (`MC[i]`) — key fields

`n` title, `btn` chip label, `sub` subtitle, `hint`, flags `need3d, space, warp, orbit, hover, nozzle, sky, inset`, `insetF`, `clu(dt)`, `camA(view)`.
Engine model: `idle, up, dn, coast, cN, cT, tk, ign, lk, e0f, lt, ab, stall, e:[EGT curve], f:[fuel curve]`.
UI: `g` (3 gauges: `{t,cap,min,max,maj,mn,red,d,f}`), `gv()` values, `lv`/`lv2` lever labels `[text,pos,'t'|'b']`, `lp()` lamps, status words `off/st/cl/cut/wait`.
Feel: `shk()` camera shake, `au(s,V,pm)` audio voice.
Story: `sqc` + `sq[]` SEQUENCE steps (`{cap, lever|()=>, dur, wait, until(), max, view, do()}`), `info:{f:[facts], a:[approximations], cut:string|array, s:[[title,url]]}`.
2D-only: `nxf, r, gl, skyG, hzk, hzg, hza, blk, mc, dk, bl, bd, pl, spike, draw, rear`.

**To add a machine** today you touch: `MC` entry (+ sim/audio/inset functions in script 1), a `buildX()` builder appended to `ENG`, a `CFG` entry, and the `plumeParams` / `emitters` / `thermalU` / flame-position branches keyed on `mi`. The refactor should turn this into one module per machine.

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
`G3.snap()` jumps the camera to its target. Click `#ov span` to start the engine. `act('view'|'exp'|'scn'|'lens'|'seq'|...)` mirrors the buttons.

**Golden suite (Node Playwright, the parity check for the Vite split):** `npm run snapshots` drives `throttle-up-v11.html` through 38 scenarios and writes 290 screenshots plus `manifest.json` to `snapshots/golden`. The scenarios cover:
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

Check the Vite build with `npm run snapshots -- --serve snapshots/after` (it builds, starts `vite preview`, and runs the suite), then `npm run compare -- snapshots/golden snapshots/after`. That must report 0 differences. `--only <regex>` reruns selected scenarios into an existing folder; `compare --partial` compares only the scenarios a run contains. `snapshots/` is gitignored; regenerate it from v11 (about 6 min).

`tools/legacy-tests/` holds the Playwright (Python) scripts used during development in a cloud sandbox with a software GPU. They're a starting point, not a suite: `t10.py M OUT` screenshots a machine through views/lenses/scenes, `t10s.py OUT` runs SEQUENCE for machines 6 and 7, `t11s.py` runs Hall + sky crane sequences and checks the 2D chip list, `t10f.py` cycles all machines/scenes/quality and REC, `r10_stall.py 0` is the compressor-stall regression in 2D. Needs `pip install playwright` and `playwright install chromium`. On a real GPU you can drop the SwiftShader flags in `h3.py`.

Real-device checks still outstanding: real GPU, mid-range Android, iPhone Safari, and listening on real speakers.

## Known issues

- Harrier and rover models are crude up close; Mars sunset blue glow is broad.
- Saturn V schlieren is busy where the plume meets the deflector.
- In the Hall EARTH view under the TERMINATOR scene the craft is a dark silhouette.
- Propellers are drawn slower than real (anti-strobe), stated in INFO.
- All testing so far was software-rendered; performance on real phones unknown.

## Roadmap (agreed)

1. **Make it shippable**
   - Split into a Vite project, one module per machine (sim + builder + config + info together), shared renderer/HUD/audio modules. Behaviour identical to v11 — compare screenshots before/after.
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
- Before adding facts, find a source; record it in `info.s` and `docs/SOURCES.md`.
- Kingsley is a software developer (C#/.NET, Next.js), not an aerospace engineer — explain physics choices briefly in plain language when they matter.
