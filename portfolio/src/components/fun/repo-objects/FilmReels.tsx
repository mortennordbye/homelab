"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, useTick } from "./shared";

const AXLE = 0.085;

function Reel({ r, at, spin }: { r: number; at: number; spin: React.RefObject<THREE.Group | null> }) {
  return (
    <group position={[at, AXLE, 0.012]}>
      <group ref={spin} userData={NO_MERGE}>
        {/* dark flange with three cut-outs drawn as brass spokes over it */}
        <mesh material={M.dark} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r, r, 0.004, 32]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={M.brass} position={[0, 0, 0.0025]} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <boxGeometry args={[0.004, r * 1.7, 0.001]} />
          </mesh>
        ))}
        <mesh material={M.brass} position={[0, 0, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.004, 16]} />
        </mesh>
      </group>
      {/* post */}
      <mesh material={M.brass} position={[0, -AXLE / 2 + 0.012, -0.008]}>
        <boxGeometry args={[0.006, AXLE - 0.012, 0.006]} />
      </mesh>
    </group>
  );
}

/** reelsmith: two reels on a rewind bench, film running from one to the other
 *  at matched speed. */
export function FilmReels() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const RL = 0.042;
  const RR = 0.034;

  useTick((t) => {
    const v = 1.6;
    if (left.current) left.current.rotation.z = (-t * v) / RL * 0.04;
    if (right.current) right.current.rotation.z = (-t * v) / RR * 0.04;
  });

  return (
    <group position={[0, 0, -0.02]}>
      <mesh material={M.oak} position={[0, 0.01, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.07]} />
      </mesh>
      <Reel r={RL} at={-0.048} spin={left} />
      <Reel r={RR} at={0.052} spin={right} />
      {/* the film between them, along the bottoms of the reels */}
      <mesh material={M.ink} position={[0.002, AXLE - 0.038, 0.012]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.1, 0.0012, 0.016]} />
      </mesh>
    </group>
  );
}
