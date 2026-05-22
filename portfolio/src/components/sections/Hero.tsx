"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { site } from "@/content/site";
import { HeroTopologyGraph } from "./HeroTopologyGraph";
import { Button } from "@/components/primitives/Button";
import { Tag } from "@/components/primitives/Tag";

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yWord = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-32 md:pt-40"
    >
      <div className="absolute inset-0 -z-10 bg-grain opacity-[0.18] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute -z-10 left-0 right-0 top-0 h-px aurora-line opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--line-2) 1px, transparent 1px), linear-gradient(to bottom, var(--line-2) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <HeroTopologyGraph />

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
            <span className="text-fg-3">.</span>
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

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              href="/resume"
              variant="primary"
              iconRight={<Download size={16} aria-hidden />}
            >
              Open CV
            </Button>
            <Button
              href="#portfolio"
              variant="secondary"
              iconRight={<ArrowRight size={16} aria-hidden />}
            >
              Selected work
            </Button>
            <Button
              href={`mailto:${site.email}`}
              variant="ghost"
              iconRight={<ArrowUpRight size={16} aria-hidden />}
            >
              Start a conversation
            </Button>
          </div>

          <TopologyLegend />
        </div>

        <aside className="relative col-span-12 mt-12 md:col-span-4 md:mt-0">
          <div className="sticky top-32 flex flex-col gap-5">
            <PortraitCard />
          </div>
        </aside>
      </div>
    </section>
  );
}

function TopologyLegend() {
  return (
    <ul className="mt-14 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-wide text-fg-3">
      <li className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
          <circle r="5" fill="transparent" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
          <circle r="1.5" className="fill-accent" />
        </svg>
        control plane
      </li>
      <li className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
          <circle r="4" fill="var(--bg)" stroke="currentColor" strokeWidth="1.25" />
        </svg>
        worker node
      </li>
      <li className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
          <circle r="6" fill="transparent" stroke="currentColor" strokeWidth="1" className="text-accent opacity-40" />
          <circle r="3.5" className="fill-accent" />
        </svg>
        gateway
      </li>
      <li className="text-fg-3/60">— a cluster I run in production at home</li>
    </ul>
  );
}

function PortraitCard() {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-surface/40 backdrop-blur-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src="/images/profile.webp"
          alt="Morten Nordbye, Cloud Engineer & Architect, Oslo"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover saturate-[0.92] contrast-[1.05]"
          style={{ objectPosition: "center top" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-90"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 0% 100%, rgba(var(--accent-rgb), 0.20), transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-2 bg-bg/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-2 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          oslo · 59.9°N
        </span>
      </div>
    </figure>
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
