# Plex iGPU passthrough: commands to run, in order

Command list only. The reasoning, the hardware facts and the rollback are in
`plex-hw-transcode.md`.

Every command is a single line. Run them top to bottom. Each block says where to run it and what
you should see. **Stop if the output does not match** and paste it back.

Already done: vfio modprobe config, `update-initramfs`, and the `igpu-hyper1` PCI mapping with
`iommugroup=0`.

---

## A. Pin the boot kernel

ON HYPER1. Safe to re-run, it deletes any existing line before appending.

```bash
sed -i '/^GRUB_DEFAULT=/d' /etc/default/grub && echo 'GRUB_DEFAULT="Advanced options for Proxmox VE GNU/Linux>Proxmox VE GNU/Linux, with Linux 6.14.11-9-pve"' >> /etc/default/grub
```

```bash
grep '^GRUB_DEFAULT' /etc/default/grub
```

Expect exactly:

```
GRUB_DEFAULT="Advanced options for Proxmox VE GNU/Linux>Proxmox VE GNU/Linux, with Linux 6.14.11-9-pve"
```

```bash
update-grub
```

Expect it to list all three kernels and end with `done`.

```bash
grep -E "^\s*set default" /boot/grub/grub.cfg
```

Expect the same "Advanced options...6.14.11-9-pve" string. If it says `set default="0"` the pin did
not take, stop.

---

## B. Pre-flight

ON WORKSTATION. Confirms the cluster is healthy before you take two nodes down.

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
```

```bash
kubectl get nodes
```

Expect all 6 `Ready`.

```bash
export TALOSCONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/talosconfig
```

```bash
talosctl -e 10.3.10.30 -n 10.3.10.31 etcd members
```

Expect 3 members, `LEARNER` false on all.

---

## C. Drain the node

ON WORKSTATION.

```bash
kubectl drain genesis-worker-01 --ignore-daemonsets --delete-emptydir-data
```

Expect it to finish with `drained`. If it hangs on a pod, stop and paste the output.

---

## D. Reboot the host

ON HYPER1. This takes down `genesis-ctrl-01` and `genesis-worker-01`. etcd keeps quorum on the other
two control planes.

```bash
reboot
```

Wait for it to come back, roughly 2 to 3 minutes.

---

## E. Verify the host came back correctly

ON HYPER1. All three must pass.

```bash
uname -r
```

Expect `6.14.11-9-pve`. **Not** 7.0.6-2-pve.

```bash
lspci -nnk -s 00:02.0
```

Expect `Kernel driver in use: vfio-pci`. If it still says `i915`, stop.

```bash
ls /dev/dri
```

Expect `No such file or directory`. The host has given up the GPU.

```bash
qm status 134
```

Expect `status: running`.

---

## F. Bring the node back

ON WORKSTATION.

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
```

```bash
kubectl uncordon genesis-worker-01
```

```bash
kubectl get nodes
```

Expect all 6 `Ready` again.

---

## G. Hand back to me

Paste the output of section E. If all three checks pass I will run the Terraform that attaches
`hostpci0` to VM 134, which stops and starts that VM once, then move on to the Talos `i915`
extension and wiring Plex to `/dev/dri`.

---

## If something goes wrong

VM 134 will not start, ON HYPER1. Detaches the GPU so the node can boot without it:

```bash
qm set 134 --delete hostpci0 && qm start 134 && qm status 134
```

Host booted the wrong kernel: redo section A, then reboot again.

Host did not come back at all: no IPMI on these boxes, so this needs physical access. Boot text
should still appear on a monitor via the UEFI framebuffer even with `i915` blacklisted, and you can
pick an older kernel from the GRUB menu.

Undo the passthrough entirely, ON HYPER1:

```bash
rm -f /etc/modprobe.d/blacklist-i915.conf /etc/modprobe.d/vfio.conf && update-initramfs -u -k all && reboot
```
