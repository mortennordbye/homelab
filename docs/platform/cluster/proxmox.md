# Proxmox VE

hyper-cluster is three Proxmox VE nodes, `hyper1`, `hyper2` and `hyper3`. Proxmox itself is
configured by `terraform/proxmox/hyper-cluster/datacenter`: the Datacenter level and the node
level, which sit under Datacenter in the console tree. Guests are not part of it; each VM
belongs to the stack that creates it (`k8s/talos` for the Talos VMs, `tailscale` for the
subnet router). Proxmox Backup Server is a separate machine with its own stack
([`../backups/pbs.md`](../backups/pbs.md)).

Terraform logs in as `terraform-prov@pve`, created by hand in
`terraform/proxmox/BOOTSTRAP.md` along with the PBS tokens and the apply order.

## What the stack manages

| File | Objects |
|---|---|
| `notifications.tf` | webhook target `alertmanager` and matcher `alertmanager-errors` |
| `backup.tf` | the nightly backup job to PBS |
| `storage.tf` | storages `nfs-vmstore` and `pbs` |
| `nodes.tf` | DNS, timezone and apt repositories for hyper1-3 |
| `hardware.tf` | PCI mapping `igpu-hyper1` |
| `access.tf` | the Proxmox CSI and Prometheus exporter identities |

Notifications: every error-severity notification (failed backups, replication, fencing) is
posted to Alertmanager at `alertmanager.local.bigd.no` as `ProxmoxNotification` with
`namespace="proxmox"`, which Alertmanager routes to Discord. The alert leaves out the
Proxmox message body, since a backup's carries the whole job log and can exceed Discord's
limit. The built-in `mail-to-root` target and `default-matcher` stay as they are.
bpg/proxmox has no notification resources, so these are plain REST calls through
`Mastercard/restapi`.

Backup job: every guest except 1000 (`debian13-cloudinit`, a stopped cloud-init template), daily at 03:00, snapshot mode, zstd, to the `pbs`
storage, keeping 1 daily, 1 weekly and 1 monthly. How it fits the other backup layers:
[`../backups/README.md`](../backups/README.md).

Storage: `nfs-vmstore` is the Synology export `nas.local.bigd.no:/volume1/pve-vmstore`,
shared by all nodes, holding images, ISOs, snippets and templates. `pbs` points at the PBS
datastore `Synology` and logs in as `pve@pbs!hyper-cluster`.

Nodes: DNS search domain `local.bigd.no` with `10.3.10.1` as resolver, timezone
Europe/Oslo, the no-subscription apt repository on and both enterprise repositories off.
Without a subscription the enterprise repositories make `apt update` fail with a 401.

Hardware: `igpu-hyper1` maps hyper1's iGPU (`0000:00:02.0`) for the Talos VM that uses it
([`gpu-passthrough.md`](gpu-passthrough.md)). The Talos stack references it by name, since
the provider's raw PCI id field does not work with API token auth.

Access: `kubernetes-csi@pve` with role `CSI` is the identity of the Proxmox CSI driver; its
token lives in the cluster. `prometheus@pve` with `PVEAuditor` and token `exporter` feeds
prometheus-pve-exporter (`k8s/talos/infra/pve-exporter`); the token goes to Bitwarden as
`proxmox-exporter-token`.

Sensors: the API has no temperatures, so `sensors.tf` installs `prometheus-node-exporter`
and `lm-sensors` on each host over SSH (`ssh_user`, `ssh_password` in `terraform.tfvars`).
Prometheus scrapes `:9100` through the `proxmox-node-exporter` ScrapeConfig. The install
runs once per host; change `triggers_replace` to run it again.

CPU: `cpu.tf` installs `cpu-powersave.service` on each host, which sets the `powersave`
governor and `balance_power` energy preference at boot. Proxmox defaults to `performance`,
which holds the T-series CPUs at turbo under light load and keeps the fans loud. Fan curves
are BIOS-only on these ThinkCentres.

## Left out on purpose

- `terraform-prov@pve` and its role: a bad apply could remove the access every stack runs
  with.
- Cluster options: bpg/proxmox cannot express `allowed-tags`, the one setting there that
  matters.
- `local` and `local-lvm`: installer defaults.
- Network bridges: a mistake takes a node offline.

## Traps

- The `pbs` storage's `username` and `password` force replacement in the provider, and the
  recreate connects to PBS, so a slow or unreachable PBS leaves no storage at all. The
  password is only read at creation; a rotated token is set by editing the storage in the
  console (Datacenter, Storage, pbs), not here.
- PBS refuses a backup into a group owned by another auth ID. Changing the storage's
  username means handing the existing groups over first (`terraform/proxmox/BOOTSTRAP.md`).
