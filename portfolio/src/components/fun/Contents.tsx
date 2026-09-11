"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * What stands inside the flat's cupboards, drawers and fridge: boxes, cans and
 * bottles, drawn as two instanced meshes however many there are. A mesh per
 * jar would put a pile of draw calls behind every closed door. Nothing here
 * casts, for the reason in Bookshelf.
 */

export type Item = {
  shape: "box" | "can" | "bottle";
  /** The middle of its base, on the surface it stands on. */
  at: [number, number, number];
  /** Width, height, depth. A can or bottle takes the width as its diameter and
   *  ignores the depth. */
  size: [number, number, number];
  colour: string;
  /** A can or bottle laid on its side, along x. */
  lie?: boolean;
};

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const UPRIGHT = new THREE.Quaternion();
const ALONG_X = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

export function Items({ items }: { items: Item[] }) {
  const boxes = useRef<THREE.InstancedMesh>(null);
  const cylinders = useRef<THREE.InstancedMesh>(null);
  const counts = useMemo(() => {
    let b = 0;
    let c = 0;
    for (const it of items) {
      if (it.shape === "box") b += 1;
      else c += it.shape === "bottle" ? 2 : 1;
    }
    return { b, c };
  }, [items]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const colour = new THREE.Color();
    let b = 0;
    let c = 0;
    const cylinder = (x: number, y: number, z: number, dia: number, len: number, lie: boolean) => {
      m.compose(p.set(x, y, z), lie ? ALONG_X : UPRIGHT, s.set(dia, len, dia));
      cylinders.current?.setMatrixAt(c, m);
      cylinders.current?.setColorAt(c, colour);
      c += 1;
    };

    for (const it of items) {
      const [x, y, z] = it.at;
      const [w, h, d] = it.size;
      colour.set(it.colour);
      if (it.shape === "box") {
        m.compose(p.set(x, y + h / 2, z), UPRIGHT, s.set(w, h, d));
        boxes.current?.setMatrixAt(b, m);
        boxes.current?.setColorAt(b, colour);
        b += 1;
        continue;
      }
      /* A bottle is a body and a narrower neck, the body most of its length. */
      const body = it.shape === "bottle" ? h * 0.72 : h;
      const neck = h - body;
      if (it.lie) {
        cylinder(x, y + w / 2, z, w, body, true);
        if (it.shape === "bottle") cylinder(x + body / 2 + neck / 2, y + w / 2, z, w * 0.34, neck, true);
      } else {
        cylinder(x, y + body / 2, z, w, body, false);
        if (it.shape === "bottle") cylinder(x, y + body + neck / 2, z, w * 0.34, neck, false);
      }
    }

    for (const mesh of [boxes.current, cylinders.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Culling and picking read this, and until it is recomputed it covers
      // only the unit shape every instance started as.
      mesh.computeBoundingSphere();
    }
  }, [items]);

  return (
    <>
      {/* dispose off: the geometry is shared by every cupboard in the flat. */}
      {counts.b > 0 && (
        <instancedMesh key={`b${counts.b}`} ref={boxes} args={[BOX, undefined, counts.b]} dispose={null} receiveShadow>
          <meshStandardMaterial roughness={0.7} metalness={0.05} />
        </instancedMesh>
      )}
      {counts.c > 0 && (
        <instancedMesh key={`c${counts.c}`} ref={cylinders} args={[CYLINDER, undefined, counts.c]} dispose={null} receiveShadow>
          <meshStandardMaterial roughness={0.55} metalness={0.05} />
        </instancedMesh>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   The fridge column, in each bay's own frame: floor at y 0, local +z to the
   door. Shelves stand short of the door so its bins can close past them.
   --------------------------------------------------------------------------- */

const FRIDGE: Item[] = [
  { shape: "box", at: [0, 0.004, -0.07], size: [0.52, 0.17, 0.4], colour: "#c9d0d2" },
  { shape: "can", at: [-0.12, 0.174, -0.1], size: [0.05, 0.24, 0], colour: "#4f7a3b", lie: true },
  { shape: "box", at: [-0.19, 0.427, -0.14], size: [0.075, 0.22, 0.075], colour: "#ece8dd" },
  { shape: "box", at: [-0.1, 0.427, -0.16], size: [0.075, 0.2, 0.075], colour: "#e0a03c" },
  { shape: "can", at: [0.06, 0.427, -0.04], size: [0.085, 0.075, 0], colour: "#f1ede4" },
  { shape: "can", at: [0.16, 0.427, -0.04], size: [0.085, 0.075, 0], colour: "#f1ede4" },
  { shape: "box", at: [0.11, 0.427, -0.2], size: [0.2, 0.09, 0.15], colour: "#3f6c8e" },
  { shape: "can", at: [-0.19, 0.867, -0.08], size: [0.08, 0.1, 0], colour: "#a8412c" },
  { shape: "can", at: [-0.1, 0.867, -0.12], size: [0.07, 0.12, 0], colour: "#d6ad45" },
  { shape: "box", at: [0.08, 0.867, -0.05], size: [0.15, 0.06, 0.1], colour: "#e3c35a" },
  { shape: "box", at: [0.1, 0.867, -0.19], size: [0.21, 0.07, 0.11], colour: "#cbb596" },
  { shape: "bottle", at: [-0.12, 0.867, -0.24], size: [0.075, 0.3, 0], colour: "#34533a", lie: true },
];

/** The bins on the fridge door's inside face, in the same frame. */
export const FRIDGE_DOOR: Item[] = [
  { shape: "box", at: [0, 0.3, 0.26], size: [0.5, 0.07, 0.1], colour: "#d7dcde" },
  { shape: "box", at: [0, 0.78, 0.26], size: [0.5, 0.06, 0.1], colour: "#d7dcde" },
  { shape: "bottle", at: [-0.16, 0.31, 0.26], size: [0.075, 0.27, 0], colour: "#7fb0cf" },
  { shape: "bottle", at: [-0.06, 0.31, 0.26], size: [0.07, 0.25, 0], colour: "#476f3d" },
  { shape: "bottle", at: [0.07, 0.31, 0.26], size: [0.06, 0.19, 0], colour: "#b3342b" },
  { shape: "can", at: [0.17, 0.31, 0.26], size: [0.07, 0.12, 0], colour: "#e9e3d3" },
  { shape: "can", at: [-0.12, 0.79, 0.26], size: [0.055, 0.08, 0], colour: "#d8cfb4" },
  { shape: "can", at: [0, 0.79, 0.26], size: [0.055, 0.08, 0], colour: "#c56b3c" },
  { shape: "box", at: [0.14, 0.79, 0.26], size: [0.12, 0.05, 0.07], colour: "#e7dc9e" },
];

const FREEZER: Item[] = [
  { shape: "box", at: [-0.12, 0.004, -0.06], size: [0.24, 0.07, 0.3], colour: "#86a9c6" },
  { shape: "box", at: [0.12, 0.004, -0.03], size: [0.3, 0.04, 0.3], colour: "#a9463a" },
  { shape: "box", at: [0.12, 0.044, -0.03], size: [0.3, 0.04, 0.3], colour: "#c98b3b" },
  { shape: "box", at: [-0.13, 0.337, -0.08], size: [0.22, 0.07, 0.26], colour: "#5c8a48" },
  { shape: "can", at: [0.13, 0.337, -0.1], size: [0.15, 0.11, 0], colour: "#eee4c6" },
];

const COLUMN_TOP: Item[] = [
  { shape: "box", at: [-0.14, 0.004, -0.06], size: [0.22, 0.26, 0.3], colour: "#c4ad88" },
  { shape: "box", at: [0.13, 0.004, -0.09], size: [0.21, 0.19, 0.26], colour: "#6f5641" },
];

/** Each fridge column bay's contents, keyed by the bay's label. */
export const COLUMN_STOCK: Record<string, Item[]> = {
  "the freezer": FREEZER,
  "the fridge": FRIDGE,
  "the cupboard": COLUMN_TOP,
};

/* ---------------------------------------------------------------------------
   The kitchen run. Drawers in the tray's frame with its floor at y 0; the door
   bays in the carcass's, centred on the bay with its floor at y 0.
   --------------------------------------------------------------------------- */

const CUTLERY: Item[] = [
  { shape: "box", at: [0, 0, -0.02], size: [0.36, 0.05, 0.36], colour: "#8a7458" },
  ...[-0.12, -0.06, 0, 0.06, 0.12].map(
    (x): Item => ({ shape: "box", at: [x, 0.05, -0.02], size: [0.025, 0.012, 0.22], colour: "#aeb3b8" }),
  ),
];

const UTENSILS: Item[] = [
  { shape: "box", at: [-0.12, 0, 0], size: [0.06, 0.02, 0.32], colour: "#2d2f32" },
  { shape: "box", at: [-0.03, 0, 0.02], size: [0.05, 0.02, 0.3], colour: "#a07a4f" },
  { shape: "can", at: [0.1, 0, -0.04], size: [0.04, 0.3, 0], colour: "#aeb3b8", lie: true },
  { shape: "box", at: [0.12, 0, 0.14], size: [0.16, 0.04, 0.08], colour: "#c9c2b3" },
];

const POTS: Item[] = [
  { shape: "can", at: [-0.12, 0, -0.06], size: [0.22, 0.13, 0], colour: "#3a3d41" },
  { shape: "can", at: [0.12, 0, -0.08], size: [0.19, 0.1, 0], colour: "#8d9298" },
  { shape: "can", at: [0.12, 0.1, -0.08], size: [0.16, 0.06, 0], colour: "#6f7478" },
  { shape: "can", at: [-0.02, 0, 0.14], size: [0.24, 0.05, 0], colour: "#2a2c2f" },
];

const TUBS: Item[] = [
  { shape: "box", at: [-0.13, 0, -0.08], size: [0.18, 0.08, 0.14], colour: "#d9dcd6" },
  { shape: "box", at: [-0.13, 0.08, -0.08], size: [0.16, 0.07, 0.12], colour: "#cfd6d9" },
  { shape: "box", at: [0.1, 0, -0.06], size: [0.2, 0.1, 0.18], colour: "#7c9aa6" },
  { shape: "can", at: [0.02, 0, 0.14], size: [0.12, 0.09, 0], colour: "#e5e1d6" },
];

/** A kitchen drawer's contents by bay and drawer (0 the deep one, 1 the
 *  shallow one), so two drawers side by side are not the same drawer twice. */
export function drawerStock(bay: number, drawer: number): Item[] {
  if (drawer === 1) return bay % 2 ? UTENSILS : CUTLERY;
  return bay % 2 ? TUBS : POTS;
}

/** Under the sink. Kept low: the bowl hangs down into the top of this bay. */
export const UNDER_SINK: Item[] = [
  { shape: "can", at: [-0.13, 0, -0.1], size: [0.22, 0.32, 0], colour: "#2c2e31" },
  { shape: "bottle", at: [0.08, 0, -0.14], size: [0.07, 0.26, 0], colour: "#3d7fb5" },
  { shape: "bottle", at: [0.17, 0, -0.06], size: [0.07, 0.22, 0], colour: "#dcd6c7" },
  { shape: "box", at: [0.12, 0, 0.12], size: [0.13, 0.08, 0.16], colour: "#7b4a8c" },
];

export const PANS: Item[] = [
  { shape: "can", at: [-0.06, 0, -0.06], size: [0.26, 0.14, 0], colour: "#3a3d41" },
  { shape: "can", at: [-0.06, 0.14, -0.06], size: [0.22, 0.1, 0], colour: "#55595e" },
  { shape: "can", at: [0.12, 0, 0.13], size: [0.2, 0.09, 0], colour: "#b9bdc1" },
];

/** The wall units, bay by bay: crockery and glasses, then jars and mugs. */
export function wallStock(length: number, doors: number, floor: number, shelf: number): Item[] {
  const w = length / doors;
  return Array.from({ length: doors }, (_, i): Item[] => {
    const cx = -length / 2 + w * (i + 0.5);
    return i % 2
      ? [
          { shape: "can", at: [cx - 0.11, floor, -0.03], size: [0.24, 0.1, 0], colour: "#e9e6df" },
          { shape: "can", at: [cx + 0.14, floor, -0.02], size: [0.15, 0.13, 0], colour: "#c9c3b6" },
          ...[-0.16, -0.06, 0.04, 0.14].map(
            (dx): Item => ({ shape: "can", at: [cx + dx, shelf, -0.05], size: [0.07, 0.12, 0], colour: "#cdd6d4" }),
          ),
        ]
      : [
          { shape: "box", at: [cx - 0.12, floor, -0.05], size: [0.2, 0.28, 0.08], colour: "#b58b4c" },
          { shape: "box", at: [cx + 0.1, floor, -0.06], size: [0.14, 0.22, 0.07], colour: "#6e8a5a" },
          ...[-0.12, 0, 0.12].map(
            (dx): Item => ({ shape: "can", at: [cx + dx, shelf, -0.04], size: [0.085, 0.09, 0], colour: "#5f7380" }),
          ),
        ];
  }).flat();
}

/* ---------------------------------------------------------------------------
   The bathroom.
   --------------------------------------------------------------------------- */

/** The mirror cabinet, centred on its middle: floor at -0.33, shelves at
 *  -0.104 and 0.116. */
export const MIRROR_CABINET: Item[] = [
  { shape: "bottle", at: [-0.2, -0.33, 0.07], size: [0.05, 0.17, 0], colour: "#e4e1d8" },
  { shape: "box", at: [0.04, -0.33, 0.07], size: [0.16, 0.04, 0.045], colour: "#3f7fbf" },
  { shape: "can", at: [0.22, -0.33, 0.07], size: [0.07, 0.1, 0], colour: "#9fb8c2" },
  { shape: "can", at: [-0.22, -0.104, 0.07], size: [0.045, 0.11, 0], colour: "#c7a37a" },
  { shape: "can", at: [-0.15, -0.104, 0.07], size: [0.045, 0.09, 0], colour: "#8d6f9c" },
  { shape: "can", at: [0.04, -0.104, 0.07], size: [0.075, 0.06, 0], colour: "#f1eee7" },
  { shape: "box", at: [0.2, -0.104, 0.07], size: [0.1, 0.13, 0.06], colour: "#6d9a8f" },
  { shape: "can", at: [-0.18, 0.116, 0.07], size: [0.08, 0.08, 0], colour: "#f3f0ea" },
  { shape: "can", at: [0, 0.116, 0.07], size: [0.05, 0.15, 0], colour: "#2f3336" },
  { shape: "bottle", at: [0.2, 0.116, 0.07], size: [0.05, 0.19, 0], colour: "#b85a4a" },
];

/** The vanity's upper drawer, in the tray's frame with its floor at y 0. */
export const VANITY_TOP: Item[] = [
  { shape: "box", at: [-0.18, 0, 0], size: [0.24, 0.05, 0.2], colour: "#e6e2d8" },
  { shape: "box", at: [-0.18, 0.05, 0], size: [0.22, 0.05, 0.19], colour: "#cfd8dc" },
  { shape: "box", at: [0.06, 0, -0.03], size: [0.12, 0.05, 0.08], colour: "#5a7d9c" },
  { shape: "bottle", at: [0.14, 0, 0.07], size: [0.05, 0.18, 0], colour: "#d9cfbf", lie: true },
];

export const VANITY_LOW: Item[] = [
  { shape: "box", at: [-0.16, 0, 0], size: [0.3, 0.12, 0.22], colour: "#b9c4c9" },
  { shape: "can", at: [0.07, 0, -0.04], size: [0.11, 0.1, 0], colour: "#f4f2ee" },
  { shape: "can", at: [0.19, 0, -0.04], size: [0.11, 0.1, 0], colour: "#f4f2ee" },
  { shape: "can", at: [0.13, 0, 0.08], size: [0.11, 0.1, 0], colour: "#f4f2ee" },
];

/* ---------------------------------------------------------------------------
   The bedroom.
   --------------------------------------------------------------------------- */

const CLOTH = ["#2b2d30", "#4a5561", "#7b6a55", "#1f2022", "#6b3f3a", "#3e4b3f", "#9a9285", "#2f3a4a"];

/** The wardrobe: a rail of clothes, folded stacks on the shelf, shoe boxes on
 *  the floor. `rail` and `shelf` are the rail's height and the shelf's top. */
export function wardrobeStock(width: number, rail: number, shelf: number): Item[] {
  const n = Math.floor((width - 0.1) / 0.1);
  const garments = Array.from({ length: n }, (_, i): Item => {
    const len = 0.8 + ((i * 37) % 5) * 0.08;
    return {
      shape: "box",
      at: [-width / 2 + 0.1 + i * 0.1, rail - 0.04 - len, (i % 2) * 0.02],
      size: [0.045, len, 0.4],
      colour: CLOTH[i % CLOTH.length],
    };
  });
  const folded = [-0.4, 0, 0.4].flatMap((x, i): Item[] => [
    { shape: "box", at: [x, shelf, -0.02], size: [0.3, 0.08, 0.32], colour: CLOTH[(i + 2) % CLOTH.length] },
    { shape: "box", at: [x, shelf + 0.08, -0.02], size: [0.28, 0.07, 0.3], colour: CLOTH[(i + 5) % CLOTH.length] },
  ]);
  const shoes = [-0.35, 0.05].map(
    (x): Item => ({ shape: "box", at: [x, 0.004, 0.02], size: [0.32, 0.12, 0.2], colour: "#8a7a62" }),
  );
  return [...garments, ...folded, ...shoes];
}

/** The units over the bed, two rows of three. */
export function overbedStock(width: number, cols: number, bottom: number, rowH: number): Item[] {
  const w = width / cols;
  const cell = (col: number) => -width / 2 + w * (col + 0.5);
  const lower = bottom + 0.005;
  const upper = bottom + rowH + 0.005;
  return [
    ...[0, 1, 2].map(
      (k): Item => ({
        shape: "box",
        at: [cell(0), lower + k * 0.08, 0],
        size: [0.36 - k * 0.02, 0.08, 0.3],
        colour: ["#d8d2c4", "#bfc6c2", "#e6e1d6"][k],
      }),
    ),
    { shape: "box", at: [cell(1), lower, -0.01], size: [0.36, 0.26, 0.3], colour: "#7a6a55" },
    { shape: "box", at: [cell(2) - 0.08, lower, 0], size: [0.18, 0.24, 0.28], colour: "#5f6a70" },
    { shape: "box", at: [cell(2) + 0.12, lower, 0], size: [0.14, 0.16, 0.24], colour: "#a89a82" },
    { shape: "box", at: [cell(0), upper, 0], size: [0.4, 0.15, 0.3], colour: "#e4ded2" },
    { shape: "box", at: [cell(1), upper, -0.01], size: [0.42, 0.3, 0.33], colour: "#2f3133" },
    { shape: "box", at: [cell(2), upper, 0], size: [0.32, 0.2, 0.3], colour: "#9a8b73" },
  ];
}
