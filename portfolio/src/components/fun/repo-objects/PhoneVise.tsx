"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { M, MONO, useCanvas, useTick } from "./shared";

const PW = 0.064;
const PH = 0.124;
const LINES = ["$ verksted attach", "session 3 · claude", "> tests pass", "> pushed fix/ci", "$"];

/** verksted: a phone held in a bench vise, an agent session on its screen and
 *  the cursor blinking. A screen may light itself; it stays under the bloom. */
export function PhoneVise() {
  const cursor = useRef<THREE.Mesh>(null);
  const screen = useCanvas(256, 496, (c, w, h) => {
    c.fillStyle = "#14110d";
    c.fillRect(0, 0, w, h);
    c.font = `500 19px ${MONO}`;
    c.fillStyle = "#e8e3d6";
    LINES.forEach((l, i) => c.fillText(l, 16, 300 + i * 34));
  });

  useTick((t) => {
    if (cursor.current) cursor.current.visible = t % 1 < 0.55;
  });

  return (
    <group>
      {/* bench block and vise */}
      <mesh material={M.oak} position={[0, 0.012, 0]}>
        <boxGeometry args={[0.15, 0.024, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.brass} position={[0, 0.042, s * 0.014]}>
          <boxGeometry args={[0.09, 0.036, 0.012]} />
        </mesh>
      ))}
      <mesh material={M.brass} position={[0.06, 0.042, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.06, 8]} />
      </mesh>
      <mesh material={M.brass} position={[0.06, 0.042, 0.072]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.05, 8]} />
      </mesh>
      {/* the phone, upright in the jaws */}
      <group position={[0, 0.03 + PH / 2, 0]}>
        <RoundedBox args={[PW, PH, 0.008]} radius={0.004} smoothness={3} material={M.dark} />
        <mesh position={[0, 0, 0.0041]}>
          <planeGeometry args={[PW - 0.006, PH - 0.008]} />
          <meshBasicMaterial map={screen} color="#9a948a" toneMapped={false} />
        </mesh>
        <mesh ref={cursor} userData={NO_MERGE} position={[-0.019, -0.0426, 0.0043]}>
          <planeGeometry args={[0.0045, 0.0062]} />
          <meshBasicMaterial color="#9a948a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
