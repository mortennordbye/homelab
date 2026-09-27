# Azure Terraform State Backend

Bootstrap process to create Azure Storage for Terraform state, then migrate the state into itself.

## Prerequisites

- Terraform >= 1.9.0
- Azure CLI
- Azure subscription

## Stage 1: Create Storage

```bash
az login
az account set --subscription "xxxxxxxx"
terraform init
terraform plan
terraform apply
```

## Stage 2: Migrate to Remote State

Edit `version.tf` - comment out local backend, uncomment azurerm backend.

```bash
cp terraform.tfstate terraform.tfstate.backup
terraform init -migrate-state -backend-config=backend.conf
terraform plan  # Should show no changes
```

## Stage 3: Use in Other Projects

Add to your Terraform projects:

```terraform
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-homelab"
    storage_account_name = "sttfstatemvnhomelab"
    container_name       = "tfstate"
    key                  = "workloads/myproject/terraform.tfstate"
  }
}
```

State file paths:

- `critical/do-not-delete-state-backend.tfstate` - This backend (DO NOT DELETE)
- `proxmox/*` - Proxmox, Talos, Tailscale and PBS stacks
- `unifi/*` - UniFi network and DNS
- `cloudflare/*` - Cloudflare zones and the watchdog Worker

## Resources Created

- Resource Group: `rg-tfstate-homelab` (Sweden Central)
- Storage Account: `sttfstatemvnhomelab` (LRS, versioning enabled)
- Container: `tfstate` (private)
- Lifecycle: old versions deleted after 30 days, deleted blobs kept for 7 days

## Verify

```bash
az storage blob list --account-name sttfstatemvnhomelab --container-name tfstate --output table
terraform state pull
```

Docs: every stack's README links its docs; the layout is in [`../../../docs/architecture/README.md`](../../../docs/architecture/README.md).
