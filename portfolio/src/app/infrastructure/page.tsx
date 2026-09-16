import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { LiveStatus } from "@/components/infrastructure/LiveStatus";
import { Pipeline } from "@/components/infrastructure/Pipeline";
import { deployPath, platform, requestPath } from "@/content/infrastructure";
import { readClusterStatus, type ClusterStatus } from "@/lib/cluster-status";

export const metadata: Metadata = {
  title: "Infrastructure",
  alternates: { canonical: "/infrastructure/" },
  description:
    "This site runs on a self-hosted Talos Kubernetes cluster, reconciled by ArgoCD. The request path, the deploy pipeline, and live cluster status.",
};

// The block below is captioned as this endpoint's response and says it
// refreshes every five minutes, so it is rendered from the same ConfigMap the
// endpoint reads rather than a pasted string. A pasted one was three months
// stale and about to publish an expired certificate as current cluster state.
// `history` is truncated to its first entry; the real array is 30 days long.
function renderStatusJson(s: ClusterStatus): string {
  const line = (k: string, v: unknown) => `  ${JSON.stringify(k)}: ${v}`;
  const parts = [
    line("generatedAt", JSON.stringify(s.generatedAt ?? null)),
    line("build", JSON.stringify(s.build ?? null)),
    line("deployedAt", JSON.stringify(s.deployedAt ?? null)),
    line(
      "argocd",
      `{\n    "sync": ${JSON.stringify(s.argocd?.sync ?? null)},\n    "health": ${JSON.stringify(s.argocd?.health ?? null)},\n    "syncedAt": ${JSON.stringify(s.argocd?.syncedAt ?? null)}\n  }`,
    ),
    line(
      "nodes",
      `{ "ready": ${s.nodes?.ready ?? 0}, "total": ${s.nodes?.total ?? 0} }`,
    ),
    line(
      "versions",
      `{ "talos": ${JSON.stringify(s.versions?.talos ?? null)}, "kubernetes": ${JSON.stringify(s.versions?.kubernetes ?? null)} }`,
    ),
    line("cert", `{ "notAfter": ${JSON.stringify(s.cert?.notAfter ?? null)} }`),
  ];
  const first = s.history?.[0];
  if (first) {
    parts.push(
      line(
        "history",
        `[{ "d": ${JSON.stringify(first.d)}, "ok": ${first.ok}, "total": ${first.total} }, ...]`,
      ),
    );
  }
  return `{\n${parts.join(",\n")}\n}`;
}

// Two inks, no hue: the payload is a document, and the page's only colour
// lives inside the instrument's glass.
function JsonCode({ code }: { code: string }) {
  return (
    <>
      {code.split(/("[^"]*":|"[^"]*"|\d+)/g).map((part, i) => {
        if (part.endsWith('":')) {
          return (
            <span key={i}>
              <span className="text-fg">{part.slice(0, -1)}</span>:
            </span>
          );
        }
        if (part.startsWith('"') || /^\d+$/.test(part)) {
          return (
            <span key={i} className="text-fg-2">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

// The publisher writes every 5 minutes, so the page is regenerated on the same
// cadence rather than being baked once at build time and frozen.
export const revalidate = 300;

export default async function InfrastructurePage() {
  const { live, data: status } = await readClusterStatus();
  const statusJson = renderStatusJson(status);
  return (
    <main className="pt-32">
      {/* The front page makes the claim ("this site is the case study"); this
          page assumes it and shows the machinery. */}
      <Section
        eyebrow="infrastructure"
        heading="The machinery behind the page."
        description={
          <>
            The page you are reading was built by CI, pushed to a registry, and
            reconciled by ArgoCD onto a self-hosted Talos Kubernetes cluster in
            Oslo. The instrument below is reading that cluster.
          </>
        }
      >
        <LiveStatus />
      </Section>

      <Section
        eyebrow="the request path"
        heading="How this page reached you."
        description="Every request crosses this chain. Each hop maps to a manifest in the repo."
        className="border-t border-line"
      >
        <Pipeline hops={requestPath} />
      </Section>

      <Section
        eyebrow="the deploy path"
        heading="How a commit becomes this page."
        description={
          <>
            Nothing is applied by hand. A push to{" "}
            <span className="font-mono text-sm text-fg">main</span> is the only
            deploy action that exists. ArgoCD reconciles the rest.
          </>
        }
        className="border-t border-line"
      >
        <Pipeline hops={deployPath} variant="steps" />
      </Section>

      <Section
        eyebrow="how the numbers get here"
        heading="A live pulse, no cluster keys in the open."
        className="border-t border-line"
      >
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div className="space-y-4 text-fg-2 leading-relaxed">
            <p>
              This site runs as a Next.js server, but the pod serving it still
              has no access to the Kubernetes API. A small CronJob inside the
              cluster gathers the facts every few minutes, from the Kubernetes
              API, ArgoCD, and cert-manager, and writes them to a ConfigMap. The
              API reads that ConfigMap and serves it at{" "}
              <code className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.82em] text-fg">
                /api/v1/infra
              </code>
              .
            </p>
            <p>
              The page fetches that endpoint client-side. If the fetch fails,
              the screen falls back to a build-time snapshot and says so. The
              page never breaks because the homelab is having a bad day.
            </p>
            <div className="space-y-4 border-t border-line pt-5 text-sm">
              <p className="eyebrow text-[0.65rem]">design decisions</p>
              <p>
                Serving a status endpoint doesn&apos;t mean handing it cluster
                credentials. The web pod only reads a ConfigMap the publisher
                writes; it holds no Kubernetes API access of its own. The
                publisher&apos;s RBAC reads the objects it reports on, pinned to
                resource names where the API allows it, and writes one
                ConfigMap.
              </p>
              <p>
                The screen checks the timestamp too. Data older than 15 minutes
                is reported as stale rather than shown as operational.
              </p>
            </div>
          </div>
          <Reveal className="overflow-hidden rounded-[2px] border border-line bg-bg-2">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-xs">
              <span className="text-fg-2">GET /api/v1/infra</span>
              <span className="text-fg-3">
                {live ? "refreshed every 5 min" : "example \u2014 feed unavailable"}
              </span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-fg-3">
              <JsonCode code={statusJson} />
            </pre>
          </Reveal>
        </div>
      </Section>

      <Section
        eyebrow="the platform underneath"
        heading="What keeps it honest."
        description={
          <>
            The moving parts behind the diagrams above. Every manifest lives in{" "}
            <a
              href="https://github.com/mortennordbye/Homelab"
              className="focus-ring text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
            >
              the homelab repo
            </a>
            .
          </>
        }
        className="border-t border-line"
      >
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {platform.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.05}>
              <div className="border-t border-line pt-4">
                <p className="border-l-2 border-brass pl-3 font-mono text-sm font-semibold text-fg">
                  {p.name}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-fg-3">{p.role}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
    </main>
  );
}
