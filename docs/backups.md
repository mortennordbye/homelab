# Backups

Everything lands on the Synology share `k8s-backups` (`nas.local.bigd.no:/volume1/k8s-backups`,
Volume 1). Restores: [`backup-restore.md`](backup-restore.md). Design history and research:
[`backup-plan.md`](backup-plan.md).

## Layers

| Layer | Source | Schedule (Europe/Oslo) | Kept | NAS path | Defined in |
|---|---|---|---|---|---|
| etcd | `talosctl etcd snapshot` via a Talos API ServiceAccount (`os:etcd:backup`) | 00:30 | 30 | `etcd/etcd-<UTC>.db.gz` | `k8s/talos/infra/etcd-backup/`, patch in `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` |
| logeverylift DB | `pg_dump --format=custom`, Postgres 18 | 00:45 | 30 days | `postgres/logeverylift/` | `k8s/talos/apps/logeverylift/db-backup.yaml` |
| Authentik DB | `pg_dump --format=custom`, Postgres 17 | 00:50 | 30 days | `postgres/authentik/` | `k8s/talos/infra/authentik/db-backup.yaml` |
| App volumes (19) | VolSync restic, `copyMethod: Direct`, one repository per PVC | 01:00 to 01:45 by namespace | 14 daily, 8 weekly, 6 monthly | `volsync/<namespace>/<pvc>/` | `volsync.yaml` in each app, controller `k8s/talos/infra/volsync/` |
| Home Assistant | HA OS automatic backup (encrypted) | 01:30 | 14 | `home-assistant/` | HA UI, Settings > System > Backups |
| *arr databases | App-native zips inside `/config/Backups` (Sonarr, Radarr, Prowlarr) | daily | 14 days | inside the VolSync copy | app UI, see `media-stack/README.md` |
| Whole share | Btrfs snapshot, immutable 7 days | 02:45 | 30 | `k8s-backups` | DSM Snapshot Replication |
| Offsite | Hyper Backup task to Google Drive, client-side encrypted, Smart Recycle 30 versions | 03:20 | 30 versions | Google Drive | DSM Hyper Backup |
| Whole VMs | Proxmox backup job to PBS | 03:00 | 1 daily, 1 weekly, 1 monthly | PBS datastore on `pve-backup` | `terraform/proxmox/hyper-cluster/datacenter/backup.tf` |

VolSync covers: arr-stack (sonarr, radarr, bazarr, cleanuparr, tdarr), gluetun-vpn (prowlarr,
qbittorrent), plex-media-stack (plex, tautulli, seerr), audiobookshelf (config, metadata),
trek (data, uploads), mealie, open-webui, headroom, verksted, monitoring (grafana).

Not backed up by design: Loki, Tempo, Prometheus, Alertmanager, the Ollama model cache,
flaresolverr, reelsmith (keeps its own copies), the media itself.

## Secrets needed to restore

| Secret | Where | Opens |
|---|---|---|
| `volsync-restic-password` | Bitwarden, Homelab project | every VolSync repository |
| Home Assistant backup encryption key | Bitwarden (saved by hand) | HA backups |
| Hyper Backup encryption key | DSM Hyper Backup task | the Google Drive copy |

## Watching it

- Grafana SPOG, row **Internet & Backups**: age of the last successful etcd and dump job,
  VolSync sources behind schedule.
- Alerts (critical, Discord): `BackupJobStale` (etcd or a dump not successful for 26 h),
  `VolSyncBackupStale` (a source behind schedule for 6 h). DSM failures (Hyper Backup,
  snapshots) arrive as `SynologyNotification` and by email.
- By hand:

  ```sh
  kubectl -n etcd-backup get cronjob,jobs
  kubectl get cronjob -A | grep db-backup
  kubectl get replicationsources -A \
    -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,LAST:.status.lastSyncTime,RESULT:.status.latestMoverStatus.result
  kubectl -n <ns> create job --from=cronjob/<name> <name>-manual   # run one now
  ```

## Configured outside Git

| Where | Setting |
|---|---|
| DSM Shared Folder `k8s-backups` | Volume 1, hidden, recycle bin off, data checksum on, compression off, quota 200 GB |
| DSM NFS rule on `k8s-backups` | `10.3.10.0/24`, read/write, No mapping, sys, async, non-privileged ports, mounted subfolders |
| DSM Snapshot Replication | `k8s-backups`: daily 02:45, keep 30, immutable 7 days |
| DSM Hyper Backup | the Google Drive task includes `k8s-backups` |
| NAS folders | `home-assistant/`, `etcd/`, `postgres/{logeverylift,authentik}/`, `volsync/` must exist; static NFS PVs need their path |
| Home Assistant | network storage `k8s_backups` (NFS `10.3.10.10:/volume1/k8s-backups/home-assistant`), daily 01:30, keep 14 |
| Sonarr, Radarr, Prowlarr | backup interval 1 day, retention 14 days |

## Constraints

- VolSync needs the VolumeSnapshot CRDs installed (`k8s/talos/infra/crds`) even with
  `copyMethod: Direct`; no snapshot controller runs.
- Each namespace with a VolSync source carries `volsync.backube/privileged-movers: "true"`;
  the NFS export writes as root only.
- `kubernetes_config_contract` in the Talos `terraform.tfvars` must equal the running
  Kubernetes version, or re-applying the control-plane config downgrades it. A `check` block
  warns in `terraform plan`.
