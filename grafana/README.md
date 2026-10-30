# grafana

Dashboards Grafana manages through Git Sync. Saving a dashboard in the Grafana UI under the
Homelab (Git) folder opens a pull request that changes the JSON here; once merged, Grafana
pulls it within a minute. Edit the JSON by hand the same way.

Dashboards that ArgoCD loads as ConfigMaps live in
`k8s/talos/infra/kube-prometheus-stack/dashboards/` instead. Setup and traps:
[docs/platform/observability/README.md](../docs/platform/observability/README.md#git-sync).
