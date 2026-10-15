// Per-machine configuration (plume box, shadow area, camera presets, ground type) and switching machines.
import { M3 } from '../machines/three.js';
import { state } from '../core/state.js';
import { ENG } from './builders.js';
import { k3 } from './context.js';
import { earth } from './earth.js';
import { gMat, grassC, ground, lakeC, lakeN, marsC, marsN, mountains, rocks, trees } from './ground.js';
import { floods, sun } from './lights.js';
import { SMK, SPK } from './particles.js';
import { setPlumeBox } from './plume.js';
import { placeSun } from './scenes.js';

// assigned by create*() below, when init3D runs
export let CFG;

export function createMachine(){

/* ======================= per-machine configuration ======================= */
/* camera presets per view: [position, target, half-width that must stay in frame] */
CFG=[
 M3[0].cfg,
 M3[1].cfg,
 M3[2].cfg,
 {box:[1.8,1.0],sc:[-1,0,0],sh:7,space:1,cams:[[[3.7,2.7,8.4],[-.25,-.45,0],2.6],[[1.0,.02,1.65],[.05,-.36,.33],.55],[[2.1,.2,1.05],[-.17,-.38,.35],.62],[[0,0,0],[-.6,-2.6,-1.6],2.6]],mt:0},
 {box:[16,8],sc:[2,10,0],sh:26,cams:[[[16,14,50],[3,12.5,0],21],[[8.6,10.8,10.8],[2.4,12.4,2.4],4.6],[[9.5,3.2,13],[0,13,0],7.5]],mt:0},
 {box:[9,3.4],sc:[0,1,0],sh:12,cams:[[[3.5,3.4,19],[0,2.0,0],9.5],[[-.4,1.25,3.7],[.5,1.55,1.0],1.7],[[13,2.6,7],[0,1.7,0],5.2]],mt:1},
 {box:[6,1.3],sc:[0,3,0],sh:14,cams:[[[-10,5.8,15],[0,3.6,0],7.2],[[-7.2,5.0,5.8],[-2.6,4.1,0],3.3],[[14,5.4,9],[2.2,3.8,0],5]],mt:0},
 {box:[12,2.6],sc:[0,10,0],sh:24,mars:1,cams:[[[15,3.5,24],[0,0,0],6.5],[[5.2,1.8,7.2],[0,.9,0],2.9],[[8,1.3,12],[0,0,0],7]],mt:0}];
}

export function applyMachine(){k3.MA=state.mi;ENG.forEach((e,i)=>e.G.visible=i==state.mi);const c=CFG[state.mi];setPlumeBox(c.box[0],c.box[1]);
 mountains.visible=(!!c.mt||!!c.mars)&&!c.space;trees.visible=!c.mt&&!c.space&&!c.mars;rocks.visible=!!c.mars;ground.visible=!c.space;earth.visible=!!c.space;k3.curS=-1;gMat.map=c.mars?marsC:c.mt?lakeC:grassC;gMat.normalMap=c.mars?marsN:c.mt?lakeN:null;gMat.needsUpdate=true;
 const sc=sun.shadow.camera;sc.left=sc.bottom=-c.sh;sc.right=sc.top=c.sh;sc.near=1;sc.far=120;sc.updateProjectionMatrix();sun.target.position.set(...c.sc);placeSun();
 floods.forEach(l=>l.target.position.set(...c.sc));SPK.clear();SMK.clear();k3.camSnap=true;k3.yaw=k3.pit=0;k3.zoom=1}
