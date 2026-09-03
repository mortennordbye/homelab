"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Interactive } from "./interaction";

/** A front lands in about a third of a second. Slower reads as a cutscene,
 *  faster loses the mass. */
const RATE = 6;

/** Below this the pose has arrived and the group stops being written. Forty
 *  fronts each writing a matrix every frame is the one cost this file could
 *  add to a room that already draws continuously. */
const SETTLED = 0.001;

/**
 * Eases a 0-to-1 value and hands it to `apply` only on frames that move.
 *
 * Exported for the curtains, which slide like a drawer but read as open when
 * they are at rest and so cannot use `Drawer`'s own open/close wording.
 *
 * `apply` is held in a ref for the reason `Interactive` holds its target in
 * one: every call site passes an inline arrow, and putting that in a dependency
 * list would resubscribe the frame callback on every render.
 */
export function useEase(open: boolean, apply: (t: number) => void) {
  const t = useRef(open ? 1 : 0);
  const applyRef = useRef(apply);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    applyRef.current = apply;
  });

  /* Once on mount, so the pose always matches the state. A caller whose rest
     pose is not the identity — the curtains, which rest gathered at the sides
     — would otherwise sit wherever its JSX left it until the first press. */
  useEffect(() => {
    applyRef.current(t.current);
  }, []);

  useFrame((_, dt) => {
    const goal = open ? 1 : 0;
    if (Math.abs(goal - t.current) < SETTLED) {
      if (t.current !== goal) {
        t.current = goal;
        applyRef.current(goal);
        gl.shadowMap.needsUpdate = true;
      }
      return;
    }
    t.current = THREE.MathUtils.damp(t.current, goal, RATE, dt);
    applyRef.current(t.current);
    /* The shadow map is off auto — see Lighting in FunRoom. A front that moves
       without asking for this drags its old shadow along behind it, and the
       cost is only paid on the frames it actually moves. */
    gl.shadowMap.needsUpdate = true;
  });
}

/**
 * A hinged front you look at and press.
 *
 * `pivot` is the hinge line in the parent's frame, and children are authored
 * where they sit shut — a door is placed rather than re-originated around its
 * own hinge. Sign of `angle` follows the rotation, not the carpentry: on a y
 * hinge a door whose free edge is at +x from the pivot swings into the room on
 * a negative angle, and one whose free edge is at -x on a positive angle.
 */
export function Door({
  label,
  pivot,
  axis = "y",
  angle,
  children,
}: {
  label: string;
  pivot: [number, number, number];
  axis?: "x" | "y";
  angle: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const g = useRef<THREE.Group>(null);
  useEase(open, (t) => {
    if (g.current) g.current.rotation[axis] = t * angle;
  });

  return (
    <Interactive label={label} verb={open ? "close" : "open"} onActivate={() => setOpen((o) => !o)}>
      <group position={pivot}>
        <group ref={g}>
          <group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
        </group>
      </group>
    </Interactive>
  );
}

/**
 * A drawer, or a sliding wardrobe leaf: the same thing to everything but the
 * name. `to` is the fully open offset in the parent's frame.
 */
export function Drawer({
  label,
  to,
  children,
}: {
  label: string;
  to: [number, number, number];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const g = useRef<THREE.Group>(null);
  useEase(open, (t) => g.current?.position.set(to[0] * t, to[1] * t, to[2] * t));

  return (
    <Interactive label={label} verb={open ? "close" : "open"} onActivate={() => setOpen((o) => !o)}>
      <group ref={g}>{children}</group>
    </Interactive>
  );
}

/** BoxGeometry lays its faces out +x, -x, +y, -y, +z, -z, six indices each. */
const FACE_ORDER = ["px", "nx", "py", "ny", "pz", "nz"] as const;
type Face = (typeof FACE_ORDER)[number];

/** A box with one face dropped, so the inside of it is the thing you see. */
function useOpenGeometry(w: number, h: number, d: number, face: Face) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(w, h, d);
    const start = FACE_ORDER.indexOf(face) * 6;
    const idx = Array.from(g.getIndex()!.array);
    g.setIndex(idx.filter((_, i) => i < start || i >= start + 6));
    return g;
  }, [w, h, d, face]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/** The lip around the opening: a rectangle with a rectangle cut out of it. */
function useRimGeometry(w: number, h: number, t: number) {
  const geo = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(-w / 2, -h / 2);
    outline.lineTo(w / 2, -h / 2);
    outline.lineTo(w / 2, h / 2);
    outline.lineTo(-w / 2, h / 2);
    const hole = new THREE.Path();
    const iw = w / 2 - t;
    const ih = h / 2 - t;
    hole.moveTo(-iw, -ih);
    hole.lineTo(-iw, ih);
    hole.lineTo(iw, ih);
    hole.lineTo(iw, -ih);
    outline.holes.push(hole);
    return new THREE.ShapeGeometry(outline);
  }, [w, h, t]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

/**
 * A carcass or a drawer box: five sides and a lip around the missing sixth.
 *
 * Everything in the flat that does not open is one solid box, which has an
 * opaque face exactly where the inside should be — a door swinging off one of
 * those reveals the block it was cut from. The walls are drawn double-sided
 * and so carry no thickness of their own; the lip is what gives the opening an
 * edge, and is the only reason an open cupboard reads as built rather than as
 * folded paper.
 *
 * Origin at the centre of the box. `face` is the side left out.
 */
export function OpenBox({
  width,
  height,
  depth,
  thickness = 0.018,
  face = "pz",
  material,
}: {
  width: number;
  height: number;
  depth: number;
  thickness?: number;
  face?: Extract<Face, "pz" | "py">;
  material: React.ReactElement<{ side?: THREE.Side }>;
}) {
  const shell = useOpenGeometry(width, height, depth, face);
  const front = face === "pz";
  /* Rotated onto the XZ plane below, where the shape's y becomes the box's
     depth — so a top opening's lip is measured across the box, not up it. */
  const rim = useRimGeometry(width, front ? height : depth, thickness);

  return (
    <>
      {/* The side is cloned onto the material rather than set through r3f's
          `material-side`, which lands on the default material and is then
          thrown away when the real one attaches — leaving every wall of the
          box back-facing, and the inside of it invisible. */}
      <mesh geometry={shell} receiveShadow>
        {cloneElement(material, { side: THREE.DoubleSide })}
      </mesh>
      <mesh
        geometry={rim}
        position={front ? [0, 0, depth / 2] : [0, height / 2, 0]}
        rotation={front ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      >
        {material}
      </mesh>
    </>
  );
}
