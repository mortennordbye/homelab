"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CHAIR_Z, DESK_D, DESK_Z, ROOM } from "./Room";

export const EYE = 1.66;
const WALK = 1.9;
const RUN = 3.2;
const ACCEL = 11;
const DAMP = 9;

/** Axis-aligned boxes the camera cannot walk into. Cheap stand-in for real
 *  collision meshes, which is all a room this simple needs. */
const BLOCKERS: { x: number; z: number; hx: number; hz: number }[] = [
  { x: 0, z: DESK_Z, hx: 1.3, hz: DESK_D / 2 }, // desk
  // Reads CHAIR_Z rather than repeating it. The chair moved in against the desk
  // and its box did not follow, which for one build left a chair you walked
  // straight through standing next to empty floor you could not cross.
  { x: 0, z: CHAIR_Z, hx: 0.3, hz: 0.3 }, // chair
  { x: ROOM.w / 2 - 0.42, z: -1.15, hx: 0.36, hz: 0.21 }, // lantern
];

const PLAYER_R = 0.34;

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
