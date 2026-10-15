// 3D renderer (Three.js), loaded on demand by core/loader3d.js together with three.
import { loadM3 } from '../machines/three.js';
// init3D creates everything in exactly v11's order (object ids and UUID random draws depend on it), then
// returns the G3 interface the rest of the program uses.
import { state } from '../core/state.js';
import { createBuilders } from './builders.js';
import { createCamera } from './camera.js';
import { createComposite, setup } from './composite.js';
import { createContext, k3 } from './context.js';
import { createEarth } from './earth.js';
import { createFlow } from './flow.js';
import { createFrame, createFrame2, render } from './frame.js';
import { createGround } from './ground.js';
import { R, createKit, glc } from './kit.js';
import { createLenses } from './lenses.js';
import { createLights } from './lights.js';
import { applyMachine, createMachine } from './machine.js';
import { createOverlay, overlay } from './overlay.js';
import { burst, createParticles, createParticles2 } from './particles.js';
import { createPlume, createPlume2 } from './plume.js';
import { applyScene, createScenes } from './scenes.js';
import { createSky } from './sky.js';

/* =====================================================================================
   3D RENDERER (Three.js). The simulation above is unchanged; this only draws it.
   World units are metres, Y up. Each engine's exhaust axis is its local +X.
   Pipeline per frame: scene -> HDR target with depth; volumetric plume -> half-res target
   (ray-marched, stops at scene depth, alpha carries heat for the haze); composite (haze + plume + flash)
   -> bloom -> ACES tone map.
   ===================================================================================== */
export function init3D(){
loadM3();
createContext();
createKit();
createSky();
createLights();
createScenes();
createGround();
createEarth();
createBuilders();
createPlume();
createParticles();
createComposite();
createMachine();
createCamera();
createPlume2();
createParticles2();
createLenses();
createFlow();
createFrame();
createOverlay();
createFrame2();
setup();applyScene(state.scene);applyMachine();
return{canvas:glc,render,overlay,resize:()=>{k3.QA=-1},surge:()=>{k3.fire=1;burst(14,true)},snap:()=>{k3.camSnap=true},R}}
