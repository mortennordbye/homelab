import { cn } from "@/lib/cn";
import { Reveal } from "@/components/primitives/Reveal";
import type { PipelineHop } from "@/content/infrastructure";

/**
 * The paths drawn in ink (remnants 8B): numbered hops off a single rule, no
 * icon chips, no colour — every live thing on this page is inside the
 * instrument's glass. stream: a continuous flow on a solid rule (the request
 * path). steps: discrete events on a dashed one (the deploy path).
 */
export function Pipeline({
  hops,
  variant = "stream",
}: {
  hops: readonly PipelineHop[];
  variant?: "stream" | "steps";
}) {
  const steps = variant === "steps";
  return (
    <div
      className={cn(
        "border-l border-line pl-6 md:border-l-0 md:border-t md:pl-0",
        steps && "border-dashed border-line-2",
      )}
    >
      <div className="flex flex-col gap-8 md:flex-row md:justify-between md:gap-6 md:pt-6">
        {hops.map((hop, i) => (
          <Reveal key={hop.name} delay={i * 0.08} className="min-w-0 md:w-44">
            <p className="font-mono text-[0.65rem] tracking-widest text-fg-3">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-fg">{hop.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-3">{hop.desc}</p>
            {hop.meta && (
              <p className="mt-1.5 truncate font-mono text-[0.68rem] text-fg-3">{hop.meta}</p>
            )}
          </Reveal>
        ))}
      </div>
    </div>
  );
}
