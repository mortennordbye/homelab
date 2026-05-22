import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { Stat } from "@/components/primitives/Stat";
import { Button } from "@/components/primitives/Button";
import { skills } from "@/content/skills";
import type { Skill } from "@/content/schemas";

const skillGroups: { id: Skill["group"]; label: string }[] = [
  { id: "platform", label: "Platform & infrastructure" },
  { id: "delivery", label: "Delivery & automation" },
  { id: "ops", label: "Operations" },
  { id: "soft", label: "Leadership" },
];

export function AboutSection() {
  return (
    <Section
      id="about"
      eyebrow="about"
      heading="From the operations centre to platform engineering."
      description="How I got here, what I work with, and what I build after hours."
      className="border-t border-line"
      cta={
        <Button href="/about" variant="ghost" size="sm" iconRight={<ArrowUpRight size={16} aria-hidden />}>
          Full story
        </Button>
      }
      align="between"
    >
      <div className="grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 md:col-span-7">
          <p className="text-fg-2 leading-relaxed">
            Skilled ICT Service Operator by trade. Started on the front line in
            an Operations Centre, monitoring alarms and running incidents across
            customer environments, then moved into platform and cloud engineering
            as the workloads followed. Scripting led to automation, automation
            led to infrastructure as code, and the work shifted from reacting to
            alerts to building the platforms that produce them.
          </p>
          <p className="mt-4 text-fg-2 leading-relaxed">
            Today I work as a Cloud Engineer at Orange Business, on Azure
            platforms for customers across a range of regulated sectors. On the
            side I run a homelab cluster that doubles as my proving ground for
            anything I want to try before it touches production.
          </p>
        </div>

        <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-x-8 gap-y-6">
          <Stat value="4+" label="Years in production cloud" accent />
          <Stat value="5" label="Active certifications" caption="incl. CKA, AZ-305" />
          <Stat value="33M+" label="Req / day peak" caption="Betting platform on AKS" />
          <Stat value="6" label="Node Talos cluster" caption="Homelab, prod-grade" />
        </div>
      </div>

      <div className="mt-20">
        <p className="eyebrow">the stack</p>
        <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g, gi) => {
            const items = skills.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <Reveal key={g.id} delay={gi * 0.05}>
                <h3 className="border-l-2 border-accent pl-3 eyebrow !text-fg-2">
                  {g.label}
                </h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {items.map((s) => (
                    <li
                      key={s.label}
                      className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/60 px-4 py-1.5 text-sm text-fg transition-all hover:border-accent/60 hover:bg-surface"
                    >
                      <span className="h-1 w-1 rounded-full bg-accent/70 transition-all group-hover:bg-accent group-hover:shadow-[0_0_8px_var(--accent)]" />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
