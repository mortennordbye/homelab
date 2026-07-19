"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EYE } from "./FirstPerson";
import { ROOM } from "./Room";

// Camera flies from the doorway at the back of the room to the operator
// position, easing out. Screens power on staggered while it moves — the
// power-on is driven from FunRoom by elapsed time, not from here, so a
// skipped entry still ends with everything lit.
const START = new THREE.Vector3(1.45, 1.6, ROOM.d / 2 - 0.45);
// Stops just behind the desk's front edge (desk spans z -2.85..-0.95), close
// enough that the wall panels are readable without walking.
const END = new THREE.Vector3(0, EYE, 1.0);
const DURATION = 3.4;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function EntrySequence({
  active,
  onDone,
}: {
  active: boolean;
  onDone: () => void;
}) {
  const { camera } = useThree();
  const t = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    if (!active) return;
    t.current = 0;
    done.current = false;
    camera.position.copy(START);
    camera.lookAt(0, 1.42, -ROOM.d / 2);
  }, [active, camera]);

  useFrame((_, delta) => {
    if (!active || done.current) return;
    t.current = Math.min(DURATION, t.current + delta);
    const p = easeOutCubic(t.current / DURATION);

    camera.position.lerpVectors(START, END, p);
    // drift the look target down and forward so the room "settles" into place
    const ty = THREE.MathUtils.lerp(1.8, 1.42, p);
    camera.lookAt(0, ty, -ROOM.d / 2);

    if (t.current >= DURATION) {
      done.current = true;
      onDone();
    }
  });

  return null;
}

/** Places the camera at the operator position without any animation. Used for
 *  reduced-motion and for skipping the entry. */
export function useSnapToOperator() {
  const { camera } = useThree();
  return () => {
    camera.position.copy(END);
    camera.lookAt(0, 1.42, -ROOM.d / 2);
  };
}
