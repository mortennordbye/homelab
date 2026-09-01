import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Reveal } from "@/components/primitives/Reveal";
import { LiveStatus } from "@/components/infrastructure/LiveStatus";
import { Pipeline } from "@/components/infrastructure/Pipeline";
import { deployPath, platform, requestPath } from "@/content/infrastructure";

export const metadata: Metadata = {
  title: "Infrastructure",
  description:
    "This site runs on a self-hosted Talos Kubernetes cluster, reconciled by ArgoCD. The request path, the deploy pipeline, and live cluster status.",
};

const statusJsonExample = `{
  "generatedAt": "2026-07-13T05:55:03Z",
  "build": "72088b9",
  "deployedAt": "2026-07-12T19:33:47Z",
  "argocd": {
    "sync": "Synced",
    "health": "Healthy",
    "syncedAt": "2026-07-12T19:32:48Z"
  },
  "nodes": { "ready": 6, "total": 6 },
  "versions": { "talos": "v1.11.6", "kubernetes": "v1.34.0" },
  "cert": { "notAfter": "2026-09-25T11:41:28Z" },
  "history": [{ "d": "2026-07-13", "ok": 71, "total": 71 }, ...]
}`;

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

export default function InfrastructurePage() {
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
              <span className="text-fg-3">refreshed every 5 min</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-fg-3">
              <JsonCode code={statusJsonExample} />
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
