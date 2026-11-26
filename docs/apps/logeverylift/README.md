# logeverylift

logeverylift is a workout tracking app for the phone. It is an own app built with Next.js,
PostgreSQL and Drizzle in its own repo,
[mortennordbye/logeverylift](https://github.com/mortennordbye/logeverylift), and it runs at
[logeverylift.com](https://logeverylift.com/).

## Where it runs

- Namespace `logeverylift`, one app pod `logeverylift-app` from
  `ghcr.io/mortennordbye/logeverylift`.
- Public gateway. The `cloudflare-only` middleware refuses requests that do not come
  through Cloudflare ([`../../platform/network/cloudflare.md`](../../platform/network/cloudflare.md)).
- Data: the CloudNativePG Cluster `logeverylift-db`, one primary and one replica
  ([`../../platform/data/postgres.md`](../../platform/data/postgres.md)).
- Secrets come from Bitwarden through an `ExternalSecret`
  ([`../../platform/secrets/README.md`](../../platform/secrets/README.md)).

## Backups

A nightly `pg_dump` goes to the NAS. CloudNativePG also takes a base backup and archives WAL
continuously to Garage, so the database can go back to a point in time. A restore test runs
on the 1st of each month ([`../../platform/backups/README.md`](../../platform/backups/README.md),
[`../../platform/backups/restore.md`](../../platform/backups/restore.md)).

## Deploy

CI in the app repo builds the image. Kargo promotes a new tag to prod through a pull request,
and `kargo-automerge` merges it
([`../../platform/delivery/kargo.md`](../../platform/delivery/kargo.md)).

The manifests are in [`k8s/talos/apps/logeverylift/`](../../../k8s/talos/apps/logeverylift/).
