# Upgrading Talos and Kubernetes on Genesis

How to move the cluster to a new Talos and Kubernetes version, and the traps that are not obvious
from the HCL. The mechanics live in `terraform/proxmox/hyper-cluster/k8s/talos/`
(`upgrade-talos.tf`, `upgrade-k8s.tf`, `talos-cluster.tf`).

## Version rules

Talos only tests migration between adjacent minor versions, so go through the latest patch of each
intermediate minor. Each Talos minor supports only the six Kubernetes minors counting back from its
own default, so a Kubernetes minor is unreachable until Talos has been raised first. The order is
always Talos, then Kubernetes, one minor at a time.

| Talos | default Kubernetes |
| ----- | ------------------ |
| 1.11  | 1.34               |
| 1.12  | 1.35               |
| 1.13  | 1.36               |

`talosctl` must be at least as new as the version it installs. Check with
`talosctl version --client` and run `brew upgrade talosctl` before starting.

Version sources: https://github.com/siderolabs/talos/releases and https://kubernetes.io/releases/.

## Four version variables

`talos_version` and `kubernetes_version` are targets: what the nodes should run. They drive the
installer image passed to `talosctl upgrade` and the `--to` of `talosctl upgrade-k8s`.

`talos_config_contract` and `kubernetes_config_contract` are what machine configuration is
generated against. They lag the targets during an upgrade, because the config apply runs before the
upgrade steps and older nodes reject config generated for a newer contract. Terraform cannot order
it the other way round: `machine_configuration_apply` feeds `machine_bootstrap`, which feeds
`cluster_kubeconfig`, which the upgrade steps depend on.

`talos_secrets_contract` is separate again and pins `talos_machine_secrets`.

### Raise `kubernetes_config_contract` right after `upgrade-k8s`

Machine configs render the control plane images and the kubelet at `kubernetes_config_contract`.
Once `upgrade-k8s` has moved the cluster, a contract left behind means the next apply that touches
machine config pushes the old version back and downgrades the control plane. Raise
`kubernetes_config_contract` to `kubernetes_version` immediately after `upgrade-k8s` finishes, and
before any other apply in this directory. `talos-cluster.tf` has a
`check "kubernetes_config_contract_current"` that warns on every plan while the two differ. The
warning is expected during phase 1 and nowhere else.

`talos_config_contract` stays behind on purpose; raising it is tracked in `docs/backlog/README.md`. Talos
accepts an older-contract config, so this is drift, not a fault.

## Traps

Lowering `talos_secrets_contract` destroys the cluster. The provider replaces
`talos_machine_secrets` when its version decreases, and that regenerates the cluster CA, etcd
certificates and service account keys. It is decoupled from `talos_version` so reverting a failed
upgrade is safe, and it carries `prevent_destroy` so a replacing plan fails. `semver.Compare` reads
`v1.11` as `v1.11.0`, which is lower than `v1.11.6`: pin the exact value already in state, and only
ever raise it.

`machine.install.image` is pinned in `config_patches` to the image factory schematic and
`talos_version`. Left unset, the provider fills it from the Talos version the provider was built
against, which drifts on every provider bump and points at the plain installer without the
schematic's extensions. Because it references the shared schematic ID, changing the extension list
rewrites `install.image` on all six nodes, and a one-off image on a single node is reverted to the
fleet image at its next install.

Older nodes reject a newer config contract. Raising `talos_config_contract` from 1.11 to 1.12 adds
`machine.install.grubUseUKICmdline`, and a 1.11 node refuses the whole document with
`unknown keys found during decoding`. The 1.12 contract also emits a `HostnameConfig` document that
conflicts with the static `machine.network.hostname` in `config_patches`, and these GRUB-booted
nodes need `grubUseUKICmdline` pinned to `false`. Both are part of the `docs/backlog/README.md` entry.

Never point `upgrade-k8s` at the VIP. It patches each node's machine config in turn, and patching
the node that holds the VIP re-elects it onto another control plane. talosctl keeps the dead socket
open and blocks forever. Nothing reboots during `upgrade-k8s`, so `upgrade-k8s.tf` addresses the
first control plane directly, and so does the health gate after it. The gates in
`upgrade-talos.tf` are the opposite case: nodes reboot there, so they address the VIP.

A hang looks like elapsed time climbing while CPU time stays flat. Terraform's log lags, so check
what the nodes report:

```bash
ps -o pid,etime,time,command -p <talosctl pid>
talosctl -e 10.3.10.30 -n <node ip> get machineconfig v1alpha1 -o yaml | grep -o 'kubelet:v[0-9.]*'
```

To recover, kill the hung `talosctl`, not Terraform. The non-zero exit fails the provisioner,
Terraform writes state and releases the lock, completed node upgrades stay in state, and
`null_resource.upgrade_kubernetes` is tainted so the next apply reruns only that step. Killing
Terraform instead risks a stale lock on the state blob.

Every provisioner runs under `set -euo pipefail` with an explicit bash interpreter and ends on a
`talosctl health` gate, never a `sleep`: `local-exec` takes the exit code of the last command, so a
trailing `sleep` reports a failed upgrade as success and the next node starts. Under `set -e`,
write conditionals as `if ... then ... fi`; `[ cond ] && cmd` exits the script when the condition
is false.

`--preserve` on `talosctl upgrade` is still functional. It is deprecated in Talos 1.13 with removal
slated for 1.18; do not drop it from `upgrade-talos.tf` before then.

## Dry-run the generated config

This catches contract rejections and installer drift without touching the cluster:

```bash
terraform plan -out=/tmp/p.tfplan
terraform show -json /tmp/p.tfplan | jq -r '
  .resource_changes[]
  | select(.address|test("machine_configuration_apply.worker.\"genesis-worker-03\""))
  | .change.after.machine_configuration' > /tmp/cfg.yaml

talosctl -e 10.3.10.30 -n 10.3.10.36 apply-config --mode=auto --dry-run --file /tmp/cfg.yaml
```

It prints the config diff and whether Talos would reboot the node. Do it for a worker and a control
plane (`machine_configuration_apply.controlplane."genesis-ctrl-01"` on `10.3.10.31`): they generate
different configs and only the control plane carries the VIP.

## Before you start

Keep these outside the repo, in a `chmod 700` directory.

```bash
./convert-secrets.sh > machine-secrets.yaml && chmod 600 machine-secrets.yaml
talosctl -e 10.3.10.30 -n 10.3.10.31 etcd snapshot etcd-pre-upgrade.db
```

`machine-secrets.yaml` is the cluster identity. With it the cluster can be rebuilt even if the
Terraform state is lost; copy it into Bitwarden. Take a fresh etcd snapshot even though the nightly
one exists. Database dumps and the rest of the backup layers are in
[`../backups/README.md`](../backups/README.md). PV data needs no extra backup: `proxmox-local`
volumes and Synology NFS are not on the node disks, which are the only thing an upgrade writes.

If a control plane VM is ever restored from a backup, do not let the stale member rejoin a live
quorum. Wipe `EPHEMERAL` so it joins fresh, or do a full recovery from the snapshot
([`../backups/restore.md`](../backups/restore.md)).

## Procedure

Run every step from `terraform/proxmox/hyper-cluster/k8s/talos`.

### Baseline

With versions unchanged and both upgrade flags `false`, run a plan so provider churn is separated
from the upgrade. No `proxmox_virtual_environment_vm` may show `must be replaced` (that wipes Talos
and etcd), and there must be no `prevent_destroy` error on the secrets.

### Phase 1: move the nodes

Raise only the targets in `terraform.tfvars`; leave both contracts where they are:

```hcl
talos_version      = "<new talos version>"
kubernetes_version = "<new kubernetes version>"

enable_talos_upgrade      = true
enable_kubernetes_upgrade = true
```

Plan, dry-run the generated config, then apply. The only machine config change is
`machine.install.image`, which the nodes accept without a reboot. Terraform then upgrades ctrl-01
through worker-03 one at a time, each gated on `talosctl health`, and runs `upgrade-k8s`. Only one
node is down at a time; etcd keeps quorum on two of three members and `kubectl` blips while the VIP
moves.

### Phase 2: raise the Kubernetes contract

As soon as `upgrade-k8s` has finished, before any other apply:

```hcl
kubernetes_config_contract = "<new kubernetes version>"

enable_talos_upgrade      = false
enable_kubernetes_upgrade = false
```

Plan, dry-run a worker and a control plane again, and apply. The `check` warning is gone and the
`null_resource` upgrade steps leave the graph until the next upgrade.

## Verify

A full run takes about half an hour. `upgrade-k8s` rolls kube-apiserver, kube-controller-manager
and kube-scheduler on each control plane, then the kubelet on every node, so an old kubelet next to
a new API server is normal while it runs. If it seems stuck on
`config version mismatch`, check the API server pods rather than Terraform's log:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-apiserver \
  -o custom-columns='NODE:.spec.nodeName,READY:.status.containerStatuses[0].ready,IMAGE:.spec.containers[0].image'
```

When it is done:

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,TALOS:.status.nodeInfo.osImage,KUBELET:.status.nodeInfo.kubeletVersion'
kubectl version -o json | jq -r '.serverVersion.gitVersion'
talosctl -e 10.3.10.30 -n 10.3.10.30 health --server=true
talosctl -e 10.3.10.30 -n 10.3.10.31,10.3.10.32,10.3.10.33 etcd members
kubectl get applications -n argocd -o custom-columns='SYNC:.status.sync.status,HEALTH:.status.health.status' --no-headers | sort | uniq -c
```

All three etcd members must report the same membership, with the same IDs as before the upgrade
and no `LEARNER` entries.

## Open items

Tracked in `docs/backlog/README.md`: raising `talos_config_contract`, and the next upgrade.
