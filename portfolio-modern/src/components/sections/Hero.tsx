"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { site } from "@/content/site";
import { HeroTopologyGraph } from "./HeroTopologyGraph";

export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yWord = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);

  const roles = site.hero.rotating;
  const [roleIndex, setRoleIndex] = useState(0);
  const [text, setText] = useState(roles[0]);
  type Phase = "pausing-full" | "deleting" | "pausing-empty" | "typing";
  const [phase, setPhase] = useState<Phase>("pausing-full");

  useEffect(() => {
    if (reduce) return;
    const full = roles[roleIndex];
    let delay: number;
    let action: () => void;

    switch (phase) {
      case "pausing-full":
        delay = 1600;
        action = () => setPhase("deleting");
        break;
      case "deleting":
        if (text.length === 0) {
          delay = 280;
          action = () => setPhase("pausing-empty");
        } else {
          delay = 45;
          action = () => setText((t) => t.slice(0, -1));
        }
        break;
      case "pausing-empty":
        delay = 280;
        action = () => {
          setRoleIndex((i) => (i + 1) % roles.length);
          setPhase("typing");
        };
        break;
      case "typing":
        if (text === full) {
          delay = 0;
          action = () => setPhase("pausing-full");
        } else {
          delay = 85;
          action = () => setText(full.slice(0, text.length + 1));
        }
        break;
    }

    const id = setTimeout(action, delay);
    return () => clearTimeout(id);
  }, [text, phase, roleIndex, reduce, roles]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-32 md:pt-40"
    >
      {/* Atmospheric layers */}
      <div className="absolute inset-0 -z-10 bg-grain opacity-[0.18] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute -z-10 left-0 right-0 top-0 h-px aurora-line opacity-60"
      />
      {/* Grid lines (subtle) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--line-2) 1px, transparent 1px), linear-gradient(to bottom, var(--line-2) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Cluster topology intro animation */}
      <HeroTopologyGraph />

      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-5 pb-20 md:px-8 md:pb-28">
        <div className="col-span-12 md:col-span-8">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-fg-3">
            <span className="text-accent">●</span>{" "}
            available — Oslo &amp; remote · {site.role}
          </p>

          <motion.h1
            style={reduce ? undefined : { y: yWord, opacity }}
            className="mt-8 font-display text-display-xl text-fg leading-[0.92]"
          >
            <span className="block">Morten Victor</span>
            <span className="block">Nordbye</span>
          </motion.h1>

          <p
            className="mt-8 font-display text-lg text-fg-2 md:text-xl"
            aria-label={`I am a ${roles[roleIndex]}`}
          >
            I am a{" "}
            <span className="gradient-text glow-accent" aria-hidden>
              {text}
            </span>
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.5, 0.5, 1],
              }}
              className="ml-[0.15ch] inline-block w-[0.55ch] bg-accent"
              style={{ height: "1em", verticalAlign: "-0.12em" }}
            />
          </p>

          <p className="mt-10 max-w-2xl text-lg text-fg-2 md:text-xl">
            {site.hero.sub}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/work/"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-sm text-accent-ink transition-all hover:shadow-[0_0_44px_-8px_var(--accent)]"
            >
              See selected work
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <a
              href={`mailto:${site.email}`}
              className="group inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/40 px-6 py-3 font-display text-sm text-fg transition-all hover:border-accent hover:text-accent"
            >
              Start a conversation
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-3 font-display text-xs text-fg-3">
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-accent" /> 4+ years in production cloud
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-accent" /> CKA · AZ-305
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-accent" /> Public &amp; private · small to enterprise
            </li>
          </ul>
        </div>

        {/* Portrait card */}
        <aside className="relative col-span-12 mt-12 md:col-span-4 md:mt-0">
          <div className="sticky top-32 flex flex-col gap-5">
            <PortraitCard />
          </div>
        </aside>
      </div>
    </section>
  );
}

function PortraitCard() {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-surface/40 backdrop-blur-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src="/profile.webp"
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
          className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-2 bg-bg/70 px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-fg-2 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          oslo · 59.9°N
        </span>
      </div>
    </figure>
  );
}

