# Homelab technical spec

The current shape of the homelab: what runs where, and how the parts depend on each
other. It describes the present only. Plans and in-flight work live in
`docs/projects/<name>/`, detail for each area lives in the folders in the map at the
end, and the manifests and Terraform are what actually runs. Where this file and the
code disagree, the code wins and this file gets fixed.

## Layers

```
Internet ── Cloudflare (DNS, public zones, watchdog Worker)
   │
UniFi Cloud Gateway ── local.bigd.no DNS, VLANs, WireGuard break-glass
   │
Proxmox VE: hyper1, hyper2, hyper3 ── Tailscale subnet router VM
   │
Talos VMs: cluster "Genesis", 3 control plane + 3 workers
   │
Argo CD ── everything under k8s/talos/**
   │
Synology DS1522+ ── NFS for volumes, media and backups; PBS VM for VM backups
```

## Physical and virtual

- Three Lenovo nodes run Proxmox VE: `hyper1`, `hyper2`, `hyper3`. Datacenter and
  node config is `terraform/proxmox/hyper-cluster/datacenter`.
- The Talos VMs are `terraform/proxmox/hyper-cluster/k8s/talos`. `genesis-worker-01`
  on `hyper1` has the iGPU passed through for Quick Sync, used by Plex and Tdarr
  ([`../platform/cluster/gpu-passthrough.md`](../platform/cluster/gpu-passthrough.md)).
- The Synology NAS holds all persistent data and runs the Proxmox Backup Server VM
  (`terraform/proxmox/pbs`).
- Home Assistant runs on its own mini PC, outside the cluster. Only its ingress lives in
  this repo; its configuration is managed in Home Assistant itself.
- Upgrades: [`../platform/cluster/talos-upgrade.md`](../platform/cluster/talos-upgrade.md).
- Every Terraform stack, its Azure state and the laptop-only files it needs:
  [`../platform/cluster/terraform.md`](../platform/cluster/terraform.md).

## Network

- Cilium is the CNI and announces the LoadBalancer VIPs on L2 (Argo CD, the public and
  private Traefik gateways, Plex); the addresses are in
  [`../platform/network/README.md`](../platform/network/README.md), Cilium itself in
  [`../platform/network/cilium.md`](../platform/network/cilium.md).
- Traefik serves HTTP through Gateway API
  ([`../platform/network/traefik.md`](../platform/network/traefik.md)). Public hostnames
  live in Cloudflare; internal `local.bigd.no` names are aliases in
  `terraform/unifi/dns/records.tf`, never external-dns, so a new internal app needs an
  alias there.
- cert-manager issues the certificates
  ([`../platform/network/certificates.md`](../platform/network/certificates.md)). Authentik
  sits in front of apps that need a login
  ([`../platform/identity/README.md`](../platform/identity/README.md)).
- App namespaces carry CiliumNetworkPolicies (all but `home-assistant`, which only routes
  to the external HA box). Cilium runs them in audit mode for now (`policyAuditMode` in
  `k8s/talos/infra/cilium/values.yaml`): drops are logged, not enforced, so a missing
  rule does not break anything yet but will once enforcement is on.
- Remote access is Tailscale, with UniFi WireGuard as break-glass
  ([`../platform/network/remote-access.md`](../platform/network/remote-access.md)).

## Delivery

- Argo CD runs two ApplicationSets, `apps` and `infra` in `k8s/talos/infra/argocd/`,
  which generate one Application per directory under `k8s/talos/apps/` and
  `k8s/talos/infra/`, synced from `main`. A direct `kubectl apply` is reverted
  ([`../platform/delivery/argocd.md`](../platform/delivery/argocd.md)).
- `k8s/talos/infra/crds` installs the CRDs no other Application ships: the
  prometheus-operator CRDs, the VolumeSnapshot CRDs VolSync needs, and Traefik's (its own
  chart renders with `includeCRDs: false`).
- Kargo promotes every image built here or in an app repo: portfolio and blog go stage to
  prod, headroom demo to prod, logeverylift, verksted and reelsmith straight to prod, and
  every prod promotion is a pull request
  ([`../platform/delivery/kargo.md`](../platform/delivery/kargo.md)). CI only builds and
  pushes tags ([`../platform/delivery/ci.md`](../platform/delivery/ci.md)).
- KEDA with the HTTP add-on scales idle apps to zero; the interceptor wakes them
  ([`../platform/delivery/keda.md`](../platform/delivery/keda.md)).
- The docs in `docs/` are published to https://docs.nordbye.it by GitHub Pages
  (`.github/workflows/docs.yaml`); the backlog stays in the repo only.
- Renovate proposes chart, image and provider bumps; Postgres majors are excluded and
  done by hand ([`../platform/data/postgres.md`](../platform/data/postgres.md)).

## Secrets

No secret is committed. Values live in Bitwarden Secrets Manager (Homelab project) and
External Secrets Operator turns an `ExternalSecret` that names the item's UUID into a
Kubernetes Secret ([`../platform/secrets/README.md`](../platform/secrets/README.md)).
Reloader (`k8s/talos/infra/reloader`) restarts any workload annotated
`reloader.stakater.com/auto: "true"` when a ConfigMap or Secret it uses changes.

## Storage and data

Storage classes and CSI drivers: [`../platform/storage/README.md`](../platform/storage/README.md).

- `proxmox-local` (Proxmox CSI) for block volumes such as app config.
- `syno-nfs-csi` for shared volumes. A fresh NFS volume is root-only for non-root uids,
  so apps that create directories in it need an initContainer chown.
- Postgres 18 for logeverylift runs in-cluster on NFS, PVC mounted at
  `/var/lib/postgresql`.
- The media share `/volume1/shared-data/media` is one mount so imports can hardlink
  ([`../apps/media-stack/README.md`](../apps/media-stack/README.md)).
- Backups: etcd snapshots, Postgres dumps, VolSync restic per PVC, Home Assistant, NAS
  snapshots, offsite copy, and PBS for whole VMs
  ([`../platform/backups/README.md`](../platform/backups/README.md), restores in
  [`../platform/backups/restore.md`](../platform/backups/restore.md)).

## Observability

kube-prometheus-stack, Grafana, Loki with Alloy shipping logs, and Tempo fed by Traefik over
OTLP. Alertmanager
sends only actionable, critical alerts to Discord, and a Cloudflare Worker reports a
missing Alertmanager heartbeat. Falco watches syscalls on every node and posts to Discord
itself through falcosidekick
([`../platform/observability/README.md`](../platform/observability/README.md), past
incidents in [`../platform/observability/incidents.md`](../platform/observability/incidents.md)).
metrics-server (`k8s/talos/infra/metrics-server`) serves the resource metrics API for
`kubectl top`.

## Workloads

22 Argo CD Applications under `k8s/talos/apps/`, one per directory. The groups that
depend on each other:

- Media: requests, downloads behind a VPN, Plex, subtitles and re-encoding, with a
  separate 4K film library ([`../apps/media-stack/README.md`](../apps/media-stack/README.md)).
- Sites: portfolio and blog, each with a stage and prod, promoted by Kargo
  ([`../apps/portfolio/README.md`](../apps/portfolio/README.md)).
- Own apps: logeverylift (with Postgres), headroom and headroom-demo, reelsmith
  ([`../apps/reelsmith/README.md`](../apps/reelsmith/README.md)), verksted
  ([`../apps/verksted/README.md`](../apps/verksted/README.md)), bigd.
- Hub: `hub.bigd.no` (Homepage) links every app, `k8s/talos/apps/homepage/values.yaml`.

Other apps, one directory each under `k8s/talos/apps/`:

- headroom: `headroom.local.bigd.no`, SQLite on NFS. Do not add `runAsUser`: the image
  starts as root and falls back to root when its chown fails on NFS, and a non-root start
  breaks SQLite. `ALLOWED_HOSTS` must list every hostname it is served on or it answers 403.
  headroom-demo is the same image on `headroom.nordbye.it` with fictional data.
- trek: travel planner on `trek.bigd.no`. The admin in `trek-secret` is only created on a
  boot with no users, and `ENCRYPTION_KEY` must never change or stored secrets become
  unreadable.
- home-assistant: no pod. A Service with hand-written Endpoints points at the HA mini PC,
  `10.3.10.15:8123`, behind `ha.local.bigd.no`.
- audiobookshelf: `audiobookshelf.bigd.no` must stay unproxied in Cloudflare, since it
  streams audio ([`../platform/network/cloudflare.md`](../platform/network/cloudflare.md)).
- ollama and open-webui: local LLM chat on `open-webui.local.bigd.no`. ollama is pinned to
  the `hyper3` zone and reached through the `ollama-wake` Service, so open-webui's requests wake it
  from zero; its model cache is not backed up.
- mealie: recipe manager on `mealie.bigd.no`, SQLite, sign-up off.
- homepage: the hub on `hub.bigd.no`, behind Authentik forward-auth.
- bigd: the static `bigd.no` landing page, nginx serving `index.html` from a ConfigMap.
- it-tools and omni-tools: stateless browser tool collections on `it-tools.bigd.no` and
  `omni-tools.bigd.no`.

## Doc map

`docs/` has one folder per kind of work and one subfolder per area. Each area's
`README.md` is its current state; runbooks sit beside it.

| Folder | Contents |
| ------ | -------- |
| [`platform/backups`](../platform/backups/README.md) | backup layers, watching them, [restores](../platform/backups/restore.md) |
| [`platform/cluster`](../platform/cluster/README.md) | Proxmox and Talos, upgrades, GPU passthrough, [Terraform stacks](../platform/cluster/terraform.md) |
| [`platform/data`](../platform/data/README.md) | in-cluster Postgres, major upgrades |
| [`platform/delivery`](../platform/delivery/README.md) | [Argo CD](../platform/delivery/argocd.md), Kargo promotion, [KEDA scale to zero](../platform/delivery/keda.md), [CI](../platform/delivery/ci.md) |
| [`platform/identity`](../platform/identity/README.md) | Authentik SSO |
| [`platform/network`](../platform/network/README.md) | VIPs, [Traefik](../platform/network/traefik.md), [Cilium](../platform/network/cilium.md), [certificates](../platform/network/certificates.md), DNS, Cloudflare, UniFi, remote access |
| [`platform/observability`](../platform/observability/README.md) | monitoring, alerting, [incidents](../platform/observability/incidents.md) |
| [`platform/secrets`](../platform/secrets/README.md) | Bitwarden to cluster secrets |
| [`platform/storage`](../platform/storage/README.md) | storage classes, CSI drivers |
| [`apps/media-stack`](../apps/media-stack/README.md) | requests, storage, 4K, seeding, subtitles, re-encoding |
| [`apps/portfolio`](../apps/portfolio/README.md) | the portfolio site, brand decisions, the fun room |
| [`apps/reelsmith`](../apps/reelsmith/README.md) | the reelsmith publishing gateway |
| [`apps/verksted`](../apps/verksted/README.md) | the agent session sandbox |
| `projects/<name>` | work in progress, created when needed and deleted when it ships |
| [`backlog`](../backlog/README.md) | known gaps agreed to leave for later |
| [`assets`](../assets) | diagrams, logo, social preview |
