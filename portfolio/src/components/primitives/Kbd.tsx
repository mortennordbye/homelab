import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        // Square and unfilled so it reads engraved rather than clickable candy.
        "inline-flex items-center justify-center rounded-[2px] border border-line-2 px-1.5 py-0.5 font-mono text-[10.5px] text-fg-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
