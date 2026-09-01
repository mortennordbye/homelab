"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { warmImages, warmOnIdle } from "@/lib/warm";
import { statusSnapshot } from "@/content/infrastructure";
import { ALL_DEVICES, HOSTS, deviceById, type NodeState } from "./hardware";

const BenchScene = dynamic(() => import("./BenchScene"), { ssr: false });

/* The veneer useSurface() asks for in the scene. Listed here rather than
   imported from it, because importing anything out of the scene module would
   pull the chunk this facade exists to hold back. */
const SURFACES = [
  "/textures/shelf/black_oak_veneer_diff.webp",
  "/textures/shelf/black_oak_veneer_nor.webp",
  "/textures/shelf/black_oak_veneer_arm.webp",
];

type ClusterFeed = {
  generatedAt?: string;
  argocd: { sync: string; health: string };
  nodes: { ready: number; total: number; list?: NodeState[] };
  versions: { kubernetes?: string; talos?: string };
};

type Mode = "loading" | "skip" | "static" | "webgl";

/** Publisher runs every 5 min; three missed runs means the feed can't be trusted. */
const STALE_AFTER_MS = 15 * 60_000;

/**
 * The homelab section's object: the cabinet the whole estate actually lives in,
 * with the set on top carrying the node status.
 *
 * Follows the same facade rules as the hero globe and the portfolio shelf,
 * because three.js is ~600 KB and this sits well below the fold:
 *
 * - Below lg (<= 1023px): renders nothing, and the section shows the list
 *   instead. The same breakpoint decides both, in CSS and here.
 * - Reduced motion: renders nothing. The scene's only motion is the lamps, but
 *   loading 600 KB to show a still earns nothing the list does not already give.
 * - Desktop, full motion: waits for the section to be near the viewport AND for
 *   a real user input before loading the scene, so three.js stays out of the
 *   initial measurement window entirely.
 */
export function InfraBench() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [near, setNear] = useState(false);
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<ClusterFeed | null>(null);
  // Set by the scene once it has a frame on screen. Until then the poster is
  // what the section shows, and on a phone it stays for good.
  const [painted, setPainted] = useState(false);
  const onPainted = useCallback(() => setPainted(true), []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return setMode("skip");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setMode("skip");
    setMode("static");
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || mode !== "static") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "1200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // Near the viewport is necessary but not sufficient: a real input has to
  // happen too, so headless runs never pull the scene in. The margin above is
  // a screenful and a half: with the chunk and the veneer already warm, that
  // lead is what the scene build and the shader compile get to hide in.
  useEffect(() => {
    if (mode !== "static" || touched) return;
    const wake = () => setTouched(true);
    const events = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, wake));
  }, [mode, touched]);

  useEffect(() => {
    if (mode === "skip") return;
    let cancelled = false;
    fetch("/api/v1/infra")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: ClusterFeed) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        /* The baked snapshot below covers this. The section never breaks
           because the homelab is having a bad day. */
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Staleness is settled when the payload lands rather than during render:
  // Date.now() in a render is impure and the answer would change under React
  // without the feed having changed at all.
  const [stale, setStale] = useState(true);
  useEffect(() => {
    if (!status?.generatedAt) return setStale(true);
    const ageMs = Date.now() - new Date(status.generatedAt).getTime();
    setStale(Number.isNaN(ageMs) || ageMs > STALE_AFTER_MS);
  }, [status]);

  const feed = useMemo(
    () => ({
      nodes:
        status?.nodes.list ??
        // Before the publisher carries a per-node list — or when the fetch
        // fails — assume every declared node is up rather than inventing an
        // outage the cluster is not having.
        (HOSTS.flatMap((h) => h.nodes).map((name) => ({ name, ready: true })) as NodeState[]),
      argocd: status?.argocd ?? statusSnapshot.argocd,
      versions: status?.versions ?? {},
      stale,
    }),
    [status, stale],
  );

  const device = deviceById(selected);
  const showScene = mode === "webgl" || (mode === "static" && near && touched);

  useEffect(() => {
    if (showScene && mode === "static") setMode("webgl");
  }, [showScene, mode]);

  // The cabinet sits near the bottom of the page, so there is usually plenty of
  // idle time before anyone reaches it. Spend it on the chunk and the veneer
  // rather than waiting for the section to come into range and downloading
  // then.
  useEffect(() => {
    if (mode !== "static" || !touched || near) return;
    return warmOnIdle(() => {
      void import("./BenchScene");
      warmImages(SURFACES);
    });
  }, [mode, touched, near]);

  return (
    <div ref={hostRef}>
      {/* The canvas carries no text for a screen reader and no keyboard path
          into a device, so the way in lives out here as real controls. Below
          lg this list is the whole section.

          Above the render, not below: the canvas is capped at 70vh and fills
          the screen, so a panel underneath is off screen for exactly as long as
          someone is picking things in the scene. */}
      <div className="mx-auto max-w-[var(--container-wide)] px-6">
        {/* Twelve chips on one line rather than a two-column list of full model
            names. Sitting above the render, this block's height is taken
            straight off the render's, so it buys back everything it can with
            width: the model name lives in the detail below, not on the chip. */}
        <ul className="flex flex-wrap gap-1.5">
          {ALL_DEVICES.map((d) => {
            const active = d.id === selected;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelected(active ? null : d.id)}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring rounded-[2px] border px-3 py-1.5 font-mono text-xs transition-colors",
                    active
                      ? "border-copper text-fg"
                      : "border-brass/55 text-fg-2 hover:border-copper hover:text-fg",
                  )}
                >
                  {d.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 border-t border-line pt-4">
          {device ? (
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] md:items-start">
              <div>
                <h3 className="font-display text-h3 leading-tight text-fg">{device.model}</h3>
                {/* The facts run inline as one wrapping line. Stacked as a
                    definition list they were five rows tall on their own. */}
                <p className="mt-1.5 font-mono text-xs leading-relaxed text-fg-3">
                  {device.facts.map(([k, v]) => `${k} ${v}`).join("   ·   ")}
                </p>
              </div>
              <div>
                <p className="text-sm leading-relaxed text-fg-2">{device.role}</p>
                {!device.live && (
                  <p className="mt-2 font-mono text-xs leading-relaxed text-fg-3">
                    Not covered by the status feed — the publisher reads the
                    Kubernetes cluster only, so this box&apos;s lights are drawn
                    lit and never change.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-[minmax(0,1.6fr)_auto] md:items-center">
              <p className="text-sm leading-relaxed text-fg-2">
                Three bays. The line in and the house automation at the left,
                storage and the switch in the middle, the three Proxmox hosts at
                the right — each running one Talos control-plane VM and one
                worker. Pick anything to see what it is.
              </p>
              <Link
                href="/infrastructure"
                className="focus-ring inline-flex items-center gap-2 whitespace-nowrap font-display text-sm text-accent hover:underline"
              >
                The request path and the deploy pipeline
                <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* The poster sits under the canvas rather than instead of it, which is
          how the hero globe handles the same problem. It is what a phone and a
          reduced-motion visitor get — neither ever mounts the scene, and
          without this they got the chips and no object at all — and on desktop
          it fills the frame while three.js is still arriving.

          Two crops, because a phone and a desktop need different pictures
          rather than the same one squeezed: 180 cm of cabinet at phone width is
          nothing legible, so the portrait frame takes the storage and compute
          bays, where the detail is.

          On desktop it comes off on the scene's first painted frame. The still
          is cropped to the box by object-cover while the render fits the
          cabinet to the window's own aspect, so leaving it under a live scene
          shows the same object twice at two different scales through the
          canvas's transparent surround.

          Both crops are frames of the scene at 2590 and 1300 px, which is what
          it takes not to look upscaled: shown at a third of that on a retina
          panel, the 1100 px JPEG they replaced was visibly soft. */}
      <div className="scene-bleed relative mt-10 aspect-[5/6] max-h-[70vh] w-full overflow-hidden sm:aspect-[4/3] lg:aspect-[16/9]">
        <picture>
          <source media="(max-width: 767px)" srcSet="/images/cabinet-poster-mobile.webp" />
          <img
            src="/images/cabinet-poster.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            style={{ opacity: painted ? 0 : 1 }}
          />
        </picture>
        {mode === "webgl" && (
          <div className="absolute inset-0">
            <BenchScene
              feed={feed}
              selected={selected}
              onSelect={setSelected}
              onReady={onPainted}
            />
          </div>
        )}
      </div>

    </div>
  );
}
