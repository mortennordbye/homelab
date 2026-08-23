# Incidents

Post-incident records. Each was live-fixed; these keep the diagnosis and the
conditional follow-up so the next occurrence starts from what was already ruled
out rather than from scratch.

They live here rather than in `BACKLOG.md`, which is for known gaps the team has
agreed to leave for later. Neither of these is deferred work: both are closed
unless they recur.

## 2026-08-09 genesis-worker-01 fell into QEMU `internal-error` once with the GPU attached
- **What:** On 2026-08-09, roughly 50 minutes after the hyper1 iGPU was passed through, VM 134 went to `running (internal-error)` in Proxmox. The node went `NotReady`/unreachable, Talos API stopped answering, and Plex could not reschedule because it is pinned to that node. `qm stop 134 && qm start 134` recovered it and it then ran over an hour with no recurrence. Cause never established: nothing in `journalctl -u qemu-server@134`, no OOM kill in `dmesg`, and `internal-error` is QEMU giving up without a reason. The `Invalid PCI ROM header signature` line in `dmesg` is a red herring, `rombar=0` is already set so the option ROM is not used.
- **Why deferred:** It happened once and did not reproduce. Chasing an unreproducible QEMU fault is open-ended, and the cluster tolerates that node being down: etcd keeps quorum and only Plex is pinned to it.
- **Most likely cause:** hyper1 has 31 GiB total. PCI passthrough pins the guest's entire RAM permanently, so worker-01's 16 GiB can never be reclaimed, plus ctrl-01's 8 GiB, leaving roughly 1 GiB for the host. That is a very thin margin even though no OOM was recorded.
- **Unblock:** If it recurs, first drop `genesis-worker-01` from `memory_mb = 16384` to `12288` in `terraform.tfvars`, giving hyper1 about 4 GiB of real headroom; actual usage on that node is far below 16 GiB. Watch with `kubectl get node genesis-worker-01`. If it still recurs, remove the passthrough: `qm set 134 --delete hostpci0 && qm start 134`, then drop `pci_mapping` from `terraform.tfvars`. Nothing except Plex hardware transcoding depends on the GPU, and software transcoding on an i5-11400T is adequate.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/terraform.tfvars` (`genesis-worker-01` `memory_mb`, `pci_mapping`), `docs/plex-hw-transcode.md`.

## 2026-05-16 Cilium BPF LB map corruption after agent rollout
- **What:** The 2026-05-16 `policyAuditMode` + CNP rollout (commit `bd89b22`) left `genesis-ctrl-02`'s BPF LoadBalancer map with frontend entries for `10.3.10.101` and `10.3.10.102` but no backend slots. Because that node also held the L2 announce lease for both traefik VIPs, all incoming traffic was ARP-resolved to ctrl-02 and then blackholed in BPF. Cilium's userspace `service list` was correct; only the kernel BPF map drifted. Manifested as random connect-refused on all internal sites until `kubectl delete pod -n kube-system cilium-vvj48` forced reconciliation; the lease re-elected to worker-02/worker-01 (both with healthy BPF state) and stayed there. Same agents on other nodes logged the same startup error class (`delete <vip>@8: key does not exist` against `cilium_l2_responder_v4`) but recovered.
- **Why deferred:** Live-fixed by kicking the pod. Root cause (why ctrl-02 didn't reconcile while peers did) not isolated — could be a Cilium upstream bug, a quirk of `policyAuditMode` enablement, or a race between `cilium-operator` leader election and L2 responder map reconcile during a fast-rolling DS update.
- **Unblock:** (1) Repro check — next time `k8s/talos/infra/cilium/values.yaml` changes and the DS rolls, immediately run on each node: `cilium-dbg bpf lb list | grep <vip>` and confirm every frontend has a paired backend slot. (2) Search Cilium GitHub issues for "l2 responder map" + "key does not exist" in the chart version pinned in `k8s/talos/infra/cilium/kustomization.yaml`. (3) Consider adding a post-sync health check that fails if any node has an orphan frontend. (4) Cilium has a `clean-cilium-bpf-state` initContainer flag — evaluate enabling it on rollouts (trade-off: clean state vs. brief data-plane drop on every restart).
- **Where:** `k8s/talos/infra/cilium/values.yaml`, `k8s/talos/infra/cilium/l2-announcement-policy.yaml`, Cilium agent logs (`module=agent.datapath.l2-responder`).
