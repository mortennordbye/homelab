# Plex hardware transcoding: hyper1 iGPU passthrough

The hyper1 integrated GPU passed through to `genesis-worker-01` so Plex can use Intel QuickSync
instead of software transcoding.

Every command is a **single line**. Heredocs and backslash continuations get mangled pasting into a
tmux session, so nothing here uses them. Paste one at a time.

## Status

Working. The GPU is bound to `vfio-pci` on the host, attached to VM 134, and
`/dev/dri/renderD128` is present inside Talos on `genesis-worker-01`.

- [x] Host vfio config and initramfs
- [x] PCI mapping `igpu-hyper1` with `iommugroup` and `subsystem-id`
- [x] hyper1 rebooted, GPU on `vfio-pci`, host `/dev/dri` gone
- [x] `hostpci0` attached to VM 134, GPU visible inside Talos as `0000:01:00.0`
- [x] Talos `i915` extension via schematic `95d432d6…`, `/dev/dri/renderD128` present
- [x] Node label `hardware.nordbye.it/gpu=intel-quicksync` on worker-01
- [x] `plex.yaml` selects that label and mounts `/dev/dri`
- [ ] **Merge to main** so ArgoCD syncs the Plex change
- [ ] Enable hardware acceleration in Plex settings (Plex Pass confirmed active)
- [ ] Boot kernel pin **failed**, host runs `7.0.6-2-pve`. See the open issue at the end

## Established facts

Checked on the running system, not assumed.

| Fact | Value |
| ---- | ----- |
| Device | `00:02.0` Intel RocketLake-S GT1 [UHD Graphics 730], `8086:4c8b` |
| Subsystem | Lenovo `17aa:31a7` |
| Host CPU | i5-11400T, 11th gen. hyper2 is i5-8500T, hyper3 is i7-8700T, both 8th gen |
| QuickSync | H.264, HEVC 8/10-bit, VP9, AV1 **decode**. hyper1 is the only host with AV1 |
| IOMMU | Already enabled, no kernel cmdline change needed |
| IOMMU group | Group 0, GPU is the only device in it |
| SR-IOV | Not advertised |
| VMs on hyper1 | 131 `genesis-ctrl-01`, 134 `genesis-worker-01`, 1000 `debian13-cloudinit` (stopped) |
| Render node | `renderD128`, mode `crw-rw-rw-`, so no privileged container or extra groups needed |

## The constraint

Rocket Lake is Gen12. Intel dropped GVT-g after Gen11 and this device does not advertise SR-IOV, so
the GPU cannot be shared. It is full VFIO passthrough to exactly one VM, permanently, and hyper1
gives it up entirely.

`genesis-worker-01` was chosen over `genesis-ctrl-01`, which also lives on hyper1: twice the vCPU,
a worker suits a hardware-pinned role, and it keeps the control plane free of a dependency on one
physical machine.

## Order

The host reboot must come **before** the Terraform apply. Attaching `hostpci0` is not a staged
config edit: the provider stops the VM, writes the config and starts it, and that start fails unless
the device is genuinely free at that moment.

---

## 1. Host preparation, on hyper1

Do not reboot after these.

```bash
echo 'options vfio-pci ids=8086:4c8b disable_vga=1' > /etc/modprobe.d/vfio.conf
```

```bash
echo 'blacklist i915' > /etc/modprobe.d/blacklist-i915.conf
```

```bash
printf 'vfio\nvfio_iommu_type1\nvfio_pci\n' >> /etc/modules
```

```bash
update-initramfs -u -k all
```

Read that output. It lists every installed kernel, which is how the extra `7.0.6-2-pve` was spotted.

### PCI resource mapping

Create it with every property up front:

```bash
pvesh create /cluster/mapping/pci --id igpu-hyper1 --map "node=hyper1,path=0000:00:02.0,id=8086:4c8b,iommugroup=0,subsystem-id=17aa:31a7"
```

Or repair an incomplete one:

```bash
pvesh set /cluster/mapping/pci/igpu-hyper1 --map "node=hyper1,path=0000:00:02.0,id=8086:4c8b,iommugroup=0,subsystem-id=17aa:31a7"
```

```bash
pvesh get /cluster/mapping/pci --output-format json
```

Both `iommugroup` and `subsystem-id` are required. `pvesh create` accepts a mapping without them and
reports success, then Proxmox rejects it at VM start, one missing property at a time:

```
PCI device mapping invalid (hardware probably changed): missing expected property 'iommugroup' for device '0000:00:02.0'
PCI device mapping invalid (hardware probably changed): missing expected property 'subsystem-id' for device '0000:00:02.0'
```

Each discovery costs a node outage, because a VM whose `hostpci0` cannot be validated will not boot.
Values came from `ls /sys/kernel/iommu_groups/0/devices/` and the `Subsystem:` line of
`lspci -nnk -s 00:02.0`.

The mapping name must match `pci_mapping` in `terraform.tfvars`. A mapping is used rather than a raw
PCI id because the provider's `hostpci.id` is incompatible with API token auth, which is how this
module authenticates.

---

## 2. Drain and reboot

On your workstation:

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
```

```bash
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data
```

On hyper1:

```bash
reboot
```

This takes down `genesis-ctrl-01` and `genesis-worker-01` together. etcd keeps quorum on the other
two control planes. Plex is unavailable for the duration and will not reschedule, since it is pinned
to hardware on hyper1.

---

## 3. Verify the host

On hyper1. Expect `Kernel driver in use: vfio-pci`:

```bash
lspci -nnk -s 00:02.0
```

Expect "No such file or directory", the host has given up the GPU:

```bash
ls /dev/dri
```

```bash
qm status 134
```

---

## 4. Terraform: attach the device

Only once step 3 passes. Already written: `variables.tf` has an optional `pci_mapping` on the node
object, `proxmox-vms.tf` has a `dynamic "hostpci"` block that only materialises for nodes that set
it, and `terraform.tfvars` sets `pci_mapping = "igpu-hyper1"` on `genesis-worker-01`.

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

`pcie = true` requires q35, which these VMs already use.

Confirm the plan says `updated in-place` and `0 to destroy` before applying. A replacement would
wipe Talos and etcd on that node. The apply stops and starts VM 134.

Verify the GPU reached the guest. Expect an Intel `RocketLake-S GT1` entry alongside the emulated
`0000:00:01.0`:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get pcidevices
```

### If a VM will not start

Detach the device so the node boots without it, then fix the real cause:

```bash
qm set 134 --delete hostpci0 && qm start 134 && qm status 134
```

The Proxmox GUI start button keeps failing while an unusable `hostpci0` is in the config, so
removing it is the way out. Check the task viewer for the actual reason.

---

## 5. Talos: the i915 extension

`/dev/dri` does not exist inside Talos until `siderolabs/i915` is installed. It is added to
`talos_image_factory_schematic.this` in `talos-cluster.tf`, which changes the schematic ID. Because
`machine.install.image` is pinned to that schematic, the change rewrites `install.image` on all six
nodes and each picks the extension up at its next install.

Applying that change hits a provider bug. Terraform plans the machine config using the old schematic
ID, then computes a new one during apply, and aborts:

```
Error: Provider produced inconsistent final plan
... produced an invalid new value for .machine_configuration: inconsistent values for sensitive attribute
```

The schematic resource itself does get updated, so simply plan and apply **again**. The second run
is consistent because the new ID is already in state.

Then install it on the GPU node. Same Talos version, different image, so this is a reinstall and
reboot of that node only:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 upgrade --image factory.talos.dev/installer/95d432d6bb450a67e801a6ae77c96a67e38820b62ba4159ae7e997e1695207f7:v1.12.11 --preserve --wait
```

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get extensions
```

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 ls /dev/dri
```

Expect `card0` and `renderD128`.

Do not install a one-off image without also changing the Terraform schematic. Because
`install.image` is pinned fleet-wide, such a node would be reverted to the fleet image at its next
install.

---

## 6. Kubernetes: /dev/dri into Plex

`renderD128` is mode `crw-rw-rw-`, so Plex reaches it as PUID 1000 with no supplemental groups and
no privileged container. A `hostPath` mount is enough.

### PodSecurity blocks hostPath by default

Talos configures PodSecurity admission cluster-wide with `enforce: baseline`, exempting only
`kube-system`. Baseline forbids `hostPath` volumes outright, so the Plex pod is rejected at
admission:

```
Error creating: pods "plex-..." is forbidden: violates PodSecurity "baseline:latest": hostPath volumes (volume "dri")
```

The Deployment applies cleanly and `kubectl diff` shows nothing wrong, because admission runs on the
**pod**, not the Deployment. With `strategy: Recreate` the old pod is already gone by then, so Plex
goes down rather than failing over. Check the ReplicaSet events, not the Deployment.

`namespace.yaml` therefore raises the level:

```yaml
pod-security.kubernetes.io/enforce: privileged
pod-security.kubernetes.io/audit: baseline
pod-security.kubernetes.io/warn: baseline
```

Audit and warn stay at baseline so the violation is still reported, just not enforced. This is
broader than ideal since seerr and tautulli share the namespace and need none of it. The narrower
fix is Intel's GPU device plugin, which advertises `gpu.intel.com/i915` as a schedulable resource
and removes the need for `hostPath` entirely, letting the namespace return to baseline. Tracked in
`BACKLOG.md`.

Node selection is by capability label, not hostname. `talos-cluster.tf` derives the label from
`pci_mapping`, so it is declared with the hardware and only lands on nodes that have a GPU:

```hcl
nodeLabels = merge(
  {
    "topology.kubernetes.io/region" = var.proxmox_cluster_name
    "topology.kubernetes.io/zone"   = each.value.proxmox_node
  },
  each.value.pci_mapping != null ? { "hardware.nordbye.it/gpu" = "intel-quicksync" } : {}
)
```

`plex.yaml` selects on that label instead of `topology.kubernetes.io/zone=hyper1`, and mounts the
device. The `plex-config` PV carries its own `nodeAffinity` for zone hyper1, which the scheduler
enforces independently, so the zone constraint is not repeated on the pod. Both are satisfied by
`genesis-worker-01`.

```bash
kubectl get nodes -L hardware.nordbye.it/gpu
```

```bash
kubectl diff -f k8s/talos/apps/plex-media-stack/plex.yaml --server-side --field-manager=argocd-controller
```

The manifest change only reaches the cluster once merged to `main`, since ArgoCD reconciles from
there.

After it syncs, confirm Plex can see the device:

```bash
kubectl exec -n plex-media-stack deploy/plex -- ls -l /dev/dri
```

Then in Plex: Settings, Transcoder, "Use hardware acceleration when available". That option requires an active
Plex Pass, which this server has.

---

## Open issue: the boot kernel pin failed

hyper1 runs `7.0.6-2-pve`. The intent was to pin `6.14.11-9-pve`. `GRUB_DEFAULT` was set,
`update-grub` ran, and `grub.cfg` ended up with the right value:

```
set default="gnulinux-advanced-bb0c7f74…>gnulinux-6.14.11-9-pve-advanced-bb0c7f74…"
```

It still booted 7.0.6. The passthrough works on it and nothing is visibly broken, so chasing it was
not worth another outage during this session.

Ruled out already: GRUB is genuinely the bootloader (`bootctl status` reports `GRUB 2.12-9+pmx2` via
`\EFI\PROXMOX\SHIMX64.EFI`), `/boot` is on the root filesystem rather than a separate unmounted
partition, and the ESP config is only a pointer that runs
`configfile ($root)/boot/grub/grub.cfg`. So the edited file is the one GRUB reads.

Next things to try:

```bash
grub-editenv /boot/grub/grubenv list
```

A saved `next_entry` or `saved_entry` there would override the default. Also check that the submenu
id in `set default` matches the actual `--id` on the menuentry:

```bash
grep -oE "\-\-id '[^']+'" /boot/grub/grub.cfg | head -8
```

If the id form is the problem, the fallbacks are numeric indices (`GRUB_DEFAULT="1>2"`) or
`GRUB_DEFAULT=saved` with `grub-set-default`.

The pin commands themselves, for reference. Delete and append rather than substitute, because a
plain `sed 's|^GRUB_DEFAULT=.*|...|'` silently does nothing when the line is absent:

```bash
sed -i '/^GRUB_DEFAULT=/d' /etc/default/grub && echo 'GRUB_DEFAULT="Advanced options for Proxmox VE GNU/Linux>Proxmox VE GNU/Linux, with Linux 6.14.11-9-pve"' >> /etc/default/grub
```

```bash
update-grub
```

---

## Rollback

Remove `pci_mapping` from `terraform.tfvars` and apply, then on hyper1:

```bash
rm -f /etc/modprobe.d/blacklist-i915.conf /etc/modprobe.d/vfio.conf && update-initramfs -u -k all && reboot
```

The host reclaims the GPU via `i915`. The Talos schematic change does not need reverting; the i915
extension is harmless on nodes without a GPU.

---

## Mistakes made, so they are not repeated

**Applying Terraform before the host reboot.** Adding `hostpci` does not merely stage a pending
config change. The provider stops the VM, writes the config and starts it, and that start failed
because the GPU was still bound to `i915`. `genesis-worker-01` sat stopped until `hostpci0` was
removed by hand. The cluster was never at risk, etcd kept quorum and the pods rescheduled, but the
node was down for no reason.

**Creating the PCI mapping incrementally.** Proxmox validates every property it recorded and reports
only the first missing one, so an incomplete mapping costs one failed VM start per missing field.
Include `iommugroup` and `subsystem-id` from the outset.

**Nearly rebooting into an untested kernel.** `update-initramfs -u -k all` listed a newer kernel than
the host was running, which GRUB would have booted by default on a machine with no IPMI. Read what
it prints. Pinning was attempted and did not work, see the open issue above.
