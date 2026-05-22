import { ArrowRight, Clock, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { site } from "@/content/site";

export function CtaContact() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-line"
      style={{ paddingTop: "var(--space-section-y)", paddingBottom: "var(--space-section-y)" }}
    >
      <div className="mx-auto grid max-w-[var(--container-wide)] gap-12 px-6 md:grid-cols-12 md:gap-8 md:px-8">
        <div className="md:col-span-7">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Available · Oslo &amp; remote
          </p>
          <h2 className="mt-6 text-display-lg text-fg leading-[1]">
            Let&apos;s build something solid.
          </h2>
          <p className="mt-6 max-w-xl text-fg-2">
            Open to senior cloud engineering and architecture work — public
            sector, regulated industries, or platform builds where
            production-grade matters more than the demo. I read everything that
            lands in the inbox and reply within a couple of working days.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              href={`mailto:${site.email}`}
              variant="primary"
              size="lg"
              iconRight={<ArrowRight size={16} aria-hidden />}
            >
              {site.email}
            </Button>
            <Button
              href={`https://www.linkedin.com/in/${site.linkedin}`}
              variant="secondary"
              size="lg"
              iconLeft={<ExternalLink size={16} aria-hidden />}
            >
              Reach out on LinkedIn
            </Button>
          </div>
        </div>

        <aside className="md:col-span-5">
          <dl className="divide-y divide-line border-y border-line">
            <Row icon={<MapPin size={14} aria-hidden />} label="Based in" value={`${site.location} · CET / CEST`} />
            <Row icon={<Clock size={14} aria-hidden />} label="Response time" value="Within 2 working days" />
            <Row icon={<ExternalLink size={14} aria-hidden />} label="Engagement" value="Available via Orange Business or directly" />
          </dl>
        </aside>
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 py-5">
      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-line-2 text-accent">
        {icon}
      </span>
      <div>
        <dt className="eyebrow">{label}</dt>
        <dd className="mt-1 text-fg">{value}</dd>
      </div>
    </div>
  );
}
