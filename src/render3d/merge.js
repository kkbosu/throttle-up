// Fewer draw calls: a machine's static meshes that share a material are merged into one mesh. On phones each draw
// call costs tens of microseconds of main-thread time (three's per-object state and uniforms, plus the GPU process),
// and a machine is 140+ meshes but only 20-50 materials.
//
// Static means: fixed relative to the machine's group, or to the nearest parent in `keep` (the parts its upd()
// moves, shows/hides or re-materials, e.g. a rotor or the cutaway's casing; each is merged on its own, so its meshes
// still move and hide together). Transparent meshes (sorted by depth one by one), instanced, mirrored and
// multi-material meshes are left alone. The originals stay in the scene, hidden, so
// anything that refers to them (plume anchor, labels) still works; G3.merged lists them for the check that fails if
// one ever moves, changes material or is shown again (tools/check.mjs).
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MERGED = [] /* [original mesh, the root it was merged under] */,
  FROZEN = [] /* static objects whose local matrix is no longer recomputed every frame */,
  SYNC = []; /* [material, its copy for instanced meshes] */

const sig = (g) =>
  Object.keys(g.attributes)
    .sort()
    .map((k) => {
      const a = g.attributes[k];
      return `${k}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`;
    })
    .join(',');

function mergeable(m) {
  const g = m.geometry,
    mt = m.material;
  return (
    m.isMesh &&
    !m.isInstancedMesh &&
    !m.isSkinnedMesh &&
    m.visible &&
    !Array.isArray(mt) &&
    !mt.transparent &&
    !m.customDepthMaterial &&
    !m.customDistanceMaterial &&
    m.onBeforeRender === T.Object3D.prototype.onBeforeRender &&
    !Object.keys(g.morphAttributes).length &&
    g.drawRange.start === 0 &&
    g.drawRange.count === Infinity &&
    Object.values(g.attributes).every((a) => a.isBufferAttribute && !a.isInterleavedBufferAttribute)
  );
}

/* root: the machine's group. Each kept object is a rigid part of its own: its static descendants merge under it, so
   they still move and hide with it. */
export function mergeStatic(root, keep = []) {
  const skip = new Set(keep.filter(Boolean));
  root.updateMatrixWorld(true);
  const todo = [root];
  while (todo.length) mergeUnder(todo.pop(), skip, todo);
  /* freeze everything that isn't kept: three otherwise recomposes every object's matrix every frame and, from the
     first object that does, recomputes the world matrices of its whole subtree (hidden machines included) */
  root.traverse((o) => {
    if (skip.has(o) || !o.matrixAutoUpdate) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
    FROZEN.push([o, root]);
  });
}

/* A material shared by instanced and plain meshes needs two shader programs, and three switches between them at every
   change of kind while drawing. Instanced meshes get a copy, kept equal to the original by syncMaterials(). */
export function splitInstanced(scene, CAT) {
  const kinds = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (!kinds.has(o.material)) kinds.set(o.material, { inst: [], plain: 0 });
    if (o.isInstancedMesh) kinds.get(o.material).inst.push(o);
    else kinds.get(o.material).plain++;
  });
  for (const [m, k] of kinds) {
    if (!k.inst.length || !k.plain) continue;
    const c = m.clone();
    if (CAT.has(m)) CAT.set(c, CAT.get(m));
    k.inst.forEach((o) => (o.material = c));
    SYNC.push([m, c, m.version]);
  }
}
/* every frame: carry over what upd() hooks change (colour, emissive, opacity ...), and recompiles */
export function syncMaterials() {
  for (const s of SYNC) {
    const [m, c] = s;
    c.copy(m);
    if (m.version !== s[2]) {
      s[2] = m.version;
      c.needsUpdate = true;
    }
  }
}

function mergeUnder(root, skip, todo) {
  const inv = new T.Matrix4().copy(root.matrixWorld).invert(),
    rel = new T.Matrix4(),
    sets = new Map();
  const walk = (o) => {
    if (skip.has(o)) return todo.push(o);
    if (!o.visible) return;
    if (mergeable(o) && rel.multiplyMatrices(inv, o.matrixWorld).determinant() > 0) {
      const u = o.userData,
        k = [
          o.material.id,
          o.castShadow,
          o.receiveShadow,
          o.renderOrder,
          o.frustumCulled,
          o.layers.mask,
          u.bg,
          u.pt,
          u.ph,
          sig(o.geometry),
        ].join(' ');
      if (!sets.has(k)) sets.set(k, []);
      sets.get(k).push(o);
    }
    o.children.forEach(walk);
  };
  root.children.forEach(walk);
  for (const list of sets.values()) {
    if (list.length < 2) continue;
    /* one material, so a box's or cylinder's per-face groups don't matter; non-indexed parts get a plain index */
    const parts = list.map((m) => {
        const g = m.geometry.clone().applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
        g.clearGroups();
        if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
        return g;
      }),
      g = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    if (!g) continue;
    const a = list[0],
      mm = new T.Mesh(g, a.material);
    mm.castShadow = a.castShadow;
    mm.receiveShadow = a.receiveShadow;
    mm.renderOrder = a.renderOrder;
    mm.frustumCulled = a.frustumCulled;
    mm.layers.mask = a.layers.mask;
    Object.assign(mm.userData, a.userData);
    root.add(mm);
    for (const m of list) {
      m.visible = false;
      MERGED.push([m, root]);
    }
  }
}
