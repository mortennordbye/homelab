"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, MONO, useCanvas, useTick } from "./shared";

const COLS = 8;
const KEY_ROWS = 3;
const KEYS = COLS * KEY_ROWS;
const BEAT = 0.22;
const PER_LINE = 14;
const LINE = 0.009;
const SHEET_H = 0.12;
const dummy = new THREE.Object3D();

/** Key position on the sloped deck, row 0 nearest the visitor. */
function keyAt(i: number, down: boolean) {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  dummy.position.set(-0.056 + c * 0.016 + r * 0.004, 0.043 + r * 0.006 - (down ? 0.003 : 0), 0.03 - r * 0.017);
  dummy.updateMatrix();
  return dummy.matrix;
}

/** openvita: a typewriter. Keys strike, the carriage steps, and at the end of
 *  a line the sheet feeds up. The sheet is printed already: no text appears
 *  letter by letter. */
export function Typewriter() {
  const keys = useRef<THREE.InstancedMesh>(null);
  const carriage = useRef<THREE.Group>(null);
  const sheetRef = useRef<THREE.Mesh>(null);
  const last = useRef(-1);
  const sheet = useCanvas(160, 192, (c, w, h) => {
    c.fillStyle = "#e8e3d6";
    c.fillRect(0, 0, w, h);
    c.font = `600 13px ${MONO}`;
    c.fillStyle = "#26313d";
    c.fillText("Curriculum vitae", 12, 22);
    c.fillStyle = "#5d6875";
    for (let y = 44; y < h - 8; y += 14) {
      const len = 40 + ((y * 37) % 90);
      c.fillRect(12, y, len, 3);
    }
  });

  useLayoutEffect(() => {
    const k = keys.current;
    if (!k) return;
    for (let i = 0; i < KEYS; i++) k.setMatrixAt(i, keyAt(i, false));
    k.instanceMatrix.needsUpdate = true;
  }, []);

  useTick((t) => {
    const beat = Math.floor(t / BEAT);
    const k = keys.current;
    if (k && beat !== last.current) {
      if (last.current >= 0) k.setMatrixAt((last.current * 7) % KEYS, keyAt((last.current * 7) % KEYS, false));
      const struck = beat % (PER_LINE + 3) < PER_LINE;
      if (struck) k.setMatrixAt((beat * 7) % KEYS, keyAt((beat * 7) % KEYS, true));
      k.instanceMatrix.needsUpdate = true;
      last.current = beat;
    }
    const inLine = Math.min(beat % (PER_LINE + 3), PER_LINE);
    const line = Math.floor(beat / (PER_LINE + 3)) % 6;
    if (carriage.current) carriage.current.position.x = 0.03 - inLine * 0.0045;
    if (sheetRef.current) sheetRef.current.position.y = SHEET_H / 2 - 0.012 + line * LINE;
  });

  return (
    <group position={[0, 0, -0.005]}>
      {/* body: a low dark block with a sloped key deck */}
      <mesh material={M.dark} position={[0, 0.02, -0.01]}>
        <boxGeometry args={[0.15, 0.04, 0.1]} />
      </mesh>
      <mesh material={M.dark} position={[0, 0.042, -0.04]}>
        <boxGeometry args={[0.15, 0.022, 0.05]} />
      </mesh>
      <instancedMesh ref={keys} args={[undefined, undefined, KEYS]} material={M.brass} frustumCulled={false}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.004, 12]} />
      </instancedMesh>
      {/* carriage: platen and its rail, stepping left as it types */}
      <group ref={carriage} userData={NO_MERGE} position={[0.03, 0.06, -0.045]}>
        <mesh material={M.dark} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 0.14, 16]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={M.brass} position={[s * 0.073, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.008, 12]} />
          </mesh>
        ))}
        <mesh material={M.brass} position={[0.082, 0.004, 0.01]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.012, 0.003, 0.025]} />
        </mesh>
        <mesh ref={sheetRef} userData={NO_MERGE} position={[0, SHEET_H / 2 - 0.012, -0.004]} rotation={[-0.18, 0, 0]}>
          <planeGeometry args={[0.1, SHEET_H]} />
          <meshStandardMaterial map={sheet} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
