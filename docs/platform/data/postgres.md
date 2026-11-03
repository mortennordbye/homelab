# Postgres for logeverylift

logeverylift keeps its data in a CloudNativePG Cluster in the `logeverylift` namespace. Authentik runs its own Postgres (`authentik-postgresql` in `identity`,
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
- Metrics come from each instance's built-in exporter through the PodMonitor
  `logeverylift-db`, plus the per-table query in the ConfigMap
  `logeverylift-db-monitoring`. They feed the Grafana Postgres dashboard.
- Alerts: `PostgresWalArchivingFailing` and `PostgresBaseBackupStale` page,
  `PostgresDown` warns when no instance is primary.

[![The app reads the logeverylift-db-app Secret that the operator generates and connects to the primary of logeverylift-db, which streams to a standby; each instance has its own NFS PVC. The primary archives WAL and nightly base backups to Garage, and a monthly test recovers a throwaway Cluster from them. A nightly pg_dump CronJob writes to the NAS, which is copied offsite to Google Drive and loaded by the monthly restore test](../../assets/diagrams/data-postgres.svg)](../../assets/diagrams/data-postgres.svg)

## Recreating the Cluster

The manifest bootstraps with a plain `initdb`, so a Cluster recreated from it starts
empty. To bring the data back, bootstrap from the archive as in
[`../backups/restore.md`](../backups/restore.md#point-in-time-logeverylift), or load a dump.

## Why a major is not a tag bump

A Postgres major cannot read the previous major's data directory, and pre-upgrade backups
cannot recover past the upgrade. `renovate.json` therefore disables Postgres major updates
repo-wide and points here.

## Major upgrade procedure (N to N+1)

CloudNativePG upgrades in place with `pg_upgrade` when `imageName` moves to a higher major.
All instances are down while it runs, the standby is re-cloned afterwards, and images must
stay on the same OS distribution. The upstream
[upgrade guide](https://cloudnative-pg.io/docs/current/postgres_upgrades) covers failure
handling; read it first, since this procedure has not been run on this Cluster yet.

1. Take a fresh dump: `kubectl -n logeverylift create job --from=cronjob/logeverylift-db-backup logeverylift-db-backup-pre-upgrade`.
2. Prepare one PR with all of these, because `pg_dump` refuses a newer server and the
   Barman plugin does not separate archives by major:
   - `imageName` in `cnpg-cluster.yaml`, and `serverName` in its `plugins` to a new value
     such as `logeverylift-db-<N+1>`, which leaves the old archive intact.
   - The image in `db-backup.yaml` and the logeverylift container in
     `k8s/talos/infra/backup-check/restore-test.yaml`.
   - `serverName` in `db-restore-test.yaml` and in the example in `restore.md`.
3. Merge it and wait for the Cluster to report healthy.
4. Take a base backup straight away, since nothing before the upgrade can recover past it:

   ```bash
   kubectl -n logeverylift create -f - <<EOF
   apiVersion: postgresql.cnpg.io/v1
   kind: Backup
   metadata:
     name: logeverylift-db-post-upgrade
   spec:
     cluster:
       name: logeverylift-db
     method: plugin
     pluginConfiguration:
       name: barman-cloud.cloudnative-pg.io
   EOF
   ```

5. Check real workout history on logeverylift.com. An hour after the base backup, run
   `logeverylift-db-restore-test` and the backup restore test by hand.
