import { Dumbbell, Wifi } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { Reveal } from "@/components/primitives/Reveal";
import { interests, type Interest } from "@/content/interests";

const iconFor: Record<Interest["icon"], React.ReactNode> = {
  fitness: <Dumbbell size={20} />,
  homelab: <Wifi size={20} />,
};

export function InterestsSection() {
  return (
    <section id="interests" className="scroll-mt-24 border-t border-line bg-bg-2/40">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-8 md:py-36">
        <SectionHeading
          eyebrow="interests"
          title="What I do off the clock."
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {interests.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.08}>
              <div className="flex h-full flex-col gap-4 bg-bg p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line-2 bg-surface/40 text-accent">
                  {iconFor[it.icon]}
                </span>
                <h3 className="font-display text-h3 text-fg">{it.title}</h3>
                <p className="text-sm text-fg-2 leading-relaxed">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
