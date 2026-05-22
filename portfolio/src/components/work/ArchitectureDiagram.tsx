"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type {
  ArchEdge,
  ArchNode,
  Architecture,
} from "@/content/schemas";

const NODE_HEIGHT = 56;
const NODE_DEFAULT_WIDTH = 150;

type EdgeRoute = {
  d: string;
  length: number;
  labelX: number;
  labelY: number;
};

/**
 * Manhattan (right-angle) routing between two boxes.
 *
 * Picks a Z-shape with the bend running through the empty lane between
 * the two boxes. Endpoints sit on the box border (top/bottom/left/right
 * midpoint) so arrowheads land on the edge, never inside it. For axis-
 * aligned pairs we collapse to a straight line.
 */
function orthogonalRoute(a: ArchNode, b: ArchNode): EdgeRoute {
  const aw = a.width ?? NODE_DEFAULT_WIDTH;
  const bw = b.width ?? NODE_DEFAULT_WIDTH;
  const A = {
    cx: a.x + aw / 2,
    cy: a.y + NODE_HEIGHT / 2,
    left: a.x,
    right: a.x + aw,
    top: a.y,
    bottom: a.y + NODE_HEIGHT,
  };
  const B = {
    cx: b.x + bw / 2,
    cy: b.y + NODE_HEIGHT / 2,
    left: b.x,
    right: b.x + bw,
    top: b.y,
    bottom: b.y + NODE_HEIGHT,
  };
  const dx = B.cx - A.cx;
  const dy = B.cy - A.cy;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const ALIGN = 16;

  // Boxes overlap horizontally and are stacked vertically → straight line.
  if (ay > ALIGN && ax < ALIGN) {
    const sy = dy >= 0 ? A.bottom : A.top;
    const ty = dy >= 0 ? B.top : B.bottom;
    const x = (A.cx + B.cx) / 2;
    const length = Math.abs(ty - sy);
    return {
      d: `M ${x} ${sy} L ${x} ${ty}`,
      length,
      labelX: x,
      labelY: (sy + ty) / 2 - 6,
    };
  }
  // Same-row pair → straight horizontal line.
  if (ax > ALIGN && ay < ALIGN) {
    const sx = dx >= 0 ? A.right : A.left;
    const tx = dx >= 0 ? B.left : B.right;
    const y = (A.cy + B.cy) / 2;
    const length = Math.abs(tx - sx);
    return {
      d: `M ${sx} ${y} L ${tx} ${y}`,
      length,
      labelX: (sx + tx) / 2,
      labelY: y - 6,
    };
  }

  // Diagonal: pick a Z-shape with one orthogonal bend.
  if (ay >= ax) {
    // Vertical-dominant: exit top/bottom, jog horizontally at mid-Y, enter
    // top/bottom of target. The jog sits in the empty gap between rows.
    const sy = dy >= 0 ? A.bottom : A.top;
    const ty = dy >= 0 ? B.top : B.bottom;
    const midY = (sy + ty) / 2;
    const length =
      Math.abs(midY - sy) + Math.abs(B.cx - A.cx) + Math.abs(ty - midY);
    return {
      d: `M ${A.cx} ${sy} V ${midY} H ${B.cx} V ${ty}`,
      length,
      labelX: (A.cx + B.cx) / 2,
      labelY: midY - 6,
    };
  } else {
    // Horizontal-dominant: exit left/right, jog vertically at mid-X.
    const sx = dx >= 0 ? A.right : A.left;
    const tx = dx >= 0 ? B.left : B.right;
    const midX = (sx + tx) / 2;
    const length =
      Math.abs(midX - sx) + Math.abs(B.cy - A.cy) + Math.abs(tx - midX);
    return {
      d: `M ${sx} ${A.cy} H ${midX} V ${B.cy} H ${tx}`,
      length,
      labelX: midX,
      labelY: (A.cy + B.cy) / 2 - 6,
    };
  }
}

type Props = {
  arch: Architecture;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export function ArchitectureDiagram({
  arch,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: Props) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const focusedId = hoveredId ?? selectedId;

  useEffect(() => {
    if (reduce) {
      setHasPlayed(true);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setHasPlayed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const { nodeById, adjacency } = useMemo(() => {
    const map = new Map<string, ArchNode>();
    arch.nodes.forEach((n) => map.set(n.id, n));
    const adj = new Map<string, Set<string>>();
    arch.edges.forEach((e) => {
      if (!adj.has(e.from)) adj.set(e.from, new Set());
      if (!adj.has(e.to)) adj.set(e.to, new Set());
      adj.get(e.from)!.add(e.to);
      adj.get(e.to)!.add(e.from);
    });
    return { nodeById: map, adjacency: adj };
  }, [arch]);

  const isNodeDim = (id: string) => {
    if (!focusedId) return false;
    if (focusedId === id) return false;
    return !adjacency.get(focusedId)?.has(id);
  };

  const isEdgeDim = (e: ArchEdge) => {
    if (!focusedId) return false;
    return e.from !== focusedId && e.to !== focusedId;
  };

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${hasPlayed ? "topology-playing" : ""}`}
    >
      <svg
        viewBox={`0 0 ${arch.viewBox.w} ${arch.viewBox.h}`}
        className="block w-full h-auto"
        role="img"
        aria-label="Architecture diagram"
      >
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--accent)" }} />
          </marker>
        </defs>

        {arch.groups?.map((g) => (
          <g key={g.id}>
            <rect
              x={g.bounds.x}
              y={g.bounds.y}
              width={g.bounds.w}
              height={g.bounds.h}
              rx={14}
              fill="transparent"
              strokeWidth={1}
              strokeDasharray="6 5"
              style={{
                stroke:
                  g.tone === "accent-dashed"
                    ? "var(--accent)"
                    : "var(--line-2)",
                opacity: 0.45,
              }}
            />
            <text
              x={g.bounds.x + 14}
              y={g.bounds.y + 22}
              className="font-display"
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fill: "var(--fg-3)",
              }}
            >
              {g.label}
            </text>
          </g>
        ))}

        {arch.edges.map((e, i) => {
          const a = nodeById.get(e.from);
          const b = nodeById.get(e.to);
          if (!a || !b) return null;
          const route = orthogonalRoute(a, b);
          const style = e.style ?? "solid";
          const isMigration = style === "migration";
          const dasharray =
            style === "supply"
              ? "6 4"
              : style === "telemetry"
                ? "1 5"
                : style === "migration"
                  ? "10 4"
                  : undefined;
          const stroke =
            style === "migration" ? "var(--accent)" : "var(--line-2)";
          return (
            <g
              key={`${e.from}-${e.to}-${i}`}
              className="arch-edge"
              style={
                {
                  opacity: isEdgeDim(e) ? 0.18 : 1,
                  transition: "opacity 240ms ease-out",
                  "--edge-delay": `${i * 60}ms`,
                  "--edge-len": String(route.length),
                } as React.CSSProperties
              }
            >
              <path
                className="topo-edge"
                d={route.d}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={style === "telemetry" ? 1.2 : 1.4}
                strokeDasharray={dasharray}
                markerEnd={isMigration ? "url(#arch-arrow)" : undefined}
                style={{
                  stroke,
                  strokeDashoffset: hasPlayed ? 0 : route.length,
                }}
              />
              {e.label && (
                <text
                  x={route.labelX}
                  y={route.labelY}
                  textAnchor="middle"
                  className="font-display"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fill: "var(--accent)",
                  }}
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {arch.nodes.map((n, i) => (
          <NodeShape
            key={n.id}
            node={n}
            index={i}
            isSelected={selectedId === n.id}
            isHovered={hoveredId === n.id}
            isDim={isNodeDim(n.id)}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
}

function NodeShape({
  node,
  index,
  isSelected,
  isHovered,
  isDim,
  onHover,
  onSelect,
}: {
  node: ArchNode;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  isDim: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const w = node.width ?? NODE_DEFAULT_WIDTH;
  const h = NODE_HEIGHT;
  const hasDetail = !!node.detail;

  const focused = isHovered || isSelected;

  const tone = nodeTone(node.kind);
  const rx = node.kind === "ingress" || node.kind === "external" ? 28 : 8;

  const handleKey = (ev: React.KeyboardEvent) => {
    if (!hasDetail) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onSelect(node.id);
    }
  };

  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <g
        className="arch-node"
        tabIndex={hasDetail ? 0 : -1}
        role={hasDetail ? "button" : undefined}
        aria-label={hasDetail ? `${node.label} — open details` : node.label}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(node.id)}
        onBlur={() => onHover(null)}
        onClick={() => hasDetail && onSelect(node.id)}
        onKeyDown={handleKey}
        style={
          {
            cursor: hasDetail ? "pointer" : "default",
            opacity: isDim ? 0.3 : 1,
            transition: "opacity 240ms ease-out",
            outline: "none",
            "--node-delay": `${300 + index * 60}ms`,
          } as React.CSSProperties
        }
      >
        <rect
          width={w}
          height={h}
          rx={rx}
          style={{
            fill: tone.fill,
            stroke: focused ? "var(--accent)" : tone.stroke,
            strokeWidth: focused ? 2 : 1.25,
            strokeDasharray:
              node.kind === "external" || node.kind === "external-old"
                ? "5 4"
                : undefined,
            filter: focused
              ? `drop-shadow(0 0 14px rgba(var(--accent-rgb), 0.45))`
              : undefined,
            transition: "stroke 200ms ease-out, filter 200ms ease-out",
          }}
        />
        <text
          x={w / 2}
          y={h / 2 - 6}
          textAnchor="middle"
          className="font-display"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fill: "var(--fg-3)",
          }}
        >
          {kindLabel(node.kind)}
        </text>
        <text
          x={w / 2}
          y={h / 2 + 12}
          textAnchor="middle"
          className="font-display"
          style={{
            fontSize: 13,
            fill: tone.label,
          }}
        >
          {node.label}
        </text>
      </g>
    </g>
  );
}

function nodeTone(kind: ArchNode["kind"]) {
  switch (kind) {
    case "ingress":
      return {
        fill: "rgba(var(--accent-rgb), 0.08)",
        stroke: "var(--accent)",
        label: "var(--fg)",
      };
    case "compute":
      return {
        fill: "var(--surface)",
        stroke: "var(--line-2)",
        label: "var(--fg)",
      };
    case "data":
      return {
        fill: "var(--surface)",
        stroke: "var(--line-2)",
        label: "var(--fg)",
      };
    case "registry":
      return {
        fill: "rgba(var(--accent-rgb), 0.05)",
        stroke: "var(--line-2)",
        label: "var(--fg)",
      };
    case "gitops":
      return {
        fill: "rgba(var(--accent-rgb), 0.05)",
        stroke: "var(--line-2)",
        label: "var(--fg)",
      };
    case "observ":
      return {
        fill: "transparent",
        stroke: "var(--line-2)",
        label: "var(--fg-2)",
      };
    case "security":
      return {
        fill: "rgba(var(--accent-rgb), 0.08)",
        stroke: "var(--accent)",
        label: "var(--fg)",
      };
    case "external":
      return {
        fill: "transparent",
        stroke: "var(--fg-3)",
        label: "var(--fg-2)",
      };
    case "external-old":
      return {
        fill: "transparent",
        stroke: "var(--fg-3)",
        label: "var(--fg-3)",
      };
  }
}

function kindLabel(kind: ArchNode["kind"]) {
  switch (kind) {
    case "ingress":
      return "ingress";
    case "compute":
      return "compute";
    case "data":
      return "data";
    case "registry":
      return "registry";
    case "gitops":
      return "gitops";
    case "observ":
      return "observability";
    case "security":
      return "security";
    case "external":
      return "external";
    case "external-old":
      return "legacy";
  }
}
