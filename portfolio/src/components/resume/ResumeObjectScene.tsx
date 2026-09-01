"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FirstFrame } from "@/components/scene/FirstFrame";
import { makeOak } from "@/components/materials/oak";
import { makeSheetTexture, type SheetSpec } from "./sheet-art";

/**
 * The resume as an object: an A4 sheet under a brass clip. Composed like the
 * hero globe (DECISIONS.md §4, rig from §6); the desk is the hero's oak,
 * dimmed so it does not take the sheet's light. Clicking only takes the PDF
 * away — §4: a visitor never has to interact to see something.
 */

const CAM_Z = 4.15;
const FOV = 32;

function Lights() {
  const rakeTarget = useRef<THREE.Object3D>(null);
  const rake = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    if (rake.current && rakeTarget.current) rake.current.target = rakeTarget.current;
  }, []);

  return (
    <>
      <ambientLight color="#31251a" intensity={0.42} />
      <directionalLight
        color="#ffd49a"
        intensity={3}
        position={[-5.5, 5.5, 4.5]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={26}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0006}
        shadow-radius={3}
      />
      <directionalLight color="#6f9c72" intensity={0.5} position={[5, -0.5, 2]} />
      <spotLight
        ref={rake}
        color="#ffca8a"
        intensity={26}
        distance={22}
        angle={0.72}
        penumbra={0.85}
        decay={1.6}
        position={[-4.5, 2.2, 5.5]}
      />
      <object3D ref={rakeTarget} position={[1.2, -1.9, 0.5]} />
    </>
  );
}

/** Points the camera at the sheet rather than at the origin, so the clip sits
 *  in the upper third and the desk falls away below it. */
function Framing() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0.2, 3.5, CAM_Z);
    camera.lookAt(0, 0, 0.1);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Desk() {
  // Dimmed with a colour multiplier rather than by touching the rig: the light
  // is the hero's and stays the hero's, and dark oak is dark.
  const map = useMemo(() => makeOak(9), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial map={map} color="#5e5e5e" roughness={0.62} envMapIntensity={0.25} />
    </mesh>
  );
}

/** The clip: a plate, a hinge barrel and a jaw. Metal, so the environment map
 *  does the work the colour cannot — §5, brass with nothing to reflect is
 *  brown plastic, and CSS could not draw it for exactly that reason. */
function Clip() {
  return (
    <group position={[0.09, 0.012, -1.44]} rotation={[0, -0.07, 0]}>
      <mesh position={[0, 0.055, 0]} castShadow>
        <boxGeometry args={[1.16, 0.035, 0.44]} />
        <meshStandardMaterial color="#b98f4a" metalness={1} roughness={0.42} envMapIntensity={1.9} />
      </mesh>
      <mesh position={[0, 0.075, 0.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 1.2, 20]} />
        <meshStandardMaterial color="#b98f4a" metalness={1} roughness={0.42} envMapIntensity={1.9} />
      </mesh>
      <mesh position={[0, 0.028, -0.2]} rotation={[0.24, 0, 0]} castShadow>
        <boxGeometry args={[1.16, 0.028, 0.2]} />
        <meshStandardMaterial color="#b98f4a" metalness={1} roughness={0.42} envMapIntensity={1.9} />
      </mesh>
    </group>
  );
}

function Pen() {
  return (
    <group position={[0.86, 0.06, 1.16]} rotation={[0, 0, Math.PI / 2 - 0.34]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.052, 0.046, 1.42, 18]} />
        <meshStandardMaterial color="#181c18" roughness={0.3} metalness={0.15} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.09, 18]} />
        <meshStandardMaterial color="#b98f4a" metalness={1} roughness={0.42} envMapIntensity={1.9} />
      </mesh>
      <mesh position={[0, -0.85, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.046, 0.3, 18]} />
        <meshStandardMaterial color="#b98f4a" metalness={1} roughness={0.42} envMapIntensity={1.9} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.056, 0.056, 0.42, 18]} />
        <meshStandardMaterial color="#181c18" roughness={0.3} metalness={0.15} />
      </mesh>
    </group>
  );
}

/**
 * The top sheet, and the two under it. One sheet alone on a desk reads as a
 * decal; a small stack reads as paper.
 *
 * `taking` runs the sheet out of the clip and back. The download fires from
 * the facade, not here — the animation is the acknowledgement, not the action,
 * so a failed fetch never leaves the object mid-gesture.
 */
function Sheet({ spec, taking, onTake }: { spec: SheetSpec; taking: boolean; onTake: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const map = useMemo(() => makeSheetTexture(spec), [spec]);

  // The texture is rebuilt on every variant change, so the old one has to go
  // back or the GPU keeps one image per toggle for the life of the page.
  useEffect(() => () => map.dispose(), [map]);
  // frameloop is "demand", so nothing renders until something asks. Both a new
  // texture and a new gesture have to kick the first frame themselves.
  useEffect(() => invalidate(), [map, taking, invalidate]);

  const lift = useRef(0);
  useFrame(() => {
    const target = taking ? 1 : 0;
    const next = lift.current + (target - lift.current) * 0.12;
    if (Math.abs(next - lift.current) < 0.0004 && Math.abs(target - next) < 0.004) {
      // Stop where the sheet would move less than a pixel, §7.
      lift.current = target;
      if (ref.current) apply(ref.current, target);
      return;
    }
    lift.current = next;
    if (ref.current) apply(ref.current, next);
    invalidate();
  });

  return (
    <group>
      {[
        [-0.03, 0.02, -0.055],
        [0.02, 0.008, 0.04],
      ].map(([dx, dr, dz], i) => (
        <mesh
          key={i}
          position={[dx, -0.004 - i * 0.011, dz]}
          rotation={[0, -0.07 + dr, 0]}
          castShadow
        >
          <boxGeometry args={[2.1, 0.01, 2.97]} />
          <meshStandardMaterial color="#dfd2b8" roughness={0.95} />
        </mesh>
      ))}

      <mesh
        ref={ref}
        position={[0, 0.006, 0]}
        rotation={[0, -0.07, 0]}
        castShadow
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          onTake();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <boxGeometry args={[2.1, 0.012, 2.97]} />
        {/* Face up is index 2; the cut edges take plain stock so the sheet is
            paper all the way through rather than a printed lid on a box. */}
        <meshStandardMaterial attach="material-0" color="#e0d4ba" roughness={0.95} />
        <meshStandardMaterial attach="material-1" color="#e0d4ba" roughness={0.95} />
        <meshStandardMaterial attach="material-2" map={map} roughness={0.92} />
        <meshStandardMaterial attach="material-3" color="#d3c6ac" roughness={0.95} />
        <meshStandardMaterial attach="material-4" color="#e0d4ba" roughness={0.95} />
        <meshStandardMaterial attach="material-5" color="#e0d4ba" roughness={0.95} />
      </mesh>
    </group>
  );
}

function apply(mesh: THREE.Mesh, t: number) {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  mesh.position.y = 0.006 + e * 0.55;
  mesh.position.z = e * 0.5;
  mesh.rotation.x = -e * 0.34;
}

export default function ResumeObjectScene({
  spec,
  taking,
  onTake,
  onReady,
}: {
  spec: SheetSpec;
  taking: boolean;
  onTake: () => void;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ position: [0.2, 3.5, CAM_Z], fov: FOV }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        {/* Baked once. Deliberately dim: turned up, the large matte desk lifts
            with everything else and the whole frame goes foggy. */}
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={0.9} color="#ffd9a8" position={[-4, 3, 3]} scale={[8, 8, 1]} />
          <Lightformer intensity={0.22} color="#6f9c72" position={[5, -1, 2]} scale={[6, 6, 1]} />
          <mesh scale={60}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color="#1a140d" side={THREE.BackSide} />
          </mesh>
        </Environment>
        <Lights />
        <Framing />
        <Desk />
        <Sheet spec={spec} taking={taking} onTake={onTake} />
        <Clip />
        <Pen />
        <FirstFrame onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
