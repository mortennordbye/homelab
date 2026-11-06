"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { M, useTick } from "./shared";

const CARDS = 11;
const BW = 0.13;
const BD = 0.12;
const BH = 0.05;
const CARD_H = 0.075;
const dummy = new THREE.Object3D();
const lift = new THREE.Matrix4().makeTranslation(0, CARD_H / 2, 0);

/** openself: an oak card index, one record per card. A wave runs through the
 *  cards as if someone thumbs through them. */
export function CardIndex() {
  const cards = useRef<THREE.InstancedMesh>(null);

  const place = (t: number) => {
    const m = cards.current;
    if (!m) return;
    const wave = (t * 3) % (CARDS + 8);
    for (let i = 0; i < CARDS; i++) {
      const d = wave - i;
      const tip = d > 0 && d < 2.5 ? Math.sin((d / 2.5) * Math.PI) : 0;
      const z = BD / 2 - 0.012 - i * ((BD - 0.024) / (CARDS - 1));
      dummy.position.set(0, 0.006, z);
      dummy.rotation.set(0.12 + tip * 0.45, 0, 0);
      dummy.updateMatrix();
      dummy.matrix.multiply(lift);
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => place(0));
  useTick(place);

  return (
    <group position={[0, 0, -0.01]}>
      {/* the box: floor, back, sides and a low front */}
      <mesh material={M.oak} position={[0, 0.003, 0]}>
        <boxGeometry args={[BW, 0.006, BD]} />
      </mesh>
      <mesh material={M.oak} position={[0, BH / 2, -BD / 2 + 0.003]}>
        <boxGeometry args={[BW, BH, 0.006]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.oak} position={[s * (BW / 2 - 0.003), BH / 2, 0]}>
          <boxGeometry args={[0.006, BH, BD]} />
        </mesh>
      ))}
      <mesh material={M.oak} position={[0, 0.016, BD / 2 - 0.003]}>
        <boxGeometry args={[BW, 0.032, 0.006]} />
      </mesh>
      {/* brass label holder on the front */}
      <mesh material={M.brass} position={[0, 0.018, BD / 2 + 0.0005]}>
        <boxGeometry args={[0.04, 0.014, 0.002]} />
      </mesh>
      <instancedMesh ref={cards} args={[undefined, undefined, CARDS]} material={M.paper} frustumCulled={false}>
        <boxGeometry args={[BW - 0.016, CARD_H, 0.0012]} />
      </instancedMesh>
    </group>
  );
}
