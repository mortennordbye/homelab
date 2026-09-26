# Cloudflare: watchdog

A Worker that watches the homelab from outside it. Every minute it:

- alerts when Alertmanager's always-firing `Watchdog` alert has not reached it for
  15 minutes, which covers the cluster, Prometheus, Alertmanager and the home line
  being down;
- requests each public site through Cloudflare and alerts after three failures in a row.

It posts to the same Discord channel as Alertmanager, directly, so it works while
the homelab is down. Messages start with `[WATCHDOG]`, one on DOWN and one on UP.
State is one KV key per check, written only on change.

## Use

```bash
cp terraform.tfvars.example terraform.tfvars   # token, account id, workers.dev subdomain
export BWS_ACCESS_TOKEN=$(security find-generic-password -s bws-homelab -w)
export TF_VAR_discord_webhook_url=$(bws secret get d810abf7-40ad-4b1c-9d30-b44c0108ecad --output json | jq -r .value)
terraform init
terraform plan
terraform apply
```

After the first apply, store the heartbeat URL for Alertmanager:

```bash
bws secret create alertmanager-heartbeat-url "$(terraform output -raw heartbeat_url)" \
  1ea61322-5f4a-44a4-b4d0-b29b00ba1134 --output json | jq -c '{id,key}'
```

and put the returned id in
`k8s/talos/infra/kube-prometheus-stack/alertmanager-heartbeat-secret.yaml`.

## Notes

- A new `random_password` changes the heartbeat URL; update the Bitwarden secret
  with it or the Worker reports the heartbeat missing.
- The site list mirrors the `public-sites` Probe. The in-cluster probe sees the
  sites from the LAN, this one from the internet.
- A site served from Cloudflare's cache counts as up, as it is for visitors.
