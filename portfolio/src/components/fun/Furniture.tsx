"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { OAK } from "@/components/materials/oak";
import type { Surface } from "@/components/materials/surface";

/**
 * The living room, from the three pieces marked on the floor plan: the TV
 * bench on the west wall, the sofa facing it, and the desk in the south-west
 * corner (the desk lives in Room.tsx, where the monitors read its numbers).
 *
 * Everything is built at its real size in metres. Relative scale is what makes
 * a room believable; detail is not.
 */

/** Wool, the fourth thing in a room after wood, brass and paper. Kept a warm
 *  grey-green so it sits between the oak and the ground without becoming a
 *  fifth material. */
const WOOL = "#3d423a";
const WOOL_HI = "#474d43";

/** The bedroom's two soft colours, off the photograph of the real room: an
 *  olive-khaki fitted sheet and a bleached linen for duvet and pillows. Kept
 *  darker than the real cotton so the bed does not become the brightest thing
 *  in a flat lit by three lamps. */
const SHEET = "#3b3829";
const LINEN = "#7a7361";

/**
 * The sofa. Faces west at the TV, which is the whole reason it is where it is.
 * Built as a plinth, a back, two arms and loose cushions rather than one
 * rounded box: a sofa is mostly the shadow lines between those parts.
 */
export function Sofa({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const L = 1.9;
  const D = 0.9;
  const SEAT = 0.42;

  return (
    <group position={position} rotation={rotation}>
      {/* plinth, set in from the body so the sofa reads as standing on feet */}
      <RoundedBox
        position={[0, 0.07, 0]}
        args={[L - 0.12, 0.14, D - 0.12]}
        radius={0.02}
        smoothness={3}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial color={OAK.back} roughness={0.7} metalness={0} />
      </RoundedBox>

      {/* seat base */}
      <RoundedBox
        position={[0, SEAT - 0.09, 0]}
        args={[L, 0.18, D]}
        radius={0.03}
        smoothness={4}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial color={WOOL} roughness={0.94} metalness={0} />
      </RoundedBox>

      {/* back, leaning very slightly */}
      <RoundedBox
        position={[0, SEAT + 0.21, -D / 2 + 0.11]}
        rotation={[-0.05, 0, 0]}
        args={[L, 0.62, 0.2]}
        radius={0.035}
        smoothness={4}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial color={WOOL} roughness={0.94} metalness={0} />
      </RoundedBox>

      {/* arms */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          position={[s * (L / 2 - 0.09), SEAT + 0.08, 0.02]}
          args={[0.18, 0.34, D - 0.06]}
          radius={0.045}
          smoothness={4}
          castShadow={false}
          receiveShadow
        >
          <meshStandardMaterial color={WOOL_HI} roughness={0.94} metalness={0} />
        </RoundedBox>
      ))}

      {/* two seat cushions, with a gap so the join reads */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          position={[s * (L / 4 - 0.02), SEAT + 0.06, 0.05]}
          args={[L / 2 - 0.24, 0.12, D - 0.3]}
          radius={0.035}
          smoothness={4}
          castShadow={false}
          receiveShadow
        >
          <meshStandardMaterial color={WOOL_HI} roughness={0.95} metalness={0} />
        </RoundedBox>
      ))}
    </group>
  );
}

/**
 * The television. Its screen is off: a dark panel takes the room's own light
 * and reads as glass, where an emissive one would be a second lit rectangle
 * competing with the lamps.
 *
 * It stands on the homelab cabinet rather than on a bench of its own — in the
 * flat those are the same piece of furniture.
 */
/**
 * Where the glass sits inside the television, so the live dashboard can be put
 * on the panel instead of carrying a second set of numbers that has to agree
 * with this one. `z` is the front face of the glass, in the set's own frame.
 */
export const TV_PANEL = { y: 0.16 + 0.345, w: 1.22, h: 0.69, z: 0.019 };

export function Television({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox position={[0, 0.012, 0]} args={[0.42, 0.024, 0.2]} radius={0.006} smoothness={3}>
        <meshStandardMaterial color="#16181a" roughness={0.5} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.06, 0.14, 0.03]} />
        <meshStandardMaterial color="#16181a" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* 55" panel: 1.22 x 0.69 */}
      <group position={[0, TV_PANEL.y, 0]}>
        <RoundedBox args={[TV_PANEL.w, TV_PANEL.h, 0.035]} radius={0.004} smoothness={3} castShadow={false}>
          <meshStandardMaterial color="#0e1012" roughness={0.44} metalness={0.5} />
        </RoundedBox>
        {/* the glass, a hair proud of the bezel so it catches the lamp */}
        <mesh position={[0, 0, TV_PANEL.z]}>
          <planeGeometry args={[TV_PANEL.w - 0.03, TV_PANEL.h - 0.025]} />
          <meshStandardMaterial
            color="#0a0c0e"
            roughness={0.12}
            metalness={0.65}
            envMapIntensity={1.6}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Drawer heights as fractions of the carcass, and the centre of each as a
 *  fraction from the bottom. Top drawer shallow, two deep ones under it. */
const DRAWERS: [number, number][] = [
  [0.4, 0.2],
  [0.36, 0.58],
  [0.24, 0.88],
];

/**
 * A run of kitchen units: plinth, carcass, drawer fronts and an oak worktop.
 * Built as one component because the flat has two runs of it at right angles
 * and they have to be the same kitchen.
 *
 * Handleless, because the real one is: the fronts are separated by shadow gaps
 * and nothing else, and a rail of pulls across them reads as a different
 * kitchen entirely. `doors` counts bays, each of which is a stack of drawers.
 */
export function KitchenRun({
  position,
  rotation = [0, 0, 0],
  length,
  oak,
  doors = 3,
  children,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
  oak: Surface;
  doors?: number;
  children?: React.ReactNode;
}) {
  const H = 0.9;
  const D = 0.6;
  const TOP = 0.04;
  const PLINTH = 0.1;
  const bodyH = H - PLINTH - TOP;

  return (
    <group position={position} rotation={rotation}>
      {/* plinth, set back so the units read as standing off the floor */}
      <mesh position={[0, PLINTH / 2, -0.03]} receiveShadow>
        <boxGeometry args={[length, PLINTH, D - 0.06]} />
        <meshStandardMaterial color={OAK.back} roughness={0.8} metalness={0} />
      </mesh>

      {/* carcass */}
      <mesh position={[0, PLINTH + bodyH / 2, 0]} receiveShadow>
        <boxGeometry args={[length, bodyH, D]} />
        <meshStandardMaterial {...oak} color={OAK.back} roughness={0.7} metalness={0} />
      </mesh>

      {/* Three drawers per bay, the proportions the real run has: a shallow one
          at the top and two deep ones under it. */}
      {Array.from({ length: doors }, (_, i) => {
        const w = length / doors;
        const x = -length / 2 + w * (i + 0.5);
        return DRAWERS.map(([frac, at], j) => (
          <mesh
            key={`${i}-${j}`}
            position={[x, PLINTH + bodyH * at, D / 2 + 0.004]}
          >
            <planeGeometry args={[w - 0.016, bodyH * frac - 0.012]} />
            <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.62} metalness={0} />
          </mesh>
        ));
      })}

      {/* Worktop in oak, proud of the carcass so it casts its own line. The
          light top over dark fronts is the one thing that makes this read as
          the real kitchen rather than as a row of cupboards. */}
      <RoundedBox
        position={[0, H - TOP / 2, 0.012]}
        args={[length + 0.02, TOP, D + 0.024]}
        radius={0.005}
        smoothness={3}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial {...oak} color={OAK.case} roughness={0.5} metalness={0} />
      </RoundedBox>

      {children}
    </group>
  );
}

/**
 * The fridge-freezer column that ends the run at the window end. Full height,
 * and deeper than the base units, which is why it reads as the bookend it is
 * rather than as more of the same run.
 */
export function FridgeColumn({
  position,
  rotation = [0, 0, 0],
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
}) {
  const W = 0.6;
  const H = 2.44;
  const D = 0.65;
  const PLINTH = 0.1;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, H / 2, 0]} receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial {...oak} color={OAK.back} roughness={0.72} metalness={0} />
      </mesh>

      {/* Three fronts: the cupboard over the top, then fridge over freezer. */}
      {([
        [PLINTH, 1.32],
        [1.34, 0.72],
        [2.08, 0.34],
      ] as const).map(([y0, h]) => (
        <mesh key={y0} position={[0, y0 + h / 2, D / 2 + 0.005]}>
          <planeGeometry args={[W - 0.016, h - 0.014]} />
          <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.6} metalness={0} />
        </mesh>
      ))}

      {/* the compressor grille at the plinth, the one vent on the whole run */}
      <mesh position={[0, PLINTH / 2, D / 2 + 0.006]}>
        <planeGeometry args={[W - 0.12, PLINTH - 0.04]} />
        <meshStandardMaterial color="#1b1712" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * The wall units over the run, and the strip under them that lights the
 * worktop. The strip is the fitting; the light it stands for is declared in
 * Room.tsx beside the run, because a lit worktop with no visible source is the
 * one thing that makes a kitchen look rendered rather than photographed.
 */
export function WallUnits({
  position,
  rotation = [0, 0, 0],
  length,
  oak,
  doors = 3,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
  oak: Surface;
  doors?: number;
}) {
  const BOTTOM = 1.45;
  const TOP = 2.44;
  const H = TOP - BOTTOM;
  const D = 0.35;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, BOTTOM + H / 2, 0]} receiveShadow>
        <boxGeometry args={[length, H, D]} />
        <meshStandardMaterial {...oak} color={OAK.back} roughness={0.72} metalness={0} />
      </mesh>
      {Array.from({ length: doors }, (_, i) => {
        const w = length / doors;
        return (
          <mesh
            key={i}
            position={[-length / 2 + w * (i + 0.5), BOTTOM + H / 2, D / 2 + 0.005]}
          >
            <planeGeometry args={[w - 0.016, H - 0.016]} />
            <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.6} metalness={0} />
          </mesh>
        );
      })}
      {/* the strip itself, tucked behind the front edge so you see the light
          on the worktop and not the diode */}
      <mesh position={[0, BOTTOM - 0.006, D / 2 - 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length - 0.08, 0.02]} />
        <meshBasicMaterial color="#ffd9a0" />
      </mesh>
    </group>
  );
}

/** The oven, under the hob. Sits in a bay of the run, so it is placed as a
 *  child of it in the run's own frame. */
export function Oven({ position }: { position: [number, number, number] }) {
  const W = 0.6;
  const H = 0.59;
  const Y = 0.24;
  const Z = 0.3;

  return (
    <group position={position}>
      <mesh position={[0, Y + H / 2, Z + 0.008]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#141516" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* glass, inset, so the door reads as a frame around a window */}
      <mesh position={[0, Y + H / 2 - 0.05, Z + 0.01]}>
        <planeGeometry args={[W - 0.07, H - 0.19]} />
        <meshStandardMaterial color="#0b0c0d" roughness={0.14} metalness={0.6} envMapIntensity={1.3} />
      </mesh>
      {/* the clock, the only lit thing below worktop height */}
      <mesh position={[0.03, Y + H - 0.075, Z + 0.011]}>
        <planeGeometry args={[0.11, 0.022]} />
        <meshBasicMaterial color="#c8d6cb" />
      </mesh>
      {/* handle bar across the top of the door */}
      <mesh position={[0, Y + H - 0.02, Z + 0.032]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, W - 0.04, 12]} />
        <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

/** The extractor, a slim hood slung under the wall units over the hob. */
export function Extractor({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.055, 0.3]} />
        <meshStandardMaterial color="#141516" roughness={0.36} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.03, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshStandardMaterial color="#0d0e0f" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** The microwave at the far end of the worktop. */
export function Microwave({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.46;
  const H = 0.27;
  const D = 0.34;

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, H / 2, 0]} args={[W, H, D]} radius={0.008} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color="#7c7668" roughness={0.5} metalness={0.06} />
      </RoundedBox>
      <mesh position={[-0.07, H / 2, D / 2 + 0.003]}>
        <planeGeometry args={[W - 0.17, H - 0.06]} />
        <meshStandardMaterial color="#17181a" roughness={0.22} metalness={0.55} />
      </mesh>
      {[0.06, -0.01].map((dy) => (
        <mesh key={dy} position={[0.16, H / 2 + dy, D / 2 + 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.012, 16]} />
          <meshStandardMaterial color="#a49d8e" roughness={0.45} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The sink, sat into a worktop whose top is y 0.9. Drawn on the surface the
 * way the hob is rather than sunk below it: the worktop is a solid slab with no
 * hole in it, so anything modelled under the top is simply buried.
 */
export function Sink({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* the steel surround, flush with the top */}
      <mesh position={[0, 0.896, 0]} receiveShadow>
        <boxGeometry args={[0.46, 0.014, 0.4]} />
        <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />
      </mesh>
      {/* the bowl, a dark face inside the surround so it reads as a hole */}
      <mesh position={[0, 0.904, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.38, 0.3]} />
        <meshStandardMaterial color="#4a4f53" roughness={0.42} metalness={0.7} />
      </mesh>
      {/* mixer: a column and a curved spout, in brass */}
      <mesh position={[0, 1.0, -0.2]}>
        <cylinderGeometry args={[0.018, 0.02, 0.22, 14]} />
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
      </mesh>
      <mesh position={[0, 1.11, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.017, 10, 24, Math.PI / 2]} />
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
      </mesh>
    </group>
  );
}

/** Four induction rings printed on the worktop, and nothing else. A hob is a
 *  sheet of black glass; modelling knobs it does not have reads as a cooker. */
export function Hob({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.895, 0]} receiveShadow>
        <boxGeometry args={[0.58, 0.012, 0.5]} />
        <meshStandardMaterial color="#101113" roughness={0.18} metalness={0.4} envMapIntensity={1.2} />
      </mesh>
      {[
        [-0.14, -0.11],
        [0.14, -0.11],
        [-0.14, 0.12],
        [0.14, 0.12],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.902, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.065, 0.072, 32]} />
          <meshBasicMaterial color="#3a3d41" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The hot water tank the plan marks VVB, standing inside the kitchen run.
 *
 * Three clearances, all of which it broke at some point: 0.84 tall, because the
 * worktop's underside is at 0.86; 0.25 across, and set back, because the plinth
 * is recessed 0.03 and a drum flush with the carcass bulges out under the
 * doors; and no lid, because a disc at 0.89 shares a plane with the worktop's
 * top face and z-fights it into a flickering white ellipse.
 */
export function WaterTank({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow={false} receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.84, 24]} />
        <meshStandardMaterial color="#b9bcbe" roughness={0.46} metalness={0.35} />
      </mesh>
    </group>
  );
}

export function Bed({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 1.4;
  const L = 2.0;

  return (
    <group position={position} rotation={rotation}>
      {/* divan base, upholstered to the floor */}
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[W, 0.34, L]} />
        <meshStandardMaterial color="#3b382e" roughness={0.94} metalness={0} />
      </mesh>
      {/* mattress under a fitted sheet, proud of the base on every side */}
      <RoundedBox position={[0, 0.44, 0]} args={[W + 0.03, 0.2, L + 0.03]} radius={0.035} smoothness={4} receiveShadow>
        <meshStandardMaterial color={SHEET} roughness={0.95} metalness={0} />
      </RoundedBox>

      {/* Duvet, thrown over the far long side and left rumpled: three offset
          masses rather than one slab, since a duvet is the only soft thing in
          the flat and a single box makes it read as a second mattress. */}
      <RoundedBox position={[W * 0.2, 0.585, 0.06]} args={[W * 0.62, 0.12, L * 0.8]} radius={0.05} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.97} metalness={0} />
      </RoundedBox>
      <RoundedBox
        position={[W * 0.28, 0.66, -L * 0.05]}
        rotation={[0, 0.22, 0.07]}
        args={[W * 0.42, 0.17, L * 0.34]}
        radius={0.08}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color={LINEN} roughness={0.97} metalness={0} />
      </RoundedBox>
      <RoundedBox
        position={[W * 0.12, 0.6, L * 0.36]}
        rotation={[0, -0.3, 0]}
        args={[W * 0.66, 0.13, L * 0.2]}
        radius={0.06}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color={LINEN} roughness={0.97} metalness={0} />
      </RoundedBox>

      {/* two pillows against the head end, the far one shoved up on the duvet */}
      <RoundedBox position={[-W * 0.23, 0.6, -L / 2 + 0.24]} rotation={[0, 0.08, 0]} args={[0.62, 0.14, 0.38]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.96} metalness={0} />
      </RoundedBox>
      <RoundedBox position={[W * 0.24, 0.63, -L / 2 + 0.27]} rotation={[0, -0.14, 0.06]} args={[0.6, 0.15, 0.36]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.96} metalness={0} />
      </RoundedBox>
    </group>
  );
}

/** Sanitaryware. Porcelain is the one place white belongs in the flat, and it
 *  is kept warm rather than pure so it does not read as a light leak. */
const PORCELAIN = { color: "#ddd8cd", roughness: 0.28, metalness: 0.04 };

/**
 * The wall-hung WC and the duct it hangs on, as one piece: in the real bathroom
 * the cistern is buried in the boxing and the only thing on the wall is the
 * flush plate, so a separate exposed cistern would be modelling a different
 * toilet.
 *
 * Origin at the front face of the duct, on the floor, with local +z pointing
 * into the room.
 */
export function Toilet({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const DUCT_W = 0.55;
  const DUCT_D = 0.2;
  const DUCT_H = 1.05;

  return (
    <group position={position} rotation={rotation}>
      {/* the boxing, tiled like the wall it continues */}
      <mesh position={[0, DUCT_H / 2, -DUCT_D / 2]} receiveShadow>
        <boxGeometry args={[DUCT_W, DUCT_H, DUCT_D]} />
        <meshStandardMaterial color="#575049" roughness={0.6} metalness={0} />
      </mesh>
      {/* flush plate */}
      <mesh position={[0, 0.92, 0.004]}>
        <boxGeometry args={[0.2, 0.14, 0.012]} />
        <meshStandardMaterial {...PORCELAIN} roughness={0.34} />
      </mesh>

      {/* pan, cantilevered off the duct with nothing under it */}
      <RoundedBox position={[0, 0.44, 0.24]} args={[0.36, 0.17, 0.48]} radius={0.07} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial {...PORCELAIN} />
      </RoundedBox>
      {/* The opening, elongated along the pan. At the full width of the bowl a
          flat ring reads as a black hole cut in the porcelain rather than as a
          toilet, so it is kept small and dark-warm instead of black. */}
      <mesh position={[0, 0.53, 0.25]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.35, 1]}>
        <ringGeometry args={[0.055, 0.115, 24]} />
        <meshStandardMaterial color="#4f483c" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * The vanity: a run of drawers, a countertop basin cut into the top, and the
 * mirror over it. Origin at the wall face, local +z into the room, so it is
 * placed the same way the duct and the wall units are.
 */
export function Vanity({
  position,
  rotation = [0, 0, 0],
  length,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
}) {
  const H = 0.85;
  const D = 0.35;
  const PLINTH = 0.08;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, PLINTH / 2, D / 2 - 0.02]} receiveShadow>
        <boxGeometry args={[length, PLINTH, D - 0.04]} />
        <meshStandardMaterial color="#3a352f" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, PLINTH + (H - PLINTH) / 2, D / 2]} receiveShadow>
        <boxGeometry args={[length, H - PLINTH, D]} />
        <meshStandardMaterial {...PORCELAIN} roughness={0.5} />
      </mesh>
      {/* two drawers, split by a shadow gap and no handle, as fitted */}
      {[0.3, 0.72].map((f) => (
        <mesh key={f} position={[0, PLINTH + (H - PLINTH) * f, D + 0.004]}>
          <planeGeometry args={[length - 0.014, (H - PLINTH) * 0.4 - 0.012]} />
          <meshStandardMaterial {...PORCELAIN} roughness={0.42} />
        </mesh>
      ))}

      {/* the top, with the bowl sunk into it */}
      <RoundedBox position={[0, H + 0.05, D / 2]} args={[length + 0.02, 0.1, D + 0.02]} radius={0.012} smoothness={3} receiveShadow>
        <meshStandardMaterial {...PORCELAIN} roughness={0.28} />
      </RoundedBox>
      {/* The bowl, drawn on top of the slab rather than cut into it. The
          counter's upper face is at H + 0.1, and anything modelled below that
          is buried in it — the same way the kitchen sink went missing. */}
      <mesh position={[0.06, H + 0.102, D / 2 + 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length * 0.56, D * 0.62]} />
        <meshStandardMaterial color="#a09889" roughness={0.32} metalness={0.05} />
      </mesh>
      <mesh position={[0.06, H + 0.105, D / 2 + 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.016, 0.03, 18]} />
        <meshStandardMaterial color="#6f7478" roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* brass mixer, the same metal as every other tap in the flat */}
      <mesh position={[0.06, H + 0.19, 0.11]}>
        <cylinderGeometry args={[0.016, 0.018, 0.18, 14]} />
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
      </mesh>
      <mesh position={[0.06, H + 0.28, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.015, 10, 20, Math.PI / 2]} />
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
      </mesh>

      {/* Mirror, flat to the wall. Kept a dim grey rather than the near-black
          the windows use: this one is at eye height and an arm's length away,
          and at that size a black rectangle reads as a hole in the wall. */}
      <mesh position={[0, 1.52, 0.012]}>
        <boxGeometry args={[length - 0.06, 0.78, 0.02]} />
        <meshStandardMaterial color="#4a5057" roughness={0.05} metalness={0.55} envMapIntensity={2.4} />
      </mesh>
    </group>
  );
}

/** The cabinet high on the wall past the WC. Origin at the wall face. */
export function WallCabinet({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.5;
  const H = 0.6;
  const D = 0.18;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, D / 2]} receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial {...PORCELAIN} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, D + 0.004]}>
        <planeGeometry args={[W - 0.016, H - 0.016]} />
        <meshStandardMaterial {...PORCELAIN} roughness={0.38} />
      </mesh>
    </group>
  );
}

/**
 * A shower corner: a quadrant tray, the curved screen that closes it and a
 * riser with a rain head and a handset. Origin at the corner where the two
 * walls meet, with the enclosure filling the quadrant toward local +x and +z —
 * placed off the corner rather than off a centre, because the corner is the
 * thing it has to line up with.
 */
export function Shower({
  position,
  rotation = [0, 0, 0],
  radius = 0.85,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
}) {
  const R = radius;
  const HEIGHT = 1.9;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, 0.06, 24, 1, false, 0, Math.PI / 2]} />
        <meshStandardMaterial {...PORCELAIN} />
      </mesh>

      {/* the curved screen */}
      <mesh position={[0, 0.06 + HEIGHT / 2, 0]}>
        <cylinderGeometry args={[R, R, HEIGHT, 28, 1, true, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#cfe0e4"
          transparent
          opacity={0.16}
          roughness={0.06}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* head and foot rails, and a post at each end of the arc */}
      {[0.075, 0.06 + HEIGHT].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {/* A torus sweeps from +x toward +y; laid flat, that is +x to +z, the
              same quadrant the tray and the screen occupy. */}
          <torusGeometry args={[R, 0.012, 8, 24, Math.PI / 2]} />
          <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      {([[0, R], [R, 0]] as const).map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.06 + HEIGHT / 2, z]}>
          <cylinderGeometry args={[0.014, 0.014, HEIGHT, 10]} />
          <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}

      {/* riser in the corner: a rain head on the gooseneck, a handset below */}
      <mesh position={[0.1, 1.05, 0.1]}>
        <cylinderGeometry args={[0.014, 0.014, 1.9, 12]} />
        <meshStandardMaterial color="#8d9298" roughness={0.28} metalness={0.9} />
      </mesh>
      <mesh position={[0.2, 1.98, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.022, 20]} />
        <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0.16, 1.28, 0.16]} rotation={[0.5, -Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.048, 0.03, 0.05, 16]} />
        <meshStandardMaterial color="#8d9298" roughness={0.34} metalness={0.85} />
      </mesh>
    </group>
  );
}

/** The mat on the bathroom floor, the one soft thing in a tiled room. */
export function BathMat({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0.011, 0]} args={[0.5, 0.022, 0.9]} radius={0.008} smoothness={3} receiveShadow>
        <meshStandardMaterial color="#6d6252" roughness={0.98} metalness={0} />
      </RoundedBox>
    </group>
  );
}

/** The washing machine the plan marks VM. */
export function WashingMachine({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox position={[0, 0.42, 0]} args={[0.6, 0.84, 0.6]} radius={0.012} smoothness={3} receiveShadow>
        <meshStandardMaterial color="#c8c9c6" roughness={0.42} metalness={0.12} />
      </RoundedBox>
      {/* door, and the glass in it */}
      <mesh position={[0, 0.44, 0.302]}>
        <cylinderGeometry args={[0.21, 0.21, 0.02, 28]} />
        <meshStandardMaterial color="#b4b6b3" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.44, 0.313]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.012, 28]} />
        <meshPhysicalMaterial color="#1b1f22" roughness={0.08} metalness={0.3} envMapIntensity={1.4} />
      </mesh>
      {/* fascia */}
      <mesh position={[0, 0.76, 0.303]}>
        <boxGeometry args={[0.56, 0.09, 0.006]} />
        <meshStandardMaterial color="#2c2e30" roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * The bedroom storage, which in the real room is one continuous run down the
 * long wall: floor-to-ceiling sliding doors at the door end, then wall-hung
 * units bridging over the head of the bed with a ledge under them.
 *
 * Split into two components rather than one, because the two halves stand at
 * different depths and only the tall half has a floor footprint to collide
 * against.
 */

/** Anodised aluminium: the sliding-door frames and nothing else in the flat. */
const ANODISED = { color: "#8d9095", roughness: 0.32, metalness: 0.85 };

/**
 * The tall half: two mirrored sliding doors in an aluminium frame, facing the
 * bedroom door. One reflector plane spans both leaves and the centre stile is
 * drawn over it — two reflector meshes would cost two render targets for a
 * seam nobody can see.
 */
export function MirrorWardrobe({
  position,
  rotation = [0, 0, 0],
  width,
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  oak: Surface;
}) {
  const H = 2.36;
  const D = 0.58;
  const F = 0.035;

  return (
    <group position={position} rotation={rotation}>
      {/* carcass */}
      <mesh position={[0, H / 2, 0]} receiveShadow>
        <boxGeometry args={[width, H, D]} />
        <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.72} metalness={0} />
      </mesh>

      {/* The mirror. Low resolution and heavily blurred: it exists to double
          the room's depth and hand back the lamps, not to be looked into. */}
      <mesh position={[0, H / 2, D / 2 + 0.004]}>
        <planeGeometry args={[width - F * 2, H - F * 2]} />
        <MeshReflectorMaterial
          resolution={128}
          mirror={0.82}
          blur={[220, 90]}
          mixBlur={1.1}
          mixStrength={1.5}
          depthScale={0.2}
          color="#7d827e"
          roughness={0.22}
          metalness={0.7}
        />
      </mesh>

      {/* Frame: head and foot track, two stiles, and the meeting stile down the
          middle where the two leaves pass each other. */}
      {[H - F / 2, F / 2].map((y) => (
        <mesh key={y} position={[0, y, D / 2 + 0.018]}>
          <boxGeometry args={[width, F, 0.036]} />
          <meshStandardMaterial {...ANODISED} />
        </mesh>
      ))}
      {[-1, 0, 1].map((s) => (
        <mesh key={s} position={[(s * (width - F)) / 2, H / 2, D / 2 + 0.018]}>
          <boxGeometry args={[F, H, 0.036]} />
          <meshStandardMaterial {...ANODISED} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The wall-hung half: two rows of handleless doors over the bed, with a shallow
 * ledge under them. `bottom` clears the pillows; anything lower and the bed
 * stops looking like somewhere you would sit up.
 */
export function OverbedUnits({
  position,
  rotation = [0, 0, 0],
  width,
  oak,
  cols = 3,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  oak: Surface;
  cols?: number;
}) {
  const bottom = 1.3;
  const top = 2.36;
  const H = top - bottom;
  const D = 0.38;
  const w = width / cols;
  const rowH = H / 2;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, bottom + H / 2, 0]} receiveShadow>
        <boxGeometry args={[width, H, D]} />
        <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.72} metalness={0} />
      </mesh>

      {/* Doors as planes on the face, separated by a reveal. Push-open in the
          real room, so no handles — the shadow gaps are the whole detail. */}
      {Array.from({ length: cols * 2 }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <mesh
            key={i}
            position={[
              -width / 2 + w * (col + 0.5),
              bottom + rowH * (row + 0.5),
              D / 2 + 0.005,
            ]}
          >
            <planeGeometry args={[w - 0.016, rowH - 0.016]} />
            <meshStandardMaterial {...oak} color={OAK.case} roughness={0.6} metalness={0} />
          </mesh>
        );
      })}

      {/* The ledge under the units: where the tissues, the tape and the pen
          live in the real room, and the reason the bed needs no headboard. */}
      <mesh position={[0, 1.02, -D / 2 + 0.08]} receiveShadow>
        <boxGeometry args={[width, 0.04, 0.16]} />
        <meshStandardMaterial {...oak} color={OAK.case} roughness={0.58} metalness={0} />
      </mesh>
    </group>
  );
}

/** Moulded white plastic. Warm rather than pure, like the porcelain, so the
 *  fan does not punch a hole in a room lit by three warm lamps. */
const PLASTIC = { color: "#a9a49a", roughness: 0.44, metalness: 0.02 };

/**
 * The pedestal fan that stands at the foot of the bed all summer. The grille is
 * one double-sided translucent disc between two rings rather than modelled
 * wire: at any distance you can stand from it in a 2.3m room, the silhouette is
 * the whole read.
 */
export function Fan({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const HUB = 0.98;
  const R = 0.19;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.17, 0.18, 0.03, 20]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>
      <mesh position={[0, (HUB - 0.15) / 2 + 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.021, 0.026, HUB - 0.18, 12]} />
        <meshStandardMaterial {...PLASTIC} />
      </mesh>

      {/* head: motor behind, three blades, and a guard built as two rims, a
          shallow open cylinder and a face with concentric rings. Wire is what a
          fan is read by, and none of it survives as geometry at this size. */}
      <group position={[0, HUB, 0]} rotation={[0.14, 0, 0]}>
        <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.058, 0.17, 16]} />
          <meshStandardMaterial {...PLASTIC} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0, -0.03]} rotation={[0.32, 0, (i * Math.PI * 2) / 3]}>
            <planeGeometry args={[0.26, 0.115]} />
            <meshStandardMaterial {...PLASTIC} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, 0.16, 26, 1, true]} />
          <meshStandardMaterial {...PLASTIC} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <circleGeometry args={[R, 26]} />
          <meshStandardMaterial {...PLASTIC} transparent opacity={0.42} side={THREE.DoubleSide} />
        </mesh>
        {([[R, 0.016, 0.06], [R, 0.014, -0.1], [0.125, 0.008, 0.062], [0.062, 0.008, 0.062]] as const).map(
          ([r, tube, z]) => (
            <mesh key={`${r}-${z}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, tube, 8, 26]} />
              <meshStandardMaterial {...PLASTIC} />
            </mesh>
          ),
        )}
      </group>
    </group>
  );
}

/**
 * The print over the bed, drawn rather than fetched: a poster is two colour
 * fields and a caption, and a 40KB image request for that is not worth a round
 * trip on a page already loading four PBR surfaces.
 */
function posterTexture() {
  const w = 384;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;

  x.fillStyle = "#efeae1";
  x.fillRect(0, 0, w, h);

  const art = { x: 40, y: 44, w: w - 80, h: 320 };
  const sky = x.createLinearGradient(0, art.y, 0, art.y + art.h);
  sky.addColorStop(0, "#dfe4ea");
  sky.addColorStop(1, "#efe2d8");
  x.fillStyle = sky;
  x.fillRect(art.x, art.y, art.w, art.h);

  x.fillStyle = "#e8b9a3";
  x.fillRect(art.x, art.y + art.h * 0.58, art.w, art.h * 0.1);

  x.fillStyle = "#8f9bb3";
  x.beginPath();
  x.moveTo(art.x, art.y + art.h * 0.78);
  x.lineTo(art.x + art.w * 0.36, art.y + art.h * 0.44);
  x.lineTo(art.x + art.w * 0.68, art.y + art.h * 0.8);
  x.closePath();
  x.fill();

  x.fillStyle = "#5f6d88";
  x.beginPath();
  x.moveTo(art.x + art.w * 0.42, art.y + art.h);
  x.lineTo(art.x + art.w * 0.76, art.y + art.h * 0.52);
  x.lineTo(art.x + art.w, art.y + art.h);
  x.closePath();
  x.fill();

  x.fillStyle = "#3a3a38";
  x.textAlign = "center";
  x.font = "300 22px Georgia, serif";
  x.fillText("VIEW OF NATURE", w / 2, art.y + art.h + 62);
  x.font = "300 40px Georgia, serif";
  x.fillText("ATMOSPHERE", w / 2, art.y + art.h + 116);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function Poster({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const map = useMemo(() => posterTexture(), []);
  const W = 0.44;
  const H = 0.58;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[W, H, 0.024]} />
        <meshStandardMaterial color="#4a3323" roughness={0.5} metalness={0} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[W - 0.05, H - 0.05]} />
        <meshStandardMaterial map={map} roughness={0.88} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * A pleated blind, pulled most of the way down as it is in the photograph.
 * One plane with a stripe: the window is seen from across a 2.3m room and
 * never square on, and a stack of real pleat quads costs thirty draw calls to
 * say the same thing.
 */
function pleatTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 32;
  const x = c.getContext("2d")!;
  const band = x.createLinearGradient(0, 0, 0, 16);
  band.addColorStop(0, "#5e594c");
  band.addColorStop(0.5, "#9c9483");
  band.addColorStop(1, "#5e594c");
  x.fillStyle = band;
  x.fillRect(0, 0, 4, 32);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function PleatedBlind({
  position,
  rotation = [0, 0, 0],
  width,
  drop,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  drop: number;
}) {
  const map = useMemo(() => {
    const t = pleatTexture();
    t.repeat.set(1, drop / 0.03);
    return t;
  }, [drop]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -drop / 2, 0]}>
        <planeGeometry args={[width, drop]} />
        <meshStandardMaterial map={map} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* bottom rail, the one hard edge in an otherwise soft object */}
      <mesh position={[0, -drop - 0.012, 0]}>
        <boxGeometry args={[width + 0.01, 0.024, 0.022]} />
        <meshStandardMaterial color="#7d7768" roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}
