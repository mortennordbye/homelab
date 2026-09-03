/**
 * The apartment, taken off its floor plan.
 *
 * Plan space matches the drawing: x runs east (right), z runs south (down),
 * origin at the north-west corner, metres throughout. World space is plan
 * space centred on the origin, because the camera rig and every existing
 * placement were written around a centred room.
 *
 * The wall list here is the only description of the shell. Both the meshes and
 * the collision boxes are built from it, so a wall you can walk through cannot
 * happen by editing one and forgetting the other.
 */

export const FLAT = { w: 6.3, d: 6.1, h: 2.5 };

/** Interior partitions. The perimeter is thicker but is not walked into. */
export const WALL_T = 0.1;

export type Rect = { x0: number; z0: number; x1: number; z1: number };

/**
 * The four spaces, as clear interior rectangles in plan space. Sizes are the
 * ones printed on the drawing; where it gives an outer figure the wall
 * thickness is taken off here rather than in the geometry.
 */
export const ZONES = {
  /** Stue/kjøkken. The whole west side, full depth. */
  living: { x0: 0, z0: 0, x1: 3.9, z1: 6.1 },
  /** Soverom, north-east. 2.2 x 2.7 on the drawing. */
  bedroom: { x0: 4.0, z0: 0, x1: 6.3, z1: 2.7 },
  /** Bad, below the bedroom. 1.8 deep on the drawing. */
  bath: { x0: 4.0, z0: 2.8, x1: 6.3, z1: 4.6 },
  /** Entré, south-east. Open to the living room on its west side. */
  hall: { x0: 4.0, z0: 4.7, x1: 6.3, z1: 6.1 },
} as const satisfies Record<string, Rect>;

/**
 * An axis-aligned run of wall, with the door openings cut out of it.
 * `doors` are measured along the run from `a`, so a door does not have to be
 * re-derived when a wall moves.
 */
export type WallRun = {
  id: string;
  a: [number, number];
  b: [number, number];
  doors?: [number, number][];
};

/**
 * Interior walls only. The bedroom is entered from the living room, the
 * bathroom from the hall, and the hall stands open to the living room — which
 * is why no run closes the west side of the entré.
 */
export const WALLS: WallRun[] = [
  {
    id: "living/east",
    a: [3.95, 0],
    b: [3.95, 4.65],
    doors: [[0.3, 1.1]],
  },
  { id: "bedroom/south", a: [3.95, 2.75], b: [6.3, 2.75] },
  {
    id: "bath/south",
    a: [3.95, 4.65],
    b: [6.3, 4.65],
    doors: [[1.35, 2.15]],
  },
];

/** A solid box in world space: centre plus half extents, the shape both the
 *  wall meshes and the collision resolver want. */
export type Box = { x: number; z: number; hx: number; hz: number };

/** Plan metre to world metre. Placements are written in plan space so they can
 *  be read straight off the drawing and checked against it. */
export const px = (x: number) => x - FLAT.w / 2;
export const pz = (z: number) => z - FLAT.d / 2;

/** A plan-space point at height `y`, as the triple three.js wants. */
export const at = (x: number, y: number, z: number): [number, number, number] => [
  px(x),
  y,
  pz(z),
];

/** Centre of a plan rect, at height `y`. */
export function centreOf(r: Rect, y = 0): [number, number, number] {
  return at((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
}

const toWorldX = px;
const toWorldZ = pz;

/** Plan rect to a world-space box. */
export function rectBox(r: Rect): Box {
  return {
    x: toWorldX((r.x0 + r.x1) / 2),
    z: toWorldZ((r.z0 + r.z1) / 2),
    hx: (r.x1 - r.x0) / 2,
    hz: (r.z1 - r.z0) / 2,
  };
}

/**
 * Every interior wall run cut into its solid pieces. A run with two doors
 * yields three pieces; a run with none yields one.
 */
export function wallBoxes(): Box[] {
  const out: Box[] = [];
  for (const run of WALLS) {
    const horizontal = run.a[1] === run.b[1];
    const start = horizontal ? run.a[0] : run.a[1];
    const end = horizontal ? run.b[0] : run.b[1];
    const fixed = horizontal ? run.a[1] : run.a[0];

    // Walk the run, emitting the solid gaps between the openings.
    const cuts = [...(run.doors ?? [])].sort((p, q) => p[0] - q[0]);
    let cursor = start;
    const pieces: [number, number][] = [];
    for (const [d0, d1] of cuts) {
      const from = start + d0;
      const to = start + d1;
      if (from > cursor) pieces.push([cursor, from]);
      cursor = to;
    }
    if (cursor < end) pieces.push([cursor, end]);

    for (const [p0, p1] of pieces) {
      out.push(
        horizontal
          ? {
              x: toWorldX((p0 + p1) / 2),
              z: toWorldZ(fixed),
              hx: (p1 - p0) / 2,
              hz: WALL_T / 2,
            }
          : {
              x: toWorldX(fixed),
              z: toWorldZ((p0 + p1) / 2),
              hx: WALL_T / 2,
              hz: (p1 - p0) / 2,
            },
      );
    }
  }
  return out;
}

/** Door openings, for the linings and casings that stand in them. */
export function doorOpenings(): { box: Box; horizontal: boolean }[] {
  const out: { box: Box; horizontal: boolean }[] = [];
  for (const run of WALLS) {
    const horizontal = run.a[1] === run.b[1];
    const start = horizontal ? run.a[0] : run.a[1];
    const fixed = horizontal ? run.a[1] : run.a[0];
    for (const [d0, d1] of run.doors ?? []) {
      const p0 = start + d0;
      const p1 = start + d1;
      out.push({
        horizontal,
        box: horizontal
          ? {
              x: toWorldX((p0 + p1) / 2),
              z: toWorldZ(fixed),
              hx: (p1 - p0) / 2,
              hz: WALL_T / 2,
            }
          : {
              x: toWorldX(fixed),
              z: toWorldZ((p0 + p1) / 2),
              hx: WALL_T / 2,
              hz: (p1 - p0) / 2,
            },
      });
    }
  }
  return out;
}

/**
 * Where the three pieces the floor plan was marked up with go.
 * Red: the TV bench on the west wall. Green: the sofa facing it.
 * Blue: the desk against the south wall in the south-west corner.
 */
export const MARKS = {
  tvBench: { x0: 0.05, z0: 0.55, x1: 0.5, z1: 2.55 },
  sofa: { x0: 1.65, z0: 0.5, x1: 2.55, z1: 2.4 },
  desk: { x0: 0.15, z0: 5.35, x1: 1.55, z1: 6.05 },
} as const satisfies Record<string, Rect>;
