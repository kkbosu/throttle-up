// Props shared by the jet stands: light poles, hangar, blast fence.
import * as T from 'three';
import { MT, box, cyl, std } from './kit.js';

/* ---------------- props shared by the jet stands ---------------- */
export function lightPole(grp, x, z) {
  const p = cyl(0.1, 0.14, 11, MT.gry, 10);
  p.position.set(x, 5.5, z);
  grp.add(p);
  const h = box(0.9, 0.35, 0.5, MT.dark, x, 11, z);
  grp.add(h);
  const lens = new T.Mesh(new T.PlaneGeometry(0.8, 0.3), new T.MeshBasicMaterial({ color: 0x000000 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(x, 10.82, z);
  grp.add(lens);
  return lens;
}
export function hangar(grp, x, z, ry) {
  const g = new T.Group();
  const b = box(46, 10, 34, std({ color: 0x7c7f80, metalness: 0.5, roughness: 0.6 }), 0, 5, 0);
  const roof = new T.Mesh(
    new T.CylinderGeometry(17, 17, 46, 24, 1, true, 0, Math.PI),
    std({ color: 0x8a8d90, metalness: 0.6, roughness: 0.5, side: T.DoubleSide }),
  );
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.32, 1, 1);
  roof.position.y = 10;
  g.add(b, roof);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  grp.add(g);
}
export function blastFence(grp, x) {
  const g = new T.Group();
  for (let i = 0; i < 9; i++) {
    const s = box(16, 0.12, 0.9, MT.gry, 0, 0.6 + i * 0.55, i * -0.35);
    s.rotation.x = -0.75;
    g.add(s);
  }
  [-7.5, 0, 7.5].forEach((z) => {
    g.add(box(0.25, 5.4, 0.25, MT.dark, z, 2.7, -1.6));
  });
  g.rotation.y = -Math.PI / 2;
  g.position.set(x, 0, 0);
  grp.add(g);
}
