# Upgrading Talos and Kubernetes on Genesis

Written during round 1, 2026-08-09, taking the cluster from Talos v1.11.6 / Kubernetes v1.34.0 to
Talos v1.12.11 / Kubernetes v1.35.7. The mechanics live in
`terraform/proxmox/hyper-cluster/k8s/talos/`; this is the reasoning behind them and the traps that
are not obvious from reading the HCL.

## You cannot skip a minor, and Kubernetes waits for Talos

Talos only tests migration between adjacent minor versions, so the recommended path is always
through the latest patch of each intermediate minor. Separately, each Talos minor supports only the
six Kubernetes minors counting back from its own default, which makes a Kubernetes minor
unreachable until Talos has been raised first.

| Talos | default Kubernetes |
| ----- | ------------------ |
| 1.11  | 1.34               |
| 1.12  | 1.35               |
| 1.13  | 1.36               |

Kubernetes 1.35 is simply not reachable while any node runs Talos 1.11. So v1.11.6/v1.34.0 to
v1.13.8/v1.36.3 is four steps in two rounds, in this order: Talos 1.12, Kubernetes 1.35, Talos
1.13, Kubernetes 1.36.

`talosctl` must be at least as new as the version it installs. Check with `talosctl version --client`
and `brew upgrade talosctl` between rounds.

## Four version variables, two jobs

This trips people up, so it is worth being explicit.

`talos_version` and `kubernetes_version` are **targets**: what the nodes should end up running.
They drive the installer image passed to `talosctl upgrade` and the `--to` of `talosctl upgrade-k8s`.

`talos_config_contract` and `kubernetes_config_contract` are what machine configuration is
**generated against**, and they deliberately lag during an upgrade. See the contract trap below.

`talos_secrets_contract` is separate again and pins `talos_machine_secrets`. See the secrets trap.

## The traps

### A trailing `sleep` swallowed every failure

Each upgrade block ended with `sleep 60`. Terraform's `local-exec` uses the exit code of the last
command in the script, and `sleep` always returns 0. So a failed `talosctl upgrade` on ctrl-1 was
reported as success and Terraform moved straight on to ctrl-2. `upgrade-k8s.tf` ended the same way.

Six nodes upgrading unattended with failures invisible is how one bad node becomes a cluster-wide
problem. Every provisioner now runs under `set -euo pipefail` with an explicit `bash` interpreter
and ends on a real health gate:

```bash
talosctl --talosconfig=./talosconfig health \
  --endpoints 10.3.10.30 \
  --nodes 10.3.10.30 \
  --wait-timeout 15m
```

The gate addresses the VIP, not a fixed node, so it keeps working while the node that previously
held the VIP reboots.

This gate earns its keep immediately. Right after ctrl-1 came back it sat on:

```
waiting for all control plane static pods to be running:
  missing static pods on node 10.3.10.31:
  [kube-apiserver kube-controller-manager kube-scheduler]
```

That is the window the old `sleep 60` would have run straight through, starting ctrl-2 while ctrl-1
had no API server. Two control planes down at once loses the cluster.

Note that when converting to `set -e`, `[ "$cond" = "true" ] && sleep 120` exits the script with
status 1 whenever the condition is false. It has to be written as `if ... then ... fi`.

### Lowering the secrets contract destroys the cluster

`talos_machine_secrets` used to take `talos_version` directly. The provider marks that attribute
`RequiresReplace` when the value **decreases** (`semver.Compare(plan, state) < 0`), and replacing
that resource regenerates the cluster CA, etcd certificates and service account keys. The cluster
does not survive it.

Raising is safe, so a normal upgrade is fine. The danger is the obvious recovery move: bump the
version, hit trouble, revert `terraform.tfvars`. That revert is what kills you.

It is now pinned to its own `talos_secrets_contract` and carries `prevent_destroy`, so a plan that
would replace it fails loudly instead of proceeding.

Beware that `semver.Compare` reads `v1.11` as `v1.11.0`, so pinning the contract to `"v1.11"`
against a state value of `"v1.11.6"` counts as a **decrease** and triggers the very replacement you
are trying to prevent. Pin the exact value already in state.

### `machine.install.image` drifts with the provider, not your config

Left unset, the Talos provider fills `machine.install.image` in from the Talos version the
**provider itself was built against**, not from `talos_version`. All six nodes were carrying
`ghcr.io/siderolabs/installer:v1.12.0` while actually running v1.11.6, and bumping the provider to
0.11.0 would have rewritten it to v1.13.0, two minors ahead of the cluster and past the
adjacent-minor rule.

Worse, that default points at the plain installer, not the image factory schematic. A node
reinstalling from its own config would have come back without `intel-ucode` or `qemu-guest-agent`.

It is now pinned in `config_patches`:

```hcl
install = {
  image = "factory.talos.dev/installer/${talos_image_factory_schematic.this.id}:${var.talos_version}"
}
```

A consequence worth remembering: because this field now references the shared schematic ID,
changing the schematic (adding a system extension, for example) rewrites `install.image` on all six
nodes. Out-of-band extension changes on a single node get reverted to the fleet image on that
node's next install.

### Older nodes reject a newer config contract

Raising `talos_version` regenerates machine configuration against the new Talos contract and
pushes it to nodes that are still running the old one. Going to the 1.12 contract, that config
gains `machine.install.grubUseUKICmdline`, and a v1.11.6 node refuses the whole document:

```
rpc error: code = InvalidArgument desc = unknown keys found during decoding:
machine:
    install:
        grubUseUKICmdline: true
```

The 1.12 contract also swaps `machine.features.stableHostname` for a separate `HostnameConfig`
document and drops the fields 1.12 locks (`rbac`, `apidCheckExtKeyUsage`). And because
`kubernetes_version` feeds the same data source, it would have set the kubelet image to v1.35.7
while the API server was still v1.34.0, which is a skew violation. Kubelet must never lead the
control plane.

The apply fails at the config step before any node is upgraded. Safe, but a wasted window.

This cannot be fixed by reordering. `machine_configuration_apply` feeds `machine_bootstrap`, which
feeds `cluster_kubeconfig`, which the upgrade steps depend on, so making the config wait on the
upgrades is a dependency cycle. The contracts lag instead, and are raised in a second apply once
the nodes are already on the new version.

### Still open: `grubUseUKICmdline` on GRUB nodes

These nodes boot via GRUB, not systemd-boot. Confirmed by their partition layout:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.36 get discoveredvolumes | grep -iE "EFI|BIOS|BOOT"
# sda2  partition  1.0 MB          BIOS
# sda3  partition  2.1 GB   xfs    BOOT
```

A BIOS boot partition and an xfs `BOOT` partition, no EFI partition. So `grubUseUKICmdline` is not
inert here. The provider emits `true`, but the Talos 1.12 release notes say existing installations
upgrading to 1.12 should default it to `false` to preserve the legacy command line. Pin it
explicitly in the `config_patches` install block when raising the contract to 1.12.

## Always dry run the generated config

This is the single highest-value check, and it does not touch the cluster. It is how both the
contract rejection and the installer drift were caught before an apply.

```bash
terraform plan -out=/tmp/p.tfplan
terraform show -json /tmp/p.tfplan | jq -r '
  .resource_changes[]
  | select(.address|test("machine_configuration_apply.worker.\"genesis-worker-03\""))
  | .change.after.machine_configuration' > /tmp/cfg.yaml

talosctl -e 10.3.10.30 -n 10.3.10.36 apply-config --mode=auto --dry-run --file /tmp/cfg.yaml
```

It prints the exact config diff and, crucially, whether Talos would reboot the node:

```
Dry run summary:
Applied configuration without a reboot (skipped in dry-run).
```

Do this for a worker **and** a control plane. They generate different configs, and the control
plane one carries the VIP.

## Before you start

Take these. They live outside the repo so nothing can be committed by accident, and the directory
is `chmod 700`.

```bash
B=~/Documents/homelab-backups/$(date +%F)-pre-talos-upgrade
mkdir -p "$B/machineconfigs" && chmod 700 "$B"

# etcd
talosctl -e 10.3.10.30 -n 10.3.10.31 etcd snapshot "$B/etcd-pre-upgrade.db"

# per-node machine config
for ip in 10.3.10.3{1,2,3} 10.3.10.3{4,5,6}; do
  talosctl -e 10.3.10.30 -n $ip get machineconfig v1alpha1 -o yaml > "$B/machineconfigs/$ip.yaml"
done

# cluster identity, the single most important file
./convert-secrets.sh > "$B/machine-secrets.yaml" && chmod 600 "$B/machine-secrets.yaml"

# application state
kubectl -n logeverylift exec deploy/postgres -c postgres -- \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' > "$B/logeverylift_db.sql"
kubectl -n identity exec authentik-postgresql-0 -- \
  sh -c 'PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE")" pg_dump -U authentik -d authentik --clean --if-exists' > "$B/authentik_db.sql"
```

`machine-secrets.yaml` is the one that matters most. With it the cluster identity can be rebuilt
even if the Terraform state is lost; without it, losing the state means losing the cluster. Copy it
into Bitwarden.

What you do **not** need to back up for an upgrade: PV data. The `proxmox-local` volumes are
`vm-9999-pvc-*` on `local-lvm`, owned by placeholder VMID 9999 and attached to a node only while
mounted, and the rest are on Synology NFS. Neither is part of the node disks, so a node upgrade
cannot touch them. The two Postgres dumps above cover the only irreplaceable application state, and
they are cheap.

A Proxmox VM backup covers the node OS disks, which is the only thing an upgrade writes to. A
recent one plus a fresh etcd snapshot is sufficient coverage.

If you ever do restore a control plane VM from a backup, do not let a stale member rejoin a live
quorum. Either wipe `EPHEMERAL` so it joins fresh from the surviving members, or do a full
single-node recovery from the etcd snapshot.

## Procedure

Run a baseline plan first, with versions unchanged and both flags false, so provider churn is
separated from the upgrade. Confirm no `proxmox_virtual_environment_vm` shows `must be replaced`
(that wipes Talos and etcd) and no `prevent_destroy` error on the secrets.

### Phase 1: move the nodes

Raise only the targets, leave both contracts alone:

```hcl
talos_version      = "v1.12.11"
kubernetes_version = "v1.35.7"

enable_talos_upgrade      = true
enable_kubernetes_upgrade = true
```

Plan, dry run the generated config as above, then apply. The only machine config change in this
phase is `machine.install.image`, which older nodes accept without a reboot.

### Phase 2: raise the contracts

Once every node reports the new Talos version:

```hcl
talos_config_contract      = "v1.12.11"
kubernetes_config_contract = "v1.35.7"

enable_talos_upgrade      = false
enable_kubernetes_upgrade = false
```

Dry run again before applying, and check `grubUseUKICmdline` per the open item above.

## What it actually looks like

Round 1, six nodes, sequential with a health gate between each:

| Step | Node | Duration |
| ---- | ---- | -------- |
| 1 | genesis-ctrl-01 | 3m22s |
| 2 | genesis-ctrl-02 | 3m01s |
| 3 | genesis-ctrl-03 | 2m29s |
| 4 | genesis-worker-01 | 2m21s |
| 5 | genesis-worker-02 | 2m00s |
| 6 | genesis-worker-03 | 1m36s |
| 7 | `upgrade-k8s` to v1.35.7 | ~10m |

About 15 minutes for the nodes and roughly 25 to 30 minutes end to end. Control planes take longest
because the gate waits for etcd and the three static pods to come back. Nodes reboot fast enough
that a 15-second `kubectl` poll often never catches them `NotReady`.

Only one node is ever down at a time. During each control plane reboot etcd runs on 2 of 3 members,
which still has quorum, and the VIP moves to a surviving control plane, so `kubectl` blips briefly.

`upgrade-k8s` reboots nothing. It rolls kube-apiserver on each control plane, then
kube-controller-manager, then kube-scheduler, then bumps the kubelet on every node. The kubelet
version is therefore the **last** thing to move; seeing nodes still on the old kubelet while the API
server already serves the new version is expected, not a stall.

If it appears to hang on `kube-apiserver: waiting, config version mismatch: got "1", expected "2"`,
check the real state before worrying. Terraform's log lags:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-apiserver \
  -o custom-columns='NODE:.spec.nodeName,READY:.status.containerStatuses[0].ready,IMAGE:.spec.containers[0].image'
```

## Verify

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,TALOS:.status.nodeInfo.osImage,KUBELET:.status.nodeInfo.kubeletVersion'
kubectl version -o json | jq -r '.serverVersion.gitVersion'
talosctl -e 10.3.10.30 -n 10.3.10.30 health --server=true
talosctl -e 10.3.10.30 -n 10.3.10.31,10.3.10.32,10.3.10.33 etcd members
talosctl -e 10.3.10.30 -n 10.3.10.31,10.3.10.32,10.3.10.33 service etcd
kubectl get applications -n argocd -o custom-columns='SYNC:.status.sync.status,HEALTH:.status.health.status' --no-headers | sort | uniq -c
```

On etcd, check that all three members report the **same** membership with the same IDs and no
`LEARNER` entries. Compare the IDs against the pre-upgrade snapshot: unchanged IDs mean `--preserve`
did its job and the members came back with their data rather than rejoining fresh.

## Two smaller things

`--preserve` on `talosctl upgrade` is a hidden flag and still functional. It is wired to
`client.WithUpgradePreserve()` in 1.11, 1.12 and 1.13, and is `MarkDeprecated` in 1.13 with removal
slated for Talos 1.18. Do not remove it from `upgrade-talos.tf` on the assumption that it is
vestigial.

Terraform will want to recreate `local_sensitive_file.kubeconfig` on every plan if the on-disk file
has drifted, which it does as soon as you set a default namespace. Applying resets it, so redo:

```bash
kubectl config set-context --current --namespace=argocd
```

## Round 2

Tracked in `BACKLOG.md`. Talos v1.13.8 and Kubernetes v1.36.3, same two-phase flow. Cilium v1.20.0
already supports Kubernetes up to 1.36, so the CNI is not a blocker. Upgrade `talosctl` to a v1.13.x
first. Talos 1.13 also wants the `nvidia-device-plugin` Helm chart uninstalled beforehand, which
this cluster does not run.
