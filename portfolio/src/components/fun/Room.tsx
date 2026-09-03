"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { BlogBoard } from "./BlogBoard";
import { Bookshelf, shelfHeight } from "./Bookshelf";
import { GithubWall } from "./GithubWall";
import { SIDEBOARD_TV, Sideboard, type Inspected } from "./Devices";
import type { InfoCard } from "./Hud";
import {
  CareerFrame,
  ContactCard,
  GymBag,
  ServiceRack,
  SkillPlate,
  SocialWall,
} from "./Objects";
import { DASH_PX_H, DASH_PX_W } from "./Screen";
import { Printer } from "./Printer";
import { Interactive } from "./interaction";
import { Html } from "@react-three/drei";
import type { CareerData, ShelfBook, ShelfCert, ShelfData } from "./shelf";
import { Prop } from "./props";
import { useSurface, type Surface } from "@/components/materials/surface";
import { OAK } from "@/components/materials/oak";
import type { Box } from "./flat";
import { FLAT, MARKS, at, centreOf, doorOpenings, px, pz, wallBoxes } from "./flat";
import {
  BathMat,
  Bed,
  Extractor,
  Fan,
  FridgeColumn,
  Hob,
  KitchenRun,
  Microwave,
  MirrorWardrobe,
  Oven,
  OverbedUnits,
  PleatedBlind,
  Poster,
  Shower,
  Sink,
  Sofa,
  TV_PANEL,
  Toilet,
  Vanity,
  WallCabinet,
  WallUnits,
  WashingMachine,
  WaterTank,
} from "./Furniture";

// The flat, not a single room. Geometry and collision are both built from the
// plan in flat.ts, so a wall you can walk through cannot happen by editing one
// and forgetting the other.
export const ROOM = FLAT;

/** The three switchable fittings in the living room, each with its own switch.
 *  The point lights that are not fittings — the lantern's ceiling bounce and
 *  the per-room fills — are not keys here. See the rig in FunRoom. */
export type LightKey = "lantern" | "desk" | "shelf";
export type Lights = Record<LightKey, boolean>;

/** Height of the dado rail. Every wall-mounted object in the flat hangs at
 *  1.42 or above, so the panelling clears all of them. */
const DADO = 1.05;

/** Window sill and head. The sill sits on the dado so the panelling runs up to
 *  it, which is how a panelled room and its glazing actually meet. */
const SILL = DADO;
const HEAD = 2.15;

/**
 * A wall as joinery rather than paint: panelling below the rail, plaster
 * above, and a capping rail with a real nose to catch the key light. A flat
 * tinted plane takes light identically at every point and stops reading as a
 * material.
 *
 * `windows` are spans in the wall's own width, centred like the geometry, and
 * the plaster above the rail is built as the pieces between them.
 *
 * Offsets are written as "into the room" (local +z), never as a raw axis: each
 * wall is rotated to face inward, so a signed world offset flips on two of them.
 */
function Wall({
  width,
  position,
  rotation,
  panel,
  plaster,
  windows = [],
}: {
  width: number;
  position: [number, number, number];
  rotation: [number, number, number];
  panel: Surface;
  plaster: Surface;
  windows?: [number, number][];
}) {
  const half = width / 2;
  const upper = ROOM.h - DADO;

  // The solid plaster between the openings, plus the strip over each of them.
  const piers: [number, number][] = [];
  let cursor = -half;
  for (const [w0, w1] of [...windows].sort((a, b) => a[0] - b[0])) {
    if (w0 > cursor) piers.push([cursor, w0]);
    cursor = w1;
  }
  if (cursor < half) piers.push([cursor, half]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, DADO / 2, 0]} receiveShadow>
        <planeGeometry args={[width, DADO]} />
        <meshStandardMaterial
          {...panel}
          color={OAK.carcass}
          roughness={0.74}
          metalness={0}
          normalScale={[0.7, 0.7]}
        />
      </mesh>

      {piers.map(([p0, p1], i) => (
        <mesh key={i} position={[(p0 + p1) / 2, DADO + upper / 2, 0]} receiveShadow>
          <planeGeometry args={[p1 - p0, upper]} />
          <meshStandardMaterial
            {...plaster}
            color="#241a12"
            roughness={0.96}
            metalness={0}
            normalScale={[0.42, 0.42]}
          />
        </mesh>
      ))}

      {windows.map(([w0, w1], i) => (
        <group key={i}>
          {/* the plaster over the head */}
          <mesh position={[(w0 + w1) / 2, HEAD + (ROOM.h - HEAD) / 2, 0]} receiveShadow>
            <planeGeometry args={[w1 - w0, ROOM.h - HEAD]} />
            <meshStandardMaterial
              {...plaster}
              color="#241a12"
              roughness={0.96}
              metalness={0}
              normalScale={[0.42, 0.42]}
            />
          </mesh>
          <Window x0={w0} x1={w1} />
        </group>
      ))}

      <mesh position={[0, DADO + 0.015, 0.014]} receiveShadow>
        <boxGeometry args={[width, 0.03, 0.028]} />
        <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * A window in a wall's local frame: the night outside, the glass, a lining and
 * a sill. What is beyond it is cold and blue, which is the whole reason the
 * fill in this flat is the cool one — the warmth of the lamps is a
 * relationship with this, not a value.
 */
function Window({ x0, x1 }: { x0: number; x1: number }) {
  const w = x1 - x0;
  const h = HEAD - SILL;
  const cx = (x0 + x1) / 2;
  const cy = SILL + h / 2;
  const T = 0.06;

  return (
    <group position={[cx, cy, 0]}>
      {/* Oslo at nine in the evening, a little way behind the glass so the
          reveal has something to cast onto. */}
      <mesh position={[0, 0, -0.22]}>
        <planeGeometry args={[w + 0.5, h + 0.5]} />
        <meshBasicMaterial color="#0d1a1e" />
      </mesh>
      {/* glass: dark, smooth and reflective rather than transparent, so it
          takes the lamps back into the room instead of being a hole */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#121e21"
          roughness={0.08}
          metalness={0.6}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* lining: two jambs, a head and a sill that stands proud */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (w / 2 - T / 2), 0, 0.01]} receiveShadow>
          <boxGeometry args={[T, h, 0.07]} />
          <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
        </mesh>
      ))}
      <mesh position={[0, h / 2 - T / 2, 0.01]} receiveShadow>
        <boxGeometry args={[w, T, 0.07]} />
        <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.02, 0.03]} receiveShadow>
        <boxGeometry args={[w + 0.08, 0.04, 0.12]} />
        <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
      </mesh>
      {/* a single glazing bar, so the opening reads as a window and not a hole */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[0.035, h - T, 0.05]} />
        <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * An interior partition: the same joinery as the perimeter, but a box, so both
 * of its faces are walls of some room. Built from one of the boxes in
 * flat.ts — the same list the collision resolver reads.
 */
function Partition({
  box,
  panel,
  plaster,
}: {
  box: Box;
  panel: Surface;
  plaster: Surface;
}) {
  const w = box.hx * 2;
  const d = box.hz * 2;
  return (
    <group position={[box.x, 0, box.z]}>
      <mesh position={[0, DADO / 2, 0]} receiveShadow>
        <boxGeometry args={[w, DADO, d]} />
        <meshStandardMaterial {...panel} color={OAK.carcass} roughness={0.74} metalness={0} normalScale={[0.7, 0.7]} />
      </mesh>
      <mesh position={[0, (FLAT.h + DADO) / 2, 0]} receiveShadow>
        <boxGeometry args={[w, FLAT.h - DADO, d]} />
        <meshStandardMaterial {...plaster} color="#241a12" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
      </mesh>
      {/* the rail runs round both faces, so it is wider than the wall */}
      <mesh position={[0, DADO + 0.015, 0]} receiveShadow>
        <boxGeometry args={[w, 0.03, d + 0.028]} />
        <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * The lining of a door opening: two jambs and a head. An unlined opening shows
 * the wall's cut edge and reads as a hole rather than a doorway.
 */
function DoorLining({ box, horizontal }: { box: Box; horizontal: boolean }) {
  const H = 2.04;
  const T = 0.04;
  const span = horizontal ? box.hx * 2 : box.hz * 2;
  const thick = horizontal ? box.hz * 2 : box.hx * 2;
  return (
    <group position={[box.x, 0, box.z]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (span / 2 - T / 2), H / 2, 0]} receiveShadow>
          <boxGeometry args={[T, H, thick + 0.012]} />
          <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
        </mesh>
      ))}
      <mesh position={[0, H - T / 2, 0]} receiveShadow>
        <boxGeometry args={[span, T, thick + 0.012]} />
        <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
      </mesh>
    </group>
  );
}

/** Where the lantern stands, in plan metres: on the west wall just south of
 *  the cabinet. The rig hangs its sources off this so the fitting and the
 *  light it casts cannot drift apart. */
export const LANTERN = { x: px(0.5), z: pz(2.9) };

/**
 * The desk, on the blue mark: against the south wall in the south-west corner.
 *
 * The visitor sits north of it and faces the wall, so the whole assembly is
 * turned to face south and every offset below is written in the desk's own
 * frame and mapped out through `deskWorld`. Writing them as world coordinates
 * instead means remembering to flip two signs at every call site.
 */
export const DESK = { x: 0.95, z: 5.7, w: 1.6, d: 0.72 };
export const DESK_X = px(DESK.x);
export const DESK_Z = pz(DESK.z);
export const DESK_D = DESK.d;

/** Desk-local offset to world. The desk is turned 180 degrees, so both the x
 *  and the z of a local offset change sign. */
export function deskWorld(dx: number, y: number, dz: number): [number, number, number] {
  return [DESK_X - dx, y, DESK_Z - dz];
}

/** Where the chair is tucked in. Exported because FirstPerson has to put a
 *  collision box in the same place, and a chair you can walk through is worse
 *  than no chair. */
export const CHAIR_Z = pz(DESK.z - 0.62);

/**
 * Where the camera goes when the visitor takes the chair. Pulled in from
 * CHAIR_Z toward the desk — the chair's origin is its centre, and a camera
 * there looks through the backrest. Height 1.25 is a seated eye.
 */
export const SEAT = { z: pz(DESK.z - 0.44), eye: 1.25 };

/**
 * Where the bookcase stands: against the south wall beside the desk, with the
 * printer on top of it. 0.25m clear of the desk's end, so the two read as two
 * pieces rather than one run.
 *
 * The lamp and the printer both read their x and z from here.
 */
const SHELF_AT: [number, number, number] = at(2.46, 0, 5.89);

export type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  /** Physical width in metres. For the portrait monitor this is the short side. */
  width: number;
};

/*
 * The two desk monitors as one setup: inner bezels nearly touching, pair
 * centred on the chair, both toed in toward the seat. The x positions account
 * for the toe-in — a screen rotated by θ occupies width·cos(θ) of desk, so
 * spacing on raw width reopens a gap between the bezels.
 */
const GAP = 0.025;
const LANDSCAPE_W = 0.62;
const PORTRAIT_W = 0.42;
const LANDSCAPE_TOE = 0.2;
const PORTRAIT_TOE = -0.26;
const L_SPAN = LANDSCAPE_W * Math.cos(LANDSCAPE_TOE);
const P_SPAN = PORTRAIT_W * Math.cos(PORTRAIT_TOE);
/** Left edge of the pair, so the two of them straddle the chair at x = 0. */
const PAIR_LEFT = -(L_SPAN + GAP + P_SPAN) / 2;
/** Both sit the same distance back from the desk's centre line, toward the
 *  wall the visitor is facing. */
const SCREEN_DZ = -0.2;

/**
 * The live dashboard on the television's glass. Derived from where the cabinet
 * stands and where the set sits on it, rather than written out again: this
 * placement was raw single-room coordinates for a while and ended up hanging in
 * the bathroom after the flat was built around it.
 *
 * The cabinet is turned a quarter turn to face east, so its local +z is world
 * +x and the set's own offsets swap axes with it.
 */
const TV_BENCH_AT = centreOf(MARKS.tvBench);
export const TV_SCREEN: Placement = {
  position: [
    TV_BENCH_AT[0] + TV_PANEL.z + 0.001,
    SIDEBOARD_TV[1] + TV_PANEL.y,
    TV_BENCH_AT[2] - SIDEBOARD_TV[0],
  ],
  rotation: [0, Math.PI / 2, 0],
  /* Sized so the dashboard's own housing lands inside the glass rather than
     over the bezel. The two aspect ratios differ, so height is what binds. */
  width: (TV_PANEL.h - 0.055) * (DASH_PX_W / DASH_PX_H),
};

/** The landscape monitor. Shows real source from this repo — see CodeScreen.
 */

export const DESK_SCREEN: Placement = {
  position: deskWorld(PAIR_LEFT + L_SPAN / 2, 1.09, SCREEN_DZ),
  rotation: [0, Math.PI + LANDSCAPE_TOE, 0],
  width: LANDSCAPE_W,
};

/**
 * The portrait monitor (the shell). Sits low so its 0.72m top does not climb
 * into the social wall at 1.78 — screens must never occlude another
 * interactive object.
 */
export const DESK_TERMINAL: Placement = {
  position: deskWorld(PAIR_LEFT + L_SPAN + GAP + P_SPAN / 2, 1.19, SCREEN_DZ),
  rotation: [0, Math.PI + PORTRAIT_TOE, 0],
  width: PORTRAIT_W,
};

/** Desk task chair, pushed back from the desk. */
/* The chair and the plant are scanned models rather than primitives. They were
   the two worst offenders: a chair assembled from four boxes and a plant made
   of icosahedron blobs are both shapes the eye knows far too well to be fooled
   by an approximation. See props.tsx for why only some objects are swapped. */
/**
 * The task chair. The scanned model faces local +z as it comes, so a chair at
 * rotation 0 looks the way the room's +z does — which is why the desk chair
 * takes no rotation at all.
 *
 * `rotation` used to be destructured here and then dropped on the floor, with
 * a hard-coded half turn going to the Prop instead. The caller asked for a
 * half turn, got one it did not control, and the chair sat with its back to
 * the monitors.
 */
function Chair({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <Prop
      name="dining_chair_02"
      position={position}
      rotation={rotation}
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

/**
 * The corner lantern — the room's main light. A frame with panels set inside
 * it, not a glowing box: an emissive cuboid at this size reads as a bug. The
 * shade sits high so the source is near eye height; a lantern at ankle height
 * lights the floor and nothing else.
 */
function Lantern({
  position,
  on,
  onToggle,
}: {
  position: [number, number, number];
  on: boolean;
  onToggle: () => void;
}) {
  const S = 0.3; // outside width and depth
  const H = 1.46; // overall height
  const POST = 0.028;
  const SHADE_Y = 0.66; // underside of the shade
  const SHADE_H = 0.6;
  const oakCol = "#a98a5f";
  const half = S / 2 - POST / 2;

  const corners: [number, number][] = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ];

  return (
    <Interactive
      label="the lantern"
      verb={on ? "turn off" : "turn on"}
      detail="the room's main light"
      onActivate={onToggle}
    >
      <group position={position}>
        {/* Four corner posts, full height. Nothing on the frame casts — see the
            rails below. The posts were left casting at first on the theory that
            striping the floor pool would look good; what they actually did was
            throw two hard diagonal streaks up the wall and across the ceiling,
            because the light is level with them and they are thin. A fitting
            should not shadow the room from a light it encloses, and that turns
            out to apply to every part of it. */}
        {corners.map(([x, z], i) => (
          <mesh key={i} position={[x, H / 2, z]}>
            <boxGeometry args={[POST, H, POST]} />
            <meshStandardMaterial color={oakCol} roughness={0.6} />
          </mesh>
        ))}

        {/* Rails: at the foot, under and over the shade, and at the top. A
            casting top rail silhouettes itself onto the ceiling directly above
            as a hard-edged floating box. */}
        {[0.07, SHADE_Y, SHADE_Y + SHADE_H, H - POST / 2].map((y) => (
          <group key={y} position={[0, y, 0]}>
            {[-half, half].map((z) => (
              <mesh key={`x${z}`} position={[0, 0, z]}>
                <boxGeometry args={[S - POST, POST, POST]} />
                <meshStandardMaterial color={oakCol} roughness={0.6} />
              </mesh>
            ))}
            {[-half, half].map((x) => (
              <mesh key={`z${x}`} position={[x, 0, 0]}>
                <boxGeometry args={[POST, POST, S - POST]} />
                <meshStandardMaterial color={oakCol} roughness={0.6} />
              </mesh>
            ))}
          </group>
        ))}

        {/* a board across the foot rails, so it stands like furniture */}
        <mesh position={[0, 0.086, 0]} receiveShadow>
          <boxGeometry args={[S - POST, 0.014, S - POST]} />
          <meshStandardMaterial color={oakCol} roughness={0.68} />
        </mesh>

        {/* The four paper panels.
            The base colour is nearly black on purpose. These sit directly in
            front of the lamp's own point light, so a light base colour gets lit
            *and* emits, the two sum past what the tone mapper can hold, and the
            shade clips to flat white — a paper lantern rendered as a lightbulb.
            Emitting from a dark base is the only way the panel keeps its colour
            at this brightness. */}
        {([0, Math.PI / 2, Math.PI, -Math.PI / 2] as const).map((ry, i) => (
          <mesh
            key={i}
            position={[
              Math.sin(ry) * (S / 2 - 0.004),
              SHADE_Y + SHADE_H / 2,
              Math.cos(ry) * (S / 2 - 0.004),
            ]}
            rotation={[0, ry, 0]}
          >
            <planeGeometry args={[S - POST * 1.6, SHADE_H - POST]} />
            <meshStandardMaterial
              color="#2a1405"
              emissive="#ff6408"
              /* Goes fully dark with the light. The base colour is nearly black
                 by design (see above), so dropping the emission leaves unlit
                 paper rather than a grey panel — a shade that stops glowing but
                 still reads as a shade. */
              emissiveIntensity={on ? 2.3 : 0}
              roughness={0.92}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </Interactive>
  );
}

/** Mushroom lamp: cream glass dome on a small base.
 *  Takes its own label because there are two of them — one on the desk, one on
 *  top of the bookshelf — and "the lamp" twice would name them identically in
 *  the crosshair prompt. */
function MushroomLamp({
  position,
  label,
  detail,
  on,
  onToggle,
}: {
  position: [number, number, number];
  label: string;
  detail: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <Interactive
      label={label}
      verb={on ? "turn off" : "turn on"}
      detail={detail}
      onActivate={onToggle}
    >
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
            color="#ffdcae"
            roughness={0.42}
            emissive="#ffa74e"
            emissiveIntensity={on ? 1.5 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </Interactive>
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
 * A panelled interior door at joinery dimensions (825 x 2040 x 40mm leaf).
 * Hand-built — Poly Haven's only CC0 doors are a castle door and a roller
 * shutter. Depth is what sells it: every part sits proud of or recessed into
 * its neighbour by a few millimetres, giving AO the creases to draw.
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
  const white = OAK.case;
  const trim = OAK.carcass;

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
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
      </mesh>
      <mesh
        position={[-W / 2 + 0.105, 1.04, leafFront + 0.022]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.0115, 0.0115, 0.115, 14]} />
        <meshStandardMaterial color="#b98f4e" roughness={0.26} metalness={1} />
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


export function Room({
  onPrinterStatus,
  shelf,
  career,
  onInspect,
  onOpenBook,
  onOpenCert,
  onOpenCard,
  onExitRoom,
  lights,
  onToggleLight,
  seated,
  onSit,
}: {
  onPrinterStatus: (msg: string | null) => void;
  shelf: ShelfData;
  career: CareerData;
  onInspect: (hw: Inspected) => void;
  onOpenBook: (b: ShelfBook) => void;
  onOpenCert: (c: ShelfCert) => void;
  onOpenCard: (c: InfoCard) => void;
  onExitRoom: () => void;
  lights: Lights;
  onToggleLight: (k: LightKey) => void;
  seated: boolean;
  onSit: () => void;
}) {
  // Tiling is in real units: roughly one texture tile per 1.3m of floor and
  // 1.7m of wall, so the grain reads at the right physical scale.
  const floorOak = useSurface("black_oak_veneer", [4.8, 4.7]);
  const plasterW = useSurface("plastered_wall_04", [3.6, 0.85]);
  const plasterD = useSurface("plastered_wall_04", [3.5, 0.85]);
  const panelW = useSurface("wooden_panels", [3.1, 0.6]);
  const panelD = useSurface("wooden_panels", [3.0, 0.6]);
  const ceiling = useSurface("plastered_wall_04", [4, 3.9]);
  const oak = useSurface("black_oak_veneer", [2.4, 0.7]);

  const partitions = wallBoxes();
  const openings = doorOpenings();

  return (
    <group>
      {/* floor, one plane under the whole flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[FLAT.w, FLAT.d]} />
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
          color={OAK.case}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Plain ceiling with nothing on it. An overhead source lights a room
          evenly and from above, which is the one arrangement that never feels
          like somewhere you would sit; the ceiling's job here is to catch the
          warm bounce off the lamps rather than to emit anything. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, FLAT.h, 0]}>
        <planeGeometry args={[FLAT.w, FLAT.d]} />
        <meshStandardMaterial
          {...ceiling}
          color="#2a2018"
          roughness={0.98}
          metalness={0}
          normalScale={[0.12, 0.12]}
        />
      </mesh>

      {/* perimeter */}
      {/* The north wall is the glazed one on the plan: two windows over the
          living room and one in the bedroom. Spans are plan metres shifted
          into the wall's own centred frame. */}
      <Wall
        width={FLAT.w}
        position={[0, 0, pz(0)]}
        rotation={[0, 0, 0]}
        panel={panelW}
        plaster={plasterW}
        windows={[
          [px(0.55), px(1.6)],
          [px(1.9), px(3.0)],
          [px(4.35), px(5.85)],
        ]}
      />
      <Wall width={FLAT.w} position={[0, 0, pz(FLAT.d)]} rotation={[0, Math.PI, 0]} panel={panelW} plaster={plasterW} />
      <Wall width={FLAT.d} position={[px(0), 0, 0]} rotation={[0, Math.PI / 2, 0]} panel={panelD} plaster={plasterD} />
      <Wall width={FLAT.d} position={[px(FLAT.w), 0, 0]} rotation={[0, -Math.PI / 2, 0]} panel={panelD} plaster={plasterD} />

      {/* Interior partitions, built from the same list the collision boxes come
          from. Each is a solid piece of wall between the door openings. */}
      {partitions.map((b, i) => (
        <Partition key={i} box={b} panel={panelD} plaster={plasterD} />
      ))}

      {/* Door linings. A cased opening rather than a hole: an unlined opening
          shows the wall's zero-thickness edge and reads as a cut, not a door. */}
      {openings.map((o, i) => (
        <DoorLining key={i} box={o.box} horizontal={o.horizontal} />
      ))}

      {/* skirting, following the perimeter */}
      {(
        [
          { p: [0, 0.05, pz(0) + 0.012], r: [0, 0, 0], w: FLAT.w },
          { p: [0, 0.05, pz(FLAT.d) - 0.012], r: [0, Math.PI, 0], w: FLAT.w },
          { p: [px(0) + 0.012, 0.05, 0], r: [0, Math.PI / 2, 0], w: FLAT.d },
          { p: [px(FLAT.w) - 0.012, 0.05, 0], r: [0, -Math.PI / 2, 0], w: FLAT.d },
        ] as { p: [number, number, number]; r: [number, number, number]; w: number }[]
      ).map((sk, i) => (
        <mesh key={i} position={sk.p} rotation={sk.r}>
          <planeGeometry args={[sk.w, 0.1]} />
          <meshStandardMaterial color={OAK.back} roughness={0.7} />
        </mesh>
      ))}

      {/* ---------------------------------------------------------------
          The living room, from the marks on the floor plan.
          --------------------------------------------------------------- */}

      {/* Red on the plan: the TV bench against the west wall, facing east — and
          it is the homelab cabinet, because in this flat they are one piece of
          furniture. Every device in it is named from the README tables. */}
      <group position={TV_BENCH_AT} rotation={[0, Math.PI / 2, 0]}>
        <Sideboard position={[0, 0, 0]} onInspect={onInspect} onOpenCard={onOpenCard} />
      </group>

      {/* Green on the plan: the sofa, facing west at the television. */}
      <Sofa position={centreOf(MARKS.sofa)} rotation={[0, -Math.PI / 2, 0]} />

      {/* The career timeline, over the kitchen return on the south wall. A
          framed thing on a wall is already the shape a timeline wants. */}
      <CareerFrame position={at(2.45, 1.74, FLAT.d - 0.06)} rotation={[0, Math.PI, 0]} career={career} onOpen={onOpenCard} />

      {/* Social links above the desk, where someone sitting at it is looking. */}
      <SocialWall position={at(DESK.x, 1.66, FLAT.d - 0.06)} rotation={[0, Math.PI, 0]} onOpen={onOpenCard} />

      {/* Skills on the same wall, east of the desk and clear of the kitchen
          run, so the south wall is not weighted entirely into one corner. */}
      <SkillPlate position={at(3.45, 1.68, FLAT.d - 0.06)} rotation={[0, Math.PI, 0]} onOpen={onOpenCard} />

      {/* The blog, on the whiteboard over the television — the wall the sofa
          already faces, and the only one left with 1.5m clear once the kitchen
          took the east wall. Auto-populated from the RSS feed. */}
      <BlogBoard position={at(0.06, 1.9, 1.55)} rotation={[0, Math.PI / 2, 0]} onOpen={onOpenCard} />

      {/* ---------------------------------------------------------------
          The entré: the way out, and the two objects that belong beside it.
          --------------------------------------------------------------- */}

      {/* The pinned repositories, on the west wall between the lamp and the
          desk corner. The north wall is glazed now, and this is the only run
          left long enough for a 2.2m board. */}
      <GithubWall position={at(0.06, 1.77, 4.5)} rotation={[0, Math.PI / 2, 0]} onOpen={onOpenCard} />

      {/* Last thing on the wall before the way out, which is where a leaflet
          rack belongs. */}
      <ServiceRack position={at(FLAT.w - 0.08, 1.42, 5.5)} rotation={[0, -Math.PI / 2, 0]} onOpen={onOpenCard} />

      {/* The front door. A door you can walk up to and open is the obvious
          affordance, and it is the one the plan actually has. */}
      <Interactive label="the front door" verb="leave" detail="back to the site" onActivate={onExitRoom}>
        {(hovered) => (
          <group>
            <Door position={at(5.7, 0, FLAT.d - 0.02)} rotation={[0, Math.PI, 0]} />
            <group position={at(5.7, 2.24, FLAT.d - 0.09)} rotation={[0, Math.PI, 0]}>
              <RoundedBox args={[0.3, 0.11, 0.03]} radius={0.006} smoothness={3} castShadow>
                <meshStandardMaterial color="#1d2226" roughness={0.6} metalness={0.3} />
              </RoundedBox>
              <Html
                transform
                occlude="blending"
                distanceFactor={(0.26 / 260) * 400}
                position={[0, 0, 0.017]}
                zIndexRange={[10, 0]}
                style={{ width: "260px", height: "96px", pointerEvents: "none", userSelect: "none" }}
              >
                {/* An engraved brass plate, not a backlit sign. Nothing in the
                    flat emits except a screen or a lamp, and hover brightens
                    the metal rather than adding a glow. */}
                <div
                  className="flex h-full w-full items-center justify-center font-mono"
                  style={{
                    background: hovered
                      ? "linear-gradient(160deg, #a5763f 0%, #8a6133 55%, #6d4c28 100%)"
                      : "linear-gradient(160deg, #8a6133 0%, #7f5a2f 55%, #5f4223 100%)",
                    color: "#2a1d0e",
                    fontSize: "34px",
                    letterSpacing: "0.34em",
                    textIndent: "0.34em",
                    fontWeight: 600,
                    textShadow: "0 1px 0 rgba(255,212,154,0.28)",
                  }}
                >
                  EXIT
                </div>
              </Html>
            </group>
          </group>
        )}
      </Interactive>

      {/* ---------------------------------------------------------------
          The desk, on the blue mark: south-west corner, facing the wall.
          --------------------------------------------------------------- */}
      <group position={[DESK_X, 0, DESK_Z]} rotation={[0, Math.PI, 0]}>
        <RoundedBox position={[0, 0.735, 0]} args={[DESK.w, 0.04, DESK.d]} radius={0.008} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial {...oak} color={OAK.case} roughness={0.62} metalness={0} normalScale={[0.45, 0.45]} />
        </RoundedBox>
        {[-1, 1].map((sgn) => (
          <RoundedBox
            key={sgn}
            position={[sgn * (DESK.w / 2 - 0.04), 0.36, 0]}
            args={[0.05, 0.72, DESK.d - 0.06]}
            radius={0.006}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.66} metalness={0} />
          </RoundedBox>
        ))}
        {/* keyboard, mouse, mug */}
        <RoundedBox position={[-0.05, 0.765, 0.19]} args={[0.43, 0.018, 0.14]} radius={0.004} smoothness={3} castShadow>
          <meshStandardMaterial color="#1c1f22" roughness={0.8} />
        </RoundedBox>
        <RoundedBox position={[0.33, 0.768, 0.19]} args={[0.06, 0.025, 0.1]} radius={0.011} smoothness={4} castShadow>
          <meshStandardMaterial color="#1c1f22" roughness={0.8} />
        </RoundedBox>
        {/* 0.8025, not 0.795: the mug is 0.095 tall and the top is at 0.755, so
            the old height buried its base in the desk. Moved clear of the
            contact card's stand as well, which it was standing through. */}
        <mesh position={[-0.44, 0.8025, 0.2]}>
          <cylinderGeometry args={[0.042, 0.038, 0.095, 16]} />
          <meshStandardMaterial color="#8d8378" roughness={0.85} />
        </mesh>

        {/* Stands read their x off the screen placements, so the pair cannot be
            nudged without the feet following. The desk is turned, so the world
            x of a screen maps back through the same flip. */}
        <Stand position={[DESK_X - DESK_SCREEN.position[0], 0.755, SCREEN_DZ]} />
        <Stand position={[DESK_X - DESK_TERMINAL.position[0], 0.755, SCREEN_DZ]} />

        <MushroomLamp
          position={[0.66, 0.755, -0.12]}
          label="the desk lamp"
          detail="the working end of the flat"
          on={lights.desk}
          onToggle={() => onToggleLight("desk")}
        />
        <ContactCard position={[-0.66, 0.758, 0.2]} onOpen={onOpenCard} />
      </group>


      {/* Tucked in at the desk, facing the wall with it. Disabled rather than
          relabelled once seated: looking down at the chair you are already in
          should not offer to seat you again. */}
      <Interactive
        label="the desk chair"
        verb="sit down"
        detail="both screens, at reading distance"
        onActivate={onSit}
        disabled={seated}
      >
        <Chair position={[DESK_X, 0, CHAIR_Z]} />
      </Interactive>

      {/* Outside work: the gym bag in the corner by the desk. */}
      <GymBag position={at(0.42, 0, 4.5)} rotation={[0, 0.42, 0]} onOpen={onOpenCard} />

      {/* The lantern, beside the cabinet where the bookcase used to stand. It
          lights the television end of the room and is in view from the front
          door, which is the whole point of it. */}
      <Lantern position={[LANTERN.x, 0, LANTERN.z]} on={lights.lantern} onToggle={() => onToggleLight("lantern")} />

      {/* y=0: Prop seats a model on its own base, so no manual lift. */}
      <Plant position={at(0.4, 0, 0.4)} />

      {/* ---------------------------------------------------------------
          The kitchen, laid out off a photograph of the real one: one long run
          down the east wall of the living room, then the return west along the
          south wall.

          The east wall is the only stretch in the flat long enough to hold it,
          which is why the bookcase and the blog board moved off it. From the
          bedroom door southward: the fridge column, then 2.87m of worktop
          carrying the sink, the hob with the oven under it, and the microwave
          on the last bay. Wall units run over the whole of it and the strip
          under them is what actually lights this end of the room.
          --------------------------------------------------------------- */}
      <FridgeColumn position={at(3.575, 0, 1.45)} rotation={[0, -Math.PI / 2, 0]} oak={oak} />

      {/* Five bays. Local +x points south, so a negative offset is the fridge
          end and the sink sits beside it, as drawn and as photographed. */}
      <KitchenRun position={at(3.6, 0, 3.185)} rotation={[0, -Math.PI / 2, 0]} length={2.87} doors={5} oak={oak}>
        <Sink position={[-0.574, 0, 0]} />
        <Hob position={[0.574, 0, 0]} />
        <Oven position={[0.574, 0, 0]} />
      </KitchenRun>
      <WallUnits position={at(3.725, 0, 3.185)} rotation={[0, -Math.PI / 2, 0]} length={2.87} doors={5} oak={oak} />
      <Extractor position={at(3.72, 1.4, 3.759)} rotation={[0, -Math.PI / 2, 0]} />
      <Microwave position={at(3.6, 0.9, 4.333)} rotation={[0, -Math.PI / 2 + 0.12, 0]} />

      {/* The return, butted into the south end of the run so the worktop turns
          the corner in one line. It is a peninsula standing out into the room,
          not a run against the south wall: in the photograph its near face is a
          blank panel with the entré doorway behind it, and against the wall it
          would leave a metre of floor between the two legs and seal the way out
          to the front door.

          Doors face north, at the cook rather than at the sofa, and the hot
          water tank the plan marks lives inside it. */}
      <KitchenRun position={at(2.8, 0, 4.32)} rotation={[0, Math.PI, 0]} length={1.0} doors={2} oak={oak} />
      <WaterTank position={at(2.6, 0, 4.35)} />

      {/* ---------------------------------------------------------------
          Soverom, laid out off a photograph of the real one. Nothing from the
          portfolio lives in here: a bedroom that argues for someone is the
          failure the whole register exists to avoid.

          One run of storage down the east wall — mirrored sliders opposite the
          door, then wall-hung units bridging the head of the bed — with the bed
          crosswise under them and the window end left clear to walk in.
          --------------------------------------------------------------- */}
      <MirrorWardrobe position={at(6.01, 0, 0.655)} rotation={[0, -Math.PI / 2, 0]} width={1.21} oak={oak} />
      <OverbedUnits position={at(6.11, 0, 1.98)} rotation={[0, -Math.PI / 2, 0]} width={1.44} oak={oak} />
      <Bed position={at(5.3, 0, 2.0)} rotation={[0, -Math.PI / 2, 0]} />
      <Poster position={at(5.55, 1.62, 2.68)} rotation={[0, Math.PI, 0]} />
      <Fan position={at(5.05, 0, 1.08)} rotation={[0, 0.45, 0]} />
      {/* Pulled to 0.78 of the opening, where it hangs in the photograph and
          low enough that the head still reads as glazing rather than as wall. */}
      <PleatedBlind position={at(5.1, 2.13, 0.08)} width={1.38} drop={0.86} />

      {/* ---------------------------------------------------------------
          Bad, laid out off a photograph of it. Standing in the door: the
          quadrant shower in the far corner on the left with the washing machine
          beside it, the wall-hung WC on its duct at the far end on the right,
          and the vanity down the right-hand wall between the WC and the door.

          The vanity stops 0.4m short of the south wall. It is against the same
          wall the door is in the end of, and run all the way down it there is
          no line into the room that clears both it and the door reveal.

          Porcelain is the one place white belongs in the flat.
          --------------------------------------------------------------- */}
      <Shower position={at(4.0, 0, 2.8)} radius={0.8} />
      <WashingMachine position={at(4.32, 0, 4.1)} rotation={[0, Math.PI, 0]} />
      <Toilet position={at(6.1, 0, 3.1)} rotation={[0, -Math.PI / 2, 0]} />
      <WallCabinet position={at(6.3, 1.62, 3.06)} rotation={[0, -Math.PI / 2, 0]} />
      <Vanity position={at(6.3, 0, 3.625)} rotation={[0, -Math.PI / 2, 0]} length={0.75} />
      <BathMat position={at(5.18, 0, 3.95)} rotation={[0, 0.05, 0]} />

      {/* The case studies as books, certificates on the bottom shelf. Shelf
          count follows the content, which is why everything standing on top
          reads its height from shelfHeight rather than a number. */}
      <Bookshelf
        position={SHELF_AT}
        rotation={[0, Math.PI, 0]}
        shelf={shelf}
        onOpenBook={onOpenBook}
        onOpenCert={onOpenCert}
      />
      {/* A lamp on top of the shelf, and its light with it. The case studies
          are the thing most worth reading in here and both other lamps are at
          the far end, so this is a third fitting rather than more ambient.
          Its height comes from the shelf's content, which is why the light is
          declared next to the lamp instead of in the rig. */}
      <group position={[SHELF_AT[0] - 0.33, shelfHeight(shelf), SHELF_AT[2]]}>
        <MushroomLamp
          position={[0, 0, 0]}
          label="the shelf lamp"
          detail="the case studies"
          on={lights.shelf}
          onToggle={() => onToggleLight("shelf")}
        />
        <pointLight position={[0, 0.12, 0]} intensity={lights.shelf ? 4.2 : 0} distance={3.2} decay={1.9} color="#ffca8a" />
      </group>
      {/* The printer, on the other end of the shelf top. */}
      <Printer
        position={[SHELF_AT[0] + 0.22, shelfHeight(shelf), SHELF_AT[2]]}
        rotation={[0, Math.PI, 0]}
        onStatus={onPrinterStatus}
      />
    </group>
  );
}
