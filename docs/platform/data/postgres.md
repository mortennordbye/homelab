# Postgres for logeverylift

logeverylift keeps its data in a single in-cluster Postgres in the `logeverylift`
namespace. Authentik runs its own Postgres (`authentik-postgresql` in `identity`,
deployed and managed by the Authentik Helm chart), which this doc does not cover.
Restoring its nightly dump is in [`../backups/restore.md`](../backups/restore.md#postgres).

## Current setup

logeverylift's database is the CloudNativePG Cluster `logeverylift-db`
(`k8s/talos/apps/logeverylift/cnpg-cluster.yaml`): two instances of
`ghcr.io/cloudnative-pg/postgresql:18.6-minimal-trixie`, one primary and one
asynchronous standby, each on its own `syno-nfs-csi` PVC. The operator promotes the
standby when the primary goes away, which takes about 10 seconds; with asynchronous
replication the last few seconds of commits can be lost in a failover.

- The app connects to `logeverylift-db-rw` as the owner role `logeverylift`, with the
  `uri` from the Secret `logeverylift-db-app` that the operator generates.
- `logeverylift-db-ro` reaches the standby, `logeverylift-db-r` any instance.
- WAL is archived continuously, and a base backup is taken nightly at 23:15 UTC, to
  Garage under `s3://cnpg-logeverylift/logeverylift-db/`, kept 30 days. Garage and the
  operator: [`cloudnative-pg.md`](cloudnative-pg.md).
- The nightly `pg_dump` CronJob in `k8s/talos/apps/logeverylift/db-backup.yaml` dumps
  from `logeverylift-db-rw` to the NAS as before, and the monthly restore test loads the
  newest dump ([`../backups/README.md`](../backups/README.md)).
- `PostgresWalArchivingFailing` pages when WAL stops reaching Garage.

The previous hand-built Postgres (Deployment and Service `postgres`, PVC
`postgres-pvc-18`, `postgres-exporter`) is still declared, scaled to zero, as the
source the Cluster was imported from. The sections below describe it until it is
removed.

[![logeverylift-secret from Bitwarden gives the password to the logeverylift app, Postgres 18, the nightly pg_dump CronJob and postgres-exporter, which reads pg_stat_* for Prometheus; Postgres stores data on a syno-nfs-csi PVC whose ownership an initContainer fixes, and the dumps land on the NAS, are copied offsite to Google Drive and are loaded by the monthly restore test](../../assets/diagrams/data-postgres.svg)](../../assets/diagrams/data-postgres.svg)

## The NFS ownership trap

A freshly provisioned `syno-nfs-csi` volume grants root everything and uid 70
(postgres) nothing. Since the volume is mounted at the parent of `PGDATA`, the
entrypoint has to create `18/docker` itself, and it does that after dropping to
uid 70, so it fails with:

```
mkdir: can't create directory '/var/lib/postgresql/18/': Permission denied
```

The `fix-nfs-ownership` initContainer runs `chown 70:70` and `chmod 700` on the mount
root before Postgres starts, so a recreated PVC recovers on its own.

`fsGroup: 70` is not used because it recursively adds group write, and Postgres
refuses to start unless `PGDATA` is exactly `0700` or `0750`. The entrypoint happens
to chmod it back, but the initContainer does not depend on that.

## Why a major is not a tag bump

A Postgres major cannot read the previous major's data directory. The data has to be
dumped out of the old server and loaded into a freshly initialised new one. Bumping
only the tag makes the new image find the old cluster and exit 1.

`renovate.json` therefore disables Postgres major updates repo-wide and points here.
The backup CronJob (`db-backup.yaml`) and the logeverylift container in
`k8s/talos/infra/backup-check/restore-test.yaml` must move to the same major as the
server in the same change: `pg_dump` refuses a newer server.

## Major upgrade procedure (N to N+1)

Expect around 10 minutes of app downtime. Prepare the manifest change as its own PR:
the new image in `postgres.yaml` (initContainer and main container), a new PVC
`postgres-pvc-<N+1>` as the claim while the old PVC stays declared and untouched,
and the backup and restore-test images. Do not
merge it before step 5; merging early takes the app down until the restore finishes.

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
```

1. Stop writes. The `apps` ApplicationSet sets `ignoreDifferences` on
   `/spec/replicas` for Deployments with `RespectIgnoreDifferences=true`, so scaling
   sticks without suspending auto-sync. The same rule means ArgoCD never scales
   anything back up; every scale-up below is manual.

   ```bash
   kubectl scale deploy/logeverylift-app -n logeverylift --replicas=0
   ```

2. Dump and check it. A truncated dump nobody looked at is the only way this loses data.

   ```bash
   POD=$(kubectl get pod -n logeverylift -l app=postgres -o jsonpath='{.items[0].metadata.name}')
   DUMP=~/logeverylift-pg<N>.sql
   kubectl exec -n logeverylift "$POD" -- pg_dumpall -U postgres > "$DUMP"
   grep -c "^CREATE TABLE" "$DUMP"   # matches the table count
   tail -1 "$DUMP"                   # PostgreSQL database dump complete
   ```

   Keep a copy somewhere durable before going on.

3. Record per-table row counts.

   ```bash
   kubectl exec -n logeverylift "$POD" -- psql -U postgres -d logeverylift_db \
     -tAc "select relname, n_live_tup from pg_stat_user_tables order by relname;" \
     > ~/rowcounts-before.txt
   ```

4. Scale Postgres down: `kubectl scale deploy/postgres -n logeverylift --replicas=0`.

5. Merge the manifest PR, wait for the `logeverylift` Application to report `Synced`,
   then scale Postgres up and wait until it accepts connections (the image briefly
   runs a temporary server while initialising):

   ```bash
   kubectl scale deploy/postgres -n logeverylift --replicas=1
   NEW=$(kubectl get pod -n logeverylift -l app=postgres -o jsonpath='{.items[0].metadata.name}')
   until kubectl exec -n logeverylift "$NEW" -- pg_isready -U postgres | grep -q accepting; do sleep 2; done
   ```

6. Restore: `kubectl exec -i -n logeverylift "$NEW" -- psql -U postgres < "$DUMP"`.
   Two errors are expected, because `POSTGRES_DB` and `POSTGRES_USER` already created
   both objects: `database "logeverylift_db" already exists` and
   `role "postgres" already exists`. Any other error means stop.

7. Verify. Run `analyze;` first, since `n_live_tup` starts at 0 on a fresh restore,
   then take the same row-count query into `~/rowcounts-after.txt` and diff it against
   the before counts. Only then bring the app back with
   `kubectl scale deploy/logeverylift-app -n logeverylift --replicas=1` and check that
   real workout history renders on logeverylift.com.

8. Keep the old PVC until the new server has been used for a while and at least one
   nightly backup of it exists, then remove its declaration from `postgres.yaml` and
   let ArgoCD prune it.
