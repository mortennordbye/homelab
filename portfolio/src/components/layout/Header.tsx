"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/primitives/ThemeToggle";
import { PaletteLauncher } from "@/components/PaletteLauncher";
import { Button } from "@/components/primitives/Button";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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

  // Smooth-scroll for in-page anchors when we're already on the home page.
  const onAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#")) return;
    if (pathname !== "/") return;
    const id = href.slice(2);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
    if (open) setOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-bg/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[var(--container-wide)] items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 text-sm tracking-wide"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_var(--accent)]" />
          <span className="text-fg font-medium">morten</span>
          <span className="text-fg-3">/</span>
          <span className="text-fg-2">nordbye.it</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {site.nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => onAnchorClick(e, item.href)}
                className={cn(
                  "focus-ring text-sm transition-colors hover:text-fg",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <PaletteLauncher className="ml-2" />
          <ThemeToggle />
          <Button href={`mailto:${site.email}`} variant="secondary" size="sm">
            Get in touch
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <PaletteLauncher compact />
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            className="focus-ring rounded-md p-1 text-fg-2 hover:text-fg"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line/80 bg-bg/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-[var(--container-wide)] flex-col gap-1 px-5 py-6">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => onAnchorClick(e, item.href)}
                className="focus-ring rounded-md px-3 py-3 text-base text-fg-2 hover:bg-surface hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
            <Button href={`mailto:${site.email}`} variant="secondary" className="mt-4 justify-between">
              Get in touch <span aria-hidden>→</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
