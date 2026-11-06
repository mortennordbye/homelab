# Cluster

Three Proxmox VE nodes (`hyper1`, `hyper2`, `hyper3`) run the Talos VMs of the
Kubernetes cluster "Genesis": three control plane nodes and three workers. The datacenter
and node config is `terraform/proxmox/hyper-cluster/datacenter`. The VMs are
`terraform/proxmox/hyper-cluster/k8s/talos`.

- [`talos-upgrade.md`](talos-upgrade.md): how to upgrade Talos and Kubernetes, and the traps.
- [`gpu-passthrough.md`](gpu-passthrough.md): the `hyper1` iGPU on `genesis-worker-01`.
  Plex and Tdarr use it through Quick Sync.
- [`proxmox.md`](proxmox.md): what the datacenter stack manages on Proxmox VE, what it leaves out, and its traps.
- [`talos.md`](talos.md): node layout, access, how to add, move and resize nodes, and certificates.
- [`terraform.md`](terraform.md): every Terraform stack, the Azure state backend, the
  gitignored files each stack needs and how they are backed up, and the CI check.
