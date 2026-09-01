"use client";

import { useEffect, useState } from "react";
import { statusSnapshot } from "@/content/infrastructure";
import {
  PHOS_DIM,
  PHOS_LIT,
  PHOS_BRIGHT,
  PHOS_AMBER,
  GLOW,
  GLOW_BRIGHT,
  BEZEL_STYLE,
  SCREEN_STYLE,
  SCANLINES_STYLE,
} from "@/lib/phosphor";

/** Shape served by /api/v1/infra (the in-cluster CronJob's ConfigMap). */
type ClusterStatus = {
  generatedAt: string;
  build: string;
  deployedAt?: string;
  argocd: { sync: string; health: string; syncedAt?: string };
  /** `list` is per-node detail; the readout here only needs the counts. */
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
 * sampled: days with no samples at all render as gaps instead of lit, and
 * a silent publisher already trips the stale line above.
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-0">
      <span className="shrink-0 sm:w-[130px]" style={{ color: PHOS_DIM }}>
        {label}
      </span>
      <span style={{ color: PHOS_LIT, textShadow: GLOW }}>{children}</span>
    </div>
  );
}

/**
 * The live readout as one instrument (DECISIONS.md §12 / remnants 8B): every
 * live number the page shows is inside this glass, and nothing outside it on
 * the page carries green. The bezel is the palette's fixture.
 */
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
        // with source:"snapshot" (and carries no generatedAt) so the readout
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
  // A lit "operational" on old data is a lie: refuse it when the feed is stale.
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
    <div className="max-w-3xl rounded-lg p-3.5" style={BEZEL_STYLE}>
      <div
        className="relative overflow-hidden rounded font-mono text-[13px] leading-relaxed"
        style={SCREEN_STYLE}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={SCANLINES_STYLE}
        />

        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {/* Status line */}
          <div className="text-[12px]">
            {feed === "loading" && <span style={{ color: PHOS_DIM }}>genesis · checking the cluster…</span>}
            {feed === "live" && !stale && (
              <span>
                <span style={{ color: PHOS_DIM }}>genesis · </span>
                <span
                  style={
                    ok
                      ? { color: PHOS_BRIGHT, textShadow: GLOW_BRIGHT }
                      : { color: PHOS_AMBER }
                  }
                >
                  {ok ? "all systems operational" : "partially degraded"}
                </span>
                {updated && <span style={{ color: PHOS_DIM }}> · updated {updated}</span>}
              </span>
            )}
            {feed === "live" && stale && (
              <span>
                <span style={{ color: PHOS_DIM }}>genesis · </span>
                <span style={{ color: PHOS_AMBER }}>live feed stale</span>
                {updated && <span style={{ color: PHOS_DIM }}> · last update {updated}</span>}
              </span>
            )}
            {feed === "snapshot" && (
              <span style={{ color: PHOS_DIM }}>
                genesis · live feed unreachable · showing the build-time snapshot
              </span>
            )}
          </div>

          {/* The readout */}
          <div className="mt-4 flex flex-col gap-1.5 text-[12.5px]">
            <Row label="SERVING BUILD">
              {sha}
              {deployed && <span style={{ color: PHOS_DIM }}> · deployed {deployed}</span>}
            </Row>
            <Row label="ARGOCD">
              {argocd.sync.toLowerCase()} · {argocd.health.toLowerCase()}
              <span style={{ color: PHOS_DIM }}> · auto-sync</span>
            </Row>
            <Row label="NODES">
              {nodes.ready} / {nodes.total} ready
              {versions && <span style={{ color: PHOS_DIM }}> · {versions}</span>}
            </Row>
            <Row label="TLS CERT">
              {certDays !== null ? `${certDays} days` : "auto"}
              <span style={{ color: PHOS_DIM }}> · auto-renews · Let&apos;s Encrypt</span>
            </Row>
          </div>

          {/* History, on the same glass */}
          {uptime && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between text-[11px]">
                <span style={{ color: PHOS_DIM }}>last 30 days · observed in-cluster</span>
                {uptime.overall && (
                  <span style={{ color: PHOS_DIM }}>
                    <span style={{ color: PHOS_LIT, textShadow: GLOW }}>{uptime.overall}</span>{" "}
                    healthy
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex h-6 items-stretch justify-between gap-[2px]">
                {uptime.days.map((day) => (
                  <span
                    key={day.d}
                    title={`${day.d} · ${
                      day.pct === null ? "no data" : `${(day.pct * 100).toFixed(1)}% healthy`
                    }`}
                    className="w-full max-w-[10px] flex-1"
                    style={
                      day.pct === null
                        ? { background: "#141c15" }
                        : day.pct >= 0.995
                          ? { background: PHOS_LIT, boxShadow: GLOW }
                          : { background: PHOS_AMBER }
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
