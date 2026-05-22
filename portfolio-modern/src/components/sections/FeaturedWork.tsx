"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Tag } from "@/components/primitives/Tag";
import { Button } from "@/components/primitives/Button";
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
const TAG_LIMIT = 5;

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
    <Section
      id="portfolio"
      eyebrow="portfolio"
      heading="Selected work."
      description="Case studies from client engagements and the homelab. Each one carries the design rationale, the trade-offs, and what shipped."
      align="between"
      cta={
        <div
          role="tablist"
          aria-label="Filter portfolio projects"
          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface/40 p-1 font-mono text-xs"
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
                  "focus-ring rounded-sm px-3 py-1.5 uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "bg-accent text-accent-ink"
                    : "text-fg-3 hover:text-fg",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      }
    >
      <ul className="divide-y divide-line border-y border-line">
        {displayed.map((w, i) => {
          const overflow = w.stack.length - TAG_LIMIT;
          return (
            <Reveal key={w.slug} delay={i * 0.08} as="li">
              <Link
                href={`/work/${w.slug}`}
                className="focus-ring group flex flex-col gap-5 py-8 md:flex-row md:items-center md:gap-8"
              >
                <span className="font-mono text-xs text-fg-3 md:w-8 md:shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <figure className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-md border border-line bg-surface/40 md:aspect-[4/3] md:w-64">
                  <WorkCardCover work={w} />
                </figure>

                <div className="flex-1">
                  <h3 className="flex items-baseline gap-3 text-h2 text-fg transition-colors group-hover:text-accent">
                    {w.title}
                    <ArrowUpRight
                      size={18}
                      className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </h3>
                  <p className="mt-2 max-w-2xl text-fg-2">{w.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {w.stack.slice(0, TAG_LIMIT).map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                    {overflow > 0 && (
                      <Tag variant="muted" aria-label={`${overflow} more technologies`}>
                        +{overflow}
                      </Tag>
                    )}
                  </div>
                </div>

                <div className="hidden shrink-0 font-mono text-xs text-fg-3 md:block">
                  <span>{w.period}</span>
                </div>
              </Link>
            </Reveal>
          );
        })}

        {visible.length === 0 && (
          <li className="py-10 text-center font-mono text-sm text-fg-3">
            Nothing here yet. Try another filter.
          </li>
        )}
      </ul>

      {hiddenCount > 0 && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            iconRight={
              expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />
            }
          >
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </Button>
        </div>
      )}
    </Section>
  );
}
