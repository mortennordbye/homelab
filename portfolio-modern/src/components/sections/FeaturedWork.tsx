"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { Tag } from "@/components/primitives/Tag";
import { WorkCardCover } from "@/components/work/WorkCardCover";
import { cn } from "@/lib/cn";
import type { WorkMeta } from "@/lib/work";

type Filter = "all" | "professional" | "homelab";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "professional", label: "Client" },
  { id: "homelab", label: "Homelab" },
];

const INITIAL_LIMIT = 5;

export function FeaturedWork({ items }: { items: WorkMeta[] }) {
  const [filter, setFilter] = useState<Filter>("professional");
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((w) => w.kind === filter)),
    [items, filter],
  );

  const displayed = useMemo(
    () => (expanded ? visible : visible.slice(0, INITIAL_LIMIT)),
    [visible, expanded],
  );

  const hiddenCount = visible.length - INITIAL_LIMIT;

  const onFilterChange = (id: Filter) => {
    setFilter(id);
    setExpanded(false);
  };

  return (
    <section id="portfolio" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading
        title="Portfolio."
        description="Selected case studies from client engagements and the homelab. Each one carries the design rationale, the trade-offs, and what shipped. Filter by client or homelab to scope the list."
      />

      <div
        role="tablist"
        aria-label="Filter portfolio projects"
        className="mt-10 inline-flex items-center gap-1 rounded-full border border-line bg-surface/40 p-1 font-display text-xs"
      >
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "rounded-full px-4 py-1.5 uppercase tracking-[0.18em] transition-colors",
                active
                  ? "bg-accent text-accent-ink"
                  : "text-fg-2 hover:text-fg",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {displayed.map((w, i) => (
          <Reveal key={w.slug} delay={i * 0.08} as="li">
            <article className="flex flex-col gap-5 py-8 md:flex-row md:items-center md:gap-8">
              <span className="font-display text-xs text-fg-3 md:w-8 md:shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>

              <figure className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-md border border-line bg-surface/40 md:aspect-[4/3] md:w-64">
                <WorkCardCover work={w} />
              </figure>

              <div className="flex-1">
                <h3 className="font-display text-h2 text-fg">{w.title}</h3>
                <p className="mt-2 max-w-2xl text-fg-2">{w.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {w.stack.slice(0, 5).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>

              <div className="hidden shrink-0 font-display text-xs text-fg-3 md:block">
                <span>{w.period}</span>
              </div>
            </article>
          </Reveal>
        ))}

        {visible.length === 0 && (
          <li className="py-10 text-center font-display text-sm text-fg-3">
            Nothing here yet. Try another filter.
          </li>
        )}
      </ul>

      {hiddenCount > 0 && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-6 py-3 font-display text-sm text-fg-2 transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_22px_-10px_var(--accent)]"
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp
                  size={16}
                  className="transition-transform group-hover:-translate-y-0.5"
                />
              </>
            ) : (
              <>
                Show {hiddenCount} more
                <ChevronDown
                  size={16}
                  className="transition-transform group-hover:translate-y-0.5"
                />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
