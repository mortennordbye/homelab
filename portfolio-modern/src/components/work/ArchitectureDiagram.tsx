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
          const aw = a.width ?? NODE_DEFAULT_WIDTH;
          const bw = b.width ?? NODE_DEFAULT_WIDTH;
          const cx1 = a.x + aw / 2;
          const cy1 = a.y + NODE_HEIGHT / 2;
          const cx2 = b.x + bw / 2;
          const cy2 = b.y + NODE_HEIGHT / 2;
          const len = Math.ceil(Math.hypot(cx2 - cx1, cy2 - cy1));
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
                  "--edge-len": String(len),
                } as React.CSSProperties
              }
            >
              <line
                className="topo-edge"
                x1={cx1}
                y1={cy1}
                x2={cx2}
                y2={cy2}
                strokeLinecap="round"
                strokeWidth={style === "telemetry" ? 1.2 : 1.4}
                strokeDasharray={dasharray}
                markerEnd={isMigration ? "url(#arch-arrow)" : undefined}
                style={{
                  stroke,
                  strokeDashoffset: hasPlayed ? 0 : len,
                }}
              />
              {e.label && (
                <text
                  x={(cx1 + cx2) / 2}
                  y={(cy1 + cy2) / 2 - 6}
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
