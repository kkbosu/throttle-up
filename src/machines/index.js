// The machine table: every machine in order (index = ?m = chip order). Each one lives in src/machines/<name>/.
import m0 from './f-type/machine.js';
import m1 from './sr-71/machine.js';
import m2 from './shuttle/machine.js';
import m3 from './hall/machine.js';
import m4 from './saturn-v/machine.js';
import m5 from './harrier/machine.js';
import m6 from './nk-12/machine.js';
import m7 from './sky-crane/machine.js';
import m8 from './starship/machine.js';

/* ---------- machines: everything that differs between engines lives here ----------
   ab: has an afterburner zone (lever detent at MIL); stall: can surge; idle: spool target at lever 0; up/dn: spool time constants;
   coast: spin-down tau with fuel off; cN/cT: starter speed and duration; e/f: EGT and fuel-flow curves; teb: green light-off flash */
export const MC = [m0, m1, m2, m3, m4, m5, m6, m7, m8];
