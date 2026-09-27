# Proxmox Backup Server

Proxmox Backup Server runs at `pbs.local.bigd.no:8007` on a machine of its own, outside
hyper-cluster. It holds the whole-VM layer of the backups ([`README.md`](README.md)): the
nightly Proxmox VE job writes every guest to it. The server is configured by
`terraform/proxmox/pbs`; the Proxmox VE side (the job and the `pbs` storage) is
`terraform/proxmox/hyper-cluster/datacenter` ([`../cluster/proxmox.md`](../cluster/proxmox.md)).

## Datastore

One datastore, `Synology`, on the NFS share `10.3.10.10:/volume1/pve-backup` (2 TiB),
mounted on PBS at `/mnt/synology`. Terraform manages its schedules and notification mode
only; the path is fixed at creation.

- Garbage collection runs daily.
- The prune job `default-Synology-380f8064-0478-4` runs daily and keeps 1 daily, 1 weekly
  and 1 monthly snapshot per guest, matching the Proxmox VE job.

Garbage collection refuses to run if anything under the datastore path is unreadable by the
backup user. Nothing but PBS may write to `pve-backup`: never point a Proxmox VE storage at
that share.

## Identities

| Auth ID | Role | Created by | Used for |
|---|---|---|---|
| `terraform@pbs!terraform` | Admin on `/` | `terraform/proxmox/BOOTSTRAP.md` | this Terraform stack |
| `pve@pbs!hyper-cluster` | DatastorePowerUser on `/datastore/Synology` | `BOOTSTRAP.md`, ACL from Terraform | Proxmox VE writing and pruning backups |

A PBS token gets only what both it and its user are granted, so each role is set on the
user and on the token. The backup identity needs DatastorePowerUser, not DatastoreBackup,
because the job also prunes. PBS refuses a backup into a group owned by another auth ID;
moving backups to a new identity means handing the groups over first (the owner handover
in `BOOTSTRAP.md`).

PBS has one ACL endpoint with no per-entry path, which `restapi_object` cannot track, so
the ACLs are idempotent `PUT`s in a `terraform_data` that re-run when an entry changes.
Drift made by hand is not detected, and removing an entry from Terraform does not revoke it.

A lost token secret is regenerated in place with the call in `BOOTSTRAP.md`, which keeps the
token's ACLs; deleting and recreating the token would drop them.

## Notifications

Errors (failed garbage collection, prune, verify) go through the webhook target
`alertmanager` and matcher `alertmanager-errors` to Alertmanager as `ProxmoxNotification`
with `namespace="proxmox"` and `node="pbs"`, and from there to Discord. The built-in
`default-matcher` only matches info, so without this an error reaches nobody.

Successful backups are not reported. `pbs-backup-check` in `k8s/talos/infra/backup-check/`
catches a guest with no finished backup in 26 hours ([`README.md`](README.md)).

## Traps

PBS answers slowly while garbage collection saturates the NFS share. The provider timeout
is 120 s; the default gives up mid-write and leaves objects created but untracked.
