#!/usr/bin/env bash
#
# reelsmith-stale-claims.sh — list the queue rows behind ReelsmithClaimAbandoned.
#
# Read-only: opens the gateway's SQLite with mode=ro, so it is safe while the
# gateway is running and never changes a row. Resolving a claim stays a manual
# decision in the admin panel (https://reelsmith.local.bigd.no/admin/).
#
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-$HOME/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig}"

kubectl -n reelsmith exec -i deploy/reelsmith-gateway -- python - <<'PY'
import sqlite3

conn = sqlite3.connect("file:/state/gateway.sqlite3?mode=ro", uri=True)
conn.row_factory = sqlite3.Row
rows = conn.execute(
    "SELECT * FROM queued_posts WHERE state = 'claimed' ORDER BY id"
).fetchall()
if not rows:
    print("No claimed rows.")
for row in rows:
    print("---")
    for key in row.keys():
        if key != "caption":
            print(f"{key:15} {row[key]}")
PY
