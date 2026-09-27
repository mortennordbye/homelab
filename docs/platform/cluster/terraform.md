# Terraform

Terraform manages what sits around the cluster: Proxmox, the Talos VMs, PBS, the Tailscale
router, UniFi and Cloudflare. Each stack is its own root with its own state, run by hand
from a laptop. Argo CD takes over once the Talos stack has installed it.

## Stacks

| Root | Manages | State key |
|---|---|---|
| [`azure/state`](../../../terraform/azure/state/README.md) | the storage account that holds every other stack's state | `critical/do-not-delete-state-backend.tfstate` |
| [`proxmox/hyper-cluster/datacenter`](../../../terraform/proxmox/hyper-cluster/datacenter/README.md) | Proxmox VE Datacenter and node level ([`proxmox.md`](proxmox.md)) | `proxmox/hyper-cluster/datacenter.tfstate` |
| [`proxmox/hyper-cluster/k8s/talos`](../../../terraform/proxmox/hyper-cluster/k8s/talos/README.md) | the six Talos VMs, machine config, Cilium and the first Argo CD install ([`talos.md`](talos.md)) | `proxmox/hyper-cluster/talos-genesis.tfstate` |
| [`proxmox/hyper-cluster/tailscale`](../../../terraform/proxmox/hyper-cluster/tailscale/README.md) | the subnet router VM and the tailnet policy ([`remote-access.md`](../network/remote-access.md)) | `proxmox/hyper-cluster/tailscale.tfstate` |
| [`proxmox/pbs`](../../../terraform/proxmox/pbs/README.md) | Proxmox Backup Server ([`pbs.md`](../backups/pbs.md)) | `proxmox/pbs.tfstate` |
| [`unifi/network`](../../../terraform/unifi/network/README.md) | the UniFi site ([`unifi.md`](../network/unifi.md)) | `unifi/network.tfstate` |
| [`unifi/dns`](../../../terraform/unifi/dns/README.md) | `local.bigd.no` records ([`dns.md`](../network/dns.md)) | `unifi/dns.tfstate` |
| [`cloudflare/nordbye-it`](../../../terraform/cloudflare/nordbye-it/README.md), [`bigd-no`](../../../terraform/cloudflare/bigd-no/README.md), [`logeverylift-com`](../../../terraform/cloudflare/logeverylift-com/README.md) | the three public zones ([`cloudflare.md`](../network/cloudflare.md)) | `cloudflare/<stack>.tfstate` |
| [`cloudflare/watchdog`](../../../terraform/cloudflare/watchdog/README.md) | the watchdog Worker | `cloudflare/watchdog.tfstate` |

The Proxmox tokens the Proxmox and PBS stacks log in with, and the order to apply
`pbs` and `datacenter` in, are created by hand in
[`BOOTSTRAP.md`](../../../terraform/proxmox/BOOTSTRAP.md).

## State backend

State lives in Azure: resource group `rg-tfstate-homelab`, storage account
`sttfstatemvnhomelab`, container `tfstate`, with blob versioning on
([`main.tf`](../../../terraform/azure/state/main.tf)). Every other root names these in a
`backend "azurerm"` block with its own `key`. `azure/state` stores its own state in the
same container through an empty `backend "azurerm" {}` filled from a gitignored
`backend.conf` ([`version.tf`](../../../terraform/azure/state/version.tf)); its README has
the two-stage bootstrap.

The backend blocks carry no credentials, so the `azurerm` backend authenticates with
whatever Azure CLI login the shell has; the `azurerm` provider in `azure/state` sets
`use_cli = true` for the same reason. That login (`az login`, in the
[`azure/state` README](../../../terraform/azure/state/README.md)) is done by hand before
running Terraform; nothing in the repo automates it.

## Local files

Git holds a `terraform.tfvars.example` for every stack but `azure/state`; the real values are gitignored
(`*.tfvars`, `backend.conf`, `kubeconfig`, `talosconfig` in
[`.gitignore`](../../../.gitignore)) and exist only on the laptop that runs Terraform.

| Stack | Needs | Writes |
|---|---|---|
| `azure/state` | `terraform.tfvars` (`subscription_id`), `backend.conf` | |
| `proxmox/hyper-cluster/datacenter` | `terraform.tfvars` (`proxmox_api_token`, `pbs_backup_token`) | |
| `proxmox/hyper-cluster/k8s/talos` | `terraform.tfvars` (Proxmox token, nodes, versions) | `kubeconfig`, `talosconfig` |
| `proxmox/hyper-cluster/tailscale` | `terraform.tfvars` (Proxmox token, SSH password, Tailscale OAuth client) | |
| `proxmox/pbs` | `terraform.tfvars` (`pbs_api_token`) | |
| `unifi/network`, `unifi/dns` | `terraform.tfvars` (`unifi_api_key`; network also the Wi-Fi passphrases and DDNS tokens) | |
| `cloudflare/*` | `terraform.tfvars` (`cloudflare_api_token`) | |
| `cloudflare/watchdog` | also `account_id` in `terraform.tfvars`, and `BW_ACCESS_TOKEN` and `BW_ORGANIZATION_ID` in the shell for the Bitwarden provider | |

The Talos stack's `kubeconfig` and `talosconfig` are the cluster's admin credentials.
[`convert-secrets.sh`](../../../terraform/proxmox/hyper-cluster/k8s/talos/convert-secrets.sh)
turns the stack's `talos_secrets` output into a talosctl secrets bundle.

## Backing up the local files

[`scripts/backup-secrets.sh`](../../../scripts/backup-secrets.sh) zips the paths listed in
[`.backup-manifest`](../../../.backup-manifest) and between the `# backup:start` and
`# backup:end` markers in `.gitignore`, and copies the zip over SMB to the NAS share
`shared-data` under `documents/IT/Repo-Hidden-Files-Backups/Homelab/`, keeping the newest
14. Only paths are in the repo, never contents. The manifest lists the Talos `kubeconfig`,
`talosconfig` and `controlplane.yaml`, every stack's `terraform.tfvars`, and
`azure/state/backend.conf`. A new stack's gitignored files need a line there.

```sh
scripts/backup-secrets.sh --list      # what would be backed up, and what is missing
scripts/backup-secrets.sh --dry-run   # build the zip locally, no upload
scripts/backup-secrets.sh             # prompts for the NAS login, uploads, verifies
```

Restore is `unzip <file>.zip` at the repo root. Where it sits among the other backups:
[`../backups/README.md`](../backups/README.md).

## CI

[`ci-terraform.yaml`](../../../.github/workflows/ci-terraform.yaml) runs on pull requests
and pushes to `main` that touch `terraform/`: `terraform fmt -check -recursive`, then
`init -backend=false` and `validate` in every directory that holds a `.tf` file, so a new
root is covered without editing the workflow. It has no credentials and never reads state;
`plan` and `apply` stay on the laptop, since the Proxmox and UniFi APIs are LAN-only.
