# Incidents

Blameless postmortems for incidents that took something down or that can recur. Each one
says what happened to the system, not who did what. Each one ends with actions that make
the next occurrence shorter or impossible.

Write one when an [SLO](slos.md) loses more than a quarter of its weekly budget in one
event, when a restore or backup fails, or when the diagnosis took more than 30 minutes.

## Template

```markdown
## YYYY-MM-DD <what broke, in the system's words>

Summary: two or three sentences a reader can stop after.

Impact: who or what saw it, for how long, and SLO budget consumed.

Detection: the alert that fired, or how it was noticed and how long after it began.

Timeline (local time):
- HH:MM first symptom
- HH:MM detected
- HH:MM mitigated
- HH:MM resolved

Root cause: the mechanism, as far as it is known. Say what is not known.

Ruled out: what was checked and is not the cause.

What went well / what went badly: one or two lines each.

Actions:
- [ ] <change>, <file or issue link>

Next time: the first commands to run if it recurs.
```

## 2026-08-09 genesis-worker-01 stops in QEMU `internal-error` with the GPU attached

Summary: VM 134 (`genesis-worker-01` on hyper1, with the iGPU passed through) went to
`running (internal-error)` in Proxmox. The node turned `NotReady`. The GPU workloads could
not move. `qm stop 134 && qm start 134` recovered it. It happened once and did not recur.

Impact: Plex and Tdarr were down until the VM restarted. Both request
`gpu.intel.com/i915`, and only this node has it. The duration was not recorded.

Detection: the node went `NotReady` and the Talos API did not answer.

Root cause: not confirmed. `internal-error` means that QEMU stopped without a reason. The
likely cause is memory on hyper1. The host has 31 GiB. PCI passthrough pins all guest RAM,
and worker-01 (16 GiB) plus ctrl-01 (8 GiB) leave little for the host.

Ruled out: `journalctl -u qemu-server@134` shows nothing, and `dmesg` has no OOM kill.
`dmesg` also shows `Invalid PCI ROM header signature` for the iGPU. Nothing connects that
message to the fault.

What went well: a plain VM restart recovered it. What went badly: the GPU node is a single
point of failure for hardware transcoding. Nothing in QEMU's logs explains the stop.

Actions:
- [ ] If it recurs, lower `genesis-worker-01` `memory_mb` from `16384` to `12288` in
  `terraform.tfvars` and watch `kubectl get node genesis-worker-01`.
- [ ] If it still recurs, remove the passthrough with
  `qm set 134 --delete hostpci0 && qm start 134` and remove `pci_mapping` from
  `terraform.tfvars`. Only hardware transcoding in Plex and Tdarr needs the GPU. The
  i5-11400T can transcode in software.

Next time: `qm stop 134 && qm start 134` on hyper1.

Files: `terraform/proxmox/hyper-cluster/k8s/talos/terraform.tfvars`,
[`../cluster/gpu-passthrough.md`](../cluster/gpu-passthrough.md).

## 2026-05-16 Cilium BPF LB map loses backends after an agent rollout

Summary: after the Cilium DaemonSet rolled, one node's BPF LoadBalancer map kept the frontend
entries for the Traefik VIPs `10.3.10.101` and `10.3.10.102`. It had no backend slots. When
that node held the L2 announcement lease, BPF dropped the requests to the VIPs.

Impact: every site behind the gateways refused connections at random, depending on which
node held the lease. The duration was not recorded.

Detection: connection refusals to internal sites. `cilium-dbg service list` still looked
correct. Only the kernel map was wrong.

Root cause: the agent on that node failed to reconcile its BPF LB map after the rollout. It
logged `delete <vip>@8: key does not exist` against `cilium_l2_responder_v4`
(`module=agent.datapath.l2-responder`). Healthy agents log the same line and recover. Why
this one agent failed and its peers did not is not known.

Ruled out: the userspace service table.

What went well: deleting one agent pod fixed it. What went badly: the userspace view looked
healthy. The fault was only visible in the kernel map.

Actions:
- [ ] After any change to `k8s/talos/infra/cilium/values.yaml` that rolls the DaemonSet,
  including the switch from `policyAuditMode` to enforcement, run
  `cilium-dbg bpf lb list | grep <vip>` on each node and confirm every frontend has a
  backend.
- [ ] The chart is pinned at 1.20.2 in `k8s/talos/infra/cilium/kustomization.yaml`. Check
  upstream issues for that version if it happens again.

Next time: delete the Cilium agent pod on the affected node to force a reconcile. The lease
moves to a healthy node.

Files: `k8s/talos/infra/cilium/values.yaml`, `k8s/talos/infra/cilium/l2-announcement-policy.yaml`.
