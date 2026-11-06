"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useTick, phase } from "./shared";

/** One limb: a capsule hung from its top, so rotating it swings it. */
function Limb({ at, len, limb }: { at: [number, number, number]; len: number; limb: (g: THREE.Group | null) => void }) {
  return (
    <group ref={limb} position={at}>
      <mesh material={paint("#fff7ed", { rough: 0.5 })} position={[0, -len / 2, 0]}>
        <capsuleGeometry args={[0.0055, len - 0.011, 4, 8]} />
      </mesh>
    </group>
  );
}

/** ruter-cli: the icon. A commuter sprints after the tram that is pulling
 *  away, its rear display showing the prompt. Legs and arms swing; the tram
 *  creeps off and comes round again. */
export function RuterCli() {
  const tram = useRef<THREE.Group>(null);
  const runner = useRef<THREE.Group>(null);
  const limbs = useRef<(THREE.Group | null)[]>([]);
  useTick((t) => {
    const s = Math.sin(t * 9);
    const [la, ra, ll, rl] = limbs.current;
    if (la) la.rotation.z = s * 0.9;
    if (ra) ra.rotation.z = -s * 0.9;
    if (ll) ll.rotation.z = -s * 0.8;
    if (rl) rl.rotation.z = s * 0.8;
    if (runner.current) runner.current.position.y = PLINTH + 0.004 + Math.abs(Math.cos(t * 9)) * 0.004;
    if (tram.current) tram.current.position.x = 0.04 + phase(t, 5) * 0.015;
  });
  const cream = paint("#fff7ed", { rough: 0.5 });
  return (
    <group>
      <Plinth color="#c3121a" />
      {/* the double rule the tram runs on */}
      {[0.004, 0.011].map((y) => (
        <mesh key={y} material={cream} position={[0, PLINTH + y, 0.03]}>
          <boxGeometry args={[0.16, 0.003, 0.004]} />
        </mesh>
      ))}
      <group ref={tram} userData={NO_MERGE} position={[0.04, PLINTH + 0.016, 0]}>
        <RoundedBox args={[0.085, 0.07, 0.045]} radius={0.01} smoothness={3} position={[0.02, 0.035, 0]} material={paint("#1c1d21", { rough: 0.5 })} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={paint("#ffcf7a", { glow: 0.7 })} position={[0.005 + i * 0.02, 0.045, 0.0228]}>
            <planeGeometry args={[0.014, 0.018]} />
          </mesh>
        ))}
        {/* rear display: the prompt */}
        <mesh material={paint("#4ade80", { glow: 1 })} position={[-0.0225, 0.055, 0.005]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.02, 0.008]} />
        </mesh>
      </group>
      <group ref={runner} userData={NO_MERGE} position={[-0.045, PLINTH + 0.004, 0.01]} rotation={[0, 0, -0.25]}>
        <mesh material={cream} position={[0, 0.072, 0]}>
          <capsuleGeometry args={[0.008, 0.03, 4, 8]} />
        </mesh>
        <mesh material={cream} position={[0.012, 0.106, 0]}>
          <sphereGeometry args={[0.011, 16, 12]} />
        </mesh>
        <Limb at={[0, 0.085, 0.006]} len={0.034} limb={(g) => {
            limbs.current[0] = g;
          }} />
        <Limb at={[0, 0.085, -0.006]} len={0.034} limb={(g) => {
            limbs.current[1] = g;
          }} />
        <Limb at={[0, 0.055, 0.006]} len={0.05} limb={(g) => {
            limbs.current[2] = g;
          }} />
        <Limb at={[0, 0.055, -0.006]} len={0.05} limb={(g) => {
            limbs.current[3] = g;
          }} />
      </group>
      {/* speed lines behind the runner */}
      {[0.06, 0.08, 0.1].map((y, i) => (
        <mesh key={y} material={cream} position={[-0.085 + i * 0.004, PLINTH + y, 0.01]}>
          <boxGeometry args={[0.018 - i * 0.004, 0.003, 0.002]} />
        </mesh>
      ))}
    </group>
  );
}
