"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { Print, usePrintMats } from "./OpenSelf";
import { PLINTH, Plinth, paint, useTick, phase } from "./shared";

const LINES = [0.07, 0.054, 0.04, 0.028, 0.016];

/** openvita: the icon's CV sheet, its portrait the OpenSelf fingerprint. The
 *  lines fill in one by one as the CV is written, then it starts again. */
export function OpenVita() {
  const lines = useRef<(THREE.Mesh | null)[]>([]);
  const print = usePrintMats();
  useTick((t) => {
    const n = Math.floor(phase(t, 5) * (LINES.length + 2));
    lines.current.forEach((m, i) => {
      if (m) m.visible = i < n;
    });
  });
  return (
    <group>
      <Plinth color="#17171a" />
      <group position={[0, PLINTH, -0.01]} rotation={[-0.15, 0, 0.05]}>
        <mesh material={paint("#fbf8f2", { rough: 0.85 })} position={[0, 0.07, 0]}>
          <boxGeometry args={[0.1, 0.13, 0.003]} />
        </mesh>
        <group position={[-0.026, 0.11, 0.003]}>
          <Print mats={print} scale={0.36} />
        </group>
        <mesh material={paint("#3a3a42")} position={[0.018, 0.115, 0.0018]}>
          <planeGeometry args={[0.04, 0.007]} />
        </mesh>
        {LINES.map((y, i) => (
          <mesh
            key={y}
            ref={(m) => {
              lines.current[i] = m;
            }}
            userData={NO_MERGE}
            material={paint(i === 0 ? "#3a3a42" : "#8e8578")}
            position={[-0.006 + (i % 2) * 0.004, y, 0.0018]}
          >
            <planeGeometry args={[0.07 - (i % 3) * 0.012, 0.007]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
