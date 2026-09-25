# Proxmox: datacenter

Proxmox itself for hyper-cluster: the Datacenter level (notifications, backup
jobs, storage, permissions) and the node level (hyper1-3: DNS, time, hosts,
network, apt), which sit under Datacenter in the console tree. Never guests:
each VM lives in the stack that owns it (`../k8s/talos`, `../tailscale`).

What it owns today:

| File | Objects |
|---|---|
| `notifications.tf` | webhook target `alertmanager` and matcher `alertmanager-errors`: every error-severity notification (failed backups first) goes to Alertmanager, which routes `namespace="proxmox"` to Discord. The built-in `mail-to-root` target and `default-matcher` stay as they are. |
| `backup.tf` | the nightly backup job (03:00, all guests except 1000) |
| `storage.tf` | `nfs-vmstore` on the Synology |
| `nodes.tf` | DNS, timezone and apt repositories for hyper1-3 |
| `hardware.tf` | the `igpu-hyper1` PCI mapping used by `../k8s/talos` |
| `access.tf` | the Proxmox CSI user, role and ACL |

Deliberately not managed: `terraform-prov@pve` and its role (a bad apply could
remove this stack's own access), cluster options (bpg/proxmox cannot express
`allowed-tags`, the one setting there that matters), `local`/`local-lvm`
(installer defaults), network bridges (a mistake takes a node offline).

## Use

The token comes from [`../../BOOTSTRAP.md`](../../BOOTSTRAP.md), which also
gives the apply order against `../../pbs`.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
