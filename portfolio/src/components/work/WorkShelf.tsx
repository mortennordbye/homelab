"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkMeta } from "@/lib/work";
import type { Volume } from "./shelf-art";

const WorkShelfScene = dynamic(() => import("./WorkShelfScene"), { ssr: false });

type Mode = "loading" | "skip" | "static" | "webgl";

/* Push the route part-way through the dive rather than after it. The App
   Router keeps this page mounted until the new one is ready, so the animation
   covers the fetch instead of running before it starts — and the visitor never
   sits on a finished dive waiting for a network round trip. */
const PUSH_MS = 500;
/* If the route is slow anyway, hand over to the page's own background rather
   than leaving a blank sheet of paper filling the frame. */
const VEIL_DELAY_MS = 430;
const VEIL_MS = 560;
const STUCK_MS = 8000;

/**
 * The portfolio section's object: thirteen case studies as bound volumes on
 * two shelves, client engagements above and homelab below.
 *
 * Follows the same facade rules as the hero globe, because three.js is ~600 KB
 * and this sits below the fold:
 *
 * - Below lg (<= 1023px): renders nothing, and FeaturedWork shows the list
 *   instead. The same breakpoint decides both, in CSS and here.
 * - Reduced motion: renders nothing. The animation is the point of this
 *   object; a still of it earns nothing the list does not already give.
 * - Desktop, full motion: waits for the section to be near the viewport AND
 *   for a real user input before loading the scene, so three.js stays out of
 *   the initial measurement window entirely.
 */
export function WorkShelf({ items }: { items: WorkMeta[] }) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [near, setNear] = useState(false);
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return setMode("skip");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setMode("skip");
    setMode("static");
  }, []);

  // Near the viewport is necessary but not sufficient: a real input has to
  // happen too, so headless runs never pull the scene in.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || mode !== "static") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // Listen from the moment the facade mounts rather than waiting for `near`.
  // Gating the listener on visibility loses the upgrade entirely when the
  // pointer happens to be still by the time the section scrolls into view.
  useEffect(() => {
    if (mode !== "static" || touched) return;
    const up = () => setTouched(true);
    const evs = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, up, { once: true, passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, up));
  }, [mode, touched]);

  useEffect(() => {
    if (mode === "static" && near && touched) setMode("webgl");
  }, [mode, near, touched]);

  useEffect(() => {
    if (!selected) return;
    const first = items.find((w) => w.slug === selected);
    if (first) router.prefetch(`/work/${first.slug}`);
  }, [selected, items, router]);

  // Takes the slug explicitly so a double-click can open a volume in the same
  // gesture that selects it, without waiting a render for `selected` to catch up.
  const onOpen = useCallback(
    (slug?: string) => {
      const target = slug ?? selected;
      if (!target || opening) return;
      setOpening(true);
      router.prefetch(`/work/${target}`);
      window.setTimeout(() => router.push(`/work/${target}`), PUSH_MS);
      // Never leave the control reading "Opening…" for ever if the push is lost.
      window.setTimeout(() => setOpening(false), STUCK_MS);
    },
    [selected, opening, router],
  );

  // Must be memoised. A fresh array here changes identity on every render, and
  // the scene keys its whole build off it: every click would otherwise re-stamp
  // and re-map all thirteen volumes before it could animate.
  const volumes: Volume[] = useMemo(
    () =>
      items.map((w) => ({
        slug: w.slug,
        title: w.title,
        kind: w.kind,
        client: w.client,
        period: w.period,
        arch: w.arch,
      })),
    [items],
  );

  useEffect(() => {
    if (!selected && volumes.length) {
      const first = volumes.find((v) => v.kind !== "homelab") ?? volumes[0];
      setSelected(first.slug);
    }
  }, [selected, volumes]);

  if (mode === "skip") return null;

  const current = selected ? items.find((w) => w.slug === selected) : undefined;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-[#0a0b09]">
      <div ref={hostRef} className="relative aspect-[4/3] w-full overflow-hidden">
        {mode === "webgl" ? (
          <WorkShelfScene
            volumes={volumes}
            selected={selected}
            onSelect={setSelected}
            onOpen={onOpen}
            opening={opening}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_12%,#241a12_0%,#0d0b09_62%,#080907_100%)]"
          />
        )}
        {/* The veil the dive lands on. Without it the camera finishes inside a
            blank leaf and the visitor stares at a sheet of paper until the
            route resolves. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[#0a0b09]"
          style={{
            opacity: opening ? 1 : 0,
            transition: `opacity ${VEIL_MS}ms ease ${opening ? VEIL_DELAY_MS : 0}ms`,
          }}
        />
        <p className="pointer-events-none absolute bottom-3 right-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-white/25">
          {mode === "webgl" && !opening ? "click a spine to pick it · double-click to open" : ""}
        </p>
      </div>

      {/* The panel is what the shelf cannot say. A canvas has no text in it for
          a screen reader and no keyboard path into a volume, so the title, the
          summary and the way in all live out here in real markup. Below the
          shelf and running across it, so the shelf itself gets the full width. */}
      <div className="border-t border-line bg-gradient-to-r from-[#14110c] to-[#100e0a] px-7 py-6 md:px-9 md:py-7">
        {current ? (
          <div className="grid gap-x-10 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto] md:items-start">
            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.19em] text-accent">
                {current.kind === "homelab" ? "Homelab" : "Client engagement"}
              </p>
              <h3 className="text-h2 leading-tight text-fg">{current.title}</h3>
              <p className="mt-2 font-mono text-[0.62rem] leading-relaxed tracking-[0.1em] text-fg-3">
                {[current.client, current.period].filter(Boolean).join("   ·   ")}
              </p>
            </div>

            <div>
              <p className="text-sm leading-relaxed text-fg-2">{current.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {current.stack.slice(0, 7).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line px-2.5 py-1 font-mono text-[0.6rem] text-fg-2"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={`/work/${current.slug}`}
              onClick={(e) => {
                // Let the volume open first; the route is pushed when the
                // camera reaches the page. Keyboard and middle-click still get
                // a plain link, which is why this is an anchor and not a button.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onOpen(current.slug);
              }}
              className="focus-ring shrink-0 self-center whitespace-nowrap rounded-sm border border-accent/40 px-4 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/10"
            >
              {opening ? "Opening…" : "Open the volume"}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-fg-3">Pick a volume from the shelf.</p>
        )}
      </div>
    </div>
  );
}
