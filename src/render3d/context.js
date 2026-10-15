// k3: the 3D renderer state that several modules reassign (camera, plume, render targets, particle accumulators...).

// assigned by create*() below, when init3D runs
export let k3;

export function createContext() {
  k3 = {};
}
