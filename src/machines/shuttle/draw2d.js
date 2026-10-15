// SHUTTLE (RS-25): the hand-drawn 2D renderer (used when 3D is unavailable).
import { state } from '../../core/state.js';
import { g, sm } from '../../core/util.js';
import { EM, VP } from '../../render2d/index.js';
import { metal, sparks, stream } from '../../render2d/jet.js';
import { SP, blob } from '../../render2d/sprites.js';
import { gimb } from '../shared/gimbal.js';

/* ---------- RS-25 (shuttle main engine): bell nozzle, near-invisible hydrogen plume with steam, gimbal ---------- */
export function drawSS(r,dt){
 const ts=state.nx-220*state.u,px=ts-64*state.u,gm=gimb();
 g.save();g.translate(px,state.ny);g.rotate(gm);g.translate(-px,-state.ny);plumeSS(r,dt);bellSS(r,ts,px);g.restore();baySS(px,gm)}
export function plumeSS(r,dt){
 g.globalCompositeOperation='lighter';const T=state.simT,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),nn=state.N*state.fu;
 const gr=(200+nn*520)*state.u,rg=g.createRadialGradient(state.nx+140*state.u,state.ny,0,state.nx+140*state.u,state.ny,gr);
 rg.addColorStop(0,`rgba(150,175,255,${(nn*nn*.15+state.ign*.2)*fl})`);rg.addColorStop(.55,`rgba(255,150,90,${(nn*nn*.04+state.ign*.05)*fl})`);rg.addColorStop(1,'rgba(255,120,40,0)');
 g.globalAlpha=1;g.fillStyle=rg;g.fillRect(-state.W,-state.H,state.W*3,state.H*3);
 const len=(260+nn*nn*520)*state.u*(1+state.kick*.2);
 if(nn>.02){
  const qf=state.Q>1?1:.65;   /* fewer, brighter sprites when the frame rate is struggling */
  stream(len*1.05,r,nn*fl*.23/qf,Math.round(28*qf),T,[SP.l,SP.b,SP.b,SP.o],0);
  stream(len*.72,r*.78,nn*fl*.3/qf,Math.round(24*qf),T+2,[SP.c,SP.b,SP.l],1);
  stream(len*.2,r*.5,nn*fl*.16/qf,Math.round(12*qf),T+4,[SP.w,SP.c,SP.b],2);
  blob(SP.w,state.nx+6*state.u,state.ny,r*.7,r*1.8,nn*.28*fl)}
 if(state.ign>.02)stream((70+170*state.ign)*state.u,r*1.05,state.ign*.7,26,T*1.3,[SP.y,SP.o,SP.o,SP.r],5);
 /* burn-off igniters during priming: sparklers under the bell */
 if(state.ph==1&&state.st>.5){let n=dt*50;n=Math.floor(n)+(Math.random()<n%1?1:0);for(;n>0&&EM.length<120;n--)EM.push({x:state.nx+Math.random()*40*state.u,y:state.ny+(Math.random()-.5)*r*1.8,vx:(30+Math.random()*170)*state.u,vy:-Math.random()*240*state.u,l:0,m:.5+Math.random()*.6})}
 sparks(dt);
 /* diamonds: bright pale rings close to the exit */
 const dn=4+Math.floor(nn*3),sp=r*(1.05+nn*.15),da=sm(.45,1,nn)*.9;
 for(let i=0;i<dn;i++){const a=da*(1-i/(dn+1))*(.85+.15*Math.sin(T*90+i*2)),rr=Math.max(2,r*(.66-i*.075)),x=state.nx+(i+.9)*sp;
  blob(SP.b,x,state.ny,sp*.95,rr*2.1,a*.6);blob(SP.w,x,state.ny,sp*.42,rr*.9,a*.8)}
 /* steam: water vapour drifting off the plume */
 let n=nn*dt*(state.Q>1?16:9);n=Math.floor(n)+(Math.random()<n%1?1:0);
 for(;n>0&&VP.length<(state.Q>1?70:34);n--)VP.push({x:state.nx+Math.random()*70*state.u,y:state.ny+(Math.random()-.5)*r*2.1,vx:(40+Math.random()*130)*state.u,vy:-(20+Math.random()*80)*state.u,l:0,m:1.6+Math.random()*1.4,s:(40+Math.random()*50)*state.u});
 g.globalCompositeOperation='source-over';
 for(let i=VP.length-1;i>=0;i--){const p=VP[i];p.l+=dt;if(p.l>p.m){VP[i]=VP[VP.length-1];VP.pop();continue}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=14*state.u*dt;p.vx*=Math.exp(-dt*.5);const f=p.l/p.m,z=p.s*(1+1.6*f);blob(SP.s,p.x,p.y,z,z,(f<.2?f/.2:1)*(1-f)*(.09+.18*nn))}
 g.globalCompositeOperation='lighter';g.globalAlpha=1}
/* bell: chamber barrel, throat, parabola-ish contour with cooling-tube lines and stiffening rings */
export function bellSS(r,ts,px){
 const rth=11*state.u,len=state.nx-ts,h=t=>rth+(r-rth)*(1-Math.pow(1-t,1.8)),n=26,mr=22*state.u;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createLinearGradient(0,state.ny-mr,0,state.ny+mr);[[0,'#2a2f3a'],[.4,'#8f99aa'],[.55,'#c4cbd6'],[1,'#20252f']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.fillStyle=gd;g.beginPath();g.moveTo(px,state.ny-mr);g.lineTo(ts-26*state.u,state.ny-mr);g.lineTo(ts,state.ny-rth);g.lineTo(ts,state.ny+rth);g.lineTo(ts-26*state.u,state.ny+mr);g.lineTo(px,state.ny+mr);g.closePath();g.fill();
 gd=g.createLinearGradient(0,state.ny-r,0,state.ny+r);[[0,'#4a3320'],[.3,'#b88c52'],[.5,'#e6c48c'],[.7,'#a0743a'],[1,'#2e1e10']].forEach(s=>gd.addColorStop(s[0],s[1]));
 g.beginPath();g.moveTo(ts,state.ny-rth);for(let i=1;i<=n;i++){const t=i/n;g.lineTo(ts+t*len,state.ny-h(t))}
 for(let i=n;i>=0;i--){const t=i/n;g.lineTo(ts+t*len,state.ny+h(t))}g.closePath();g.fillStyle=gd;g.fill();
 g.strokeStyle='rgba(30,18,8,.38)';g.lineWidth=1.2*state.u;
 for(let k=-4;k<=4;k++){const f=k/4.6;g.beginPath();for(let i=0;i<=n;i++){const t=i/n,y=state.ny+f*h(t);i?g.lineTo(ts+t*len,y):g.moveTo(ts+t*len,y)}g.stroke()}
 g.strokeStyle='rgba(20,12,4,.55)';g.lineWidth=2.2*state.u;[.3,.58,.84].forEach(t=>{g.beginPath();g.moveTo(ts+t*len,state.ny-h(t));g.lineTo(ts+t*len,state.ny+h(t));g.stroke()});
 g.strokeStyle='rgba(235,225,205,.7)';g.lineWidth=2.5*state.u;g.beginPath();g.moveTo(state.nx,state.ny-r);g.lineTo(state.nx,state.ny+r);g.stroke();
 g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2*state.u;g.beginPath();g.moveTo(ts,state.ny-rth);g.lineTo(ts,state.ny+rth);g.stroke()}
/* engine bay behind the gimbal: sealed casing, or exposed pumps, ducts and the two gimbal actuators */
export function baySS(px,gm){
 const fh=74*state.u,bx=px-4*state.u,co=Math.cos(gm),si=Math.sin(gm),rot=(dx,dy)=>[px+dx*co-dy*si,state.ny+dx*si+dy*co];
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 if(!state.exposed){g.fillStyle=metal(fh);g.fillRect(-60,state.ny-fh,bx+60,fh*2);g.fillStyle='#0a0c10';g.fillRect(bx-3*state.u,state.ny-fh,3*state.u,fh*2);return}
 g.fillStyle='#0b0d11';g.fillRect(-60,state.ny-fh,bx+60,fh*2);
 const cyl=(x,y0,y1,w)=>{const gd=g.createLinearGradient(x-w/2,0,x+w/2,0);gd.addColorStop(0,'#1d2330');gd.addColorStop(.4,'#8f99aa');gd.addColorStop(1,'#20262f');g.fillStyle=gd;g.fillRect(x-w/2,y0,w,y1-y0)};
 cyl(px-100*state.u,state.ny-fh*.93,state.ny-10*state.u,40*state.u);cyl(px-52*state.u,state.ny+10*state.u,state.ny+fh*.93,36*state.u);
 g.lineCap='round';
 g.strokeStyle='#b0703a';g.lineWidth=9*state.u;g.beginPath();g.moveTo(px-84*state.u,state.ny-36*state.u);g.lineTo(bx-4*state.u,state.ny-26*state.u);g.stroke();
 g.strokeStyle='#8f99aa';g.lineWidth=7*state.u;g.beginPath();g.moveTo(px-38*state.u,state.ny+34*state.u);g.lineTo(bx-4*state.u,state.ny+22*state.u);g.stroke();
 g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1.5*state.u;g.beginPath();g.moveTo(px-84*state.u,state.ny-39*state.u);g.lineTo(bx-4*state.u,state.ny-29*state.u);g.moveTo(px-38*state.u,state.ny+31*state.u);g.lineTo(bx-4*state.u,state.ny+19*state.u);g.stroke();
 [[-1,-26],[1,26]].forEach(a=>{const ax=px-135*state.u,ay=state.ny+a[0]*fh*.9,l=rot(14*state.u,a[1]*state.u),mx=ax+(l[0]-ax)*.55,my=ay+(l[1]-ay)*.55;
  g.strokeStyle='#2a313d';g.lineWidth=11*state.u;g.beginPath();g.moveTo(ax,ay);g.lineTo(mx,my);g.stroke();
  g.strokeStyle='#c4cbd6';g.lineWidth=4*state.u;g.beginPath();g.moveTo(mx,my);g.lineTo(l[0],l[1]);g.stroke();
  g.fillStyle='#e4e8ee';g.beginPath();g.arc(l[0],l[1],3.2*state.u,0,6.283);g.fill();g.beginPath();g.arc(ax,ay,3.4*state.u,0,6.283);g.fill()});
 g.lineCap='butt'}
/* rear view: looking up the bell, tube-wall rings shrinking to a glowing throat */
export function rearSS(){
 const cx=state.W*.44,cy=state.H*.5,T=state.simT,R=Math.min(state.W,state.H)*.34,nn=state.N*state.fu,fl=.94+.06*Math.sin(T*61)*Math.sin(T*37+1),rth=R*.13;
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 let gd=g.createRadialGradient(cx,cy,R,cx,cy,R*1.4);gd.addColorStop(0,'#3a404c');gd.addColorStop(1,'#10131a');g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R*1.4,0,6.283);g.fill();
 for(let i=0;i<16;i++){const t=i/16,rr=R*(1-Math.pow(t,.7)*.87),b=(1-t*.9)*.3;g.fillStyle=`rgb(${190*b|0},${140*b|0},${84*b|0})`;g.beginPath();g.arc(cx,cy,rr,0,6.283);g.fill();g.strokeStyle='rgba(20,12,4,.35)';g.lineWidth=1.2;g.stroke()}
 g.strokeStyle='rgba(20,12,4,.22)';g.lineWidth=1;g.beginPath();for(let k=0;k<96;k++){const a=k/96*6.283;g.moveTo(cx+Math.cos(a)*rth,cy+Math.sin(a)*rth);g.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R)}g.stroke();
 g.fillStyle='#02030a';g.beginPath();g.arc(cx,cy,rth*.9,0,6.283);g.fill();
 g.globalCompositeOperation='lighter';
 gd=g.createRadialGradient(cx,cy,0,cx,cy,R);gd.addColorStop(0,`rgba(190,210,255,${nn*.7*fl})`);gd.addColorStop(.5,`rgba(120,150,255,${nn*.22*fl})`);gd.addColorStop(1,`rgba(255,140,80,${nn*.05})`);
 g.fillStyle=gd;g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();
 blob(SP.w,cx,cy,rth*4.5,rth*4.5,nn*.8*fl);blob(SP.c,cx,cy,R*.8,R*.8,nn*.35*fl);
 g.lineWidth=3;for(let i=0;i<4;i++){g.strokeStyle=`rgba(210,225,255,${nn*.4*(1-i/5)})`;g.beginPath();g.arc(cx,cy,R*(.2+i*.09),0,6.283);g.stroke()}
 blob(SP.y,cx,cy,R*2.4,R*2.4,state.ign*.8);blob(SP.o,cx,cy,R*4,R*4,nn*.05*fl);g.globalAlpha=1}
