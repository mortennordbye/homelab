"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { statusSnapshot } from "@/content/infrastructure";
import { ALL_DEVICES, HOSTS, deviceById, type NodeState } from "./hardware";

const BenchScene = dynamic(() => import("./BenchScene"), { ssr: false });

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
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // Near the viewport is necessary but not sufficient: a real input has to
  // happen too, so headless runs never pull the scene in.
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

  return (
    <div ref={hostRef}>
      {/* The canvas carries no text for a screen reader and no keyboard path
          into a device, so the way in lives out here as real controls. Below
          lg this list is the whole section. */}
      <div className={cn("relative w-full", mode === "skip" ? "hidden" : "hidden lg:block")}>
        <div className="aspect-[16/7] w-full overflow-hidden rounded-xl border border-line bg-bg-2">
          {mode === "webgl" && (
            <BenchScene feed={feed} selected={selected} onSelect={setSelected} />
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <ul className="md:col-span-7 grid gap-2 sm:grid-cols-2">
          {ALL_DEVICES.map((d) => {
            const active = d.id === selected;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelected(active ? null : d.id)}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring flex w-full items-baseline justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-accent/60 bg-surface"
                      : "border-line bg-bg hover:border-accent/40",
                  )}
                >
                  <span className="font-display text-sm text-fg">{d.label}</span>
                  <span className="font-mono text-xs text-fg-3">{d.model}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="md:col-span-5">
          {device ? (
            <div>
              <p className="eyebrow">{device.label}</p>
              <h3 className="mt-3 font-display text-h3 text-fg">{device.model}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-2">{device.role}</p>
              <dl className="mt-5 space-y-2 border-t border-line pt-4">
                {device.facts.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4">
                    <dt className="font-mono text-xs text-fg-3">{k}</dt>
                    <dd className="text-right font-mono text-xs text-fg-2">{v}</dd>
                  </div>
                ))}
              </dl>
              {!device.live && (
                <p className="mt-4 font-mono text-xs leading-relaxed text-fg-3">
                  Not covered by the status feed. The publisher reads the
                  Kubernetes cluster only, so this box&apos;s lights are drawn lit
                  and never change.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="eyebrow">the cabinet</p>
              <p className="mt-3 text-sm leading-relaxed text-fg-2">
                Three bays. The line in and the house automation at the left,
                storage and the switch in the middle, the three Proxmox hosts at
                the right — each running one Talos control-plane VM and one
                worker. Pick anything to see what it is.
              </p>
              <Link
                href="/infrastructure"
                className="focus-ring mt-6 inline-flex items-center gap-2 font-display text-sm text-accent hover:underline"
              >
                The request path, the deploy pipeline and how the numbers get here
                <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
