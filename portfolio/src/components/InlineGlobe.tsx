"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  SPACE_LABELS,
  SPACE_LOGOS,
  ndcToPercent,
  viewportFraction,
} from "./InlineGlobeDecor";

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
  // The Oslo marker lives in this overlay — a sibling of the dimmed canvas
  // wrapper, so the wrapper's opacity doesn't apply. The scene's
  // OsloProjector mutates `transform` on this element each frame.
  const osloOverlayRef = useRef<HTMLDivElement>(null);

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
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    // three.js + textures + 19 SVG-to-texture uploads cost ~3s of main-thread
    // time on mount. Defer until the browser is idle (or 2s after page load,
    // whichever comes first) so the cost lands after TTI rather than during
    // TBT measurement.
    const arm = () => {
      if (cancelled) return;
      const trigger = () => {
        if (cancelled) return;
        setInView(true);
      };
      const ric = (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (typeof ric === "function") {
        idleHandle = ric(trigger, { timeout: 2500 });
      } else {
        timeoutHandle = setTimeout(trigger, 1500);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          arm();
          io.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      const cic = (window as Window & {
        cancelIdleCallback?: (handle: number) => void;
      }).cancelIdleCallback;
      if (idleHandle != null && typeof cic === "function") cic(idleHandle);
      if (timeoutHandle != null) clearTimeout(timeoutHandle);
    };
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
    <>
      <div
        ref={ref}
        aria-hidden
        // Opacity tuned so the globe reads clearly without competing with the
        // headline text or the portrait card. Adjust here if you want it
        // bolder or quieter. The Oslo overlay below is outside this wrapper
        // so the dimming doesn't apply to the pulse marker.
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45]"
      >
        {inView && <InlineGlobeScene overlayRef={osloOverlayRef} />}
      </div>
      <SpaceDecor />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden"
      >
        <div
          ref={osloOverlayRef}
          className="oslo-marker absolute left-0 top-0"
          style={{ opacity: 0, willChange: "transform" }}
        >
          <span className="oslo-marker-label">OSLO</span>
        </div>
      </div>
    </>
  );
}

// Logos + monospace easter-egg labels rendered as HTML rather than three.js
// sprites/text meshes. This replaces 19 fetch+canvas+texture-upload trips
// (each logo was an SVG → Image → Canvas → THREE.CanvasTexture pipeline) and
// drops the troika-three-text dependency that drei's <Text> pulled in.
// Sizes match the original 3D layout via viewportFraction(worldSize, z),
// which mirrors three.js's perspective projection for the same fov/camera.
function SpaceDecor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.setProperty("--decor-h", `${el.clientHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[6] overflow-hidden font-mono"
    >
      {SPACE_LOGOS.map((logo) => {
        const pos = ndcToPercent(logo.ndc);
        const factor = viewportFraction(logo.scale, logo.z);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={logo.slug}
            src={`/icons/${logo.slug}.svg`}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              height: `calc(var(--decor-h, 800px) * ${factor})`,
              width: `calc(var(--decor-h, 800px) * ${factor})`,
              transform: "translate(-50%, -50%)",
              opacity: 0.9,
            }}
          />
        );
      })}
      {SPACE_LABELS.map((label) => {
        const pos = ndcToPercent(label.ndc);
        const factor = viewportFraction(label.size, label.z);
        return (
          <span
            key={label.text}
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              transform: "translate(-50%, -50%)",
              fontSize: `calc(var(--decor-h, 800px) * ${factor})`,
              color: label.color ?? "#9ec9ff",
              opacity: 0.85,
              textShadow: "0 0 4px rgba(0,0,0,0.7)",
              whiteSpace: "nowrap",
              letterSpacing: "0.02em",
            }}
          >
            {label.text}
          </span>
        );
      })}
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
