// 2D overlay on the HUD canvas: part labels in cutaway, lens legend.
import { state } from '../core/state.js';
import { $, MONO, g } from '../core/util.js';
import { ENG } from './builders.js';
import { V3, cam } from './kit.js';

// assigned by create*() below, when init3D runs
export let LV,ironCss;

export function createOverlay(){

/* ======================= 2D overlay: part labels in cutaway, lens legend ======================= */
LV=V3();ironCss=v=>{const S=[[0,0,0,.06],[.2,.32,0,.5],[.4,.82,.1,.36],[.6,1,.47,0],[.8,1,.86,.12],[1,1,1,.94]];for(let i=0;i<5;i++)if(v<=S[i+1][0]){const a=S[i],b=S[i+1],f=(v-a[0])/(b[0]-a[0]);return`rgb(${(a[1]+(b[1]-a[1])*f)*255|0},${(a[2]+(b[2]-a[2])*f)*255|0},${(a[3]+(b[3]-a[3])*f)*255|0})`}return'#fff'};
}

export function overlay(){const e=ENG[state.mi];g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(state.exposed&&state.lens!=2&&e.labels){g.font=`600 9px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=1;const sc=Math.min(1,state.W/820);
  const inl=state.M.inset&&state.W-150-(state.gx+state.SWR.w+14)>=140,hudR=state.gx+state.SWR.w+(inl?Math.min(230,state.W-150-(state.gx+state.SWR.w+14))+14:0)+6,hudB=state.SWR.y+state.SWR.h+(state.M.inset&&!inl?66:0)+10,ctT=$('ctl').getBoundingClientRect().top-12,placed=[];
  for(const [t,p,o] of e.labels){LV.set(...p).applyMatrix4(e.E.matrixWorld).project(cam);if(LV.z>1||Math.abs(LV.x)>1.02||Math.abs(LV.y)>1.02)continue;
   const x=(LV.x*.5+.5)*state.W,y=(-LV.y*.5+.5)*state.H,tw=g.measureText(t).width+12,lx=Math.max(tw/2+4,Math.min(state.W-140-tw/2,x+o[0]*sc));let ly=Math.min(ctT-8,y+o[1]*sc);
   const box=()=>({x0:lx-tw/2-3,x1:lx+tw/2+3,y0:ly-9,y1:ly+9});let r=box();if(r.x0<hudR&&r.y0<hudB){ly=Math.max(ly,hudB+10);r=box()}
   for(let k=0;k<10;k++){if(!placed.some(q=>!(r.x1<q.x0||r.x0>q.x1||r.y1<q.y0||r.y0>q.y1)))break;ly+=(o[1]>=0?19:-19);if(ly<hudB+10&&lx-tw/2<hudR)ly=hudB+10+19*k;r=box()}
   if(ly>ctT-8)continue;placed.push(r);
   g.strokeStyle='rgba(232,236,242,.7)';g.beginPath();g.moveTo(x,y);g.lineTo(lx,ly);g.stroke();g.fillStyle='#ff9a3a';g.beginPath();g.arc(x,y,2.4,0,6.283);g.fill();
   g.fillStyle='rgba(10,12,18,.82)';g.fillRect(lx-tw/2,ly-8,tw,16);g.strokeStyle='#2a3040';g.strokeRect(lx-tw/2+.5,ly-7.5,tw-1,15);g.fillStyle='#e8ecf2';g.fillText(t,lx,ly+.5)}}
 if(state.lens){let y=state.SWR.y+state.SWR.h+8;if(state.M.inset&&state.W-150-(state.gx+state.SWR.w+14)<140)y+=66;const x=state.gx,w=state.SWR.w,h=state.lens==2?42:22;
  g.fillStyle='rgba(14,17,24,.85)';g.fillRect(x,y,w,h);g.strokeStyle='#2a3040';g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);g.font=`600 9px ${MONO}`;g.textBaseline='middle';g.textAlign='left';g.fillStyle='#d8dde6';
  if(state.lens==1)g.fillText('SCHLIEREN · density gradients (simulated)',x+8,y+11.5);
  else{g.fillText('THERMAL °C (illustrative)',x+8,y+10);const bx=x+8,bw=w-16,by=y+18,gr=g.createLinearGradient(bx,0,bx+bw,0);for(let i=0;i<=10;i++)gr.addColorStop(i/10,ironCss(i/10));
   g.fillStyle=gr;g.fillRect(bx,by,bw,8);g.fillStyle='#9aa2b0';g.textAlign='center';[0,100,500,1000,1600].forEach((t,i)=>{const v=Math.pow((t+40)/1640,.6);g.textAlign=i==0?'left':i==4?'right':'center';g.fillText(String(t),bx+v*bw,by+16)})}}
 g.restore()}
