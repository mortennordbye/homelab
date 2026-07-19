"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Bookshelf } from "./Bookshelf";
import { Sideboard } from "./Devices";
import type { Hardware } from "./hardware";
import { Printer } from "./Printer";
import type { ShelfBook, ShelfCert, ShelfData } from "./shelf";
import { Prop } from "./props";
import { useSurface } from "./textures";

// A small personal room, not a corporate NOC. Roughly 5.2 x 4.8m with a 2.5m
// ceiling: a spare room with a desk in it, which is what a homelab actually
// lives in.
export const ROOM = { w: 5.2, d: 4.8, h: 2.5 };

/** Desk task chair, pushed back from the desk. */
/* The chair and the plant are scanned models rather than primitives. They were
   the two worst offenders: a chair assembled from four boxes and a plant made
   of icosahedron blobs are both shapes the eye knows far too well to be fooled
   by an approximation. See props.tsx for why only some objects are swapped. */
function Chair({ position }: { position: [number, number, number] }) {
  return (
    <Prop
      name="dining_chair_02"
      position={position}
      rotation={[0, Math.PI, 0]}
      height={0.92}
    />
  );
}

/** Monitor stand. The panel itself is a <Screen>, mounted just above this. */
function Stand({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox position={[0, 0.008, 0]} args={[0.2, 0.016, 0.14]} radius={0.005} smoothness={3} castShadow>
        <meshStandardMaterial color="#4a4d52" roughness={0.5} metalness={0.5} />
      </RoundedBox>
      <RoundedBox position={[0, 0.11, 0]} args={[0.035, 0.2, 0.03]} radius={0.008} smoothness={3} castShadow>
        <meshStandardMaterial color="#4a4d52" roughness={0.5} metalness={0.5} />
      </RoundedBox>
    </group>
  );
}

/** Mushroom lamp: cream glass dome on a small base. */
function MushroomLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.052, 0.062, 0.014, 24]} />
        <meshStandardMaterial color="#cfc3ae" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.04, 0.086, 20]} />
        <meshStandardMaterial color="#e0d5c0" roughness={0.55} />
      </mesh>
      {/* the dome, lit from inside */}
      <mesh position={[0, 0.118, 0]} castShadow>
        <sphereGeometry args={[0.078, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial
          color="#fdf4e4"
          roughness={0.42}
          emissive="#ffd9a4"
          emissiveIntensity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* A scanned plant that ships with its own pot. The previous model was foliage
   only, so it sat on the floor as a bush growing out of the floorboards. Where
   a plant and its pot come as one asset, take them as one asset rather than
   parenting a hand-built pot under scanned leaves and matching the scale by
   eye. */
function Plant({ position }: { position: [number, number, number] }) {
  return <Prop name="potted_plant_04" position={position} height={0.78} />;
}

/**
 * A panelled interior door at joinery dimensions: 825 x 2040 x 40mm leaf in a
 * lining, with an architrave, four recessed panels, two hinges and a lever on
 * a rose.
 *
 * Hand-built rather than scanned because Poly Haven's only CC0 doors are a
 * castle door and a roller shutter. That is survivable here for the same
 * reason the network switches are: a door is genuinely an assembly of flat
 * rectangles, so the shapes are not an approximation of something organic.
 * What sells it is depth. The flat plane this replaced had none, so it read as
 * a white rectangle painted on the wall. Every part here is proud of or
 * recessed into its neighbour by a few millimetres, which gives ambient
 * occlusion the creases it needs to draw the outline of a real door.
 */
function Door({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.825;
  const H = 2.04;
  const T = 0.04;
  const white = "#e9e6df";
  const trim = "#f1eee7";

  // Two panel columns, two rows: stile 110mm, rails 130/180/230mm.
  const stile = 0.11;
  const midRail = 0.13;
  const lowerH = 0.86;

  // Local +z points into the room. The caller rotates this group 180 degrees to
  // sit it on the far wall, which flips the sign of every depth offset, so
  // building against "away from the wall" rather than a raw axis keeps the
  // stack-up readable. Getting this backwards buried the whole door inside the
  // wall and left an 8mm sliver of the leaf poking through as a white slab.
  const leafFront = T + 0.006;

  return (
    <group position={position} rotation={rotation}>
      {/* architrave: the casing standing proud of the wall face */}
      {(
        [
          [0, H + 0.055, W + 0.22, 0.11],
          [-(W / 2 + 0.055), (H + 0.11) / 2, 0.11, H + 0.11],
          [W / 2 + 0.055, (H + 0.11) / 2, 0.11, H + 0.11],
        ] as [number, number, number, number][]
      ).map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.014]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.028]} />
          <meshStandardMaterial color={trim} roughness={0.55} />
        </mesh>
      ))}

      {/* lining, set back inside the opening */}
      <mesh position={[0, H / 2, -0.045]} receiveShadow>
        <boxGeometry args={[W + 0.03, H + 0.015, 0.09]} />
        <meshStandardMaterial color="#ded9d0" roughness={0.7} />
      </mesh>

      {/* The leaf is a frame with a thin back panel, not a slab with panel
          shapes laid on it. An earlier version stacked a sunk field and a
          moulding on a solid box, which gave a 5mm step that vanished under
          any light — a panelled door reads as panelled because the frame
          stands ~28mm proud of the panel and throws a real shadow line, so
          the recess has to be actual space. */}
      <mesh position={[0, H / 2, 0.006]} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.012]} />
        <meshStandardMaterial color="#e2ded6" roughness={0.7} />
      </mesh>
      {(
        [
          // stiles: outer left, outer right, centre
          [-(W - stile) / 2, H / 2, stile, H],
          [(W - stile) / 2, H / 2, stile, H],
          [0, H / 2, stile, H],
          // rails: bottom, middle, top
          [0, 0.115, W, 0.23],
          [0, 0.23 + lowerH + midRail / 2, W, midRail],
          [0, H - 0.09, W, 0.18],
        ] as [number, number, number, number][]
      ).map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, T / 2 + 0.006]} castShadow receiveShadow>
          <boxGeometry args={[w, h, T]} />
          <meshStandardMaterial color={white} roughness={0.62} />
        </mesh>
      ))}

      {/* lever on a rose, hinges on the opposite stile */}
      <mesh
        position={[-W / 2 + 0.075, 1.04, leafFront + 0.006]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.031, 0.031, 0.012, 20]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.28} metalness={0.92} />
      </mesh>
      <mesh
        position={[-W / 2 + 0.105, 1.04, leafFront + 0.022]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.0115, 0.0115, 0.115, 14]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.28} metalness={0.92} />
      </mesh>
      {[0.32, 1.72].map((y) => (
        <mesh key={y} position={[W / 2 - 0.004, y, T / 2]} castShadow>
          <boxGeometry args={[0.016, 0.1, T + 0.004]} />
          <meshStandardMaterial color="#a8adb3" roughness={0.34} metalness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Framed print, like the ones above the sideboard. */
function FramedPrint({
  position,
  rotation = [0, 0, 0],
  w = 0.4,
  h = 0.54,
  art = "#8ea174",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  w?: number;
  h?: number;
  art?: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[w, h, 0.018]} radius={0.003} smoothness={3} castShadow>
        <meshStandardMaterial color="#b99a6f" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshStandardMaterial color="#f2efe6" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.01, 0.012]}>
        <planeGeometry args={[w - 0.12, h - 0.16]} />
        <meshStandardMaterial color={art} roughness={0.88} />
      </mesh>
    </group>
  );
}

export function Room({
  onPrinterStatus,
  shelf,
  onInspect,
  onOpenBook,
  onOpenCert,
}: {
  onPrinterStatus: (msg: string | null) => void;
  shelf: ShelfData;
  onInspect: (hw: Hardware) => void;
  onOpenBook: (b: ShelfBook) => void;
  onOpenCert: (c: ShelfCert) => void;
}) {
  const hw = ROOM.w / 2;
  const hd = ROOM.d / 2;
  // Tiling is in real units: roughly one texture tile per 1.3m of floor and
  // 1.7m of wall, so the grain reads at the right physical scale.
  const floorOak = useSurface("laminate_floor_02", [3.4, 3.1]);
  const wallBack = useSurface("plastered_wall_04", [3, 1.45]);
  const wallSide = useSurface("plastered_wall_04", [2.8, 1.45]);
  const ceiling = useSurface("plastered_wall_04", [3.6, 3.3]);
  const oak = useSurface("oak_veneer_01", [2.4, 0.7]);
  const rug = useSurface("dirty_carpet", [3, 2.1]);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <MeshReflectorMaterial
          resolution={256}
          mirror={0.12}
          mixBlur={14}
          mixStrength={1.1}
          blur={[500, 200]}
          depthScale={0.4}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.4}
          {...floorOak}
          color="#c3bdb2"
          roughness={0.98}
          metalness={0}
        />
      </mesh>

      {/* plain painted ceiling, one light fitting. No office grid. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial
          {...ceiling}
          color="#f2f0ea"
          roughness={0.98}
          metalness={0}
          normalScale={[0.12, 0.12]}
        />
      </mesh>
      {/* A real pendant fitting. The flat emissive square this replaced was
          the giveaway that the ceiling was a plane with a decal on it. */}
      <Prop
        name="modern_ceiling_lamp_01"
        position={[0, ROOM.h - 0.44, 0.2]}
        height={0.42}
        receiveShadow={false}
      />
      <mesh position={[0, ROOM.h - 0.012, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial color="#f6f1e6" />
      </mesh>

      {/* walls */}
      <mesh position={[0, ROOM.h / 2, -hd]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial {...wallBack} color="#aebaa6" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
      </mesh>
      <mesh position={[0, ROOM.h / 2, hd]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial {...wallSide} color="#b4c0ac" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
      </mesh>
      <mesh position={[-hw, ROOM.h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial {...wallSide} color="#b0bca8" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
      </mesh>
      <mesh position={[hw, ROOM.h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial {...wallSide} color="#b0bca8" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
      </mesh>

      {/* skirting */}
      {(
        [
          { p: [0, 0.05, -hd + 0.012], r: [0, 0, 0], w: ROOM.w },
          { p: [0, 0.05, hd - 0.012], r: [0, Math.PI, 0], w: ROOM.w },
          { p: [-hw + 0.012, 0.05, 0], r: [0, Math.PI / 2, 0], w: ROOM.d },
          { p: [hw - 0.012, 0.05, 0], r: [0, -Math.PI / 2, 0], w: ROOM.d },
        ] as { p: [number, number, number]; r: [number, number, number]; w: number }[]
      ).map((s, i) => (
        <mesh key={i} position={s.p} rotation={s.r}>
          <planeGeometry args={[s.w, 0.1]} />
          <meshStandardMaterial color="#ece9e2" roughness={0.72} />
        </mesh>
      ))}

      {/* prints above the desk, thin wood frames */}
      <FramedPrint position={[-1.72, 1.72, -hd + 0.03]} w={0.38} h={0.5} art="#7f9a63" />
      <FramedPrint position={[1.78, 1.68, -hd + 0.03]} w={0.34} h={0.44} art="#7d9db4" />

      {/* jute rug */}
      <mesh position={[0, 0.004, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.0, 2.1]} />
        <meshStandardMaterial
          {...rug}
          color="#8a7550"
          roughness={0.98}
          metalness={0}
          normalScale={[0.8, 0.8]}
        />
      </mesh>

      {/* door, back-right on the wall behind you */}
      <Door position={[1.55, 0, hd - 0.02]} rotation={[0, Math.PI, 0]} />

      {/* desk against the screen wall */}
      <group position={[0, 0, -hd + 0.38]}>
        <RoundedBox position={[0, 0.735, 0]} args={[2.6, 0.04, 0.72]} radius={0.008} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial {...oak} color="#d2bd97" roughness={0.62} metalness={0} normalScale={[0.45, 0.45]} />
        </RoundedBox>
        {[-1.24, 1.24].map((x) => (
          <RoundedBox key={x} position={[x, 0.36, 0]} args={[0.05, 0.72, 0.66]} radius={0.006} smoothness={3} castShadow receiveShadow>
            <meshStandardMaterial {...oak} color="#c9b48d" roughness={0.66} metalness={0} />
          </RoundedBox>
        ))}
        {/* keyboard + mouse + mug */}
        <RoundedBox position={[-0.05, 0.765, 0.19]} args={[0.43, 0.018, 0.14]} radius={0.004} smoothness={3} castShadow>
          <meshStandardMaterial color="#1c1f22" roughness={0.8} />
        </RoundedBox>
        <RoundedBox position={[0.33, 0.768, 0.19]} args={[0.06, 0.025, 0.1]} radius={0.011} smoothness={4} castShadow>
          <meshStandardMaterial color="#1c1f22" roughness={0.8} />
        </RoundedBox>
        <mesh position={[0.72, 0.795, 0.16]}>
          <cylinderGeometry args={[0.042, 0.038, 0.095, 16]} />
          <meshStandardMaterial color="#8d8378" roughness={0.85} />
        </mesh>

        <Stand position={[-0.72, 0.755, -0.2]} />
        <Stand position={[0, 0.755, -0.24]} />
        <Stand position={[0.72, 0.755, -0.2]} />
        <MushroomLamp position={[-1.02, 0.755, -0.1]} />
      </group>

      {/* y=0: Prop seats a model on its own base, so no manual lift. */}
      <Plant position={[hw - 0.42, 0, hd - 0.55]} />
      <Chair position={[0, 0, -0.72]} />

      {/* The homelab, in an open-fronted sideboard against the right wall.
          Every device in it is named from the README hardware tables. */}
      <group position={[hw - 0.28, 0, 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <Sideboard position={[0, 0, 0]} onInspect={onInspect} />
      </group>

      {/* The case studies as books, certificates on the bottom shelf. Left
          wall, opposite the homelab. Shelf count follows the content. */}
      <Bookshelf
        position={[-hw + 0.16, 0, 0.72]}
        rotation={[0, Math.PI / 2, 0]}
        shelf={shelf}
        onOpenBook={onOpenBook}
        onOpenCert={onOpenCert}
      />

      {/* printer on a low cabinet, left wall */}
      <group position={[-hw + 0.34, 0, -0.95]}>
        <RoundedBox
          position={[0, 0.3, 0]}
          args={[0.46, 0.6, 0.44]}
          radius={0.008}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...oak} color="#cdb992" roughness={0.66} metalness={0} />
        </RoundedBox>
        <Printer
          position={[0, 0.6, 0]}
          rotation={[0, Math.PI / 2, 0]}
          onStatus={onPrinterStatus}
        />
      </group>
    </group>
  );
}
