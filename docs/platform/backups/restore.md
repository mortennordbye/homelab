# Restoring from backup

How to get each layer in [`README.md`](README.md) back.

Everything lives on the Synology share `k8s-backups` (`nas.local.bigd.no:/volume1/k8s-backups`).
If a backup file itself is damaged or deleted, restore it from a share snapshot first
(Snapshot Replication > Snapshots > `k8s-backups` > Browse), or from the Hyper Backup copy.

| Layer | Folder | Secret needed |
|---|---|---|
| Home Assistant | `home-assistant/` | HA backup encryption key (Bitwarden) |
| etcd | `etcd/etcd-<UTC time>.db.gz` | none |
| Postgres | `postgres/<database>/<db>-<UTC time>.dump` | none (the app's own DB password) |
| App volumes | `volsync/<namespace>/<pvc>/` (restic) | `volsync-restic-password` (Bitwarden) |
| Reelsmith | not on `k8s-backups`, see [Reelsmith](#reelsmith) | none |

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
4. Sonarr, Radarr, Radarr 4K and Prowlarr: if the restored database misbehaves, restore the
   newest zip from `/config/Backups/scheduled` through System > Backup in the app.

Direct restore overwrites files but does not delete ones that are not in the backup.
For a clean restore, restore into a new PVC and point the Deployment at it instead.

## Postgres

Dumps are `pg_dump --format=custom`. Restore with `pg_restore` from a pod that mounts the
dump volume and carries the label the database's network policy admits. Cilium runs in
policy audit mode, so the label is what keeps the pod working once enforcement is on.

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
Postgres of the same major version instead.

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

## Reelsmith

Reelsmith is not in VolSync. The gateway writes SQLite `VACUUM INTO` copies of its database to
`/state/backups` on the state PVC (newest 14 kept) and to the retained offsite volume, which is on
the `shared-data` share rather than `k8s-backups`: on the NAS at
`/volume1/shared-data/media/reelsmith/gateway-backups` (PVC `reelsmith-offsite-backups`, mounted
at `/offsite`). Use `/state/backups` if the state volume still exists, the offsite copy if it does
not. The cover images in `/state/covers` are not in these copies; if the claim was deleted, the
driver's `archived-` directory under `/volume1/k8s-volumes/talos` still holds them
(see [storage](../storage/README.md#deleting-a-pvc)). See the
[reelsmith page](../../apps/reelsmith/README.md).

1. Scale the gateway to zero: `kubectl -n reelsmith scale deploy/reelsmith-gateway --replicas=0`.
   ArgoCD ignores `replicas`, so this holds. If the state PVC was lost, let ArgoCD recreate it
   first; it comes back empty.
2. Start a pod that mounts both claims. The namespace enforces Pod Security `restricted`:

   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: reelsmith-restore
     namespace: reelsmith
   spec:
     securityContext:
       runAsNonRoot: true
       runAsUser: 10001
       runAsGroup: 10001
       fsGroup: 10001
       seccompProfile:
         type: RuntimeDefault
     containers:
       - name: restore
         image: busybox:1.37.0
         command: ["sleep", "3600"]
         securityContext:
           allowPrivilegeEscalation: false
           capabilities:
             drop: ["ALL"]
         volumeMounts:
           - name: state
             mountPath: /state
           - name: offsite
             mountPath: /offsite
             subPath: gateway-backups
     volumes:
       - name: state
         persistentVolumeClaim:
           claimName: reelsmith-state
       - name: offsite
         persistentVolumeClaim:
           claimName: reelsmith-offsite-backups
   ```

3. In that pod, move the live database aside with its WAL files and copy a backup in its place:

   ```sh
   ls -lt /state/backups /offsite | head          # pick one
   mkdir -p /state/pre-restore
   mv /state/gateway.sqlite3* /state/pre-restore/
   cp /offsite/<file> /state/gateway.sqlite3      # or /state/backups/<file>
   ```

4. Delete the pod and scale the gateway back to 1. Check `/healthz` and the queue at
   `https://reelsmith.local.bigd.no/admin/` before the next slot: rows the backup shows as
   `claimed` or queued may already have been published after it was taken.

## Testing

`restore-test` in `k8s/talos/infra/backup-check/` tests VolSync and Postgres every month.
etcd recovery and the Home Assistant restore are tested by hand, about once a year.
