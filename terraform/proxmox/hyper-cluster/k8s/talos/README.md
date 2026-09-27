# Talos Kubernetes cluster

The six Talos VMs of the "genesis" cluster on hyper-cluster, their machine config and
bootstrap, Cilium, and the initial Argo CD install that hands the cluster to GitOps.

## Run

State is in the azurerm backend (`rg-tfstate-homelab`, key
`proxmox/hyper-cluster/talos-genesis.tfstate`), so `init` needs access to that storage account.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

`terraform.tfvars` (gitignored) holds:

- `proxmox_api_token`: the `terraform-prov@pve` token from [`../../../BOOTSTRAP.md`](../../../BOOTSTRAP.md).
- `proxmox_ssh_password`: optional; empty means the SSH agent is used for image uploads.
- `cluster_vip`, `network_gateway` and the `nodes` map (Proxmox host, IP, MAC, VMID, size,
  optional `pci_mapping`).
- `talos_version`, `kubernetes_version` and the upgrade flags, which Renovate tracks.

Apply writes `talosconfig` and `kubeconfig` next to this file:

```bash
export TALOSCONFIG=./talosconfig KUBECONFIG=./kubeconfig
talosctl --endpoints 10.3.10.30 --nodes 10.3.10.30 health
kubectl get nodes
```

`convert-secrets.sh` turns the `talos_secrets` output into a talosctl secrets bundle for
certificate recovery.

## Docs

- [`docs/platform/cluster/talos.md`](../../../../../docs/platform/cluster/talos.md): layout,
  access, node operations, certificates.
- [`docs/platform/cluster/talos-upgrade.md`](../../../../../docs/platform/cluster/talos-upgrade.md):
  upgrading Talos and Kubernetes.
- [`docs/platform/cluster/gpu-passthrough.md`](../../../../../docs/platform/cluster/gpu-passthrough.md):
  the iGPU on `genesis-worker-01`.
