# Postgres 16 to 18: logeverylift

Runbook for moving `logeverylift`'s Postgres from `16-alpine` to `18-alpine`.
Written 2026-08-09. Expect roughly 10 minutes of downtime for the app.

The manifest change lives in its own PR so it can be merged at step 5, not
before. Merging it early takes the app down until the restore finishes.

## Why this is not just an image bump

Two things changed between 16 and 18, and both matter here.

Postgres 18 cannot read a Postgres 16 data directory. The on-disk format is
major-version specific, so the data has to be dumped out of 16 and loaded into
a freshly initialised 18 cluster.

The Docker image also moved its data directory. On 16, `PGDATA` is
`/var/lib/postgresql/data`, which is exactly where this Deployment mounts its
PVC. On 18 it is `/var/lib/postgresql/18/docker`, and the recommended layout is
to mount a single volume at the parent `/var/lib/postgresql` so future major
versions land in sibling directories and `pg_upgrade --link` stays possible.

Leaving the mount path alone and only bumping the tag does not silently lose
data — the 18 image detects the 16 cluster at the old path and refuses to
start, exiting 1 with an explanation. It is a loud failure, not a quiet one,
but it is still an outage, so the mount path moves as part of this change.

## What the database looks like

Checked against the live cluster on 2026-08-09:

- 10 MB total, 26 tables in `public`
- one login role, `postgres`
- one extension, `plpgsql` 1.0
- largest tables: `workout_sets` (1685 rows), `exercise_prs` (521),
  `program_sets` (431)

Small enough that `pg_dumpall` piped through `kubectl exec` is the right tool.
There are no migration Jobs or a backup PVC here on purpose: for 10 MB they
would be more moving parts than the thing they automate, and streaming the dump
to your own machine gives an off-cluster copy, which a PVC-based Job would not.
Keep that file — `BACKLOG.md` already records one previous dump that survives
only in a session scratchpad.

## Rollback position

The existing `postgres-pvc` is left untouched and still declared in
`postgres.yaml`. The 18 cluster initialises onto a new `postgres-pvc-18`. If
anything goes wrong, revert the manifest PR: the pod comes back on 16 against
the original PVC with the original data. Nothing in this procedure writes to
the 16 volume.

## Procedure

Set the context once. The default kubeconfig points at work AKS, not this
cluster:

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
```

### 1. Stop writes

```bash
kubectl scale deploy/logeverylift-app -n logeverylift --replicas=0
kubectl rollout status deploy/logeverylift-app -n logeverylift --timeout=60s
```

ArgoCD has `selfHeal: true`, but the Application also carries
`ignoreDifferences` on `/spec/replicas` for Deployments, with
`RespectIgnoreDifferences=true` in `syncOptions`. Scaling therefore sticks and
does not need auto-sync suspended.

The same rule cuts the other way at step 5: a synced Deployment will *not* be
scaled back up for you. Both scale-ups below are manual on purpose.

### 2. Take the dump

```bash
POD=$(kubectl get pod -n logeverylift -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n logeverylift "$POD" -- pg_dumpall -U postgres \
  > ~/logeverylift-pg16-$(date +%Y%m%d).sql
```

Check it before going any further. A truncated dump that nobody looked at is
the only way this procedure loses data:

```bash
DUMP=~/logeverylift-pg16-$(date +%Y%m%d).sql
wc -l "$DUMP"                      # expect a few thousand lines
grep -c "^CREATE TABLE" "$DUMP"    # expect 27
tail -1 "$DUMP"                    # expect: PostgreSQL database dump complete
```

Put a copy somewhere durable now, not later.

### 3. Record what the data should look like afterwards

```bash
kubectl exec -n logeverylift "$POD" -- psql -U postgres -d logeverylift_db \
  -tAc "select relname, n_live_tup from pg_stat_user_tables order by relname;" \
  | tee ~/logeverylift-rowcounts-before.txt
```

### 4. Scale Postgres down

```bash
kubectl scale deploy/postgres -n logeverylift --replicas=0
kubectl rollout status deploy/postgres -n logeverylift --timeout=60s
```

### 5. Merge the manifest PR

Merge the PR that switches `k8s/talos/apps/logeverylift/postgres.yaml` to
`postgres:18-alpine`, adds `postgres-pvc-18`, and moves the mount to
`/var/lib/postgresql`. Then let ArgoCD sync, or force it:

```bash
kubectl -n argocd annotate application logeverylift \
  argocd.argoproj.io/refresh=hard --overwrite
```

Wait for the Application to report `Synced`, then scale Postgres back up —
ArgoCD ignores `/spec/replicas`, so the sync alone leaves it at 0:

```bash
kubectl get application logeverylift -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}'
kubectl scale deploy/postgres -n logeverylift --replicas=1
kubectl rollout status deploy/postgres -n logeverylift --timeout=180s
```

Wait for the new pod to be genuinely ready before restoring — the image starts
a temporary server during initialisation and briefly rejects connections:

```bash
POD18=$(kubectl get pod -n logeverylift -l app=postgres -o jsonpath='{.items[0].metadata.name}')
until kubectl exec -n logeverylift "$POD18" -- pg_isready -U postgres 2>/dev/null | grep -q accepting; do sleep 2; done
kubectl exec -n logeverylift "$POD18" -- psql -U postgres -tAc "show data_directory;"
# expect /var/lib/postgresql/18/docker
```

### 6. Restore

```bash
kubectl exec -i -n logeverylift "$POD18" -- psql -U postgres < "$DUMP"
```

Two errors are expected and harmless:

```
ERROR:  database "logeverylift_db" already exists
ERROR:  role "postgres" already exists
```

Both objects are created by `POSTGRES_DB` and `POSTGRES_USER` before the dump
runs. Any other error is not expected — stop and roll back.

Verified ahead of time by restoring this database's actual schema into a real
18.4 server: all 26 tables came across with only those two errors.

### 7. Verify, then bring the app back

```bash
kubectl exec -n logeverylift "$POD18" -- psql -U postgres -d logeverylift_db \
  -tAc "select relname, n_live_tup from pg_stat_user_tables order by relname;" \
  > ~/logeverylift-rowcounts-after.txt
diff ~/logeverylift-rowcounts-before.txt ~/logeverylift-rowcounts-after.txt
```

`n_live_tup` comes from the statistics collector and starts at 0 on a fresh
restore until autovacuum runs, so a diff here is not proof of loss. If it looks
empty, force the counts:

```bash
kubectl exec -n logeverylift "$POD18" -- psql -U postgres -d logeverylift_db -tAc "analyze;"
kubectl exec -n logeverylift "$POD18" -- psql -U postgres -d logeverylift_db \
  -tAc "select count(*) from workout_sets;"   # expect 1685
```

Then bring the app back:

```bash
kubectl scale deploy/logeverylift-app -n logeverylift --replicas=1
kubectl rollout status deploy/logeverylift-app -n logeverylift --timeout=120s
```

Log in to logeverylift.com and confirm real workout history renders.

### 8. Afterwards

Leave `postgres-pvc` in place until you have used the app for a while. When you
are satisfied, delete the PVC declaration from `postgres.yaml` and let ArgoCD
prune it. Add a line to `BACKLOG.md` if you are not doing that immediately.

## The other Postgres 16 in this repo

`k8s/talos/apps/workout/postgres.yaml` is also on `16-alpine` and is
deliberately **not** part of this migration. Both `workout-app` and its
`postgres` are scaled to 0 and have been since the logeverylift cutover; the
namespace exists only as a rollback snapshot, and `BACKLOG.md` already tracks
deleting it.

Upgrading it would mean scaling a dormant database up, rewriting its data into
a format the thing it is a rollback *for* cannot read, and scaling it back
down. That destroys the only reason it still exists. It stays on 16 until it is
deleted, and `renovate.json` pins it so no bot proposes 18 in the meantime.
