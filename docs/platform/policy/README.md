# Policy

Kyverno checks every Pod against the manifest rules in the repo and writes the result to
PolicyReports. Four policies run in `Enforce`. The API server rejects a new Pod, or a
workload template, that breaks them. `verify-first-party-images` only reports for now. The
install and the policies live in
[`k8s/talos/infra/kyverno/`](../../../k8s/talos/infra/kyverno/kustomization.yaml).

| Policy | Mode | Checks |
|---|---|---|
| `disallow-mutable-image-tags` | Enforce | every image has a version tag or a digest; no tag, `latest`, `develop`, `main`, `master`, `nightly`, `edge`, `stable` or `dev` |
| `pod-security-baseline` | Enforce | the baseline Pod Security Standard: no privileged containers, host namespaces or hostPath |
| `pod-security-restricted` | Enforce | the restricted Pod Security Standard: non-root, no privilege escalation, capabilities dropped, `RuntimeDefault` seccomp |
| `require-requests-limits` | Enforce | every container sets CPU and memory requests and a memory limit |
| `verify-first-party-images` | Audit, portfolio and blog, stage and prod | the portfolio and blog images have SLSA provenance signed by their build workflow |

The Pod rules also cover Deployments, StatefulSets, DaemonSets, Jobs and CronJobs through
Kyverno's autogen. Both Pod Security policies skip `kube-system`, `falco`,
`csi-driver-nfs`, `csi-proxmox` and `intel-gpu-plugin`. Their work needs the host. The
Alloy and node-exporter DaemonSets in `monitoring` are exempt through
`policyexception-monitoring.yaml`. `policyexception-host-access.yaml` exempts one control
for one image each: `Capabilities` for gluetun (`NET_ADMIN` makes the VPN tunnel) and
`Privileged Containers` for the `docker:*-dind` sidecar of verksted. The same file holds
`verksted-restricted`. It exempts `verksted-app*` from the restricted controls it breaks,
per image: the backend starts agents as `vk-agent`, which takes root.
`policyexception-nas-backups.yaml` exempts the etcd, Authentik and logeverylift dump
CronJobs and the `backup-check` restore and Home Assistant checks from the restricted
`Running as Non-root` and `Capabilities` controls. The backup share only admits root
([backups](../backups/README.md#constraints)). `policyexception-media-root.yaml` exempts
the same two controls for the linuxserver and tdarr images in `arr-stack` and
`plex-media-stack` and for the gluetun pod. Their s6 init has to start as root before it
drops to `PUID`. `volsync-movers-root`, in the NAS file, exempts `volsync-src-*` and
`volsync-dst-*` pods that run the VolSync image from `Running as Non-root`,
`Running as Non-root user`, `Capabilities` and `Volume Types`. A new namespace with a
VolSync source has to be added to it. If it is not, the backups of that source are
refused. Kyverno reads exceptions only from the `kyverno` namespace.

`policyexception-control-plane.yaml` exempts the `kube-apiserver`, `kube-controller-manager`
and `kube-scheduler` static pods from `require-requests-limits`. Talos writes them from its
machine config with requests but no memory limit.

Every chart this repo installs sets requests and a memory limit through its values. The
sizes come from seven days of `container_memory_working_set_bytes` and CPU rate, with the
memory limit at about twice the observed peak. VolSync movers take the same fields from
each `ReplicationSource` (`moverSecurityContext`, `moverResources`).

To test a workload before it ships, run a server-side dry-run. It goes through the real
webhook and creates nothing. An offline test with the Kyverno CLI has to use the full pod
spec, volumes included.

[![Argo CD applies a manifest to the API server, which sends it to Kyverno's admission webhook, where a policy break is rejected; that and the hourly background scan write one PolicyReport per workload, a PolicyException in the kyverno namespace exempts named workloads, and Policy Reporter turns the reports into the policy_report_result metric that Prometheus scrapes for the Policy (Kyverno) row on the SPOG dashboard](../../assets/diagrams/policy-reports.svg)](../../assets/diagrams/policy-reports.svg)

## Image provenance

[![build-portfolio or build-blog pushes the image to GHCR and signs provenance through Sigstore; Kargo and Argo CD promote the tag; a new Pod goes through the API server to verify-first-party-images, which reads the attestations from GHCR and writes pass or fail to a PolicyReport that reaches the SPOG dashboard through Policy Reporter and Prometheus](../../assets/diagrams/policy-provenance.svg)](../../assets/diagrams/policy-provenance.svg)

`build-portfolio.yaml` attests SLSA provenance and an SPDX SBOM for each image it pushes.
`build-blog.yaml` attests SLSA provenance only. Both use `actions/attest` through Sigstore's public instance. The attestations are stored
in GHCR next to the image, under the `sha256-<digest>` fallback tag, because GHCR has no
referrers API. Check one by hand:

```bash
gh attestation verify oci://ghcr.io/mortennordbye/homelab/portfolio:<tag> -R mortennordbye/homelab
```

`verify-first-party-images` is an `ImageValidatingPolicy`, a separate type from the
`ClusterPolicy` policies above. Each matched Pod takes 4 to 5 seconds to verify, in `Audit`
too, with no caching seen between checks. On a KEDA wake from zero that is about 5 of 26
seconds. This is the cost to weigh before `Deny`. Old ReplicaSets that still name an
unsigned image report `fail` until they age out.

The Policy (Kyverno) row on the SPOG dashboard shows provenance coverage, verified
workloads, failures and the p95 check time. Policy Reporter leaves out ReplicaSets, so
those old revisions do not count as failures there.

## Reading the results

The Policy (Kyverno) row on the SPOG dashboard shows the failures per policy, the share of
workloads that meet the restricted standard and the requests rule, and a table of every
failing workload. Policy Reporter feeds it. It exports the current report state as
`policy_report_result`, for Deployments, StatefulSets, DaemonSets and CronJobs only. The
namespace of the workload is the `exported_namespace` label, because `namespace` is Policy
Reporter's own.

```bash
# One line per namespace with pass and fail counts
kubectl get policyreport -A

# What fails in one namespace
kubectl -n plex-media-stack get policyreport -o json \
  | jq -r '.items[].results[] | select(.result=="fail") | "\(.resources[0].name)  \(.policy)  \(.message)"'
```

Reports refresh on the background scan, about once an hour, and on every admission.

A Job that is deleted after it succeeds, such as a chart hook or a VolSync mover, leaves no
report behind. Kyverno's own `kyverno_policy_results_total` counter keeps every admission
result. Check it before you move a policy to `Enforce`:

```promql
sum by (policy_name, resource_namespace, resource_kind) (
  increase(kyverno_policy_results_total{rule_result="fail", rule_execution_cause="admission_request"}[24h])
) > 0
```

## Vulnerability scanning

trivy-operator in `trivy-system` scans the image of every running workload for known CVEs
and for secrets baked into its layers. It writes a `VulnerabilityReport` and an
`ExposedSecretReport` per container next to the workload. It rescans when the image of a
workload changes or when a report turns 24 hours old. Only findings with a fixed version
are kept, so a version bump can clear every entry. The filter is `HIGH` and `CRITICAL`,
but Trivy also keeps `UNKNOWN`: CVEs published too recently for a vendor rating. Many of
them score high. The install
lives in [`k8s/talos/infra/trivy-operator/`](../../../k8s/talos/infra/trivy-operator/kustomization.yaml).

A built-in trivy-server holds the vulnerability database, pulled from `mirror.gcr.io`. The
scan Jobs of the operator, at most three at a time, ask it for matches. The Jobs pull image
layers from the registry of each workload themselves, so their network policy allows any
HTTPS host. Config audit, RBAC and CIS scanning are off: Kyverno already covers pod config,
and the node collector needs hostPath.

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
path that our own image builds.

Prometheus scrapes the `trivy_image_vulnerabilities` and `trivy_image_exposedsecrets`
gauges of the operator through its ServiceMonitor.

## Traps

- `features.forceFailurePolicyIgnore` is on. A Kyverno outage therefore lets every request
  through, enforcing policies included. With `Fail`, the API server would stop accepting
  Pods whenever Kyverno is down.
- Existing objects that break an enforcing policy keep running, and you can still update
  them (`allowExistingViolations`). Only new violations are rejected.
- Debug Pods count too. `kubectl debug node/<node>` needs host access. Run it in
  `kube-system`, which the webhook skips, and give `kubectl debug --image` a version tag.
- Scope a Pod Security exception with `podSecurity` (control and image), not the whole
  rule. The other violations of the pod then keep reporting.
- Exempt one workload with a `PolicyException` in `kyverno`, never with `names` in the
  `exclude` of a policy. A names filter switches off autogen, and the policy then stops
  checking Deployments, StatefulSets and DaemonSets.
- A scan Job that hits its 1Gi memory limit on a large image leaves no report for that
  workload. The log of the operator names the Job. Raise `trivy.resources` in the values.
- Argo CD excludes `EphemeralReport` and `ClusterEphemeralReport`
  (`k8s/talos/infra/argocd/values.yaml`). Without that, every admission churns the app trees.
