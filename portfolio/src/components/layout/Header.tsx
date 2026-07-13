"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { PaletteLauncher } from "@/components/PaletteLauncher";

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
      <div className="mx-auto flex max-w-[var(--container-wide)] items-center px-5 py-4 md:px-8">
        <nav className="hidden flex-1 items-baseline gap-2.5 font-mono text-[13px] md:flex">
          <Link
            href="/"
            aria-label="Home"
            className="focus-ring text-fg-3 transition-colors hover:text-fg"
          >
            ~
          </Link>
          {site.nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Fragment key={item.href}>
                <span aria-hidden className="text-line-2">
                  /
                </span>
                <Link
                  href={item.href}
                  onClick={(e) => onAnchorClick(e, item.href)}
                  className={cn(
                    "focus-ring lowercase transition-colors hover:text-fg",
                    active ? "text-accent" : "text-fg-2",
                  )}
                >
                  {item.label}
                </Link>
              </Fragment>
            );
          })}
          <PaletteLauncher className="ml-auto" />
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <PaletteLauncher compact />
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
          </nav>
        </div>
      )}
    </header>
  );
}
