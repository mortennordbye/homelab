import { Award, Download, ExternalLink, GraduationCap } from "lucide-react";
import { Reveal } from "@/components/primitives/Reveal";
import { certs, education, experience } from "@/content/resume";

/**
 * The two-column resume body (Certifications + Education on the left,
 * Professional Experience on the right). Reused by both the standalone
 * /resume route and the resume section on the home page.
 */
export function ResumeBody() {
  return (
    <div className="grid grid-cols-12 gap-12">
      {/* Left column — Certifications + Education */}
      <aside className="col-span-12 md:col-span-5 space-y-16">
        <SectionBlock
          title="Licenses & Certifications"
          icon={<Award size={14} />}
        >
          <ol className="space-y-7 border-l border-line pl-6">
            {certs.map((c, i) => (
              <Reveal key={c.title} as="li" delay={i * 0.04} className="relative">
                <TimelineDot tone={i === 0 ? "accent" : "muted"} />
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-fg-3">
                  Issued {c.date}
                </p>
                <h3 className="mt-2 font-display text-fg leading-snug">
                  {c.title}
                </h3>
                <p className="mt-1 text-sm text-fg-2">{c.issuer}</p>
                {c.credentialId && (
                  <p className="mt-2 font-mono text-xs text-fg-3 break-all">
                    <span className="text-fg-3/60">credential&nbsp;</span>
                    {c.credentialId}
                  </p>
                )}
                {c.href && (
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 font-display text-xs text-accent hover:underline"
                  >
                    <Download size={11} /> view certificate
                  </a>
                )}
              </Reveal>
            ))}
          </ol>
        </SectionBlock>

        <SectionBlock
          title="Education"
          icon={<GraduationCap size={14} />}
        >
          <ol className="space-y-7 border-l border-line pl-6">
            {education.map((e, i) => (
              <Reveal key={e.title} as="li" delay={i * 0.04} className="relative">
                <TimelineDot tone="muted" />
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-fg-3">
                  {e.period}
                </p>
                <h3 className="mt-2 font-display text-fg leading-snug">
                  {e.title}
                </h3>
                <p className="mt-1 text-sm text-fg-2">{e.institution}</p>
                {e.detail && (
                  <p className="mt-2 text-sm text-fg-2 leading-relaxed">
                    {e.detail}
                  </p>
                )}
              </Reveal>
            ))}
          </ol>
        </SectionBlock>
      </aside>

      {/* Right column — Experience */}
      <section className="col-span-12 md:col-span-7">
        <SectionBlock
          title="Professional Experience"
          icon={<ExternalLink size={14} />}
        >
          <ol className="space-y-12 border-l border-line pl-6 md:space-y-14">
            {experience.map((e, i) => {
              const lines = Array.isArray(e.description)
                ? e.description
                : [e.description];
              return (
                <Reveal
                  key={`${e.company}-${i}`}
                  as="li"
                  delay={i * 0.04}
                  className="relative"
                >
                  <TimelineDot
                    tone={e.current ? "accent" : "muted"}
                    pulse={e.current}
                  />
                  <p className="font-display text-[11px] uppercase tracking-[0.18em] text-fg-3">
                    {e.period}
                  </p>
                  <h3 className="mt-2 text-h3 font-display text-fg leading-tight">
                    {e.role}
                  </h3>
                  <p className="mt-1 font-display text-sm">
                    <span className="text-accent">{e.company}</span>
                    {e.location && (
                      <>
                        <span className="mx-2 text-fg-3">·</span>
                        <span className="text-fg-3">{e.location}</span>
                      </>
                    )}
                  </p>
                  <div className="mt-4 space-y-3 text-fg-2 leading-relaxed">
                    {lines.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </SectionBlock>
      </section>
    </div>
  );
}

function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-line pb-4 font-display text-xs uppercase tracking-[0.2em] text-fg-3">
        <span className="text-fg-2">{icon}</span>
        {title}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function TimelineDot({
  tone,
  pulse,
}: {
  tone: "accent" | "muted";
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={
        "absolute -left-[33px] mt-1 inline-flex h-2.5 w-2.5 rounded-full border " +
        (tone === "accent"
          ? "bg-accent border-accent " +
            (pulse ? "shadow-[0_0_12px_var(--accent)]" : "")
          : "bg-bg border-line-2")
      }
    />
  );
}
