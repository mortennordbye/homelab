# Homelab technical spec

The current shape of the homelab: what runs where, and how the parts depend on each
other. It describes the present only. Plans and in-flight work live in
[`projects/`](projects/), detail for each area lives in the docs linked from the map
at the end, and the manifests and Terraform are what actually runs. Where this file
and the code disagree, the code wins and this file gets fixed.

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
  ([`plex-hw-transcode.md`](plex-hw-transcode.md)).
- The Synology NAS holds all persistent data and runs the Proxmox Backup Server VM
  (`terraform/proxmox/pbs`).
- Home Assistant runs on its own mini PC, outside the cluster. Only its ingress lives in
  this repo; its configuration is managed in Home Assistant itself.
- Upgrades: [`talos-kubernetes-upgrade.md`](talos-kubernetes-upgrade.md).

## Network

- Cilium is the CNI and announces LoadBalancer VIPs on L2: `10.3.10.101` public
  Traefik gateway, `10.3.10.102` private Traefik gateway, `10.3.10.103` Plex.
- Traefik serves HTTP through Gateway API. Public hostnames resolve through Cloudflare,
  managed by external-dns and `terraform/cloudflare/*`. Internal hostnames under
  `local.bigd.no` are CNAMEs to the private gateway in `terraform/unifi/dns/records.tf`,
  never through external-dns, so a new internal app needs an alias added there.
- cert-manager issues the certificates. Authentik sits in front of apps that need a login.
- App namespaces carry CiliumNetworkPolicies (all but `home-assistant`, which only
  routes to the external HA box); a new caller of an app needs its ingress rule.
- In-cluster clients reach Plex by its Service name, `plex.plex-media-stack:32400`; the
  pod IP changes on every restart.
- The gluetun pod (qBittorrent, Prowlarr) sends its DNS through the VPN, so it reaches
  `local.bigd.no` apps through `hostAliases` on the private gateway VIP.
- Remote access is Tailscale, with UniFi WireGuard as break-glass
  ([`remote-access.md`](remote-access.md)).

## Delivery

- Argo CD runs app-of-apps from `k8s/talos/infra/argocd/{apps.yaml,infra.yaml}`. Each
  directory under `k8s/talos/apps/` and `k8s/talos/infra/` is one Application, synced
  from `main`. Direct `kubectl apply` is reverted.
- Images built in this repo (portfolio, blog) and some external repos are promoted from
  stage to prod by Kargo through pull requests ([`kargo.md`](kargo.md)). External repos
  outside Kargo use `bump-image.yml` ([`gitops-external-app-deploys.md`](gitops-external-app-deploys.md)).
- KEDA with the HTTP add-on scales idle apps to zero; the interceptor wakes them.
- Renovate proposes chart, image and provider bumps; Postgres majors are excluded and
  done by hand ([`postgres-18-migration.md`](postgres-18-migration.md)).

## Secrets

No secret is committed. Values live in Bitwarden Secrets Manager (Homelab project) and
External Secrets Operator turns an `ExternalSecret` that names the item's UUID into a
Kubernetes Secret ([`secrets-management.md`](secrets-management.md)).

## Storage and data

- `proxmox-local` (Proxmox CSI) for block volumes such as app config.
- `syno-nfs-csi` for shared volumes. A fresh NFS volume is root-only for non-root uids,
  so apps that create directories in it need an initContainer chown.
- Postgres 18 for logeverylift runs in-cluster on NFS, PVC mounted at
  `/var/lib/postgresql`.
- The media share `/volume1/shared-data/media` is one mount so imports can hardlink
  ([`media-stack/README.md`](media-stack/README.md)).
- Backups: etcd snapshots, Postgres dumps, VolSync restic per PVC, Home Assistant, NAS
  snapshots, offsite copy, and PBS for whole VMs ([`backups.md`](backups.md),
  restores in [`backup-restore.md`](backup-restore.md)).

## Observability

kube-prometheus-stack, Grafana, Loki, Tempo and the OpenTelemetry collector. Alertmanager
sends only actionable, critical alerts to Discord, and a Cloudflare Worker reports a
missing Alertmanager heartbeat. Falco watches syscalls on every node
([`monitoring.md`](monitoring.md), past incidents in [`incidents.md`](incidents.md)).

## Workloads

22 Argo CD Applications under `k8s/talos/apps/`, one per directory. The groups that
depend on each other:

- Media: Seerr, Radarr, Radarr 4K, Sonarr, Prowlarr, qBittorrent behind gluetun, Plex,
  Tdarr, Bazarr, Cleanuparr ([`media-stack/README.md`](media-stack/README.md)).
- Sites: portfolio and blog, each with a stage and prod, promoted by Kargo.
- Own apps: logeverylift (with Postgres), headroom, reelsmith, verksted, bigd.
- Hub: `hub.bigd.no` (Homepage) links every app, `k8s/talos/apps/homepage/values.yaml`.

## Doc map

| Area | Doc |
| ---- | --- |
| Backups, restores | [`backups.md`](backups.md), [`backup-restore.md`](backup-restore.md) |
| Secrets | [`secrets-management.md`](secrets-management.md) |
| Monitoring, incidents | [`monitoring.md`](monitoring.md), [`incidents.md`](incidents.md) |
| Promotion | [`kargo.md`](kargo.md), [`gitops-external-app-deploys.md`](gitops-external-app-deploys.md) |
| Cluster upgrades | [`talos-kubernetes-upgrade.md`](talos-kubernetes-upgrade.md) |
| Postgres majors | [`postgres-18-migration.md`](postgres-18-migration.md) |
| GPU passthrough | [`plex-hw-transcode.md`](plex-hw-transcode.md) |
| Remote access | [`remote-access.md`](remote-access.md) |
| Media stack | [`media-stack/README.md`](media-stack/README.md) |
| Diagrams | [`diagrams/`](diagrams/) |
| Work in progress | [`projects/`](projects/) |
