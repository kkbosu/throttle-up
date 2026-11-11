# Sources by machine

Extracted from the INFO panels (now in `src/machines/<name>/machine.js`; originally `throttle-up-v11.html`, kept in `legacy/`). Every user-facing fact should trace to one of these, or be listed under WHAT IS APPROXIMATED.

## AFTERBURNER (F-TYPE)
A generic afterburning turbofan, not one real engine: its INFO panel says the numbers are illustrative. These cover the general facts it states (afterburner, nozzle, shock diamonds, compressor stall).
- [Afterburning Jet Thrust (NASA Glenn Research Center)](https://www.grc.nasa.gov/www/k-12/airplane/turbab.html)
- [Propelling nozzle (Wikipedia)](https://en.wikipedia.org/wiki/Propelling_nozzle)
- [Shock diamond (Wikipedia)](https://en.wikipedia.org/wiki/Shock_diamond)
- [Compressor stall (Wikipedia)](https://en.wikipedia.org/wiki/Compressor_stall)

## SR-71
- [SR-71 Propulsion System (Aircraft Engine Historical Society)](https://enginehistory.org/Convention/2013/SR-71Propul/SR-71Propul.shtml)
- [The J58 Start Cart (Aircraft Engine Historical Society)](https://www.enginehistory.org/Convention/2015/J58Starting/J58Starting.shtml)
- [Pratt & Whitney J58 (Wikipedia)](https://en.wikipedia.org/wiki/Pratt_%26_Whitney_J58)

## RS-25
- [RS-25 (Wikipedia)](https://en.wikipedia.org/wiki/RS-25)
- [RS-25 engine (L3Harris)](https://l3harris.com/all-capabilities/rs-25-engine)
- [Space Shuttle main propulsion system (GlobalSecurity)](https://www.globalsecurity.org/space/library/report/1988/sts-mps.html)
- [Heritage hardware: the hydrogen burn-off system (NASASpaceflight)](https://www.nasaspaceflight.com/2015/06/heritage-hardware-hydrogen-burn-off-system-sls/)

## HALL THRUSTER
- [SPT-140 (Wikipedia)](https://en.wikipedia.org/wiki/SPT-140)
- [Psyche quick facts (JPL press kit)](https://jpl.nasa.gov/press-kits/psyche/quick-facts)
- [The Hall effect and rocket flight (Physics Today)](https://physicstoday.aip.org/quick-study/the-hall-effect-and-rocket-flight)

## SATURN V F-1
- [Rocketdyne F-1 (Wikipedia)](https://en.wikipedia.org/wiki/Rocketdyne_F-1)
- [S-IC (Wikipedia)](https://en.wikipedia.org/wiki/S-IC)

## HARRIER
- [Rolls-Royce Pegasus (Wikipedia)](https://en.wikipedia.org/wiki/Rolls-Royce_Pegasus)
- [AV-8 Harrier (FAS)](https://man.fas.org/dod-101/sys/ac/av-8.htm)
- [Have You Ever Seen An AV-8B Harrier Use The Meatball To Land On An Amphibious Assault Ship? (The War Zone, Tyler Rogoway, 2021)](https://www.twz.com/42664/av-8b-harriers-also-use-the-meatball-when-landing-on-amphibious-assault-ships): the usual recovery, a hover to the left of the ship and then a move right over the deck before landing (and the straight-in approach over the stern); MISSION's start beside the ship
- [USS Kearsarge (LHD-3) Ship's Loading Characteristics Pamphlet (FAS)](https://man.fas.org/dod-101/sys/ship/docs/slcp-lhd-3/Secti.html): an 818 ft flight deck, 65 ft freeboard to the flight deck; the size of MISSION's ship

## NK-12 TURBOPROP
- [Kuznetsov NK-12 (Wikipedia)](https://en.wikipedia.org/wiki/Kuznetsov_NK-12)
- [Tupolev Tu-95 (Wikipedia)](https://en.wikipedia.org/wiki/Tupolev_Tu-95)

## MARS SKY CRANE
- [Mars Perseverance Rover, 3D Model (NASA/JPL-Caltech)](https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/): the rover model itself. The game ships a simplified copy (`src/machines/sky-crane/rover.bin`, made by `tools/rover-model.mjs`: about 10,000 triangles, vertex colours in place of textures, so none of NASA's insignia or nameplates are carried over). Used under [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/): credit NASA/JPL-Caltech, no suggestion of NASA endorsement, no NASA insignia or logotype.
- [Perseverance Touches Down on Mars (NASA)](https://science.nasa.gov/photojournal/perseverance-touches-down-on-mars-illustration/)
- [Mars 2020 landing quick facts (NASA JPL)](https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/quick_facts)
- [Mars Science Laboratory Landing press kit (NASA/JPL, 2012)](https://www.jpl.nasa.gov/news/press_kits/MSLLanding.pdf): the descent stage (p. 37: each engine up to about 3,300 N, three spherical fuel tanks with about 387 kg of usable hydrazine, two helium tanks) and the descent (p. 28: four of the eight engines shut off just before the cords pay out). It replaces the Spaceflight101 MSL page (spaceflight101.com/msl/?p=311), offline since at least 2026-11-10, which was the source of the model's 3,060 N limit and 1% idle; INFO now lists those as approximations. The 400 N lower limit is on Wikipedia's sky crane page (below).
- [The Sun Sets on Mars (NASA)](https://science.nasa.gov/?p=926395)
- [Sky crane (Wikipedia)](https://en.wikipedia.org/wiki/Sky_crane_(landing_system))
- [Dawson et al., Monopropellant Hydrazine 700 lbf Throttling Terminal Descent Engine for Mars Science Laboratory (AIAA 2007-5481)](https://arc.aiaa.org/doi/10.2514/6.2007-5481): the MR-80B's thrust range (31 to 3,603 N) and specific impulse (204 to 223 s) in qualification tests; used for MISSION's hydrazine use
- [Mars Fact Sheet (NASA NSSDC)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html): surface air density, about 0.016 kg/m³ (why MISSION has no wind)


## STARSHIP SUPER HEAVY
- [SpaceX Super Heavy (Wikipedia)](https://en.wikipedia.org/wiki/SpaceX_Super_Heavy)
- [SpaceX Raptor (Wikipedia)](https://en.wikipedia.org/wiki/SpaceX_Raptor)
- [SpaceX Starbase (Wikipedia)](https://en.wikipedia.org/wiki/SpaceX_Starbase)
- [Starship Flight 12 inches closer to launch with booster and ship static fires (Space Explored, April 2026)](https://spaceexplored.com/2026/04/18/starship-flight-12-inches-closer-to-launch-with-booster-and-ship-static-fires/)
- [Flight 12 Starship Booster 19 performs a full-duration 33-engine static fire test ahead of launch (Tesla Oracle, May 2026)](https://www.teslaoracle.com/2026/05/09/flight-12-starship-booster-19-performs-a-full-duration-33-engine-static-fire-test-ahead-of-launch/)
- [SpaceX test-fires 31 engines on Starship's gigantic Super Heavy booster (Spaceflight Now, February 2023)](https://spaceflightnow.com/2023/02/09/spacex-test-fires-31-engines-on-starships-gigantic-super-heavy-booster/)

## APOLLO LUNAR MODULE
The numbers were read from the documents themselves on 2026-11-11 (the first four are scans; the key tables were checked on the page images).
- [Bennett, Apollo Lunar Descent and Ascent Trajectories (NASA TM X-58040, 1970)](https://ntrs.nasa.gov/api/citations/19700024568/downloads/19700024568.pdf): 10 to 60% throttle range, start at 10% for 26 s, the landing phase (vertical descent from about 150 ft at 3 ft/s, the computer on the throttle), probes and the contact light, the low-level light and the decision point at least 20 s before depletion, Apollo 11's 20 to 30 s and Apollo 12's margin
- [Apollo Experience Report: Descent Propulsion System (NASA TN D-7143, 1973)](https://ntrs.nasa.gov/api/citations/19730011150/downloads/19730011150.pdf): 10,500 lb rated thrust, the 65 to 92.5% band and why, propellants, helium feed, ablative chamber and columbium skirt, 305 s specific impulse (a design requirement), the 5.6% low-level sensor
- [Apollo 11 Mission Report (NASA MSC-00171, 1969)](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf): landing weight 16,153.2 lb, touchdown at about 1.7 ft/s with 2.1 ft/s to the left, 770 lb of propellant left, dust from about 100 ft, the 1 ft/s rate-of-descent switch
- [Rogers, Apollo Lunar Module Landing Gear (NASA, 1972)](https://www.nasa.gov/wp-content/uploads/static/history/alsj/LM_Landing%20Gear1973010151.pdf): 1.73 m probes on three footpads, 0.91 m footpads; the design limits (10 ft/s vertical, 7 ft/s at 4 ft/s horizontal) are read off its figures 6 and 8, which have no sentence stating them
- [Apollo 11 Lunar Surface Journal: The First Lunar Landing (NASA)](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html): the landing's callouts and date
- [Moon Fact Sheet (NASA NSSDC)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html): surface gravity 1.62 m/s²
- [Apollo Lunar Module, 3D model (NASA 3D Resources)](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Apollo%20Lunar%20Module): the lander's model; the collection's README says its assets are "free and without copyright" and points to NASA's media usage guidelines
