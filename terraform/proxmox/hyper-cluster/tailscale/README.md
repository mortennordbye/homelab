# Tailscale subnet router

The `tailscale-router` VM on hyper1 that advertises the LAN to the tailnet, and the
tailnet-side config: the policy file, split DNS for `local.bigd.no`, and the auth key the VM
joins with. The policy is owned here; console edits are drift and get overwritten.

## Run

State is in the azurerm backend (`rg-tfstate-homelab`, key
`proxmox/hyper-cluster/tailscale.tfstate`).

`terraform.tfvars` (gitignored, copy from `terraform.tfvars.example`) holds:

- `proxmox_api_token`: the `terraform-prov@pve` token from [`../../BOOTSTRAP.md`](../../BOOTSTRAP.md).
- `proxmox_ssh_password`: the node's root password, since the cloud-init snippet uploads over
  SSH; empty means the SSH agent is used.
- `tailscale_oauth_client_id` and `tailscale_oauth_client_secret`: an OAuth client with write
  scope on Auth Keys (`tag:subnet-router`), Policy File and DNS.

On a fresh tailnet, add `tag:subnet-router` to `tagOwners` in the console policy before
creating the OAuth client, then import the policy, since the provider will not overwrite a
non-default one:

```bash
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale init
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale import tailscale_acl.tailnet acl
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale plan
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale apply
```

Rebuilding the VM after its single-use key is consumed or expired needs a new key in the
same apply: `terraform apply -replace=tailscale_tailnet_key.router`.

## Docs

[`docs/platform/network/remote-access.md`](../../../../docs/platform/network/remote-access.md)
