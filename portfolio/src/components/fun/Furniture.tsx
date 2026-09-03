"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OAK } from "@/components/materials/oak";
import type { Surface } from "@/components/materials/surface";
import { Door, Drawer, OpenBox, useEase } from "./openable";
import { Interactive } from "./interaction";

/**
 * The living room, from the three pieces marked on the floor plan: the TV
 * bench on the west wall, the sofa facing it, and the desk in the south-west
 * corner (the desk lives in Room.tsx, where the monitors read its numbers).
 *
 * Everything is built at its real size in metres. Relative scale is what makes
 * a room believable; detail is not.
 */

/** The darker of the two chairs at the small table. The flat has one oak and
 *  one walnut and they do not match, which is most of why they read as chairs
 *  somebody owns rather than a set that was bought for the render. */
export const WALNUT = "#4a3527";

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

/** The stove's two pale materials. Both stay well under the real render's
 *  white, and under the bloom threshold with it: the lantern stands a metre
 *  away, and anything near white there blooms into the brightest thing in the
 *  flat. */
const RENDER = "#5e5b51";
const CONCRETE = "#565349";

/** Stove glazing. Transparent, not merely dark: opaque glass turns the firebox
 *  into a black rectangle with the fire sealed behind it. */
const GLASS = {
  color: "#0d0e10",
  roughness: 0.08,
  metalness: 0.3,
  envMapIntensity: 1.5,
  transparent: true,
  opacity: 0.52,
};

/**
 * The fire, as a soft blob rather than a lit rectangle. The glass is a flat
 * pane and an emissive plane behind it fills every pixel of it evenly, which
 * is the same failure as a glowing cuboid for a lamp: a shape the eye knows
 * cannot be a flame. The alpha of this map is what gives it an edge.
 */
function fireTexture() {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, n, n);
  const g = x.createRadialGradient(n / 2, n * 0.74, 2, n / 2, n * 0.74, n * 0.52);
  g.addColorStop(0, "rgba(255,236,190,1)");
  g.addColorStop(0.28, "rgba(255,150,40,0.92)");
  g.addColorStop(0.62, "rgba(226,72,8,0.4)");
  g.addColorStop(1, "rgba(120,30,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * One glazed face of the firebox: the dark inside of the stove, the fire in
 * it, and the glass over both in a steel door frame.
 *
 * All of it sits a hair in FRONT of the firebox rather than inside it. A box
 * is solid, so a fire modelled where the fire actually is renders behind the
 * box's own front face and the stove stays a black rectangle all evening. The
 * frame is what buys back the depth the recess would have given.
 */
function FireDoor({ w, h, lit }: { w: number; h: number; lit: boolean }) {
  const map = useMemo(() => fireTexture(), []);
  useEffect(() => () => map.dispose(), [map]);

  return (
    <group>
      {/* the inside of the firebox, which is sooty and nearly black */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#0e0a07" roughness={0.98} />
      </mesh>
      <mesh position={[0, -0.02, 0.004]}>
        <planeGeometry args={[w - 0.02, h - 0.04]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffffff"
          emissiveMap={map}
          emissiveIntensity={lit ? 1.15 : 0}
          alphaMap={map}
          transparent
          depthWrite={false}
          roughness={0.9}
        />
      </mesh>
      {/* the ember bed: lower, smaller and hotter than the flame over it */}
      <mesh position={[0, -h / 2 + 0.055, 0.006]}>
        <planeGeometry args={[w - 0.13, 0.038]} />
        <meshStandardMaterial
          color="#170b04"
          emissive="#ff4708"
          emissiveIntensity={lit ? 1.25 : 0}
          roughness={0.95}
        />
      </mesh>
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial {...GLASS} />
      </mesh>
      {([
        [0, h / 2 + 0.011, w + 0.044, 0.022],
        [0, -h / 2 - 0.011, w + 0.044, 0.022],
        [-w / 2 - 0.011, 0, 0.022, h],
        [w / 2 + 0.011, 0, 0.022, h],
      ] as const).map(([x, y, bw, bh]) => (
        <mesh key={`${x},${y}`} position={[x, y, 0.008]}>
          <boxGeometry args={[bw, bh, 0.016]} />
          <meshStandardMaterial color="#15181a" roughness={0.42} metalness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The wood stove, off a photograph of the real one: a black firebox on a
 * plastered pedestal, a cast concrete mass over it and a timber slab across
 * the top, standing against a chimney breast that runs to the ceiling.
 *
 * Origin at the wall face on the floor, local +z into the room. The breast is
 * shell rather than furniture — it is plastered to match the wall it stands
 * on — but it is built here because it is what the stove is dimensioned
 * against, and the two only read as one piece if they move together.
 *
 * Nothing here may grow toward the room: the stove and the dining table are
 * the two sides of the only route north through the flat, and 0.72 out from
 * the wall is what leaves that route walkable.
 */
export function WoodStove({
  position,
  rotation = [0, 0, 0],
  ceiling,
  plaster,
  lit,
  onToggle,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  ceiling: number;
  plaster: Surface;
  lit: boolean;
  onToggle: () => void;
}) {
  const BREAST_W = 0.86;
  const BREAST_D = 0.28;
  /** Firebox centre, out from the wall. */
  const BODY_Z = BREAST_D + 0.22;
  const BOX_W = 0.52;
  const BOX_D = 0.44;
  const BOX_Y = 0.34;
  const BOX_H = 0.6;

  return (
    <Interactive
      label="the wood stove"
      verb={lit ? "put it out" : "light it"}
      onActivate={onToggle}
    >
      <group position={position} rotation={rotation}>
        {/* 20mm into the wall, like the kitchen run: coplanar faces flicker. */}
        <mesh position={[0, ceiling / 2, BREAST_D / 2 - 0.02]} receiveShadow>
          <boxGeometry args={[BREAST_W, ceiling, BREAST_D]} />
          <meshStandardMaterial
            {...plaster}
            color="#241a12"
            roughness={0.96}
            metalness={0}
            normalScale={[0.42, 0.42]}
          />
        </mesh>
        {/* the skirting returning around the breast, as it does in the flat */}
        <mesh position={[0, 0.05, BREAST_D / 2 - 0.014]}>
          <boxGeometry args={[BREAST_W + 0.022, 0.1, BREAST_D + 0.012]} />
          <meshStandardMaterial color={OAK.back} roughness={0.7} />
        </mesh>

        {/* the rendered pedestal the firebox stands on */}
        <mesh position={[0, BOX_Y / 2, BODY_Z - 0.01]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.25, BOX_Y, 24]} />
          <meshStandardMaterial color={RENDER} roughness={0.93} metalness={0} />
        </mesh>

        {/* firebox */}
        <RoundedBox
          position={[0, BOX_Y + BOX_H / 2, BODY_Z]}
          args={[BOX_W, BOX_H, BOX_D]}
          radius={0.012}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#15181a" roughness={0.44} metalness={0.4} />
        </RoundedBox>

        {/* Glazed on the front and on the north return, which is where the
            set in the flat is glazed: from the sofa you see the fire side on
            rather than a black box. */}
        <group position={[0, BOX_Y + BOX_H / 2 - 0.03, BODY_Z + BOX_D / 2]}>
          <FireDoor w={BOX_W - 0.1} h={BOX_H - 0.12} lit={lit} />
        </group>
        <group
          position={[-BOX_W / 2, BOX_Y + BOX_H / 2 - 0.03, BODY_Z]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <FireDoor w={BOX_D - 0.12} h={BOX_H - 0.12} lit={lit} />
        </group>

        {/* The concrete mass over the firebox — the part of the set that is
            actually heavy, and what the flue runs up inside. */}
        <RoundedBox
          position={[0, BOX_Y + BOX_H + 0.28, BODY_Z - 0.01]}
          args={[0.6, 0.56, 0.5]}
          radius={0.018}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={CONCRETE} roughness={0.92} metalness={0} />
        </RoundedBox>
        {/* the slab across the top, laid on rather than built in */}
        <RoundedBox
          position={[0, BOX_Y + BOX_H + 0.585, BODY_Z - 0.01]}
          args={[0.66, 0.05, 0.56]}
          radius={0.01}
          smoothness={3}
          castShadow
        >
          <meshStandardMaterial color={OAK.carcass} roughness={0.78} metalness={0} />
        </RoundedBox>

        {/* The glass hearth plate. Flat on the floor and not a blocker: the
            route past the stove is measured off the body above it.

            0.80 x 0.60 rather than 0.92 x 0.80, which is nearer what a plate
            under a 0.6 stove actually is and, more to the point, is what keeps
            it out from under the table's leg in the corner. */}
        <mesh position={[0, 0.006, BODY_Z + 0.01]} receiveShadow>
          <boxGeometry args={[0.8, 0.012, 0.6]} />
          <meshStandardMaterial
            color="#0d0b09"
            roughness={0.12}
            metalness={0.2}
            envMapIntensity={1.4}
            transparent
            opacity={0.42}
          />
        </mesh>
      </group>
    </Interactive>
  );
}

/**
 * A spindle-back wooden chair, of the two in the flat: one light oak, one
 * walnut.
 *
 * Hand-built, against the rule that said chairs are scanned models. That rule
 * came from a chair assembled out of four boxes, and it was right about that
 * chair — a box is nothing like a chair. A Windsor is turned parts: round
 * tapered legs, round spindles, a bent crest rail. Primitives are what it is
 * actually made of, so here they land instead of approximating.
 *
 * Origin on the floor at the seat's centre, local +z out of the back — the
 * direction the sitter faces.
 */
export function WoodChair({
  position,
  rotation = [0, 0, 0],
  tone = OAK.case,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Which of the two it is. The flat has one of each and they do not match. */
  tone?: string;
}) {
  const SEAT_H = 0.45;
  const W = 0.39;
  const D = 0.37;
  const BACK_H = 0.81;
  /** How far the back leans off vertical, and the crest rail's own curve. */
  const LEAN = 0.14;

  const wood = (
    <meshStandardMaterial color={tone} roughness={0.66} metalness={0} />
  );

  return (
    <group position={position} rotation={rotation}>
      {/* The seat: a fourteen-sided disc squashed to an oval, not a plank.
          A Windsor seat is a shield with no straight edge on it, and a
          rectangle there is the one part of this chair the eye would catch —
          everything else is already a turned round thing. */}
      <mesh
        position={[0, SEAT_H - 0.017, -0.012]}
        scale={[1, 1, D / W]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[W / 2, W / 2 - 0.008, 0.034, 14]} />
        {wood}
      </mesh>

      {/* Four turned legs, splayed out and back the way a stick chair's are.
          Nothing below the seat casts: the shelf taught that small meshes
          inside furniture pay for a point light's cube map six times over. */}
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz]) => (
        <mesh
          key={`${sx}${sz}`}
          position={[sx * (W / 2 - 0.075), (SEAT_H - 0.032) / 2, sz * (D / 2 - 0.06)]}
          rotation={[sz * 0.09, 0, -sx * 0.08]}
        >
          <cylinderGeometry args={[0.018, 0.011, SEAT_H - 0.032, 10]} />
          {wood}
        </mesh>
      ))}
      {/* one stretcher each way, low down, where a stick chair carries them */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} position={[0, 0.17, sz * (D / 2 - 0.07)]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, W - 0.13, 8]} />
          {wood}
        </mesh>
      ))}

      {/* The two back posts, thicker than the spindles and leaning with them. */}
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[
            sx * (W / 2 - 0.035),
            SEAT_H + (BACK_H - SEAT_H) / 2,
            -D / 2 + 0.045 - Math.sin(LEAN) * (BACK_H - SEAT_H) / 2,
          ]}
          rotation={[LEAN, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.0135, 0.016, BACK_H - SEAT_H, 10]} />
          {wood}
        </mesh>
      ))}

      {/* Five spindles between the seat and the crest, shortening toward the
          outside so they meet a rail that is curved rather than straight. */}
      {[-2, -1, 0, 1, 2].map((i) => {
        const x = i * 0.067;
        const drop = Math.abs(i) * 0.012;
        const h = BACK_H - SEAT_H - 0.04 - drop;
        return (
          <mesh
            key={i}
            position={[
              x,
              SEAT_H + 0.02 + h / 2,
              -D / 2 + 0.05 - Math.sin(LEAN) * (h / 2 + 0.02),
            ]}
            rotation={[LEAN, 0, 0]}
          >
            <cylinderGeometry args={[0.0068, 0.0072, h, 8]} />
            {wood}
          </mesh>
        );
      })}

      {/* The crest rail, as five short segments stepping round a shallow arc.
          A bow curves back at the centre and comes forward at the ends, around
          the sitter; a straight bar across the top is the tell that a chair was
          drawn rather than built. The segments overlap, so the arc costs no
          angles to get wrong. */}
      {([-2, -1, 0, 1, 2] as const).map((i) => (
        <mesh
          key={i}
          position={[
            i * 0.065,
            BACK_H - 0.012,
            -D / 2 + 0.05 - Math.sin(LEAN) * (BACK_H - SEAT_H) + (i / 2) ** 2 * 0.016,
          ]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.0135, 0.0135, 0.076, 8]} />
          {wood}
        </mesh>
      ))}
    </group>
  );
}

/**
 * The small table against the west wall between the chimney breast and the
 * desk, on tapered legs. 0.86 out from the wall by 0.55 across it — end to
 * the wall, not side to it, so the chairs get a long edge to sit at. Sized off
 * `WoodChair` rather than off the gap it stands in, because a table narrower
 * than about twice a chair reads as a chair crowding a shelf. See `TABLE` in
 * Room.tsx.
 */
export function DiningTable({
  position,
  rotation = [0, 0, 0],
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
}) {
  const W = 0.86;
  const D = 0.55;
  const H = 0.745;
  const T = 0.034;

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        position={[0, H - T / 2, 0]}
        args={[W, T, D]}
        radius={0.012}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...oak} color={OAK.case} roughness={0.6} metalness={0} normalScale={[0.45, 0.45]} />
      </RoundedBox>

      {/* Rails rather than a solid apron: the shadow line under the top is
          most of what tells a table from a slab on legs. */}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[0, H - T - 0.03, s * (D / 2 - 0.075)]} castShadow>
          <boxGeometry args={[W - 0.16, 0.055, 0.026]} />
          <meshStandardMaterial color={OAK.carcass} roughness={0.66} metalness={0} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`s${s}`} position={[s * (W / 2 - 0.075), H - T - 0.03, 0]} castShadow>
          <boxGeometry args={[0.026, 0.055, D - 0.19]} />
          <meshStandardMaterial color={OAK.carcass} roughness={0.66} metalness={0} />
        </mesh>
      ))}

      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (W / 2 - 0.075), (H - T) / 2, sz * (D / 2 - 0.075)]}
            castShadow
          >
            <cylinderGeometry args={[0.026, 0.018, H - T, 12]} />
            <meshStandardMaterial color={OAK.case} roughness={0.62} metalness={0} />
          </mesh>
        )),
      )}

    </group>
  );
}

/** Drawer heights as fractions of the carcass, and the centre of each as a
 *  fraction from the bottom. One shallow drawer over one deep one, which is
 *  what the run is: cutlery on top, pans under it. */
const DRAWERS: [number, number][] = [
  [0.78, 0.39],
  [0.22, 0.89],
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
  bays = {},
  topDrop = 0,
  children,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length: number;
  oak: Surface;
  doors?: number;
  /** Bays that are not a stack of drawers. "panel" is a fixed front for a bay
   *  an appliance is built into and covers; "door" is a single hinged door,
   *  which is what a bay with the water tank standing in it actually has. */
  bays?: Record<number, "panel" | "door">;
  /**
   * Drops the worktop by this much, for a run whose top butts into another
   * one's.
   *
   * Two tops at the same height that overlap in plan share their top and
   * bottom planes, and a shared plane flickers — which is what the join
   * between these two runs was doing. A couple of millimetres is a joint line,
   * which is what a real pair of worktops meeting at a corner has anyway.
   */
  topDrop?: number;
  children?: React.ReactNode;
}) {
  const H = 0.9;
  const D = 0.6;
  const TOP = 0.04;
  const PLINTH = 0.1;
  const bodyH = H - PLINTH - TOP;
  const w = length / doors;

  return (
    <group position={position} rotation={rotation}>
      {/* plinth, set back so the units read as standing off the floor */}
      <mesh position={[0, PLINTH / 2, -0.03]} receiveShadow>
        <boxGeometry args={[length, PLINTH, D - 0.06]} />
        <meshStandardMaterial color={OAK.back} roughness={0.8} metalness={0} />
      </mesh>

      {/* carcass */}
      <group position={[0, PLINTH + bodyH / 2, 0]}>
        <OpenBox
          width={length}
          height={bodyH}
          depth={D}
          material={<meshStandardMaterial {...oak} color={OAK.back} roughness={0.7} metalness={0} />}
        />
      </group>

      {Array.from({ length: doors }, (_, i) => {
        const x = -length / 2 + w * (i + 0.5);
        const kind = bays[i];

        if (kind) {
          /* A full-height front. Drawn as one panel rather than a stack of
             dummy drawer fronts: reveals promising drawers that cannot open
             are what made the tank bay read as broken. */
          const slab = (
            <mesh position={[x, PLINTH + bodyH / 2, D / 2 + 0.004]} castShadow>
              <boxGeometry args={[w - 0.016, bodyH - 0.012, 0.018]} />
              <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.62} metalness={0} />
            </mesh>
          );
          if (kind === "panel") return <group key={i}>{slab}</group>;
          return (
            <Door
              key={i}
              label="the cupboard"
              pivot={[x + (w - 0.016) / 2, PLINTH + bodyH / 2, D / 2]}
              angle={1.8}
            >
              {slab}
            </Door>
          );
        }

        return DRAWERS.map(([frac, at], j) => {
          const h = bodyH * frac - 0.012;
          const y = PLINTH + bodyH * at;
          /* The box is a shallow tray hung behind the top of its front, not a
             well the height of it: a deep drawer whose sides run the full front
             has a floor too far down to catch any light, and reads bottomless. */
          const trayH = Math.min(h - 0.03, 0.17);
          const front = (
            <mesh position={[x, y, D / 2 + 0.004]} castShadow>
              <boxGeometry args={[w - 0.016, h, 0.018]} />
              <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.62} metalness={0} />
            </mesh>
          );
          return (
            <Drawer key={`${i}-${j}`} label="the drawer" to={[0, 0, 0.42]}>
              {front}
              <group position={[x, y + h / 2 - 0.012 - trayH / 2, 0.035]}>
                <OpenBox
                  width={w - 0.05}
                  height={trayH}
                  depth={D - 0.08}
                  face="py"
                  material={<meshStandardMaterial color={OAK.back} roughness={0.85} metalness={0} />}
                />
              </group>
            </Drawer>
          );
        });
      })}

      {/* Worktop in oak, proud of the carcass so it casts its own line. The
          light top over dark fronts is the one thing that makes this read as
          the real kitchen rather than as a row of cupboards. */}
      <RoundedBox
        position={[0, H - TOP / 2 - topDrop, 0.012]}
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
  door,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
  /** Whatever is stuck to the fridge door, in a frame whose origin is the
   *  centre of the door's outer face with local +z out of it. It hangs inside
   *  the door so it swings with it; left outside, it would stay in mid-air the
   *  moment somebody opened the fridge. */
  door?: React.ReactNode;
}) {
  const W = 0.6;
  const D = 0.65;
  const PLINTH = 0.1;

  /* Three compartments, bottom up, each its own box so the reveals between the
     fronts are the ends of real carcasses rather than lines drawn on one. */
  const BAYS = [
    { y0: PLINTH, h: 1.32, label: "the fridge", shelves: [0.42, 0.86] },
    { y0: 1.34, h: 0.72, label: "the freezer", shelves: [0.36] },
    { y0: 2.08, h: 0.34, label: "the cupboard", shelves: [] as number[] },
  ];

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, PLINTH / 2, 0]} receiveShadow>
        <boxGeometry args={[W, PLINTH, D]} />
        <meshStandardMaterial {...oak} color={OAK.back} roughness={0.72} metalness={0} />
      </mesh>

      {BAYS.map(({ y0, h, label, shelves }) => (
        <group key={y0} position={[0, y0, 0]}>
          <group position={[0, h / 2, 0]}>
            <OpenBox
              width={W}
              height={h}
              depth={D}
              material={<meshStandardMaterial {...oak} color={OAK.back} roughness={0.72} metalness={0} />}
            />
          </group>
          {shelves.map((y) => (
            <mesh key={y} position={[0, y, -0.01]} receiveShadow>
              <boxGeometry args={[W - 0.04, 0.014, D - 0.05]} />
              <meshStandardMaterial color="#767a7d" roughness={0.35} metalness={0.1} />
            </mesh>
          ))}
          {/* All three hinge the same side, as one appliance does. */}
          <Door label={label} pivot={[-W / 2, h / 2, D / 2]} angle={-1.9}>
            <mesh position={[0, h / 2, D / 2 + 0.005]} castShadow>
              <boxGeometry args={[W - 0.016, h - 0.014, 0.018]} />
              <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.6} metalness={0} />
            </mesh>
            {/* Only the fridge door carries anything; the freezer and the
                cupboard above it are too high and too small to stick to. */}
            {door && y0 === PLINTH && (
              <group position={[0, h / 2, D / 2 + 0.0145]}>{door}</group>
            )}
          </Door>
        </group>
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
      <group position={[0, BOTTOM + H / 2, 0]}>
        <OpenBox
          width={length}
          height={H}
          depth={D}
          material={<meshStandardMaterial {...oak} color={OAK.back} roughness={0.72} metalness={0} />}
        />
      </group>

      {/* one shelf, which is what a 0.35m wall unit holds */}
      <mesh position={[0, BOTTOM + H / 2, -0.008]} receiveShadow>
        <boxGeometry args={[length - 0.04, 0.016, D - 0.05]} />
        <meshStandardMaterial color={OAK.back} roughness={0.8} metalness={0} />
      </mesh>

      {/* Doors hinged on the outer edge of the run, so a pair either side of
          the middle opens away from each other rather than into each other. */}
      {Array.from({ length: doors }, (_, i) => {
        const w = length / doors;
        const cx = -length / 2 + w * (i + 0.5);
        const hw = (w - 0.016) / 2;
        const right = cx > 0;
        return (
          <Door
            key={i}
            label="the cupboard"
            pivot={[cx + (right ? hw : -hw), BOTTOM + H / 2, D / 2]}
            angle={right ? 1.8 : -1.8}
          >
            <mesh position={[cx, BOTTOM + H / 2, D / 2 + 0.005]} castShadow>
              <boxGeometry args={[w - 0.016, H - 0.016, 0.018]} />
              <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.6} metalness={0} />
            </mesh>
          </Door>
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
      {/* the cavity, and the one shelf in it */}
      <group position={[0, Y + H / 2, 0.04]}>
        <OpenBox
          width={W - 0.06}
          height={H - 0.09}
          depth={0.5}
          material={<meshStandardMaterial color="#25262a" roughness={0.55} metalness={0.15} />}
        />
      </group>
      <mesh position={[0, Y + H / 2 - 0.06, 0.04]} receiveShadow>
        <boxGeometry args={[W - 0.1, 0.012, 0.44]} />
        <meshStandardMaterial color="#6f7478" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* The door drops forward off its bottom edge, the way an oven does and
          nothing else in the flat. */}
      <Door label="the oven" pivot={[0, Y, Z]} axis="x" angle={1.5}>
        <mesh position={[0, Y + H / 2, Z + 0.008]} castShadow>
          <boxGeometry args={[W, H, 0.018]} />
          <meshStandardMaterial color="#141516" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* glass, inset, so the door reads as a frame around a window */}
        <mesh position={[0, Y + H / 2 - 0.05, Z + 0.018]}>
          <planeGeometry args={[W - 0.07, H - 0.19]} />
          <meshStandardMaterial color="#0b0c0d" roughness={0.14} metalness={0.6} envMapIntensity={1.3} />
        </mesh>
        {/* the clock, the only lit thing below worktop height */}
        <mesh position={[0.03, Y + H - 0.075, Z + 0.019]}>
          <planeGeometry args={[0.11, 0.022]} />
          <meshBasicMaterial color="#c8d6cb" />
        </mesh>
        {/* handle bar across the top of the door */}
        <mesh position={[0, Y + H - 0.02, Z + 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, W - 0.04, 12]} />
          <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />
        </mesh>
      </Door>
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

  /* Split at the fascia: the control section stays solid and the oven section
     is a box you can see into, which is also how the appliance is built. */
  const CAV = 0.31;

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        position={[W / 2 - (W - CAV) / 2, H / 2, 0]}
        args={[W - CAV, H, D]}
        radius={0.008}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7c7668" roughness={0.5} metalness={0.06} />
      </RoundedBox>
      <group position={[-W / 2 + CAV / 2, H / 2, 0]}>
        <OpenBox
          width={CAV}
          height={H}
          depth={D}
          material={<meshStandardMaterial color="#7c7668" roughness={0.5} metalness={0.06} />}
        />
      </group>
      <mesh position={[-W / 2 + CAV / 2, 0.012, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.008, 20]} />
        <meshStandardMaterial color="#25262a" roughness={0.2} metalness={0.3} />
      </mesh>

      <Door label="the microwave" pivot={[-W / 2, H / 2, D / 2]} angle={-1.9}>
        <mesh position={[-W / 2 + CAV / 2, H / 2, D / 2 + 0.008]} castShadow>
          <boxGeometry args={[CAV, H - 0.01, 0.016]} />
          <meshStandardMaterial color="#7c7668" roughness={0.5} metalness={0.06} />
        </mesh>
        <mesh position={[-W / 2 + CAV / 2, H / 2, D / 2 + 0.017]}>
          <planeGeometry args={[CAV - 0.06, H - 0.06]} />
          <meshStandardMaterial color="#17181a" roughness={0.22} metalness={0.55} />
        </mesh>
      </Door>

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

      {/* Duvet, made: one slab squared to the base and pulled down off the
          pillows, with the head edge turned back over itself. Overhangs the
          mattress on both long sides so the base still reads as upholstered. */}
      <RoundedBox position={[0, 0.585, 0.25]} args={[W + 0.08, 0.12, L * 0.75]} radius={0.05} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.97} metalness={0} />
      </RoundedBox>
      <RoundedBox position={[0, 0.652, -L * 0.22]} args={[W + 0.08, 0.05, 0.17]} radius={0.025} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.97} metalness={0} />
      </RoundedBox>

      {/* two pillows squared against the head end */}
      <RoundedBox position={[-W * 0.235, 0.6, -L / 2 + 0.26]} args={[0.62, 0.14, 0.38]} radius={0.08} smoothness={4} castShadow>
        <meshStandardMaterial color={LINEN} roughness={0.96} metalness={0} />
      </RoundedBox>
      <RoundedBox position={[W * 0.235, 0.6, -L / 2 + 0.26]} args={[0.62, 0.14, 0.38]} radius={0.08} smoothness={4} castShadow>
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
      <group position={[0, PLINTH + (H - PLINTH) / 2, D / 2]}>
        <OpenBox
          width={length}
          height={H - PLINTH}
          depth={D}
          material={<meshStandardMaterial {...PORCELAIN} roughness={0.5} />}
        />
      </group>

      {/* two drawers, split by a shadow gap and no handle, as fitted */}
      {[0.3, 0.72].map((f) => {
        const h = (H - PLINTH) * 0.4 - 0.012;
        const y = PLINTH + (H - PLINTH) * f;
        const trayH = Math.min(h - 0.03, 0.17);
        return (
          <Drawer key={f} label="the drawer" to={[0, 0, 0.22]}>
            <mesh position={[0, y, D + 0.004]} castShadow>
              <boxGeometry args={[length - 0.014, h, 0.016]} />
              <meshStandardMaterial {...PORCELAIN} roughness={0.42} />
            </mesh>
            <group position={[0, y + h / 2 - 0.012 - trayH / 2, D - 0.165]}>
              <OpenBox
                width={length - 0.05}
                height={trayH}
                depth={D - 0.06}
                face="py"
                material={<meshStandardMaterial color="#6d6656" roughness={0.8} metalness={0} />}
              />
            </group>
          </Drawer>
        );
      })}

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
      <group position={[0, 0, D / 2]}>
        <OpenBox
          width={W}
          height={H}
          depth={D}
          material={<meshStandardMaterial {...PORCELAIN} roughness={0.5} />}
        />
      </group>
      <mesh position={[0, 0, D / 2 - 0.01]} receiveShadow>
        <boxGeometry args={[W - 0.03, 0.014, D - 0.03]} />
        <meshStandardMaterial {...PORCELAIN} roughness={0.6} />
      </mesh>
      <Door label="the bathroom cabinet" pivot={[-W / 2, 0, D]} angle={-1.9}>
        <mesh position={[0, 0, D + 0.004]} castShadow>
          <boxGeometry args={[W - 0.016, H - 0.016, 0.016]} />
          <meshStandardMaterial {...PORCELAIN} roughness={0.38} />
        </mesh>
      </Door>
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
/**
 * The shower: a square enclosure in the corner, tiled on the two sides that
 * are wall and glazed on the two that are not.
 *
 * Not a quadrant. A curved corner unit is the cheap fitting a small bathroom
 * usually gets and it was the wrong guess: this one is a box, and the box is
 * what puts a hard vertical edge next to the washing machine instead of a
 * shape that slides away from it.
 *
 * Origin at the inner corner, growing +x and +z, which is the corner the two
 * walls meet in. Everything that lands on a wall plane runs 20mm into it
 * rather than stopping on it — flush is a shared plane, and a shared plane
 * dithers.
 */
export function Shower({
  position,
  rotation = [0, 0, 0],
  size = 0.85,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
}) {
  const S = size;
  const HEIGHT = 1.9;
  /** Glass, and how far anything meeting a wall is buried in it. */
  const T = 0.01;
  const BURY = 0.02;
  const TRAY = 0.05;

  const steel = <meshStandardMaterial color="#8d9298" roughness={0.3} metalness={0.85} />;
  const glass = (
    <meshPhysicalMaterial
      color="#cfe0e4"
      transparent
      opacity={0.16}
      roughness={0.06}
      metalness={0}
      side={THREE.DoubleSide}
    />
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[(S - BURY) / 2, TRAY / 2, (S - BURY) / 2]} receiveShadow>
        <boxGeometry args={[S + BURY, TRAY, S + BURY]} />
        <meshStandardMaterial {...PORCELAIN} />
      </mesh>

      {/* The upstand, on the two open sides only: it is what keeps the water
          in, so it exists exactly where there is no wall to do the job. */}
      {([
        [[(S - BURY) / 2, TRAY + 0.02, S - 0.02], [S + BURY, 0.04, 0.04]],
        [[S - 0.02, TRAY + 0.02, (S - BURY) / 2], [0.04, 0.04, S + BURY]],
      ] as const).map(([p, a]) => (
        <mesh key={String(p)} position={p as [number, number, number]} receiveShadow>
          <boxGeometry args={a as [number, number, number]} />
          <meshStandardMaterial {...PORCELAIN} />
        </mesh>
      ))}

      {/* the two glazed sides, each one pane */}
      <mesh position={[S - T / 2, TRAY + HEIGHT / 2, (S - BURY) / 2]}>
        <boxGeometry args={[T, HEIGHT, S + BURY]} />
        {glass}
      </mesh>
      <mesh position={[(S - T - BURY) / 2, TRAY + HEIGHT / 2, S - T / 2]}>
        <boxGeometry args={[S - T + BURY, HEIGHT, T]} />
        {glass}
      </mesh>

      {/* Head rails over each pane and a post at each exposed corner. Three
          posts, not four: the fourth corner is the one the walls make. */}
      {([
        [[S, TRAY + HEIGHT, (S - BURY) / 2], [0.016, 0.016, S + BURY]],
        [[(S - BURY) / 2, TRAY + HEIGHT, S], [S + BURY, 0.016, 0.016]],
      ] as const).map(([p, a]) => (
        <mesh key={String(p)} position={p as [number, number, number]}>
          <boxGeometry args={a as [number, number, number]} />
          {steel}
        </mesh>
      ))}
      {([[S, S], [S, 0], [0, S]] as const).map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, TRAY + HEIGHT / 2, z]}>
          <cylinderGeometry args={[0.014, 0.014, HEIGHT, 10]} />
          {steel}
        </mesh>
      ))}

      {/* riser in the corner: a rain head on the gooseneck, a handset below */}
      <mesh position={[0.11, 1.05, 0.11]}>
        <cylinderGeometry args={[0.014, 0.014, 1.9, 12]} />
        <meshStandardMaterial color="#8d9298" roughness={0.28} metalness={0.9} />
      </mesh>
      <mesh position={[0.26, 1.98, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.022, 20]} />
        {steel}
      </mesh>
      <mesh position={[0.17, 1.28, 0.17]} rotation={[0.5, -Math.PI / 4, 0]}>
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
  /* The front, with the porthole cut out of it. A solid front and a disc drawn
     on top would leave nothing for the door to open onto. */
  const front = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(-0.3, -0.42);
    outline.lineTo(0.3, -0.42);
    outline.lineTo(0.3, 0.42);
    outline.lineTo(-0.3, 0.42);
    outline.holes.push(new THREE.Path().absarc(0, 0.02, 0.19, 0, Math.PI * 2, true));
    return new THREE.ShapeGeometry(outline);
  }, []);

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, 0.42, 0]}>
        <OpenBox
          width={0.6}
          height={0.84}
          depth={0.6}
          material={<meshStandardMaterial color="#c8c9c6" roughness={0.42} metalness={0.12} />}
        />
      </group>
      <mesh geometry={front} position={[0, 0.42, 0.302]} castShadow>
        <meshStandardMaterial color="#c8c9c6" roughness={0.42} metalness={0.12} />
      </mesh>

      {/* the drum behind the porthole */}
      <mesh position={[0, 0.44, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.4, 24, 1, true]} />
        <meshStandardMaterial color="#40443f" roughness={0.35} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.44, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.185, 0.185, 0.01, 24]} />
        <meshStandardMaterial color="#33372f" roughness={0.5} metalness={0.4} />
      </mesh>

      <Door label="the washing machine" pivot={[-0.21, 0.44, 0.3]} angle={-2.0}>
        <mesh position={[0, 0.44, 0.312]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.21, 0.02, 28]} />
          <meshStandardMaterial color="#b4b6b3" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.44, 0.318]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.012, 28]} />
          <meshPhysicalMaterial color="#1b1f22" roughness={0.08} metalness={0.3} envMapIntensity={1.4} />
        </mesh>
      </Door>

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
  const lw = width / 2;

  /** One leaf: an aluminium panel with a mirror laid on its face. */
  const leaf = (z: number) => (
    <>
      <mesh position={[0, H / 2, z]} castShadow>
        <boxGeometry args={[lw, H, 0.018]} />
        <meshStandardMaterial {...ANODISED} />
      </mesh>
      {/* Low resolution and heavily blurred: it exists to double the room's
          depth and hand back the lamps, not to be looked into. */}
      <mesh position={[0, H / 2, z + 0.011]}>
        <planeGeometry args={[lw - F * 2, H - F * 2]} />
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
    </>
  );

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, H / 2, 0]}>
        <OpenBox
          width={width}
          height={H}
          depth={D}
          material={<meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.72} metalness={0} />}
        />
      </group>

      {/* rail and shelf, which is all a hanging wardrobe is */}
      <mesh position={[0, H - 0.36, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, width - 0.06, 10]} />
        <meshStandardMaterial color="#8d9095" roughness={0.32} metalness={0.85} />
      </mesh>
      <mesh position={[0, H - 0.22, -0.01]} receiveShadow>
        <boxGeometry args={[width - 0.04, 0.018, D - 0.05]} />
        <meshStandardMaterial color={OAK.back} roughness={0.8} metalness={0} />
      </mesh>

      {/* Two leaves in two tracks, the front one the only one that moves — that
          is what a slider is, and it is why the carcass behind is only ever
          half open. The pair used to be one reflector plane with the meeting
          stile drawn over it, which cost one render target instead of two; a
          leaf that slides cannot share a plane with the one it slides over. */}
      <group position={[lw / 2, 0, 0]}>{leaf(D / 2 + 0.01)}</group>
      <Drawer label="the wardrobe" to={[lw, 0, 0]}>
        <group position={[-lw / 2, 0, 0]}>{leaf(D / 2 + 0.032)}</group>
      </Drawer>

      {/* head and foot track */}
      {[H - F / 2, F / 2].map((y) => (
        <mesh key={y} position={[0, y, D / 2 + 0.026]}>
          <boxGeometry args={[width, F, 0.056]} />
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
      {/* The two rows are separate carcasses, which is what the reveal between
          them is the end of. */}
      {[0, 1].map((row) => (
        <group key={row} position={[0, bottom + rowH * (row + 0.5), 0]}>
          <OpenBox
            width={width}
            height={rowH}
            depth={D}
            material={<meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.72} metalness={0} />}
          />
        </group>
      ))}

      {/* Doors separated by a reveal. Push-open in the real room, so no
          handles — the shadow gaps are the whole detail. Each hinges on the
          side away from the middle of the run. */}
      {Array.from({ length: cols * 2 }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = -width / 2 + w * (col + 0.5);
        const cy = bottom + rowH * (row + 0.5);
        const hw = (w - 0.016) / 2;
        const right = col === cols - 1;
        return (
          <Door
            key={i}
            label="the cupboard"
            pivot={[cx + (right ? hw : -hw), cy, D / 2]}
            angle={right ? 1.8 : -1.8}
          >
            <mesh position={[cx, cy, D / 2 + 0.005]} castShadow>
              <boxGeometry args={[w - 0.016, rowH - 0.016, 0.018]} />
              <meshStandardMaterial {...oak} color={OAK.case} roughness={0.6} metalness={0} />
            </mesh>
          </Door>
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

/** Beige, and deliberately a low-value one. The pair is nearly 7 square metres
 *  — by far the largest single colour in the flat — so at the value real
 *  unbleached cotton has it becomes a lightbox on the one wall that is supposed
 *  to be reading as night. Same reasoning as the bed's LINEN above. */
const CURTAIN = "#8a7f6d";

/**
 * One panel of gathered fabric, hanging from local y 0 up to `height` and
 * running from local x 0 out to `dir * width`.
 *
 * The folds are baked into the plane rather than modelled as slabs, which is
 * what makes the gather work: sliding the panel open scales this geometry down
 * in x, and the waves bunch closer together exactly as cloth does. Slabs would
 * have to overlap each other instead, and a curtain that slides without
 * gathering leaves half the window covered when it is open.
 *
 * Local x 0 is the OUTER edge — the end that stays put — so scaling x is all
 * the animation needs.
 */
function curtainPanel(width: number, height: number, dir: 1 | -1) {
  const folds = Math.max(4, Math.round(width / 0.19));
  /* Ten segments a fold, not five. At five the wave is sampled too coarsely to
     shade as a curve and the panel comes out as hard vertical stripes — a
     venetian blind in cloth colours. */
  const g = new THREE.PlaneGeometry(width, height, folds * 10, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + width / 2) / width;
    /* A second, slower wave over the first. One clean sine is a corrugated
       sheet; beating two makes the folds sit unevenly the way hung cloth
       does. */
    const fold = Math.sin(u * folds * Math.PI * 2);
    const drift = Math.sin(u * Math.PI * 2 * 1.7 + 0.8);
    p.setZ(i, fold * 0.03 * (0.78 + 0.22 * drift));
  }
  g.translate((dir * width) / 2, height / 2, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * Curtains: a pair on a ceiling track, floor length, that draw to the sides.
 *
 * They start open, because what is outside the glass is the only thing in the
 * flat you cannot walk to and shutting it away by default would throw it out.
 * Pressing either panel works the pair, the way a cord does — a panel you can
 * only slide on its own is two objects where the room has one.
 *
 * Origin at the centre of the run, at the hem; local +x along the track, local
 * +z into the room.
 */
export function Curtains({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  /** How much of its drawn width a panel keeps once gathered. */
  gather = 0.3,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  gather?: number;
}) {
  const half = width / 2;
  const left = useMemo(() => curtainPanel(half, height, 1), [half, height]);
  const right = useMemo(() => curtainPanel(half, height, -1), [half, height]);
  useEffect(
    () => () => {
      left.dispose();
      right.dispose();
    },
    [left, right],
  );

  const [shut, setShut] = useState(false);
  const l = useRef<THREE.Group>(null);
  const r = useRef<THREE.Group>(null);
  /* `useEase` also flags the shadow map, which these need more than anything
     else in the flat: 7 square metres crossing the only window. */
  useEase(shut, (t) => {
    const s = gather + (1 - gather) * t;
    l.current?.scale.setX(s);
    r.current?.scale.setX(s);
  });

  return (
    <group position={position} rotation={rotation}>
      {/* The track, and a bracket at each end. It is screwed to the ceiling
          rather than over the window, which is what makes the drop read as
          full height instead of as a blind that grew. */}
      <mesh position={[0, height + 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, width + 0.1, 10]} />
        <meshStandardMaterial color="#8d9298" roughness={0.34} metalness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (half + 0.05), height + 0.055, 0]}>
          <boxGeometry args={[0.02, 0.05, 0.02]} />
          <meshStandardMaterial color="#8d9298" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}

      <Interactive
        label="the curtains"
        verb={shut ? "open" : "close"}
        onActivate={() => setShut((v) => !v)}
      >
        <group>
          {([[left, l, -half], [right, r, half]] as const).map(([geo, ref, x], i) => (
            <group key={i} ref={ref} position={[x, 0, 0]}>
              <mesh geometry={geo} castShadow receiveShadow>
                <meshStandardMaterial
                  color={CURTAIN}
                  roughness={0.94}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          ))}
        </group>
      </Interactive>
    </group>
  );
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
