"use client";

import { useEffect, useState } from "react";
import { statusSnapshot } from "@/content/infrastructure";

/**
 * Shape served by /api/v1/infra, as the room reads it. Only the fields the
 * room actually consumes are modelled; the publisher writes more.
 *
 * Every field below the first block stays optional. The publisher is a CronJob
 * on a five-minute schedule, so a fresh cluster, a failed Prometheus query or
 * a rolled-back publisher all present as absence rather than as an error, and
 * a panel that cannot say something true has to say nothing.
 *
 * Paths match the publisher's own grouping. Do not flatten them: a top-level
 * `apps` exists in the payload and is the KEDA sleeper rollup, not this list.
 */
export type ClusterStatus = {
  generatedAt?: string;
  build?: string;
  deployedAt?: string;
  argocd: { sync: string; health: string; syncedAt?: string };
  nodes: { ready: number; total: number };
  versions?: { kubernetes?: string; talos?: string };
  cert?: { notAfter: string };
  history?: { d: string; ok: number; total: number }[];
  source?: string;

  gitops?: {
    applications?: {
      total?: number;
      synced?: number;
      healthy?: number;
      list?: { name: string; sync: string; health: string }[];
    };
  };
  security?: {
    certs?: {
      total?: number;
      nextExpiry?: string;
      list?: { name: string; daysLeft: number }[];
    };
  };
  capacity?: {
    cpuRequested: number;
    cpuAllocatable: number;
    memRequestedGi: number;
    memAllocatableGi: number;
    pods: number;
    podCapacity: number;
  };
};

export type FeedState = "loading" | "live" | "snapshot";

/** Publisher runs every 5 min; three missed runs means the feed can't be trusted. */
export const STALE_AFTER_MS = 15 * 60_000;

export function isStale(generatedAt: string | undefined): boolean {
  if (!generatedAt) return true;
  const age = Date.now() - new Date(generatedAt).getTime();
  return Number.isNaN(age) || age > STALE_AFTER_MS;
}

export function relative(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function certDaysLeft(notAfter: string | undefined): number | null {
  if (!notAfter) return null;
  const days = Math.floor((new Date(notAfter).getTime() - Date.now()) / 86_400_000);
  return Number.isNaN(days) ? null : days;
}

export type UptimeDay = { d: string; pct: number | null };

/**
 * Last 30 UTC days from the publisher's per-day sample counts. Days with no
 * samples render as gaps rather than green — mirrors LiveStatus.buildUptime,
 * deliberately, so the room and the tiles can never disagree.
 */
export function buildUptime(
  history: ClusterStatus["history"],
): { days: UptimeDay[]; overall: string | null } | null {
  if (!history?.length) return null;
  const byDay = new Map(history.map((h) => [h.d, h]));
  const now = Date.now();
  const days: UptimeDay[] = [];
  let okSum = 0;
  let totalSum = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    const entry = byDay.get(d);
    if (!entry || entry.total < 1) {
      days.push({ d, pct: null });
      continue;
    }
    days.push({ d, pct: Math.min(1, entry.ok / entry.total) });
    okSum += entry.ok;
    totalSum += entry.total;
  }
  const overall = totalSum ? `${((okSum / totalSum) * 100).toFixed(2)}%` : null;
  return { days, overall };
}

/**
 * Same contract as LiveStatus: /api/v1/infra always answers 200 and flags the
 * build-time fallback with source:"snapshot". Refetches every 60s so a room
 * left open doesn't quietly go stale.
 */
export function useInfraFeed() {
  const [feed, setFeed] = useState<FeedState>("loading");
  const [status, setStatus] = useState<ClusterStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/api/v1/infra", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
        .then((data: ClusterStatus) => {
          if (cancelled) return;
          setStatus(data);
          setFeed(data.source === "snapshot" || !data.generatedAt ? "snapshot" : "live");
        })
        .catch(() => {
          if (!cancelled) setFeed("snapshot");
        });
    };

    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const nodes = status?.nodes ?? statusSnapshot.nodes;
  const argocd = status?.argocd ?? statusSnapshot.argocd;
  const stale = isStale(status?.generatedAt);
  const healthy =
    nodes.ready === nodes.total &&
    argocd.sync === "Synced" &&
    argocd.health === "Healthy";

  return {
    feed,
    status,
    nodes,
    argocd,
    stale,
    /** A green light on old data is a lie: never "operational" when stale. */
    ok: healthy && !stale && feed === "live",
  };
}

export type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
};

/**
 * The pinned repositories, from `/api/v1/github`. The names live in
 * `content/repos.ts`; everything else on them is live.
 *
 * An empty list is the correct failure and every consumer has to render it as
 * one: the room does not invent projects it could not fetch.
 */
export function useRepos(): Repo[] {
  const [repos, setRepos] = useState<Repo[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/github")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { repos?: Repo[] }) => {
        if (!cancelled) setRepos((j.repos ?? []).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRepos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return repos;
}
