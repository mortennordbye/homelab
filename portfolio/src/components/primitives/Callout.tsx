import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warn" | "result";

const tones: Record<Tone, { ring: string; ink: string; label: string }> = {
  info: { ring: "border-accent/40 bg-accent/[0.06]", ink: "text-accent", label: "Note" },
  success: { ring: "border-success/40 bg-success/[0.06]", ink: "text-success", label: "Outcome" },
  warn: { ring: "border-warn/40 bg-warn/[0.06]", ink: "text-warn", label: "Watch" },
  // A filled wood block rather than a tinted one, so Result reads as a
  // different material from Watch rather than a different shade of it.
  result: { ring: "border-brass bg-wood", ink: "text-fg", label: "Result" },
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <aside
      className={cn(
        "rounded-lg border px-5 py-4 my-6",
        t.ring,
        className,
      )}
    >
      <p className={cn("eyebrow", t.ink)}>{title ?? t.label}</p>
      <div className="mt-2 text-fg-2">{children}</div>
    </aside>
  );
}
