# How Throttle Up could break out

A proposal, written 2026-11-11 on branch `explore/breakout`. Nothing in the game was changed. The mock-up of the top idea is `docs/breakout/mockup.html`.

**How to read the evidence marks**

- **(P)** seen by playing the build of `main` (8d0c199) at 390×780 in headless Chromium. It renders in software, so nothing here says anything about frame rate on a phone.
- **(S)** from a source, linked. The research was gathered by three research agents on 2026-11-11 and I have not re-opened every page. Re-open a link before quoting its number in public.
- **(J)** my judgement.

**What I could not check:** I cannot hear the audio and cannot hold a phone. Everything about sound and phone performance is reasoned from the code, CLAUDE.md's measurements and research. Reddit blocks automated reading, so every subreddit rule below is second-hand: read each sidebar on the day you post.

---

## 1. Verdict

The honest answer is the one you said you'd rather hear: **the biggest gains are not game features.** Three of the five moves below are about what happens before and around the play. The game layer you have (two missions, a daily, a share line, a clip) is already more than most toys launch with. What it lacks is a good first contact and a reason to send the link to one particular person.

| # | Move | Kind | Size | Why it ranks here |
|---|------|------|------|-------------------|
| 1 | **Fix first contact**: what a shared link shows before START, and what the clip rests on at the end | not a feature | S | Every channel meets the project as a link card or a clip. Today every link has the same bare title and the same picture, and the clip can end on empty sky. |
| 2 | **"Beat this landing" links**: a shared result becomes a challenge to one friend | game | S to M | Turns each share from a boast into a task for a named person. No server. Reuses everything. |
| 3 | **Launch as an explainer first, a game second**, timed to a real launch, with analytics in place | not a feature | S | The best evidence of what works for this kind of thing on Hacker News is the interactive explainer, and one target subreddit bans web games outright. |
| 4 | **Land the Eagle**: the Apollo lunar module's descent engine as machine 10, with the landing as its mission | new machine | L | The best-sourced candidate found, the most recognisable "can you do what the crew did", and a share line that compares you with 1969. |
| 5 | **Starship on a phone, and a sound check by ear** | not a feature | M | The most recognisable machine is the slowest on a phone and hides its fire in the default view. Sound needs your ears, not a recordings overhaul. |

Not in the five, on purpose: new missions for the machines you already have. Six of the seven machines without a game sit on test stands, where a sequencer runs the engine and no operator skill exists to score (J). Section 5 says which one exception is worth a look.

### Decisions I need from you

1. **Analytics before launch?** Without it you cannot tell which channel or which machine worked. *Recommend: yes, GoatCounter or Cloudflare Web Analytics, both free at these volumes and cookie-free by their own account (section 9).*
2. **Push `main` now?** The live site is 27 commits behind and lacks the rebuilt Harrier, the NASA rover and the share-with-clip. *Recommend: yes, before any other work here.*
3. **Is the launch post "an interactive explainer of nine real engines" or "a daily game"?** *Recommend: explainer on Hacker News and Reddit, challenge on short video and X (section 2).*
4. **Build "Beat this landing" (move 2)?** *Recommend: yes, first.*
5. **Is the Apollo lunar module machine 10?** *Recommend: yes, after moves 1 to 3, and held for the launch if you can wait for it.*
6. **A server for "you beat 73% of today's players"?** *Recommend: not for launch. About $0 a month at 10k plays and $5 at 1M if you later want it (section 8).*
7. **The recordings plan in the roadmap?** *Recommend: drop it as a blanket plan. Free recordings exist for about four of nine machines (section 7).*

---

## 2. Who shares it, and why

| Channel | What makes someone stop | The shareable unit | Risk |
|---|---|---|---|
| **Hacker News** | Craft, accuracy and "I didn't know a browser could do this". Ciechanowski's explainers score 2,300 to 4,300 points; small-author browser toys that do well land around 200 to 450 (S: [HN search API](https://hn.algolia.com/api/v1/search?query=ciechanowski)). On his engine page, commenters praise clarity, the 3D you can turn, and an engine builder calling it accurate (S: [thread](https://hn.algolia.com/api/v1/items/26991300)). | The whole page, as a recommendation. Not a score. | The Show HN rules say "Don't post quickly-generated one-offs; anybody can do that now", and the guidelines ask for no generated text in posts (S: [showhn](https://news.ycombinator.com/showhn.html), [guidelines](https://news.ycombinator.com/newsguidelines.html)). Write the post yourself and be there to answer. Comments on 3D toys are dominated by phone crashes and heat (S: [a 446-point flight sim thread](https://hn.algolia.com/api/v1/items/49693971)). An HN reader will also check a source. |
| **r/space** | A real machine shown truthfully; news tie-ins. | A clip or the link, with a descriptive title. | Self-promotion is reported as banned or mods-only, and AI-generated content as banned (S, second-hand: [rankhog](https://rankhog.com/subreddits/space), [threadotter](https://www.threadotter.com/subreddit-rules/space); they disagree). Ask the mods first. |
| **r/aviation** | The Harrier and the SR-71; correct detail. | A clip of a deck landing. | Rules not verified at all. The Harrier is still "drawn by eye" (CLAUDE.md); this audience will say so. |
| **r/InternetIsBeautiful** | A site that is unusual and works at once. | The link. | **Rule 3 is reported as "webgames are not allowed. This includes quizzes, puzzles"**, plus a rule against slow sites (S, second-hand: [rankhog](https://rankhog.com/subreddits/internetisbeautiful)). Post it as the toy it is; do not lead with the daily. |
| **TikTok / Reels / Shorts** | A hook in the first 3 seconds (S: [TikTok's own advertiser guidance](https://ads.tiktok.com/resources/help/article/creative-best-practices)). Failure and near-misses (J; the KSP "failure is fun" evidence is design statements, not view counts). | The 9:16 clip with its score. | The clip starts at the start of the try, so its first seconds are a hover, not a hook (P). In-app browsers may not share files or download; Android WebView reports `canShare` false (S: [MDN data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json)). Not tested inside any app. |
| **X** | A build story from a person, or a striking 10 seconds. | Clip plus one line; a challenge to a named person. | No audience yet. The one browser flight toy that went huge had 187k email readers first (S: [levels.io](https://levels.io/full-multiplayer-python-websockets-game-ai)). |
| **Creators** | Something to react to on camera; something to be right about. | A deep link to a moment; a challenge. | No documented case found of an aviation or space creator sending traffic to a small web toy. Expect to ask them (J). |

**Patterns from the things that spread** (each is S unless marked):

1. **People share a result, not the product.** Wordle's grid came from a player who typed her result as emoji; the author built it in after ([Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success)). Sandspiel's unit is the saved creation with its own link ([author's write-up](https://maxbittker.com/making-sandspiel)).
2. **No barrier at all.** Website, no app, no sign-in. You already do this.
3. **Spread came through an audience or through creators**, not the thing alone: the Password Game went X, then HN, then streamers ([case study](https://howitspread.com/cases/the-password-game)).
4. **Dailies spike and fade.** Heardle fell from 69M to 41M monthly visits in four months and was shut down within a year ([TechCrunch](https://techcrunch.com/?p=2528275)). No rigorous evidence was found on what makes a daily last. (J: do not build the project's future on the daily.)
5. **Real events move interest more than content.** Kerbal Space Program hit its biggest player peak in ten years on the Artemis II launch ([GamesRadar](https://www.gamesradar.com/games/simulation/artemis-ii-launch-sends-legendary-astronaut-sim-kerbal-space-program-rocketing-to-its-biggest-steam-player-peak-in-10-years/), headline only).
6. **Odds.** Of about 4,700 Show HN posts matching "game" since 2024, about 170 passed 100 points (a rough proxy from the HN search API).

---

## 3. The loop as it is today, and where it breaks

**The first 10 seconds, arriving on a phone from a shared link**

- **Every link looks the same before it is opened.** The page title is the two words "Throttle Up", and the title, description and picture in a link preview are the same for all nine machines and for a `?m=7&daily` challenge link (P: `index.html`). A sky crane challenge arrives showing a Starship. A static site can fix this with one small HTML page per machine (section 6).
- **First load is about 1.25 MB of files**, of which three.js is 644 kB and the rover model 203 kB (P: sizes as served by the preview, before compression; three.js is 168 kB gzipped per the build log). **The rover is fetched for every machine**, including the F-TYPE, which never shows it (P).
- **The daily cover still shows all nine machine buttons** between the brief and START THE CHALLENGE (P). Nine ways to leave the challenge someone just sent you.
- **The cover never says what the site is.** A first-time visitor sees "AFTERBURNER. Afterburning turbofan. Push through the detent." (P). One line of pitch is missing.

**The first 3 minutes**

- **Starship's default view hides its fire.** At full throttle in SIDE on a phone, the flame is a small glow behind the mount; the trench fire that makes the picture is in DRONE, four presses of VIEW away (P). The most recognisable machine opens on its weakest shot.
- **The HUD takes most of a phone screen**: ten keys, three dials, lamps, a switch, an inset and one or two levers (P). The first-run tips help. Nothing tells a visitor that two machines have a mission unless they happen to land on one.
- **The sky crane mission teaches itself**: do nothing and you get HARD LANDING in 32 s with a clear reason; a good landing takes about 14 s (P). This is the right length.
- **The Harrier mission does not end if you do nothing**: after 124 s it was still hovering, no verdict (P). Its brief on a phone says "drag sideways (or ←/→)", and a phone has no arrow keys (P). At the start the jet is half off the left edge and the deck fills the view (P).

**The result and the share**

- The card, the bar of ten squares, the trace and SHARE all work (P). The share line reads well.
- **The clip can end on nothing.** The frame the sky crane clip was left on after a scored landing was the score panel over empty sky: no rover, no stage (P, one run, phone portrait, software rendering; check on a real device). A looping video rests on its last frame.
- The clip is the whole try: 14 to 30 s plus 3.5 s (P). The roadmap's launch clip is 10 seconds.

**The next day**

- Nothing calls anyone back except memory and someone else's share line. That is the honest state of a no-notification, no-account site, and I would keep it that way. The return path worth building is another person's challenge (move 2), not a reminder.

**A credibility nit an HN reader would find**

- The page description says "Every fact cites its source", but the F-TYPE's INFO lists no sources (P: 5 facts, 0 sources). It is a generic engine, so say that where the sources would be. Also the cover and INFO call it a turbofan while CLAUDE.md calls it a turbojet (P).

---

## 4. Shortlist

Seven ideas. New machines are in section 5.

### A. Beat this landing (top idea; mock-up in `docs/breakout/mockup.html`)

- **What the player does.** Opens a link a friend sent. The cover shows the friend's score and two numbers. They fly the same conditions. The card says who won and by how much. SHARE becomes SEND IT BACK and carries their own score.
- **Why it's fair and real.** Same seed, so the same start height, sink rate and hydrazine. The score is the one the mission already gives: touchdown speed against the real 0.75 m/s, and hydrazine saved.
- **What gets shared.** The existing four-line share text; only the link changes: `?m=7&vs=15.804.61.44` (day, score, touchdown in cm/s, kg left).
- **Build cost: S to M.** `core/params.js` (read `vs`), `hud/controls.js` `cover()` (challenge state, hide the chips), `mission/mission.js` (`misStart(daySeed(name, day))` for an older day, comparison on the card, the link), `mission/clip.js` (one line in the verdict panel), one line in each machine's inset, `tools/check.mjs`. Works for both missions.
- **Phone cost.** None.
- **Server.** No.
- **Risk to credibility.** Low. A score in a link can be typed by hand; between friends that does not matter, and the page should never present it as verified.

### B. One page per machine (first contact)

- **What it is.** `/saturn-v/`, `/sky-crane/` and so on: each a copy of `index.html` with its own title, description and preview image, opening that machine. Daily links get the challenge's own title ("Daily #15: land the Mars sky crane").
- **Why.** Link previews are the first contact on every channel, and a static host cannot vary them by query string.
- **Build cost: S.** A post-build script or Vite multi-page input; `tools/site-images.mjs` already renders shots. `?m=` keeps working.
- **Phone cost.** None. **Server.** No. **Risk.** None; it also helps search.

### C. The run's numbers (a fact to share)

- **What the player does.** Nothing extra. When a SEQUENCE ends, a small card totals what the run used and puts it in human terms: "10 s of all 33 Raptors at full power: about 235 t of propellant. The Hall thruster at full power would need about 550 years to use that." (Worked from the two machines' own gauges at full power: 18.4 + 5.12 t/s, and 13.6 mg/s. (P))
- **Why it's real.** It is arithmetic on flow rates the gauges already show, which INFO already sources. Each comparison names both machines. No new facts.
- **What gets shared.** One striking, checkable sentence with a link: the unit HN, Reddit and X actually pass round.
- **Build cost: S to M.** `sequence/sequence.js` (integrate flow over the run), a card reusing the `#mis` part, per-machine `sum()` in `machine.js`. The numbers must be checked against INFO for every machine.
- **Phone cost.** None. **Server.** No.
- **Risk.** Medium if careless: a cross-machine comparison multiplies two approximations. State it as "in this model".

### D. Links that open on a moment, and an embed

- **What it is.** The current machine, view, lens, scene, cutaway and lever position written into the URL by a COPY LINK key: "the J58 at Mach 3.2 in schlieren". `?embed` hides the cover's chips and the REC key for an iframe.
- **Who it's for.** Creators, teachers and journalists, who need to point at one thing.
- **Build cost: S** for links (state is already a handful of numbers), **M** for a tidy embed with its own layout checks.
- **Phone cost.** None. **Server.** No. **Risk.** None.

### E. One daily, not one per mission

- **What it is.** "The daily" is a single thing with one number; the mission behind it rotates by date. Today each mission has its own daily with the same number (P), which splits the conversation.
- **Build cost: S** in `mission/mission.js` (pick the mission from `dayNo()`), plus the cover.
- **Worth it only with three or more missions** (J). Park until a third exists.
- **Risk.** A link then means "today's", so yesterday's link must still open yesterday's mission (idea A's day number covers this).

### F. SR-71: hold the inlet

- **What the player does.** Accelerates to Mach 3.2 with the spike on manual, keeping the shock where it belongs. Get it wrong and the inlet unstarts: thrust drops on that side, the lamp lights, they recover and lose time.
- **Why it's real.** Inlet unstart was the SR-71's signature failure, and crews did fly the spike and doors by hand when the automatic control failed (J: from general knowledge; **I did not open a source for this**. The flight manual is public and must be read before this goes further).
- **What gets shared.** A clip of the unstart; the time to Mach 3.2.
- **Build cost: M.** A `mission` object for the SR-71, a second lever for the spike (the two-lever layout exists), the inset already shows the inlet.
- **Phone cost.** None. **Server.** No.
- **Risk.** Medium. The J58 here sits on a test stand with a "simulated Mach"; a mission makes that pretence carry more weight. If the unstart cannot be modelled from the manual's own numbers, drop it.

### G. "You beat 73% of today's players" (needs a server)

- **What it is.** After a daily try, one line of percentile from an anonymous histogram. No names, no table.
- **Cheapest honest option.** A Cloudflare Worker with a D1 table of score buckets per day per mission.
- **Monthly cost.** About **$0 at 10k plays, about $5 at 1M** (S: [Workers](https://developers.cloudflare.com/workers/platform/pricing/) and [D1](https://developers.cloudflare.com/d1/platform/pricing/) pricing pages, read 2026-11-11; arithmetic in section 8).
- **Privacy cost.** The server stores a score and a day. The provider still sees the player's IP address in passing, which EU law can treat as personal data, so the privacy note must say so (section 8).
- **Cheat risk.** A forged score moves a histogram very little and wins nothing, which is the point of showing a percentile and not a top ten. Bounds checks and a rate limit cost nothing.
- **Build cost: M.** A Worker (a second thing to deploy and watch), a fetch on the card, a fallback when it fails.
- **Risk to credibility.** Low if it stays a percentile. A named leaderboard would need replay checking, and the sim would have to give identical results in every browser's maths, which is unproven.

---

## 5. Machines it doesn't have yet

**The finding that shapes this section:** missions belong to machines that are *flown*. An engine on a stand has a sequencer, not a pilot. So the game layer grows by adding flown machines, not by inventing tasks for the RS-25 (J).

Scores are 1 to 5, higher is better; for the two cost columns, 5 means cheap. "Sources" is what a research agent actually opened, not an impression.

| Candidate | Known to HN / space / aviation / short video | Sources (opened) | New mechanic | 10 s clip | Phone cost | Build cost | Verdict |
|---|---|---|---|---|---|---|---|
| **Apollo LM descent engine** | 5 / 5 / 4 / 5 | 5: [NASA TM X-58040](https://ntrs.nasa.gov/api/citations/19700024568/downloads/19700024568.pdf) has throttle band, start, propellant budget | 4: fuel-limited landing with a throttle gap | 5 | 5: vacuum, no plume volume | 2 | **Top 3** |
| **Helicopter (Robinson R22)** | 3 / 2 / 5 / 4 | 4: [R22 handbook](https://www.aeronogaro.com/wp-content/uploads/sites/3987/2023/10/r22_poh_full_book_july2019.pdf), [FAA Helicopter Flying Handbook](https://www.faa.gov/sites/faa.gov/files/helicopter_flying_handbook.pdf) | 5: rotor rpm against collective; autorotation | 4 | 4 | 2 | **Top 3** |
| **Steam locomotive (UP Big Boy 4014)** | 4 / 2 / 3 / 5 | 4: [Union Pacific fact sheet](https://www.up.com/content/dam/upcom/migration/uprr/newsinfo/documents/up-pdf-nativedocs/pdf-up-media-4014-fact-sheet.pdf); wheel slip not yet sourced | 5: regulator plus cut-off | 5 | 3: steam and smoke are the costly kind of sprite | 1 | **Top 3** |
| X-15's XLR99 | 4 / 5 / 5 / 3 | 4: [NASA flight experience paper](https://ntrs.nasa.gov/api/citations/19710070145/downloads/19710070145.pdf) | 3: throttle 50 to 100%, restart rules | 4 | 4 | 2 | Strong fourth |
| Rolls-Royce Merlin | 4 / 2 / 5 / 5 | 4: [Spitfire II Pilot's Notes](https://www.rafjever.org/spitfirepic042.htm); start and detonation not found | 4: boost and rpm, 5-minute limit | 5 if the sound is right | 4 | 2 | Its whole appeal is a sound I cannot judge and no free recording was verified |
| NERVA / NRX reactor rocket | 5 / 5 / 2 / 3 | 4: [Westinghouse 1968 status](https://ntrs.nasa.gov/api/citations/19700004945/downloads/19700004945.pdf); sources disagree on dates | 5: power, flow and temperature in balance | 3 | 4 | 2 | HN bait; a test-stand machine, so no flown mission |
| CFM56 turbofan | 3 / 1 / 5 / 2 | 4 limits ([EASA data sheet](https://www.easa.europa.eu/en/downloads/7795/en)), 2 start | 2: close to the F-TYPE | 2 | 4 | 3 | Cut: adds little |
| Wärtsilä RTA96-C ship engine | 4 / 1 / 1 / 3 | 3: [maker's technology review](https://swiss-ships.ch/berichte/waertsilae/Wartsila-RTA96C-engine-technology-review.pdf) (mirror) | 2 | 3: scale | 4 | 2 | Cut: slow, simple skill |
| P&W R-4360 / radials | 2 / 1 / 5 / 3 | 3: a flight engineer's narrative, not a manual | 4: the start itself | 4 | 4 | 2 | Cut until a manual is found |
| Concorde's Olympus 593 | 4 / 2 / 5 / 4 | 3: an enthusiast site without sources; primary papers paywalled | 2: overlaps the SR-71 | 4 | 4 | 2 | Cut on sources |
| Shuttle / SLS solid booster | 4 / 5 / 3 / 5 | 3: listed, not opened | 1: no throttle at all | 5 | 2 | 3 | Cut: nothing to do |
| Falcon 9 landing burn | 5 / 5 / 3 / 5 | 2: throttle floor quoted as 40, 57 and 70% by different pages; nothing official | 4 | 5 | 3 | 2 | **Cut on sources**, however tempting |
| Top Fuel dragster, F1 | 3 / 1 / 2 / 5 | 2: the "11,000 hp" is an estimate, not a measurement | 3 | 5 | 3 | 2 | Cut on sources |
| ThrustSSC, V-2, pulsejet, scramjet, power-station turbine, electric motors | mixed | 1 to 2 | low | mixed | n/a | n/a | Cut on sources or nothing to operate |

### Top 3 in depth

**1. Land the Eagle: the Apollo lunar module's descent engine**

- **What it is.** The first throttleable crewed rocket engine, flown to the Moon's surface six times.
- **Key sources.** NASA TM X-58040, Bennett, "Apollo Lunar Descent and Ascent Trajectories" (1970): about 10,500 lb design thrust; a fixed high setting near 92.5 to 95.5%; throttleable 10 to 60% for approach and landing, with a gap between 60% and the fixed setting; lit at 10% and held 26 s; a propellant table with a low-level light and a call at least 20 s before depletion (S, as read by the agent). The Apollo Experience Report on the engine was listed but not opened. The famous "25 seconds of fuel left" is disputed in a secondary article; INFO must say so.
- **Mechanic and mission.** Throttle in the real 10 to 60% band, Moon gravity, a propellant budget, and a sideways drift to null with the drag control the Harrier mission already has. Score: touchdown speed, propellant left, in the terms the flight controllers used (seconds to the abort call).
- **Why it spreads.** Everyone knows the story. The share line compares you with the crew: "Down with 31 s to the call. Apollo 11 had less." NASA's air-to-ground audio is not under copyright (S: [NASA media guidelines](https://www.nasa.gov/multimedia/guidelines/index.html)), so the real "60 seconds" call can be in the clip. That answers the silence: an engine in a vacuum makes no sound outside, and saying so is the honest choice.
- **Build cost: L.** Sim (close to the sky crane's vertical model), a hand-built lander, a grey surface scene, INFO, mission, checks, golden scenarios. No outside model assumed; NASA publishes LM models, which would need your yes.
- **Phone cost: low.** No atmosphere, so no plume volume or smoke; dust only near the ground.
- **Pairs with.** The sky crane (the same job fifty years apart, one by hand and one by computer) and the Saturn V (the same mission's first and last engines).
- **Note.** Landing a lunar module is a genre as old as computers; this is built from Apollo's data, not from any earlier game.

**2. A helicopter in the hover (Robinson R22)**

- **What it is.** The most common training helicopter.
- **Key sources.** The R22 Pilot's Operating Handbook (rotor limits 101 to 104% power on, 90 to 110% power off; governor behaviour) and the FAA Helicopter Flying Handbook (vortex ring state: a descent of at least 300 ft/min with 20 to 100% power and little forward speed; raising the collective makes it worse) (S). Start steps and autorotation glide numbers were not found.
- **Mechanic and mission.** Collective on the lever, rotor rpm as the thing you must not lose. Mission: the engine quits; lower the collective, hold rpm, flare and land. An autorotation is the skill every helicopter pilot is tested on.
- **Why it spreads.** r/aviation and pilots; a failure that is real, sudden and survivable.
- **Build cost: L.** A new kind of sim (rotor energy), model, voice. **Phone cost: low to medium.**
- **Pairs with.** The Harrier: two ways to hover, one on a jet's thrust and one on a wing that spins.
- **Open question.** A UH-1 "Huey" is far better known and its sound is the famous one; its Army manual is public but was not looked for.

**3. A steam locomotive (Union Pacific Big Boy 4014)**

- **What it is.** The largest steam locomotive still running, restored in 2019.
- **Key sources.** Union Pacific's own fact sheet: 300 lb boiler pressure, 135,375 lb tractive effort, 68 in drivers, adhesion factor 4.00 (S). Wheel slip and cut-off behaviour have no primary source yet.
- **Mechanic and mission.** Two levers that mean something new: the regulator (how much steam) and the cut-off (for how much of each stroke). Start a heavy train without spinning the wheels, then lengthen the stride as speed builds.
- **Why it spreads.** It proves the name: anything with a throttle. Trains have their own large audience that none of the nine reach. The sound is locked to the wheels, which synthesis can do exactly.
- **Build cost: L, the largest.** A new scene (track, train), and steam is the costly kind of effect on the Mali phone.
- **Pairs with.** The NK-12: both hold one thing steady (rpm, boiler pressure) while a second control sets the bite.

---

## 6. Bigger concepts

| Concept | What it changes about the project | Effect on "real machines, real physics, every fact sourced" | Keep? |
|---|---|---|---|
| **Two front doors.** An explainer door (a page per machine, INFO, cutaway, lenses) and a challenge door (the daily, a friend's link). | It stops trying to be one thing to every channel. HN and Reddit get the explainer; short video and X get the challenge. | Strengthens: the explainer door is where the sourcing shows. | **Yes** (ideas A, B, D) |
| **Follow the real calendar.** When a real Starship or Artemis flight is due, that machine leads the cover and the daily. | A reason to come back that is not a streak. A small hand-kept list of dates. | Strengthens: it ties the toy to the real thing. | **Yes**, by hand at first |
| **"Can you do what the crew did."** Missions framed against a real, sourced performance: 0.75 m/s for the sky crane (already there), the lunar landing's propellant margin. | The score gains a meaning outside the game. | Strengthens, if every benchmark has a source. | **Yes** |
| **Positioning.** CLAUDE.md calls it "a browser toy (heading toward a game)". I would call it **"real engines you can run"**: an interactive explainer with a throttle, which also has challenges. | The pitch, the page title, the launch post. Not the code. | Strengthens. "Toy" undersells the sourcing; "game" invites a subreddit ban and comparison with games. | **Yes, argue it** |
| Classroom and museum use (embeds, a kiosk mode) | A second audience with slow, steady traffic. | Neutral. | Later, through idea D |
| Installable / offline | A home-screen icon. | Neutral. | Not now: it adds upkeep and no spread |
| A timeline of propulsion history as the way in | Turns nine machines into a museum that looks empty. | Neutral. | Not until there are 15 or more |
| User-made sequences, a sandbox, building your own engine | It becomes a construction game. | **Dilutes**: invented machines are not real ones. | No |

---

## 7. Sound

I cannot hear it, so this is from the code and research.

- **What is there.** Every voice is built from noise and oscillators through filters (`audio/audio.js`): a rumble under 140 Hz, a roar around 500 Hz, a crackle around 700 Hz, a whine.
- **How much sound limits spread: unknown, and probably less than assumed.** TikTok's own research says most users have sound on (S: [TikTok](https://ads.tiktok.com/business/en-US/blog/evolution-of-sound-volume-1), self-reported, 2020); no figure for Reels or Shorts could be verified; nothing at all was found on whether viewers care if engine sound is recorded or synthesized.
- **A phone speaker cannot play a rocket's rumble.** Phone speakers fall away below roughly 100 to 200 Hz (S: [LANDR](https://blog.landr.com/make-bass-audible-phone-speakers)). What a phone viewer hears of an F-1 is the crackle in the middle of the range. That is true of a real recording too.
- **Free recordings exist for about four of the nine** (S, licences as stated on each page, none listened to):
  - jet: a J79 start cart and an F-16 take-off, CC0 on Freesound;
  - Shuttle and Saturn-class: NASA test and launch audio, and a CC0 launch rumble;
  - Harrier: US military video marked public domain (login needed);
  - turboprop: a C-130, which is not an NK-12.
  - Nothing found for the SR-71, the Hall thruster, the NK-12, the sky crane's engines (the rover recorded no usable descent audio) or Starship (SpaceX's media is not free to reuse).
- **So the roadmap's plan does not hold as written.** Blending recordings would make four machines "real" and leave five synthesized, and a "Saturn V" built on a modern launch recording is not an F-1. For a project whose edge is honesty, uniform synthesis that says so is the stronger position (J).
- **If one recording is ever added**, the RS-25 is the case: NASA's Stennis test audio is the actual engine. The technique that fits is short loops cross-faded by power, in Opus with an AAC fallback; all nine machines would add 1 to 3 MB (S: [a Web Audio engine-sound case study](https://web.dev/case-studies/racer-sound); estimate), which is more than the whole site sends today, so it would load per machine.

**What I recommend instead (S effort):**

1. Listen to the launch clip's machine on a phone's own speaker, not headphones. If it sounds thin, raise the 300 Hz to 3 kHz crackle for rockets. That is where a phone has anything to give.
2. INFO already says the sound is synthesized on eight of the nine machines (P: the code). I found no such line for the Hall thruster; add one.
3. Keep the clip readable with the sound off. It already carries live readouts and the verdict.

---

## 8. If you add a server (idea G only)

Assumes one write and two reads per play; prices read 2026-11-11 by the research agent.

| Option | 10k plays a month | 1M plays a month | Note |
|---|---|---|---|
| **Cloudflare Workers + D1** | $0 | $0 to $5 | 3M requests a month sits at the free plan's 100k a day, so plan on the $5 tier ([Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/)) |
| Workers + a Durable Object | $0 | about $5.30 | Correct counting and one global rate limit ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)) |
| Workers + KV alone | $0 | $5 | **Don't**: no atomic count, one write a second per key ([limits](https://developers.cloudflare.com/kv/platform/limits/)) |
| Upstash Redis | $0 | $5 to $6 | Needs a Worker in front to hide the token ([pricing](https://upstash.com/pricing/redis)) |
| Firestore | $0 | about $0.50 to $6 | Needs a card; rates from a third party |
| Supabase | $0, but pauses after a week idle | $0 to $25 | ([pricing](https://supabase.com/pricing)) |
| Deno Deploy KV | $0 | $20 | ([pricing](https://deno.com/deploy/pricing)) |

- **Privacy.** Store a score, a mission and a day; no identifier. The provider still handles the player's IP address, which the EU's top court has held can be personal data (S: [Breyer, C-582/14](https://curia.europa.eu/jcms/upload/docs/application/pdf/2016-10/cp160112en.pdf)). Sending a score that was never stored on the device should not need a consent banner; sending the saved "today's best" from `localStorage` might (the agent's reading of [EDPB guidelines 2/2023](https://edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf), not legal advice).
- **Cheating.** Scores come from the browser and can be forged. Plan: show a percentile, never names; reject scores outside what the mission can give; rate-limit by address; trim the extremes. Checking a replay on the server is possible later but depends on the sim giving the same numbers in every browser, which nobody has tested.

---

## 9. Work that isn't features, ranked with the features

| Rank | Work | Size | Needs from you |
|---|---|---|---|
| 1 | Push `main` so the live site is the current game | minutes | Your go |
| 2 | **Analytics**: GoatCounter (free for reasonable public use, [terms](https://www.goatcounter.com/terms)) or Cloudflare Web Analytics (free, sampled, [FAQ](https://developers.cloudflare.com/web-analytics/faq/)); Plausible is $9 a month at 10k views | S | Pick one, make the account |
| 3 | **First contact** (move 1): a page per machine with its own title and image (idea B); daily cover without the nine buttons; one line of pitch on the cover; Starship opens in the view that shows the fire; the clip ends with the machine in frame; F-TYPE's missing sources line | S each | None |
| 4 | **Beat this landing** (idea A) | S to M | Yes or no |
| 5 | Rover model loads only for the sky crane (203 kB off every other first load) | S | None |
| 6 | **Starship on the Mali phone** (CLAUDE.md: about 28 fps at 0.7 resolution). The lead clip and the HN thread both land here. Or lead with a machine that already runs at 50 fps. | M | Which machine leads the launch |
| 7 | Sound check by ear on a phone speaker (section 7) | S | Your ears |
| 8 | In-app browser test: open a daily link inside TikTok, Instagram and X on one Android and one iPhone; see whether 3D starts and SHARE works | S | A phone |
| 9 | Harrier mission: an end if nothing is done, a phone brief without arrow keys, the jet in frame at the start | S | None |
| 10 | The run's numbers (idea C), moment links (idea D) | S to M each | Yes or no |
| 11 | Land the Eagle (machine 10) | L | Yes or no; and whether a NASA lander model is allowed |

**Launch timing (J).** Hold the launch for a real event if one is near: a Starship flight or an Artemis milestone gives every channel a reason to care that week. Post to Hacker News as an explainer of nine real engines, hand-written, with the sources up front. Ask r/space's moderators first. Do not call it a game on r/InternetIsBeautiful.

---

## 10. Suggested order, around the roadmap

| Step | What | Decision needed at this step |
|---|---|---|
| 1 | Push `main`. Add analytics. | Which analytics |
| 2 | First-contact fixes (rank 3 above) and the rover load (rank 5). One commit each. | None |
| 3 | Beat this landing, for both missions. | Go or no |
| 4 | Real-device pass that the roadmap already has open, now with a purpose: the lead clip's machine on a mid-range Android, inside the social apps, and the sound by ear. | Which machine leads |
| 5 | Soft launch to one small channel to read the analytics. | Which channel |
| 6 | Land the Eagle, if chosen; then "one daily" (idea E) becomes worth doing with three missions. | Machine 10; outside model or not |
| 7 | The launch, timed to a real flight. | Date and post wording |
| 8 | After launch, by what the numbers say: the run's numbers, moment links and embeds, a second new machine, the percentile server. | By evidence |

---

## 11. The top idea in more depth: Beat this landing

**Screens:** `docs/breakout/mockup.html` (five panels at phone size, in the current design system; blue marks what is new).

**Share line**

```
Throttle Up daily #15 · Mars sky crane landing
🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ 804 points (try 1)
Touchdown 0.61 m/s, 44 of 96 kg hydrazine left
Beat it: https://kkbosu.github.io/throttle-up/?m=7&vs=15.804.61.44
```

**The 10-second clip, shot by shot**

| Time | Picture | Text on screen |
|---|---|---|
| 0.0 to 1.5 s | Cold open, already low: the rover swinging on its bridles 8 m up, engines firing, dust beginning | Top band: DAILY #15 · MARS SKY CRANE LANDING. Under it, in blue: TO BEAT 772 |
| 1.5 to 6.0 s | The descent. The crop follows the stage and rover down | Readouts live: ROVER m falling, DESCENT settling towards 0.75, HYDRAZINE counting down |
| 6.0 to 7.0 s | Wheels touch. Dust. The bridles are cut | DESCENT snaps to 0.00; the band's edge turns green |
| 7.0 to 8.5 s | The stage flies off; **the camera stays on the rover** | Verdict panel fades in: ROVER DOWN SAFELY |
| 8.5 to 10.0 s | Rover on the ground, in frame | 804 POINTS · BEAT 772 · CAN YOU? and the link |

Two things the current clip needs for this (both small, in `mission/clip.js`): it starts at the start of the try, so a 10-second version needs the mission to say when the clip should begin (for the sky crane, when the rover passes about 8 m); and its last frames follow the stage into the sky, so the crop must stay on the rover after touchdown.

**What it would add to what exists:** one URL parameter, a second state for the cover, one inset line per mission, a comparison block on the card and the clip, and the player's numbers in the link. The mission runner, the seeded start, the trace, the share text and the recorder are used as they are.

---

## 12. Cut, with the reason

- **Missions for the RS-25, Saturn V, Starship, NK-12 and F-TYPE**: test-stand machines; a sequencer runs them, so there is no operator skill to score.
- **Hall least-xenon, F-TYPE stall-free run-up, sky-crane terrain**: already dropped in the roadmap; I found no answer to the reasons given.
- **In-game machine picker, dip to black on machine switch**: already looked at and left in CLAUDE.md; nothing here changes that.
- **Named leaderboard**: needs replay checking to be honest; a percentile gets most of the value.
- **Streaks, reminders, notifications**: against your no-dark-patterns rule, and the daily-game evidence shows fads fading anyway.
- **Collecting and progression (unlock the next machine)**: puts a gate in front of free play.
- **Live multiplayer**: a server, and nothing real about two sky cranes racing.
- **Scored start-up checklists (hot starts, hung starts)**: real, but the sourced detail found was secondary, and a checklist does not fit a lever.
- **"How the record was set" replays (Mallard, ThrustSSC)**: the runs are poorly sourced in what was opened, and a replay is a video, not a toy.
- **Falcon 9 landing burn**: the engine's throttle floor has no official source; three pages give three numbers.
- **Dragster, F1, electric motors**: headline numbers are estimates or marketing.
- **Recordings overhaul for all machines**: free recordings exist for under half of them.
- **Installable app, propulsion timeline, user-made sequences, sandbox**: section 6.
