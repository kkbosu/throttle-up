// One-off (step 5b of the Vite split): move each machine's code into src/machines/<name>/.
//   node tools/split/machines.mjs --upto N     moves machines 0..N (always starting from commit fb76bac)
// Per machine: machine.js (its MC entry as the default export + its own sim/audio code), inset.js, draw2d.js
// (shuttle), and three.js gains its builder and CFG entry (`build`, `cfg`). Code moves verbatim; imports are
// computed with Babel; every file importing moved names is rewritten; the test bridge is regenerated.
// At N=7: machines/table.js becomes machines/index.js (MC = [m0..m7]), ENG and CFG come from M3.

import { execFileSync } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default || traverseMod;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'fb76bac';
const UPTO = +(process.argv[process.argv.indexOf('--upto') + 1] ?? 7);
const FINAL = UPTO === 7;
const git = f => execFileSync('git', ['show', `${BASE}:src/${f}`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const ALL = execFileSync('git', ['ls-tree', '-r', '--name-only', BASE, 'src'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').map(f => f.slice(4)).filter(f => f.endsWith('.js'));

const NAMES = ['f-type', 'sr-71', 'shuttle', 'hall', 'saturn-v', 'harrier', 'nk-12', 'sky-crane'];
const TITLE = ['F-TYPE', 'SR-71 J58', 'SHUTTLE (RS-25)', 'HALL thruster', 'SATURN V (five F-1s)', 'HARRIER (Pegasus)', 'NK-12', 'SKY CRANE'];
// top-level names of machines/table.js and render3d/builders.js -> destination (relative to src/), per machine
const MOVES = [
  { 'machine.js': ['MC0', 'auF'], 'three.js': ['buildF'] },
  { 'machine.js': ['MC1', 'auSR'], 'inset.js': ['spikeInset'], 'three.js': ['buildSR'] },
  { 'machine.js': ['MC2', 'auSS'], 'draw2d.js': ['drawSS', 'plumeSS', 'bellSS', 'baySS', 'rearSS'], 'three.js': ['buildSS'], '../shared/gimbal.js': ['gimb'] },
  { 'machine.js': ['MC3', 'htT', 'MU', 'RE', 'WN', 'WF', 'orb', 'orbReset', 'orbStep', 'auHT'], 'inset.js': ['orbitInset'], 'three.js': ['buildHT'] },
  { 'machine.js': ['MC4', 'sicE', 'sicStep', 'auF1'], 'three.js': ['buildF1'] },
  { 'machine.js': ['MC5', 'HM', 'HT', 'G0', 'harT', 'hovL', 'hoverStep', 'auHR'], 'inset.js': ['hoverInset'], 'three.js': ['buildHR'] },
  { 'machine.js': ['MC6', 'TPW', 'TPJ', 'tpP', 'tpT', 'tpStep', 'auTP'], 'inset.js': ['propInset'], 'three.js': ['bladeGeo', 'buildTP'] },
  { 'machine.js': ['MC7', 'GM', 'MR', 'MS', 'MLE', 'MLN', 'CANT', 'RH', 'BL', 'sc', 'skyReset', 'skyRy', 'skyHov', 'skyCam', 'skyStep', 'auSC'], 'inset.js': ['craneInset'], 'three.js': ['buildSC'] },
];
const BUILD = ['buildF', 'buildSR', 'buildSS', 'buildHT', 'buildF1', 'buildHR', 'buildTP', 'buildSC'];
const HEAD = {
  'machine.js': t => `// ${t}: the machine's table entry (engine model numbers, gauges, lamps, lever labels, SEQUENCE, INFO with sources)\n// plus its own simulation and synthesized voice.`,
  'inset.js': (t, i) => `// ${t}: the inset panel drawn beside the gauges.` + (i === 1 ? `\n// Never shown, as in v11: the SR-71 entry has no \`inset\` flag (see Known issues in CLAUDE.md).` : ''),
  'draw2d.js': t => `// ${t}: the hand-drawn 2D renderer (used when 3D is unavailable).`,
  '../shared/gimbal.js': () => '// Gimbal wobble shared by the RS-25 (shuttle) and the F-1s (Saturn V), in 2D and 3D.',
};

const owner = new Map();   // name -> file (relative to src/)
for (let i = 0; i <= UPTO; i++) for (const [f, ns] of Object.entries(MOVES[i])) for (const n of ns) owner.set(n, posix.normalize(`machines/${NAMES[i]}/${f}`));
const TABLE_OUT = FINAL ? 'machines/index.js' : 'machines/table.js';
const ownerOf = (n, fallback) => owner.get(n) || fallback;

const rel = (from, to) => { let r = posix.relative(posix.dirname(from), to); return r.startsWith('.') ? r : './' + r; };
const abs = (from, spec) => spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(from), spec)) : spec;

// ---------- read a source file: top-level statements with names, uses, and gap text ----------
function analyse(file) {
  const src = git(file), ast = parse(src, { sourceType: 'module' });
  let pscope; traverse(ast, { Program(p) { pscope = p.scope; p.stop(); } });
  const imports = new Map();   // local name -> absolute target ('three' etc. stay bare); '*' handled separately
  for (const st of ast.program.body) if (st.type === 'ImportDeclaration') for (const s of st.specifiers) imports.set(s.local.name, { from: abs(file, st.source.value), kind: s.type, imported: s.imported?.name });
  const usesOf = node => {
    const out = new Set();
    traverse(ast, {
      enter(p) { if (p.node.end <= node.start || p.node.start >= node.end) p.skip(); },
      Identifier(p) {
        if (p.node.start < node.start || p.node.end > node.end) return;
        if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;
        const b = p.scope.getBinding(p.node.name);
        if (b && b.scope === pscope) out.add(p.node.name);
      },
    });
    return out;
  };
  const stmts = [];
  let gap = '';
  ast.program.body.forEach((st, i) => {
    const prevEnd = i ? ast.program.body[i - 1].end : 0;
    gap += src.slice(prevEnd, st.start);
    if (st.type === 'ImportDeclaration') { gap = ''; return; }
    const d = st.declaration || st;
    const names = d.type === 'FunctionDeclaration' ? [d.id.name] : d.type === 'VariableDeclaration' ? d.declarations.map(x => x.id.name) : [];
    stmts.push({ st, d, names, gap, text: src.slice(st.start, st.end) });
    gap = '';
  });
  return { file, src, ast, imports, usesOf, stmts, tail: gap };
}

// import lines for a piece of code that uses `names`, given where those names live
function importLines(file, names, info, localOwner) {
  const by = new Map(), star = [], def = [];
  for (const n of names) {
    let from, imported = n, kind = 'ImportSpecifier';
    const o = localOwner(n);
    if (o) { if (o === file) continue; from = o; }
    else if (info.imports.has(n)) { ({ from, kind } = info.imports.get(n)); imported = info.imports.get(n).imported ?? n; if (from === file) continue; }
    else throw new Error(`${file}: don't know where ${n} lives`);
    if (kind === 'ImportNamespaceSpecifier') { star.push([n, from]); continue; }
    if (kind === 'ImportDefaultSpecifier') { def.push([n, from]); continue; }
    if (imported !== n) throw new Error('renamed import not supported: ' + n);
    (by.get(from) || by.set(from, new Set()).get(from)).add(n);
  }
  const spec = f => f.includes('/') || f.endsWith('.js') ? rel(file, f) : f;
  return [
    ...star.map(([n, f]) => `import * as ${n} from '${spec(f)}';`),
    ...def.map(([n, f]) => `import ${n} from '${spec(f)}';`),
    ...[...by].sort(([a], [b]) => a.localeCompare(b)).map(([f, ns]) => `import { ${[...ns].sort().join(', ')} } from '${spec(f)}';`),
  ];
}

const out = new Map();   // file (relative to src/) -> text
const TB = analyse('machines/table.js'), BU = analyse('render3d/builders.js');
const mcStmt = TB.stmts.find(s => s.names.includes('MC'));
const mcEls = mcStmt.d.declarations[0].init.elements;

// ---------- new machine files ----------
const pieces = new Map();   // file -> [{text, uses, info}]
const addPiece = (f, p) => (pieces.get(f) || pieces.set(f, []).get(f)).push(p);
for (const s of TB.stmts) {
  const dest = new Set(s.names.map(n => owner.get(n)));
  if (dest.size > 1) throw new Error('declaration split across files: ' + s.names.join(','));
  const f = [...dest][0];
  if (f) addPiece(f, { text: s.gap.replace(/^\n+/, '\n') + s.text, uses: TB.usesOf(s.st), info: TB, names: s.names });
}
for (const s of BU.stmts) {
  const f = s.names.length && owner.get(s.names[0]);
  if (f) addPiece(f, { text: s.gap.replace(/^\n+/, '\n') + s.text, uses: BU.usesOf(s.st), info: BU, names: s.names });
}
for (let i = 0; i <= UPTO; i++) {
  const el = mcEls[i];
  addPiece(`machines/${NAMES[i]}/machine.js`, { text: `\nexport default ${TB.src.slice(el.start, el.end)};`, uses: TB.usesOf(el), info: TB, names: [], last: true });
}
const tableOwner = info => n => owner.get(n) || (info === TB && TB.stmts.some(s => s.names.includes(n)) ? TABLE_OUT : info === BU && BU.stmts.some(s => s.names.includes(n)) ? 'render3d/builders.js' : null);

for (const [f, ps] of pieces) {
  if (f.endsWith('/three.js')) continue;   // merged below
  const i = NAMES.findIndex(n => f.startsWith(`machines/${n}/`)), kind = f.split('/').pop();
  const headKey = f === 'machines/shared/gimbal.js' ? '../shared/gimbal.js' : kind;
  const imps = new Set();
  for (const p of ps) for (const l of importLines(f, p.uses, p.info, tableOwner(p.info))) imps.add(l);
  const body = [...ps.filter(p => !p.last), ...ps.filter(p => p.last)].map(p => p.text).join('');
  out.set(f, `${HEAD[headKey](TITLE[i], i)}\n${[...imps].join('\n')}\n${body.replace(/^\n+/, '\n')}\n`);
}

// three.js: base hooks file + builder (+ helpers) + cfg/build in the default export
const MA = analyse('render3d/machine.js');
let cfgArr = null;
traverse(MA.ast, { AssignmentExpression(p) { if (p.node.left.name === 'CFG') { cfgArr = p.node.right; p.stop(); } } });
for (let i = 0; i <= UPTO; i++) {
  const f = `machines/${NAMES[i]}/three.js`, base = git(f);
  const ps = pieces.get(f) || [];
  const imps = new Set(base.split('\n').filter(l => l.startsWith('import ')));
  for (const p of ps) for (const l of importLines(f, p.uses, p.info, tableOwner(p.info))) imps.add(l);
  const cfg = MA.src.slice(cfgArr.elements[i].start, cfgArr.elements[i].end);
  const [first, ...rest] = base.split('\n');
  const body = rest.filter(l => !l.startsWith('import ')).join('\n').replace('export default {\n', `export default {\ncfg:${cfg},\nbuild:${BUILD[i]},\n`);
  const head = first.replace(': 3D renderer hooks (', ': the 3D side. Builder (the model), cfg (plume box, shadow area, camera presets, ground) and renderer hooks (');
  out.set(f, `${head}\n${[...imps].join('\n')}\n${ps.map(p => p.text).join('').replace(/^\n+/, '\n')}\n${body.replace(/^\n+/, '\n')}`);
}

// ---------- what stays: machines/table.js (-> index.js at the end), render3d/builders.js, render3d/machine.js ----------
{
  const keep = TB.stmts.filter(s => !s.names.some(n => owner.has(n)));
  let mcText = TB.src.slice(mcStmt.st.start, mcStmt.st.end);
  for (let i = UPTO; i >= 0; i--) { const el = mcEls[i], o = mcStmt.st.start; mcText = mcText.slice(0, el.start - o) + `m${i}` + mcText.slice(el.end - o); }
  const uses = new Set();
  for (const s of keep) for (const n of (s === mcStmt ? new Set([...TB.usesOf(s.st)].filter(n => mcEls.slice(UPTO + 1).some(el => TB.usesOf(el).has(n)) || ![...mcEls].some(el => TB.usesOf(el).has(n)))) : TB.usesOf(s.st))) uses.add(n);
  const imps = importLines(TABLE_OUT, uses, TB, tableOwner(TB));
  for (let i = 0; i <= UPTO; i++) imps.push(`import m${i} from './${NAMES[i]}/machine.js';`);
  const head = FINAL ? '// The machine table: every machine in order (index = ?m = chip order). Each one lives in src/machines/<name>/.' : TB.src.split('\n')[0];
  const body = keep.map(s => s === mcStmt ? s.gap + mcText : s.gap + s.text).join('');
  out.set(TABLE_OUT, `${head}\n${imps.join('\n')}\n${body.replace(/^\n+/, '\n')}\n`);
}
{
  const keep = BU.stmts.filter(s => !s.names.some(n => owner.has(n)));
  const uses = new Set();
  for (const s of keep) for (const n of BU.usesOf(s.st)) uses.add(n);
  if (FINAL) { uses.delete('buildF'); for (const b of BUILD) uses.delete(b); uses.add('M3'); }
  const imps = importLines('render3d/builders.js', [...uses].filter(n => n !== 'M3'), BU, tableOwner(BU));
  if (FINAL) imps.push(`import { M3 } from '../machines/three.js';`);
  let body = keep.map(s => s.gap + s.text).join('');
  const ENG_OLD = 'ENG=[buildF(),buildSR(),buildSS(),buildHT(),buildF1(),buildHR(),buildTP(),buildSC()];';
  if (FINAL) { if (!body.includes(ENG_OLD)) throw new Error('ENG line not found'); body = body.replace(ENG_OLD, 'ENG=M3.map(m=>m.build());'); }
  const head = FINAL ? '// Builds every machine\'s 3D model in machine order (the builders live in src/machines/<name>/three.js).' : BU.src.split('\n')[0];
  out.set('render3d/builders.js', `${head}\n${imps.join('\n')}\n${body.replace(/^\n+/, '\n')}\n`);
}
{
  let s = MA.src;
  if (FINAL) s = s.slice(0, cfgArr.start) + 'M3.map(m=>m.cfg)' + s.slice(cfgArr.end);
  else for (let i = UPTO; i >= 0; i--) s = s.slice(0, cfgArr.elements[i].start) + `M3[${i}].cfg` + s.slice(cfgArr.elements[i].end);
  const nl = s.indexOf('\n');
  out.set('render3d/machine.js', s.slice(0, nl + 1) + `import { M3 } from '../machines/three.js';\n` + s.slice(nl + 1));
}

// ---------- M3 is filled when init3D starts, not when modules load ----------
// Machine 3D files and renderer modules import each other (e.g. builders.js imports buildF; f-type/three.js
// imports renderer helpers that import M3). Inside such a cycle a module's default export may not exist yet
// while modules are still loading, so the list must not be built at import time.
for (const f of ALL) if (!out.has(f) && f !== 'machines/table.js') out.set(f, git(f));
{
  const f = 'machines/three.js', s = out.get(f);
  const eager = `export const M3 = [${NAMES.map((n, i) => `m${i}`).join(', ')}];`;
  if (!s.includes(eager)) throw new Error('M3 line not found');
  out.set(f, s.replace('// The 3D side of every machine, in machine order (index = ?m). Imported only by the 3D renderer chunk.\n',
    '// The 3D side of every machine, in machine order (index = ?m). Imported only by the 3D renderer chunk.\n' +
    '// Filled by loadM3() when init3D starts: machine and renderer modules import each other, so while modules are\n' +
    '// still loading a machine\'s hook object may not exist yet.\n')
    .replace(eager, `export const M3 = [];\nexport function loadM3(){if(!M3.length)M3.push(${NAMES.map((n, i) => `m${i}`).join(',')})}`));
  const r = 'render3d/index.js', t = out.get(r);
  if (!t.includes('export function init3D(){\n')) throw new Error('init3D not found');
  const nl = t.indexOf('\n');
  out.set(r, (t.slice(0, nl + 1) + `import { loadM3 } from '../machines/three.js';\n` + t.slice(nl + 1)).replace('export function init3D(){\n', 'export function init3D(){\nloadM3();\n'));
}
// ---------- every file: re-target imports of moved names, drop self-imports, merge duplicate sources ----------
const MOVED_FROM = new Set(['machines/table.js', 'render3d/builders.js']);
for (const [f, text] of out) {
  if (f === 'debug/globals.js') continue;   // regenerated below
  const ast = parse(text, { sourceType: 'module' });
  const decls = ast.program.body.filter(st => st.type === 'ImportDeclaration');
  if (!decls.length) continue;
  // Only declarations importing from table.js / builders.js change; everything else stays byte for byte.
  const isNamed = st => st.specifiers.length && st.specifiers.every(s => s.type === 'ImportSpecifier');
  const touched = decls.filter(st => MOVED_FROM.has(abs(f, st.source.value)) && isNamed(st));
  if (!touched.length) continue;
  const want = new Map();   // target -> Set(names) contributed by the touched declarations
  for (const st of touched) for (const sp of st.specifiers) {
    const from = abs(f, st.source.value), n = sp.local.name;
    const o = owner.get(n) || (from === 'machines/table.js' ? TABLE_OUT : from);
    if (o !== f) (want.get(o) || want.set(o, new Set()).get(o)).add(n);
  }
  const spec = o => rel(f, o);
  const line = (o, ns) => `import { ${[...ns].sort().join(', ')} } from '${spec(o)}';`;
  const edits = [];   // [start, end, text]
  // merge into an untouched declaration of the same target if there is one
  for (const st of decls) {
    if (touched.includes(st) || !isNamed(st)) continue;
    const o = abs(f, st.source.value);
    if (!want.has(o)) continue;
    edits.push([st.start, st.end, line(o, new Set([...st.specifiers.map(s => s.local.name), ...want.get(o)]))]);
    want.delete(o);
  }
  // touched declarations: the first one takes all remaining targets, the others disappear
  touched.forEach((st, i) => {
    const t = i ? '' : [...want].sort(([a], [b]) => spec(a).localeCompare(spec(b))).map(([o, ns]) => line(o, ns)).join('\n');
    edits.push([st.start, st.end + (t === '' && text[st.end] === '\n' ? 1 : 0), t]);
  });
  let t2 = text;
  for (const [a, b, s] of edits.sort((x, y) => y[0] - x[0])) t2 = t2.slice(0, a) + s + t2.slice(b);
  out.set(f, t2);
}

// ---------- test bridge: every export of the main-chunk modules, plus state ----------
{
  const files = [...new Set([...ALL.filter(f => f !== 'machines/table.js'), ...out.keys()])].sort()
    .filter(f => !f.startsWith('render3d/') && !f.startsWith('debug/') && f !== 'main.js' && !/^machines\/(.+\/)?three\.js$/.test(f) && f !== 'machines/shared/jet3d.js' && f !== 'core/state.js');
  const ns = [], entries = [];
  const stateKeys = [...git('core/state.js').matchAll(/^ {2}(\w+): /gm)].map(m => m[1]);
  for (const k of stateKeys) entries.push(`d('${k}',()=>state.${k},v=>{state.${k}=v})`);
  files.forEach((f, i) => {
    const text = out.get(f) ?? git(f), ast = parse(text, { sourceType: 'module' });
    const names = [];
    for (const st of ast.program.body) if (st.type === 'ExportNamedDeclaration' && st.declaration) {
      const d = st.declaration;
      if (d.type === 'FunctionDeclaration') names.push(d.id.name); else for (const x of d.declarations) names.push(x.id.name);
    }
    if (!names.length) return;
    ns.push(`import * as m${i} from '${rel('debug/globals.js', f)}';`);
    for (const n of names) entries.push(`d('${n}',()=>m${i}.${n})`);
  });
  const old = git('debug/globals.js');
  const preamble = old.slice(0, old.indexOf('import { state }'));
  out.set('debug/globals.js', `${preamble}import { state } from '../core/state.js';
${ns.join('\n')}

const d=(k,g,s)=>{const o=Object.getOwnPropertyDescriptor(window,k);if(o&&!o.configurable){console.error('test bridge: cannot expose '+k);return}Object.defineProperty(window,k,{get:g,set:s,configurable:true})};
${entries.join(';\n')};
`);
}

// ---------- write ----------
if (FINAL) await rm(resolve(ROOT, 'src/machines/table.js'), { force: true });
for (const [f, text] of out) {
  const p = resolve(ROOT, 'src', f);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text);
}
console.log(`moved machines 0..${UPTO}; wrote ${out.size} files`);
