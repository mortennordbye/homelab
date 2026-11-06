"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, ease, phase, useTick } from "./shared";

const BED = 0.03;
const SHEET = 0.0012;

/** agentic-dr: a letter-copying press. The wheel turns, the platen comes down,
 *  and the copy slides off onto the stack beside it. */
export function CopyingPress() {
  const wheel = useRef<THREE.Group>(null);
  const platen = useRef<THREE.Group>(null);
  const copy = useRef<THREE.Mesh>(null);

  useTick((t) => {
    const p = phase(t, 6);
    const down = ease(p, 0, 0.25) - ease(p, 0.3, 0.45);
    if (platen.current) platen.current.position.y = BED + 0.045 - down * 0.038;
    if (wheel.current) wheel.current.rotation.y = down * Math.PI * 3;
    const slide = ease(p, 0.5, 0.75);
    if (copy.current) {
      copy.current.position.x = -0.035 + slide * 0.105;
      copy.current.position.y = BED + SHEET / 2 - SHEET + slide * (0.012 - BED + SHEET * 6);
    }
  });

  return (
    <group>
      {/* the bed and the frame */}
      <mesh material={M.dark} position={[-0.035, BED / 2, 0]}>
        <boxGeometry args={[0.11, BED, 0.11]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.brass} position={[-0.035 + s * 0.048, BED + 0.06, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 10]} />
        </mesh>
      ))}
      <mesh material={M.brass} position={[-0.035, BED + 0.122, 0]}>
        <boxGeometry args={[0.112, 0.012, 0.022]} />
      </mesh>
      {/* the original, on the bed */}
      <mesh material={M.paper} position={[-0.035, BED + SHEET / 2, 0]}>
        <boxGeometry args={[0.07, SHEET, 0.09]} />
      </mesh>
      {/* the copy: hidden under the original until it slides out */}
      <mesh ref={copy} userData={NO_MERGE} material={M.paper} position={[-0.035, BED - SHEET / 2, 0]}>
        <boxGeometry args={[0.07, SHEET, 0.09]} />
      </mesh>
      {/* platen, screw and wheel move as one, the screw through the top bar */}
      <group ref={platen} userData={NO_MERGE} position={[-0.035, BED + 0.045, 0]}>
        <mesh material={M.brass}>
          <boxGeometry args={[0.082, 0.012, 0.1]} />
        </mesh>
        <mesh material={M.brass} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.12, 10]} />
        </mesh>
        <group ref={wheel} userData={NO_MERGE} position={[0, 0.12, 0]}>
          <mesh material={M.brass} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.003, 8, 28]} />
          </mesh>
          {[0, Math.PI / 2].map((a) => (
            <mesh key={a} material={M.brass} rotation={[0, a, 0]}>
              <boxGeometry args={[0.06, 0.003, 0.003]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* the stack of copies already made */}
      <mesh material={M.paper} position={[0.07, 0.006, 0]}>
        <boxGeometry args={[0.07, 0.012, 0.09]} />
      </mesh>
    </group>
  );
}
