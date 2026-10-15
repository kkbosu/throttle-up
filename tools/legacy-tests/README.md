# Legacy Playwright tests

These were written while developing v6–v11 in a cloud sandbox that only had a software GPU (SwiftShader). They drive the page through its test hooks (`?manual`, `step()`, the fast-forward helper) and take screenshots. The real parity check is now the Node golden suite (`npm run snapshots`, see CLAUDE.md); these are kept as quick, scenario-specific checks.

They test the Vite app, which must be running: `npm run dev` (they default to `http://localhost:5173/`), or `npm run build` then `npm run preview` with `PAGE_URL=http://localhost:4173/`. ES modules don't run from `file://`.

Setup: `pip install playwright` then `playwright install chromium` (or use the repo's `.venv`). Run from this folder, e.g.:

```
python t10.py 7 out7        # screenshots of the sky crane (make the out7 folder first)
python t10s.py outseq       # SEQUENCE runs for NK-12 and sky crane
python t11s.py              # Hall + sky crane sequences, 2D chip check
python t10f.py              # cycles machines/scenes/quality, REC composite
python r10_stall.py 0       # compressor-stall regression in the 2D renderer (make a d7 folder first)
python sheet.py out7 sheet.png   # contact sheet of a screenshot folder
```

Notes:
- The page exposes its module variables and functions on `window` (`src/debug/globals.js`), so tests can still read and assign `view`, `raw`, `N`, call `step()` and so on. Functions can't be replaced from outside any more: `r10_stall.py` counts stalls, surge bangs and warning beeps by observing the page (`sT`, `navigator.vibrate(40)`, the 1100 Hz oscillator) instead of patching `startStall`/`bang`/`beep`.
- `h3.py` passes SwiftShader flags; on a machine with a real GPU you can remove them from `ARGS` for speed.
- Software rendering is slow, which is why screenshots use long timeouts and few frames.
