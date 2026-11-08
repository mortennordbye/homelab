# Restoring from backup

How to restore each layer in [`README.md`](README.md).

Everything is on the Synology share `k8s-backups` (`nas.local.bigd.no:/volume1/k8s-backups`).
If a backup file itself is damaged or deleted, first restore it from a share snapshot
(Snapshot Replication > Snapshots > `k8s-backups` > Browse) or from the Hyper Backup copy.

| Layer | Folder | Secret needed |
|---|---|---|
| Home Assistant | `home-assistant/` | HA backup encryption key (Bitwarden) |
| etcd | `etcd/etcd-<UTC time>.db.gz` | none |
| Postgres | `postgres/<database>/<db>-<UTC time>.dump` | none (the app's own DB password) |
| App volumes | `volsync/<namespace>/<pvc>/` (restic) | `volsync-restic-password` (Bitwarden) |
| Reelsmith | not on `k8s-backups`, see [Reelsmith](#reelsmith) | none |

## App volume (VolSync)

This restores a PVC in place from its restic repository. The repository Secret
`<pvc>-restic` already exists in the app's namespace.

1. Scale the app to zero so that nothing writes to the volume:
   `kubectl -n <ns> scale deploy/<app> --replicas=0`. For a KEDA app, first pause the
   ScaledObject with the `autoscaling.keda.sh/paused: "true"` annotation.
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
       moverSecurityContext:
         seccompProfile:
           type: RuntimeDefault
       moverResources:
         requests:
           cpu: 50m
           memory: 128Mi
         limits:
           memory: 1Gi
       # Optional: an older point in time instead of the newest backup.
       # restoreAsOf: "2026-09-20T00:00:00Z"
       moverVolumes:
         - mountPath: repo
           volumeSource:
             nfs:
               server: nas.local.bigd.no
               path: /volume1/k8s-backups/volsync
   ```

3. Wait until `kubectl -n <ns> get replicationdestination <pvc>-restore` shows a
   `lastSyncTime`. Then delete the ReplicationDestination and scale the app back up.
4. Sonarr, Radarr, Radarr 4K and Prowlarr: if the restored database does not work correctly,
   restore the newest zip from `/config/Backups/scheduled` through System > Backup in the app.

Direct restore overwrites files, but it does not delete files that are not in the backup.
For a clean restore, restore into a new PVC and point the Deployment at that PVC instead.

## Postgres

Dumps are `pg_dump --format=custom`. Restore with `pg_restore` from a pod that mounts the
dump volume and carries the label that the database's network policy admits. Cilium drops
connections from any other pod.

| Database | Namespace | Dump PVC | Image | Host / user / db | Label the policy admits |
|---|---|---|---|---|---|
| logeverylift | `logeverylift` | `logeverylift-db-backup` | `postgres:18-alpine` | `logeverylift-db-rw` / `logeverylift` / `logeverylift_db` | `app: postgres-backup` |
| Authentik | `identity` | `authentik-db-backup` | `postgres:17-alpine` | `authentik-postgresql` / `authentik` / `authentik` | `app.kubernetes.io/instance: authentik` |

1. Scale the app (not the database) to zero.
2. Start a pod in the namespace with the label from the table, the dump PVC mounted
   read-only at `/backup`, and `PGHOST`, `PGUSER`, `PGDATABASE` and `PGPASSWORD`
   (from `logeverylift-db-app/password` or `authentik-secrets/postgres-password`).
   Use the CronJob in `db-backup.yaml` as the model.
3. In that pod:

   ```sh
   ls -t /backup/*.dump | head          # pick one
   pg_restore --clean --if-exists --no-owner --dbname="$PGDATABASE" /backup/<file>.dump
   ```

4. Delete the pod and scale the app back up.

To inspect a dump without a change to the live database, restore it into a temporary
Postgres of the same major version instead.

### Point in time (logeverylift)

`logeverylift-db` can be restored to any moment since its oldest base backup in Garage
(30 days), from the base backups and WAL. Recovery always builds a new Cluster. It never
rewinds the running one.

1. Pick the target in UTC, before the damage (`2026-11-02T08:15:00Z`).
2. Add a Cluster with a new name to `k8s/talos/apps/logeverylift/`. Give it the same spec as
   `logeverylift-db`, but bootstrap it from the archive. Merge it:

   ```yaml
   bootstrap:
     recovery:
       source: logeverylift-db
       recoveryTarget:
         targetTime: "2026-11-02T08:15:00Z"
   externalClusters:
     - name: logeverylift-db
       plugin:
         name: barman-cloud.cloudnative-pg.io
         parameters:
           barmanObjectName: garage
           serverName: logeverylift-db
   ```

   Leave `plugins` out, or give it a new `serverName`, so that the restored Cluster never
   archives into the source's prefix. Omit `recoveryTarget` to replay all archived WAL.
3. When it is healthy, check the data with `psql` in its `-1` pod. Then point the app's
   `DATABASE_URL` at the new Cluster's `-app` Secret. For a partial repair, dump from the
   new Cluster into the live one instead.

If Garage itself is lost, first restore `garage-data` from VolSync
([`../data/cloudnative-pg.md`](../data/cloudnative-pg.md#restoring-garage-itself)).

## etcd

Only for a lost etcd quorum (two of three control planes gone, or corrupted data).
A single failed control plane is replaced, not restored. Follow the Talos disaster
recovery guide (https://docs.siderolabs.com/talos/v1.13/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery)
with a snapshot from the NAS:

```sh
gunzip -c etcd-<time>.db.gz > db.snapshot
# Check it before using it:
docker run --rm -v "$PWD":/w gcr.io/etcd-development/etcd:v3.6.14 etcdutl snapshot status /w/db.snapshot
# Then, per the guide: reset etcd on the control planes, and on one of them
talosctl -n <cp-ip> bootstrap --recover-from=./db.snapshot
```

These snapshots come from `talosctl etcd snapshot` and carry their integrity hash.
`--recover-skip-hash-check` is therefore not needed. That flag is only for a raw copy of
the data dir.

## Home Assistant

In HA: Settings > System > Backups, select a backup stored on `k8s_backups`, Restore. On a
new HA OS install, select "Restore from backup" during onboarding and upload the `.tar`
from `k8s-backups/home-assistant/`. Both ask for the backup encryption key from
Bitwarden.

## Reelsmith

Reelsmith is not in VolSync. The gateway writes SQLite `VACUUM INTO` copies of its database to
`/state/backups` on the state PVC (newest 14 kept) and to the retained offsite volume. The
offsite volume is on the `shared-data` share, not on `k8s-backups`: on the NAS at
`/volume1/shared-data/media/reelsmith/gateway-backups` (PVC `reelsmith-offsite-backups`, mounted
at `/offsite`). Use `/state/backups` if the state volume still exists. Use the offsite copy if it
does not. The cover images in `/state/covers` are not in these copies. If the claim was deleted,
the driver's `archived-` directory under `/volume1/k8s-volumes/talos` still holds them
(see [storage](../storage/README.md#deleting-a-pvc)). See the
[reelsmith page](../../apps/reelsmith/README.md).

1. Scale the gateway to zero: `kubectl -n reelsmith scale deploy/reelsmith-gateway --replicas=0`.
   ArgoCD ignores `replicas`, so the scale stays at zero. If the state PVC was lost, let ArgoCD
   recreate it first. It comes back empty.
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

3. In that pod, move the live database and its WAL files out of the way, then copy a backup into its place:

   ```sh
   ls -lt /state/backups /offsite | head          # pick one
   mkdir -p /state/pre-restore
   mv /state/gateway.sqlite3* /state/pre-restore/
   cp /offsite/<file> /state/gateway.sqlite3      # or /state/backups/<file>
   ```

4. Delete the pod and scale the gateway back to 1. Check `/healthz` and the queue at
   `https://reelsmith.local.bigd.no/admin/` before the next slot. Rows that the backup shows as
   `claimed` or queued may already have been published after the backup was taken.

## Loss of the NAS

Use this procedure when the NAS and its local snapshots are gone. The only remaining copy
of `k8s-backups` is the Hyper Backup copy on Google Drive, up to one day old.

Lost with the NAS and not restorable: the media, the PBS datastore with the whole-VM
backups, and everything on `shared-data` that has no other copy. Terraform rebuilds the
VMs, and the Talos VMs and `proxmox-local` volumes stay on the Proxmox hosts.

Have these ready before you start:

| Item | Where |
|---|---|
| Hyper Backup encryption key | Must be a copy outside the NAS. Without it the Google Drive copy cannot be read |
| Google account that holds the copy | Bitwarden vault |
| `volsync-restic-password` | Bitwarden, Homelab project |
| Home Assistant backup encryption key | Bitwarden |
| Terraform and Talos local files | The laptop. The zip on `shared-data` is lost with the NAS |

1. Install the replacement NAS with the same address, `10.3.10.10`, so that
   `nas.local.bigd.no` and every PV stay valid.
2. Create the shares `k8s-volumes` and `shared-data`, and `k8s-backups` with the settings in
   [Configured outside Git](README.md#configured-outside-git). Add the NFS rules. Create the
   folder `talos` in `k8s-volumes`.
3. Install Hyper Backup, connect the Google Drive task, enter the encryption key and
   restore `k8s-backups`. Check that `etcd/`, `postgres/` and `volsync/` are present.
4. Create the folder of every dynamic volume under `/volume1/k8s-volumes/talos`. A mount
   fails when its folder does not exist. This command prints the list:

   ```sh
   kubectl get pv -o json | jq -r '.items[] | select(.spec.storageClassName == "syno-nfs-csi") | .spec.csi.volumeAttributes.subDir'
   ```

5. Create the target folders of the static PVs in the
   [storage table](../storage/README.md#static-nfs-volumes).
6. Restart the pods that hang on the old mounts. If a pod stays in `ContainerCreating`,
   reboot its node from Proxmox.
7. Restore the data in this order, because later steps depend on earlier ones:
   1. Authentik database, so that sign-in works ([Postgres](#postgres)).
   2. `garage/garage-data`, because it holds the logeverylift WAL and base backups
      ([App volume](#app-volume-volsync)).
   3. logeverylift, from Garage ([Point in time](#point-in-time-logeverylift)).
   4. Every other volume in [Coverage](README.md#coverage).
8. Rebuild PBS with `terraform/proxmox/pbs`. Its old backups do not come back.
9. Point Home Assistant at the `k8s_backups` network storage again.
10. Let the nightly jobs run, then check the `Backups` row in the SPOG.

## Testing

`restore-test` in `k8s/talos/infra/backup-check/` tests VolSync and Postgres every month.
etcd recovery and the Home Assistant restore are tested by hand, about once a year.
The [NAS loss](#loss-of-the-nas) procedure and a restore from Google Drive have not been tested.
