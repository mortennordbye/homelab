"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Bookshelf, shelfHeight } from "./Bookshelf";
import { PrintedPosts } from "./PrintedPosts";
import { ALCOVE, BENCH_TOP, Hallway } from "./Hallway";
import { Outside } from "./Outside";
import { SIDEBOARD_TV, Sideboard, type Inspected } from "./Devices";
import type { InfoCard } from "./Hud";
import {
  ContactCard,
  DeskNotebook,
  FridgeMagnets,
  GymBag,
  PhotoAlbum,
  ServiceLeaflets,
} from "./Objects";
import { DASH_PX_H, DASH_PX_W } from "./Screen";
import { Printer } from "./Printer";
import { Door } from "./openable";
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
  Curtains,
  DiningTable,
  WALNUT,
  Extractor,
  FridgeColumn,
  Hob,
  KitchenRun,
  Microwave,
  MirrorWardrobe,
  Oven,
  OverbedUnits,
  PleatedBlind,
  Poster,
  SINK_HOLE,
  Shower,
  Sink,
  Sofa,
  TV_PANEL,
  TaskChair,
  Towels,
  Toilet,
  Vanity,
  WallCabinet,
  WallUnits,
  WashingMachine,
  WaterTank,
  WoodChair,
  WoodStove,
} from "./Furniture";

// The flat, not a single room. Geometry and collision are both built from the
// plan in flat.ts, so a wall you can walk through cannot happen by editing one
// and forgetting the other.
export const ROOM = FLAT;

/** The four switchable sources in the living room, each with its own switch.
 *  The point lights that are not fittings — the lantern's ceiling bounce and
 *  the per-room fills — are not keys here. See the rig in FunRoom. */
export type LightKey = "lantern" | "desk" | "shelf" | "stove";
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
 * `windows` and `alcoves` are spans in the wall's own width, centred like the
 * geometry. A window is a hole in the plaster above the rail, so the panelling
 * and the rail run past it; an alcove is a hole all the way to the floor, so it
 * cuts those too and the joinery meets its reveals instead of dying into them.
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
  alcoves = [],
}: {
  width: number;
  position: [number, number, number];
  rotation: [number, number, number];
  panel: Surface;
  plaster: Surface;
  windows?: [number, number][];
  alcoves?: [number, number][];
}) {
  const half = width / 2;
  const upper = ROOM.h - DADO;

  // The solid pieces left between a set of openings.
  const spans = (cuts: [number, number][]) => {
    const out: [number, number][] = [];
    let cursor = -half;
    for (const [c0, c1] of [...cuts].sort((a, b) => a[0] - b[0])) {
      if (c0 > cursor) out.push([cursor, c0]);
      cursor = c1;
    }
    if (cursor < half) out.push([cursor, half]);
    return out;
  };
  const lower = spans(alcoves);
  const piers = spans([...windows, ...alcoves]);

  return (
    <group position={position} rotation={rotation}>
      {lower.map(([p0, p1]) => (
        <mesh key={p0} position={[(p0 + p1) / 2, DADO / 2, 0]} receiveShadow>
          <planeGeometry args={[p1 - p0, DADO]} />
          <meshStandardMaterial
            {...panel}
            color={OAK.carcass}
            roughness={0.74}
            metalness={0}
            normalScale={[0.7, 0.7]}
          />
        </mesh>
      ))}

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

      {lower.map(([p0, p1]) => (
        <mesh key={p0} position={[(p0 + p1) / 2, DADO + 0.015, 0.014]} receiveShadow>
          <boxGeometry args={[p1 - p0, 0.03, 0.028]} />
          <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A window in a wall's local frame: the view outside, the glass, a lining and
 * a sill.
 */
function Window({ x0, x1 }: { x0: number; x1: number }) {
  const w = x1 - x0;
  const h = HEAD - SILL;
  const cx = (x0 + x1) / 2;
  const cy = SILL + h / 2;
  const T = 0.06;

  return (
    <group position={[cx, cy, 0]}>
      {/* Glass, mostly transparent now that there is a view to carry, but kept
          reflective: a window that is only a hole stops taking the lamps back
          into the room, which is what made it read as glazing at night. */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#1b2a2e"
          roughness={0.32}
          metalness={0.22}
          envMapIntensity={0.55}
          transparent
          opacity={0.22}
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
  /* Which axis is the wall's thickness: x on a run down the plan, z on a run
     across it. The capping rail has to grow along that one to stand proud of
     the faces. */
  const thin = box.hx < box.hz;
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
      {/* The rail runs round both faces, so it is proud of the wall — grown
          along the fixed axis instead it came out proud at the run's two ends
          and dead flush with its faces, sharing their plane the whole length
          of the run: a 30mm line that flickered along the kitchen wall. */}
      <mesh position={[0, DADO + 0.015, 0]} receiveShadow>
        <boxGeometry args={[thin ? w + 0.028 : w, 0.03, thin ? d : d + 0.028]} />
        <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

/** Head height of every door in the flat. The lining stops here, the leaf
 *  hangs to it, and the wall over the opening starts from it. */
export const DOOR_H = 2.04;

/**
 * The wall over a door, from the lining's head to the ceiling.
 *
 * `wallBoxes` cuts an opening through the wall's whole height, which is what
 * an opening is to somebody walking through it. To somebody looking at it, it
 * left a door frame hanging under half a metre of open sky.
 */
function OverDoor({ box, plaster }: { box: Box; plaster: Surface }) {
  const h = FLAT.h - DOOR_H;
  return (
    <mesh position={[box.x, DOOR_H + h / 2, box.z]} receiveShadow>
      <boxGeometry args={[box.hx * 2, h, box.hz * 2]} />
      <meshStandardMaterial {...plaster} color="#241a12" roughness={0.96} metalness={0} normalScale={[0.42, 0.42]} />
    </mesh>
  );
}

/**
 * The lining of a door opening: two jambs and a head. An unlined opening shows
 * the wall's cut edge and reads as a hole rather than a doorway.
 */
function DoorLining({ box, horizontal }: { box: Box; horizontal: boolean }) {
  const H = DOOR_H;
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

/**
 * Which jamb each door hangs on and how far it stands open. Keyed by the wall
 * run its opening was cut from: a run knows where its holes are, not what is
 * hung in them, and both runs here carry exactly one door.
 *
 * `hinge` is which end of the opening the leaf pivots on in the opening's own
 * frame, and the sign of `angle` is which way it swings. Both stand short of a
 * right angle: flat against the wall a door disappears into it, and the point
 * of hanging these was to see them.
 *
 * The bathroom's opens out into the hall rather than into the room, off the
 * jamb by the coat alcove — so it stands turned toward the rack, which is what
 * you are looking at as you come in the front door. Out is also the way a
 * bathroom this size is hung: there is a washing machine behind the swing.
 */
const DOOR_HANG: Record<string, { label: string; hinge: -1 | 1; angle: number }> = {
  "living/east": { label: "the bedroom door", hinge: -1, angle: -1.3 },
  "bath/south": { label: "the bathroom door", hinge: 1, angle: 1.2 },
};

/**
 * The leaf hanging in a lined opening: a panelled door, both faces, and a
 * lever on each.
 *
 * Framed rather than laid on, for the reason `FrontDoor` gives: a panel drawn
 * as a sunk rectangle on a slab gives a step of a few millimetres that
 * disappears under any light in this flat. The frame has to stand proud of the
 * panel and throw a real shadow line, and on a door you walk round it has to
 * do it on both sides.
 *
 * One column of panels, not the front door's two: at 720mm clear a centre
 * stile leaves two 195mm fields, which reads as a cupboard front.
 *
 * Rests open, for the reason `Door`'s `startOpen` gives.
 */
function RoomDoor({
  box,
  horizontal,
  hang,
}: {
  box: Box;
  horizontal: boolean;
  hang: { label: string; hinge: -1 | 1; angle: number };
}) {
  /* Clear of the lining on both jambs and off the floor, so the leaf reads as
     hung in the opening rather than cut from it. */
  const W = (horizontal ? box.hx : box.hz) * 2 - 0.08 - 0.008;
  const H = DOOR_H - 0.04 - 0.02;
  /** 12mm panel with a 14mm frame each side: a 40mm leaf. */
  const CORE = 0.012;
  const FRAME = 0.014;
  const stile = 0.1;

  /* Stiles and rails, in the leaf's own frame. Written once and drawn on both
     faces — a door is symmetrical and the two sides of these are not worth
     two lists. */
  const members: [number, number, number, number][] = [
    [-(W - stile) / 2, H / 2, stile, H],
    [(W - stile) / 2, H / 2, stile, H],
    [0, 0.115, W, 0.23],
    [0, 1.09, W, 0.13],
    [0, H - 0.09, W, 0.18],
  ];

  return (
    <group position={[box.x, 0, box.z]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
      <Door
        label={hang.label}
        pivot={[hang.hinge * (W / 2), 0, 0]}
        angle={hang.angle}
        startOpen
      >
        <group position={[0, 0.012, 0]}>
          {/* the panel the frame is built either side of */}
          <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[W, H, CORE]} />
            <meshStandardMaterial color="#ded9d0" roughness={0.72} metalness={0} />
          </mesh>
          {[-1, 1].map((face) =>
            members.map(([x, y, w, h], i) => (
              <mesh
                key={`${face}-${i}`}
                position={[x, y, face * (CORE / 2 + FRAME / 2)]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[w, h, FRAME]} />
                <meshStandardMaterial color={OAK.case} roughness={0.62} metalness={0} />
              </mesh>
            )),
          )}
          {/* lever on a rose, on the swinging stile, one each side */}
          {[-1, 1].map((face) => (
            <group
              key={face}
              position={[-hang.hinge * (W / 2 - 0.075), 1.03, face * (CORE / 2 + FRAME)]}
            >
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.029, 0.029, 0.012, 18]} />
                <meshStandardMaterial color="#8d8579" roughness={0.38} metalness={0.75} />
              </mesh>
              <mesh
                position={[-hang.hinge * 0.03, 0, face * 0.018]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.011, 0.011, 0.105, 12]} />
                <meshStandardMaterial color="#8d8579" roughness={0.38} metalness={0.75} />
              </mesh>
            </group>
          ))}
          {/* hinges, on the stile the leaf pivots on */}
          {[0.3, 1.68].map((y) => (
            <mesh key={y} position={[hang.hinge * (W / 2 - 0.004), y, 0]} castShadow>
              <boxGeometry args={[0.016, 0.1, CORE + FRAME * 2 + 0.004]} />
              <meshStandardMaterial color="#a8adb3" roughness={0.34} metalness={0.85} />
            </mesh>
          ))}
        </group>
      </Door>
    </group>
  );
}

/** Where the lantern stands, in plan metres: on the west wall just south of
 *  the cabinet. The rig hangs its sources off this so the fitting and the
 *  light it casts cannot drift apart. */
export const LANTERN = { x: px(0.5), z: pz(2.9) };

/**
 * The wood stove, mid-way along the west wall between the cabinet and the
 * desk, and the small table in the corner between the stove and the desk,
 * where the flat has it. Both are exported because the rig hangs the firelight
 * off `STOVE.fire` and `FirstPerson` blocks the two footprints: a fire that
 * glows off its own stove, or a table you walk through, is what writing these
 * numbers out twice buys.
 *
 * The stove sits 0.13 north of the middle of its wall run, and that offset is
 * the table's: it is what makes the clear wall between the chimney breast and
 * the desk 1.14m instead of 1.01m, which is the difference between a table two
 * chairs fit at and a side table two chairs crowd. Move the stove back to the
 * middle and the table has to shrink with it.
 */
export const STOVE = {
  x: px(0.42),
  z: pz(3.77),
  fire: { x: px(0.56), y: 0.62, z: pz(3.77) },
};
export const TABLE = { x: px(0.51), z: pz(4.495) };

/** Which bay of the kitchen run the sink stands over, in the run's own x.
 *  Shared by the bowl and by the hole cut for it: two numbers that have to
 *  agree is one number. */
const SINK_X = -0.574;

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
 *
 * x is part of the seat, not assumed: the desk stands 2.2m off the room's
 * centre line, and a seat that leaves x out sits the visitor in mid-floor
 * looking back at the monitors from the side.
 */
export const SEAT = { x: DESK_X, z: pz(DESK.z - 0.44), eye: 1.25 };

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
 * The front door, at joinery dimensions (825 x 2040 x 40mm leaf), with its own
 * architrave and lining: it stands against the perimeter wall rather than in a
 * cut opening, so nothing else supplies those.
 *
 * Hand-built — Poly Haven's only CC0 doors are a castle door and a roller
 * shutter. Depth is what sells it: every part sits proud of or recessed into
 * its neighbour by a few millimetres, giving AO the creases to draw.
 */
function FrontDoor({
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
      {/* The coat alcove's own floor and ceiling. It is outside the flat's
          rectangle, so neither of the two planes below reaches it. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={at(ALCOVE.x + ALCOVE.d / 2, 0.001, (ALCOVE.z0 + ALCOVE.z1) / 2)}
        receiveShadow
      >
        <planeGeometry args={[ALCOVE.d, ALCOVE.z1 - ALCOVE.z0]} />
        <meshStandardMaterial {...floorOak} color={OAK.case} roughness={0.9} metalness={0} />
      </mesh>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={at(ALCOVE.x + ALCOVE.d / 2, FLAT.h, (ALCOVE.z0 + ALCOVE.z1) / 2)}
      >
        <planeGeometry args={[ALCOVE.d, ALCOVE.z1 - ALCOVE.z0]} />
        <meshStandardMaterial {...ceiling} color="#2a2018" roughness={0.98} metalness={0} />
      </mesh>

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

      <Outside />

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
      {/* The east wall carries the coat alcove, which is a hole in it rather
          than a cupboard against it. Its own frame runs local +x south, so the
          span is the plan z range of the alcove. */}
      <Wall
        width={FLAT.d}
        position={[px(FLAT.w), 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        panel={panelD}
        plaster={plasterD}
        alcoves={[[pz(ALCOVE.z0), pz(ALCOVE.z1)]]}
      />

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
      {openings.map((o, i) => (
        <OverDoor key={i} box={o.box} plaster={plasterD} />
      ))}

      {/* The leaves themselves, hung on the jambs the flat hangs them on. */}
      {openings.map((o) => (
        <RoomDoor key={o.id} box={o.box} horizontal={o.horizontal} hang={DOOR_HANG[o.id]} />
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

      {/* Curtains on the glazed wall, ceiling track to floor, drawing to the
          sides. One pair across both living-room windows rather than a pair
          each: the pier between them is 0.30 wide and two panels gathered
          there would be 0.15 of cloth pretending to be a curtain.

          Set 0.15 off the wall, which clears the window sills — they stand
          0.09 proud, and a curtain in the same plane as a sill is the flicker
          the kitchen wall had. */}
      <Curtains position={at(1.775, 0.02, 0.15)} width={2.85} height={2.42} />

      {/* Green on the plan: the sofa, facing west at the television. */}
      <Sofa position={centreOf(MARKS.sofa)} rotation={[0, -Math.PI / 2, 0]} />

      {/* ---------------------------------------------------------------
          The entré: the way out, and the objects that belong beside it.
          --------------------------------------------------------------- */}

      <Hallway oak={oak} />

      {/* Outside work: the gym bag, dropped on the shoe bench by the way out.
          Set 0.01 below the cushion top, because the bag's own base is that far
          above its origin and on the top itself it hovers over it. */}
      <GymBag
        position={[BENCH_TOP[0] + 0.225, BENCH_TOP[1] - 0.01, BENCH_TOP[2]]}
        rotation={[0, -0.22, 0]}
        onOpen={onOpenCard}
      />

      {/* The services, as post propped against the wall at the other end of the
          bench. The outer group turns them to face the hall; the inner one
          leans them back onto the wall, which has to be a second group rather
          than a third Euler angle on the first — the two rotations do not
          compose in the order that reads. */}
      <group position={[BENCH_TOP[0] - 0.255, BENCH_TOP[1] + 0.101, BENCH_TOP[2] + 0.11]} rotation={[0, Math.PI, 0]}>
        <ServiceLeaflets position={[0, 0, 0]} rotation={[-0.18, 0, 0]} onOpen={onOpenCard} />
      </group>

      {/* The front door. A door you can walk up to and open is the obvious
          affordance, and it is the one the plan actually has. */}
      <Interactive label="the front door" verb="leave" detail="back to the site" onActivate={onExitRoom}>
        {(hovered) => (
          <group>
            <FrontDoor position={at(5.7, 0, FLAT.d - 0.02)} rotation={[0, Math.PI, 0]} />
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
        {/* The skills, written down. Left of the keyboard and clear of both
            monitor stands, which is the only stretch of desk with room for
            something you would actually open. */}
        <DeskNotebook
          position={[-0.5, 0.756, -0.04]}
          rotation={[0, 0.13, 0]}
          onOpen={onOpenCard}
        />
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
        <TaskChair position={[DESK_X, 0, CHAIR_Z]} />
      </Interactive>

      {/* The lantern, beside the cabinet where the bookcase used to stand. It
          lights the television end of the room and is in view from the front
          door, which is the whole point of it. */}
      <Lantern position={[LANTERN.x, 0, LANTERN.z]} on={lights.lantern} onToggle={() => onToggleLight("lantern")} />

      {/* y=0: Prop seats a model on its own base, so no manual lift. */}
      <Plant position={at(0.4, 0, 0.4)} />

      {/* The wood stove on the west wall, its chimney breast standing proud to
          the ceiling the way it does in the flat. Set 0.13 north of the middle
          of the run so the table below it gets a wall to stand against — see
          the note on `STOVE`. */}
      <WoodStove
        position={at(0.06, 0, 3.77)}
        rotation={[0, Math.PI / 2, 0]}
        ceiling={FLAT.h}
        plaster={plasterD}
        lit={lights.stove}
        onToggle={() => onToggleLight("stove")}
      />

      {/* The small table, hard against the west wall in the 1.0m of it left
          between the chimney breast and the desk corner — the only stretch of
          wall it can reach, because at the stove's own z the wall is behind
          0.74m of stove.

          Long side along the wall, chairs on the two open sides: one backed
          onto the kitchen facing the wall, one at the desk end. Both pushed
          in, so what stands past the table edge is a crest rail.

          Turned the other way: short end to the wall, long axis out into the
          room, chairs on a long side and the far end. Along the wall it had
          only its two short edges to seat anybody at.

          0.86 out by 0.55 across, sized off its own chairs rather than off the
          gap: a chair is 0.39 across, so on a 0.60 edge one chair took two
          thirds of it and two of them read as a side table being crowded
          rather than a table being laid. */}
      <DiningTable position={[TABLE.x, 0, TABLE.z]} oak={oak} />
      {/* On the long side nearest the desk, backed onto the office chair. Set
          west of the table's middle, which is what keeps it out of that
          chair. */}
      <WoodChair
        position={[TABLE.x - 0.09, 0, TABLE.z + 0.22]}
        rotation={[0, Math.PI + 0.04, 0]}
      />
      {/* At the far end, backed onto the kitchen and facing the wall. */}
      <WoodChair
        position={[TABLE.x + 0.375, 0, TABLE.z]}
        rotation={[0, -Math.PI / 2 - 0.04, 0]}
        tone={WALNUT}
      />
      {/* The blog: three printouts, in a row down the table's length. Askew to
          the table rather than square to it — the sheets stay square to each
          other because rotating them one by one costs a flat `Html` layer
          each. */}
      <PrintedPosts
        position={[TABLE.x - 0.07, 0.745, TABLE.z - 0.02]}
        rotation={[0, 0.08, 0]}
        onOpen={onOpenCard}
      />

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
      {/* The run, the column and the peninsula all sit 20mm further into what
          they back onto than their carcass depth wants.
          
          Flush against the wall, a carcass back lands exactly on the wall plane
          and the two flicker against each other the whole length of the
          kitchen — the thin crawling line along the wall. Buried 20mm in the
          wall's 100mm it cannot be seen and cannot fight. Same reason the
          peninsula runs past the main run's front rather than up to it. */}
      <FridgeColumn
        position={at(3.595, 0, 1.45)}
        rotation={[0, -Math.PI / 2, 0]}
        oak={oak}
        door={<FridgeMagnets onOpen={onOpenCard} />}
      />

      {/* Five bays. Local +x points south, so a negative offset is the fridge
          end and the sink sits beside it, as drawn and as photographed. */}
      {/* Bay 1 is a door, not drawers: the bowl hangs through the top into it,
          and a drawer would pull straight out through the well. */}
      <KitchenRun position={at(3.62, 0, 3.185)} rotation={[0, -Math.PI / 2, 0]} length={2.87} doors={5} bays={{ 1: "door", 3: "panel" }} cutout={{ x: SINK_X, ...SINK_HOLE }} oak={oak}>
        <Sink position={[SINK_X, 0, 0]} />
        <Hob position={[0.574, 0, 0]} />
        <Oven position={[0.574, 0, 0]} />
      </KitchenRun>
      <WallUnits position={at(3.745, 0, 3.185)} rotation={[0, -Math.PI / 2, 0]} length={2.87} doors={5} oak={oak} />
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
      <KitchenRun position={at(2.83, 0, 4.32)} rotation={[0, Math.PI, 0]} length={1.0} doors={2} bays={{ 1: "door" }} topDrop={0.002} oak={oak} />
      <WaterTank position={at(2.55, 0, 4.35)} />

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
      {/* 0.8 square, which is also the footprint `FirstPerson` blocks: a box
          fills its own footprint, so unlike the quadrant it used to be there is
          nothing over-boxed about it. */}
      <Shower position={at(4.0, 0, 2.8)} size={0.8} />
      {/* Tight against the shower rather than centred in the gap: the entré's
          built-ins are hollowed out of this wall and their bulkhead now stands
          0.32 into the room behind where it used to sit. */}
      {/* Turned to face east, into the middle of the bathroom. Its porthole
          used to look north at the shower glass 0.3m away: a door that opens
          into another fitting is one nobody can reach or see. East is the only
          side of this corner that is open — the shower is north, the hall's
          built-in comes through the wall to the south, and the west is wall. */}
      <WashingMachine position={at(4.32, 0, 3.95)} rotation={[0, Math.PI / 2, 0]} />
      <Toilet position={at(6.1, 0, 3.1)} rotation={[0, -Math.PI / 2, 0]} />
      {/* Over the basin, not over the WC: the cabinet doors carry the room's
          only mirror. High enough to clear the tap's gooseneck under it. */}
      <WallCabinet position={at(6.3, 1.66, 3.85)} rotation={[0, -Math.PI / 2, 0]} />
      {/* Clear of the WC's boxing, which it used to run 125mm into: at 3.625
          the unit's north end and the duct's south end were the same 0.125m of
          wall, and the basin sat crowded against it. */}
      <Vanity position={at(6.3, 0, 3.85)} rotation={[0, -Math.PI / 2, 0]} length={0.75} />
      {/* Centred in the floor the room actually has: between the shower and
          washing machine on one side and the vanity on the other. */}
      <BathMat position={at(5.4, 0, 3.94)} rotation={[0, 0.05, 0]} />
      {/* In the door reveal, facing out through the opening: the jamb between
          the hall's built-in and the door is 0.42m deep rather than the wall's
          0.10, so the left of the doorway is a nook 0.45m across. That is the
          small dent you pass through coming in, before the washing machine. */}
      <Towels position={at(5.33, 0, 4.4)} rotation={[0, Math.PI / 2, 0]} />

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
      {/* The career, in the album stood between the lamp and the printer. That
          gap is 0.26 wide and the album is 0.21: it is the only clear stretch
          of shelf top, and nothing on either side may grow into it. */}
      <PhotoAlbum
        position={[SHELF_AT[0] - 0.12, shelfHeight(shelf) + 0.15, SHELF_AT[2]]}
        rotation={[0, Math.PI, 0]}
        career={career}
        onOpen={onOpenCard}
      />
      {/* The printer, on the other end of the shelf top. */}
      <Printer
        position={[SHELF_AT[0] + 0.22, shelfHeight(shelf), SHELF_AT[2]]}
        rotation={[0, Math.PI, 0]}
        onStatus={onPrinterStatus}
      />
    </group>
  );
}
