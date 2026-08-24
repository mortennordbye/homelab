"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkMeta } from "@/lib/work";
import type { Volume } from "./shelf-art";

const WorkShelfScene = dynamic(() => import("./WorkShelfScene"), { ssr: false });

type Mode = "loading" | "skip" | "static" | "webgl";

const OPEN_MS = 1500; // the open-and-dive runs about this long before the route takes over

/**
 * The portfolio section's object: thirteen case studies as bound volumes on
 * two shelves, client engagements above and homelab below.
 *
 * Follows the same facade rules as the hero globe, because three.js is ~600 KB
 * and this sits below the fold:
 *
 * - Mobile (<= 900px): renders nothing. The list underneath is the whole
 *   experience on a phone, and it is the better one there.
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
    if (window.matchMedia("(max-width: 900px)").matches) return setMode("skip");
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

  const onOpen = useCallback(() => {
    if (!selected || opening) return;
    setOpening(true);
    // The volume opens and the camera dives at the leaf; the route takes over
    // as the paper fills the frame. The writing lives on the case study page,
    // never on the pages of the model.
    window.setTimeout(() => router.push(`/work/${selected}`), OPEN_MS);
  }, [selected, opening, router]);

  const volumes: Volume[] = items.map((w) => ({
    slug: w.slug,
    title: w.title,
    kind: w.kind,
    client: w.client,
    period: w.period,
    arch: w.arch,
  }));

  useEffect(() => {
    if (!selected && volumes.length) {
      const first = volumes.find((v) => v.kind !== "homelab") ?? volumes[0];
      setSelected(first.slug);
    }
  }, [selected, volumes]);

  if (mode === "skip") return null;

  return (
    <div
      ref={hostRef}
      className="relative mb-10 aspect-[16/10] w-full overflow-hidden rounded-md border border-line bg-[#0a0b09]"
    >
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
      <p className="pointer-events-none absolute bottom-3 right-4 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-white/25">
        {mode === "webgl" ? "hover a spine · click to turn · click again to open" : ""}
      </p>
    </div>
  );
}
