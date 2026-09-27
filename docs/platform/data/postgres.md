# Postgres for logeverylift

logeverylift keeps its data in a single in-cluster Postgres in the `logeverylift`
namespace. Authentik runs its own Postgres (`authentik-postgresql` in `identity`,
deployed and managed by the Authentik Helm chart), which this doc does not cover.

## Current setup

All of it is in `k8s/talos/apps/logeverylift/postgres.yaml`:

- Deployment `postgres` (label `app=postgres`), image `postgres:18-alpine`, fronted by
  a ClusterIP Service `postgres`. The app is the Deployment `logeverylift-app`.
- `POSTGRES_DB` is `logeverylift_db` and `POSTGRES_USER` is `postgres`; the password
  comes from `logeverylift-secret`.
- Data lives on the PVC `postgres-pvc-18` (`syno-nfs-csi`), mounted at
  `/var/lib/postgresql`. The image keeps the cluster in a version-named subdirectory,
  so `PGDATA` is `/var/lib/postgresql/18/docker`.

Backups are a nightly `pg_dump` CronJob in `k8s/talos/apps/logeverylift/db-backup.yaml`
writing to the NAS, and the monthly restore test loads the newest dump into a scratch
Postgres. Schedule, retention and restores: [`../backups/README.md`](../backups/README.md).

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
