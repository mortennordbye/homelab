# Cloudflare: watchdog

A Worker that watches the homelab from outside it. Every minute it:

- alerts when Alertmanager's always-firing `Watchdog` alert has not reached it for
  15 minutes, which covers the cluster, Prometheus, Alertmanager and the home line
  being down;
- requests each public site through Cloudflare and alerts after three failures in a row.

It posts to the same Discord channel as Alertmanager, directly, so it works while
the homelab is down. Terraform reads that webhook from Bitwarden and writes the
heartbeat URL back to Bitwarden as `alertmanager-heartbeat-url`. Messages start with `[WATCHDOG]`, one on DOWN and one on UP.
State is one KV key per check, written only on change.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # token, account id, workers.dev subdomain
export BW_ACCESS_TOKEN=$(security find-generic-password -s bws-homelab -w)
export BW_ORGANIZATION_ID=$(BWS_ACCESS_TOKEN=$BW_ACCESS_TOKEN bws project get 1ea61322-5f4a-44a4-b4d0-b29b00ba1134 --output json | jq -r .organizationId)
terraform init
terraform plan
terraform apply
```

`terraform output heartbeat_secret_id` is the id the Alertmanager ExternalSecret
reads (`k8s/talos/infra/kube-prometheus-stack/alertmanager-heartbeat-secret.yaml`).

## Notes

- Replacing `random_password` changes the heartbeat URL. Terraform updates the
  Bitwarden secret; Alertmanager picks it up within the ExternalSecret's refresh.
- The site list mirrors the `public-sites` Probe. The in-cluster probe sees the
  sites from the LAN, this one from the internet.
- A site served from Cloudflare's cache counts as up, as it is for visitors.
