import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { services } from "@/content/services";

/**
 * The three engagement shapes, as lit sheets — the same sheet About uses
 * (DECISIONS.md §12: everything is an object or a document, a card is
 * neither). Proof links are copper, not green: §2 allows green once per view.
 */
export function ServicesGrid() {
  return (
    <Section
      id="services"
      heading="Services I provide."
      description="Three engagement shapes. Each one is grounded in something that has already shipped, with the case study linked underneath it."
      className="section-rule bg-bg-2/40"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={s.slug} delay={i * 0.08}>
            <article className="lit flex h-full flex-col p-8">
              <span aria-hidden className="lit-rule mb-6 block" />

              <h3 className="text-h3 text-fg">{s.title}</h3>
              <p className="mt-3 flex-1 text-sm text-fg-2 leading-relaxed">{s.blurb}</p>

              {s.proof && (
                <div className="mt-8 border-t border-line pt-5">
                  <p className="eyebrow">Shipped</p>
                  <p className="mt-2 text-sm text-fg-2 leading-snug">{s.proof.label}</p>
                  {s.proof.workSlug && (
                    <Link
                      href={`/work/${s.proof.workSlug}`}
                      className="focus-ring mt-3 inline-block text-xs text-copper underline-offset-4 hover:underline"
                    >
                      Read the case study
                    </Link>
                  )}
                </div>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
