# Legacy Playwright tests

These were written while developing v6–v11 in a cloud sandbox that only had a software GPU (SwiftShader) and no direct CDN access. They drive the page through its test hooks (`?manual`, `step()`, the fast-forward helper) and take screenshots.

Setup: `pip install playwright` then `playwright install chromium`. Run from this folder, e.g.:

```
python t10.py 7 out7        # screenshots of the sky crane (make the out7 folder first)
python t10s.py outseq       # SEQUENCE runs for NK-12 and sky crane
python t11s.py              # Hall + sky crane sequences, 2D chip check
python t10f.py              # cycles machines/scenes/quality, REC composite
python r10_stall.py 0       # compressor-stall regression in the 2D renderer
python sheet.py out7 sheet.png   # contact sheet of a screenshot folder
```

Notes:
- All of them load `../../throttle-up-v11.html`. After the Vite refactor, point `h3.py` at the dev server URL instead (e.g. `http://localhost:5173/?...`).
- `h3.py` passes SwiftShader flags; on a machine with a real GPU you can remove them from `ARGS` for speed.
- If a local copy of three@0.160.0 exists at `tj/node_modules/three`, CDN requests are served from it; otherwise the page loads Three.js from the internet.
- Software rendering is slow, which is why screenshots use long timeouts and few frames.
