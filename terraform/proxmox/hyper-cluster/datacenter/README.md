# Proxmox: datacenter

Proxmox VE itself for hyper-cluster: the Datacenter level (notifications, backup job,
storage, users) and the node level for hyper1-3. Never guests; each VM lives in the stack
that owns it (`../k8s/talos`, `../tailscale`).

## Run

State is in the azurerm backend (`rg-tfstate-homelab`, key
`proxmox/hyper-cluster/datacenter.tfstate`).

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` (gitignored) holds `proxmox_api_token` and `pbs_backup_token`, both
created in [`../../BOOTSTRAP.md`](../../BOOTSTRAP.md), which also gives the apply order
against `../../pbs`.

After an apply that creates the exporter token, copy
`terraform output -raw prometheus_exporter_token` into Bitwarden as
`proxmox-exporter-token`.

## Docs

[`docs/platform/cluster/proxmox.md`](../../../../docs/platform/cluster/proxmox.md)
