"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore quota / disabled */
    }
  }

  // Render a stable placeholder during SSR/first paint to avoid
  // hydration mismatch — actual icon swaps in after mount.
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-2 bg-surface/40 text-fg-2 transition-colors hover:border-accent hover:text-accent " +
        (className ?? "")
      }
    >
      <span className="sr-only">{label}</span>
      {mounted ? <Icon size={15} /> : <Sun size={15} className="opacity-0" />}
    </button>
  );
}
