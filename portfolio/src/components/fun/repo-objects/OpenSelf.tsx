"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, useTick, phase } from "./shared";

/** Arcs of the icon's fingerprint, inner to outer: radius, colour. */
export const PRINT: [number, string][] = [
  [0.022, "#8ab8ff"],
  [0.042, "#6aa4f8"],
  [0.062, "#3fc1a5"],
];

/** One material per arc, so the arcs can be lit one by one. */
export function usePrintMats() {
  const mats = useMemo(
    () => PRINT.map(([, c]) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.15 })),
    [],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** The fingerprint as open arcs, standing upright. */
export function Print({ mats, scale = 1 }: { mats: THREE.MeshStandardMaterial[]; scale?: number }) {
  return (
    <group scale={scale}>
      {PRINT.map(([r], i) => (
        <mesh key={r} material={mats[i]} rotation={[0, 0, -0.15]}>
          <torusGeometry args={[r, 0.0075, 12, 48, Math.PI * 1.15]} />
        </mesh>
      ))}
    </group>
  );
}

/** openself: the icon's fingerprint of open arcs. A light runs outwards through
 *  the arcs, one ring at a time. */
export function OpenSelf() {
  const mats = usePrintMats();
  useTick((t) => {
    const p = phase(t, 4);
    mats.forEach((m, i) => {
      const d = Math.abs(p * 1.6 - i * 0.35);
      m.emissiveIntensity = 0.15 + Math.max(0, 1 - d * 4) * 0.9;
    });
  });
  return (
    <group>
      <Plinth color="#17171a" />
      <group userData={NO_MERGE} position={[0, PLINTH + 0.03, 0]}>
        <Print mats={mats} />
      </group>
    </group>
  );
}
