# Upgrading Talos and Kubernetes on Genesis

This page shows how to move the cluster to a new Talos and Kubernetes version. It also lists the
traps that the HCL does not show. The mechanics are in `terraform/proxmox/hyper-cluster/k8s/talos/`
(`upgrade-talos.tf`, `upgrade-k8s.tf`, `talos-cluster.tf`).

## Version rules

Talos tests migration only between adjacent minor versions. Go through the latest patch of each
intermediate minor. Each Talos minor supports only six Kubernetes minors, counted back from its own
default. A Kubernetes minor is out of reach until Talos is raised first. The order is always Talos,
then Kubernetes, one minor at a time.

| Talos | default Kubernetes |
| ----- | ------------------ |
| 1.11  | 1.34               |
| 1.12  | 1.35               |
| 1.13  | 1.36               |
| 1.14  | 1.37               |

`talosctl` must be at least as new as the version it installs. Check with
`talosctl version --client`. Run `brew upgrade talosctl` before you start.

Version sources: https://github.com/siderolabs/talos/releases and https://kubernetes.io/releases/.

## Four version variables

`talos_version` and `kubernetes_version` are targets. They state what the nodes must run. They set
the installer image that `talosctl upgrade` gets and the `--to` of `talosctl upgrade-k8s`.

`talos_config_contract` and `kubernetes_config_contract` set the version that the machine
configuration is generated for. They stay behind the targets during an upgrade. The config apply
runs before the upgrade steps, and older nodes reject config generated for a newer contract.
Terraform cannot run them in the other order: `machine_configuration_apply` feeds
`machine_bootstrap`, which feeds `cluster_kubeconfig`, and the upgrade steps depend on that.

`talos_secrets_contract` is a separate variable. It pins `talos_machine_secrets`.

### Raise `kubernetes_config_contract` right after `upgrade-k8s`

Machine configs render the control plane images and the kubelet at `kubernetes_config_contract`.
After `upgrade-k8s` has moved the cluster, an old contract is a trap. The next apply that touches
machine config pushes the old version back and downgrades the control plane. Raise
`kubernetes_config_contract` to `kubernetes_version` immediately after `upgrade-k8s` finishes,
before any other apply in this directory. `talos-cluster.tf` has a
`check "kubernetes_config_contract_current"` that warns on every plan while the two differ. The
warning is expected in phase 1 only.

`talos_config_contract` stays behind by design. The work to raise it is tracked in
`docs/backlog/README.md`. Talos accepts a config from an older contract, so this is drift, not a
fault.

## Traps

A lower `talos_secrets_contract` destroys the cluster. The provider replaces
`talos_machine_secrets` when its version decreases. That regenerates the cluster CA, the etcd
certificates and the service account keys. The variable is separate from `talos_version`, so a
revert of a failed upgrade is safe. It carries `prevent_destroy`, so a plan that replaces it fails.
`semver.Compare` reads `v1.11` as `v1.11.0`, which is lower than `v1.11.6`. Pin the exact value
that is already in state, and only raise it.

`machine.install.image` is pinned in `config_patches` to the image factory schematic and
`talos_version`. If it is not set, the provider fills it from the Talos version it was built with.
That value drifts on every provider bump and points at the plain installer without the schematic's
extensions. The pin references the shared schematic ID. A change to the extension list therefore
rewrites `install.image` on all six nodes, and a one-off image on a single node reverts to the
fleet image at its next install.

Older nodes reject a newer config contract. A raise of `talos_config_contract` from 1.11 to 1.12
adds `machine.install.grubUseUKICmdline`. A 1.11 node then refuses the whole document with
`unknown keys found during decoding`. The 1.12 contract also emits a `HostnameConfig` document. It
conflicts with the static `machine.network.hostname` in `config_patches`. These nodes boot with
GRUB and need `grubUseUKICmdline` pinned to `false`. Both items are part of the
`docs/backlog/README.md` entry.

Never point `upgrade-k8s` at the VIP. It patches the machine config of each node in turn. A patch
to the node that holds the VIP re-elects the VIP onto another control plane. talosctl keeps the
dead socket open and blocks forever. Nothing reboots during `upgrade-k8s`, so `upgrade-k8s.tf`
addresses the first control plane directly. The health gate after it does the same. The gates in
`upgrade-talos.tf` are the opposite case. Nodes reboot there, so the gates address the VIP.

A hang shows as elapsed time that increases while CPU time stays flat. The Terraform log lags, so
check what the nodes report:

```bash
ps -o pid,etime,time,command -p <talosctl pid>
talosctl -e 10.3.10.30 -n <node ip> get machineconfig v1alpha1 -o yaml | grep -o 'kubelet:v[0-9.]*'
```

To recover, kill the hung `talosctl`, not Terraform. The non-zero exit fails the provisioner.
Terraform writes state and releases the lock. Completed node upgrades stay in state. Terraform
taints `null_resource.upgrade_kubernetes`, so the next apply reruns only that step. If you kill
Terraform instead, the state blob can keep a stale lock.

Every provisioner runs under `set -euo pipefail` with an explicit bash interpreter. Each one ends
on a `talosctl health` gate, never on a `sleep`. `local-exec` takes the exit code of the last
command. A trailing `sleep` therefore reports a failed upgrade as success, and the next node
starts. Under `set -e`, write conditionals as `if ... then ... fi`. The form `[ cond ] && cmd`
exits the script when the condition is false.

`--preserve` on `talosctl upgrade` still works. Talos 1.13 deprecates it, and Talos plans to
remove it in 1.18, so do not remove it from `upgrade-talos.tf` before then.

## Dry-run the generated config

This finds contract rejections and installer drift without a change to the cluster:

```bash
terraform plan -out=/tmp/p.tfplan
terraform show -json /tmp/p.tfplan | jq -r '
  .resource_changes[]
  | select(.address|test("machine_configuration_apply.worker.\"genesis-worker-03\""))
  | .change.after.machine_configuration' > /tmp/cfg.yaml

talosctl -e 10.3.10.30 -n 10.3.10.36 apply-config --mode=auto --dry-run --file /tmp/cfg.yaml
```

It prints the config diff and tells whether Talos would reboot the node. Do this for a worker and
for a control plane (`machine_configuration_apply.controlplane."genesis-ctrl-01"` on
`10.3.10.31`). They generate different configs, and only the control plane carries the VIP.

## Before you start

Keep these files outside the repo, in a `chmod 700` directory.

```bash
./convert-secrets.sh > machine-secrets.yaml && chmod 600 machine-secrets.yaml
talosctl -e 10.3.10.30 -n 10.3.10.31 etcd snapshot etcd-pre-upgrade.db
```

`machine-secrets.yaml` is the cluster identity. With this file you can rebuild the cluster even if
the Terraform state is lost. A copy is in Bitwarden Secrets Manager as
`talos-genesis-machine-secrets`. Take a new etcd snapshot even though the nightly one exists.
Database dumps and the other backup layers are in
[`../backups/README.md`](../backups/README.md). PV data needs no extra backup. `proxmox-local`
volumes and Synology NFS are not on the node disks, and the node disks are the only thing an
upgrade writes.

Check that no PodDisruptionBudget can block the drain that `talosctl upgrade` does on each node:

```bash
kubectl get pdb -A
```

Every row must show `ALLOWED DISRUPTIONS` of at least 1. A 0 means the PDB already has too few
healthy pods (`KubePdbNotEnoughHealthyPods` fires on it). The eviction for that node retries until
the pods recover, so fix the workload first.

If a control plane VM is restored from a backup, do not let the stale member rejoin a live quorum.
Wipe `EPHEMERAL` so that it joins as a new member, or do a full recovery from the snapshot
([`../backups/restore.md`](../backups/restore.md)).

## Procedure

Run every step from `terraform/proxmox/hyper-cluster/k8s/talos`.

[![Before you start, a baseline plan, then phase 1 applies the new install image and upgrades the nodes one at a time before upgrade-k8s, phase 2 raises kubernetes_config_contract straight after, and any other apply in between would downgrade the control plane](../../assets/diagrams/cluster-talos-upgrade.svg)](../../assets/diagrams/cluster-talos-upgrade.svg)

### Baseline

Keep the versions unchanged and both upgrade flags `false`. Run a plan, so that provider churn is
separate from the upgrade. No `proxmox_virtual_environment_vm` may show `must be replaced`. A
replacement wipes Talos and etcd. There must be no `prevent_destroy` error on the secrets.

### Phase 1: move the nodes

Raise only the targets in `terraform.tfvars`. Leave both contracts as they are:

```hcl
talos_version      = "<new talos version>"
kubernetes_version = "<new kubernetes version>"

enable_talos_upgrade      = true
enable_kubernetes_upgrade = true
```

Plan, dry-run the generated config, then apply. The only machine config change is
`machine.install.image`. The nodes accept it without a reboot. Terraform then upgrades ctrl-01
through worker-03 one node at a time, with a `talosctl health` gate after each, and runs
`upgrade-k8s`. Only one node is down at a time. etcd keeps quorum on two of three members, and
`kubectl` drops out briefly while the VIP moves.

### Phase 2: raise the Kubernetes contract

As soon as `upgrade-k8s` has finished, before any other apply:

```hcl
kubernetes_config_contract = "<new kubernetes version>"

enable_talos_upgrade      = false
enable_kubernetes_upgrade = false
```

Plan, dry-run a worker and a control plane again, and apply. The `check` warning is gone. The
`null_resource` upgrade steps leave the graph until the next upgrade.

## Verify

A full run takes about half an hour. `upgrade-k8s` rolls kube-apiserver, kube-controller-manager
and kube-scheduler on each control plane, then the kubelet on every node. An old kubelet next to a
new API server is normal while it runs. If it seems stuck on `config version mismatch`, check the
API server pods, not the Terraform log:

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

All three etcd members must report the same membership. The IDs must be the same as before the
upgrade, with no `LEARNER` entries.

## Open items

`docs/backlog/README.md` tracks the raise of `talos_config_contract` and the next upgrade.
