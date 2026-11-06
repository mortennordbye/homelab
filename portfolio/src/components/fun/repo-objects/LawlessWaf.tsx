"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { PLINTH, Plinth, paint, useExtrude, useTick, ease, phase } from "./shared";

const W = 0.1;
const H = 0.12;

/** lawless-waf: the icon's steel shield with a filter funnel, wearing an outlaw
 *  hat. Now and then it tips the hat. */
export function LawlessWaf() {
  const hat = useRef<THREE.Group>(null);
  const shield = useExtrude((s) => {
    s.moveTo(0, H);
    s.lineTo(W / 2, H - 0.018);
    s.lineTo(W / 2, H * 0.5);
    s.quadraticCurveTo(W / 2, H * 0.12, 0, 0);
    s.quadraticCurveTo(-W / 2, H * 0.12, -W / 2, H * 0.5);
    s.lineTo(-W / 2, H - 0.018);
    s.closePath();
  }, 0.02, 0.003);
  const funnel = useExtrude((s) => {
    s.moveTo(-0.028, 0.06);
    s.lineTo(0.028, 0.06);
    s.lineTo(0.008, 0.032);
    s.lineTo(0.008, 0.012);
    s.lineTo(-0.008, 0.004);
    s.lineTo(-0.008, 0.032);
    s.closePath();
  }, 0.006, 0.001);

  useTick((t) => {
    const p = phase(t, 5);
    const tip = ease(p, 0.55, 0.68) - ease(p, 0.78, 0.92);
    if (hat.current) {
      hat.current.position.y = H + 0.004 + tip * 0.022;
      hat.current.rotation.z = 0.18 - tip * 0.35;
    }
  });

  const dark = paint("#1f2937", { rough: 0.7 });
  return (
    <group>
      <Plinth color="#991b1b" />
      <group position={[0, PLINTH + 0.004, 0]}>
        <mesh geometry={shield} material={paint("#e2e8f0", { metal: 0.6, rough: 0.3 })} />
        <mesh geometry={funnel} material={paint("#1e293b", { rough: 0.5 })} position={[0, 0.02, 0.013]} />
        <group ref={hat} userData={NO_MERGE} position={[0, H + 0.004, 0]} rotation={[0, 0, 0.18]}>
          <mesh material={dark} scale={[1.6, 1, 1]}>
            <cylinderGeometry args={[0.042, 0.042, 0.005, 28]} />
          </mesh>
          <mesh material={dark} position={[0, 0.016, 0]} scale={[1.25, 1, 1]}>
            <cylinderGeometry args={[0.024, 0.03, 0.03, 24]} />
          </mesh>
          <mesh material={paint("#94a3b8", { rough: 0.5 })} position={[0, 0.006, 0]} scale={[1.25, 1, 1]}>
            <cylinderGeometry args={[0.031, 0.031, 0.006, 24]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
