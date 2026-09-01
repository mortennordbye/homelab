import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { WorkCardCover } from "@/components/work/WorkCardCover";
import { WorkShelf } from "@/components/work/WorkShelf";
import type { WorkMeta } from "@/lib/work";

// The measurement line carries this many stack entries; a spec line, not
// chips, so the rest is simply not printed rather than counted.
const STACK_LIMIT = 4;

const SHELVES = [
  { kind: "professional", label: "Client engagements" },
  { kind: "homelab", label: "Homelab" },
] as const;

/**
 * The portfolio, as a bookcase; the client/homelab split is the two shelves.
 * The list underneath must stay: it is what phones and reduced-motion
 * visitors get, and the only crawlable links to the case studies from this
 * page — a canvas has no anchors in it.
 */
export function FeaturedWork({ items }: { items: WorkMeta[] }) {
  return (
    <Section
      id="portfolio"
      heading="Portfolio."
      description="Selected case studies from client engagements and the homelab. Each one carries the design rationale, the trade-offs, and what shipped. Pull a volume off the shelf to open it."
      bleed={
        <div className="hidden lg:block motion-reduce:lg:hidden">
          <WorkShelf items={items} />
        </div>
      }
    >
      <div className="lg:hidden motion-reduce:lg:block">
        {SHELVES.map(({ kind, label }) => {
          const shelf = items.filter((w) =>
            kind === "homelab" ? w.kind === "homelab" : w.kind !== "homelab",
          );
          if (!shelf.length) return null;
          return (
            <section key={kind} className="mb-14 last:mb-0">
              <h3 className="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-fg-3">
                {label}
              </h3>
              <ul className="divide-y divide-line border-y border-line">
                {shelf.map((w, i) => {
                  return (
                    <Reveal key={w.slug} delay={i * 0.06} as="li">
                      <Link
                        href={`/work/${w.slug}`}
                        className="focus-ring group flex flex-col gap-5 py-8 md:flex-row md:items-center md:gap-8"
                      >
                        <span className="font-mono text-xs text-fg-3 md:w-8 md:shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        {/* The cover as a mounted print, like the blog covers:
                            paper border, contact shadow, no bounding card. */}
                        <figure className="print relative w-full shrink-0 md:w-64">
                          <div className="relative aspect-[16/9] overflow-hidden">
                            <WorkCardCover work={w} />
                          </div>
                        </figure>

                        <div className="flex-1">
                          <h4 className="text-h2 text-fg transition-colors group-hover:text-copper">
                            {w.title}
                          </h4>
                          <p className="mt-2 max-w-2xl text-fg-2">{w.summary}</p>
                          <p className="mt-3 font-mono text-xs text-fg-3">
                            {[w.period, ...w.stack.slice(0, STACK_LIMIT)].join(" · ")}
                          </p>
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
