"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { statusSnapshot } from "@/content/infrastructure";

/** Shape served by /api/v1/infra (the in-cluster CronJob's ConfigMap). */
type ClusterStatus = {
  generatedAt: string;
  build: string;
  deployedAt?: string;
  argocd: { sync: string; health: string; syncedAt?: string };
  /** `list` is per-node detail; the tiles here only need the counts. */
  nodes: {
    ready: number;
    total: number;
    list?: { name: string; ready: boolean; role?: string; schedulable?: boolean }[];
  };
  versions: { kubernetes?: string; talos?: string };
  cert?: { notAfter: string };
  /** One entry per UTC day: healthy samples vs samples taken. */
  history?: { d: string; ok: number; total: number }[];
};

type FeedState = "loading" | "live" | "snapshot";

const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);

/** Publisher runs every 5 min; three missed runs means the feed can't be trusted. */
const STALE_AFTER_MS = 15 * 60_000;

function relative(iso: string | undefined): string | null {
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

type UptimeDay = { d: string; pct: number | null };

/**
 * Last 30 UTC days from the publisher's per-day sample counts. Health is as
 * sampled: days with no samples at all render as gaps instead of green, and
 * a silent publisher already trips the stale pill above.
 */
function buildUptime(
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

function isStale(generatedAt: string | undefined): boolean {
  if (!generatedAt) return true;
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  return Number.isNaN(ageMs) || ageMs > STALE_AFTER_MS;
}

function certDaysLeft(notAfter: string | undefined): number | null {
  if (!notAfter) return null;
  const days = Math.floor((new Date(notAfter).getTime() - Date.now()) / 86_400_000);
  return Number.isNaN(days) ? null : days;
}

function Tile({
  label,
  value,
  sub,
  subTone = "muted",
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  subTone?: "muted" | "ok";
  mono?: boolean;
}) {
  return (
    <div className="bg-surface p-6">
      <p className="eyebrow text-[0.65rem]">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums leading-tight tracking-tight text-fg",
          mono && "font-mono text-xl",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-xs",
          subTone === "ok" ? "text-success" : "text-fg-3",
        )}
      >
        {sub}
      </p>
    </div>
  );
}

export function LiveStatus() {
  const [feed, setFeed] = useState<FeedState>("loading");
  const [status, setStatus] = useState<ClusterStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Default caching rather than no-store. The endpoint answers with a short
    // max-age and the publisher only writes every five minutes, so forcing a
    // round trip bought nothing and cost the front page's copy of the same
    // payload — arriving here from the cabinet now paints from cache.
    fetch("/api/v1/infra")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: ClusterStatus & { source?: string }) => {
        if (cancelled) return;
        setStatus(data);
        // /api/v1/infra always answers 200; it flags the build-time fallback
        // with source:"snapshot" (and carries no generatedAt) so the pill
        // stays honest when the live feed is unavailable.
        setFeed(data.source === "snapshot" || !data.generatedAt ? "snapshot" : "live");
      })
      .catch(() => {
        if (!cancelled) setFeed("snapshot");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nodes = status?.nodes ?? statusSnapshot.nodes;
  const argocd = status?.argocd ?? statusSnapshot.argocd;
  const sha = status?.build ?? buildSha;
  const healthy =
    nodes.ready === nodes.total &&
    argocd.sync === "Synced" &&
    argocd.health === "Healthy";
  // A green light on old data is a lie: refuse "operational" when the feed is stale.
  const stale = isStale(status?.generatedAt);
  const ok = healthy && !stale;
  const uptime = buildUptime(status?.history);
  const updated = relative(status?.generatedAt);
  const deployed = relative(status?.deployedAt);
  const certDays = certDaysLeft(status?.cert?.notAfter);
  const versions = [
    status?.versions?.talos && `talos ${status.versions.talos}`,
    status?.versions?.kubernetes && `k8s ${status.versions.kubernetes}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-line-2 bg-surface/60 py-2 pl-3.5 pr-4 font-mono text-xs text-fg-2">
        <span className="relative flex h-2 w-2">
          {feed === "live" && !stale && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                ok ? "bg-success" : "bg-warn",
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              feed === "live" && ok && "bg-success",
              feed === "live" && !ok && "bg-warn",
              feed === "loading" && "bg-fg-3",
              feed === "snapshot" && "bg-fg-3",
            )}
          />
        </span>
        {feed === "loading" && <span>checking the cluster…</span>}
        {feed === "live" && stale && (
          <span>
            <b className="font-semibold text-warn">Live feed stale</b>
            {updated && <span className="text-fg-3"> · last update {updated}</span>}
          </span>
        )}
        {feed === "live" && !stale && (
          <span>
            <b className={cn("font-semibold", ok ? "text-success" : "text-warn")}>
              {ok ? "All systems operational" : "Partially degraded"}
            </b>
            {updated && <span className="text-fg-3"> · updated {updated}</span>}
          </span>
        )}
        {feed === "snapshot" && (
          <span>live feed unreachable · showing the build-time snapshot</span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        <Tile
          label="Serving build"
          value={sha}
          mono
          sub={deployed ? `deployed ${deployed}` : "pinned to commit SHA"}
        />
        <Tile
          label="ArgoCD app"
          value={argocd.sync}
          sub={`${argocd.health.toLowerCase()} · auto-sync`}
          subTone={argocd.health === "Healthy" ? "ok" : "muted"}
        />
        <Tile
          label="Cluster nodes"
          value={
            <>
              {nodes.ready}
              <span className="text-base font-medium text-fg-3"> / {nodes.total} ready</span>
            </>
          }
          sub={versions || "Talos Linux · Kubernetes"}
        />
        <Tile
          label="TLS certificate"
          value={
            certDays !== null ? (
              <>
                {certDays}
                <span className="text-base font-medium text-fg-3"> days</span>
              </>
            ) : (
              "auto"
            )
          }
          sub="auto-renews · Let's Encrypt"
        />
      </div>

      {uptime && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between font-mono text-xs text-fg-3">
            <span>last 30 days · observed in-cluster</span>
            {uptime.overall && (
              <span>
                <span className="text-success">{uptime.overall}</span> healthy
              </span>
            )}
          </div>
          <div className="mt-3 flex h-10 items-stretch justify-between gap-[3px]">
            {uptime.days.map((day) => (
              <span
                key={day.d}
                title={`${day.d} · ${
                  day.pct === null ? "no data" : `${(day.pct * 100).toFixed(1)}% healthy`
                }`}
                className={cn(
                  "w-full max-w-[9px] flex-1 rounded-full transition-transform duration-150 hover:scale-y-110",
                  day.pct === null && "bg-line-2",
                  day.pct !== null && day.pct >= 0.995 && "bg-success",
                  day.pct !== null && day.pct < 0.995 && "bg-danger",
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
