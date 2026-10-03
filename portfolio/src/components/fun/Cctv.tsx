"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { CCTV_LENS } from "./Devices";

const at = new THREE.Vector3();
const ahead = new THREE.Vector3();
/** One security camera in the flat, so one view of it. */
const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 60);

/**
 * The security camera's picture, drawn over the composer's frame while the
 * visitor looks through it. The visitor stays where they stood, so the body in
 * the picture is them, facing the lens they just pressed.
 *
 * Priority 2, after the composer (1): a plain render on top, so the room's
 * own camera, and everything driven off it, never moves.
 */
export function CctvView({ active }: { active: boolean }) {
  useFrame(({ gl, scene, size }) => {
    if (!active) return;
    CCTV_LENS.getWorldPosition(at);
    CCTV_LENS.getWorldDirection(ahead);
    camera.position.copy(at);
    camera.lookAt(ahead.add(at));
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    // The composer's ToneMapping pass does this for the main frame.
    const toneMapping = gl.toneMapping;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.setRenderTarget(null);
    gl.render(scene, camera);
    gl.toneMapping = toneMapping;
  }, 2);
  return null;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const SHADOW = { textShadow: "0 0 6px rgba(0,0,0,0.9)" };

/** The feed's chrome: scanlines, camera name, a running clock and the way out. */
export function CctvOverlay({
  model,
  where,
  touch,
  onExit,
}: {
  model: string;
  where: string;
  touch: boolean;
  onExit: () => void;
}) {
  const now = useClock();
  const stamp = now.toLocaleString("en-GB", { hour12: false }).replace(",", "");
  return (
    <div className="pointer-events-none absolute inset-0 z-30 font-mono text-xs text-snow/80">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="absolute left-6 top-14 space-y-1" style={SHADOW}>
        <div className="tracking-[0.2em]">CAM 01 · {where.toUpperCase()}</div>
        <div className="text-snow/60">{model}</div>
      </div>
      <div className="absolute bottom-6 left-6 tabular-nums tracking-[0.15em]" style={SHADOW}>
        {stamp}
      </div>
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <button
          type="button"
          onClick={onExit}
          className="focus-ring pointer-events-auto rounded-[2px] border border-snow/30 bg-black/40 px-3 py-1.5 text-snow/85 hover:border-snow/60"
        >
          {touch ? "tap to look away" : "Esc or E to look away"}
        </button>
      </div>
    </div>
  );
}
