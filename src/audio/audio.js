// Audio: the Web Audio graph (all synthesized), per-frame mix, and one-shot sounds.
import { state } from '../core/state.js';

/* ---------- audio: all synthesized ---------- */
export let S={ns:[]};
export const VV=[{v:.9,raw:0,hs:-3},{v:1.05,raw:.12,hs:1},{v:1.35,raw:.42,hs:5},{v:.9,raw:0,hs:-3}];   /* per view: level, grit (waveshaper mix), treble (dB) */
export function initAudio(){try{
 state.AC=new(window.AudioContext||window.webkitAudioContext)();const sr=state.AC.sampleRate,out=state.AC.createGain();out.gain.value=.9;
 const cp=state.AC.createDynamicsCompressor(),hsf=state.AC.createBiquadFilter(),mlp=state.AC.createBiquadFilter(),dry=state.AC.createGain(),wet=state.AC.createGain(),shp=state.AC.createWaveShaper(),bus=state.AC.createGain();
 hsf.type='highshelf';hsf.frequency.value=3000;mlp.type='lowpass';mlp.frequency.value=20000;mlp.Q.value=.5;wet.gain.value=0;
 const crv=new Float32Array(1024);for(let i=0;i<1024;i++)crv[i]=Math.tanh((i/512-1)*4);shp.curve=crv;
 out.connect(dry);dry.connect(bus);out.connect(shp);shp.connect(wet);wet.connect(bus);bus.connect(hsf);hsf.connect(mlp);mlp.connect(cp);cp.connect(state.AC.destination);
 try{S.dst=state.AC.createMediaStreamDestination();cp.connect(S.dst)}catch(e){S.dst=null}
 S.out=out;S.wet=wet;S.hsf=hsf;S.mlp=mlp;
 const noise=b=>{const bf=state.AC.createBuffer(1,sr*3,sr),d=bf.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(b){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w}const s=state.AC.createBufferSource();s.buffer=bf;s.loop=true;s.start();S.ns.push(s);return s};
 const ch=(src,t,f,q)=>{const fl=state.AC.createBiquadFilter();fl.type=t;fl.frequency.value=f;fl.Q.value=q||.7;const gn=state.AC.createGain();gn.gain.value=0;src.connect(fl);fl.connect(gn);gn.connect(out);return{fl,gn}};
 S.nb=state.AC.createBuffer(1,sr,sr);{const d=S.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 const osc=(t,f)=>{const o=state.AC.createOscillator();o.type=t;o.frequency.value=f;o.start();return o};
 S.rum=ch(noise(1),'lowpass',140);S.roar=ch(noise(0),'bandpass',500,.5);S.crk=ch(noise(1),'bandpass',700,.8);
 S.osc=osc('sawtooth',180);S.wh=ch(S.osc,'lowpass',2200,2);        /* compressor whine */
 S.osc2=osc('triangle',360);S.wh2=ch(S.osc2,'bandpass',3000,4);    /* upper siren on spool-down */
 S.so=osc('sawtooth',60);S.sg=ch(S.so,'bandpass',400,3);           /* starter motor */
 S.so2=osc('square',40);S.sg2=ch(S.so2,'lowpass',500,1);           /* starter gear whir */
}catch(e){state.AC=null}}
export function audio(){if(!state.AC)return;const t=state.AC.currentTime,s=(p,v,k=.06)=>p.setTargetAtTime(v,t,k),V=VV[state.view],ts=state.TS,pm=.55+.45*ts;
 s(S.out.gain,.9*V.v,.2);s(S.wet.gain,V.raw,.25);s(S.hsf.gain,V.hs+(state.exposed?2:0),.25);
 s(S.mlp.frequency,1000*Math.pow(20,Math.max(0,(ts-.2)/.8)),.12);                 /* slow-mo muffles and drops the whole bed */
 S.ns.forEach(n=>s(n.playbackRate,.45+.55*ts,.12));
 state.M.au(s,V,pm)}
export function thump(v=1){if(!state.AC)return;const t=state.AC.currentTime,o=state.AC.createOscillator(),n=state.AC.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(30,t+.5);n.gain.setValueAtTime(v,t);n.gain.exponentialRampToValueAtTime(.001,t+.6);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.65)}
export function tick(){if(!state.AC)return;const t=state.AC.currentTime,o=state.AC.createOscillator(),n=state.AC.createGain();o.type='square';o.frequency.value=1400;n.gain.setValueAtTime(.08,t);n.gain.exponentialRampToValueAtTime(.001,t+.03);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.04)}
/* surge bang: sharp noise crack falling through a lowpass, plus the low thump */
export function bang(v=1){if(!state.AC)return;const t=state.AC.currentTime,s=state.AC.createBufferSource(),f=state.AC.createBiquadFilter(),n=state.AC.createGain();
 s.buffer=S.nb;f.type='lowpass';f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(180,t+.45);
 n.gain.setValueAtTime(0,t);n.gain.linearRampToValueAtTime(.9*v,t+.004);n.gain.exponentialRampToValueAtTime(.001,t+.5);
 s.connect(f);f.connect(n);n.connect(S.out);s.start(t);s.stop(t+.55);thump(.9*v)}
export function beep(){if(!state.AC)return;const t=state.AC.currentTime,o=state.AC.createOscillator(),n=state.AC.createGain();o.type='sine';o.frequency.value=1100;n.gain.setValueAtTime(.001,t);n.gain.linearRampToValueAtTime(.07,t+.01);n.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(n);n.connect(S.out);o.start(t);o.stop(t+.16)}
/* load-time setup, called from main.js in v11's order */
export function wireAudio(){
document.addEventListener('visibilitychange',()=>{if(state.AC)document.hidden?state.AC.suspend():state.AC.resume()});
}
