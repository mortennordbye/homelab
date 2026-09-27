# Storage

Two CSI drivers provide dynamic volumes: Proxmox CSI for block disks on each host's
`local-lvm`, and csi-driver-nfs for directories on the Synology share `k8s-volumes`. A few
static NFS PersistentVolumes point at fixed folders on the NAS. What gets backed up, and
how, is in [`../backups/README.md`](../backups/README.md).

## Storage classes

| Class | Driver | Backing store | Binding | Reclaim | Default |
|---|---|---|---|---|---|
| `proxmox-local` | `csi.proxmox.sinextra.dev` | `local-lvm` on the Proxmox host that runs the pod, ext4, SSD, writethrough cache | `WaitForFirstConsumer` | `Delete` | yes |
| `syno-nfs-csi` | `nfs.csi.k8s.io` | `nas.local.bigd.no:/volume1/k8s-volumes/talos`, one subdirectory `<namespace>/<pvc>` per claim, `onDelete: archive` | `Immediate` | `Delete` | no |

Both allow volume expansion. Defined in
[`proxmox-csi-plugin/storageclass.yaml`](../../../k8s/talos/infra/proxmox-csi-plugin/storageclass.yaml)
and [`csi-driver-nfs/storageclass.yaml`](../../../k8s/talos/infra/csi-driver-nfs/storageclass.yaml).
A claim without `storageClassName` lands on `proxmox-local`.

## Proxmox CSI

The chart `proxmox-csi-plugin` runs in `csi-proxmox` (sync wave 0), with the controller as a
single replica on the control plane
([`values.yaml`](../../../k8s/talos/infra/proxmox-csi-plugin/values.yaml)). It talks to the
Proxmox API on port 8006 as `kubernetes-csi@pve` with role `CSI`, both managed in
[`access.tf`](../../../terraform/proxmox/hyper-cluster/datacenter/access.tf).

A volume is an LVM disk named `vm-9999-pvc-<uid>` on the `local-lvm` of the host where the
first pod was scheduled, hot-plugged into the Talos VM that pod runs on. The PV carries a
`nodeAffinity` on `topology.kubernetes.io/region` (the Proxmox cluster name) and
`topology.kubernetes.io/zone` (the host, `hyper1` to `hyper3`). Talos sets both labels on
every node from
[`talos-cluster.tf`](../../../terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf).
The volume and every pod that mounts it are therefore tied to one host. Control planes
take workloads (`allowSchedulingOnControlPlanes`), so the pod can run on either the
control plane or the worker VM of that host. Several apps also pin themselves to `hyper1`
with a zone affinity in their Deployment (for example
[`sonarr.yaml`](../../../k8s/talos/apps/arr-stack/sonarr.yaml)).

The StorageClass sets `backup: "true"`, so the disk is included when the Proxmox backup job
backs up the VM it is attached to. The chart's snapshotter sidecar is enabled, but no
VolumeSnapshotClass or snapshot controller exists, so CSI snapshots are not used.

### Config secret

The plugin reads its cluster config (Proxmox API endpoint, the `kubernetes-csi@pve` token,
the region name) from the Secret `proxmox-csi-plugin`, key `config.yaml`, set as
`existingConfigSecret` in the values. The ExternalSecret in
[`config-secret.yaml`](../../../k8s/talos/infra/proxmox-csi-plugin/config-secret.yaml)
builds it from one Bitwarden item through the `bitwarden-secretsmanager` ClusterSecretStore,
refreshed hourly, with `deletionPolicy: Retain`. To rotate the token, edit the whole
`config.yaml` in that Bitwarden item; the pattern is in
[`../secrets/README.md`](../secrets/README.md).

## Synology NFS

The chart `csi-driver-nfs` runs in `csi-driver-nfs` (sync wave 2), one controller replica,
snapshots off, and the StorageClass comes from this repo rather than the chart
([`values.yaml`](../../../k8s/talos/infra/csi-driver-nfs/values.yaml)). Each claim gets the
directory `/volume1/k8s-volumes/talos/<namespace>/<pvc>` and can be mounted from any node.

A fresh directory belongs to root and is not writable for other uids. A container that runs
as non-root and creates directories in its volume needs an initContainer that chowns the
mount root first; the logeverylift Postgres is the example
([`../data/postgres.md`](../data/postgres.md)). VolSync movers write as root for the same
reason ([`../backups/README.md`](../backups/README.md)).

## Static NFS volumes

These PVs have `storageClassName: ""`, reclaim `Retain` and a `claimRef` to one PVC, so
deleting the claim leaves the data on the NAS. The target folder must exist before the pod
starts.

| PV | Namespace | NAS path | Defined in |
|---|---|---|---|
| `etcd-backup` | `etcd-backup` | `/volume1/k8s-backups/etcd` | [`storage.yaml`](../../../k8s/talos/infra/etcd-backup/storage.yaml) |
| `logeverylift-db-backup` | `logeverylift` | `/volume1/k8s-backups/postgres/logeverylift` | [`db-backup.yaml`](../../../k8s/talos/apps/logeverylift/db-backup.yaml) |
| `authentik-db-backup` | `identity` | `/volume1/k8s-backups/postgres/authentik` | [`db-backup.yaml`](../../../k8s/talos/infra/authentik/db-backup.yaml) |
| `reelsmith-offsite-backups` | `reelsmith` | `/volume1/shared-data/media/reelsmith` | [`offsite-pv.yaml`](../../../k8s/talos/apps/reelsmith/offsite-pv.yaml) |

The media apps, audiobookshelf and verksted mount `/volume1/shared-data` (or a folder under
it) as inline `nfs` volumes in the pod spec instead, and the VolSync movers and
`backup-check` jobs mount `/volume1/k8s-backups` the same way. A namespace that enforces Pod Security
`restricted` refuses inline `nfs` volumes, so there the NFS path goes through a static PV
and PVC, as reelsmith does.

## Choosing a class

- `proxmox-local` for app config and SQLite databases of workloads that can live on one
  host: the arr-stack, qbittorrent and prowlarr, Plex and Tautulli, audiobookshelf, trek,
  Loki and Tempo.
- `syno-nfs-csi` for data that should follow the pod to any node: the logeverylift Postgres,
  Prometheus, Alertmanager and Grafana, mealie, open-webui, headroom, verksted, reelsmith,
  seerr, the Ollama model cache, and the VolSync cache volumes.
- A static PV when the data must outlive the claim or sits at a fixed NAS path.

A claim's class cannot change after it is created. The Authentik chart values ask for
`syno-nfs-csi`, but the existing claim `data-authentik-postgresql-0` is on `proxmox-local`
and stays there until the claim is recreated.

## Deleting a PVC

- `proxmox-local`: the PV is deleted and the plugin removes the LVM disk from the host.
- `syno-nfs-csi`: the PV is deleted and the driver renames the directory to
  `/volume1/k8s-volumes/talos/archived-<namespace>/<pvc>` instead of deleting it. Nothing
  cleans these up; remove them on the NAS once the data is no longer needed. A new claim
  with the same name starts empty. If an archived copy of the same claim already exists,
  the rename fails and the PV delete stays stuck until the old copy is removed.
- Static PVs: the PV goes to `Released` and keeps the data. To bind a new claim, clear the
  PV's `claimRef.uid` or delete and recreate the PV.

## Moving a Proxmox volume to another host

Nothing in the repo migrates a `proxmox-local` disk between hosts; the PV's zone affinity
keeps it where it was created. The route the repo supports is a VolSync restore into a new
claim: scale the app to zero, create the new PVC, restore the latest backup into it as in
[`../backups/restore.md`](../backups/restore.md), change the Deployment's zone pin where it
has one, point the Deployment at the new claim, and delete the old one. The disk lands on
the host of the first pod that mounts the claim, which for a restore is the VolSync mover,
so check the new PV's zone affinity before switching the Deployment over.

## Checking it

```sh
kubectl get storageclass
kubectl get pv -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,RECLAIM:.spec.persistentVolumeReclaimPolicy,CLAIM:.spec.claimRef.name,STATUS:.status.phase
kubectl -n csi-proxmox logs deploy/proxmox-csi-plugin-controller -c proxmox-csi-plugin-controller
kubectl -n csi-driver-nfs get pods
```

`pvesm list local-lvm` on a host lists its `vm-9999-pvc-*` disks; one without a matching
PV `volumeHandle` is left over from a deleted claim and can be removed with `pvesm free`.

## Known gaps

- A Proxmox CSI detach that loses the VM config lock leaves the disk as a pending delete and
  breaks that VM's backups; `pbs-backup-check` catches it. Tracked in
  `docs/backlog/README.md`.
- The `k8s-volumes` share has no immutable snapshots or data checksumming. Tracked in
  `docs/backlog/README.md`.
