// HARRIER: the ship for the deck-landing MISSION. A generic big-deck amphibious assault ship in the style of a Wasp
// class, sized from USS Kearsarge's published figures (an 818 ft flight deck, 65 ft above the water) and otherwise
// placed by eye (hull width, bow shape, island, elevators), and the open sea around it.
//
// Ship frame (metres, y up): the landing spot is the origin, on the deck surface; the ship heads -x (as the Harrier
// faces), so +z is to port and -z to starboard, where the island stands. The aircraft stays where it is and the ship
// moves under it (upd), so the camera presets keep working.
import * as T from 'three';
import { MT, box, canvasTex, cyl, loft, std } from '../../render3d/kit.js';
import { waveWater } from '../../render3d/water.js';
import { DECK, FB } from './machine.js';

/* the deck's extent (DECK, the outline, lives with the physics in machine.js) */
const X0 = -139,
  X1 = 109,
  Z0 = -21,
  Z1 = 13;

/* a flat outline (x, z) as a shape in the plane's own coordinates: rotated flat, (x, y) becomes (x, -z) */
const shape = (pts, k = 1) => {
  const s = new T.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x * k, -z * k) : s.moveTo(x * k, -z * k)));
  s.closePath();
  return s;
};

export function buildShip(G) {
  const ship = new T.Group(),
    L = X1 - X0,
    W = Z1 - Z0;
  G.add(ship);
  /* flight deck: non-skid grey, the landing spots down the port side of the centreline with the tramline the pilot
     lines up on, a foul line along the island side, white deck edges. Texture u along the ship (stern to bow), v across. */
  const S = 8,
    deckT = canvasTex(L * S, W * S, (x, w, h) => {
      const X = (m) => (X1 - m) * S,
        Z = (m) => (Z1 - m) * S;
      x.fillStyle = '#3b3e41';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 30000; i++) {
        const v = (48 + Math.random() * 26) | 0;
        x.fillStyle = `rgba(${v},${v + 2},${v + 5},.5)`;
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2);
      }
      /* tyre marks and exhaust staining around the spots */
      for (let i = 0; i < 9; i++) {
        const cx = X(-96 + i * 24),
          g = x.createRadialGradient(cx, Z(0), 0, cx, Z(0), 7 * S);
        g.addColorStop(0, 'rgba(18,16,14,.45)');
        g.addColorStop(1, 'rgba(18,16,14,0)');
        x.fillStyle = g;
        x.fillRect(cx - 7 * S, Z(7), 14 * S, 14 * S);
      }
      x.fillStyle = 'rgba(232,232,226,.85)';
      /* deck edges */
      x.fillRect(0, 0, w, 0.3 * S);
      x.fillRect(0, h - 0.3 * S, w, 0.3 * S);
      /* tramline: the line through the spots, the whole length of the deck */
      x.fillRect(X(105), Z(0) - 0.15 * S, X(-128) - X(105), 0.3 * S);
      /* foul line on the island side (yellow, dashed) */
      x.fillStyle = 'rgba(214,182,52,.85)';
      for (let m = -120; m < 105; m += 3) x.fillRect(X(m + 2), Z(-12.5) - 0.12 * S, 2 * S, 0.25 * S);
      /* spots: circle, lineup stripe and number */
      x.strokeStyle = 'rgba(232,232,226,.85)';
      x.lineWidth = 0.25 * S;
      x.font = `bold ${3.2 * S}px sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (let i = 0; i < 9; i++) {
        const m = -96 + i * 24;
        x.beginPath();
        x.arc(X(m), Z(0), 5 * S, 0, 6.2832);
        x.stroke();
        x.fillStyle = 'rgba(232,232,226,.85)';
        /* upright to a pilot coming in from astern */
        x.save();
        x.translate(X(m), Z(8.5));
        x.rotate(Math.PI / 2);
        x.fillText(String(i + 1), 0, 0);
        x.restore();
      }
    });
  /* the canvas runs stern to bow (u) and port to starboard (v, top row first) */
  deckT.flipY = false;
  const dg = new T.ShapeGeometry(shape(DECK));
  dg.rotateX(-Math.PI / 2);
  const uv = dg.attributes.uv,
    ps = dg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (X1 - ps.getX(i)) / L, (Z1 - ps.getZ(i)) / W);
  const deck = new T.Mesh(dg, std({ map: deckT, roughness: 0.92, metalness: 0.05 }));
  deck.receiveShadow = true;
  ship.add(deck);
  /* Under the flight deck: a slab the shape of the deck (the gallery deck, overhanging), and below it a narrower hull
     with a pointed bow and a flat stern, its sides rounding in towards the water. Widths by eye. */
  const gray = std({ color: 0x6c747a, roughness: 0.7, metalness: 0.2 }),
    dark = std({ color: 0x2a2e31, roughness: 0.8 }),
    hg = new T.ExtrudeGeometry(shape(DECK), { depth: 3.4, bevelEnabled: false });
  hg.rotateX(-Math.PI / 2);
  const slab = new T.Mesh(hg, gray);
  slab.position.y = -3.45;
  slab.receiveShadow = slab.castShadow = true;
  ship.add(slab);
  const ZC = (Z0 + Z1) / 2,
    hb = FB - 2.4,
    hull = loft(
      [
        [X0 + 1, -3.4, 0.3, 0.01, hb, 0.7, ZC],
        [X0 + 12, -3.4, 4.6, 0.01, hb, 0.6, ZC],
        [X0 + 34, -3.4, 10.5, 0.01, hb, 0.5, ZC],
        [X0 + 75, -3.4, 14.6, 0.01, hb, 0.42, ZC],
        [X1 - 60, -3.4, 15.2, 0.01, hb, 0.4, ZC],
        [X1 - 12, -3.4, 14.4, 0.01, hb, 0.42, ZC],
        [X1 - 2, -3.4, 13.6, 0.01, hb, 0.42, ZC],
        [X1 - 1.9, -3.4, 0.01, 0.01, 0.01, 1, ZC],
      ],
      gray,
      16,
    );
  ship.add(hull);
  /* hangar openings and boat bays: dark recesses along the hull below the overhang; the two deck-edge elevators */
  ship.add(
    box(140, 3.2, 0.4, dark, 20, -6, ZC + 15.05),
    box(140, 3.2, 0.4, dark, 20, -6, ZC - 15.05),
    box(16, 0.7, 14, gray, 38, -0.4, Z1 + 6.5),
    box(16, 0.7, 14, gray, 52, -0.4, Z0 - 6.5),
    box(16, 0.25, 0.25, MT.yel, 38, 0.1, Z1 + 13.4),
  );
  /* the island, on the starboard side: superstructure, bridge windows, two funnels, mast with yards, radars */
  const isl = new T.Group();
  ship.add(isl);
  isl.add(
    box(62, 9, 7, gray, 14, 4.5, -17.4),
    box(44, 7, 6, gray, 10, 12.5, -17.6),
    box(28, 4.5, 6.6, gray, 4, 18.2, -17.6),
    box(26, 1.1, 0.2, MT.dark, 4, 18.6, -14.25),
    box(0.2, 1.1, 6.2, MT.dark, -10.05, 18.6, -17.6),
    box(40, 0.9, 0.2, MT.dark, 10, 13.6, -14.55),
    box(9, 6, 5, gray, 24, 19, -17.8),
    box(9.4, 0.6, 5.4, MT.dark, 24, 22.3, -17.8),
    box(7, 5, 4.4, gray, 37, 11.5, -17.8),
    box(7.4, 0.6, 4.8, MT.dark, 37, 14.3, -17.8),
    box(58, 0.25, 0.25, gray, 14, 9.6, -13.8),
    box(11, 0.5, 4, dark, -4, 22.6, -17.6),
    box(0.5, 3.4, 5.2, dark, -9.5, 22.4, -17.6),
  );
  const mast = cyl(0.45, 0.7, 17, gray, 8);
  mast.position.set(2, 28.5, -17.6);
  const mast2 = cyl(0.3, 0.45, 9, gray, 8);
  mast2.position.set(30, 26, -17.8);
  isl.add(
    mast,
    mast2,
    box(0.4, 0.4, 9, gray, 2, 31, -17.6),
    box(0.3, 0.3, 6, gray, 2, 34.5, -17.6),
    box(4.6, 2.6, 0.5, dark, 2, 27.5, -17.6),
    box(0.3, 0.3, 5, gray, 30, 28.5, -17.8),
    box(3, 1.6, 0.4, dark, 30, 30.6, -17.8),
  );
  const dome = new T.Mesh(new T.SphereGeometry(1.5, 12, 8), std({ color: 0xd9dcd8, roughness: 0.6 }));
  dome.position.set(15, 21.6, -17.6);
  isl.add(dome);
  /* the sea: open ocean, darker than the Gulf, out to the horizon */
  const { waves, wm } = waveWater();
  wm.color.set(0x123642);
  const sea = new T.Mesh(new T.PlaneGeometry(9000, 9000), wm);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -FB;
  sea.receiveShadow = true;
  sea.userData.bg = 1;
  G.add(sea);
  /* foam where the hull meets the water, streaming aft */
  const foamT = canvasTex(
      512,
      32,
      (x, w, h) => {
        x.clearRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          x.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`;
          x.fillRect(
            Math.random() * w,
            h * (0.15 + Math.random() * 0.7),
            3 + Math.random() * 18,
            1 + Math.random() * 2,
          );
        }
      },
      true,
      [6, 1],
    ),
    foamM = std({ map: foamT, alphaMap: foamT, transparent: true, depthWrite: false, roughness: 0.7 }),
    foam = [ZC + 12.4, ZC - 12.4].map((z) => {
      const m = new T.Mesh(new T.PlaneGeometry(190, 3.2), foamM);
      m.rotation.x = -Math.PI / 2;
      m.position.set(20, -FB + 0.05, z);
      ship.add(m);
      return m;
    });
  return {
    ship,
    sea,
    keep: [ship, sea, ...foam],
    /* px, pz: the aircraft's place in the ship frame; h: the deck's heave; t: seconds, for the waves and foam */
    upd(px, pz, h, t, vs) {
      ship.position.set(-px, h, -pz);
      sea.position.x = 0;
      waves.offset.set(t * 0.004 + (t * vs) / 600, t * 0.0065);
      foamT.offset.x = (t * vs) / 43;
    },
  };
}
