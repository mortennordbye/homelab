"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { skills } from "@/content/skills";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import { OAK } from "@/components/materials/oak";

/**
 * The skills, counted on an abacus standing on the dining table. One rod per
 * skill and a bead per ten points: counted beads sit against the label in
 * brass, the rest wait at the far end in wood. A five is a bead caught halfway,
 * so every level on the site reads exactly rather than rounded.
 *
 * Origin at the table top, local +z toward the visitor. Nothing casts, for the
 * reason in Bookshelf, and the beads are one instanced draw.
 */

const W = 0.48;
const H = 0.4;
/** Shallow on purpose: the rails stand in front of the rods, and seen from
 *  standing height a deeper rail hides the top row. */
const D = 0.032;
const POST = 0.024;
const RAIL = 0.028;
const FOOT = 0.018;
const LABEL_W = 0.135;
const DIVIDER = 0.008;
const BEADS = 10;
const BEAD_R = 0.0105;
/** Canvas pixels per metre of label board. */
const LABEL_PX = 2000;

const BRASS = new THREE.Color("#b98f4e");
const WOOD = new THREE.Color("#3b2a1f");

const INNER_X0 = -W / 2 + POST;
const INNER_X1 = W / 2 - POST;
const ROD_X0 = INNER_X0 + LABEL_W + DIVIDER;
const ROD_X1 = INNER_X1;
const INNER_Y0 = FOOT + RAIL;
const INNER_Y1 = FOOT + H - RAIL;
const ROW_H = (INNER_Y1 - INNER_Y0) / skills.length;
const rodY = (i: number) => INNER_Y1 - ROW_H * (i + 0.5);
const STEP = BEAD_R * 2.2;

/** Where each bead on one rod sits, and whether it is counted. */
function beadsFor(level: number): { x: number; counted: boolean }[] {
  const full = Math.floor(level / 10);
  const half = level % 10 >= 5 ? 1 : 0;
  const rest = BEADS - full - half;
  const out: { x: number; counted: boolean }[] = [];
  for (let i = 0; i < full; i++) out.push({ x: ROD_X0 + STEP / 2 + i * STEP, counted: true });
  if (half) {
    const countedEnd = ROD_X0 + full * STEP;
    const restStart = ROD_X1 - rest * STEP;
    out.push({ x: (countedEnd + restStart) / 2, counted: true });
  }
  for (let j = 0; j < rest; j++) out.push({ x: ROD_X1 - STEP / 2 - j * STEP, counted: false });
  return out;
}

/** The family behind Tailwind's `font-mono`, which next/font names at build time. */
function monoFamily(): string {
  const probe = document.createElement("span");
  probe.className = "font-mono";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || "monospace";
}

function labelTexture(labels: string[]): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = Math.round(LABEL_W * LABEL_PX);
  c.height = Math.round((INNER_Y1 - INNER_Y0) * LABEL_PX);
  const x = c.getContext("2d")!;
  x.fillStyle = "#2a1f17";
  x.fillRect(0, 0, c.width, c.height);
  const family = monoFamily();
  const rowPx = c.height / labels.length;
  const pad = 12;
  x.fillStyle = "#d8c9a8";
  x.textBaseline = "middle";
  labels.forEach((label, i) => {
    let size = Math.min(22, rowPx * 0.5);
    x.font = `${size}px ${family}`;
    while (x.measureText(label).width > c.width - pad * 2 && size > 10) {
      size -= 1;
      x.font = `${size}px ${family}`;
    }
    x.fillText(label, pad, rowPx * (i + 0.5));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function skillsCard(): InfoCard {
  const top = [...skills].sort((a, b) => b.level - a.level)[0];
  return {
    kicker: "skills",
    title: "What I work with",
    subtitle: top ? `Strongest: ${top.label}` : undefined,
    rows: skills.map((s) => ({ k: s.label, v: `${s.level}` })),
    body: "Levels are self-assessed and carried over from the published skill bars on the site, not scored by anyone else.",
    href: "/#about",
    hrefLabel: "see these on the site",
  };
}

function FrameMaterial({ hovered }: { hovered: boolean }) {
  return (
    <meshStandardMaterial
      color={OAK.case}
      roughness={0.62}
      emissive={hovered ? "#ffd9a6" : "#000000"}
      emissiveIntensity={hovered ? 0.22 : 0}
    />
  );
}

export function Abacus({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const beads = useRef<THREE.InstancedMesh>(null);
  const [labels, setLabels] = useState<THREE.CanvasTexture | null>(null);

  // Drawn once the web font is in, or the canvas falls back to a system mono.
  useEffect(() => {
    let live = true;
    let made: THREE.CanvasTexture | null = null;
    document.fonts.ready.then(() => {
      if (!live) return;
      made = labelTexture(skills.map((s) => s.label.toUpperCase()));
      setLabels(made);
    });
    return () => {
      live = false;
      made?.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    const mesh = beads.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const scale = new THREE.Vector3(BEAD_R * 1.1, Math.min(BEAD_R, ROW_H * 0.42), BEAD_R);
    const q = new THREE.Quaternion();
    let n = 0;
    skills.forEach((s, i) => {
      for (const b of beadsFor(s.level)) {
        m.compose(new THREE.Vector3(b.x, rodY(i), 0), q, scale);
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, b.counted ? BRASS : WOOD);
        n++;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Picking culls on this sphere, and before it is recomputed it encloses
    // only the unit sphere every instance started as.
    mesh.computeBoundingSphere();
  }, []);

  const rodLen = ROD_X1 - ROD_X0;
  const top = [...skills].sort((a, b) => b.level - a.level)[0];

  return (
    <Interactive
      label="the abacus"
      verb="count"
      detail={top ? `${skills.length} skills · most beads on ${top.label}` : `${skills.length} skills`}
      onActivate={() => onOpen(skillsCard())}
    >
      {(hovered) => (
        <group position={position} rotation={rotation}>
          {/* feet, running front to back so it stands */}
          {[-1, 1].map((s) => (
            <mesh key={`f${s}`} position={[s * (W / 2 - POST / 2), FOOT / 2, 0]} receiveShadow>
              <boxGeometry args={[POST + 0.01, FOOT, 0.16]} />
              <FrameMaterial hovered={hovered} />
            </mesh>
          ))}
          {/* posts */}
          {[-1, 1].map((s) => (
            <mesh key={`p${s}`} position={[s * (W / 2 - POST / 2), FOOT + H / 2, 0]} receiveShadow>
              <boxGeometry args={[POST, H, D]} />
              <FrameMaterial hovered={hovered} />
            </mesh>
          ))}
          {/* rails */}
          {[FOOT + RAIL / 2, FOOT + H - RAIL / 2].map((y) => (
            <mesh key={`r${y}`} position={[0, y, 0]} receiveShadow>
              <boxGeometry args={[W - POST * 2, RAIL, D]} />
              <FrameMaterial hovered={hovered} />
            </mesh>
          ))}
          {/* divider between the label board and the rods */}
          <mesh position={[INNER_X0 + LABEL_W + DIVIDER / 2, (INNER_Y0 + INNER_Y1) / 2, 0]}>
            <boxGeometry args={[DIVIDER, INNER_Y1 - INNER_Y0, D * 0.7]} />
            <FrameMaterial hovered={hovered} />
          </mesh>

          {/* label board */}
          <mesh position={[INNER_X0 + LABEL_W / 2, (INNER_Y0 + INNER_Y1) / 2, 0.004]}>
            <planeGeometry args={[LABEL_W, INNER_Y1 - INNER_Y0]} />
            <meshStandardMaterial key={labels ? "labelled" : "blank"} map={labels} color={labels ? "#ffffff" : "#2a1f17"} roughness={0.8} />
          </mesh>

          {/* rods */}
          {skills.map((s, i) => (
            <mesh key={s.label} position={[ROD_X0 + rodLen / 2, rodY(i), 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0018, 0.0018, rodLen, 8]} />
              <meshStandardMaterial color="#9c7b3f" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}

          <instancedMesh ref={beads} args={[undefined, undefined, skills.length * BEADS]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial roughness={0.45} metalness={0.25} />
          </instancedMesh>
        </group>
      )}
    </Interactive>
  );
}
