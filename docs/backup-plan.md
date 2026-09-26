# Cluster backups: plan

Working document for adding app-level backups to the Genesis cluster and Home Assistant.
Section 3 was read from the cluster, Home Assistant and DSM on 2026-09-26; section 5 is a
proposal until the decisions in section 6 are made.

---

## 1. Goal

Any single app, database or the cluster state itself can be brought back from the
Synology without restoring a whole VM, and that has been proven by an actual restore.

Success means:

- A deleted or corrupted PVC for any in-scope app is restored in minutes, into its own
  namespace or a scratch one, by following a written procedure.
- Postgres databases restore from a logical dump, not from copied data files.
- etcd has scheduled snapshots, so a lost control plane is rebuilt from a snapshot rather
  than from a VM backup of one member.
- A failed or missed backup reaches Discord like every other critical alert.
- Backups are declared in Git and reconciled by ArgoCD, like everything else.

## 2. Scope

In scope:

- etcd snapshots.
- Logical dumps of the Postgres databases: logeverylift (`postgres:18-alpine`) and
  Authentik (bundled PostgreSQL).
- Volume backups of app state on both StorageClasses (`proxmox-local` and `syno-nfs-csi`).
- A restore test and a restore runbook in `docs/`.
- Alerting on backup failure.
- Home Assistant, through its own built-in backups (see 3.5). It runs outside the
  cluster, so it is a separate, small workstream.

Out of scope:

- Offsite copies of anything large. Azure is ruled out. The PBS datastore, the media and
  the NAS-side snapshots stay on one box; that is an accepted gap. The small
  `k8s-backups` share does go offsite through the existing Hyper Backup task (see 5).
- Observability data: Loki, Tempo, Prometheus and Alertmanager volumes. Losing them loses
  history, not function.
- Replaceable data: the Ollama model cache (`models-pvc`), which is re-pulled.
- Media files on `/volume1/shared-data/media`. They are large, re-obtainable, and covered
  (or not) by whatever the Synology does for that share.
- Replacing the nightly Proxmox to PBS job. It stays as the whole-VM safety net.

## 3. What is known

### 3.1 Cluster

- Talos v1.13.10 on 3 control planes (10.3.10.31 to .33) and 3 workers (.34 to .36),
  Proxmox VMs. ArgoCD app-of-apps, secrets through External Secrets Operator from
  Bitwarden.
- Two StorageClasses:
  - `proxmox-local` (default): proxmox-csi-plugin on each host's `local-lvm`, RWO,
    parameters `backup: "true"`, `cache: writethrough`, `ssd: "true"`.
  - `syno-nfs-csi`: csi-driver-nfs against `nas.local.bigd.no:/volume1/k8s-volumes/talos`,
    one `<namespace>/<pvc>` subdirectory per claim, `onDelete: archive`.
- The VolumeSnapshot CRDs are installed (`k8s/talos/infra/crds`, because VolSync's
  controller will not reconcile without them), but no snapshot controller runs, so CSI
  snapshots and clones are still not available.

### 3.2 Current backup coverage

| Data | Covered by | Weakness |
|---|---|---|
| `proxmox-local` volumes | Nightly 03:00 Proxmox backup job to PBS (`terraform/proxmox/hyper-cluster/datacenter/backup.tf`). `backup: "true"` puts each CSI disk into the backup of the VM it is attached to at that moment. | Restoring one app means extracting a disk from a whole-VM backup. The disk sits under whichever VM held it that night. Crash-consistent only. Retention is 1 daily, 1 weekly, 1 monthly. |
| `syno-nfs-csi` volumes | Btrfs snapshots of `k8s-volumes` every 6 h, about 11 days kept (see 3.4). Nothing on the cluster side. | Crash-consistent, not immutable, restored per directory from DSM. |
| etcd | Indirectly, inside the control-plane VM backups. | Restoring an etcd member from a VM image is not a supported recovery path. Snapshots are taken by hand before upgrades only (`docs/talos-kubernetes-upgrade.md`). |
| Postgres | Only as files inside the volumes above. | A file copy of a running Postgres is not a reliable backup. |

The PBS datastore is itself on the Synology (NFS share `pve-backup`, 2T).

### 3.3 Volumes

`proxmox-local`:

| Namespace | PVC | Size | In scope |
|---|---|---|---|
| arr-stack | sonarr-config, radarr-config, tdarr-config | 5Gi each | yes |
| arr-stack | bazarr-config | 2Gi | yes |
| arr-stack | cleanuparr-config, flaresolverr-config | 1Gi each | yes |
| gluetun-vpn | prowlarr-config, qbittorrent-config | 1Gi each | yes |
| plex-media-stack | plex-config | 30Gi | yes (metadata cache can be excluded) |
| plex-media-stack | tautulli-config | 1Gi | yes |
| audiobookshelf | config-pvc, metadata-pvc | 5Gi each | yes |
| trek | data-pvc, uploads-pvc | 5Gi, 10Gi | yes |
| identity | data-authentik-postgresql-0 | 8Gi | via pg_dump |
| monitoring | storage-loki-0, storage-tempo-0 | 20Gi, 10Gi | no |

`syno-nfs-csi`:

| Namespace | PVC | Size | In scope |
|---|---|---|---|
| logeverylift | postgres-pvc-18 | 1Gi | via pg_dump |
| logeverylift | postgres-pvc | 1Gi | no: pre-18 data kept from the migration, check whether it can be deleted |
| mealie | data-pvc | 10Gi | yes |
| open-webui | data-pvc | 5Gi | yes |
| headroom | headroom-data-pvc | 5Gi | yes |
| verksted | verksted-data | 20Gi | yes |
| reelsmith | reelsmith-state | 1Gi | yes |
| plex-media-stack | seerr-config | 1Gi | yes |
| monitoring | kube-prometheus-stack-grafana | 10Gi | yes (dashboards are in Git, but users and settings are not) |
| monitoring | prometheus, alertmanager x2 | 20Gi, 2Gi x2 | no |
| ollama | models-pvc | 30Gi | no |

`reelsmith-offsite-backups` is a static NFS PV onto the media share, not app state.

### 3.4 Synology

DS1522+, DSM 7.3.2, 8 GB RAM. One Btrfs volume, 38.4 TB, 28.4 TB used. Installed and
running: Snapshot Replication, Hyper Backup, Container Manager, Replication Service.

| Share | Quota / used | Btrfs snapshots | NFS clients |
|---|---|---|---|
| `k8s-volumes` | 512 GB / 64 GB | Every 6 h, 44 kept (about 11 days), not immutable. Data checksumming (COW) is off on this share. | 10.3.10.0/24, 10.200.0.0/24, rw |
| `pve-backup` | 2 TB / 358 GB | none | 10.3.10.0/24, rw |
| `pve-vmstore` | 500 GB / 1.2 GB | none | 10.3.10.0/24, rw |
| `shared-data` | 28 TB / 25.4 TB | none | 10.3.10.0/24, 10.200.0.0/24, rw, all users mapped to admin |
| `docker` | none / 0 | none | no NFS |

- The `syno-nfs-csi` volumes are therefore already protected by 6-hourly, crash-consistent
  snapshots for about 11 days. They can be recovered from the NAS, though only as whole
  directories and only by someone with DSM access.
- One Hyper Backup task exists: "Google Workspace", daily 03:20, client-side encrypted,
  to Google Drive (152 GB stored). Before this plan it covered only
  `shared-data/documents` and `shared-data/media/personal-media`.
- No Snapshot Replication plans, no immutable snapshots, no snapshots on `pve-backup`.
- DSM has no native S3 server. Container Manager could host one if ever needed.

`k8s-backups`, created 2026-09-26 by hand in DSM (no Terraform coverage, see 6):

| Setting | Value |
|---|---|
| Share | Volume 1, hidden, hide from users without permission, recycle bin off, data checksum on, compression off, quota 200 GB, no encryption, no WriteOnce |
| Permissions | defaults (administrators read/write, guest none) |
| NFS rule | `10.3.10.0/24`, read/write, squash "No mapping" (API value `root`, same as `k8s-volumes`), security sys, async, non-privileged ports allowed, mounted subfolders allowed |
| Snapshots | daily 02:45, keep latest 30, immutable 7 days |
| Mount path | `nas.local.bigd.no:/volume1/k8s-backups` |
| Folders | `home-assistant/`, `etcd/` (created in File Station; a static NFS PV needs its path to exist) |

### 3.5 Home Assistant

- Home Assistant OS 18.2, Core 2026.8.3, on its own physical machine at 10.3.10.15 (not a
  Proxmox VM), so the PBS job does not cover it.
- Only four partial backups exist, all taken automatically before add-on updates, all on
  the local disk. No full backup, no automatic backup schedule, no network backup location.
- Recorder database is SQLite, about 235 MiB.
- Fix is built into HA OS: add a Synology share as network storage for backups, enable
  daily automatic backups with retention, and keep the backup encryption key in Bitwarden.

Configured 2026-09-26 in the HA UI (Settings > System > Storage and > Backups):

| Setting | Value |
|---|---|
| Network storage | `k8s_backups`, usage Backup, NFS, `10.3.10.10:/volume1/k8s-backups/home-assistant` |
| Schedule | daily 01:30, keep 14 backups, app-update backups skipped |
| Contents | settings, history, all apps; media and share folder excluded |
| Locations | this system and `k8s_backups`, both encrypted |
| Encryption key | Backups overview > Encryption key (Show / Download emergency kit); copy kept in Bitwarden |

Verified with a first automatic backup: 1.47 GB, present in both locations.

## 4. Research findings

Tool versions as of 2026-09-26.

### 4.1 Volume backups

| Option | Fit |
|---|---|
| VolSync v0.16.0 (restic mover) | Chosen. One `ReplicationSource` per PVC, declarative restore through `ReplicationDestination` or a `dataSourceRef` volume populator. |
| k8up v2.16.0 | Workable (restic `local` backend, `backupcommand` annotation for dumps), but restores are less declarative. |
| Velero v1.18.3 | Needs an S3 object store. ArgoCD already restores the resources, so the extra machinery buys little. |
| Plain restic CronJobs | Fewest parts, but node affinity for RWO disks and every restore are hand work. |
| proxmox-csi VolumeSnapshots (v0.20.0) | Experimental, need `root@pam` and full copies, and need snapshot-controller. Not used. |

VolSync details, verified in the v0.16.0 source:

- `moverVolumes` accepts an `nfs` volume source and mounts it at `/mnt/<mountPath>`, so
  `RESTIC_REPOSITORY=/mnt/<mountPath>/<app>` is a restic local-backend repository on the
  Synology. No S3 service is needed.
- The mover runs `restic init` itself when the repository does not exist yet.
- The repository Secret needs only `RESTIC_REPOSITORY` and `RESTIC_PASSWORD`.
- `copyMethod: Direct` on an RWO PVC finds the pod using it and pins the mover to that
  node with a `nodeSelector`, copying the pod's tolerations. The copy is live, not
  crash-consistent (see 4.2).
- Movers run unprivileged unless the namespace carries `volsync.backube/privileged-movers`;
  writing to the NFS repository needs either that or a `moverSecurityContext` uid/gid the
  export accepts. Settled in the pilot.
- `spec.restic.unlock` clears stale locks left by a killed mover. Retention fields are
  `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `within`, `last`.
- Metrics: `volsync_volume_out_of_sync` (gauge) and `volsync_missed_intervals_total`
  (counter), labelled `obj_name`, `obj_namespace`.

MinIO community edition is archived; if an S3 or append-only endpoint is ever wanted,
restic `rest-server --append-only` in Container Manager is the small option.

### 4.2 SQLite apps

Sonarr, Radarr, Prowlarr and Bazarr write consistent backup zips to `/config/Backups`
(default weekly); Plex, Tautulli and Tdarr have their own scheduled database backups.
Setting those to daily means every volume backup carries a consistent copy next to the
live database. A live copy of a WAL-mode database usually recovers like after a crash,
but that is not guaranteed, so restores prefer the app's own zip.

### 4.3 Postgres

`pg_dump -Fc` plus `pg_dumpall --globals-only` from a CronJob using the same image as the
server, to a dump volume on the Synology, pruned by age. Retention 7 daily and 4 weekly.
Databases as deployed:

| Database | Image | Where | User / database |
|---|---|---|---|
| logeverylift | `postgres:18-alpine` | Deployment `postgres`, ns `logeverylift`, PVC `postgres-pvc-18` (NFS) | `postgres` / `logeverylift_db` |
| Authentik | `postgres:17.11-bookworm` (chart's Bitnami-style env, official image) | StatefulSet `authentik-postgresql`, ns `identity`, PVC on `proxmox-local` | `authentik` / `authentik` |

The dump job for each uses the matching major version (18 and 17).

### 4.4 etcd

A CronJob on a control-plane node running `talosctl etcd snapshot` with a Talos
`ServiceAccount` (role `os:etcd:backup`), writing to the Synology. Needs this on the
control planes (Talos below 1.14; from 1.14 it becomes its own `KubeTalosAPIAccessConfig`
document):

```yaml
machine:
  features:
    kubernetesTalosAPIAccess:
      enabled: true
      allowedRoles:
        - os:etcd:backup
      allowedKubernetesNamespaces:
        - etcd-backup
```

The patch goes in the `machine` block of `data.talos_machine_configuration.controlplane`
in `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf`, applied by
`talos_machine_configuration_apply.controlplane` with `apply_mode = "auto"`. That resource
covers all three control planes at once, so one-at-a-time means `-target` per node.
No reboot: `.machine.features.kubernetesTalosAPIAccess` is on Talos's apply-immediately
list (`CanApplyImmediate`, release-1.13), and the live config already has a
`machine.features` block. `apply_mode = "staged_if_needing_reboot"` for this one apply
would stage instead of rebooting if that turned out wrong. The Talos
state backend is azurerm, so the plan runs under the user's own auth. siderolabs `talos-backup` is S3-only and still beta, and Omni's
built-in etcd backups apply only to Omni-managed clusters.

### 4.5 Repo conventions that apply

- Infra apps are picked up by an ApplicationSet directory generator over
  `k8s/talos/infra/*` (`k8s/talos/infra/argocd/infra.yaml`), so VolSync and the etcd job
  each become a directory there and need no `Application` of their own.
- Custom alerts live in `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml`;
  only `severity: critical` reaches Discord.
- Secrets come from the `bitwarden-secretsmanager` ClusterSecretStore via `ExternalSecret`.

### 4.6 Home Assistant

HA OS mounts NFS or CIFS (2.1+) shares with usage "Backup"; the Supervisor mounts as root
with no NFS version pinned. Automatic backups pick locations and a keep count, encryption
is set per location, and the emergency kit with the key is offered when backups are set
up. The export rule for 10.3.10.15 must let root write (map root to admin, or no mapping
with write permission).

### 4.7 Alert expressions

```
# Backup CronJob (named *-backup) has not succeeded in 26 h
(time() - kube_cronjob_status_last_successful_time{cronjob=~".*-backup"} > 26*3600)
  unless on(namespace, cronjob) kube_cronjob_spec_suspend == 1

# VolSync source behind schedule
volsync_volume_out_of_sync == 1
```

The CronJob metric is absent until the first success, so a job that has never succeeded
needs `kube_cronjob_status_last_schedule_time unless on(namespace, cronjob)
kube_cronjob_status_last_successful_time` as well.

### 4.8 Synology

Immutable Btrfs snapshots (DSM 7.2+) on the backup share are the guard against a deleted
or encrypted repository, since a plain restic repository has no append-only mode.
Restic on NFS works, but a killed mover leaves stale locks (`spec.restic.unlock`), and
one repository per app avoids lock contention.

## 5. Architecture

A new share, `k8s-backups`, holds everything below, one folder per layer:
`home-assistant/`, `etcd/`, `postgres/<database>/`, `volsync/<namespace>/<pvc>/`.

| # | Layer | Where | Schedule (Europe/Oslo) | Status |
|---|---|---|---|---|
| 0 | Home Assistant automatic backups | HA UI, see 3.5 | 01:30 | running |
| 1 | etcd snapshot CronJob via a Talos API ServiceAccount (`os:etcd:backup`) | `k8s/talos/infra/etcd-backup/`, patch in `talos-cluster.tf` | 00:30 | running, tested 2026-09-26 (13 MB gzipped) |
| 2 | `pg_dump --format=custom` CronJobs | `k8s/talos/apps/logeverylift/db-backup.yaml`, `k8s/talos/infra/authentik/db-backup.yaml` | 00:45, 00:50 | running, tested 2026-09-26 |
| 3 | App-native backup zips, daily, 14 kept | Sonarr, Radarr, Prowlarr settings (`docs/media-stack/README.md`) | app-internal | set |
| 4 | VolSync restic, `copyMethod: Direct`, one repository per PVC | controller `k8s/talos/infra/volsync/`, `volsync.yaml` in each app | 01:00 to 01:45, staggered per namespace | running, first sync of all 19 on 2026-09-26 |
| 5 | Alerts `BackupJobStale`, `VolSyncBackupStale` | `homelab-alerts.yaml` | | loaded; expressions checked against live metrics |
| 6 | Restore test and runbook | `docs/` | | open, see BACKLOG.md |

VolSync covers, per namespace: arr-stack (sonarr, radarr, bazarr, cleanuparr, tdarr
config), gluetun-vpn (prowlarr, qbittorrent config), plex-media-stack (plex, tautulli,
seerr config), audiobookshelf (config, metadata), trek (data, uploads), mealie,
open-webui, headroom, verksted, monitoring (grafana). Left out on purpose: flaresolverr
(no state), reelsmith (restricted namespace, and it already copies its own state
off-volume), the databases (dumped instead), Loki, Tempo, Prometheus, Alertmanager,
the Ollama model cache.

VolSync details that matter:

- Each namespace carries `volsync.backube/privileged-movers: "true"`, so the mover runs
  as root: it has to read files owned by each app's uid, and write the NFS repository
  as root (the export has no uid mapping).
- The repository is `/mnt/repo/<namespace>/<pvc>` on an NFS `moverVolume` of
  `/volume1/k8s-backups/volsync`. Its Secret `<pvc>-restic` comes from an
  ExternalSecret; every repository shares the password `volsync-restic-password` in
  Bitwarden.
- The restic cache volumes are on `syno-nfs-csi`, not `proxmox-local`, to keep
  Proxmox-CSI disk churn (and its orphaned-volume problem) out of it.
- The ReplicationSources carry `SkipDryRunOnMissingResource`, so the apps sync before
  the VolSync CRDs exist.
- The chart's templates set no `metadata.namespace` and render their own ServiceMonitor
  under ArgoCD; `k8s/talos/infra/volsync/kustomization.yaml` patches both.
- DSM failures (Hyper Backup, snapshots, disks) reach the Synology Account by email,
  not Discord; DSM has no webhook to Alertmanager.

The nightly Proxmox to PBS job stays as the whole-VM fallback.

Offsite: `k8s-backups` is in the Hyper Backup task "Google Workspace" to Google Drive
since 2026-09-26, next to `shared-data/documents` and `shared-data/media/personal-media`:
daily 03:20, client-side encrypted, Smart Recycle rotation with at most 30 versions. The
account has 2 TB (153 GB used before this). Each nightly HA archive is new data to Hyper
Backup, so expect roughly 65 GB of HA archives on Drive at steady state.

### 5.1 Retention

Sized from what is there today: etcd 31 MB in use (81 MB on disk), Authentik database
0.25 GB, the whole `proxmox-local` app state about 20 GB of which Plex is 16 GB, the
`k8s-volumes` share 64 GB in total, HA's recorder database 235 MiB. Restic deduplicates,
so extra restic points cost only the changed data.

| Layer | Schedule | Kept | Expected size |
|---|---|---|---|
| Home Assistant | daily 01:30 | 14 | about 21 GB (1.47 GB each, apps included) |
| etcd | daily | 30 | under 2.5 GB |
| Postgres dumps | daily | 30 days | well under 1 GB |
| VolSync restic | daily | 14 daily, 8 weekly, 6 monthly | about 25 GB after dedupe |
| `k8s-backups` share snapshots | daily | 30, each immutable for 7 days | changed blocks only |

Share quota 200 GB, which leaves room for the NFS volumes if they are added.

## 6. Decisions

- Offsite: `k8s-backups` goes to Google Drive through the existing Hyper Backup task;
  nothing measured in terabytes does. Configured, see section 5.
- Synology configuration is made by hand in DSM when needed and recorded in this
  document. The `synology-community/synology` provider (v0.6.11) has no resources for
  shares, NFS rules, snapshots or Hyper Backup.
- Retention as in 5.1.

Still open:

- Whether to add immutable snapshots to `k8s-volumes` too, and turn on its data
  checksumming (only possible on a new share).
- Delete logeverylift's old `postgres-pvc` (pre-18 data). No pod mounts it.
