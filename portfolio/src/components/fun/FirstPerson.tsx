"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOM } from "./Room";

export const EYE = 1.66;
const WALK = 1.9;
const RUN = 3.2;
const ACCEL = 11;
const DAMP = 9;

/** Axis-aligned boxes the camera cannot walk into. Cheap stand-in for real
 *  collision meshes, which is all a room this simple needs. */
const BLOCKERS: { x: number; z: number; hx: number; hz: number }[] = [
  { x: 0, z: -ROOM.d / 2 + 0.38, hx: 1.3, hz: 0.36 }, // desk
  { x: 0, z: -0.72, hx: 0.3, hz: 0.3 }, // chair
  { x: ROOM.w / 2 - 0.42, z: -1.15, hx: 0.36, hz: 0.21 }, // shelf
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

export function FirstPerson({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vel = useRef(new THREE.Vector3());
  const bob = useRef(0);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
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
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const speed = k.ShiftLeft || k.ShiftRight ? RUN : WALK;

    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();

    want.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(speed);

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
