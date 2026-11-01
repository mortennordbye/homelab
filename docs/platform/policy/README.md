# Policy

Kyverno checks every Pod against the repo's manifest rules and writes the result to
PolicyReports. `disallow-mutable-image-tags` and `pod-security-baseline` run in `Enforce`:
the API server rejects a new Pod, or a workload template, that breaks them. The other two
run in `Audit` and only report. The
install and the policies live in
[`k8s/talos/infra/kyverno/`](../../../k8s/talos/infra/kyverno/kustomization.yaml).

| Policy | Mode | Checks |
|---|---|---|
| `disallow-mutable-image-tags` | Enforce | every image has a version tag or a digest; no tag, `latest`, `develop`, `main`, `master`, `nightly`, `edge`, `stable` or `dev` |
| `pod-security-baseline` | Enforce | the baseline Pod Security Standard: no privileged containers, host namespaces or hostPath |
| `pod-security-restricted` | Audit | the restricted Pod Security Standard: non-root, no privilege escalation, capabilities dropped, `RuntimeDefault` seccomp |
| `require-requests-limits` | Audit | every container sets CPU and memory requests and a memory limit |

The Pod rules also cover Deployments, StatefulSets, DaemonSets, Jobs and CronJobs through
Kyverno's autogen. Both Pod Security policies skip `kube-system`, `falco`,
`csi-driver-nfs`, `csi-proxmox` and `intel-gpu-plugin`, whose work needs the host. The
Alloy and node-exporter DaemonSets in `monitoring` are exempt through
`policyexception-monitoring.yaml`. `policyexception-host-access.yaml` exempts one control
for one image each: `Capabilities` for gluetun (`NET_ADMIN` makes the VPN tunnel) and
`Privileged Containers` for verksted's `docker:*-dind` sidecar. `policyexception-nas-backups.yaml`
exempts the etcd, Authentik and logeverylift dump CronJobs and the `backup-check` restore and
Home Assistant checks from the restricted
`Running as Non-root` and `Capabilities` controls, since the backup share only admits root
([backups](../backups/README.md#constraints)). `policyexception-media-root.yaml` exempts the same two
controls for the linuxserver and tdarr images in `arr-stack` and `plex-media-stack` and for
the gluetun pod, whose s6 init has to start as root before it drops to `PUID`. Exceptions are only read
from the `kyverno` namespace.

`policyexception-control-plane.yaml` exempts the `kube-apiserver`, `kube-controller-manager`
and `kube-scheduler` static pods from `require-requests-limits`: Talos writes them from its
machine config with requests but no memory limit.

Every chart this repo installs sets requests and a memory limit through its values, sized
from seven days of `container_memory_working_set_bytes` and CPU rate, with the memory limit
at about twice the observed peak. The workloads that still fail the two `Audit` policies,
and why they cannot enforce yet, are listed in the backlog: the VolSync mover Jobs,
logeverylift's legacy `postgres` and smoke test, and verksted.

[![Argo CD applies a manifest to the API server, which sends it to Kyverno's admission webhook, where a mutable tag or a baseline break is rejected; that and the hourly background scan write one PolicyReport per workload, a PolicyException in the kyverno namespace exempts named workloads, and Policy Reporter turns the reports into the policy_report_result metric that Prometheus scrapes for the Policy (Kyverno) row on the SPOG dashboard](../../assets/diagrams/policy-reports.svg)](../../assets/diagrams/policy-reports.svg)

## Reading the results

The Policy (Kyverno) row on the SPOG dashboard shows the failures per policy, the share of
workloads meeting the restricted standard and the requests rule, and a table of every
failing workload. Policy Reporter feeds it: it exports the current report state as
`policy_report_result`, for Deployments, StatefulSets, DaemonSets and CronJobs only. The
workload's namespace is the `exported_namespace` label, since `namespace` is Policy
Reporter's own.

```bash
# One line per namespace with pass and fail counts
kubectl get policyreport -A

# What fails in one namespace
kubectl -n plex-media-stack get policyreport -o json \
  | jq -r '.items[].results[] | select(.result=="fail") | "\(.resources[0].name)  \(.policy)  \(.message)"'
```

Reports refresh on the background scan, about once an hour, and on every admission.

A Job that is deleted once it succeeds, such as a chart hook or a VolSync mover, leaves no
report behind. Kyverno's own `kyverno_policy_results_total` counter keeps every admission
result, so check it before moving a policy to `Enforce`:

```promql
sum by (policy_name, resource_namespace, resource_kind) (
  increase(kyverno_policy_results_total{rule_result="fail", rule_execution_cause="admission_request"}[24h])
) > 0
```

## Vulnerability scanning

trivy-operator in `trivy-system` scans the image of every running workload for known CVEs
and for secrets baked into its layers. It writes a `VulnerabilityReport` and an
`ExposedSecretReport` per container next to the workload, and rescans when a workload's
image changes or a report turns 24 hours old. Only findings with a fixed version are kept,
so every entry is something a version bump can clear. The filter is `HIGH` and `CRITICAL`,
but Trivy also keeps `UNKNOWN`: CVEs published too recently for a vendor rating, many of
which score high. The install
lives in [`k8s/talos/infra/trivy-operator/`](../../../k8s/talos/infra/trivy-operator/kustomization.yaml).

A built-in trivy-server holds the vulnerability database, pulled from `mirror.gcr.io`, and
the operator's scan Jobs, at most three at a time, ask it for matches. The Jobs pull image
layers from each workload's registry themselves, so their network policy allows any HTTPS
host. Config audit, RBAC and CIS scanning are off: Kyverno already covers pod config, and
the node collector needs hostPath.

```bash
# Findings per workload, most critical first
kubectl get vulnerabilityreports -A -o wide --sort-by=.report.summary.criticalCount

# Which packages to bump in one report
kubectl -n arr-stack get vulnerabilityreport <name> -o json \
  | jq -r '.report.vulnerabilities[] | "\(.severity)  \(.resource) \(.installedVersion) -> \(.fixedVersion)  \(.vulnerabilityID)"'

# Any secret found in an image
kubectl get exposedsecretreports -A -o wide
```

Expect a few `ExposedSecretReport` hits from upstream images, such as the Debian snakeoil
key in the postgres images and test certificates in Python packages. A real leak is one in a
path our own image builds.

Prometheus scrapes the operator's `trivy_image_vulnerabilities` and
`trivy_image_exposedsecrets` gauges through its ServiceMonitor.

## Traps

- `features.forceFailurePolicyIgnore` is on, so a Kyverno outage lets every request
  through, enforcing policies included. With `Fail` the API server would stop accepting
  Pods whenever Kyverno is down.
- Existing objects that break an enforcing policy keep running and can still be updated
  (`allowExistingViolations`); only new violations are rejected.
- Debug Pods count too. `kubectl debug node/<node>` needs host access, so run it in
  `kube-system`, which the webhook skips, and give `kubectl debug --image` a version tag.
- Scope a Pod Security exception with `podSecurity` (control and image) rather than the
  whole rule, so the pod's other violations keep reporting.
- Exempt one workload with a `PolicyException` in `kyverno`, never with `names` in a
  policy's `exclude`: a names filter switches off autogen, and the policy then stops
  checking Deployments, StatefulSets and DaemonSets.
- A scan Job that hits its 1Gi memory limit on a large image leaves no report for that
  workload; the operator's log names the Job. Raise `trivy.resources` in the values.
- Argo CD excludes `EphemeralReport` and `ClusterEphemeralReport`
  (`k8s/talos/infra/argocd/values.yaml`); without that, every admission churns the app trees.
