"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEFAULT_FLAGS, type ToggleFlags } from "@/content/cv-variants";
import { Interactive } from "./interaction";

/**
 * The CV printer.
 *
 * This is the physical form of CvCustomizerPopover: the same four flags over
 * the same sixteen pre-built PDFs, resolved through the same manifest. Flip the
 * switches on the lid, press the green button, a sheet feeds out and the
 * matching PDF downloads.
 */

type ManifestEntry = { id: string; flags: ToggleFlags; url: string };
type Manifest = { resume: string; variants: ManifestEntry[] };

const SWITCHES: { key: keyof ToggleFlags; label: string }[] = [
  { key: "skills", label: "skills" },
  { key: "clientProjects", label: "client projects" },
  { key: "homeLab", label: "home lab" },
  { key: "photo", label: "photo" },
];

function resolveUrl(variants: ManifestEntry[] | null, flags: ToggleFlags) {
  if (!variants) return null;
  return (
    variants.find(
      (v) =>
        v.flags.skills === flags.skills &&
        v.flags.clientProjects === flags.clientProjects &&
        v.flags.homeLab === flags.homeLab &&
        v.flags.photo === flags.photo,
    )?.url ?? null
  );
}

/** A rocker switch on the lid. Tilts to show its state. */
function Switch({
  x,
  on,
  label,
  onToggle,
}: {
  x: number;
  on: boolean;
  label: string;
  onToggle: () => void;
}) {
  const rocker = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (!rocker.current) return;
    const target = on ? -0.42 : 0.42;
    rocker.current.rotation.x = THREE.MathUtils.damp(
      rocker.current.rotation.x,
      target,
      9,
      d,
    );
  });

  return (
    <Interactive label={label} verb={on ? "switch off" : "switch on"} onActivate={onToggle}>
      {(hovered) => (
        <group position={[x, 0.113, -0.02]}>
          {/* recessed housing */}
          <mesh position={[0, -0.004, 0]}>
            <boxGeometry args={[0.032, 0.006, 0.05]} />
            <meshStandardMaterial color="#1b1d21" roughness={0.7} />
          </mesh>
          <group ref={rocker}>
            <RoundedBox args={[0.026, 0.008, 0.042]} radius={0.002} smoothness={3} castShadow>
              <meshStandardMaterial
                color={hovered ? "#e8eaee" : "#c9ccd2"}
                roughness={0.45}
                emissive={hovered ? "#4a5a6a" : "#000000"}
                emissiveIntensity={hovered ? 0.35 : 0}
              />
            </RoundedBox>
          </group>
          {/* state lamp beside the switch */}
          <mesh position={[0, 0.002, 0.032]}>
            <planeGeometry args={[0.006, 0.006]} />
            <meshBasicMaterial color={on ? "#57d98b" : "#3a3f45"} />
          </mesh>
        </group>
      )}
    </Interactive>
  );
}

export function Printer({
  position,
  rotation = [0, 0, 0],
  onStatus,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Surfaces printer state to the HUD, since the room has no other UI. */
  onStatus: (msg: string | null) => void;
}) {
  const [flags, setFlags] = useState<ToggleFlags>(DEFAULT_FLAGS);
  const [variants, setVariants] = useState<ManifestEntry[] | null>(null);
  const [printing, setPrinting] = useState(false);
  const paper = useRef<THREE.Group>(null);
  const feed = useRef(0);

  // Same manifest the popover uses. Fetched once when the room loads.
  useEffect(() => {
    let cancelled = false;
    fetch("/cv-manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((m: Manifest) => {
        if (!cancelled) setVariants(m?.variants ?? []);
      })
      .catch(() => {
        if (!cancelled) setVariants([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const url = useMemo(() => resolveUrl(variants, flags), [variants, flags]);
  const ready = variants !== null && variants.length > 0;

  const print = useCallback(() => {
    if (printing) return;
    if (!ready || !url) {
      onStatus("printer offline — no CV build available");
      setTimeout(() => onStatus(null), 2600);
      return;
    }
    setPrinting(true);
    feed.current = 0;
    onStatus("printing…");

    // Let the sheet get most of the way out before the download fires, so the
    // physical action and the browser action feel like one thing.
    window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = url;
      a.download = url.replace(/^\//, "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      onStatus("CV downloaded");
    }, 1400);

    window.setTimeout(() => {
      setPrinting(false);
      onStatus(null);
    }, 3400);
  }, [printing, ready, url, onStatus]);

  // Sheet slides out of the front slot, then retracts once the job finishes.
  useFrame((_, d) => {
    if (!paper.current) return;
    const target = printing ? 1 : 0;
    feed.current = THREE.MathUtils.damp(feed.current, target, printing ? 3.2 : 7, d);
    paper.current.position.z = 0.16 + feed.current * 0.2;
    paper.current.position.y = 0.052 - feed.current * 0.012;
    paper.current.rotation.x = -0.06 - feed.current * 0.12;
    const m = (paper.current.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    m.opacity = Math.min(1, feed.current * 4);
  });

  const toggle = useCallback((key: keyof ToggleFlags) => {
    setFlags((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* body */}
      <RoundedBox
        position={[0, 0.055, 0]}
        args={[0.42, 0.11, 0.36]}
        radius={0.012}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2b2e33" roughness={0.5} metalness={0.25} />
      </RoundedBox>
      {/* lid, slightly inset */}
      <RoundedBox
        position={[0, 0.115, -0.01]}
        args={[0.4, 0.016, 0.32]}
        radius={0.008}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#33373d" roughness={0.45} metalness={0.3} />
      </RoundedBox>

      {/* output slot */}
      <mesh position={[0, 0.052, 0.181]}>
        <planeGeometry args={[0.3, 0.016]} />
        <meshStandardMaterial color="#0b0d0f" roughness={0.9} />
      </mesh>
      {/* catch tray */}
      <RoundedBox
        position={[0, 0.036, 0.216]}
        args={[0.3, 0.008, 0.08]}
        radius={0.003}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color="#25282d" roughness={0.6} metalness={0.2} />
      </RoundedBox>

      {/* the sheet */}
      <group ref={paper} position={[0, 0.052, 0.16]} rotation={[-0.06, 0, 0]}>
        <mesh castShadow>
          <planeGeometry args={[0.21, 0.297]} />
          <meshStandardMaterial
            color="#f2f0ec"
            roughness={0.85}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {SWITCHES.map((s, i) => (
        <Switch
          key={s.key}
          x={-0.105 + i * 0.07}
          on={flags[s.key]}
          label={`${s.label} — ${flags[s.key] ? "on" : "off"}`}
          onToggle={() => toggle(s.key)}
        />
      ))}

      {/* print button */}
      <Interactive
        label={printing ? "printing…" : "print CV"}
        verb="press"
        onActivate={print}
        disabled={printing}
      >
        {(hovered) => (
          <group position={[0.16, 0.121, 0.09]}>
            <mesh position={[0, -0.004, 0]}>
              <cylinderGeometry args={[0.019, 0.019, 0.006, 20]} />
              <meshStandardMaterial color="#1b1d21" roughness={0.7} />
            </mesh>
            <mesh castShadow position={[0, printing ? -0.001 : 0.002, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.008, 20]} />
              <meshStandardMaterial
                color={printing ? "#2f7d52" : "#3ddc97"}
                roughness={0.35}
                emissive={printing ? "#1d5e3c" : hovered ? "#2aa876" : "#155c3f"}
                emissiveIntensity={hovered || printing ? 1.4 : 0.55}
              />
            </mesh>
          </group>
        )}
      </Interactive>

      {/* status lamp */}
      <mesh position={[-0.17, 0.124, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.008, 0.008]} />
        <meshBasicMaterial color={ready ? (printing ? "#f5b544" : "#57d98b") : "#8a3f3f"} />
      </mesh>
    </group>
  );
}
