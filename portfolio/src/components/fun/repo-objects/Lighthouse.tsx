"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, useTick } from "./shared";

const BASE = 0.02;
const TOWER = 0.13;
const LANTERN = BASE + TOWER;

/** northlight: a small lighthouse. The lamp burns steady; a brass shutter turns
 *  round it, so the light shows in flashes. No beam, no light source. */
export function Lighthouse() {
  const shutter = useRef<THREE.Group>(null);

  useTick((t) => {
    if (shutter.current) shutter.current.rotation.y = t * ((Math.PI * 2) / 6);
  });

  return (
    <group>
      <mesh material={M.oak} position={[0, BASE / 2, 0]}>
        <cylinderGeometry args={[0.055, 0.06, BASE, 24]} />
      </mesh>
      {/* tower in paper white with two dark bands */}
      <mesh material={M.paper} position={[0, BASE + TOWER / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.034, TOWER, 20]} />
      </mesh>
      {[0.35, 0.7].map((f) => {
        const r = 0.034 - f * 0.012 + 0.0008;
        return (
          <mesh key={f} material={M.dark} position={[0, BASE + TOWER * f, 0]}>
            <cylinderGeometry args={[r - 0.0008, r + 0.0008, 0.018, 20]} />
          </mesh>
        );
      })}
      {/* gallery, lantern, roof */}
      <mesh material={M.brass} position={[0, LANTERN + 0.002, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.004, 24]} />
      </mesh>
      <mesh material={M.lamp} position={[0, LANTERN + 0.016, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.02, 12]} />
      </mesh>
      <group ref={shutter} userData={NO_MERGE} position={[0, LANTERN + 0.016, 0]}>
        <mesh material={M.brass}>
          <cylinderGeometry args={[0.016, 0.016, 0.026, 20, 1, true, 0, Math.PI * 1.4]} />
        </mesh>
      </group>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          material={M.dark}
          position={[Math.cos((i * Math.PI) / 2) * 0.02, LANTERN + 0.016, Math.sin((i * Math.PI) / 2) * 0.02]}
        >
          <boxGeometry args={[0.002, 0.028, 0.002]} />
        </mesh>
      ))}
      <mesh material={M.dark} position={[0, LANTERN + 0.04, 0]}>
        <coneGeometry args={[0.026, 0.024, 20]} />
      </mesh>
      <mesh material={M.brass} position={[0, LANTERN + 0.056, 0]}>
        <sphereGeometry args={[0.004, 10, 8]} />
      </mesh>
    </group>
  );
}
