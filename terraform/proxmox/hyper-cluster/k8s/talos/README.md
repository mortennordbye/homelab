# Talos Kubernetes Cluster

## Getting Started

### Configuration

1. Copy the example configuration file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your environment details:
   - Proxmox endpoint and API token
   - Network settings (IPs, gateway, VIP)
   - Node configurations (adjust based on your hardware)

### Deploy

```bash
export TF_VAR_proxmox_ssh_password='Password'
terraform init
terraform apply
```

### Access

```bash
# Talos
terraform output -raw talosconfig > talosconfig
export TALOSCONFIG=./talosconfig
talosctl --endpoints <cluster_vip> --nodes <cluster_vip> health

# Kubernetes
export KUBECONFIG=./kubeconfig
kubectl get nodes

# ArgoCD (username: admin)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## Cluster Operations

### Scale Up (Add Nodes)

Add node to `terraform.tfvars`:

```hcl
nodes = {
  # ... existing nodes ...
  "talos-worker-04" = {
    proxmox_node = "hyper1"
    ip           = "10.3.10.37"
    mac_address  = "BC:24:11:2E:C8:06"
    vmid         = 806
    cpu_cores    = 4
    memory_mb    = 6144
    disk_size_gb = 40
    datastore    = "local-lvm"
    node_type    = "worker"
  }
}
```

```bash
terraform apply
```

Node automatically joins the cluster.

### Scale Down (Remove Nodes)

```bash
# Drain workloads
kubectl drain talos-worker-04 --ignore-daemonsets --delete-emptydir-data

# Delete from Kubernetes
kubectl delete node talos-worker-04
```

Remove node from `terraform.tfvars`, then:

```bash
terraform apply
```

### Migrate VM to Different Node

Edit `terraform.tfvars` and change `proxmox_node`:

```hcl
nodes = {
  "talos-ctrl-01" = {
    proxmox_node = "hyper2"  # Changed from hyper1
    # ... rest unchanged
  }
}
```

```bash
terraform apply
```

Terraform will live migrate the VM to the new node. No downtime if shared storage is used.

## Resource Management

### Resize Disk

Edit `disk_size_gb` in `terraform.tfvars` (increase only):

```bash
terraform apply
```

Talos automatically detects and uses the expanded disk space.

### Change CPU or Memory

Edit `cpu_cores` or `memory_mb` in `terraform.tfvars`:

```bash
terraform apply
```

**Note:** CPU changes apply immediately. Memory changes require node reboot:

```bash
# Drain workloads
kubectl drain talos-worker-01 --ignore-daemonsets --delete-emptydir-data

# Reboot node
talosctl --endpoints 10.3.10.34 --nodes 10.3.10.34 reboot

# Wait for node to be ready, then uncordon
kubectl uncordon talos-worker-01
```

## Upgrades

**Important:** Upgrade Talos first, then Kubernetes. Two applies required: phase 1 raises the
target versions and runs the upgrades, phase 2 raises the config contracts and turns the flags back
off. Both phases are described below.

Talos only tests migration between adjacent minor versions, and each Talos minor supports only the
six Kubernetes minors below its own default. So a Kubernetes minor is unreachable until Talos has
been raised first, and neither can skip a minor:

| Talos | default Kubernetes |
| ----- | ------------------ |
| 1.11  | 1.34               |
| 1.12  | 1.35               |
| 1.13  | 1.36               |

Going from Talos 1.11 / Kubernetes 1.34 to Talos 1.13 / Kubernetes 1.36 is therefore four steps in
two rounds: Talos 1.12, Kubernetes 1.35, Talos 1.13, Kubernetes 1.36. `talosctl` must be at least
as new as the Talos version being installed, so upgrade it between rounds.

### Never lower `talos_secrets_contract`

`talos_machine_secrets` is pinned to `var.talos_secrets_contract`, not `var.talos_version`. The
provider replaces that resource when the value *decreases*, and replacing it regenerates the
cluster CA, etcd certificates and service account keys. The cluster does not survive that. Keeping
it decoupled means reverting `talos_version` after a failed upgrade is safe. The resource also
carries `prevent_destroy`, so a plan that would replace it fails loudly instead of proceeding.

Raise `talos_secrets_contract` only deliberately, and never below the value already in state.

### Target versions vs config contracts

Four version variables, in two pairs, and the difference matters.

`talos_version` and `kubernetes_version` are *targets*: what the nodes should end up running. They
drive the installer image handed to `talosctl upgrade` and the `--to` of `talosctl upgrade-k8s`.

`talos_config_contract` and `kubernetes_config_contract` are what machine configuration is
*generated against*, and they deliberately lag during an upgrade. A config generated for a newer
contract is rejected outright by older nodes: the 1.12 contract emits
`machine.install.grubUseUKICmdline`, and a v1.11.6 node fails the apply with `unknown keys found
during decoding`. It also swaps `machine.features.stableHostname` for a separate `HostnameConfig`
document and drops the fields 1.12 locks (`rbac`, `apidCheckExtKeyUsage`).

Terraform cannot simply apply the config after the upgrade: `machine_configuration_apply` feeds
`machine_bootstrap`, which feeds `cluster_kubeconfig`, which the upgrade steps depend on. Making
the config wait on the upgrades is a dependency cycle. So the contracts lag instead, and get
raised in a second apply once the nodes are already on the new version.

Verify a generated config before applying it, which catches a contract mismatch without touching
the cluster:

```bash
terraform show -json <plan> | \
  jq -r '.resource_changes[] | select(.address|test("machine_configuration_apply.worker.\"genesis-worker-03\"")) | .change.after.machine_configuration' > /tmp/cfg.yaml
talosctl -e 10.3.10.30 -n 10.3.10.36 apply-config --mode=auto --dry-run --file /tmp/cfg.yaml
```

The dry run prints the exact config diff and whether Talos would reboot the node.

### Upgrade, phase 1: move the nodes

Snapshot etcd first. Edit `terraform.tfvars`, raising only the targets and leaving both contracts
alone:

```hcl
talos_version      = "v1.12.11"
kubernetes_version = "v1.35.7"

enable_talos_upgrade      = true
enable_kubernetes_upgrade = true
```

```bash
talosctl --talosconfig ./talosconfig -e 10.3.10.31 -n 10.3.10.31 etcd snapshot snapshot_pre_upgrade.db
terraform apply
```

The only machine config change in this phase is `machine.install.image` moving to the new version,
which older nodes accept and which applies without a reboot. Then Talos upgrades sequentially,
ctrl-1 through worker-3, each gated on `talosctl health`, followed by `talosctl upgrade-k8s`.

### Upgrade, phase 2: raise the contracts

Once every node reports the new version, edit `terraform.tfvars` again:

```hcl
talos_config_contract      = "v1.12.11"
kubernetes_config_contract = "v1.35.7"

enable_talos_upgrade      = false
enable_kubernetes_upgrade = false
```

Dry run the generated config before applying. When moving to the 1.12 contract on these nodes,
check `machine.install.grubUseUKICmdline`: the provider emits `true`, but these nodes boot via GRUB
(BIOS boot partition plus an xfs `BOOT` partition, no EFI partition) and the Talos 1.12 notes say
existing installs should keep `false` to preserve the legacy command line. Pin it explicitly in the
`config_patches` install block if the dry run shows it flipping to `true`.

```bash
terraform apply
```

Phase 2 also turns the upgrade flags back off, so the `null_resource` steps stop being part of the
graph until the next round.

**Version sources:**

- Talos: https://github.com/siderolabs/talos/releases
- Kubernetes: https://kubernetes.io/releases/

## Certificate Management

### Check Expiration

Client certificates in talosconfig and kubeconfig expire after 1 year. Server certificates rotate automatically on node reboot/upgrade.

```bash
# Talosconfig
grep "crt:" ./talosconfig | head -1 | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate

# Kubeconfig
grep "client-certificate-data:" ./kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate
```

### Renew Certificates (Before Expiration)

**Renew talosconfig:**

```bash
# Get config from Terraform state
terraform output -raw talosconfig > talosconfig

# Generate new config from controlplane
talosctl --talosconfig=./talosconfig -n 10.3.10.30 config new talosconfig-new --roles os:admin --crt-ttl 8760h
```

**Renew kubeconfig:**

```bash
talosctl --talosconfig=./talosconfig --endpoints 10.3.10.30 kubeconfig ./kubeconfig --nodes 10.3.10.30 --force
```

### Certificate Recovery (After Expiration)

If certificates expire, recreate them using the secrets stored in Terraform state.

```bash
# Convert Terraform secrets to talosctl format
./convert-secrets.sh > machine-secrets.yaml

# Generate new configs with existing secrets
talosctl gen config --with-secrets machine-secrets.yaml hyper-cluster https://10.3.10.30:6443 --force

# Test access
export TALOSCONFIG=./talosconfig
talosctl --endpoints 10.3.10.30 --nodes 10.3.10.30 health

# Generate kubeconfig
talosctl --endpoints 10.3.10.30 kubeconfig ./kubeconfig --nodes 10.3.10.30 --force

# Clean up temporary files
rm -f machine-secrets.yaml controlplane.yaml worker.yaml
```

The `convert-secrets.sh` script extracts machine secrets from Terraform state and converts them to the format expected by talosctl.
