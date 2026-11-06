"use client";

import { Led } from "../Leds";
import { M } from "./shared";

/** homelab: three nodes in a brass frame. The LEDs blink through `LedField`,
 *  so nothing here may move. Amber and paper only: the desk already holds the
 *  one green point on this wall. */
export function HomelabRack() {
  const W = 0.15;
  const D = 0.12;
  const U = 0.036;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.brass} position={[(s * (W + 0.01)) / 2, 0.065, 0]}>
          <boxGeometry args={[0.008, 0.13, D]} />
        </mesh>
      ))}
      <mesh material={M.brass} position={[0, 0.132, 0]}>
        <boxGeometry args={[W + 0.018, 0.006, D]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const y = 0.022 + i * (U + 0.006);
        return (
          <group key={i} position={[0, y, 0]}>
            <mesh material={M.dark}>
              <boxGeometry args={[W, U, D]} />
            </mesh>
            {/* vent slots on the face */}
            {[-0.035, -0.02, -0.005].map((x) => (
              <mesh key={x} material={M.ink} position={[x, 0, D / 2 + 0.0005]}>
                <planeGeometry args={[0.008, U * 0.55]} />
              </mesh>
            ))}
            <Led position={[0.045, 0.006, D / 2 + 0.001]} color="#e0a040" seed={2.3 + i * 1.7} size={0.0035} />
            <Led position={[0.06, 0.006, D / 2 + 0.001]} color="#e8e3d6" seed={4.1 + i * 0.9} size={0.0035} />
            <Led position={[0.06, -0.008, D / 2 + 0.001]} color="#e0a040" steady size={0.003} />
          </group>
        );
      })}
    </group>
  );
}
