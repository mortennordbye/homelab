"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Derived state: close menu when pathname changes. Setting state during
  // render is fine because it stabilises on the next render.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-bg/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-sm tracking-wide"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_var(--accent)]" />
          <span className="text-fg">morten</span>
          <span className="text-fg-3">/</span>
          <span className="text-fg-2">nordbye.it</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {site.nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-display text-sm tracking-wide transition-colors hover:text-fg",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle className="ml-1" />
          <a
            href={`mailto:${site.email}`}
            className="ml-1 inline-flex items-center gap-2 rounded-full border border-line-2 px-4 py-2 font-display text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Get in touch
            <span aria-hidden>→</span>
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            className="text-fg-2 hover:text-fg"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line/80 bg-bg/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-6">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-3 font-display text-base text-fg-2 hover:bg-surface hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-flex items-center justify-between rounded-md border border-line-2 px-4 py-3 font-display text-fg"
            >
              Get in touch <span aria-hidden>→</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
