# Tailscale subnet router

A minimal Debian VM on Proxmox that joins the tailnet and advertises the LAN
(`10.3.10.0/24`), so phones and laptops on Tailscale reach Proxmox, the UniFi
console and every cluster VIP without anything installed on those targets.

Deliberately a VM outside the Kubernetes cluster: remote access must survive
cluster upgrades and outages. The UniFi WireGuard server stays as break-glass
for when Proxmox itself is down.

This root also owns tailnet-side config declaratively:

- the policy file (`tailscale_acl`): tag definitions, route auto-approval, and
  the access rules. Console edits drift and get overwritten - change it here.
- split DNS: `local.bigd.no` resolves via the LAN nameserver for tailnet clients.
- the single-use auth key the VM consumes on first boot.

## One-time bootstrap

1. In the Tailscale admin console (Access controls), add the tag owner so an
   OAuth client can be scoped to it:

   ```json
   "tagOwners": { "tag:subnet-router": ["autogroup:admin"] }
   ```

2. Create an OAuth client (Settings > Keys) with write scope on
   Keys: Auth Keys (select `tag:subnet-router`), Policy File, and DNS.
   Put the id and secret in `terraform.tfvars`.

The cloud image and cloud-init snippet land on `nfs-vmstore`, which already
serves the ISO image and Snippets content types.

## Apply

```bash
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale init
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale plan
terraform -chdir=terraform/proxmox/hyper-cluster/tailscale apply   # requires explicit approval
```

First boot takes a few minutes: apt update, Tailscale install, then
`tailscale up`. The machine appears in the admin console as `tailscale-router`
with its route already approved.

## Caveats

- The auth key lands in the tfstate and in the cloud-init snippet on Proxmox
  storage. It is single-use, tag-scoped and expires after 90 days; the state
  backend already holds far more sensitive material (Talos PKI).
- Recreating the VM after the key is consumed or expired needs a fresh key:
  `terraform apply -replace=tailscale_tailnet_key.router` together with the VM.
- Key expiry for the router's node is disabled by Tailscale automatically for
  tagged devices, so the device itself never expires.
