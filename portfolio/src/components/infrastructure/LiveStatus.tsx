"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { statusSnapshot } from "@/content/infrastructure";

/** Shape published to /status.json by the in-cluster CronJob. */
type ClusterStatus = {
  generatedAt: string;
  build: string;
  deployedAt?: string;
  argocd: { sync: string; health: string; syncedAt?: string };
  nodes: { ready: number; total: number };
  versions: { kubernetes?: string; talos?: string };
  cert?: { notAfter: string };
};

type FeedState = "loading" | "live" | "snapshot";

const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev").slice(0, 7);

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
    fetch("/status.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: ClusterStatus) => {
        if (cancelled) return;
        setStatus(data);
        setFeed("live");
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
          {feed === "live" && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                healthy ? "bg-success" : "bg-warn",
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              feed === "live" && healthy && "bg-success",
              feed === "live" && !healthy && "bg-warn",
              feed === "loading" && "bg-fg-3",
              feed === "snapshot" && "bg-fg-3",
            )}
          />
        </span>
        {feed === "loading" && <span>checking the cluster…</span>}
        {feed === "live" && (
          <span>
            <b className={cn("font-semibold", healthy ? "text-success" : "text-warn")}>
              {healthy ? "All systems operational" : "Partially degraded"}
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
    </div>
  );
}
