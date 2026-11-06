"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useExtrude, useTick, phase } from "./shared";

const BARS = 5;

/** innestemme: the icon's house holding a glowing voice orb. The waveform in
 *  front of the orb speaks in short bursts, then rests: an indoor voice. */
export function Innestemme() {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const house = useExtrude((s) => {
    const o = (w: number, h: number, roof: number) => {
      const p = [
        [-w, 0],
        [w, 0],
        [w, h],
        [0, h + roof],
        [-w, h],
      ];
      return p;
    };
    const outer = o(0.058, 0.07, 0.05);
    s.moveTo(outer[0][0], outer[0][1]);
    outer.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
    const inner = o(0.044, 0.064, 0.036).map(([x, y]) => [x, y + 0.012]);
    const hole = new THREE.Path();
    hole.moveTo(inner[0][0], inner[0][1]);
    inner.slice(1).forEach(([x, y]) => hole.lineTo(x, y));
    hole.closePath();
    s.holes.push(hole);
  }, 0.02, 0.003);
  useTick((t) => {
    const speaking = phase(t, 4) < 0.55;
    bars.current.forEach((b, i) => {
      if (!b) return;
      const v = speaking ? 0.45 + 0.55 * Math.abs(Math.sin(t * 7 + i * 1.3) * Math.sin(t * 3.1 + i)) : 0.2;
      b.scale.y = v;
    });
  });
  return (
    <group>
      <Plinth color="#0b1220" />
      <group position={[0, PLINTH + 0.004, 0]}>
        <mesh geometry={house} material={paint("#e6edf3", { rough: 0.35 })} />
        <mesh material={paint("#18bcf2", { glow: 1.1, rough: 0.2 })} position={[0, 0.058, 0]}>
          <sphereGeometry args={[0.03, 32, 24]} />
        </mesh>
        {Array.from({ length: BARS }, (_, i) => (
          <mesh
            key={i}
            ref={(m) => {
              bars.current[i] = m;
            }}
            userData={NO_MERGE}
            material={paint("#ffffff", { glow: 0.6 })}
            position={[-0.016 + i * 0.008, 0.058, 0.031]}
          >
            <boxGeometry args={[0.004, 0.026, 0.002]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
