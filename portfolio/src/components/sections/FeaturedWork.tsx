import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { Tag } from "@/components/primitives/Tag";
import { WorkCardCover } from "@/components/work/WorkCardCover";
import { WorkShelf } from "@/components/work/WorkShelf";
import type { WorkMeta } from "@/lib/work";

const TAG_LIMIT = 5;

const SHELVES = [
  { kind: "professional", label: "Client engagements" },
  { kind: "homelab", label: "Homelab" },
] as const;

/**
 * The portfolio, as a bookcase.
 *
 * The client/homelab filter is gone: the split is now the two shelves
 * themselves, each with its name on a brass plate, so the shape of the work is
 * visible rather than something you have to operate a control to discover.
 *
 * The list underneath is not the presentation any more, but it is not deleted
 * either. It is what phones and reduced-motion visitors get, since the shelf
 * renders nothing at all for either, and it is the only crawlable set of links
 * to the case studies from this page — a canvas has no anchors in it.
 */
export function FeaturedWork({ items }: { items: WorkMeta[] }) {
  return (
    <Section
      id="portfolio"
      heading="Portfolio."
      description="Selected case studies from client engagements and the homelab. Each one carries the design rationale, the trade-offs, and what shipped. Pull a volume off the shelf to open it."
    >
      <div className="hidden lg:block motion-reduce:lg:hidden">
        <WorkShelf items={items} />
      </div>

      <div className="lg:hidden motion-reduce:lg:block">
        {SHELVES.map(({ kind, label }) => {
          const shelf = items.filter((w) =>
            kind === "homelab" ? w.kind === "homelab" : w.kind !== "homelab",
          );
          if (!shelf.length) return null;
          return (
            <section key={kind} className="mb-14 last:mb-0">
              <h3 className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-accent">
                {label}
              </h3>
              <ul className="divide-y divide-line border-y border-line">
                {shelf.map((w, i) => {
                  const overflow = w.stack.length - TAG_LIMIT;
                  return (
                    <Reveal key={w.slug} delay={i * 0.06} as="li">
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
                          <h4 className="flex items-baseline gap-3 text-h2 text-fg transition-colors group-hover:text-accent">
                            {w.title}
                            <ArrowUpRight
                              size={18}
                              className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                              aria-hidden
                            />
                          </h4>
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
              </ul>
            </section>
          );
        })}
      </div>
    </Section>
  );
}
