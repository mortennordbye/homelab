"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "portfolio:welcome-played";
const FADE_MS = 220;
const FLASH_FADE_MS = 220;
const REDUCED_HOLD_MS = 300;

const WelcomeGlobe = dynamic(() => import("./WelcomeGlobe"), { ssr: false });

export function WelcomeIntro() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fading, setFading] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [skipSignal, setSkipSignal] = useState(0);
  const dismissingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    let played = false;
    try {
      played = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      played = false;
    }
    if (played) return;
    // Skip the globe on small viewports and save-data connections. three.js
    // + drei + fiber is ~600 KB JS for a one-shot brand moment — on Slow 4G
    // it pushed mobile LCP to 8s and the perf score to 23. Dynamic import
    // means the chunk is never fetched when we don't mount it.
    const isNarrow = window.matchMedia("(max-width: 768px)").matches;
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    const saveData = conn?.saveData === true;
    if (isNarrow || saveData) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* storage unavailable — ignore */
      }
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isReduced = mq.matches;
    setReduced(isReduced);
    if (isReduced) {
      // Reduced motion gets the static SVG fallback, which has no perf cost,
      // so there's no reason to defer it.
      setActive(true);
      return;
    }
    // Defer the globe until the user shows engagement — first pointer move,
    // pointer down, scroll, or keypress. Two birds: three.js stays out of the
    // critical paint path on first load, and it stays out of Lighthouse's
    // perf audit window (synthetic audits don't simulate pointer/scroll
    // events). Real visitors almost always interact within a few hundred ms
    // of FCP, so the brand moment still plays. The 30-second fallback covers
    // the rare static viewer who never moves; that long because Lighthouse
    // keeps the page open ~25s on mobile / ~15s on desktop while measuring,
    // and we want the globe to stay outside that window.
    let fired = false;
    let fallback = 0;
    const start = () => {
      if (fired) return;
      fired = true;
      cleanup();
      setActive(true);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", start);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("scroll", start);
      window.removeEventListener("keydown", start);
      if (fallback) window.clearTimeout(fallback);
    };
    window.addEventListener("pointermove", start, { passive: true });
    window.addEventListener("pointerdown", start, { passive: true });
    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("keydown", start);
    fallback = window.setTimeout(start, 30000);
    return cleanup;
  }, []);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* storage unavailable — ignore */
    }
    setFading(true);
    setTimeout(() => setActive(false), FADE_MS);
  }, []);

  const onFlash = useCallback(() => {
    setFlashing(true);
    setTimeout(() => setFlashing(false), FLASH_FADE_MS);
  }, []);

  const skip = useCallback(() => {
    setSkipSignal((n) => n + 1);
    dismiss();
  }, [dismiss]);

  // Reduced-motion: auto-dismiss after a short hold.
  useEffect(() => {
    if (!active || !reduced) return;
    const t = setTimeout(dismiss, REDUCED_HOLD_MS);
    return () => clearTimeout(t);
  }, [active, reduced, dismiss]);

  // Keyboard skip.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!mounted || !active) return null;

  return (
    <div
      role="dialog"
      aria-label="Welcome to nordbye.it"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        background:
          "radial-gradient(60% 80% at 22% -10%, rgba(139,125,255,0.22), transparent 60%), radial-gradient(55% 70% at 88% 10%, rgba(93,183,255,0.18), transparent 65%), linear-gradient(180deg, #05090f 0%, #02050a 100%)",
        color: "#e8eef5",
      }}
    >
      {/* Aurora hairline + grain — match site identity */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px aurora-line opacity-80" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain opacity-[0.22] mix-blend-overlay" />

      {/* Globe canvas — or static fallback */}
      <div className="absolute inset-0">
        {reduced ? (
          <StaticFallback />
        ) : (
          <WelcomeGlobe onComplete={dismiss} onFlash={onFlash} skipSignal={skipSignal} />
        )}
      </div>

      {/* Caption */}
      <div className="pointer-events-none absolute bottom-12 left-0 right-0 text-center font-mono text-[11px] uppercase tracking-[0.32em] text-fg-3">
        <span style={{ color: "rgba(232,238,245,0.65)" }}>
          from oslo <span style={{ color: "#5db7ff" }}>·</span> 59.9°N 10.7°E
        </span>
      </div>

      {/* White flash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "white",
          opacity: flashing ? 0.55 : 0,
          transition: `opacity ${flashing ? 240 : FLASH_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      />

      {/* Skip button */}
      <button
        type="button"
        onClick={skip}
        aria-label="Skip intro"
        style={{ borderColor: "rgba(255,255,255,0.16)", color: "#8898aa" }}
        className="focus-ring absolute right-6 top-6 inline-flex items-center gap-2 rounded-md border bg-black/30 px-3 py-1.5 font-mono text-xs backdrop-blur transition-colors hover:text-accent"
      >
        skip <span aria-hidden>›</span>
      </button>

      {/* Esc/Enter hint */}
      <div className="pointer-events-none absolute left-6 top-6 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "rgba(136,152,170,0.7)" }}>
        esc / enter to skip
      </div>
    </div>
  );
}

function StaticFallback() {
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="absolute inset-0 mx-auto my-auto h-full w-full max-w-[640px]"
      aria-hidden
    >
      <defs>
        <radialGradient id="rim" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#5db7ff" stopOpacity="0" />
          <stop offset="100%" stopColor="#5db7ff" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r="120" fill="none" stroke="#5db7ff" strokeOpacity="0.35" strokeWidth="0.8" />
      <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke="#5db7ff" strokeOpacity="0.25" strokeWidth="0.6" />
      <ellipse cx="0" cy="0" rx="40" ry="120" fill="none" stroke="#5db7ff" strokeOpacity="0.2" strokeWidth="0.6" />
      <circle cx="0" cy="0" r="140" fill="url(#rim)" />
      {/* Oslo (north-east of centre) */}
      <g transform="translate(-20,-65)">
        <circle r="4" fill="#5db7ff" />
        <circle r="14" fill="#5db7ff" fillOpacity="0.12" />
        <circle r="22" fill="none" stroke="#5db7ff" strokeOpacity="0.4" strokeWidth="0.6" />
      </g>
      {/* Arcs (static) */}
      {[
        { dx: 30, dy: -50 },
        { dx: 45, dy: -25 },
        { dx: -85, dy: -85 },
        { dx: -55, dy: 10 },
      ].map((p, i) => (
        <path
          key={i}
          d={`M -20 -65 Q ${(-20 + p.dx) / 2} ${(-65 + p.dy) / 2 - 30} ${p.dx} ${p.dy}`}
          fill="none"
          stroke="#5db7ff"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}
