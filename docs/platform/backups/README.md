# Backups

Everything lands on the Synology share `k8s-backups` (`nas.local.bigd.no:/volume1/k8s-backups`,
Volume 1). Restores: [`restore.md`](restore.md).

## Layers

| Layer | Source | Schedule (Europe/Oslo) | Kept | NAS path | Defined in |
|---|---|---|---|---|---|
| etcd | `talosctl etcd snapshot` via a Talos API ServiceAccount (`os:etcd:backup`) | 00:30 | 30 | `etcd/etcd-<UTC>.db.gz` | `k8s/talos/infra/etcd-backup/`, patch in `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` |
| logeverylift DB | `pg_dump --format=custom`, Postgres 18 | 00:45 | 30 days | `postgres/logeverylift/` | `k8s/talos/apps/logeverylift/db-backup.yaml` |
| Authentik DB | `pg_dump --format=custom`, Postgres 17 | 00:50 | 30 days | `postgres/authentik/` | `k8s/talos/infra/authentik/db-backup.yaml` |
| App volumes (21) | VolSync restic, `copyMethod: Direct`, one repository per PVC | 01:00 to 01:45 by namespace | 14 daily, 8 weekly, 6 monthly | `volsync/<namespace>/<pvc>/` | `volsync.yaml` in each app, controller `k8s/talos/infra/volsync/` |
| Home Assistant | HA OS automatic backup (encrypted) | 01:30 | 14 | `home-assistant/` | HA UI, Settings > System > Backups |
| *arr databases | App-native zips inside `/config/Backups` (Sonarr, Radarr, Radarr 4K, Prowlarr) | daily | 14 days | inside the VolSync copy | app UI, see [media stack](../../apps/media-stack/README.md) |
| Whole share | Btrfs snapshot, immutable 7 days | 02:45 | 30 | `k8s-backups` | DSM Snapshot Replication |
| Offsite | Hyper Backup task to Google Drive, client-side encrypted, Smart Recycle 30 versions | 03:20 | 30 versions | Google Drive | DSM Hyper Backup |
| Whole VMs | Proxmox backup job to PBS | 03:00 | 1 daily, 1 weekly, 1 monthly | PBS datastore on `pve-backup` | `terraform/proxmox/hyper-cluster/datacenter/backup.tf` |

## Coverage

VolSync covers: arr-stack (sonarr, radarr, radarr-4k, bazarr, bazarr-4k, cleanuparr, tdarr), gluetun-vpn (prowlarr,
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

- Grafana SPOG, row `Internet & Backups`: age of the last successful etcd and dump job,
  VolSync sources behind schedule.
- Alerts (critical, Discord): `BackupJobStale` (etcd or a dump not successful for 26 h),
  `VolSyncBackupStale` (a source behind schedule for 6 h). DSM failures (Hyper Backup,
  snapshots) arrive as `SynologyNotification` and by email.
- Backups made outside the cluster only report failures, so daily checks in
  `k8s/talos/infra/backup-check/` look for the newest one at 09:00 and fail past 26 h;
  `BackupJobStale` covers them. `pbs-backup-check` reads the Proxmox vzdump task logs
  and fails for any guest the job includes that no task finished in the last 26 h
  (the monitoring token may not list PBS backups directly); `ha-backup-check` looks for a
  fresh `.tar` in `home-assistant/`. Hyper Backup and the DSM snapshots have no staleness check.
- `restore-test` runs on the 1st of each month at 10:00: `restic check` with 5 % of the
  data read on every VolSync repository, a full restore of `mealie/data-pvc`, and the
  newest logeverylift and Authentik dumps loaded into a scratch Postgres. It reads the
  NAS only. `RestoreTestFailed` alerts when a run does not pass.
- If the whole homelab goes quiet, the Cloudflare watchdog reports the missing
  Alertmanager heartbeat to Discord (`docs/platform/observability/README.md`).
- By hand:

  ```sh
  kubectl -n etcd-backup get cronjob,jobs
  kubectl get cronjob -A | grep db-backup
  kubectl get replicationsources -A \
    -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,LAST:.status.lastSyncTime,RESULT:.status.latestMoverStatus.result
  kubectl -n <ns> create job --from=cronjob/<name> <name>-manual   # run one now
  kubectl -n backup-check logs job/<name>-manual --all-containers   # check and restore-test output
  ```

## Configured outside Git

The `synology-community/synology` Terraform provider has no resources for shares, NFS
rules, snapshots or Hyper Backup, so these are set by hand in DSM and recorded here.

| Where | Setting |
|---|---|
| DSM Shared Folder `k8s-backups` | Volume 1, hidden, recycle bin off, data checksum on, compression off, quota 200 GB |
| DSM NFS rule on `k8s-backups` | `10.3.10.0/24`, read/write, No mapping, sys, async, non-privileged ports, mounted subfolders |
| DSM Snapshot Replication | snapshots of `k8s-backups` (schedule in Layers) |
| DSM Hyper Backup | the Google Drive task includes `k8s-backups` |
| NAS folders | `home-assistant/`, `etcd/`, `postgres/{logeverylift,authentik}/`, `volsync/` must exist; static NFS PVs need their path |
| Home Assistant | network storage `k8s_backups` (NFS `10.3.10.10:/volume1/k8s-backups/home-assistant`) as the automatic backup location |

## Constraints

- VolSync needs the VolumeSnapshot CRDs installed (`k8s/talos/infra/crds`) even with
  `copyMethod: Direct`; no snapshot controller runs.
- Each namespace with a VolSync source carries `volsync.backube/privileged-movers: "true"`;
  the NFS export writes as root only.
