"use client";

import { useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { NO_MERGE } from "../StaticMerge";
import { M, MONO, ease, phase, useCanvas, useTick } from "./shared";

const H = 0.09;
const DROP = 0.24;

/** headroom: a brass-bound strongbox. A coin falls in through the slot and the
 *  dial moves on a notch; a ledger card leans beside it. No figures move. */
export function Strongbox() {
  const coin = useRef<THREE.Group>(null);
  const dial = useRef<THREE.Group>(null);
  const ledger = useCanvas(128, 160, (c, w, h) => {
    c.fillStyle = "#e8e3d6";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#8b8271";
    c.lineWidth = 1;
    for (let y = 30; y < h; y += 18) {
      c.beginPath();
      c.moveTo(8, y);
      c.lineTo(w - 8, y);
      c.stroke();
    }
    c.font = `600 13px ${MONO}`;
    c.fillStyle = "#26313d";
    c.fillText("budget", 10, 22);
  });

  useTick((t) => {
    const p = phase(t, 5);
    const fall = ease(p, 0.1, 0.45);
    if (coin.current) {
      coin.current.position.y = DROP - fall * (DROP - H + 0.012);
      coin.current.rotation.y = fall * Math.PI * 2;
    }
    if (dial.current) dial.current.rotation.z = -(Math.floor(t / 5) + ease(p, 0.5, 0.6)) * 0.6;
  });

  return (
    <group>
      <group position={[-0.02, H / 2, 0]}>
        <RoundedBox args={[0.12, H, 0.1]} radius={0.006} smoothness={3} material={M.dark} />
        {/* brass corner straps */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={M.brass} position={[s * 0.052, 0, 0]}>
            <boxGeometry args={[0.008, H + 0.002, 0.102]} />
          </mesh>
        ))}
        <mesh material={M.ink} position={[0, H / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, 0.005]} />
        </mesh>
        <group ref={dial} userData={NO_MERGE} position={[0, 0, 0.051]}>
          <mesh material={M.brass} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.006, 24]} />
          </mesh>
          <mesh material={M.dark} position={[0, 0.011, 0.0035]}>
            <boxGeometry args={[0.002, 0.008, 0.001]} />
          </mesh>
        </group>
      </group>
      {/* the coin starts behind the board above, so it arrives rather than appears */}
      <group ref={coin} userData={NO_MERGE} position={[-0.02, DROP, 0]}>
        <mesh material={M.brass} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.002, 20]} />
        </mesh>
      </group>
      <mesh position={[0.07, 0.045, -0.02]} rotation={[-0.25, -0.2, 0]}>
        <planeGeometry args={[0.064, 0.08]} />
        <meshStandardMaterial map={ledger} roughness={0.9} />
      </mesh>
    </group>
  );
}
