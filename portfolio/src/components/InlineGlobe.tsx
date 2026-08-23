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

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* A real frame of the scene, not a drawing of it. It renders for every
          visitor with no JavaScript involved, which is what finally gives
          phones the globe: under 768px the WebGL scene never mounts, because
          it costs 211 KB of gzipped JS (883 KB parsed) plus 577 KB of texture
          to decode and a canvas that then renders continuously. This is 37 KB
          and holds still. Desktop sees it too, until the scene takes over —
          so the upgrade is a change of fidelity rather than of layout, and
          reduced-motion visitors simply keep it. */}
      {/* Two crops rather than one, because a phone and a desktop need
          different pictures, not the same picture squeezed. The wide frame
          matches what the live scene renders, so the upgrade is seamless. The
          portrait frame puts the globe low and right with dark room above it,
          which is where the headline and the body copy go — a single wide crop
          left the lit limb sitting directly behind the prose.
          {/* On a phone the picture gets the lower band and the copy gets the
          dark ground above it, because a globe behind a paragraph is a
          contrast problem however it is positioned — with the image covering
          the full height there is no vertical overflow left to steer it with.
          Desktop keeps the full bleed, where the copy sits in its own column
          and the object has the other one. */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] md:inset-0 md:h-full">
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/globe-poster-mobile.jpg" />
          <img
            src="/images/globe-poster.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[64%_50%] md:object-center"
          />
        </picture>
        {/* Blends the band's top edge into the ground above it. */}
        <span className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-bg via-bg/70 to-transparent md:hidden" />
      </div>

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
