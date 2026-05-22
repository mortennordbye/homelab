"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const InlineGlobeScene = dynamic(() => import("./InlineGlobeScene"), {
  ssr: false,
});

type Mode = "loading" | "skip" | "static" | "webgl";

/**
 * Wrapper component for the Hero background globe.
 *
 * - Mobile (<= 768px): renders nothing. three.js is ~600 KB; not worth shipping
 *   for an ambient background that's barely visible on a phone.
 * - Reduced motion: renders a static SVG placeholder. No WebGL.
 * - Desktop, full motion: dynamic-imports the WebGL scene, but only after the
 *   element scrolls into view (IntersectionObserver gate). On `/` that's
 *   immediate; on deep links like `/work/[slug]/` the Hero isn't rendered, so
 *   three.js never loads there.
 *
 * The Hero already has aurora/grain/grid layers that fill the space, so an
 * empty background slot on first paint is fine — the globe lazy-loads in.
 */
export function InlineGlobe() {
  const [mode, setMode] = useState<Mode>("loading");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isNarrow = window.matchMedia("(max-width: 768px)").matches;
    if (isNarrow) {
      setMode("skip");
      return;
    }
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(isReduced ? "static" : "webgl");
  }, []);

  useEffect(() => {
    if (mode !== "webgl") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  if (mode === "loading" || mode === "skip") return null;

  if (mode === "static") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
      >
        <StaticGlobe />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden
      // Opacity tuned so the globe reads clearly without competing with the
      // headline text or the portrait card. Adjust here if you want it bolder
      // or quieter.
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45]"
    >
      {inView && <InlineGlobeScene />}
    </div>
  );
}

/**
 * Reduced-motion / no-WebGL fallback. Ported from the old WelcomeIntro
 * overlay so we keep visual identity even without three.js.
 */
function StaticGlobe() {
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="absolute inset-0 mx-auto my-auto h-full w-full max-w-[640px]"
      aria-hidden
    >
      <defs>
        <radialGradient id="inline-rim" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#5db7ff" stopOpacity="0" />
          <stop offset="100%" stopColor="#5db7ff" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="120" fill="none" stroke="#5db7ff" strokeOpacity="0.35" strokeWidth="0.8" />
      <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke="#5db7ff" strokeOpacity="0.25" strokeWidth="0.6" />
      <ellipse cx="0" cy="0" rx="40" ry="120" fill="none" stroke="#5db7ff" strokeOpacity="0.2" strokeWidth="0.6" />
      <circle cx="0" cy="0" r="140" fill="url(#inline-rim)" />
      <g transform="translate(-20,-65)">
        <circle r="4" fill="#5db7ff" />
        <circle r="14" fill="#5db7ff" fillOpacity="0.12" />
        <circle r="22" fill="none" stroke="#5db7ff" strokeOpacity="0.4" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
