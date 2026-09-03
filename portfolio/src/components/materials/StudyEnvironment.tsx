"use client";

import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/**
 * The site's image-based lighting: two dim lightformers and a warm enclosing
 * box, standing in for an interior HDRI at no asset cost.
 *
 * Brass at metalness 1 with nothing to reflect renders as dull brown plastic,
 * which is the only reason this exists. Keep it dim — it is here for the
 * reflection, not to light the scene; turned up it lifts every matte surface
 * at once and the frame goes foggy.
 *
 * Suspends, so it must sit inside the same Suspense boundary as any
 * EffectComposer, or the composer builds against a dead GL context.
 */
export function StudyEnvironment({ scale }: { scale: number }) {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={0.9} color="#ffd9a8" position={[-4, 3, 3]} scale={[8, 8, 1]} />
      <Lightformer intensity={0.22} color="#6f9c72" position={[5, -1, 2]} scale={[6, 6, 1]} />
      <mesh scale={scale}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#1a140d" side={THREE.BackSide} />
      </mesh>
    </Environment>
  );
}
