import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}
      className={cn(
        "inline-flex items-center justify-center rounded border border-line-2 bg-bg-2/80 px-1.5 py-0.5 text-[11px] text-fg-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
