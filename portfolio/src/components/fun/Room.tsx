"use client";

import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { BlogBoard } from "./BlogBoard";
import { Bookshelf, shelfHeight } from "./Bookshelf";
import { GithubWall } from "./GithubWall";
import { Sideboard } from "./Devices";
import type { Hardware } from "./hardware";
import type { InfoCard } from "./Hud";
import { CareerFrame, ContactCard, GymBag, SocialWall } from "./Objects";
import { Printer } from "./Printer";
import { Interactive } from "./interaction";
import { Html } from "@react-three/drei";
import type { CareerData, ShelfBook, ShelfCert, ShelfData } from "./shelf";
import { Prop } from "./props";
import { useSurface } from "./textures";

// A small personal room, not a corporate NOC. Roughly 5.2 x 4.8m with a 2.5m
// ceiling: a spare room with a desk in it, which is what a homelab actually
// lives in.
export const ROOM = { w: 5.2, d: 4.8, h: 2.5 };

/** Where the lantern stands. The lighting rig hangs its sources off this, so
 *  the fitting and the light it casts cannot drift apart. */
export const LANTERN = { x: ROOM.w / 2 - 0.34, z: -1.25 };

/** Centre of the desk, and the depth of its top. */
export const DESK_Z = -ROOM.d / 2 + 0.38;
export const DESK_D = 0.72;

/** Where the chair is tucked in. Exported because FirstPerson has to put a
 *  collision box in the same place, and a chair you can walk through is worse
 *  than no chair. */
export const CHAIR_Z = -1.32;

/** Where the bookshelf stands. The lamp on top reads its x and z from here. */
const SHELF_AT: [number, number, number] = [-ROOM.w / 2 + 0.16, 0, 0.72];

export type Placement = {
  position: [number, number, number];
  rotation: [number, number, number];
  /** Physical width in metres. For the portrait monitor this is the short side. */
  width: number;
};

/*
 * The two desk monitors, positioned as one setup rather than two screens that
 * happen to share a desk. Inner bezels almost touch and the pair is centred on
 * the chair; an earlier pass left 38cm of bare desk between them, which nobody
 * has ever worked at.
 *
 * Both are toed in toward the seat, so their outer edges come forward and the
 * inner edges sit back — the shallow arc two monitors actually get angled into.
 * The x positions account for it: a screen rotated by θ only occupies
 * width·cos(θ) of the desk, so spacing them on raw width would have reopened a
 * visible gap between the bezels.
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
/** Both sit the same distance back from the desk's centre line. */
const SCREEN_DZ = -0.2;

/** The landscape monitor. Shows real source from this repo — see CodeScreen.
 */

export const DESK_SCREEN: Placement = {
  position: [PAIR_LEFT + L_SPAN / 2, 1.09, DESK_Z + SCREEN_DZ],
  rotation: [0, LANDSCAPE_TOE, 0],
  width: LANDSCAPE_W,
};

/**
 * The portrait monitor, which is the shell.
 *
 * Sits lower than a bottom-aligned pairing would put it, and that is deliberate:
 * at 0.72m tall its top would otherwise climb into the social wall hanging at
 * 1.78 and occlude it. A screen that hides another interactive object is a
 * failure this room has already had three times.
 */
export const DESK_TERMINAL: Placement = {
  position: [PAIR_LEFT + L_SPAN + GAP + P_SPAN / 2, 1.19, DESK_Z + SCREEN_DZ],
  rotation: [0, PORTRAIT_TOE, 0],
  width: PORTRAIT_W,
};

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

/**
 * The corner lantern: a paper-shaded column in a slim oak frame. With the
 * pendant gone this is the room's main light, and the only thing in here big
 * enough to throw warm light onto a wall and a ceiling from below.
 *
 * Built as a frame with panels set inside it rather than a glowing box, on the
 * same reasoning as the door: the corner posts and rails are what make it read
 * as a fitting. An emissive cuboid at this size reads as a bug.
 *
 * The shade sits high on the frame so the light source is near eye height. A
 * lantern glowing down by your ankles lights the floor and nothing else.
 */
function Lantern({ position }: { position: [number, number, number] }) {
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
            emissiveIntensity={2.3}
            roughness={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
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
          color="#ffdcae"
          roughness={0.42}
          emissive="#ffa74e"
          emissiveIntensity={1.5}
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


export function Room({
  onPrinterStatus,
  shelf,
  career,
  onInspect,
  onOpenBook,
  onOpenCert,
  onOpenCard,
  onExitRoom,
}: {
  onPrinterStatus: (msg: string | null) => void;
  shelf: ShelfData;
  career: CareerData;
  onInspect: (hw: Hardware) => void;
  onOpenBook: (b: ShelfBook) => void;
  onOpenCert: (c: ShelfCert) => void;
  onOpenCard: (c: InfoCard) => void;
  onExitRoom: () => void;
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

      {/* Plain painted ceiling with nothing on it. The pendant came out: an
          overhead source lights a room evenly and from above, which is the one
          arrangement that never feels like somewhere you would sit. Everything
          is lit from lamp height now, and the ceiling's job is to catch the
          warm bounce off the lantern rather than to emit anything. */}
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
      {/* The career timeline takes the left wall slot the abstract print had.
          A framed thing on the wall is already the shape a timeline wants. */}
      {/* Portrait now, and taller, so the roles stack as readable lines.
          Bottom sits at 1.29 — above the monitors, clear of the social wall. */}
      <CareerFrame
        position={[-1.75, 1.72, -hd + 0.04]}
        career={career}
        onOpen={onOpenCard}
      />
      {/* The abstract print that hung here is gone. It was a coloured
          rectangle in a frame: it said nothing, it linked to nothing, and in a
          room where every other object on a wall is a way into a section of the
          site, a decorative one trains visitors that some things are not worth
          walking up to. */}

      {/* Social links take the wall above the desk, which the big panel used to
          occupy before it moved onto the sideboard. */}
      <SocialWall position={[0, 1.78, -hd + 0.05]} onOpen={onOpenCard} />

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
      {/* The pinned repositories, filling the wall you meet on turning away
          from the desk. Sized and placed to clear the door at x 1.55: the board
          runs -1.85 to 0.35, the door architrave starts at about 1.03. */}
      <GithubWall
        position={[-0.75, 1.45, hd - 0.05]}
        rotation={[0, Math.PI, 0]}
        onOpen={onOpenCard}
      />

      {/* The way out. The door was scenery until now — the only exit was a
          link in the corner of the HUD, which is the one place a visitor who
          has committed to walking around a room is not looking. A door you can
          walk up to and open is the obvious affordance, and the room already
          had one standing there doing nothing. */}
      <Interactive
        label="the door"
        verb="leave"
        detail="back to the site"
        onActivate={onExitRoom}
      >
        {(hovered) => (
          <group>
            <Door position={[1.55, 0, hd - 0.02]} rotation={[0, Math.PI, 0]} />
            {/* Illuminated sign over the frame. meshBasicMaterial so it reads
                as lit from within rather than as a green rectangle the lamps
                happen to be missing. */}
            <group position={[1.55, 2.24, hd - 0.09]} rotation={[0, Math.PI, 0]}>
              <RoundedBox args={[0.3, 0.11, 0.03]} radius={0.006} smoothness={3} castShadow>
                <meshStandardMaterial color="#1d2226" roughness={0.6} metalness={0.3} />
              </RoundedBox>
              <Html
                transform
                occlude="blending"
                distanceFactor={(0.26 / 260) * 400}
                /* No rotation of its own, and a *positive* local z. The parent
                   group is already turned 180° onto the back wall, so both
                   flip: an extra rotation here pointed the sign face into the
                   plaster, and a negative z buried it behind its own housing.
                   Same trap the door leaf documents — in a rotated group,
                   offsets read as "away from the wall", not as a raw axis. */
                position={[0, 0, 0.017]}
                zIndexRange={[10, 0]}
                style={{
                  width: "260px",
                  height: "96px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center font-mono"
                  style={{
                    background: "#0b1a12",
                    color: hovered ? "#7dffbe" : "#3ddc97",
                    fontSize: "52px",
                    letterSpacing: "0.3em",
                    textIndent: "0.3em",
                    fontWeight: 700,
                  }}
                >
                  EXIT
                </div>
              </Html>
            </group>
          </group>
        )}
      </Interactive>

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

        {/* Two monitors now: the landscape panel and the portrait shell. Stands
            read their x straight off the screen placements above, so the pair
            cannot be nudged without the feet following. */}
        <Stand position={[DESK_SCREEN.position[0], 0.755, SCREEN_DZ]} />
        <Stand position={[DESK_TERMINAL.position[0], 0.755, SCREEN_DZ]} />
        <MushroomLamp position={[-1.02, 0.755, -0.1]} />

        {/* The stack of printed blog posts that used to sit by the lamp is
            gone. The whiteboard on the left wall carries the blog now, with
            covers and titles, and two objects for one section is one too
            many. */}
        <ContactCard
          position={[0.6, 0.758, 0.2]}
          rotation={[0, -0.26, 0]}
          onOpen={onOpenCard}
        />

        {/* The printer, on the desk rather than on a cabinet of its own against
            the left wall. It is the one object in the room that hands the
            visitor a file, so having it within reach of the chair is worth more
            than the realism of keeping it off to one side. Sat at the back edge
            so the sheet has clear space to feed out toward the front. */}
        <Printer
          position={[1.02, 0.755, -0.06]}
          rotation={[0, -0.26, 0]}
          onStatus={onPrinterStatus}
        />
      </group>

      {/* Outside work: the gym bag by the door, the homelab in the sideboard. */}
      <GymBag
        position={[-hw + 0.52, 0, hd - 0.62]}
        rotation={[0, 0.42, 0]}
        onOpen={onOpenCard}
      />

      {/* The lantern, in the gap on the right wall between the desk end and the
          sideboard. It stands where the room was previously darkest and where
          it is in view from the door, which is the whole point of it. */}
      <Lantern position={[LANTERN.x, 0, LANTERN.z]} />

      {/* y=0: Prop seats a model on its own base, so no manual lift. */}
      <Plant position={[hw - 0.42, 0, hd - 0.55]} />
      <Chair position={[0, 0, CHAIR_Z]} />

      {/* The homelab, in an open-fronted sideboard against the right wall.
          Every device in it is named from the README hardware tables. */}
      <group position={[hw - 0.28, 0, 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <Sideboard position={[0, 0, 0]} onInspect={onInspect} onOpenCard={onOpenCard} />
      </group>

      {/* The case studies as books, certificates on the bottom shelf. Left
          wall, opposite the homelab. Shelf count follows the content. */}
      <Bookshelf
        position={SHELF_AT}
        rotation={[0, Math.PI / 2, 0]}
        shelf={shelf}
        onOpenBook={onOpenBook}
        onOpenCert={onOpenCert}
      />
      {/* A lamp on top of the shelf, and its light with it.
          The two warm sources are both on the right of the room, which left
          the case studies — the thing most worth reading in here — sitting in
          the dark. Lighting them with more ambient would have paid for one
          dark corner by flattening the whole room, so this is a third fitting
          instead.
          The light is declared here rather than in the rig in FunRoom because
          its height comes from the shelf's content. Kept next to the lamp, the
          two cannot drift apart when a case study is added. */}
      {/* Sits on the shelf's own centre line, not at an x picked by eye. The
          first attempt used -hw + 0.3, which happens to be the exact front lip
          of a 0.28-deep unit centred at -hw + 0.16 — so the lamp stood half off
          the edge. Reading the shelf's own position is the only way this stays
          right if the unit ever moves or gets deeper. */}
      <group position={[SHELF_AT[0], shelfHeight(shelf), SHELF_AT[2]]}>
        <MushroomLamp position={[0, 0, 0]} />
        <pointLight
          position={[0, 0.12, 0]}
          intensity={4.2}
          distance={3.2}
          decay={1.9}
          color="#ffb066"
        />
      </group>

      {/* The blog, on a whiteboard filling the wall the side screens and the
          printer cabinet used to occupy. Auto-populated from the RSS feed, so
          there is nothing to place here per post. */}
      <BlogBoard
        position={[-hw + 0.05, 1.45, -0.78]}
        rotation={[0, Math.PI / 2, 0]}
        onOpen={onOpenCard}
      />
    </group>
  );
}
