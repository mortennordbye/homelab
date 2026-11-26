// Sidebar marks: a tool logo (file in static/logos/), a letter tile for own apps, or a line icon.
// Keyed by sidebar group label, or by page href for single pages.
export type Mark = { logo: string } | { tile: string } | { icon: string; dim?: boolean };

export const groupMarks: Record<string, Mark> = {
  Assets: { icon: "atom" },
  Cluster: { logo: "proxmox.svg" },
  Network: { logo: "traefik.svg" },
  Delivery: { logo: "argocd.svg" },
  Data: { logo: "postgres.svg" },
  Observability: { logo: "grafana.svg" },
  Backups: { logo: "volsync.svg" },
  Portfolio: { tile: "P" },
  "Post quantum": { icon: "atom" },
};

export const pageMarks: Record<string, Mark> = {
  "/architecture/": { logo: "kubernetes.svg" },
  "/platform/storage/": { logo: "synology.svg" },
  "/platform/identity/": { logo: "authentik.svg" },
  "/platform/secrets/": { logo: "bitwarden.svg" },
  "/platform/policy/": { logo: "kyverno.webp" },
  "/platform/cluster/proxmox/": { logo: "proxmox.svg" },
  "/platform/cluster/talos/": { logo: "talos.svg" },
  "/platform/cluster/talos-upgrade/": { logo: "talos.svg" },
  "/platform/cluster/terraform/": { logo: "terraform.svg" },
  "/platform/network/traefik/": { logo: "traefik.svg" },
  "/platform/network/cilium/": { logo: "cilium.svg" },
  "/platform/network/cloudflare/": { logo: "cloudflare.svg" },
  "/platform/network/unifi/": { logo: "unifi.svg" },
  "/platform/network/remote-access/": { logo: "tailscale.svg" },
  "/platform/delivery/argocd/": { logo: "argocd.svg" },
  "/platform/delivery/kargo/": { logo: "kargo.png" },
  "/platform/delivery/ci/": { logo: "github.svg" },
  "/platform/delivery/keda/": { logo: "keda.svg" },
  "/platform/data/postgres/": { logo: "postgres.svg" },
  "/platform/data/cloudnative-pg/": { logo: "garage.svg" },
  "/platform/observability/runbooks/": { logo: "prometheus.svg" },
  "/platform/backups/pbs/": { logo: "pbs.svg" },
  "/apps/innestemme/": { tile: "I" },
  "/apps/linkgraph/": { tile: "L" },
  "/apps/reelsmith/": { tile: "R" },
  "/apps/verksted/": { tile: "V" },
  "/apps/media-stack/": { logo: "plex.svg" },
  "/apps/isponsorblocktv/": { logo: "youtube.svg" },
  "/projects/quantum-pq-homelab/": { icon: "atom" },
};
