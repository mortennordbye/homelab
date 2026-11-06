# Proxmox Backup Server

Proxmox Backup Server runs at `pbs.local.bigd.no:8007` on its own machine, outside
hyper-cluster. It holds the whole-VM layer of the backups ([`README.md`](README.md)). The
nightly Proxmox VE job writes every guest to it. `terraform/proxmox/pbs` configures the
server. The Proxmox VE side (the job and the `pbs` storage) is in
`terraform/proxmox/hyper-cluster/datacenter` ([`../cluster/proxmox.md`](../cluster/proxmox.md)).

[![The nightly Proxmox VE backup job writes every guest through the pve@pbs!hyper-cluster token to the Synology datastore on PBS, which sits on the pve-backup NFS share, with daily garbage collection and prune, errors from PVE and PBS going by webhook to Alertmanager and on to Discord, and pbs-exporter reading datastore usage and snapshots with the read-only prometheus@pbs!exporter token](../../assets/diagrams/backups-pbs.svg)](../../assets/diagrams/backups-pbs.svg)

## Datastore

There is one datastore, `Synology`, on the NFS share `10.3.10.10:/volume1/pve-backup` (2 TiB),
mounted on PBS at `/mnt/synology`. Terraform manages only its schedules and notification
mode. The path is fixed at creation.

- Garbage collection runs daily.
- The prune job `default-Synology-380f8064-0478-4` runs daily and keeps 1 daily, 1 weekly
  and 1 monthly snapshot per guest, the same as the Proxmox VE job.

Garbage collection refuses to run if the datastore path holds one item that the backup user
cannot read. Only PBS may write to `pve-backup`. Never point a Proxmox VE storage at
that share.

## Identities

| Auth ID | Role | Created by | Used for |
|---|---|---|---|
| `terraform@pbs!terraform` | Admin on `/` | `terraform/proxmox/BOOTSTRAP.md` | this Terraform stack |
| `pve@pbs!hyper-cluster` | DatastorePowerUser on `/datastore/Synology` | `BOOTSTRAP.md`, ACL from Terraform | Proxmox VE writing and pruning backups |
| `prometheus@pbs!exporter` | Audit on `/` | `BOOTSTRAP.md`, ACL from Terraform | `pbs-exporter` reading datastore usage and snapshots for the SPOG Backups row |

A PBS token gets only the permissions that both the token and its user have. Each role is
therefore set on the user and on the token. The backup identity needs DatastorePowerUser,
not DatastoreBackup, because the job also prunes. PBS refuses a backup into a group that
another auth ID owns. To move backups to a new identity, transfer the groups first (the
owner handover in `BOOTSTRAP.md`).

PBS has one ACL endpoint with no per-entry path. `restapi_object` cannot track that. The
ACLs are therefore idempotent `PUT`s in a `terraform_data` that run again when an entry
changes. Terraform does not detect drift made by hand, and removing an entry from Terraform
does not revoke it.

Regenerate a lost token secret in place with the call in `BOOTSTRAP.md`. This keeps the
token's ACLs. If you delete and recreate the token, the ACLs are lost.

## Notifications

Errors (failed garbage collection, prune, verify) go through the webhook target
`alertmanager` and the matcher `alertmanager-errors` to Alertmanager as `ProxmoxNotification`
with `namespace="proxmox"` and `node="pbs"`. Alertmanager sends them on to Discord. The
built-in `default-matcher` matches info only. Without this matcher, an error reaches nobody.

Successful backups are not reported. `pbs-backup-check` in `k8s/talos/infra/backup-check/`
detects a guest with no finished backup in 26 hours ([`README.md`](README.md)).

## Traps

PBS answers slowly while garbage collection saturates the NFS share. The provider timeout
is 120 s. The default timeout stops in the middle of a write and leaves objects created but
not tracked.
