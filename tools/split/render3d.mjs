// One-off (step 4 of the Vite split): split init3D (src/render3d/index.js as of commit 64dd8e6) into modules.
//
// Everything in init3D's body moves verbatim to the module SPEC assigns by line:
// - function declarations become exported module-level functions;
// - `const` declarations become exported module-level `let`s, assigned where v11 declared them;
// - all statements that do work (creating objects, scene.add, listeners, the const assignments) stay in v11's
//   order: each contiguous run of them becomes an exported createX() function, and init3D calls those in order.
// So every three.js object is still created inside init3D, in exactly the same order (object ids and the
// random numbers drawn for UUIDs depend on it). `T` (three) and `X` (postprocessing addons) become imports of
// the same modules the loader fetches. Imports are computed with Babel scope analysis.
// Re-runnable: always starts from the committed step-3 file.

import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default || traverseMod;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '64dd8e6';

// [first line, last line, module] by line of src/render3d/index.js at BASE
const RANGES = [
  [14, 14, 'context'], [16, 75, 'kit'], [77, 94, 'sky'], [97, 100, 'lights'], [101, 116, 'scenes'],
  [126, 173, 'ground'], [179, 185, 'earth'], [201, 206, 'props'], [210, 613, 'builders'], [616, 655, 'plume'],
  [658, 681, 'particles'], [684, 703, 'composite'], [718, 727, 'machine'], [731, 731, 'scenes'], [734, 741, 'camera'],
  [751, 753, 'plume'], [798, 822, 'particles'], [831, 853, 'lenses'], [861, 869, 'flow'], [882, 882, 'particles'],
  [883, 883, 'frame'], [886, 887, 'overlay'], [905, 906, 'frame'], [929, 930, 'index'],
];
const ABOUT = {
  context: 'k3: the 3D renderer state that several modules reassign (camera, plume, render targets, particle accumulators...).',
  kit: 'Renderer, scenes and camera objects, shared textures, materials (MT), thermal categories (CAT), geometry helpers.',
  sky: 'Sky: analytic gradient + sun + stars; fog uses the same horizon colour so the ground blends in. Environment map.',
  lights: 'Lights: hemisphere, sun (shadows), flame point light, two flood lights.',
  scenes: 'Scene presets (DUSK/DAY/NIGHT, space, Mars) and applying them; sun placement.',
  ground: 'Ground: lakebed, grass, Mars terrain and rocks, test-pad texture, mountains, trees.',
  earth: 'Earth from orbit: procedural continents, clouds, ocean glint, terminator, city lights, atmosphere.',
  props: 'Props shared by the jet stands: light poles, hangar, blast fence.',
  builders: 'One builder per machine, in ENG order (index = ?m). Moves into src/machines/<name>/ in step 5.',
  plume: 'Ray-marched volumetric plume: shader, plume box, per-frame parameters from the simulation.',
  particles: 'Particles: instanced pools (sparks, smoke/steam/dust, fire, flow tracers), emitters, fire puffs.',
  composite: 'Render targets and the composite pass (heat haze, plume, schlieren/thermal modes) + bloom + output.',
  machine: 'Per-machine configuration (plume box, shadow area, camera presets, ground type) and switching machines.',
  camera: 'Camera: smooth glide between presets, drag to orbit, wheel to zoom, shake.',
  lenses: 'Lens passes: thermal (temperature into the red channel) and schlieren (black silhouettes on grey).',
  flow: 'Cutaway flow tracers along each machine\'s gas paths.',
  overlay: '2D overlay on the HUD canvas: part labels in cutaway, lens legend.',
  frame: 'The per-frame render: update the machine, camera, plume, particles, tracers, then the render passes.',
};

const src = execFileSync('git', ['show', `${BASE}:src/render3d/index.js`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const ast = parse(src, { sourceType: 'module' });
let fnPath, programScope;
traverse(ast, {
  Program(p) { programScope = p.scope; },
  FunctionDeclaration(p) { if (p.node.id.name === 'init3D') { fnPath = p; p.stop(); } },
});
const fnScope = fnPath.scope;
const body = fnPath.node.body.body;

// where each program-level import comes from (paths are relative to src/render3d/, same as the new modules)
const importFrom = new Map();
for (const st of ast.program.body) if (st.type === 'ImportDeclaration') for (const s of st.specifiers) importFrom.set(s.local.name, st.source.value);

const modOf = line => { const r = RANGES.find(([a, b]) => line >= a && line <= b); if (!r) throw new Error(`no module for line ${line}`); return r[2]; };

// names declared at init3D level -> module
const owner = new Map();
for (const st of body) {
  const m = modOf(st.loc.start.line);
  if (st.type === 'FunctionDeclaration') owner.set(st.id.name, m);
  if (st.type === 'VariableDeclaration') for (const d of st.declarations) for (const n of Object.keys(collectIds(d.id))) owner.set(n, m);
}
// `var` declared inside blocks (mountains) is function-scoped too
for (const [n, b] of Object.entries(fnScope.bindings)) if (!owner.has(n) && b.kind === 'var') owner.set(n, modOf(b.path.node.loc.start.line));
function collectIds(id, out = {}) {
  if (id.type === 'Identifier') out[id.name] = 1;
  else if (id.type === 'ArrayPattern') id.elements.forEach(e => e && collectIds(e, out));
  else if (id.type === 'ObjectPattern') id.properties.forEach(p => collectIds(p.value || p.argument, out));
  else throw new Error('unsupported pattern ' + id.type);
  return out;
}

// Rewrite `var x=...` inside blocks (function-scoped vars that are now module-level) into assignments.
function nestedVarEdits(node) {
  const edits = [];
  traverse(ast, {
    enter(p) { if (p.node.end <= node.start || p.node.start >= node.end) p.skip(); },
    VariableDeclaration(p) {
      if (p.node === node || p.node.kind !== 'var') return;
      if (p.node.start < node.start || p.node.end > node.end) return;
      if (p.scope.getFunctionParent()?.block !== fnPath.node) return;
      edits.push([p.node.start, p.node.start + 4, '']);   // drop "var "
    },
  });
  return edits;
}
const slice = (a, b, edits = []) => {
  let s = '', i = a;
  for (const [x, y, t] of edits.filter(e => e[0] >= a && e[1] <= b).sort((p, q) => p[0] - q[0])) { s += src.slice(i, x) + t; i = y; }
  return s + src.slice(i, b);
};

// Names a node uses: init3D-level bindings, the params T/X, or program-level imports.
const usesCache = new Map();
function uses(node) {
  if (usesCache.has(node)) return usesCache.get(node);
  const out = new Set();
  traverse(ast, {
    enter(p) { if (p.node.end <= node.start || p.node.start >= node.end) p.skip(); },
    Identifier(p) {
      if (p.node.start < node.start || p.node.end > node.end) return;
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;
      const b = p.scope.getBinding(p.node.name);
      if (b && (b.scope === fnScope || b.scope === programScope)) out.add(p.node.name);
    },
  });
  usesCache.set(node, out);
  return out;
}

// Build modules.
const mods = new Map();
const mod = m => mods.get(m) || mods.set(m, { decls: [], lets: [], runs: [], uses: new Set() }).get(m);
const order = [];   // create functions in v11 order
let gap = '', cur = null;   // current run { m, parts }
const indexTail = [];
for (let i = 0; i < body.length; i++) {
  const st = body[i], prevEnd = i ? body[i - 1].end : fnPath.node.body.start + 1;
  gap += src.slice(prevEnd, st.start);
  const m = modOf(st.loc.start.line), M = mod(m);
  for (const n of uses(st)) M.uses.add(n);
  if (m === 'index') { indexTail.push(gap + slice(st.start, st.end)); gap = ''; continue; }
  if (st.type === 'FunctionDeclaration') {
    M.decls.push(gap.replace(/^\n+/, '\n') + 'export ' + slice(st.start, st.end, nestedVarEdits(st)));
    gap = '';
    continue;
  }
  let text;
  if (st.type === 'VariableDeclaration') {
    const parts = [];
    for (const d of st.declarations) {
      M.lets.push(...Object.keys(collectIds(d.id)));
      if (!d.init) continue;
      const lhs = slice(d.id.start, d.id.end), rhs = slice(d.init.start, d.init.end, nestedVarEdits(d.init));
      parts.push(d.id.type === 'ObjectPattern' ? `;(${lhs}=${rhs})` : `${d.id.type === 'ArrayPattern' ? ';' : ''}${lhs}=${rhs}`);
    }
    text = parts.join(';') + ';';
  } else text = slice(st.start, st.end, nestedVarEdits(st));
  if (!cur || cur.m !== m) {
    const n = M.runs.length + 1, name = `create${m[0].toUpperCase()}${m.slice(1)}${n > 1 ? n : ''}`;
    cur = { m, name, parts: [] };
    M.runs.push(cur);
    order.push(cur);
  }
  cur.parts.push(gap + text);
  gap = '';
}
// a function declaration between two runs of the same module ends the run (keeps order explicit)
// (handled: runs are split whenever another module's statement intervenes)

const rel = (from, to) => { let r = posix.relative(posix.dirname(from), to); return r.startsWith('.') ? r : './' + r; };
const files = new Map();
function importsFor(m, usesSet, ownNames, extra = []) {
  const byFile = new Map();
  const add = (f, n) => (byFile.get(f) || byFile.set(f, new Set()).get(f)).add(n);
  for (const [f, n] of extra) add(f, n);
  let star = false;
  for (const n of usesSet) {
    if (ownNames.has(n)) continue;
    if (n === 'T') { star = true; continue; }
    if (n === 'X') { add('./addons.js', 'X'); continue; }
    if (owner.has(n)) { add(`./${owner.get(n)}.js`, n); continue; }
    if (importFrom.has(n)) { add(importFrom.get(n), n); continue; }
    throw new Error(`${m}: unknown name ${n}`);
  }
  const lines = [];
  if (star) lines.push(`import * as T from 'three';`);
  for (const [f, ns] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) lines.push(`import { ${[...ns].sort().join(', ')} } from '${f}';`);
  return lines.join('\n');
}

for (const [m, M] of mods) {
  if (m === 'index') continue;
  const own = new Set([...M.lets, ...[...owner].filter(([, o]) => o === m).map(([n]) => n)]);
  const imp = importsFor(m, M.uses, own);
  const varLets = [...owner].filter(([n, o]) => o === m && fnScope.bindings[n]?.kind === 'var').map(([n]) => n);
  const lets = [...M.lets, ...varLets];
  let out = `// ${ABOUT[m]}\n${imp}${imp ? '\n' : ''}`;
  if (lets.length) out += `\n// assigned by create*() below, when init3D runs\nexport let ${lets.join(',')};\n`;
  const decls = M.decls.join('').replace(/^\n+/, '\n');
  const runs = M.runs.map(r => `\nexport function ${r.name}(){${r.parts.join('')}\n}`).join('\n');
  // keep source order between declarations and runs: emit runs first (they reference functions, which hoist)
  out += runs + '\n' + decls + '\n';
  files.set(`${m}.js`, out);
}

{
  const M = mods.get('index');
  const own = new Set(['init3D']);
  const usesSet = new Set(M.uses);
  const imp = importsFor('index', usesSet, own, order.map(r => [`./${r.m}.js`, r.name]));
  const header = src.slice(0, fnPath.parentPath.node.start).replace(/^[\s\S]*?\n(?=\/\*)/, '');   // the big pipeline comment
  files.set('index.js', `// 3D renderer (Three.js), loaded on demand by core/loader3d.js together with three.
// init3D creates everything in exactly v11's order (object ids and UUID random draws depend on it), then
// returns the G3 interface the rest of the program uses.
${imp}

${header}export function init3D(){
${order.map(r => `${r.name}();`).join('\n')}${indexTail.join('').replace(/^\n+/, '\n')}}
`);
}
files.set('addons.js', `// The postprocessing addons the composite pass uses (the same modules core/loader3d.js fetches).
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const X = { EffectComposer, ShaderPass, UnrealBloomPass, OutputPass };
`);

// the comment that followed `const k3={};` on the same line belongs to context.js, not to the next statement
const K3C = '/* 3D renderer state shared between sections */';
files.set('kit.js', files.get('kit.js').replace(`export function createKit(){${K3C}`, 'export function createKit(){'));
if (files.get('kit.js').includes(K3C)) throw new Error('k3 comment not moved');

for (const [f, text] of files) {
  const p = resolve(ROOT, 'src/render3d', f);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text);
}
console.log([...files.keys()].map(f => `src/render3d/${f}  ${files.get(f).length} chars`).join('\n'));
console.log('init3D order:', order.map(r => r.name).join(' '));
