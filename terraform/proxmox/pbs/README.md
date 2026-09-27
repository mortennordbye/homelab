# Proxmox: Backup Server

Proxmox Backup Server at `pbs.local.bigd.no:8007`: its datastore settings, prune job,
notifications, and the ACLs of the identity Proxmox VE backs up as. PBS is a machine of its
own, not a hyper-cluster guest.

## Run

State is in the azurerm backend (`rg-tfstate-homelab`, key `proxmox/pbs.tfstate`). No
maintained provider covers PBS, so everything is REST calls through `Mastercard/restapi`,
plus `curl` in a `local-exec` for the ACLs.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` (gitignored) holds `pbs_api_token` (`terraform@pbs!terraform:<secret>`),
created in [`../BOOTSTRAP.md`](../BOOTSTRAP.md), which also gives the apply order against
`../hyper-cluster/datacenter`. `pbs_endpoint` defaults to the address above.

## Docs

[`docs/platform/backups/pbs.md`](../../../docs/platform/backups/pbs.md)
