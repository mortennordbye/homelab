"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, PLINTH, Plinth, paint, useTick } from "./shared";

/** homelab: the repo logo, one ripe apple hanging from its branch. It sways. */
export function Homelab() {
  const apple = useRef<THREE.Group>(null);
  useTick((t) => {
    if (apple.current) apple.current.rotation.z = Math.sin(t * 1.3) * 0.09;
  });
  const leaf = paint("#4f8a2c", { rough: 0.6 });
  return (
    <group>
      <Plinth color="#24331f" />
      {/* the branch, from the back of the compartment */}
      <mesh material={M.oak} position={[-0.02, 0.2, -0.02]} rotation={[0.5, 0, Math.PI / 2 - 0.15]}>
        <cylinderGeometry args={[0.006, 0.009, 0.15, 10]} />
      </mesh>
      {[
        [-0.06, 0.205, 0.0, 0.6],
        [0.035, 0.195, 0.01, -0.5],
      ].map(([x, y, z, r]) => (
        <mesh key={x} material={leaf} position={[x, y, z]} rotation={[0.3, 0, r]} scale={[1, 0.45, 0.12]}>
          <sphereGeometry args={[0.03, 16, 10]} />
        </mesh>
      ))}
      {/* pivot at the stem, so it swings like fruit, not like a pendulum on a pin */}
      <group ref={apple} userData={NO_MERGE} position={[0, 0.2, 0]}>
        <mesh material={M.oak} position={[0, -0.012, 0]}>
          <cylinderGeometry args={[0.0025, 0.003, 0.026, 6]} />
        </mesh>
        <mesh material={paint("#c0141c", { rough: 0.32 })} position={[0, -0.072, 0]} scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.05, 32, 24]} />
        </mesh>
        <mesh material={paint("#e8434a", { rough: 0.25 })} position={[-0.02, -0.06, 0.03]} scale={[0.5, 0.6, 0.3]}>
          <sphereGeometry args={[0.03, 12, 10]} />
        </mesh>
      </group>
      <mesh material={leaf} position={[0, PLINTH + 0.003, 0.03]} rotation={[-Math.PI / 2, 0, 0.6]} scale={[1, 0.4, 1]}>
        <circleGeometry args={[0.018, 12]} />
      </mesh>
    </group>
  );
}
