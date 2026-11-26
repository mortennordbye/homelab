# Headroom

Headroom is a personal finance tracker for budgets, assets, investments and loans. It is an
own app with its own repo, [mortennordbye/headroom](https://github.com/mortennordbye/headroom),
and it keeps its data in SQLite.

## Where it runs

| Instance | Namespace | Address | Data |
|---|---|---|---|
| prod | `headroom` | `headroom.local.bigd.no`, private gateway | SQLite on a 5 Gi `syno-nfs-csi` PVC at `/data` |
| demo | `headroom-demo` | `headroom.nordbye.it`, public through Cloudflare | fictional data (`DEMO_MODE=1`) in an `emptyDir`, reset on every restart |

prod scales to zero when nobody uses it. The KEDA HTTP interceptor wakes it on the first
request ([`../../platform/delivery/keda.md`](../../platform/delivery/keda.md)). VolSync backs
up the prod PVC every night ([`../../platform/backups/README.md`](../../platform/backups/README.md)).

## Deploy

CI in the app repo builds `ghcr.io/mortennordbye/headroom`. Kargo promotes a new tag to demo
first, then to prod, and writes it into each `kustomization.yaml`
([`../../platform/delivery/kargo.md`](../../platform/delivery/kargo.md)).

## Constraints

- Do not add `runAsUser`. The image starts as root and falls back to root when its chown
  fails on NFS. A non-root start breaks SQLite.
- `ALLOWED_HOSTS` must list every hostname the app is served on, or it answers 403.

The manifests are in [`k8s/talos/apps/headroom/`](../../../k8s/talos/apps/headroom/) and
[`k8s/talos/apps/headroom-demo/`](../../../k8s/talos/apps/headroom-demo/).
