# Proxmox: Backup Server

Proxmox Backup Server at `pbs.local.bigd.no:8007`, a machine of its own and not
a hyper-cluster guest. One datastore, `Synology`, on the NFS share
`10.3.10.10:/volume1/pve-backup` (2 TiB).

| File | Objects |
|---|---|
| `datastore.tf` | datastore config (daily garbage collection) and the daily prune job |
| `access.tf` | DatastorePowerUser on the datastore for `pve@pbs!hyper-cluster`, the identity Proxmox VE backs up as (the user and token come from `../BOOTSTRAP.md`) |
| `notifications.tf` | webhook target `alertmanager` and matcher `alertmanager-errors`: every error goes to Discord via Alertmanager |

Plain REST calls through `Mastercard/restapi`: no maintained provider covers
PBS.

## Use

The token comes from [`../BOOTSTRAP.md`](../BOOTSTRAP.md), which also gives the
apply order against `../hyper-cluster/datacenter`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
