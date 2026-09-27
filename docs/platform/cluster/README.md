# Cluster

Three Proxmox VE nodes (`hyper1`, `hyper2`, `hyper3`) run the Talos VMs of the
Kubernetes cluster "Genesis": three control plane and three workers. Datacenter and
node config is `terraform/proxmox/hyper-cluster/datacenter`, the VMs are
`terraform/proxmox/hyper-cluster/k8s/talos`.

- [`talos-upgrade.md`](talos-upgrade.md): upgrading Talos and Kubernetes, and the traps.
- [`gpu-passthrough.md`](gpu-passthrough.md): the `hyper1` iGPU on `genesis-worker-01`,
  used by Plex and Tdarr through Quick Sync.
