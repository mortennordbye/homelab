"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/reduced-motion";
import { brandOf } from "./brand-icons";
import { logoFor } from "./logos";
import { NODE_DEFAULT_WIDTH, NODE_HEIGHT, routeAll, type Rect } from "./route";
import type {
  ArchEdge,
  ArchNode,
  Architecture,
} from "@/content/schemas";


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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must land after hydration, or React keeps the server-rendered class and dash offsets
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

  /* Routed once per diagram, around every box: see route.ts. */
  const routes = useMemo(() => {
    const boxes = new Map<string, Rect>();
    arch.nodes.forEach((n) =>
      boxes.set(n.id, { x: n.x, y: n.y, w: n.width ?? NODE_DEFAULT_WIDTH, h: NODE_HEIGHT }),
    );
    // Group titles, measured like the eyebrow (11px caps at 0.18em), so no
    // line or edge label lands on one.
    const titles = (arch.groups ?? []).map((g) => ({
      x: g.bounds.x + 10,
      y: g.bounds.y + 8,
      w: g.label.length * 9.2 + 8,
      h: 18,
    }));
    const borders = (arch.groups ?? []).map((g) => ({ x: g.bounds.x, y: g.bounds.y, w: g.bounds.w, h: g.bounds.h }));
    return routeAll(boxes, arch.edges, arch.viewBox, titles, borders);
  }, [arch]);

  const { adjacency } = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    arch.edges.forEach((e) => {
      if (!adj.has(e.from)) adj.set(e.from, new Set());
      if (!adj.has(e.to)) adj.set(e.to, new Set());
      adj.get(e.from)!.add(e.to);
      adj.get(e.to)!.add(e.from);
    });
    return { adjacency: adj };
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
          const route = routes[i];
          if (!route) return null;
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
                  x={route.label.x}
                  y={route.label.y}
                  textAnchor={route.label.anchor}
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

  /* The product's own mark where we carry one, else the generic icon for its
     category, else none. One tone, the label's: the palette allows one green
     point, so brand colours stay out. Text centres on what the icon leaves. */
  const ICON = 18;
  const iconX = rx > 20 ? 20 : 14;
  /* Widths estimated from the two faces (the eyebrow is 10px caps at 0.18em,
     the label 13px serif), so narrow boxes can give something up rather than
     overlap: first the eyebrow, then the icon. */
  const room = w - (iconX + ICON + 6) - 8;
  const kindFits = kindLabel(node.kind).length * 8.6 <= room;
  const labelFits = node.label.length * 6.6 <= room;
  const logo = labelFits ? logoFor(node.label) : null;
  const Generic = labelFits && !logo ? brandOf(node.label)?.Icon : undefined;
  const hasIcon = !!logo || !!Generic;
  const showKind = !hasIcon || kindFits;
  const textX = hasIcon ? (iconX + ICON + 6 + w - 8) / 2 : w / 2;

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
        {logo && (
          <svg x={iconX} y={(h - ICON) / 2} width={ICON} height={ICON} viewBox="0 0 24 24" aria-hidden>
            <path d={logo.path} style={{ fill: tone.label, opacity: 0.85 }} />
          </svg>
        )}
        {Generic && (
          <Generic
            x={iconX}
            y={(h - ICON) / 2}
            width={ICON}
            height={ICON}
            strokeWidth={1.75}
            aria-hidden
            style={{ color: tone.label, opacity: 0.85 }}
          />
        )}
        {showKind && (
        <text
          x={textX}
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
        )}
        <text
          x={textX}
          y={showKind ? h / 2 + 12 : h / 2 + 4}
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
