import Link from "next/link";
import { ArrowUpRight, Boxes, GitBranch, Activity } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { services } from "@/content/services";
import type { Service } from "@/content/schemas";
import { cn } from "@/lib/cn";

const iconBySlug: Record<string, React.ReactNode> = {
  "kubernetes-and-containerization": <Boxes size={22} />,
  "gitops-and-ansible": <GitBranch size={22} />,
  "technical-consulting": <Activity size={22} />,
};

const accentClasses: Record<NonNullable<Service["accent"]>, { icon: string; ring: string; line: string }> = {
  arctic: { icon: "text-accent", ring: "hover:border-accent/60", line: "bg-accent" },
  copper: { icon: "text-copper", ring: "hover:border-copper/60", line: "bg-copper" },
  teal: { icon: "text-accent-3", ring: "hover:border-accent-3/60", line: "bg-accent-3" },
};

export function ServicesGrid() {
  return (
    <Section
      id="services"
      eyebrow="services"
      heading="Where I plug in."
      description="Three engagement shapes. Each one is grounded in something that has already shipped — case studies linked from each card."
      className="border-t border-line bg-bg-2/40"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {services.map((s, i) => {
          const accent = accentClasses[s.accent ?? "arctic"];
          return (
            <Reveal key={s.slug} delay={i * 0.08}>
              <article
                className={cn(
                  "group relative flex h-full flex-col rounded-xl border border-line bg-bg p-7 transition-colors",
                  accent.ring,
                )}
              >
                <span className={cn("absolute left-0 top-7 h-8 w-[3px] rounded-r-full", accent.line)} />

                <div className="flex items-center justify-between">
                  <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-md border border-line-2 bg-surface/60", accent.icon)}>
                    {iconBySlug[s.slug]}
                  </span>
                  <span className="font-mono text-xs text-fg-3">/0{i + 1}</span>
                </div>

                <h3 className="mt-6 text-h3 text-fg">{s.title}</h3>
                <p className="mt-3 text-sm text-fg-2 flex-1">{s.blurb}</p>

                {s.proof && (
                  <div className="mt-6 rounded-md border border-line/70 bg-bg-2/60 p-4">
                    <p className="eyebrow">Shipped</p>
                    <p className="mt-2 text-sm text-fg-2 leading-snug">{s.proof.label}</p>
                    {s.proof.workSlug && (
                      <Link
                        href={`/work/${s.proof.workSlug}`}
                        className={cn("focus-ring mt-3 inline-flex items-center gap-1 text-xs", accent.icon)}
                      >
                        Read the case study
                        <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
