# Alert smoke tests

Manual fixtures for triggering each rule in
`../homelab-alerts.yaml` end-to-end (Prometheus → Alertmanager → Discord).

These are **not** GitOps-managed. They live in a `tests/` subfolder under
the chart's app dir but are not referenced by `kustomization.yaml`, so
ArgoCD's `helm+kustomize` render ignores them. Apply and delete by hand.

## Usage

```bash
export KUBECONFIG=~/Documents/github/Homelab/terraform/proxmox/hyper-cluster/k8s/talos/kubeconfig
cd k8s/talos/infra/kube-prometheus-stack/tests

# Trigger an alert
kubectl apply -f <name>.yaml

# Watch it propagate (optional)
kubectl -n monitoring port-forward svc/prometheus-operated 19090:9090 &
curl -sG --data-urlencode 'query=ALERTS{alertname="<AlertName>"}' \
  http://127.0.0.1:19090/api/v1/query | python3 -m json.tool

# Clean up — alert auto-resolves after AM's resolve_timeout (5 min default)
kubectl delete -f <name>.yaml
```

## What each file triggers

| File | Alert | Expected time-to-Discord |
|---|---|---|
| `container-restarting-frequently.yaml` | `ContainerRestartingFrequently` | ~5 min |
| `deployment-unavailable.yaml` | `DeploymentUnavailable` | ~6 min |
| `container-oom-killed.yaml` | `ContainerOOMKilled` (+ also trips restart alert later) | ~2 min |
| `external-secret-not-ready.yaml` | `ExternalSecretNotReady` | ~31 min (long `for:` to absorb Bitwarden hiccups) |

## Not included

- **`ArgoCDAppDegraded`** — testable by applying a malformed `Application` CRD
  to `argocd` namespace, but it pollutes the ArgoCD UI. Easier to wait until a
  real app naturally goes degraded (a chart bump CRD mismatch, etc.).
- **`CertificateExpiringSoon`** — cert expiry is not on-demand-triggerable
  without backdating cert-manager state. Confirm the rule is loaded
  (`/api/v1/rules`) and trust it.

## Cleanup

If you forget to delete a trigger and the alert is firing, the cluster will
keep restarting/OOMing the test pod indefinitely. Check with:

```bash
kubectl get -n default deploy,externalsecret -l app.kubernetes.io/managed-by=homelab-alert-test
```
