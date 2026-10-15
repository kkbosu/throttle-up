// The 3D side of every machine, in machine order (index = ?m). Imported only by the 3D renderer chunk.
// Filled by loadM3() when init3D starts: machine and renderer modules import each other, so while modules are
// still loading a machine's hook object may not exist yet.
import m0 from './f-type/three.js';
import m1 from './sr-71/three.js';
import m2 from './shuttle/three.js';
import m3 from './hall/three.js';
import m4 from './saturn-v/three.js';
import m5 from './harrier/three.js';
import m6 from './nk-12/three.js';
import m7 from './sky-crane/three.js';

export const M3 = [];
export function loadM3(){if(!M3.length)M3.push(m0,m1,m2,m3,m4,m5,m6,m7)}
