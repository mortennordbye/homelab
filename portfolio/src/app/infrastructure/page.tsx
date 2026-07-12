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

const dotTints = ["bg-accent", "bg-accent-3", "bg-accent-2", "bg-copper"];

const statusJsonExample = `{
  "generatedAt": "2026-07-12T09:14:02Z",
  "build":      "286dd6c",
  "argocd":     { "sync": "Synced", "health": "Healthy" },
  "nodes":      { "ready": 6, "total": 6 },
  "versions":   { "talos": "v1.11.6", "kubernetes": "v1.34.0" },
  "cert":       { "notAfter": "2026-09-04T08:11:39Z" }
}`;

export default function InfrastructurePage() {
  return (
    <main className="pt-32">
      <Section
        eyebrow="infrastructure"
        heading="This site is the case study."
        description={
          <>
            No Vercel, no Netlify. The page you are reading was built by CI,
            pushed to a registry, and reconciled by ArgoCD onto a self-hosted
            Talos Kubernetes cluster in Oslo. The status below is read from
            that cluster.
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
        <Pipeline hops={deployPath} />
      </Section>

      <Section
        eyebrow="how the numbers get here"
        heading="A static site with a live pulse."
        className="border-t border-line"
      >
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div className="space-y-4 text-fg-2 leading-relaxed">
            <p>
              This site is a static export served by nginx. There is no
              server-side code to query the cluster. Instead, a small CronJob
              inside the cluster gathers the facts every few minutes, from the
              Kubernetes API, ArgoCD, and cert-manager, and publishes a single{" "}
              <code className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.82em] text-fg">
                status.json
              </code>{" "}
              through the same gateway.
            </p>
            <p>
              The page fetches it client-side. If the fetch fails, the tiles
              fall back to a build-time snapshot and say so. The page never
              breaks because the homelab is having a bad day.
            </p>
          </div>
          <Reveal className="overflow-hidden rounded-lg border border-line bg-bg-2">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-xs">
              <span className="text-fg-2">GET /status.json</span>
              <span className="text-fg-3">refreshed every 5 min</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-fg-2">
              {statusJsonExample}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {platform.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.05}>
              <div className="h-full rounded-md border border-line bg-surface p-4 transition-colors hover:border-line-2">
                <p className="flex items-center gap-2 font-mono text-sm font-semibold text-fg">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-[2px] ${dotTints[i % dotTints.length]}`}
                  />
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
