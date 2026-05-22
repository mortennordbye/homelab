import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Stat({
  value,
  label,
  caption,
  accent = false,
  className,
}: {
  value: ReactNode;
  label: string;
  caption?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-line pt-4", className)}>
      <div
        className={cn(
          "text-h2 leading-none tabular-nums",
          accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </div>
      <p className="eyebrow mt-3">{label}</p>
      {caption && <p className="mt-1 text-xs text-fg-3">{caption}</p>}
    </div>
  );
}
