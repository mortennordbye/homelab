# Verksted

Verksted is a sandbox for agent sessions: a web app that runs LLM-driven shell sessions in
tmux, each able to clone repos, install tooling, run code as root, start containers and
query the cluster. Its image, `ghcr.io/mortennordbye/verksted`, is built in the separate
`mortennordbye/verksted` repo. The manifests live in
[`k8s/talos/apps/verksted/`](../../../k8s/talos/apps/verksted/kustomization.yaml).
reelsmith's nightly render also runs on this pod, from the clone under
`/data/repos/reelsmith` ([`../reelsmith/README.md`](../reelsmith/README.md)).

| | |
|---|---|
| URL | `https://verksted.local.bigd.no` |
| Namespace | `verksted` |
| Delivery | Kargo project `verksted-cd`, straight to prod through a promotion PR ([`../../platform/delivery/kargo.md`](../../platform/delivery/kargo.md)) |
| Backup | VolSync, nightly at 01:40 ([`../../platform/backups/README.md`](../../platform/backups/README.md)) |

## Pod

One replica with `Recreate`, since the data PVC is ReadWriteOnce
([`deployment.yaml`](../../../k8s/talos/apps/verksted/deployment.yaml)). Two containers:

| Container | Image | Runs as | Resources |
|---|---|---|---|
| `verksted` | `ghcr.io/mortennordbye/verksted` (tag set by Kargo in `kustomization.yaml`) | root, `allowPrivilegeEscalation: false`, seccomp `RuntimeDefault` | 1 CPU / 6Gi requested, 6 CPU / 12Gi limit |
| `dind` | `docker:29-dind` | privileged | 100m / 256Mi requested, 2 CPU / 4Gi limit |

The app talks to the Docker daemon at `tcp://localhost:2375`, plain TCP with TLS off, over
the pod's shared network namespace. `VK_AGENT_USER=vk-agent` is left unset because the
Synology share refuses uid 1001, so agent processes run as root.

A restart ends every tmux session, so the probes are lenient: liveness on `/api/health`
fails only after six 30 s misses, readiness on `/api/ready` checks tmux and a write to the
sessions directory, and the startup probe allows 30 minutes.

## Storage

| Mount | Source | Access | Holds |
|---|---|---|---|
| `/data` (both containers) | PVC `verksted-data`, 20Gi, `syno-nfs-csi` | read-write | repos, session state, per-agent HOME, `settings.json` |
| `/var/lib/docker` (dind) | `emptyDir` | read-write | images and containers; lost on restart, overlayfs needs local disk |
| `/mnt/reelsmith` | NFS `/volume1/shared-data`, subPath `media/reelsmith` | read-write | reelsmith's editorial profile, voice reference and history stores |
| `/mnt/backups` | NFS `/volume1/shared-data`, subPath `backups/verksted` | read-write | the app's own nightly export (`VK_BACKUP_DIR`) |
| `/mnt/shared` | NFS `/volume1/shared-data`, whole share | read-only | documents the assistant may read (`DOCS_DIR`) |

dind mounts `/data` at the same path because bind mounts resolve in the daemon's own
filesystem; without it `docker compose up` under `/data` mounts an empty directory.

VolSync backs up `verksted-data` with restic to `/volume1/k8s-backups/volsync` on the NAS,
keeping 14 daily, 8 weekly and 6 monthly
([`volsync.yaml`](../../../k8s/talos/apps/verksted/volsync.yaml)). The restic password is
the shared Bitwarden item behind the `verksted-data-restic` ExternalSecret. The NFS mounts
are not in that backup; the share has its own backups on the NAS.

## Exposure

The HTTPRoute attaches to `traefik-gateway-private` only, hostname
`verksted.local.bigd.no`, so it is reachable from the LAN and over Tailscale, not from the
internet ([`httproute.yaml`](../../../k8s/talos/apps/verksted/httproute.yaml)). The route
has no Authentik or other auth filter; nothing in this repo puts a login in front of it.
The internal DNS alias is in `terraform/unifi/dns/records.tf`.

The CiliumNetworkPolicy allows ingress to port 8080 from Traefik and from the host, and
declares no egress rule, so egress is open: sessions clone repos, reach package registries
and LLM APIs, and dind pulls images
([`ciliumnetworkpolicy.yaml`](../../../k8s/talos/apps/verksted/ciliumnetworkpolicy.yaml)).
The policy is what keeps other pods off the dind port 2375. Cilium runs in audit mode
cluster-wide, so today it logs such traffic rather than dropping it.

## Cluster access

The pod runs as ServiceAccount `verksted`, and its token is what every agent session uses
for `kubectl` ([`rbac.yaml`](../../../k8s/talos/apps/verksted/rbac.yaml)). Two
ClusterRoleBindings give it the following:

- the built-in `view` ClusterRole, cluster-wide, which excludes Secrets;
- ClusterRole `verksted-agent`: read on nodes, PersistentVolumes, StorageClasses, CRDs,
  APIServices, `metrics.k8s.io`, and everything in `argoproj.io` and `kargo.akuity.io`;
- one write verb, `create` on Kargo `promotions`, for re-promoting older Freight. A prod
  promotion still waits on its PR merge.

## Security

- Anything an LLM session decides to run executes as root in the `verksted` container
  with the ServiceAccount token above, and reaches the rest of the cluster and the internet
  without a network restriction. Widening the RBAC widens what every session can do.
- The `verksted` namespace is labelled Pod Security `privileged` for enforce, audit and
  warn, because the dind sidecar needs `privileged: true`
  ([`namespace.yaml`](../../../k8s/talos/apps/verksted/namespace.yaml)). Any pod in the
  namespace may be privileged. The namespace also carries
  `volsync.backube/privileged-movers: "true"`.
- The whole NAS share is mounted read-only at `/mnt/shared`, so a session can read every
  file on it. Two subfolders of the same share are mounted writable.
- Falco exempts the verksted image from the drop-and-execute and sensitive-file-read rules,
  and the dind sidecar from a few rules pinned to this namespace. Container-escape and
  kernel-module rules still apply. See the Falco section of
  [`../../platform/observability/README.md`](../../platform/observability/README.md).
