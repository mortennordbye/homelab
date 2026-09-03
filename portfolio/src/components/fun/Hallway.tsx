"use client";

import { Instance, Instances, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { OAK } from "@/components/materials/oak";
import type { Surface } from "@/components/materials/surface";
import { at, type Rect } from "./flat";
import { OpenBox } from "./openable";

/**
 * The entré, off the photographs of the real one: a coat run down one side
 * with the shoe rack under it, and the tall reeded cabinet opposite with the
 * lamp on top.
 *
 * Built as the real furniture in the flat's own materials rather than in the
 * hall's real white and sage. The room is the flat rebuilt on the site's
 * palette, and a white wall here would be the only one in it.
 *
 * Every piece takes its origin at the wall face with local +z into the room,
 * which is the convention the bathroom pieces already use.
 */

const WOOL = "#4a4438";
const LINEN = "#ded7cb";

/**
 * The one niche both built-ins are cut from.
 *
 * It is a hole in the bathroom wall, not a box stood against it: the joinery's
 * face is in the plane of the wall and of the door casing beside it, and the
 * depth is taken out of the bathroom the way the real one is. Standing it proud
 * instead gives every bay a pair of piers whose faces catch no light, which is
 * a black slab across the entré and the tell that it was never built in.
 *
 * `back` is the plaster behind the joinery — the thickness that makes the
 * bathroom side of it read as a wall rather than as the back of a box.
 */
const RECESS = { deep: 0.36, back: 0.06, head: 2.2, ceil: 2.5 };

/**
 * The coat alcove, in the east wall between the bathroom door and the way out.
 *
 * The flat's rectangle stops at x 6.30 and this is beyond it, because in the
 * flat it is beyond it: the entré is notched into whatever is east of the
 * building line, and the coats hang in the notch. Modelling it inside the
 * rectangle is what put them on the wrong wall twice — there is no wall in the
 * entré with 0.9m of run and 0.5m of depth to give them.
 *
 * Full height, no soffit. `z1` leaves the return that carries the picture and
 * the extinguisher, which is where both hang in the flat.
 */
export const ALCOVE = { x: 6.3, d: 0.5, z0: 4.7, z1: 5.5, reveal: 0.04 };

const BENCH_D = 0.34;
const BENCH_W = 0.9;
const BENCH_X = 4.72;
const BENCH_H = 0.42;
const BENCH_CUSHION = 0.055;
const CABINET_W = 0.9;
const CABINET_D = 0.4;
const CABINET_X = 3.62;

/** The south wall's inner face. Everything along it stands hard against it. */
const SOUTH = 6.08;

/** The top of the bench cushion. Anything set down on the bench is placed off
 *  this rather than measured against it, so the bench cannot move out from
 *  under it. */
export const BENCH_TOP = at(
  BENCH_X,
  BENCH_H + 0.035 + BENCH_CUSHION / 2,
  SOUTH - BENCH_D / 2,
);

/** The coats, off the photograph: mostly black, one blue, one camel. Fixed
 *  rather than random — a hall that reshuffles its coats on every load stops
 *  being somewhere you have been before. */
const COATS: [number, number, string][] = [
  [0.0, 0.72, "#232120"],
  [0.16, 0.8, "#1e1c1b"],
  [0.31, 0.68, "#26241f"],
  [0.46, 0.78, "#2d3a45"],
  [0.61, 0.7, "#211f1e"],
  [0.76, 1.04, "#6a5941"],
  [0.9, 0.75, "#1c1a19"],
];

/** Shoes on the rack and under it: pair offset, tier, and colour. */
const SHOES: [number, number, string][] = [
  [0.12, 1, "#1a1a1a"],
  [0.3, 1, "#232323"],
  [0.62, 1, "#cdc7bb"],
  [0.8, 1, "#c6c0b4"],
  [0.18, 0, "#2b2520"],
  [0.4, 0, "#1d1c1a"],
  [0.66, 0, "#d2ccc0"],
];

/**
 * The coats: the hanging rail with the hat shelf over it and the plank shoe
 * rack on the floor, in the alcove notched out of the east wall.
 *
 * Origin at the BACK of the alcove, mid-width, local +z out toward the hall.
 * The plaster around it is `AlcoveLining`'s, so this draws only what is hung
 * and stood in the hole. Everything inside is placed as a fraction of `depth`
 * rather than at a fixed offset: the alcove is deeper than the shelf niche and
 * a hat shelf measured in absolute metres either floats or pokes out.
 */
function EntryCloset({
  position,
  rotation = [0, 0, 0],
  width,
  depth,
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Clear width between the reveals. */
  width: number;
  depth: number;
  oak: Surface;
}) {
  const hangX = 0;
  const hangW = width - 0.06;
  const SHELF_Y = 1.9;
  const RAIL_Y = 1.78;
  const mid = depth * 0.45;

  return (
    <group position={position} rotation={rotation}>
      {/* hat shelf, rail, coats and the shoe rack under them */}
      <group position={[hangX, 0, 0]}>
        <mesh position={[0, SHELF_Y, mid]} castShadow receiveShadow>
          <boxGeometry args={[hangW, 0.032, depth * 0.84]} />
          <meshStandardMaterial {...oak} color={OAK.case} roughness={0.55} metalness={0} />
        </mesh>
        {[-0.19, 0.14].map((x, i) => (
          <RoundedBox
            key={x}
            position={[x, SHELF_Y + 0.1, mid]}
            args={[0.26 + i * 0.05, 0.17, 0.22]}
            radius={0.055}
            smoothness={3}
            castShadow
          >
            <meshStandardMaterial color="#1d1d1f" roughness={0.85} metalness={0.04} />
          </RoundedBox>
        ))}

        <mesh position={[0, RAIL_Y, mid + 0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.013, 0.013, hangW - 0.03, 12]} />
          <meshStandardMaterial color="#9aa0a4" roughness={0.28} metalness={0.9} />
        </mesh>

        {COATS.map(([t, len, colour], i) => (
          /* Stepped in depth as well as across: seven slabs sharing one plane
             and overlapping by half their width z-fight into stripes. */
          <group key={i} position={[-hangW / 2 + 0.11 + t * (hangW - 0.22), 0, mid - 0.02 + (i % 3) * 0.026]}>
            <mesh position={[0, RAIL_Y - 0.01, 0]} rotation={[0, 0, 0.35]}>
              <torusGeometry args={[0.035, 0.005, 6, 12, Math.PI]} />
              <meshStandardMaterial color="#9aa0a4" roughness={0.3} metalness={0.85} />
            </mesh>
            <RoundedBox
              position={[0, RAIL_Y - 0.06 - len / 2, 0]}
              args={[0.19, len, 0.13]}
              radius={0.045}
              smoothness={3}
              castShadow
            >
              <meshStandardMaterial color={colour} roughness={0.92} metalness={0} />
            </RoundedBox>
          </group>
        ))}

        {/* the plank shoe rack on the floor of the alcove */}
        <mesh position={[0, 0.16, mid]} castShadow receiveShadow>
          <boxGeometry args={[hangW - 0.06, 0.026, depth * 0.74]} />
          <meshStandardMaterial {...oak} color={OAK.case} roughness={0.6} metalness={0} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (hangW / 2 - 0.06), 0.08, mid]}>
            <boxGeometry args={[0.022, 0.16, depth * 0.7]} />
            <meshStandardMaterial color={OAK.carcass} roughness={0.7} />
          </mesh>
        ))}
        {SHOES.map(([t, tier, colour], i) => (
          <RoundedBox
            key={i}
            position={[-hangW / 2 + 0.1 + t * (hangW - 0.2), tier ? 0.21 : 0.045, mid - 0.03 + (i % 2) * 0.04]}
            rotation={[0, (i % 3) * 0.14 - 0.14, 0]}
            args={[0.1, 0.075, 0.27]}
            radius={0.032}
            smoothness={3}
            castShadow
          >
            <meshStandardMaterial color={colour} roughness={0.8} metalness={0} />
          </RoundedBox>
        ))}
      </group>
    </group>
  );
}

/**
 * The open shelf built-in, off the photograph of it: two columns of boards in
 * the niche, the left one shelves all the way up, the right one a hanging bay
 * at the top over shelves below. A plant on the left, baskets and boxes in most
 * of the rest, and the bags that live on the floor in front of it.
 *
 * The upright between the columns is the unit's own, not the wall's — in the
 * flat this is one carcass built into the hole rather than two niches.
 *
 * Origin at the back of the niche, mid-width, local +z out toward the hall.
 */
function ShelfCloset({
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
  const { deep: DEEP, head: TOP } = RECESS;
  const z = DEEP / 2 - 0.02;
  /* The right column carries the rail, so its boards stop below it while the
     left column's run on up. */
  const RAIL_Y = 1.72;
  /* No board at 1.32: that is the plant's bay, and a 0.32 opening cuts its
     blades off halfway up. */
  const LEFT = [0.02, 0.36, 0.68, 1.0, 1.64, 1.96];
  const RIGHT = [0.02, 0.36, 0.68, 1.0];
  const bay = (width - 0.02) / 2;
  const lx = -(bay + 0.02) / 2;
  const rx = (bay + 0.02) / 2;

  const board = <meshStandardMaterial {...oak} color={OAK.case} roughness={0.62} metalness={0} />;

  return (
    <group position={position} rotation={rotation}>
      {/* carcass: the upright, then the boards in each column */}
      <mesh position={[0, TOP / 2, z]} receiveShadow>
        <boxGeometry args={[0.02, TOP, DEEP - 0.04]} />
        <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.7} metalness={0} />
      </mesh>
      {([[lx, LEFT], [rx, RIGHT]] as const).map(([x, ys]) =>
        ys.map((y) => (
          <mesh key={`${x}${y}`} position={[x, y, z]} receiveShadow>
            <boxGeometry args={[bay, 0.02, DEEP - 0.04]} />
            {board}
          </mesh>
        )),
      )}

      {/* The rail in the right column, and what hangs off it: a tote and a
          couple of soft bags rather than coats, which live in the alcove. */}
      <mesh position={[rx, RAIL_Y, DEEP / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.011, 0.011, bay - 0.04, 10]} />
        <meshStandardMaterial color="#9aa0a4" roughness={0.3} metalness={0.9} />
      </mesh>
      {([
        [-0.09, 0.44, "#1d1c1a"],
        [0.06, 0.36, "#26241f"],
      ] as const).map(([dx, len, colour], i) => (
        <RoundedBox
          key={dx}
          position={[rx + dx, RAIL_Y - 0.05 - len / 2, DEEP / 2 - 0.03 + i * 0.03]}
          args={[0.17, len, 0.1]}
          radius={0.04}
          smoothness={3}
          castShadow
        >
          <meshStandardMaterial color={colour} roughness={0.92} metalness={0} />
        </RoundedBox>
      ))}

      {/* The hat and the boots on the top board, which is above the rail and so
          only exists on the left. */}
      <RoundedBox
        position={[lx - 0.06, 2.06, z]}
        args={[0.19, 0.13, 0.19]}
        radius={0.05}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color="#1d1d1f" roughness={0.88} metalness={0.03} />
      </RoundedBox>

      {/* What stands on the boards: column, board index, height, colour. The
          plant is the one green thing in the flat and it is on the left at eye
          level, which is where it is in the photograph. */}
      {([
        [lx, 0, 0.22, "#6b5c46"],
        [lx, 1, 0.2, "#5c5142"],
        [lx, 2, 0.26, "#3f4a38"],
        [lx, 4, 0.18, "#6b5c46"],
        [rx, 0, 0.24, "#5c5142"],
        [rx, 1, 0.22, "#6b5c46"],
        [rx, 2, 0.2, "#232120"],
      ] as const).map(([x, i, h, colour]) => {
        const ys = x === lx ? LEFT : RIGHT;
        return (
          <RoundedBox
            key={`${x}${i}`}
            position={[x, ys[i] + 0.01 + h / 2, z]}
            args={[bay - 0.07, h, DEEP - 0.12]}
            radius={0.022}
            smoothness={3}
            castShadow
          >
            <meshStandardMaterial color={colour} roughness={0.9} metalness={0} />
          </RoundedBox>
        );
      })}
      <Plant position={[lx + 0.02, LEFT[3] + 0.02, z]} />

      {/* The rucksack and the leather bag, on the floor in front of it. */}
      <RoundedBox
        position={[lx - 0.1, 0.23, DEEP + 0.16]}
        rotation={[0.05, 0.3, -0.04]}
        args={[0.28, 0.44, 0.2]}
        radius={0.07}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#17181a" roughness={0.9} metalness={0.03} />
      </RoundedBox>
      <RoundedBox
        position={[rx + 0.04, 0.17, DEEP + 0.13]}
        rotation={[0.03, -0.22, 0.03]}
        args={[0.2, 0.32, 0.16]}
        radius={0.06}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#4a3a2e" roughness={0.72} metalness={0.05} />
      </RoundedBox>
    </group>
  );
}

/** The snake plant on the shelf: a pot and a few upright blades. */
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.14, 14]} />
        <meshStandardMaterial color="#5a5148" roughness={0.85} metalness={0} />
      </mesh>
      {([-0.03, 0, 0.03, 0.055] as const).map((dx, i) => (
        <mesh
          key={dx}
          position={[dx, 0.26 + i * 0.02, dx * 0.4]}
          rotation={[dx * 1.6, 0, -dx * 3.2]}
          castShadow
        >
          <boxGeometry args={[0.032, 0.3 + i * 0.03, 0.008]} />
          <meshStandardMaterial color="#3f4a38" roughness={0.78} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/** The vertical reeding on the cabinet doors, as half-rounds. */
function Reeding({ width, height, count }: { width: number; height: number; count: number }) {
  const step = width / count;
  return (
    /* Culling off for the reason the forest needs it: the instanced mesh keeps
       its bounding sphere at this group's origin, inside the carcass. */
    <Instances limit={count} range={count} frustumCulled={false}>
      {/* Half-round, opening toward +z: three sweeps theta from +z through +x,
          so the front-facing half starts a quarter turn back. */}
      <cylinderGeometry args={[step * 0.42, step * 0.42, 1, 8, 1, false, -Math.PI / 2, Math.PI]} />
      <meshStandardMaterial color={OAK.case} roughness={0.6} metalness={0} />
      {Array.from({ length: count }, (_, i) => (
        <Instance
          key={i}
          position={[-width / 2 + step * (i + 0.5), 0, 0]}
          scale={[1, height, 1]}
        />
      ))}
    </Instances>
  );
}

/**
 * The tall cabinet: a reeded carcass with rounded top corners standing on thin
 * legs, and what stands on it. The lamp on top is a real source — it is the
 * only fitting in the entré, and without it the way out is the darkest part of
 * the flat.
 */
function TallCabinet({
  position,
  rotation = [0, 0, 0],
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
}) {
  const W = CABINET_W;
  const H = 1.1;
  const D = CABINET_D;
  const LEG = 0.15;

  return (
    <group position={position} rotation={rotation}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (W / 2 - 0.07), LEG / 2, D / 2 + sz * (D / 2 - 0.07)]}
            rotation={[0.04 * sz, 0, -0.04 * sx]}
          >
            <cylinderGeometry args={[0.014, 0.019, LEG, 8]} />
            <meshStandardMaterial color={OAK.back} roughness={0.6} />
          </mesh>
        )),
      )}

      <RoundedBox
        position={[0, LEG + H / 2, D / 2]}
        args={[W, H, D]}
        radius={0.055}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...oak} color={OAK.carcass} roughness={0.66} metalness={0} />
      </RoundedBox>

      <group position={[0, LEG + H / 2, D + 0.004]}>
        <Reeding width={W - 0.09} height={H - 0.12} count={26} />
      </group>

      {/* The lamp: fluted ceramic base, pleated shade, and the light in it. */}
      <group position={[-0.19, LEG + H, D / 2 + 0.02]}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 0.26, 16]} />
          <meshStandardMaterial color={LINEN} roughness={0.5} metalness={0} />
        </mesh>
        <mesh position={[0, 0.33, 0]} castShadow>
          <coneGeometry args={[0.2, 0.17, 22, 1, true]} />
          <meshStandardMaterial color="#3f1f26" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0.3, 0]} intensity={4.6} distance={3.2} decay={1.8} color="#ffc98a" />
      </group>

      {/* vase of dried stems, and the small figure beside it */}
      <group position={[0.26, LEG + H, D / 2 + 0.01]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.052, 14, 10]} />
          <meshStandardMaterial color={LINEN} roughness={0.55} />
        </mesh>
        {[-0.05, 0, 0.05].map((dx, i) => (
          <group key={dx} position={[dx * 0.5, 0.09, dx * 0.3]} rotation={[0, 0, dx * 2.2]}>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.003, 0.004, 0.13, 5]} />
              <meshStandardMaterial color="#5c5142" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <sphereGeometry args={[0.012 + i * 0.003, 8, 6]} />
              <meshStandardMaterial color="#8d6f72" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0.06, LEG + H + 0.06, D / 2 - 0.03]} castShadow>
        <capsuleGeometry args={[0.02, 0.042, 4, 10]} />
        <meshStandardMaterial color="#e2dbcf" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** An arch, as the outline of the mirror and of the glass inside it. */
function archShape(w: number, h: number) {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, -h / 2);
  s.lineTo(-r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, Math.PI, 0, true);
  s.lineTo(r, -h / 2);
  s.closePath();
  return s;
}

/** The arched mirror over the bench. */
function ArchMirror({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const W = 0.46;
  const H = 0.78;
  const T = 0.035;

  const frame = useMemo(() => {
    const outer = archShape(W, H);
    outer.holes.push(archShape(W - T * 2, H - T * 2));
    return new THREE.ExtrudeGeometry(outer, { depth: 0.035, bevelEnabled: false });
  }, []);
  const glass = useMemo(() => new THREE.ShapeGeometry(archShape(W - T * 2, H - T * 2)), []);
  useEffect(() => () => {
    frame.dispose();
    glass.dispose();
  }, [frame, glass]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={frame} castShadow>
        <meshStandardMaterial color={OAK.case} roughness={0.55} metalness={0} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, 0.012]}>
        <meshStandardMaterial color="#4a5057" roughness={0.06} metalness={0.6} envMapIntensity={2.2} />
      </mesh>
    </group>
  );
}

/**
 * The shoe bench: an open cubby case with a cushion on it and the rucksack
 * against one end. Not a bench with legs — in the flat it is a shoe unit you
 * happen to sit on, and the cubbies are most of what you see of it.
 */
function ShoeBench({
  position,
  rotation = [0, 0, 0],
  oak,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
}) {
  const W = BENCH_W;
  const H = BENCH_H;
  const D = BENCH_D;

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, H / 2, D / 2]}>
        <OpenBox
          width={W}
          height={H}
          depth={D}
          material={<meshStandardMaterial {...oak} color={OAK.case} roughness={0.62} metalness={0} />}
        />
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * W * 0.165, H / 2, D / 2]}>
          <boxGeometry args={[0.018, H - 0.03, D - 0.02]} />
          <meshStandardMaterial color={OAK.carcass} roughness={0.7} />
        </mesh>
      ))}
      {/* what lives in the cubbies */}
      {([[-0.3, "#2b2520"], [-0.02, "#1d1c1a"], [0.3, "#cdc7bb"]] as const).map(([x, colour]) => (
        <RoundedBox
          key={x}
          position={[x, 0.07, D / 2]}
          args={[0.1, 0.08, 0.26]}
          radius={0.03}
          smoothness={3}
        >
          <meshStandardMaterial color={colour} roughness={0.82} metalness={0} />
        </RoundedBox>
      ))}

      {/* the cushion, overhanging the case the way a loose pad does */}
      <RoundedBox
        position={[0, H + 0.035, D / 2]}
        args={[W + 0.03, BENCH_CUSHION, D + 0.03]}
        radius={0.018}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial color={WOOL} roughness={0.96} metalness={0} />
      </RoundedBox>

      {/* the rucksack, stood against the end of it */}
      <RoundedBox
        position={[W / 2 + 0.13, 0.24, D / 2 + 0.03]}
        rotation={[0.06, -0.25, 0.05]}
        args={[0.26, 0.42, 0.2]}
        radius={0.07}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#17181a" roughness={0.9} metalness={0.03} />
      </RoundedBox>
    </group>
  );
}

/** The extinguisher by the way out. Required by law, and the one saturated
 *  thing in the flat — kept dark so it reads as enamel rather than as a toy. */
function Extinguisher({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.44, 18]} />
        <meshStandardMaterial color="#7d201d" roughness={0.42} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.077, 0.077, 0.06, 18]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.026, 0.03, 0.09, 12]} />
        <meshStandardMaterial color="#8d9298" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0.04, 0.55, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.36, 0.077]}>
        <planeGeometry args={[0.075, 0.1]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.85} />
      </mesh>
    </group>
  );
}

/** The small framed print on the return panel, the way it hangs in the hall. */
function FramedPrint({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.19, 0.25, 0.016]} />
        <meshStandardMaterial color={OAK.case} roughness={0.5} metalness={0} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.15, 0.21]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, 0.011]}>
        <planeGeometry args={[0.07, 0.1]} />
        <meshStandardMaterial color="#b9b3a2" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * The wall the built-ins are cut into: the entré's north side, between the
 * living room's return and the bathroom door.
 *
 * Both bays are laid out from JAMB rather than from centres. The run has to
 * die exactly on the door's opening — a built-in that stops 80mm short leaves a
 * sliver of wall no joiner would have left, and one that runs 80mm long stands
 * in the doorway, which is what it did. Widths follow from the wall; they are
 * not chosen.
 */
const FACE = 4.7;
/** The living room wall's east face. It is already the niche's west reveal, so
 *  nothing is drawn on that side. */
const RETURN_X = 4.0;
/** Where the joinery stops, and where the bathroom door's jamb begins. */
const NICHE_END = 5.2;
const JAMB = 5.3;

/** The back of the joinery, and the back of the plaster behind it. Both are
 *  north of the wall, which is to say inside what used to be the bathroom. */
const BACK = FACE - RECESS.deep;
const SKIN = BACK - RECESS.back;

/* The shelf unit fills the opening, less a 10mm shadow gap each side so its
   boards are not coplanar with the plaster reveals they die into. */
const SHELF_W = NICHE_END - RETURN_X - 0.02;
const SHELF_X = (RETURN_X + NICHE_END) / 2;

/**
 * The plaster that closes the hole `flat.ts` cuts for this: the back, the head
 * over both bays, the reveals at each end and the pier between them.
 *
 * Without it the niche is a window into the bathroom. The jamb block runs 50mm
 * past the wall's bathroom face rather than butting onto it: two boxes that
 * meet exactly share a plane, and a shared plane dithers.
 *
 * Nothing divides the opening: the shelf unit's own upright does that, because
 * in the flat the niche holds one carcass rather than two separate holes.
 */
function NicheLining() {
  const { head: HEAD, ceil: CEIL } = RECESS;
  /* The back and the head die 40mm inside the jamb rather than onto its face,
     for the reason the jamb itself runs past the wall: butted flush they share
     a plane with it over the full height of the opening, and it dithers. */
  const into = JAMB - 0.04;
  /* The jamb is the whole thickness between the niche and the door opening,
     0.42 rather than the wall's 0.10, which is why `flat.ts` leaves no wall
     piece here for it to sit inside. It runs 20mm into the door's lining so
     that face is buried rather than shared. */
  const jz0 = SKIN - 0.03;
  const jz1 = FACE;
  const jx1 = JAMB + 0.02;
  const plaster = <meshStandardMaterial color="#4a4237" roughness={0.9} metalness={0} />;

  const slabs: [string, number, number, number, number, number, number][] = [
    // name, x centre, y centre, z centre, then the three sizes
    ["back", (RETURN_X + into) / 2, CEIL / 2, (SKIN + BACK) / 2, into - RETURN_X, CEIL, RECESS.back],
    ["head", (RETURN_X + into) / 2, (HEAD + CEIL) / 2, (BACK - 0.04 + FACE) / 2, into - RETURN_X, CEIL - HEAD, RECESS.deep + 0.04],
    ["jamb", (NICHE_END + jx1) / 2, CEIL / 2, (jz0 + jz1) / 2, jx1 - NICHE_END, CEIL, jz1 - jz0],
  ];

  return (
    <>
      {slabs.map(([name, x, y, z, sx, sy, sz]) => (
        <mesh key={name} position={at(x, y, z)} castShadow receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          {plaster}
        </mesh>
      ))}
    </>
  );
}

/**
 * The alcove itself: three plaster faces closing the notch, and the fill that
 * makes the inside of it visible.
 *
 * The east wall is a plane with a hole in it rather than a solid, so these side
 * walls are what the reveal at the opening actually is. They run back to x 6.30
 * so they meet that plane instead of stopping short of it and leaving a slot
 * you can see the sky through.
 *
 * The light is the one thing here that is not in the photograph and has to be:
 * the alcove is 0.5m outside the flat and the only fitting within reach is the
 * lamp three metres away on the cabinet, so without it the coats are a black
 * rectangle. Kept dim and warm, so it reads as the hall's own light reaching in.
 */
function AlcoveLining() {
  const T = ALCOVE.reveal;
  const back = ALCOVE.x + ALCOVE.d;
  const mid = (ALCOVE.z0 + ALCOVE.z1) / 2;
  const plaster = <meshStandardMaterial color="#4a4237" roughness={0.9} metalness={0} />;

  /* The reveals sit inside the opening rather than beside it. Outside it they
     would end on the wall plane at x 6.30, which still exists there, and two
     faces on one plane dither; inside it the plane has a hole and there is
     nothing for them to fight. */
  const slabs: [string, number, number, number, number][] = [
    // name, x centre, z centre, then the two plan sizes
    ["back", back + T / 2, mid, T, ALCOVE.z1 - ALCOVE.z0],
    ["north", (ALCOVE.x + back + T) / 2, ALCOVE.z0 + T / 2, ALCOVE.d + T, T],
    ["south", (ALCOVE.x + back + T) / 2, ALCOVE.z1 - T / 2, ALCOVE.d + T, T],
  ];

  return (
    <>
      {slabs.map(([name, x, z, sx, sz]) => (
        <mesh key={name} position={at(x, RECESS.ceil / 2, z)} castShadow receiveShadow>
          <boxGeometry args={[sx, RECESS.ceil, sz]} />
          {plaster}
        </mesh>
      ))}
      <pointLight
        position={at(ALCOVE.x + 0.12, 2.24, mid)}
        intensity={2.4}
        distance={1.9}
        decay={1.7}
        color="#ffd9a6"
      />
    </>
  );
}

/**
 * What the walker cannot pass through in here, as plan rectangles.
 *
 * Exported rather than restated in `FirstPerson` for the reason the walls are
 * built from `wallBoxes()`: a piece that moves without its collision moving
 * with it is how you get furniture you walk through standing next to floor you
 * cannot cross. The rucksack is folded into the bench because it sits on the
 * floor beside it, and a bag you walk through beside a bench you cannot is
 * worse than either.
 *
 * The gap these leave down the middle of the entré is the only route to the
 * front door, and it is 1.04m against a player 0.60 wide. Anything added here
 * has to leave it.
 *
 * The first is not furniture but the niche: `flat.ts` cuts the wall away for
 * it, taking the collision with it, and this is what puts the wall line back —
 * on the bathroom's side too, where the joinery is now a bulkhead standing in
 * the room.
 */
export const HALL_SOLIDS: Rect[] = [
  { x0: RETURN_X, z0: SKIN, x1: JAMB, z1: FACE },
  {
    x0: BENCH_X - BENCH_W / 2 - 0.26,
    z0: SOUTH - BENCH_D,
    x1: BENCH_X + BENCH_W / 2,
    z1: SOUTH,
  },
  {
    x0: CABINET_X - CABINET_W / 2,
    z0: SOUTH - CABINET_D,
    x1: CABINET_X + CABINET_W / 2,
    z1: SOUTH,
  },
];

export function Hallway({ oak }: { oak: Surface }) {
  return (
    <group>
      {/* The plaster of the niche in the bathroom wall, and the one shelf unit
          built into it. */}
      <NicheLining />
      <ShelfCloset position={at(SHELF_X, 0, BACK)} width={SHELF_W} oak={oak} />

      {/* The coats, in the alcove notched out of the east wall. Its origin is
          the back of the notch and local +z points west into the hall, so the
          piece is authored exactly as the niche one is. */}
      <AlcoveLining />
      <EntryCloset
        position={at(ALCOVE.x + ALCOVE.d, 0, (ALCOVE.z0 + ALCOVE.z1) / 2)}
        rotation={[0, -Math.PI / 2, 0]}
        width={ALCOVE.z1 - ALCOVE.z0 - ALCOVE.reveal * 2 - 0.02}
        depth={ALCOVE.d}
        oak={oak}
      />

      {/* On the return south of the alcove, which is the wall they hang on in
          the flat: the watercolour, and the extinguisher at the foot of it. */}
      <FramedPrint position={at(6.28, 1.46, 5.78)} rotation={[0, -Math.PI / 2, 0]} />
      <Extinguisher position={at(6.18, 0, 5.96)} />

      {/* The cabinet on the south wall beside the way out, and the mirror and
          bench facing the coats across the hall. */}
      {/* Mirror over the bench, then the cabinet, in one row west of the door
          along the flat's south wall. This is the arrangement in the flat and
          it does not fit on any single wall of the entré zone — the run is over
          three metres and the entré is 2.3 across, so it takes the wall the
          entré shares with the living room. */}
      {/* Hard against the wall rather than the 50mm off it they were: those
          centimetres are the ones the route past the built-ins is short of. */}
      <ShoeBench position={at(BENCH_X, 0, SOUTH)} rotation={[0, Math.PI, 0]} oak={oak} />
      <ArchMirror position={at(BENCH_X, 1.46, SOUTH - 0.01)} rotation={[0, Math.PI, 0]} />
      <TallCabinet position={at(CABINET_X, 0, SOUTH)} rotation={[0, Math.PI, 0]} oak={oak} />
    </group>
  );
}
