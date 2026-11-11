// Files the 3D models need, in hand before init3D so that building stays synchronous and in order. The loader
// (core/loader3d.js) starts the fetch at the same moment as the 3D code's, so the model no longer waits for three.

/* rover: NASA's Perseverance model, cut down by tools/rover-model.mjs (null if it could not be fetched: the sky crane
   then keeps its hand-built rover) */
/* lander: NASA's Apollo lunar module model, through the same tool (null: the hand-built lander stays) */
export const AS = { rover: null, lander: null };

/* files: { rover, lander }: each a promise of the file's bytes (or null) */
export async function preload3D(files) {
  try {
    AS.rover = (await files.rover) || null;
  } catch (e) {
    console.warn('rover model not loaded, using the built-in one', e);
  }
  try {
    AS.lander = (await files.lander) || null;
  } catch (e) {
    console.warn('lander model not loaded, using the built-in one', e);
  }
}
