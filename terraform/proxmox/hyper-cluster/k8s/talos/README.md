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

Terraform recreates `local_sensitive_file.kubeconfig` on the next plan whenever the file on disk has
drifted, which setting a default namespace does. The apply resets it, so set the namespace again
afterwards.

## Cluster Operations

### Scale Up (Add Nodes)

Add node to `terraform.tfvars`:

```hcl
nodes = {
  # ... existing nodes ...
  "genesis-worker-04" = {
    proxmox_node = "hyper1"
    ip           = "10.3.10.37"
    mac_address  = "BC:24:11:2E:C8:06"
    vmid         = 137
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
kubectl drain genesis-worker-04 --ignore-daemonsets --delete-emptydir-data

# Delete from Kubernetes
kubectl delete node genesis-worker-04
```

Remove node from `terraform.tfvars`, then:

```bash
terraform apply
```

### Migrate VM to Different Node

Edit `terraform.tfvars` and change `proxmox_node`:

```hcl
nodes = {
  "genesis-ctrl-01" = {
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
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data

# Reboot node
talosctl --endpoints 10.3.10.34 --nodes 10.3.10.34 reboot

# Wait for node to be ready, then uncordon
kubectl uncordon genesis-worker-01
```

## Upgrades

See [`docs/platform/cluster/talos-upgrade.md`](../../../../../docs/platform/cluster/talos-upgrade.md).

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
