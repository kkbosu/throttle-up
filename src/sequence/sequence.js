// SEQUENCE: a scripted run (wait / until / lever ramp / view cut / slow-mo) for one-tap clips.
import { master } from '../core/engine.js';
import { state } from '../core/state.js';
import { $, MONO, SL, g } from '../core/util.js';
import { lab, say } from '../hud/controls.js';
import { K, applyRaw } from '../input/lever.js';
import { stopRec } from '../recorder/recorder.js';

/* ---------- SEQUENCE: a scripted run for one-tap clips. Steps: wait / until / lever ramp / view cut / slow-mo. Any lever input cancels it.
   If REC was already running when it starts, the recording stops itself shortly after the sequence ends ---------- */
export const SQ={on:0,steps:[],i:0,t:0,r0:0,v0:0,cap:'',rec:0};
export function seqStart(){
 if(!state.ph||SQ.on)return;
 const pre=[];
 if(state.ph==3)pre.push({cap:'WAITING FOR SHUTDOWN',until:()=>state.N<.12,max:20},{cap:state.M.sqc,do:()=>{if(state.ph==3)master()},until:()=>state.ph==2,max:16});
 else if(state.ph==1)pre.push({cap:state.M.sqc,until:()=>state.ph==2,max:16});
 else if(state.M.seqPre)pre.push(state.M.seqPre());
 else pre.push({cap:'SETTLING TO IDLE',lever:0,dur:1.2,until:()=>state.sT<=0&&state.N<state.M.idle+.07,max:14});
 SQ.steps=pre.concat(state.M.sq);SQ.i=-1;SQ.on=1;SQ.v0=state.view;SQ.rec=state.rec?1:0;SQ.cap='';seqNext();lab()}
export function seqNext(){
 SQ.i++;if(SQ.i>=SQ.steps.length){seqStop(true);return}
 const s=SQ.steps[SQ.i];SQ.t=0;SQ.r0=state.raw;if(typeof s.lever=='function')s._lv=s.lever();if(s.cap)SQ.cap=s.cap;if(s.do)s.do();
 if(s.view!=null){state.view=s.view;lab()}if(s.slow!=null)state.tsT=s.slow}
export function seqStop(done){
 if(!SQ.on)return;SQ.on=0;state.tsT=state.M.warp?1:SL[state.sl];state.view=SQ.v0;
 if(done&&SQ.rec&&state.rec)setTimeout(stopRec,1500);
 say(done?'Sequence complete.':'Sequence stopped.');lab()}
export function seqTick(dr){
 if(!SQ.on)return;
 if(state.drag||state.drag2||K.arrowup||K.arrowdown||K.w||K.s||K.arrowleft||K.arrowright||K.a||K.d){seqStop(false);return}
 const s=SQ.steps[SQ.i];SQ.t+=dr;
 if(s.lever!=null){const k=Math.min(1,SQ.t/(s.dur||1)),tg=s._lv!=null?s._lv:s.lever;state.raw=SQ.r0+(tg-SQ.r0)*k*k*(3-2*k);applyRaw()}
 if(SQ.t>=Math.max(s.lever!=null?(s.dur||1):0,s.wait||0)&&(!s.until||s.until()||SQ.t>(s.max||20)))seqNext()}
export function seqCap(){
 if(!SQ.on||!SQ.cap)return;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 const x=state.gx,y=Math.min(state.ny+112*state.u,$('ctl').getBoundingClientRect().top-30),t='▶  '+SQ.cap;g.font=`600 12px ${MONO}`;g.textAlign='left';g.textBaseline='middle';
 const w=g.measureText(t).width+28;
 g.fillStyle='rgba(10,12,18,.74)';g.fillRect(x,y-15,w,30);g.fillStyle='#ff9a3a';g.fillRect(x,y-15,3,30);
 g.fillStyle='#e8ecf2';g.fillText(t,x+16,y+.5);
 g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x,y+17,w,2);g.fillStyle='#ff9a3a';g.fillRect(x,y+17,w*Math.min(1,(SQ.i+1)/SQ.steps.length),2)}
