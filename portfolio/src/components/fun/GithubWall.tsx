"use client";

import { Html, RoundedBox } from "@react-three/drei";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import type { InfoCard } from "./Hud";
import { Interactive } from "./interaction";

/**
 * The pinned GitHub repositories as a cork board — "pinned" is literally what
 * they are, and the room keeps screens scarce. Everything but the names comes
 * live from `/api/v1/github`; the names live in `content/repos.ts`.
 */

const PX_W = 1180;
const PX_H = 620;
const BOARD_W = 2.2;
const BOARD_H = (BOARD_W * PX_H) / PX_W;
const S = BOARD_W / PX_W;

const PAD = 40;
const HEADER = 74;
const GAP = 26;
const COLS = 2;
const CELL_W = (PX_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CELL_H = (PX_H - PAD * 2 - HEADER - GAP) / 2;

const cellPx = (i: number) => ({
  x: PAD + (i % COLS) * (CELL_W + GAP) + CELL_W / 2,
  y: PAD + HEADER + Math.floor(i / COLS) * (CELL_H + GAP) + CELL_H / 2,
});

/** Fixed per-slot tilt and pin colour, for the reason the blog board documents:
 *  random dressing reshuffles on every render and makes a room feel unreliable. */
const TILT = [-0.8, 0.6, 0.5, -0.7];
const PIN = ["#d0574c", "#3f8fd0", "#e0a23a", "#4faf7c"];

/** GitHub's own language colours, for the four languages actually in use. */
const LANG_COLOUR: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Shell: "#89e051",
  HCL: "#844fba",
};

export type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
};

function useRepos(): Repo[] {
  const [repos, setRepos] = useState<Repo[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/github")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { repos?: Repo[] }) => {
        if (!cancelled) setRepos((j.repos ?? []).slice(0, 4));
      })
      .catch(() => {
        // An empty board is the correct failure: the room does not invent
        // projects it could not fetch.
        if (!cancelled) setRepos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return repos;
}

function repoCard(r: Repo): InfoCard {
  return {
    kicker: "github",
    title: r.name,
    subtitle: `github.com/${site.github}/${r.name}`,
    rows: [
      ...(r.language ? [{ k: "Language", v: r.language }] : []),
      { k: "Stars", v: String(r.stars) },
      { k: "Forks", v: String(r.forks) },
    ],
    body: r.description ?? undefined,
    href: r.url,
    hrefLabel: "open on GitHub",
  };
}

/** Star and fork glyphs, drawn as SVG for the reason the social marks are:
 *  an icon built from geometry is unreadable at any sensible distance. */
function Star() {
  return (
    <svg width="19" height="19" viewBox="0 0 16 16" fill="#6b7681" aria-hidden>
      <path d="M8 .25l2.4 4.87 5.37.78-3.89 3.79.92 5.35L8 12.52l-4.8 2.52.92-5.35L.23 5.9l5.37-.78z" />
    </svg>
  );
}

function Fork() {
  return (
    <svg width="19" height="19" viewBox="0 0 16 16" fill="#6b7681" aria-hidden>
      <path d="M5 3.25a1.75 1.75 0 10-2.5 1.58v1.42A2.75 2.75 0 005.25 9h1.5v2.17a1.75 1.75 0 101.5 0V9h1.5A2.75 2.75 0 0012.5 6.25V4.83a1.75 1.75 0 10-1.5 0v1.42c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25V4.83A1.75 1.75 0 005 3.25z" />
    </svg>
  );
}

export function GithubWall({
  position,
  rotation = [0, 0, 0],
  onOpen,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onOpen: (card: InfoCard) => void;
}) {
  const repos = useRepos();

  return (
    <group position={position} rotation={rotation}>
      {/* dark timber frame */}
      <RoundedBox
        position={[0, 0, -0.014]}
        args={[BOARD_W + 0.07, BOARD_H + 0.07, 0.036]}
        radius={0.006}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#54402c" roughness={0.72} />
      </RoundedBox>
      {/* cork, rough enough to catch the lamplight as texture rather than paint */}
      <mesh position={[0, 0, 0.004]} receiveShadow>
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshStandardMaterial color="#b08a5c" roughness={0.95} metalness={0} />
      </mesh>

      <Html
        transform
        occlude="blending"
        distanceFactor={(BOARD_W / PX_W) * 400}
        position={[0, 0, 0.008]}
        zIndexRange={[10, 0]}
        style={{
          width: `${PX_W}px`,
          height: `${PX_H}px`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {/* The cork is painted in the DOM, not left to the mesh. This wall is
            the furthest from either lamp, and an unlit plane behind a
            transparent layer renders near-black — the whiteboard opposite
            taught this the hard way. */}
        <div
          className="relative h-full w-full"
          style={{
            padding: `${PAD}px`,
            background:
              "radial-gradient(circle at 30% 20%, #c39a68 0%, #b2885a 45%, #9d7449 100%)",
            boxShadow: "inset 0 0 70px rgba(60,40,20,0.35)",
          }}
        >
          <div
            className="flex items-baseline justify-between"
            style={{ height: `${HEADER}px`, color: "#3b2a18" }}
          >
            <span
              className="font-mono"
              style={{ fontSize: "31px", letterSpacing: "0.2em", fontWeight: 600 }}
            >
              PINNED
            </span>
            <span className="font-mono" style={{ fontSize: "20px", opacity: 0.7 }}>
              github.com/{site.github}
            </span>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
              gap: `${GAP}px`,
            }}
          >
            {repos.map((r, i) => (
              <div
                key={r.name}
                style={{
                  width: `${CELL_W}px`,
                  height: `${CELL_H}px`,
                  transform: `rotate(${TILT[i % TILT.length]}deg)`,
                  background: "#fdfcfa",
                  boxShadow: "0 8px 18px rgba(40,26,12,0.32)",
                  padding: "22px 24px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* the pin holding it on */}
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    marginLeft: "-10px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: PIN[i % PIN.length],
                    boxShadow: "0 3px 5px rgba(0,0,0,0.35)",
                  }}
                />
                <div
                  className="font-mono"
                  style={{ fontSize: "27px", fontWeight: 700, color: "#1f6feb" }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "20px",
                    lineHeight: 1.35,
                    color: "#3d4650",
                    flex: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.description ?? "No description."}
                </div>
                <div
                  className="flex items-center font-mono"
                  style={{ gap: "20px", fontSize: "19px", color: "#6b7681" }}
                >
                  {r.language && (
                    <span className="flex items-center" style={{ gap: "7px" }}>
                      <span
                        style={{
                          width: "13px",
                          height: "13px",
                          borderRadius: "50%",
                          background: LANG_COLOUR[r.language] ?? "#8b949e",
                        }}
                      />
                      {r.language}
                    </span>
                  )}
                  <span className="flex items-center" style={{ gap: "6px" }}>
                    <Star />
                    {r.stars}
                  </span>
                  {r.forks > 0 && (
                    <span className="flex items-center" style={{ gap: "6px" }}>
                      <Fork />
                      {r.forks}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {repos.length === 0 && (
            <p
              className="font-mono"
              style={{ fontSize: "22px", color: "#4a3520", paddingTop: "40px" }}
            >
              GitHub is not answering just now
            </p>
          )}
        </div>
      </Html>

      {/* One pick target per card, positioned off the same grid the cards use. */}
      {repos.map((r, i) => {
        const c = cellPx(i);
        return (
          <Interactive
            key={r.name}
            label={r.name}
            verb="open"
            detail={r.description ?? `github.com/${site.github}/${r.name}`}
            onActivate={() => onOpen(repoCard(r))}
          >
            {(hovered) => (
              <group
                position={[(c.x - PX_W / 2) * S, (PX_H / 2 - c.y) * S, 0.009]}
              >
                <mesh visible={false}>
                  <planeGeometry args={[CELL_W * S, CELL_H * S]} />
                  <meshBasicMaterial />
                </mesh>
                <mesh position={[0, 0, -0.003]} visible={hovered}>
                  <planeGeometry args={[CELL_W * S + 0.022, CELL_H * S + 0.022]} />
                  <meshBasicMaterial color="#ffd9a6" />
                </mesh>
              </group>
            )}
          </Interactive>
        );
      })}
    </group>
  );
}
