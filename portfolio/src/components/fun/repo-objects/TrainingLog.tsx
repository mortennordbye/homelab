"use client";

import { useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "../StaticMerge";
import { M, MONO, phase, useCanvas, useTick } from "./shared";

const ROWS = ["squat", "bench", "row", "press", "deadlift"];
const BW = 0.12;
const BH = 0.16;
/** Sheet rows, in metres down from the top of the sheet. */
const rowY = (i: number) => 0.03 + i * 0.021;
/** The sheet's top edge, in board coordinates. */
const SHEET_TOP = BH / 2 - 0.018;
const TICK_X = 0.032;
const STEP = 1.4;

/** logeverylift: a training log on a clipboard. A pencil ticks off the next
 *  row; when the sheet is full it starts over. Ticks, not digits. */
export function TrainingLog() {
  const ticks = useRef<(THREE.Group | null)[]>([]);
  const pencil = useRef<THREE.Group>(null);
  const sheet = useCanvas(192, 240, (c, w, h) => {
    c.fillStyle = "#e8e3d6";
    c.fillRect(0, 0, w, h);
    const s = w / (BW - 0.012);
    c.font = `600 15px ${MONO}`;
    c.fillStyle = "#26313d";
    c.fillText("5 x 5", 12, 26);
    c.font = `500 13px ${MONO}`;
    c.strokeStyle = "#8b8271";
    ROWS.forEach((r, i) => {
      const y = rowY(i) * s;
      c.fillText(r, 12, y + 5);
      c.strokeRect(w / 2 + TICK_X * s - 9, y - 9, 18, 18);
    });
  });

  useTick((t) => {
    const n = ROWS.length + 1;
    const step = Math.floor(t / STEP) % n;
    const within = phase(t, STEP);
    ticks.current.forEach((g, i) => {
      if (g) g.visible = i < step || (i === step && within > 0.6);
    });
    const row = Math.min(step, ROWS.length - 1);
    if (pencil.current) {
      pencil.current.position.y = SHEET_TOP - rowY(row) + 0.004 + Math.sin(within * Math.PI * 6) * 0.002 * (within > 0.3 ? 1 : 0);
      pencil.current.position.x = TICK_X + 0.012 + (step === ROWS.length ? 0.03 : 0);
    }
  });

  return (
    <group>
      <group position={[-0.015, 0.0, -0.035]} rotation={[-0.22, 0, 0]}>
        <group position={[0, BH / 2, 0]}>
          <mesh material={M.oak}>
            <boxGeometry args={[BW, BH, 0.005]} />
          </mesh>
          <mesh position={[0, -0.006, 0.0026]}>
            <planeGeometry args={[BW - 0.012, BH - 0.024]} />
            <meshStandardMaterial map={sheet} roughness={0.9} />
          </mesh>
          <mesh material={M.brass} position={[0, BH / 2 - 0.008, 0.005]}>
            <boxGeometry args={[0.05, 0.012, 0.006]} />
          </mesh>
          {ROWS.map((r, i) => (
            <group
              key={r}
              userData={NO_MERGE}
              ref={(g) => {
                ticks.current[i] = g;
              }}
              position={[TICK_X, SHEET_TOP - rowY(i), 0.0028]}
              visible={false}
            >
              <mesh material={M.ink} position={[-0.002, -0.001, 0]} rotation={[0, 0, 0.8]}>
                <planeGeometry args={[0.0018, 0.006]} />
              </mesh>
              <mesh material={M.ink} position={[0.0018, 0.0012, 0]} rotation={[0, 0, -0.5]}>
                <planeGeometry args={[0.0018, 0.011]} />
              </mesh>
            </group>
          ))}
          {/* the pencil, point on the sheet */}
          <group ref={pencil} userData={NO_MERGE} position={[TICK_X + 0.012, 0, 0.006]} rotation={[0, 0, -0.6]}>
            <mesh material={M.brass} position={[0, 0.035, 0]}>
              <cylinderGeometry args={[0.0028, 0.0028, 0.06, 6]} />
            </mesh>
            <mesh material={M.oak} position={[0, 0.0025, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.0028, 0.006, 6]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* a small dumbbell, lying in front */}
      <group position={[0.035, 0.012, 0.05]}>
        <mesh material={M.brass} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.07, 8]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={M.dark} position={[s * 0.026, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.012, 16]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
