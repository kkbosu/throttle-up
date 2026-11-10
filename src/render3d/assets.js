// Files the 3D models need, fetched before init3D so that building stays synchronous and in order.
import roverUrl from '../machines/sky-crane/rover.bin?url';

/* rover: NASA's Perseverance model, cut down by tools/rover-model.mjs (null if it could not be fetched: the sky crane
   then keeps its hand-built rover) */
export const AS = { rover: null };

export async function preload3D() {
  try {
    const ac = new AbortController(),
      to = setTimeout(() => ac.abort(), 8000),
      r = await fetch(roverUrl, { signal: ac.signal });
    if (r.ok) AS.rover = await r.arrayBuffer();
    clearTimeout(to);
  } catch (e) {
    console.warn('rover model not loaded, using the built-in one', e);
  }
}
