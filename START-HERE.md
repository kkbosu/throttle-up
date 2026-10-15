# Moving Throttle Up to Claude Code in VS Code

Everything in this folder is ready to become your project repo.

```
throttle-up-starter/
├─ CLAUDE.md              ← project guide; Claude Code reads it automatically
├─ START-HERE.md          ← this file
├─ throttle-up-v11.html   ← the current game (source of truth until the refactor)
├─ docs/SOURCES.md        ← every source behind the INFO panels, by machine
├─ tools/legacy-tests/    ← Playwright scripts used during development (optional)
└─ .gitignore
```

## 1. Install (once)

| Tool | Why | Where |
|------|-----|-------|
| VS Code 1.94 or newer | editor | code.visualstudio.com |
| Node.js LTS | runs Vite (dev server and build) | nodejs.org |
| Git | version control, deploys | git-scm.com |
| A GitHub account | hosting on GitHub Pages | github.com |
| Python 3 + Playwright (optional) | the old automated tests | `pip install playwright` then `playwright install chromium` |

The Claude Code extension works with a paid Claude plan (Pro, Max, Team or Enterprise) or a Claude Console account, with no API key needed.

## 2. Set up the folder

1. Unzip this folder somewhere sensible, for example `Documents/throttle-up`.
2. Double-click `throttle-up-v11.html` to check it runs in your browser (it needs internet for Three.js).
3. In VS Code: **File → Open Folder…** and pick the folder.

## 3. Install Claude Code in VS Code

1. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac), search **Claude Code**, and install the one published by Anthropic.
2. Open any file, then click the **Spark** icon at the top right of the editor (or in the left Activity Bar).
3. Click **Sign in** and finish in your browser.

Official guide: https://code.claude.com/docs/en/vs-code

## 4. First prompts (paste them one at a time)

**Prompt 1 — get your bearings and start version control**
> Read CLAUDE.md and START-HERE.md. Initialise a git repo, commit the current files as "v11 baseline", and give me a short summary of how the code is organised.

**Prompt 2 — the refactor (the big one; use plan mode so you can review first)**
> Split throttle-up-v11.html into a Vite project with no framework: one module per machine (its MC entry, sim/audio/inset functions, 3D builder, CFG entry, and its plumeParams/emitters/thermal branches), plus shared modules for the engine model, HUD, audio, renderer, scenes, sequence player, INFO panel and recorder. Keep behaviour identical. Keep the 2D fallback. Before changing anything, propose the folder layout and the order of steps. After the split, compare against v11 with screenshots of every machine.

**Prompt 3 — test on your phone**
> Start the dev server so I can open it on my phone on the same Wi-Fi, and tell me the address to type.
(Vite does this with `npm run dev -- --host`; it prints a "Network" address.)

**Prompt 4 — put it online**
> Create a GitHub repo for this project and deploy it to GitHub Pages with a GitHub Actions workflow on every push to main. Add an Open Graph preview image, a favicon, and a page title and description suitable for sharing.

**Prompt 5 — real-device pass**
> I tested on [device]. Here's what I saw: [notes or screenshots]. Fix the issues, starting with performance on mid-range Android.

Then continue with the roadmap in CLAUDE.md (game layer → realism → launch).

## Tips

- Commit after each working step, so you can always roll back.
- Keep `throttle-up-v11.html` in the repo until the refactored version matches it on every machine.
- For anything that adds facts, ask Claude to find and cite a source and add it to `docs/SOURCES.md` and the machine's INFO panel. Credibility is the brand.
- Big changes: ask for a plan first, read it, then say go.
