import { PortraitCard } from "@/components/PortraitCard";
import { Reveal } from "@/components/primitives/Reveal";
import { Section } from "@/components/primitives/Section";
import { CareerPath } from "@/components/sections/CareerPath";
import { skills } from "@/content/skills";
import { interests } from "@/content/interests";
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
      heading="About me."
      className="section-rule"
    >
      <div className="grid gap-8 md:grid-cols-[300px_1fr] md:items-start md:gap-12">
        <PortraitCard />
        <div className="flex flex-col gap-6">
          <p className="text-fg-2 leading-relaxed">
            Skilled ICT Service Operator by trade. Started on the front line in
            an Operations Centre, monitoring alarms and running incidents
            across customer environments, then moved into platform and cloud
            engineering as the workloads followed. Scripting led to automation,
            automation led to infrastructure as code, and the work shifted from
            reacting to alerts to building the platforms that produce them.
          </p>
          <p className="text-fg-2 leading-relaxed">
            Today I work as a Cloud Engineer at Orange Business, on Azure
            platforms for customers across a range of regulated sectors. On the
            side I run a homelab cluster that doubles as my proving ground for
            anything I want to try before it touches production.
          </p>
        </div>
      </div>

      <div className="mt-20">
        <p><span className="section-label">the stack</span></p>
        <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g, gi) => {
            const items = skills.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <Reveal key={g.id} delay={gi * 0.05}>
                <h3 className="border-l-2 border-brass pl-3 eyebrow !text-fg-2">
                  {g.label}
                </h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {items.map((s) => (
                    <li
                      key={s.label}
                      className="group inline-flex items-center gap-2 rounded-[2px] border border-brass/55 px-4 py-1.5 text-sm text-fg transition-colors hover:border-copper"
                    >
                      <span className="h-1 w-1 rounded-full bg-brass transition-colors group-hover:bg-copper" />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>

      <div className="mt-24">
        <p><span className="section-label">career</span></p>
        <h3 className="mt-3 text-h2 text-fg">The route here.</h3>
        <div className="mt-10">
          <CareerPath />
        </div>
      </div>

      <div className="mt-24">
        <p><span className="section-label">off the clock</span></p>
        <h3 className="mt-3 text-h2 text-fg">Outside work.</h3>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {interests.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <div className="lit flex h-full flex-col p-8">
                <span aria-hidden className="lit-rule mb-6 block" />
                <h4 className="text-h3 text-fg">{it.title}</h4>
                <p className="mt-3 text-sm text-fg-2 leading-relaxed">{it.body}</p>
                {it.activities && (
                  // The same brass chip the stack uses further up, rather than a
                  // new device: the four are a list of things, and the page has
                  // already taught what a list of things looks like.
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {it.activities.map((a) => (
                      <li
                        key={a}
                        className="group inline-flex items-center gap-2 rounded-[2px] border border-brass/55 px-4 py-1.5 text-sm text-fg transition-colors hover:border-copper"
                      >
                        <span className="h-1 w-1 rounded-full bg-brass transition-colors group-hover:bg-copper" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
