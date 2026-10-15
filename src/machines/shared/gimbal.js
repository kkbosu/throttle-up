// Gimbal wobble shared by the RS-25 (shuttle) and the F-1s (Saturn V), in 2D and 3D.
import { state } from '../../core/state.js';
import { sm } from '../../core/util.js';

export const gimb = () =>
  0.05 * sm(0.45, 1, state.N) * state.fu * (Math.sin(state.simT * 0.8) * 0.6 + Math.sin(state.simT * 1.9 + 1) * 0.4) +
  0.004 * state.N * Math.sin(state.simT * 23);
