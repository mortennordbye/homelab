"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useTick, ease, phase } from "./shared";

const TIERS = ["#51a45e", "#6bb679", "#8ec798"];

/** agentic-dr: the icon. Production is one solid block; the arc fails over one
 *  way; the DR tiers build up again in apply order, then the loop starts over. */
export function AgenticDr() {
  const tiers = useRef<(THREE.Group | null)[]>([]);
  useTick((t) => {
    const p = phase(t, 6);
    tiers.current.forEach((g, i) => {
      if (!g) return;
      const s = Math.max(0.001, ease(p, 0.15 + i * 0.15, 0.27 + i * 0.15) - ease(p, 0.9, 0.98));
      g.scale.set(1, s, 1);
    });
  });
  const arc = paint("#51a45e", { rough: 0.45 });
  return (
    <group>
      <Plinth color="#18241b" />
      <group position={[0, PLINTH, 0]}>
        <RoundedBox args={[0.06, 0.058, 0.05]} radius={0.01} smoothness={3} position={[-0.045, 0.029, 0]} material={paint("#378144", { rough: 0.45 })} />
        {TIERS.map((c, i) => (
          <group
            key={c}
            ref={(g) => {
              tiers.current[i] = g;
            }}
            userData={NO_MERGE}
            position={[0.045, i * 0.02, 0]}
          >
            <RoundedBox args={[0.06, 0.015, 0.05]} radius={0.005} smoothness={3} position={[0, 0.0075, 0]} material={paint(c, { rough: 0.45 })} />
          </group>
        ))}
        {/* the failover arc and its head, pointing down onto the tiers */}
        <mesh material={arc} position={[0, 0.07, 0]}>
          <torusGeometry args={[0.045, 0.008, 12, 40, Math.PI]} />
        </mesh>
        <mesh material={arc} position={[0.045, 0.066, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.016, 0.026, 3]} />
        </mesh>
      </group>
    </group>
  );
}
