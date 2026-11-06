"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OAK } from "@/components/materials/oak";
import type { Surface } from "@/components/materials/surface";
import { projectRepos, type ProjectRepo } from "@/content/repos";
import { site } from "@/content/site";
import { FLAT } from "./flat";
import { useProjectRepos, type ProjectFeed } from "./feed";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";
import { useSeen } from "./Mirror";
import { REPO_OBJECTS } from "./repo-objects";
import { M, MONO, TickCtx, type Tick } from "./repo-objects/shared";
import { MERGE_STATIC } from "./StaticMerge";

/**
 * The projects, one object each, in a wall-hung oak shelf of 4 x 3
 * compartments. Plan metres; `z` is the wall face. FirstPerson reads these
 * numbers for the collision box, so move the shelf here, not in Room.tsx.
 */
export const REPO_SHELF = { x: 2.58, z: FLAT.d - 0.02, y: 0.96, w: 1.0, h: 0.88, d: 0.22 };

const T = 0.018;
const COLS = 4;
const ROWS = 3;
const { w: W, h: H, d: D } = REPO_SHELF;
const CW = (W - (COLS + 1) * T) / COLS;
const RH = (H - (ROWS + 1) * T) / ROWS;
const colX = (c: number) => -W / 2 + T + CW / 2 + c * (CW + T);
/** Compartment floor, top row first. */
const floorY = (r: number) => H - (r + 1) * (T + RH);

/** Shelf labels share one canvas, a band per repo. */
const LABEL_W = 0.11;
const LABEL_H = 0.022;
const LABEL_PX = [256, 52] as const;
/** Paper this close to the hall lamp crosses the bloom threshold untinted. */
const LABEL_TINT = "#a49d8f";

/** A still frame for reduced motion, and the pose before the shelf is first seen. */
const STILL = 3;

function repoCard(p: ProjectRepo, feed: ProjectFeed): InfoCard {
  const live = feed.byName.get(p.name.toLowerCase());
  const rows: InfoCard["rows"] = [];
  if (live?.language) rows.push({ k: "Language", v: live.language });
  // With its unit: a bare number up to 100 renders as a level bar.
  if (live) rows.push({ k: "Stars", v: `${live.stars.toLocaleString("en")} ${live.stars === 1 ? "star" : "stars"}` });
  return {
    kicker: "open source",
    title: p.name,
    subtitle: `on the shelf as ${p.object}`,
    rows,
    body: live?.description ?? p.about,
    href: `https://github.com/${site.github}/${p.name}`,
    hrefLabel: "view on GitHub",
    note:
      feed.state === "failed"
        ? "GitHub could not be reached, so live figures are left out."
        : "Stars and language from GitHub, refreshed hourly.",
  };
}

function useLabels(names: string[]) {
  const tex = useMemo(() => {
    const [w, h] = LABEL_PX;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h * names.length;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#e8e3d6";
    c.fillRect(0, 0, w, canvas.height);
    c.fillStyle = "#26313d";
    c.font = `600 26px ${MONO}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    names.forEach((n, i) => c.fillText(n, w / 2, i * h + h / 2, w - 16));
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [names]);
  const geometries = useMemo(
    () =>
      names.map((_, i) => {
        const g = new THREE.PlaneGeometry(LABEL_W, LABEL_H);
        const uv = g.getAttribute("uv") as THREE.BufferAttribute;
        const v0 = 1 - (i + 1) / names.length;
        const v1 = 1 - i / names.length;
        for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 : v0);
        return g;
      }),
    [names],
  );
  useEffect(
    () => () => {
      tex.dispose();
      geometries.forEach((g) => g.dispose());
    },
    [tex, geometries],
  );
  return { tex, geometries };
}

/** A repo with no object yet: a plain brass-cornered box, so the gap is honest. */
function PlainBox() {
  return (
    <group>
      <mesh material={M.dark} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={M.brass} position={[s * 0.047, 0.04, 0.047]}>
          <boxGeometry args={[0.008, 0.082, 0.008]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Origin at the bottom centre of the back, against the wall, with local +z out
 * into the room. Nothing in it casts: see Bookshelf.
 */
export function RepoShelf({
  position,
  rotation = [0, 0, 0],
  oak,
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  oak: Surface;
  onOpen: (card: InfoCard) => void;
}) {
  const repos = useMemo(() => projectRepos.slice(0, COLS * ROWS), []);
  const names = useMemo(() => repos.map((p) => p.name), [repos]);
  const feed = useProjectRepos();
  const { tex, geometries } = useLabels(names);

  const ticks = useMemo(() => new Set<Tick>(), []);
  const front = useRef<THREE.Mesh>(null);
  const seen = useSeen(front);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Children register in their own effects, which run before this one.
  useEffect(() => ticks.forEach((f) => f(STILL)), [ticks]);

  useFrame(({ clock }) => {
    if (reduced || !seen) return;
    const t = clock.elapsedTime;
    ticks.forEach((f) => f(t));
  });

  const board = <meshStandardMaterial {...oak} color={OAK.case} roughness={0.55} metalness={0} />;

  return (
    <group position={position} rotation={rotation}>
      {/* carcass: back, sides, top and bottom, dividers and shelves */}
      <mesh position={[0, H / 2, 0.005]} receiveShadow>
        <boxGeometry args={[W, H, 0.01]} />
        <meshStandardMaterial {...oak} color={OAK.back} roughness={0.6} metalness={0} />
      </mesh>
      {Array.from({ length: COLS + 1 }, (_, i) => (
        <mesh key={`v${i}`} position={[-W / 2 + T / 2 + i * (CW + T), H / 2, D / 2]} receiveShadow>
          <boxGeometry args={[T, H, D]} />
          {board}
        </mesh>
      ))}
      {Array.from({ length: ROWS + 1 }, (_, i) => (
        <mesh key={`h${i}`} position={[0, T / 2 + i * (RH + T), D / 2]} receiveShadow>
          <boxGeometry args={[W - 2 * T, T, D]} />
          {board}
        </mesh>
      ))}

      {/* the hidden face the shelf is seen through; pauses the loops when not */}
      <mesh ref={front} position={[0, H / 2, D + 0.002]} visible={false}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial />
      </mesh>

      <TickCtx.Provider value={ticks}>
        {repos.map((p, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const Obj = REPO_OBJECTS[p.name] ?? PlainBox;
          return (
            <Interactive
              key={p.name}
              label={p.name}
              verb="read"
              detail={p.object}
              onActivate={() => onOpen(repoCard(p, feed))}
            >
              {(hovered) => (
                <group position={[colX(c), floorY(r), 0]}>
                  {/* fixed target across the opening: the moving parts never are one */}
                  <mesh position={[0, RH / 2, D - 0.004]} visible={false}>
                    <planeGeometry args={[CW, RH]} />
                    <meshBasicMaterial />
                  </mesh>
                  <group position={[0, 0, D / 2 + 0.01]} userData={MERGE_STATIC}>
                    <Obj />
                  </group>
                  {/* paper label in a brass holder on the board's front edge */}
                  <group position={[0, -T / 2, D]} userData={MERGE_STATIC}>
                    <mesh material={M.brass} position={[0, 0, 0.001]}>
                      <boxGeometry args={[LABEL_W + 0.006, LABEL_H + 0.006, 0.002]} />
                    </mesh>
                    <mesh geometry={geometries[i]} position={[0, 0, 0.0022]}>
                      <meshStandardMaterial map={tex} color={LABEL_TINT} roughness={0.9} />
                    </mesh>
                  </group>
                  <mesh geometry={geometries[i]} position={[0, -T / 2, D + 0.0024]} visible={hovered}>
                    <meshStandardMaterial
                      map={tex}
                      color={LABEL_TINT}
                      roughness={0.9}
                      emissive="#ffd9a6"
                      emissiveIntensity={0.28}
                      polygonOffset
                      polygonOffsetFactor={-1}
                      polygonOffsetUnits={-1}
                    />
                  </mesh>
                </group>
              )}
            </Interactive>
          );
        })}
      </TickCtx.Provider>
    </group>
  );
}
