"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { NO_MERGE } from "./StaticMerge";

/** Turntable radius; the town keeps inside it. */
const R = 0.115;
/** Ring road, centre line. */
const ROAD = 0.066;
/** Revolutions a second, as a microwave turntable goes. */
const TURN = 0.1;

const WINDOW = { color: "#ffcf7a", toneMapped: false } as const;
const ROOF = { color: "#2f2b29", roughness: 0.8, metalness: 0 } as const;

/** Wooden houses in the colours they are painted in Norway. */
const HOUSES: { a: number; r: number; w: number; d: number; h: number; colour: string }[] = [
  { a: 0.2, r: 0.095, w: 0.026, d: 0.02, h: 0.018, colour: "#8e2f25" },
  { a: 0.95, r: 0.098, w: 0.022, d: 0.018, h: 0.02, colour: "#e8e2d4" },
  { a: 1.7, r: 0.094, w: 0.03, d: 0.02, h: 0.016, colour: "#c9922e" },
  { a: 2.5, r: 0.097, w: 0.024, d: 0.02, h: 0.022, colour: "#8e2f25" },
  { a: 3.3, r: 0.095, w: 0.026, d: 0.018, h: 0.018, colour: "#e8e2d4" },
  { a: 4.05, r: 0.098, w: 0.022, d: 0.02, h: 0.02, colour: "#3f5a6b" },
  { a: 4.8, r: 0.094, w: 0.028, d: 0.02, h: 0.017, colour: "#c9922e" },
  { a: 5.55, r: 0.097, w: 0.024, d: 0.018, h: 0.021, colour: "#8e2f25" },
];
const TREES = [0.58, 1.33, 2.1, 2.9, 3.7, 4.42, 5.18, 5.95];
const LAMPS = [0.4, 2.0, 3.55, 5.1];

/** A gabled roof, unit sized: ridge along x, the triangle spanning z, apex
 *  0.6 up. Scaled per building as [length, height, width]. */
function useGable() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0, 0.6);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2);
    return g;
  }, []);
}

function House({ w, d, h, colour, gable }: { w: number; d: number; h: number; colour: string; gable: THREE.BufferGeometry }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={colour} roughness={0.85} />
      </mesh>
      {/* Roof ridge along the house's width, overhanging a little. */}
      <mesh geometry={gable} position={[0, h, 0]} scale={[w + 0.004, d * 0.9, d + 0.004]}>
        <meshStandardMaterial {...ROOF} />
      </mesh>
      {/* Lit windows on the front, facing the road. */}
      {[-w / 4, w / 4].map((x) => (
        <mesh key={x} position={[x, h * 0.55, d / 2 + 0.0004]}>
          <planeGeometry args={[0.0045, 0.0055]} />
          <meshBasicMaterial {...WINDOW} />
        </mesh>
      ))}
    </group>
  );
}

function Church({ gable }: { gable: THREE.BufferGeometry }) {
  return (
    <group>
      <mesh position={[0, 0.013, 0]}>
        <boxGeometry args={[0.022, 0.026, 0.036]} />
        <meshStandardMaterial color="#ece6da" roughness={0.85} />
      </mesh>
      {/* Turned so the ridge runs the length of the nave. */}
      <mesh geometry={gable} position={[0, 0.026, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.04, 0.022, 0.026]}>
        <meshStandardMaterial {...ROOF} />
      </mesh>
      {/* tower and spire at the west end */}
      <mesh position={[0, 0.024, -0.021]}>
        <boxGeometry args={[0.012, 0.048, 0.012]} />
        <meshStandardMaterial color="#ece6da" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, -0.021]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.0095, 0.026, 4]} />
        <meshStandardMaterial {...ROOF} />
      </mesh>
      {[-0.008, 0.004, 0.016].map((z) => (
        <mesh key={z} position={[0.0111, 0.015, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.004, 0.009]} />
          <meshBasicMaterial {...WINDOW} />
        </mesh>
      ))}
    </group>
  );
}

function Tree() {
  return (
    <group>
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.0014, 0.0014, 0.006, 6]} />
        <meshStandardMaterial color="#4a3526" roughness={0.9} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0.011 + i * 0.007, 0]}>
          <coneGeometry args={[0.0075 - i * 0.002, 0.012, 7]} />
          <meshStandardMaterial color="#2c4430" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.0006, 0.0006, 0.016, 5]} />
        <meshStandardMaterial color="#1d1d1f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0165, 0]}>
        <sphereGeometry args={[0.0018, 8, 6]} />
        <meshBasicMaterial {...WINDOW} />
      </mesh>
    </group>
  );
}

function Car() {
  return (
    <group>
      <mesh position={[0, 0.0035, 0]}>
        <boxGeometry args={[0.012, 0.004, 0.006]} />
        <meshStandardMaterial color="#b3362b" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-0.001, 0.0065, 0]}>
        <boxGeometry args={[0.006, 0.003, 0.0055]} />
        <meshStandardMaterial color="#1c2328" roughness={0.2} metalness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * A small Norwegian town on the microwave's turntable: wooden houses round a
 * ring road, a white church in the middle, spruces, a pond, lamps, and a car
 * doing laps. The plate turns while the door is open, as if it were running.
 *
 * NO_MERGE: inside Room's static merge the turning plate would be baked at
 * mount and never move.
 */
export function MicroTown({ position, running }: { position: [number, number, number]; running: boolean }) {
  const plate = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const lap = useRef(0);
  const gable = useGable();

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    speed.current = THREE.MathUtils.damp(speed.current, running ? 1 : 0, 2.5, delta);
    if (speed.current < 1e-4) return;
    if (plate.current) plate.current.rotation.y += speed.current * TURN * Math.PI * 2 * delta;
    // The car laps the other way round, a little faster than the plate turns.
    lap.current -= speed.current * 0.9 * delta;
    if (car.current) {
      car.current.position.set(Math.cos(lap.current) * ROAD, 0, Math.sin(lap.current) * ROAD);
      // Nose (+x) along the direction of travel.
      car.current.rotation.y = Math.PI / 2 - lap.current;
    }
  });

  return (
    <group position={position} userData={NO_MERGE}>
      <group ref={plate}>
        {/* the glass plate, and the green the town is built on */}
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.008, 32]} />
          <meshStandardMaterial color="#25262a" roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.0045, 0]}>
          <cylinderGeometry args={[R, R, 0.002, 32]} />
          <meshStandardMaterial color="#4f5b3c" roughness={0.95} />
        </mesh>
        <group position={[0, 0.0056, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0002, 0]}>
            <ringGeometry args={[ROAD - 0.008, ROAD + 0.008, 40]} />
            <meshStandardMaterial color="#38383a" roughness={0.9} />
          </mesh>
          {/* the pond, beside the church */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.03, 0.0003, 0.018]}>
            <circleGeometry args={[0.012, 20]} />
            <meshStandardMaterial color="#2c4a5a" roughness={0.1} metalness={0.3} />
          </mesh>
          <Church gable={gable} />
          {HOUSES.map((hs) => (
            <group
              key={hs.a}
              position={[Math.cos(hs.a) * hs.r, 0, Math.sin(hs.a) * hs.r]}
              // Front (+z) turned in toward the road.
              rotation={[0, -hs.a - Math.PI / 2, 0]}
            >
              <House w={hs.w} d={hs.d} h={hs.h} colour={hs.colour} gable={gable} />
            </group>
          ))}
          {TREES.map((a) => (
            <group key={a} position={[Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1]}>
              <Tree />
            </group>
          ))}
          {LAMPS.map((a) => (
            <group key={a} position={[Math.cos(a) * (ROAD + 0.012), 0, Math.sin(a) * (ROAD + 0.012)]}>
              <Lamp />
            </group>
          ))}
          <group ref={car} position={[ROAD, 0, 0]}>
            <Car />
          </group>
        </group>
      </group>
    </group>
  );
}
