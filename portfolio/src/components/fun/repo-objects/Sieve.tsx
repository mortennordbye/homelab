"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, phase, useTick } from "./shared";

const GRAINS = 18;
const R = 0.055;
const TOP = 0.13;
const BOWL = 0.03;
const dummy = new THREE.Object3D();

/** lawless-waf: a brass sieve that shakes; grains fall through to the bowl,
 *  and two stay caught on the mesh. */
export function Sieve() {
  const sieve = useRef<THREE.Group>(null);
  const grains = useRef<THREE.InstancedMesh>(null);

  const place = (t: number) => {
    const g = grains.current;
    if (!g) return;
    for (let i = 0; i < GRAINS; i++) {
      const p = phase(t + i * 0.37, 2.4);
      const a = i * 2.39996;
      const r = R * 0.7 * Math.sqrt((i + 0.5) / GRAINS);
      dummy.position.set(Math.cos(a) * r, TOP - 0.01 - p * p * (TOP - BOWL - 0.02), Math.sin(a) * r);
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
    }
    g.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => place(0.9));

  useTick((t) => {
    if (sieve.current) sieve.current.rotation.z = Math.sin(t * 9) * 0.03 * (0.5 + 0.5 * Math.sin(t * 0.8));
    place(t);
  });

  return (
    <group>
      {/* the bowl that catches what passes */}
      <mesh material={M.oak} position={[0, BOWL / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.045, BOWL, 24, 1]} />
      </mesh>
      {/* oak stand */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.oak} position={[s * 0.075, TOP / 2, 0]}>
          <boxGeometry args={[0.01, TOP, 0.012]} />
        </mesh>
      ))}
      <group ref={sieve} userData={NO_MERGE} position={[0, TOP, 0]}>
        <mesh material={M.brass} position={[0, 0.012, 0]}>
          <cylinderGeometry args={[R, R, 0.024, 28, 1, true]} />
        </mesh>
        <mesh material={M.dark} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[R, 28]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={M.brass} position={[s * 0.066, 0.012, 0]}>
            <boxGeometry args={[0.012, 0.004, 0.01]} />
          </mesh>
        ))}
        {/* caught */}
        {[
          [0.02, 0.01],
          [-0.025, -0.015],
        ].map(([x, z]) => (
          <mesh key={x} material={M.paper} position={[x, 0.004, z]}>
            <sphereGeometry args={[0.0045, 8, 6]} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={grains} args={[undefined, undefined, GRAINS]} material={M.paper} frustumCulled={false}>
        <sphereGeometry args={[0.0025, 6, 4]} />
      </instancedMesh>
    </group>
  );
}
