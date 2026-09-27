# Remote access: Tailscale, with WireGuard as break-glass

Remote access to the homelab runs over Tailscale. Nothing listens on the WAN
for it: every device makes outbound connections to the tailnet, and a small
subnet-router VM on Proxmox advertises the LAN. The UniFi gateway's built-in
WireGuard server is kept as the break-glass path for when Proxmox itself is
down — it is the only remaining inbound port, and it is used for nothing else.

```
phone / laptop (anywhere)
      │  outbound WireGuard, NAT-traversed
      ▼
  tailnet nordbye.it ────────────────────▶ tailscale-router VM (10.3.10.40)
      │                                      Proxmox, vmid 140
      │ advertises 10.3.10.0/24              outside the k8s cluster
      ▼
  UniFi gw .1 · Proxmox nodes .1x · Talos .31-.36 · VIPs .30 / .100-.103

break-glass: WireGuard server on the UniFi gateway (WAN UDP port)
```

Everything is declared in `terraform/proxmox/hyper-cluster/tailscale/`:

- the router VM itself — Debian 13 genericcloud image, cloud-init installs
  Tailscale and joins with a single-use auth key minted in the same plan;
- the entire tailnet policy file (`tailscale_acl`): tag definitions, an
  `autoApprovers` rule so the advertised route comes up approved with no
  console click, the access rules, and the Tailscale SSH rule. The resource
  owns the whole file, so policy changes happen in Terraform — a console edit
  is drift and gets overwritten on the next apply;
- split DNS: `local.bigd.no` resolves via the UniFi gateway for tailnet
  clients, so internal hostnames work remotely.

The VM deliberately lives outside the Kubernetes cluster. The cluster is a
moving target (Talos upgrades, node rebuilds), and remote access must work
precisely when it is mid-upgrade or broken. For the same reason the Tailscale
Kubernetes operator was considered and rejected as the router; it remains an
option later for exposing individual Services by tailnet name.

## What could not be declared

- The tailnet itself: created interactively at signup (identity
  `morten@nordbye.it`). Tailscale has no email accounts; the tailnet hangs off
  an identity provider, so that provider's MFA hygiene is network security.
- A one-time `tagOwners` bootstrap: `tag:subnet-router` had to exist in the
  policy before an OAuth client could be scoped to it. After that, the policy
  was imported (`terraform import tailscale_acl.tailnet acl` — the provider
  refuses to overwrite a non-default policy) and Terraform owns it.
- The OAuth client (Trust credentials in the admin console) with write scope
  on Auth Keys (`tag:subnet-router`), Policy File and DNS. Its id and secret
  live only in the root's gitignored `terraform.tfvars`.
- The cloud-init snippet upload goes over SSH, not the Proxmox API, and the
  bpg provider only takes ssh-agent keys or an explicit password. The hyper
  nodes do not trust the laptop's key, so `proxmox_ssh_password` is set in
  `terraform.tfvars`.

An LXC instead of a VM was ruled out: Tailscale needs `/dev/net/tun` passed
through, which is a raw `lxc.*` config line the bpg provider cannot declare
(bpg/terraform-provider-proxmox#1801).

## Operations

- Recreating the VM: the join key is single-use and expires after 90 days, so
  a rebuild needs `terraform apply -replace=tailscale_tailnet_key.router`
  alongside the VM. Tagged devices themselves never key-expire.
- The image and snippet live on `nfs-vmstore` (shared, already serves the ISO
  and Snippets content types), so the VM is not pinned to one node's storage.
- Break-glass discipline: keep a WireGuard profile installed on the phone and
  test it occasionally from cellular — a fallback that has rotted is not one.
- Tailnet lock is not enabled. It would make a hijacked Tailscale account
  unable to add devices silently, but every Terraform-created node would then
  need a manual `tailscale lock sign` from a trusted device before it works.
  Revisit if the tailnet ever gets more users than one.
