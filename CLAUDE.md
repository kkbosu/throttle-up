# Throttle Up — project guide for Claude Code

Throttle Up is a browser toy (heading toward a game) where you throttle up real engines and machines and watch, hear and read what happens. Owner: Kingsley. Goal: host it publicly, make it credible ("not taken for a joke"), and give it a real chance of spreading on social media.

**Source of truth:** the Vite project in `src/` (no framework, plain JavaScript, three@0.160.0 from npm). Run it with `npm install` once, then `npm run dev`; `npm run build` + `npm run preview` serves the production build. ES modules don't run from `file://`, so the built page needs a server (GitHub Pages is fine).

`legacy/throttle-up-v11.html` is the original single-file version the project was split from. It still runs from disk (Three.js from the jsDelivr CDN). The split was verified identical to it, pixel for pixel; since 2026-10-16 the game intentionally differs (EARTH view at high orbit, previous-machine control, heat haze kept off the nozzle, camera shake off, SR-71 spike inset shown), so it is kept for history and the golden reference now comes from the build (see Testing).

## Machines (index = `?m=` URL param)

| # | Button | What it is | 3D only | Special mechanics |
|---|--------|------------|---------|-------------------|
| 0 | F-TYPE | Generic afterburning turbofan on a test stand | no | afterburner detent at MIL, compressor stall (FAULTS) |
| 1 | SR-71 J58 | J58 with inlet spike, bypass tubes, start cart | no | simulated Mach drives spike position; stall |
| 2 | SHUTTLE | RS-25 on a vertical test stand | no | hydrogen burn-off igniters, steam |
| 3 | HALL | SPT-140-class Hall thruster on a Psyche-like craft in Earth orbit | yes | TIME WARP (1x / 1,000x / 100,000x), what-if orbit raising, EARTH view |
| 4 | SATURN V | Five F-1s on an S-IC stage on a static stand | yes | lever lights engines in the real 1-2-2 order (F-1 can't throttle) |
| 5 | HARRIER | Pegasus jump jet on a hover pad | yes | second lever = nozzle angle; vertical hover physics; MISSION (deck landing on an amphibious assault ship, scored) |
| 6 | NK-12 | Kuznetsov NK-12 turboprop, contra-rotating props, test stand | yes | constant-speed propeller (RPM holds, blade pitch coarsens), feathering |
| 7 | SKY CRANE | Mars 2020 descent stage lowering Perseverance, Jezero Crater | yes | Mars gravity, 8 MLEs (4 drop to ~1%), second lever = bridle payout, auto cut + flyaway; MISSION (soft landing, scored) |
| 8 | STARSHIP | Super Heavy booster (33 Raptor 3) static fire on Pad 2's launch mount at Starbase, on the Gulf coast | yes | lever lights the centre 3, middle ring and outer ring, then throttles all 33 from 40 to 100%; dual flame trench (fire and steam both ways); its own coastal site (beach, sea, lagoons, tank farm, Pad 1) |
| 9 | APOLLO LM | Apollo lunar module on its descent engine, the last hundred feet above the Moon | yes | Moon gravity; the lever is the rate-of-descent switch (one notch = 1 ft/s, UP 4 to DOWN 12) and a loop works the throttle inside 10 to 60% of 10,500 lb; callouts in the hint; contact probes, engine stop at touchdown; the site is a model of Tranquility Base (named craters from sources, the Sun and Earth where they stood) and the sim lands on its terrain; scene set LOW SUN / HIGH SUN / EARTHLIGHT; MISSION (start over Little West crater moving west, lean both ways to fly clear, stop the drift, land on level ground inside the gear limits before the bingo call, scored) |

Machines 0–2 also have a hand-drawn 2D canvas renderer (fallback). Machines with `need3d:1` are hidden when 3D is unavailable.

## Architecture

Top level: `index.html` + `src/` (the game), `tools/` (golden suite, compare, chunk check, `pages.mjs` + `pages.json`: a page per machine), `legacy/` (v11 and the Python tests from its development), `docs/SOURCES.md`.

`index.html` (markup) + `src/style.css` (design tokens at the top, then the DOM HUD) + `src/main.js`. The code was moved verbatim from v11 by scripts and then formatted with Prettier (`npm run format`; `.prettierrc.json`, 120 columns), so variable names are still v11's short ones (`N`, `E`, `fu`, `hg` ... see the state list below).

```
src/
  main.js                 boot: wires listeners in v11's order (wireX()), picks ?m, resize, loop, 3D loader
  core/state.js           `state`: every shared mutable variable (N, A, E, F, ph, raw, raw2, view, exposed, scene,
                          lens, mi, M, simT, alt, vz, ...) with its initial value. Code reads/writes state.N etc.
  core/params.js          ?q (QP), ?manual (MAN), ?fps (FPS), ?nomerge, ?daily (DAILY), ?vs (VS: a friend's result to
                          beat), ?m or the page's own machine (M0), PAGES + dailyLink() (the machines' own pages);
                          ?r=2d is read in core/loader3d.js
  core/util.js            $, cv/g (HUD canvas), mk, sm (smoothstep), label tables, MONO (the system monospace stack,
                          no longer used by the HUD)
  core/tokens.js          design tokens for canvas-drawn UI: T (colours by role, copied from style.css :root by
                          wireTokens() at boot), lbl(px, weight) / num(px, weight) font strings, fontsReady()
  core/engine.js          update(dt): generic engine model, stall/surge, master switch; M.clu(dt) per-machine step
  core/machine-switch.js  setMachine (resets, then every machine's reset() and the selected one's onSelect()), chips
  core/loop.js            frame(), adapt() (auto quality, 4 levels: Q2, Q1, Q0, Q0 at 0.7 resolution; CPU-bound
                          frames skip the resolution drops), step() test hook
  core/loader3d.js        load3D(): fetches three + the renderer chunk; ready3D/fail3D fall back to 2D
  hud/                    layout.js (resize), gauges.js (dials, lamps with warm-up and bulb check, engine switch, inset
                          placement), panel.js (insetFrame: the frame every inset shares), controls.js (lab and its
                          two-part keys, act, lever labels, START overlay, the T+ run clock: time since engine start, or the SEQUENCE's / MISSION's own time in amber), fps.js (?fps readout)
  input/lever.js          lever(s) with the MIL detent (the gate lights: #tq.latch), keyboard; while state.slide is set (Harrier deck landing) a
                          sideways drag on the view or ←/→ sets state.side (-1..1) and the camera stops orbiting; with state.slide 2 (lunar landing) a drag up/down or ↑/↓ also sets state.fwd, and W/S keep the lever
  audio/audio.js          Web Audio graph and one-shot sounds (per-machine voices live in the machine folders)
  sequence/sequence.js    SEQUENCE player (SQ, seqStart/Next/Stop/Tick/Cap)
  mission/mission.js      MISSION runner (MS, misStart(seed)/misStop/misTick, rng(seed), the result card #mis); the
                          machine's `mission` sets the conditions and judges; progress shows in the machine's inset.
                          Daily challenge: dayNo() (#1 = 2026-10-28, local date), daySeed(name, n), tries/best per day in
                          localStorage (`tu-daily-<name>`), shareText() (the SHARE line)
  mission/trace.js        the try's telemetry trace (TRC): two or three readouts sampled 10 times a second while a mission runs,
                          drawn as a strip chart on the result card and the clip (traceDraw); display only
  mission/clip.js         the mission's 9:16 clip (CL, clipStart/clipFrame/clipDrop/clipOpen): records each try on its
                          own 720×1280 canvas (3D view cropped 3:4 round the middle; title band with a run clock, readouts,
                          then the verdict panel with score and trace), ends
                          3.5 s after the verdict; the card's ▶ CLIP opens it in REC's CLIP READY panel (openClip)
  info/                   info.js (INFO panel), cut-text.js (the SCHLIEREN/THERMAL paragraphs)
  recorder/recorder.js    REC: WebGL + HUD composite into a MediaRecorder clip; recMime() and openClip() serve the
                          mission clip too
  render2d/               index.js (2D renderer: sky, haze, bloom, draw), jet.js (2D jet parts), sprites.js
  render3d/               lazy chunk, the only code that imports three:
    index.js              init3D(): loadM3(), then every createX() in v11's order; returns G3
    kit.js                renderer, materials MT, thermal categories CAT, textures, geometry helpers
                          (lathe along local +X, ring, box, cyl, pipe, beam, bladeRing, canvasTex ...; loft: a body
                          through cross-sections, for fuselages, hulls and pods; foil: a wing or fin with an aerofoil
                          section)
    sky, lights, scenes (SCN/SCNS/SCNM, applyScene; it also draws the environment map the metals reflect: sky,
                          lit ground, horizon band, and the Earth in orbit, once per scene change), ground, earth, props
    water.js              waveWater(): the sea's tiling wave normal map and material (Starship's Gulf, the Harrier's sea)
    plume.js              ray-marched volumetric plume shader; plumeParams() -> M3[mi].plume
    particles.js          pools (SPK, SMK, FIR, FLW), emitters() -> M3[mi].emit, burst()
    lenses.js             thermal/schlieren; thermalU() -> M3[mi].thermal
    composite, camera, flow (cutaway tracers), overlay (labels, legend), frame (render())
    assets.js             model files fetched before init3D (preload3D; AS.rover), so building stays synchronous
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
    lunar-module/         site.js (Tranquility Base without three.js: CRATERS, BOULDERS, siteH, siteSlope, the Sun's and Earth's
                          directions; the sim and the 3D ground both read it), machine.js (sim: lm, LM0, lmStep; thrust, mass and propellant from sourced numbers; state.alt is height above the ground below, lm.h above the datum), mission.js
                          (the lunar landing: seeded sink and drift, the gear's limits, the bingo call), inset.js, three.js
                          (the lander, the site's mesh and rocks, thruster puffs, built in isolated(); the shadow area follows the craft; dust is SMK kind 10, ballistic); inset.js is a map of the craters under the craft with its speed over the ground
    sky-crane/mission.js  the soft-landing MISSION (start conditions, hydrazine budget, verdict and score)
    harrier/mission.js    the deck-landing MISSION; harrier/machine.js has its physics (HRD: the jet's place relative to
                          the spot, deck heave, touchdown; DECK outline, onDeck), harrier/ship.js the ship and sea
                          (built in isolated(), shown only in the mission; the ship moves under the jet)
    shuttle/draw2d.js     the RS-25's 2D renderer
    shared/jet3d.js       3D hooks F-TYPE and SR-71 share;  shared/gimbal.js: RS-25/F-1 gimbal wobble
    starship/             three.js (cfg, hooks) builds booster.js (skin, frost, fins, bells), jets.js (33 jet shader), flame.js (trench flame volume)
                          and site.js (Starbase: land, water, mount and trench, towers, tank farm); runs in isolated()
  debug/globals.js        test bridge: every main-chunk export and state key on window
```

Frame: `frame(t)` → `seqTick` → `keys` → `update` → `misTick` → `audio` → 2D `draw` or `G3.render` → `gauges` → `G3.overlay` → `seqCap` → REC → `clipFrame`.

### Machine table entry (`MC[i]`, `machines/<name>/machine.js`) — key fields

`n` title, `btn` chip label, `slug` (its page's address, `/sky-crane/`), `v0` (the view it opens in; Starship: DRONE), `sub` subtitle, `hint`, flags `need3d, space, warp, orbit, hover, nozzle, sky, inset, spike`, `insetF` (inset drawer).
Hooks: `clu(dt)` per-frame machine step (Hall orbit, Saturn V, Harrier hover, NK-12, sky crane, Starship), `reset()` (runs for every machine on any switch), `onSelect()` (sky crane), `seqPre()` (sky crane's SEQUENCE pre-step), `camA(view)`, `warpName(i)` (Hall).
Engine model: `idle, up, dn, coast, cN, cT, tk, ign, lk, e0f, lt, ab, stall, e:[EGT curve], f:[fuel curve]`.
UI: `g` (3 gauges: `{t,cap,min,max,maj,mn,red,d,f}`), `gv()` values, `lv`/`lv2` lever labels `[text,pos,'t'|'b']`, `lp()` lamps `[text, lit, role]` (role: `go`, `live`, `warn` or `info`, a token name, not a hex colour), status words `off/st/cl/cut/wait`.
Feel: `shk()` camera shake strength (currently switched off for every machine: `SHAKE = 0` in `core/util.js`; it was a stylistic cue, not a measured effect), `au(s,V,pm)` audio voice.
Game: `mission:{name, brief, tag, share(r), start(rng), end(), judge(), over(t)}` (sky crane): `start` sets the attempt's conditions from a seeded generator (never `Math.random`), `end` restores free play, `judge()` returns null until there is a verdict `{ok, title, why, rows:[[label,value]], score}`, `over(t)` says when to show the card (t = seconds since the verdict), `tag` names it in the share line and the clip, `share(r)` gives the line's detail, `clip()` the clip's live readouts `[[label, value]]`, and `traceLab` + `trace()` the two or three quantities (names with units, and their current values) plotted on the result card and the clip. `vs(r)` gives the two whole numbers of a try that a challenge link carries and `vsText(a, b)` reads them back as words (see Beat this landing). ◆ MISSION (and FLY AGAIN) starts today's daily challenge: the same conditions for everyone on the same date, tries counted; `misStart(seed)` with a seed (tests) is not a daily try. `?m=7&daily`, the link in the share line, starts it as soon as the engine runs. A machine with a mission shows ◆ MISSION in place of its FAULTS button (it has no stall); slow-mo is locked during a mission; SEQUENCE, machine switch and END MISSION stop it.
Story: `sqc` + `sq[]` SEQUENCE steps (`{cap, lever|()=>, dur, wait, until(), max, view, do()}`), `info:{f:[facts], a:[approximations], cut:string|array, s:[[title,url]]}` (a string `cut` gets the shared SCHLIEREN/THERMAL paragraphs appended).
2D-only: `nxf, r, gl, skyG, hzk, hzg, hza, blk, mc, dk, bl, bd, pl, draw, rear`.

### 3D side (`machines/<name>/three.js`) — fields

`cfg:{box:[len,radius], sc, sh, cams:[[pos,target,halfWidthFit] x3 or 4], mt, space?, mars?, moon?, land?, bloom?, shD?, shF?, drone?}` (`moon`: the Moon's scene set, `SCNL` in `render3d/scenes.js`, black sky and no glow round the Sun; the machine entry's `moon: 1` names the scenes; `bloom`: a multiplier on the bloom, 0.15 on the Moon, where a bright ground must not light the sky) (`land`: the machine builds its own ground and horizon, so the shared ground, mountains and trees are hidden; `shD`/`shF`: sun distance and shadow far plane for scenes bigger than the default 60/120 m; views: 0 SIDE, 1 CLOSE-UP, 2 REAR, 3 EARTH for the machine in orbit, 4 DRONE for the others; `drone:{t,d,el,hw}` tunes the circling drone: target, distance, elevation in radians, half-width to keep in frame; defaults come from the SIDE preset; while it flies, the camera's near plane moves out to 1 m so distant pads don't z-fight with the ground), `build()` → `{G, E, anchor, lens, labels, flow, upd(dt), P?, keep?}` (`keep`: every object any hook moves, shows/hides or re-materials; see the static-parts rule) (`P`: the machine's own volume mesh for the half-res plume pass, shown only while it is selected, e.g. Starship's trench flame) (plume runs along `anchor`'s local +X; labels/tracers in `E`'s local coords), `plume(u,fl)` → `[lightIntensity, lightColour]` (sets plume uniforms), `emit(dt,ax)`, `thermal(amb,nn,fh)`, `flame()` (flame-light position). Optional: `thFh(nn)`, `thR:[cold,ground]`, `flap()`, `inner()` (metal glow), `flowStr`, `flowSize`, `flowSpeed()`, `cam(P0,T0)` (Hall's EARTH view), `portrait` (swing round on portrait phones), `burst` (stall fireballs). A hook a machine leaves out gets the shared default.

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
- A page per machine: `npm run build` ends with `tools/pages.mjs`, which writes `dist/<slug>/index.html` for each machine and `dist/<slug>/daily/index.html` for each mission from `tools/pages.json`: the built page with its own title, description and preview picture (`public/og/<slug>.jpg`, rendered by `node tools/site-images.mjs --pages`) and `<meta name="tu-m|tu-daily|tu-pages">` tags that `core/params.js` reads. A static host cannot vary a link's preview by `?m=`, so share links use these addresses (`.../sky-crane/daily/`); `?m=N` and `?m=N&daily` still work, and the dev server, which has no such pages, still writes them. A new machine needs an entry in `tools/pages.json`, a `slug` and a rendered picture.
- Sharing: `index.html` has the description, Open Graph / Twitter tags (absolute URLs to the live site) and the favicon. `public/` holds `favicon.svg`, `apple-touch-icon.png` and `og.png` (the 1200x630 preview, rendered from the game). Regenerate the PNGs with `node tools/site-images.mjs` when the visuals change (`--try <dir>` renders the candidate shots).

## Interface design (since 2026-11-10, branch `ui/polish`)

Direction: mission-control telemetry. Flat panels with square corners, small condensed capitals for labels, every number
in a monospace with its unit, one amber for live values, green and red for status only, blue for missions. Controls you
touch stay solid (the lever knob and its gate, keys that move when pressed).

- **One set of tokens.** `src/style.css` `:root` defines colour roles, the two typefaces, the type scale, spacing and
  timing. Canvas code reads the same values through `T`, `lbl()` and `num()` (`core/tokens.js`). Don't write a
  colour or font literal in UI code; add a token. (Colours that depict something, like the sea or the Earth in an inset,
  are drawing colours and stay where they are.)
- **Type.** IBM Plex Sans Condensed 500/600 for labels and text, IBM Plex Mono 600 for numbers, self-hosted from
  `@fontsource` (latin subset, about 55 kB of woff2), with fallbacks sized to match. The canvas HUD draws nothing until
  they have loaded (`state.fontOK`, 3 s timeout); the test harness waits for it too.
- **Three reading levels.** Glance: dial numerals, lit lamps, the verdict, the score. Rest: title, hint, key values,
  lever labels. Fine print: captions, units, key names, the daily line.
- **Keys.** Every button is the same part (`#ctl`, `#mch`, `#mis`, `#clip`, `#infx`): pressed, focus-visible, disabled
  and lit (`.on`: the thing it controls is on; `.run`: it would stop something running). A setting key holds two parts,
  name and value, but its text still reads `NAME: VALUE`, which the tests match. One solid green button per screen for
  the main action (START ENGINE, SHARE, SAVE). The machine selector's two arrows are one CSS triangle, mirrored; the
  ◀ ▶ characters stay in the text at no size. START and INFO are spans with `role="button"`, reachable by Tab and
  pressed with Enter or Space.
- **Motion marks state changes only**, and only with `transform` and `opacity`. Panels animate on the way in
  (`@keyframes rise`); `display` still flips at once and closing is instant, because the checks read `display` straight
  after a click. No endless animation on `#ov span` (Playwright waits for it to hold still). No `backdrop-filter`,
  blur, or animated shadow. `prefers-reduced-motion` makes everything instant.
- **Per-frame cost.** The lever knobs move by transform and are written only when they change; dial faces are cached per
  size and each dial draws one arc, one tick and one number a frame; the run clock writes once a second. `gauges()`
  still reads two layout rects a frame (as before this work).
- **Display state stays out of the sim.** Lamp warm-up, the bulb check and the trace read the sim and write nothing to
  it, and draw no `Math.random()`; the golden manifest's sim state did not change with this work.

## Visual overhaul (branch `visual/overhaul`, started 2026-11-10)

A pass on the machines, their scenes and the experience, one machine or area per commit, measured before and after with `tools/measure.mjs`. Rules it works under: at Q0 and Q1 no machine may cost more GPU time or draw calls than before (extra detail goes into textures or Q2), the sim does not change (golden manifest identical), no outside models without Kingsley's yes. Done so far: environment light, geometry diet, bell moire and worn-metal roughness, the Harrier and its ship (the pilot), the daily link's cover, lever names, the sky crane's hover start, and the view shift (below), and the Saturn V (42 m stage with markings, conical engine fairings, swept fins, tapered turbine exhaust manifold: `taperRing` in kit.js). Starship's booster was looked at and left: where its chines sit on this version has no source. The sky crane's rover is NASA/JPL-Caltech's Perseverance model (approved 2026-11-10): `tools/rover-model.mjs` turns the 11 MB GLB into `src/machines/sky-crane/rover.bin` (about 10,000 triangles, two draw calls, vertex colours, flat shading, 208 kB); `render3d/assets.js` fetches it before `init3D` (`preload3D`), and if it fails the hand-built rover stays. Any further outside model needs its own yes. The descent stage's facts were re-sourced from NASA's 2012 landing press kit after the Spaceflight101 page went offline: three fuel tanks (the model had four), about 387 kg of hydrazine, engines up to about 3,300 N, four shut off before the cords pay out. The sim's 3,060 N limit and 1% idle are now listed in INFO as approximations. The stage's frame and engine pods are unchanged. SR-71 and NK-12 were left: their cutaways already take the near half of the casing off the engine. The end-of-work package is `snapshots/final/index.html` (before/after sheets and the full performance table). Later the same week: Hall's EARTH view stands on the craft's sunlit side (it was a silhouette at the terminator); test-stand pads carry a baked contact shadow (`padTex(..., ao)`), which grounds the stands at the level that draws no shadows; the Mars sunset's glow is held near a dimmer Sun (`uBroad`, `uDisk` in the sky shader); the mission clip's crop follows `mission.aim()`. The dark streak beside the plume in drone views is the pad texture's scorch fan, not a fault. Looked at and not done: a dip to black on machine switch (a timed CSS fade on the 3D canvas risks non-repeatable reference screenshots), an in-game machine picker (it would change what the MACHINE key does, which the checks and the golden scripts rely on), Starship's blocky mount and tower, the descent stage's frame and pods, a real-phone pass over all of it. The wave map's anisotropic filter is off (it caused a moire lattice towards the horizon). A new model that replaces an old one keeps the random-number count the old one drew (build it in `isolated()` and draw the difference, as `HR_PAD` in `machines/harrier/three.js` does), so nothing built after it shifts; count with a `Math.random` wrapper up to `R3done`.

- **Beat this landing (2026-11-11).** A scored try's share line ends `Beat it: .../sky-crane/daily/?vs=15.772.68.41` (day, score, and the mission's two numbers). Opening it, the cover reads BEAT THIS LANDING · DAILY #15, 772 POINTS TO BEAT, their two numbers and TAKE THE CHALLENGE; START flies that day's conditions (`vsOn()`, `misStart()` in `mission/mission.js`); the card (`#misvs`) and the clip say YOU WIN BY n / n SHORT / THEIRS STANDS, and SHARE reads SEND IT BACK after a win. The numbers are whatever the sender's link says and are never shown as checked. A challenge from another day is counted for the visit only and leaves today's stored tries and best alone. Not done: a line in the inset during the flight, and a clip that starts late so it lasts 10 seconds.
- **The cover knows a daily link.** A daily or challenge cover shows no machine chips. The cover's small line says what the site is ("Real engines you can run. Every fact sourced. Sound on.").
- **In a sky crane mission the camera stays on the rover after touchdown** (`SKY0.hold`), so the card and the clip's last frame show it; in free play and SEQUENCE the camera still follows the flyaway.
- **The rover model's download starts with the 3D code's** (`core/loader3d.js`), not after it. It is still fetched for every machine, because all nine are built at once.
- **The cover knows a daily link.** `cover()` in `hud/controls.js` sets the START overlay's text: with `?daily` on a machine that has a mission it reads DAILY CHALLENGE #n, the mission's brief and START THE CHALLENGE; otherwise the machine's title and START ENGINE. Tests still click `#ov span`.
- **Lever names.** A two-lever machine gives `lvn: [main lever, second lever]` (THROTTLE, NOZZLES / BRIDLES); the names stand over the tracks (`#trk::before`, from `data-n`).
- **The machine sits where the HUD isn't.** `viewShift()` in `hud/gauges.js` finds the biggest area the HUD leaves free and `render3d/camera.js` shifts the camera's lens towards it (`setViewOffset`: the picture keeps its size and perspective; shaders that use world positions and depth are unaffected). The mission clip's crop moves with it. With the HUD hidden there is no shift.
- **The camera swings round the machine between views** (bearing, height angle and distance each ease; the aim point moves straight), and cuts when the system asks for reduced motion.
- **Share loop.** On a phone, SHARE on the result card sends the try's clip with the share line when the clip is ready and the phone can share files, otherwise the line alone. The clip's footer carries the `?m=N&daily` link on a daily try. Not checked on a real phone.
- **First-run tips.** `tips()` in `hud/controls.js`: after 20 s of an engine simply running the hint names one key to try and the key lights (`.tip`), then two more 14 s apart (VIEW, CUTAWAY, SEQUENCE); once per visitor (`localStorage` `tu-tips`); never in a SEQUENCE or MISSION, on `?daily`, or under `?manual`.
- **The sky crane's free play begins in a hover** (the throttle goes to the hover setting as the engines reach RUN); a `?daily` link and SEQUENCE are left alone.

## Non-negotiable conventions

- **Credibility first.** Every user-facing fact in INFO must come from a source listed in that machine's `info.s` (see `docs/SOURCES.md`). Anything modelled, assumed or simplified goes in `info.a` ("WHAT IS APPROXIMATED"), stated plainly. Don't state numbers you can't source (e.g. NK-12 propeller rpm, sky-crane descent stage mass are deliberately not claimed as fact).
- Physics should be right in direction and order of magnitude even when simplified (e.g. Hall: thrust pushes the craft opposite to the beam; Earth slides away beneath in the beam's direction).
- Keep the 2D fallback working for machines 0–2 (`?r=2d`), and degrade gracefully when WebGL2 or the CDN fails.
- Mobile matters: portrait phones, phones held sideways, two-lever layouts, insets must not overlap gauges. Test at 390×780 and 734×283 (a phone sideways in Chrome). Screens under 480 px tall get a compact title, hint and buttons (`style.css`), and the dials shrink to the room left above the buttons (`fitDials()` in `hud/gauges.js`, down to 40 px).
- Captions/lamps are short (lamps fit ~9 characters).
- Sound is synthesized (Web Audio) — no recordings yet. Keys and the engine switch click (`click()` in `audio/audio.js`), only on a real press, not when tests call `act()`.

## Testing

URL params: `?m=N` machine, `?q=0|1|2` quality, `?r=2d` force 2D, `?manual` stop the render loop so tests drive frames, `?fps` frame-time readout under the title (fps, average and 95th-percentile frame time over 2 s; JavaScript time per frame, triangles and draw calls; quality level, render size, GPU name; `hud/fps.js`), for real-device reports; `?nomerge` skips the static-parts pass (`render3d/merge.js`) to compare; `?daily` starts the machine's daily MISSION once the engine runs.

Test hooks (in the page): `step(n, ms)` renders n frames at ms each (with sim update); fast-forward without rendering:
```js
(s)=>{for(let t=0;t<s;t+=.05){seqTick(.05);keys(.05);update(.05)}}
```
`G3.snap()` jumps the camera to its target. Click `#ov span` to start the engine. `act('view'|'exp'|'scn'|'lens'|'seq'|...)` mirrors the buttons. In the Vite app these names reach `window` through the test bridge (`src/debug/globals.js`): state keys are readable and assignable (`view=1`), functions are callable but can't be replaced from outside.

**Behaviour checks (`npm run check`, about 2 min):** builds the app, serves it, and asserts that the game works, failing on any console or page error. Covers:
- a machine's own page (`page-sky-crane-daily`, `page-starship`) and a friend's challenge link (`beat-m7`: the cover, that day's conditions, who won, the answer's link, today's record untouched);
- every machine in 3D: engine reaches RUN; views cycle from the machine's opening view, with the button label checked; cutaway; lenses (Hall skips schlieren); scenes; INFO opens and closes;
- the sky-crane MISSION (`mission-m7`): button, seeded conditions in range and repeatable, a gentle landing scores, FLY AGAIN relights after the flyaway, the three failures (too fast, bridles not out, out of hydrazine), slow-mo locked, CLOSE restores free play, other machines hide the button; the daily challenge (day numbers, seed, tries and best kept, the card's daily line, the share line, SHARE copies it), the 9:16 clip (CLIP waits, then a 720×1280 clip opens in the CLIP READY panel; CLOSE drops it), and `?daily` (`daily-link-m7`);
- the Harrier deck landing (`mission-m5`): the ship comes out, a sideways drag on the view and ←/→ steer (and spring back), seeded conditions in range and repeatable, a careful landing on the spot scores, the three failures (in the sea, into the ship's side, too hard), CLOSE puts the jet back over its pad;
- the lunar landing (`mission-m9`): seeded conditions in range and repeatable, a landing flown clear of the crater scores, left alone it overloads the gear, down on Little West's wall is TOO STEEP, leaning steers both ways and ↑ leans without moving the lever, hovering down to the 20-second point is BINGO, CLOSE restores free play;
- SEQUENCE runs to "Sequence complete." with a per-machine outcome (the lunar module lands inside the gear limits): F-TYPE full afterburner, SR-71 Mach 2.8+, shuttle and NK-12 full power, Hall raises its orbit, Saturn V all five F-1s lit, Harrier lifts off, sky crane touches down, Starship lights all 33 at full throttle;
- machines 0–2 in 2D (`?r=2d`) and the fallback from `?m=3&r=2d` to F-TYPE;
- the compressor stall, deterministic in `?manual` mode. A slow ramp doesn't stall; a slam stalls with bangs and beeps and recovers; pulling back clears it early; FAULTS off prevents it;
- previous/next machine: the joined ◀ | MACHINE ▶ control and N / Shift+N, in 3D and 2D;
- the static-parts guard: in every 3D machine run, no merged or frozen part moves, hides or changes material;
- phones held sideways (734×283, 640×300, 844×390, and 734×283 with `?fps`): on every machine, also with a long hint, the dials/lamps/switch, inset, buttons, lever column, title and readout don't overlap and stay on screen;
- the hint text never runs under the lever column (tracks or labels) for any machine, even with the longest messages, on a 390×780 phone, an 800×600 window and 1280×720;
- a short real-time run, and the `?fps` readout (fills in at phone size, gauges below it; absent without the parameter).

CI runs on Linux, where fonts can measure differently (a text element with `line-height: normal` takes its height from the face's metrics, which differ between platforms; give UI text a fixed line height). To reproduce a CI failure on this PC, run the checks in Playwright's Linux image (Docker Desktop is installed): `docker run --rm -v "D:\CSE\Projects\throttle-up:/src:ro" mcr.microsoft.com/playwright:v1.64.0-noble bash -c "mkdir /w && cd /src && tar --exclude=node_modules --exclude=dist --exclude=snapshots --exclude=.venv --exclude=.git -cf - . | tar -xf - -C /w && cd /w && npm ci && npm run check"` (match the tag to the installed Playwright).

`--only <regex>` picks scenarios; `--v11` runs the checks that apply to `legacy/throttle-up-v11.html` there (all pass; the navigation checks are skipped); `PAGE_URL` points at a running server. Unlike the golden suite it doesn't compare with v11, so it stays meaningful after intentional changes. Extend `OUTCOME` in `tools/check.mjs` when adding a machine. Shared Playwright setup (seeded random, CDN routing, build + preview) lives in `tools/harness.mjs`.

**Real-GPU measurements (`node tools/measure.mjs`):** frame cost per machine, quality level, view and viewport (GPU time from timer queries, triangles, draw calls) into `snapshots/perf/<label>.md`; `--passes` times each render pass; `--shots <dir>` screenshots every view and scene at Q2 and Q0 with contact sheets. It runs on this PC's GPU (Direct3D), where a frame costs about 1 ms, and GPU time varies by up to 40% between runs: trust triangles and draw calls exactly, GPU time only for large changes. `PAGE_URL` points it at a running server (`npx vite --port 5199` serves the source without touching `dist/`).

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

Real-device checks still outstanding: real GPU, mid-range Android, iPhone Safari, and listening on real speakers; the mission clip's cost on a phone, and that its MP4 plays in TikTok/Reels/Shorts. Tests run as a desktop, so they record WebM; MP4 is only asked for on phones (see Known issues).

## Known issues

- Desktop Chrome can crash the tab ("Aw, Snap!", STATUS_BREAKPOINT) the moment a MediaRecorder starts with an H.264
  type (`avc1` in MP4, or `video/webm;codecs=h264`). Found 2026-11-10 on Kingsley's Chrome 156 (Windows, Intel Arc): a
  bare test page does it too, in his normal profile and in incognito, but not in a fresh profile, under Playwright or with
  DevTools open, so tests never see it. A page cannot catch it, so `recMime()` records WebM on desktop and asks for
  MP4 only where the pointer is coarse (phones). Whether Android Chrome is affected is not known.

- The mission clip's crop follows the point a mission names (`mission.aim()`, sky crane only) up and down; on a phone
  held upright the canvas is narrower than the crop, so it cannot re-centre sideways and the machine sits left of
  centre in the clip, where the view shift put it.
- The lever knob shows no number: the mock-up had a percentage on it, but the lever is not a percentage on every machine
  (kW on the Hall thruster, engines lit on the Saturn V).
- The START overlay shows one loading state (LOADING 3D...), not a list of steps: fetching the 3D code is the only step
  that takes time; building the models happens in the same instant it arrives.

- The rover is NASA's model in its driving pose (mast up, arm out), not folded as it was for landing (stated in INFO); the descent stage above it is still hand-built and crude. 
- The Harrier (rebuilt 2026-11-10: lofted fuselage, half-round intakes, elbow nozzles, aerofoil wings) has AV-8B proportions but is still drawn by eye: a plain canopy without its frame (a boxed frame read as two posts and was taken out), straight undercarriage legs.
- The Harrier MISSION's ship has a shaped hull and a fuller island but is still made of boxes, and from the default camera the jet can look over the deck while still off its edge (the inset's map shows the truth).
- Saturn V schlieren is busy where the plume meets the deflector.
- Propellers are drawn slower than real (anti-strobe), stated in INFO.
- A module that a machine's `machine.js` imports and that imports constants back from it (`lunar-module/mission.js`) is evaluated first: a top-level `const X = 3 * FT` there is NaN in the bundle. Use such constants only inside functions.
- The lunar module's scale (about 7 m tall) is set by eye; NASA's file has no stated unit. Its hand-built stand-in (the fallback and the cutaway) is drawn by eye. With ten machines the cover's chips leave one alone on a fourth row on an upright phone.
- Starship's mount, tower and tank farm are blocky up close; its site is placed by eye (stated in INFO). Its scene is the heaviest (about 2x the software-rendered frame time of the others).
- Real phones (Mali-G52 Android, `?fps`): Starship was CPU-bound (JavaScript 33 of 43 ms a frame). After the triangle cut, the static-parts pass and CPU-aware auto quality (2026-10-22), JavaScript is about 10.5 ms, but the GPU now limits it to about 28 fps with auto quality at Q0 0.7 resolution (549×212 in landscape, blurry). Next step when this is picked up again: time the frame's GPU passes on this PC's real GPU (timer queries) and cut the costliest per-pixel work at low quality; suspects are the big blended steam sprites and Starship's site lights. The F-TYPE runs at about 50 fps on the same phone.
- Phones held sideways: the machine insets sit beside the dials, in the middle of the screen. The view shift moves the machine into the strip between the inset and the levers, where on a two-lever machine it shares the space with the lever labels.

## Roadmap (agreed)

1. **Make it shippable**
   - ~~Split into a Vite project, one module per machine (sim + builder + config + info together), shared renderer/HUD/audio modules. Behaviour identical to v11 — compare screenshots before/after.~~ Done (branch `refactor/vite-split`): identical to v11 on the full golden suite.
   - ~~Git, then host on GitHub Pages; social preview image (Open Graph), favicon.~~ Done (live, see Hosting). Still open: privacy-friendly analytics (not chosen yet; needs Kingsley's choice and account, e.g. GoatCounter, Plausible, Cloudflare Web Analytics).
   - ~~Interface polish: tokens, type system, keys, lever, dials and lamps, START overlay, INFO, result card with trace, clip frame.~~ Done 2026-11-10 on branch `ui/polish` (see Interface design). Not yet checked on a real phone.
   - Real-device test pass and fixes (performance budget for mid-range Android). Partly done (2026-10-22 to 10-28): the `?fps` readout, the CPU work above, and the landscape layout. Deferred until later (Kingsley's call, 2026-10-28): Starship's GPU cost on the Mali-G52 (see Known issues), iPhone Safari, listening on real speakers.

2. **Game layer**
   - Missions with scores: ~~sky-crane soft landing~~ (first version done 2026-10-28: random start height and sink rate, limited hydrazine, score = softness + hydrazine saved; no wind, because Mars's air at ~0.016 kg/m³ makes gusts negligible against the stage's weight, stated in INFO; terrain not yet), ~~Harrier ship-deck landing~~ (first version done 2026-10-29: start in a hover off the port side, slide right over the deck and land on spot 5 of a heaving deck; the sideways control is a drag on the view or ←/→, so phones need no third lever; score = softness + accuracy + time). Dropped after a look: Hall reach-an-orbit on least xenon (the model's Isp rises with power, so full power is both fastest and most frugal) and F-type stall-free run-up (a steady lever never stalls). Sky-crane terrain also dropped (the real stage came straight down; it chose its spot earlier).
   - ~~Daily challenge (same seed for everyone) with a Wordle-style share line.~~ Done 2026-10-28 for the sky crane: ◆ MISSION plays today's conditions, the card counts tries and today's best, SHARE copies (or, on phones, shares) a score bar plus a `?m=7&daily` link. Not yet: a leaderboard (would need a server).
   - ~~One-tap vertical (9:16) clip export with score overlay for TikTok/Reels/Shorts.~~ Done 2026-10-28 for missions: every try records itself (title, daily number and try, live readouts, verdict and score); ▶ CLIP on the result card saves or shares it. Not yet checked on a real phone (recording costs a 720×1280 draw and a video encode each frame).
3. **Realism**
   - ~~Sound overhaul: blend CC0 recordings, pitch-shifted by RPM.~~ Dropped as a blanket plan (2026-11-11): free recordings were found for about four of the nine machines, and a phone speaker cannot play a rocket's rumble either way (`docs/BREAKOUT.md`, section 7). Still to do: listen on a phone's own speaker.
   - Better models (check NASA 3D Resources for Perseverance; check usage terms).
   - Flight mode: Saturn V / Shuttle ascent to orbit with staging.
   - ~~Machine 10: the Apollo lunar module's descent engine, with the landing as its mission.~~ Done 2026-11-11 (machine index 9, `?m=9`, `/lunar-module/`): every INFO number read from the NASA documents listed in `docs/SOURCES.md`. The lander is NASA's own model (approved 2026-11-11; "Apollo Lunar Module" from NASA 3D Resources, through `tools/rover-model.mjs ... --out src/machines/lunar-module/lander.bin --turn 1.5707963 --scale 1.4`: 15,800 triangles, one draw call, 284 kB, fetched with the rover before `init3D`); the hand-built one is the fallback and what CUTAWAY shows. The lever is the rate-of-descent switch, as the crews flew it. Since 2026-11-12 the site is Tranquility Base (`site.js`; sources in `docs/SOURCES.md`): West, Little West, Double and four smaller craters at their sourced sizes and distances, bearings and depths by eye where no source gives them, small craters scattered by a fixed sequence, the Sun at 11.4° in the east (LOW SUN), the Earth 23° from overhead (out of most views), a flat horizon. The craft leans both ways (10°, a game number) and shows thruster puffs; touchdown is on the terrain, and resting on more than 12° (a game rule) fails. The Moon's scenes set `halo` (the sky's glow round the Sun, `uGlow`). The clip was looked at: its aim keeps the landed craft below the verdict panel. Not done: turning the craft (yaw), leaning in free play (a drag there still orbits the camera), a look on a real GPU and a phone. Measured on this PC's GPU (2026-11-12, `snapshots/perf/d31d171.md`): cheap in GPU time and draw calls (11 at Q0), but the most triangles of any machine at Q0 (about 149,000, mostly the ground mesh, not reduced from Q2), so a coarser ground at Q0 is the lever if a phone struggles. Both model files are fetched whichever machine is opened.
4. **Launch**: the proposal Kingsley agreed to on 2026-11-11 is `docs/BREAKOUT.md` (mock-up in `docs/breakout/`). Frame it as an interactive explainer on Hacker News and Reddit and as a challenge on short video and X; time it to a real flight if one is near; no server for launch. Still needed first: analytics (GoatCounter or Cloudflare Web Analytics; Kingsley picks one and makes the account). Channels: Show HN, r/space, r/aviation, r/InternetIsBeautiful, aviation/space creators, led by a 10-second clip.

## Working style for this project

- Small, verifiable steps; run the page after every change. Keep diffs focused.
- Before committing: `npm run format`, `npm run lint`, `npm run check` (builds, so it includes the chunk check). For changes that shouldn't alter behaviour, also the golden suite (see Testing).
- Before adding facts, find a source; record it in `info.s` and `docs/SOURCES.md`.
- Kingsley is a software developer (C#/.NET, Next.js), not an aerospace engineer — explain physics choices briefly in plain language when they matter.
- **Subagents: spawn deliberately, and on the cheapest model that does the job as well** (Kingsley's rule, 2026-11-10).
  - Before spawning one, ask whether a few direct tool calls would do. Spawn only for real parallel work or a wide search.
  - Set the Agent tool's `model` on every spawn:
    - `haiku` for mechanical lookups (find a file, grep for usages, list where something is used);
    - `sonnet` for most delegated work (reading and summarising code, running and reading tests or screenshots,
      focused edits that follow a clear brief, research);
    - `opus` (or the session's own model) only when a cheaper one would do it worse: design and architecture calls,
      subtle shader, physics or rendering bugs, accuracy judgements on sourced facts, and reviews meant to catch what the
      main session missed.
  - Quality comes first. If a cheaper model's result is thin or wrong, redo it on a stronger one, and use the stronger
    one from the start next time for that kind of task.
  - Forks always run on the parent's model, so prefer a fresh agent with a clear brief when the work is simple.
