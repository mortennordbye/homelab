"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useCanvas, useTick } from "./shared";

const R = 0.074;

/** logeverylift: the icon's 20 kg plate standing on edge, rocking slightly as
 *  if just set down. */
export function LogEveryLift() {
  const plate = useRef<THREE.Group>(null);
  const face = useCanvas(512, 512, (c, w) => {
    c.clearRect(0, 0, w, w);
    c.fillStyle = "#f4f6fa";
    c.font = "700 46px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const ring = (text: string, start: number, step: number, r: number) => {
      [...text].forEach((ch, i) => {
        const a = start + i * step;
        c.save();
        c.translate(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r);
        c.rotate(a + Math.PI / 2);
        c.fillText(ch, 0, 0);
        c.restore();
      });
    };
    const top = "LOG EVERY LIFT";
    ring(top, -Math.PI / 2 - ((top.length - 1) * 0.15) / 2, 0.15, 196);
    c.font = "700 52px system-ui, sans-serif";
    c.fillText("20 KG", w / 2, w / 2 + 120);
  });
  useTick((t) => {
    if (plate.current) plate.current.rotation.z = Math.sin(t * 1.6) * 0.05 * (0.5 + 0.5 * Math.sin(t * 0.4));
  });
  const iron = paint("#1e1f23", { metal: 0.4, rough: 0.55 });
  return (
    <group>
      <Plinth color="#14234a" />
      {/* pivot at the contact point, so it rocks on its rim */}
      <group ref={plate} userData={NO_MERGE} position={[0, PLINTH, 0]}>
        <group position={[0, R, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={iron}>
            <cylinderGeometry args={[R, R, 0.024, 48]} />
          </mesh>
          <mesh material={paint("#2d2f35", { metal: 0.4, rough: 0.45 })} position={[0, 0.0125, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R * 0.62, 0.004, 8, 48]} />
          </mesh>
          <mesh material={paint("#c9ced6", { metal: 0.9, rough: 0.2 })}>
            <cylinderGeometry args={[0.017, 0.017, 0.03, 32]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={paint("#0c0d0f", { rough: 0.8 })} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.034, 0.0122, Math.sin((i * 2 * Math.PI) / 3) * 0.034]} rotation={[0, -(i * 2 * Math.PI) / 3, 0]}>
              <boxGeometry args={[0.006, 0.001, 0.02]} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, R, 0.0127]}>
          <circleGeometry args={[R * 0.98, 48]} />
          <meshStandardMaterial map={face} transparent roughness={0.6} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
