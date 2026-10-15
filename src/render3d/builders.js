// Builds every machine's 3D model in machine order (the builders live in src/machines/<name>/three.js).
import { scn } from './kit.js';
import { M3 } from '../machines/three.js';

// assigned by create*() below, when init3D runs
export let ENG;

export function createBuilders(){

ENG=M3.map(m=>m.build());ENG.forEach(e=>{scn.add(e.G);e.G.visible=false});
}
