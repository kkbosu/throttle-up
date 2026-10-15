// Gimbal wobble shared by the RS-25 (shuttle) and the F-1s (Saturn V), in 2D and 3D.
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';

export const gimb=()=>.05*sm(.45,1,state.N)*state.fu*(Math.sin(state.simT*.8)*.6+Math.sin(state.simT*1.9+1)*.4)+.004*state.N*Math.sin(state.simT*23);
