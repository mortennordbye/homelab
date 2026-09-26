# Restoring from backup

How to get each layer of `docs/backup-plan.md` back. Every procedure here was run once
against real backups on 2026-09-26 (see "Restore tests" at the end), except the two that
would have replaced a running system: a full etcd recovery and a Home Assistant restore.

Everything lives on the Synology share `k8s-backups` (`nas.local.bigd.no:/volume1/k8s-backups`),
which also keeps 30 daily immutable snapshots and goes to Google Drive nightly through
Hyper Backup. If a backup file itself is damaged or deleted, restore it from a share
snapshot first (Snapshot Replication > Snapshots > `k8s-backups` > Browse).

| Layer | Folder | Secret needed |
|---|---|---|
| Home Assistant | `home-assistant/` | HA backup encryption key (Bitwarden) |
| etcd | `etcd/etcd-<UTC time>.db.gz` | none |
| Postgres | `postgres/<database>/<db>-<UTC time>.dump` | none (the app's own DB password) |
| App volumes | `volsync/<namespace>/<pvc>/` (restic) | `volsync-restic-password` (Bitwarden) |

## App volume (VolSync)

Restores a PVC in place from its restic repository. The repository Secret
`<pvc>-restic` already exists in the app's namespace.

1. Scale the app to zero so nothing writes to the volume:
   `kubectl -n <ns> scale deploy/<app> --replicas=0` (for a KEDA app, pause the
   ScaledObject first with the `autoscaling.keda.sh/paused: "true"` annotation).
2. Apply a ReplicationDestination that writes into the existing PVC:

   ```yaml
   apiVersion: volsync.backube/v1alpha1
   kind: ReplicationDestination
   metadata:
     name: <pvc>-restore
     namespace: <ns>
   spec:
     trigger:
       manual: restore-1
     restic:
       repository: <pvc>-restic
       copyMethod: Direct
       destinationPVC: <pvc>
       cacheStorageClassName: syno-nfs-csi
       cacheCapacity: 2Gi
       # Optional: an older point in time instead of the newest backup.
       # restoreAsOf: "2026-09-20T00:00:00Z"
       moverVolumes:
         - mountPath: repo
           volumeSource:
             nfs:
               server: nas.local.bigd.no
               path: /volume1/k8s-backups/volsync
   ```

3. Wait for `kubectl -n <ns> get replicationdestination <pvc>-restore` to show a
   `lastSyncTime`, then delete the ReplicationDestination and scale the app back up.
4. Sonarr, Radarr and Prowlarr: if the restored database misbehaves, restore the
   newest zip from `/config/Backups/scheduled` through System > Backup in the app.

Direct restore overwrites files but does not delete ones that are not in the backup.
For a clean restore, restore into a new PVC and point the Deployment at it instead.

## Postgres

Dumps are `pg_dump --format=custom`. Restore with `pg_restore` from a pod that mounts the
dump volume and is admitted by the database's network policy.

| Database | Namespace | Dump PVC | Image | Host / user / db | Label the policy admits |
|---|---|---|---|---|---|
| logeverylift | `logeverylift` | `logeverylift-db-backup` | `postgres:18-alpine` | `postgres` / `postgres` / `logeverylift_db` | `app: postgres-backup` |
| Authentik | `identity` | `authentik-db-backup` | `postgres:17-alpine` | `authentik-postgresql` / `authentik` / `authentik` | `app.kubernetes.io/instance: authentik` |

1. Scale the app (not the database) to zero.
2. Start a pod in the namespace with the label from the table, the dump PVC mounted
   read-only at `/backup`, and `PGHOST`, `PGUSER`, `PGDATABASE` and `PGPASSWORD`
   (from `logeverylift-secret/POSTGRES_PASSWORD` or `authentik-secrets/postgres-password`),
   modelled on the CronJob in `db-backup.yaml`.
3. In that pod:

   ```sh
   ls -t /backup/*.dump | head          # pick one
   pg_restore --clean --if-exists --no-owner --dbname="$PGDATABASE" /backup/<file>.dump
   ```

4. Delete the pod and scale the app back up.

To inspect a dump without touching the live database, restore it into a throwaway
Postgres of the same major version instead (this is what the restore test did).

## etcd

Only for losing etcd quorum (two of three control planes gone, or corrupted data).
A single failed control plane is replaced, not restored. Follow the Talos disaster
recovery guide (https://docs.siderolabs.com/talos/v1.13/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery),
with a snapshot from the NAS:

```sh
gunzip -c etcd-<time>.db.gz > db.snapshot
# Check it before using it:
docker run --rm -v "$PWD":/w gcr.io/etcd-development/etcd:v3.6.14 etcdutl snapshot status /w/db.snapshot
# Then, per the guide: reset etcd on the control planes, and on one of them
talosctl -n <cp-ip> bootstrap --recover-from=./db.snapshot
```

These snapshots come from `talosctl etcd snapshot` and carry their integrity hash, so
`--recover-skip-hash-check` is not needed (it is only for a raw copy of the data dir).

## Home Assistant

In HA: Settings > System > Backups, pick a backup stored on `k8s_backups`, Restore. On a
fresh HA OS install, choose "Restore from backup" during onboarding and upload the `.tar`
from `k8s-backups/home-assistant/`. Both ask for the backup encryption key from
Bitwarden.

## Restore tests

| Date | Layer | What was done | Result |
|---|---|---|---|
| 2026-09-26 | Postgres logeverylift | Newest dump restored into a scratch `postgres:18-alpine` | 27 tables, 2441 `workout_sets`, same as live |
| 2026-09-26 | Postgres Authentik | Newest dump restored into a scratch `postgres:17-alpine` | 231 tables, 3 users, 6 applications |
| 2026-09-26 | etcd | Newest snapshot gunzipped, `etcdutl snapshot status` (3.6.14) | valid, 4029 keys, hash matches the snapshot taken |
| 2026-09-26 | VolSync | `mealie/data-pvc` restored into a new PVC in a scratch namespace | 17 files, 5.1 MB, `mealie.db` md5 identical to live |
| 2026-09-26 | Home Assistant | Archive on the NAS listed | complete: core, 8 add-ons, `protected: true` |

Repeat one layer per quarter and add a row.
