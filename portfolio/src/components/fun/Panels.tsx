"use client";

import {
  buildUptime,
  certDaysLeft,
  relative,
  type ClusterStatus,
  type FeedState,
} from "./feed";

// Accents come from the site tokens so the room reads as the same product.
export const ACCENT = {
  blue: "#51a45e",
  violet: "#9b8cff",
  teal: "#4fd1c5",
  copper: "#d98b4a",
  green: "#3ddc97",
  amber: "#f5b544",
  red: "#ff6b6b",
} as const;

export type PanelId =
  | "cluster"
  | "delivery"
  | "apps"
  | "uptime"
  | "capacity"
  | "certs"
  | "feed";

// ---------------------------------------------------------------------------
// Shared bits of panel furniture
// ---------------------------------------------------------------------------

function Row({
  k,
  v,
  tone,
}: {
  k: string;
  v: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <span className="text-[#65788c]">{k}</span>
      <span className="tabular-nums" style={tone ? { color: tone } : undefined}>
        {v}
      </span>
    </div>
  );
}

function Big({
  value,
  unit,
  tone,
}: {
  value: React.ReactNode;
  unit?: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 leading-none">
      <span
        className="text-[46px] font-semibold tabular-nums tracking-tight"
        style={{ color: tone ?? "#e6eef7" }}
      >
        {value}
      </span>
      {unit && <span className="text-[15px] text-[#65788c]">{unit}</span>}
    </div>
  );
}

function Bar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="h-[7px] w-full overflow-hidden rounded-full bg-[#16202b]">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, pct * 100))}%`,
          background: tone,
          boxShadow: `0 0 12px ${tone}99`,
        }}
      />
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <p className="pt-6 text-center text-[13px] leading-relaxed text-[#4c5c6d]">
      {what}
      <br />
      <span className="text-[#3d4b59]">publisher does not report this yet</span>
    </p>
  );
}

const dot = (tone: string) => (
  <span
    className="inline-block h-[7px] w-[7px] rounded-full"
    style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
  />
);

function healthTone(health: string, sync: string): string {
  if (health === "Healthy" && sync === "Synced") return ACCENT.green;
  if (health === "Degraded" || health === "Missing") return ACCENT.red;
  return ACCENT.amber;
}

// ---------------------------------------------------------------------------
// The panels
// ---------------------------------------------------------------------------

export type PanelDef = {
  id: PanelId;
  title: string;
  accent: string;
  /** Rendered inside the screen. Kept pure so it can re-render every poll. */
  body: (s: PanelProps) => React.ReactNode;
};

export type PanelProps = {
  status: ClusterStatus | null;
  feed: FeedState;
  stale: boolean;
  ok: boolean;
  nodes: { ready: number; total: number };
  argocd: { sync: string; health: string; syncedAt?: string };
};

export const PANELS: PanelDef[] = [
  {
    id: "cluster",
    title: "CLUSTER",
    accent: ACCENT.blue,
    body: ({ status, nodes }) => {
      const allReady = nodes.ready === nodes.total;
      return (
        <>
          <Big
            value={
              <>
                {nodes.ready}
                <span className="text-[26px] text-[#65788c]">/{nodes.total}</span>
              </>
            }
            unit="nodes ready"
            tone={allReady ? ACCENT.green : ACCENT.amber}
          />
          <div className="mt-5 space-y-[2px] border-t border-[#1b2733] pt-4">
            <Row k="talos" v={status?.versions?.talos ?? "unknown"} />
            <Row k="kubernetes" v={status?.versions?.kubernetes ?? "unknown"} />
            <Row
              k="control plane"
              v={allReady ? "healthy" : "attention"}
              tone={allReady ? ACCENT.green : ACCENT.amber}
            />
          </div>
          <div className="mt-4 flex gap-[5px]">
            {Array.from({ length: nodes.total }).map((_, i) => (
              <div
                key={i}
                className="h-[26px] flex-1 rounded-[2px]"
                style={{
                  background: i < nodes.ready ? `${ACCENT.green}2e` : "#1b2733",
                  borderTop: `2px solid ${i < nodes.ready ? ACCENT.green : "#31404f"}`,
                }}
              />
            ))}
          </div>
        </>
      );
    },
  },
  {
    id: "delivery",
    title: "DELIVERY",
    accent: ACCENT.violet,
    body: ({ status, argocd }) => {
      const synced = argocd.sync === "Synced";
      const healthy = argocd.health === "Healthy";
      return (
        <>
          <Big value={status?.build ?? "dev"} tone={ACCENT.violet} />
          <p className="mt-2 text-[13px] text-[#65788c]">
            {relative(status?.deployedAt)
              ? `deployed ${relative(status?.deployedAt)}`
              : "pinned to commit SHA"}
          </p>
          <div className="mt-5 space-y-[2px] border-t border-[#1b2733] pt-4">
            <Row
              k="argocd sync"
              v={
                <span className="inline-flex items-center gap-2">
                  {dot(synced ? ACCENT.green : ACCENT.amber)}
                  {argocd.sync}
                </span>
              }
            />
            <Row
              k="argocd health"
              v={
                <span className="inline-flex items-center gap-2">
                  {dot(healthy ? ACCENT.green : ACCENT.amber)}
                  {argocd.health}
                </span>
              }
            />
            <Row k="synced" v={relative(argocd.syncedAt) ?? "unknown"} />
            <Row k="write path" v="git only" />
          </div>
        </>
      );
    },
  },
  {
    id: "apps",
    title: "APPLICATIONS",
    accent: ACCENT.teal,
    body: ({ status }) => {
      const apps = status?.apps;
      if (!apps?.length) return <Empty what="No per-application data." />;
      const degraded = apps.filter(
        (a) => a.health !== "Healthy" || a.sync !== "Synced",
      ).length;
      return (
        <>
          <div className="flex items-baseline justify-between">
            <Big value={apps.length} unit="apps" tone={ACCENT.teal} />
            {degraded > 0 && (
              <span className="text-[13px]" style={{ color: ACCENT.amber }}>
                {degraded} need attention
              </span>
            )}
          </div>
          <div className="mt-4 space-y-[2px] border-t border-[#1b2733] pt-3">
            {apps.slice(0, 9).map((a) => (
              <Row
                key={a.name}
                k={a.name}
                v={
                  <span className="inline-flex items-center gap-2">
                    {dot(healthTone(a.health, a.sync))}
                    <span className="text-[#8fa3b7]">
                      {a.sync} / {a.health}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </>
      );
    },
  },
  {
    id: "uptime",
    title: "UPTIME · 30 DAYS",
    accent: ACCENT.green,
    body: ({ status }) => {
      const uptime = buildUptime(status?.history);
      if (!uptime) return <Empty what="No sampled history." />;
      return (
        <>
          <Big value={uptime.overall ?? "n/a"} tone={ACCENT.green} />
          <p className="mt-2 text-[13px] text-[#65788c]">
            healthy samples · observed in-cluster
          </p>
          <div className="mt-6 flex h-[74px] items-stretch gap-[3px]">
            {uptime.days.map((day) => (
              <div
                key={day.d}
                className="flex-1 rounded-[2px]"
                style={{
                  background:
                    day.pct === null
                      ? "#1b2733"
                      : day.pct >= 0.995
                        ? ACCENT.green
                        : ACCENT.red,
                  opacity: day.pct === null ? 1 : 0.55 + 0.45 * day.pct,
                  boxShadow:
                    day.pct === null
                      ? "none"
                      : `0 0 10px ${day.pct >= 0.995 ? ACCENT.green : ACCENT.red}66`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[12px] text-[#4c5c6d]">
            <span>30d ago</span>
            <span>gaps = no samples</span>
            <span>today</span>
          </div>
        </>
      );
    },
  },
  {
    id: "capacity",
    title: "CAPACITY",
    accent: ACCENT.copper,
    body: ({ status }) => {
      const c = status?.capacity;
      if (!c) return <Empty what="No capacity data." />;
      const cpu = c.cpuRequested / c.cpuAllocatable;
      const mem = c.memRequestedGi / c.memAllocatableGi;
      const pods = c.pods / c.podCapacity;
      const tone = (r: number) =>
        r > 0.85 ? ACCENT.red : r > 0.7 ? ACCENT.amber : ACCENT.copper;
      return (
        <div className="space-y-5 pt-1">
          <div>
            <div className="mb-2 flex justify-between text-[14px]">
              <span className="text-[#65788c]">cpu requested</span>
              <span className="tabular-nums">
                {c.cpuRequested} / {c.cpuAllocatable} cores
              </span>
            </div>
            <Bar pct={cpu} tone={tone(cpu)} />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-[14px]">
              <span className="text-[#65788c]">memory requested</span>
              <span className="tabular-nums">
                {c.memRequestedGi} / {c.memAllocatableGi} Gi
              </span>
            </div>
            <Bar pct={mem} tone={tone(mem)} />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-[14px]">
              <span className="text-[#65788c]">pods scheduled</span>
              <span className="tabular-nums">
                {c.pods} / {c.podCapacity}
              </span>
            </div>
            <Bar pct={pods} tone={tone(pods)} />
          </div>
          <p className="border-t border-[#1b2733] pt-3 text-[12px] text-[#4c5c6d]">
            requests, not live usage — what the scheduler has committed
          </p>
        </div>
      );
    },
  },
  {
    id: "certs",
    title: "CERTIFICATES",
    accent: ACCENT.amber,
    body: ({ status }) => {
      const list = status?.certs;
      const fallback = certDaysLeft(status?.cert?.notAfter);
      if (!list?.length) {
        if (fallback === null) return <Empty what="No certificate data." />;
        return (
          <>
            <Big value={fallback} unit="days left" tone={ACCENT.amber} />
            <p className="mt-4 text-[13px] text-[#65788c]">
              auto-renews · Let&apos;s Encrypt via cert-manager
            </p>
          </>
        );
      }
      const soonest = Math.min(...list.map((c) => c.daysLeft));
      return (
        <>
          <Big
            value={soonest}
            unit="days to first expiry"
            tone={soonest < 21 ? ACCENT.red : ACCENT.amber}
          />
          <div className="mt-5 space-y-[2px] border-t border-[#1b2733] pt-4">
            {list.slice(0, 6).map((c) => (
              <Row
                key={c.name}
                k={c.name}
                v={`${c.daysLeft} d`}
                tone={c.daysLeft < 21 ? ACCENT.red : undefined}
              />
            ))}
          </div>
          <p className="mt-4 text-[12px] text-[#4c5c6d]">
            issued and rotated without human hands
          </p>
        </>
      );
    },
  },
  {
    id: "feed",
    title: "FEED STATUS",
    accent: ACCENT.blue,
    body: ({ status, feed, stale }) => {
      const tone =
        feed === "snapshot" ? ACCENT.amber : stale ? ACCENT.amber : ACCENT.green;
      const label =
        feed === "loading"
          ? "checking"
          : feed === "snapshot"
            ? "snapshot"
            : stale
              ? "stale"
              : "live";
      return (
        <>
          <div className="flex items-center gap-3">
            {dot(tone)}
            <Big value={label} tone={tone} />
          </div>
          <div className="mt-5 space-y-[2px] border-t border-[#1b2733] pt-4">
            <Row k="generated" v={relative(status?.generatedAt) ?? "unknown"} />
            <Row k="publisher" v="CronJob · every 5 min" />
            <Row k="stale after" v="15 min" />
            <Row k="web pod k8s access" v="none" tone={ACCENT.green} />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-[#4c5c6d]">
            {feed === "snapshot"
              ? "Live feed unreachable. These are build-time snapshot values, not current cluster state."
              : stale
                ? "Data is older than the staleness window. Treat these numbers as unverified."
                : "A CronJob reads the Kubernetes API and writes a ConfigMap. This pod only reads that file."}
          </p>
        </>
      );
    },
  },
];
