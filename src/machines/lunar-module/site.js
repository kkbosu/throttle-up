// APOLLO LM: Tranquility Base, the ground the sim lands on and the 3D side draws. No three.js here: the sim reads the
// same heights the picture is built from.
//
// Axes: the origin is where Apollo 11's lunar module stood. +X is west (the way it flew, and the way its ladder faced,
// to within 13 degrees), +Z is north, Y is up; metres.

/* Craters as [x, z, radius, depth, rim height]. Sizes and distances from the sources in INFO where they give them:
   West crater about 165 to 180 m across and about 400 m east; Little West 33 m across, 4 m deep, 50 to 60 m east;
   Double crater 12 m long, 6 m wide, 1 m deep, to the south-west; an 8 m crater about 8 m north of the north footpad;
   an old, worn 22 m crater south-east of Double; a 13 m crater 18 m north-west of Little West; a fresh crater about
   70 m off; and, about 200 m away, the raised rim of a 200 m crater, which made the low hills Armstrong reported.
   Where a source gives only a distance, or no depth, the rest is set by eye (stated in INFO). */
const NAMED = [
  [-480, -40, 85, 26, 5],
  [-60, 0, 16.5, 4, 0.8],
  [12.5, -6, 3, 1, 0.25],
  [17.7, -9, 3, 1, 0.25],
  [0.5, 12.5, 4, 0.8, 0.15],
  [4, -22, 11, 1.1, 0.1],
  [-31, 29, 6.5, 1.8, 0.35],
  [40, 57, 5, 1.5, 0.35],
  [300, 20, 100, 7, 7],
];
/* The rest of the plain as Armstrong described it from the window: "a fairly large number of craters of the 5- to
   50-foot variety". These are scattered by a fixed random sequence, not surveyed; none touches a named crater or the
   spot the lander stood on. */
function scatter() {
  let a = 0x71a2b3;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const L = [];
  for (let i = 0; i < 230; i++) {
    const b = rnd() * 6.283,
      d = 9 + Math.pow(rnd(), 0.75) * 330,
      r = 0.8 + Math.pow(rnd(), 2.4) * 6.8,
      x = Math.cos(b) * d - 30,
      z = Math.sin(b) * d,
      old = rnd();
    if (Math.hypot(x, z) < 6 + r * 1.6) continue;
    if (NAMED.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr * 1.25 + r * 1.5)) continue;
    /* fresh ones are a fifth as deep as they are wide with a sharp rim; most are older, shallower and rounded off */
    L.push([x, z, r, r * (0.12 + 0.28 * old * old), r * 0.07 * old]);
  }
  return L;
}
export const CRATERS = NAMED.concat(scatter());
/* the boulders the Apollo 11 photographs show, as [distance from the lander (m), size (m)]; the sources give no
   bearings, so the 3D side sets them towards West crater, whose blocky rim they were thrown from */
export const BOULDERS = [
  [31, 0.5],
  [68, 2.5],
  [92, 1.5],
  [96, 1],
  [108, 1],
  [120, 1.1],
  [124, 1.8],
  [156, 2],
  [175, 1.9],
];
/* where the Sun stood at the landing (elevation 11.37 degrees, azimuth 88.81: low in the east) and where the Earth
   hangs (23 degrees west of straight up), as unit vectors */
export const SUN_DIR = [-0.9802, 0.1971, 0.0204],
  EARTH_DIR = [0.3907, 0.9205, 0];
/* height of the ground (m) at a point */
export function siteH(x, z) {
  let y = 0;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i],
      dx = x - c[0],
      dz = z - c[1],
      r = c[2];
    if (Math.abs(dx) > r * 2.4 || Math.abs(dz) > r * 2.4) continue;
    const d = Math.sqrt(dx * dx + dz * dz) / r;
    /* a bowl, a raised rim, and a blanket of thrown-out soil that dies away */
    if (d < 1) y += c[4] - c[3] * (1 - d * d);
    else if (d < 2.4) y += c[4] * Math.exp(-Math.pow((d - 1) / 0.42, 2));
  }
  return y;
}
/* how steep the ground is under the four footpads (radians): the lean a lander 8 m across takes up when it rests there */
export function siteSlope(x, z) {
  const k = 4;
  return Math.atan(Math.hypot(siteH(x + k, z) - siteH(x - k, z), siteH(x, z + k) - siteH(x, z - k)) / (2 * k));
}
