// One-off (step 3 of the Vite split): split src/legacy.js (as of commit 2d7d582) into ES modules.
//
// - Every top-level declaration moves verbatim to the module named in SPEC (multi-name `const`s can be split
//   per name), with `export` added. Comments between statements travel with the statement after them.
// - Imports are computed with Babel scope analysis: each module imports exactly the top-level names it uses.
// - Top-level statements that do work at load time (listeners, DOM setup, the 3D loader) keep v11's order:
//   each module's statements are wrapped, in order, in an exported `wireX()` function, and src/main.js calls
//   the wire functions (and runs its own statements) in the order v11 ran them.
// - The `state.x = value` initialisations from step 2 become the initial values in src/core/state.js.
// - The test bridge becomes src/debug/globals.js (accessors on window for every export and state key).
// - init3D moves to src/render3d/index.js, which the 3D loader now fetches together with three.
// Re-runnable: always starts from the committed step-2 file.

import { execFileSync } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default || traverseMod;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '2d7d582';

// module -> { about, names (declarations; 'L<line>' = the load-time statement(s) on that line), wire }
const SPEC = {
  'core/util.js': { about: 'Small shared helpers and constants: DOM lookup, the main 2D canvas, smoothstep, label tables, the HUD font.',
    names: ['$', 'cv', 'g', 'mk', 'sm', 'SNM', 'SL', 'SLN', 'VN', 'SN', 'ZT', 'MONO'] },
  'core/params.js': { about: 'URL parameters read at load: ?q (quality) and ?manual (tests step frames themselves).',
    names: ['QP', 'MAN'] },
  'hud/layout.js': { about: 'Layout: sizes the canvases and buffers to the window, places the HUD and lever.',
    names: ['resize', 'L39'], wire: 'wireLayout' },
  'render2d/sprites.js': { about: 'Pre-rendered glow sprites for the 2D renderer (the machine table reads them when it is built).',
    names: ['spr', 'SP', 'blob'] },
  'render2d/index.js': { about: '2D renderer (fallback for machines 0-2): off-screen buffers, particles, stars, sky, heat haze, bloom, frame draw.',
    names: ['B0', 'B1', 'B2', 'HS', 'HD', 'b0', 'b1', 'b2', 'hs', 'hd', 'P', 'EM', 'SM', 'VP', 'ST', 'sky', 'haze', 'bloom', 'draw'] },
  'render2d/jet.js': { about: '2D drawing shared by the jets (F-TYPE, SR-71); emit/stream/sparks/metal are also used by the RS-25.',
    names: ['emit', 'stream', 'tongues', 'plume', 'sparks', 'rear', 'wires', 'metal', 'doors', 'actuators', 'body'] },
  'hud/gauges.js': { about: 'Cockpit gauges, annunciator lamps, engine switch and inset placement, drawn on the canvas so clips include them.',
    names: ['A0', 'SW', 'GV', 'buildFaces', 'gauges', 'L968'], wire: 'wireGauges' },
  'input/lever.js': { about: 'Input: throttle lever (with the MIL detent), second lever, keyboard.',
    names: ['applyRaw', 'tq', 'trk', 'fromY', 'fromY2', 'K', 'keys', 'L46', 'L49', 'L50', 'L52', 'L54'], wire: 'wireInput' },
  'core/engine.js': { about: 'Engine model: spool, light-off, EGT, fuel flow, afterburner, compressor stall; machine hooks run from update().',
    names: ['update', 'startStall', 'surge', 'master'] },
  'audio/audio.js': { about: 'Audio: the Web Audio graph (all synthesized), per-frame mix, and one-shot sounds.',
    names: ['S', 'VV', 'initAudio', 'audio', 'thump', 'tick', 'bang', 'beep', 'L153'], wire: 'wireAudio' },
  'machines/table.js': { about: 'The machine table MC and every machine-specific helper (sim steps, voices, insets, RS-25 2D drawing). Split into src/machines/<name>/ in step 5.',
    names: ['MC', 'sicE', 'sicStep', 'HM', 'HT', 'G0', 'harT', 'hovL', 'hoverStep', 'auF1', 'auHR', 'TPW', 'TPJ', 'tpP', 'tpT', 'tpStep',
      'GM', 'MR', 'MS', 'MLE', 'MLN', 'CANT', 'RH', 'BL', 'sc', 'skyReset', 'skyRy', 'skyHov', 'skyCam', 'skyStep', 'auTP', 'auSC',
      'htT', 'MU', 'RE', 'WN', 'WF', 'orb', 'orbReset', 'orbStep', 'auHT', 'auF', 'auSR', 'auSS',
      'gimb', 'drawSS', 'plumeSS', 'bellSS', 'baySS', 'rearSS', 'propInset', 'craneInset', 'hoverInset', 'orbitInset', 'spikeInset'] },
  'hud/controls.js': { about: 'Controls: button labels (lab), button actions (act), lever labels, hint text, the START overlay.',
    names: ['lab', 'say', 'act', 'buildLabels', 'L154', 'L608'], wire: 'wireControls' },
  'core/machine-switch.js': { about: 'Machine selection: the chip buttons, which machines are available (3D-only ones need 3D), switching and resetting.',
    names: ['nextM', 'chips', 'setMachine', 'L1022'], wire: 'wireMachineSwitch' },
  'sequence/sequence.js': { about: 'SEQUENCE: a scripted run (wait / until / lever ramp / view cut / slow-mo) for one-tap clips.',
    names: ['SQ', 'seqStart', 'seqNext', 'seqStop', 'seqTick', 'seqCap'] },
  'info/info.js': { about: 'INFO panel: facts, what is approximated, the cutaway explanation and sources.',
    names: ['showInfo', 'closeInfo', 'L53', 'L600', 'L601'], wire: 'wireInfo' },
  'recorder/recorder.js': { about: 'REC: composites the WebGL frame and the HUD canvas into a clip with MediaRecorder; save/share.',
    names: ['RC', 'rc', 'canRec', 'startRec', 'stopRec', 'showClip', 'recLab', 'recOverlay', 'L989', 'L990', 'L991'], wire: 'wireRecorder' },
  'core/loop.js': { about: 'Main loop: sim time scaled by slow-mo, adaptive quality; step() is the test hook used with ?manual.',
    names: ['ui', 'adapt', 'frame', 'step'] },
  'core/loader3d.js': { about: '3D loader: fetches three and the renderer chunk; anything goes wrong (no WebGL2, offline, error) and the 2D renderer carries on.',
    names: ['ready3D', 'fail3D', 'L1030'], wire: 'load3D' },
  'render3d/index.js': { about: '3D renderer (Three.js). Loaded on demand by core/loader3d.js; split into modules in step 4.',
    names: ['init3D'] },
  'main.js': { about: 'Entry point: wires the page up in the order v11 did, picks the machine from ?m, starts the loop and the 3D loader.',
    names: ['L1023', 'L1029'] },
};

const src = execFileSync('git', ['show', `${BASE}:src/legacy.js`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const code = src.slice(0, src.indexOf('\n/* ---------- test bridge') + 1);
const ast = parse(code, { sourceType: 'module' });
let programScope;
traverse(ast, { Program(p) { programScope = p.scope; p.stop(); } });

// owner of every top-level name / load-time line
const owner = new Map();
for (const [mod, { names }] of Object.entries(SPEC)) for (const n of names) {
  if (owner.has(n)) throw new Error(`${n} assigned twice`);
  owner.set(n, mod);
}

// Collect pieces: { mod, text, line, kind: 'decl'|'run' } in source order. Text between statements (comments,
// blank lines) goes with the next statement.
const pieces = [];
const stateInit = new Map();
let gap = '';
const body = ast.program.body;
for (let i = 0; i < body.length; i++) {
  const st = body[i], prevEnd = i ? body[i - 1].end : 0;
  gap += code.slice(prevEnd, st.start);
  const text = code.slice(st.start, st.end);
  const line = st.loc.start.line;
  if (st.type === 'ImportDeclaration') { gap = ''; continue; }
  if (st.type === 'ExpressionStatement' && st.expression.type === 'AssignmentExpression' && st.expression.left.type === 'MemberExpression'
      && st.expression.left.object.name === 'state') {
    const k = st.expression.left.property.name, r = st.expression.right;
    stateInit.set(k, { text: code.slice(r.start, r.end), node: r });
    continue;   // gap (if any) carries on to the next statement
  }
  if (st.type === 'FunctionDeclaration') {
    const mod = owner.get(st.id.name);
    if (!mod) throw new Error(`no module for function ${st.id.name}`);
    pieces.push({ mod, kind: 'decl', text: gap + 'export ' + text, names: [st.id.name], node: st });
  } else if (st.type === 'VariableDeclaration') {
    // group declarators by module, keeping order; each group becomes its own statement
    const groups = new Map();
    for (const d of st.declarations) {
      const mod = owner.get(d.id.name);
      if (!mod) throw new Error(`no module for ${d.id.name}`);
      if (!groups.has(mod)) groups.set(mod, []);
      groups.get(mod).push(d);
    }
    let first = true;
    for (const [mod, ds] of groups) {
      const t = `export ${st.kind} ${ds.map(d => code.slice(d.start, d.end)).join(',')};`;
      pieces.push({ mod, kind: 'decl', text: (first ? gap : '\n') + t, names: ds.map(d => d.id.name), node: st, decls: ds });
      first = false;
    }
  } else {
    const mod = owner.get('L' + line);
    if (!mod) throw new Error(`no module for load-time statement at line ${line}: ${text.slice(0, 60)}`);
    pieces.push({ mod, kind: 'run', text: gap + text, line, node: st });
  }
  gap = '';
}
for (const n of owner.keys()) if (!n.startsWith('L') && !programScope.bindings[n]) throw new Error(`SPEC names unknown binding ${n}`);

// Which top-level names (and `state`) does a piece use? (references resolving to program-level bindings)
// For split declarations only the moved declarators count.
function piecesUses(pc) {
  if (pc.decls) { const s = new Set(); for (const d of pc.decls) for (const n of usesOf(d)) s.add(n); return s; }
  return usesOf(pc.node);
}
const cache = new Map();
function usesOf(node) {
  if (!cache.has(node)) {
    // walk the whole AST (scopes need real paths), skipping everything outside the node's range
    const out = new Set();
    traverse(ast, {
      enter(p) { if (p.node.end <= node.start || p.node.start >= node.end) p.skip(); },
      Identifier(p) {
        if (p.node.start < node.start || p.node.end > node.end) return;
        if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;
        const b = p.scope.getBinding(p.node.name);
        if (b && b.scope === programScope) out.add(p.node.name);
      },
    });
    cache.set(node, out);
  }
  return cache.get(node);
}

// Build each module.
const mods = new Map(Object.keys(SPEC).map(m => [m, { decl: [], run: [], uses: new Set(), names: [] }]));
for (const pc of pieces) {
  const m = mods.get(pc.mod);
  (pc.kind === 'decl' ? m.decl : m.run).push(pc);
  if (pc.names) m.names.push(...pc.names);
  for (const n of piecesUses(pc)) m.uses.add(n);
}

const nameOwner = new Map();
for (const [mod, m] of mods) for (const n of m.names) nameOwner.set(n, mod);
const rel = (from, to) => { let r = posix.relative(posix.dirname(from), to); return r.startsWith('.') ? r : './' + r; };

const files = new Map();
const wireCalls = [];   // in v11 order
for (const pc of pieces) if (pc.kind === 'run') {
  const spec = SPEC[pc.mod];
  if (spec.wire) { if (!wireCalls.some(w => w.mod === pc.mod)) wireCalls.push({ mod: pc.mod, fn: spec.wire }); }
  else wireCalls.push({ mod: pc.mod, text: pc.text });
}

for (const [mod, m] of mods) {
  if (mod === 'main.js') continue;
  const spec = SPEC[mod];
  const imports = new Map();
  for (const n of m.uses) {
    if (n === 'state') { (imports.get('core/state.js') || imports.set('core/state.js', new Set()).get('core/state.js')).add('state'); continue; }
    const o = nameOwner.get(n);
    if (!o) throw new Error(`${mod} uses ${n}, which no module declares`);
    if (o === mod) continue;
    if (mod === 'core/loader3d.js' && n === 'init3D') continue;   // fetched with import() below, never imported statically
    (imports.get(o) || imports.set(o, new Set()).get(o)).add(n);
  }
  const imp = [...imports].sort(([a], [b]) => a.localeCompare(b)).map(([o, ns]) => `import { ${[...ns].sort().join(', ')} } from '${rel(mod, o)}';`).join('\n');
  let body = m.decl.map(p => p.text).join('').replace(/^\n+/, '');
  // the loader now fetches the renderer chunk too, and gets init3D from it
  if (mod === 'core/loader3d.js') {
    body = body.replace('state.G3=init3D(X.T,X)', 'state.G3=X.init3D(X.T,X)');
  }
  if (m.run.length) {
    let run = m.run.map(p => p.text).join('').replace(/^\n+/, '');
    if (mod === 'core/loader3d.js') {
      run = run.replace("import('three/addons/postprocessing/OutputPass.js')])", "import('three/addons/postprocessing/OutputPass.js'),import('../render3d/index.js')])")
        .replace('.then(([T,a,b,c,d])=>', '.then(([T,a,b,c,d,r])=>')
        .replace('OutputPass:d.OutputPass})', 'OutputPass:d.OutputPass,init3D:r.init3D})');
      if (!run.includes("import('../render3d/index.js')") || !run.includes('init3D:r.init3D')) throw new Error('loader rewrite failed');
    }
    body += `\n/* load-time setup, called from main.js in v11's order */\nexport function ${spec.wire}(){\n${run}\n}`;
  }
  files.set(mod, `// ${spec.about}\n${imp}${imp ? '\n' : ''}\n${body}\n`);
}

// main.js
{
  const m = mods.get('main.js'), imports = new Map();
  const add = (o, n) => (imports.get(o) || imports.set(o, new Set()).get(o)).add(n);
  for (const n of m.uses) add(n === 'state' ? 'core/state.js' : nameOwner.get(n), n);
  for (const w of wireCalls) if (w.fn) add(w.mod, w.fn);
  const imp = [...imports].sort(([a], [b]) => a.localeCompare(b)).map(([o, ns]) => `import { ${[...ns].sort().join(', ')} } from '${rel('main.js', o)}';`).join('\n');
  const steps = wireCalls.map(w => w.fn ? `${w.fn}();` : w.text.replace(/^\n+/, '')).join('\n');
  files.set('main.js', `// ${SPEC['main.js'].about}\n${imp}\nimport './debug/globals.js';\n\n${steps}\n`);
}

// state.js with v11's initial values (key order from the step-2 file)
const stateKeys = [...execFileSync('git', ['show', `${BASE}:src/core/state.js`], { cwd: ROOT, encoding: 'utf8' }).matchAll(/^ {2}(\w+): undefined,$/gm)].map(x => x[1]);
const stateUses = new Set();
for (const { node } of stateInit.values()) for (const n of usesOf(node)) stateUses.add(n);
const stImp = [...stateUses].map(n => `import { ${n} } from '${rel('core/state.js', nameOwner.get(n))}';`).join('\n');
files.set('core/state.js', `// Shared mutable state: every top-level \`let\` that v11 reassigns, with v11's initial values. They live on one
// object so that separate modules can all write them (an imported binding can't be assigned).
${stImp}${stImp ? '\n' : ''}
export const state = {
${stateKeys.map(k => `  ${k}: ${stateInit.has(k) ? stateInit.get(k).text : 'undefined'},`).join('\n')}
};
`);
for (const k of stateInit.keys()) if (!stateKeys.includes(k)) throw new Error(`state init for unknown key ${k}`);

// test bridge
{
  const nsMods = [...mods.keys()].filter(m => m !== 'main.js' && m !== 'render3d/index.js');
  const imp = nsMods.map((m, i) => `import * as m${i} from '${rel('debug/globals.js', m)}';`).join('\n');
  const entries = [
    ...stateKeys.map(k => `d('${k}',()=>state.${k},v=>{state.${k}=v})`),
    ...nsMods.flatMap((m, i) => mods.get(m).names.map(n => `d('${n}',()=>m${i}.${n})`)),
  ];
  files.set('debug/globals.js', `// Test bridge: in v11 everything was a global, and tests (tools/snapshots.mjs, tools/legacy-tests) read and
// assign names like view, raw, N or step() directly. Expose every module export and state key on window.
import { state } from '../core/state.js';
${imp}

const d=(k,g,s)=>{const o=Object.getOwnPropertyDescriptor(window,k);if(o&&!o.configurable){console.error('test bridge: cannot expose '+k);return}Object.defineProperty(window,k,{get:g,set:s,configurable:true})};
${entries.join(';\n')};
`);
}

for (const [mod, text] of files) {
  const p = resolve(ROOT, 'src', mod);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text);
}
await rm(resolve(ROOT, 'src/legacy.js'), { force: true });
console.log([...files.keys()].map(f => `src/${f}  ${files.get(f).length} chars`).join('\n'));
console.log('main.js order:', wireCalls.map(w => w.fn || w.text.trim().slice(0, 30)).join(' | '));
