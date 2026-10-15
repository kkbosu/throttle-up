// One-off (step 5a of the Vite split): replace every branch on the machine index with per-machine hooks.
// Runs on the files as of commit 8a7d684 (re-runnable). Hook bodies are the old branch bodies, extracted
// verbatim with Babel, so the arithmetic (and therefore every pixel) stays the same.
//
// 3D side: src/machines/<name>/three.js (one hook object per machine), src/machines/shared/jet3d.js (what
// F-TYPE and SR-71 share), src/machines/three.js (the list M3, index = ?m). render3d calls M3[state.mi].*.
// Sim side: hooks added to the MC entries (clu, reset, onSelect, seqPre, insetF, warpName, info.cut).

import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '8a7d684';
const git = f => execFileSync('git', ['show', `${BASE}:${f}`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const out = new Map();   // path -> text
const get = f => out.has(f) ? out.get(f) : git(f);
// exact, single-occurrence replacement
function rep(f, a, b) {
  const s = get(f), i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`${f}: expected exactly one occurrence of ${JSON.stringify(a.slice(0, 80))}`);
  out.set(f, s.slice(0, i) + b + s.slice(i + a.length));
}
const fnNode = (src, name) => {
  const ast = parse(src, { sourceType: 'module' });
  for (const st of ast.program.body) { const d = st.declaration || st; if (d.type === 'FunctionDeclaration' && d.id.name === name) return d; }
  throw new Error('no function ' + name);
};
// if (state.mi<2){...} else if (state.mi==3){...} ... else {...}  ->  [{test, body}]
function chain(src, ifNode) {
  const arms = [];
  for (let n = ifNode; n; n = n.alternate) {
    if (n.type !== 'IfStatement') { arms.push({ test: 'else', body: src.slice(n.start + 1, n.end - 1) }); break; }
    arms.push({ test: src.slice(n.test.start, n.test.end), body: src.slice(n.consequent.start + 1, n.consequent.end - 1) });
  }
  return arms;
}
const armFor = (arms, test) => { const a = arms.find(x => x.test === test); if (!a) throw new Error('no arm ' + test); return a.body; };

// ---------- plume ----------
const PL = 'src/render3d/plume.js';
let plSrc = get(PL), pf = fnNode(plSrc, 'plumeParams');
const plIf = pf.body.body.find(s => s.type === 'IfStatement');
const plArms = chain(plSrc, plIf);
rep(PL, plSrc.slice(plIf.start, plIf.end), '[li,lc]=M3[state.mi].plume(u,fl)');
const plume = {
  jet: armFor(plArms, 'state.mi<2'), 3: armFor(plArms, 'state.mi==3'), 4: armFor(plArms, 'state.mi==4'), 5: armFor(plArms, 'state.mi==5'),
  6: armFor(plArms, 'state.mi==6'), 7: armFor(plArms, 'state.mi==7'), 2: armFor(plArms, 'else'),
};
if (!plume.jet.includes('const sr=state.mi==1,')) throw new Error('jet plume: sr test not found');
plume.jet = plume.jet.replace('const sr=state.mi==1,', 'const sr=isSR,');

// ---------- emitters ----------
const PA = 'src/render3d/particles.js';
let paSrc = get(PA), ef = fnNode(paSrc, 'emitters');
const emIf = ef.body.body.find(s => s.type === 'IfStatement');
const emArms = chain(paSrc, emIf);
rep(PA, paSrc.slice(emIf.start, emIf.end), 'M3[state.mi].emit(dt,ax)');
const emit = { jet: armFor(emArms, 'state.mi<2'), 4: armFor(emArms, 'state.mi==4'), 5: armFor(emArms, 'state.mi==5'), 6: armFor(emArms, 'state.mi==6'), 7: armFor(emArms, 'state.mi==7'), 2: armFor(emArms, 'state.mi==2') };
rep(PA, 'if(state.mi>1)return;', 'if(!M3[state.mi].burst)return;');

// ---------- thermal ----------
const LE = 'src/render3d/lenses.js';
let leSrc = get(LE), tf = fnNode(leSrc, 'thermalU');
const thIf = tf.body.body.find(s => s.type === 'IfStatement');
const thArms = chain(leSrc, thIf);
rep(LE, leSrc.slice(thIf.start, thIf.end), 'M3[state.mi].thermal(amb,nn,fh)');
const thermal = { jet: armFor(thArms, 'state.mi<2'), 4: armFor(thArms, 'state.mi==4'), 5: armFor(thArms, 'state.mi==5'), 6: armFor(thArms, 'state.mi==6'), 7: armFor(thArms, 'state.mi==7'), 3: armFor(thArms, 'state.mi==3'), 2: armFor(thArms, 'else') };
const JET_FH = 'state.A*320+state.N*state.N*state.fu*80+k3.fire*300+state.ign*120';
rep(LE, `fh=state.mi<2?${JET_FH}:nn*190+state.ign*90`, 'fh=M3[state.mi].thFh?M3[state.mi].thFh(nn):nn*190+state.ign*90');
rep(LE, 'fh*.55,state.mi<2?5:7)', 'fh*.55,M3[state.mi].thR?M3[state.mi].thR[0]:7)');
rep(LE, 'fh,state.mi<2?4.5:8)', 'fh,M3[state.mi].thR?M3[state.mi].thR[1]:8)');

// ---------- frame: flame light, metal glow ----------
const FR = 'src/render3d/frame.js';
const FLAME = 'state.mi<2?axisPt(3.2,0,0):state.mi==3?axisPt(.25,0,0):state.mi==4?V3(1.5,3.2,0):state.mi==5?axisPt(1.5,0,0):state.mi==6?axisPt(.6,0,0):state.mi==7?axisPt(1.2,0,0):V3(.6,2.4,0)';
rep(FR, `flame.position.copy(${FLAME})`, 'flame.position.copy(M3[state.mi].flame())');
const flame = { jet: 'axisPt(3.2,0,0)', 3: 'axisPt(.25,0,0)', 4: 'V3(1.5,3.2,0)', 5: 'axisPt(1.5,0,0)', 6: 'axisPt(.6,0,0)', 7: 'axisPt(1.2,0,0)', 2: 'V3(.6,2.4,0)' };
rep(FR, 'MT.flap.emissiveIntensity=(state.mi==0?state.A*.05:0)', 'MT.flap.emissiveIntensity=(M3[state.mi].flap?M3[state.mi].flap():0)');
const INNER = '(state.hg*state.hg*.35+state.A*1.1+state.ign*1.2+state.gn*1)*(.9+.1*Math.sin(state.simT*40))';
rep(FR, `(state.mi<2?${INNER}:0)`, '(M3[state.mi].inner?M3[state.mi].inner():0)');

// ---------- flow tracers ----------
const FL = 'src/render3d/flow.js';
rep(FL, 'FLW.u.uStr.value=state.mi==3?.004:.03;', 'FLW.u.uStr.value=M3[state.mi].flowStr??.03;');
const JET_SP = '.12+state.N*1.6';
rep(FL, `const e=ENG[state.mi],sp=state.mi<2?${JET_SP}:.1+state.N*state.fu*1.5+(state.ph==1?.25:0);`,
  'const m3=M3[state.mi],e=ENG[state.mi],sp=m3.flowSpeed?m3.flowSpeed():.1+state.N*state.fu*1.5+(state.ph==1?.25:0);');
rep(FL, 'return[state.mi<2?.011:state.mi==3?.0035:.015,', 'return[m3.flowSize??.015,');

// ---------- camera ----------
const CA = 'src/render3d/camera.js';
let caSrc = get(CA), earthIf = null;
(function walk(n) {
  if (!n || typeof n !== 'object' || earthIf) return;
  if (n.type === 'IfStatement' && caSrc.slice(n.test.start, n.test.end) === 'CFG[state.mi].space&&state.view==3') { earthIf = n; return; }
  for (const k in n) if (k !== 'loc') walk(n[k]);
})(parse(caSrc, { sourceType: 'module' }));
const earthBlock = caSrc.slice(earthIf.consequent.start + 1, earthIf.consequent.end - 1);
rep(CA, caSrc.slice(earthIf.start, earthIf.end), 'if(M3[state.mi].cam)M3[state.mi].cam(P0,T0);');
rep(CA, 'const port=cam.aspect<.85&&state.mi<2,', 'const port=cam.aspect<.85&&!!M3[state.mi].portrait,');

// ---------- imports for the touched render3d modules ----------
for (const f of [PL, PA, LE, FR, FL, CA]) {
  const s = get(f), nl = s.indexOf('\n');
  out.set(f, s.slice(0, nl + 1) + `import { M3 } from '../machines/three.js';\n` + s.slice(nl + 1));
}
// imports that only the moved branches needed
const dropImport = (f, line) => rep(f, line + '\n', '');
dropImport(PL, "import { MLE, sc, sicE } from '../machines/table.js';");
dropImport(PA, "import { sc } from '../machines/table.js';");
dropImport(CA, "import { RE, orb } from '../machines/table.js';");

// ---------- machine hook files ----------
// names a hook body may use -> module (relative to src/machines/<name>/)
const KNOWN = {
  state: '../../core/state.js', sm: '../../core/util.js',
  k3: '../../render3d/context.js', C: '../../render3d/plume.js', V3: '../../render3d/kit.js', rnd: '../../render3d/kit.js',
  axisPt: '../../render3d/particles.js', SPK: '../../render3d/particles.js', SMK: '../../render3d/particles.js',
  thSet: '../../render3d/lenses.js', TH: '../../render3d/lenses.js', ENG: '../../render3d/builders.js',
  sicE: '../table.js', sc: '../table.js', MLE: '../table.js', orb: '../table.js', RE: '../table.js',
};
function importsFor(text, own = []) {
  const by = new Map();
  for (const [n, f] of Object.entries(KNOWN)) {
    if (own.includes(n)) continue;
    // a free identifier: not part of a longer name and not a property (but `...C(` spread counts)
    if (new RegExp(`(?:^|[^\\w$.]|\\.\\.\\.)${n.replace('$', '\\$')}(?![\\w$])`).test(text)) (by.get(f) || by.set(f, []).get(f)).push(n);
  }
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([f, ns]) => `import { ${ns.sort().join(', ')} } from '${f}';`).join('\n');
}
const jetBody = `// What the two jets (F-TYPE, SR-71) share in the 3D renderer: plume, embers/soot, thermal lens, flame light,
// inner glow, tracer speed. Bodies are v11's \`mi<2\` branches; isSR switches the J58-specific numbers.

export function jetPlume(u,fl,isSR){let li,lc;{${plume.jet}}return[li,lc]}
export function jetEmit(dt,ax){${emit.jet}}
export function jetThermal(amb,nn,fh){${thermal.jet}}
export const jetThFh=()=>${JET_FH};
export const jetFlame=()=>${flame.jet};
export const jetInner=()=>${INNER};
export const jetFlowSpeed=()=>${JET_SP};
`;
out.set('src/machines/shared/jet3d.js', `${importsFor(jetBody)}\n${jetBody}`);

const NAMES = ['f-type', 'sr-71', 'shuttle', 'hall', 'saturn-v', 'harrier', 'nk-12', 'sky-crane'];
const TITLE = ['F-TYPE', 'SR-71 J58', 'SHUTTLE (RS-25)', 'HALL thruster', 'SATURN V (five F-1s)', 'HARRIER (Pegasus)', 'NK-12', 'SKY CRANE'];
function hookFile(i) {
  const jet = i < 2;
  const parts = [];
  if (jet) parts.push(`plume:(u,fl)=>jetPlume(u,fl,${i === 1})`, 'emit:jetEmit', 'thermal:jetThermal', 'thFh:jetThFh', 'thR:[5,4.5]',
    'flame:jetFlame', ...(i === 0 ? ['flap:()=>state.A*.05'] : []), 'inner:jetInner', 'flowSpeed:jetFlowSpeed', 'flowSize:.011', 'portrait:true', 'burst:true');
  else {
    parts.push(`plume(u,fl){let li,lc;{${plume[i]}}return[li,lc]}`);
    parts.push(emit[i] ? `emit(dt,ax){${emit[i]}}` : 'emit(){}');
    parts.push(`thermal(amb,nn,fh){${thermal[i]}}`);
    parts.push(`flame:()=>${flame[i]}`);
    if (i === 3) parts.push('flowStr:.004', 'flowSize:.0035', `cam(P0,T0){if(state.view==3){${earthBlock}}}`);
  }
  const body = `export default {\n${parts.join(',\n')},\n};\n`;
  const imp = [jet ? `import { jetEmit, jetFlame, jetFlowSpeed, jetInner, jetPlume, jetThFh, jetThermal } from '../shared/jet3d.js';` : '', importsFor(body)].filter(Boolean).join('\n');
  return `// ${TITLE[i]}: 3D renderer hooks (plume, particles, thermal lens, flame light, tracers${i === 3 ? ', EARTH view' : ''}).\n${imp}\n\n${body}`;
}
NAMES.forEach((n, i) => out.set(`src/machines/${n}/three.js`, hookFile(i)));
out.set('src/machines/three.js', `// The 3D side of every machine, in machine order (index = ?m). Imported only by the 3D renderer chunk.
${NAMES.map((n, i) => `import m${i} from './${n}/three.js';`).join('\n')}

export const M3 = [${NAMES.map((n, i) => `m${i}`).join(', ')}];
`);

// ---------- sim side ----------
const EN = 'src/core/engine.js';
rep(EN, 'if(state.M.orbit)orbStep(dt);if(state.M.clu)state.M.clu(dt);if(state.M.hover)hoverStep(dt);', 'if(state.M.clu)state.M.clu(dt);');
dropImport(EN, "import { hoverStep, orbStep } from '../machines/table.js';");

const MS = 'src/core/machine-switch.js';
rep(MS, 'orbReset();state.alt=state.vz=0;state.raw2=.914;state.nz=90;sicE.fill(0);state.prp=0;state.beta=86;if(state.M.sky){state.raw2=0;skyReset()}',
  'state.alt=state.vz=0;state.raw2=.914;MC.forEach(m=>{if(m.reset)m.reset()});if(state.M.onSelect)state.M.onSelect();');
rep(MS, "import { MC, orbReset, sicE, skyReset } from '../machines/table.js';", "import { MC } from '../machines/table.js';");

const SQ = 'src/sequence/sequence.js';
rep(SQ, "else if(state.M.sky)pre.push({cap:'POWERED DESCENT',do:()=>skyReset(),wait:.1});", 'else if(state.M.seqPre)pre.push(state.M.seqPre());');
dropImport(SQ, "import { skyReset } from '../machines/table.js';");

const GA = 'src/hud/gauges.js';
rep(GA, 'state.M.insetF||(state.M.spike?spikeInset:state.M.orbit?orbitInset:hoverInset)', 'state.M.insetF');
dropImport(GA, "import { hoverInset, orbitInset, spikeInset } from '../machines/table.js';");

const CO = 'src/hud/controls.js';
rep(CO, "state.M.warp?'WARP: '+WN[state.sl]:", "state.M.warp?'WARP: '+state.M.warpName(state.sl):");
dropImport(CO, "import { WN } from '../machines/table.js';");

// INFO: complete cut arrays for machines 0-3 (the exact strings v11 assembled), shared paragraphs in a text module
const IN = 'src/info/info.js';
const inSrc = get(IN), siNode = fnNode(inSrc, 'showInfo');
const siText = inSrc.slice(siNode.start, siNode.end);
const siAst = parse(siText, { sourceType: 'module' });
let cutExpr = null;
(function walk(n) { if (!n || typeof n !== 'object' || cutExpr) return; if (n.type === 'ConditionalExpression' && siText.slice(n.test.start, n.test.end) === 'Array.isArray(I.cut)') { cutExpr = n; return; } for (const k in n) if (k !== 'loc') walk(n[k]); })(siAst);
const S = n => siText.slice(n.start, n.end);
const hallArr = cutExpr.alternate.consequent;                 // M.space ? [...] : ...
const jetArr = cutExpr.alternate.alternate;                   // [I.cut ? I.cut : mi==2 ? RS25 : JET, SCHL, THERM]
const first = jetArr.elements[0];                              // I.cut ? I.cut : (mi==2 ? RS25 : JET)
const rs25 = first.alternate.consequent, jetExpr = first.alternate.alternate;   // JET = BASE + (mi==1 ? SR : FAN) + TAIL
const jetBase = jetExpr.left.left, jetMid = jetExpr.left.right.expression ?? jetExpr.left.right, jetTail = jetExpr.right;
const SCHL = S(jetArr.elements[1]), THERM = S(jetArr.elements[2]);
const srText = S(jetMid.consequent), fanText = S(jetMid.alternate);
out.set('src/info/cut-text.js', `// INFO paragraphs about the lenses that every machine's CUTAWAY section ends with (unless it has its own).\nexport const CUT_SCHLIEREN=${SCHL};\nexport const CUT_THERMAL=${THERM};\n`);
const cut = [
  `[${S(jetBase)}+${fanText}+${S(jetTail)},CUT_SCHLIEREN,CUT_THERMAL]`,
  `[${S(jetBase)}+${srText}+${S(jetTail)},CUT_SCHLIEREN,CUT_THERMAL]`,
  `[${S(rs25)},CUT_SCHLIEREN,CUT_THERMAL]`,
  S(hallArr),
];
rep(IN, siText.slice(cutExpr.start, cutExpr.end), 'Array.isArray(I.cut)?I.cut:[I.cut,CUT_SCHLIEREN,CUT_THERMAL]');
rep(IN, "import { state } from '../core/state.js';", "import { state } from '../core/state.js';\nimport { CUT_SCHLIEREN, CUT_THERMAL } from './cut-text.js';");

// MC entries: insert hooks right after each entry's `{`, and cut arrays right after `info:{`
const TB = 'src/machines/table.js';
{
  const s = get(TB), ast = parse(s, { sourceType: 'module' });
  const mc = ast.program.body.find(st => st.declaration?.declarations?.[0]?.id.name === 'MC').declaration.declarations[0].init;
  const add = {
    1: 'insetF:spikeInset,',
    3: 'clu:dt=>orbStep(dt),reset:()=>orbReset(),insetF:orbitInset,warpName:i=>WN[i],',
    4: 'reset:()=>sicE.fill(0),',
    5: 'clu:dt=>hoverStep(dt),reset:()=>{state.nz=90},insetF:hoverInset,',
    6: 'reset:()=>{state.prp=0;state.beta=86},',
    7: "onSelect:()=>{state.raw2=0;skyReset()},seqPre:()=>({cap:'POWERED DESCENT',do:()=>skyReset(),wait:.1}),",
  };
  const edits = [];
  mc.elements.forEach((el, i) => {
    if (add[i]) edits.push([el.start + 1, add[i]]);
    if (i < 4) {
      const info = el.properties.find(p => p.key?.name === 'info');
      edits.push([info.value.start + 1, `cut:${cut[i]},`]);
    }
  });
  let t = s;
  for (const [pos, txt] of edits.sort((a, b) => b[0] - a[0])) t = t.slice(0, pos) + txt + t.slice(pos);
  t = t.replace(/\n/, `\nimport { CUT_SCHLIEREN, CUT_THERMAL } from '../info/cut-text.js';\n`);
  out.set(TB, t);
}

for (const [f, text] of out) {
  const p = resolve(ROOT, f);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text);
}
console.log([...out.keys()].join('\n'));
