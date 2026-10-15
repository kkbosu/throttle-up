// Scene presets (DUSK/DAY/NIGHT, space, Mars) and applying them; sun placement.
import * as T from 'three';
import { state } from '../core/state.js';
import { k3 } from './context.js';
import { earthU } from './earth.js';
import { mountMat } from './ground.js';
import { R, V3, col, scn } from './kit.js';
import { floods, hemi, sun } from './lights.js';
import { CFG } from './machine.js';
import { envScn, pm, skyU } from './sky.js';

// assigned by create*() below, when init3D runs
export let SCN,SCNS,SCNM,sKey;

export function createScenes(){
SCN=[
 {n:'DUSK',zen:[.03,.055,.13],hor:[.78,.43,.24],gnd:[.36,.25,.19],sun:[.52,.07,-.85],sunC:[1,.55,.28],sunI:1.6,sunL:2.6,hS:0x7080a8,hG:0x5a3c2c,hI:.65,exp:.85,fog:.00042,stars:0,fl:0},
 {n:'DAY',zen:[.10,.24,.60],hor:[.62,.72,.84],gnd:[.62,.55,.45],sun:[-.42,.74,.52],sunC:[1,.95,.86],sunI:1.2,sunL:3.4,hS:0x9ab4e0,hG:0x8a7a62,hI:.9,exp:.62,fog:.00028,stars:0,fl:0},
 {n:'NIGHT',zen:[.002,.003,.009],hor:[.012,.018,.035],gnd:[.004,.004,.005],sun:[.35,.6,-.72],sunC:[.5,.6,1],sunI:0,sunL:.18,hS:0x2a3550,hG:0x0a0a0c,hI:.35,exp:1.15,fog:.0006,stars:1,fl:1}];
SCNS=[
 {n:'TERMINATOR',zen:[0,0,0],hor:[0,0,0],gnd:[.03,.07,.16],sun:[.86,.1,-.5],sunC:[1,.97,.92],sunI:1.4,sunL:2.3,hS:0x000000,hG:0x2a4a80,hI:.3,exp:.78,fog:0,stars:1.2,fl:0},
 {n:'SUNLIT',zen:[0,0,0],hor:[0,0,0],gnd:[.05,.1,.22],sun:[-.42,.72,.55],sunC:[1,.97,.92],sunI:1.4,sunL:2.3,hS:0x000000,hG:0x3a5a90,hI:.4,exp:.8,fog:0,stars:1,fl:0},
 {n:'ECLIPSE',zen:[0,0,0],hor:[0,0,0],gnd:[.004,.006,.012],sun:[-.15,-.97,.2],sunC:[1,.97,.92],sunI:0,sunL:0,hS:0x000000,hG:0x0a0f1a,hI:.12,exp:1.1,fog:0,stars:1.4,fl:0}];
/* Mars: butterscotch dusty sky by day; around the setting Sun the dust scatters blue light forward, so the glow there is blue */
SCNM=[
 {n:'MIDDAY',zen:[.36,.25,.17],hor:[.80,.60,.43],gnd:[.5,.33,.22],sun:[-.3,.85,.42],sunC:[1,.93,.84],sunI:.9,sunL:2.5,hS:0xc89a70,hG:0x7a4a30,hI:.75,exp:.68,fog:.00045,stars:0,fl:0},
 {n:'AFTERNOON',zen:[.28,.19,.13],hor:[.72,.50,.34],gnd:[.45,.29,.19],sun:[.62,.36,-.68],sunC:[1,.85,.68],sunI:.9,sunL:2.3,hS:0xa87a58,hG:0x6a3e28,hI:.65,exp:.76,fog:.0005,stars:0,fl:0},
 {n:'SUNSET',zen:[.03,.028,.034],hor:[.24,.16,.115],gnd:[.12,.08,.06],sun:[-.3,.07,-.95],sunC:[.78,.74,.72],glow:[.3,.5,1.1],sunI:1.5,sunL:.85,hS:0x4a4c60,hG:0x2a1a14,hI:.5,exp:1.05,fog:.0006,stars:.25,fl:0}];
sKey=s=>(CFG[state.mi].space?3:CFG[state.mi].mars?6:0)+s;
k3.curS=-1;k3.curP=SCN[0];
}

export function applyScene(s){const sp=!!(CFG[state.mi]&&CFG[state.mi].space),mr=!!(CFG[state.mi]&&CFG[state.mi].mars),c=(sp?SCNS:mr?SCNM:SCN)[s];k3.curS=sKey(s);k3.curP=c;skyU.uSpace.value=sp?1:0;
 skyU.uZen.value.set(...c.zen);skyU.uHor.value.set(...c.hor);skyU.uGnd.value.set(...c.gnd);skyU.uSun.value.set(...c.sun).normalize();skyU.uSunC.value.set(...(c.glow||c.sunC));skyU.uSunI.value=c.sunI;skyU.uStars.value=c.stars;
 scn.fog=sp?null:new T.FogExp2(col(...c.hor),c.fog);earthU.uSun.value.set(...c.sun).normalize();
 sun.color.setRGB(...c.sunC);sun.intensity=c.sunL;hemi.color.set(c.hS);hemi.groundColor.set(c.hG);hemi.intensity=c.hI;
 floods.forEach(l=>{l.intensity=c.fl*320;l.visible=!!c.fl});R.toneMappingExposure=c.exp;
 if(k3.envRT)k3.envRT.dispose();k3.envRT=pm.fromScene(envScn,.02,.1,200);scn.environment=k3.envRT.texture;
 mountMat.color.setRGB(c.hor[0]*.55,c.hor[1]*.55,c.hor[2]*.6);placeSun()}
export function placeSun(){const c=CFG[state.mi]||CFG[0],d=V3(...k3.curP.sun).normalize();sun.position.set(...c.sc).addScaledVector(d,60)}
