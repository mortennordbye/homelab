"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useExtrude, useTick, ease, phase } from "./shared";

const BAR_Y = 0.2;

/** headroom: the icon's arrow rising to the ceiling line. It pushes up to the
 *  bar, stops just short of it, and settles back. */
export function Headroom() {
  const arrow = useRef<THREE.Group>(null);
  const shape = useExtrude((s) => {
    s.moveTo(0, 0.1);
    s.lineTo(0.042, 0.054);
    s.lineTo(0.014, 0.054);
    s.lineTo(0.014, 0);
    s.lineTo(-0.014, 0);
    s.lineTo(-0.014, 0.054);
    s.lineTo(-0.042, 0.054);
    s.closePath();
  }, 0.022, 0.003);
  useTick((t) => {
    const p = phase(t, 4.5);
    const up = ease(p, 0.1, 0.45) - ease(p, 0.65, 0.95);
    if (arrow.current) arrow.current.position.y = PLINTH + 0.03 + up * 0.055;
  });
  const gold = paint("#c9a24a", { metal: 0.75, rough: 0.28 });
  return (
    <group>
      <Plinth color="#0e100d" />
      <RoundedBox args={[0.13, 0.016, 0.024]} radius={0.007} smoothness={3} position={[0, BAR_Y, 0]} material={gold} />
      {[-1, 1].map((s) => (
        <mesh key={s} material={paint("#2b2a24", { metal: 0.5, rough: 0.4 })} position={[s * 0.07, (BAR_Y + PLINTH) / 2, -0.02]}>
          <cylinderGeometry args={[0.0025, 0.0025, BAR_Y - PLINTH, 8]} />
        </mesh>
      ))}
      <group ref={arrow} userData={NO_MERGE} position={[0, PLINTH + 0.03, 0]}>
        <mesh geometry={shape} material={gold} />
      </group>
    </group>
  );
}
