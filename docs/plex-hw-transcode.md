# Plex hardware transcoding: hyper1 iGPU passthrough

Passing the hyper1 integrated GPU through to `genesis-worker-01` so Plex can use Intel QuickSync
instead of software transcoding.

Every command here is written as a **single line**. Heredocs and backslash continuations get
mangled pasting into a tmux session, so nothing in this document uses them. Paste one line at a
time.

## Progress

- [x] Host vfio config written (`/etc/modprobe.d/vfio.conf`, `blacklist-i915.conf`, `/etc/modules`)
- [x] `update-initramfs -u -k all`
- [x] PCI mapping `igpu-hyper1` created and repaired with `iommugroup=0`, verified valid
- [ ] Boot kernel pinned to `6.14.11-9-pve`
- [ ] hyper1 rebooted, GPU bound to `vfio-pci`
- [ ] `terraform apply` attaches `hostpci0` to VM 134
- [ ] Talos `i915` extension
- [ ] Plex wired to `/dev/dri`

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

The host reboot comes **before** the Terraform apply. This is not optional, see the mistake logged
at the bottom of this document.

1. Host preparation, including the PCI mapping (below)
2. Pin the boot kernel
3. Drain `genesis-worker-01`, reboot hyper1, so the GPU actually binds to `vfio-pci`
4. `terraform apply` to attach `hostpci0` to VM 134
5. Verify, then Talos extension and Kubernetes wiring

Attaching `hostpci0` is not a staged config edit. The provider stops the VM, writes the config and
starts it again, and that start fails unless the device is genuinely free at that moment.

## 1. Host preparation, on hyper1

Do not reboot after these. One line at a time.

### 1a. vfio modprobe config

```bash
echo 'options vfio-pci ids=8086:4c8b disable_vga=1' > /etc/modprobe.d/vfio.conf
```

```bash
echo 'blacklist i915' > /etc/modprobe.d/blacklist-i915.conf
```

```bash
printf 'vfio\nvfio_iommu_type1\nvfio_pci\n' >> /etc/modules
```

### 1b. Rebuild initramfs

```bash
update-initramfs -u -k all
```

Read its output. It lists every installed kernel, which is how the extra `7.0.6-2-pve` on this host
was spotted. See step 2.

### 1c. PCI resource mapping

Create it:

```bash
pvesh create /cluster/mapping/pci --id igpu-hyper1 --map "node=hyper1,path=0000:00:02.0,id=8086:4c8b,iommugroup=0"
```

Or repair one that was created without `iommugroup`:

```bash
pvesh set /cluster/mapping/pci/igpu-hyper1 --map "node=hyper1,path=0000:00:02.0,id=8086:4c8b,iommugroup=0"
```

`iommugroup=0` is required. `pvesh create` happily accepts a mapping without it and reports success,
then Proxmox rejects it at VM start:

```
PCI device mapping invalid (hardware probably changed):
missing expected property 'iommugroup' for device '0000:00:02.0'
```

Group 0 is correct for this device, confirmed with `ls /sys/kernel/iommu_groups/0/devices/`.

The mapping name `igpu-hyper1` is referenced by `pci_mapping` in `terraform.tfvars` and must match.

A resource mapping is used rather than a raw PCI id because the provider's `hostpci.id` field is
documented as incompatible with API token authentication, which is how this module authenticates.

Verify before moving on:

```bash
pvesh get /cluster/mapping/pci --output-format json
```

## 2. Pin the boot kernel

hyper1 has more than one kernel installed and `proxmox-boot-tool` is not managing it (`No
/etc/kernel/proxmox-boot-uuids found` during `update-initramfs`), so GRUB boots the highest version
by default. At the time of writing that is `7.0.6-2-pve`, which is known to misbehave on this host,
while the running and working kernel is `6.14.11-9-pve`.

See what is installed:

```bash
ls -1 /boot/vmlinuz-*
```

See what GRUB is currently set to:

```bash
grep -E '^GRUB_DEFAULT|^GRUB_TIMEOUT' /etc/default/grub
```

List the exact menu entry names, which is what `GRUB_DEFAULT` has to reference:

```bash
grep -E "^menuentry|^\s+menuentry|^submenu" /boot/grub/grub.cfg | cut -d"'" -f2
```

On this host that prints:

```
Proxmox VE GNU/Linux
Advanced options for Proxmox VE GNU/Linux
Proxmox VE GNU/Linux, with Linux 7.0.6-2-pve
Proxmox VE GNU/Linux, with Linux 6.14.11-9-pve
Proxmox VE GNU/Linux, with Linux 6.14.8-2-pve
```

The top-level `Proxmox VE GNU/Linux` entry boots whatever GRUB considers newest, which is the
7.0.6-2-pve you are trying to avoid. Non-default kernels live under the "Advanced options" submenu,
so the value is `submenu-name>entry-name`.

Delete and append rather than substitute. A plain `sed 's|^GRUB_DEFAULT=.*|...|'` silently does
nothing when the line is absent, leaving the host unpinned with no error:

```bash
sed -i '/^GRUB_DEFAULT=/d' /etc/default/grub && echo 'GRUB_DEFAULT="Advanced options for Proxmox VE GNU/Linux>Proxmox VE GNU/Linux, with Linux 6.14.11-9-pve"' >> /etc/default/grub
```

```bash
grep '^GRUB_DEFAULT' /etc/default/grub
```

```bash
update-grub
```

Do not combine a kernel change with a passthrough change in the same reboot. If the host comes back
wrong you will not know which one caused it, and these ThinkCentres have no IPMI.

## 3. Drain, then reboot

On your workstation:

```bash
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data
```

On hyper1:

```bash
reboot
```

After it returns, on your workstation:

```bash
kubectl uncordon genesis-worker-01
```

```bash
kubectl get nodes
```

Confirm the GPU actually moved to vfio before going any further, per section 4. Only then apply the
Terraform change.

## 4. Verify the passthrough

On hyper1, the device should now be on `vfio-pci`. Expect `Kernel driver in use: vfio-pci`:

```bash
lspci -nnk -s 00:02.0
```

And the host should no longer have a render device. Expect "No such file or directory":

```bash
ls /dev/dri
```

Confirm the running kernel is the pinned one:

```bash
uname -r
```

Inside the VM, the GPU should now appear as a real device rather than the emulated QEMU VGA:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get pcidevices | grep -i vga
```

Before passthrough this reported `0000:00:01.0 VGA compatible controller` on every node, which is
the emulated adapter. A passed-through UHD 730 should show the Intel device instead.

## 5. Terraform: attach the device

Only once section 4 confirms the GPU is on `vfio-pci`. The code is already written:
`variables.tf` gains an optional `pci_mapping` on the node object, `proxmox-vms.tf` gains a
`dynamic "hostpci"` block that only materialises for nodes that set it, and `terraform.tfvars` sets
`pci_mapping = "igpu-hyper1"` on `genesis-worker-01`.

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

Confirm the plan says in-place before applying:

```
# proxmox_virtual_environment_vm.talos_nodes["genesis-worker-01"] will be updated in-place
      + hostpci {
          + device  = "hostpci0"
Plan: 1 to add, 1 to change, 0 to destroy.
```

`updated in-place` and `0 to destroy` is the thing to confirm on every plan that touches a VM. A
replacement would wipe Talos and etcd on that node.

The apply stops and starts VM 134, so the node goes down for a minute. Drain it first.

### If a VM will not start

Detach the device and start it, then fix the underlying problem before retrying:

```bash
qm set 134 --delete hostpci0 && qm start 134 && qm status 134
```

The Proxmox GUI start button keeps failing while an unusable `hostpci0` is in the config, so
removing it is the way out. Check the task viewer output for the real reason; the two seen here
were a mapping without `iommugroup`, and the device still being held by `i915`.

## 6. Talos: the i915 extension

Not yet done. `/dev/dri` will not exist inside Talos until the `siderolabs/i915` extension is
installed. Currently installed extensions are `intel-ucode` and `qemu-guest-agent`.

Adding it to `talos_image_factory_schematic.this` in `talos-cluster.tf` changes the schematic ID.
Since `machine.install.image` is now pinned to that schematic, the change rewrites `install.image`
on **all six nodes**, and each picks the extension up at its next install. That is the desired end
state, and it means the fleet gets it for free during the next Talos upgrade.

To have it on worker-01 immediately, a one-off upgrade against the new schematic is needed:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 upgrade --image factory.talos.dev/installer/NEW_SCHEMATIC_ID:v1.12.11 --preserve --wait
```

Do not do this out of band without also changing the Terraform schematic. Because `install.image`
is pinned fleet-wide, a node upgraded to a one-off image would be reverted to the fleet image on its
next install.

Verify afterwards:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get extensions
talosctl -e 10.3.10.30 -n 10.3.10.34 ls /dev/dri
```

## 7. Kubernetes: getting /dev/dri into Plex

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

## Mistakes made, so they are not repeated

**Applying Terraform before the host reboot.** The assumption was that adding `hostpci` to a running
VM only stages a pending config change. It does not: the provider stops the VM, writes the config,
and starts it again. That start failed because the GPU was still bound to `i915`, and
`genesis-worker-01` sat stopped until `hostpci0` was removed by hand. Hence the ordering at the top
of this document. The cluster was never at risk, etcd kept quorum at 2 of 3 and the five pods on
that node rescheduled, but the node was down for no reason.

**Creating the PCI mapping without `iommugroup`.** `pvesh create /cluster/mapping/pci` accepts a
mapping with no `iommugroup` and reports success. Proxmox then rejects it at VM start with `missing
expected property 'iommugroup'`. The mapping looks fine in `pvesh get` until you try to use it, so
include `iommugroup` when creating it.

**Nearly rebooting into an untested kernel.** `update-initramfs -u -k all` printed three kernels,
including a newer one than the host was running. GRUB would have booted it, turning a passthrough
change into a passthrough change plus a kernel upgrade, on a host with no IPMI. Always read what
`update-initramfs` prints.
