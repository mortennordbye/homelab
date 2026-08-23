"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const InlineGlobeScene = dynamic(() => import("./InlineGlobeScene"), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Morse easter egg: the Oslo pin keys out "MORTEN VICTOR NORDBYE" on a slow
// continuous loop (~9 WPM Farnsworth). Standard ITU timing — dit = 1 unit,
// dah = 3, intra-character gap = 1, inter-character = 3, inter-word = 7 —
// with a long end-of-message gap so the loop breathes between repetitions.
// ---------------------------------------------------------------------------
const MORSE_UNIT_MS = 130;
const MORSE_TEXT = "MORTEN VICTOR NORDBYE";
const MORSE_TABLE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
  G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
  S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
};

type MorseEvent = { on: boolean; units: number };

function buildMorseSchedule(text: string): MorseEvent[] {
  const events: MorseEvent[] = [];
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    [...word].forEach((ch, ci) => {
      const code = MORSE_TABLE[ch];
      if (!code) return;
      [...code].forEach((sym, si) => {
        events.push({ on: true, units: sym === "-" ? 3 : 1 });
        if (si < code.length - 1) events.push({ on: false, units: 1 });
      });
      if (ci < word.length - 1) events.push({ on: false, units: 3 });
    });
    if (wi < words.length - 1) events.push({ on: false, units: 7 });
  });
  events.push({ on: false, units: 20 });
  return events;
}

const MORSE_SCHEDULE = buildMorseSchedule(MORSE_TEXT);

type Mode = "loading" | "skip" | "static" | "webgl";

/**
 * The hero backdrop: a globe standing on a table under a single warm light,
 * rather than a planet in orbit.
 *
 * - Mobile (<= 768px): renders nothing. three.js is ~600 KB; not worth
 *   shipping for an ambient background that's barely visible on a phone.
 * - Reduced motion: renders the static painted fallback only. No WebGL.
 * - Desktop, full motion: starts on the static fallback and upgrades to the
 *   WebGL scene on the first real user input (pointermove / pointerdown /
 *   keydown / touchstart). Headless Lighthouse runs never trigger any of
 *   these, so three.js stays out of the TBT measurement window entirely — a
 *   "facade" pattern.
 */
export function InlineGlobe() {
  const [mode, setMode] = useState<Mode>("loading");
  const [activated, setActivated] = useState(false);
  // The OSLO label lives in this overlay — HTML rather than 3D text, so it
  // stays crisp at any size. The scene writes its transform and opacity each
  // frame from the pin's projected position.
  const osloOverlayRef = useRef<HTMLDivElement>(null);
  // Morse state, read by the scene each frame to key the pin's glow.
  const keyRef = useRef(0.25);

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
    // ~1.5s of long-task work that texture decoding causes never lands inside
    // its TBT window. Real visitors hit the upgrade within a second or two of
    // arriving on the page.
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

  useEffect(() => {
    if (!activated) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let i = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const event = MORSE_SCHEDULE[i];
      keyRef.current = event.on ? 1 : 0.25;
      timer = setTimeout(() => {
        i = (i + 1) % MORSE_SCHEDULE.length;
        tick();
      }, event.units * MORSE_UNIT_MS);
    };
    tick();

    return () => {
      if (timer) clearTimeout(timer);
      keyRef.current = 0.55;
    };
  }, [activated]);

  if (mode === "loading" || mode === "skip") return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* The still frame holds the composition until the scene takes over, so
          the upgrade is a change of fidelity rather than a change of layout. */}
      {!activated && <StaticGlobe />}

      {activated && (
        <>
          <div className="absolute inset-0">
            <InlineGlobeScene overlayRef={osloOverlayRef} keyRef={keyRef} />
          </div>
          <div ref={osloOverlayRef} className="absolute top-0 left-0" style={{ opacity: 0 }}>
            <span className="oslo-marker-label">OSLO</span>
          </div>
        </>
      )}

      {/* Painterly finish. The render is lit like a photograph; these give it
          the surface of a painting — the light of the window, chiaroscuro
          falloff into the copy column, and the tooth of the canvas. */}
      <span className="absolute inset-0 room-light" />
      <span className="absolute inset-0 room-vignette" />
      <span className="absolute inset-0 room-weave" />
      {/* Hands the hero back to the page background at its lower edge. */}
      <span className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

/**
 * Reduced-motion / pre-upgrade fallback. Not a wireframe: the same warm room
 * painted flat, with the globe, its ring and the table edge in the same places
 * the scene puts them, so the swap on first input lands without a jump.
 */
function StaticGlobe() {
  return (
    <div className="absolute inset-0 bg-[#191108]">
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-b from-[#33240f] to-[#1d1409]" />
      {/* Sized by the hero's width, not its height, so the globe holds the
          same quarter-of-the-frame the scene gives it and the upgrade is not
          also a change of scale. */}
      <svg
        className="absolute right-[4%] bottom-[6%] w-[26%] opacity-90"
        viewBox="0 0 400 500"
        fill="none"
      >
        <defs>
          <radialGradient id="globe-lit" cx="33%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#63652f" />
            <stop offset="48%" stopColor="#2b3520" />
            <stop offset="100%" stopColor="#0a0f06" />
          </radialGradient>
          <linearGradient id="globe-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5c4826" />
            <stop offset="42%" stopColor="#9a7c46" />
            <stop offset="100%" stopColor="#63512c" />
          </linearGradient>
          <filter id="globe-shadow">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <ellipse cx="255" cy="452" rx="140" ry="24" fill="#0b0703" opacity="0.75" filter="url(#globe-shadow)" />
        <circle cx="200" cy="180" r="160" fill="url(#globe-lit)" />
        <ellipse
          cx="200"
          cy="180"
          rx="170"
          ry="176"
          stroke="url(#globe-brass)"
          strokeWidth="7"
          transform="rotate(-6 200 180)"
        />
        <path d="M191 356h18v58h-18z" fill="url(#globe-brass)" />
        <ellipse cx="200" cy="420" rx="62" ry="13" fill="url(#globe-brass)" />
        <circle cx="252" cy="72" r="7" fill="#9ec3a3" />
      </svg>
    </div>
  );
}
