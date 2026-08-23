"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { site } from "@/content/site";
import { InlineGlobe } from "@/components/InlineGlobe";
import { Tag } from "@/components/primitives/Tag";

/** How long the monitor takes to swallow the viewport before the route changes.
 *  Long enough to read as a move, short enough that it is not a wait. */
const ENTER_MS = 620;

export function Hero() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLSpanElement>(null);

  /* Walking into the room. The monitor is promoted to a fixed clone at exactly
     the rect it already occupies, then scaled until it covers the viewport,
     and only then does the route change — so the loading screen on /fun opens
     on the same frame at the same scale and the two pages read as one shot.
     `rect` is captured on click rather than measured later: by the time the
     transition ends, the page underneath may have scrolled. */
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [entering, setEntering] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yWord = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  const enterRoom = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Never swallow a middle-click, a modified click or an already-running
    // transition — those are the visitor asking for a new tab, not a walk in.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduce || entering) return;
    const el = screenRef.current;
    if (!el) return;
    e.preventDefault();
    setRect(el.getBoundingClientRect());
    // Two frames: one to mount the clone at its start rect, one to let the
    // browser record that rect before the transform is applied to it.
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(true)));
    window.setTimeout(() => router.push("/fun"), ENTER_MS);
  };

  /* Scale about the monitor's own centre and move that centre to the centre of
     the viewport. Anchoring at the top-left instead looks fine on a wide screen
     and lands you in the corner of the room on a phone, where the frame has to
     grow ~5x and almost all of it ends up off to the right. */
  const cover = rect
    ? Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height)
    : 1;
  const dx = rect ? window.innerWidth / 2 - (rect.left + rect.width / 2) : 0;
  const dy = rect ? window.innerHeight / 2 - (rect.top + rect.height / 2) : 0;

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-32 md:pt-40"
    >
      <InlineGlobe />
      {/* Both sit above the room render rather than behind it — the scene is
          opaque, so anything under it is simply not there. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-[0.18] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute -z-10 left-0 right-0 top-0 h-px aurora-line opacity-60"
      />

      <div className="mx-auto grid max-w-[var(--container-wide)] grid-cols-12 gap-8 px-6 pb-20 md:px-8 md:pb-28">
        <div className="col-span-12 md:col-span-8">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Available · Oslo &amp; remote
          </p>

          <p className="mt-8 font-mono text-sm text-fg-3">
            {site.firstName} {site.lastName}
          </p>

          <motion.h1
            style={reduce ? undefined : { y: yWord, opacity }}
            className="mt-2 text-display-lg text-fg"
          >
            I am a <Typewriter words={site.hero.rotating} reduce={!!reduce} />
          </motion.h1>

          <p className="mt-8 max-w-2xl text-lg text-fg-2 md:text-xl">
            {site.hero.sub}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Tag variant="accent">CKA</Tag>
            <Tag variant="accent">AZ-305</Tag>
            <Tag variant="muted">4+ yrs production cloud</Tag>
            <Tag variant="muted">Public &amp; private · enterprise scale</Tag>
          </div>

          {/* The way into /fun is a monitor showing the room, not a button
              describing it. Deliberately a still frame of the real scene rather
              than a second live canvas: the hero already carries the globe, and
              a static image costs no JS, no main-thread time and nothing in
              crawl budget. The scene itself is only paid for once someone
              walks in. The badge says 3D, not LIVE — the picture is a poster
              and should not claim to be a feed. */}
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
            <Link
              href="/fun"
              onClick={enterRoom}
              className="room-feed focus-ring group inline-flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span ref={screenRef} className="relative block aspect-video w-full max-w-[300px] shrink-0 overflow-hidden rounded-lg border border-line-2 bg-black shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] duration-500 group-hover:border-accent/65 group-hover:shadow-[0_22px_60px_-26px_rgba(var(--accent-rgb),0.55)] sm:w-[268px]">
                <Image
                  src="/images/room-poster.jpg"
                  alt=""
                  aria-hidden
                  fill
                  sizes="268px"
                  className="room-feed__img object-cover brightness-[0.68] saturate-[0.85]"
                  style={{ objectPosition: "50% 58%" }}
                />
                <span
                  aria-hidden
                  className="room-feed__sweep pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-transparent via-snow/[0.045] to-transparent"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_0_46px_14px_rgba(0,0,0,0.75)]"
                />
                <span
                  aria-hidden
                  className="absolute top-2 left-2 flex items-center gap-1.5 rounded border border-accent/30 bg-bg-2/60 px-1.5 py-1 font-mono text-[9px] tracking-[0.18em] text-fg-2"
                >
                  <span className="room-feed__pip size-[5px] rounded-full bg-accent" />
                  3D
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center bg-gradient-to-b from-bg-2/10 to-bg-2/70 opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="translate-y-1.5 rounded-full border border-accent/70 bg-bg-2/50 px-4 py-1.5 font-mono text-xs tracking-[0.26em] text-fg uppercase transition-transform duration-[450ms] ease-[var(--ease-out)] group-hover:translate-y-0">
                    enter
                  </span>
                </span>
              </span>
              <span className="block">
                <span className="block text-sm font-semibold text-fg">Walk through the room</span>
                <span className="mt-1 block font-mono text-[10.5px] tracking-[0.12em] text-fg-3 uppercase">
                  genesis · oslo · walk around it
                </span>
              </span>
            </Link>
            <p className="max-w-[24ch] text-sm text-fg-3">
              The same work, as a place you can move around in.
            </p>
          </div>
        </div>

      </div>

      {/* Portalled to <body>: this section is `isolate`, so a z-index set inside
          it cannot reach over the fixed header or the section that follows. */}
      {rect &&
        createPortal(
          // pointer-events-none as well, so a slow route change can never leave
          // a transparent pane sitting over the page.
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-bg transition-opacity ease-out"
            style={{ opacity: entering ? 1 : 0, transitionDuration: `${ENTER_MS * 0.7}ms` }}
          />
          <div
            className="absolute overflow-hidden rounded-lg"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              transformOrigin: "50% 50%",
              transform: entering ? `translate(${dx}px, ${dy}px) scale(${cover})` : "none",
              borderRadius: entering ? 0 : undefined,
              transition: `transform ${ENTER_MS}ms cubic-bezier(0.65, 0, 0.35, 1), border-radius ${ENTER_MS}ms ease-out`,
            }}
          >
            {/* Exposure walks down to what the loading screen opens on, so the
                route change is not also a brightness step. */}
            <Image
              src="/images/room-poster.jpg"
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover saturate-[0.85] transition-[filter]"
              style={{
                objectPosition: "50% 58%",
                filter: entering ? "brightness(0.45)" : "brightness(0.68)",
                transitionDuration: `${ENTER_MS}ms`,
              }}
            />
            {/* The tube furniture goes with it, fading as the frame grows —
                holding scanlines at full strength across a whole viewport
                would look like a broken screen rather than a move. */}
            <span
              className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)] transition-opacity"
              style={{ opacity: entering ? 0.25 : 1, transitionDuration: `${ENTER_MS}ms` }}
            />
            <span
              className="absolute inset-0 shadow-[inset_0_0_46px_14px_rgba(0,0,0,0.75)] transition-opacity"
              style={{ opacity: entering ? 0.4 : 1, transitionDuration: `${ENTER_MS}ms` }}
            />
          </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

function Typewriter({
  words,
  reduce,
}: {
  words: readonly string[];
  reduce: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const word = words[idx] ?? "";
    const done = text === word;
    const empty = text === "";
    const delay = deleting
      ? empty
        ? 220
        : 45
      : done
        ? 1600
        : 75;

    const t = window.setTimeout(() => {
      if (!deleting && done) {
        setDeleting(true);
      } else if (deleting && empty) {
        setDeleting(false);
        setIdx((i) => (i + 1) % words.length);
      } else if (deleting) {
        setText((s) => s.slice(0, -1));
      } else {
        setText(word.slice(0, text.length + 1));
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [text, deleting, idx, words, reduce]);

  // Reserve space for the longest word so the h1 never reflows as letters
  // type/delete — was a major CLS contributor (mobile CLS 0.30 → target <0.1).
  // Inline-grid stacks the visible text on top of an invisible "ghost" sized
  // by the browser to the widest entry; the line wraps consistently from the
  // first paint instead of jumping each frame.
  const longest = words.reduce(
    (a, b) => (b.length > a.length ? b : a),
    words[0] ?? "",
  );

  return (
    <span style={{ display: "inline-grid" }}>
      <span
        aria-hidden
        style={{ gridArea: "1 / 1", visibility: "hidden", whiteSpace: "nowrap" }}
      >
        {longest}
      </span>
      <span style={{ gridArea: "1 / 1" }} className="text-accent">
        {text}
        <span
          aria-hidden
          className="ml-0.5 inline-block w-[0.55ch] -translate-y-[0.05em] animate-pulse text-accent"
        >
          |
        </span>
      </span>
    </span>
  );
}
