// HARRIER (Pegasus): the inset panel drawn beside the gauges.
import { state } from '../../core/state.js';
import { MONO, g } from '../../core/util.js';
import { G0, HM, harT } from './machine.js';

/* Harrier hover panel: side view of the jet over the pad, thrust vector arrow, height, vertical speed, lift/weight */
export function hoverInset(x,y,w,h){
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='rgba(14,17,24,.85)';g.strokeStyle='#2a3040';g.lineWidth=1;g.fillRect(x,y,w,h);g.strokeRect(x+.5,y+.5,w-1,h-1);
 g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#6c7482';g.fillText('HOVER',x+8,y+11);
 g.textAlign='right';g.fillStyle=state.alt>.05?'#3fcf7a':'#6c7482';g.fillText(state.alt>.05?'AIRBORNE':'ON PAD',x+w-8,y+11);
 const cs=h-22,bx=x+8,by=y+16,T=harT(),lw=T*Math.sin(state.nz*Math.PI/180)/(HM*G0),gy2=by+cs-3,py=gy2-6-Math.min(1,state.alt/30)*(cs-16),px=bx+cs*.45,a=state.nz*Math.PI/180,al2=6+Math.min(1.3,T/(HM*G0))*12;
 g.strokeStyle='#4a5160';g.beginPath();g.moveTo(bx,gy2);g.lineTo(bx+cs,gy2);g.stroke();
 g.strokeStyle='#ff9a3a';g.lineWidth=2;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*al2,py+Math.sin(a)*al2);g.stroke();g.lineWidth=1;
 g.fillStyle='#b4bccb';g.beginPath();g.moveTo(px-12,py);g.lineTo(px+10,py-1.5);g.lineTo(px+12,py+1.5);g.lineTo(px-12,py+2.5);g.closePath();g.fill();
 g.textAlign='left';const tx=x+cs+18,lh=Math.min(13,(h-22)/4),ty=y+24;
 [['ALT',(state.alt*3.281).toFixed(0)+' ft'],['V/S',(state.vz*196.85).toFixed(0)+' fpm'],['LIFT/WT',lw.toFixed(2)],['FWD',(T*Math.cos(a)/1000).toFixed(1)+' kN']].forEach((l,i)=>{g.fillStyle='#6c7482';g.fillText(l[0],tx,ty+i*lh);g.fillStyle=l[0]=='LIFT/WT'&&lw>1?'#3fcf7a':'#d8dde6';g.fillText(l[1],tx+52,ty+i*lh)})}
