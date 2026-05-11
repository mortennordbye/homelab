"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { Tag } from "@/components/primitives/Tag";
import { cn } from "@/lib/cn";
import type { WorkMeta } from "@/lib/work";

type Filter = "all" | "professional" | "homelab";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "professional", label: "Client" },
  { id: "homelab", label: "Homelab" },
];

export function FeaturedWork({ items }: { items: WorkMeta[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((w) => w.kind === filter)),
    [items, filter],
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
      <SectionHeading
        eyebrow="portfolio"
        title="Portfolio."
        description="Welcome to my portfolio. This collection showcases a diverse array of projects encompassing both my professional work and my personal homelabbing endeavors. Each project highlights my skills and dedication to IT, with detailed examples of my proficiency in various technologies and solutions."
        align="between"
        cta={
          <Link
            href="/work"
            className="group inline-flex items-center gap-2 font-display text-sm text-fg-2 hover:text-fg"
          >
            All case studies
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        }
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
              onClick={() => setFilter(f.id)}
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
        {visible.map((w, i) => (
          <Reveal key={w.slug} delay={i * 0.08} as="li">
            <Link
              href={`/work/${w.slug}/`}
              className="group flex flex-col gap-5 py-8 transition-colors md:flex-row md:items-center md:gap-8"
            >
              <span className="font-display text-xs text-fg-3 md:w-8 md:shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>

              <figure className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-line bg-surface/40 md:aspect-[4/3] md:w-48">
                <Image
                  src={w.cover}
                  alt={`${w.title} — cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, 192px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </figure>

              <div className="flex-1">
                <h3 className="text-h2 font-display text-fg transition-colors group-hover:text-accent">
                  {w.title}
                </h3>
                <p className="mt-2 max-w-2xl text-fg-2">{w.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {w.stack.slice(0, 5).map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-2 font-display text-xs text-fg-3 md:flex">
                <span>{w.period}</span>
                <span className="text-accent">
                  {w.kind === "professional" ? "client" : "homelab"}
                </span>
              </div>

              <span
                aria-hidden
                className="hidden shrink-0 transition-all md:flex md:items-center md:justify-center md:rounded-full md:border md:border-line-2 md:bg-surface/40 md:p-3 md:text-fg-2 md:group-hover:border-accent md:group-hover:text-accent md:group-hover:translate-x-1"
              >
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </Reveal>
        ))}

        {visible.length === 0 && (
          <li className="py-10 text-center font-display text-sm text-fg-3">
            Nothing here yet — try another filter.
          </li>
        )}
      </ul>
    </section>
  );
}
