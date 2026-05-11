"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

const SESSION_KEY = "portfolio:intro-played";
const ANIM_TOTAL_MS = 1200;

type NodeKind = "cp" | "worker" | "gw";
type Node = { id: string; cx: number; cy: number; r: number; kind: NodeKind };

const NODES: Node[] = [
  { id: "cp-01", cx: 220, cy: 130, r: 9, kind: "cp" },
  { id: "cp-02", cx: 480, cy: 90, r: 9, kind: "cp" },
  { id: "w-01", cx: 140, cy: 340, r: 6, kind: "worker" },
  { id: "w-02", cx: 400, cy: 400, r: 6, kind: "worker" },
  { id: "w-03", cx: 720, cy: 280, r: 6, kind: "worker" },
  { id: "gw", cx: 940, cy: 470, r: 7, kind: "gw" },
];

const EDGES: Array<[string, string]> = [
  ["cp-01", "cp-02"],
  ["cp-01", "w-01"],
  ["cp-01", "w-02"],
  ["cp-02", "w-02"],
  ["cp-02", "w-03"],
  ["w-01", "gw"],
  ["w-02", "gw"],
  ["w-03", "gw"],
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n] as const));

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

export function HeroTopologyGraph() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"pending" | "play" | "skip">("pending");

  useEffect(() => {
    if (reduce) {
      setPhase("skip");
      return;
    }
    let played = false;
    try {
      played = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      played = false;
    }
    setPhase(played ? "skip" : "play");
    if (played) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* storage unavailable — ignore */
      }
    }, ANIM_TOTAL_MS + 100);
    return () => clearTimeout(t);
  }, [reduce]);

  if (phase === "pending") return null;

  const playing = phase === "play";

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${
        playing ? "topology-playing" : "topology-settled"
      }`}
      viewBox="0 0 1100 560"
      preserveAspectRatio="xMidYMid slice"
    >
      <g>
        {EDGES.map(([fromId, toId], i) => {
          const a = byId[fromId];
          const b = byId[toId];
          const len = Math.ceil(dist(a.cx, a.cy, b.cx, b.cy));
          return (
            <line
              key={`${fromId}-${toId}`}
              className="topo-edge"
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              strokeLinecap="round"
              strokeWidth={1}
              style={
                {
                  stroke: "var(--line-2)",
                  strokeDasharray: len,
                  strokeDashoffset: playing ? len : 0,
                  "--edge-delay": `${i * 60}ms`,
                  "--edge-len": String(len),
                } as React.CSSProperties
              }
            />
          );
        })}

        {NODES.map((n, i) => (
          <g key={n.id} transform={`translate(${n.cx} ${n.cy})`}>
            <g
              className="topo-node"
              style={
                {
                  "--node-delay": `${300 + i * 60}ms`,
                } as React.CSSProperties
              }
            >
              {n.kind === "cp" && (
                <>
                  <circle
                    r={n.r}
                    fill="transparent"
                    strokeWidth={1.5}
                    style={{ stroke: "var(--accent)" }}
                  />
                  <circle r={2} style={{ fill: "var(--accent)" }} />
                </>
              )}
              {n.kind === "worker" && (
                <circle
                  r={n.r}
                  strokeWidth={1.25}
                  style={{ fill: "var(--bg)", stroke: "var(--fg-3)" }}
                />
              )}
              {n.kind === "gw" && (
                <>
                  <circle
                    r={n.r + 4}
                    fill="transparent"
                    strokeWidth={1}
                    style={{ stroke: "var(--accent)", opacity: 0.4 }}
                  />
                  <circle r={n.r} style={{ fill: "var(--accent)" }} />
                </>
              )}
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
