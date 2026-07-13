"use client";

import { Search } from "lucide-react";
import { Kbd } from "@/components/primitives/Kbd";
import { cn } from "@/lib/cn";

export function PaletteLauncher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const onClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("palette:open"));
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        aria-label="Open command palette (⌘K)"
        onClick={onClick}
        className={cn(
          "focus-ring inline-flex items-center justify-center rounded-md border border-line-2 bg-surface/50 p-2 text-fg-2 transition-colors hover:border-accent/60 hover:text-accent",
          className,
        )}
      >
        <Search size={16} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Open command palette (⌘K)"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center gap-1 text-fg-3 transition-colors hover:text-fg",
        className,
      )}
    >
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </button>
  );
}
