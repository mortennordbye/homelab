import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/primitives/Reveal";
import { services } from "@/content/services";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Engagement shapes from ${site.firstName} ${site.lastName} — Kubernetes & containerization, GitOps & Ansible, technical consulting in Oslo and remote.`,
  alternates: { canonical: "/services/" },
  openGraph: {
    title: `Services — ${site.firstName} ${site.lastName}`,
    description: `Cloud Engineer & Architect services in Oslo. Kubernetes, GitOps, Ansible, technical consulting.`,
    url: `${site.url}/services/`,
    type: "website",
  },
};

export default function ServicesIndex() {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-36 pb-24 md:px-8 md:pt-48">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-fg-3">
        services
      </p>
      <h1 className="mt-6 max-w-3xl text-display-lg font-display text-fg leading-[1]">
        Three ways we can{" "}
        <span className="gradient-text">work together.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-fg-2">
        Most engagements look like one of these three. Each is shaped to your team,
        your stack, and your timeline — not packaged as a one-size-fits-all offer.
      </p>

      <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={s.slug} delay={i * 0.08}>
            <Link
              href={`/services/${s.slug}/`}
              className="group relative flex h-full flex-col gap-6 bg-bg p-10 hover:bg-surface transition-colors"
            >
              <p className="font-display text-xs text-fg-3">/0{i + 1}</p>
              <h2 className="text-h2 font-display text-fg group-hover:text-accent transition-colors">
                {s.title}
              </h2>
              <p className="text-fg-2 flex-1">{s.blurb}</p>
              <span className="inline-flex items-center gap-2 font-display text-sm text-fg-2 group-hover:text-accent transition-colors">
                Read more
                <ArrowUpRight
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
              <span aria-hidden className="pointer-events-none absolute right-3 top-3 text-fg-3/30 group-hover:text-accent/50 transition-colors">+</span>
              <span aria-hidden className="pointer-events-none absolute left-3 bottom-3 text-fg-3/30 group-hover:text-accent/50 transition-colors">+</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
