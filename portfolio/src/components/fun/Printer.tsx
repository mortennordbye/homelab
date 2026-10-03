"use client";

import { Html } from "@react-three/drei";
import { RoundedBox } from "@/components/scene/RoundedBox";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEFAULT_FLAGS, type ToggleFlags } from "@/content/cv-variants";
import { pdfFilename } from "@/lib/download-name";
import { Interactive } from "./interaction";
import { NO_MERGE } from "./StaticMerge";

/**
 * The CV printer.
 *
 * This is the physical form of the resume object's toggles: the same four flags over
 * the same sixteen pre-built PDFs, resolved through the same manifest. Its
 * controls are a screen on the lid: E zooms the view onto it (`ScreenFocus` in
 * FunRoom), the sections are toggled there, and printing zooms back out so the
 * sheet is seen feeding out as the matching PDF downloads.
 */

/** `preview` is page one as an image; absent from manifests built before it. */
type ManifestEntry = { id: string; flags: ToggleFlags; url: string; preview?: string };
type Manifest = { resume: string; variants: ManifestEntry[] };

const SWITCHES: { key: keyof ToggleFlags; label: string }[] = [
  { key: "skills", label: "skills" },
  { key: "clientProjects", label: "client projects" },
  { key: "homeLab", label: "home lab" },
  { key: "photo", label: "photo" },
];

/** The lid screen: a plate tilted back off the lid's rear edge, facing up and
 *  forward at a standing visitor. Physical size and its DOM size together set
 *  the Html scale. */
const SCREEN_W = 0.26;
const SCREEN_H = 0.13;
const SCREEN_PX_W = 520;
const SCREEN_PX_H = 260;
const SCREEN_TILT = -0.9;

/**
 * Where the zoom looks from: the screen's face, local +z out of it. One
 * printer in the flat, so one shared object FunRoom's focus reads.
 */
export const PRINTER_SCREEN = new THREE.Object3D();

function resolve(variants: ManifestEntry[] | null, flags: ToggleFlags) {
  if (!variants) return null;
  return (
    variants.find(
      (v) =>
        v.flags.skills === flags.skills &&
        v.flags.clientProjects === flags.clientProjects &&
        v.flags.homeLab === flags.homeLab &&
        v.flags.photo === flags.photo,
    ) ?? null
  );
}

export function Printer({
  position,
  rotation = [0, 0, 0],
  onStatus,
  active,
  onOpen,
  onDone,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Surfaces printer state to the HUD, since the room has no other UI. */
  onStatus: (msg: string | null) => void;
  /** The view is zoomed onto the screen and the screen takes input. */
  active: boolean;
  onOpen: () => void;
  /** A job was sent: zoom back out to watch it print. */
  onDone: () => void;
}) {
  const [flags, setFlags] = useState<ToggleFlags>(DEFAULT_FLAGS);
  const [variants, setVariants] = useState<ManifestEntry[] | null>(null);
  const [printing, setPrinting] = useState(false);
  /** The sheet is out of the slot: longer than the job, so the page can be read. */
  const [out, setOut] = useState(false);
  const paper = useRef<THREE.Group>(null);
  const feed = useRef(0);
  const gl = useThree((state) => state.gl);

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

  const entry = useMemo(() => resolve(variants, flags), [variants, flags]);
  const url = entry?.url ?? null;
  const preview = entry?.preview ?? null;

  /* Page one of the CV being chosen, for the sheet. Fetched only once the
     visitor is at the screen, so the room's first load carries none of it. */
  const [sheet, setSheet] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!active || !preview) return;
    let cancelled = false;
    new THREE.TextureLoader().load(preview, (t) => {
      if (cancelled) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      setSheet((old) => {
        old?.dispose();
        return t;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [active, preview, gl]);
  const ready = variants !== null && variants.length > 0;

  const print = useCallback(() => {
    if (printing) return;
    if (!ready || !url) {
      onStatus("printer offline — no CV build available");
      setTimeout(() => onStatus(null), 2600);
      return;
    }
    setPrinting(true);
    setOut(true);
    feed.current = 0;
    onStatus("printing…");

    // Let the sheet get most of the way out before the download fires, so the
    // physical action and the browser action feel like one thing.
    window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = url;
      // Always a CV: `resolve` only ever matches a variant, never the resume.
      a.download = pdfFilename(false);
      document.body.appendChild(a);
      a.click();
      a.remove();
      onStatus("CV downloaded");
    }, 1400);

    window.setTimeout(() => {
      setPrinting(false);
      onStatus(null);
    }, 3400);
    window.setTimeout(() => setOut(false), 8000);
  }, [printing, ready, url, onStatus]);

  // Sheet slides out of the front slot, then retracts a while after the job.
  // eslint-disable-next-line react-hooks/immutability -- renderer state is mutable by design; on-demand shadows are driven this way
  useFrame((_, d) => {
    if (!paper.current) return;
    const target = out ? 1 : 0;
    /* Settled: nothing to move, and nothing to redraw. The shadow map is off
       auto (see Lighting in FunRoom), so a caster that moves has to ask. */
    if (Math.abs(target - feed.current) < 0.0005) return;
    // eslint-disable-next-line react-hooks/immutability -- see the useFrame above
    gl.shadowMap.needsUpdate = true;
    feed.current = THREE.MathUtils.damp(feed.current, target, out ? 3.2 : 7, d);
    // 0.33 clears the slot, so the page's head with the name is out too.
    paper.current.position.z = 0.16 + feed.current * 0.33;
    const m = (paper.current.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    m.opacity = Math.min(1, feed.current * 4);
  });

  const toggle = useCallback((key: keyof ToggleFlags) => {
    setFlags((p) => ({ ...p, [key]: !p[key] }));
  }, []);

  const send = useCallback(() => {
    print();
    onDone();
  }, [print, onDone]);

  // Keys while zoomed in: 1 to 4 toggle, Enter prints.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const i = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
      if (i >= 0) toggle(SWITCHES[i].key);
      else if (e.code === "Enter") {
        // A focused button on the screen would take this Enter as a click too.
        e.preventDefault();
        send();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, toggle, send]);

  return (
    <group position={position} rotation={rotation}>
      {/* The whole machine zooms onto its screen. Disabled while zoomed, so
          the screen's own buttons are what a click lands on. */}
      <Interactive label="CV printer" verb="use the screen" detail="pick the sections, then print" onActivate={onOpen} disabled={active}>
      <group>
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
      <Screen
        flags={flags}
        ready={ready}
        printing={printing}
        active={active}
        onToggle={toggle}
        onPrint={send}
      />
      </group>
      </Interactive>

      {/* Face up at slot height, leading edge on the group's origin. Full feed
          leaves the trailing edge just past the slot. */}
      <group ref={paper} position={[0, 0.052, 0.16]} userData={NO_MERGE}>
        <mesh castShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.297 / 2]}>
          <planeGeometry args={[0.21, 0.297]} />
          {/* Keyed on the page: three only compiles a map in when the material
              is built, so swapping one onto a bare sheet needs a new material. */}
          <meshStandardMaterial
            key={sheet?.uuid ?? "blank"}
            map={sheet}
            // Under the hall lamp a full-white sheet clips; this keeps the print.
            color={sheet ? "#9e988e" : "#f2f0ec"}
            roughness={0.85}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      {/* status lamp */}
      <mesh position={[-0.17, 0.124, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.008, 0.008]} />
        <meshBasicMaterial color={ready ? (printing ? "#f5b544" : "#5ec96e") : "#8a3f3f"} />
      </mesh>
    </group>
  );
}

/** The lid screen: a dark plate tilted off the lid's back edge, carrying the
 *  controls as real DOM, live to the pointer only while zoomed in. */
function Screen({
  flags,
  ready,
  printing,
  active,
  onToggle,
  onPrint,
}: {
  flags: ToggleFlags;
  ready: boolean;
  printing: boolean;
  active: boolean;
  onToggle: (key: keyof ToggleFlags) => void;
  onPrint: () => void;
}) {
  // Bottom edge on the lid top (0.123), centre lifted and set back from it.
  const lift = (SCREEN_H / 2) * Math.cos(SCREEN_TILT);
  const back = (SCREEN_H / 2) * Math.sin(-SCREEN_TILT);
  const status = !ready ? "offline" : printing ? "printing" : "ready";
  return (
    <group position={[0, 0.123 + lift + 0.004, -0.08 - back]} rotation={[SCREEN_TILT, 0, 0]}>
      <RoundedBox args={[SCREEN_W + 0.016, SCREEN_H + 0.016, 0.012]} radius={0.004} smoothness={3} castShadow>
        <meshStandardMaterial color="#1b1d21" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      <primitive object={PRINTER_SCREEN} position={[0, 0, 0.0065]} />
      {/* Clears the plate's face: an Html layer flush with its backing tears. */}
      <Html
        transform
        occlude="blending"
        distanceFactor={(SCREEN_W / SCREEN_PX_W) * 400}
        position={[0, 0, 0.0075]}
        zIndexRange={[10, 0]}
        style={{
          width: `${SCREEN_PX_W}px`,
          height: `${SCREEN_PX_H}px`,
          pointerEvents: active ? "auto" : "none",
          userSelect: "none",
        }}
      >
        <div
          className="flex h-full w-full flex-col font-mono"
          style={{ background: "#0e1215", color: "#e6e1d6", padding: "14px 18px" }}
        >
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: "22px", letterSpacing: "0.22em", fontWeight: 700 }}>CV BUILDER</span>
            <span style={{ fontSize: "14px", letterSpacing: "0.14em" }}>
              {active && <span style={{ color: "#7d858c", marginRight: "16px" }}>E TO STEP BACK</span>}
              <span style={{ color: ready ? "#8fc79a" : "#c98a7a" }}>{status.toUpperCase()}</span>
            </span>
          </div>
          <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
            {SWITCHES.map((s, i) => {
              const on = flags[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => onToggle(s.key)}
                  className="flex items-center justify-between rounded-[3px] px-3 text-left outline-none"
                  style={{
                    border: `1px solid ${on ? "#5e9a68" : "#3a4046"}`,
                    background: on ? "rgba(94,154,104,0.16)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: "17px" }}>
                    <span style={{ color: "#7d858c", marginRight: "10px" }}>{i + 1}</span>
                    {s.label}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: on ? "#8fc79a" : "#7d858c" }}>
                    {on ? "ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onPrint}
            disabled={printing || !ready}
            className="mt-2 rounded-[3px] py-2 outline-none"
            style={{
              fontSize: "17px",
              letterSpacing: "0.16em",
              background: printing || !ready ? "#2a2f34" : "#4f8a5a",
              color: "#0e1215",
              fontWeight: 700,
            }}
          >
            {printing ? "PRINTING…" : "PRINT  ·  ENTER"}
          </button>
        </div>
      </Html>
    </group>
  );
}
