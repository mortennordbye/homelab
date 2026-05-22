"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Silence the noisy "THREE.Clock has been deprecated" warning emitted from
// inside @react-three/fiber / drei. The library still uses Clock internally;
// the message floods the dev indicator until upstream migrates to Timer.
if (typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("THREE.Clock")) return;
    origWarn(...args);
  };
}

const OSLO = { lat: 59.91, lon: 10.75 };
const RADIUS = 1.6;
const EARTH_TILT_X = 0.32;
// Static rotation locked to face Europe / North Atlantic, so Oslo always
// sits in the upper-mid area of the visible disk and never drifts behind
// the limb. The Oslo pulse provides the only motion accent.
const STATIC_ROTATION = -1.95;
// Loop a pulse every PULSE_PERIOD seconds; burst lasts PULSE_BURST seconds.
const PULSE_PERIOD = 3.2;
const PULSE_BURST = 0.5;

function latLonToVec3(lat: number, lon: number, radius = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type Bus = { elapsed: number };

function Earth() {
  const [day, normal, specular] = useTexture([
    "/textures/earth-day.webp",
    "/textures/earth-normal.webp",
    "/textures/earth-specular.webp",
  ]);

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    specular.colorSpace = THREE.NoColorSpace;
    [day, normal, specular].forEach((t) => {
      t.anisotropy = 8;
    });
  }, [day, normal, specular]);

  return (
    <group rotation={[EARTH_TILT_X, STATIC_ROTATION, 0]}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 64]} />
        <meshStandardMaterial
          map={day}
          normalMap={normal}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={specular}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}

function OsloMarker() {
  const pos = useMemo(() => latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.005), []);

  return (
    <group rotation={[EARTH_TILT_X, STATIC_ROTATION, 0]}>
      <mesh position={pos}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color="#5db7ff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function OsloPulse({ bus }: { bus: React.MutableRefObject<Bus> }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.005), []);
  const quat = useMemo(() => {
    const n = pos.clone().normalize();
    const up = new THREE.Vector3(0, 0, 1);
    return new THREE.Quaternion().setFromUnitVectors(up, n);
  }, [pos]);

  useFrame(() => {
    if (!ringRef.current) return;
    const phase = bus.current.elapsed % PULSE_PERIOD;
    if (phase > PULSE_BURST) {
      ringRef.current.visible = false;
      return;
    }
    ringRef.current.visible = true;
    const t = clamp01(phase / PULSE_BURST);
    const s = 0.015 + easeOut(t) * 0.09;
    ringRef.current.scale.set(s, s, s);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
      (1 - t) * 0.85;
  });

  return (
    <group rotation={[EARTH_TILT_X, STATIC_ROTATION, 0]}>
      <mesh ref={ringRef} position={pos} quaternion={quat} visible={false}>
        <ringGeometry args={[0.5, 0.55, 64]} />
        <meshBasicMaterial
          color="#5db7ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Clock({ bus }: { bus: React.MutableRefObject<Bus> }) {
  const lastMs = useRef<number | null>(null);
  useFrame(() => {
    const now = performance.now();
    if (lastMs.current === null) lastMs.current = now;
    const dt = (now - lastMs.current) / 1000;
    lastMs.current = now;
    bus.current.elapsed += dt;
  });
  return null;
}

function Scene() {
  const bus = useRef<Bus>({ elapsed: 0 });
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 1.5, 2]} intensity={1.1} color="#fff5e0" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#5db7ff" />
      <directionalLight position={[0, 4, 0]} intensity={0.4} color="#5db7ff" />
      <Earth />
      <OsloMarker />
      <OsloPulse bus={bus} />
      <Clock bus={bus} />
    </>
  );
}

export default function InlineGlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 5.5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
