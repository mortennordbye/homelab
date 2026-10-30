# Policy

Kyverno checks every Pod against the repo's manifest rules and writes the result to
PolicyReports. All policies run in `Audit`: they report and never block a deploy. The
install and the policies live in
[`k8s/talos/infra/kyverno/`](../../../k8s/talos/infra/kyverno/kustomization.yaml).

| Policy | Checks |
|---|---|
| `disallow-mutable-image-tags` | every image has a version tag or a digest; no tag, `latest`, `develop`, `main`, `master`, `nightly`, `edge`, `stable` or `dev` |
| `pod-security-baseline` | the baseline Pod Security Standard: no privileged containers, host namespaces or hostPath |
| `pod-security-restricted` | the restricted Pod Security Standard: non-root, no privilege escalation, capabilities dropped, `RuntimeDefault` seccomp |
| `require-requests-limits` | every container sets CPU and memory requests and a memory limit |

The Pod rules also cover Deployments, StatefulSets, DaemonSets, Jobs and CronJobs through
Kyverno's autogen. Both Pod Security policies skip `kube-system`, `falco`,
`csi-driver-nfs`, `csi-proxmox` and `intel-gpu-plugin`, whose work needs the host. The
Alloy and node-exporter DaemonSets in `monitoring` are exempt through
`policyexception-monitoring.yaml`; exceptions are only read from the `kyverno` namespace.

[![Argo CD applies a manifest to the API server, which sends it to Kyverno's admission webhook in Audit mode; that and the hourly background scan write one PolicyReport per workload, a PolicyException in the kyverno namespace exempts named workloads, and Policy Reporter turns the reports into the policy_report_result metric that Prometheus scrapes for the Policy (Kyverno) row on the SPOG dashboard](../../assets/diagrams/policy-reports.svg)](../../assets/diagrams/policy-reports.svg)

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

## Traps

- `features.forceFailurePolicyIgnore` is on, so a Kyverno outage lets every request
  through. Turning a policy to `Enforce` keeps it that way; an enforcing webhook with
  `Fail` would stop the API server accepting Pods whenever Kyverno is down.
- Exempt one workload with a `PolicyException` in `kyverno`, never with `names` in a
  policy's `exclude`: a names filter switches off autogen, and the policy then stops
  checking Deployments, StatefulSets and DaemonSets.
- Argo CD excludes `EphemeralReport` and `ClusterEphemeralReport`
  (`k8s/talos/infra/argocd/values.yaml`); without that, every admission churns the app trees.
