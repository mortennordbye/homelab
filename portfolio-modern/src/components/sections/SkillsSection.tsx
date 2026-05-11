import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { skills } from "@/content/skills";
import type { Skill } from "@/content/schemas";

const groups: { id: Skill["group"]; label: string }[] = [
  { id: "platform", label: "Platform & infrastructure" },
  { id: "delivery", label: "Delivery & automation" },
  { id: "ops", label: "Operations" },
  { id: "soft", label: "Leadership" },
];

export function SkillsSection() {
  return (
    <section id="skills" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          eyebrow="skills"
          title="The stack."
          description="What I reach for first, grouped by where it lives in the platform. No self-rated bars — the résumé and work samples carry the proof."
        />

        <div className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {groups.map((g, gi) => {
            const items = skills.filter((s) => s.group === g.id);
            if (!items.length) return null;
            return (
              <Reveal key={g.id} delay={gi * 0.05}>
                <h3 className="font-display text-[12px] uppercase tracking-[0.18em] text-fg-3">
                  {g.label}
                </h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {items.map((s) => (
                    <li
                      key={s.label}
                      className="rounded-full border border-line bg-surface/40 px-3 py-1 font-display text-xs text-fg-2 transition-colors hover:border-line-2 hover:text-fg"
                    >
                      {s.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
