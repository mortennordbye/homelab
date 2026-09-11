"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

/** Brass, the room's marker colour. The emissive is what lets it read against
 *  lamplit wood; drop it and the pin sinks into the warm background. */
const BRASS = "#b98f4e";
const GLOW = "#a8742e";

/**
 * A small brass pin, tip down, floating over a spot with real portfolio content.
 * Flavour objects (taps, drawers, lamps) must not get one, or it stops meaning
 * anything. Not wrapped in an Interactive: the item under it is the target.
 */
export function Marker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || reduced) return;
    g.position.y =
      position[1] + Math.sin(clock.elapsedTime * 2 + position[0] * 3) * 0.012;
  });

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.02, 20, 14]} />
        <meshStandardMaterial color={BRASS} emissive={GLOW} emissiveIntensity={1.6} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.014, 0.05, 20]} />
        <meshStandardMaterial color={BRASS} emissive={GLOW} emissiveIntensity={1.6} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
