// INFO panel: facts, what is approximated, the cutaway explanation and sources.
import { state } from '../core/state.js';
import { $ } from '../core/util.js';

/* ---------- info panel: what is real, what is approximated, and where the numbers came from ---------- */
export function showInfo(){
 const I=state.M.info,li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
 $('infc').innerHTML='<h2>'+state.M.n+': HOW IT WORKS</h2><p>A toy built from public sources. It is not an engineering simulation.</p>'+li(I.f)+(state.G3?'<h3>CUTAWAY AND LENSES</h3>'+li(Array.isArray(I.cut)?I.cut:state.M.space?['CUTAWAY removes half of the thruster. Grey dots are neutral xenon flowing from the anode; they turn blue when ionised and accelerate out as the beam. Yellow dots are electrons: trapped by the magnetic field, they circle the channel as the Hall current, and more stream in from the hollow cathode. Speeds are slowed enormously.','THERMAL is false colour by temperature, like an infrared camera. The temperatures are illustrative.','SCHLIEREN needs air to bend light, so it is not available in space.']:[I.cut?I.cut:state.mi==2?'CUTAWAY removes half of the bell and chamber. Blue dots are liquid hydrogen (down the steerhorn and up through the nozzle cooling tubes), pale cyan is liquid oxygen, violet-white is the burning gas expanding through the throat and bell. Speeds are slowed enormously so you can follow them.':'CUTAWAY removes half of the casing. The moving dots trace the air: blue is cool intake air, white is compressed air, orange is combustion and exhaust.'+(state.mi==1?' Watch the bypass tubes carry air round the core above about Mach 2, and the secondary air flowing between engine and nacelle to the ejector.':' The outer band is bypass air going round the core.')+' Flow speed is slowed enormously so you can follow it.','SCHLIEREN mimics the optical technique that turns changes in air density into light and dark. Here it is drawn from the toy\'s exhaust model, so it shows the hot, otherwise invisible exhaust and the shock cells, but it is not a computed flow field.','THERMAL is false colour by temperature, like an infrared camera: black and purple are cool, red and yellow hot, white hottest. The temperatures are illustrative, not measured, and real cameras also see reflections and emissivity effects that are not modelled.']):'')+'<h3>WHAT IS APPROXIMATED</h3>'+li(I.a)+(I.s.length?'<h3>SOURCES</h3><ul>'+I.s.map(s=>'<li><a href="'+s[1]+'" target="_blank" rel="noopener">'+s[0]+'</a></li>').join('')+'</ul>':'');
 $('inf').style.display='flex';$('infb').scrollTop=0}
export const closeInfo=()=>{$('inf').style.display='none'};
/* load-time setup, called from main.js in v11's order */
export function wireInfo(){
addEventListener('keydown',e=>{if(e.key==='Escape')closeInfo()});
$('infx').onclick=closeInfo;$('inf').addEventListener('click',e=>{if(e.target===$('inf'))closeInfo()});
$('ib').addEventListener('click',()=>{if(state.ph)showInfo()});
}
