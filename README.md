# Throttle Up

Throttle Up is a browser toy, on its way to becoming a game, where you push the throttle on real engines and machines and watch, hear and read what happens: an afterburning turbojet, the SR-71's J58, the Space Shuttle's RS-25, a Hall thruster on a spacecraft in Earth orbit, the five F-1s of a Saturn V first stage, the Harrier's Pegasus, the NK-12 turboprop and the Mars 2020 sky crane lowering Perseverance. Each machine runs on a simplified physics model with Three.js graphics, synthesized sound, a guided SEQUENCE walkthrough and an INFO panel that cites its sources (collected in [docs/SOURCES.md](docs/SOURCES.md)) and says plainly what is approximated. If 3D isn't available, the first three engines fall back to a 2D renderer.

Play it at **https://kkbosu.github.io/throttle-up/** (works best on a desktop or a recent phone with WebGL 2).

## Run it

Needs Node.js (LTS).

```
npm install
npm run dev        # http://localhost:5173/  (add -- --host to open it from a phone on the same Wi-Fi)
npm run build      # production build in dist/ (also checks Three.js stays out of the startup bundle)
npm run preview    # serves dist/ at http://localhost:4173/
npm run check      # builds, then plays every machine in a headless browser and fails on any error
```

The built page needs a web server (ES modules don't run from `file://`). URL parameters: `?m=0..7` machine, `?q=0|1|2` quality, `?r=2d` force the 2D renderer.

The code is a Vite project with no framework: shared modules for the engine model, HUD, audio, sequence player, INFO panel, recorder and the 3D renderer, and one folder per machine in `src/machines/`. `CLAUDE.md` describes the structure. `legacy/throttle-up-v11.html` is the original single-file version it was split from (it still runs from disk, with Three.js from a CDN); `npm run snapshots` compares the two pixel for pixel.
