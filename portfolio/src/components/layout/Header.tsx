"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { PaletteLauncher } from "@/components/PaletteLauncher";

// Contact is promoted to a button on the right, so it is not also a link in the
// inline list. Computed once at module scope: the scroll-spy effect depends on
// this array and re-running it every render would re-bind the listener.
const NAV = site.nav.filter((item) => item.href !== site.headerCta.href);

// The home page sections the hash entries point at, in document order.
const SPY_IDS = NAV.filter((i) => i.href.startsWith("/#")).map((i) => i.href.slice(2));

// A section counts as current once its top passes under the header.
const SPY_OFFSET = 140;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // One listener drives both the sticky treatment and the scroll spy. Without
  // the spy the hash entries could never read as active: `pathname` is "/" and
  // never "/#about", so comparing the two always failed.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      if (pathname !== "/") {
        setSection(null);
        return;
      }
      let current: string | null = null;
      for (const id of SPY_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) current = id;
      }
      setSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const activeHref = useMemo(() => {
    const route = NAV.find(
      (i) => !i.href.startsWith("/#") && (pathname === i.href || pathname?.startsWith(i.href + "/")),
    );
    if (route) return route.href;
    if (pathname === "/" && section) return `/#${section}`;
    return null;
  }, [pathname, section]);

  // Sliding accent underline. Measured from the live DOM rather than assumed,
  // so it survives font swap and container width changes.
  const linkRefs = useRef(new Map<string, HTMLAnchorElement | null>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const target = hovered ?? activeHref;
    const el = target ? linkRefs.current.get(target) : null;
    if (!el) {
      setIndicator((prev) => ({ ...prev, width: 0 }));
      return;
    }
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [hovered, activeHref]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

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
        "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-line/80 bg-bg/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto grid max-w-[var(--container-wide)] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 md:px-8">
        {/* The wordmark is the only UI-sized use of the display face — `.font-display`
            is mapped to the body face, so the display face is set here and inherited. */}
        <Link
          href="/"
          aria-label="Home"
          style={{ fontFamily: "var(--font-display-face), ui-serif, Georgia, serif" }}
          className="focus-ring group flex items-center gap-2.5"
        >
          <span className="grid size-8 place-items-center rounded-lg border border-line-2 bg-surface text-[15px] leading-none text-accent transition-colors group-hover:border-accent/60">
            N
          </span>
          <span className="hidden sm:block">
            <span className="block text-[15px] leading-tight tracking-tight text-fg">
              Morten V. Nordbye
            </span>
            <span className="block font-mono text-[9.5px] tracking-[0.2em] text-fg-3 uppercase">
              {site.role}
            </span>
          </span>
        </Link>

        <nav className="relative hidden justify-self-center lg:flex lg:items-center lg:gap-7">
          {NAV.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => {
                  linkRefs.current.set(item.href, el);
                }}
                aria-current={active ? "page" : undefined}
                onClick={(e) => onAnchorClick(e, item.href)}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item.href)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "focus-ring py-1.5 text-[13.5px] font-medium transition-colors hover:text-fg",
                  active ? "text-fg" : "text-fg-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-accent transition-[left,width] duration-300 ease-[var(--ease-out)]"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </nav>

        <div className="col-start-3 flex items-center justify-end gap-3">
          {/* The hero already says "available" on the home page, so the header
              only takes it over once the hero has scrolled away. */}
          <span
            className={cn(
              "hidden items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-fg-3 transition-opacity duration-300 xl:flex",
              scrolled || pathname !== "/" ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            AVAILABLE
          </span>
          <Link
            href={site.headerCta.href}
            onClick={(e) => onAnchorClick(e, site.headerCta.href)}
            className="focus-ring hidden rounded-lg border border-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-ink sm:inline-flex"
          >
            {site.headerCta.label}
          </Link>
          {/* Wrapped rather than toggled with a display utility: PaletteLauncher
              sets its own `inline-flex`, which wins over a `hidden` passed in. */}
          <span className="hidden lg:block">
            <PaletteLauncher />
          </span>
          <span className="lg:hidden">
            <PaletteLauncher compact />
          </span>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="focus-ring rounded-md p-1 text-fg-2 hover:text-fg lg:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line/80 bg-bg/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-[var(--container-wide)] flex-col gap-1 px-5 py-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                onClick={(e) => onAnchorClick(e, item.href)}
                className={cn(
                  "focus-ring rounded-md px-3 py-3 text-base hover:bg-surface hover:text-fg",
                  activeHref === item.href ? "text-accent" : "text-fg-2",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={site.headerCta.href}
              onClick={(e) => onAnchorClick(e, site.headerCta.href)}
              className="focus-ring mt-2 rounded-lg border border-accent px-3 py-3 text-center text-base font-semibold text-accent hover:bg-accent hover:text-accent-ink"
            >
              {site.headerCta.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
