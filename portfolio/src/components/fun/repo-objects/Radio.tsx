"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { M, MONO, phase, useCanvas, useTick } from "./shared";

const W = 0.17;
const H = 0.115;
const D = 0.08;

/** innestemme: an oak radio. The needle on the dial moves while it speaks and
 *  rests while it listens. The grille does not light. */
export function Radio() {
  const needle = useRef<THREE.Mesh>(null);
  const dial = useCanvas(160, 96, (c, w, h) => {
    c.fillStyle = "#e8e3d6";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#26313d";
    c.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const x = 14 + (i * (w - 28)) / 10;
      c.beginPath();
      c.moveTo(x, h - 18);
      c.lineTo(x, h - (i % 5 ? 28 : 36));
      c.stroke();
    }
    c.font = `600 15px ${MONO}`;
    c.fillStyle = "#26313d";
    c.fillText("listen", 14, 24);
  });

  useTick((t) => {
    const p = phase(t, 5);
    const speaking = p < 0.4;
    const v = speaking
      ? 0.55 + 0.3 * Math.sin(t * 13) * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 29)
      : 0.08;
    if (needle.current) {
      const target = 0.019 + v * 0.052;
      needle.current.position.x += (target - needle.current.position.x) * 0.25;
    }
  });

  return (
    <group position={[0, H / 2, -0.02]}>
      <RoundedBox args={[W, H, D]} radius={0.01} smoothness={3} material={M.oak} />
      {/* grille, left of the dial */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} material={M.brass} position={[-0.075 + i * 0.012, 0, D / 2 + 0.001]}>
          <boxGeometry args={[0.004, 0.075, 0.002]} />
        </mesh>
      ))}
      <mesh position={[0.045, 0.012, D / 2 + 0.0008]}>
        <planeGeometry args={[0.064, 0.038]} />
        <meshStandardMaterial map={dial} roughness={0.9} />
      </mesh>
      <mesh ref={needle} userData={NO_MERGE} material={M.brass} position={[0.045 - 0.022, 0.012, D / 2 + 0.002]}>
        <boxGeometry args={[0.0015, 0.034, 0.001]} />
      </mesh>
      {[0.03, 0.06].map((x) => (
        <mesh key={x} material={M.brass} position={[x, -0.032, D / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.008, 16]} />
        </mesh>
      ))}
    </group>
  );
}
