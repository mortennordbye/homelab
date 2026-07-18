export type PipelineHop = {
  icon:
    | "user"
    | "globe"
    | "network"
    | "route"
    | "package"
    | "commit"
    | "cog"
    | "registry"
    | "sync"
    | "server";
  name: string;
  desc: string;
  meta?: string;
};

export type PlatformComponent = {
  name: string;
  role: string;
};

/** Baked snapshot shown when /status.json is unreachable (local dev, feed down). */
export const statusSnapshot = {
  argocd: { sync: "Synced", health: "Healthy" },
  nodes: { ready: 6, total: 6 },
} as const;

export const requestPath: readonly PipelineHop[] = [
  {
    icon: "user",
    name: "You",
    desc: "HTTPS request to nordbye.it",
    meta: "TLS 1.3",
  },
  {
    icon: "globe",
    name: "DNS",
    desc: "Cloudflare DNS points straight at the cluster's public IP",
    meta: "no CDN in front",
  },
  {
    icon: "network",
    name: "Cilium LB",
    desc: "L2-announced VIP, eBPF load-balancing into the cluster",
    meta: "LoadBalancer IPAM",
  },
  {
    icon: "route",
    name: "Traefik",
    desc: "Gateway API HTTPRoute, certificate from cert-manager",
    meta: "gateway.networking.k8s.io",
  },
  {
    icon: "package",
    name: "portfolio pod",
    desc: "Hardened Node runtime serving the Next.js app",
    meta: "read-only rootfs",
  },
];

export const deployPath: readonly PipelineHop[] = [
  {
    icon: "commit",
    name: "git push",
    desc: "Commit to main in the homelab monorepo",
  },
  {
    icon: "cog",
    name: "GitHub Actions",
    desc: "Builds the image and updates the manifest tag in the same run",
  },
  {
    icon: "registry",
    name: "GHCR",
    desc: "Image pushed and pinned to the commit SHA, never :latest",
  },
  {
    icon: "sync",
    name: "ArgoCD",
    desc: "Detects the manifest change in Git and syncs the Application",
    meta: "app-of-apps",
  },
  {
    icon: "server",
    name: "Talos cluster",
    desc: "Rolling update, zero downtime. You're looking at the result.",
    meta: "genesis",
  },
];

export const platform: readonly PlatformComponent[] = [
  {
    name: "Talos Linux",
    role: "Immutable, API-managed Kubernetes OS. No SSH, no shell, no drift.",
  },
  {
    name: "Cilium",
    role: "eBPF CNI, L2 announcements and LB-IPAM for bare-metal VIPs.",
  },
  {
    name: "Traefik",
    role: "Gateway API implementation. HTTPRoutes, not Ingress annotations.",
  },
  {
    name: "ArgoCD",
    role: "App-of-apps GitOps. Git is the only write path to the cluster.",
  },
  {
    name: "cert-manager",
    role: "ACME certificates issued and rotated without human hands.",
  },
  {
    name: "External Secrets",
    role: "Secrets synced from an upstream store. None live in Git.",
  },
  {
    name: "Prometheus + Grafana",
    role: "kube-prometheus-stack, with dashboards versioned as code.",
  },
  {
    name: "Loki + OTel",
    role: "Log aggregation and traces via the OpenTelemetry collector.",
  },
];
