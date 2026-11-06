"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { MONO, PLINTH, Plinth, paint, useCanvas, useTick, ease, phase } from "./shared";

const PW = 0.14;
const PH = 0.072;

const LIFT = 0.05;

function Tray({ side, tray }: { side: 1 | -1; tray: React.RefObject<THREE.Group | null> }) {
  const steel = paint("#c9d1d9", { metal: 0.8, rough: 0.3 });
  const green = paint("#51a45e", { rough: 0.45 });
  return (
    // rises straight up out of the phone; its arms stretch with it
    <group ref={tray} userData={NO_MERGE} position={[side * 0.034, PH, 0]}>
      {[-1, 1].map((a) => (
        <mesh key={a} material={steel} position={[a * 0.022, -0.002, 0]} scale={[1, 0.004, 1]}>
          <boxGeometry args={[0.004, 1, 0.004]} />
        </mesh>
      ))}
      <group position={[0, 0.007, 0]}>
        <RoundedBox args={[0.062, 0.014, 0.04]} radius={0.003} smoothness={2} material={paint("#5b625d", { metal: 0.5, rough: 0.35 })} />
        {side < 0 ? (
          <>
            <mesh material={green} position={[-0.008, 0.011, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0055, 0.0055, 0.03, 10]} />
            </mesh>
            <mesh material={paint("#61b86f", { glow: 0.9 })} position={[0.018, 0.011, 0]}>
              <boxGeometry args={[0.01, 0.008, 0.006]} />
            </mesh>
          </>
        ) : (
          <mesh material={steel} position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.007, 0.04, 0.005]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** verksted: the icon's pocket workshop. A phone with a tmux screen whose tool
 *  trays fold up out of it on their arms, and back. */
export function Verksted() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const screen = useCanvas(320, 160, (c, w, h) => {
    c.fillStyle = "#0b100c";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#1e5428";
    c.fillRect(w * 0.55, 10, 2, h - 20);
    c.font = `700 52px ${MONO}`;
    c.fillStyle = "#61b86f";
    c.fillText(">_", 24, 100);
    c.fillStyle = "#3d954c";
    for (let i = 0; i < 5; i++) c.fillRect(w * 0.6, 28 + i * 24, 60 + ((i * 37) % 50), 7);
  });
  useTick((t) => {
    const p = phase(t, 6);
    for (const [g, lag] of [[left.current, 0], [right.current, 0.06]] as const) {
      if (!g) continue;
      const up = Math.max(0, ease(p, 0.1 + lag, 0.35 + lag) - ease(p, 0.7, 0.92));
      const h = 0.004 + up * LIFT;
      g.position.y = PH + h;
      // the arms reach from the tray back down to the phone's top edge
      g.children.slice(0, 2).forEach((arm) => {
        arm.scale.y = h;
        arm.position.y = -h / 2;
      });
    }
  });
  return (
    <group>
      <Plinth color="#141a14" />
      <group position={[0, PLINTH, 0.01]} rotation={[-0.12, 0, 0]}>
        <RoundedBox args={[PW, PH, 0.008]} radius={0.004} smoothness={3} position={[0, PH / 2, 0]} material={paint("#2a2e2b", { metal: 0.3, rough: 0.5 })} />
        <mesh position={[0, PH / 2, 0.0042]}>
          <planeGeometry args={[PW - 0.008, PH - 0.008]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <Tray side={-1} tray={left} />
        <Tray side={1} tray={right} />
      </group>
    </group>
  );
}
