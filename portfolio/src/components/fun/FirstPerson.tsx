"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALL_SOLIDS } from "./Hallway";
import { CHAIR_Z, DESK, DESK_D, DESK_X, DESK_Z, LANTERN, ROOM, STOVE, TABLE } from "./Room";
import { MARKS, px, pz, rectBox, wallBoxes, type Box } from "./flat";

export const EYE = 1.66;
const WALK = 1.9;
const RUN = 3.2;
const ACCEL = 11;
const DAMP = 9;

/**
 * Everything the camera cannot walk into: every solid piece of interior wall
 * from the floor plan, plus the furniture.
 *
 * The walls come from `wallBoxes()` rather than being listed again here, so a
 * partition and its collision cannot disagree — the failure that once left a
 * chair you walked straight through standing next to floor you could not
 * cross.
 */
const BLOCKERS: Box[] = [
  ...wallBoxes(),
  { x: DESK_X, z: DESK_Z, hx: DESK.w / 2, hz: DESK_D / 2 },
  { x: DESK_X, z: CHAIR_Z, hx: 0.3, hz: 0.3 },
  { x: LANTERN.x, z: LANTERN.z, hx: 0.36, hz: 0.21 },
  // The stove with its chimney breast, and the table against the west wall
  // with both its chairs pushed in. The crossing north past the kitchen
  // peninsula is 0.95m at the fire and 0.48m at the desk end; it was 0.19m
  // while the table stood out in the room, which is most of why it does not.
  // The box is the table and both chairs pushed in — pulled out they are the
  // widest thing here, not the table.
  { x: STOVE.x, z: STOVE.z, hx: 0.36, hz: 0.45 },
  { x: TABLE.x + 0.065, z: TABLE.z + 0.065, hx: 0.495, hz: 0.34 },
  // The three marked pieces, at the footprints flat.ts gives them.
  rectBox(MARKS.tvBench),
  rectBox(MARKS.sofa),
  // The bookcase, against the south wall beside the desk, with the printer on
  // top of it.
  { x: px(2.46), z: pz(5.89), hx: 0.46, hz: 0.21 },
  // The run, the peninsula butted into its south end, and the fridge column
  // that ends it at the bedroom-door end. The column is deeper than the run it bookends, so it gets
  // its own box rather than being folded into it.
  { x: px(3.62), z: pz(3.185), hx: 0.3, hz: 1.435 },
  { x: px(3.595), z: pz(1.45), hx: 0.325, hz: 0.3 },
  { x: px(2.83), z: pz(4.32), hx: 0.5, hz: 0.3 },
  // Bedroom: the bed crosswise under the wall units, and the mirrored
  // wardrobe beside it. Both inset a little, so brushing an edge does not stop
  // you in a room this narrow. The over-bed units are wall-hung and start above
  // head height, so they have no box.
  { x: px(5.32), z: pz(2.0), hx: 0.98, hz: 0.66 },
  { x: px(6.01), z: pz(0.655), hx: 0.27, hz: 0.6 },
  // Bathroom: the quadrant shower boxed to its full extent, the washing
  // machine, the WC with its duct, and the vanity. The gap between the shower
  // and the WC is the only line through the room, so neither may grow.
  { x: px(4.4), z: pz(3.2), hx: 0.4, hz: 0.4 },
  { x: px(4.32), z: pz(3.95), hx: 0.3, hz: 0.3 },
  { x: px(5.96), z: pz(3.1), hx: 0.34, hz: 0.275 },
  { x: px(6.125), z: pz(3.625), hx: 0.175, hz: 0.375 },
  // Entré: the built-in run on one side, the shoe bench and the tall cabinet on
  // the other. Taken from the file that draws them rather than measured off it.
  ...HALL_SOLIDS.map(rectBox),
];

// 0.60 across rather than 0.68. The flat is a real one and its bedroom is
// 2.3m wide: at the wider radius the walkway past the bed and the 0.8m
// doorways were passable only along a 10cm knife edge.
const PLAYER_R = 0.3;

function resolve(x: number, z: number, px: number, pz: number) {
  let nx = x;
  let nz = z;

  // room bounds
  const bx = ROOM.w / 2 - 0.4;
  const bz = ROOM.d / 2 - 0.4;
  nx = THREE.MathUtils.clamp(nx, -bx, bx);
  nz = THREE.MathUtils.clamp(nz, -bz, bz);

  // blockers: push out along whichever axis the player was already clear on,
  // so sliding along a desk edge feels natural instead of sticking.
  for (const b of BLOCKERS) {
    const dx = nx - b.x;
    const dz = nz - b.z;
    const ox = b.hx + PLAYER_R - Math.abs(dx);
    const oz = b.hz + PLAYER_R - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      const wasClearX = Math.abs(px - b.x) > b.hx + PLAYER_R;
      const wasClearZ = Math.abs(pz - b.z) > b.hz + PLAYER_R;
      if (wasClearX && !wasClearZ) nx = b.x + Math.sign(dx || 1) * (b.hx + PLAYER_R);
      else if (wasClearZ && !wasClearX) nz = b.z + Math.sign(dz || 1) * (b.hz + PLAYER_R);
      else if (ox < oz) nx = b.x + Math.sign(dx || 1) * (b.hx + PLAYER_R);
      else nz = b.z + Math.sign(dz || 1) * (b.hz + PLAYER_R);
    }
  }
  return [nx, nz] as const;
}

/** Analog walk input from the touch stick, -1..1 on each axis. */
export type MoveInput = { x: number; y: number };

/**
 * Is this keystroke meant for a text field rather than the room?
 *
 * The shell on the middle monitor is a real `<input>` living in a drei `Html`
 * portal, so its keydowns bubble all the way to `window` — where the room's
 * global listeners are. Without this check the `preventDefault` below ate every
 * space and arrow key typed into it, which left every multi-word command in the
 * shell impossible to type: `ls certs`, `cat work/<slug>`, `kubectl get nodes`.
 * Single-word commands worked, which is exactly why it survived so long.
 */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable
  );
}

export function FirstPerson({
  enabled,
  /* A ref rather than a prop value: the stick updates every touchmove, and
     re-rendering the scene root at that rate to deliver a number the frame loop
     is about to read anyway is pure waste. */
  move,
}: {
  enabled: boolean;
  move?: React.RefObject<MoveInput>;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const bob = useRef(0);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      keys.current[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const blur = () => (keys.current = {});
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05); // never let a stalled tab teleport the camera
    if (!enabled) {
      vel.current.multiplyScalar(0);
      return;
    }
    const k = keys.current;
    const m = move?.current;
    // Keys and stick sum, then get normalised below, so holding both cannot
    // walk faster than either alone.
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + (m?.y ?? 0);
    const s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (m?.x ?? 0);
    const speed = k.ShiftLeft || k.ShiftRight ? RUN : WALK;

    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();

    want.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
    /* Clamped rather than normalised. Normalising caps diagonals, which is what
       it was for, but it also snaps a half-deflected stick to full speed and
       throws away the only analog control touch has. */
    if (want.lengthSq() > 1) want.normalize();
    want.multiplyScalar(speed);

    // critically-damped-ish approach to the wanted velocity, so starting and
    // stopping has weight instead of snapping.
    vel.current.lerp(want, 1 - Math.exp(-(want.lengthSq() > 0 ? ACCEL : DAMP) * delta));

    const px = camera.position.x;
    const pz = camera.position.z;
    const [nx, nz] = resolve(
      px + vel.current.x * delta,
      pz + vel.current.z * delta,
      px,
      pz,
    );
    camera.position.x = nx;
    camera.position.z = nz;

    // head bob, scaled by actual speed so it stops when you stop
    const moving = vel.current.length();
    bob.current += delta * moving * 2.4;
    camera.position.y = EYE + Math.sin(bob.current * 2) * 0.014 * Math.min(1, moving / WALK);
  });

  return null;
}
