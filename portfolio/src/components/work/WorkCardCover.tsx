import type { WorkMeta } from "@/lib/work";
import type { Architecture } from "@/content/schemas";
import { pickBrand } from "@/components/work/brand-icons";
import { logoFor } from "@/components/work/logos";
import { NODE_DEFAULT_WIDTH, NODE_HEIGHT, routeAll, type Rect } from "@/components/work/route";

/** The cover's drawing area, inside room for the kind pill and the slug. */
const VIEW = { w: 400, h: 225 };
const AREA = { x: 22, y: 34, w: 356, h: 160 };
/** Logo size on the cover, in cover pixels whatever the diagram's scale. */
const MARK = 16;

/**
 * The project's own architecture, small: its boxes, groups and routes from the
 * case-study diagram, scaled to fit, with each product's mark in its box. One
 * green point, the most connected box; everything else is line and paper.
 * Server-rendered SVG, so it costs no script.
 */
function Blueprint({ arch }: { arch: Architecture }) {
  const boxes = new Map<string, Rect>();
  arch.nodes.forEach((n) => boxes.set(n.id, { x: n.x, y: n.y, w: n.width ?? NODE_DEFAULT_WIDTH, h: NODE_HEIGHT }));
  const groups = (arch.groups ?? []).map((g) => ({ x: g.bounds.x, y: g.bounds.y, w: g.bounds.w, h: g.bounds.h }));
  const routes = routeAll(boxes, arch.edges, arch.viewBox, [], groups);

  const all = [...boxes.values(), ...groups];
  const x0 = Math.min(...all.map((r) => r.x));
  const y0 = Math.min(...all.map((r) => r.y));
  const x1 = Math.max(...all.map((r) => r.x + r.w));
  const y1 = Math.max(...all.map((r) => r.y + r.h));
  const s = Math.min(AREA.w / (x1 - x0), AREA.h / (y1 - y0));
  const ox = AREA.x + (AREA.w - (x1 - x0) * s) / 2 - x0 * s;
  const oy = AREA.y + (AREA.h - (y1 - y0) * s) / 2 - y0 * s;

  const degree = new Map<string, number>();
  arch.edges.forEach((e) => {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  });
  const focal = [...degree.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mark = MARK / s;

  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${ox} ${oy}) scale(${s})`}>
        {groups.map((g, i) => (
          <rect
            key={i}
            x={g.x}
            y={g.y}
            width={g.w}
            height={g.h}
            rx={14}
            fill="none"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: "var(--line-2)", strokeOpacity: 0.5 }}
          />
        ))}
        {routes.map((r, i) =>
          r ? (
            <path
              key={i}
              d={r.d}
              fill="none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={arch.edges[i].style && arch.edges[i].style !== "solid" ? "3 3" : undefined}
              style={{ stroke: "var(--fg-3)", strokeOpacity: 0.75 }}
            />
          ) : null,
        )}
        {arch.nodes.map((n) => {
          const b = boxes.get(n.id)!;
          const on = n.id === focal;
          const logo = logoFor(n.label);
          const round = n.kind === "ingress" || n.kind === "external";
          return (
            <g key={n.id}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={round ? b.h / 2 : 8}
                strokeWidth={on ? 1.4 : 1}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={n.kind === "external" || n.kind === "external-old" ? "3 3" : undefined}
                style={{
                  fill: on ? "rgba(var(--accent-rgb), 0.12)" : "var(--surface)",
                  stroke: on ? "var(--accent)" : "var(--line-2)",
                }}
              />
              {logo ? (
                <svg x={b.x + b.w / 2 - mark / 2} y={b.y + b.h / 2 - mark / 2} width={mark} height={mark} viewBox="0 0 24 24">
                  <path d={logo.path} style={{ fill: on ? "var(--accent)" : "var(--fg-2)" }} />
                </svg>
              ) : (
                <circle
                  cx={b.x + b.w / 2}
                  cy={b.y + b.h / 2}
                  r={2.2 / s}
                  style={{ fill: on ? "var(--accent)" : "var(--fg-3)" }}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Cover for portfolio cards: the project's own architecture as a small
 * blueprint (see Blueprint). A project with no diagram falls back to the
 * dominant stack tech's icon. Ground stays neutral, never green-on-green.
 */
export function WorkCardCover({ work }: { work: WorkMeta }) {
  const { brand } = pickBrand(work.stack);
  const isHomelab = work.kind === "homelab";
  const Icon = brand.Icon;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--surface) 0%, var(--bg) 72%)",
      }}
    >
      {work.arch ? (
        <Blueprint arch={work.arch} />
      ) : (
        <>
      {/* One ring behind the mark instead of the 24px grid these covers used
          to carry. Same reasoning as the hero: a faint grid is the most
          common generated-UI background there is. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="var(--line-2)" strokeOpacity="0.55" strokeWidth="1">
          <circle cx="200" cy="100" r="66" />
          <circle cx="200" cy="100" r="104" />
        </g>
      </svg>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 45%, rgba(255, 255, 255, 0.035), transparent 65%)",
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Icon
          size={56}
          strokeWidth={1.4}
          style={{ color: "var(--accent)" }}
          aria-hidden
        />
        <span
          className="font-display text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "var(--fg-3)" }}
        >
          {brand.label}
        </span>
      </div>
        </>
      )}

      <span
        className={
          "absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.2em] backdrop-blur-sm " +
          (isHomelab
            ? "border-line-2 bg-bg/40 text-fg-2"
            : "border-accent/40 bg-bg/40 text-accent")
        }
      >
        <span
          className={
            "h-1 w-1 rounded-full " +
            (isHomelab
              ? "bg-fg-2"
              : "bg-accent shadow-[0_0_6px_var(--accent)]")
          }
        />
        {isHomelab ? "homelab" : "client"}
      </span>

      <span className="absolute bottom-2 left-2 font-display text-[9px] uppercase tracking-[0.2em] text-fg-3">
        /{work.slug}
      </span>
    </div>
  );
}
