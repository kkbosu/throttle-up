// One-off converter: a NASA model -> the small file the game loads. Written for the Perseverance rover
// (src/machines/sky-crane/rover.bin); the Apollo lunar module (src/machines/lunar-module/lander.bin) goes through it too.
//
//   npm i --no-save @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 draco3dgltf meshoptimizer sharp
//   node tools/rover-model.mjs <perseverance.glb> [triangles, default 15000]
//   node tools/rover-model.mjs <Apollo Lunar Module.glb> 16000 --out src/machines/lunar-module/lander.bin --turn 0 --scale 1.4
//
// The lunar module: "Apollo Lunar Module", NASA 3D Resources,
// https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Apollo%20Lunar%20Module (GLB, 717 kB, Draco-compressed,
// about 97,600 triangles, 12 materials). It is 5.0 units tall; --scale 1.4 makes it about 7 m, the lander's height on
// its gear. --turn sets which way the front (ladder and hatch) faces: the game wants it towards +X.
//
// Source: "Mars Perseverance Rover, 3D Model", NASA/JPL-Caltech,
// https://science.nasa.gov/resource/mars-perseverance-rover-3d-model/ (GLB, 11 MB, about 199,000 triangles, 48 materials,
// 24 textures). The game needs a few thousand triangles in one or two draw calls, so this:
//   1. turns every texture into per-vertex colour (base colour sampled at each vertex), then drops the textures. That
//      also leaves NASA's insignia and the nameplates behind, which NASA's media guidelines do not put in the public domain;
//   2. sorts the surfaces into two materials, metal and not;
//   3. bakes every part's position in, joins them, welds vertices that share a place (averaging their colours) and
//      simplifies the mesh to the triangle budget. Normals are dropped: the game shades it flat, which suits a machine
//      made of plates and boxes and needs none;
//   4. turns it to the game's axes (nose towards +X, wheels on y = 0) and writes positions (16-bit), colours (8-bit
//      sRGB) and indices.
//
// File layout (little endian): uint32 magic 'RVR1', uint32 groups, float32 x6 bounding box (min xyz, max xyz); then per
// group: uint32 vertices, uint32 indices, uint32 metal (0/1), uint16 positions x3 + 1 pad (0..65535 over the
// box), uint8 colours x3 + 1 pad, uint32 indices.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { flatten, join, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './harness.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes('--' + n) ? argv.splice(argv.indexOf('--' + n), 2)[1] : d);
const OUT = opt('out', 'src/machines/sky-crane/rover.bin'),
  TURN_ARG = opt('turn', null),
  SCALE = +opt('scale', 1);
const [src, ratioArg] = argv;
const BUDGET = +(ratioArg || 15000);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() })
  .read(src);
const root = doc.getRoot();
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// 1, 2: vertex colours and the two materials
const pix = new Map();
async function pixels(tex) {
  if (!pix.has(tex)) {
    const { data, info } = await sharp(Buffer.from(tex.getImage()))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pix.set(tex, { d: data, w: info.width, h: info.height });
  }
  return pix.get(tex);
}
const M = [doc.createMaterial('paint'), doc.createMaterial('metal')];
let dropped = 0;
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    const f = mat ? mat.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
    if (!mat || mat.getAlphaMode() === 'BLEND' || f[3] < 0.5 || /transparent|clear/i.test(mat.getName())) {
      mesh.removePrimitive(prim);
      dropped++;
      continue;
    }
    const tex = mat.getBaseColorTexture(),
      uv = prim.getAttribute('TEXCOORD_0'),
      n = prim.getAttribute('POSITION').getCount(),
      col = new Float32Array(n * 3),
      t = tex && uv ? await pixels(tex) : null,
      e = [0, 0];
    for (let i = 0; i < n; i++) {
      let c = [1, 1, 1];
      if (t) {
        uv.getElement(i, e);
        const x = Math.min(t.w - 1, Math.floor((e[0] - Math.floor(e[0])) * t.w)),
          y = Math.min(t.h - 1, Math.floor((e[1] - Math.floor(e[1])) * t.h)),
          k = (y * t.w + x) * 3;
        c = [lin(t.d[k] / 255), lin(t.d[k + 1] / 255), lin(t.d[k + 2] / 255)];
      }
      col.set([c[0] * f[0], c[1] * f[1], c[2] * f[2]], i * 3);
    }
    for (const s of prim.listSemantics()) if (s !== 'POSITION' && s !== 'NORMAL') prim.setAttribute(s, null);
    prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(col));
    prim.setMaterial(
      M[
        mat.getMetallicFactor() > 0.5 && !mat.getMetallicRoughnessTexture() ? 1 : mat.getMetallicFactor() > 0.5 ? 1 : 0
      ],
    );
  }
for (const m of root.listMaterials()) if (!M.includes(m)) m.dispose();
for (const t of root.listTextures()) t.dispose();

// 3: one mesh per material, simplified
await MeshoptSimplifier.ready;
await doc.transform(prune(), flatten(), join({ keepNamed: false }), prune());

// 4: gather, turn to the game's axes, write
const groups = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const wm = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'),
      N = prim.getAttribute('NORMAL'),
      C = prim.getAttribute('COLOR_0'),
      I = prim.getIndices(),
      n = P.getCount(),
      pos = new Float32Array(n * 3),
      nor = new Float32Array(n * 3),
      col = new Float32Array(n * 3),
      a = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      P.getElement(i, a);
      pos.set(
        [
          wm[0] * a[0] + wm[4] * a[1] + wm[8] * a[2] + wm[12],
          wm[1] * a[0] + wm[5] * a[1] + wm[9] * a[2] + wm[13],
          wm[2] * a[0] + wm[6] * a[1] + wm[10] * a[2] + wm[14],
        ],
        i * 3,
      );
      if (N) {
        N.getElement(i, a);
        nor.set(
          [
            wm[0] * a[0] + wm[4] * a[1] + wm[8] * a[2],
            wm[1] * a[0] + wm[5] * a[1] + wm[9] * a[2],
            wm[2] * a[0] + wm[6] * a[1] + wm[10] * a[2],
          ],
          i * 3,
        );
      }
      C.getElement(i, a);
      col.set(a, i * 3);
    }
    groups.push({ metal: prim.getMaterial() === M[1] ? 1 : 0, pos, nor, col, idx: Uint32Array.from(I.getArray()) });
  }
}
// one group per material kind, however many pieces the file came in (the lunar module's parts do not all join)
for (const metal of [0, 1]) {
  const gs = groups.filter((g) => g.metal === metal);
  if (gs.length < 2) continue;
  const n = gs.reduce((t, g) => t + g.pos.length, 0),
    pos = new Float32Array(n),
    col = new Float32Array(n),
    idx = new Uint32Array(gs.reduce((t, g) => t + g.idx.length, 0));
  let o = 0,
    io = 0;
  for (const g of gs) {
    pos.set(g.pos, o);
    col.set(g.col, o);
    for (let i = 0; i < g.idx.length; i++) idx[io + i] = g.idx[i] + o / 3;
    o += g.pos.length;
    io += g.idx.length;
  }
  groups.splice(0, groups.length, ...groups.filter((g) => g.metal !== metal), { metal, pos, col, idx });
}
// weld by place (to the millimetre), averaging colour, then simplify each group to its share of the budget
const total = groups.reduce((t, g) => t + g.idx.length / 3, 0);
for (const g of groups) {
  const map = new Map(),
    re = new Uint32Array(g.pos.length / 3),
    pos = [],
    col = [],
    cnt = [];
  for (let i = 0; i < re.length; i++) {
    const k =
      Math.round(g.pos[i * 3] * 1000) +
      ',' +
      Math.round(g.pos[i * 3 + 1] * 1000) +
      ',' +
      Math.round(g.pos[i * 3 + 2] * 1000);
    let j = map.get(k);
    if (j === undefined) {
      map.set(k, (j = cnt.length));
      pos.push(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]);
      col.push(0, 0, 0);
      cnt.push(0);
    }
    for (let c = 0; c < 3; c++) col[j * 3 + c] += g.col[i * 3 + c];
    cnt[j]++;
    re[i] = j;
  }
  for (let j = 0; j < cnt.length; j++) for (let c = 0; c < 3; c++) col[j * 3 + c] /= cnt[j];
  let idx = [];
  for (let i = 0; i < g.idx.length; i += 3) {
    const [a, b, c] = [re[g.idx[i]], re[g.idx[i + 1]], re[g.idx[i + 2]]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  const P = Float32Array.from(pos),
    want = Math.floor((BUDGET * (g.idx.length / 3)) / total) * 3;
  let [out] = MeshoptSimplifier.simplify(Uint32Array.from(idx), P, 3, want, 0.05);
  if (out.length > want * 1.25) [out] = MeshoptSimplifier.simplifySloppy(Uint32Array.from(idx), P, 3, null, want, 0.05);
  const use = new Map(),
    np = [],
    nc = [];
  idx = Uint32Array.from(out, (v) => {
    if (!use.has(v)) {
      use.set(v, np.length / 3);
      np.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      nc.push(col[v * 3], col[v * 3 + 1], col[v * 3 + 2]);
    }
    return use.get(v);
  });
  Object.assign(g, { pos: Float32Array.from(np), col: Float32Array.from(nc), idx });
}
// The model's axes: +Y up, the nose towards +Z (checked by eye in a render). The game's rover: nose towards +X.
const TURN = TURN_ARG != null ? +TURN_ARG : process.env.ROVER_TURN ? +process.env.ROVER_TURN : Math.PI / 2;
const cs = Math.cos(TURN),
  sn = Math.sin(TURN);
const mn = [1e9, 1e9, 1e9],
  mx = [-1e9, -1e9, -1e9];
for (const g of groups)
  for (const arr of [g.pos])
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i] * SCALE,
        z = arr[i + 2] * SCALE;
      arr[i + 1] *= SCALE;
      arr[i] = cs * x + sn * z;
      arr[i + 2] = -sn * x + cs * z;
      if (arr === g.pos)
        for (let k = 0; k < 3; k++) ((mn[k] = Math.min(mn[k], arr[i + k])), (mx[k] = Math.max(mx[k], arr[i + k])));
    }
// wheels on y = 0, centred fore-aft and side to side
const off = [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2];
for (let k = 0; k < 3; k++) ((mn[k] -= off[k]), (mx[k] -= off[k]));
const parts = [];
const u32 = (...v) => parts.push(Buffer.from(Uint32Array.from(v).buffer));
parts.push(Buffer.from('RVR1'));
u32(groups.length);
parts.push(Buffer.from(Float32Array.from([...mn, ...mx]).buffer));
let tris = 0;
for (const g of groups) {
  const n = g.pos.length / 3,
    p = new Uint16Array(n * 4),
    cb = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      p[i * 4 + k] = Math.round(((g.pos[i * 3 + k] - off[k] - mn[k]) / (mx[k] - mn[k] || 1)) * 65535);
      cb[i * 4 + k] = Math.round(srgb(Math.min(1, Math.max(0, g.col[i * 3 + k]))) * 255);
    }
  }
  u32(n, g.idx.length, g.metal);
  parts.push(Buffer.from(p.buffer), Buffer.from(cb.buffer), Buffer.from(g.idx.buffer));
  tris += g.idx.length / 3;
  console.log(`group ${g.metal ? 'metal' : 'paint'}: ${n} vertices, ${g.idx.length / 3} triangles`);
}
const out = resolve(ROOT, OUT);
writeFileSync(out, Buffer.concat(parts));
console.log(
  `dropped ${dropped} see-through surfaces; ${tris} triangles; size m: ${mx.map((v, k) => (v - mn[k]).toFixed(2)).join(' x ')}; wrote ${out} (${Buffer.concat(parts).length} bytes)`,
);
