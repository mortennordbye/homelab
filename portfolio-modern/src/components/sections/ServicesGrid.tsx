import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { services } from "@/content/services";

export function ServicesGrid() {
  return (
    <section className="border-t border-line bg-bg-2/40">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          title="Services."
          description="Providing expert IT consulting services to optimize and secure your technological infrastructure."
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={i * 0.1}>
              <Link
                href={`/services/${s.slug}/`}
                className="group relative flex h-full flex-col gap-6 bg-bg p-8 transition-colors hover:bg-surface"
              >
                <p className="font-display text-xs text-fg-3">
                  /0{i + 1}
                </p>

                <h3 className="text-h3 font-display text-fg group-hover:text-accent transition-colors">
                  {s.title}
                </h3>

                <p className="text-sm text-fg-2 flex-1">{s.blurb}</p>

                <span className="inline-flex items-center gap-2 font-display text-sm text-fg-2 group-hover:text-accent transition-colors">
                  Learn more
                  <ArrowUpRight
                    size={14}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </span>

                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-3 font-display text-fg-3/30 group-hover:text-accent/40 transition-colors"
                >
                  +
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 bottom-3 font-display text-fg-3/30 group-hover:text-accent/40 transition-colors"
                >
                  +
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
