// Pre-rendered glow sprites for the 2D renderer (the machine table reads them when it is built).
import { g, mk } from '../core/util.js';

export const spr=c=>{const k=mk(64,64),x=k.getContext('2d'),q=x.createRadialGradient(32,32,0,32,32,32);q.addColorStop(0,`rgba(${c},1)`);q.addColorStop(.35,`rgba(${c},.4)`);q.addColorStop(1,`rgba(${c},0)`);x.fillStyle=q;x.fillRect(0,0,64,64);return k};
export const SP={w:spr('255,248,235'),k:spr('16,13,12'),y:spr('255,200,110'),o:spr('255,120,35'),r:spr('220,50,15'),b:spr('150,180,255'),
 g:spr('70,255,120'),c:spr('205,228,255'),l:spr('175,150,255'),s:spr('214,219,232')};   /* g: TEB green flash, c: hydrogen-flame cyan white, l: lavender, s: steam */
export const blob=(s,x,y,w,h,a)=>{g.globalAlpha=Math.min(1,a);g.drawImage(s,x-w/2,y-h/2,w,h)};
