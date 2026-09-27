# Data

Databases that run inside the cluster. Their backups are in
[`../backups/README.md`](../backups/README.md).

- [`postgres.md`](postgres.md): Postgres 18 behind logeverylift, its volume layout, the
  NFS ownership trap, and the procedure for a major version upgrade.

Authentik runs its own Postgres 17 (`authentik-postgresql` in `identity`), managed by
its Helm chart and dumped nightly like logeverylift's.
