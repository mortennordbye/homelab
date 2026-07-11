# Headroom

Self-hosted personal-finance / budgeting web app. Single-user, single SQLite
blob for all state, served by a small Express server behind the private Traefik
gateway.

- **Source / image build:** [`mortennordbye/headroom`](https://github.com/mortennordbye/headroom)
- **Image:** `ghcr.io/mortennordbye/headroom`, pinned to an immutable `sha-<commit>` tag
- **Namespace:** `headroom`
- **URL:** `https://headroom.local.bigd.no` (private gateway only)

## Deployment flow

Headroom's source lives in a **separate repo**, so it uses the cross-repo
[external-app deploy pattern](../../../../docs/gitops-external-app-deploys.md)
rather than the in-repo commit flow used by `blog` / `portfolio`:

1. Push to `main` in the headroom repo builds and pushes `ghcr.io/mortennordbye/headroom:sha-<short>`.
2. Its CI calls this repo's reusable [`bump-image.yml`](../../../../.github/workflows/bump-image.yml),
   which rewrites the `image:` line in [`deployment.yaml`](deployment.yaml) and **opens a PR** here.
3. Merging the PR updates the pinned tag; ArgoCD syncs it.

The tag is never `:latest` — the running revision is always an immutable commit
SHA visible in Git. Verify what's live at runtime via `GET /api/version` (the
image bakes `BUILD_SHA`), which should match the deployed `sha-<short>`.

## Manifests

| File | Resource | Notes |
| --- | --- | --- |
| [`namespace.yaml`](namespace.yaml) | Namespace | `headroom` |
| [`deployment.yaml`](deployment.yaml) | Deployment | 1 replica, port `3001`, TCP health probes, `/data` volume |
| [`data-pvc.yaml`](data-pvc.yaml) | PersistentVolumeClaim | `5Gi`, `syno-nfs-csi` (RWO); holds the SQLite DB |
| [`service.yaml`](service.yaml) | Service | ClusterIP `8080` → container `3001` |
| [`httproute.yaml`](httproute.yaml) | HTTPRoute | Binds `headroom.local.bigd.no` to `traefik-gateway-private` |
| [`ciliumnetworkpolicy.yaml`](ciliumnetworkpolicy.yaml) | CiliumNetworkPolicy | Ingress only from Traefik + host/health probes |
| [`scaledobject.yaml`](scaledobject.yaml) | KEDA ScaledObject | Scale-to-zero outside 07:00–23:00 Europe/Oslo |
| [`kustomization.yaml`](kustomization.yaml) | Kustomization | Bundles the resources above |

## Operational notes

- **Storage / permissions.** State is a single SQLite file under `/data`
  (`DATA_DIR=/data`). The image starts as root, fixes `/data` ownership, then
  drops to uid 1000 — but on the Synology NFS PVC the in-container `chown`
  doesn't stick, so it falls back to running as root (the export permits it).
  `fsGroup: 1000` asks the CSI to make the volume group-writable where the
  driver supports it. **Do not add `runAsUser`** to the pod spec: starting
  non-root removes the entrypoint's ability to escalate for the fallback and
  reintroduces the `SQLITE_CANTOPEN` startup crash.
- **Host allowlist.** The app enforces a Host-header allowlist (DNS-rebinding
  guard) that defaults to loopback, so it 403s ("host not allowed") behind the
  gateway unless the external hostname is listed. Served hostnames go in the
  `ALLOWED_HOSTS` env var in `deployment.yaml`.
- **Scale-to-zero.** KEDA runs one replica during the day and scales to zero
  overnight (cron trigger, 300s cooldown). First request after a cold window
  waits for the pod to start.
- **Backups.** The DB is the PVC — back it up at the storage/volume layer; there
  is no separate export job in-cluster.
