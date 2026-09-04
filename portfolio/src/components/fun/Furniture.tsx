"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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
 * The desk chair: a five-star task chair on castors, with a gas lift, a
 * shaped seat pan, a lumbar back on a single spine and loop arms.
 *
 * It replaced a scanned leather dining chair, which was a real chair and still
 * wrong — the one seat in the flat that is worked in read as one pulled over
 * from the table. A task chair is the opposite case to a Windsor: everything
 * below the seat is extruded nylon and a steel column, which is what these
 * primitives already are.
 *
 * Origin on the floor under the column, local +z the direction the sitter
 * faces. Nothing below the seat casts a shadow, for the reason `WoodChair`
 * gives.
 */
export function TaskChair({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const SEAT_H = 0.46;
  const W = 0.47;
  const D = 0.45;
  /** Top of the backrest. Higher than a dining chair and lower than a gaming
   *  one, which is the difference between the two shapes at this distance. */
  const BACK_TOP = 1.0;
  const BACK_H = BACK_TOP - 0.6;
  const LEAN = 0.16;
  /** Star radius. Wider than the seat, or the chair reads as tipping. */
  const STAR = 0.32;

  const nylon = (
    <meshStandardMaterial color="#26282b" roughness={0.55} metalness={0.15} />
  );
  const steel = (
    <meshStandardMaterial color="#4a4d52" roughness={0.4} metalness={0.6} />
  );
  const pad = (
    <meshStandardMaterial color={WOOL} roughness={0.9} metalness={0} />
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Five arms and five castors. The arms taper and drop toward the floor,
          so the star sits on its rim rather than lying flat like a plate. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0, 0.075, STAR / 2]} rotation={[0.09, 0, 0]}>
              <boxGeometry args={[0.055, 0.038, STAR]} />
              {nylon}
            </mesh>
            {/* castor: a wheel on its side, on a short stem */}
            <mesh position={[0, 0.048, STAR - 0.01]}>
              <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
              {nylon}
            </mesh>
            <mesh
              position={[0, 0.026, STAR - 0.01]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.026, 0.026, 0.022, 12]} />
              {nylon}
            </mesh>
          </group>
        );
      })}

      {/* hub, then the column: a steel shaft inside a nylon shroud */}
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.055, 0.062, 0.075, 12]} />
        {nylon}
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.037, 0.042, 0.19, 12]} />
        {nylon}
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.021, 0.021, 0.13, 10]} />
        {steel}
      </mesh>

      {/* The tilt mechanism under the pan, and the paddle on its right. */}
      <RoundedBox
        position={[0, SEAT_H - 0.075, -0.01]}
        args={[0.17, 0.055, 0.24]}
        radius={0.012}
        smoothness={3}
      >
        {nylon}
      </RoundedBox>
      <mesh
        position={[0.12, SEAT_H - 0.075, 0.05]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
        {steel}
      </mesh>

      {/* Seat pan. Squashed on y so the rounding gives a soft edge all round
          rather than a cushion, and tipped a degree back the way a seat with
          any tension on it sits. */}
      <group position={[0, SEAT_H - 0.03, 0.01]} rotation={[0.035, 0, 0]}>
        <RoundedBox
          args={[W, 0.075, D]}
          radius={0.03}
          smoothness={4}
          castShadow
          receiveShadow
        >
          {pad}
        </RoundedBox>
        {/* the waterfall front edge, rolled under */}
        <mesh position={[0, -0.012, D / 2 - 0.015]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.033, 0.033, W - 0.06, 12]} />
          {pad}
        </mesh>
      </group>

      {/* The spine: one arm off the back of the mechanism, leaning with the
          backrest. A task chair carries its back on this and nothing else,
          which is the gap under the lumbar that gives the shape away. */}
      <mesh
        position={[0, SEAT_H + 0.06, -D / 2 + 0.02 - Math.sin(LEAN) * 0.06]}
        rotation={[LEAN, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.075, 0.24, 0.045]} />
        {nylon}
      </mesh>

      {/* Backrest, on the spine and leaning off it. The frame stands a little
          proud of the pad on all four sides, so the back reads as a shell with
          something stretched in it. */}
      <group
        position={[
          0,
          BACK_TOP - BACK_H / 2,
          -D / 2 + 0.035 - Math.sin(LEAN) * (BACK_TOP - BACK_H / 2 - SEAT_H),
        ]}
        rotation={[LEAN, 0, 0]}
      >
        <RoundedBox
          args={[0.44, BACK_H, 0.05]}
          radius={0.022}
          smoothness={4}
          castShadow
          receiveShadow
        >
          {nylon}
        </RoundedBox>
        <RoundedBox
          position={[0, 0, 0.028]}
          args={[0.395, BACK_H - 0.05, 0.035]}
          radius={0.016}
          smoothness={4}
          castShadow
        >
          {pad}
        </RoundedBox>
        {/* lumbar swell, low on the back where one belongs */}
        <mesh position={[0, -BACK_H / 2 + 0.1, 0.035]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.038, 0.038, 0.36, 12]} />
          {pad}
        </mesh>
      </group>

      {/* Loop arms: an upright off the seat, a curve forward, a pad along the
          top. Kept below the desk's 0.755 apron so the chair can be pushed in
          without a rest standing on the desk. */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * (W / 2 - 0.005), 0, 0]}>
          <mesh position={[0, SEAT_H + 0.09, -0.09]} castShadow>
            <boxGeometry args={[0.026, 0.19, 0.05]} />
            {nylon}
          </mesh>
          <RoundedBox
            position={[0, SEAT_H + 0.195, 0.02]}
            args={[0.05, 0.028, 0.23]}
            radius={0.012}
            smoothness={3}
            castShadow
          >
            {nylon}
          </RoundedBox>
        </group>
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

/**
 * One piece of a cut worktop, carrying its share of the whole top's UVs.
 *
 * A box is mapped 0..1 on every face whatever its size, so four of them butted
 * together tile the veneer four times at four different scales and every cut
 * shows as a change of grain. Remapped, the four read as one board with a hole
 * in it.
 */
function TopSlice({
  x,
  z,
  w,
  d,
  y,
  thickness,
  span,
  oak,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  thickness: number;
  /** The uncut top this piece was taken out of: centre z, and both extents. */
  span: { z: number; w: number; d: number };
  oak: Surface;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(w, thickness, d);
    const uv = g.attributes.uv;
    const u0 = (x - w / 2 + span.w / 2) / span.w;
    const v0 = (z - d / 2 - span.z + span.d / 2) / span.d;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * (w / span.w), v0 + uv.getY(i) * (d / span.d));
    }
    return g;
  }, [x, z, w, d, thickness, span.z, span.w, span.d]);
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo} position={[x, y, z]} receiveShadow>
      <meshStandardMaterial {...oak} color={OAK.case} roughness={0.5} metalness={0} />
    </mesh>
  );
}

/**
 * A run's worktop: one slab, or the four pieces a sink cutout leaves. The
 * pieces butt rather than overlap — two tops sharing a plane flicker, which is
 * the same trap `topDrop` exists for.
 */
function Worktop({
  y,
  z,
  w,
  d,
  thickness,
  cutout,
  oak,
}: {
  y: number;
  z: number;
  w: number;
  d: number;
  thickness: number;
  cutout?: { x: number; w: number; d: number };
  oak: Surface;
}) {
  if (!cutout) {
    return (
      <RoundedBox
        position={[0, y, z]}
        args={[w, thickness, d]}
        radius={0.005}
        smoothness={3}
        castShadow={false}
        receiveShadow
      >
        <meshStandardMaterial {...oak} color={OAK.case} roughness={0.5} metalness={0} />
      </RoundedBox>
    );
  }

  const span = { z, w, d };
  const [x0, x1] = [cutout.x - cutout.w / 2, cutout.x + cutout.w / 2];
  const [z0, z1] = [-cutout.d / 2, cutout.d / 2];
  const [back, front] = [z - d / 2, z + d / 2];
  const slice = { y, thickness, span, oak };

  return (
    <>
      <TopSlice {...slice} x={(-w / 2 + x0) / 2} w={x0 + w / 2} z={z} d={d} />
      <TopSlice {...slice} x={(x1 + w / 2) / 2} w={w / 2 - x1} z={z} d={d} />
      {/* the rails the tap stands on and the front lip you lean against */}
      <TopSlice {...slice} x={cutout.x} w={cutout.w} z={(back + z0) / 2} d={z0 - back} />
      <TopSlice {...slice} x={cutout.x} w={cutout.w} z={(z1 + front) / 2} d={front - z1} />
    </>
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
  cutout,
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
   * A hole through the worktop for an inset bowl, in the run's own x and
   * centred on its z. A hob sits on the top and needs nothing; a sink goes
   * through it, and painting the bowl on the oak is what made this one read as
   * a tray somebody had left out.
   */
  cutout?: { x: number; w: number; d: number };
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
        {/* No lid where a bowl hangs through the worktop, or the carcass top
            is what you see down the plughole. It is under the top everywhere
            else, so nothing else notices it has gone. */}
        <OpenBox
          width={length}
          height={bodyH}
          depth={D}
          openTop={!!cutout}
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
      <Worktop
        y={H - TOP / 2 - topDrop}
        z={0.012}
        w={length + 0.02}
        d={D + 0.024}
        thickness={TOP}
        cutout={cutout}
        oak={oak}
      />

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
/** Every tap in the flat, one metal. Gunmetal rather than bright steel: these
 *  all stand under a light, and a brighter finish comes back looking like the
 *  brass they used to be. */
const TAP = { color: "#61686e", roughness: 0.28, metalness: 0.6, envMapIntensity: 0.7 } as const;

/**
 * Vertical streaks on a translucent ground, wrapping top to bottom so a stream
 * can be scrolled through it without a seam. Greyscale, because it serves as
 * the alpha map as well and that reads the green channel.
 *
 * Placed off a hash rather than `Math.random`: three taps that differ for no
 * reason is worse than three that match, and a stream should look the same
 * every time it is turned on.
 */
function waterTexture() {
  const w = 32;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  const rnd = (i: number, k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  x.fillStyle = "#6e6e6e";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) {
    const sx = rnd(i, 1) * w;
    const sy = rnd(i, 2) * h;
    const len = 14 + rnd(i, 3) * 54;
    const wd = 1 + rnd(i, 4) * 1.4;
    const v = Math.round(150 + rnd(i, 5) * 105);
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(sx, sy, wd, len);
    /* A streak running off the bottom has to come back on at the top, or the
       scroll shows a line where the texture wraps. */
    if (sy + len > h) x.fillRect(sx, sy - h, wd, len);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Running water: the falling stream and the ring where it lands.
 *
 * A cylinder with the streaks scrolled down it. Water at this size is the
 * streaks moving and nothing else — held still, a translucent cylinder reads
 * as a glass rod. The ring is there for the same reason: a stream landing in a
 * dry basin reads as one too.
 *
 * Origin at the spout, falling to -height. Mounted only while the tap is on,
 * so the scroll costs nothing the rest of the time.
 */
function Water({
  radius,
  height,
  spread = 1.4,
  opacity = 0.52,
}: {
  radius: number;
  height: number;
  /** How much wider the stream lands than it leaves. */
  spread?: number;
  opacity?: number;
}) {
  const map = useMemo(() => waterTexture(), []);
  const ripple = useRef<THREE.Mesh>(null);
  useEffect(() => () => map.dispose(), [map]);

  useFrame(({ clock }, dt) => {
    map.offset.y -= Math.min(dt, 0.05) * 3.4;
    const r = ripple.current;
    if (r) {
      const k = 0.88 + Math.sin(clock.elapsedTime * 8.4) * 0.11;
      r.scale.set(k, k, 1);
    }
  });

  return (
    <group>
      <mesh position={[0, -height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * spread, height, 12, 1, true]} />
        <meshStandardMaterial
          color="#dbeaf0"
          map={map}
          alphaMap={map}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          roughness={0.12}
          metalness={0}
        />
      </mesh>
      <mesh ref={ripple} position={[0, -height + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * spread * 1.2, radius * spread * 4, 20]} />
        <meshBasicMaterial
          color="#cfe2ea"
          transparent
          opacity={opacity * 0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** The hole the bowl needs in the worktop. The run cuts it and the sink fills
 *  it, so the two read the size from here rather than from each other. */
export const SINK_HOLE = { w: 0.42, d: 0.36 };

/**
 * A single-bowl inset sink and its mixer.
 *
 * The bowl is a real well hung through the worktop, not a dark rectangle laid
 * on it — which is what this was, and it read as a doormat. Everything else on
 * a counter sits on the top; a sink is the one thing that goes through it, and
 * nothing about it works until the hole is real.
 */
export function Sink({ position }: { position: [number, number, number] }) {
  /** The oak's top face. The steel rim sits a hair over it the way a
   *  top-mounted sink does: flush would share a plane with the wood it laps
   *  onto, and a shared plane flickers. */
  const TOP = 0.9015;
  const DEEP = 0.15;
  /** How far the rim laps onto the oak on each side. */
  const LAP = 0.012;
  const RIM = 0.022;

  const steel = (
    <meshStandardMaterial
      color="#979ea4"
      roughness={0.34}
      metalness={0.6}
      envMapIntensity={1.3}
    />
  );
  const tap = <meshStandardMaterial {...TAP} />;
  const [on, setOn] = useState(false);

  return (
    <group position={position}>
      {/* The well. `OpenBox` is a box short one face with a lip around the
          opening, which is a sink: five steel walls and a rolled rim. */}
      <group position={[0, TOP - DEEP / 2, 0]}>
        <OpenBox
          width={SINK_HOLE.w + LAP * 2}
          height={DEEP}
          depth={SINK_HOLE.d + LAP * 2}
          thickness={RIM}
          face="py"
          material={steel}
        />
      </group>

      {/* waste, off centre toward the back the way a single bowl's is */}
      <mesh position={[0, TOP - DEEP + 0.003, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 20]} />
        <meshStandardMaterial color="#16191b" roughness={0.55} metalness={0.5} />
      </mesh>

      {/* Mixer on the back rail: a column, a half-round gooseneck and a nozzle
          over the bowl. The arc is a half torus turned into the run's z, so
          its two ends land on the column and on the nozzle without either
          having to be aimed by hand. */}
      <Interactive
        label="the kitchen tap"
        verb={on ? "turn it off" : "run the tap"}
        onActivate={() => setOn((o) => !o)}
      >
        <mesh position={[0, 0.98, -0.24]} castShadow>
          <cylinderGeometry args={[0.019, 0.022, 0.16, 14]} />
          {tap}
        </mesh>
        <mesh position={[0, 1.06, -0.15]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.09, 0.016, 10, 28, Math.PI]} />
          {tap}
        </mesh>
        <mesh position={[0, 1.03, -0.06]}>
          <cylinderGeometry args={[0.016, 0.016, 0.06, 12]} />
          {tap}
        </mesh>
        <mesh position={[0, 0.996, -0.06]}>
          <cylinderGeometry args={[0.019, 0.019, 0.012, 12]} />
          <meshStandardMaterial color="#6f757a" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* The lever, off the side of the column. Turned down with the tap: it
            is the one part that says which way the mixer is set, and a lever
            that never moves gives the whole fitting away. */}
        <mesh position={[0.045, 1.055, -0.24]} rotation={[0, 0, on ? 0.5 : -0.35]}>
          <cylinderGeometry args={[0.008, 0.009, 0.075, 10]} />
          {tap}
        </mesh>
      </Interactive>

      {on && (
        <group position={[0, 0.99, -0.06]}>
          <Water radius={0.009} height={0.99 - (TOP - DEEP) - 0.004} />
        </group>
      )}
    </group>
  );
}

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
 * The pan is an open tapered tube rather than a rounded box with a ring drawn
 * on it. A box cannot have a bowl: its top face is exactly where the water
 * should be and everything under it is buried, which is the same trap the two
 * sinks were in. A tube is double-sided, so the one surface is the porcelain
 * you see from outside and the bowl you see from above.
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
  /** Boxing height, and the plate on it. The plate has to clear a raised lid:
   *  standing up, the lid reaches 1.0, and a plate at the old 0.92 was behind
   *  it — you could open the toilet or flush it, never both. */
  const DUCT_H = 1.2;
  const PLATE_Y = 1.09;

  /** Pan: rim height, how far it stands off the wall, and the squash that
   *  turns the tube's circle into the ellipse a pan actually is. */
  const RIM = 0.5;
  const PAN_Z = 0.245;
  const OVAL = 1.3;
  const R_TOP = 0.175;
  const R_LOW = 0.112;
  const PAN_H = 0.24;
  /** Resting water line, a little under half way down the bowl. */
  const WATER = 0.395;

  const porcelain = <meshStandardMaterial {...PORCELAIN} />;

  /* The flush, as a single 0..1 phase. Held in a ref and advanced in the frame
     loop rather than kept in state: it runs for two seconds and touches two
     transforms, and re-rendering the bathroom sixty times to move a disc is
     the one cost this could add to a room that already draws continuously. */
  const phase = useRef(1);
  const water = useRef<THREE.Mesh>(null);
  const swirl = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (phase.current >= 1) return;
    const t = Math.min(phase.current + Math.min(dt, 0.05) / 2.4, 1);
    phase.current = t;
    /* Down fast and back up slow: a cistern empties in about a second and
       takes the next two to refill, and a level that returns as quickly as it
       left reads as a bounce. */
    const drop = t < 0.22 ? t / 0.22 : 1 - (t - 0.22) / 0.78;
    if (water.current) water.current.position.y = WATER - drop * 0.075;
    if (swirl.current) {
      swirl.current.visible = t < 1;
      swirl.current.rotation.z -= dt * 9 * drop;
      const m = swirl.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.3 * drop;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* the boxing, tiled like the wall it continues */}
      <mesh position={[0, DUCT_H / 2, -DUCT_D / 2]} receiveShadow>
        <boxGeometry args={[DUCT_W, DUCT_H, DUCT_D]} />
        <meshStandardMaterial color="#575049" roughness={0.6} metalness={0} />
      </mesh>

      {/* Flush plate: a plate and the two buttons on it, which is the pair
          every cistern buried in a wall here has. */}
      <Interactive
        label="the flush plate"
        verb="flush"
        onActivate={() => {
          phase.current = 0;
        }}
      >
        <mesh position={[0, PLATE_Y, 0.004]}>
          <boxGeometry args={[0.2, 0.14, 0.012]} />
          <meshStandardMaterial {...PORCELAIN} roughness={0.34} />
        </mesh>
        {([[-0.045, 0.05], [0.045, 0.036]] as const).map(([x, w]) => (
          <mesh key={x} position={[x, PLATE_Y, 0.013]}>
            <boxGeometry args={[w, 0.09, 0.006]} />
            <meshStandardMaterial color="#c9c3b7" roughness={0.42} metalness={0.1} />
          </mesh>
        ))}
      </Interactive>

      {/* The collar between the duct and the pan, which is what makes it read
          as hung off the wall rather than standing clear of it. */}
      <RoundedBox
        position={[0, RIM - 0.075, 0.055]}
        args={[0.25, 0.16, 0.14]}
        radius={0.05}
        smoothness={3}
        castShadow
      >
        {porcelain}
      </RoundedBox>

      <group position={[0, 0, PAN_Z]} scale={[1, 1, OVAL]}>
        {/* the pan itself: outside and bowl in one double-sided surface */}
        <mesh position={[0, RIM - PAN_H / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[R_TOP, R_LOW, PAN_H, 26, 1, true]} />
          <meshStandardMaterial {...PORCELAIN} side={THREE.DoubleSide} />
        </mesh>
        {/* the rim, capping an edge that is otherwise a paper thickness */}
        <mesh position={[0, RIM, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R_TOP, 0.009, 8, 26]} />
          {porcelain}
        </mesh>
        {/* the trap under it, closed off */}
        <mesh position={[0, RIM - PAN_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[R_LOW, 20]} />
          <meshStandardMaterial color="#8f897c" roughness={0.5} />
        </mesh>

        <mesh ref={water} position={[0, WATER, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.146, 24]} />
          <meshStandardMaterial
            color="#7f8f96"
            roughness={0.08}
            metalness={0.2}
            transparent
            opacity={0.86}
            envMapIntensity={1.6}
          />
        </mesh>
        {/* Only while it is flushing: the pull of the water going round. */}
        <mesh
          ref={swirl}
          visible={false}
          position={[0, WATER + 0.004, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.05, 0.135, 22, 1, 0, Math.PI * 1.35]} />
          <meshBasicMaterial color="#dceaf0" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>

        {/* the seat, sat on the rim */}
        <mesh position={[0, RIM + 0.023, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.148, 0.023, 8, 28]} />
          <meshStandardMaterial {...PORCELAIN} roughness={0.34} />
        </mesh>
      </group>

      {/* The lid, hinged at the back the way one is. An oval off the pan's own
          radius and squash, not a rounded box: a lid is cut to the china under
          it, and a rectangle laid over an oval pan overhangs it on all four
          corners.

          It stops a few degrees past upright — far enough to stay there,
          not so far that its top edge swings back inside the boxing. */}
      <Door label="the toilet lid" pivot={[0, RIM + 0.05, 0.03]} axis="x" angle={-1.62}>
        <group position={[0, RIM + 0.05, PAN_Z]} scale={[1, 1, OVAL]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[R_TOP + 0.004, R_TOP + 0.008, 0.022, 26]} />
            <meshStandardMaterial {...PORCELAIN} roughness={0.32} />
          </mesh>
        </group>
      </Door>
    </group>
  );
}

/**
 * The vanity: a run of drawers and a countertop basin. The mirror over it is
 * `WallCabinet`, which carries the glass on its own doors. Origin at the wall
 * face, local +z into the room, so it is placed the same way the duct and the
 * wall units are.
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
  /** Counter face, and the basin standing on it. */
  const TOP = H + 0.1;
  const BOWL = 0.12;
  const RIM = TOP + BOWL;
  /** Where the spout hangs, and the floor of the well under it. */
  const SPOUT = { x: 0.06, y: RIM + 0.07, z: 0.2 };
  const FLOOR = TOP + 0.016;

  const tap = <meshStandardMaterial {...TAP} />;
  const [on, setOn] = useState(false);

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
      {/* A basin standing on the slab, not sunk into it. Sunk would mean
          cutting the top into four the way the kitchen worktop is cut, and a
          vanity this narrow gets a countertop bowl anyway — which is the one
          way the well can be real rather than painted on the stone. */}
      <group position={[SPOUT.x, TOP + BOWL / 2, SPOUT.z]}>
        <OpenBox
          width={0.42}
          height={BOWL}
          depth={0.24}
          thickness={0.016}
          face="py"
          material={<meshStandardMaterial {...PORCELAIN} roughness={0.24} />}
        />
      </group>
      <mesh position={[SPOUT.x, FLOOR + 0.002, SPOUT.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.014, 0.028, 18]} />
        <meshStandardMaterial color="#6f7478" roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* The mixer, built as the kitchen's is so the two read as one flat's
          fittings: column, half-round gooseneck, nozzle. The arc's two ends
          land on the column and over the waste by construction. */}
      <Interactive
        label="the basin tap"
        verb={on ? "turn it off" : "run the tap"}
        onActivate={() => setOn((o) => !o)}
      >
        <mesh position={[SPOUT.x, (TOP + SPOUT.y + 0.04) / 2, 0.045]} castShadow>
          <cylinderGeometry args={[0.015, 0.018, SPOUT.y + 0.04 - TOP, 14]} />
          {tap}
        </mesh>
        <mesh
          position={[SPOUT.x, SPOUT.y + 0.04, (0.045 + SPOUT.z) / 2]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <torusGeometry args={[(SPOUT.z - 0.045) / 2, 0.014, 10, 26, Math.PI]} />
          {tap}
        </mesh>
        <mesh position={[SPOUT.x, SPOUT.y + 0.018, SPOUT.z]}>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 12]} />
          {tap}
        </mesh>
        <mesh position={[SPOUT.x, SPOUT.y - 0.004, SPOUT.z]}>
          <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
          <meshStandardMaterial color="#6f757a" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh
          position={[SPOUT.x + 0.04, SPOUT.y + 0.03, 0.045]}
          rotation={[0, 0, on ? 0.5 : -0.35]}
        >
          <cylinderGeometry args={[0.007, 0.008, 0.07, 10]} />
          {tap}
        </mesh>
      </Interactive>

      {on && (
        <group position={[SPOUT.x, SPOUT.y - 0.008, SPOUT.z]}>
          <Water radius={0.008} height={SPOUT.y - 0.008 - FLOOR} />
        </group>
      )}
    </group>
  );
}

/**
 * The mirror cabinet over the basin: a carcass with two mirror-fronted doors
 * that open out like a wardrobe's.
 *
 * It is the bathroom's only mirror, which is why it hangs here rather than on
 * the wall past the WC where it used to — a cabinet you cannot see yourself in
 * while you are at the basin is a cupboard, and the flat already had one of
 * those over the toilet.
 *
 * Origin at the wall face on the cabinet's centre line, local +z into the room.
 */
export function WallCabinet({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.7;
  const H = 0.66;
  const D = 0.16;
  /** How far the carcass runs into the wall behind it. Sat flush, its back
   *  panel shares a plane with the wall and the two dither against each other
   *  — which inside a lit cupboard came out as a chequerboard, not as the
   *  usual thin flickering line. */
  const BURY = 0.02;
  /** Gap down the middle, so the two leaves read as two and not as one pane
   *  with a line drawn on it. */
  const GAP = 0.006;
  const LEAF = (W - GAP) / 2;

  /* The same glass the vanity used to carry on the wall behind this. Kept a
     dim grey rather than a true mirror: nothing in the room reflects, and at
     this size a black rectangle reads as a hole in the wall. */
  const mirror = (
    <meshStandardMaterial color="#4a5057" roughness={0.05} metalness={0.55} envMapIntensity={2.4} />
  );

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, 0, (D - BURY) / 2]}>
        <OpenBox
          width={W}
          height={H}
          depth={D + BURY}
          material={<meshStandardMaterial {...PORCELAIN} roughness={0.5} />}
        />
      </group>
      {/* two shelves, which is what is behind a door this tall */}
      {[-0.11, 0.11].map((y) => (
        <mesh key={y} position={[0, y, D / 2 - 0.008]} receiveShadow>
          <boxGeometry args={[W - 0.03, 0.012, D - 0.03]} />
          <meshStandardMaterial {...PORCELAIN} roughness={0.6} />
        </mesh>
      ))}

      {/* Both leaves hinge on the outer edge and swing into the room. The sign
          of the angle follows the pivot: a leaf whose free edge is at +x from
          its hinge opens on a negative one, and the mirrored leaf on a
          positive. */}
      {([-1, 1] as const).map((side) => (
        <Door
          key={side}
          label="the mirror cabinet"
          pivot={[side * (W / 2), 0, D]}
          angle={side * 1.9}
        >
          <group position={[side * (LEAF + GAP) / 2, 0, 0]}>
            <mesh position={[0, 0, D + 0.008]} castShadow>
              <boxGeometry args={[LEAF, H - 0.014, 0.016]} />
              <meshStandardMaterial {...PORCELAIN} roughness={0.38} />
            </mesh>
            {/* the glass, laid on the front and inset so the leaf keeps an edge */}
            <mesh position={[0, 0, D + 0.018]}>
              <boxGeometry args={[LEAF - 0.024, H - 0.038, 0.004]} />
              {mirror}
            </mesh>
          </group>
        </Door>
      ))}
    </group>
  );
}

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
  const [on, setOn] = useState(false);
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

      {/* The fixed pane, on the side the washing machine stands against. */}
      <mesh position={[(S - T - BURY) / 2, TRAY + HEIGHT / 2, S - T / 2]}>
        <boxGeometry args={[S - T + BURY, HEIGHT, T]} />
        {glass}
      </mesh>

      {/* The door, on the only side of the enclosure with room in front of it.
          Hinged on the corner post nearest the WC, so it opens back across the
          room. Stopped at 63 degrees: the pan's nearest corner is 0.79m off
          this hinge against a 0.85m leaf, so anywhere between about 66 and 82
          degrees the outer edge is inside the china. */}
      <Door label="the shower door" pivot={[S, 0, 0]} angle={1.1}>
        <mesh position={[S - T / 2, TRAY + HEIGHT / 2, (S - BURY) / 2]}>
          <boxGeometry args={[T, HEIGHT, S + BURY]} />
          {glass}
        </mesh>
        {/* handle, on the outside of the swinging edge */}
        <mesh position={[S + 0.03, TRAY + HEIGHT / 2, S - 0.14]}>
          <boxGeometry args={[0.05, 0.22, 0.018]} />
          {steel}
        </mesh>
      </Door>

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
      <Interactive
        label="the shower"
        verb={on ? "turn it off" : "turn it on"}
        onActivate={() => setOn((o) => !o)}
      >
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
      </Interactive>

      {/* Falls the full height of the enclosure. Thinner and fainter than a
          tap's: a rain head is a lot of small streams, and drawn at a tap's
          weight the column comes out looking solid. */}
      {on && (
        <group position={[0.26, 1.967, 0.26]}>
          <Water radius={0.078} height={1.967 - TRAY} spread={1.06} opacity={0.3} />
        </group>
      )}
    </group>
  );
}

/**
 * Two towels on chrome hooks.
 *
 * In the door reveal, on the left as you come in. The jamb there is the whole
 * 0.42m between the hall's built-in and the opening rather than the wall's
 * 0.10, so that side of the doorway is a deep nook — which is the only face in
 * the bathroom these belong on. They hang from one point each rather than
 * folded
 * over a rail: gathered to almost nothing at the hook and flaring as they
 * fall, which is the shape a towel on a hook actually makes and the reason a
 * rounded box does not read as one.
 *
 * Thin. A towel hanging free is a couple of centimetres front to back at the
 * top and not much more at the hem — the drape is a squashed taper, not a
 * slab.
 *
 * Origin at the wall face, local +z into the room.
 */
export function Towels({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const HOOK_Y = 1.62;
  /**
   * Across, length, hang, how far it stands off the wall, colour. Two of each,
   * because a matching pair hung dead straight reads as one towel drawn twice.
   *
   * The colours are well under the ones they read as: the wall takes the
   * hall's lamp full on, and at a true linen and mid-grey both came back cream.
   *
   * The second is stepped forward because at this spacing the hems cross, and
   * two slabs sharing a plane z-fight into stripes — the same step the coats on
   * the hall rail are given.
   */
  const TOWELS: [number, number, number, number, string][] = [
    [-0.06, 0.97, 0.035, 0, "#8f8574"],
    [0.06, 0.88, -0.028, 0.026, "#4a4d50"],
  ];
  const chrome = (
    <meshStandardMaterial color="#b7bcc0" roughness={0.16} metalness={0.9} />
  );

  return (
    <group position={position} rotation={rotation}>
      {TOWELS.map(([x, len, tilt, step, colour]) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, 0, tilt]}>
          {/* the rose flat to the wall, then the peg off it */}
          <mesh position={[0, HOOK_Y, 0.007]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.023, 0.023, 0.014, 16]} />
            {chrome}
          </mesh>
          {/* A straight peg, not a J. Long enough that both towels find it:
              the stepped one hangs further out along the same length. */}
          <mesh position={[0, HOOK_Y, 0.042]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.007, 0.007, 0.075, 10]} />
            {chrome}
          </mesh>

          {/* The drape. A taper squashed on z: 90mm across and 20mm deep where
              the hook has it, 300mm across and 60mm deep at the hem.

              Leaned off the wall about the hook, not about the group's origin
              — that sits on the floor, and a few degrees there swings the whole
              towel back through the wall it hangs on. */}
          <group position={[0, HOOK_Y - 0.021, 0.04 + step]} rotation={[-0.07, 0, 0]}>
            <group position={[0, -len / 2, 0]} scale={[1, 1, 0.2]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.045, 0.15, len, 8, 1]} />
                <meshStandardMaterial color={colour} roughness={0.96} metalness={0} />
              </mesh>
            </group>
          </group>
          {/* The loop it hangs by. A torus lies in xy as it comes, which is
              already the plane across the peg — turned flat it read as a ring
              lying on nothing and left the towel hanging in mid-air under it. */}
          <mesh position={[0, HOOK_Y, 0.04 + step]}>
            <torusGeometry args={[0.021, 0.0045, 6, 16]} />
            <meshStandardMaterial color={colour} roughness={0.96} metalness={0} />
          </mesh>
        </group>
      ))}
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

      {/* Opens to a right angle and no further. Hinged away from the shower,
          whose corner post stands 0.3m off the machine's other side, and
          stopped before the hall's built-in, which comes through the wall
          behind it — past 90 degrees the leaf reaches both. */}
      <Door label="the washing machine" pivot={[-0.21, 0.44, 0.3]} angle={-1.5}>
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
