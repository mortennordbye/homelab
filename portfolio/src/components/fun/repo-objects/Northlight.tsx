"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useTick } from "./shared";

/** northlight: the icon's single soft light, as a frosted globe lamp. It
 *  brightens and dims slowly, like daylight from a north window. */
export function Northlight() {
  const glass = useRef<THREE.MeshStandardMaterial>(null);
  useTick((t) => {
    if (glass.current) glass.current.emissiveIntensity = 0.45 + Math.sin(t * 0.6) * 0.12;
  });
  return (
    <group>
      <Plinth color="#16161a" />
      <mesh material={paint("#2a2a31", { metal: 0.5, rough: 0.4 })} position={[0, PLINTH + 0.012, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.024, 32]} />
      </mesh>
      <mesh userData={NO_MERGE} position={[0, PLINTH + 0.024 + 0.055, 0]}>
        <sphereGeometry args={[0.058, 48, 32]} />
        <meshStandardMaterial ref={glass} color="#a6aef0" emissive="#a6aef0" emissiveIntensity={0.45} roughness={0.6} />
      </mesh>
    </group>
  );
}
