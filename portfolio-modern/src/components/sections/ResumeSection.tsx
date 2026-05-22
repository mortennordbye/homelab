import { Award, ArrowUpRight } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Button } from "@/components/primitives/Button";
import { Tag } from "@/components/primitives/Tag";
import { certs, experience } from "@/content/resume";

export function ResumeSection() {
  const recent = experience.slice(0, 3);
  const shortCerts = certs.slice(0, 4);

  return (
    <Section
      id="resume"
      eyebrow="resume"
      heading="Track record."
      description="Recent roles and active certifications. Open the full CV for the long-form record and the printable PDF."
      className="border-t border-line bg-bg-2/40"
      cta={
        <Button href="/resume" variant="secondary" iconRight={<ArrowUpRight size={16} aria-hidden />}>
          Open full CV
        </Button>
      }
      align="between"
    >
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="eyebrow flex items-center gap-2">
            <Award size={12} className="text-accent" aria-hidden /> Certifications
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {shortCerts.map((c) => (
              <Tag key={c.title} variant={c.title.startsWith("CKA") ? "accent" : "default"}>
                {c.title.replace(/^Microsoft Certified:\s*/, "").replace(/^CKA:\s*/, "CKA — ")}
              </Tag>
            ))}
            {certs.length > shortCerts.length && (
              <Tag variant="muted">+{certs.length - shortCerts.length} more</Tag>
            )}
          </div>
        </div>

        <div className="md:col-span-5">
          <p className="eyebrow">Recent roles</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recent.map((e, i) => (
              <li key={`${e.company}-${i}`} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-fg">{e.role}</p>
                  <p className="mt-0.5 font-mono text-xs text-fg-3">
                    <span className="text-accent">{e.company}</span>
                    {e.location && <> · {e.location}</>}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-fg-3">
                  {e.period}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
