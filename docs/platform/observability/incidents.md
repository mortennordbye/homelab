# Incidents

Closed incidents that may recur: the diagnosis, what is ruled out, and what to do next time.

## 2026-08-09 genesis-worker-01 stops in QEMU `internal-error` with the GPU attached

VM 134 (`genesis-worker-01` on hyper1, iGPU passed through) goes to `running (internal-error)`
in Proxmox. The node turns `NotReady`, the Talos API stops answering, and Plex and Tdarr cannot
reschedule, since both request `gpu.intel.com/i915` and only this node has it.
`qm stop 134 && qm start 134` recovers it. It happened once and did not reproduce.

Ruled out: `journalctl -u qemu-server@134` shows nothing, and `dmesg` has no OOM kill.
`internal-error` is QEMU stopping without a reason. `dmesg` also shows
`Invalid PCI ROM header signature` for the iGPU; nothing ties it to the fault.

The likely cause is memory on hyper1. It has 31 GiB, PCI passthrough pins all guest RAM, and
worker-01 (16 GiB) plus ctrl-01 (8 GiB) leave little for the host.

If it recurs, lower `genesis-worker-01` `memory_mb` from `16384` to `12288` in `terraform.tfvars`
and watch `kubectl get node genesis-worker-01`. If it still recurs, remove the passthrough with
`qm set 134 --delete hostpci0 && qm start 134` and drop `pci_mapping` from `terraform.tfvars`.
Only hardware transcoding in Plex and Tdarr needs the GPU; the i5-11400T can transcode in software.

Files: `terraform/proxmox/hyper-cluster/k8s/talos/terraform.tfvars`,
[`../cluster/gpu-passthrough.md`](../cluster/gpu-passthrough.md).

## 2026-05-16 Cilium BPF LB map loses backends after an agent rollout

After the Cilium DaemonSet rolls, one node's BPF LoadBalancer map keeps the frontend entries
for the Traefik VIPs `10.3.10.101` and `10.3.10.102` but has no backend slots. When that node
holds the L2 announcement lease, every request to the VIPs is ARP-resolved to it and dropped in
BPF, so all internal sites refuse connections at random. `cilium-dbg service list` still looks
correct; only the kernel map is wrong. The agent logs
`delete <vip>@8: key does not exist` against `cilium_l2_responder_v4`
(`module=agent.datapath.l2-responder`); healthy agents log the same line and recover.

Ruled out: the userspace service table. The root cause, why one agent failed to reconcile
while its peers did, is not isolated.

If it recurs, delete the Cilium agent pod on the affected node to force a reconcile; the lease
moves to a healthy node. After any change to `k8s/talos/infra/cilium/values.yaml` that rolls the
DaemonSet, including the switch from `policyAuditMode` to enforcement, run
`cilium-dbg bpf lb list | grep <vip>` on each node and confirm every frontend has a backend.
The chart is pinned at 1.20.2 in `k8s/talos/infra/cilium/kustomization.yaml`; check upstream
issues for that version when it happens again.

Files: `k8s/talos/infra/cilium/values.yaml`, `k8s/talos/infra/cilium/l2-announcement-policy.yaml`.
