"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import { Kbd } from "@/components/primitives/Kbd";
import { cn } from "@/lib/cn";

export function PaletteLauncher({ className, compact = false }: { className?: string; compact?: boolean }) {
  // "Ctrl K" is the default because most visitors are not on a Mac; the mark
  // swaps after mount, where the platform is knowable without a hydration
  // mismatch. The palette itself already listens for both modifiers.
  const [mac, setMac] = useState(false);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMac(true);
  }, []);

  const shortcut = mac ? "⌘ K" : "Ctrl K";

  const onClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("palette:open"));
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        aria-label={`Open command palette (${shortcut})`}
        onClick={onClick}
        className={cn(
          "focus-ring inline-flex items-center justify-center rounded-[2px] border border-line-2 p-2 text-fg-2 transition-colors hover:border-copper hover:text-copper",
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
      aria-label={`Open command palette (${shortcut})`}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center text-fg-3 transition-colors hover:text-fg",
        className,
      )}
    >
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
