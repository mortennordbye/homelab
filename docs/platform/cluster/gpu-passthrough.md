# hyper1 iGPU for Plex and Tdarr

The hyper1 integrated GPU is passed through to `genesis-worker-01` (VM 134). Plex and Tdarr use it
for Intel Quick Sync hardware transcoding through the Intel GPU device plugin.

Every command is a single line, because heredocs and backslash continuations get mangled when
pasted into a tmux session.

## Facts

| Fact | Value |
| ---- | ----- |
| Device | `00:02.0` Intel RocketLake-S GT1 [UHD Graphics 730], `8086:4c8b` |
| Subsystem | Lenovo `17aa:31a7` |
| Host CPU | i5-11400T, 11th gen. hyper2 and hyper3 are 8th gen |
| Quick Sync | H.264, HEVC 8/10-bit, VP9, AV1 decode. hyper1 is the only host with AV1 |
| IOMMU | Enabled by default, no kernel cmdline change needed |
| IOMMU group | Group 0, the GPU is the only device in it |
| SR-IOV | Not advertised |
| Render node | `renderD128`, mode `crw-rw-rw-`, so no privileged container or extra groups needed |

## Constraints

Rocket Lake is Gen12. Intel dropped GVT-g after Gen11 and the device does not advertise SR-IOV, so
the GPU cannot be shared between VMs. It is full VFIO passthrough to exactly one VM, and hyper1
gives it up entirely. It goes to a worker rather than `genesis-ctrl-01`, which also lives on
hyper1, so the control plane has no dependency on one physical machine.

Passthrough pins the guest's entire RAM. hyper1 has 31 GiB; `genesis-worker-01` (16 GiB) and
`genesis-ctrl-01` (8 GiB) leave the host a thin margin, so raising either VM's `memory_mb` takes
it from the host.

The host reboot must come before the Terraform attach. Adding `hostpci0` is not a staged config
edit: the provider stops the VM, writes the config and starts it, and that start fails unless the
device is already bound to `vfio-pci`.

## Rebuild hyper1

### Host preparation

On hyper1. Do not reboot yet.

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

Read that output. It lists every installed kernel, and GRUB boots the newest by default on a
machine with no IPMI.

### PCI mapping

The `igpu-hyper1` mapping is declared in `terraform/proxmox/hyper-cluster/datacenter/hardware.tf`
and applied from that stack. Its name must match `pci_mapping` in the Talos `terraform.tfvars`. A
mapping is used rather than a raw PCI id because the provider's `hostpci.id` does not work with API
token auth.

Both `iommu_group` and `subsystem_id` are required. Proxmox accepts a mapping without them, then
rejects it at VM start with `missing expected property`, one property per failed start, and the VM
does not boot. The values come from `ls /sys/kernel/iommu_groups/0/devices/` and the `Subsystem:`
line of `lspci -nnk -s 00:02.0`. Check what Proxmox holds:

```bash
pvesh get /cluster/mapping/pci --output-format json
```

### Drain and reboot

```bash
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data
```

Then `reboot` on hyper1. That takes down `genesis-ctrl-01` and `genesis-worker-01` together; etcd
keeps quorum on the other two control planes. Plex and Tdarr stay down until the node is back,
since only that node offers the GPU.

### Verify the host

On hyper1, `lspci -nnk -s 00:02.0` must show `Kernel driver in use: vfio-pci`, and `ls /dev/dri`
must fail with "No such file or directory".

### Terraform attach

`proxmox-vms.tf` in `terraform/proxmox/hyper-cluster/k8s/talos` has a `dynamic "hostpci"` block
that only materialises for nodes that set `pci_mapping`, and `terraform.tfvars` sets
`pci_mapping = "igpu-hyper1"` on `genesis-worker-01`. It uses `pcie = true`, which needs the q35
machine type these VMs already have.

The plan must say `updated in-place` and `0 to destroy`; a replacement wipes Talos and etcd on that
node. The apply stops and starts VM 134. Then check the GPU reached the guest, expecting an Intel
`RocketLake-S GT1` entry:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 get pcidevices
```

### If the VM will not start

The Proxmox start button keeps failing while an unusable `hostpci0` is in the config. Detach it so
the node boots, then read the task viewer for the real cause:

```bash
qm set 134 --delete hostpci0 && qm start 134 && qm status 134
```

## Talos: the i915 extension

`/dev/dri` does not exist inside Talos without `siderolabs/i915`. It is in the fleet-wide
`talos_image_factory_schematic.this` in `talos-cluster.tf` and harmless on nodes without a GPU.
Changing the extension list changes the schematic ID, which rewrites `machine.install.image` on all
six nodes.

Applying a schematic change hits a provider bug: Terraform plans the machine config with the old
schematic ID, computes a new one during apply, and aborts with
`Provider produced inconsistent final plan`. The schematic resource is updated anyway, so plan and
apply a second time.

Then reinstall the GPU node on the new image. Same Talos version, different image, so only that
node reboots. Take the image from `local.talos_installer_image` in `upgrade-talos.tf`, which is
`factory.talos.dev/installer/<schematic id>:<talos_version>`:

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 upgrade --image <installer image> --preserve --wait
```

```bash
talosctl -e 10.3.10.30 -n 10.3.10.34 ls /dev/dri
```

Expect `card0` and `renderD128`. Never install a one-off image without changing the Terraform
schematic; the fleet-wide `install.image` pin reverts it at the next install.

## Kubernetes

Workloads reach the iGPU through the Intel GPU device plugin in
`k8s/talos/infra/intel-gpu-plugin/`, not a `hostPath` mount. The DaemonSet runs on the GPU node,
advertises `gpu.intel.com/i915`, and injects `/dev/dri` into any container that requests it. It
runs with `-shared-dev-num=2` so Plex and Tdarr can each claim the device.

Talos enforces PodSecurity `baseline` cluster-wide, which forbids `hostPath`. Only
`intel-gpu-plugin`, a namespace holding nothing but the DaemonSet, runs `enforce: privileged`, with
audit and warn left at baseline. Do not raise `plex-media-stack` or `arr-stack` to privileged to
mount `/dev/dri`: they hold other apps that need none of it, seerr among them, which answers from
the internet. A pod rejected at admission shows in the ReplicaSet events, not the Deployment, and
`kubectl diff` stays clean.

`daemonset.yaml` is vendored from upstream `deployments/gpu_plugin/base`; re-sync it when Renovate
moves the image tag. The local change is the `nodeSelector`, which adds the GPU label to upstream's
`kubernetes.io/arch: amd64` so the plugin does not hostPath-create `/dev/dri` on the five nodes
without a GPU.

### Node selection

Selection is by capability label, not hostname. `talos-cluster.tf` sets
`hardware.nordbye.it/gpu=intel-quicksync` on any node with a `pci_mapping`. The plugin selects on
that label and so does Plex. The `gpu.intel.com/i915` request alone is enough to place a pod,
since only the plugin's node advertises it; that is how Tdarr lands there.

```bash
kubectl get nodes -L hardware.nordbye.it/gpu
```

```bash
kubectl get node genesis-worker-01 -o jsonpath='{.status.allocatable.gpu\.intel\.com/i915}'
```

When changing the GPU resource, ship the plugin first and the workloads after. Plex and Tdarr are
`strategy: Recreate`, so switching them to a resource the node does not advertise yet leaves them
Pending with the old pod already gone.

### Hardware transcoding in Plex

Settings, Transcoder, "Use hardware acceleration when available" needs Plex Pass. It is stored as
`HardwareAcceleratedCodecs` in `Preferences.xml` on the config PVC, not in this repo, so a rebuild
from git does not restore it. Confirm a transcode actually uses the GPU:

```bash
kubectl exec -n plex-media-stack deploy/plex -- sh -c 'grep "TPU: hardware transcoding" "/config/Library/Application Support/Plex Media Server/Logs/Plex Media Server.log" | tail -3'
```

Both ends must say `final decoder: vaapi, final encoder: vaapi`. Empty values mean it fell back to
software. Tdarr's GPU worker settings are in [`../../apps/media-stack/README.md`](../../apps/media-stack/README.md).

## Rollback

Remove `pci_mapping` from the Talos `terraform.tfvars` and apply, then on hyper1:

```bash
rm -f /etc/modprobe.d/blacklist-i915.conf /etc/modprobe.d/vfio.conf && update-initramfs -u -k all && reboot
```

The host reclaims the GPU through `i915`. The Talos schematic can stay as it is. Plex and Tdarr
must drop their `gpu.intel.com/i915` requests first, or they stay Pending.

## Open items

Tracked in `docs/backlog/README.md`. A one-off QEMU `internal-error` on VM 134 is recorded in
[`../observability/incidents.md`](../observability/incidents.md).
