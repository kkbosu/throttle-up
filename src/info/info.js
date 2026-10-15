// INFO panel: facts, what is approximated, the cutaway explanation and sources.
import { state } from '../core/state.js';
import { CUT_SCHLIEREN, CUT_THERMAL } from './cut-text.js';
import { $ } from '../core/util.js';

/* ---------- info panel: what is real, what is approximated, and where the numbers came from ---------- */
export function showInfo(){
 const I=state.M.info,li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
 $('infc').innerHTML='<h2>'+state.M.n+': HOW IT WORKS</h2><p>A toy built from public sources. It is not an engineering simulation.</p>'+li(I.f)+(state.G3?'<h3>CUTAWAY AND LENSES</h3>'+li(Array.isArray(I.cut)?I.cut:[I.cut,CUT_SCHLIEREN,CUT_THERMAL]):'')+'<h3>WHAT IS APPROXIMATED</h3>'+li(I.a)+(I.s.length?'<h3>SOURCES</h3><ul>'+I.s.map(s=>'<li><a href="'+s[1]+'" target="_blank" rel="noopener">'+s[0]+'</a></li>').join('')+'</ul>':'');
 $('inf').style.display='flex';$('infb').scrollTop=0}
export const closeInfo=()=>{$('inf').style.display='none'};
/* load-time setup, called from main.js in v11's order */
export function wireInfo(){
addEventListener('keydown',e=>{if(e.key==='Escape')closeInfo()});
$('infx').onclick=closeInfo;$('inf').addEventListener('click',e=>{if(e.target===$('inf'))closeInfo()});
$('ib').addEventListener('click',()=>{if(state.ph)showInfo()});
}
