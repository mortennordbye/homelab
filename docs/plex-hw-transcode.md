# Plex hardware transcoding: hyper1 iGPU passthrough

Passing the hyper1 integrated GPU through to `genesis-worker-01` so Plex can use Intel QuickSync
instead of software transcoding.

Status: host preparation not yet run. Terraform change written and plan-verified, not applied.

## Established facts

Everything below was checked on the running system, not assumed.

| Fact | Value |
| ---- | ----- |
| Device | `00:02.0` Intel RocketLake-S GT1 [UHD Graphics 730], `8086:4c8b` |
| Host CPU | i5-11400T, 11th gen. hyper2 is i5-8500T, hyper3 is i7-8700T, both 8th gen |
| QuickSync | H.264, HEVC 8/10-bit, VP9, AV1 **decode**. hyper1 is the only host with AV1 |
| IOMMU | Already enabled: `DMAR: Intel(R) Virtualization Technology for Directed I/O` |
| IOMMU group | Group 0, and the GPU is the only device in it |
| SR-IOV | Not advertised |
| Current driver | `i915`, host has live `/dev/dri/card1` and `renderD128` |
| VMs on hyper1 | 131 `genesis-ctrl-01`, 134 `genesis-worker-01`, 1000 `debian13-cloudinit` (stopped) |

Because IOMMU is already on, **no kernel command line change and no `intel_iommu=on` is needed**.

## The constraint

Rocket Lake is Gen12. Intel dropped GVT-g after Gen11 and this device does not advertise SR-IOV, so
there is no way to share the GPU. It is full VFIO passthrough to exactly one VM, permanently.

`genesis-worker-01` was chosen over `genesis-ctrl-01`, which also lives on hyper1: it has 8 vCPU
against 4, it is a worker so a hardware-pinned role suits it, and it keeps the control plane free of
a dependency on one physical machine. Plex currently runs on ctrl-01 only because its affinity is
`topology.kubernetes.io/zone=hyper1` and both nodes match.

## Costs, read before starting

Blacklisting `i915` takes the GPU from the host permanently. hyper1 loses `/dev/dri` and console
output on that adapter. The kernel normally keeps a basic UEFI framebuffer console so boot text
should still appear on a physical monitor, but do not rely on it. These ThinkCentres have no IPMI,
so physical access is the only fallback if the host does not come back.

The reboot takes down `genesis-ctrl-01` and `genesis-worker-01` together. etcd keeps quorum at 2 of
3 and worker-01's pods reschedule, so the cluster survives, but it is a maintenance window.

## Order

One reboot, not two. The VM config change is staged while the VM still runs, so the single host
reboot brings everything back in its final state.

1. Host preparation (below)
2. `terraform apply` to attach `hostpci0` to VM 134
3. Drain `genesis-worker-01`
4. Reboot hyper1 once
5. Verify, then Talos extension and Kubernetes wiring

## 1. Host preparation, on hyper1

Do not reboot after these.

```bash
cat > /etc/modprobe.d/vfio.conf <<'EOF'
options vfio-pci ids=8086:4c8b disable_vga=1
EOF

cat > /etc/modprobe.d/blacklist-i915.conf <<'EOF'
blacklist i915
EOF

cat >> /etc/modules <<'EOF'
vfio
vfio_iommu_type1
vfio_pci
EOF

update-initramfs -u -k all

pvesh create /cluster/mapping/pci --id igpu-hyper1 --map "node=hyper1,path=0000:00:02.0,id=8086:4c8b"
```

The mapping name `igpu-hyper1` is referenced by `pci_mapping` in `terraform.tfvars` and must match.

A resource mapping is used rather than a raw PCI id because the provider's `hostpci.id` field is
documented as incompatible with API token authentication, which is how this module authenticates.

Verify the mapping exists before moving on:

```bash
pvesh get /cluster/mapping/pci
```

## 2. Terraform

Already written. `variables.tf` gains an optional `pci_mapping` on the node object,
`proxmox-vms.tf` gains a `dynamic "hostpci"` block that only materialises for nodes that set it,
and `terraform.tfvars` sets `pci_mapping = "igpu-hyper1"` on `genesis-worker-01`.

```hcl
dynamic "hostpci" {
  for_each = each.value.pci_mapping != null ? [each.value.pci_mapping] : []

  content {
    device  = "hostpci0"
    mapping = hostpci.value
    pcie    = true
  }
}
```

`pcie = true` requires a q35 machine type, which these VMs already use.

Plan verified before any host change:

```
# proxmox_virtual_environment_vm.talos_nodes["genesis-worker-01"] will be updated in-place
      + hostpci {
          + device  = "hostpci0"
Plan: 1 to add, 1 to change, 0 to destroy.
```

`updated in-place` and `0 to destroy` is the thing to confirm on every future plan touching a VM. A
replacement would wipe Talos and etcd on that node.

## 3. Drain, then reboot

```bash
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data
# on hyper1:
reboot
```

After it returns:

```bash
kubectl uncordon genesis-worker-01
```

## 4. Verify the passthrough

On hyper1, the device should now be on `vfio-pci` and the host should have no `/dev/dri`:

```bash
lspci -nnk -s 00:02.0        # expect: Kernel driver in use: vfio-pci
ls /dev/dri                  # expect: no such file or directory
```

Inside the VM, the GPU should now appear as a real device rather than the emulated QEMU VGA:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get pcidevices | grep -i vga
```

Before passthrough this reported `0000:00:01.0 VGA compatible controller` on every node, which is
the emulated adapter. A passed-through UHD 730 should show the Intel device instead.

## 5. Talos: the i915 extension

Not yet done. `/dev/dri` will not exist inside Talos until the `siderolabs/i915` extension is
installed. Currently installed extensions are `intel-ucode` and `qemu-guest-agent`.

Adding it to `talos_image_factory_schematic.this` in `talos-cluster.tf` changes the schematic ID.
Since `machine.install.image` is now pinned to that schematic, the change rewrites `install.image`
on **all six nodes**, and each picks the extension up at its next install. That is the desired end
state, and it means the fleet gets it for free during the next Talos upgrade.

To have it on worker-01 immediately, a one-off upgrade against the new schematic is needed:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 upgrade \
  --image factory.talos.dev/installer/<new-schematic-id>:v1.12.11 \
  --preserve --wait
```

Do not do this out of band without also changing the Terraform schematic. Because `install.image`
is pinned fleet-wide, a node upgraded to a one-off image would be reverted to the fleet image on its
next install.

Verify afterwards:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get extensions
talosctl -e 10.3.10.30 -n 10.3.10.34 ls /dev/dri
```

## 6. Kubernetes: getting /dev/dri into Plex

Not yet designed in detail. Two approaches, to be decided once the device is confirmed visible
inside Talos:

Intel's GPU device plugin, which advertises `gpu.intel.com/i915` as a schedulable resource. Cleaner,
and scheduling then follows the resource rather than a hand-maintained node label.

Or a `hostPath` mount of `/dev/dri` with a matching `securityContext`. Fewer moving parts, but the
pod must be pinned to the one node with the GPU by hand.

Either way Plex's affinity has to be tightened. It currently matches
`topology.kubernetes.io/zone=hyper1`, which both ctrl-01 and worker-01 satisfy, so it could schedule
onto the node without the GPU. Prefer a node label describing the capability over pinning to a
hostname.

Plex is at `k8s/talos/apps/plex-media-stack/plex.yaml`, affinity around line 76.

## Rollback

Undo is straightforward as long as the host still boots. Remove `pci_mapping` from
`terraform.tfvars` and apply, then on hyper1 delete `/etc/modprobe.d/blacklist-i915.conf` and
`/etc/modprobe.d/vfio.conf`, run `update-initramfs -u -k all`, and reboot. The host reclaims the GPU
via `i915`.

The Talos schematic change is separate and does not need reverting: the i915 extension is harmless
on nodes with no GPU.
