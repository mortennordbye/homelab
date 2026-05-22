"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
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

// Timeline (seconds)
const T_EARTH_IN = 0.25;
const T_ZOOM_START = 0.5;
const T_ZOOM_END = 1.7;
const T_PULSE = 1.5;
const T_FLASH = 1.8;
const T_COMPLETE = 2.0;

const RADIUS = 1.6;
const EARTH_TILT_X = 0.32;

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
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

type Bus = { elapsed: number; rotation: number };

function Earth({ bus }: { bus: React.MutableRefObject<Bus> }) {
  const [day, normal, specular] = useTexture([
    "/textures/earth-day.webp",
    "/textures/earth-normal.webp",
    "/textures/earth-specular.webp",
  ]);
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    specular.colorSpace = THREE.NoColorSpace;
    [day, normal, specular].forEach((t) => {
      t.anisotropy = 8;
    });
  }, [day, normal, specular]);

  useFrame(() => {
    const t = bus.current.elapsed;
    const rot = bus.current.rotation;
    if (groupRef.current) {
      groupRef.current.rotation.set(EARTH_TILT_X, rot, 0);
    }
    if (matRef.current) {
      matRef.current.opacity = clamp01(t / T_EARTH_IN);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 64]} />
        <meshStandardMaterial
          ref={matRef}
          map={day}
          normalMap={normal}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughnessMap={specular}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

function OsloMarker({ bus }: { bus: React.MutableRefObject<Bus> }) {
  const wrapRef = useRef<THREE.Group>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.005), []);

  useFrame(() => {
    const t = bus.current.elapsed;
    if (wrapRef.current) {
      wrapRef.current.rotation.set(EARTH_TILT_X, bus.current.rotation, 0);
    }
    if (dotRef.current) {
      const grow = clamp01((t - (T_PULSE - 0.2)) / 0.4);
      const s = easeOut(grow);
      dotRef.current.scale.set(s, s, s);
      (dotRef.current.material as THREE.MeshBasicMaterial).opacity = grow;
    }
  });

  return (
    <group ref={wrapRef}>
      <mesh ref={dotRef} position={pos}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color="#9fd6ff" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function OsloPulse({ bus, index }: { bus: React.MutableRefObject<Bus>; index: number }) {
  const wrapRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.005), []);
  const quat = useMemo(() => {
    const n = pos.clone().normalize();
    const up = new THREE.Vector3(0, 0, 1);
    return new THREE.Quaternion().setFromUnitVectors(up, n);
  }, [pos]);
  const start = T_PULSE + index * 0.12;

  useFrame(() => {
    const elapsed = bus.current.elapsed;
    if (wrapRef.current) {
      wrapRef.current.rotation.set(EARTH_TILT_X, bus.current.rotation, 0);
    }
    const t = elapsed - start;
    if (!ringRef.current) return;
    if (t < 0 || t > 0.4) {
      ringRef.current.visible = false;
      return;
    }
    ringRef.current.visible = true;
    const progress = clamp01(t / 0.4);
    // Keep the ring small so it doesn't dominate the close-up frame.
    const s = 0.01 + easeOut(progress) * 0.07;
    ringRef.current.scale.set(s, s, s);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
  });

  return (
    <group ref={wrapRef}>
      <mesh ref={ringRef} position={pos} quaternion={quat} visible={false}>
        <ringGeometry args={[0.5, 0.55, 64]} />
        <meshBasicMaterial color="#9fd6ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SceneCamera({ bus }: { bus: React.MutableRefObject<Bus> }) {
  const { camera } = useThree();

  useFrame(() => {
    const t = bus.current.elapsed;
    const rotation = bus.current.rotation;
    const tZoom = clamp01((t - T_ZOOM_START) / (T_ZOOM_END - T_ZOOM_START));
    const ease = easeInOut(tZoom);

    const local = latLonToVec3(OSLO.lat, OSLO.lon, RADIUS * 1.01);
    const m = new THREE.Matrix4()
      .makeRotationX(EARTH_TILT_X)
      .multiply(new THREE.Matrix4().makeRotationY(rotation));
    const osloWorld = local.clone().applyMatrix4(m);

    const startPos = new THREE.Vector3(0, 0.3, 5.5);
    const osloDir = osloWorld.clone().normalize();
    // Approach Oslo from roughly mid-latitudes (≈30°N) rather than from above
    // its own latitude. Looking down on a 60°N target from directly above puts
    // the polar ice cap within ~15° of frame centre and it dominates the
    // visual — the destination ends up reading as "the Arctic" instead of
    // "Norway". Coming in from the south lets Europe sit below Oslo and the
    // peninsula read clearly.
    const approachDir = osloDir.clone().add(new THREE.Vector3(0, -0.6, 0)).normalize();
    const endPos = approachDir.multiplyScalar(RADIUS + 1.8);
    const pos = startPos.clone().lerp(endPos, ease);
    camera.position.copy(pos);

    const lookStart = new THREE.Vector3(0, 0, 0);
    const lookEnd = osloWorld.clone();
    const look = lookStart.clone().lerp(lookEnd, ease);
    camera.lookAt(look);

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pc = camera as THREE.PerspectiveCamera;
      pc.fov = 50 - ease * 6;
      pc.updateProjectionMatrix();
    }
  });

  return null;
}

function Clock({
  bus,
  onFlash,
  onComplete,
  skipSignal,
}: {
  bus: React.MutableRefObject<Bus>;
  onFlash: () => void;
  onComplete: () => void;
  skipSignal: number;
}) {
  const startRef = useRef<number | null>(null);
  const flashedRef = useRef(false);
  const completedRef = useRef(false);
  const lastSkip = useRef(skipSignal);

  const startMsRef = useRef<number | null>(null);
  const lastMsRef = useRef<number | null>(null);
  useFrame(() => {
    const now = performance.now();
    if (startMsRef.current === null) startMsRef.current = now;
    if (lastMsRef.current === null) lastMsRef.current = now;
    const t = (now - startMsRef.current) / 1000;
    const wallDelta = (now - lastMsRef.current) / 1000;
    lastMsRef.current = now;
    bus.current.elapsed = t;
    const zoomT = clamp01((t - T_ZOOM_START) / (T_ZOOM_END - T_ZOOM_START));
    const rotSpeed = 0.22 * (1 - zoomT * 0.9);
    bus.current.rotation += rotSpeed * wallDelta;

    if (!flashedRef.current && t >= T_FLASH) {
      flashedRef.current = true;
      onFlash();
    }
    if (!completedRef.current && t >= T_COMPLETE) {
      completedRef.current = true;
      onComplete();
    }
  });

  useEffect(() => {
    if (skipSignal !== lastSkip.current && !completedRef.current) {
      lastSkip.current = skipSignal;
      if (!flashedRef.current) onFlash();
      completedRef.current = true;
      onComplete();
    }
  }, [skipSignal, onComplete, onFlash]);

  return null;
}

function Scene({
  onComplete,
  onFlash,
  skipSignal,
}: {
  onComplete: () => void;
  onFlash: () => void;
  skipSignal: number;
}) {
  // Start rotated so Europe / the North Atlantic faces the camera and Oslo
  // drifts into the centerline as the zoom begins (instead of opening on
  // North America with Oslo behind the limb).
  const bus = useRef<Bus>({ elapsed: 0, rotation: -1.95 });

  return (
    <>
      {/* Brighter ambient so the camera path always shows continents. */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 1.5, 2]} intensity={1.1} color="#fff5e0" />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} color="#5db7ff" />
      <directionalLight position={[0, 4, 0]} intensity={0.4} color="#9fd6ff" />
      <Stars radius={50} depth={30} count={2400} factor={3} fade speed={0.25} />
      <Earth bus={bus} />
      <OsloMarker bus={bus} />
      <OsloPulse bus={bus} index={0} />
      <OsloPulse bus={bus} index={1} />
      <SceneCamera bus={bus} />
      <Clock bus={bus} onFlash={onFlash} onComplete={onComplete} skipSignal={skipSignal} />
    </>
  );
}

export default function WelcomeGlobe({
  onComplete,
  onFlash,
  skipSignal = 0,
}: {
  onComplete: () => void;
  onFlash: () => void;
  skipSignal?: number;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 5.5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene onComplete={onComplete} onFlash={onFlash} skipSignal={skipSignal} />
      </Suspense>
    </Canvas>
  );
}
