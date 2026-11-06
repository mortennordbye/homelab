# Data

Databases that run inside the cluster. Their backups are in
[`../backups/README.md`](../backups/README.md).

- [`postgres.md`](postgres.md): the Postgres 18 that logeverylift uses, its volume layout,
  the NFS ownership trap, and the procedure for a major version upgrade.
- [`cloudnative-pg.md`](cloudnative-pg.md): the CloudNativePG operator, its Barman Cloud
  plugin, and Garage, the in-cluster S3 store for base backups and WAL.

Authentik runs its own Postgres 17 (`authentik-postgresql` in `identity`). Its Helm chart
manages it. A nightly dump covers it, like logeverylift's. Restoring either dump is in
 [`../backups/restore.md`](../backups/restore.md#postgres).
