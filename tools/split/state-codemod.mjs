// One-off (step 2 of the Vite split): make shared mutable variables properties of objects, so code can later
// move into separate ES modules (an imported binding can't be assigned).
//   - every reassigned top-level `let` of src/legacy.js  -> `state.x`  (state lives in src/core/state.js)
//   - every reassigned `let` declared directly in init3D -> `k3.x`     (k3 = the 3D renderer's context)
// Binding-aware (Babel scope analysis): locals that shadow these names are left alone. Declarations become
// assignments at the same place, so initializers still run in the same order. The test bridge at the end of
// legacy.js is regenerated. Writes tools/split/state-report.txt (where each key is read and written).
// Run once, on the step-1b version of legacy.js.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';
import MagicString from 'magic-string';

const traverse = traverseMod.default || traverseMod;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = resolve(ROOT, 'src/legacy.js');
const MARK = '\n/* ---------- test bridge';

const all = await readFile(FILE, 'utf8');
if (!all.includes(MARK)) throw new Error('test bridge marker not found');
if (/(^|[^.\w$])(state|k3)\b/.test(all.slice(0, all.indexOf(MARK)))) throw new Error('legacy.js already uses the names state or k3 (already transformed?)');
const code = all.slice(0, all.indexOf(MARK) + 1);
const ast = parse(code, { sourceType: 'module' });
const s = new MagicString(code);

let program, init3D;
traverse(ast, {
  Program(p) { program = p; },
  FunctionDeclaration(p) { if (p.node.id.name === 'init3D') { init3D = p; p.skip(); } },
});
const pick = scope => Object.values(scope.bindings).filter(b => b.kind === 'let' && b.constantViolations.length);
const groups = [
  { obj: 'state', bindings: pick(program.scope) },
  { obj: 'k3', bindings: pick(init3D.scope) },
];

// Name of the top-level function (or 'top') each path sits in, for the report.
const where = p => { let f = p.getFunctionParent(), name = 'top'; while (f) { if (f.node.id) name = f.node.id.name; else if (f.parentPath.isVariableDeclarator()) name = f.parentPath.node.id.name; f = f.parentPath.getFunctionParent(); } return name; };

const report = [];
for (const { obj, bindings } of groups) {
  const byNode = new Map(bindings.map(b => [b.identifier, b]));
  const stats = new Map(bindings.map(b => [b, { r: new Map(), w: new Map(), n: 0 }]));
  const ids = new Set(bindings.map(b => b.identifier));

  // 1. every reference and assignment target that resolves to one of these bindings
  traverse(ast, {
    Identifier(p) {
      const b = p.scope.getBinding(p.node.name);
      if (!b || !stats.has(b) || ids.has(p.node)) return;
      if (!(p.isReferencedIdentifier() || p.isBindingIdentifier())) return;   // property keys, member names
      if (p.scope.hasBinding(obj)) throw new Error(`${obj} is shadowed at line ${p.node.loc.start.line}`);
      const parent = p.parent, st = stats.get(b);
      const write = (p.parentPath.isAssignmentExpression() && parent.left === p.node) || p.parentPath.isUpdateExpression() || p.isBindingIdentifier();
      const m = write ? st.w : st.r, fn = where(p);
      m.set(fn, (m.get(fn) || 0) + 1); st.n++;
      if (p.parentPath.isObjectProperty() && parent.shorthand && parent.value === p.node) s.overwrite(parent.start, parent.end, `${p.node.name}:${obj}.${p.node.name}`);
      else s.overwrite(p.node.start, p.node.end, `${obj}.${p.node.name}`);
    },
  });

  // 2. declarations -> assignments in place (kept declarators stay `let`)
  const decls = new Set(bindings.map(b => b.path.parentPath.node));
  for (const d of decls) {
    const parts = d.declarations.map(v => {
      const b = byNode.get(v.id);
      if (!b) return `let ${s.slice(v.start, v.end)};`;
      return v.init ? `${obj}.${v.id.name}=${s.slice(v.init.start, v.init.end)};` : '';
    });
    s.overwrite(d.start, d.end, parts.join(''));
  }

  report.push(`== ${obj} (${bindings.length} keys) ==`);
  const fmt = m => [...m].map(([f, n]) => n > 1 ? `${f}×${n}` : f).join(' ');
  for (const [b, st] of stats) report.push(`${obj}.${b.identifier.name}\n  read:  ${fmt(st.r) || '-'}\n  write: ${fmt(st.w) || '-'}`);
}

// k3 is created first thing in init3D, before any section can touch it.
const body = init3D.node.body;
s.appendLeft(body.start + 1, 'const k3={};/* 3D renderer state shared between sections */\n');

const out = s.toString();
const stateKeys = groups[0].bindings.map(b => b.identifier.name);

// Regenerate the test bridge from the transformed code.
const ast2 = parse(out, { sourceType: 'module', plugins: [] });
const names = [];
let undeclared = [];
traverse(ast2, { Program(p) { for (const [name, b] of Object.entries(p.scope.bindings)) names.push([name, b.kind]); undeclared = Object.keys(p.scope.globals); p.stop(); } });
// Sanity: a reference the rewrite missed would now point at a name nobody declares.
const moved = new Set(groups.flatMap(g => g.bindings.map(b => b.identifier.name)));
const missed = undeclared.filter(n => moved.has(n));
if (missed.length) throw new Error('references not rewritten: ' + missed.join(' '));
const entries = [
  ...stateKeys.map(n => `d('${n}',()=>state.${n},v=>{state.${n}=v})`),
  ...names.filter(([n]) => n !== 'state').map(([n, kind]) => kind === 'const' || kind === 'module' ? `d('${n}',()=>${n})` : `d('${n}',()=>${n},v=>{${n}=v})`),
];
const bridge = `
/* ---------- test bridge (generated by tools/split/state-codemod.mjs): tests read and assign these names on window, as they could when the scripts were classic ---------- */
{const d=(k,g,s)=>{const o=Object.getOwnPropertyDescriptor(window,k);if(o&&!o.configurable){console.error('test bridge: cannot expose '+k);return}Object.defineProperty(window,k,{get:g,set:s,configurable:true})};
${entries.join(';')}}
`;

const header = `import { state } from './core/state.js';\n`;
await writeFile(FILE, header + out + bridge.slice(1));
await mkdir(resolve(ROOT, 'src/core'), { recursive: true });
await writeFile(resolve(ROOT, 'src/core/state.js'), `// Shared mutable state: every top-level \`let\` that v11 reassigns. They live on one object so that
// separate modules can all write them (an imported binding can't be assigned).
// Every key exists from the start (values are set where v11 declared them, in the same order).
export const state = {
${stateKeys.map(k => `  ${k}: undefined,`).join('\n')}
};
`);
await writeFile(resolve(ROOT, 'tools/split/state-report.txt'), report.join('\n') + '\n');
console.log(`state: ${stateKeys.length} keys, k3: ${groups[1].bindings.length} keys; bridge exposes ${entries.length} names`);
