// Sea water: a tiling wave normal map (a sum of travelling waves) on a glossy material that samples it at three
// unrelated scales, so its repeat never shows across a sea kilometres wide. Starship's Gulf and the Harrier's ship.
import * as T from 'three';
import { canvasTex, std } from './kit.js';

/* waves: the normal map (scroll its offset to move the waves); wm: the material */
export function waveWater() {
  const waves = canvasTex(
    256,
    256,
    (x, w, h) => {
      const id = x.createImageData(w, h),
        H = new Float32Array(w * h);
      /* a sum of travelling-wave components in random directions (integer wave numbers, so it tiles) */
      const W = [];
      for (let k = 0; k < 28; k++) {
        const f = 2 + Math.floor(Math.pow(Math.random(), 1.6) * 22),
          a = Math.random() * 6.2832;
        W.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), Math.random() * 6.2832, 1 / f]);
      }
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const u = (i / w) * 6.2832,
            v = (j / h) * 6.2832;
          let s = 0;
          for (const [kx, ky, p, a] of W) s += Math.sin(u * kx + v * ky + p) * a;
          H[j * w + i] = s * 2.2;
        }
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const k = (j * w + i) * 4,
            nx = -(H[j * w + ((i + 1) % w)] - H[j * w + ((i + w - 1) % w)]) * 1.4,
            ny = -(H[((j + 1) % h) * w + i] - H[((j + h - 1) % h) * w + i]) * 1.4,
            l = Math.hypot(nx, ny, 1);
          id.data[k] = ((nx / l) * 0.5 + 0.5) * 255;
          id.data[k + 1] = ((ny / l) * 0.5 + 0.5) * 255;
          id.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
          id.data[k + 3] = 255;
        }
      x.putImageData(id, 0, 0);
    },
    false,
    [600, 600],
  );
  const wm = std({
    color: 0x1b4650,
    roughness: 0.16,
    metalness: 0,
    normalMap: waves,
    normalScale: new T.Vector2(0.22, 0.22),
  });
  /* sample the wave map at three unrelated scales so its repeat never shows across the sea */
  wm.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      T.ShaderChunk.normal_fragment_maps,
    );
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
      `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
      vec3 mapN2 = texture2D( normalMap, vNormalMapUv * 0.137 + vec2( 0.31, 0.17 ) ).xyz * 2.0 - 1.0;
      vec3 mapN3 = texture2D( normalMap, vNormalMapUv * 0.0213 + vec2( 0.7, 0.2 ) ).xyz * 2.0 - 1.0;
      mapN = normalize( vec3( ( mapN.xy + mapN2.xy * 1.2 + mapN3.xy * 0.9 ) * 0.6, mapN.z ) );`,
    );
  };
  return { waves, wm };
}
