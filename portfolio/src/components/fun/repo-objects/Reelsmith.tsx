"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useExtrude, useTick, phase } from "./shared";

const SPARKS = 10;
const dummy = new THREE.Object3D();

/** reelsmith: the icon. A red-hot play-button ingot on a steel anvil; sparks
 *  fly off it on every strike. */
export function Reelsmith() {
  const sparks = useRef<THREE.InstancedMesh>(null);
  const ingot = useRef<THREE.MeshStandardMaterial>(null);
  const anvil = useExtrude((s) => {
    s.moveTo(-0.085, 0.072);
    s.quadraticCurveTo(-0.06, 0.064, -0.045, 0.062);
    s.lineTo(0.07, 0.062);
    s.lineTo(0.07, 0.082);
    s.lineTo(-0.05, 0.082);
    s.quadraticCurveTo(-0.07, 0.08, -0.085, 0.072);
  }, 0.04, 0.002);
  const body = useExtrude((s) => {
    s.moveTo(-0.05, 0);
    s.lineTo(0.06, 0);
    s.lineTo(0.05, 0.012);
    s.lineTo(0.025, 0.018);
    s.quadraticCurveTo(0.018, 0.04, 0.035, 0.062);
    s.lineTo(-0.025, 0.062);
    s.quadraticCurveTo(-0.008, 0.04, -0.015, 0.018);
    s.lineTo(-0.04, 0.012);
    s.closePath();
  }, 0.036, 0.002);
  const play = useExtrude((s) => {
    s.moveTo(-0.022, 0);
    s.lineTo(-0.022, 0.05);
    s.lineTo(0.022, 0.025);
    s.closePath();
  }, 0.012, 0.004);

  const place = (t: number) => {
    const m = sparks.current;
    if (!m) return;
    const p = phase(t, 2.2);
    for (let i = 0; i < SPARKS; i++) {
      const a = -0.3 + (i / SPARKS) * 1.6;
      const d = p * (0.05 + (i % 3) * 0.02);
      dummy.position.set(0.02 + Math.cos(a) * d, 0.125 + Math.sin(a) * d - p * p * 0.03, (i % 2) * 0.01);
      dummy.scale.setScalar(p < 0.6 ? 1 : 0.001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => place(0.5));
  useTick((t) => {
    place(t);
    if (ingot.current) ingot.current.emissiveIntensity = 1.1 + Math.max(0, 1 - phase(t, 2.2) * 3) * 0.8;
  });
  const steel = paint("#8b949e", { metal: 0.85, rough: 0.3 });
  return (
    <group>
      <Plinth color="#0d1117" />
      <group position={[0, PLINTH, 0]}>
        <mesh geometry={body} material={steel} />
        <mesh geometry={anvil} material={steel} />
        <mesh geometry={play} position={[0.005, 0.084, 0]}>
          <meshStandardMaterial ref={ingot} color="#ff8a1f" emissive="#ff6a0a" emissiveIntensity={1.1} roughness={0.4} />
        </mesh>
        <instancedMesh ref={sparks} args={[undefined, undefined, SPARKS]} userData={NO_MERGE} frustumCulled={false}>
          <sphereGeometry args={[0.0025, 6, 4]} />
          <meshBasicMaterial color="#ffd166" toneMapped={false} />
        </instancedMesh>
      </group>
    </group>
  );
}
