"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { M, MONO, ease, phase, useCanvas, useTick } from "./shared";

const STOPS = ["11  Kjelsås", "12  Majorstuen", "13  Bekkestua", "17  Rikshospitalet", "19  Ljabru"];
const W = 0.17;
const H = 0.04;
const LINE_PX = 64;
const HOLD = 5;

/** ruter-cli: a tram destination roll blind. The roll turns a whole line at a
 *  time; nothing scrambles and nothing counts down. Lit by the room, not from
 *  behind. */
export function RouteBlind() {
  const roll = useCanvas(512, LINE_PX * STOPS.length, (c, w) => {
    c.fillStyle = "#14110d";
    c.fillRect(0, 0, w, LINE_PX * STOPS.length);
    c.font = `600 34px ${MONO}`;
    c.fillStyle = "#e8e3d6";
    c.textBaseline = "middle";
    STOPS.forEach((s, i) => c.fillText(s, 22, i * LINE_PX + LINE_PX / 2));
  });
  const face = useRef<THREE.MeshStandardMaterial>(null);
  const turned = useRef<THREE.Texture | null>(null);
  useLayoutEffect(() => {
    const map = face.current?.map ?? null;
    turned.current = map;
    if (!map) return;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1 / STOPS.length);
    map.needsUpdate = true;
  }, [roll]);

  useTick((t) => {
    const n = STOPS.length;
    const line = Math.floor(t / HOLD) + ease(phase(t, HOLD), 0.85, 1);
    // Texture rows run bottom-up, so line i sits at offset (n - 1 - i) / n.
    if (turned.current) turned.current.offset.y = ((((n - 1 - line) % n) + n) % n) / n;
  });

  return (
    <group position={[0, 0.07, -0.03]}>
      <mesh material={M.dark}>
        <boxGeometry args={[W + 0.02, H + 0.05, 0.06]} />
      </mesh>
      {/* brass bezel round the window */}
      {[1, -1].map((s) => (
        <mesh key={`h${s}`} material={M.brass} position={[0, (s * (H + 0.006)) / 2, 0.031]}>
          <boxGeometry args={[W + 0.006, 0.006, 0.004]} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`v${s}`} material={M.brass} position={[(s * (W + 0.006)) / 2, 0, 0.031]}>
          <boxGeometry args={[0.006, H + 0.012, 0.004]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.0305]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial ref={face} map={roll} roughness={0.85} />
      </mesh>
      {/* the bracket it hangs from */}
      <mesh material={M.brass} position={[0, -0.07 + 0.003, 0.0]}>
        <boxGeometry args={[0.08, 0.006, 0.05]} />
      </mesh>
      <mesh material={M.brass} position={[0, -0.04, 0]}>
        <boxGeometry args={[0.01, 0.054, 0.01]} />
      </mesh>
    </group>
  );
}
