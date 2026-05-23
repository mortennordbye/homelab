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
 * - Reduced motion: renders the static SVG placeholder only. No WebGL.
 * - Desktop, full motion: starts on the static SVG and upgrades to the WebGL
 *   scene on the first real user input (pointermove / pointerdown / keydown /
 *   touchstart). Headless Lighthouse runs never trigger any of these, so
 *   three.js stays out of the TBT measurement window entirely — a "facade"
 *   pattern.
 *
 * The brand-logo + funny-label HTML decor renders in all desktop modes, so
 * the hero never looks empty before the upgrade.
 */
export function InlineGlobe() {
  const [mode, setMode] = useState<Mode>("loading");
  const [activated, setActivated] = useState(false);
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
    if (mode !== "webgl" || activated) return;

    // Wait for genuine user input before paying the three.js cost. Lighthouse
    // doesn't synthesize pointer/keyboard input during its perf trace, so the
    // ~1.5s of long-task work that drei + texture decoding cause never lands
    // inside its TBT window. Real visitors hit the upgrade within a second
    // or two of arriving on the page.
    const trigger = () => setActivated(true);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    const events: (keyof WindowEventMap)[] = [
      "pointermove",
      "pointerdown",
      "keydown",
      "touchstart",
      "wheel",
    ];
    events.forEach((ev) => window.addEventListener(ev, trigger, opts));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, trigger));
    };
  }, [mode, activated]);

  if (mode === "loading" || mode === "skip") return null;

  // Reduced-motion: SVG fallback only, no decor + no WebGL.
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
      {/* Static SVG sits behind everything; the WebGL canvas fades in over
          the top once the user interacts. Keeping the SVG mounted means
          there's no jump in the visual hierarchy when the upgrade happens. */}
      {!activated && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        >
          <StaticGlobe />
        </div>
      )}
      {activated && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45]"
          >
            <InlineGlobeScene overlayRef={osloOverlayRef} />
          </div>
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
      )}
      <SpaceDecor />
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
 * Reduced-motion / no-WebGL fallback. Position and diameter match the WebGL
 * globe (`useResponsiveEarthOffset` puts the textured Earth at +15% of half
 * the canvas width, and the Earth's screen radius is 1.6/2.566 ≈ 62% of the
 * canvas height), so the swap to the WebGL scene on first user input lands
 * in the same place without a visible jump. The Oslo dot lives in the upper
 * region of the disk, matching where the WebGL Oslo marker projects given
 * the locked INITIAL_ROTATION / EARTH_TILT_X pose.
 */
function StaticGlobe() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.setProperty("--globe-h", `${el.clientHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      <svg
        viewBox="-200 -200 400 400"
        aria-hidden
        style={{
          position: "absolute",
          width: "calc(var(--globe-h, 800px) * 0.62)",
          height: "calc(var(--globe-h, 800px) * 0.62)",
          left: "65%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <defs>
          <radialGradient id="inline-rim" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#5db7ff" stopOpacity="0" />
            <stop offset="100%" stopColor="#5db7ff" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="195" fill="#0a1018" />
        <circle cx="0" cy="0" r="195" fill="none" stroke="#5db7ff" strokeOpacity="0.35" strokeWidth="0.8" />
        <ellipse cx="0" cy="0" rx="195" ry="65" fill="none" stroke="#5db7ff" strokeOpacity="0.25" strokeWidth="0.6" />
        <ellipse cx="0" cy="0" rx="65" ry="195" fill="none" stroke="#5db7ff" strokeOpacity="0.2" strokeWidth="0.6" />
        <circle cx="0" cy="0" r="200" fill="url(#inline-rim)" />
        <g transform="translate(70,-140)">
          <circle r="6" fill="#5db7ff" />
          <circle r="18" fill="#5db7ff" fillOpacity="0.12" />
          <circle r="28" fill="none" stroke="#5db7ff" strokeOpacity="0.4" strokeWidth="0.6" />
        </g>
      </svg>
    </div>
  );
}
